import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
  minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
  external: ['react', 'react-dom', '@northprint/duckdb-wasm-adapter-core'],
  skipNodeModulesBundle: true,
  tsconfig: './tsconfig.json',
});