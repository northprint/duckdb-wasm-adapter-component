# クエリビルダー

プログラマティックにSQLクエリを構築するための強力なツールです。

## 概要

クエリビルダーを使用すると、文字列連結を使わずに安全で動的なSQLクエリを構築できます。

### 主な利点

- **型安全** - TypeScriptの型チェックでエラーを防止
- **SQLインジェクション防止** - 自動的なパラメーターバインディング
- **可読性** - チェーンメソッドで直感的なクエリ構築
- **再利用性** - クエリの部分的な再利用が可能

## 基本的な使い方

### クエリビルダーの作成

```javascript
import { QueryBuilder } from '@northprint/duckdb-wasm-adapter-core';

const builder = new QueryBuilder();
```

### SELECT文

```javascript
// シンプルなSELECT
builder
  .select('id', 'name', 'email')
  .from('users');

// すべてのカラムを選択
builder
  .select('*')
  .from('users');

// エイリアス付き
builder
  .select('u.id', 'u.name', 'COUNT(o.id) as order_count')
  .from('users u')
  .leftJoin('orders o', 'u.id = o.user_id')
  .groupBy('u.id', 'u.name');
```

### WHERE句

```javascript
// 単一条件
builder
  .select('*')
  .from('users')
  .where('age', '>', 18);

// 複数条件（AND）
builder
  .select('*')
  .from('users')
  .where('age', '>', 18)
  .where('city', '=', '東京');

// OR条件
builder
  .select('*')
  .from('users')
  .where('age', '>', 18)
  .orWhere('vip', '=', true);

// IN句
builder
  .select('*')
  .from('users')
  .whereIn('status', ['active', 'pending']);

// NULL チェック
builder
  .select('*')
  .from('users')
  .whereNull('deleted_at');

// BETWEEN
builder
  .select('*')
  .from('users')
  .whereBetween('age', 20, 30);
```

### JOIN

```javascript
// INNER JOIN
builder
  .select('u.*', 'p.name as profile_name')
  .from('users u')
  .join('profiles p', 'u.id = p.user_id');

// LEFT JOIN
builder
  .select('u.*', 'COUNT(o.id) as order_count')
  .from('users u')
  .leftJoin('orders o', 'u.id = o.user_id')
  .groupBy('u.id');

// 複数のJOIN
builder
  .select('u.name', 'o.total', 'p.method')
  .from('users u')
  .join('orders o', 'u.id = o.user_id')
  .join('payments p', 'o.id = p.order_id')
  .where('o.status', '=', 'completed');
```

### 集計とグループ化

```javascript
// GROUP BY
builder
  .select('department', 'COUNT(*) as count', 'AVG(salary) as avg_salary')
  .from('employees')
  .groupBy('department');

// HAVING
builder
  .select('department', 'COUNT(*) as count')
  .from('employees')
  .groupBy('department')
  .having('COUNT(*)', '>', 5);

// 複数の集計関数
builder
  .select(
    'category',
    'COUNT(*) as total',
    'SUM(price) as total_price',
    'AVG(price) as avg_price',
    'MIN(price) as min_price',
    'MAX(price) as max_price'
  )
  .from('products')
  .groupBy('category');
```

### ソートと制限

```javascript
// ORDER BY
builder
  .select('*')
  .from('users')
  .orderBy('created_at', 'DESC');

// 複数のソート条件
builder
  .select('*')
  .from('users')
  .orderBy('department', 'ASC')
  .orderBy('salary', 'DESC');

// LIMIT と OFFSET
builder
  .select('*')
  .from('users')
  .limit(10)
  .offset(20);
```

## 高度な使用方法

### サブクエリ

```javascript
// WHERE句のサブクエリ
const subquery = new QueryBuilder()
  .select('user_id')
  .from('orders')
  .where('total', '>', 10000);

builder
  .select('*')
  .from('users')
  .whereIn('id', subquery);

// FROM句のサブクエリ
const salesSubquery = new QueryBuilder()
  .select('user_id', 'SUM(total) as total_sales')
  .from('orders')
  .groupBy('user_id');

builder
  .select('u.name', 's.total_sales')
  .from('users u')
  .join(`(${salesSubquery.build()}) s`, 'u.id = s.user_id');
```

