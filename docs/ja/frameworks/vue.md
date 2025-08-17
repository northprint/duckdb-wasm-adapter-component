# Vue統合ガイド

DuckDB WASMアダプターをVueアプリケーションで使用するための包括的なガイドです。

## セットアップ

### インストール

```bash
npm install @northprint/duckdb-wasm-adapter-vue
```

### プラグイン設定

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
    logLevel: 'warning',
    cache: {
      enabled: true,
      ttl: 60000
    }
  }
});

app.mount('#app');
```

## 主要なコンポジション関数

### useQuery - データ取得

最も基本的なコンポジション関数です。リアクティブなクエリ結果を提供します。

```vue
<template>
  <div>
    <div v-if="loading">読み込み中...</div>
    <div v-else-if="error">エラー: {{ error.message }}</div>
    <ul v-else>
      <li v-for="user in data" :key="user.id">
        {{ user.name }} ({{ user.age }}歳)
      </li>
    </ul>
    <button @click="refetch">更新</button>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading, error, refetch } = useQuery(
  'SELECT * FROM users ORDER BY name'
);
</script>
```

### useMutation - データ変更

INSERT、UPDATE、DELETE操作を実行します。

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="formData.name" placeholder="名前" required>
    <input v-model="formData.email" type="email" placeholder="メール" required>
    <input v-model.number="formData.age" type="number" placeholder="年齢" required>
    
    <button type="submit" :disabled="loading">
      {{ loading ? '送信中...' : '送信' }}
    </button>
    
    <div v-if="error" class="error">{{ error.message }}</div>
    <div v-if="success" class="success">ユーザーを追加しました</div>
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

## 実践的なコンポーネント

### データテーブルコンポーネント

```vue
<template>
  <div class="data-table">
    <table>
      <thead>
        <tr>
          <th 
            v-for="column in columns" 
            :key="column.key"
            @click="column.sortable && handleSort(column.key)"
            :class="{ sortable: column.sortable }"
          >
            {{ column.label }}
            <span v-if="sortColumn === column.key">
              {{ sortDirection === 'ASC' ? '▲' : '▼' }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in data" :key="row.id">
          <td v-for="column in columns" :key="column.key">
            {{ row[column.key] }}
          </td>
        </tr>
      </tbody>
    </table>
    
    <div class="pagination">
      <button @click="prevPage" :disabled="page === 1">前へ</button>
      <span>ページ {{ page }} / {{ totalPages }}</span>
      <button @click="nextPage" :disabled="page >= totalPages">次へ</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const props = defineProps({
  tableName: String,
  columns: Array,
  perPage: {
    type: Number,
    default: 10
  }
});

const sortColumn = ref('');
const sortDirection = ref('ASC');
const page = ref(1);

// 動的クエリの構築
const query = computed(() => {
  let sql = `SELECT * FROM ${props.tableName}`;
  
  if (sortColumn.value) {
    sql += ` ORDER BY ${sortColumn.value} ${sortDirection.value}`;
  }
  
  sql += ` LIMIT ${props.perPage} OFFSET ${(page.value - 1) * props.perPage}`;
  
  return sql;
});

// 全件数の取得
const { data: countData } = useQuery(
  computed(() => `SELECT COUNT(*) as total FROM ${props.tableName}`)
);

const totalPages = computed(() => {
  const total = countData.value?.[0]?.total || 0;
  return Math.ceil(total / props.perPage);
});

// データ取得
const { data, loading, error } = useQuery(query);

const handleSort = (column) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'ASC' ? 'DESC' : 'ASC';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'ASC';
  }
  page.value = 1; // ソート時はページをリセット
};

const nextPage = () => {
  if (page.value < totalPages.value) {
    page.value++;
  }
};

const prevPage = () => {
  if (page.value > 1) {
    page.value--;
  }
};
</script>

<style scoped>
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

