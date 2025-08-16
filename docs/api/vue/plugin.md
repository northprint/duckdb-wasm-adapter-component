# Vue Plugin

The Vue plugin provides global DuckDB functionality and dependency injection for Vue applications.

## Installation

```bash
npm install @northprint/duckdb-wasm-adapter-vue
```

## Basic Setup

```javascript
// main.js
import { createApp } from 'vue';
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';
import App from './App.vue';

const app = createApp(App);

// Install the plugin
app.use(DuckDBPlugin, {
  autoConnect: true
});

app.mount('#app');
```

## Plugin Options

```typescript
interface DuckDBPluginOptions {
  autoConnect?: boolean;           // Auto-connect on plugin install
  config?: ConnectionConfig;       // Connection configuration
  debug?: DebugConfig;            // Debug configuration
  globalProperty?: string;        // Global property name (default: '$duckdb')
}
```

## Advanced Configuration

```javascript
// main.js
import { createApp } from 'vue';
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';
import App from './App.vue';

const app = createApp(App);

app.use(DuckDBPlugin, {
  autoConnect: true,
  globalProperty: '$db', // Access via this.$db
  debug: {
    enabled: import.meta.env.DEV,
    logQueries: true,
    logTiming: true,
    slowQueryThreshold: 50
  },
  config: {
    worker: true,
    cache: {
      enabled: true,
      maxEntries: 100,
      ttl: 60000,
      strategy: 'lru'
    },
    query: {
      castBigIntToDouble: true
    }
  }
});

app.mount('#app');
```

## Global Property Access

Once installed, you can access DuckDB functionality via the global property:

### Options API

```vue
<template>
  <div>
    <p>Status: {{ status }}</p>
    <button @click="connect" :disabled="status === 'connected'">
      Connect
    </button>
    <button @click="disconnect" :disabled="status !== 'connected'">
      Disconnect
    </button>
  </div>
</template>

<script>
export default {
  computed: {
    status() {
      return this.$duckdb.status;
    }
  },
  methods: {
    async connect() {
      try {
        await this.$duckdb.connect();
        console.log('Connected to DuckDB');
      } catch (error) {
        console.error('Connection failed:', error);
      }
    },
    async disconnect() {
      try {
        await this.$duckdb.disconnect();
        console.log('Disconnected from DuckDB');
      } catch (error) {
        console.error('Disconnect failed:', error);
      }
    }
  }
};
</script>
```

### Composition API

```vue
<script setup>
import { getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const $duckdb = instance.appContext.config.globalProperties.$duckdb;

const connect = async () => {
  try {
    await $duckdb.connect();
    console.log('Connected');
  } catch (error) {
    console.error('Connection failed:', error);
  }
};
</script>
```

## Plugin Methods

The plugin adds the following methods to the global property:

```typescript
interface DuckDBGlobalAPI {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Status
  readonly status: ConnectionStatus;
  readonly isConnected: boolean;
  readonly connection: Connection | null;
  
  // Query execution
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute<T>(sql: string, params?: unknown[]): Promise<ResultSet<T>>;
  
  // Data import/export
  importCSV(file: File | string, tableName: string, options?: ImportOptions): Promise<void>;
  importJSON(data: unknown[], tableName: string): Promise<void>;
  exportCSV(query: string, options?: ExportOptions): Promise<string>;
  exportJSON<T>(query: string): Promise<T[]>;
  
  // Cache management
  clearCache(): void;
  getCacheStats(): CacheStats;
  invalidateCache(pattern: string | RegExp): number;
}
```

## Server-Side Rendering (SSR)

The plugin handles SSR gracefully by deferring connection until client-side:

```javascript
// nuxt.config.js (Nuxt 3)
export default defineNuxtConfig({
  plugins: [
    {
      src: '~/plugins/duckdb.client.js',
      mode: 'client' // Only run on client-side
    }
  ]
});
```

```javascript
// plugins/duckdb.client.js
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(DuckDBPlugin, {
    autoConnect: true
  });
});
```

## Error Handling

Add global error handling for DuckDB operations:

```javascript
// main.js
app.use(DuckDBPlugin, {
  autoConnect: true,
  onError: (error) => {
    console.error('DuckDB Error:', error);
    // Send to error reporting service
  }
});
```

## TypeScript Support

Add type declarations for the global property:

```typescript
// types/vue.d.ts
import { DuckDBGlobalAPI } from '@northprint/duckdb-wasm-adapter-vue';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $duckdb: DuckDBGlobalAPI;
  }
}
```

## Plugin with Custom Configuration

Create a custom plugin wrapper for your specific needs:

```javascript
// plugins/database.js
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';

export const DatabasePlugin = {
  install(app, options = {}) {
    // Install DuckDB plugin with default config
    app.use(DuckDBPlugin, {
      autoConnect: true,
      debug: {
        enabled: import.meta.env.DEV
      },
      config: {
        cache: {
          enabled: true,
          maxEntries: 50
        }
      },
      ...options
    });

    // Add custom methods
    app.config.globalProperties.$queryUsers = async (filters = {}) => {
      const db = app.config.globalProperties.$duckdb;
      let sql = 'SELECT * FROM users WHERE 1=1';
      const params = [];

      if (filters.department) {
        sql += ' AND department = ?';
        params.push(filters.department);
      }

      if (filters.active !== undefined) {
        sql += ' AND active = ?';
        params.push(filters.active);
      }

      return await db.query(sql, params);
    };
  }
};
```

```javascript
// main.js
import { DatabasePlugin } from './plugins/database.js';

app.use(DatabasePlugin);
```

## Testing

For testing components that use the plugin:

```javascript
// test-utils.js
import { mount } from '@vue/test-utils';
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';

export function mountWithDuckDB(component, options = {}) {
  const app = createApp(component);
  
  app.use(DuckDBPlugin, {
    autoConnect: false, // Don't auto-connect in tests
    config: {
      worker: false // Disable worker in test environment
    }
  });

  return mount(component, {
    global: {
      plugins: [DuckDBPlugin]
    },
    ...options
  });
}
```

## Best Practices

1. **Install early in your application** to ensure availability in all components
2. **Use autoConnect for simple applications** where database is always needed
3. **Configure debug mode appropriately** for development vs production
4. **Handle SSR properly** by using client-only plugins
5. **Add TypeScript declarations** for better development experience
6. **Create custom wrappers** for application-specific database operations
7. **Disable worker in tests** to avoid test environment complications