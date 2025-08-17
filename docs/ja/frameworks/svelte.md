# Svelte統合ガイド

DuckDB WASMアダプターをSvelteアプリケーションで使用するための包括的なガイドです。

## セットアップ

### インストール

```bash
npm install @northprint/duckdb-wasm-adapter-svelte
```

### 基本設定

```javascript
// App.svelte
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
    }
  });
</script>
```

## 主要な機能

### クエリの実行

最も基本的な使い方 - リアクティブなクエリ実行：

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  
  // リアクティブクエリ
  $: users = db.query('SELECT * FROM users ORDER BY name');
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

<button on:click={() => users.refetch()}>更新</button>
```

### データの変更

INSERT、UPDATE、DELETE操作：

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  
  let formData = {
    name: '',
    email: '',
    age: null
  };
  
  let submitting = false;
  let error = null;
  let success = false;
  
  async function handleSubmit() {
    submitting = true;
    error = null;
    success = false;
    
    try {
      await db.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        [formData.name, formData.email, formData.age]
      );
      
      success = true;
      // フォームをリセット
      formData = { name: '', email: '', age: null };
      
      // データを再取得
      users.refetch();
      
      setTimeout(() => success = false, 3000);
    } catch (err) {
      error = err;
    } finally {
      submitting = false;
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <input bind:value={formData.name} placeholder="名前" required>
  <input bind:value={formData.email} type="email" placeholder="メール" required>
  <input bind:value={formData.age} type="number" placeholder="年齢" required>
  
  <button type="submit" disabled={submitting}>
    {submitting ? '送信中...' : '送信'}
  </button>
</form>

{#if error}
  <p class="error">{error.message}</p>
{/if}

{#if success}
  <p class="success">ユーザーを追加しました</p>
{/if}
```

## 実践的なコンポーネント

### データテーブルコンポーネント

```svelte
<!-- DataTable.svelte -->
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  export let tableName;
  export let columns;
  export let perPage = 10;
  
  const db = createDuckDB({ autoConnect: true });
  
  let sortColumn = '';
  let sortDirection = 'ASC';
  let page = 1;
  
  // 全件数を取得
  $: countQuery = db.query(`SELECT COUNT(*) as total FROM ${tableName}`);
  $: totalCount = $countQuery.data?.[0]?.total || 0;
  $: totalPages = Math.ceil(totalCount / perPage);
  
  // データクエリを構築
  $: dataQuery = (() => {
    let sql = `SELECT * FROM ${tableName}`;
    
    if (sortColumn) {
      sql += ` ORDER BY ${sortColumn} ${sortDirection}`;
    }
    
    sql += ` LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`;
    
    return sql;
  })();
  
  $: tableData = db.query(dataQuery);
  
  function handleSort(column) {
    if (!column.sortable) return;
    
    if (sortColumn === column.key) {
      sortDirection = sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      sortColumn = column.key;
      sortDirection = 'ASC';
    }
    page = 1; // ソート時はページをリセット
  }
  
  function nextPage() {
    if (page < totalPages) page++;
  }
  
  function prevPage() {
    if (page > 1) page--;
  }
</script>

<div class="data-table">
  <table>
    <thead>
      <tr>
        {#each columns as column}
          <th 
            on:click={() => handleSort(column)}
            class:sortable={column.sortable}
          >
            {column.label}
            {#if sortColumn === column.key}
              <span>{sortDirection === 'ASC' ? '▲' : '▼'}</span>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#if $tableData.loading}
        <tr>
          <td colspan={columns.length}>読み込み中...</td>
        </tr>
      {:else if $tableData.error}
        <tr>
          <td colspan={columns.length}>エラー: {$tableData.error.message}</td>
        </tr>
      {:else if $tableData.data}
        {#each $tableData.data as row}
          <tr>
            {#each columns as column}
              <td>{row[column.key]}</td>
            {/each}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
  
  <div class="pagination">
    <button on:click={prevPage} disabled={page === 1}>前へ</button>
    <span>ページ {page} / {totalPages}</span>
    <button on:click={nextPage} disabled={page >= totalPages}>次へ</button>
  </div>
</div>

<style>
  .sortable {
    cursor: pointer;
    user-select: none;
  }
  
  .sortable:hover {
    background-color: #f0f0f0;
  }
  
  .pagination {
    margin-top: 1rem;
    display: flex;
    gap: 1rem;
    align-items: center;
  }
</style>
```

