import fp from 'lodash/fp';
import reduce from 'lodash/fp/reduce';
import type { ValidationError, ValidateOptionsUserOptions } from '@polarityio/integration-types';

const uncappedReduce = (reduce as any).convert({ cap: false });

export const validateStringOptions = (
  stringOptionsErrorMessages: Record<string, string>,
  options: ValidateOptionsUserOptions,
  otherErrors: ValidationError[] = []
): ValidationError[] =>
  uncappedReduce((agg: ValidationError[], message: string, optionName: string) => {
    const isString = typeof options[optionName].value === 'string';
    const isEmptyString = isString && fp.isEmpty(options[optionName].value as string);

    return !isString || isEmptyString ? agg.concat({ key: optionName, message }) : agg;
  }, otherErrors)(stringOptionsErrorMessages);

export const validateUrlOption = (
  url: string,
  otherErrors: ValidationError[] = []
): ValidationError[] => {
  const endWithError =
    url && url.endsWith('/')
      ? otherErrors.concat({
          key: 'url',
          message: 'Your URL must not end with a /'
        })
      : otherErrors;

  if (endWithError.length) return endWithError;

  if (url) {
    try {
      new URL(url);
    } catch {
      return otherErrors.concat({
        key: 'url',
        message: 'This URL is invalid. You must provide a valid URL.'
      });
    }
  }

  return otherErrors;
};

export const validateCustomTypeValueRegex = (
  options: ValidateOptionsUserOptions,
  otherErrors: ValidationError[] = []
): ValidationError[] => {
  const regexValue = options.customTypeValueRegex?.value as string | undefined;
  if (regexValue) {
    try {
      new RegExp(regexValue);
    } catch {
      return otherErrors.concat({
        key: 'customTypeValueRegex',
        message: 'Invalid regular expression syntax.'
      });
    }
  }
  return otherErrors;
};