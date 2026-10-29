# Private app-to-engine connection milestone

The Node server now serves the UI and POST /route on the same loopback origin. Start with `node routing/valhalla/server.cjs`, then open http://127.0.0.1:8085 on that machine (or use a properly secured private tunnel). Configure VALHALLA_URL and data/build labels only for a real private engine. Default endpoint is localhost:8002. No running engine was available in this milestone.

The experimental engine button is enabled only by the Node-served page marker. Static hosted preview stays sample-only. It posts the prepared request, hides fixed sample results, displays unverified engine summaries as text, and shows a stop error on failure. Changed inputs invalidate in-flight results. No car fallback or navigation guidance added. Route geometry is not plotted yet; map remains decorative.

JSON-only requests, body bound, same-origin browser checks and loopback binding remain private-development controls, not production authentication. No public backend deployment performed.

142 local tests pass, including real localhost app-server requests and UI logic tests for engine success/failure. Inline JavaScript syntax and diff checks pass. UI harness now correctly runs multiple input listeners. Visual browser QA, real-device behavior, engine graph tests and clearance evidence remain outstanding. Agency inquiry is awaiting reply.
