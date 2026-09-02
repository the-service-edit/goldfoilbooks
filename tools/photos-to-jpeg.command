#!/bin/bash
# Converts a folder of PNG product photographs to optimised JPEG.
#
# Why: Squarespace converts every upload to WebP, but a PNG source produces
# LOSSLESS WebP and a JPEG source produces lossy WebP. Photographs uploaded as
# PNG come out about 13x larger for no visible gain. Measured 2 Sept 2026:
# a PNG-sourced cover ships at 2,414 KB where the JPEG-sourced one ships at 173 KB.
#
# Usage: double-click this file, then drag the folder in when asked.
# Originals are never modified. Output lands in a "jpeg" subfolder.

set -e
printf 'Drag the folder of photos here, then press return: '
read -r SRC
SRC="${SRC%\'}"; SRC="${SRC#\'}"; SRC="${SRC%\"}"; SRC="${SRC#\"}"

if [ ! -d "$SRC" ]; then echo "Not a folder: $SRC"; exit 1; fi
OUT="$SRC/jpeg"
mkdir -p "$OUT"

count=0
shopt -s nullglob nocaseglob
for f in "$SRC"/*.png "$SRC"/*.tif "$SRC"/*.tiff "$SRC"/*.heic; do
  base="$(basename "${f%.*}")"
  sips -s format jpeg -s formatOptions 82 "$f" --out "$OUT/$base.jpg" >/dev/null
  before=$(stat -f%z "$f")
  after=$(stat -f%z "$OUT/$base.jpg")
  printf '%-34s %6s KB  ->  %5s KB\n' "$base" "$((before/1024))" "$((after/1024))"
  count=$((count+1))
done

echo
echo "Converted $count files into: $OUT"
echo "Upload those to Squarespace in place of the PNGs. Originals untouched."
