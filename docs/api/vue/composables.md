# Vue Composables

Vue composables provide reactive DuckDB functionality using the Composition API.

## Installation

```bash
npm install @northprint/duckdb-wasm-adapter-vue
```

## Connection Composables

### useDuckDB

Access the DuckDB connection and status.

```typescript
function useDuckDB(): {
  connection: Ref<Connection | null>;
  status: Ref<ConnectionStatus>;
  error: Ref<Error | null>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: Ref<boolean>;
  isLoading: Ref<boolean>;
}
```

#### Basic Usage

```vue
<template>
  <div>
    <p>Status: {{ status }}</p>
    <p v-if="error" class="error">{{ error.message }}</p>
    
    <button 
      @click="connect" 
      :disabled="isLoading || isConnected"
    >
      Connect
    </button>
    
    <button 
      @click="disconnect" 
      :disabled="isLoading || !isConnected"
    >
      Disconnect
    </button>
  </div>
</template>

<script setup>
import { useDuckDB } from '@northprint/duckdb-wasm-adapter-vue';

const {
  status,
  error,
  connect,
  disconnect,
  isConnected,
  isLoading
} = useDuckDB();
</script>
```

## Query Composables

### useQuery

Execute SELECT queries reactively.

```typescript
function useQuery<T = Record<string, unknown>>(
  sql: MaybeRef<string>,
  params?: MaybeRef<unknown[]>,
  options?: UseQueryOptions
): {
  data: Ref<T[] | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  execute: () => Promise<void>;
  refresh: () => Promise<void>;
  metadata: Ref<ColumnMetadata[] | null>;
}
```

#### Basic Usage

```vue
<template>
  <div>
    <div v-if="loading">Loading users...</div>
    <div v-else-if="error" class="error">{{ error.message }}</div>
    <div v-else>
      <button @click="refresh">Refresh</button>
      <table>
        <thead>
          <tr>
            <th v-for="col in metadata" :key="col.name">
              {{ col.name }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in data" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading, error, refresh, metadata } = useQuery(
  'SELECT * FROM users ORDER BY created_at DESC'
);
</script>
```

#### Reactive Parameters

```vue
<template>
  <div>
    <select v-model="department">
      <option value="">All Departments</option>
      <option value="engineering">Engineering</option>
      <option value="sales">Sales</option>
      <option value="marketing">Marketing</option>
    </select>

    <input 
      v-model="minSalary" 
      type="number" 
      placeholder="Minimum Salary"
    />

    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <p>Found {{ data?.length || 0 }} employees</p>
      <ul>
        <li v-for="emp in data" :key="emp.id">
          {{ emp.name }} - {{ emp.department }} - ${{ emp.salary }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const department = ref('');
const minSalary = ref(0);

const sql = computed(() => {
  let query = 'SELECT * FROM employees WHERE 1=1';
  if (department.value) query += ' AND department = ?';
  if (minSalary.value > 0) query += ' AND salary >= ?';
  return query + ' ORDER BY salary DESC';
});

const params = computed(() => {
  const p = [];
  if (department.value) p.push(department.value);
  if (minSalary.value > 0) p.push(minSalary.value);
  return p;
});

const { data, loading, error } = useQuery(sql, params, {
  enabled: true // Always enabled, will re-run when params change
});
</script>
```

#### UseQueryOptions

```typescript
interface UseQueryOptions {
  enabled?: MaybeRef<boolean>;        // Enable/disable query execution
  immediate?: boolean;                // Execute immediately (default: true)
  refetchInterval?: number;           // Auto-refetch interval in ms
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
}
```

#### Advanced Usage with Options

```vue
<script setup>
import { ref } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const enabled = ref(false);
const lastUpdate = ref(null);

const { data, loading, error, refresh } = useQuery(
  'SELECT COUNT(*) as total, AVG(salary) as avg_salary FROM employees',
  undefined,
  {
    enabled,
    refetchInterval: 10000, // Refresh every 10 seconds
    onSuccess: (data) => {
      lastUpdate.value = new Date();
      console.log('Stats updated:', data[0]);
    },
    onError: (error) => {
      console.error('Stats query failed:', error);
    }
  }
);

// Start/stop monitoring
const toggleMonitoring = () => {
  enabled.value = !enabled.value;
};
</script>

<template>
  <div>
    <button @click="toggleMonitoring">
      {{ enabled ? 'Stop' : 'Start' }} Monitoring
    </button>
    
    <div v-if="lastUpdate">
      Last updated: {{ lastUpdate.toLocaleTimeString() }}
    </div>
    
    <div v-if="data && data[0]">
      <p>Total Employees: {{ data[0].total }}</p>
      <p>Average Salary: ${{ Math.round(data[0].avg_salary) }}</p>
    </div>
  </div>
</template>
```

