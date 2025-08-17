import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: ['svelte', '@northprint/duckdb-wasm-adapter-core', '@duckdb/duckdb-wasm'],
  esbuildOptions(options) {
    options.platform = 'browser';
  },
});