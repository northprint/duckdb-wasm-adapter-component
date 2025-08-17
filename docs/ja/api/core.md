# Core API リファレンス

DuckDB WASM Adapter Coreライブラリの完全なAPIリファレンスです。

## インストール

```bash
npm install @northprint/duckdb-wasm-adapter-core
```

## 基本的な使い方

```typescript
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

// 接続を作成
const connection = await createConnection();

// クエリを実行
const result = await connection.execute('SELECT * FROM users');
const data = result.toArray();
```

## API

### createConnection(config?, events?)

新しいデータベース接続を作成します。

#### パラメーター

##### config (オプション)
接続設定オブジェクト：

```typescript
interface ConnectionConfig {
  // Web Workerを使用するか
  worker?: boolean;  // デフォルト: true
  
  // ログレベル
  logLevel?: 'silent' | 'error' | 'warning' | 'info' | 'debug';
  
  // クエリ設定
  query?: {
    castBigIntToDouble?: boolean;
    castDecimalToDouble?: boolean;
    castTimestampToDate?: boolean;
  };
  
  // データベースパス
  path?: string;
  
  // キャッシュ設定
  cache?: {
    enabled?: boolean;
    maxEntries?: number;
    ttl?: number;
  };
  
  // デバッグモード
  debug?: {
    enabled?: boolean;
    logQueries?: boolean;
    logTiming?: boolean;
  };
}
```

##### events (オプション)
イベントハンドラーオブジェクト：

```typescript
interface ConnectionEvents {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onQuery?: (sql: string, duration: number) => void;
}
```

#### 戻り値

`Promise<Connection>` - 接続オブジェクト

#### 例

```typescript
const connection = await createConnection({
  worker: true,
  logLevel: 'warning',
  cache: {
    enabled: true,
    maxEntries: 100,
    ttl: 60000 // 1分
  }
}, {
  onConnect: () => console.log('接続しました'),
  onError: (error) => console.error('エラー:', error),
  onQuery: (sql, duration) => console.log(`クエリ実行時間: ${duration}ms`)
});
```

## Connection クラス

### メソッド

#### execute(query, params?)

SQLクエリを実行します。

```typescript
execute(query: string, params?: any[]): Promise<ResultSet>
```

##### パラメーター
- `query` - 実行するSQLクエリ
- `params` - パラメーターバインディング用の値の配列

##### 戻り値
`Promise<ResultSet>` - 結果セット

##### 例

```typescript
// シンプルなクエリ
const result = await connection.execute('SELECT * FROM users');

// パラメーター付きクエリ
const result = await connection.execute(
  'SELECT * FROM users WHERE age > ? AND city = ?',
  [18, '東京']
);
```

#### importCSV(file, tableName, options?)

CSVファイルをテーブルにインポートします。

```typescript
importCSV(
  file: File,
  tableName: string,
  options?: ImportCSVOptions
): Promise<void>
```

##### パラメーター
- `file` - CSVファイル
- `tableName` - インポート先のテーブル名
- `options` - インポートオプション

##### ImportCSVOptions

```typescript
interface ImportCSVOptions {
  header?: boolean;        // ヘッダー行があるか（デフォルト: true）
  delimiter?: string;      // 区切り文字（デフォルト: ','）
  skipRows?: number;       // スキップする行数
  columns?: string[];      // カラム名の配列
  nullString?: string;     // NULL値を表す文字列
}
```

##### 例

```typescript
await connection.importCSV(file, 'users', {
  header: true,
  delimiter: ',',
  nullString: 'NULL'
});
```

#### importJSON(data, tableName)

JSONデータをテーブルにインポートします。

```typescript
importJSON(data: any[], tableName: string): Promise<void>
```

##### 例

```typescript
const data = [
  { id: 1, name: '田中', age: 30 },
  { id: 2, name: '佐藤', age: 25 }
];

await connection.importJSON(data, 'users');
```

#### importParquet(file, tableName)

Parquetファイルをテーブルにインポートします。

```typescript
importParquet(file: File, tableName: string): Promise<void>
```

#### exportCSV(query, options?)

クエリ結果をCSV形式でエクスポートします。

```typescript
exportCSV(query: string, options?: ExportCSVOptions): Promise<string>
```

##### ExportCSVOptions

```typescript
interface ExportCSVOptions {
  header?: boolean;        // ヘッダー行を含むか
  delimiter?: string;      // 区切り文字
}
```

##### 例

```typescript
const csv = await connection.exportCSV('SELECT * FROM users', {
  header: true,
  delimiter: ','
});
```

#### exportJSON(query)

クエリ結果をJSON形式でエクスポートします。

```typescript
exportJSON(query: string): Promise<any[]>
```

##### 例

```typescript
const json = await connection.exportJSON('SELECT * FROM users');
console.log(json); // [{ id: 1, name: '田中' }, ...]
```

