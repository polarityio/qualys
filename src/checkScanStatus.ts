import { get, flow } from 'lodash/fp';
import type { Logger } from '@polarityio/integration-types';
import type { PolarityRequest } from 'polarity-integration-utils';
import { IntegrationError, ApiRequestError } from 'polarity-integration-utils';

import { xmlToJson, processPossibleList } from './dataTransformations';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ScanStatus {
  ref: string;
  state: string;
  subState: string;
  title: string;
  duration: string;
  launchDatetime: string;
}

/**
 * Query the current status of a specific Qualys VM scan by scan reference.
 * GET /api/3.0/fo/scan/?action=list&scan_ref=<ref>&show_status=1
 */
const checkScanStatus = async (
  rawScanRef: string,
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger
): Promise<ScanStatus> => {
  // Sanitize: extract just the valid scan/XXXXX.XXXXX portion in case the value
  // was persisted with leading corruption (e.g. from xml2js charkey collision).
  const scanRefMatch = (rawScanRef || '').match(/scan\/\d+\.\d+/);
  const scanRef = scanRefMatch ? scanRefMatch[0] : rawScanRef.trim();

  if (!scanRef || !/^scan\/\d+\.\d+$/.test(scanRef)) {
    throw new IntegrationError(`Invalid scan reference: "${rawScanRef}"`, {
      title: 'Invalid Scan Reference',
      help: 'The scan reference must match the format scan/XXXXXXXXXX.XXXXX.'
    });
  }

  Logger.debug({ scanRef }, 'Checking scan status');

  let responseBody: string;
  try {
    const response = await request.run({
      method: 'GET',
      url: `${options.url}/api/3.0/fo/scan/`,
      qs: { action: 'list', scan_ref: scanRef, show_status: 1 },
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
          title: 'Check Scan Status Failed',
          cause: err
        });
      }
    }
    throw err;
  }

  const responseXml = responseBody;
  const json = await xmlToJson(responseXml, Logger);

  const rawScans = flow(
    get('scan_list_output.response.scan_list.scan'),
    processPossibleList(false)
  )(json) as any[] | null;

  if (!rawScans || !rawScans.length) {
    return {
      ref: scanRef,
      state: 'Queued',
      subState: '',
      title: '',
      duration: '',
      launchDatetime: ''
    };
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

export default checkScanStatus;
