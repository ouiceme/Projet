#!/bin/bash
# usage: stills.sh f1 f2 ...   (bundles the Comet-only entry once, then renders the given frames one at a time)
cd /root/remotion-project; mkdir -p out/comet/stills
C=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome
rm -rf out/comet/bundle; npx remotion bundle src/comet_entry.tsx --out-dir out/comet/bundle > out/comet/bundle.log 2>&1 || { tail -20 out/comet/bundle.log; exit 1; }
for f in "$@"; do
  npx remotion still out/comet/bundle CometShort out/comet/stills/f$f.jpg --frame=$f --image-format=jpeg --jpeg-quality=88 --browser-executable=$C --timeout=240000 > out/comet/still_$f.log 2>&1 && echo "ok $f" || { echo "FAIL $f"; tail -15 out/comet/still_$f.log; }
done
