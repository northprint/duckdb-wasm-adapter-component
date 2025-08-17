# Vue API リファレンス

DuckDB WASM Adapter Vueライブラリの完全なAPIリファレンスです。

## インストール

```bash
npm install @northprint/duckdb-wasm-adapter-vue
```

## 基本的な使い方

### プラグインとして使用

```javascript
// main.js
import { createApp } from 'vue';
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';
import App from './App.vue';

const app = createApp(App);

app.use(DuckDBPlugin, {
  autoConnect: true,
  config: {
    worker: true,
    logLevel: 'warning'
  }
});

app.mount('#app');
```

### コンポジション API で使用

```vue
<template>
  <div>
    <div v-if="loading">読み込み中...</div>
    <div v-else-if="error">エラー: {{ error.message }}</div>
    <ul v-else>
      <li v-for="user in data" :key="user.id">
        {{ user.name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading, error } = useQuery('SELECT * FROM users');
</script>
```

## プラグイン設定

### DuckDBPlugin

Vueアプリケーション全体でDuckDB接続を提供するプラグインです。

#### オプション

```typescript
interface DuckDBPluginOptions {
  // 自動的に接続するか
  autoConnect?: boolean;
  
  // 接続設定
  config?: {
    worker?: boolean;
    logLevel?: 'silent' | 'error' | 'warning' | 'info' | 'debug';
    query?: {
      castBigIntToDouble?: boolean;
      castDecimalToDouble?: boolean;
      castTimestampToDate?: boolean;
    };
    cache?: {
      enabled?: boolean;
      maxEntries?: number;
      ttl?: number;
    };
  };
  
  // イベントハンドラー
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onQuery?: (sql: string, duration: number) => void;
}
```

#### 例

```javascript
app.use(DuckDBPlugin, {
  autoConnect: true,
  config: {
    worker: true,
    logLevel: 'info',
    cache: {
      enabled: true,
      maxEntries: 100,
      ttl: 60000
    }
  },
  onConnect: () => console.log('DuckDB接続完了'),
  onError: (error) => console.error('DuckDBエラー:', error)
});
```

## コンポジション関数

### useDuckDB

DuckDB接続インスタンスにアクセスします。

```typescript
function useDuckDB(): {
  connection: Ref<Connection | null>;
  connected: Ref<boolean>;
  connecting: Ref<boolean>;
  error: Ref<Error | null>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}
```

#### 例

```vue
<template>
  <div>
    <p>接続状態: {{ connected ? '接続済み' : '未接続' }}</p>
    <button @click="toggleConnection">
      {{ connected ? '切断' : '接続' }}
    </button>
    <p v-if="error">エラー: {{ error.message }}</p>
  </div>
</template>

<script setup>
import { useDuckDB } from '@northprint/duckdb-wasm-adapter-vue';

const { connected, connecting, error, connect, disconnect } = useDuckDB();

const toggleConnection = async () => {
  if (connected.value) {
    await disconnect();
  } else {
    await connect();
  }
};
</script>
```

### useQuery

SQLクエリを実行し、リアクティブな結果を取得します。

```typescript
function useQuery<T = any>(
  query: string | Ref<string>,
  params?: any[] | Ref<any[]>,
  options?: UseQueryOptions
): {
  data: Ref<T[] | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refetch: () => Promise<void>;
}
```

#### パラメーター

- `query` - SQLクエリ文字列またはRef
- `params` - パラメーター配列またはRef
- `options` - クエリオプション

#### UseQueryOptions

```typescript
interface UseQueryOptions {
  // 自動的に実行するか
  enabled?: boolean | Ref<boolean>;
  
  // キャッシュ設定
  cacheTime?: number;
  staleTime?: number;
  
  // 再試行設定
  retry?: boolean | number;
  retryDelay?: number;
  
  // 即座に実行するか
  immediate?: boolean;
  
  // コールバック
  onSuccess?: (data: any[]) => void;
  onError?: (error: Error) => void;
}
```