### UNION

```javascript
const activeUsers = new QueryBuilder()
  .select('id', 'name')
  .from('users')
  .where('status', '=', 'active');

const vipUsers = new QueryBuilder()
  .select('id', 'name')
  .from('users')
  .where('vip', '=', true);

const combined = activeUsers.union(vipUsers);
```

### CTE (Common Table Expressions)

```javascript
builder
  .with('active_users', (qb) => {
    qb.select('*')
      .from('users')
      .where('status', '=', 'active');
  })
  .with('recent_orders', (qb) => {
    qb.select('*')
      .from('orders')
      .where('created_at', '>', '2024-01-01');
  })
  .select('au.name', 'COUNT(ro.id) as order_count')
  .from('active_users au')
  .leftJoin('recent_orders ro', 'au.id = ro.user_id')
  .groupBy('au.id', 'au.name');
```

### 条件付きクエリ構築

```javascript
function buildUserQuery(filters) {
  const builder = new QueryBuilder()
    .select('*')
    .from('users');
  
  // 条件付きでWHERE句を追加
  if (filters.name) {
    builder.where('name', 'LIKE', `%${filters.name}%`);
  }
  
  if (filters.minAge) {
    builder.where('age', '>=', filters.minAge);
  }
  
  if (filters.maxAge) {
    builder.where('age', '<=', filters.maxAge);
  }
  
  if (filters.cities && filters.cities.length > 0) {
    builder.whereIn('city', filters.cities);
  }
  
  if (filters.excludeDeleted) {
    builder.whereNull('deleted_at');
  }
  
  // ソート
  if (filters.sortBy) {
    builder.orderBy(filters.sortBy, filters.sortOrder || 'ASC');
  }
  
  // ページネーション
  if (filters.page && filters.perPage) {
    builder
      .limit(filters.perPage)
      .offset((filters.page - 1) * filters.perPage);
  }
  
  return builder;
}

// 使用例
const query = buildUserQuery({
  name: '田中',
  minAge: 20,
  cities: ['東京', '大阪'],
  excludeDeleted: true,
  sortBy: 'created_at',
  sortOrder: 'DESC',
  page: 2,
  perPage: 20
});
```

## INSERT文

```javascript
// 単一行の挿入
builder
  .insert('users')
  .values({
    name: '田中太郎',
    email: 'tanaka@example.com',
    age: 30
  });

// 複数行の挿入
builder
  .insert('users')
  .values([
    { name: '田中太郎', email: 'tanaka@example.com', age: 30 },
    { name: '佐藤花子', email: 'sato@example.com', age: 25 },
    { name: '鈴木一郎', email: 'suzuki@example.com', age: 35 }
  ]);

// SELECT結果の挿入
builder
  .insert('archived_users')
  .columns('id', 'name', 'email')
  .select((qb) => {
    qb.select('id', 'name', 'email')
      .from('users')
      .where('deleted_at', 'IS NOT', null);
  });
```

## UPDATE文

```javascript
// 基本的なUPDATE
builder
  .update('users')
  .set({
    status: 'inactive',
    updated_at: new Date()
  })
  .where('last_login', '<', '2023-01-01');

// 条件付きUPDATE
builder
  .update('products')
  .set('price', builder.raw('price * 1.1'))
  .where('category', '=', 'electronics');

// JOINを使用したUPDATE
builder
  .update('users u')
  .set('u.vip', true)
  .from('orders o')
  .where('o.user_id', '=', builder.raw('u.id'))
  .where('o.total', '>', 100000);
```

## DELETE文

```javascript
// 基本的なDELETE
builder
  .delete()
  .from('users')
  .where('status', '=', 'deleted');

// 複数条件のDELETE
builder
  .delete()
  .from('logs')
  .where('created_at', '<', '2023-01-01')
  .where('level', '=', 'debug');

// サブクエリを使用したDELETE
const inactiveUsers = new QueryBuilder()
  .select('id')
  .from('users')
  .where('last_login', '<', '2022-01-01');

builder
  .delete()
  .from('user_sessions')
  .whereIn('user_id', inactiveUsers);
```

## フレームワーク統合

### React

