# Three-step binary verification preparation

1. Installed Python-side grpcio-tools 1.71.0 and protobuf 5.29.6 in the isolated runtime and generated Python protobuf modules from pinned Valhalla 3.9.0 source. This succeeds without system package installation and does not supply missing C++ Boost/Protobuf development dependencies.
2. Added and ran a synthetic schema round-trip check: 64-bit graph identities above JavaScript's safe integer limit, edge order, shape indices and empty-trip control all passed. IDs are exported as strings to preserve precision. These are constructed messages, not engine output.
3. Added a native binary verification command and a shell verification pipeline. The command correctly stops with BLOCKED when route_bytes is unavailable in the installed wheel. The shell syntax check passes; its successful native path is not tested. No clearance verification is inferred from decoded edge IDs.

After building and installing the patched wheel in a separate environment, install grpcio-tools==1.71.0 and protobuf==5.29.6 there, then run:

    bash verify-build.sh /absolute/python /absolute/pinned-source /absolute/fixture/config.json /absolute/new-output

The source checkout must match a3a5631c4d243eee9a09241f4ffe6680a67dd55a. Generated modules and output logs stay in the chosen output directory. A missing binding, invalid protobuf or empty trip stops the command. The script is separate from the existing prototype validator: its expected blocked state must not be misreported as passing the native build. Graph restriction lookup and physical clearance coverage remain outstanding.
