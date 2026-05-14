import _ from 'lodash';
import {
  flow,
  keys,
  values,
  zipObject,
  map,
  first,
  omit,
  reduce,
  size,
  curry,
  filter,
  eq,
  isEmpty,
  getOr,
  join,
  get,
  isArray,
  identity
} from 'lodash/fp';
import * as xml2js from 'xml2js';
import type { Logger } from '@polarityio/integration-types';
import type { Entity } from '@polarityio/integration-types';

import { IGNORED_IPS, QUERY_PATHS_BY_TYPE } from './constants';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const getKeys = (keyList: string[], items: any): any =>
  Array.isArray(items)
    ? items.map((item: any) => _.pickBy(item, (_v: any, key: string) => keyList.includes(key)))
    : _.pickBy(items, (_v: any, key: string) => keyList.includes(key));

export const groupEntities = (entities: Entity[]): Record<string, Entity[]> =>
  _.chain(entities)
    .groupBy(({ isIP, isDomain, type }: any) =>
      isIP
        ? 'ip'
        : isDomain
          ? 'domain'
          : type === 'MAC'
            ? 'mac'
            : type === 'MD5'
              ? 'md5'
              : type === 'SHA1'
                ? 'sha1'
                : type === 'SHA256'
                  ? 'sha256'
                  : 'unknown'
    )
    .omit('unknown')
    .value();

export const splitOutIgnoredIps = (
  _entitiesPartition: Entity[]
): { entitiesPartition: Entity[]; ignoredIpLookupResults: any[] } => {
  const grouped = _.groupBy(_entitiesPartition, ({ isIP, value }: any) =>
    !isIP || (isIP && !IGNORED_IPS.has(value)) ? 'entitiesPartition' : 'ignoredIPs'
  );

  return {
    entitiesPartition: grouped.entitiesPartition || [],
    ignoredIpLookupResults: _.map(grouped.ignoredIPs, (entity: Entity) => ({
      entity,
      data: null
    }))
  };
};

export const objectPromiseAll = async (
  obj: Record<string, () => Promise<any>>
): Promise<Record<string, any>> => {
  const labels = keys(obj);
  const functions = values(obj);
  const executedFunctions = await Promise.all(map((func: () => Promise<any>) => func(), functions));
  return zipObject(labels, executedFunctions);
};

export const asyncObjectReduce = async (
  func: (agg: any, value: any, key: string) => Promise<any>,
  initAgg: any,
  obj: Record<string, any>
): Promise<any> => {
  const nextKey = flow(keys, first)(obj) as string | undefined;
  if (!nextKey) return initAgg;
  const newAgg = await func(initAgg, obj[nextKey], nextKey);
  return await asyncObjectReduce(func, newAgg, omit(nextKey, obj) as Record<string, any>);
};

export const transpose2DArray = reduce(
  (agg: [any[], any[]], [key, value]: [any, any]) =>
    [
      [...agg[0], key],
      [...agg[1], value]
    ] as [any[], any[]],
  [[], []] as [any[], any[]]
);

export const or =
  (...[func, ...funcs]: Array<(x: any) => boolean>) =>
  (x: any): boolean =>
    func(x) || (funcs.length > 0 && or(...funcs)(x));

export const and =
  (...[func, ...funcs]: Array<(x: any) => boolean>) =>
  (x: any): boolean =>
    func(x) && (funcs.length > 0 ? and(...funcs)(x) : true);

const negate =
  (fn: (x: any) => boolean) =>
  (x: any): boolean =>
    !fn(x);

export const mapObject = curry(
  (func: (value: any, key: string) => any, obj: Record<string, any>): Record<string, any> =>
    flow(
      Object.entries,
      map(([key, value]: [string, any]) => func(value, key)),
      filter(and(negate(isEmpty), flow(size, eq(2)))),
      transpose2DArray,
      ([k, v]: [string[], any[]]) => zipObject(k, v)
    )(obj)
);

export const mapObjectAsync = async (
  func: (value: any, key: string) => Promise<any>,
  obj: Record<string, any>
): Promise<Record<string, any>> => {
  const unzippedResults = await Promise.all(
    map(async ([key, value]: [string, any]) => await func(value, key), Object.entries(obj))
  );
  return flow(
    filter(and(negate(isEmpty), flow(size, eq(2)))),
    transpose2DArray,
    ([k, v]: [string[], any[]]) => zipObject(k, v)
  )(unzippedResults);
};

export const parseErrorToReadableJSON = (error: unknown): Record<string, any> => {
  const serialized = JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error as object)));
  delete serialized.config;
  delete serialized.request;
  delete serialized.options;
  delete serialized.auth;
  return serialized;
};

export const buildQueryByQueryType = (queryType: string, entities: Entity[]): string =>
  flow(
    map((entity: Entity) =>
      flow(
        getOr([], [entity.type, queryType]),
        map((queryPath: string) => `${queryPath}: "${entity.value}"`),
        join(' OR ')
      )(QUERY_PATHS_BY_TYPE as any)
    ),
    join(' OR ')
  )(entities);

export const millisToHoursMinutesAndSeconds = (millis: number): string => {
  let remainingMillis = millis;
  const seconds = Math.floor((remainingMillis / 1000) % 60);
  remainingMillis -= seconds * 1000;
  const minutes = Math.floor((remainingMillis / 60000) % 60);
  remainingMillis -= minutes * 60000;
  const hours = Math.floor(remainingMillis / 3600000);
  return (
    (hours ? `${hours} hours, ` : '') +
    (minutes ? `${minutes} minutes, ` : '') +
    (seconds ? `${seconds} seconds` : '') +
    (!hours && !minutes && !seconds ? `${millis}ms` : '')
  );
};

export const processResultWithProcessingFormat =
  (processingFormat: Record<string, any>) =>
  (result: any): Record<string, any> =>
    mapObject(
      (value: any, key: string) => [
        key,
        typeof value === 'string'
          ? get(value, result)
          : flow(get(value.path), value.process)(result)
      ],
      processingFormat
    );

export const processPossibleList =
  (shouldStringify = true) =>
  (arrayOrObject: any): any =>
    arrayOrObject &&
    (shouldStringify ? JSON.stringify : identity)(
      isArray(arrayOrObject) ? arrayOrObject : [arrayOrObject]
    );

export const xmlToJson = async (xml: string, Logger: Logger): Promise<any | undefined> => {
  try {
    const parser = new xml2js.Parser({
      normalizeTags: true,
      explicitArray: false,
      charkey: 'value',
      attrkey: 'attributes'
    });
    return await parser.parseStringPromise(xml);
  } catch (e) {
    const err = parseErrorToReadableJSON(e);
    Logger.error({ MESSAGE: 'Failed to Parse XML', err }, 'XML Parse Failed');
    Logger.trace({ xml }, 'Raw XML that failed to parse');
  }
};
