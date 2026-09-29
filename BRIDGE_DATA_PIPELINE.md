# BoxSafe Bridge Data Pipeline

## Goal

Build a nationwide low-clearance database without treating any single source as sufficient for driver-critical route clearance.

## Source hierarchy

1. State/local transportation authority clearance data when an official machine-readable source is available.
2. FHWA National Bridge Inventory / SNBI data as a nationwide baseline and cross-check.
3. BoxSafe field verification or documented operator verification.
4. User reports as leads only until verified by an authoritative or field-verification process.

## Important federal limitation

FHWA states that NBI data should not be used by itself for route-clearance purposes because bridge inspection data may be up to roughly 24 months old. BoxSafe therefore stores provenance and verification metadata with every record instead of presenting federal inventory data as guaranteed current clearance.

## Required normalized record fields

- id
- name
- latitude
- longitude
- clearanceMm
- routeMatchThresholdMeters
- sourceAuthority
- sourceRecordId
- sourceUrl
- lastVerifiedDate
- verificationStatus: UNVERIFIED | SOURCE_VERIFIED | FIELD_VERIFIED
- confidence: LOW | MEDIUM | HIGH
- notes

## Confidence policy

- LOW: imported baseline data or legacy record that has not been independently checked.
- MEDIUM: matched to a current official transportation-agency source.
- HIGH: current official source plus a second corroborating source or documented field verification.

## Update precedence

A newer verified state/local source can supersede an older federal baseline value. A user report must never automatically overwrite an authoritative record. Conflicting values should be retained for review and the production record should be downgraded until resolved.

## Ingestion workflow

1. Acquire an official dataset.
2. Convert it into the BoxSafe normalized JSON schema.
3. Run the importer:
   node scripts/import-bridge-records.js <normalized-records.json>
4. Review validation failures and duplicates.
5. Test route matching against known bridges before production deployment.
6. Record source date and verification status.

## Transition note

FHWA states that 2025 was the last year of the legacy Coding Guide ASCII submission format. Beginning with the March 15, 2026 submission and future submissions, the NBI submittal schema is JSON-based under SNBI. BoxSafe adapters should therefore target the SNBI model going forward while retaining a legacy adapter only for historical 2025-and-earlier data.