```vue
<template>
  <div class="search-filter">
    <input 
      v-model="searchTerm" 
      type="text"
      placeholder="検索..."
      @input="debouncedSearch"
    >
    
    <select v-model="selectedCategory">
      <option value="">すべてのカテゴリ</option>
      <option v-for="cat in categories" :key="cat.id" :value="cat.id">
        {{ cat.name }}
      </option>
    </select>
    
    <div class="price-range">
      <input 
        v-model.number="priceRange.min" 
        type="number" 
        placeholder="最小価格"
      >
      <span>〜</span>
      <input 
        v-model.number="priceRange.max" 
        type="number" 
        placeholder="最大価格"
      >
    </div>
    
    <button @click="applyFilters">フィルター適用</button>
    <button @click="resetFilters">リセット</button>
    
    <div v-if="loading" class="loading">検索中...</div>
    
    <div class="results">
      <div v-for="product in data" :key="product.id" class="product">
        <h3>{{ product.name }}</h3>
        <p>{{ product.description }}</p>
        <span class="price">¥{{ product.price }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';
import { debounce } from 'lodash-es';

const searchTerm = ref('');
const selectedCategory = ref('');
const priceRange = reactive({ min: null, max: null });

// カテゴリ一覧の取得
const { data: categories } = useQuery('SELECT * FROM categories ORDER BY name');

// フィルター条件からクエリを構築
const buildQuery = () => {
  const conditions = [];
  const params = [];
  
  if (searchTerm.value) {
    conditions.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${searchTerm.value}%`, `%${searchTerm.value}%`);
  }
  
  if (selectedCategory.value) {
    conditions.push('category_id = ?');
    params.push(selectedCategory.value);
  }
  
  if (priceRange.min !== null) {
    conditions.push('price >= ?');
    params.push(priceRange.min);
  }
  
  if (priceRange.max !== null) {
    conditions.push('price <= ?');
    params.push(priceRange.max);
  }
  
  let query = 'SELECT * FROM products';
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY name';
  
  return { query, params };
};

const currentQuery = ref(buildQuery());

// デバウンス処理
const debouncedSearch = debounce(() => {
  applyFilters();
}, 300);

const applyFilters = () => {
  currentQuery.value = buildQuery();
};

const resetFilters = () => {
  searchTerm.value = '';
  selectedCategory.value = '';
  priceRange.min = null;
  priceRange.max = null;
  applyFilters();
};

// クエリ実行
const { data, loading, error } = useQuery(
  computed(() => currentQuery.value.query),
  computed(() => currentQuery.value.params)
);
</script>
```

### ダッシュボードコンポーネント

```vue
<template>
  <div class="dashboard">
    <h1>ダッシュボード</h1>
    
    <!-- 統計カード -->
    <div class="stats-grid">
      <StatCard 
        title="総売上" 
        :value="formatCurrency(stats?.total_sales || 0)"
        icon="💰"
      />
      <StatCard 
        title="注文数" 
        :value="stats?.total_orders || 0"
        icon="📦"
      />
      <StatCard 
        title="顧客数" 
        :value="stats?.total_customers || 0"
        icon="👥"
      />
      <StatCard 
        title="平均注文額" 
        :value="formatCurrency(stats?.avg_order_value || 0)"
        icon="📊"
      />
    </div>
    
    <!-- グラフ -->
    <div class="charts-grid">
      <SalesChart :data="salesData" />
      <CategoryChart :data="categoryData" />
    </div>
    
    <!-- 最近の注文 -->
    <RecentOrders :orders="recentOrders" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';
import StatCard from './StatCard.vue';
import SalesChart from './SalesChart.vue';
import CategoryChart from './CategoryChart.vue';
import RecentOrders from './RecentOrders.vue';

// 統計データ
const { data: statsData } = useQuery(`
  SELECT 
    SUM(total) as total_sales,
    COUNT(*) as total_orders,
    COUNT(DISTINCT customer_id) as total_customers,
    AVG(total) as avg_order_value
  FROM orders
  WHERE DATE(created_at) >= DATE('now', '-30 days')
`);

const stats = computed(() => statsData.value?.[0]);

// 売上推移データ
const { data: salesData } = useQuery(`
  SELECT 
    DATE(created_at) as date,
    SUM(total) as sales
  FROM orders
  WHERE DATE(created_at) >= DATE('now', '-30 days')
  GROUP BY DATE(created_at)
  ORDER BY date
`);

