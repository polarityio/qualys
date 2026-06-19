import { get } from 'lodash/fp';
import type { Logger } from '@polarityio/integration-types';
import type { PolarityRequest } from 'polarity-integration-utils';
import { IntegrationError, ApiRequestError } from 'polarity-integration-utils';

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
 * POST /api/3.0/fo/scan/?action=launch
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

  let responseBody: string;
  try {
    const response = await request.run({
      method: 'POST',
      url: `${options.url}/api/3.0/fo/scan/`,
      form: formData,
      headers: { 'X-Requested-With': 'Polarity' },
      json: false
    });
    responseBody = (response!.body as string) || '';
  } catch (err) {
    if (err instanceof ApiRequestError && typeof (err as any).meta?.body === 'string') {
      const errorXml = (err as any).meta.body as string;
      const errorJson = await xmlToJson(errorXml, Logger);
      const errorText = (get('simple_return.response.text', errorJson) as string) || '';
      if (errorText) {
        throw new IntegrationError(errorText, {
          title: 'Scan Launch Failed',
          help: 'Check that the scan option profile ID or name is valid in your Qualys account.',
          cause: err
        });
      }
    }
    throw err;
  }

  const responseXml = responseBody;
  const json = await xmlToJson(responseXml, Logger);
  const responseText = (get('simple_return.response.text', json) as string) || '';

  const rawItems = get('simple_return.response.item_list.item', json);
  const items: any[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const scanRef = extractItemValue(items, 'REFERENCE');
  const scanId = extractItemValue(items, 'ID');

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

/**
 * xml2js with charkey:'value' conflicts with Qualys <ITEM><VALUE> element names,
 * producing arrays that mix whitespace text nodes with the real value.
 * Flatten to a string and extract clean content.
 */
const extractItemValue = (items: any[], keyName: string): string => {
  const item = items.find((i: any) => ((i.key as string) || '').toUpperCase() === keyName);
  if (!item) return '';
  const raw = item.value;
  const str = Array.isArray(raw) ? raw.join('') : String(raw ?? '');
  return str.trim();
};

export default launchScan;
