'use strict';
const { plot } = require('./plot.cjs');
class RoutingError extends Error {
  constructor(code, status = 502) { super(code); this.code = code; this.status = status; }
}
const fail = () => { throw new RoutingError('INVALID_ROUTE_INPUT', 400); };
function number(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail();
  return value;
}
function measure(item, factors, min, max) {
  if (!item || !Object.hasOwn(factors, item.unit)) fail();
  return number(number(item.value, Number.MIN_VALUE, 1e9) * factors[item.unit], min, max);
}
function buildRequest(input) {
  if (!input || !input.truck || !Array.isArray(input.locations) || input.locations.length !== 2) fail();
  const preferences = input.preferences === undefined ? {} : input.preferences;
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) fail();
  for (const key of Object.keys(preferences)) {
    if (!['preferFewerFreeways', 'preferFewerTolls'].includes(key) || typeof preferences[key] !== 'boolean') fail();
  }
  const p = input.truck;
  const length = { m: 1, ft: 0.3048, in: 0.0254 };
  const mass = { tonnes: 1, kg: 0.001, lb: 0.00045359237 };
  const truck = {
    height: measure(p.height, length, 0.1, 10),
    width: measure(p.width, length, 0.1, 10),
    length: measure(p.length, length, 0.1, 50),
    weight: measure(p.loadedWeight, mass, 0.1, 100),
    axle_load: measure(p.maxAxleLoad, mass, 0.1, 40),
    axle_count: number(p.axleCount, 2, 10),
    hazmat: p.hazmat,
    ignore_restrictions: false, ignore_access: false, ignore_oneways: false,
    ignore_non_vehicular_restrictions: false, ignore_closures: false,
    use_highways: preferences.preferFewerFreeways ? 0 : 0.5,
    use_tolls: preferences.preferFewerTolls ? 0 : 0.5,
    hgv_no_access_penalty: 43200
  };
  if (!Number.isInteger(truck.axle_count) || typeof truck.hazmat !== 'boolean' || truck.axle_load > truck.weight) fail();
  return {
    locations: input.locations.map(p => {
      if (!p) fail();
      return { lat: number(p.lat, -90, 90), lon: number(p.lon, -180, 180), type: 'break' };
    }),
    costing: 'truck', costing_options: { truck }, units: 'kilometers', language: 'en-US',
    shape_format: 'polyline6', alternates: 0
  };
}
function normalize(data, provenance) {
  if (!data || !data.trip || data.trip.status !== 0 || data.trip.units !== 'kilometers' ||
      !Array.isArray(data.trip.legs) || data.trip.legs.length !== 1) throw new RoutingError('INVALID_ENGINE_RESPONSE');
  const trip = data.trip;
  const leg = trip.legs[0];
  const schematicPoints = plot(decode6(leg.shape));
  if (!trip.summary || typeof trip.summary.length !== 'number' || !Number.isFinite(trip.summary.length) || trip.summary.length < 0 ||
      typeof trip.summary.time !== 'number' || !Number.isFinite(trip.summary.time) || trip.summary.time < 0 ||
      !Array.isArray(leg.maneuvers) || !leg.maneuvers.length ||
      leg.maneuvers.some(m => !m || typeof m.instruction !== 'string' || !m.instruction.trim())) throw new RoutingError('INVALID_ENGINE_RESPONSE');
  return { status: 'UNKNOWN_ROUTE_SAFETY', safeRouteFound: false, truckRouteVerified: false,
    message: 'DO NOT PROCEED using this experimental route for navigation. Clearance coverage is unverified.',
    route: { geometry: { encodedPolyline: leg.shape, precision: 6, schematicPoints }, distanceMeters: trip.summary.length * 1000,
      durationSeconds: trip.summary.time, maneuvers: leg.maneuvers.map(m => ({ instruction: m.instruction })) },
    provenance: { ...provenance, engine: 'Valhalla', requestedEngineVersion: '3.9.0', restrictionCoverage: 'unknown', attribution: '© OpenStreetMap contributors', license: 'ODbL-1.0' }
  };
}
function decode6(shape) {
  if (typeof shape !== 'string' || !shape.length || shape.length > 1000000) throw new RoutingError('INVALID_ENGINE_GEOMETRY');
  let i = 0, lat = 0, lon = 0; const points = [];
  const component = () => {
    let value = 0, factor = 1;
    for (let n = 0; n < 7; n++, factor *= 32) {
      if (i >= shape.length) break;
      const b = shape.charCodeAt(i++) - 63;
      if (b < 0 || b > 63) break;
      value += (b % 32) * factor;
      if (value > 0xffffffff) break;
      if (b < 32) {
        if (n && b === 0) break;
        return value % 2 ? -(value + 1) / 2 : value / 2;
      }
    }
    throw new RoutingError('INVALID_ENGINE_GEOMETRY');
  };
  while (i < shape.length) {
    lat += component(); lon += component();
    if (Math.abs(lat) > 90000000 || Math.abs(lon) > 180000000) throw new RoutingError('INVALID_ENGINE_GEOMETRY');
    points.push([lon / 1e6, lat / 1e6]);
  }
  if (points.length < 2 || !points.some(p => p[0] !== points[0][0] || p[1] !== points[0][1])) throw new RoutingError('INVALID_ENGINE_GEOMETRY');
  return points;
}
function createRouter({ endpoint, provenance = {}, fetchImpl = fetch, timeoutMs = 10000 }) {
  const url = new URL(endpoint);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw Error('Invalid configured engine URL');
  return async input => {
    const payload = buildRequest(input);
    try {
      const response = await fetchImpl(new URL('/route', url), { method: 'POST', redirect: 'error',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new RoutingError('TRUCK_ROUTING_UNAVAILABLE', 503);
      // Bound response bytes before JSON parsing, including chunked responses.
      let bytes = 0; const chunks = [];
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > 2000000) throw new RoutingError('INVALID_ENGINE_RESPONSE');
        chunks.push(Buffer.from(chunk));
      }
      const result = normalize(JSON.parse(Buffer.concat(chunks).toString('utf8')), provenance);
      result.preferenceAssessment = {
        requested: { preferFewerFreeways: !!input.preferences?.preferFewerFreeways, preferFewerTolls: !!input.preferences?.preferFewerTolls },
        avoidanceVerified: false,
        message: 'Preferences are not exclusions. Toll and freeway avoidance has not been verified.'
      };
      return result;
    } catch (error) {
      if (error instanceof RoutingError) throw error;
      throw new RoutingError('TRUCK_ROUTING_UNAVAILABLE', 503);
    }
  };
}
module.exports = { buildRequest, createRouter, decode6, normalize, RoutingError };
