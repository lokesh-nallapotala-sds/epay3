import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const srcDir = path.resolve(rootDir, 'src');

const sourceAliases = [
  'components',
  'constants',
  'contexts',
  'hooks',
  'providers',
  'redux',
  'routing',
  'services',
  'shared',
  'types',
  'utilities',
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const useHttps = env.HTTPS === 'true';
  const certFile = env.SSL_CRT_FILE;
  const keyFile = env.SSL_KEY_FILE;

  const apiTarget = env.ASPNETCORE_HTTPS_PORT
    ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}`
    : env.ASPNETCORE_URLS
      ? env.ASPNETCORE_URLS.split(';')[0]
      : 'https://localhost:7121';

  return {
    plugins: react(),
    define: {
      'process.env.NODE_DEBUG': 'undefined',
      'process.env': '{}',
      'process.noDeprecation': 'false',
      'process.throwDeprecation': 'false',
      'process.traceDeprecation': 'false',
      'process.pid': '0',
      'process.nextTick':
        '(callback, ...args) => queueMicrotask(() => callback(...args))',
    },
    optimizeDeps: {
      include: ['util'],
    },
    build: {
      outDir: 'build',
      sourcemap: false,
    },
    resolve: {
      alias: sourceAliases.map((alias) => ({
        find: new RegExp(`^${alias}/(.*)$`),
        replacement: path.resolve(srcDir, alias, '$1'),
      })),
    },
    server: {
      host: 'localhost',
      port: Number(env.PORT) || 44411,
      strictPort: true,
      open: false,
      https:
        useHttps && certFile && keyFile
          ? {
              cert: fs.readFileSync(certFile),
              key: fs.readFileSync(keyFile),
            }
          : useHttps
            ? {}
            : undefined,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          headers: {
            Connection: 'Keep-Alive',
          },
        },
      },
    },
  };
});
