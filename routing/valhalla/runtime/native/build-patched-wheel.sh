#!/usr/bin/env bash
# For a standard Ubuntu 24.04 development host; not validated end-to-end here.
set -euo pipefail
if [[ $# -ne 1 ]]; then echo 'Usage: build-patched-wheel.sh NEW_BUILD_DIRECTORY' >&2; exit 2; fi
build_dir="$1"
if [[ -e "$build_dir" ]]; then echo 'Choose a new build directory.' >&2; exit 2; fi
patch_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
sudo apt-get update
sudo apt-get install -y build-essential git pkg-config python3.12-dev python3.12-venv libboost-dev libprotobuf-dev protobuf-compiler zlib1g-dev libsqlite3-dev liblz4-dev libbz2-dev
mkdir -p -- "$build_dir"
build_dir="$(cd -- "$build_dir" && pwd)"
git clone --branch 3.9.0 --depth 1 --recurse-submodules https://github.com/valhalla/valhalla.git "$build_dir/source"
[[ "$(git -C "$build_dir/source" rev-parse HEAD)" == a3a5631c4d243eee9a09241f4ffe6680a67dd55a ]]
git -C "$build_dir/source" apply --check "$patch_dir/route-bytes.patch"
git -C "$build_dir/source" apply "$patch_dir/route-bytes.patch"
python3.12 -m venv "$build_dir/venv"
CMAKE_BUILD_PARALLEL_LEVEL=2 "$build_dir/venv/bin/python" -m pip wheel --no-deps "$build_dir/source" --wheel-dir "$build_dir/wheels" -Ccmake.define.ENABLE_SERVICES=OFF -Ccmake.define.ENABLE_HTTP=OFF -Ccmake.define.ENABLE_GEOTIFF=OFF -Ccmake.define.ENABLE_TOOLS=OFF -Ccmake.define.ENABLE_DATA_TOOLS=OFF
printf 'Wheel output: %s/wheels\n' "$build_dir"
