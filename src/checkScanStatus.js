'use strict';

const { getOr, get, flow } = require('lodash/fp');
const { xmlToJson, processPossibleList } = require('./dataTransformations');

/**
 * Query the current status of a specific Qualys VM scan by scan reference.
 *
 * GET /api/3.0/fo/scan/?action=list&scan_ref=<ref>&show_status=1
 *
 * @param {string} scanRef  - The scan reference returned by the launch API (e.g. "scan/1736361211.27337")
 * @param {object} options
 * @param {function} requestWithDefaults
 * @param {object} Logger
 * @returns {{ ref, state, subState, title, duration, launchDatetime }}
 */
const checkScanStatus = async (scanRef, options, requestWithDefaults, Logger) => {
  Logger.debug({ scanRef }, 'Checking scan status');

  const responseXml = getOr(
    '',
    'body',
    await requestWithDefaults({
      method: 'GET',
      url: `${options.url}/api/3.0/fo/scan/`,
      qs: { action: 'list', scan_ref: scanRef, show_status: 1 },
      headers: { 'X-Requested-With': 'Polarity' },
      options
    })
  );

  const json = await xmlToJson(responseXml, Logger);

  const rawScans = flow(
    get('scan_list_output.response.scan_list.scan'),
    processPossibleList(false)
  )(json);

  if (!rawScans || !rawScans.length) {
    // Scan not found — may still be queued or the ref is stale
    return { ref: scanRef, state: 'Queued', subState: '', title: '', duration: '', launchDatetime: '' };
  }

  const scan = Array.isArray(rawScans) ? rawScans[0] : rawScans;

  return {
    ref: scan.ref || scanRef,
    state: (scan.status && scan.status.state) || 'Unknown',
    subState: (scan.status && scan.status.sub_state) || '',
    title: (scan.title && (scan.title.value || scan.title)) || '',
    duration: scan.duration || '',
    launchDatetime: scan.launch_datetime || ''
  };
};

module.exports = checkScanStatus;
