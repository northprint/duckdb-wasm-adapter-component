# Vue Framework Guide

Complete guide to using DuckDB WASM Adapter with Vue.js applications.

## Quick Start

### Installation

```bash
npm install @northprint/duckdb-wasm-adapter-vue
```

### Basic Setup

```javascript
// src/main.js
import { createApp } from 'vue';
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';
import App from './App.vue';

const app = createApp(App);

app.use(DuckDBPlugin, {
  autoConnect: true,
  config: {
    worker: true,
    cache: { enabled: true }
  }
});

app.mount('#app');
```

### First Query

```vue
<!-- src/components/Dashboard.vue -->
<template>
  <div>
    <h1>Dashboard</h1>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <p>The answer is: {{ data?.[0]?.answer }}</p>
    </div>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading, error } = useQuery('SELECT 42 as answer');
</script>
```

## Core Concepts

### Plugin Architecture

The Vue plugin provides global functionality and dependency injection:

```javascript
// main.js - Plugin configuration
app.use(DuckDBPlugin, {
  autoConnect: true,
  globalProperty: '$duckdb', // Access via this.$duckdb
  config: {
    worker: true,
    debug: { 
      enabled: import.meta.env.DEV,
      logQueries: true 
    },
    cache: {
      enabled: true,
      maxEntries: 100,
      ttl: 300000 // 5 minutes
    }
  }
});
```

### Composition API

Vue 3 composables provide reactive database functionality:

```vue
<script setup>
import { 
  useQuery, 
  useMutation, 
  useImportCSV, 
  useDuckDB 
} from '@northprint/duckdb-wasm-adapter-vue';
import { ref, computed } from 'vue';

// Connection status
const { status, isConnected } = useDuckDB();

// Reactive data fetching
const { data, loading, error, refresh } = useQuery('SELECT * FROM users');

// Data mutations
const { mutate } = useMutation();

// File imports
const { importCSV } = useImportCSV();
</script>
```

### Options API Support

For Vue 2 style components:

```vue
<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>{{ users.length }} users loaded</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      users: [],
      loading: true,
      error: null
    };
  },
  
  async mounted() {
    try {
      const result = await this.$duckdb.query('SELECT * FROM users');
      this.users = result;
    } catch (error) {
      this.error = error;
    } finally {
      this.loading = false;
    }
  }
};
</script>
```

## Data Fetching Patterns

### Simple Queries

```vue
<template>
  <div class="user-list">
    <h2>Active Users</h2>
    
    <div v-if="loading" class="loading">Loading users...</div>
    <div v-else-if="error" class="error">Failed to load users: {{ error.message }}</div>
    <div v-else>
      <p>{{ users?.length || 0 }} users found</p>
      
      <div class="user-grid">
        <div v-for="user in users" :key="user.id" class="user-card">
          <h3>{{ user.name }}</h3>
          <p>{{ user.email }}</p>
          <span class="department">{{ user.department }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data: users, loading, error } = useQuery(`
  SELECT id, name, email, department 
  FROM users 
  WHERE active = true
  ORDER BY name
`);
</script>

<style scoped>
.user-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.user-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
}

.error {
  color: #d32f2f;
}
</style>
```

### Reactive Parameters

```vue
<template>
  <div class="filtered-users">
    <div class="filters">
      <select v-model="department">
        <option value="">All Departments</option>
        <option value="Engineering">Engineering</option>
        <option value="Sales">Sales</option>
        <option value="Marketing">Marketing</option>
      </select>
      
      <input 
        v-model="searchTerm" 
        type="text" 
        placeholder="Search users..."
      />
      
      <label>
        <input v-model="activeOnly" type="checkbox" />
        Active users only
      </label>
    </div>

    <div v-if="loading" class="loading">Searching...</div>
    <div v-else-if="error" class="error">{{ error.message }}</div>
    <div v-else>
      <p>Found {{ users?.length || 0 }} users</p>
      <UserGrid :users="users" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';
import UserGrid from './UserGrid.vue';

const department = ref('');
const searchTerm = ref('');
const activeOnly = ref(true);

// Reactive query construction
const sql = computed(() => {
  let query = 'SELECT * FROM users WHERE 1=1';
  
  if (department.value) {
    query += ' AND department = ?';
  }
  
  if (searchTerm.value) {
    query += ' AND name ILIKE ?';
  }
  
  if (activeOnly.value) {
    query += ' AND active = true';
  }
  
  return query + ' ORDER BY name';
});

const params = computed(() => {
  const p = [];
  
  if (department.value) {
    p.push(department.value);
  }
  
  if (searchTerm.value) {
    p.push(`%${searchTerm.value}%`);
  }
  
  return p;
});

// Reactive query execution
const { data: users, loading, error } = useQuery(sql, params);
</script>
```