### 検索フィルターコンポーネント

```svelte
<!-- SearchFilter.svelte -->
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  import { debounce } from 'lodash-es';
  
  const db = createDuckDB({ autoConnect: true });
  
  let searchTerm = '';
  let selectedCategory = '';
  let priceMin = null;
  let priceMax = null;
  
  // カテゴリ一覧を取得
  $: categories = db.query('SELECT * FROM categories ORDER BY name');
  
  // フィルター条件からクエリを構築
  function buildQuery() {
    const conditions = [];
    const params = [];
    
    if (searchTerm) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }
    
    if (selectedCategory) {
      conditions.push('category_id = ?');
      params.push(selectedCategory);
    }
    
    if (priceMin !== null) {
      conditions.push('price >= ?');
      params.push(priceMin);
    }
    
    if (priceMax !== null) {
      conditions.push('price <= ?');
      params.push(priceMax);
    }
    
    let query = 'SELECT * FROM products';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY name';
    
    return { query, params };
  }
  
  // デバウンス処理
  const debouncedBuildQuery = debounce(() => {
    const { query, params } = buildQuery();
    results = db.query(query, params);
  }, 300);
  
  // 初期クエリ
  let results = db.query('SELECT * FROM products LIMIT 10');
  
  // フィルター変更時に再クエリ
  $: searchTerm, selectedCategory, priceMin, priceMax, debouncedBuildQuery();
  
  function resetFilters() {
    searchTerm = '';
    selectedCategory = '';
    priceMin = null;
    priceMax = null;
  }
</script>

<div class="search-filter">
  <div class="filters">
    <input 
      bind:value={searchTerm}
      type="text"
      placeholder="検索..."
    >
    
    <select bind:value={selectedCategory}>
      <option value="">すべてのカテゴリ</option>
      {#if $categories.data}
        {#each $categories.data as cat}
          <option value={cat.id}>{cat.name}</option>
        {/each}
      {/if}
    </select>
    
    <div class="price-range">
      <input 
        bind:value={priceMin}
        type="number"
        placeholder="最小価格"
      >
      <span>〜</span>
      <input 
        bind:value={priceMax}
        type="number"
        placeholder="最大価格"
      >
    </div>
    
    <button on:click={resetFilters}>リセット</button>
  </div>
  
  <div class="results">
    {#if $results.loading}
      <p>検索中...</p>
    {:else if $results.error}
      <p>エラー: {$results.error.message}</p>
    {:else if $results.data}
      {#each $results.data as product}
        <div class="product">
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <span class="price">¥{product.price}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .price-range {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .product {
    border: 1px solid #ddd;
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 4px;
  }
  
  .price {
    font-weight: bold;
    color: #007bff;
  }
</style>
```

### ダッシュボードコンポーネント

