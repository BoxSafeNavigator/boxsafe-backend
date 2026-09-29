const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3] || 'fhwa-snbi-normalized.json';
const sourceDate = process.argv[4] || null;

if (!inputPath) {
  console.error('Usage: node scripts/normalize-fhwa-snbi.js <fhwa-snbi.json> [output.json] [source-date]');
  process.exit(1);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function feetToMillimeters(feet) {
  return Math.round(Number(feet) * 304.8);
}

const input = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));

if (!Array.isArray(input)) {
  fail('FHWA SNBI input must be the JSON array format defined by the NBI Submittal File Schema.');
}

const records = [];
let bridgesSeen = 0;
let highwayFeaturesSeen = 0;
let skippedNoClearance = 0;
let skippedOpenClearance = 0;
let skippedInvalidCoordinates = 0;

for (const bridge of input) {
  bridgesSeen += 1;

  const bridgeNumber = String(bridge.BID01 || '').trim();
  const bridgeName = String(bridge.BID02 || bridge.BL11 || bridgeNumber || 'Unnamed bridge').trim();
  const latitude = Number(bridge.BL05);
  const longitude = Number(bridge.BL06);

  if (
    !bridgeNumber ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    skippedInvalidCoordinates += 1;
    continue;
  }

  const features = Array.isArray(bridge.Features) ? bridge.Features : [];

  for (const feature of features) {
    const featureId = String(feature.BF01 || '').trim();
    const featureType = String(feature.BF02 || '').trim();
    const featureName = String(feature.BF03 || '').trim();
    const clearanceFeet = Number(feature.BH13);

    // BH13 is Highway Minimum Vertical Clearance. Only highway features
    // with a usable finite clearance are candidates for BoxSafe.
    if (!featureId.startsWith('H')) {
      continue;
    }

    highwayFeaturesSeen += 1;

    if (!Number.isFinite(clearanceFeet) || clearanceFeet <= 0) {
      skippedNoClearance += 1;
      continue;
    }

    // FHWA uses 99.9 for very large/open clearance values in the transition mapping.
    // Those are not useful as low-clearance warning records.
    if (clearanceFeet >= 99.9) {
      skippedOpenClearance += 1;
      continue;
    }

    records.push({
      id: `fhwa-snbi-${bridgeNumber}-${featureId}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
      name: featureName
        ? `${bridgeName} - ${featureName}`
        : bridgeName,
      latitude,
      longitude,
      clearanceMm: feetToMillimeters(clearanceFeet),
      routeMatchThresholdMeters: 75,
      sourceAuthority: 'Federal Highway Administration - National Bridge Inventory (SNBI)',
      sourceRecordId: `${bridgeNumber}:${featureId}`,
      sourceUrl: 'https://www.fhwa.dot.gov/bridge/snbi/',
      lastVerifiedDate: sourceDate,
      verificationStatus: 'SOURCE_VERIFIED',
      confidence: 'LOW',
      notes:
        `Imported from SNBI BH13 Highway Minimum Vertical Clearance (${clearanceFeet} ft). FHWA states NBI data should not be used by itself for route-clearance purposes; BoxSafe requires fresher state/local or field corroboration before treating this record as high confidence. Feature type: ${featureType || 'unknown'}.`
    });
  }
}

const output = {
  schemaVersion: 1,
  source: 'FHWA SNBI',
  sourceDate,
  generatedAt: new Date().toISOString(),
  statistics: {
    bridgesSeen,
    highwayFeaturesSeen,
    recordsProduced: records.length,
    skippedNoClearance,
    skippedOpenClearance,
    skippedInvalidCoordinates
  },
  records
};

fs.writeFileSync(path.resolve(outputPath), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output.statistics, null, 2));
console.log(`Wrote ${records.length} normalized BoxSafe records to ${outputPath}.`);