#### 例

```vue
<template>
  <div>
    <input v-model="searchTerm" placeholder="検索...">
    <button @click="refetch">更新</button>
    
    <div v-if="loading">検索中...</div>
    <ul v-else-if="data">
      <li v-for="user in data" :key="user.id">
        {{ user.name }} ({{ user.age }}歳)
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const searchTerm = ref('');

const query = computed(() => 
  searchTerm.value 
    ? `SELECT * FROM users WHERE name LIKE '%${searchTerm.value}%'`
    : 'SELECT * FROM users'
);

const { data, loading, error, refetch } = useQuery(query, undefined, {
  cacheTime: 30000,
  onSuccess: (data) => console.log(`${data.length}件取得`)
});
</script>
```

### useMutation

データ変更操作を実行します。

```typescript
function useMutation<T = any>(
  options?: UseMutationOptions
): {
  mutate: (query: string, params?: any[]) => Promise<T>;
  mutateAsync: (query: string, params?: any[]) => Promise<T>;
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  reset: () => void;
}
```

#### UseMutationOptions

```typescript
interface UseMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}
```

#### 例

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="formData.name" placeholder="名前" required>
    <input v-model="formData.email" type="email" placeholder="メール" required>
    <input v-model.number="formData.age" type="number" placeholder="年齢" required>
    
    <button type="submit" :disabled="loading">
      {{ loading ? '送信中...' : '送信' }}
    </button>
    
    <p v-if="error" class="error">{{ error.message }}</p>
    <p v-if="success" class="success">ユーザーを追加しました</p>
  </form>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useMutation } from '@northprint/duckdb-wasm-adapter-vue';

const formData = reactive({
  name: '',
  email: '',
  age: null
});

const success = ref(false);

const { mutate, loading, error } = useMutation({
  onSuccess: () => {
    success.value = true;
    // フォームをリセット
    Object.assign(formData, { name: '', email: '', age: null });
    setTimeout(() => success.value = false, 3000);
  },
  onError: (err) => {
    console.error('エラー:', err);
  }
});

const handleSubmit = async () => {
  await mutate(
    'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
    [formData.name, formData.email, formData.age]
  );
};
</script>
```

### useImport

ファイルインポート機能を提供します。

```typescript
function useImport(): {
  importCSV: (file: File, tableName: string, options?: ImportCSVOptions) => Promise<void>;
  importJSON: (data: any[], tableName: string) => Promise<void>;
  importParquet: (file: File, tableName: string) => Promise<void>;
  importing: Ref<boolean>;
  error: Ref<Error | null>;
}
```

#### 例

```vue
<template>
  <div>
    <h3>CSVインポート</h3>
    <input 
      type="file" 
      accept=".csv"
      @change="handleCSVImport"
      :disabled="importing"
    >
    
    <h3>JSONインポート</h3>
    <button @click="handleJSONImport" :disabled="importing">
      サンプルデータをインポート
    </button>
    
    <p v-if="importing">インポート中...</p>
    <p v-if="error" class="error">{{ error.message }}</p>
    <p v-if="importSuccess" class="success">インポート完了</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useImport } from '@northprint/duckdb-wasm-adapter-vue';

const { importCSV, importJSON, importing, error } = useImport();
const importSuccess = ref(false);

const handleCSVImport = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    await importCSV(file, 'imported_data', {
      header: true,
      delimiter: ','
    });
    importSuccess.value = true;
    setTimeout(() => importSuccess.value = false, 3000);
  } catch (err) {
    console.error('インポートエラー:', err);
  }
};

