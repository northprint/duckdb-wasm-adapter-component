# React API リファレンス

DuckDB WASM Adapter Reactライブラリの完全なAPIリファレンスです。

## インストール

```bash
npm install @northprint/duckdb-wasm-adapter-react
```

## 基本的な使い方

```tsx
import { DuckDBProvider, useQuery } from '@northprint/duckdb-wasm-adapter-react';

function App() {
  return (
    <DuckDBProvider autoConnect>
      <MyComponent />
    </DuckDBProvider>
  );
}

function MyComponent() {
  const { data, loading, error } = useQuery('SELECT * FROM users');
  
  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;
  
  return (
    <ul>
      {data?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## コンポーネント

### DuckDBProvider

アプリケーション全体でDuckDB接続を提供するコンテキストプロバイダーです。

#### Props

```typescript
interface DuckDBProviderProps {
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
  
  // 子要素
  children: React.ReactNode;
}
```

#### 例

```tsx
<DuckDBProvider
  autoConnect={true}
  config={{
    worker: true,
    logLevel: 'warning',
    cache: {
      enabled: true,
      ttl: 60000
    }
  }}
  onConnect={() => console.log('接続完了')}
  onError={(error) => console.error('エラー:', error)}
>
  <App />
</DuckDBProvider>
```

## フック

### useConnection

DuckDB接続オブジェクトにアクセスします。

```typescript
function useConnection(): {
  connection: Connection | null;
  connected: boolean;
  connecting: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}
```

#### 例

```tsx
function ConnectionStatus() {
  const { connected, connecting, error, connect, disconnect } = useConnection();
  
  if (connecting) return <div>接続中...</div>;
  if (error) return <div>接続エラー: {error.message}</div>;
  
  return (
    <div>
      <p>ステータス: {connected ? '接続済み' : '未接続'}</p>
      <button onClick={connected ? disconnect : connect}>
        {connected ? '切断' : '接続'}
      </button>
    </div>
  );
}
```

### useQuery

SQLクエリを実行し、結果を取得します。

```typescript
function useQuery<T = any>(
  query: string,
  params?: any[],
  options?: UseQueryOptions
): {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setData: (data: T[]) => void;
}
```

#### パラメーター

- `query` - 実行するSQLクエリ
- `params` - パラメーターバインディング用の値
- `options` - クエリオプション

#### UseQueryOptions

```typescript
interface UseQueryOptions {
  // 自動的に実行するか
  enabled?: boolean;
  
  // キャッシュ設定
  cacheTime?: number;
  staleTime?: number;
  
  // 再試行設定
  retry?: boolean | number;
  retryDelay?: number;
  
  // コールバック
  onSuccess?: (data: any[]) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}
