# Nationwide BoxSafe Bridge Dataset Status

## Current official nationwide baseline

FHWA's 2025 highway-bridge download contains 624,193 highway bridges across the reporting States and territories. FHWA identifies 2025 as the final year submitted in the legacy Coding Guide/ASCII format. Beginning with the March 15, 2026 submittal, SNBI uses the JSON submittal schema.

## BoxSafe nationwide candidate dataset

BoxSafe now has code to convert the official 2025 all-state delimited file into a nationwide clearance-candidate dataset.

Candidate records are generated from:

- Item 53: minimum vertical clearance over the bridge roadway.
- Item 54B when Item 54A = H: minimum vertical underclearance for a highway below the structure.

Every imported federal candidate is intentionally marked:

- verificationStatus: SOURCE_VERIFIED
- confidence: LOW
- productionEligible: false

FHWA explicitly warns that NBI data should not be used by itself for route-clearance purposes because clearance data may not be current.

## Critical BoxSafe accuracy finding

A bridge coordinate alone is not enough to decide whether a truck is traveling on the upper roadway or the lower roadway at a grade-separated crossing. Treating every nearby bridge as a low-clearance conflict would create false positives.

For that reason, BoxSafe now preserves:

- featureRole: CARRIED_HIGHWAY or HIGHWAY_BELOW
- facilityName
- crossingFeatureName
- original federal source record

The next accuracy layer must map the returned navigation route to the correct roadway level/facility before a federal candidate can become production eligible.

## Build command

Run:

`bash scripts/build-fhwa-2025-baseline.sh`

The script downloads the official nationwide FHWA ZIP, extracts it, and writes:

`data/fhwa-2025-candidates.json`

## Promotion rule

A candidate should not enter the production low-bridge warning database until BoxSafe has:

1. matched the correct roadway/facility at the crossing,
2. corroborated clearance with a fresher state/local authority source or documented field verification,
3. recorded the verification date and evidence,
4. passed route-level regression tests.