```svelte
<!-- Dashboard.svelte -->
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  import StatCard from './StatCard.svelte';
  import SalesChart from './SalesChart.svelte';
  import CategoryChart from './CategoryChart.svelte';
  
  const db = createDuckDB({ autoConnect: true });
  
  // 統計データ
  $: stats = db.query(`
    SELECT 
      SUM(total) as total_sales,
      COUNT(*) as total_orders,
      COUNT(DISTINCT customer_id) as total_customers,
      AVG(total) as avg_order_value
    FROM orders
    WHERE DATE(created_at) >= DATE('now', '-30 days')
  `);
  
  // 売上推移
  $: salesData = db.query(`
    SELECT 
      DATE(created_at) as date,
      SUM(total) as sales
    FROM orders
    WHERE DATE(created_at) >= DATE('now', '-30 days')
    GROUP BY DATE(created_at)
    ORDER BY date
  `);
  
  // カテゴリ別売上
  $: categoryData = db.query(`
    SELECT 
      c.name as category,
      SUM(oi.quantity * oi.price) as total
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    GROUP BY c.id, c.name
    ORDER BY total DESC
    LIMIT 5
  `);
  
  // 最近の注文
  $: recentOrders = db.query(`
    SELECT 
      o.*,
      c.name as customer_name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    ORDER BY o.created_at DESC
    LIMIT 10
  `);
</script>

<div class="dashboard">
  <h1>ダッシュボード</h1>
  
  {#if $stats.data}
    <div class="stats-grid">
      <StatCard 
        title="総売上"
        value={`¥${$stats.data[0].total_sales.toLocaleString()}`}
        icon="💰"
      />
      <StatCard 
        title="注文数"
        value={$stats.data[0].total_orders}
        icon="📦"
      />
      <StatCard 
        title="顧客数"
        value={$stats.data[0].total_customers}
        icon="👥"
      />
      <StatCard 
        title="平均注文額"
        value={`¥${Math.round($stats.data[0].avg_order_value).toLocaleString()}`}
        icon="📊"
      />
    </div>
  {/if}
  
  <div class="charts-grid">
    {#if $salesData.data}
      <SalesChart data={$salesData.data} />
    {/if}
    
    {#if $categoryData.data}
      <CategoryChart data={$categoryData.data} />
    {/if}
  </div>
  
  {#if $recentOrders.data}
    <div class="recent-orders">
      <h2>最近の注文</h2>
      <table>
        <thead>
          <tr>
            <th>注文ID</th>
            <th>顧客</th>
            <th>金額</th>
            <th>日時</th>
          </tr>
        </thead>
        <tbody>
          {#each $recentOrders.data as order}
            <tr>
              <td>#{order.id}</td>
              <td>{order.customer_name}</td>
              <td>¥{order.total.toLocaleString()}</td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .dashboard {
    padding: 2rem;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .charts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-bottom: 2rem;
  }
  
  .recent-orders {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    padding: 0.5rem;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  
  @media (max-width: 768px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

## カスタムストア

### ページネーションストア

```javascript
// stores/pagination.js
import { writable, derived } from 'svelte/store';
import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';

export function createPaginationStore(tableName, options = {}) {
  const { perPage = 10, where = '', orderBy = '' } = options;
  
  const db = createDuckDB({ autoConnect: true });
  const page = writable(1);
  
  // 全件数を取得
  const countQuery = `SELECT COUNT(*) as total FROM ${tableName}${where ? ' WHERE ' + where : ''}`;
  const countStore = db.query(countQuery);
  
  const totalCount = derived(countStore, $count => 
    $count.data?.[0]?.total || 0
  );
  
  const totalPages = derived(totalCount, $total => 
    Math.ceil($total / perPage)
  );
  
  // データクエリ
  const dataQuery = derived(page, $page => {
    let sql = `SELECT * FROM ${tableName}`;
    if (where) sql += ` WHERE ${where}`;
    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    sql += ` LIMIT ${perPage} OFFSET ${($page - 1) * perPage}`;
    return sql;
  });
  
  const data = derived(dataQuery, $query => db.query($query));
  
  return {
    data: derived(data, $d => $d),
    page,
    totalPages,
    totalCount,
    nextPage: () => page.update(p => {
      const total = get(totalPages);
      return p < total ? p + 1 : p;
    }),
    prevPage: () => page.update(p => p > 1 ? p - 1 : 1),
    goToPage: (p) => page.set(Math.max(1, Math.min(p, get(totalPages))))
  };
}
```

### フィルターストア

```javascript
// stores/filter.js
import { writable, derived, get } from 'svelte/store';
import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';