#### close()

データベース接続を閉じます。

```typescript
close(): Promise<void>
```

## ResultSet クラス

クエリ結果を表すクラスです。

### メソッド

#### toArray()

結果をオブジェクトの配列に変換します。

```typescript
toArray(): any[]
```

##### 例

```typescript
const result = await connection.execute('SELECT * FROM users');
const data = result.toArray();
// [{ id: 1, name: '田中' }, { id: 2, name: '佐藤' }]
```

#### getMetadata()

カラムのメタデータを取得します。

```typescript
getMetadata(): ColumnMetadata[]
```

##### ColumnMetadata

```typescript
interface ColumnMetadata {
  name: string;          // カラム名
  type: DuckDBType;      // データ型
  nullable: boolean;     // NULL許可
}
```

##### 例

```typescript
const metadata = result.getMetadata();
// [
//   { name: 'id', type: 'INTEGER', nullable: false },
//   { name: 'name', type: 'VARCHAR', nullable: true }
// ]
```

#### [Symbol.iterator]()

結果をイテレート可能にします。

```typescript
for (const row of result) {
  console.log(row);
}
```

## エラー処理

### DuckDBError

DuckDB固有のエラークラスです。

```typescript
import { DuckDBError, ErrorCode } from '@northprint/duckdb-wasm-adapter-core';

try {
  await connection.execute('INVALID SQL');
} catch (error) {
  if (error instanceof DuckDBError) {
    switch (error.code) {
      case ErrorCode.QUERY_FAILED:
        console.error('クエリ失敗:', error.message);
        break;
      case ErrorCode.CONNECTION_FAILED:
        console.error('接続失敗:', error.message);
        break;
      default:
        console.error('不明なエラー:', error);
    }
  }
}
```

### エラーコード

| コード | 説明 |
|-------|------|
| `CONNECTION_FAILED` | 接続の確立に失敗 |
| `QUERY_FAILED` | クエリ実行に失敗 |
| `IMPORT_FAILED` | データインポートに失敗 |
| `EXPORT_FAILED` | データエクスポートに失敗 |
| `INVALID_PARAMS` | 無効なパラメーター |
| `NOT_CONNECTED` | 接続が必要な操作 |
| `MEMORY_LIMIT` | メモリ制限を超過 |

## 型定義

### DuckDBType

DuckDBでサポートされるデータ型：

```typescript
type DuckDBType = 
  | 'BOOLEAN'
  | 'TINYINT'
  | 'SMALLINT'
  | 'INTEGER'
  | 'BIGINT'
  | 'FLOAT'
  | 'DOUBLE'
  | 'DECIMAL'
  | 'VARCHAR'
  | 'DATE'
  | 'TIME'
  | 'TIMESTAMP'
  | 'INTERVAL'
  | 'BLOB'
  | 'LIST'
  | 'STRUCT'
  | 'MAP'
  | 'UNION';
```

## 高度な使用方法

### トランザクション

```typescript
await connection.execute('BEGIN TRANSACTION');
try {
  await connection.execute('INSERT INTO users VALUES (?, ?)', [1, '田中']);
  await connection.execute('UPDATE users SET status = ? WHERE id = ?', ['active', 1]);
  await connection.execute('COMMIT');
} catch (error) {
  await connection.execute('ROLLBACK');
  throw error;
}
```

### バッチ操作

```typescript
const queries = [
  { sql: 'INSERT INTO users VALUES (?, ?)', params: [1, '田中'] },
  { sql: 'INSERT INTO users VALUES (?, ?)', params: [2, '佐藤'] },
  { sql: 'INSERT INTO users VALUES (?, ?)', params: [3, '鈴木'] }
];

await connection.execute('BEGIN TRANSACTION');
for (const { sql, params } of queries) {
  await connection.execute(sql, params);
}
await connection.execute('COMMIT');
```

### 大きなファイルの処理

10MB以上のファイルは自動的にファイル登録を使用します：

```typescript
const largeFile = new File([...], 'large.csv', { type: 'text/csv' });
await connection.importCSV(largeFile, 'large_table');
// 自動的に効率的な方法で処理されます
```

## パフォーマンスのヒント

1. **Web Workerを使用** - UIスレッドのブロックを防ぐ
2. **パラメーターバインディング** - SQLインジェクション防止とパフォーマンス向上
3. **バッチ操作** - 複数の操作にはトランザクションを使用
4. **メモリ管理** - 不要な接続は閉じる
5. **クエリ最適化** - 適切なインデックスとクエリ最適化を使用

## ブラウザ互換性

- Chrome 90+
- Firefox 89+
- Safari 15+
- Edge 90+

必要な機能：
- WebAssembly
- Web Workers（推奨）
- BigInt
- Apache Arrow