```jsx
import { useQueryBuilder } from '@northprint/duckdb-wasm-adapter-react';

function UserSearch() {
  const { builder, execute, data, loading } = useQueryBuilder();
  const [filters, setFilters] = useState({});
  
  const handleSearch = async () => {
    builder
      .select('*')
      .from('users');
    
    if (filters.name) {
      builder.where('name', 'LIKE', `%${filters.name}%`);
    }
    
    if (filters.age) {
      builder.where('age', '>=', filters.age);
    }
    
    await execute();
  };
  
  return (
    <div>
      <input 
        placeholder="名前"
        onChange={(e) => setFilters({...filters, name: e.target.value})}
      />
      <input 
        type="number"
        placeholder="年齢"
        onChange={(e) => setFilters({...filters, age: e.target.value})}
      />
      <button onClick={handleSearch}>検索</button>
      
      {loading && <p>検索中...</p>}
      {data && (
        <ul>
          {data.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Vue

```vue
<template>
  <div>
    <input v-model="filters.name" placeholder="名前">
    <input v-model.number="filters.age" type="number" placeholder="年齢">
    <button @click="search">検索</button>
    
    <ul v-if="data">
      <li v-for="user in data" :key="user.id">
        {{ user.name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useQueryBuilder } from '@northprint/duckdb-wasm-adapter-vue';

const { builder, execute, data, loading } = useQueryBuilder();
const filters = reactive({ name: '', age: null });

const search = async () => {
  builder.value
    .select('*')
    .from('users');
  
  if (filters.name) {
    builder.value.where('name', 'LIKE', `%${filters.name}%`);
  }
  
  if (filters.age) {
    builder.value.where('age', '>=', filters.age);
  }
  
  await execute();
};
</script>
```

### Svelte

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  const builder = db.builder();
  
  let filters = { name: '', age: null };
  
  $: {
    builder.reset();
    builder.select('*').from('users');
    
    if (filters.name) {
      builder.where('name', 'LIKE', `%${filters.name}%`);
    }
    
    if (filters.age) {
      builder.where('age', '>=', filters.age);
    }
  }
  
  const search = () => builder.execute();
</script>

<input bind:value={filters.name} placeholder="名前">
<input bind:value={filters.age} type="number" placeholder="年齢">
<button on:click={search}>検索</button>

{#if $builder.data}
  <ul>
    {#each $builder.data as user}
      <li>{user.name}</li>
    {/each}
  </ul>
{/if}
```

## パフォーマンスのヒント

### インデックスの活用

```javascript
// インデックスを活用できるクエリ
builder
  .select('*')
  .from('users')
  .where('email', '=', 'user@example.com'); // emailにインデックスがある場合

// インデックスを活用できないクエリ
builder
  .select('*')
  .from('users')
  .where('email', 'LIKE', '%@example.com'); // 前方一致でない
```

### 必要なカラムのみ選択

```javascript
// 良い例
builder
  .select('id', 'name', 'email')
  .from('users');

// 悪い例
builder
  .select('*')
  .from('users');
```

### バッチ処理

```javascript
// トランザクション内でバッチ処理
const connection = await createConnection();
await connection.execute('BEGIN TRANSACTION');

try {
  for (const batch of dataBatches) {
    const query = new QueryBuilder()
      .insert('large_table')
      .values(batch)
      .build();
    
    await connection.execute(query);
  }
  
  await connection.execute('COMMIT');
} catch (error) {
  await connection.execute('ROLLBACK');
  throw error;
}
```

## エラーハンドリング

```javascript
try {
  const query = builder
    .select('*')
    .from('users')
    .where('age', '>', 'invalid') // 型エラー
    .build();
  
  const result = await connection.execute(query);
} catch (error) {
  if (error.code === 'INVALID_TYPE') {
    console.error('データ型エラー');
  } else if (error.code === 'SYNTAX_ERROR') {
    console.error('SQL構文エラー');
  } else {
    console.error('予期しないエラー:', error);
  }
}
```

## まとめ

クエリビルダーを使用することで、安全で保守性の高いデータベースアクセスコードを書くことができます。文字列連結によるSQL構築と比較して、以下の利点があります：

- SQLインジェクションの防止
- 型安全性の向上
- コードの可読性向上
- 動的クエリの構築が容易
- 再利用可能なクエリパーツ