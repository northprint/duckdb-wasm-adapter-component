# キャッシング

DuckDB WASMアダプターは、パフォーマンスを向上させるための高度なキャッシング機能を提供します。

## 概要

キャッシングにより、以下のメリットが得られます：

- **クエリの高速化** - 同じクエリを繰り返し実行する際の応答時間を短縮
- **リソース節約** - CPU使用率とメモリアクセスを削減
- **ユーザー体験向上** - 瞬時のレスポンスで快適な操作性

## 基本的な使い方

### 接続レベルのキャッシュ設定

```javascript
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

const connection = await createConnection({
  cache: {
    enabled: true,        // キャッシュを有効化
    maxEntries: 100,      // 最大キャッシュエントリ数
    ttl: 60000,          // TTL（ミリ秒）- 1分
    maxSize: 50 * 1024 * 1024  // 最大キャッシュサイズ - 50MB
  }
});
```

### クエリレベルのキャッシュ制御

```javascript
// キャッシュを使用するクエリ
const result = await connection.execute('SELECT * FROM users', undefined, {
  cache: true,
  cacheKey: 'all-users',
  cacheTTL: 300000  // 5分間キャッシュ
});

// キャッシュをバイパスするクエリ
const freshResult = await connection.execute('SELECT * FROM users', undefined, {
  cache: false
});
```

## キャッシュ戦略

### 1. 静的データのキャッシュ

マスターデータなど、頻繁に変更されないデータに長いTTLを設定：

```javascript
// 都道府県マスター（ほぼ変更されない）
const prefectures = await connection.execute(
  'SELECT * FROM prefectures',
  undefined,
  {
    cache: true,
    cacheTTL: 24 * 60 * 60 * 1000  // 24時間
  }
);

// カテゴリマスター（たまに変更される）
const categories = await connection.execute(
  'SELECT * FROM categories',
  undefined,
  {
    cache: true,
    cacheTTL: 60 * 60 * 1000  // 1時間
  }
);
```

### 2. 動的データの条件付きキャッシュ

パラメーターに基づいてキャッシュキーを生成：

```javascript
function getUsersByDepartment(departmentId) {
  return connection.execute(
    'SELECT * FROM users WHERE department_id = ?',
    [departmentId],
    {
      cache: true,
      cacheKey: `users-dept-${departmentId}`,
      cacheTTL: 5 * 60 * 1000  // 5分
    }
  );
}
```

### 3. 集計クエリのキャッシュ

重い集計処理の結果をキャッシュ：

```javascript
// 売上集計（日次）
async function getDailySales(date) {
  const cacheKey = `daily-sales-${date}`;
  
  return connection.execute(
    `SELECT 
      DATE(order_date) as date,
      COUNT(*) as order_count,
      SUM(total) as total_sales,
      AVG(total) as avg_order_value
    FROM orders
    WHERE DATE(order_date) = ?
    GROUP BY DATE(order_date)`,
    [date],
    {
      cache: true,
      cacheKey,
      cacheTTL: date === today() ? 60000 : Infinity  // 今日は1分、過去は永続
    }
  );
}
```

## キャッシュ管理

### キャッシュのクリア

```javascript
// 特定のキーのキャッシュをクリア
connection.clearCache('all-users');

// パターンに一致するキャッシュをクリア
connection.clearCache(/^users-dept-/);

// すべてのキャッシュをクリア
connection.clearAllCache();
```

### キャッシュの統計情報

```javascript
// キャッシュ統計を取得
const stats = connection.getCacheStats();
console.log({
  hits: stats.hits,           // キャッシュヒット数
  misses: stats.misses,       // キャッシュミス数
  hitRate: stats.hitRate,     // ヒット率
  size: stats.size,           // 現在のキャッシュサイズ
  entries: stats.entries      // エントリ数
});
```

### キャッシュの無効化

```javascript
// データ更新時にキャッシュを無効化
async function updateUser(userId, data) {
  // ユーザーを更新
  await connection.execute(
    'UPDATE users SET name = ?, email = ? WHERE id = ?',
    [data.name, data.email, userId]
  );
  
  // 関連するキャッシュを無効化
  connection.clearCache('all-users');
  connection.clearCache(`user-${userId}`);
  connection.clearCache(/^users-dept-/);  // すべての部門キャッシュ
}
```

## フレームワーク統合

### React

