import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const resolveConfig = {
  alias: [
    {
      find: /^polarity-integration-utils\/requests$/,
      replacement: path.resolve(
        __dirname,
        'node_modules/polarity-integration-utils/dist/lib/requests/index.js'
      )
    },
    {
      find: /^polarity-integration-utils$/,
      replacement: path.resolve(
        __dirname,
        'node_modules/polarity-integration-utils/dist/lib/index.js'
      )
    }
  ]
};

export default defineConfig({
  resolve: resolveConfig,
  test: {
    projects: [
      {
        resolve: resolveConfig,
        test: {
          name: 'server',
          environment: 'node',
          include: ['test/**/*.test.ts'],
          exclude: ['test/web-components/**']
        }
      },
      {
        resolve: resolveConfig,
        test: {
          name: 'browser',
          include: ['test/web-components/**/*.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
  }
});