const handleJSONImport = async () => {
  const sampleData = [
    { id: 1, name: '田中太郎', department: '営業部', salary: 400000 },
    { id: 2, name: '佐藤花子', department: '開発部', salary: 500000 },
    { id: 3, name: '鈴木一郎', department: '人事部', salary: 450000 }
  ];
  
  try {
    await importJSON(sampleData, 'employees');
    importSuccess.value = true;
    setTimeout(() => importSuccess.value = false, 3000);
  } catch (err) {
    console.error('インポートエラー:', err);
  }
};
</script>
```

### useExport

データエクスポート機能を提供します。

```typescript
function useExport(): {
  exportCSV: (query: string, options?: ExportCSVOptions) => Promise<string>;
  exportJSON: (query: string) => Promise<any[]>;
  exportParquet: (query: string) => Promise<Blob>;
  exporting: Ref<boolean>;
  error: Ref<Error | null>;
}
```

#### 例

```vue
<template>
  <div>
    <h3>データエクスポート</h3>
    <button @click="handleCSVExport" :disabled="exporting">
      CSVでダウンロード
    </button>
    <button @click="handleJSONExport" :disabled="exporting">
      JSONでダウンロード
    </button>
    
    <p v-if="exporting">エクスポート中...</p>
    <p v-if="error" class="error">{{ error.message }}</p>
  </div>
</template>

<script setup>
import { useExport } from '@northprint/duckdb-wasm-adapter-vue';

const { exportCSV, exportJSON, exporting, error } = useExport();

const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const handleCSVExport = async () => {
  try {
    const csv = await exportCSV('SELECT * FROM users', {
      header: true,
      delimiter: ','
    });
    downloadFile(csv, 'users.csv', 'text/csv');
  } catch (err) {
    console.error('エクスポートエラー:', err);
  }
};

const handleJSONExport = async () => {
  try {
    const json = await exportJSON('SELECT * FROM users');
    downloadFile(JSON.stringify(json, null, 2), 'users.json', 'application/json');
  } catch (err) {
    console.error('エクスポートエラー:', err);
  }
};
</script>
```

### useTransaction

トランザクション管理を提供します。

```typescript
function useTransaction(): {
  begin: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  inTransaction: Ref<boolean>;
  execute: (callback: () => Promise<void>) => Promise<void>;
}
```

#### 例

```vue
<template>
  <div>
    <h3>バッチ処理</h3>
    <button @click="handleBatchOperation" :disabled="inTransaction">
      バッチ処理を実行
    </button>
    
    <p v-if="inTransaction">処理中...</p>
    <p v-if="batchSuccess" class="success">バッチ処理完了</p>
    <p v-if="batchError" class="error">{{ batchError }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useTransaction, useMutation } from '@northprint/duckdb-wasm-adapter-vue';

const { execute, inTransaction } = useTransaction();
const { mutate } = useMutation();

const batchSuccess = ref(false);
const batchError = ref('');

