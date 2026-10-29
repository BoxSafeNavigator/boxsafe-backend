# BoxSafe private Valhalla adapter — milestone 1

October 29, 2026. Experimental; not navigation ready.

Built on commit 2989f3d86063da41eeb17236415bddbc606326a3, the combined PR #3/#4 safety repairs. Both PRs are still open drafts. Master is not the recovered backend. No existing production handler is changed by this milestone.

## Run and test

Node 24.22.1 was used for validation. No new npm dependencies.

    node --test test/*.test.cjs
    VALHALLA_URL=http://127.0.0.1:8002 node routing/valhalla/server.cjs

POST /route on 127.0.0.1:8085 accepts exactly two coordinate locations and a truck profile. The example below is fictional and is not the owner's measured truck.

```json
{"locations":[{"lat":34.92,"lon":-81.03},{"lat":34.93,"lon":-81.04}],"truck":{"height":{"value":13,"unit":"ft"},"width":{"value":102,"unit":"in"},"length":{"value":26,"unit":"ft"},"loadedWeight":{"value":26000,"unit":"lb"},"maxAxleLoad":{"value":16000,"unit":"lb"},"axleCount":2,"hazmat":false}}
```

Length units: m/ft/in. Mass units: tonnes/kg/lb. Loaded weight includes vehicle and cargo; maxAxleLoad is the heaviest loaded axle, not gross weight divided by axle count. All fields required. Bounds are prototype API limits, not legal limits. The caller cannot select car costing or override restriction flags. Engine errors, malformed geometry/JSON and timeout fail closed. No automatic retry or downgrade. Output geometry is polyline6, distances metres, times seconds, instructions text. All responses remain unverified.

## Engine and data next gate

Target version: Valhalla 3.9.0 (version-specific API reference reviewed). This target is NOT an installed, pinned container or tested graph. Runtime has no docker, cmake or valhalla_service; managed environment status tool and /etc/codex/network-policy.json are unavailable. Do not infer infrastructure readiness from successful GitHub access.

Next environment must supply Valhalla 3.9.0 and its verified commit/image digest. Use official build guidance, preserve TLS/proxy settings, bind privately. Acquire a permitted South Carolina OSM extract; record URL, retrieval time, OSM snapshot time, SHA-256, bounding coverage, ODbL attribution, build configuration and graph build ID before importing. No extract has been downloaded and no checksum/build result is invented here. Set BOXSAFE_DATASET_ID and BOXSAFE_GRAPH_BUILD_ID to the recorded values. These labels are operator supplied provenance, not verification.

Measure graph build wall time, peak RAM, disk and query latency. Exercise known prohibited height/weight/access crossings against independently sourced restrictions and test absent tags. Mock HTTP fixtures in this milestone do not establish engine restriction enforcement. Keep verification false until independent coverage and route review gates are met.

Map tiles, geocoding, a map UI, spoken guidance and GPS tracking are separate later work. No paid activation or public deployment performed.

Sources:
- https://github.com/valhalla/valhalla/releases/tag/3.9.0
- https://raw.githubusercontent.com/valhalla/valhalla/3.9.0/docs/docs/api/route/api-reference.md
- https://www.openstreetmap.org/copyright

## Evidence

110/110 tests pass, including 84 existing safety tests and 26 adapter tests. A real localhost HTTP fixture exercises truck-only payloads, success, no-route HTTP error, malformed JSON and timeout. It is not a live Valhalla test. Existing low-bridge data remains unverified. No merges, deployment or changes to legacy endpoint behavior.
