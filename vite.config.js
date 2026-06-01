import config from './config/config.json' with { type: 'json' };
import { defineConfig } from 'vite';
import { transformComponentNames, VIRTUAL_COMPONENTS_ID } from '@polarityio/vite-plugin-icl';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    transformComponentNames({
      componentsDir: resolve(__dirname, 'web-components'),
      componentRegistries: [
        '@polarityio/pi-components/component-registry.json',
      ],
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: VIRTUAL_COMPONENTS_ID,
      name: 'qualys-v2_build',
      fileName: () => {
        const webComponentsConfig = config.webComponents;
        return webComponentsConfig.moduleFilename;
      },
      formats: ['es'],
    },
    minify: false,
    rollupOptions: {
      output: {
        globals: {
          lit: 'lit',
        },
      },
    },
  },
});
