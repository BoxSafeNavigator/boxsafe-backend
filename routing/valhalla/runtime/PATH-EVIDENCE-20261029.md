# Full-path evidence investigation

Real Valhalla 3.9.0 trace_attributes was exercised against the synthetic height fixture using the actual returned polyline. Both checks passed: the 2-meter truck trace included restricted way 100; the 4-meter truck trace included detour way 101 and excluded way 100.

The selected trace fields return graph edge IDs, OSM way IDs, lengths, names and truck-route designation. Truck-route designation is not a dimensional clearance certificate. This probe does not retrieve complete per-edge height, width, length, gross-weight or axle-load restrictions. Map matching also reconstructs a candidate path and is not proof of the original route's exact edge identity.

No full-path guard is enabled from this evidence. fullPathClearanceVerified and navigationReady remain false. Results are diagnostic synthetic evidence, separate from the 35-case guarded HTTP suite.

Reproduce with the pinned runtime:

    python routing/valhalla/runtime/probe-path-evidence.py --config /path/to/generated/fixture/config.json --output /path/to/results.json

Next: investigate a graph-edge evidence reader keyed by the exact routed edge sequence, including restriction types, values, direction and conditional access. Any unsupported or missing evidence must remain unknown; nearest-road sampling cannot supply a full-path clearance assertion.
