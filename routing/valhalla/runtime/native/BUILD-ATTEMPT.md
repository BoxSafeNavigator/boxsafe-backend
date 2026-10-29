# Native build attempt

Three steps attempted: installed isolated CMake 3.31.6 and Ninja 1.11.1.4; applied route-bytes.patch and ran native CMake configuration; assessed whether binary round-trip testing could run.

Configuration failed because required Boost headers (minimum 1.71) are unavailable. Protobuf headers were also absent at the standard include path, but configuration stopped before checking that dependency. Compilation and binary round-trip testing were therefore not performed. Installing build tools succeeded without a paid server. This is a missing native-dependency issue, not evidence that server rental alone fixes it.

Next: provision Boost and Protobuf development dependencies in an authorized build environment, including the pinned source submodules and remaining CMake requirements. Rerun configuration before claiming compilation is available. Existing prebuilt runtime remains unchanged. Full-path evidence and navigation approval remain unverified.
