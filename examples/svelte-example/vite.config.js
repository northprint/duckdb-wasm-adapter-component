import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [svelte()],
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    },
    fs: {
      allow: [
        path.resolve(__dirname, '../..'),  // Allow project root
        path.resolve(__dirname, '../../node_modules/.pnpm'),
        path.resolve(__dirname, '../../node_modules/@duckdb')
      ]
    }
  },
  resolve: {
    alias: {
      '@duckdb/duckdb-wasm': path.resolve(__dirname, '../../node_modules/.pnpm/@duckdb+duckdb-wasm@1.29.0/node_modules/@duckdb/duckdb-wasm')
    }
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    target: 'esnext'
  }
});