### useMutation

Execute INSERT, UPDATE, DELETE operations.

```typescript
function useMutation<T = Record<string, unknown>>(
  options?: UseMutationOptions<T>
): {
  mutate: (sql: string, params?: unknown[]) => Promise<T[]>;
  mutateAsync: (sql: string, params?: unknown[]) => Promise<T[]>;
  data: Ref<T[] | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  reset: () => void;
}
```

#### Basic Usage

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input 
      v-model="form.name" 
      placeholder="Name" 
      required 
    />
    <input 
      v-model="form.email" 
      type="email" 
      placeholder="Email" 
      required 
    />
    <input 
      v-model="form.department" 
      placeholder="Department" 
      required 
    />
    
    <button type="submit" :disabled="loading">
      {{ loading ? 'Creating...' : 'Create User' }}
    </button>
    
    <div v-if="error" class="error">{{ error.message }}</div>
    <div v-if="data" class="success">User created successfully!</div>
  </form>
</template>

<script setup>
import { reactive } from 'vue';
import { useMutation } from '@northprint/duckdb-wasm-adapter-vue';

const form = reactive({
  name: '',
  email: '',
  department: ''
});

const { mutate, loading, error, data, reset } = useMutation({
  onSuccess: (result) => {
    console.log('User created:', result);
    // Reset form
    Object.assign(form, { name: '', email: '', department: '' });
    // Clear success message after 3 seconds
    setTimeout(reset, 3000);
  },
  onError: (error) => {
    console.error('Failed to create user:', error);
  }
});

const handleSubmit = async () => {
  await mutate(
    'INSERT INTO users (name, email, department) VALUES (?, ?, ?) RETURNING *',
    [form.name, form.email, form.department]
  );
};
</script>
```

## Data Import/Export Composables

### useImportCSV

Import CSV files reactively.

```vue
<template>
  <div>
    <input 
      type="file" 
      accept=".csv" 
      @change="handleFileSelect"
      :disabled="loading"
    />
    
    <div v-if="loading" class="loading">
      Importing CSV...
    </div>
    
    <div v-if="error" class="error">
      Import failed: {{ error.message }}
    </div>
    
    <div v-if="success" class="success">
      CSV imported successfully!
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useImportCSV } from '@northprint/duckdb-wasm-adapter-vue';

const success = ref(false);

const { importCSV, loading, error } = useImportCSV({
  onSuccess: () => {
    success.value = true;
    setTimeout(() => { success.value = false; }, 3000);
  }
});

const handleFileSelect = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  await importCSV(file, 'imported_data', {
    header: true,
    delimiter: ',',
    quote: '"'
  });
};
</script>
```

### useExportCSV / useExportJSON

Export data reactively.

```vue
<template>
  <div>
    <button @click="exportCSV" :disabled="loading">
      {{ loading ? 'Exporting...' : 'Export as CSV' }}
    </button>
    
    <button @click="exportJSON" :disabled="loading">
      {{ loading ? 'Exporting...' : 'Export as JSON' }}
    </button>
    
    <div v-if="error" class="error">{{ error.message }}</div>
  </div>
</template>

<script setup>
import { useExportCSV, useExportJSON } from '@northprint/duckdb-wasm-adapter-vue';

const exportCSVComposable = useExportCSV();
const exportJSONComposable = useExportJSON();

const exportCSV = async () => {
  try {
    const csv = await exportCSVComposable.exportCSV('SELECT * FROM users');
    
    // Download the file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
  }
};

const exportJSON = async () => {
  try {
    const data = await exportJSONComposable.exportJSON('SELECT * FROM users');
    console.log('Exported data:', data);
  } catch (error) {
    console.error('Export failed:', error);
  }
};

// Use loading state from either composable
const loading = computed(() => 
  exportCSVComposable.loading.value || exportJSONComposable.loading.value
);

