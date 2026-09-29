const { Firestore } = require('@google-cloud/firestore');
const { createSafetyEvent, classifyDriverResponse } = require('./safety-events');

const firestore = new Firestore();
const collectionName =
  process.env.SAFETY_EVENT_COLLECTION || 'boxsafeSafetyEvents';

const allowedEventTypes = new Set([
  'WARNING_ISSUED',
  'WARNING_DISPLAYED',
  'WARNING_ACKNOWLEDGED',
  'HAZARD_BOUNDARY_ENTERED_AFTER_WARNING',
  'ROUTE_CHANGED',
  'VEHICLE_STOPPED',
  'HAZARD_CLEARED',
  'INCIDENT_REPORTED'
]);

function validateSafetyEventInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Safety event body is required.');
  }

  if (!allowedEventTypes.has(input.eventType)) {
    throw new Error('Invalid safety event type.');
  }

  if (!input.tripId || typeof input.tripId !== 'string') {
    throw new Error('tripId is required.');
  }

  if (
    !input.hazard ||
    typeof input.hazard !== 'object' ||
    !input.hazard.hazardType ||
    !input.hazard.hazardId
  ) {
    throw new Error('hazard.hazardType and hazard.hazardId are required.');
  }

  if (input.location != null) {
    const latitude = Number(input.location.latitude);
    const longitude = Number(input.location.longitude);
    const accuracyMeters =
      input.location.accuracyMeters == null
        ? null
        : Number(input.location.accuracyMeters);

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error('location must contain valid latitude and longitude.');
    }

    if (
      accuracyMeters != null &&
      (!Number.isFinite(accuracyMeters) || accuracyMeters < 0)
    ) {
      throw new Error('location.accuracyMeters must be zero or greater.');
    }
  }
}

async function getTripEvents(tripId) {
  const snapshot = await firestore
    .collection(collectionName)
    .where('tripId', '==', tripId)
    .get();

  return snapshot.docs
    .map((doc) => doc.data())
    .sort((a, b) =>
      String(a.serverRecordedAt || '').localeCompare(
        String(b.serverRecordedAt || '')
      )
    );
}

async function persistSafetyEvent(event) {
  await firestore.collection(collectionName).doc(event.eventId).set(event);
  return event;
}

async function recordSafetyEvent(input) {
  validateSafetyEventInput(input);

  const priorEvents = await getTripEvents(input.tripId);
  const previousEventHash =
    priorEvents.length > 0
      ? priorEvents[priorEvents.length - 1].eventHash || null
      : null;

  const classification = classifyDriverResponse([
    ...priorEvents,
    {
      eventType: input.eventType,
      serverRecordedAt: new Date().toISOString()
    }
  ]);

  const event = createSafetyEvent({
    ...input,
    classification,
    previousEventHash
  });

  await persistSafetyEvent(event);
  return event;
}

module.exports = {
  collectionName,
  getTripEvents,
  persistSafetyEvent,
  recordSafetyEvent,
  validateSafetyEventInput
};
