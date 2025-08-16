# Installation

Learn how to install and set up DuckDB WASM Adapter in your project.

## Requirements

Before installing DuckDB WASM Adapter, ensure your environment meets these requirements:

- **Node.js**: 16.0.0 or higher
- **Package Manager**: npm, yarn, or pnpm
- **Browser Support**: Modern browsers with WebAssembly support
  - Chrome 57+
  - Firefox 52+
  - Safari 11+
  - Edge 16+

## Package Installation

Choose the appropriate package for your framework:

### React

```bash
npm install @duckdb-wasm-adapter/react
```

### Vue

```bash
npm install @duckdb-wasm-adapter/vue
```

### Svelte

```bash
npm install @duckdb-wasm-adapter/svelte
```

### Core (Framework Agnostic)

```bash
npm install @duckdb-wasm-adapter/core
```

## Package Managers

### npm

```bash
# React
npm install @duckdb-wasm-adapter/react

# Vue
npm install @duckdb-wasm-adapter/vue

# Svelte
npm install @duckdb-wasm-adapter/svelte
```

### yarn

```bash
# React
yarn add @duckdb-wasm-adapter/react

# Vue
yarn add @duckdb-wasm-adapter/vue

# Svelte
yarn add @duckdb-wasm-adapter/svelte
```

### pnpm

```bash
# React
pnpm add @duckdb-wasm-adapter/react

# Vue
pnpm add @duckdb-wasm-adapter/vue

# Svelte
pnpm add @duckdb-wasm-adapter/svelte
```

## Dependencies

The adapter packages automatically install these dependencies:

- `@duckdb/duckdb-wasm` - Core DuckDB WASM library
- `@duckdb-wasm-adapter/core` - Shared utilities (automatically included)

## Project Setup

### React Project

1. **Install the package:**
   ```bash
   npm install @duckdb-wasm-adapter/react
   ```

2. **Add the provider to your app:**
   ```jsx
   // src/App.jsx
   import { DuckDBProvider } from '@duckdb-wasm-adapter/react';

   function App() {
     return (
       <DuckDBProvider autoConnect>
         <div className="App">
           {/* Your app components */}
         </div>
       </DuckDBProvider>
     );
   }

   export default App;
   ```

### Vue Project

1. **Install the package:**
   ```bash
   npm install @duckdb-wasm-adapter/vue
   ```

2. **Register the plugin:**
   ```javascript
   // src/main.js
   import { createApp } from 'vue';
   import { DuckDBPlugin } from '@duckdb-wasm-adapter/vue';
   import App from './App.vue';

   const app = createApp(App);
   app.use(DuckDBPlugin, { autoConnect: true });
   app.mount('#app');
   ```

### Svelte Project

1. **Install the package:**
   ```bash
   npm install @duckdb-wasm-adapter/svelte
   ```

2. **Initialize in your app:**
   ```javascript
   // src/App.svelte
   <script>
     import { duckdb } from '@duckdb-wasm-adapter/svelte';
     
     const db = duckdb({ autoConnect: true });
   </script>
   ```

## Build Configuration

::: warning WASM-Specific Configuration Required
DuckDB WASM requires special build configuration to work properly. Make sure to configure your bundler correctly to avoid runtime errors.
:::

### Vite

For Vite-based projects, add WASM support:

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  },
  server: {
    fs: {
      strict: false
    },
    headers: {
      // Required for SharedArrayBuffer support
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  }
});
```

### Webpack

For Webpack-based projects:

```javascript
// webpack.config.js
module.exports = {
  experiments: {
    asyncWebAssembly: true
  },
  resolve: {
    fallback: {
      "fs": false,
      "path": false
    }
  }
};
```

### Next.js

For Next.js projects, update `next.config.js`:

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: 'loose'
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true
    };
    return config;
  }
};

module.exports = nextConfig;
```

### Nuxt 3

For Nuxt 3 projects:

```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  build: {
    transpile: ['@duckdb-wasm-adapter/vue']
  },
  nitro: {
    experimental: {
      wasm: true
    }
  }
});
```

## Development Server Setup

### Static File Serving

DuckDB WASM requires serving WASM files. Ensure your development server can serve static files:

#### Vite
```javascript
// vite.config.js
export default defineConfig({
  publicDir: 'public',
  server: {
    fs: {
      strict: false
    }
  }
});
```

#### Create React App
```javascript
// Place WASM files in public/ directory
// They'll be available at /filename.wasm
```

