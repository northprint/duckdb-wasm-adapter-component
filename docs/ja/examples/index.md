# サンプルコード

DuckDB WASMアダプターの実践的なサンプルコード集です。

## 基本的なクエリ

### シンプルなSELECT

```javascript
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

const connection = await createConnection();

// テーブル作成
await connection.execute(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name VARCHAR,
    age INTEGER
  )
`);

// データ挿入
await connection.execute(
  'INSERT INTO users (id, name, age) VALUES (?, ?, ?)',
  [1, '田中太郎', 30]
);

// データ取得
const result = await connection.execute('SELECT * FROM users');
console.log(result.toArray());
```

## React サンプル

### 基本的なコンポーネント

```jsx
import { DuckDBProvider, useQuery } from '@northprint/duckdb-wasm-adapter-react';

function App() {
  return (
    <DuckDBProvider autoConnect>
      <UserList />
    </DuckDBProvider>
  );
}

function UserList() {
  const { data, loading, error } = useQuery('SELECT * FROM users');
  
  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;
  
  return (
    <ul>
      {data?.map(user => (
        <li key={user.id}>{user.name} ({user.age}歳)</li>
      ))}
    </ul>
  );
}
```

### データ入力フォーム

```jsx
import { useMutation } from '@northprint/duckdb-wasm-adapter-react';

function AddUserForm() {
  const { mutate, loading } = useMutation();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    await mutate(
      'INSERT INTO users (name, age) VALUES (?, ?)',
      [formData.get('name'), Number(formData.get('age'))]
    );
    
    e.target.reset();
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="名前" required />
      <input name="age" type="number" placeholder="年齢" required />
      <button type="submit" disabled={loading}>
        {loading ? '追加中...' : '追加'}
      </button>
    </form>
  );
}
```

## Vue サンプル

### 基本的なコンポーネント

```vue
<template>
  <div>
    <h2>ユーザーリスト</h2>
    <div v-if="loading">読み込み中...</div>
    <ul v-else-if="data">
      <li v-for="user in data" :key="user.id">
        {{ user.name }} ({{ user.age }}歳)
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading, error } = useQuery('SELECT * FROM users');
</script>
```

### リアクティブ検索

```vue
<template>
  <div>
    <input v-model="searchTerm" placeholder="検索...">
    
    <ul v-if="data">
      <li v-for="user in data" :key="user.id">
        {{ user.name }}
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

const { data } = useQuery(query);
</script>
```

## Svelte サンプル

### 基本的なコンポーネント

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  $: users = db.query('SELECT * FROM users');
</script>

<h2>ユーザーリスト</h2>

{#if $users.loading}
  <p>読み込み中...</p>
{:else if $users.data}
  <ul>
    {#each $users.data as user}
      <li>{user.name} ({user.age}歳)</li>
    {/each}
  </ul>
{/if}
```

### インタラクティブなフィルター

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  
  let minAge = 0;
  let maxAge = 100;
  
  $: query = `
    SELECT * FROM users 
    WHERE age >= ${minAge} AND age <= ${maxAge}
    ORDER BY age
  `;
  
  $: users = db.query(query);
</script>

<div>
  <label>
    最小年齢: <input type="number" bind:value={minAge} min="0" max="100">
  </label>
  <label>
    最大年齢: <input type="number" bind:value={maxAge} min="0" max="100">
  </label>
</div>

{#if $users.data}
  <ul>
    {#each $users.data as user}
      <li>{user.name} ({user.age}歳)</li>
    {/each}
  </ul>
{/if}
```

## データインポート/エクスポート

### CSVインポート

```javascript
// CSVファイルのインポート
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

await connection.importCSV(file, 'sales_data', {
  header: true,
  delimiter: ','
});

// インポートしたデータを確認
const result = await connection.execute('SELECT COUNT(*) FROM sales_data');
console.log('インポートした行数:', result.toArray()[0].count);
```

### JSONエクスポート

```javascript
// データをJSON形式でエクスポート
const data = await connection.exportJSON('SELECT * FROM users');

// ファイルとしてダウンロード
const blob = new Blob([JSON.stringify(data, null, 2)], { 
  type: 'application/json' 
});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'users.json';
a.click();
```

## クエリビルダー

### 動的なクエリ構築

```javascript
import { QueryBuilder } from '@northprint/duckdb-wasm-adapter-core';

const builder = new QueryBuilder();

// 条件を動的に追加
builder
  .select('id', 'name', 'age')
  .from('users');

if (filters.name) {
  builder.where('name', 'LIKE', `%${filters.name}%`);
}

if (filters.minAge) {
  builder.where('age', '>=', filters.minAge);
}

builder.orderBy('name', 'ASC').limit(10);

// クエリを実行
const sql = builder.build();
const result = await connection.execute(sql);
```

## パフォーマンス最適化

### バッチ処理

```javascript
// トランザクションでバッチ処理
await connection.execute('BEGIN TRANSACTION');

try {
  const users = [
    { name: '田中', age: 30 },
    { name: '佐藤', age: 25 },
    { name: '鈴木', age: 35 }
  ];
  
  for (const user of users) {
    await connection.execute(
      'INSERT INTO users (name, age) VALUES (?, ?)',
      [user.name, user.age]
    );
  }
  
  await connection.execute('COMMIT');
  console.log('バッチ処理完了');
} catch (error) {
  await connection.execute('ROLLBACK');
  console.error('エラー:', error);
}
```

### キャッシング

```javascript
// キャッシュ付きクエリ
const result = await connection.execute(
  'SELECT * FROM large_table',
  undefined,
  {
    cache: true,
    cacheKey: 'large-table-all',
    cacheTTL: 60000 // 1分間キャッシュ
  }
);

// 2回目は高速
const cachedResult = await connection.execute(
  'SELECT * FROM large_table',
  undefined,
  {
    cache: true,
    cacheKey: 'large-table-all'
  }
);
```

## エラーハンドリング

```javascript
import { DuckDBError, ErrorCode } from '@northprint/duckdb-wasm-adapter-core';

try {
  const result = await connection.execute('SELECT * FROM non_existent_table');
} catch (error) {
  if (error instanceof DuckDBError) {
    switch (error.code) {
      case ErrorCode.TABLE_NOT_FOUND:
        console.error('テーブルが見つかりません');
        break;
      case ErrorCode.QUERY_FAILED:
        console.error('クエリ実行エラー:', error.message);
        break;
      default:
        console.error('不明なエラー:', error);
    }
  }
}
```

## 次のステップ

- [APIリファレンス](/ja/api/core) - 詳細なAPI仕様
- [フレームワークガイド](/ja/frameworks/react) - フレームワーク別の詳細ガイド
- [GitHub](https://github.com/northprint/duckdb-wasm-adapter-component) - ソースコードとより多くのサンプル