### Conditional Queries

```vue
<template>
  <div class="user-details">
    <UserSelector v-model="selectedUserId" />
    
    <div v-if="!selectedUserId" class="no-selection">
      Please select a user to view details
    </div>
    
    <div v-else-if="userLoading" class="loading">
      Loading user details...
    </div>
    
    <div v-else-if="userError" class="error">
      Error loading user: {{ userError.message }}
    </div>
    
    <div v-else-if="user" class="user-info">
      <h2>{{ user.name }}</h2>
      <p>Email: {{ user.email }}</p>
      <p>Department: {{ user.department }}</p>
      
      <!-- Orders section -->
      <div v-if="ordersLoading" class="loading">Loading orders...</div>
      <div v-else-if="orders && orders.length > 0">
        <h3>Recent Orders</h3>
        <OrdersList :orders="orders" />
      </div>
      <div v-else>No orders found</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const selectedUserId = ref(null);

// User details query - only runs when user is selected
const { 
  data: user, 
  loading: userLoading, 
  error: userError 
} = useQuery(
  'SELECT * FROM users WHERE id = ?',
  () => [selectedUserId.value],
  {
    enabled: computed(() => Boolean(selectedUserId.value))
  }
);

// User orders query - only runs when user is loaded
const { 
  data: orders, 
  loading: ordersLoading 
} = useQuery(
  'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
  () => [selectedUserId.value],
  {
    enabled: computed(() => Boolean(user.value))
  }
);
</script>
```

## Data Mutations

### Creating Records

```vue
<template>
  <form @submit.prevent="handleSubmit" class="create-user-form">
    <h2>Create New User</h2>
    
    <div class="form-group">
      <label for="name">Name:</label>
      <input 
        id="name"
        v-model="form.name" 
        type="text" 
        required 
      />
    </div>

    <div class="form-group">
      <label for="email">Email:</label>
      <input 
        id="email"
        v-model="form.email" 
        type="email" 
        required 
      />
    </div>

    <div class="form-group">
      <label for="department">Department:</label>
      <select id="department" v-model="form.department" required>
        <option value="">Select Department</option>
        <option value="Engineering">Engineering</option>
        <option value="Sales">Sales</option>
        <option value="Marketing">Marketing</option>
      </select>
    </div>

    <button type="submit" :disabled="loading">
      {{ loading ? 'Creating...' : 'Create User' }}
    </button>

    <div v-if="error" class="error">
      Error: {{ error.message }}
    </div>

    <div v-if="success" class="success">
      User created successfully!
    </div>
  </form>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useMutation } from '@northprint/duckdb-wasm-adapter-vue';

const emit = defineEmits(['userCreated']);

const form = reactive({
  name: '',
  email: '',
  department: ''
});

const success = ref(false);

const { mutate: createUser, loading, error } = useMutation({
  onSuccess: (result) => {
    console.log('User created:', result);
    
    // Reset form
    Object.assign(form, { name: '', email: '', department: '' });
    
    // Show success message
    success.value = true;
    setTimeout(() => { success.value = false; }, 3000);
    
    // Emit event to parent
    emit('userCreated', result[0]);
  },
  onError: (error) => {
    console.error('Failed to create user:', error);
  }
});

const handleSubmit = async () => {
  await createUser(
    'INSERT INTO users (name, email, department) VALUES (?, ?, ?) RETURNING *',
    [form.name, form.email, form.department]
  );
};
</script>
```

### Updating Records