```

#### 例

```tsx
function UserList() {
  const { data, loading, error, refetch } = useQuery(
    'SELECT * FROM users WHERE age > ?',
    [18],
    {
      cacheTime: 60000,
      onSuccess: (data) => console.log('データ取得成功:', data.length),
      onError: (error) => console.error('エラー:', error)
    }
  );
  
  return (
    <div>
      <button onClick={refetch}>更新</button>
      {loading && <div>読み込み中...</div>}
      {error && <div>エラー: {error.message}</div>}
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

### useMutation

データ変更操作（INSERT、UPDATE、DELETE）を実行します。

```typescript
function useMutation<T = any>(
  query?: string,
  options?: UseMutationOptions
): {
  mutate: (query: string, params?: any[]) => Promise<T>;
  mutateAsync: (query: string, params?: any[]) => Promise<T>;
  data: T | null;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

#### UseMutationOptions

```typescript
interface UseMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
  onMutate?: (variables: any) => void;
}
```

#### 例

```tsx
function AddUserForm() {
  const { mutate, loading, error } = useMutation({
    onSuccess: () => {
      console.log('ユーザー追加成功');
      // フォームをリセット
    },
    onError: (error) => {
      console.error('追加失敗:', error);
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
        parseInt(formData.get('age') as string)
      ]
    );
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="名前" required />
      <input name="email" type="email" placeholder="メール" required />
      <input name="age" type="number" placeholder="年齢" required />
      <button type="submit" disabled={loading}>
        {loading ? '追加中...' : 'ユーザー追加'}
      </button>
      {error && <p>エラー: {error.message}</p>}
    </form>
  );
}
```

### useImport

ファイルインポート機能を提供します。

```typescript
function useImport(): {
  importCSV: (file: File, tableName: string, options?: ImportCSVOptions) => Promise<void>;
  importJSON: (data: any[], tableName: string) => Promise<void>;
  importParquet: (file: File, tableName: string) => Promise<void>;
  importing: boolean;
  error: Error | null;
}
```

#### 例

```tsx
function DataImporter() {
  const { importCSV, importJSON, importing, error } = useImport();
  
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    await importCSV(file, 'imported_data', {
      header: true,
      delimiter: ','
    });
  };
  
  const handleJSONImport = async () => {
    const data = [
      { id: 1, name: '田中太郎', age: 30 },
      { id: 2, name: '佐藤花子', age: 25 }
    ];
    
    await importJSON(data, 'users');
  };
  
  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={handleCSVImport}
        disabled={importing}
      />
      <button onClick={handleJSONImport} disabled={importing}>
        JSONデータをインポート
      </button>
      {importing && <p>インポート中...</p>}
      {error && <p>エラー: {error.message}</p>}
    </div>
  );
}
```

### useExport

データエクスポート機能を提供します。

```typescript
function useExport(): {
  exportCSV: (query: string, options?: ExportCSVOptions) => Promise<string>;
  exportJSON: (query: string) => Promise<any[]>;
  exportParquet: (query: string) => Promise<Blob>;
  exporting: boolean;
  error: Error | null;
}
```

#### 例

```tsx
function DataExporter() {
  const { exportCSV, exportJSON, exporting, error } = useExport();
  
  const handleCSVExport = async () => {
    const csv = await exportCSV('SELECT * FROM users', {
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
  };
  
  const handleJSONExport = async () => {
    const json = await exportJSON('SELECT * FROM users');
    console.log('エクスポートデータ:', json);
  };
  
  return (
    <div>
      <button onClick={handleCSVExport} disabled={exporting}>
        CSVエクスポート
      </button>
      <button onClick={handleJSONExport} disabled={exporting}>
        JSONエクスポート
      </button>
      {exporting && <p>エクスポート中...</p>}
      {error && <p>エラー: {error.message}</p>}
    </div>
  );
}
```

### useTransaction

トランザクション管理を提供します。

```typescript
function useTransaction(): {
  begin: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  inTransaction: boolean;
  execute: (callback: () => Promise<void>) => Promise<void>;
}
```

#### 例

```tsx
function TransactionExample() {
  const { execute, inTransaction } = useTransaction();
  const { mutate } = useMutation();
  
  const handleTransaction = async () => {
    await execute(async () => {
      // トランザクション内で複数の操作を実行
      await mutate('INSERT INTO users (name) VALUES (?)', ['ユーザー1']);
      await mutate('INSERT INTO users (name) VALUES (?)', ['ユーザー2']);
      await mutate('UPDATE settings SET value = ? WHERE key = ?', ['updated', 'last_update']);
      // エラーが発生すると自動的にロールバック
    });
  };
  
  return (
    <button onClick={handleTransaction} disabled={inTransaction}>
      トランザクション実行
    </button>
  );
}
```

### useQueryBuilder

クエリビルダーを使用してプログラマティックにクエリを構築します。

```typescript
function useQueryBuilder<T = any>(): {
  builder: QueryBuilder;
  execute: () => Promise<T[]>;
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}
```

#### 例

```tsx
function QueryBuilderExample() {
  const { builder, execute, data, loading } = useQueryBuilder();
  
  const handleSearch = async (filters: any) => {
    builder
      .select('id', 'name', 'email')
      .from('users')
      .where('age', '>', filters.minAge)
      .where('city', '=', filters.city)
      .orderBy('name', 'ASC')
      .limit(10);
    
    await execute();
  };
  
  return (
    <div>
      {/* フィルターUI */}
      <button onClick={() => handleSearch({ minAge: 20, city: '東京' })}>
        検索
      </button>
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

## 高度な使用方法

### カスタムフック

独自のデータフックを作成：

```tsx
function useUserData(userId: number) {
  const { data, loading, error } = useQuery(
    'SELECT * FROM users WHERE id = ?',
    [userId],
    {
      enabled: userId > 0,
      cacheTime: 300000 // 5分
    }
  );
  
  return {
    user: data?.[0] || null,
    loading,
    error
  };
}
```

### エラーバウンダリー

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>エラーが発生しました:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>再試行</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <DuckDBProvider autoConnect>
        <MyApp />
      </DuckDBProvider>
    </ErrorBoundary>
  );
}
```

### サスペンス対応

```tsx
const UserListLazy = React.lazy(() => import('./UserList'));

function App() {
  return (
    <DuckDBProvider autoConnect>
      <React.Suspense fallback={<div>読み込み中...</div>}>
        <UserListLazy />
      </React.Suspense>
    </DuckDBProvider>
  );
}
```

## TypeScript

### 型定義

```typescript
import type { 
  Connection,
  ResultSet,
  DuckDBError,
  QueryResult
} from '@northprint/duckdb-wasm-adapter-react';

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

function UserList() {
  const { data, loading, error } = useQuery<User>(
    'SELECT * FROM users'
  );
  
  // dataは User[] | null として型付けされる
  return (
    <ul>
      {data?.map(user => (
        <li key={user.id}>{user.name} ({user.age}歳)</li>
      ))}
    </ul>
  );
}
```

## パフォーマンス最適化

### メモ化

```tsx
import { useMemo } from 'react';

function ExpensiveComponent() {
  const { data } = useQuery('SELECT * FROM large_table');
  
  const processedData = useMemo(() => {
    if (!data) return [];
    // 重い処理
    return data.map(item => ({
      ...item,
      computed: expensiveComputation(item)
    }));
  }, [data]);
  
  return <DataGrid data={processedData} />;
}
```

### 遅延読み込み

```tsx
function LazyQueryComponent({ shouldLoad }) {
  const { data } = useQuery(
    'SELECT * FROM heavy_table',
    undefined,
    {
      enabled: shouldLoad // 条件付きで実行
    }
  );
  
  return <div>{/* ... */}</div>;
}
```

## トラブルシューティング

### よくある問題

1. **接続エラー**
   ```tsx
   // Web Workerの問題を回避
   <DuckDBProvider config={{ worker: false }}>
   ```

2. **メモリ不足**
   ```tsx
   // 大きなデータセットを分割して処理
   const { data: batch1 } = useQuery('SELECT * FROM users LIMIT 1000 OFFSET 0');
   const { data: batch2 } = useQuery('SELECT * FROM users LIMIT 1000 OFFSET 1000');
   ```

3. **キャッシュの問題**
   ```tsx
   // キャッシュを無効化
   const { data, refetch } = useQuery(query, params, {
     cacheTime: 0,
     staleTime: 0
   });
   ```