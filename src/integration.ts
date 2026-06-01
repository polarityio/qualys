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
import { validateStringOptions, validateUrlOption } from './validateOptions';

let request: PolarityRequest;

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

  return stringValidationErrors.concat(urlValidationErrors);
}

export { startup, doLookup, validateOptions };
