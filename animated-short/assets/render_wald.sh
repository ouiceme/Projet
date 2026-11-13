#!/bin/bash
# Full render of WaldShort in resumable chunks, then audio mix (voice + SFX at their cue times + quiet music) and encodes.
cd /root/remotion-project; mkdir -p out/wald/chunks
C=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome
S=/tmp/claude-0/-home-user-Projet/81e89ef9-70cb-54f6-ae56-31025da0871e/scratchpad/videos; X=/root/wald-short/sfx
mkdir -p $S
for r in 0-409 410-819 820-1229 1230-1639 1640-2048; do
  f=out/wald/chunks/$r.mp4
  [ -f $f ] && continue
  for try in 1 2 3; do
    npx remotion render src/index.ts WaldShort $f.tmp.mp4 --frames=$r --muted --browser-executable=$C --codec=h264 --crf=16 --concurrency=2 --timeout=240000 > out/wald/chunk_$r.log 2>&1 && mv $f.tmp.mp4 $f && break
  done
  [ -f $f ] || { echo "RENDER FAILED $r"; exit 1; }
  echo "chunk $r ok $(date)"
done
[ -f out/wald/audio.wav ] || npx remotion render src/index.ts WaldShort out/wald/audio.wav --codec=wav --browser-executable=$C > out/wald/audio.log 2>&1 || { echo "RENDER FAILED audio"; exit 1; }
ls out/wald/chunks/*.mp4 | sort -t/ -k4 -n | sed "s|^|file '/root/remotion-project/|;s|$|'|" > out/wald/list.txt
# SFX cue sheet: file, time in ms (= the spoken word it illustrates, see CUE in src/videos/wald/story.ts), gain
CUES="music 0 0.10
drone 4700 0.50
tick 10810 0.8
tick 11550 0.8
tick 12100 0.8
tick 14020 0.8
clang 17350 0.75
clang 17720 0.45
clang 18090 0.45
paper 30300 0.8
paper 30620 0.8
paper 30940 0.8
paper 31260 0.8
paper 31580 0.8
paper 31900 0.8
paper 32220 0.8
paper 32540 0.8
pop 39000 0.6
pop 39200 0.6
pop 40230 0.6
pop 40980 0.6
whoosh 44350 0.7
clang 49550 0.7
tick 49750 0.7
tick 49950 0.7
tick 50150 0.7
tick 50400 0.7
stamp 53320 0.9
pop 59770 0.7
whoosh 61140 0.7
whoosh 65460 0.5"
IN=""; FC=""; MIX="[1:a]"; i=2
while read -r name ms gain; do
  IN="$IN -i $X/$name.wav"; FC="$FC[$i]volume=$gain,adelay=$ms:all=1[s$i];"; MIX="$MIX[s$i]"; i=$((i+1))
done <<< "$CUES"
FC="$FC${MIX}amix=inputs=$((i-1)):normalize=0,alimiter=limit=0.95[m]"
ffmpeg -y -loglevel error -f concat -safe 0 -i out/wald/list.txt -i out/wald/audio.wav $IN -filter_complex "$FC" -map 0:v -map "[m]" -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 18 -color_primaries bt709 -color_trc bt709 -colorspace bt709 -movflags +faststart -c:a aac -b:a 192k -t 68.3 $S/wald_fr.mp4 &&
ffmpeg -y -loglevel error -i $S/wald_fr.mp4 -vf "subtitles=public/wald_fr.srt:force_style='FontName=DejaVu Sans,Fontsize=6,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&HB0000000,BorderStyle=3,Outline=1,Shadow=0,Alignment=2,MarginV=110'" -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 18 -movflags +faststart -c:a copy $S/wald_fr_ST.mp4 && cp public/wald_fr.srt $S/wald_fr.srt && echo "DONE $(date)" || echo "RENDER FAILED encode"
