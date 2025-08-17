// vite.config.js
import { defineConfig } from "file:///Users/norihironarayama/duckdb-wasm-adapter-component/node_modules/.pnpm/vite@5.4.19_@types+node@24.3.0/node_modules/vite/dist/node/index.js";
import { svelte } from "file:///Users/norihironarayama/duckdb-wasm-adapter-component/node_modules/.pnpm/@sveltejs+vite-plugin-svelte@4.0.4_svelte@5.38.1_vite@5.4.19_@types+node@24.3.0_/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import { viteStaticCopy } from "file:///Users/norihironarayama/duckdb-wasm-adapter-component/node_modules/.pnpm/vite-plugin-static-copy@3.1.1_vite@5.4.19_@types+node@24.3.0_/node_modules/vite-plugin-static-copy/dist/index.js";
import path from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///Users/norihironarayama/duckdb-wasm-adapter-component/examples/svelte5-runes-example/vite.config.js";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    svelte(),
    viteStaticCopy({
      targets: [
        // Copy for dev server (to public)
        {
          src: "../../node_modules/.pnpm/@duckdb+duckdb-wasm@1.29.0/node_modules/@duckdb/duckdb-wasm/dist/*.wasm",
          dest: "../public"
        },
        {
          src: "../../node_modules/.pnpm/@duckdb+duckdb-wasm@1.29.0/node_modules/@duckdb/duckdb-wasm/dist/*.worker.js",
          dest: "../public"
        },
        // Copy for production build (to dist)
        {
          src: "../../node_modules/.pnpm/@duckdb+duckdb-wasm@1.29.0/node_modules/@duckdb/duckdb-wasm/dist/*.wasm",
          dest: "."
        },
        {
          src: "../../node_modules/.pnpm/@duckdb+duckdb-wasm@1.29.0/node_modules/@duckdb/duckdb-wasm/dist/*.worker.js",
          dest: "."
        }
      ]
    })
  ],
  publicDir: "public",
  resolve: {
    alias: {
      "@duckdb/duckdb-wasm": path.resolve(__dirname, "../../node_modules/.pnpm/@duckdb+duckdb-wasm@1.29.0/node_modules/@duckdb/duckdb-wasm")
    }
  },
  optimizeDeps: {
    exclude: ["@duckdb/duckdb-wasm"]
  },
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin"
    },
    fs: {
      allow: [
        path.resolve(__dirname, "../.."),
        path.resolve(__dirname, "../../node_modules/.pnpm"),
        path.resolve(__dirname, "../../node_modules/@duckdb")
      ]
    }
  },
  worker: {
    format: "es"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbm9yaWhpcm9uYXJheWFtYS9kdWNrZGItd2FzbS1hZGFwdGVyLWNvbXBvbmVudC9leGFtcGxlcy9zdmVsdGU1LXJ1bmVzLWV4YW1wbGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9ub3JpaGlyb25hcmF5YW1hL2R1Y2tkYi13YXNtLWFkYXB0ZXItY29tcG9uZW50L2V4YW1wbGVzL3N2ZWx0ZTUtcnVuZXMtZXhhbXBsZS92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbm9yaWhpcm9uYXJheWFtYS9kdWNrZGItd2FzbS1hZGFwdGVyLWNvbXBvbmVudC9leGFtcGxlcy9zdmVsdGU1LXJ1bmVzLWV4YW1wbGUvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IHN2ZWx0ZSB9IGZyb20gJ0BzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGUnO1xuaW1wb3J0IHsgdml0ZVN0YXRpY0NvcHkgfSBmcm9tICd2aXRlLXBsdWdpbi1zdGF0aWMtY29weSc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xuXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKF9fZmlsZW5hbWUpO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgc3ZlbHRlKCksXG4gICAgdml0ZVN0YXRpY0NvcHkoe1xuICAgICAgdGFyZ2V0czogW1xuICAgICAgICAvLyBDb3B5IGZvciBkZXYgc2VydmVyICh0byBwdWJsaWMpXG4gICAgICAgIHtcbiAgICAgICAgICBzcmM6ICcuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQGR1Y2tkYitkdWNrZGItd2FzbUAxLjI5LjAvbm9kZV9tb2R1bGVzL0BkdWNrZGIvZHVja2RiLXdhc20vZGlzdC8qLndhc20nLFxuICAgICAgICAgIGRlc3Q6ICcuLi9wdWJsaWMnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzcmM6ICcuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQGR1Y2tkYitkdWNrZGItd2FzbUAxLjI5LjAvbm9kZV9tb2R1bGVzL0BkdWNrZGIvZHVja2RiLXdhc20vZGlzdC8qLndvcmtlci5qcycsXG4gICAgICAgICAgZGVzdDogJy4uL3B1YmxpYydcbiAgICAgICAgfSxcbiAgICAgICAgLy8gQ29weSBmb3IgcHJvZHVjdGlvbiBidWlsZCAodG8gZGlzdClcbiAgICAgICAge1xuICAgICAgICAgIHNyYzogJy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9AZHVja2RiK2R1Y2tkYi13YXNtQDEuMjkuMC9ub2RlX21vZHVsZXMvQGR1Y2tkYi9kdWNrZGItd2FzbS9kaXN0Lyoud2FzbScsXG4gICAgICAgICAgZGVzdDogJy4nXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzcmM6ICcuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQGR1Y2tkYitkdWNrZGItd2FzbUAxLjI5LjAvbm9kZV9tb2R1bGVzL0BkdWNrZGIvZHVja2RiLXdhc20vZGlzdC8qLndvcmtlci5qcycsXG4gICAgICAgICAgZGVzdDogJy4nXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KVxuICBdLFxuICBwdWJsaWNEaXI6ICdwdWJsaWMnLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAZHVja2RiL2R1Y2tkYi13YXNtJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9AZHVja2RiK2R1Y2tkYi13YXNtQDEuMjkuMC9ub2RlX21vZHVsZXMvQGR1Y2tkYi9kdWNrZGItd2FzbScpXG4gICAgfVxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ0BkdWNrZGIvZHVja2RiLXdhc20nXVxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBoZWFkZXJzOiB7XG4gICAgICAnQ3Jvc3MtT3JpZ2luLUVtYmVkZGVyLVBvbGljeSc6ICdyZXF1aXJlLWNvcnAnLFxuICAgICAgJ0Nyb3NzLU9yaWdpbi1PcGVuZXItUG9saWN5JzogJ3NhbWUtb3JpZ2luJ1xuICAgIH0sXG4gICAgZnM6IHtcbiAgICAgIGFsbG93OiBbXG4gICAgICAgIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLicpLFxuICAgICAgICBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtJyksXG4gICAgICAgIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9ub2RlX21vZHVsZXMvQGR1Y2tkYicpXG4gICAgICBdXG4gICAgfVxuICB9LFxuICB3b3JrZXI6IHtcbiAgICBmb3JtYXQ6ICdlcydcbiAgfVxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUE4YSxTQUFTLG9CQUFvQjtBQUMzYyxTQUFTLGNBQWM7QUFDdkIsU0FBUyxzQkFBc0I7QUFDL0IsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBSmtQLElBQU0sMkNBQTJDO0FBTWpVLElBQU0sYUFBYSxjQUFjLHdDQUFlO0FBQ2hELElBQU0sWUFBWSxLQUFLLFFBQVEsVUFBVTtBQUV6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsSUFDUCxlQUFlO0FBQUEsTUFDYixTQUFTO0FBQUE7QUFBQSxRQUVQO0FBQUEsVUFDRSxLQUFLO0FBQUEsVUFDTCxNQUFNO0FBQUEsUUFDUjtBQUFBLFFBQ0E7QUFBQSxVQUNFLEtBQUs7QUFBQSxVQUNMLE1BQU07QUFBQSxRQUNSO0FBQUE7QUFBQSxRQUVBO0FBQUEsVUFDRSxLQUFLO0FBQUEsVUFDTCxNQUFNO0FBQUEsUUFDUjtBQUFBLFFBQ0E7QUFBQSxVQUNFLEtBQUs7QUFBQSxVQUNMLE1BQU07QUFBQSxRQUNSO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFdBQVc7QUFBQSxFQUNYLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLHVCQUF1QixLQUFLLFFBQVEsV0FBVyxzRkFBc0Y7QUFBQSxJQUN2STtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxxQkFBcUI7QUFBQSxFQUNqQztBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sU0FBUztBQUFBLE1BQ1AsZ0NBQWdDO0FBQUEsTUFDaEMsOEJBQThCO0FBQUEsSUFDaEM7QUFBQSxJQUNBLElBQUk7QUFBQSxNQUNGLE9BQU87QUFBQSxRQUNMLEtBQUssUUFBUSxXQUFXLE9BQU87QUFBQSxRQUMvQixLQUFLLFFBQVEsV0FBVywwQkFBMEI7QUFBQSxRQUNsRCxLQUFLLFFBQVEsV0FBVyw0QkFBNEI7QUFBQSxNQUN0RDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixRQUFRO0FBQUEsRUFDVjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
