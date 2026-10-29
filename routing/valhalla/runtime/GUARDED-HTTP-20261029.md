# Guarded HTTP integration checkpoint — October 29, 2026

The real Valhalla 3.9.0 Actor, private Python transport, Node adapter and public-facing application handler were exercised together over loopback HTTP. This is a synthetic development test, not a deployed service or driving validation.

## Finding and change

The first run reproduced an additional endpoint problem: for an origin on an `hgv=no` edge, truck correlation selected a permitted road approximately 460.3 meters away and returned a route. Height/weight origin and destination checks had passed before this failure. The partial first run and observed failure are preserved in `guarded-http-initial-results.json`.

The endpoint guard now requires finite, valid correlated coordinates and rejects the entire request if any returned candidate is more than 50 meters from its requested endpoint. Distance is computed with a spherical great-circle calculation. This conservative prototype policy can over-reject legitimate requests. It does not verify an entrance, prevent every incorrect snap within 50 meters, or prove that Actor route correlation uses exactly the same candidate as locate. The upstream endpoint defects remain unresolved.

## Verification

- 13 real-engine HTTP cases passed: four smaller height/weight controls return experimental routes; four over-limit origin/destination profiles and two truck-prohibited endpoints return no route; invalid profile, outside coverage and stopped engine also reject.
- All responses retain false truckRouteVerified and safeRouteFound flags. Successful responses remain UNKNOWN_ROUTE_SAFETY.
- 5 Python guard tests passed, including nearby/distant candidates, invalid coordinate evidence, restriction conflict and mixed near/far candidate rejection.
- Existing 145 Node tests passed.

The test adds a connected synthetic grid to the original restriction fixture, keeping Valhalla's default reachability filter intact. No production reachability setting is relaxed. All fixture roads are invented; they are not geographic evidence. No paid server, backend deployment or browser validation was performed.

## Reproduce

Use the isolated pinned `pyvalhalla==3.9.0` runtime with `osmium==4.3.2` and Node installed:

```sh
python routing/valhalla/runtime/guarded-http-smoke.py --work-dir /absolute/temporary/directory
python -m unittest discover -s routing/valhalla/runtime -p 'test_endpoint_guard.py'
node --test test/*.test.cjs
```

The HTTP test temporarily uses loopback ports 8002 and 8085 and terminates its child services afterward. Results and generated graph remain in the supplied temporary directory.

Next: verify that rendered route geometry endpoints also remain near the requested coordinates, and reject disagreements between endpoint assessment and the returned route. This is still a prototype requiring broader restriction coverage and deployment hardening before any driving use.