// カテゴリ別売上
const { data: categoryData } = useQuery(`
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
const { data: recentOrders } = useQuery(`
  SELECT 
    o.*,
    c.name as customer_name
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  ORDER BY o.created_at DESC
  LIMIT 10
`);

// ヘルパー関数
const formatCurrency = (value) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY'
  }).format(value);
};
</script>

<style scoped>
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

@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
```

## カスタムコンポジション関数

### usePagination - ページネーション

```javascript
// composables/usePagination.js
import { ref, computed, watch } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

export function usePagination(tableName, options = {}) {
  const {
    perPage = 10,
    where = '',
    orderBy = ''
  } = options;
  
  const page = ref(1);
  
  // 全件数を取得
  const countQuery = computed(() => {
    let sql = `SELECT COUNT(*) as total FROM ${tableName}`;
    if (where) sql += ` WHERE ${where}`;
    return sql;
  });
  
  const { data: countData } = useQuery(countQuery);
  
  const totalCount = computed(() => countData.value?.[0]?.total || 0);
  const totalPages = computed(() => Math.ceil(totalCount.value / perPage));
  
  // データ取得
  const dataQuery = computed(() => {
    let sql = `SELECT * FROM ${tableName}`;
    if (where) sql += ` WHERE ${where}`;
    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    sql += ` LIMIT ${perPage} OFFSET ${(page.value - 1) * perPage}`;
    return sql;
  });
  
  const { data, loading, error, refetch } = useQuery(dataQuery);
  
  // ページ制御
  const nextPage = () => {
    if (page.value < totalPages.value) {
      page.value++;
    }
  };
  
  const prevPage = () => {
    if (page.value > 1) {
      page.value--;
    }
  };
  
  const goToPage = (p) => {
    page.value = Math.max(1, Math.min(p, totalPages.value));
  };
  
  // whereやorderByが変更されたらページをリセット
  watch([() => where, () => orderBy], () => {
    page.value = 1;
  });
  
  return {
    data,
    loading,
    error,
    page: readonly(page),
    totalPages: readonly(totalPages),
    totalCount: readonly(totalCount),
    hasNext: computed(() => page.value < totalPages.value),
    hasPrev: computed(() => page.value > 1),
    nextPage,
    prevPage,
    goToPage,
    refetch
  };
}
```

### useTableData - テーブルデータ管理

```javascript
// composables/useTableData.js
import { ref, reactive, computed } from 'vue';
import { useQuery, useMutation } from '@northprint/duckdb-wasm-adapter-vue';

export function useTableData(tableName) {
  const filters = reactive({});
  const sortBy = ref('');
  const sortDirection = ref('ASC');
  
  // クエリ構築
  const query = computed(() => {
    let sql = `SELECT * FROM ${tableName}`;
    
    // フィルター適用
    const conditions = Object.entries(filters)
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
    if (sortBy.value) {
      sql += ` ORDER BY ${sortBy.value} ${sortDirection.value}`;
    }
    
    return sql;
  });
  
  // データ取得
  const { data, loading, error, refetch } = useQuery(query);
  
  // データ操作
  const { mutate: createMutation } = useMutation();
  const { mutate: updateMutation } = useMutation();
  const { mutate: deleteMutation } = useMutation();
  
  const create = async (values) => {
    const columns = Object.keys(values).join(', ');
    const placeholders = Object.keys(values).map(() => '?').join(', ');
    const params = Object.values(values);
    
    await createMutation(
      `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
      params
    );
    await refetch();
  };
  
  const update = async (id, values) => {
    const sets = Object.keys(values).map(key => `${key} = ?`).join(', ');
    const params = [...Object.values(values), id];
    
    await updateMutation(
      `UPDATE ${tableName} SET ${sets} WHERE id = ?`,
      params
    );
    await refetch();
  };
  
  const remove = async (id) => {
    await deleteMutation(
      `DELETE FROM ${tableName} WHERE id = ?`,
      [id]
    );
    await refetch();
  };
  
  // フィルター制御
  const setFilter = (key, value) => {
    filters[key] = value;
  };
  
  const clearFilters = () => {
    Object.keys(filters).forEach(key => {
      delete filters[key];
    });
  };
  
  // ソート制御
  const setSort = (column) => {
    if (sortBy.value === column) {
      sortDirection.value = sortDirection.value === 'ASC' ? 'DESC' : 'ASC';
    } else {
      sortBy.value = column;
      sortDirection.value = 'ASC';
    }
  };
  
  return {
    data,
    loading,
    error,
    filters: readonly(filters),
    sortBy: readonly(sortBy),
    sortDirection: readonly(sortDirection),
    create,
    update,
    remove,
    setFilter,
    clearFilters,
    setSort,
    refetch
  };
}
```

## Nuxt.js統合

### プラグイン設定

```javascript
// plugins/duckdb.client.js
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(DuckDBPlugin, {
    autoConnect: true,
    config: {
      worker: true,
      cache: {
        enabled: true,
        ttl: 60000
      }
    }
  });
});
```

### サーバーサイドレンダリング対応

```vue
<!-- pages/data.vue -->
<template>
  <div>
    <ClientOnly>
      <DataTable />
      <template #fallback>
        <div>データを読み込み中...</div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
