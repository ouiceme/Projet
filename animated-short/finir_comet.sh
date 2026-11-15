#!/bin/bash
# Finalise la vidéo Comet sur une machine stable (PC). À lancer depuis le dossier animated-short/.
# Produit : out/comet_fr.mp4 (épurée) et out/comet_fr_ST.mp4 (sous-titrée).
set -e
cd "$(dirname "$0")"
mkdir -p out public

# 1) Voix : regénère le WAV 48 kHz mono attendu par la composition, + le .srt dans public/
ffmpeg -y -i assets/comet_fr.mp3 -ar 48000 -ac 1 public/voice_comet_fr.wav
cp assets/comet_fr.srt public/comet_fr.srt

# 2) Bruitages : la musique est en mp3, on la convertit en wav comme les autres
X=assets/sfx/comet
[ -f "$X/music.wav" ] || ffmpeg -y -i "$X/music.mp3" "$X/music.wav"

# 3) Rendu de l'image (sans son) + piste voix séparée. --concurrency = nb de cœurs ; retire --gl=angle si pas de GPU.
npx remotion render src/index.ts CometShort out/comet_muet.mp4 --muted --codec=h264 --crf=16 --concurrency=8 --gl=angle
npx remotion render src/index.ts CometShort out/voix.wav --codec=wav --concurrency=8

# 4) Mixage voix + bruitages (chaque son à l'instant de l'action, en millisecondes)
CUES="music 0 0.10
chime 150 0.5
jet 3900 0.45
whoosh 8580 0.4
bell 12230 0.5
thud 18710 0.8
splash 22020 0.7
pump_up 25330 0.7
pump_down 25770 0.7
pump_up 26540 0.7
pump_down 26900 0.7
pump_up 27610 0.7
pump_down 28150 0.7
crack 30370 0.8
pop 31700 0.6
pop 33830 0.7
stretch 37250 0.6
pop 39360 0.6
pop 41020 0.7
pop 46820 0.7
pop 48730 0.6
pop 51760 0.6
pop 53980 0.6
whoosh 58020 0.6
pop 59200 0.6
chime 61710 0.45
pop 63620 0.7"
IN=""; FC=""; MIX="[1:a]"; i=2
while read -r name ms gain; do
  IN="$IN -i $X/$name.wav"; FC="$FC[$i]volume=$gain,adelay=$ms:all=1[s$i];"; MIX="$MIX[s$i]"; i=$((i+1))
done <<< "$CUES"
FC="$FC${MIX}amix=inputs=$((i-1)):normalize=0,alimiter=limit=0.95[m]"

# 5) Assemble image + son mixé, encode compatible web/mobile (yuv420p + faststart)
ffmpeg -y -i out/comet_muet.mp4 -i out/voix.wav $IN -filter_complex "$FC" \
  -map 0:v -map "[m]" -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 18 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -movflags +faststart \
  -c:a aac -b:a 192k -t 66.6 out/comet_fr.mp4

# 6) Version sous-titrée (sous-titres incrustés, caisson noir, lisible sans le son)
ffmpeg -y -i out/comet_fr.mp4 -vf "subtitles=public/comet_fr.srt:force_style='FontName=DejaVu Sans,Fontsize=6,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&HB0000000,BorderStyle=3,Outline=1,Shadow=0,Alignment=2,MarginV=110'" \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 18 -movflags +faststart -c:a copy out/comet_fr_ST.mp4

echo "OK -> out/comet_fr.mp4 (épurée) et out/comet_fr_ST.mp4 (sous-titrée)"
