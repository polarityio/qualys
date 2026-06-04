'use strict';

const { getOr, get } = require('lodash/fp');
const { xmlToJson } = require('./dataTransformations');

/**
 * Launch a Qualys VM scan for a target IP address.
 *
 * POST /api/2.0/fo/scan/?action=launch
 *
 * The scan is asynchronous — Qualys returns a scan reference ID immediately
 * and the scan runs in the background. Docs: VMPC API Guide v10.38.2.
 *
 * @param {string} entityValue  - Target IP address to scan
 * @param {object} options      - Integration options (scanOptionProfile, scannerName)
 * @param {function} requestWithDefaults
 * @param {object} Logger
 * @returns {{ scanRef: string, scanId: string, message: string, scanTitle: string }}
 */
const launchScan = async (entityValue, options, requestWithDefaults, Logger) => {
  const today = new Date().toISOString().split('T')[0];
  const scanTitle = `Polarity Scan - ${entityValue} - ${today}`;

  const formData = {
    action: 'launch',
    scan_title: scanTitle,
    ip: entityValue
  };

  // Option profile: numeric → option_id, otherwise → option_title
  const optionProfile = getOptionValue(options.scanOptionProfile);
  if (optionProfile && optionProfile.trim()) {
    if (/^\d+$/.test(optionProfile.trim())) {
      formData.option_id = optionProfile.trim();
    } else {
      formData.option_title = optionProfile.trim();
    }
  }

  // Scanner: use named appliance if provided, otherwise default scanner
  const scannerName = getOptionValue(options.scannerName);
  if (scannerName && scannerName.trim()) {
    formData.iscanner_name = scannerName.trim();
  } else {
    formData.default_scanner = 1;
  }

  Logger.debug({ scanTitle, formData }, 'Launching Qualys scan');

  const responseXml = getOr(
    '',
    'body',
    await requestWithDefaults({
      method: 'POST',
      url: `${options.url}/api/2.0/fo/scan/`,
      form: formData,
      headers: { 'X-Requested-With': 'Polarity' },
      options
    })
  );

  const json = await xmlToJson(responseXml, Logger);
  const responseText = get('simple_return.response.text', json) || '';

  // Extract scan reference and ID from ITEM_LIST
  const rawItems = get('simple_return.response.item_list.item', json);
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const scanRef =
    (items.find((i) => (i.key || '').toUpperCase() === 'REFERENCE') || {}).value || '';
  const scanId =
    (items.find((i) => (i.key || '').toUpperCase() === 'ID') || {}).value || '';

  // "New vm scan launched" or similar text confirms success
  if (!responseText.toLowerCase().includes('launched')) {
    const errorText = responseText || 'No confirmation received from Qualys.';
    Logger.error({ responseText, json }, 'Scan launch failed');
    throw new Error(errorText);
  }

  return { scanRef, scanId, message: responseText, scanTitle };
};

const getOptionValue = (opt) => {
  if (opt === null || opt === undefined) return '';
  if (typeof opt === 'object' && 'value' in opt) return opt.value || '';
  return String(opt);
};

module.exports = launchScan;
