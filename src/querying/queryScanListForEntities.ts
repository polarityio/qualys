import { get, flow } from 'lodash/fp';
import type { Entity, Logger } from '@polarityio/integration-types';
import type { PolarityRequest } from 'polarity-integration-utils';

import { xmlToJson, processPossibleList } from '../dataTransformations';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ScanResult {
  entityValue: string;
  scans: NormalizedScan[];
}

export interface NormalizedScan {
  title: string;
  ref: string;
  type: string;
  user_login: string;
  launch_datetime: string;
  duration: string;
  state: string;
  sub_state: string;
  target: string;
  option_profile: string;
}

/**
 * Query the Qualys VM Scan List API for recent scans.
 *
 * IP/IPv6 entities: GET /api/3.0/fo/scan/?action=list&target=<ip>
 * QID entities: GET /api/3.0/fo/scan/?action=list (recent account scans)
 */
const queryScanListForAllEntities = async (
  entities: Entity[],
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger
): Promise<ScanResult[]> => {
  if (!entities || !entities.length) return [];

  const results: ScanResult[] = [];

  const ipEntities = entities.filter((e: any) => e.isIP || e.type === 'IPv4' || e.type === 'IPv6');

  const qidEntities = entities.filter((e: any) => e.type === 'qid');

  for (const entity of ipEntities) {
    try {
      const scans = await queryScanList(
        { action: 'list', show_op: 1, show_status: 1, target: entity.value },
        options,
        request,
        Logger
      );
      results.push({ entityValue: entity.value, scans });
    } catch (error) {
      Logger.warn({ error, ip: entity.value }, 'queryScanList failed for IP — defaulting to empty');
      results.push({ entityValue: entity.value, scans: [] });
    }
  }

  if (qidEntities.length > 0) {
    try {
      const scans = await queryScanList(
        { action: 'list', show_op: 1, show_status: 1 },
        options,
        request,
        Logger
      );
      results.push({ entityValue: '__RECENT__', scans });
    } catch (error) {
      Logger.warn({ error }, 'queryScanList failed for recent scans — defaulting to empty');
      results.push({ entityValue: '__RECENT__', scans: [] });
    }
  }

  return results;
};

const queryScanList = async (
  qs: Record<string, any>,
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger
): Promise<NormalizedScan[]> => {
  const response = await request.run({
    method: 'GET',
    url: `${options.url}/api/3.0/fo/scan/`,
    qs,
    headers: { 'X-Requested-With': 'Polarity' },
    json: false
  });

  const responseXml = (response!.body as string) || '';
  const json = await xmlToJson(responseXml, Logger);

  const rawScans = flow(
    get('scan_list_output.response.scan_list.scan'),
    processPossibleList(false)
  )(json) as any[] | null;

  if (!rawScans || !rawScans.length) return [];

  return rawScans.slice(0, 10).map(normalizeScan);
};

const normalizeScan = (scan: any): NormalizedScan => ({
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
    ''
});

export default queryScanListForAllEntities;
