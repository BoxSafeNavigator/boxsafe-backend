# BoxSafe Safety Warning Audit Architecture

## Goal

Create a defensible, privacy-conscious record of safety warnings and the driver's subsequent route behavior.

This system is intended for safety operations, incident review, product quality, and potential insurance/guarantee administration. It is not designed to make legal conclusions about fault.

## Important distinction

BoxSafe should not simply label a driver as having "ignored" a warning.

Instead, the system should record objective events, for example:

1. WARNING_ISSUED
2. WARNING_DISPLAYED
3. WARNING_ACKNOWLEDGED (if the driver taps an acknowledgement)
4. HAZARD_BOUNDARY_ENTERED_AFTER_WARNING
5. ROUTE_CHANGED
6. VEHICLE_STOPPED
7. HAZARD_CLEARED
8. INCIDENT_REPORTED

A later rules engine can classify the sequence as PROCEEDED_AFTER_WARNING when the evidence is sufficiently strong.

## Evidence needed

For each warning record, retain:

- unique warning/event ID
- trip ID
- anonymous or account-scoped driver/session ID
- vehicle profile used
- hazard type and hazard ID
- hazard location
- warning creation time
- warning display time
- driver acknowledgement time, if any
- device location samples relevant to the hazard decision point
- route selected at the time
- alternate route availability
- app version
- safety-rule version
- hazard data source and source timestamp
- GPS accuracy when available
- event confidence
- event hash and previous-event hash for tamper-evident sequencing

## When BoxSafe may classify "proceeded after warning"

A high-confidence classification should require all of the following:

- the warning was successfully displayed before the decision point,
- the warning had not expired,
- location accuracy was adequate,
- the device subsequently crossed a defined hazard boundary or decision point,
- the user did not take a route that avoided the hazard,
- the event sequence is internally consistent.

If those conditions are not met, store the raw facts and leave the classification uncertain.

## Insurance / guarantee use

Before using these records to approve or deny a damage guarantee, BoxSafe should have:

- clear terms describing what the guarantee covers,
- explicit driver consent to safety-event logging,
- a privacy notice describing collection and retention,
- a documented appeal/review process,
- secure access controls,
- a retention/deletion policy,
- legal and insurance review of the guarantee language and evidence process.

A GPS/event log can support an incident review, but it should not be treated as infallible proof. GPS drift, stale hazard data, app/device failures, and connectivity loss must be considered.

## Storage recommendation

Production records should be written server-side to a durable database or append-only event store. Client-only records are easier to alter or lose.

Cloud application logs can help during development, but they should not be the sole long-term insurance evidence store.

## Privacy principle

Collect only the route/location data needed for a defined safety or incident purpose. Avoid continuous indefinite tracking when a more limited event window will do.
