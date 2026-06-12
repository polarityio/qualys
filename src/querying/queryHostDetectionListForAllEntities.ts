import { get, map, flow, filter, eq, uniqBy, join, size } from 'lodash/fp';
import type { Entity, Logger } from '@polarityio/integration-types';
import type { PolarityRequest } from 'polarity-integration-utils';

import {
  parseErrorToReadableJSON,
  processResultWithProcessingFormat,
  processPossibleList,
  xmlToJson,
  or
} from '../dataTransformations';

/* eslint-disable @typescript-eslint/no-explicit-any */

const queryHostDetectionListForAllEntities = async (
  entities: Entity[],
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger
): Promise<any[]> => {
  const ipEntities = filter(flow(get('type'), or(eq('IPv4'), eq('IPv6'))), entities);
  const ipValues = map(get('value'), ipEntities) as string[];

  const qidEntities = filter(
    flow(get('type'), (t) => t === 'qid' || t === 'customType'),
    entities
  );
  const qidValues = map(get('value'), qidEntities) as string[];

  const allHostDetectionResultForIpAddresses = size(ipValues)
    ? await queryHostDetectionList('ips', options, request, Logger)(ipValues)
    : [];

  const allHostDetectionResultForQids = size(qidValues)
    ? await queryHostDetectionList('qids', options, request, Logger)(qidValues)
    : [];

  return uniqBy('id', allHostDetectionResultForIpAddresses).concat(
    uniqBy('id', allHostDetectionResultForQids)
  );
};

const queryHostDetectionList =
  (type: string, options: Record<string, any>, request: PolarityRequest, Logger: Logger) =>
  async (entityValues: string[]): Promise<any[]> => {
    try {
      const response = await request.run({
        method: 'GET',
        url: `${options.url}/api/2.0/fo/asset/host/vm/detection/`,
        qs: {
          action: 'list',
          [type]: join(',', entityValues),
          show_asset_id: 1,
          show_results: 1
        },
        headers: { 'X-Requested-With': 'Polarity' },
        json: false
      });

      const responseXml = (response!.body as string) || '';

      const hostDetections = flow(
        get('host_list_vm_detection_output.response.host_list.host'),
        processPossibleList(false)
      )(await xmlToJson(responseXml, Logger));

      const processedJson = map(
        processResultWithProcessingFormat(HOST_DETECTIONS_LIST_FORMAT),
        hostDetections
      );

      return processedJson;
    } catch (error) {
      const err = parseErrorToReadableJSON(error);
      Logger.error(
        {
          detail: 'Failed to Query Host Detection List',
          formattedError: err
        },
        'Querying Host Detection List Failed'
      );
      throw error;
    }
  };

const HOST_DETECTIONS_LIST_ITEM_FORMAT: Record<string, any> = {
  qid: 'qid',
  type: 'type',
  severity: 'severity',
  port: 'port',
  protocol: 'protocol',
  ssl: { path: 'ssl', process: (ssl: any) => (ssl == 1 ? 'Yes' : 'No') },
  results: 'results',
  status: 'status',
  first_found_datetime: 'first_found_datetime',
  last_found_datetime: 'last_found_datetime',
  times_found: 'times_found',
  last_test_datetime: 'last_test_datetime',
  last_update_datetime: 'last_update_datetime',
  is_ignored: {
    path: 'is_ignored',
    process: (is_ignored: any) => (is_ignored == 1 ? 'Yes' : 'No')
  },
  is_disabled: {
    path: 'is_disabled',
    process: (is_disabled: any) => (is_disabled == 1 ? 'Yes' : 'No')
  },
  last_processed_datetime: 'last_processed_datetime'
};

const HOST_DETECTIONS_LIST_FORMAT: Record<string, any> = {
  id: 'id',
  asset_id: 'asset_id',
  ip: 'ip',
  os: 'os',
  dns: 'dns',
  last_scan_datetime: 'last_scan_datetime',
  last_vm_scanned_date: 'last_vm_scanned_date',
  last_vm_scanned_duration: 'last_vm_scanned_duration',
  category: 'category',
  detection_list: {
    path: 'detection_list',
    process: flow(
      get('detection'),
      processPossibleList(false),
      map(processResultWithProcessingFormat(HOST_DETECTIONS_LIST_ITEM_FORMAT)),
      uniqBy('qid')
    )
  }
};

export default queryHostDetectionListForAllEntities;