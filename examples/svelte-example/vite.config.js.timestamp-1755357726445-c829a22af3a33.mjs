// vite.config.js
import { defineConfig } from "file:///Users/norihironarayama/duckdb-wasm-adapter-component/node_modules/.pnpm/vite@5.4.19_@types+node@24.3.0/node_modules/vite/dist/node/index.js";
import { svelte } from "file:///Users/norihironarayama/duckdb-wasm-adapter-component/node_modules/.pnpm/@sveltejs+vite-plugin-svelte@3.1.2_svelte@4.2.20_vite@5.4.19_@types+node@24.3.0_/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import path from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///Users/norihironarayama/duckdb-wasm-adapter-component/examples/svelte-example/vite.config.js";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [svelte()],
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
        // Allow project root
        path.resolve(__dirname, "../../node_modules/.pnpm"),
        path.resolve(__dirname, "../../node_modules/@duckdb")
      ]
    }
  },
  resolve: {
    alias: {
      "@duckdb/duckdb-wasm": path.resolve(__dirname, "../../node_modules/.pnpm/@duckdb+duckdb-wasm@1.29.0/node_modules/@duckdb/duckdb-wasm")
    }
  },
  assetsInclude: ["**/*.wasm"],
  build: {
    target: "esnext"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbm9yaWhpcm9uYXJheWFtYS9kdWNrZGItd2FzbS1hZGFwdGVyLWNvbXBvbmVudC9leGFtcGxlcy9zdmVsdGUtZXhhbXBsZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL25vcmloaXJvbmFyYXlhbWEvZHVja2RiLXdhc20tYWRhcHRlci1jb21wb25lbnQvZXhhbXBsZXMvc3ZlbHRlLWV4YW1wbGUvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL25vcmloaXJvbmFyYXlhbWEvZHVja2RiLXdhc20tYWRhcHRlci1jb21wb25lbnQvZXhhbXBsZXMvc3ZlbHRlLWV4YW1wbGUvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IHN2ZWx0ZSB9IGZyb20gJ0BzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGUnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcblxuY29uc3QgX19maWxlbmFtZSA9IGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKTtcbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShfX2ZpbGVuYW1lKTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3N2ZWx0ZSgpXSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydAZHVja2RiL2R1Y2tkYi13YXNtJ11cbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgaGVhZGVyczoge1xuICAgICAgJ0Nyb3NzLU9yaWdpbi1FbWJlZGRlci1Qb2xpY3knOiAncmVxdWlyZS1jb3JwJyxcbiAgICAgICdDcm9zcy1PcmlnaW4tT3BlbmVyLVBvbGljeSc6ICdzYW1lLW9yaWdpbidcbiAgICB9LFxuICAgIGZzOiB7XG4gICAgICBhbGxvdzogW1xuICAgICAgICBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4nKSwgIC8vIEFsbG93IHByb2plY3Qgcm9vdFxuICAgICAgICBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtJyksXG4gICAgICAgIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9ub2RlX21vZHVsZXMvQGR1Y2tkYicpXG4gICAgICBdXG4gICAgfVxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAZHVja2RiL2R1Y2tkYi13YXNtJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9AZHVja2RiK2R1Y2tkYi13YXNtQDEuMjkuMC9ub2RlX21vZHVsZXMvQGR1Y2tkYi9kdWNrZGItd2FzbScpXG4gICAgfVxuICB9LFxuICBhc3NldHNJbmNsdWRlOiBbJyoqLyoud2FzbSddLFxuICBidWlsZDoge1xuICAgIHRhcmdldDogJ2VzbmV4dCdcbiAgfVxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUF5WixTQUFTLG9CQUFvQjtBQUN0YixTQUFTLGNBQWM7QUFDdkIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBSG9PLElBQU0sMkNBQTJDO0FBS25ULElBQU0sYUFBYSxjQUFjLHdDQUFlO0FBQ2hELElBQU0sWUFBWSxLQUFLLFFBQVEsVUFBVTtBQUV6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsT0FBTyxDQUFDO0FBQUEsRUFDbEIsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLHFCQUFxQjtBQUFBLEVBQ2pDO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixTQUFTO0FBQUEsTUFDUCxnQ0FBZ0M7QUFBQSxNQUNoQyw4QkFBOEI7QUFBQSxJQUNoQztBQUFBLElBQ0EsSUFBSTtBQUFBLE1BQ0YsT0FBTztBQUFBLFFBQ0wsS0FBSyxRQUFRLFdBQVcsT0FBTztBQUFBO0FBQUEsUUFDL0IsS0FBSyxRQUFRLFdBQVcsMEJBQTBCO0FBQUEsUUFDbEQsS0FBSyxRQUFRLFdBQVcsNEJBQTRCO0FBQUEsTUFDdEQ7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsdUJBQXVCLEtBQUssUUFBUSxXQUFXLHNGQUFzRjtBQUFBLElBQ3ZJO0FBQUEsRUFDRjtBQUFBLEVBQ0EsZUFBZSxDQUFDLFdBQVc7QUFBQSxFQUMzQixPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsRUFDVjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
