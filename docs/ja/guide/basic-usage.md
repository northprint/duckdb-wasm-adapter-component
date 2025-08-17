# 基本的な使い方

DuckDB WASM アダプターの基本的な使い方を学びます。

## 接続の作成

最初のステップは、DuckDBへの接続を作成することです。

### React

```jsx
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';

function App() {
  return (
    <DuckDBProvider 
      autoConnect={true}
      config={{
        worker: true,
        logLevel: 'warning'
      }}
    >
      <YourApp />
    </DuckDBProvider>
  );
}
```

### Vue

```javascript
// main.js
import { createApp } from 'vue';
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';

const app = createApp(App);
app.use(DuckDBPlugin, {
  autoConnect: true,
  config: {
    worker: true
  }
});
```

### Svelte

```javascript
import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';

const db = createDuckDB({
  autoConnect: true,
  config: {
    worker: true
  }
});
```

### Vanilla JavaScript

```javascript
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

const connection = await createConnection({
  worker: true,
  logLevel: 'warning'
});
```

## テーブルの作成

SQLのCREATE TABLE文を使用してテーブルを作成します：

```javascript
await connection.execute(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE,
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);
```

### データ型

DuckDBは以下のデータ型をサポートしています：

| 型 | 説明 | 例 |
|---|------|-----|
| `BOOLEAN` | 真偽値 | `true`, `false` |
| `INTEGER` | 32ビット整数 | `42` |
| `BIGINT` | 64ビット整数 | `9223372036854775807` |
| `DOUBLE` | 倍精度浮動小数点 | `3.14159` |
| `DECIMAL(p,s)` | 固定小数点 | `DECIMAL(10,2)` |
| `VARCHAR` | 可変長文字列 | `'Hello'` |
| `DATE` | 日付 | `'2024-01-01'` |
| `TIMESTAMP` | タイムスタンプ | `'2024-01-01 12:00:00'` |

## データの挿入

### 単一行の挿入

```javascript
await connection.execute(
  'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
  ['田中太郎', 'tanaka@example.com', 30]
);
```

### 複数行の挿入

```javascript
const users = [
  ['佐藤花子', 'sato@example.com', 25],
  ['鈴木一郎', 'suzuki@example.com', 35],
  ['高橋美咲', 'takahashi@example.com', 28]
];

for (const user of users) {
  await connection.execute(
    'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
    user
  );
}
```

### バルクインサート（CSV）

```javascript
const csvData = `name,email,age
田中太郎,tanaka@example.com,30
佐藤花子,sato@example.com,25
鈴木一郎,suzuki@example.com,35`;

const blob = new Blob([csvData], { type: 'text/csv' });
const file = new File([blob], 'users.csv');

await connection.importCSV(file, 'users', {
  header: true,
  delimiter: ','
});
```

## データの取得

### すべての行を取得

```javascript
const result = await connection.execute('SELECT * FROM users');
const users = result.toArray();

users.forEach(user => {
  console.log(`${user.name} (${user.age}歳)`);
});
```

### 条件付き検索

```javascript
// WHERE句
const adults = await connection.execute(
  'SELECT * FROM users WHERE age >= ?',
  [20]
);

// 複数条件
const result = await connection.execute(
  'SELECT * FROM users WHERE age >= ? AND email LIKE ?',
  [20, '%@example.com']
);

// ソート
const sorted = await connection.execute(
  'SELECT * FROM users ORDER BY age DESC'
);

// 件数制限
const top10 = await connection.execute(
  'SELECT * FROM users LIMIT 10'
);
```

### 集計関数

```javascript
// カウント
const count = await connection.execute(
  'SELECT COUNT(*) as total FROM users'
);
console.log(`ユーザー数: ${count.toArray()[0].total}`);

// 平均
const avgAge = await connection.execute(
  'SELECT AVG(age) as average_age FROM users'
);

// グループ化
const byAge = await connection.execute(`
  SELECT 
    CASE 
      WHEN age < 20 THEN '20歳未満'
      WHEN age < 30 THEN '20代'
      WHEN age < 40 THEN '30代'
      ELSE '40歳以上'
    END as age_group,
    COUNT(*) as count
  FROM users
  GROUP BY age_group
`);
```

## データの更新

### 単一行の更新

```javascript
await connection.execute(
  'UPDATE users SET age = ? WHERE id = ?',
  [31, 1]
);
```

### 複数行の更新

```javascript
// 条件に一致するすべての行を更新
await connection.execute(
  'UPDATE users SET status = ? WHERE age >= ?',
  ['adult', 20]
);
```

## データの削除

### 単一行の削除

```javascript
await connection.execute(
  'DELETE FROM users WHERE id = ?',
  [1]
);
```

### 条件付き削除