import DataTable from '~/components/DataTable.vue';

// SSRを無効化
definePageMeta({
  ssr: false
});
</script>
```

## パフォーマンス最適化

### computed と watchEffect

```vue
<script setup>
import { ref, computed, watchEffect } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const userId = ref(1);

// computedでクエリを動的に生成
const userQuery = computed(() => 
  `SELECT * FROM users WHERE id = ${userId.value}`
);

// watchEffectで自動的に再実行
const { data: user } = useQuery(userQuery);

watchEffect(() => {
  if (user.value) {
    console.log('ユーザーデータ更新:', user.value);
  }
});
</script>
```

### shallowRef と shallowReactive

```vue
<script setup>
import { shallowRef, shallowReactive } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

// 大きなデータセットにはshallowRefを使用
const { data: largeData } = useQuery('SELECT * FROM large_table');
const processedData = shallowRef([]);

// ネストが浅いオブジェクトにはshallowReactive
const filters = shallowReactive({
  search: '',
  category: null,
  priceRange: { min: 0, max: 1000 }
});
</script>
```

## エラーハンドリング

### グローバルエラーハンドラー

```javascript
// main.js
app.use(DuckDBPlugin, {
  onError: (error) => {
    // グローバルエラー処理
    console.error('DuckDBエラー:', error);
    
    // 通知システムに送信
    if (window.$toast) {
      window.$toast.error(error.message);
    }
  }
});

// エラーハンドラーの設定
app.config.errorHandler = (error, instance, info) => {
  console.error('Vueエラー:', error, info);
};
```

### コンポーネントレベルのエラー処理

```vue
<template>
  <div>
    <ErrorBoundary @error="handleError">
      <DataTable />
    </ErrorBoundary>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ErrorBoundary from './ErrorBoundary.vue';

const handleError = (error) => {
  console.error('コンポーネントエラー:', error);
  // エラー処理
};
</script>
```

## テスト

### コンポーネントテスト

```javascript
// UserList.spec.js
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import UserList from './UserList.vue';

// モック設定
vi.mock('@northprint/duckdb-wasm-adapter-vue', () => ({
  useQuery: vi.fn(() => ({
    data: ref([
      { id: 1, name: 'テストユーザー1' },
      { id: 2, name: 'テストユーザー2' }
    ]),
    loading: ref(false),
    error: ref(null)
  }))
}));

describe('UserList', () => {
  it('ユーザーリストを表示する', () => {
    const wrapper = mount(UserList);
    
    expect(wrapper.text()).toContain('テストユーザー1');
    expect(wrapper.text()).toContain('テストユーザー2');
  });
});
```

## ベストプラクティス

1. **プラグインは main.js で設定** - アプリ全体で共有
2. **リアクティブな値を活用** - computed と watch を適切に使用
3. **コンポジション関数の再利用** - 共通ロジックを抽出
4. **適切なライフサイクル** - onMounted、onUnmounted を活用
5. **型定義の活用** - TypeScript で型安全性を確保
6. **エラーバウンダリー** - エラーを適切にキャッチ

## トラブルシューティング

### Viteでの設定

```javascript
// vite.config.js
export default {
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  },
  build: {
    target: 'esnext'
  }
};
```

### Web Worker の問題

```javascript
// Web Workerが使えない場合
app.use(DuckDBPlugin, {
  config: {
    worker: false  // メインスレッドで実行
  }
});
```