```vue
<template>
  <form @submit.prevent="handleSubmit" class="edit-user-form">
    <h2>Edit User</h2>
    
    <div class="form-group">
      <label>Name:</label>
      <input v-model="form.name" type="text" required />
    </div>

    <div class="form-group">
      <label>Email:</label>
      <input v-model="form.email" type="email" required />
    </div>

    <div class="form-group">
      <label>Department:</label>
      <select v-model="form.department" required>
        <option value="Engineering">Engineering</option>
        <option value="Sales">Sales</option>
        <option value="Marketing">Marketing</option>
      </select>
    </div>

    <div class="form-actions">
      <button type="submit" :disabled="loading">
        {{ loading ? 'Updating...' : 'Update User' }}
      </button>
      <button type="button" @click="$emit('cancel')">
        Cancel
      </button>
    </div>
  </form>
</template>

<script setup>
import { reactive, watchEffect } from 'vue';
import { useMutation } from '@northprint/duckdb-wasm-adapter-vue';

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['updated', 'cancel']);

const form = reactive({
  name: '',
  email: '',
  department: ''
});

// Initialize form with user data
watchEffect(() => {
  if (props.user) {
    Object.assign(form, props.user);
  }
});

const { mutate: updateUser, loading } = useMutation({
  onSuccess: (result) => {
    emit('updated', result[0]);
  }
});

const handleSubmit = async () => {
  await updateUser(
    'UPDATE users SET name = ?, email = ?, department = ? WHERE id = ? RETURNING *',
    [form.name, form.email, form.department, props.user.id]
  );
};
</script>
```

### Bulk Operations

```vue
<template>
  <div class="bulk-operations">
    <div class="selection-info">
      {{ selectedUsers.length }} users selected
    </div>
    
    <div class="bulk-actions">
      <button 
        @click="bulkUpdateDepartment" 
        :disabled="selectedUsers.length === 0 || loading"
      >
        Change Department
      </button>
      
      <button 
        @click="bulkDeactivate" 
        :disabled="selectedUsers.length === 0 || loading"
        class="danger"
      >
        Deactivate Selected
      </button>
    </div>
    
    <div v-if="loading" class="loading">
      Processing {{ selectedUsers.length }} users...
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useBatch } from '@northprint/duckdb-wasm-adapter-vue';

const props = defineProps({
  selectedUsers: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['completed']);

const { executeBatch, loading } = useBatch();

const bulkUpdateDepartment = async () => {
  const newDepartment = prompt('Enter new department:');
  if (!newDepartment) return;
  
  const operations = props.selectedUsers.map(user => ({
    sql: 'UPDATE users SET department = ? WHERE id = ?',
    params: [newDepartment, user.id]
  }));
  
  try {
    await executeBatch(operations);
    emit('completed', 'Department updated for all selected users');
  } catch (error) {
    console.error('Bulk update failed:', error);
  }
};

const bulkDeactivate = async () => {
  if (!confirm(`Deactivate ${props.selectedUsers.length} users?`)) return;
  
  const operations = props.selectedUsers.map(user => ({
    sql: 'UPDATE users SET active = false WHERE id = ?',
    params: [user.id]
  }));
  
  try {
    await executeBatch(operations);
    emit('completed', 'Users deactivated successfully');
  } catch (error) {
    console.error('Bulk deactivation failed:', error);
  }
};
</script>
```

## Data Import/Export

### CSV Import

