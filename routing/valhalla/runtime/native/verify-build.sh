#!/usr/bin/env bash
# Usage: bash verify-build.sh PYTHON PINNED_SOURCE FIXTURE_CONFIG NEW_OUTPUT_DIR
set -euo pipefail
[[ $# -eq 4 ]] || { echo 'Expected Python, source, fixture config and new output directory' >&2; exit 2; }
python_bin="$1"; source_dir="$2"; config_path="$3"; output_dir="$4"
[[ ! -e "$output_dir" ]] || { echo 'Output directory must be new' >&2; exit 2; }
[[ "$(git -C "$source_dir" rev-parse HEAD)" == a3a5631c4d243eee9a09241f4ffe6680a67dd55a ]]
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p -- "$output_dir/generated"
output_dir="$(cd -- "$output_dir" && pwd)"
"$python_bin" -m grpc_tools.protoc -I "$source_dir/proto/descriptors" --python_out="$output_dir/generated" "$source_dir"/proto/descriptors/*.proto
PYTHONPATH="$output_dir/generated" "$python_bin" "$script_dir/test-trip-schema.py" > "$output_dir/schema-test.log"
PYTHONPATH="$output_dir/generated" "$python_bin" "$script_dir/verify-original-trip.py" --config "$config_path" --output "$output_dir/original-trip.json" > "$output_dir/native-test.log" 2>&1
