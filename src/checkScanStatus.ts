import { get, flow } from 'lodash/fp';
import type { Logger } from '@polarityio/integration-types';
import type { PolarityRequest } from 'polarity-integration-utils';

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
  scanRef: string,
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger
): Promise<ScanStatus> => {
  Logger.debug({ scanRef }, 'Checking scan status');

  const response = await request.run({
    method: 'GET',
    url: `${options.url}/api/3.0/fo/scan/`,
    qs: { action: 'list', scan_ref: scanRef, show_status: 1 },
    headers: { 'X-Requested-With': 'Polarity' },
    json: false
  });

  const responseXml = (response!.body as string) || '';
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
