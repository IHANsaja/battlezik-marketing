#!/usr/bin/env bash
# Render the film in four parts and join them, so an interruption (the computer sleeping, a crash)
# costs one part, not the whole render. Finished parts are kept and skipped on the next run.
#   bash scripts/render-parts.sh <name> [extra render.ts flags, e.g. --fps 30 --samples 1 --preset veryfast --crf 20]
# Output: ../out/<name>.mp4 with the choir track. Delete ../out/parts/<name>_*.mp4 to force a re-render.
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${1:?name}"; shift
OUT=../out; PARTS=$OUT/parts; mkdir -p "$PARTS"
CUTS=(0 32 64 96 120.58)
: > "$PARTS/$NAME.txt"
for i in 0 1 2 3; do
  f="$PARTS/${NAME}_$i.mp4"
  if [ ! -s "$f" ]; then
    echo "== part $((i + 1)) of 4: ${CUTS[$i]}s to ${CUTS[$((i + 1))]}s"
    bun scripts/render.ts video --from "${CUTS[$i]}" --to "${CUTS[$((i + 1))]}" --noaudio --out "$f.tmp.mp4" "$@"
    mv "$f.tmp.mp4" "$f"
  else
    echo "== part $((i + 1)) of 4 already rendered"
  fi
  echo "file '${NAME}_$i.mp4'" >> "$PARTS/$NAME.txt"
done
ffmpeg -v error -y -f concat -safe 0 -i "$PARTS/$NAME.txt" -i ../audio/battlezik-choir.mp3 -map 0:v -map 1:a -c:v copy -af "loudnorm=I=-14:TP=-1:LRA=11" -c:a aac -b:a 256k -shortest -movflags +faststart "$OUT/$NAME.mp4"
echo "== wrote $OUT/$NAME.mp4"