```jsx
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

function UserList() {
  // キャッシュ付きクエリ
  const { data, loading, error, refetch } = useQuery(
    'SELECT * FROM users',
    undefined,
    {
      cacheTime: 5 * 60 * 1000,    // 5分間キャッシュ
      staleTime: 60 * 1000,        // 1分後に再検証
      refetchOnWindowFocus: false,  // フォーカス時の再取得を無効化
      refetchInterval: false        // 定期的な再取得を無効化
    }
  );
  
  // 手動でキャッシュを更新
  const handleRefresh = () => {
    refetch({ force: true });  // キャッシュを無視して再取得
  };
  
  return (
    <div>
      <button onClick={handleRefresh}>更新</button>
      {loading && <p>読み込み中...</p>}
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
    <button @click="refresh">更新</button>
    <ul v-if="data">
      <li v-for="user in data" :key="user.id">
        {{ user.name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading, error, refetch } = useQuery(
  'SELECT * FROM users',
  undefined,
  {
    cacheTime: 5 * 60 * 1000,
    staleTime: 60 * 1000
  }
);

// 強制更新
const refresh = () => {
  refetch({ force: true });
};
</script>
```

### Svelte

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ 
    autoConnect: true,
    config: {
      cache: {
        enabled: true,
        maxEntries: 100,
        ttl: 60000
      }
    }
  });
  
  // キャッシュ付きクエリ
  $: users = db.query('SELECT * FROM users', undefined, {
    cache: true,
    cacheTTL: 300000  // 5分
  });
  
  // キャッシュをクリアして再取得
  function refresh() {
    db.clearCache('SELECT * FROM users');
    users.refetch();
  }
</script>

<button on:click={refresh}>更新</button>