```vue
<template>
  <div class="csv-importer">
    <h3>Import Users from CSV</h3>
    
    <div class="upload-area">
      <input 
        ref="fileInput"
        type="file" 
        accept=".csv" 
        @change="handleFileSelect"
        :disabled="loading"
      />
      
      <div v-if="loading" class="progress">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
        <p>Importing... {{ progress }}%</p>
      </div>
      
      <div v-if="error" class="error">
        Import failed: {{ error.message }}
      </div>
      
      <div v-if="success" class="success">
        Successfully imported {{ importedCount }} records!
      </div>
    </div>
    
    <div class="import-options">
      <label>
        <input v-model="options.header" type="checkbox" />
        First row contains headers
      </label>
      
      <label>
        Delimiter:
        <select v-model="options.delimiter">
          <option value=",">Comma (,)</option>
          <option value=";">Semicolon (;)</option>
          <option value="\t">Tab</option>
        </select>
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useImportCSV } from '@northprint/duckdb-wasm-adapter-vue';

const emit = defineEmits(['imported']);

const fileInput = ref(null);
const success = ref(false);
const importedCount = ref(0);

const options = reactive({
  header: true,
  delimiter: ','
});

const { 
  importCSV, 
  loading, 
  error, 
  progress 
} = useImportCSV({
  onSuccess: (result) => {
    success.value = true;
    importedCount.value = result.rowCount;
    
    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = '';
    }
    
    // Hide success message after 3 seconds
    setTimeout(() => { success.value = false; }, 3000);
    
    emit('imported', result);
  },
  onProgress: (progressInfo) => {
    console.log('Import progress:', progressInfo);
  }
});

const handleFileSelect = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  await importCSV(file, 'imported_users', {
    header: options.header,
    delimiter: options.delimiter,
    nullString: 'NULL'
  });
};
</script>

<style scoped>
.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  margin: 1rem 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin: 1rem 0;
}

.progress-fill {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.import-options {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}
</style>
```

### Data Export

```vue
<template>
  <div class="data-exporter">
    <h3>Export Data</h3>
    
    <div class="export-options">
      <label>
        Export Format:
        <select v-model="exportFormat">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
      </label>
      
      <label>
        <input v-model="includeHeaders" type="checkbox" />
        Include headers (CSV only)
      </label>
    </div>
    
    <div class="export-actions">
      <button @click="exportAllUsers" :disabled="exporting">
        {{ exporting ? 'Exporting...' : 'Export All Users' }}
      </button>
      
      <button @click="exportFilteredUsers" :disabled="exporting">
        Export Filtered Users
      </button>
    </div>
    
    <div v-if="exportError" class="error">
      Export failed: {{ exportError.message }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useExportCSV, useExportJSON } from '@northprint/duckdb-wasm-adapter-vue';

const exportFormat = ref('csv');
const includeHeaders = ref(true);
const exporting = ref(false);
const exportError = ref(null);

const { exportCSV } = useExportCSV();
const { exportJSON } = useExportJSON();

const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportAllUsers = async () => {
  exporting.value = true;
  exportError.value = null;
  
  try {
    const query = 'SELECT * FROM users ORDER BY name';
    
    if (exportFormat.value === 'csv') {
      const csv = await exportCSV(query, {
        header: includeHeaders.value
      });
      downloadFile(csv, 'users.csv', 'text/csv');
    } else {
      const data = await exportJSON(query);
      downloadFile(
        JSON.stringify(data, null, 2), 
        'users.json', 
        'application/json'
      );
    }
  } catch (error) {
    exportError.value = error;
  } finally {
    exporting.value = false;
  }
};

const exportFilteredUsers = async () => {
  exporting.value = true;
  exportError.value = null;
  
  try {
    const query = 'SELECT * FROM users WHERE active = true ORDER BY name';
    
    if (exportFormat.value === 'csv') {
      const csv = await exportCSV(query, {
        header: includeHeaders.value
      });
      downloadFile(csv, 'active-users.csv', 'text/csv');
    } else {
      const data = await exportJSON(query);
      downloadFile(
        JSON.stringify(data, null, 2), 
        'active-users.json', 
        'application/json'
      );
    }
  } catch (error) {
    exportError.value = error;
  } finally {
    exporting.value = false;
  }
};
</script>
```

## Advanced Patterns

### Custom Composables

