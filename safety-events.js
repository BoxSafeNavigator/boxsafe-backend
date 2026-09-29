const crypto = require('crypto');

function canonicalize(value) {
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }

  if (value && typeof value === 'object') {
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ':' + canonicalize(value[key]))
        .join(',') +
      '}'
    );
  }

  return JSON.stringify(value);
}

function createSafetyEvent(input) {
  if (!input || !input.eventType || !input.tripId || !input.hazard) {
    throw new Error('eventType, tripId, and hazard are required.');
  }

  const event = {
    eventId: input.eventId || crypto.randomUUID(),
    eventType: input.eventType,
    tripId: input.tripId,
    driverSessionId: input.driverSessionId || null,
    serverRecordedAt: new Date().toISOString(),
    deviceRecordedAt: input.deviceRecordedAt || null,
    location: input.location || null,
    hazard: input.hazard,
    vehicleProfile: input.vehicleProfile || null,
    routeId: input.routeId || null,
    alternateRouteAvailable:
      input.alternateRouteAvailable === undefined
        ? null
        : Boolean(input.alternateRouteAvailable),
    warningDisplayed:
      input.warningDisplayed === undefined ? null : Boolean(input.warningDisplayed),
    driverAcknowledged:
      input.driverAcknowledged === undefined
        ? null
        : Boolean(input.driverAcknowledged),
    classification: input.classification || null,
    confidence: input.confidence || null,
    appVersion: input.appVersion || null,
    safetyRuleVersion: input.safetyRuleVersion || null,
    previousEventHash: input.previousEventHash || null
  };

  event.eventHash = crypto
    .createHash('sha256')
    .update(canonicalize(event))
    .digest('hex');

  return event;
}

function classifyDriverResponse(events) {
  const ordered = [...events].sort((a, b) =>
    String(a.serverRecordedAt || '').localeCompare(
      String(b.serverRecordedAt || '')
    )
  );

  const warningIndex = ordered.findLastIndex(
    (event) => event.eventType === 'WARNING_DISPLAYED'
  );

  if (warningIndex < 0) {
    return 'UNKNOWN';
  }

  const afterWarning = ordered.slice(warningIndex + 1);
  const crossedIndex = afterWarning.findIndex(
    (event) => event.eventType === 'HAZARD_BOUNDARY_ENTERED_AFTER_WARNING'
  );
  const rerouteIndex = afterWarning.findIndex(
    (event) => event.eventType === 'ROUTE_CHANGED'
  );
  const stoppedIndex = afterWarning.findIndex(
    (event) => event.eventType === 'VEHICLE_STOPPED'
  );

  if (
    crossedIndex >= 0 &&
    (rerouteIndex < 0 || crossedIndex < rerouteIndex) &&
    (stoppedIndex < 0 || crossedIndex < stoppedIndex)
  ) {
    return 'PROCEEDED_AFTER_WARNING';
  }

  if (
    rerouteIndex >= 0 &&
    (crossedIndex < 0 || rerouteIndex < crossedIndex)
  ) {
    return 'AVOIDED_HAZARD';
  }

  if (
    stoppedIndex >= 0 &&
    (crossedIndex < 0 || stoppedIndex < crossedIndex)
  ) {
    return 'STOPPED_BEFORE_HAZARD';
  }

  return 'UNKNOWN';
}

module.exports = {
  canonicalize,
  createSafetyEvent,
  classifyDriverResponse
};
