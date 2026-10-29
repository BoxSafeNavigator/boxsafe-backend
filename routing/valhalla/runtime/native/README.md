# Binary route binding patch — prepared, not compiled

route-bytes.patch adds a separate route_bytes method to the official Valhalla 3.9.0 nanobind Actor binding. It follows the existing tile() bytes-return pattern: release the GIL while routing, reacquire it before allocating Python bytes, and preserve embedded nulls using the explicit length. Existing text route() behavior is unchanged.

Validation performed: git apply --check succeeded against tag 3.9.0 commit a3a5631c4d243eee9a09241f4ffe6680a67dd55a. Runtime compilation and binary round-trip tests have NOT been performed. The workspace has a C++ compiler but no cmake executable was found in PATH. This is a build-tooling gap, not proof that paid server space is required.

Before use: build the pinned engine/binding with its documented dependencies, regenerate type stubs, and test raw Actor.route_bytes JSON and PBF output. The Python Actor wrapper does not yet expose a typed convenience wrapper for this method. Verify protobuf decoding and original directed-edge order, then add graph restriction lookup against the same graph build. Do not integrate into the routing adapter until those checks pass. Full-path clearance remains unverified.
