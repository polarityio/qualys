'use strict';

const { getOr, get, flow } = require('lodash/fp');
const { xmlToJson, processPossibleList } = require('../dataTransformations');

/**
 * Query the Qualys VM Scan List API for recent scans.
 *
 * IP/IPv6 entities: GET /api/3.0/fo/scan/?action=list&target=<ip>
 *   → returns scans whose target includes the IP
 * QID entities: GET /api/3.0/fo/scan/?action=list
 *   → returns recent account scans (no QID filter available in this API);
 *   result is shared across all QID entities in the batch via the '__RECENT__' key
 *
 * API Version: v3.0 (Active; v2.0 EOS Dec 2025 / EOL Jun 2026)
 * Docs: Qualys VMPC API Guide v10.38.2
 */
const queryScanListForAllEntities = async (
  entitiesPartition,
  options,
  requestWithDefaults,
  Logger
) => {
  if (!entitiesPartition || !entitiesPartition.length) return [];

  const results = [];

  const ipEntities = entitiesPartition.filter(
    (e) => e.isIP || e.type === 'IPv4' || e.type === 'IPv6'
  );

  const qidEntities = entitiesPartition.filter((e) => e.type === 'qid');

  // Query each IP individually — filter by target IP
  for (const entity of ipEntities) {
    try {
      const scans = await queryScanList(
        { action: 'list', show_op: 1, show_status: 1, target: entity.value },
        options,
        requestWithDefaults,
        Logger
      );
      results.push({ entityValue: entity.value, scans });
    } catch (error) {
      Logger.warn({ error, ip: entity.value }, 'queryScanList failed for IP — defaulting to empty');
      results.push({ entityValue: entity.value, scans: [] });
    }
  }

  // Query once for all QID entities (scan list has no QID filter)
  if (qidEntities.length > 0) {
    try {
      const scans = await queryScanList(
        { action: 'list', show_op: 1, show_status: 1 },
        options,
        requestWithDefaults,
        Logger
      );
      // Store under sentinel key; associateDataWithEntities maps this to each QID entity
      results.push({ entityValue: '__RECENT__', scans });
    } catch (error) {
      Logger.warn({ error }, 'queryScanList failed for recent scans — defaulting to empty');
      results.push({ entityValue: '__RECENT__', scans: [] });
    }
  }

  return results;
};

const queryScanList = async (qs, options, requestWithDefaults, Logger) => {
  const responseXml = getOr(
    '',
    'body',
    await requestWithDefaults({
      method: 'GET',
      url: `${options.url}/api/3.0/fo/scan/`,
      qs,
      headers: { 'X-Requested-With': 'Polarity' },
      options
    })
  );

  const json = await xmlToJson(responseXml, Logger);

  const rawScans = flow(
    get('scan_list_output.response.scan_list.scan'),
    processPossibleList(false)
  )(json);

  if (!rawScans || !rawScans.length) return [];

  // Return at most 10 most recent scans (API already orders by launch date desc)
  return rawScans.slice(0, 10).map(normalizeScan);
};

const normalizeScan = (scan) => ({
  title: (scan.title && (scan.title.value || scan.title)) || 'Unnamed Scan',
  ref: scan.ref || '',
  type: scan.type || '',
  user_login: scan.user_login || '',
  launch_datetime: scan.launch_datetime || '',
  duration: scan.duration || '',
  state: (scan.status && scan.status.state) || '',
  sub_state: (scan.status && scan.status.sub_state) || '',
  target: (scan.target && (scan.target.value || scan.target)) || '',
  option_profile:
    (scan.option_profile &&
      scan.option_profile.title &&
      (scan.option_profile.title.value || scan.option_profile.title)) ||
    '',
  // Placeholder for newSectionLineBreak separator between scans
  newSectionLineBreak: true
});

module.exports = queryScanListForAllEntities;
