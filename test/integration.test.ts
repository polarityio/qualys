import { vi, describe, it, expect, beforeEach } from 'vitest';
import type {
  Entity,
  DoLookupUserOptions,
  IntegrationContext
} from '@polarityio/integration-types';
import type { HttpRequestResponse } from 'polarity-integration-utils';

function createEntity(type: string, value: string): Entity {
  const isDomain = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(value);
  const isIPv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value);
  const isIPv6 = /^[\da-fA-F:]+$/.test(value) && value.includes(':');
  const typeId = type === 'IP' ? 'IPv4' : type.startsWith('custom.') ? 'custom' : type;
  return {
    value,
    rawValue: value,
    displayValue: value,
    type: typeId,
    types: [type],
    isDomain,
    isIPv4,
    isIP: isIPv4 || isIPv6,
    isIPv6,
    isEmail: false,
    isHash: false,
    isHex: false,
    isHTMLTag: false,
    isMD5: false,
    isPrivateIP: false,
    isSHA1: false,
    isSHA256: false,
    isSHA512: false,
    isURL: false,
    channels: [],
    requestContext: { requestType: 'OnDemand', isUserInitiated: true }
  } as unknown as Entity;
}

function createMockIntegrationContext() {
  const createCacheScope = () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() });
  const logger = {
    child: vi.fn().mockReturnThis(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn()
  };
  (logger.child as any).mockReturnValue(logger);
  return {
    cache: {
      global: createCacheScope(),
      integration: createCacheScope(),
      user: createCacheScope()
    },
    integrationId: 'test-integration',
    userId: 1,
    logger,
    startPolling: vi.fn(),
    stopPolling: vi.fn()
  };
}

const { mockRun, mockSetLogger } = vi.hoisted(() => ({
  mockRun: vi.fn(),
  mockSetLogger: vi.fn()
}));

vi.mock('polarity-integration-utils', () => {
  class MockIntegrationError extends Error {
    cause: unknown;
    meta: unknown;
    constructor(message: string, props?: any) {
      super(message);
      this.name = 'IntegrationError';
      this.cause = props?.cause;
      this.meta = props?.meta;
    }
  }

  class MockPolarityRequest {
    run = mockRun;
    runInParallel = vi.fn();
    userOptions: any = null;
    network: any = null;
    limiter: any = null;
    hooks = { beforeRequest: [], afterResponse: [], onApiError: [], onNetworkError: [] };
    constructor(_opts?: any) {}
  }

  return {
    PolarityRequest: MockPolarityRequest,
    setLogger: mockSetLogger,
    IntegrationError: MockIntegrationError,
    ApiRequestError: class extends Error {
      constructor(m: string) {
        super(m);
        this.name = 'ApiRequestError';
      }
    },
    NetworkError: class extends Error {
      constructor(m: string) {
        super(m);
        this.name = 'NetworkError';
      }
    }
  };
});

import { doLookup, startup, validateOptions } from '../src/integration';

const createMockContext = () => createMockIntegrationContext();

const createOptions = (overrides: Partial<Record<string, unknown>> = {}): DoLookupUserOptions =>
  ({
    url: 'https://qualysapi.qualys.com',
    username: 'testuser',
    password: 'testpass',
    ...overrides
  }) as unknown as DoLookupUserOptions;

const HOST_DETECTION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<HOST_LIST_VM_DETECTION_OUTPUT>
  <RESPONSE>
    <HOST_LIST>
      <HOST>
        <ID>12345</ID>
        <ASSET_ID>67890</ASSET_ID>
        <IP>192.168.1.1</IP>
        <OS>Linux 4.15</OS>
        <DNS>host.example.com</DNS>
        <LAST_SCAN_DATETIME>2024-01-15T10:30:00Z</LAST_SCAN_DATETIME>
        <LAST_VM_SCANNED_DATE>2024-01-15T10:30:00Z</LAST_VM_SCANNED_DATE>
        <LAST_VM_SCANNED_DURATION>120</LAST_VM_SCANNED_DURATION>
        <CATEGORY>Confirmed</CATEGORY>
        <DETECTION_LIST>
          <DETECTION>
            <QID>38623</QID>
            <TYPE>Confirmed</TYPE>
            <SEVERITY>3</SEVERITY>
            <PORT>443</PORT>
            <PROTOCOL>tcp</PROTOCOL>
            <SSL>1</SSL>
            <RESULTS>SSL Certificate - Subject</RESULTS>
            <STATUS>Active</STATUS>
            <FIRST_FOUND_DATETIME>2024-01-10T08:00:00Z</FIRST_FOUND_DATETIME>
            <LAST_FOUND_DATETIME>2024-01-15T10:30:00Z</LAST_FOUND_DATETIME>
            <TIMES_FOUND>5</TIMES_FOUND>
            <LAST_TEST_DATETIME>2024-01-15T10:30:00Z</LAST_TEST_DATETIME>
            <LAST_UPDATE_DATETIME>2024-01-15T10:30:00Z</LAST_UPDATE_DATETIME>
            <IS_IGNORED>0</IS_IGNORED>
            <IS_DISABLED>0</IS_DISABLED>
            <LAST_PROCESSED_DATETIME>2024-01-15T10:30:00Z</LAST_PROCESSED_DATETIME>
          </DETECTION>
        </DETECTION_LIST>
      </HOST>
    </HOST_LIST>
  </RESPONSE>
