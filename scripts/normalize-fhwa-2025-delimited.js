const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3] || 'data/fhwa-2025-candidates.json';

if (!inputPath) {
  console.error('Usage: node scripts/normalize-fhwa-2025-delimited.js <2025-delimited.txt> [output.json]');
  process.exit(1);
}

function parseDelimitedLine(line) {
  const fields = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === "'") {
      if (quoted && line[i + 1] === "'") {
        value += "'";
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      fields.push(value);
      value = '';
      continue;
    }

    value += char;
  }

  fields.push(value);
  return fields;
}

function dmsToDecimal(raw, longitude = false) {
  const digits = String(raw || '').trim().replace(/\D/g, '');
  const expectedLength = longitude ? 9 : 8;

  if (digits.length !== expectedLength) {
    return null;
  }

  const degreeLength = longitude ? 3 : 2;
  const degrees = Number(digits.slice(0, degreeLength));
  const minutes = Number(digits.slice(degreeLength, degreeLength + 2));
  const secondsWhole = Number(digits.slice(degreeLength + 2, degreeLength + 4));
  const secondsHundredths = Number(digits.slice(degreeLength + 4, degreeLength + 6));
  const seconds = secondsWhole + secondsHundredths / 100;

  if (
    !Number.isFinite(degrees) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    minutes >= 60 ||
    seconds >= 60
  ) {
    return null;
  }

  const decimal = degrees + minutes / 60 + seconds / 3600;
  return longitude ? -decimal : decimal;
}

function metersToMillimeters(value) {
  return Math.round(Number(value) * 1000);
}

function usableClearanceMeters(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 && numeric < 30;
}

const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
const lines = raw.split(/\r?\n/).filter(Boolean);

if (lines.length < 2) {
  throw new Error('FHWA 2025 delimited file has no data rows.');
}

const headers = parseDelimitedLine(lines[0]).map((value) => value.trim());
const records = [];
const stats = {
  sourceRows: 0,
  invalidCoordinates: 0,
  carriedHighwayClearanceCandidates: 0,
  belowHighwayClearanceCandidates: 0,
  totalCandidates: 0
};

for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
  const values = parseDelimitedLine(lines[rowIndex]);
  const row = {};

  headers.forEach((header, index) => {
    row[header] = values[index] == null ? '' : values[index].trim();
  });

  stats.sourceRows += 1;

  const latitude = dmsToDecimal(row.LAT_016, false);
  const longitude = dmsToDecimal(row.LONG_017, true);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    stats.invalidCoordinates += 1;
    continue;
  }

  const structureNumber = String(row.STRUCTURE_NUMBER_008 || '').trim();
  const stateCode = String(row.STATE_CODE_001 || '').trim();
  const facilityCarried = String(row.FACILITY_CARRIED_007 || '').trim();
  const featureBelow = String(row.FEATURES_DESC_006A || '').trim();

  if (usableClearanceMeters(row.VERT_CLR_OVER_MT_053)) {
    const clearanceMeters = Number(row.VERT_CLR_OVER_MT_053);

    records.push({
      id: `fhwa-2025-${stateCode}-${structureNumber}-carried`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-'),
      name: facilityCarried || `Structure ${structureNumber}`,
      latitude,
      longitude,
      clearanceMm: metersToMillimeters(clearanceMeters),
      routeMatchThresholdMeters: 75,
      featureRole: 'CARRIED_HIGHWAY',
      facilityName: facilityCarried || null,
      crossingFeatureName: featureBelow || null,
      sourceAuthority: 'Federal Highway Administration - National Bridge Inventory',
      sourceRecordId: `${stateCode}:${structureNumber}:53`,
      sourceUrl: 'https://www.fhwa.dot.gov/bridge/nbi/ascii2025.cfm',
      lastVerifiedDate: '2025',
      verificationStatus: 'SOURCE_VERIFIED',
      confidence: 'LOW',
      productionEligible: false,
      notes:
        `Legacy NBI Item 53 minimum vertical clearance over bridge roadway: ${clearanceMeters} m. Candidate only until BoxSafe can verify road-level/map matching and fresher authoritative clearance.`
    });

    stats.carriedHighwayClearanceCandidates += 1;
  }

  if (
    String(row.VERT_CLR_UND_REF_054A || '').trim().toUpperCase() === 'H' &&
    usableClearanceMeters(row.VERT_CLR_UND_054B)
  ) {
    const clearanceMeters = Number(row.VERT_CLR_UND_054B);

    records.push({
      id: `fhwa-2025-${stateCode}-${structureNumber}-below`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-'),
      name: featureBelow
        ? `${featureBelow} below ${facilityCarried || 'bridge'}`
        : `Highway below structure ${structureNumber}`,
      latitude,
      longitude,
      clearanceMm: metersToMillimeters(clearanceMeters),
      routeMatchThresholdMeters: 75,
      featureRole: 'HIGHWAY_BELOW',
      facilityName: featureBelow || null,
      crossingFeatureName: facilityCarried || null,
      sourceAuthority: 'Federal Highway Administration - National Bridge Inventory',
      sourceRecordId: `${stateCode}:${structureNumber}:54B`,
      sourceUrl: 'https://www.fhwa.dot.gov/bridge/nbi/ascii2025.cfm',
      lastVerifiedDate: '2025',
      verificationStatus: 'SOURCE_VERIFIED',
      confidence: 'LOW',
      productionEligible: false,
      notes:
        `Legacy NBI Item 54B highway underclearance: ${clearanceMeters} m with Item 54A=H. Candidate only until BoxSafe can verify road-level/map matching and fresher authoritative clearance.`
    });

    stats.belowHighwayClearanceCandidates += 1;
  }
}

stats.totalCandidates = records.length;

const output = {
  schemaVersion: 1,
  datasetType: 'BOXSAFE_NATIONWIDE_CLEARANCE_CANDIDATES',
  sourceYear: 2025,
  generatedAt: new Date().toISOString(),
  productionEligible: false,
  warning:
    'FHWA states NBI data should not be used by itself for route-clearance purposes. These are candidate records for verification, not production-safe navigation records.',
  statistics: stats,
  records
};

fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
fs.writeFileSync(path.resolve(outputPath), JSON.stringify(output, null, 2) + '\n');

console.log(JSON.stringify(stats, null, 2));
console.log(`Wrote ${records.length} nationwide clearance candidates to ${outputPath}.`);
