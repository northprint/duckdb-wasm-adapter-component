# Svelte API リファレンス

DuckDB WASM Adapter Svelteライブラリの完全なAPIリファレンスです。

## インストール

```bash
npm install @northprint/duckdb-wasm-adapter-svelte
```

## 基本的な使い方

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  $: users = db.query('SELECT * FROM users');
</script>

{#if $users.loading}
  <p>読み込み中...</p>
{:else if $users.error}
  <p>エラー: {$users.error.message}</p>
{:else if $users.data}
  <ul>
    {#each $users.data as user}
      <li>{user.name} ({user.age}歳)</li>
    {/each}
  </ul>
{/if}
```

## メイン関数

### createDuckDB

DuckDBインスタンスを作成します。

```typescript
function createDuckDB(options?: DuckDBOptions): DuckDBInstance
```

#### DuckDBOptions

```typescript
interface DuckDBOptions {
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

#### DuckDBInstance

```typescript
interface DuckDBInstance {
  // 接続管理
  connection: Readable<Connection | null>;
  connected: Readable<boolean>;
  connecting: Readable<boolean>;
  error: Readable<Error | null>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  
  // クエリ実行
  query: <T = any>(sql: string, params?: any[], options?: QueryOptions) => QueryStore<T>;
  execute: (sql: string, params?: any[]) => Promise<ResultSet>;
  
  // データ操作
  importCSV: (file: File, tableName: string, options?: ImportCSVOptions) => Promise<void>;
  importJSON: (data: any[], tableName: string) => Promise<void>;
  importParquet: (file: File, tableName: string) => Promise<void>;
  exportCSV: (query: string, options?: ExportCSVOptions) => Promise<string>;
  exportJSON: (query: string) => Promise<any[]>;
  
  // トランザクション
  transaction: () => TransactionStore;
  
  // クエリビルダー
  builder: () => QueryBuilderStore;
}
```

#### 例

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({
    autoConnect: true,
    config: {
      worker: true,
      logLevel: 'warning',
      cache: {
        enabled: true,
        ttl: 60000
      }
    },
    onConnect: () => console.log('接続完了'),
    onError: (error) => console.error('エラー:', error)
  });
</script>
```

## ストア

### QueryStore

クエリ結果を管理するSvelteストアです。

```typescript
interface QueryStore<T> extends Readable<QueryState<T>> {
  refetch: () => Promise<void>;
  setData: (data: T[]) => void;
  reset: () => void;
}

interface QueryState<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}
```

#### 例

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  
  // リアクティブクエリ
  let searchTerm = '';
  $: users = db.query(
    searchTerm 
      ? `SELECT * FROM users WHERE name LIKE ?`
      : 'SELECT * FROM users',
    searchTerm ? [`%${searchTerm}%`] : undefined
  );
  
  // 手動リフレッシュ
  function refresh() {
    users.refetch();
  }
</script>

<input bind:value={searchTerm} placeholder="検索...">
<button on:click={refresh}>更新</button>

{#if $users.loading}
  <p>検索中...</p>
{:else if $users.data}
  <ul>
    {#each $users.data as user}
      <li>{user.name}</li>
    {/each}
  </ul>
{/if}
```

### TransactionStore

トランザクションを管理するストアです。

```typescript
interface TransactionStore extends Readable<TransactionState> {
  begin: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  execute: (callback: () => Promise<void>) => Promise<void>;
}

interface TransactionState {
  inTransaction: boolean;
  error: Error | null;
}
```

#### 例

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  const transaction = db.transaction();
  
  async function performTransaction() {
    await transaction.execute(async () => {
      // トランザクション内で複数の操作を実行
      await db.execute('INSERT INTO users (name) VALUES (?)', ['ユーザー1']);
      await db.execute('INSERT INTO users (name) VALUES (?)', ['ユーザー2']);
      await db.execute('UPDATE settings SET value = ? WHERE key = ?', ['updated', 'last_update']);
    });
  }
</script>

<button 
  on:click={performTransaction} 
  disabled={$transaction.inTransaction}
>
  トランザクション実行
</button>

{#if $transaction.inTransaction}
  <p>処理中...</p>
{/if}

{#if $transaction.error}
  <p class="error">エラー: {$transaction.error.message}</p>
{/if}
```

### QueryBuilderStore

クエリビルダーを管理するストアです。

```typescript
interface QueryBuilderStore extends Readable<QueryBuilderState> {
  select: (...columns: string[]) => QueryBuilderStore;
  from: (table: string) => QueryBuilderStore;
  where: (column: string, operator: string, value: any) => QueryBuilderStore;
  join: (table: string, on: string) => QueryBuilderStore;
  groupBy: (...columns: string[]) => QueryBuilderStore;
  orderBy: (column: string, direction?: 'ASC' | 'DESC') => QueryBuilderStore;
  limit: (count: number) => QueryBuilderStore;
  offset: (count: number) => QueryBuilderStore;
  build: () => string;
  execute: () => Promise<void>;
  reset: () => void;
}

interface QueryBuilderState {
  query: string;
  data: any[] | null;
  loading: boolean;
  error: Error | null;
}
```

#### 例

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  const builder = db.builder();
  
  let filters = {
    minAge: 20,
    city: '東京'
  };
  
  $: {
    builder
      .select('id', 'name', 'email', 'age')
      .from('users')
      .where('age', '>=', filters.minAge)
      .where('city', '=', filters.city)
      .orderBy('name', 'ASC')
      .limit(10);
  }
  
  async function search() {
    await builder.execute();
  }
</script>

<div>
  <label>
    最小年齢:
    <input type="number" bind:value={filters.minAge}>
  </label>
  <label>
    都市:
    <input bind:value={filters.city}>
  </label>
  <button on:click={search}>検索</button>
</div>

<div>
  <p>生成されたクエリ: {$builder.query}</p>
</div>

{#if $builder.loading}
  <p>検索中...</p>
{:else if $builder.data}
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>名前</th>
        <th>メール</th>
        <th>年齢</th>
      </tr>
    </thead>
    <tbody>
      {#each $builder.data as user}
        <tr>
          <td>{user.id}</td>
          <td>{user.name}</td>
          <td>{user.email}</td>
          <td>{user.age}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
```

## データインポート/エクスポート

### インポート機能

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  
  let importing = false;
  let importError = null;
  
  async function handleCSVImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    importing = true;
    importError = null;
    
    try {
      await db.importCSV(file, 'imported_data', {
        header: true,
        delimiter: ','
      });
      console.log('インポート成功');
    } catch (error) {
      importError = error;
    } finally {
      importing = false;
    }
  }
  
  async function handleJSONImport() {
    const data = [
      { id: 1, name: '商品A', price: 1000 },
      { id: 2, name: '商品B', price: 2000 },
      { id: 3, name: '商品C', price: 3000 }
    ];
    
    importing = true;
    importError = null;
    
    try {
      await db.importJSON(data, 'products');
      console.log('JSONインポート成功');
    } catch (error) {
      importError = error;
    } finally {
      importing = false;
    }
  }
</script>

<div>
  <h3>CSVインポート</h3>
  <input 
    type="file" 
    accept=".csv"
    on:change={handleCSVImport}
    disabled={importing}
  >
  
  <h3>JSONインポート</h3>
  <button on:click={handleJSONImport} disabled={importing}>
    サンプルデータをインポート
  </button>
  
  {#if importing}
    <p>インポート中...</p>
  {/if}
  
  {#if importError}
    <p class="error">エラー: {importError.message}</p>
  {/if}
</div>
```

### エクスポート機能

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  
  async function exportToCSV() {
    try {
      const csv = await db.exportCSV('SELECT * FROM users', {
        header: true,
        delimiter: ','
      });
      
      // ダウンロード
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('エクスポートエラー:', error);
    }
  }
  
  async function exportToJSON() {
    try {
      const json = await db.exportJSON('SELECT * FROM users');
      
      // ダウンロード
      const blob = new Blob([JSON.stringify(json, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('エクスポートエラー:', error);
    }
  }
</script>

<div>
  <button on:click={exportToCSV}>CSVでエクスポート</button>
  <button on:click={exportToJSON}>JSONでエクスポート</button>
</div>
```

## カスタムストア

独自のストアを作成してロジックをカプセル化：

```javascript
// stores/userStore.js
import { derived, writable } from 'svelte/store';
import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';

const db = createDuckDB({ autoConnect: true });

export function createUserStore() {
  const searchTerm = writable('');
  const sortColumn = writable('name');
  const sortDirection = writable('ASC');
  
  const users = derived(
    [searchTerm, sortColumn, sortDirection],
    ([$searchTerm, $sortColumn, $sortDirection]) => {
      let query = 'SELECT * FROM users';
      const params = [];
      
      if ($searchTerm) {
        query += ' WHERE name LIKE ?';
        params.push(`%${$searchTerm}%`);
      }
      
      query += ` ORDER BY ${$sortColumn} ${$sortDirection}`;
      
      return db.query(query, params);
    }
  );
  
  const stats = derived(users, ($users) => {
    if (!$users.data) return null;
    
    return {
      total: $users.data.length,
      avgAge: $users.data.reduce((sum, u) => sum + u.age, 0) / $users.data.length
    };
  });
  
  return {
    searchTerm,
    sortColumn,
    sortDirection,
    users,
    stats,
    refresh: () => users.refetch()
  };
}
```

使用例：

```svelte
<script>
  import { createUserStore } from './stores/userStore.js';
  
  const store = createUserStore();
  const { searchTerm, sortColumn, sortDirection, users, stats } = store;
</script>

<div>
  <input bind:value={$searchTerm} placeholder="検索...">
  
  <select bind:value={$sortColumn}>
    <option value="name">名前</option>
    <option value="age">年齢</option>
    <option value="email">メール</option>
  </select>
  
  <select bind:value={$sortDirection}>
    <option value="ASC">昇順</option>
    <option value="DESC">降順</option>
  </select>
  
  <button on:click={store.refresh}>更新</button>
</div>

{#if $users.loading}
  <p>読み込み中...</p>
{:else if $users.data}
  <div>
    {#if $stats}
      <p>総数: {$stats.total}人、平均年齢: {$stats.avgAge.toFixed(1)}歳</p>
    {/if}
    
    <table>
      {#each $users.data as user}
        <tr>
          <td>{user.name}</td>
          <td>{user.age}</td>
          <td>{user.email}</td>
        </tr>
      {/each}
    </table>
  </div>
{/if}
```

## リアクティブパターン

### 依存クエリ

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  
  let selectedDepartment = null;
  
  // 部門リスト
  $: departments = db.query('SELECT * FROM departments');
  
  // 選択された部門の従業員
  $: employees = selectedDepartment 
    ? db.query(
        'SELECT * FROM employees WHERE department_id = ?',
        [selectedDepartment]
      )
    : null;
</script>

<select bind:value={selectedDepartment}>
  <option value={null}>部門を選択</option>
  {#if $departments.data}
    {#each $departments.data as dept}
      <option value={dept.id}>{dept.name}</option>
    {/each}
  {/if}
</select>

{#if employees && $employees.data}
  <ul>
    {#each $employees.data as employee}
      <li>{employee.name}</li>
    {/each}
  </ul>
{/if}
```

### デバウンス検索

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  import { writable, derived } from 'svelte/store';
  
  const db = createDuckDB({ autoConnect: true });
  
  let searchInput = '';
  const searchTerm = writable('');
  
  // デバウンス関数
  let timeout;
  function debounce(value) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      searchTerm.set(value);
    }, 300);
  }
  
  $: debounce(searchInput);
  
  // デバウンスされた検索
  $: results = derived(searchTerm, ($term) => 
    $term 
      ? db.query('SELECT * FROM products WHERE name LIKE ?', [`%${$term}%`])
      : db.query('SELECT * FROM products LIMIT 10')
  );
</script>

<input bind:value={searchInput} placeholder="商品を検索...">

{#if $$results.loading}
  <p>検索中...</p>
{:else if $$results.data}
  <ul>
    {#each $$results.data as product}
      <li>{product.name} - ¥{product.price}</li>
    {/each}
  </ul>
{/if}
```

## TypeScript対応

```typescript
// types.ts
export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// UserList.svelte
<script lang="ts">
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  import type { User } from './types';
  
  const db = createDuckDB({ autoConnect: true });
  
  // 型付きクエリ
  const users = db.query<User>('SELECT * FROM users');
  
  // $users.dataは User[] | null として型付けされる
</script>
```

## エラーハンドリング

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  import { onMount } from 'svelte';
  
  const db = createDuckDB({
    autoConnect: false,
    onError: (error) => {
      // グローバルエラーハンドラー
      console.error('DuckDBエラー:', error);
      errorMessage = error.message;
    }
  });
  
  let errorMessage = '';
  
  onMount(async () => {
    try {
      await db.connect();
    } catch (error) {
      errorMessage = `接続失敗: ${error.message}`;
    }
  });
  
  async function riskyOperation() {
    try {
      const result = await db.execute('RISKY SQL QUERY');
      // 成功処理
    } catch (error) {
      if (error.code === 'QUERY_FAILED') {
        errorMessage = 'クエリ実行エラー';
      } else {
        errorMessage = '予期しないエラー';
      }
    }
  }
</script>

{#if errorMessage}
  <div class="error">
    {errorMessage}
    <button on:click={() => errorMessage = ''}>閉じる</button>
  </div>
{/if}
```

## パフォーマンス最適化

### メモ化とキャッシング

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  import { derived } from 'svelte/store';
  
  const db = createDuckDB({ 
    autoConnect: true,
    config: {
      cache: {
        enabled: true,
        maxEntries: 100,
        ttl: 60000 // 1分
      }
    }
  });
  
  // キャッシュされたクエリ
  const cachedData = db.query('SELECT * FROM static_data', undefined, {
    cacheTime: 300000 // 5分
  });
  
  // 派生ストアでメモ化
  const processedData = derived(cachedData, ($data) => {
    if (!$data.data) return null;
    
    // 重い処理をメモ化
    return $data.data.map(item => ({
      ...item,
      computed: expensiveComputation(item)
    }));
  });
</script>
```

## トラブルシューティング

### よくある問題

1. **ストアが更新されない**
   ```svelte
   <script>
     // リアクティブステートメントを使用
     $: query = db.query(sql); // sqlの変更を検知
   </script>
   ```

2. **メモリリーク**
   ```svelte
   <script>
     import { onDestroy } from 'svelte';
     
     const db = createDuckDB({ autoConnect: true });
     
     onDestroy(() => {
       db.disconnect();
     });
   </script>
   ```

3. **並行クエリの問題**
   ```svelte
   <script>
     // Promise.allで並行実行
     async function loadAllData() {
       const [users, products, orders] = await Promise.all([
         db.execute('SELECT * FROM users'),
         db.execute('SELECT * FROM products'),
         db.execute('SELECT * FROM orders')
       ]);
     }
   </script>
   ```