const error = computed(() => 
  exportCSVComposable.error.value || exportJSONComposable.error.value
);
</script>
```

## Advanced Composables

### useQueryBuilder

Use Query Builder with reactive parameters.

```vue
<template>
  <div>
    <div class="filters">
      <input 
        v-model="filters.name" 
        placeholder="Search by name"
      />
      
      <select v-model="filters.department">
        <option value="">All Departments</option>
        <option value="engineering">Engineering</option>
        <option value="sales">Sales</option>
        <option value="marketing">Marketing</option>
      </select>
      
      <input 
        v-model.number="filters.minSalary" 
        type="number" 
        placeholder="Min Salary"
      />
      
      <select v-model="sortBy">
        <option value="name">Name</option>
        <option value="salary">Salary</option>
        <option value="created_at">Date Created</option>
      </select>
      
      <select v-model="sortOrder">
        <option value="ASC">Ascending</option>
        <option value="DESC">Descending</option>
      </select>
    </div>

    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <p>{{ data?.length || 0 }} employees found</p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Department</th>
            <th>Salary</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="emp in data" :key="emp.id">
            <td>{{ emp.name }}</td>
            <td>{{ emp.department }}</td>
            <td>${{ emp.salary.toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { useQueryBuilder } from '@northprint/duckdb-wasm-adapter-vue';
import { select } from '@northprint/duckdb-wasm-adapter-core';

const filters = reactive({
  name: '',
  department: '',
  minSalary: 0
});

const sortBy = ref('name');
const sortOrder = ref('ASC');

const queryBuilder = computed(() => {
  let query = select('id', 'name', 'department', 'salary')
    .from('employees');

  if (filters.name) {
    query = query.where('name', 'LIKE', `%${filters.name}%`);
  }

  if (filters.department) {
    query = query.where('department', '=', filters.department);
  }

  if (filters.minSalary > 0) {
    query = query.where('salary', '>=', filters.minSalary);
  }

  return query
    .orderBy(sortBy.value, sortOrder.value)
    .limit(100);
});

const { data, loading, error } = useQueryBuilder(queryBuilder, {
  enabled: true
});
</script>
```

### useCache

Manage query result cache.

```vue
<template>
  <div>
    <h3>Cache Statistics</h3>
    <div class="stats">
      <div>Hits: {{ stats.hits }}</div>
      <div>Misses: {{ stats.misses }}</div>
      <div>Hit Rate: {{ (stats.hitRate * 100).toFixed(1) }}%</div>
      <div>Entries: {{ stats.entries }}</div>
      <div>Total Size: {{ formatBytes(stats.totalSize) }}</div>
    </div>

    <div class="actions">
      <button @click="clearCache">Clear All Cache</button>
      <button @click="clearUserCache">Clear User Queries</button>
      <button @click="refreshStats">Refresh Stats</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useCache } from '@northprint/duckdb-wasm-adapter-vue';

const { clearCache, getCacheStats, invalidateCache } = useCache();
const stats = ref(getCacheStats());

let interval;

const refreshStats = () => {
  stats.value = getCacheStats();
};

const clearUserCache = () => {
  const cleared = invalidateCache(/users/);
  console.log(`Cleared ${cleared} user-related cache entries`);
  refreshStats();
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

onMounted(() => {
  // Refresh stats every second
  interval = setInterval(refreshStats, 1000);
});

onUnmounted(() => {
  if (interval) {
    clearInterval(interval);
  }
});
</script>
```

## Composable Patterns

### Custom Query Composable

Create reusable domain-specific composables:

```javascript
// composables/useUsers.js
import { computed } from 'vue';
import { useQuery, useMutation } from '@northprint/duckdb-wasm-adapter-vue';

export function useUsers(filters = {}) {
  const sql = computed(() => {
    let query = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    
    if (filters.department) {
      query += ' AND department = ?';
      params.push(filters.department);
    }
    
    if (filters.active !== undefined) {
      query += ' AND active = ?';
      params.push(filters.active);
    }
    
    return { sql: query + ' ORDER BY created_at DESC', params };
  });

  const { data: users, loading, error, refresh } = useQuery(
    () => sql.value.sql,
    () => sql.value.params
  );

  const { mutate: createUser, loading: creating } = useMutation({
    onSuccess: () => refresh()
  });

  const { mutate: updateUser, loading: updating } = useMutation({
    onSuccess: () => refresh()
  });

  const { mutate: deleteUser, loading: deleting } = useMutation({
    onSuccess: () => refresh()
  });

  return {
    users,
    loading,
    error,
    refresh,
    createUser: (userData) => createUser(
      'INSERT INTO users (name, email, department) VALUES (?, ?, ?)',
      [userData.name, userData.email, userData.department]
    ),
    updateUser: (id, userData) => updateUser(
      'UPDATE users SET name = ?, email = ?, department = ? WHERE id = ?',
      [userData.name, userData.email, userData.department, id]
    ),
    deleteUser: (id) => deleteUser('DELETE FROM users WHERE id = ?', [id]),
    isWorking: computed(() => creating.value || updating.value || deleting.value)
  };
}
```

Usage:

```vue
<script setup>
import { reactive } from 'vue';
import { useUsers } from '@/composables/useUsers';

const filters = reactive({
  department: '',
  active: true
});

const {
  users,
  loading,
  createUser,
  updateUser,
  deleteUser,
  isWorking
} = useUsers(filters);
</script>
```