export function createFilterStore(tableName) {
  const db = createDuckDB({ autoConnect: true });
  
  const filters = writable({});
  const sortBy = writable('');
  const sortDirection = writable('ASC');
  
  // クエリ構築
  const query = derived(
    [filters, sortBy, sortDirection],
    ([$filters, $sortBy, $sortDirection]) => {
      let sql = `SELECT * FROM ${tableName}`;
      
      // フィルター条件
      const conditions = Object.entries($filters)
        .filter(([_, value]) => value !== null && value !== '')
        .map(([key, value]) => {
          if (typeof value === 'string') {
            return `${key} LIKE '%${value}%'`;
          }
          return `${key} = ${value}`;
        });
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      // ソート
      if ($sortBy) {
        sql += ` ORDER BY ${$sortBy} ${$sortDirection}`;
      }
      
      return sql;
    }
  );
  
  // データ取得
  const data = derived(query, $query => db.query($query));
  
  return {
    data,
    filters,
    sortBy,
    sortDirection,
    setFilter: (key, value) => {
      filters.update(f => ({ ...f, [key]: value }));
    },
    clearFilters: () => filters.set({}),
    setSort: (column) => {
      const currentSort = get(sortBy);
      const currentDirection = get(sortDirection);
      
      if (currentSort === column) {
        sortDirection.set(currentDirection === 'ASC' ? 'DESC' : 'ASC');
      } else {
        sortBy.set(column);
        sortDirection.set('ASC');
      }
    }
  };
}
```

## SvelteKit統合

### 設定

```javascript
// app.d.ts
/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Locals {
      db: import('@northprint/duckdb-wasm-adapter-svelte').DuckDBInstance;
    }
  }
}

export {};
```

### レイアウト

```svelte
<!-- +layout.svelte -->
<script>
  import { browser } from '$app/environment';
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  import { setContext } from 'svelte';
  
  if (browser) {
    const db = createDuckDB({
      autoConnect: true,
      config: {
        worker: true
      }
    });
    
    setContext('db', db);
  }
</script>

<slot />
```

### ページコンポーネント

```svelte
<!-- +page.svelte -->
<script>
  import { getContext } from 'svelte';
  
  const db = getContext('db');
  
  // クライアントサイドでのみ実行
  $: if (db) {
    users = db.query('SELECT * FROM users');
  }
</script>

