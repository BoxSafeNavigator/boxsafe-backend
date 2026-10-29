# Real engine HTTP verification — October 29, 2026

Four actual HTTP cases passed through the Node BoxSafe app/adapter and a localhost Python HTTP transport calling real Valhalla Actor over the built South Carolina graph:

- Truck route: HTTP 200, 5978 metres, seven maneuvers, UNKNOWN_ROUTE_SAFETY, verification false.
- Missing truck height: HTTP 400 and no route payload.
- Coordinates outside graph coverage: HTTP 503 and no route payload.
- Engine transport stopped: HTTP 503 and no route payload.

The successful HTTP request took 0.149 seconds in one run. This is not a performance benchmark. Full no-path testing within graph and restriction enforcement remain outstanding.

Native valhalla_service transport could not start: workspace denied a socket operation (src/ip_resolver.cpp:542). No sandbox/security settings changed. actor-http.py is a private development-only Python stdlib HTTP wrapper around the supported real Valhalla Actor; the native HTTP service remains untested here. It binds loopback, serializes Actor access, bounds request body and accepts truck costing only. It has no production authentication, TLS or hardened server controls. Keep behind the Node adapter; do not expose publicly.

http-smoke.py accepts --workspace pointing to a directory containing boxsafe-backend, valhalla-runtime and boxsafe-data from the existing build checkpoint. It starts both services, checks cases, writes results and stops owned processes. Its generated transport config does not overwrite the original graph-build config. It requires free localhost ports 8002/8085. No ongoing services remain after the test.

Next: controlled height/weight/access restriction fixtures and independently evidenced pilot routes. No navigation-ready claims, public backend release, admin/timezone dataset completion, or real-device/browser validation.
