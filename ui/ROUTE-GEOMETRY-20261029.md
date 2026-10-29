# Engine route schematic milestone

Adapter now projects validated polyline6 route coordinates into a bounded, north-up schematic. The private Node-served UI displays that path after an experimental engine response. It is not a basemap: no road labels, tiles, traffic, scale, GPS location or clearance assurance. Coordinate spans use simple normalized longitude/latitude axes and are not distance-preserving cartography. No real engine is running here.

144 local tests pass, including orientation, invalid/degenerate geometry, HTTP transport and UI result handling. A 50,000-point limit bounds schematic generation. Browser visual/device testing remains outstanding. Hosted private Site remains its previous sample-only version; this milestone is code on the development branch only.

Next gate is live engine and graph testing on a compatible machine, plus browser/device validation when account sign-in is available. No navigation-ready release or production backend deployment.
