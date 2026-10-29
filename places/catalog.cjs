'use strict';
const CATEGORIES = ['restaurant', 'hotel', 'rest_area', 'truck_stop', 'scenic_stop', 'weigh_station'];
const STATES = ['confirmed', 'unknown', 'unsuitable'];
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return NaN;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === value ? ms : NaN;
}
function validatePlace(p, now = Date.now()) {
  const errors = [];
  if (!p || typeof p !== 'object' || Array.isArray(p)) return ['INVALID_RECORD'];
  if (typeof p.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(p.id)) errors.push('INVALID_ID');
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 200) errors.push('INVALID_NAME');
  if (!CATEGORIES.includes(p.category)) errors.push('INVALID_CATEGORY');
  if (!p.location || typeof p.location.lat !== 'number' || !Number.isFinite(p.location.lat) || Math.abs(p.location.lat) > 90 ||
      typeof p.location.lon !== 'number' || !Number.isFinite(p.location.lon) || Math.abs(p.location.lon) > 180) errors.push('INVALID_LOCATION');
  if (!Array.isArray(p.sources) || !p.sources.length || p.sources.length > 20) errors.push('MISSING_SOURCES');
  else for (const s of p.sources) {
    try {
      const url = new URL(s.url);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
          typeof s.publisher !== 'string' || !s.publisher.trim() || !Number.isFinite(date(s.checkedAt)) || date(s.checkedAt) > now) throw Error();
    } catch { errors.push('INVALID_SOURCE'); }
  }
  for (const key of ['truckAccess', 'truckParking']) {
    const claim = p[key];
    if (!claim || !STATES.includes(claim.status)) { errors.push('INVALID_'+key); continue; }
    if (claim.status !== 'unknown' && (!Array.isArray(claim.sourceIndexes) || !claim.sourceIndexes.length ||
        claim.sourceIndexes.some(i => !Number.isInteger(i) || i < 0 || !p.sources?.[i]))) errors.push('MISSING_EVIDENCE_'+key);
  }
  // Inventory, opening hours and physical clearance need separate integrations.
  return errors;
}
function importCatalog(records, now = Date.now()) {
  if (!Array.isArray(records) || records.length > 10000) throw Error('INVALID_CATALOG');
  const accepted = [], rejected = [], ids = new Set();
  records.forEach((p, index) => {
    const errors = validatePlace(p, now);
    if (ids.has(p?.id)) errors.push('DUPLICATE_ID');
    if (errors.length) rejected.push({ index, errors });
    else { ids.add(p.id); accepted.push(structuredClone(p)); }
  });
  return { accepted, rejected };
}
function presentPlace(p, { now = Date.now(), freshnessDays = 90 } = {}) {
  const errors = validatePlace(p, now);
  if (errors.length) throw Error('INVALID_PLACE');
  if (p.reviewStatus === 'research_only') throw Error('RESEARCH_RECORD_NOT_PUBLISHABLE');
  if (!Number.isFinite(freshnessDays) || freshnessDays <= 0 || freshnessDays > 365) throw Error('INVALID_FRESHNESS_POLICY');
  const assess = key => {
    const c = p[key];
    if (c.status === 'unknown') return 'unknown';
    const stale = c.sourceIndexes.some(i => now - date(p.sources[i].checkedAt) > freshnessDays * 86400000);
    // Keep negative evidence visible even if old; stale positive claims lose confirmation.
    return c.status === 'confirmed' && stale ? 'unknown' : c.status;
  };
  return { id: p.id, name: p.name, category: p.category, location: structuredClone(p.location),
    truckAccess: assess('truckAccess'), truckParking: assess('truckParking'),
    parkingAvailability: 'unknown', openNow: 'unknown', approachClearance: 'unknown',
    sourceCheckedAt: p.sources.map(s => s.checkedAt),
    message: 'Listing information does not verify the approach route, physical clearance or current parking availability.' };
}
module.exports = { validatePlace, importCatalog, presentPlace };