{#if db}
  {#if $users?.data}
    <ul>
      {#each $users.data as user}
        <li>{user.name}</li>
      {/each}
    </ul>
  {/if}
{:else}
  <p>クライアントサイドで読み込み中...</p>
{/if}
```

## トランザクション管理

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  const transaction = db.transaction();
  
  async function performBatchOperation() {
    try {
      await transaction.execute(async () => {
        // トランザクション内で複数の操作
        await db.execute('DELETE FROM temp_data');
        await db.execute('INSERT INTO temp_data SELECT * FROM production_data');
        await db.execute('UPDATE temp_data SET processed = true');
        
        // エラーが発生すると自動的にロールバック
        if (Math.random() > 0.5) {
          throw new Error('ランダムエラー');
        }
        
        await db.execute('INSERT INTO archive SELECT * FROM temp_data');
      });
      
      console.log('トランザクション成功');
    } catch (error) {
      console.error('トランザクション失敗:', error);
    }
  }
</script>

<button 
  on:click={performBatchOperation}
  disabled={$transaction.inTransaction}
>
  バッチ処理実行
</button>

{#if $transaction.inTransaction}
  <p>処理中...</p>
{/if}

{#if $transaction.error}
  <p class="error">エラー: {$transaction.error.message}</p>
{/if}
```

## パフォーマンス最適化

### リアクティブステートメントの最適化

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  
  let searchTerm = '';
  let category = '';
  
  // 不要な再実行を防ぐ
  $: query = (() => {
    if (!searchTerm && !category) {
      return 'SELECT * FROM products LIMIT 10';
    }
    
    const conditions = [];
    if (searchTerm) {
      conditions.push(`name LIKE '%${searchTerm}%'`);
    }
    if (category) {
      conditions.push(`category = '${category}'`);
    }
    
    return `SELECT * FROM products WHERE ${conditions.join(' AND ')}`;
  })();
  
  // クエリが変更された時のみ実行
  $: products = db.query(query);
</script>
```

### メモリ管理

```svelte
<script>
  import { onDestroy } from 'svelte';
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  
  // 大きなデータセットの処理
  let largeData = null;
  
  async function loadLargeData() {
    // バッチ処理
    const batchSize = 1000;
    let offset = 0;
    largeData = [];
    
    while (true) {
      const batch = await db.execute(
        `SELECT * FROM large_table LIMIT ${batchSize} OFFSET ${offset}`
      );
      
      const data = batch.toArray();
      if (data.length === 0) break;
      
      largeData = [...largeData, ...data];
      offset += batchSize;
    }
  }
  
  // クリーンアップ
  onDestroy(() => {
    largeData = null;
    db.disconnect();
  });
</script>
```

## エラーハンドリング

### グローバルエラーハンドラー

```javascript
// app.js
import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';

const db = createDuckDB({
  onError: (error) => {
    console.error('DuckDBエラー:', error);
    // 通知システムに送信
    showNotification({
      type: 'error',
      message: error.message
    });
  }
});
```

### コンポーネントレベルのエラー処理

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  
  let error = null;
  
  async function riskyOperation() {
    try {
      const result = await db.execute('RISKY SQL QUERY');
      // 成功処理
    } catch (err) {
      if (err.code === 'QUERY_FAILED') {
        error = 'クエリ実行エラー';
      } else if (err.code === 'CONNECTION_FAILED') {
        error = '接続エラー';
      } else {
        error = '予期しないエラー';
      }
    }
  }
</script>

{#if error}
  <div class="error-banner">
    {error}
    <button on:click={() => error = null}>×</button>
  </div>
{/if}
```

## テスト

### コンポーネントテスト

```javascript
// UserList.test.js
import { render, screen } from '@testing-library/svelte';
import { vi } from 'vitest';
import UserList from './UserList.svelte';

// モック設定
vi.mock('@northprint/duckdb-wasm-adapter-svelte', () => ({
  createDuckDB: () => ({
    query: () => ({
      subscribe: (callback) => {
        callback({
          data: [
            { id: 1, name: 'テストユーザー1' },
            { id: 2, name: 'テストユーザー2' }
          ],
          loading: false,
          error: null
        });
        return () => {};
      }
    })
  })
}));

describe('UserList', () => {
  it('ユーザーリストを表示する', () => {
    render(UserList);
    
    expect(screen.getByText('テストユーザー1')).toBeInTheDocument();
    expect(screen.getByText('テストユーザー2')).toBeInTheDocument();
  });
});
```

## ベストプラクティス

1. **リアクティブステートメントを活用** - $: で自動更新
2. **ストアの適切な使用** - 状態管理はストアで
3. **メモリリークを防ぐ** - onDestroyでクリーンアップ
4. **エラーハンドリング** - try-catchで適切に処理
5. **パフォーマンス** - 大きなデータは分割処理
6. **型安全性** - TypeScriptを活用

## トラブルシューティング

### Viteでの設定

```javascript
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';

export default {
  plugins: [sveltekit()],
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  },
  build: {
    target: 'esnext'
  }
};
```

### Web Workerの問題

```svelte
<script>
  import { browser } from '$app/environment';
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  // ブラウザ環境でのみ初期化
  if (browser) {
    const db = createDuckDB({
      config: {
        worker: false  // Web Workerが使えない場合
      }
    });
  }
</script>
```