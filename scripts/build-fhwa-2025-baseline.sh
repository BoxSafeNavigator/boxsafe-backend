#!/usr/bin/env bash
set -euo pipefail

WORK_DIR="${1:-/tmp/boxsafe-fhwa-2025}"
OUTPUT_PATH="${2:-data/fhwa-2025-candidates.json}"
ZIP_URL="https://www.fhwa.dot.gov/BRIDGE/nbi/2025hwybronefiledel.zip"

mkdir -p "$WORK_DIR"
ZIP_PATH="$WORK_DIR/2025hwybronefiledel.zip"

echo "Downloading official FHWA 2025 nationwide highway bridge dataset..."
curl -fL "$ZIP_URL" -o "$ZIP_PATH"

echo "Extracting dataset..."
unzip -o "$ZIP_PATH" -d "$WORK_DIR"

INPUT_PATH="$(find "$WORK_DIR" -type f \( -name '*.txt' -o -name '*.csv' \) | head -n 1)"

if [[ -z "$INPUT_PATH" ]]; then
  echo "No delimited FHWA data file was found after extraction." >&2
  exit 1
fi

echo "Normalizing nationwide clearance candidates..."
node scripts/normalize-fhwa-2025-delimited.js "$INPUT_PATH" "$OUTPUT_PATH"

echo "Complete: $OUTPUT_PATH"