```javascript
// composables/useUsers.js
import { ref, computed } from 'vue';
import { useQuery, useMutation } from '@northprint/duckdb-wasm-adapter-vue';

export function useUsers(initialFilters = {}) {
  const filters = ref(initialFilters);
  
  // Build dynamic query
  const query = computed(() => {
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    
    if (filters.value.department) {
      sql += ' AND department = ?';
      params.push(filters.value.department);
    }
    
    if (filters.value.active !== undefined) {
      sql += ' AND active = ?';
      params.push(filters.value.active);
    }
    
    if (filters.value.search) {
      sql += ' AND name ILIKE ?';
      params.push(`%${filters.value.search}%`);
    }
    
    return { sql: sql + ' ORDER BY name', params };
  });
  
  // Data fetching
  const { 
    data: users, 
    loading, 
    error, 
    refresh 
  } = useQuery(
    () => query.value.sql,
    () => query.value.params
  );
  
  // Mutations
  const { mutate: createUser } = useMutation({
    onSuccess: () => refresh()
  });
  
  const { mutate: updateUser } = useMutation({
    onSuccess: () => refresh()
  });
  
  const { mutate: deleteUser } = useMutation({
    onSuccess: () => refresh()
  });
  
  // Computed properties
  const userCount = computed(() => users.value?.length || 0);
  const departmentStats = computed(() => {
    if (!users.value) return {};
    
    return users.value.reduce((stats, user) => {
      stats[user.department] = (stats[user.department] || 0) + 1;
      return stats;
    }, {});
  });
  
  // Methods
  const setFilters = (newFilters) => {
    filters.value = { ...filters.value, ...newFilters };
  };
  
  const clearFilters = () => {
    filters.value = {};
  };
  
  const addUser = (userData) => {
    return createUser(
      'INSERT INTO users (name, email, department) VALUES (?, ?, ?) RETURNING *',
      [userData.name, userData.email, userData.department]
    );
  };
  
  const editUser = (id, userData) => {
    return updateUser(
      'UPDATE users SET name = ?, email = ?, department = ? WHERE id = ? RETURNING *',
      [userData.name, userData.email, userData.department, id]
    );
  };
  
  const removeUser = (id) => {
    return deleteUser('DELETE FROM users WHERE id = ?', [id]);
  };
  
  return {
    // State
    users,
    loading,
    error,
    filters: readonly(filters),
    
    // Computed
    userCount,
    departmentStats,
    
    // Methods
    refresh,
    setFilters,
    clearFilters,
    addUser,
    editUser,
    removeUser
  };
}
```

### Global State Management

```javascript
// stores/database.js
import { ref, computed } from 'vue';
import { useDuckDB } from '@northprint/duckdb-wasm-adapter-vue';

// Global database state
const globalState = ref({
  isInitialized: false,
  currentUser: null,
  settings: {}
});

export function useDatabaseStore() {
  const { status, isConnected, connection } = useDuckDB();
  
  const isReady = computed(() => {
    return isConnected.value && globalState.value.isInitialized;
  });
  
  const initializeDatabase = async () => {
    if (!isConnected.value) {
      throw new Error('Database not connected');
    }
    
    try {
      // Create necessary tables
      await connection.value.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          name VARCHAR NOT NULL,
          email VARCHAR UNIQUE NOT NULL,
          department VARCHAR,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await connection.value.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          key VARCHAR PRIMARY KEY,
          value VARCHAR
        )
      `);
      
      globalState.value.isInitialized = true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  };
  
  const setCurrentUser = (user) => {
    globalState.value.currentUser = user;
  };
  
  const updateSettings = (newSettings) => {
    globalState.value.settings = { 
      ...globalState.value.settings, 
      ...newSettings 
    };
  };
  
  return {
    // State
    status,
    isConnected,
    isReady,
    currentUser: computed(() => globalState.value.currentUser),
    settings: computed(() => globalState.value.settings),
    
    // Actions
    initializeDatabase,
    setCurrentUser,
    updateSettings
  };
}
```

### Error Handling

```vue
<template>
  <div class="error-handler">
    <slot v-if="!hasError" />
    
    <div v-else class="error-boundary">
      <h3>Something went wrong</h3>
      <details>
        <summary>Error Details</summary>
        <pre>{{ errorDetails }}</pre>
      </details>
      <button @click="handleRetry">Try Again</button>
      <button @click="handleReset">Reset Application</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue';

const hasError = ref(false);
const errorDetails = ref('');

onErrorCaptured((error, instance, info) => {
  console.error('Vue Error Captured:', error, info);
  
  hasError.value = true;
  errorDetails.value = `${error.message}\n\nComponent: ${info}`;
  
  return false; // Prevent error propagation
});