{#if $users.data}
  <ul>
    {#each $users.data as user}
      <li>{user.name}</li>
    {/each}
  </ul>
{/if}
```

## 高度なキャッシング

### 多層キャッシュ

```javascript
class MultiLayerCache {
  constructor(connection) {
    this.connection = connection;
    this.memoryCache = new Map();
    this.storageCache = window.localStorage;
  }
  
  async get(key, queryFn) {
    // レベル1: メモリキャッシュ
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    // レベル2: LocalStorage
    const stored = this.storageCache.getItem(key);
    if (stored) {
      const data = JSON.parse(stored);
      if (Date.now() < data.expiry) {
        this.memoryCache.set(key, data.value);
        return data.value;
      }
    }
    
    // レベル3: DuckDBキャッシュ
    const result = await queryFn();
    
    // キャッシュに保存
    this.set(key, result, 60000);  // 1分
    
    return result;
  }
  
  set(key, value, ttl) {
    // メモリに保存
    this.memoryCache.set(key, value);
    
    // LocalStorageに保存
    this.storageCache.setItem(key, JSON.stringify({
      value,
      expiry: Date.now() + ttl
    }));
    
    // TTL後に削除
    setTimeout(() => {
      this.memoryCache.delete(key);
    }, ttl);
  }
  
  clear(pattern) {
    // メモリキャッシュをクリア
    if (pattern instanceof RegExp) {
      for (const key of this.memoryCache.keys()) {
        if (pattern.test(key)) {
          this.memoryCache.delete(key);
        }
      }
    } else {
      this.memoryCache.delete(pattern);
    }
    
    // LocalStorageをクリア
    for (let i = 0; i < this.storageCache.length; i++) {
      const key = this.storageCache.key(i);
      if (pattern instanceof RegExp ? pattern.test(key) : key === pattern) {
        this.storageCache.removeItem(key);
      }
    }
  }
}
```

### 予測キャッシング

```javascript
// ユーザーの行動を予測してキャッシュをプリロード
class PredictiveCache {
  constructor(connection) {
    this.connection = connection;
  }
  
  async preloadRelated(currentQuery) {
    // 現在のクエリに基づいて関連クエリを予測
    if (currentQuery.includes('users')) {
      // ユーザー関連のデータをプリロード
      this.preload('SELECT * FROM departments');
      this.preload('SELECT * FROM roles');
    }
    
    if (currentQuery.includes('orders')) {
      // 注文関連のデータをプリロード
      this.preload('SELECT * FROM products');
      this.preload('SELECT * FROM customers');
    }
  }
  
  async preload(query) {
    // バックグラウンドでクエリを実行してキャッシュ
    setTimeout(async () => {
      await this.connection.execute(query, undefined, {
        cache: true,
        cacheTTL: 300000
      });
    }, 100);
  }
}
```

### 条件付きキャッシュ

```javascript
// 条件に基づいてキャッシュ戦略を変更
function smartCache(query, params, context) {
  const options = {
    cache: true
  };
  
  // 時間帯に基づくTTL
  const hour = new Date().getHours();
  if (hour >= 9 && hour <= 18) {
    // 営業時間中は短いTTL
    options.cacheTTL = 60000;  // 1分
  } else {
    // 営業時間外は長いTTL
    options.cacheTTL = 3600000;  // 1時間
  }
  
  // データの種類に基づくキャッシュ
  if (query.includes('FROM logs')) {
    // ログデータはキャッシュしない
    options.cache = false;
  } else if (query.includes('FROM settings')) {
    // 設定データは長期キャッシュ
    options.cacheTTL = 86400000;  // 24時間
  }
  
  // ユーザー権限に基づくキャッシュ
  if (context.user.role === 'admin') {
    // 管理者は常に最新データ
    options.cache = false;
  }
  
  return connection.execute(query, params, options);
}
```

## パフォーマンス最適化

### キャッシュウォーミング

```javascript
// アプリケーション起動時にキャッシュを準備
async function warmCache(connection) {
  const queries = [
    'SELECT * FROM users WHERE active = true',
    'SELECT * FROM products WHERE in_stock = true',
    'SELECT * FROM categories',
    'SELECT * FROM settings'
  ];
  
  // 並列でキャッシュをウォーミング
  await Promise.all(queries.map(query => 
    connection.execute(query, undefined, {
      cache: true,
      cacheTTL: 3600000  // 1時間
    })
  ));
  
  console.log('キャッシュウォーミング完了');
}
```

### メモリ管理

```javascript
// キャッシュサイズを監視して自動クリーンアップ
class CacheManager {
  constructor(connection, maxSize = 100 * 1024 * 1024) {  // 100MB
    this.connection = connection;
    this.maxSize = maxSize;
    
    // 定期的にチェック
    setInterval(() => this.cleanup(), 60000);  // 1分ごと
  }
  
  async cleanup() {
    const stats = this.connection.getCacheStats();
    
    if (stats.size > this.maxSize) {
      // LRU（Least Recently Used）でクリーンアップ
      const entries = this.connection.getCacheEntries();
      entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      let cleaned = 0;
      while (stats.size > this.maxSize * 0.8 && entries.length > 0) {
        const entry = entries.shift();
        this.connection.clearCache(entry.key);
        cleaned += entry.size;
      }
      
      console.log(`キャッシュクリーンアップ: ${cleaned}バイト削除`);
    }
  }
}
```

## ベストプラクティス

### 1. 適切なTTLの設定

```javascript
const TTL = {
  STATIC: 24 * 60 * 60 * 1000,    // 静的データ: 24時間
  SEMI_STATIC: 60 * 60 * 1000,    // 準静的データ: 1時間
  DYNAMIC: 5 * 60 * 1000,         // 動的データ: 5分
  REAL_TIME: 10 * 1000,            // リアルタイム: 10秒
  NO_CACHE: 0                      // キャッシュなし
};

function getCacheTTL(dataType) {
  switch (dataType) {
    case 'master': return TTL.STATIC;
    case 'config': return TTL.SEMI_STATIC;
    case 'transaction': return TTL.DYNAMIC;
    case 'dashboard': return TTL.REAL_TIME;
    case 'log': return TTL.NO_CACHE;
    default: return TTL.DYNAMIC;
  }
}
```

### 2. キャッシュキーの設計

```javascript
// 一貫性のあるキャッシュキー生成
function generateCacheKey(query, params = [], context = {}) {
  const normalized = query.toLowerCase().replace(/\s+/g, ' ');
  const paramHash = JSON.stringify(params);
  const contextHash = JSON.stringify({
    userId: context.userId,
    role: context.role,
    tenantId: context.tenantId
  });
  
  return `${normalized}::${paramHash}::${contextHash}`;
}
```

### 3. キャッシュの無効化戦略

```javascript
// タグベースのキャッシュ無効化
class TaggedCache {
  constructor(connection) {
    this.connection = connection;
    this.tags = new Map();
  }
  
  async execute(query, params, options = {}) {
    const cacheKey = generateCacheKey(query, params);
    
    // タグを記録
    if (options.tags) {
      options.tags.forEach(tag => {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set());
        }
        this.tags.get(tag).add(cacheKey);
      });
    }
    
    return this.connection.execute(query, params, {
      ...options,
      cacheKey
    });
  }
  
  invalidateByTag(tag) {
    const keys = this.tags.get(tag) || new Set();
    keys.forEach(key => this.connection.clearCache(key));
    this.tags.delete(tag);
  }
}

// 使用例
const cache = new TaggedCache(connection);

// ユーザーデータをタグ付きでキャッシュ
await cache.execute(
  'SELECT * FROM users WHERE department_id = ?',
  [1],
  { tags: ['users', 'dept-1'] }
);

// 部門1のすべてのキャッシュを無効化
cache.invalidateByTag('dept-1');
```

## トラブルシューティング

### キャッシュが効かない

```javascript
// デバッグモードでキャッシュの動作を確認
const connection = await createConnection({
  cache: {
    enabled: true,
    debug: true  // デバッグログを有効化
  },
  onCacheHit: (key) => console.log('キャッシュヒット:', key),
  onCacheMiss: (key) => console.log('キャッシュミス:', key)
});
```

### メモリリーク

```javascript
// 適切なクリーンアップ
window.addEventListener('beforeunload', () => {
  connection.clearAllCache();
  connection.close();
});
```

## まとめ

適切なキャッシング戦略により、アプリケーションのパフォーマンスを大幅に向上させることができます。データの特性に応じて最適なキャッシュ設定を選択し、定期的にキャッシュの効果を測定することが重要です。