const fs = require('fs');
const path = require('path');

const DATABASE_PATH = path.resolve(__dirname, '..', 'low-bridges.json');
const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: node scripts/import-bridge-records.js <normalized-records.json>');
  process.exit(1);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function finiteNumber(value, fieldName, recordIndex) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    fail(`Record ${recordIndex}: ${fieldName} must be numeric.`);
  }
  return number;
}

function validateRecord(record, index) {
  const required = [
    'id',
    'name',
    'latitude',
    'longitude',
    'clearanceMm',
    'sourceAuthority',
    'sourceRecordId',
    'verificationStatus',
    'confidence'
  ];

  for (const field of required) {
    if (record[field] === undefined || record[field] === null || record[field] === '') {
      fail(`Record ${index}: missing required field ${field}.`);
    }
  }

  const latitude = finiteNumber(record.latitude, 'latitude', index);
  const longitude = finiteNumber(record.longitude, 'longitude', index);
  const clearanceMm = finiteNumber(record.clearanceMm, 'clearanceMm', index);

  if (latitude < -90 || latitude > 90) {
    fail(`Record ${index}: latitude out of range.`);
  }

  if (longitude < -180 || longitude > 180) {
    fail(`Record ${index}: longitude out of range.`);
  }

  if (clearanceMm <= 0 || clearanceMm > 10000) {
    fail(`Record ${index}: clearanceMm is outside the accepted range.`);
  }

  const allowedStatuses = ['UNVERIFIED', 'SOURCE_VERIFIED', 'FIELD_VERIFIED'];
  const allowedConfidence = ['LOW', 'MEDIUM', 'HIGH'];

  if (!allowedStatuses.includes(record.verificationStatus)) {
    fail(`Record ${index}: invalid verificationStatus.`);
  }

  if (!allowedConfidence.includes(record.confidence)) {
    fail(`Record ${index}: invalid confidence.`);
  }

  return {
    ...record,
    latitude,
    longitude,
    clearanceMm,
    routeMatchThresholdMeters:
      record.routeMatchThresholdMeters == null
        ? 75
        : finiteNumber(record.routeMatchThresholdMeters, 'routeMatchThresholdMeters', index)
  };
}

const database = JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
const input = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
const incomingRecords = Array.isArray(input) ? input : input.records;

if (!Array.isArray(incomingRecords)) {
  fail('Input must be a JSON array or an object with a records array.');
}

const existingRecords = Array.isArray(database.records) ? database.records : [];
const merged = new Map();

for (const record of existingRecords) {
  merged.set(record.id, record);
}

incomingRecords.forEach((record, index) => {
  const validated = validateRecord(record, index);
  merged.set(validated.id, validated);
});

const output = {
  schemaVersion: database.schemaVersion || 1,
  generatedAt: new Date().toISOString(),
  records: Array.from(merged.values()).sort((a, b) => a.id.localeCompare(b.id))
};

fs.writeFileSync(DATABASE_PATH, JSON.stringify(output, null, 2) + '\n');
console.log(`Bridge database now contains ${output.records.length} records.`);
