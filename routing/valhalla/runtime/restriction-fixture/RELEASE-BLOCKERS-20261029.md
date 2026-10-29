# Restricted-origin defects — release blocked

Real Valhalla 3.9.0 synthetic graph testing: 12 cases, 10 met the conservative test expectation, two did not.

Three unrestricted/smaller-vehicle control routes succeeded. All three no-alternative restricted requests returned no route. Restricted destinations returned no route for height, weight and HGV access. Restricted HGV origin also returned no route.

FAILURES: a 4-metre truck starting on the maxheight=3 segment received a route traversing the segment; a 10-tonne truck starting on the maxweight=5 segment did likewise. Decoded geometry began at longitude -80.99 on the restricted edge and continued directly to -80.98, without detour (approximately 0.922 km). These results are not merely candidate snapping to a safe alternative. The exact engine behavior must be investigated before any release. No assertion of physical safety or legal exemption is justified by a successful engine response.

All networks and limits are invented test fixtures. These do not assert an actual local road restriction. Endpoint expected outcomes are conservative BoxSafe test policy, not an interpretation of traffic law.

edge-cases.py uses the corrected roads.osm/config.json built by run.py, creates a separate no-detour graph, and records responses. See edge-results.json for exact requests, geometry and outcomes. Use a scratch copy because fixture graph files are generated beside the script. Dependencies: pyvalhalla==3.9.0, osmium==4.3.2.

Next corrective work: examine matched origin/destination edges and their physical restriction attributes; design fail-closed postvalidation or reject endpoints where compatibility cannot be established. Validate against both cases and no-route controls. Keep safeRouteFound/truckRouteVerified false; no navigation guidance, public release or production deployment is approved by this result. Existing stop warnings remain mandatory. The core 144-test suite is not evidence this real-engine defect is solved.
