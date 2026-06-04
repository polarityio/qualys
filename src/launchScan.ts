import { get } from 'lodash/fp';
import type { Logger } from '@polarityio/integration-types';
import type { PolarityRequest } from 'polarity-integration-utils';
import { IntegrationError } from 'polarity-integration-utils';

import { xmlToJson } from './dataTransformations';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LaunchScanResult {
  scanRef: string;
  scanId: string;
  message: string;
  scanTitle: string;
}

/**
 * Launch a Qualys VM scan for a target IP address.
 * POST /api/2.0/fo/scan/?action=launch
 */
const launchScan = async (
  entityValue: string,
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger
): Promise<LaunchScanResult> => {
  const today = new Date().toISOString().split('T')[0];
  const scanTitle = `Polarity Scan - ${entityValue} - ${today}`;

  const formData: Record<string, any> = {
    action: 'launch',
    scan_title: scanTitle,
    ip: entityValue
  };

  const optionProfile = getOptionValue(options.scanOptionProfile);
  if (optionProfile && optionProfile.trim()) {
    if (/^\d+$/.test(optionProfile.trim())) {
      formData.option_id = optionProfile.trim();
    } else {
      formData.option_title = optionProfile.trim();
    }
  }

  const scannerName = getOptionValue(options.scannerName);
  if (scannerName && scannerName.trim()) {
    formData.iscanner_name = scannerName.trim();
  } else {
    formData.default_scanner = 1;
  }

  Logger.debug({ scanTitle, formData }, 'Launching Qualys scan');

  const response = await request.run({
    method: 'POST',
    url: `${options.url}/api/2.0/fo/scan/`,
    form: formData,
    headers: { 'X-Requested-With': 'Polarity' },
    json: false
  });

  const responseXml = (response!.body as string) || '';
  const json = await xmlToJson(responseXml, Logger);
  const responseText = (get('simple_return.response.text', json) as string) || '';

  const rawItems = get('simple_return.response.item_list.item', json);
  const items: any[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const scanRef =
    (items.find((i: any) => ((i.key as string) || '').toUpperCase() === 'REFERENCE') || {}).value ||
    '';
  const scanId =
    (items.find((i: any) => ((i.key as string) || '').toUpperCase() === 'ID') || {}).value || '';

  if (!responseText.toLowerCase().includes('launched')) {
    const errorText = responseText || 'No confirmation received from Qualys.';
    Logger.error({ responseText, json }, 'Scan launch failed');
    throw new IntegrationError(errorText, {
      title: 'Scan Launch Failed',
      help: 'Check that the scan option profile and scanner name are valid.'
    });
  }

  return { scanRef, scanId, message: responseText, scanTitle };
};

const getOptionValue = (opt: any): string => {
  if (opt === null || opt === undefined) return '';
  if (typeof opt === 'object' && 'value' in opt) return (opt.value as string) || '';
  return String(opt);
};

export default launchScan;