</HOST_LIST_VM_DETECTION_OUTPUT>`;

const EMPTY_HOST_DETECTION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<HOST_LIST_VM_DETECTION_OUTPUT>
  <RESPONSE>
  </RESPONSE>
</HOST_LIST_VM_DETECTION_OUTPUT>`;

describe('Qualys Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startup', () => {
    it('should initialize without error', () => {
      const mockLogger = {
        info: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn()
      };
      expect(() => startup(mockLogger as any)).not.toThrow();
    });
  });

  describe('doLookup', () => {
    beforeEach(() => {
      const mockLogger = {
        info: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn()
      };
      startup(mockLogger as any);
    });

    it('should return lookup results with data for an IPv4 entity with host detections', async () => {
      mockRun.mockResolvedValue({
        statusCode: 200,
        body: HOST_DETECTION_XML,
        headers: {}
      } as HttpRequestResponse);

      const entities: Entity[] = [createEntity('IPv4', '192.168.1.1')];
      const options = createOptions();
      const context = createMockContext();

      const results = await doLookup(entities, options, context as unknown as IntegrationContext);

      expect(results).toHaveLength(1);
      expect(results![0].entity.value).toBe('192.168.1.1');
      expect(results![0].data).not.toBeNull();
      expect(results![0].data!.summary).toContain('Host Detections: 1');
      expect(results![0].data!.details).toHaveProperty('tabKeys');
    });

    it('should return data: null for an entity with no results', async () => {
      mockRun.mockResolvedValue({
        statusCode: 200,
        body: EMPTY_HOST_DETECTION_XML,
        headers: {}
      } as HttpRequestResponse);

      const entities: Entity[] = [createEntity('IPv4', '10.0.0.1')];
      const options = createOptions();
      const context = createMockContext();

      const results = await doLookup(entities, options, context as unknown as IntegrationContext);

      expect(results).toHaveLength(1);
      expect(results![0].data).toBeNull();
    });

    it('should handle multiple entities', async () => {
      mockRun.mockResolvedValue({
        statusCode: 200,
        body: EMPTY_HOST_DETECTION_XML,
        headers: {}
      } as HttpRequestResponse);

      const entities: Entity[] = [
        createEntity('IPv4', '192.168.1.1'),
        createEntity('IPv4', '192.168.1.2')
      ];
      const options = createOptions();
      const context = createMockContext();

      const results = await doLookup(entities, options, context as unknown as IntegrationContext);

      expect(results).toHaveLength(2);
    });

    it('should return data: null for ignored IPs (127.0.0.1)', async () => {
      mockRun.mockResolvedValue({
        statusCode: 200,
        body: EMPTY_HOST_DETECTION_XML,
        headers: {}
      } as HttpRequestResponse);

      const entities: Entity[] = [createEntity('IPv4', '127.0.0.1')];
      const options = createOptions();
      const context = createMockContext();

      const results = await doLookup(entities, options, context as unknown as IntegrationContext);

      expect(results).toHaveLength(1);
      expect(results![0].data).toBeNull();
    });

    it('should pass correct request options to the API', async () => {
      mockRun.mockResolvedValue({
        statusCode: 200,
        body: EMPTY_HOST_DETECTION_XML,
        headers: {}
      } as HttpRequestResponse);

      const entities: Entity[] = [createEntity('IPv4', '10.20.30.40')];
      const options = createOptions({ url: 'https://qualysapi.example.com' });
      const context = createMockContext();

      await doLookup(entities, options, context as unknown as IntegrationContext);

      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'https://qualysapi.example.com/api/5.0/fo/asset/host/vm/detection/',
          qs: expect.objectContaining({
            action: 'list',
            ips: '10.20.30.40',
            show_asset_id: 1,
            show_results: 1,
            show_qds: 1,
            show_qds_factors: 1
          }),
          headers: { 'X-Requested-With': 'Polarity' },
          json: false
        })
      );
    });

    it('should throw IntegrationError when API request fails', async () => {
      const apiError = new Error('API request failed');
      mockRun.mockRejectedValue(apiError);

      const entities: Entity[] = [createEntity('IPv4', '192.168.1.1')];
      const options = createOptions();
      const context = createMockContext();

      await expect(
        doLookup(entities, options, context as unknown as IntegrationContext)
      ).rejects.toThrow('API request failed');
    });

    it('should throw IntegrationError with default message for non-Error objects', async () => {
      mockRun.mockRejectedValue('string error');

      const entities: Entity[] = [createEntity('IPv4', '192.168.1.1')];
      const options = createOptions();
      const context = createMockContext();

      await expect(
        doLookup(entities, options, context as unknown as IntegrationContext)
      ).rejects.toThrow('Searching Failed');
    });

    it('should not make API calls when only ignored IPs are provided', async () => {
      const entities: Entity[] = [
        createEntity('IPv4', '127.0.0.1'),
        createEntity('IPv4', '255.255.255.255'),
        createEntity('IPv4', '0.0.0.0')
      ];
      const options = createOptions();
      const context = createMockContext();

      const results = await doLookup(entities, options, context as unknown as IntegrationContext);

      expect(mockRun).not.toHaveBeenCalled();
      expect(results).toHaveLength(3);
      results!.forEach((r) => expect(r.data).toBeNull());
    });

    it('should handle QID custom type entities', async () => {
      mockRun.mockResolvedValue({
        statusCode: 200,
        body: HOST_DETECTION_XML,
        headers: {}
      } as HttpRequestResponse);

      const entity = createEntity('custom', 'QID: 38623') as any;
      entity.type = 'custom';
      entity.types = ['custom.qid'];
      const entities: Entity[] = [entity];
      const options = createOptions();
      const context = createMockContext();

      const results = await doLookup(entities, options, context as unknown as IntegrationContext);

      expect(results).toHaveLength(1);
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          qs: expect.objectContaining({
            qids: '38623'
          })
        })
      );
    });
  });

  describe('validateOptions', () => {
    it('should return no errors when all options are valid', () => {
      const options = {
        url: { value: 'https://qualysapi.qualys.com' },
        username: { value: 'testuser' },
        password: { value: 'testpass' }
      };
      const context = createMockContext();

      const errors = validateOptions(options as any, context as unknown as IntegrationContext);

      expect(errors).toHaveLength(0);
    });

    it('should return error when url is empty', () => {
      const options = {
        url: { value: '' },
        username: { value: 'testuser' },
        password: { value: 'testpass' }
      };
      const context = createMockContext();

      const errors = validateOptions(options as any, context as unknown as IntegrationContext);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.key === 'url')).toBe(true);
    });

    it('should return error when username is empty', () => {
      const options = {
        url: { value: 'https://qualysapi.qualys.com' },
        username: { value: '' },
        password: { value: 'testpass' }
      };
      const context = createMockContext();

      const errors = validateOptions(options as any, context as unknown as IntegrationContext);

      expect(errors.some((e) => e.key === 'username')).toBe(true);
    });

    it('should return error when password is empty', () => {
      const options = {
        url: { value: 'https://qualysapi.qualys.com' },
        username: { value: 'testuser' },
        password: { value: '' }
      };
      const context = createMockContext();

      const errors = validateOptions(options as any, context as unknown as IntegrationContext);

      expect(errors.some((e) => e.key === 'password')).toBe(true);
    });

    it('should return error when URL ends with a slash', () => {
      const options = {
        url: { value: 'https://qualysapi.qualys.com/' },
        username: { value: 'testuser' },
        password: { value: 'testpass' }
      };
      const context = createMockContext();

      const errors = validateOptions(options as any, context as unknown as IntegrationContext);

      expect(errors.some((e) => e.key === 'url' && e.message.includes('/'))).toBe(true);
    });

    it('should return error when URL is invalid', () => {
      const options = {
        url: { value: 'not-a-valid-url' },
        username: { value: 'testuser' },
        password: { value: 'testpass' }
      };
      const context = createMockContext();

      const errors = validateOptions(options as any, context as unknown as IntegrationContext);

      expect(errors.some((e) => e.key === 'url' && e.message.includes('invalid'))).toBe(true);
    });

    it('should return error when multiple fields are invalid', () => {
      const options = {
        url: { value: '' },
        username: { value: '' },
        password: { value: '' }
      };
      const context = createMockContext();

      const errors = validateOptions(options as any, context as unknown as IntegrationContext);

      expect(errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should return no errors when customTypeValueRegex is empty', () => {
      const options = {
        url: { value: 'https://qualysapi.qualys.com' },
        username: { value: 'testuser' },
        password: { value: 'testpass' },
        customTypeValueRegex: { value: '' }
      };
      const context = createMockContext();

      const errors = validateOptions(options as any, context as unknown as IntegrationContext);

      expect(errors).toHaveLength(0);
    });

    it('should return no errors when customTypeValueRegex is a valid regex', () => {
      const options = {
        url: { value: 'https://qualysapi.qualys.com' },
        username: { value: 'testuser' },
        password: { value: 'testpass' },
        customTypeValueRegex: { value: 'TICKET-(\\d+)' }
      };
      const context = createMockContext();

      const errors = validateOptions(options as any, context as unknown as IntegrationContext);

      expect(errors).toHaveLength(0);
    });

    it('should return error when customTypeValueRegex is an invalid regex', () => {
      const options = {
        url: { value: 'https://qualysapi.qualys.com' },
        username: { value: 'testuser' },
        password: { value: 'testpass' },
        customTypeValueRegex: { value: '[invalid(' }
      };
      const context = createMockContext();

      const errors = validateOptions(options as any, context as unknown as IntegrationContext);

      expect(errors.some((e) => e.key === 'customTypeValueRegex')).toBe(true);
    });
  });

  describe('QID value extraction', () => {
    it('should extract QID value with colon format "QID:12345"', async () => {
      const { extractQidValue } = await import('../src/getLookupResults');
      expect(extractQidValue('QID:12345')).toBe('12345');
    });

    it('should extract QID value with space-colon format "QID : 12345"', async () => {
      const { extractQidValue } = await import('../src/getLookupResults');
      expect(extractQidValue('QID : 12345')).toBe('12345');
    });

    it('should extract QID value with space format "QID 12345"', async () => {
      const { extractQidValue } = await import('../src/getLookupResults');
      expect(extractQidValue('QID 12345')).toBe('12345');
    });

    it('should extract QID value with spaced colon "QID: 12345"', async () => {
      const { extractQidValue } = await import('../src/getLookupResults');
      expect(extractQidValue('QID: 12345')).toBe('12345');
    });

    it('should handle lowercase qid prefix', async () => {
      const { extractQidValue } = await import('../src/getLookupResults');
      expect(extractQidValue('qid:98765')).toBe('98765');
    });
  });

  describe('customType value extraction', () => {
    it('should use trailing digits as default when no regex provided', async () => {
      const { extractCustomTypeValue } = await import('../src/getLookupResults');
      expect(extractCustomTypeValue('TICKET-42')).toBe('42');
    });

    it('should use custom regex capture group 1 when provided', async () => {
      const { extractCustomTypeValue } = await import('../src/getLookupResults');
      expect(extractCustomTypeValue('TICKET-99', 'TICKET-(\\d+)')).toBe('99');
    });

    it('should use full match when custom regex has no capture group', async () => {
      const { extractCustomTypeValue } = await import('../src/getLookupResults');
      expect(extractCustomTypeValue('12345', '\\d+')).toBe('12345');
    });

    it('should fall back to trailing digits when custom regex does not match', async () => {
      const { extractCustomTypeValue } = await import('../src/getLookupResults');
      expect(extractCustomTypeValue('TICKET-55', 'NOMATCH-(\\d+)')).toBe('55');
    });

    it('should fall back to trailing digits when custom regex is invalid', async () => {
      const { extractCustomTypeValue } = await import('../src/getLookupResults');
      expect(extractCustomTypeValue('TICKET-77', '[invalid(')).toBe('77');
    });
  });
});
