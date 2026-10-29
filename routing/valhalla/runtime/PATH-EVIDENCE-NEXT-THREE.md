# Three follow-up steps

1. Inspected the installed Valhalla Actor API. It exposes route, trace and locate operations, but no direct graph-edge restriction reader by routed edge ID. Exact original route identity therefore remains unresolved; no new clearance guard was enabled.
2. Added a candidate-evidence assessment helper. It joins only exact numeric graph edge IDs, preserves restriction records, and leaves missing evidence unknown. Matching OSM way IDs alone cannot establish directional graph-edge identity. Even complete candidate records cannot approve original-route identity or full-path clearance.
3. Added and ran four focused tests: exact candidate match, mismatched graph edge despite matching way, missing restrictions and empty input. All passed. This is diagnostic groundwork, not an integrated graph reader or a real-world clearance validation.

Next work requires a source-level graph reader or an engine response extension exposing the original routed directed-edge sequence and associated restriction evidence. Trace map matching and nearby-road locate sampling must not be substituted for that evidence. No server purchase, deployment or driving validation occurred.
