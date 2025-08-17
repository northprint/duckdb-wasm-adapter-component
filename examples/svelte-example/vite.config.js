import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    svelte(),
    viteStaticCopy({
      targets: [
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
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  worker: {
    format: 'es'
  }
});