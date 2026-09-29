# BoxSafe Data Source Register

Track every external dataset used by BoxSafe so the company can demonstrate provenance, permitted use, freshness, and verification status.

| Source | Authority | Data used | BoxSafe role | Freshness / limitation | Status |
| --- | --- | --- | --- | --- | --- |
| SNBI / National Bridge Inventory | Federal Highway Administration | BL05 latitude, BL06 longitude, BID01 bridge number, BID02 bridge name, BH13 highway minimum vertical clearance | Nationwide baseline and cross-check | FHWA warns NBI data should not be used by itself for route-clearance purposes because inspection/clearance data may not be current | Adapter implemented; production ingestion pending |
| State/local DOT clearance sources | Individual transportation agencies | Clearance, restrictions, closures, route-specific details | Higher-priority corroboration and freshness layer | Varies by agency | To be added state by state |
| BoxSafe field verification | BoxSafe-controlled process | Observed signage/clearance evidence and verification date | Highest-confidence corroboration when properly documented | Must preserve evidence and date | Planned |
| User reports | BoxSafe users | Potential changes/conflicts | Lead-generation and anomaly detection only | Unverified until corroborated | Planned |

## Rules

1. Never silently overwrite a verified authoritative value with a user report.
2. Preserve the original source identifier and source date.
3. Conflicting records are review items, not automatic replacements.
4. Production warnings should expose verification status internally and eventually in the driver-facing product where useful.
5. Review licensing/terms for every non-federal dataset before production use.