const handleRetry = () => {
  hasError.value = false;
  errorDetails.value = '';
};

const handleReset = () => {
  window.location.reload();
};
</script>
```

## Performance Optimization

### Lazy Loading

```vue
<template>
  <div class="lazy-user-list">
    <div ref="listContainer" class="user-container">
      <UserCard 
        v-for="user in visibleUsers" 
        :key="user.id" 
        :user="user" 
      />
    </div>
    
    <div v-if="hasMore && !loading" class="load-more">
      <button @click="loadMore">Load More</button>
    </div>
    
    <div v-if="loading" class="loading">Loading...</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const PAGE_SIZE = 20;
const currentPage = ref(1);
const listContainer = ref(null);

// Load users with pagination
const { data: users, loading } = useQuery(
  'SELECT * FROM users ORDER BY name LIMIT ? OFFSET ?',
  () => [PAGE_SIZE * currentPage.value, 0]
);

const visibleUsers = computed(() => users.value || []);
const hasMore = computed(() => 
  users.value && users.value.length === PAGE_SIZE * currentPage.value
);

const loadMore = () => {
  currentPage.value++;
};

// Intersection Observer for infinite scroll
let observer;

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore.value && !loading.value) {
      loadMore();
    }
  });
  
  if (listContainer.value) {
    observer.observe(listContainer.value.lastElementChild);
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>
```

### Caching Strategy

```vue
<template>
  <div class="cached-analytics">
    <div class="cache-controls">
      <button @click="refreshData">Refresh Data</button>
      <button @click="clearCache">Clear Cache</button>
      
      <div class="cache-stats">
        <span>Hit Rate: {{ (cacheStats.hitRate * 100).toFixed(1) }}%</span>
        <span>Entries: {{ cacheStats.entries }}</span>
      </div>
    </div>
    
    <div class="analytics-grid">
      <AnalyticsCard 
        v-for="metric in metrics" 
        :key="metric.id"
        :metric="metric"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useQuery, useCache } from '@northprint/duckdb-wasm-adapter-vue';

const { clearCache, getCacheStats } = useCache();
const cacheStats = ref(getCacheStats());

// Cached analytics queries
const { data: metrics, refresh: refreshData } = useQuery(
  `SELECT 
    'total_users' as id,
    'Total Users' as label,
    COUNT(*) as value
   FROM users
   UNION ALL
   SELECT 
    'active_users' as id,
    'Active Users' as label,
    COUNT(*) as value
   FROM users WHERE active = true
   UNION ALL
   SELECT 
    'departments' as id,
    'Departments' as label,
    COUNT(DISTINCT department) as value
   FROM users`,
  undefined,
  {
    refetchInterval: 30000 // Refresh every 30 seconds
  }
);

// Update cache stats periodically
onMounted(() => {
  const interval = setInterval(() => {
    cacheStats.value = getCacheStats();
  }, 1000);
  
  onUnmounted(() => {
    clearInterval(interval);
  });
});
</script>
```

## Vue 3.4 Features

### Effect Scope Management

Vue 3.4's `effectScope` API for better reactivity management:

```vue
<script setup>
import { effectScope, ref, watch } from 'vue';
import { useQuery, useMutation } from '@northprint/duckdb-wasm-adapter-vue';

// Create a scope for dashboard queries
const dashboardScope = effectScope();

dashboardScope.run(() => {
  const { data: metrics } = useQuery('SELECT * FROM metrics');
  const { data: users } = useQuery('SELECT * FROM users WHERE active = true');
  
  // Watchers within the scope
  watch(metrics, (newMetrics) => {
    console.log('Metrics updated:', newMetrics);
  });
  
  watch(users, (newUsers) => {
    console.log('Active users updated:', newUsers);
  });
});

// Clean up all effects at once
onUnmounted(() => {
  dashboardScope.stop();
});
</script>
```

### Advanced Watchers with watchPostEffect

Using Vue 3.4's `watchPostEffect` and `watchSyncEffect`:

```vue
<script setup>
import { ref, watchPostEffect, watchSyncEffect } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const selectedTable = ref('users');
const tableElement = ref(null);