const handleBatchOperation = async () => {
  batchError.value = '';
  batchSuccess.value = false;
  
  try {
    await execute(async () => {
      // トランザクション内で複数の操作を実行
      await mutate('DELETE FROM temp_data');
      await mutate('INSERT INTO temp_data SELECT * FROM production_data');
      await mutate('UPDATE temp_data SET processed = true');
      await mutate('INSERT INTO archive SELECT * FROM temp_data WHERE processed = true');
    });
    
    batchSuccess.value = true;
    setTimeout(() => batchSuccess.value = false, 3000);
  } catch (err) {
    batchError.value = err.message;
  }
};
</script>
```

### useQueryBuilder

クエリビルダーを使用してプログラマティックにクエリを構築します。

```typescript
function useQueryBuilder<T = any>(): {
  builder: Ref<QueryBuilder>;
  execute: () => Promise<void>;
  data: Ref<T[] | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  reset: () => void;
}
```

#### 例

```vue
<template>
  <div>
    <h3>動的クエリ</h3>
    
    <div class="filters">
      <select v-model="filters.column">
        <option value="name">名前</option>
        <option value="email">メール</option>
        <option value="age">年齢</option>
      </select>
      
      <select v-model="filters.operator">
        <option value="=">=</option>
        <option value="LIKE">含む</option>
        <option value=">">></option>
        <option value="<"><</option>
      </select>
      
      <input v-model="filters.value" placeholder="値">
      
      <button @click="applyFilter">フィルター追加</button>
      <button @click="clearFilters">クリア</button>
      <button @click="executeQuery" :disabled="loading">実行</button>
    </div>
    
    <div v-if="loading">クエリ実行中...</div>
    <table v-else-if="data && data.length > 0">
      <thead>
        <tr>
          <th>ID</th>
          <th>名前</th>
          <th>メール</th>
          <th>年齢</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in data" :key="row.id">
          <td>{{ row.id }}</td>
          <td>{{ row.name }}</td>
          <td>{{ row.email }}</td>
          <td>{{ row.age }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="data">結果なし</p>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { useQueryBuilder } from '@northprint/duckdb-wasm-adapter-vue';

const { builder, execute, data, loading, error, reset } = useQueryBuilder();

const filters = reactive({
  column: 'name',
  operator: '=',
  value: ''
});

const applyFilter = () => {
  if (!filters.value) return;
  
  builder.value
    .select('*')
    .from('users')
    .where(filters.column, filters.operator, filters.value);
};

const clearFilters = () => {
  reset();
  builder.value.select('*').from('users');
};

const executeQuery = async () => {
  await execute();
};

// 初期クエリを設定
builder.value.select('*').from('users').limit(10);
</script>
```

## ディレクティブ

### v-duckdb-query

要素にクエリ結果をバインドするディレクティブです。

```vue
<template>
  <div v-duckdb-query="'SELECT COUNT(*) as count FROM users'">
    <!-- 結果が自動的にバインドされる -->
  </div>
</template>

<script setup>
import { vDuckdbQuery } from '@northprint/duckdb-wasm-adapter-vue';
</script>
```

## 高度な使用方法

### カスタムコンポジション関数

```javascript
// useUserStats.js
import { computed } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

export function useUserStats() {
  const { data: totalUsers } = useQuery(
    'SELECT COUNT(*) as count FROM users'
  );
  
  const { data: activeUsers } = useQuery(
    'SELECT COUNT(*) as count FROM users WHERE status = ?',
    ['active']
  );
  
  const { data: avgAge } = useQuery(
    'SELECT AVG(age) as average FROM users'
  );
  
  const stats = computed(() => ({
    total: totalUsers.value?.[0]?.count || 0,
    active: activeUsers.value?.[0]?.count || 0,
    avgAge: avgAge.value?.[0]?.average || 0
  }));
  
  return { stats };
}
```

### グローバルエラーハンドリング

```javascript
// main.js
app.use(DuckDBPlugin, {
  onError: (error) => {
    // グローバルエラーハンドラー
    if (error.code === 'CONNECTION_FAILED') {
      alert('データベース接続に失敗しました');
    } else {
      console.error('DuckDBエラー:', error);
    }
  }
});
```

### TypeScript対応

```typescript
// types.ts
export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// UserList.vue
<script setup lang="ts">
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';
import type { User } from './types';

const { data, loading, error } = useQuery<User>(
  'SELECT * FROM users'
);

// dataは Ref<User[] | null> として型付けされる
</script>
```

## トラブルシューティング

### よくある問題と解決方法

1. **プラグインが見つからない**
   ```javascript
   // main.jsで必ずプラグインを登録
   app.use(DuckDBPlugin);
   ```

2. **リアクティビティが動作しない**
   ```vue
   <script setup>
   // refまたはreactiveを使用
   import { ref } from 'vue';
   const query = ref('SELECT * FROM users');
   const { data } = useQuery(query); // queryの変更を検知
   </script>
   ```

3. **メモリリーク**
   ```javascript
   // コンポーネントのアンマウント時にクリーンアップ
   import { onUnmounted } from 'vue';
   
   onUnmounted(() => {
     // 必要に応じて接続を切断
   });
   ```