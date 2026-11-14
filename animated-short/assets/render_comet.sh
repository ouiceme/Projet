#!/bin/bash
# Full render of CometShort in resumable chunks, then audio mix (voice + SFX at their cue times + quiet music) and encodes.
# Starts only once the Wald render has finished (DONE or FAILED in its log).
until grep -qE "DONE|FAILED" /root/finish_wald.log; do sleep 60; done
cd /root/remotion-project; mkdir -p out/comet/chunks
C=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome
S=/tmp/claude-0/-home-user-Projet/81e89ef9-70cb-54f6-ae56-31025da0871e/scratchpad/videos; X=/root/comet-short/sfx
mkdir -p $S
for r in 0-409 410-819 820-1229 1230-1639 1640-1997; do
  f=out/comet/chunks/$r.mp4
  [ -f $f ] && continue
  for try in 1 2 3; do
    npx remotion render src/index.ts CometShort $f.tmp.mp4 --frames=$r --muted --browser-executable=$C --codec=h264 --crf=16 --concurrency=2 --timeout=240000 > out/comet/chunk_$r.log 2>&1 && mv $f.tmp.mp4 $f && break
  done
  [ -f $f ] || { echo "RENDER FAILED $r"; exit 1; }
  echo "chunk $r ok $(date)"
done
[ -f out/comet/audio.wav ] || npx remotion render src/index.ts CometShort out/comet/audio.wav --codec=wav --browser-executable=$C > out/comet/audio.log 2>&1 || { echo "RENDER FAILED audio"; exit 1; }
ls out/comet/chunks/*.mp4 | sort -t/ -k4 -n | sed "s|^|file '/root/remotion-project/|;s|$|'|" > out/comet/list.txt
# SFX cue sheet: file, time in ms (= the spoken word it illustrates, see CUE in src/videos/comet/story.ts), gain
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
ffmpeg -y -loglevel error -f concat -safe 0 -i out/comet/list.txt -i out/comet/audio.wav $IN -filter_complex "$FC" -map 0:v -map "[m]" -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 18 -color_primaries bt709 -color_trc bt709 -colorspace bt709 -movflags +faststart -c:a aac -b:a 192k -t 66.6 $S/comet_fr.mp4 &&
ffmpeg -y -loglevel error -i $S/comet_fr.mp4 -vf "subtitles=public/comet_fr.srt:force_style='FontName=DejaVu Sans,Fontsize=6,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&HB0000000,BorderStyle=3,Outline=1,Shadow=0,Alignment=2,MarginV=110'" -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 18 -movflags +faststart -c:a copy $S/comet_fr_ST.mp4 && cp public/comet_fr.srt $S/comet_fr.srt && echo "DONE $(date)" || echo "RENDER FAILED encode"
