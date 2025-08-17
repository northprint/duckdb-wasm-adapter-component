# はじめに

DuckDB WASM アダプターを使い始めるためのガイドです。このライブラリを使用すると、ブラウザ内で高速なSQLクエリを実行できます。

## DuckDB WASMアダプターとは？

DuckDB WASMアダプターは、[DuckDB](https://duckdb.org/)のWebAssembly版をモダンなWebフレームワーク（React、Vue、Svelte）で簡単に使用できるようにするライブラリです。

### 主な特徴

- **ブラウザ内でSQLを実行** - サーバーなしでデータ処理
- **高速** - カラムナ型ストレージで分析クエリが高速
- **フレームワーク対応** - React、Vue、Svelteで使いやすい
- **型安全** - TypeScriptで完全な型サポート
- **ゼロ設定** - すぐに使い始められる

## インストール

使用するフレームワークに応じてパッケージを選択してください：

::: code-group

```bash [React]
npm install @northprint/duckdb-wasm-adapter-react
```

```bash [Vue]
npm install @northprint/duckdb-wasm-adapter-vue
```

```bash [Svelte]
npm install @northprint/duckdb-wasm-adapter-svelte
```

```bash [Core (Vanilla JS)]
npm install @northprint/duckdb-wasm-adapter-core
```

:::

## 基本的な使い方

### React

```jsx
import { DuckDBProvider, useQuery } from '@northprint/duckdb-wasm-adapter-react';

function App() {
  return (
    <DuckDBProvider autoConnect>
      <Dashboard />
    </DuckDBProvider>
  );
}

function Dashboard() {
  const { data, loading, error } = useQuery(
    'SELECT COUNT(*) as count FROM sales'
  );

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;

  return <div>売上件数: {data[0].count}</div>;
}
```

### Vue

```vue
<template>
  <div>
    <div v-if="loading">読み込み中...</div>
    <div v-else-if="error">エラー: {{ error.message }}</div>
    <div v-else>売上件数: {{ data[0].count }}</div>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading, error } = useQuery(
  'SELECT COUNT(*) as count FROM sales'
);
</script>
```

### Svelte

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  $: result = db.query('SELECT COUNT(*) as count FROM sales');
</script>

{#if $result.loading}
  <div>読み込み中...</div>
{:else if $result.error}
  <div>エラー: {$result.error.message}</div>
{:else}
  <div>売上件数: {$result.data[0].count}</div>
{/if}
```

## データのインポート

### CSVファイルの読み込み

```javascript
// ファイル入力から
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

await connection.importCSV(file, 'sales_data', {
  header: true,
  delimiter: ','
});

// その後クエリを実行
const result = await connection.execute('SELECT * FROM sales_data');
```

### JSONデータの読み込み

```javascript
const data = [
  { id: 1, name: '商品A', price: 1000 },
  { id: 2, name: '商品B', price: 2000 },
  { id: 3, name: '商品C', price: 3000 }
];

await connection.importJSON(data, 'products');
```

## クエリの実行

### 基本的なクエリ

```javascript
// シンプルなSELECT
const result = await connection.execute('SELECT * FROM users');

// WHERE句を使用
const activeUsers = await connection.execute(
  'SELECT * FROM users WHERE status = ?',
  ['active']
);

// 集計
const stats = await connection.execute(`
  SELECT 
    department,
    COUNT(*) as employee_count,
    AVG(salary) as avg_salary
  FROM employees
  GROUP BY department
`);
```

### パラメーターバインディング

SQLインジェクションを防ぐため、常にパラメーターバインディングを使用してください：

```javascript
// 良い例 ✅
const result = await connection.execute(
  'SELECT * FROM users WHERE age > ? AND city = ?',
  [18, '東京']
);

// 悪い例 ❌（SQLインジェクションの危険）
const result = await connection.execute(
  `SELECT * FROM users WHERE age > ${age} AND city = '${city}'`
);
```

## データのエクスポート

### CSV形式でエクスポート

```javascript
const csv = await connection.exportCSV('SELECT * FROM sales');
// CSVをダウンロード
downloadFile(csv, 'sales_data.csv', 'text/csv');
```

### JSON形式でエクスポート

```javascript
const json = await connection.exportJSON('SELECT * FROM sales');
// JSONをダウンロード
downloadFile(JSON.stringify(json), 'sales_data.json', 'application/json');
```

## エラー処理

適切なエラー処理を実装しましょう：

```javascript
try {
  const result = await connection.execute('SELECT * FROM non_existent_table');
} catch (error) {
  if (error.code === 'TABLE_NOT_FOUND') {
    console.error('テーブルが存在しません');
  } else if (error.code === 'SYNTAX_ERROR') {
    console.error('SQLシンタックスエラー');
  } else {
    console.error('予期しないエラー:', error);
  }
}
```

## パフォーマンスのヒント

### 1. インデックスを使用する

```sql
CREATE INDEX idx_user_email ON users(email);
```

### 2. 必要なカラムのみ選択

```sql
-- 良い例 ✅
SELECT id, name, email FROM users;

-- 悪い例 ❌
SELECT * FROM users;
```

### 3. LIMITを使用する

```sql
SELECT * FROM logs ORDER BY created_at DESC LIMIT 100;
```

### 4. キャッシングを活用

```javascript
const { data } = useQuery('SELECT * FROM static_data', {
  cacheTime: 60 * 60 * 1000, // 1時間キャッシュ
});
```

## 次のステップ

- [基本的な使い方](/ja/guide/basic-usage) - より詳細な使用方法
- [クエリビルダー](/ja/guide/query-builder) - プログラマティックなクエリ構築
- [キャッシング](/ja/guide/caching) - パフォーマンスの最適化
- [APIリファレンス](/ja/api/core) - 完全なAPIドキュメント

## よくある質問

### Q: どのくらいのデータを処理できますか？

A: ブラウザのメモリ制限（通常1-4GB）内であれば、数百万行のデータも処理可能です。

### Q: サーバーは必要ですか？

A: いいえ、すべてブラウザ内で実行されます。ただし、WASMファイルをホスティングするWebサーバーは必要です。

### Q: どのブラウザをサポートしていますか？

A: Chrome 90+、Firefox 89+、Safari 15+、Edge 90+をサポートしています。

### Q: Node.jsで使えますか？

A: 現在はブラウザ環境のみをサポートしています。Node.js対応は今後追加予定です。