# Isolated Valhalla runtime

Python 3.12 on Linux x86_64. Official pyvalhalla 3.9.0 prebuilt wheel installs without the blocked system-package build path:

    python3 -m venv valhalla-runtime
    valhalla-runtime/bin/python -m pip install --only-binary=:all: -r requirements.txt

The package reports version 3.9.0. In this workspace the `python -m valhalla valhalla_build_tiles ...` wrapper failed with "Can't find executable", despite packaged binaries being present. The official executable can be invoked at the absolute path under the environment's lib/python3.12/site-packages/valhalla/bin directory. Do not move it away from bundled pyvalhalla.libs dependencies.

Observed native binary SHA-256:
- valhalla_build_tiles: 1fbb499e3398bae0b42f545a503fd54f038e8590eb09eb81d7cfea694252ba0b
- valhalla_service: 8cf44981087f05ce5affc184a2faee783c8c33e0499f54dab3e4494e2fc2346d

These identify observed executables, not the wheel's full dependency closure or a reproducible source build. Preserve the exact wheel/config/data checksums when preparing a portable deployment.

Source: https://github.com/valhalla/valhalla/blob/master/src/bindings/python/README.md
