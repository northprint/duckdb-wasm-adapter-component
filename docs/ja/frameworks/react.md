# React統合ガイド

DuckDB WASMアダプターをReactアプリケーションで使用するための包括的なガイドです。

## セットアップ

### インストール

```bash
npm install @northprint/duckdb-wasm-adapter-react
```

### 基本設定

```tsx
// App.tsx
import React from 'react';
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
      <YourApplication />
    </DuckDBProvider>
  );
}

export default App;
```

## 主要なフック

### useQuery - データ取得

最も基本的で重要なフックです。SQLクエリを実行し、結果をReactコンポーネントで使用できます。

```tsx
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

function UserList() {
  const { data, loading, error, refetch } = useQuery(
    'SELECT * FROM users ORDER BY name',
    undefined, // パラメーター
    {
      cacheTime: 60000,  // 1分間キャッシュ
      enabled: true      // 自動実行
    }
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

### useMutation - データ変更

INSERT、UPDATE、DELETE操作を実行するためのフックです。

```tsx
import { useMutation } from '@northprint/duckdb-wasm-adapter-react';

function AddUserForm() {
  const { mutate, loading, error } = useMutation({
    onSuccess: (data) => {
      console.log('ユーザー追加成功:', data);
      // フォームをリセット
    },
    onError: (error) => {
      console.error('エラー:', error);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    await mutate(
      'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
      [
        formData.get('name'),
        formData.get('email'),
        Number(formData.get('age'))
      ]
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="名前" required />
      <input name="email" type="email" placeholder="メール" required />
      <input name="age" type="number" placeholder="年齢" required />
      <button type="submit" disabled={loading}>
        {loading ? '追加中...' : '追加'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </form>
  );
}
```

## 実践的なパターン

### データテーブルコンポーネント

```tsx
import React, { useState } from 'react';
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

interface DataTableProps {
  tableName: string;
  columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
  }>;
}

function DataTable({ tableName, columns }: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [page, setPage] = useState(1);
  const perPage = 10;

  // 動的クエリの構築
  const query = React.useMemo(() => {
    let sql = `SELECT * FROM ${tableName}`;
    
    if (sortColumn) {
      sql += ` ORDER BY ${sortColumn} ${sortDirection}`;
    }
    
    sql += ` LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`;
    
    return sql;
  }, [tableName, sortColumn, sortDirection, page]);

  const { data, loading, error } = useQuery(query);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortColumn(column);
      setSortDirection('ASC');
    }
  };

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;

  return (
    <div>
      <table>
        <thead>
          <tr>
            {columns.map(column => (
              <th 
                key={column.key}
                onClick={() => column.sortable && handleSort(column.key)}
                style={{ cursor: column.sortable ? 'pointer' : 'default' }}
              >
                {column.label}
                {sortColumn === column.key && (
                  <span>{sortDirection === 'ASC' ? ' ▲' : ' ▼'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data?.map((row, index) => (
            <tr key={index}>
              {columns.map(column => (
                <td key={column.key}>{row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="pagination">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          前へ
        </button>
        <span>ページ {page}</span>
        <button 
          onClick={() => setPage(p => p + 1)}
          disabled={!data || data.length < perPage}
        >
          次へ
        </button>
      </div>
    </div>
  );
}
```

### 検索フォーム

```tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';
import { debounce } from 'lodash';

function SearchForm() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // デバウンス処理
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setDebouncedTerm(term);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // 検索クエリ
  const { data, loading } = useQuery(
    debouncedTerm
      ? `SELECT * FROM products WHERE name LIKE ? OR description LIKE ?`
      : 'SELECT * FROM products LIMIT 10',
    debouncedTerm
      ? [`%${debouncedTerm}%`, `%${debouncedTerm}%`]
      : undefined
  );

  return (
    <div>
      <input
        type="text"
        placeholder="商品を検索..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      {loading && <div>検索中...</div>}
      
      <div className="results">
        {data?.map(product => (
          <div key={product.id} className="product">
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <span>¥{product.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### ダッシュボード

```tsx
import React from 'react';
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

function Dashboard() {
  // 複数のクエリを並列実行
  const { data: salesData } = useQuery(`
    SELECT 
      DATE(order_date) as date,
      SUM(total) as total_sales
    FROM orders
    WHERE order_date >= DATE('now', '-30 days')
    GROUP BY DATE(order_date)
    ORDER BY date
  `);

  const { data: topProducts } = useQuery(`
    SELECT 
      p.name,
      COUNT(oi.id) as order_count,
      SUM(oi.quantity) as total_quantity
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    GROUP BY p.id, p.name
    ORDER BY total_quantity DESC
    LIMIT 5
  `);

  const { data: customerStats } = useQuery(`
    SELECT 
      COUNT(DISTINCT customer_id) as total_customers,
      AVG(total) as avg_order_value,
      MAX(total) as max_order_value
    FROM orders
  `);

  return (
    <div className="dashboard">
      <div className="stats-row">
        {customerStats && (
          <>
            <StatCard 
              title="顧客数" 
              value={customerStats[0].total_customers} 
            />
            <StatCard 
              title="平均注文額" 
              value={`¥${customerStats[0].avg_order_value.toFixed(0)}`} 
            />
            <StatCard 
              title="最高注文額" 
              value={`¥${customerStats[0].max_order_value}`} 
            />
          </>
        )}
      </div>

      <div className="charts">
        <SalesChart data={salesData} />
        <TopProductsChart data={topProducts} />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: any }) {
  return (
    <div className="stat-card">
      <h3>{title}</h3>
      <p className="value">{value}</p>
    </div>
  );
}
```

## カスタムフック

### useUserData - ユーザー固有のデータフック

```tsx
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

export function useUserData(userId: number) {
  const { data: user, ...userQuery } = useQuery(
    'SELECT * FROM users WHERE id = ?',
    [userId],
    { enabled: userId > 0 }
  );

  const { data: orders, ...ordersQuery } = useQuery(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    { enabled: userId > 0 }
  );

  const { data: stats, ...statsQuery } = useQuery(
    `SELECT 
      COUNT(*) as total_orders,
      SUM(total) as total_spent,
      AVG(total) as avg_order_value
    FROM orders WHERE user_id = ?`,
    [userId],
    { enabled: userId > 0 }
  );

  return {
    user: user?.[0],
    orders,
    stats: stats?.[0],
    loading: userQuery.loading || ordersQuery.loading || statsQuery.loading,
    error: userQuery.error || ordersQuery.error || statsQuery.error
  };
}
```

### usePagination - ページネーションフック

```tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

interface UsePaginationOptions {
  table: string;
  perPage?: number;
  where?: string;
  orderBy?: string;
}

export function usePagination({
  table,
  perPage = 10,
  where = '',
  orderBy = ''
}: UsePaginationOptions) {
  const [page, setPage] = useState(1);

  // 全件数を取得
  const { data: countData } = useQuery(
    `SELECT COUNT(*) as total FROM ${table} ${where}`
  );

  const totalCount = countData?.[0]?.total || 0;
  const totalPages = Math.ceil(totalCount / perPage);

  // ページデータを取得
  const query = useMemo(() => {
    let sql = `SELECT * FROM ${table}`;
    if (where) sql += ` ${where}`;
    if (orderBy) sql += ` ${orderBy}`;
    sql += ` LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`;
    return sql;
  }, [table, where, orderBy, perPage, page]);

  const { data, loading, error, refetch } = useQuery(query);

  return {
    data,
    loading,
    error,
    page,
    totalPages,
    totalCount,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    nextPage: () => setPage(p => Math.min(p + 1, totalPages)),
    prevPage: () => setPage(p => Math.max(p - 1, 1)),
    goToPage: (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    refetch
  };
}
```

## パフォーマンス最適化

### React.memo によるメモ化

```tsx
import React from 'react';
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

const ExpensiveComponent = React.memo(({ userId }: { userId: number }) => {
  const { data } = useQuery(
    'SELECT * FROM expensive_view WHERE user_id = ?',
    [userId]
  );

  return (
    <div>
      {/* 重い描画処理 */}
    </div>
  );
}, (prevProps, nextProps) => {
  // userIdが変わらない限り再描画しない
  return prevProps.userId === nextProps.userId;
});
```

### useMemo と useCallback

```tsx
function OptimizedList() {
  const [filter, setFilter] = useState('');
  
  // クエリをメモ化
  const query = useMemo(() => {
    if (!filter) return 'SELECT * FROM items';
    return `SELECT * FROM items WHERE name LIKE '%${filter}%'`;
  }, [filter]);

  const { data } = useQuery(query);

  // ハンドラーをメモ化
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  }, []);

  // 計算結果をメモ化
  const totalValue = useMemo(() => {
    return data?.reduce((sum, item) => sum + item.value, 0) || 0;
  }, [data]);

  return (
    <div>
      <input onChange={handleFilterChange} />
      <div>合計: {totalValue}</div>
      {/* リスト表示 */}
    </div>
  );
}
```

## エラーハンドリング

### エラーバウンダリー

```tsx
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert" className="error-fallback">
      <h2>エラーが発生しました</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>再試行</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <DuckDBProvider>
        <YourApp />
      </DuckDBProvider>
    </ErrorBoundary>
  );
}
```

### カスタムエラー処理

```tsx
import { DuckDBError, ErrorCode } from '@northprint/duckdb-wasm-adapter-react';

function QueryComponent() {
  const { data, error } = useQuery('SELECT * FROM users');

  if (error) {
    if (error instanceof DuckDBError) {
      switch (error.code) {
        case ErrorCode.CONNECTION_FAILED:
          return <div>データベースに接続できません</div>;
        case ErrorCode.QUERY_FAILED:
          return <div>クエリの実行に失敗しました</div>;
        case ErrorCode.TABLE_NOT_FOUND:
          return <div>テーブルが見つかりません</div>;
        default:
          return <div>予期しないエラー: {error.message}</div>;
      }
    }
    return <div>エラー: {error.message}</div>;
  }

  return <div>{/* データ表示 */}</div>;
}
```

## テスト

### コンポーネントのテスト

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';
import UserList from './UserList';

// モックデータ
const mockConnection = {
  execute: jest.fn().mockResolvedValue({
    toArray: () => [
      { id: 1, name: 'テストユーザー1' },
      { id: 2, name: 'テストユーザー2' }
    ]
  })
};

describe('UserList', () => {
  it('ユーザーリストを表示する', async () => {
    render(
      <DuckDBProvider connection={mockConnection}>
        <UserList />
      </DuckDBProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('テストユーザー1')).toBeInTheDocument();
      expect(screen.getByText('テストユーザー2')).toBeInTheDocument();
    });
  });
});
```

### カスタムフックのテスト

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useUserData } from './useUserData';

describe('useUserData', () => {
  it('ユーザーデータを取得する', async () => {
    const { result } = renderHook(() => useUserData(1));

    await waitFor(() => {
      expect(result.current.user).toBeDefined();
      expect(result.current.orders).toBeDefined();
      expect(result.current.stats).toBeDefined();
    });
  });
});
```

## Next.js統合

```tsx
// pages/_app.tsx
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';

function MyApp({ Component, pageProps }) {
  return (
    <DuckDBProvider
      config={{
        worker: true,
        // Next.jsでWeb Workerを使用する設定
        workerUrl: '/duckdb-worker.js'
      }}
    >
      <Component {...pageProps} />
    </DuckDBProvider>
  );
}

export default MyApp;
```

## ベストプラクティス

1. **Provider は最上位に配置** - アプリケーション全体で接続を共有
2. **適切なキャッシング** - 頻繁に変更されないデータはキャッシュ
3. **エラーバウンダリーの使用** - 予期しないエラーをキャッチ
4. **メモ化の活用** - 不要な再レンダリングを防ぐ
5. **型安全性** - TypeScriptで型を定義
6. **テストの作成** - 重要なロジックはテストでカバー

## トラブルシューティング

### Web Workerの問題

```tsx
// Web Workerが使えない環境での対処
<DuckDBProvider
  config={{
    worker: false  // メインスレッドで実行
  }}
>
```

### メモリ不足

```tsx
// 大きなデータセットを扱う場合
const { data } = useQuery(
  'SELECT * FROM large_table LIMIT 1000',  // 制限を設ける
  undefined,
  {
    cacheTime: 0  // キャッシュを無効化
  }
);
```