// Sync effect - runs immediately when data changes
watchSyncEffect(() => {
  console.log(`Switching to table: ${selectedTable.value}`);
});

const { data, refresh } = useQuery(
  () => `SELECT * FROM ${selectedTable.value} LIMIT 100`
);

// Post effect - runs after DOM updates
watchPostEffect(() => {
  if (data.value && tableElement.value) {
    // Access updated DOM after data changes
    const rows = tableElement.value.querySelectorAll('tr');
    console.log(`Rendered ${rows.length} rows`);
  }
});
</script>

<template>
  <div>
    <select v-model="selectedTable">
      <option value="users">Users</option>
      <option value="orders">Orders</option>
      <option value="products">Products</option>
    </select>
    
    <table ref="tableElement">
      <tr v-for="row in data" :key="row.id">
        <td v-for="(value, key) in row" :key="key">{{ value }}</td>
      </tr>
    </table>
  </div>
</template>
```

### defineModel for Two-way Binding

Vue 3.4's `defineModel` macro for cleaner component props:

```vue
<!-- FilterInput.vue -->
<script setup>
const modelValue = defineModel('value', { 
  type: String,
  default: ''
});

const activeFilter = defineModel('active', {
  type: Boolean,
  default: true
});
</script>

<template>
  <div class="filter-input">
    <input v-model="modelValue" placeholder="Search..." />
    <label>
      <input type="checkbox" v-model="activeFilter" />
      Active only
    </label>
  </div>
</template>

<!-- Parent Component -->
<script setup>
import { ref } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';
import FilterInput from './FilterInput.vue';

const searchTerm = ref('');
const activeOnly = ref(true);

const { data: users } = useQuery(
  () => `
    SELECT * FROM users 
    WHERE name ILIKE '%' || ? || '%'
    AND (? = false OR active = true)
  `,
  () => [searchTerm.value, activeOnly.value]
);
</script>

<template>
  <div>
    <FilterInput v-model:value="searchTerm" v-model:active="activeOnly" />
    <UserList :users="users" />
  </div>
</template>
```

### Computed Debugging with onTrack/onTrigger

Debug reactive dependencies in computed properties:

```vue
<script setup>
import { computed, ref } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const department = ref('Engineering');
const minSalary = ref(50000);

const { data: users } = useQuery('SELECT * FROM users');

const filteredUsers = computed(() => {
  return users.value?.filter(user => 
    user.department === department.value && 
    user.salary >= minSalary.value
  ) || [];
}, {
  onTrack(event) {
    console.log('Tracking:', event);
  },
  onTrigger(event) {
    console.log('Triggered by:', event);
  }
});
</script>
```

### Type-safe Props with TypeScript

Vue 3.4 improved TypeScript support:

```vue
<script setup lang="ts">
import { PropType } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

// Generic type support
interface QueryResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

// Type-safe props definition
const props = defineProps<{
  userId: number;
  includeOrders?: boolean;
}>();

// Type-safe emits
const emit = defineEmits<{
  update: [user: User];
  delete: [id: number];
}>();

interface User {
  id: number;
  name: string;
  email: string;
}

const { data: user } = useQuery<User>(
  `SELECT * FROM users WHERE id = ?`,
  [props.userId]
);

const handleUpdate = () => {
  if (user.value) {
    emit('update', user.value[0]);
  }
};
</script>
```

### Async Component with Suspense

Enhanced async component handling:

```vue
<!-- AsyncUserTable.vue -->
<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

// This component can be async
const { data: users } = await useQuery('SELECT * FROM users').promise;
</script>

<template>
  <table>
    <tr v-for="user in users" :key="user.id">
      <td>{{ user.name }}</td>
      <td>{{ user.email }}</td>
    </tr>
  </table>
</template>

<!-- Parent Component -->
<template>
  <Suspense>
    <template #default>
      <AsyncUserTable />
    </template>
    <template #fallback>
      <div class="skeleton-loader">Loading table...</div>
    </template>
  </Suspense>
