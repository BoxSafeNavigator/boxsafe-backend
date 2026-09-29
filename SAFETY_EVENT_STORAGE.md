# BoxSafe Safety Event Storage

BoxSafe stores safety events in Google Cloud Firestore through `safety-event-store.js`.

## Default collection

`boxsafeSafetyEvents`

Override with the environment variable:

`SAFETY_EVENT_COLLECTION`

## Route warning behavior

When a low-bridge warning is generated, BoxSafe attempts to store a `WARNING_ISSUED` event before returning the route response.

The route response includes:

- `safetyEvents`
- `safetyEventPersistence.attempted`
- `safetyEventPersistence.stored`
- `safetyEventPersistence.failed`

If Firestore is temporarily unavailable, route generation remains available. The warning event is still returned to the client, but `failed` indicates it was not durably stored.

## Mobile safety-event endpoint

POST to:

`/safety-events`

The mobile app should use this endpoint for events such as:

- WARNING_DISPLAYED
- WARNING_ACKNOWLEDGED
- ROUTE_CHANGED
- VEHICLE_STOPPED
- HAZARD_BOUNDARY_ENTERED_AFTER_WARNING
- INCIDENT_REPORTED

The server creates its own timestamp, event hash, previous-event hash, and response classification.

## Required Google Cloud setup before deployment testing

1. Create or enable a Firestore database in the same Google Cloud project.
2. Ensure the Cloud Run / Cloud Functions runtime service account can write to Firestore.
3. Deploy the updated backend with the new `@google-cloud/firestore` dependency.
4. Send a controlled test event and confirm it appears in the Firestore collection.
5. Verify the returned hash chain and classification before relying on the records for incident review.

## Evidence caution

These records are operational evidence, not automatic proof of fault. GPS accuracy, warning delivery, connectivity, source freshness, device state, and event ordering must remain part of any incident review.
