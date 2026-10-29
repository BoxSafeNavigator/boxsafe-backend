# Private engine acceptance plan

Purpose: prepare for a compatible development machine or rented server without buying or activating services.

## Before graph build

1. Install the official Valhalla 3.9.0 release using its supported build instructions. Record the resolved source commit or immutable image digest, OS, compiler and configuration. A version label alone is not a reproducibility lock.
2. Run `python3 routing/valhalla/ops/check-readiness.py --extract /absolute/path/south-carolina-261028.osm.pbf`. This performs read-only checks and hashes the complete extract. An exit code of 1 means prerequisites are missing; it does not repair them.
3. Inspect embedded extract timestamp and boundary with osmium; compare the source checksum. Record OSM/Geofabrik attribution and ODbL obligations. Inspect border coverage before testing routes across state lines.
4. Build the graph in a separate data directory, capturing wall time, peak RAM, disk usage, command versions and exact configuration. Assign a graph build ID only after successful completion. Do not invent build metrics or a graph ID.
5. Bind the engine privately. Configure the adapter with its private URL and recorded dataset/build labels. Never expose the unauthenticated prototype endpoint publicly.

## Required engine tests

| Case | Required evidence |
|---|---|
| Known low crossing | Independently dated restriction source, coordinates and graph edge identification; over-height truck must avoid the crossing or receive no route |
| Weight restriction | Independently evidenced limit; loaded truck above limit must not traverse the prohibited edge |
| HGV access prohibition | Confirm access tag and restriction evidence; route must avoid prohibited access |
| Missing restriction tags | Result remains unknown; missing tags cannot count as verified clearance |
| No connected route | Error, no car fallback, no usable route payload |
| Engine stopped or delayed | Bounded failure, stop message, no downgrade |
| Valid regional route | Geometry, distance, duration and maneuvers are consistent; verification remains false |
| Regional boundary | Out-of-coverage endpoints fail clearly; do not imply nationwide coverage |

Tests must check returned geometry against the prohibited crossing, not just whether HTTP returned success. A detour alone does not establish the reason for avoidance. Compare a smaller control profile and examine edge attribution. Synthetic restriction fixtures validate engine behavior; independent real-world evidence validates the selected pilot cases. Neither establishes complete statewide coverage.

Record case ID, engine commit, graph ID, source evidence, profile, request, response, observed geometry and reviewer decision. Never put API credentials in test records. Measure warm/cold latency and failures across repeated requests before proposing server capacity.

## Current status — October 29, 2026

South Carolina extract downloaded and SHA-256 recorded. Adapter has 110 passing local tests; live engine tests are outstanding. Package installation in the current temporary workspace failed on user/group switching permissions. No server purchase, engine deployment, graph build or driving authorization exists.
