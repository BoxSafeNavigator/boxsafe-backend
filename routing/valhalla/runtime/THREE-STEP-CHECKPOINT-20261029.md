# BoxSafe: three-step development checkpoint — October 29, 2026

## 1. Check returned route endpoints

The Node adapter now independently decodes the returned route geometry and rejects a first or last point more than 50 meters from the corresponding requested location, even if the private engine supplied a positive endpoint assessment. Reversed routes and displaced origins/destinations reject. Nearby controls still return UNKNOWN_ROUTE_SAFETY. A proximity check does not verify the connecting road, an entrance or physical clearance.

## 2. Expand real-engine restriction coverage

The synthetic HTTP fixture now covers five numerical restrictions: height, gross weight, width, length and axle load. For each, smaller profiles pass the two endpoint controls, over-limit profiles reject both restricted endpoints, and an interior over-limit restriction causes a detour while the smaller profile uses the direct road. Two hgv=no endpoint cases reject. Invalid profiles, outside coverage and stopped engine reject as well.

Final evidence: **35 real-engine HTTP cases, 149 Node tests and 5 Python guard tests passed**. Every successful experimental route retains false safeRouteFound and truckRouteVerified flags. These invented roads test software behavior only; they do not establish real-world map coverage or clearance. The original 13-case snapshot is retained, with the expanded results saved separately.

## 3. Make validation repeatable

Added validate-prototype.py and validation-requirements.txt. The runner checks installed engine/test dependency versions, captures Node/Python versions and source hashes, runs all three check groups, writes logs and a JSON report, and exits nonzero on a failed or timed-out group. It creates a new timestamped output directory for each run. The synthetic services use temporary loopback ports and terminate afterward. Timeout handling terminates the process group.

The recorded run passed under Python 3.12.14, Node v24.22.1, pyvalhalla 3.9.0 and osmium 4.3.2. Passing yields allChecksPassed=true while deploymentReady and navigationReady remain false. See SERVER-VALIDATION.md for reproduction.

## Remaining work

A route may still start within 50 meters on an incorrect nearby road, and the locate candidate evidence is not proof of the exact edge used by the route. Full-route restriction evidence, coverage audits, clearance margins, current bridge/entrance evidence and independent review remain necessary. Toll/freeway preferences remain soft preferences. Conditional, time-dependent, hazmat and unsupported restrictions require further coverage. No public backend deployment, paid hosting, browser sign-in or real driving test was performed.

Next development priority: inspect returned path edge evidence to tie route geometry to restriction assessment, then add no-detour and boundary cases for the newly covered dimensions. Keep all routes experimental until the evidence supports a different state.
