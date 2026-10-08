'use strict';

// Bound work and avoid bitwise shifts (which wrap at 32 bits). Coordinates
// use Google's encoded-polyline precision of 1e5 degrees.
const MAX_ENCODED_LENGTH = 1000000;
const MAX_COMPONENT = 0xffffffff;

function assessGeometry(encoded) {
  const unknown = reason => ({ valid: false, reason, points: [] });
  if (typeof encoded !== 'string' || encoded.length === 0) {
    return unknown('MISSING_OR_INVALID_POLYLINE');
  }
  if (encoded.length > MAX_ENCODED_LENGTH) return unknown('POLYLINE_TOO_LARGE');
  const points = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  function component() {
    let value = 0;
    let factor = 1;
    for (let group = 0; group < 7; group += 1) {
      if (index >= encoded.length) throw Error('TRUNCATED_POLYLINE');
      const byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) throw Error('INVALID_POLYLINE_CHARACTER');
      value += (byte % 32) * factor;
      if (!Number.isSafeInteger(value) || value > MAX_COMPONENT) {
        throw Error('POLYLINE_OVERFLOW');
      }
      if (byte < 32) {
        if (group > 0 && byte === 0) throw Error('NON_CANONICAL_POLYLINE');
        return value % 2 ? -(value + 1) / 2 : value / 2;
      }
      factor *= 32;
    }
    throw Error('POLYLINE_OVERFLOW');
  }
  try {
    while (index < encoded.length) {
      latitude += component();
      longitude += component();
      const point = { latitude: latitude / 1e5, longitude: longitude / 1e5 };
      if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) ||
          Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) {
        return unknown('INVALID_POLYLINE_COORDINATES');
      }
      points.push(point);
    }
  } catch (error) {
    return unknown(error.message);
  }
  if (points.length < 2 || !points.some(point =>
    point.latitude !== points[0].latitude || point.longitude !== points[0].longitude)) {
    return unknown('INSUFFICIENT_DISTINCT_GEOMETRY');
  }
  return { valid: true, reason: null, points };
}

module.exports = { assessGeometry };
