const functions = require('@google-cloud/functions-framework');
const crypto = require('crypto');
const { createSafetyEvent } = require('./safety-events');
const { recordSafetyEvent } = require('./safety-event-store');
const DEFAULT_LOW_BRIDGE_ROUTE_THRESHOLD_METERS = 75;
const lowBridgeData = require('./low-bridges.json');
const lowBridges = lowBridgeData.records || [];

const { assessGeometry } = require('./route-geometry');

function distanceMeters(a, b) {
  const R = 6371000;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLng = (b.longitude - a.longitude) * Math.PI / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function distanceToSegmentMeters(point, start, end) {
  const latScale = 111320;
  const avgLat =
    ((start.latitude + end.latitude + point.latitude) / 3) *
    Math.PI / 180;

  const lngScale = 111320 * Math.cos(avgLat);

  const ax = start.longitude * lngScale;
  const ay = start.latitude * latScale;
  const bx = end.longitude * lngScale;
  const by = end.latitude * latScale;
  const px = point.longitude * lngScale;
  const py = point.latitude * latScale;

  const abX = bx - ax;
  const abY = by - ay;
  const abLengthSquared = abX * abX + abY * abY;

  if (abLengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  let t =
    ((px - ax) * abX + (py - ay) * abY) /
    abLengthSquared;

  t = Math.max(0, Math.min(1, t));

  const closestX = ax + t * abX;
  const closestY = ay + t * abY;

  return Math.hypot(px - closestX, py - closestY);
}
function minimumDistanceToRouteMeters(point, routePoints) {
  if (routePoints.length === 0) {
    return Infinity;
  }

  if (routePoints.length === 1) {
    return distanceMeters(point, routePoints[0]);
  }

  let minimumDistance = Infinity;

  for (let index = 0; index < routePoints.length - 1; index += 1) {
    minimumDistance = Math.min(
      minimumDistance,
      distanceToSegmentMeters(
        point,
        routePoints[index],
        routePoints[index + 1]
      )
    );
  }

  return minimumDistance;
}

function getLowBridgeWarnings(truck, routePoints) {
  const warnings = [];
  const truckHeightMm = Number(truck.heightMm);

  for (const bridge of lowBridges) {
    const bridgePoint = {
      latitude: bridge.latitude,
      longitude: bridge.longitude
    };

    const distanceThresholdMeters =
      bridge.routeMatchThresholdMeters ||
      DEFAULT_LOW_BRIDGE_ROUTE_THRESHOLD_METERS;
    const routeDistanceMeters = minimumDistanceToRouteMeters(
      bridgePoint,
      routePoints
    );
    const nearRoute = routeDistanceMeters <= distanceThresholdMeters;

    if (nearRoute && truckHeightMm > bridge.clearanceMm) {
      warnings.push({
        bridgeId: bridge.id,
        bridgeName: bridge.name,
        truckHeightMm,
        bridgeClearanceMm: bridge.clearanceMm,
        routeDistanceMeters: Math.round(routeDistanceMeters),
        message: `CRITICAL LOW BRIDGE - DO NOT PROCEED: truck height ${truckHeightMm} mm exceeds bridge clearance ${bridge.clearanceMm} mm by ${truckHeightMm - bridge.clearanceMm} mm. REROUTE REQUIRED.`,
        distanceThresholdMeters,
        unsafe: true
      });
    }
  }

  return warnings;
}
functions.http('helloHttp', async (req, res) => {
  try {
    if (req.path === '/safety-events') {
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: 'Method not allowed. Use POST for /safety-events.'
        });
      }

      try {
        const event = await recordSafetyEvent(req.body || {});

        return res.status(201).json({
          boxSafe: {
            safetyEventStored: true,
            safetyEvent: event
          }
        });
      } catch (eventError) {
        console.error('Safety event storage failed:', eventError);

        const validationMessages = [
          'required',
          'Invalid safety event type',
          'location'
        ];
        const isValidationError = validationMessages.some((message) =>
          eventError.message?.includes(message)
        );

        return res.status(isValidationError ? 400 : 500).json({
          error: isValidationError
            ? 'Invalid BoxSafe safety event.'
            : 'BoxSafe safety event could not be stored.',
          details: eventError.message
        });
      }
    }
    const apiKey = process.env.ROUTES_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'ROUTES_API_KEY is not configured.'
      });
    }

    const inputErrors = [];

    function validateWaypoint(name, waypoint) {
      if (waypoint == null) {
        return null;
      }

      const latitude = Number(waypoint?.location?.latLng?.latitude);
      const longitude = Number(waypoint?.location?.latLng?.longitude);

      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        inputErrors.push(
          `${name} must contain valid location.latLng latitude and longitude values.`
        );
      }

      return waypoint;
    }

    function positiveNumberOrDefault(value, defaultValue, fieldName) {
      if (value === undefined || value === null || value === '') {
        return defaultValue;
      }

      const numericValue = Number(value);

      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        inputErrors.push(`${fieldName} must be a positive number.`);
        return defaultValue;
      }

      return numericValue;
    }

    const origin =
      validateWaypoint('origin', req.body?.origin) || {
        location: {
          latLng: {
            latitude: 33.7488,
            longitude: -84.3877
          }
        }
      };

    const destination =
      validateWaypoint('destination', req.body?.destination) || {
        location: {
          latLng: {
            latitude: 33.6407,
            longitude: -84.4277
          }
        }
      };

    const requestedTruck = req.body?.truck || {};
    const axleCount = positiveNumberOrDefault(
      requestedTruck.axleCount,
      2,
      'truck.axleCount'
    );

    if (!Number.isInteger(axleCount)) {
      inputErrors.push('truck.axleCount must be a whole number.');
    }

    const truck = {
      heightMm: String(
        positiveNumberOrDefault(requestedTruck.heightMm, 3962, 'truck.heightMm')
      ),
      widthMm: String(
        positiveNumberOrDefault(requestedTruck.widthMm, 2591, 'truck.widthMm')
      ),
      lengthMm: String(
        positiveNumberOrDefault(requestedTruck.lengthMm, 7925, 'truck.lengthMm')
      ),
      weightKg: String(
        positiveNumberOrDefault(requestedTruck.weightKg, 11793, 'truck.weightKg')
      ),
      axleCount
    };

    if (inputErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid BoxSafe route request.',
        details: inputErrors
      });
    }

    const tripId = req.body?.tripId || crypto.randomUUID();
    const driverSessionId = req.body?.driverSessionId || null;

    const useTruckRouting = req.body?.useTruckRouting === true;

    async function callRoutes(body) {
      const response = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory,routes.polylineDetails.restrictionInfo',
          },
          body: JSON.stringify(body)
        }
      );

      let data;
      try {
        data = await response.json();
      } catch (error) {
        if (!useTruckRouting) throw error;
        return {
          ok: false,
          status: response.ok ? 502 : response.status,
          failureReason: 'INVALID_PROVIDER_JSON',
          data: null
        };
      }

      return {
        ok: response.ok,
        status: response.status,
        data
      };
    }

    let result;
    let routingMode = 'DRIVE';
    let truckRoutingFallback = false;

    if (useTruckRouting) {
      const truckRequest = {
        origin,
        destination,
        travelMode: 'TRUCK',
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
        computeAlternativeRoutes: true,

        routeModifiers: {
          vehicleInfo: {
            totalHeightMm: truck.heightMm,
            totalWidthMm: truck.widthMm,
            totalLengthMm: truck.lengthMm,
            totalWeightKg: truck.weightKg
          }
        }
      };

      routingMode = 'TRUCK';
      let failureReason;
      try {
        result = await callRoutes(truckRequest);
        if (!result.ok) failureReason = result.failureReason || 'UPSTREAM_HTTP_ERROR';
        else if (!Array.isArray(result.data?.routes)) {
          failureReason = 'INVALID_PROVIDER_RESPONSE';
          result.status = 502;
        }
      } catch {
        // Never expose provider bodies, exception messages or credentials.
        failureReason = 'PROVIDER_REQUEST_FAILED';
      }

      if (failureReason) {
        return res.status(result?.status || 500).json({
          error: 'Truck routing is unavailable.',
          boxSafe: {
            tripId,
            driverSessionId,
            routingMode,
            truckRoutingRequested: true,
            truckRoutingFallback: false,
            truckProfile: truck,
            truckRoutingStatus: 'TRUCK_ROUTING_UNAVAILABLE',
            routeSafetyStatus: 'UNKNOWN_ROUTE_SAFETY',
            safeRouteFound: false,
            noSafeRouteFound: false,
            evaluatedRouteCount: 0,
            routeCollectionValid: false,
            unknownRouteCount: 0,
            routeGeometry: [],
            lowBridgeWarnings: [],
            safetyEvents: [],
            safetyEventPersistence: { attempted: 0, stored: 0, failed: 0 },
            upstreamError: { reason: failureReason, status: result?.status || null },
            safetyMessage: 'TRUCK ROUTING UNAVAILABLE: DO NOT PROCEED until a truck-capable provider or independent truck-route verification is available.'
          }
        });
      }
    } else {
      result = await callRoutes({
        origin,
        destination,
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: true
      });
    }

  const routeCollectionValid = Array.isArray(result.data?.routes);
  const candidateRoutes = routeCollectionValid ? result.data.routes : [];
  // Assess each candidate exactly once; unknown geometry is not a clear route.
  const evaluations = candidateRoutes.map((route, originalIndex) => {
    const geometry = assessGeometry(route?.polyline?.encodedPolyline);
    const warnings = geometry.valid ? getLowBridgeWarnings(truck, geometry.points) : [];
    return { originalIndex, geometry, warnings };
  });
  const locallyClearRouteIndex = evaluations.findIndex(
    ({ geometry, warnings }) => geometry.valid && warnings.length === 0
  );
  const unknownRouteCount = evaluations.filter(({ geometry }) => !geometry.valid).length;
  // Local geometry and bridge observations are diagnostics, not truck assurance.
  const safeRouteFound = false;
  const locallyClearRouteFound = locallyClearRouteIndex >= 0;
  const routeSafetyUnknown = !routeCollectionValid || unknownRouteCount > 0;
  const noSafeRouteFound = candidateRoutes.length > 0 && !locallyClearRouteFound && !routeSafetyUnknown;
  const routeSafetyStatus = routeSafetyUnknown
    ? 'UNKNOWN_ROUTE_SAFETY'
    : candidateRoutes.length === 0
      ? 'NO_ROUTE_RETURNED'
      : 'UNKNOWN_ROUTE_SAFETY';

  if (locallyClearRouteIndex > 0) {
    const [safeRoute] = candidateRoutes.splice(locallyClearRouteIndex, 1);
    candidateRoutes.unshift(safeRoute);
    const [evaluation] = evaluations.splice(locallyClearRouteIndex, 1);
    evaluations.unshift(evaluation);
  }

  const routeVerification = evaluations.map(({ originalIndex, geometry, warnings }, index) => {
    const candidate = candidateRoutes[index];
    const advisory = candidate?.travelAdvisory;
    const flag = advisory?.routeRestrictionsPartiallyIgnored;
    const malformedAdvisory = advisory !== undefined &&
      (advisory === null || typeof advisory !== 'object' || Array.isArray(advisory));
    const malformedFlag = malformedAdvisory || (flag !== undefined && typeof flag !== 'boolean');
    const reasons = [useTruckRouting
      ? flag === true ? 'RESTRICTIONS_PARTIALLY_IGNORED'
        : malformedFlag ? 'INVALID_RESTRICTION_FLAG' : 'UNVERIFIED_TRUCK_ROUTE'
      : 'TRUCK_ROUTING_NOT_USED'];
    if (!geometry.valid) reasons.push('UNKNOWN_ROUTE_GEOMETRY');
    if (warnings.length) reasons.push('LOCAL_BRIDGE_CONFLICT');
    return {
      originalIndex,
      verified: false,
      reasons,
      localBridgeAssessment: !geometry.valid ? 'NOT_ASSESSABLE'
        : warnings.length ? 'KNOWN_CONFLICT' : 'NO_KNOWN_CONFLICT',
      localBridgeWarnings: warnings,
      clearanceCoverage: 'UNVERIFIED'
    };
  });
  const lowBridgeWarnings = evaluations[0]?.warnings || [];
  const safetyEvents = [];
  let storedSafetyEventCount = 0;

  for (const warning of lowBridgeWarnings) {
    const eventInput = {
      eventType: 'WARNING_ISSUED',
      tripId,
      driverSessionId,
      hazard: {
        hazardType: 'LOW_BRIDGE',
        hazardId: warning.bridgeId,
        severity: 'CRITICAL',
        source: 'BoxSafe low-bridge verification engine',
        sourceTimestamp: new Date().toISOString()
      },
      vehicleProfile: truck,
      routeId: null,
      alternateRouteAvailable: safeRouteFound,
      warningDisplayed: null,
      driverAcknowledged: null,
      confidence: 'LOW',
      safetyRuleVersion: 'low-bridge-v1'
    };

    try {
      const storedEvent = await recordSafetyEvent(eventInput);
      safetyEvents.push(storedEvent);
      storedSafetyEventCount += 1;
    } catch (storageError) {
      console.error('Low-bridge safety event storage failed:', storageError);
      safetyEvents.push(
        createSafetyEvent({
          ...eventInput,
          classification: null,
          previousEventHash: null
        })
      );
    }
  }

  const safetyEventPersistence = {
    attempted: lowBridgeWarnings.length,
    stored: storedSafetyEventCount,
    failed: lowBridgeWarnings.length - storedSafetyEventCount
  };

  return res.status(result.status).json({
    boxSafe: {
      tripId,
      driverSessionId,
      routingMode,
      truckRoutingRequested: useTruckRouting,
      truckRoutingFallback,
      truckProfile: truck,
      routeSafetyStatus,
      routeVerification,
      truckRouteVerified: false,
      localBridgeAssessmentOnly: true,
      locallyClearRouteFound,
      safeRouteFound,
      noSafeRouteFound,
      evaluatedRouteCount: candidateRoutes.length,
      routeCollectionValid,
      unknownRouteCount,
      routeGeometry: evaluations.map(({ originalIndex, geometry }) => ({
        originalIndex,
        status: geometry.valid ? 'VALID' : 'UNKNOWN',
        reason: geometry.reason,
        pointCount: geometry.points.length
      })),
      safetyMessage: candidateRoutes.length === 0 && routeCollectionValid
        ? 'NO ROUTE RETURNED: DO NOT PROCEED without an assessable, independently verified truck route.'
        : noSafeRouteFound
          ? 'KNOWN LOCAL BRIDGE CONFLICTS: every assessable candidate conflicts with a recorded bridge. DO NOT PROCEED. Clearance records remain unverified.'
          : 'UNKNOWN ROUTE SAFETY: DO NOT PROCEED for truck navigation until a truck-capable provider and reliable clearance coverage are independently verified.',
      lowBridgeWarnings,
      safetyEvents,
      safetyEventPersistence
    },
    googleRoutes: result.data
  });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'BoxSafe route request failed.'
    });
  }
});