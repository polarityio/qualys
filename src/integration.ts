import { PolarityRequest, setLogger } from 'polarity-integration-utils';
import { IntegrationError } from 'polarity-integration-utils';
import type {
  Entity,
  DoLookupUserOptions,
  DoLookupResult,
  Logger,
  IntegrationContext,
  ValidateOptionsUserOptions,
  ValidationError
} from '@polarityio/integration-types';
import type { BeforeRequestHook } from 'polarity-integration-utils';

import { parseErrorToReadableJSON } from './dataTransformations';
import { getLookupResults } from './getLookupResults';
import {
  validateStringOptions,
  validateUrlOption,
  validateScanOptions,
  validateCustomQidValueRegex
} from './validateOptions';
import launchScan from './launchScan';
import checkScanStatus from './checkScanStatus';

let request: PolarityRequest;

const VALID_ACTIONS = new Set(['LAUNCH_SCAN', 'CHECK_SCAN_STATUS']);

const addAuth: BeforeRequestHook = async (requestOptions, userOptions) => ({
  ...requestOptions,
  auth: {
    username: userOptions.username as string,
    password: userOptions.password as string
  }
});

function startup(logger: Logger): void {
  setLogger(logger);
  request = new PolarityRequest({
    roundedSuccessStatusCodes: [200],
    hooks: { beforeRequest: [addAuth] }
  });
}

async function doLookup(
  entities: Entity[],
  options: DoLookupUserOptions,
  context: IntegrationContext
): Promise<DoLookupResult> {
  const Logger = context.logger;
  Logger.debug({ entities }, 'Entities');

  request.userOptions = options;
  request.network = context.network;

  try {
    const lookupResults = await getLookupResults(entities, options, request, Logger);
    Logger.trace({ lookupResults }, 'Lookup Results');
    return lookupResults;
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error({ formattedError: err }, 'Get Lookup Results Failed');

    throw new IntegrationError(
      (error as Error).message ? (error as Error).message : 'Searching Failed',
      { cause: error, meta: { formattedError: err } }
    );
  }
}

async function onMessage(
  payload: unknown,
  options: DoLookupUserOptions,
  context: IntegrationContext
): Promise<unknown> {
  const Logger = context.logger;
  request.userOptions = options;
  request.network = context.network;

  const msg = payload as Record<string, any>;
  const action = msg?.action as string;

  Logger.debug({ action }, 'onMessage received');

  if (!action || !VALID_ACTIONS.has(action)) {
    throw new IntegrationError(`Unknown onMessage action: ${action}`, {
      title: 'Invalid Action'
    });
  }

  try {
    if (action === 'LAUNCH_SCAN') {
      return await launchScan(msg.entityValue as string, options as any, request, Logger);
    }

    if (action === 'CHECK_SCAN_STATUS') {
      return await checkScanStatus(msg.scanRef as string, options as any, request, Logger);
    }
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error({ error, formattedError: err }, 'onMessage failed');
    throw error;
  }
}

function validateOptions(
  options: ValidateOptionsUserOptions,
  _context: IntegrationContext
): ValidationError[] {
  const stringOptionsErrorMessages: Record<string, string> = {
    url: 'You must provide a valid Qualys URL.',
    username: 'You must provide a valid Qualys Username',
    password: 'You must provide a valid Qualys Password'
  };

  const stringValidationErrors = validateStringOptions(stringOptionsErrorMessages, options);
  const urlValidationErrors = validateUrlOption(options.url.value as string);
  const scanValidationErrors = validateScanOptions(options);
  const customTypeRegexErrors = validateCustomQidValueRegex(options);

  return stringValidationErrors
    .concat(urlValidationErrors)
    .concat(scanValidationErrors)
    .concat(customTypeRegexErrors);
}

export { startup, doLookup, onMessage, validateOptions };
