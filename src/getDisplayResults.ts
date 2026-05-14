import { flow, get, map, values, assign, flatMap } from 'lodash/fp';
import { mapObject } from './dataTransformations';
import type { DisplayFormat, DisplayFormatEntry } from './constants';

/* eslint-disable @typescript-eslint/no-explicit-any */

const getDisplayResults = (
  displayFormat: DisplayFormat,
  results: any[],
  dontFlatten?: boolean
): any[] =>
  (dontFlatten ? map : (flatMap as any))((record: any) => {
    const displayResultsAsObject = mapObject(
      (contentInfo: any, columnName: string) =>
        (get(columnName, record) ||
          get('isTitle', contentInfo) ||
          get('isNewSectionLineBreak', contentInfo)) && [
          columnName,
          buildDisplayValue(contentInfo, columnName, record)
        ],
      displayFormat
    );
    const displayResults = values(displayResultsAsObject);
    return displayResults;
  }, results);

const buildDisplayValue = (
  contentInfo: string | DisplayFormatEntry,
  columnName: string,
  record: any
): any =>
  typeof contentInfo === 'string'
    ? { label: contentInfo, value: get(columnName, record) }
    : assign(contentInfo, {
        value: flow(get(columnName), (value: any) =>
          (contentInfo as DisplayFormatEntry).isListOfLinks
            ? JSON.parse(value)
            : (contentInfo as DisplayFormatEntry).isList
              ? getDisplayResults(
                  (contentInfo as DisplayFormatEntry).itemDisplayFormat!,
                  get(columnName, record),
                  true
                )
              : value
        )(record)
      });

export default getDisplayResults;
