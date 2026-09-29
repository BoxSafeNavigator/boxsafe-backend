const functions = require('@google-cloud/functions-framework');
const lowBridges = [
  {
    id: 'stone-mountain-james-b-rivers',
    name: 'CSX Bridge - James B. Rivers Memorial Drive',
    latitude: 33.81218,
    longitude: -84.17035,
    clearanceMm: 3658
  }
];

function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5
    });
  }

  return points;
}

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
function getLowBridgeWarnings(truck, routesData) {
  const warnings = [];
  const encodedPolyline =
    routesData?.routes?.[0]?.polyline?.encodedPolyline;

  if (!encodedPolyline) {
    return warnings;
  }

  const routePoints = decodePolyline(encodedPolyline);
  const truckHeightMm = Number(truck.heightMm);

  for (const bridge of lowBridges) {
    const bridgePoint = {
      latitude: bridge.latitude,
      longitude: bridge.longitude
    };

    const nearRoute = routePoints.slice(0, -1).some(
  (point, index) =>
    distanceToSegmentMeters(
      bridgePoint,
      point,
      routePoints[index + 1]
    ) <= 75
);
    if (nearRoute && truckHeightMm > bridge.clearanceMm) {
      warnings.push({
        bridgeId: bridge.id,
        bridgeName: bridge.name,
        truckHeightMm,
        bridgeClearanceMm: bridge.clearanceMm,
        message: `CRITICAL LOW BRIDGE - DO NOT PROCEED: truck height ${truckHeightMm} mm exceeds bridge clearance ${bridge.clearanceMm} mm by ${truckHeightMm - bridge.clearanceMm} mm. REROUTE REQUIRED.`,
        distanceThresholdMeters: 75,
        unsafe: true
      });
    }
  }

  return warnings;
}
functions.http('helloHttp', async (req, res) => {
  try {
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

      const data = await response.json();

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

      result = await callRoutes(truckRequest);

      if (result.ok) {
        routingMode = 'TRUCK';
      } else {
        truckRoutingFallback = true;

        result = await callRoutes({
          origin,
          destination,
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: true
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

  const candidateRoutes = result.data?.routes || [];
  const safeRouteIndex = candidateRoutes.findIndex(
    (route) => getLowBridgeWarnings(truck, { routes: [route] }).length === 0
  );

  const safeRouteFound = safeRouteIndex >= 0;
  const noSafeRouteFound = candidateRoutes.length > 0 && !safeRouteFound;
  const routeSafetyStatus =
    candidateRoutes.length === 0
      ? 'NO_ROUTE_RETURNED'
      : noSafeRouteFound
        ? 'NO_SAFE_ROUTE_FOUND'
        : 'SAFE_ROUTE_SELECTED';

  if (safeRouteIndex > 0) {
    const [safeRoute] = candidateRoutes.splice(safeRouteIndex, 1);
    candidateRoutes.unshift(safeRoute);
  }

  return res.status(result.status).json({
  boxSafe: {
    routingMode,
    truckRoutingRequested: useTruckRouting,
    truckRoutingFallback,
    truckProfile: truck,
    routeSafetyStatus,
    safeRouteFound,
    noSafeRouteFound,
    evaluatedRouteCount: candidateRoutes.length,
    safetyMessage: noSafeRouteFound
      ? 'NO SAFE ROUTE FOUND: every returned route conflicts with a known low bridge for this truck profile. DO NOT PROCEED until a safe route is available.'
      : null,
    lowBridgeWarnings: getLowBridgeWarnings(truck, result.data),
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