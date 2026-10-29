# Synthetic supplied-evidence examples

These three invented packets are for exercising the offline audit command. They are not road records and must never be imported as real routing evidence.

- no-recorded-conflict.json: structurally complete supplied data with no recorded restriction; exit 0, UNKNOWN_ROUTE_SAFETY.
- height-conflict.json: supplied 4-meter truck conflicts with a supplied 3-meter height limit; exit 1, SUPPLIED_EVIDENCE_CONFLICT.
- missing-evidence.json: empty evidence; exit 1, UNKNOWN_ROUTE_SAFETY.

Run from the repository root:

    python routing/valhalla/runtime/audit-route-evidence.py routing/valhalla/runtime/evidence-examples/height-conflict.json --output /absolute/report.json

Every result retains false navigationReady, fullPathClearanceVerified, safeRouteFound and sourceAuthenticated. Exit 0 is a supplied-data diagnostic result, not permission to drive.

## Future native reader handoff

The reader must produce original directed graph IDs in traversal order as decimal strings and use the exact same graph build for restriction lookups. It must normalize lengths to meters and weights to metric tonnes, preserve unsupported conditions as unknown, and explicitly report truck access and restriction presence. The offline tool trusts supplied fields without authenticating them. Do not connect user-uploaded packets directly to navigation approval. Restriction-free graph records do not establish physical clearance.

Current status: examples created; subprocess CLI checks pass for all three cases; combined Python discovery passes 24 test methods. The CLI test contains three subcases. No native reader, compilation or real-world clearance evidence is added by this checkpoint.
