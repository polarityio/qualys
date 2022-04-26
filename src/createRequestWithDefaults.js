const fs = require('fs');
const { identity, omit } = require('lodash/fp');
const request = require('postman-request');
const config = require('../config/config');
const { parseErrorToReadableJSON } = require('./dataTransformations');

const SUCCESSFUL_ROUNDED_REQUEST_STATUS_CODES = [200];

const _configFieldIsValid = (field) => typeof field === 'string' && field.length > 0;

const createRequestWithDefaults = (Logger) => {
  const {
    request: { ca, cert, key, passphrase, rejectUnauthorized, proxy }
  } = config;

  const defaults = {
    ...(_configFieldIsValid(ca) && { ca: fs.readFileSync(ca) }),
    ...(_configFieldIsValid(cert) && { cert: fs.readFileSync(cert) }),
    ...(_configFieldIsValid(key) && { key: fs.readFileSync(key) }),
    ...(_configFieldIsValid(passphrase) && { passphrase }),
    ...(_configFieldIsValid(proxy) && { proxy }),
    ...(typeof rejectUnauthorized === 'boolean' && { rejectUnauthorized }),
    json: true
  };

  const requestWithDefaults = (
    preRequestFunction = async () => ({}),
    postRequestSuccessFunction = async (x) => x,
    postRequestFailureFunction = async (e) => {
      throw e;
    }
  ) => {
    const defaultsRequest = request.defaults(defaults);

    const _requestWithDefault = (requestOptions) =>
      new Promise((resolve, reject) => {
        defaultsRequest(requestOptions, (err, res, body) => {
          if (err) return reject(err);
          resolve({ ...res, body });
        });
      });

    return async (requestOptions) => {
      const preRequestFunctionResults = await preRequestFunction(requestOptions);
      const _requestOptions = {
        ...requestOptions,
        ...preRequestFunctionResults
      };

      let postRequestFunctionResults;
      try {
        const result = await _requestWithDefault(_requestOptions);
        checkForStatusError(result, _requestOptions);

        postRequestFunctionResults = await postRequestSuccessFunction(
          result,
          _requestOptions
        );
      } catch (error) {
        postRequestFunctionResults = await postRequestFailureFunction(
          error,
          _requestOptions
        );
      }
      return postRequestFunctionResults;
    };
  };

  const handleAuth = async ({ options, ...requestOptions }) => ({
    ...requestOptions,
    auth: {
      username: options.username,
      password: options.password,
    }
  });

  const checkForStatusError = ({ statusCode, body }, requestOptions) => {
    Logger.trace({
      requestOptions: {
        ...requestOptions,
        auth: '************',
        options: '************'
      },
      statusCode,
      body
    });

    const roundedStatus = Math.round(statusCode / 100) * 100;
    if (!SUCCESSFUL_ROUNDED_REQUEST_STATUS_CODES.includes(roundedStatus)) {
      const requestError = Error('Request Error');
      requestError.status = statusCode;
      requestError.description = JSON.stringify(body);
      requestError.requestOptions = JSON.stringify(requestOptions);
      throw requestError;
    }
  };

  const requestDefaultsWithInterceptors = requestWithDefaults(handleAuth, identity, (error) => {
    const err = parseErrorToReadableJSON(error);
    if (err.requestOptions && ['{', '['].includes(err.requestOptions[0]))
      err.requestOptions = omit(['options', 'auth'], JSON.parse(err.requestOptions));
      
    Logger.error({ err });
    let newError  = new Error(err.message)
    newError.status = err.status;
    newError.requestOptions = JSON.stringify(err.requestOptions);
    newError.description = err.description;
    newError.stack = err.stack;
    throw newError;
  });

  return requestDefaultsWithInterceptors;
};

module.exports = createRequestWithDefaults;