</template>
```

### Teleport for Modals and Overlays

Using Vue 3's Teleport with DuckDB queries:

```vue
<script setup>
import { ref } from 'vue';
import { useQuery, useMutation } from '@northprint/duckdb-wasm-adapter-vue';

const showModal = ref(false);
const selectedUser = ref(null);
const { mutate: deleteUser } = useMutation();

const handleDelete = async () => {
  if (selectedUser.value) {
    await deleteUser(
      'DELETE FROM users WHERE id = ?',
      [selectedUser.value.id]
    );
    showModal.value = false;
  }
};
</script>

<template>
  <div>
    <button @click="showModal = true">Delete User</button>
    
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay">
        <div class="modal">
          <h2>Confirm Deletion</h2>
          <p>Are you sure you want to delete {{ selectedUser?.name }}?</p>
          <button @click="handleDelete">Delete</button>
          <button @click="showModal = false">Cancel</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
```

## Testing

### Component Testing

```javascript
// tests/components/UserList.test.js
import { mount } from '@vue/test-utils';
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';
import UserList from '@/components/UserList.vue';

const createWrapper = (options = {}) => {
  return mount(UserList, {
    global: {
      plugins: [
        [DuckDBPlugin, { 
          autoConnect: false,
          config: { worker: false }
        }]
      ]
    },
    ...options
  });
};

describe('UserList', () => {
  test('renders loading state initially', () => {
    const wrapper = createWrapper();
    expect(wrapper.text()).toContain('Loading...');
  });
  
  test('renders users when data is loaded', async () => {
    const wrapper = createWrapper();
    
    // Wait for query to complete
    await wrapper.vm.$nextTick();
    
    expect(wrapper.find('.user-list').exists()).toBe(true);
  });
});
```

### Composable Testing

```javascript
// tests/composables/useUsers.test.js
import { mount } from '@vue/test-utils';
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';
import { useUsers } from '@/composables/useUsers';

const TestComponent = {
  template: '<div></div>',
  setup() {
    return useUsers();
  }
};

const createWrapper = () => {
  return mount(TestComponent, {
    global: {
      plugins: [
        [DuckDBPlugin, { 
          autoConnect: false,
          config: { worker: false }
        }]
      ]
    }
  });
};

describe('useUsers', () => {
  test('returns users data', async () => {
    const wrapper = createWrapper();
    const composable = wrapper.vm;
    
    expect(composable.users).toBeDefined();
    expect(composable.loading).toBe(true);
    
    // Wait for data loading
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(composable.loading).toBe(false);
    expect(Array.isArray(composable.users)).toBe(true);
  });
});
```

## Best Practices

### 1. Use TypeScript

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

interface User {
  id: number;
  name: string;
  email: string;
  department: string;
  active: boolean;
}

const selectedDepartment = ref<string>('');

const { data: users, loading, error } = useQuery<User>(
  'SELECT * FROM users WHERE department = ? OR ? = ""',
  () => [selectedDepartment.value, selectedDepartment.value]
);

const userCount = computed((): number => users.value?.length || 0);
</script>
```

### 2. Handle Async State

```vue
<template>
  <div class="async-component">
    <Suspense>
      <template #default>
        <UserList />
      </template>
      <template #fallback>
        <div class="loading">Loading users...</div>
      </template>
    </Suspense>
  </div>
</template>
```

### 3. Error Boundaries

```vue
<template>
  <ErrorBoundary>
    <DashboardComponent />
  </ErrorBoundary>
</template>

<script setup>
import ErrorBoundary from '@/components/ErrorBoundary.vue';
import DashboardComponent from '@/components/Dashboard.vue';
</script>
```

### 4. Optimize Performance

```vue
<script setup>
import { shallowRef, watchEffect } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

// Use shallowRef for large datasets
const users = shallowRef([]);

const { data } = useQuery('SELECT * FROM users');

watchEffect(() => {
  if (data.value) {
    users.value = data.value;
  }
});
</script>
```

This guide provides comprehensive patterns for building Vue.js applications with DuckDB WASM Adapter. The reactive composables and plugin architecture make it easy to integrate powerful database functionality into your Vue applications.