# Real-engine synthetic restriction checks — October 29, 2026

Six controlled cases passed on real Valhalla 3.9.0 over a separate tiny artificial graph. Three disconnected road networks each have a direct interior edge and a longer unrestricted detour. Direct edges carry respectively maxheight=3 metres, maxweight=5 tonnes, or hgv=no. Two truck profiles test each dimension; auto vs truck tests access prohibition. Detour detection uses the known synthetic geometry, not HTTP success alone. Inputs are fictional and not actual South Carolina road claims.

Initial fixture results are preserved. When the complete direct road including origin/destination was restricted, taller/heavier profiles still used it. This is unresolved endpoint/correlation behavior, not proven safe restriction enforcement. Corrected fixture adds unrestricted entry/exit edges so the restriction is strictly intermediate. All six corrected cases passed. This does not establish strict endpoint restriction handling, complete graph restrictions, no-route enforcement without a detour, or real-world clearance.

Run with isolated Python containing pyvalhalla==3.9.0 and osmium==4.3.2. Create an empty tiles directory beside run.py first. The script writes roads.osm, roads.osm.pbf, config.json, build.log and results.json beside itself and invokes the bundled native builder. Use a scratch copy, not a live graph directory. Existing fixture graph files are overwritten on rebuild. Results are for synthetic tag behavior only. Graph does not include real clearance evidence.

Next: test endpoint exceptions and disconnected/no-alternative restricted paths, inspect restriction flags and real pilot evidence before any navigation release. All BoxSafe safety flags remain false. No public deployment.