#### Vue CLI
```javascript
// Place WASM files in public/ directory
// Configure in vue.config.js if needed
module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/your-app/' : '/'
};
```

## CDN Installation

For quick prototyping, you can use CDN links:

### ES Modules

```html
<script type="module">
  import { createConnection } from 'https://unpkg.com/@duckdb-wasm-adapter/core@latest/dist/index.js';
  
  const connection = await createConnection();
  // Use the connection...
</script>
```

### UMD

```html
<script src="https://unpkg.com/@duckdb-wasm-adapter/core@latest/dist/index.umd.js"></script>
<script>
  const { createConnection } = DuckDBWasmAdapter;
  
  createConnection().then(connection => {
    // Use the connection...
  });
</script>
```

## Verify Installation

Create a simple test to verify the installation:

### React

```jsx
// src/components/TestConnection.jsx
import { useQuery } from '@duckdb-wasm-adapter/react';

function TestConnection() {
  const { data, loading, error } = useQuery('SELECT 42 as answer');

  if (loading) return <div>Testing connection...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h3>Connection Test</h3>
      <p>Answer: {data?.[0]?.answer}</p>
    </div>
  );
}

export default TestConnection;
```

### Vue

```vue
<template>
  <div>
    <h3>Connection Test</h3>
    <div v-if="loading">Testing connection...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>Answer: {{ data?.[0]?.answer }}</div>
  </div>
</template>

<script setup>
import { useQuery } from '@duckdb-wasm-adapter/vue';

const { data, loading, error } = useQuery('SELECT 42 as answer');
</script>
```

### Svelte

```svelte
<script>
  import { duckdb } from '@duckdb-wasm-adapter/svelte';
  
  const db = duckdb({ autoConnect: true });
  const testQuery = db.query('SELECT 42 as answer');
</script>

<div>
  <h3>Connection Test</h3>
  {#if $testQuery.loading}
    <div>Testing connection...</div>
  {:else if $testQuery.error}
    <div>Error: {$testQuery.error.message}</div>
  {:else if $testQuery.data}
    <div>Answer: {$testQuery.data[0].answer}</div>
  {/if}
</div>
```

## Troubleshooting

### Common Issues

#### WASM Loading Errors

**Problem**: `Failed to load WASM module`

**Solution**: Ensure your server serves WASM files with correct MIME type:

```javascript
// For Express.js
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    }
  }
}));
```

#### Worker Loading Errors

**Problem**: `Failed to load worker script`

**Solution**: Copy worker files to your public directory:

```bash
cp node_modules/@duckdb/duckdb-wasm/dist/*.worker.js public/
cp node_modules/@duckdb/duckdb-wasm/dist/*.wasm public/
```

#### Import Errors

**Problem**: `Cannot resolve module '@duckdb-wasm-adapter/react'`

**Solution**: Clear cache and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Errors

**Problem**: TypeScript cannot find module declarations

**Solution**: Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```

### Browser Compatibility

If you need to support older browsers:

```javascript
// Check for WebAssembly support
if (typeof WebAssembly === 'undefined') {
  console.error('WebAssembly not supported in this browser');
  // Provide fallback or show error message
}

// Check for Worker support
if (typeof Worker === 'undefined') {
  console.warn('Web Workers not supported, using main thread');
  // Initialize without worker
}
```

### Performance Tips

1. **Enable caching** for better performance:
   ```javascript
   const config = {
     cache: {
       enabled: true,
       maxEntries: 100
     }
   };
   ```

2. **Use Web Workers** (enabled by default):
   ```javascript
   const config = {
     worker: true // Recommended for production
   };
   ```

3. **Optimize bundle size** by importing only what you need:
   ```javascript
   // ✅ Good: Import specific functions
   import { useQuery, useMutation } from '@duckdb-wasm-adapter/react';
   
   // ❌ Avoid: Import everything
   import * as DuckDB from '@duckdb-wasm-adapter/react';
   ```

## Next Steps

After successful installation:

1. [Basic Usage](/guide/basic-usage) - Learn the fundamentals
2. [Concepts](/guide/concepts) - Understand core concepts
3. [Framework Guides](/frameworks/react) - Framework-specific guides
4. [Examples](/examples/) - See practical examples

## Getting Help

If you encounter issues during installation:

- Check the [Troubleshooting Guide](/guide/error-handling)
- Browse [GitHub Issues](https://github.com/yourusername/duckdb-wasm-adapter-component/issues)
- Join our [Discord Community](https://discord.gg/duckdb-wasm-adapter)