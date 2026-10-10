# Route safety response semantics

HTTP 200 means the request was processed, not that a route is safe for a truck.
`safeRouteFound` and `truckRouteVerified` are always false for the current integration.
Nonempty successful collections return `UNKNOWN_ROUTE_SAFETY` and a DO NOT PROCEED
message. Empty collections return `NO_ROUTE_RETURNED` with a stop message.
Provider failures retain the fail-closed TRUCK response and never retry DRIVE.

`routeVerification` follows the returned route order and retains `originalIndex`.
Every candidate has `verified:false` and reasons: `TRUCK_ROUTING_NOT_USED` for
DRIVE; `RESTRICTIONS_PARTIALLY_IGNORED` for a true TRUCK restriction flag;
`INVALID_RESTRICTION_FLAG` for malformed flags/advisories; otherwise
`UNVERIFIED_TRUCK_ROUTE`. Unknown geometry and local bridge conflicts add their
own reasons. False or absent flags do not establish verification.

`localBridgeAssessment`, `localBridgeWarnings`, and `locallyClearRouteFound` are
local observations only. Sorting favors assessable candidates without known local
conflicts; this is not safe-route selection. The single bundled clearance record
is UNVERIFIED/LOW confidence. Absence of local conflicts does not establish reliable
coverage. `noSafeRouteFound` is true only when every candidate has assessable
geometry and a local recorded collision; merely unverified routes do not set it.
Existing selected-route warnings/events are preserved; events use LOW confidence.
Per-route warnings retain diagnostics for alternatives as well.

Future verification requires a documented, tested truck-capable provider contract
(including vehicle dimensions, restrictions, errors and partial restriction handling),
validated geometry, and authoritative, current, independently verified clearance and
restriction coverage for the entire route. Define provenance, freshness, coverage
and audit requirements before introducing any positive assurance state. Client or
environment claims cannot substitute for this evidence. Google TRUCK mode and
vehicle fields are not validated by mock success. No verification bypass exists.
