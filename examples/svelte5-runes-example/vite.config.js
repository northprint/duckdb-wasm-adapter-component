import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    svelte(),
    viteStaticCopy({
      targets: [
        // Copy for dev server (to public)
        {
          src: '../../node_modules/.pnpm/@duckdb+duckdb-wasm@1.29.0/node_modules/@duckdb/duckdb-wasm/dist/*.wasm',
          dest: '../public'
        },
        {
          src: '../../node_modules/.pnpm/@duckdb+duckdb-wasm@1.29.0/node_modules/@duckdb/duckdb-wasm/dist/*.worker.js',
          dest: '../public'
        },
        // Copy for production build (to dist)
        {
          src: '../../node_modules/.pnpm/@duckdb+duckdb-wasm@1.29.0/node_modules/@duckdb/duckdb-wasm/dist/*.wasm',
          dest: '.'
        },
        {
          src: '../../node_modules/.pnpm/@duckdb+duckdb-wasm@1.29.0/node_modules/@duckdb/duckdb-wasm/dist/*.worker.js',
          dest: '.'
        }
      ]
    })
  ],
  publicDir: 'public',
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  resolve: {
    alias: [
      {
        find: /@duckdb\/duckdb-wasm\/dist\/(.*)/,
        replacement: '/public/$1',
        customResolver(source, importer, options) {
          // Direct worker and wasm file requests to public directory
          if (source.endsWith('.worker.js') || source.endsWith('.wasm')) {
            return '/' + source.split('/').pop();
          }
          return null;
        }
      }
    ]
  },
  worker: {
    format: 'es'
  }
});