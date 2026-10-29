# Real engine checkpoint — October 29, 2026

Supersedes earlier statements that this workspace cannot install/run Valhalla. System package installation failed, but official pyvalhalla==3.9.0 binary wheel installed successfully in an isolated Python 3.12 environment. The module CLI wrapper failed; invoking the bundled native executable by absolute path worked.

## Verified outcomes

- Native valhalla_build_tiles reported 3.9.0 and exited 0 after building the South Carolina extract.
- Input SHA-256: f91cbefa10071fc827458c5f233f341d55dbffcfe2d5905dcb2cd21e360a12db.
- Graph: 181 .gph files. Approximately 1.2 GiB directory including retained build intermediates; this is not production storage sizing.
- Graph content fingerprint: e2e1a2846b6253b561ae4ded778938344ca53307858eceb02de24035baebe514 (sorted relative .gph path bytes followed by each file's SHA-256 digest).
- Configuration SHA-256: 0be4015514bad19fbbd6201c35fb92212c2b2805ae3d43622d832c0eb4ced77d.
- Build observed for approximately 3 minutes. Sampled process high-water RSS reached 1,166,240 KiB; final peak was not captured, so do not label this measured peak or size hosting from it.
- Real truck request through Python Actor returned 5.978 km, 465.26 seconds, seven maneuvers and polyline6 geometry. Actor initialization plus first query took approximately 0.167 seconds in one run; not a latency benchmark.
- Existing Node normalize() accepted the real result, produced a schematic and retained UNKNOWN_ROUTE_SAFETY, safeRouteFound false and truckRouteVerified false.

sc-smoke-input.json contains a fictional truck profile and test coordinates, not the owner's truck or an approved driving route. sc-smoke-response.json preserves real engine output for this request. No commercial routing service or public demo endpoint used.

## Limitations and next gate

No authoritative known-crossing restriction test has passed yet. No positive clearance assurance. No live GPS, basemap, field validation, UI browser validation, or public backend deployment. Dedicated admin/timezone databases were not built; configuration uses package defaults and graph sources require further review. Truck costing requested restrictions but successful output does not prove all restrictions or clearance coverage are complete.

Next: reproduce route through the private HTTP adapter, test engine failure/no-route behavior against actual engine, then build controlled restriction fixtures and independently evidenced pilot cases. Retain graph/data/build provenance and measure repeated query latency/RAM before hosting selection. Runtime and graph are temporary workspace assets; GitHub retains the checkpoint and reproducible package pin, not installed binaries or full graph.