```javascript
await connection.execute(
  'DELETE FROM users WHERE created_at < ?',
  ['2023-01-01']
);
```

### すべての行を削除

```javascript
// テーブル構造は残す
await connection.execute('DELETE FROM users');

// より高速（テーブル構造も削除）
await connection.execute('DROP TABLE users');
```

## JOINの使用

### 内部結合（INNER JOIN）

```javascript
await connection.execute(`
  CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    product VARCHAR,
    amount DECIMAL(10,2)
  )
`);

const result = await connection.execute(`
  SELECT 
    u.name,
    o.product,
    o.amount
  FROM users u
  INNER JOIN orders o ON u.id = o.user_id
`);
```

### 左外部結合（LEFT JOIN）

```javascript
const result = await connection.execute(`
  SELECT 
    u.name,
    COUNT(o.id) as order_count
  FROM users u
  LEFT JOIN orders o ON u.id = o.user_id
  GROUP BY u.id, u.name
`);
```

## トランザクション

複数の操作をアトミックに実行：

```javascript
try {
  await connection.execute('BEGIN TRANSACTION');
  
  // ユーザーを作成
  await connection.execute(
    'INSERT INTO users (name, email) VALUES (?, ?)',
    ['新規ユーザー', 'new@example.com']
  );
  
  // 注文を作成
  await connection.execute(
    'INSERT INTO orders (user_id, product, amount) VALUES (?, ?, ?)',
    [1, '商品A', 1000]
  );
  
  await connection.execute('COMMIT');
  console.log('トランザクション成功');
} catch (error) {
  await connection.execute('ROLLBACK');
  console.error('トランザクション失敗:', error);
}
```

## フレームワーク別の使用例

### React - useQueryフック

```jsx
function UserList() {
  const { data, loading, error, refetch } = useQuery(
    'SELECT * FROM users ORDER BY name'
  );

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;

  return (
    <div>
      <button onClick={refetch}>更新</button>
      <ul>
        {data?.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Vue - useQuery コンポジション

```vue
<template>
  <div>
    <button @click="refetch">更新</button>
    <ul>
      <li v-for="user in data" :key="user.id">
        {{ user.name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading, error, refetch } = useQuery(
  'SELECT * FROM users ORDER BY name'
);
</script>
```

### Svelte - リアクティブクエリ

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  $: users = db.query('SELECT * FROM users ORDER BY name');
  
  function refresh() {
    users.refresh();
  }
</script>

<button on:click={refresh}>更新</button>
<ul>
  {#each $users.data as user}
    <li>{user.name}</li>
  {/each}
</ul>
```

## エラー処理

適切なエラー処理でアプリケーションの安定性を向上：

```javascript
import { DuckDBError, ErrorCode } from '@northprint/duckdb-wasm-adapter-core';

async function safeQuery(sql, params) {
  try {
    const result = await connection.execute(sql, params);
    return { success: true, data: result.toArray() };
  } catch (error) {
    if (error instanceof DuckDBError) {
      switch (error.code) {
        case ErrorCode.QUERY_FAILED:
          console.error('クエリエラー:', error.message);
          return { success: false, error: 'クエリの実行に失敗しました' };
        
        case ErrorCode.NOT_CONNECTED:
          console.error('接続エラー');
          return { success: false, error: 'データベースに接続されていません' };
        
        default:
          console.error('不明なエラー:', error);
          return { success: false, error: '予期しないエラーが発生しました' };
      }
    }
    throw error;
  }
}
```

## パフォーマンスの最適化

### インデックスの作成

```javascript
// インデックスを作成して検索を高速化
await connection.execute('CREATE INDEX idx_users_email ON users(email)');
await connection.execute('CREATE INDEX idx_users_age ON users(age)');
```

### EXPLAIN文の使用

```javascript
// クエリプランを確認
const plan = await connection.execute(
  'EXPLAIN SELECT * FROM users WHERE email = ?',
  ['test@example.com']
);
console.log(plan.toArray());
```

### 適切なデータ型の選択

```javascript
// 効率的なテーブル設計
await connection.execute(`
  CREATE TABLE optimized_users (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100),        -- 最大長を指定
    age TINYINT,             -- 小さい整数にはTINYINT
    is_active BOOLEAN,        -- フラグにはBOOLEAN
    created_at TIMESTAMP      -- 日時にはTIMESTAMP
  )
`);
```

## 次のステップ

- [クエリビルダー](/ja/guide/query-builder) - プログラマティックなクエリ構築
- [データのインポート/エクスポート](/ja/guide/data-import-export) - ファイルの入出力
- [キャッシング](/ja/guide/caching) - パフォーマンスの向上
- [APIリファレンス](/ja/api/core) - 詳細なAPI仕様