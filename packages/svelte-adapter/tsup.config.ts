import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
  external: ['svelte', '@northprint/duckdb-wasm-adapter-core', '@duckdb/duckdb-wasm'],
  skipNodeModulesBundle: true,
  tsconfig: './tsconfig.json',
  esbuildOptions(options) {
    options.platform = 'browser';
  },
});