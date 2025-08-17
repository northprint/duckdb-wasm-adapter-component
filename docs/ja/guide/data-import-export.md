# データのインポート/エクスポート

DuckDB WASMアダプターは、様々な形式のデータインポート/エクスポートをサポートしています。

## サポートされる形式

| 形式 | インポート | エクスポート | 説明 |
|------|----------|------------|------|
| CSV | ✅ | ✅ | カンマ区切り値 |
| JSON | ✅ | ✅ | JavaScript Object Notation |
| Parquet | ✅ | ✅ | カラムナ形式の効率的なファイル |
| Arrow | ✅ | ✅ | Apache Arrowフォーマット |

## CSVのインポート

### 基本的な使い方

```javascript
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

const connection = await createConnection();

// ファイル入力から
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

await connection.importCSV(file, 'users', {
  header: true,
  delimiter: ','
});
```

### CSVオプション

```javascript
interface ImportCSVOptions {
  // ヘッダー行があるか（デフォルト: true）
  header?: boolean;
  
  // 区切り文字（デフォルト: ','）
  delimiter?: string;
  
  // スキップする行数
  skipRows?: number;
  
  // カラム名の配列（headerがfalseの場合に使用）
  columns?: string[];
  
  // NULL値を表す文字列
  nullString?: string;
  
  // 日付形式
  dateFormat?: string;
  
  // タイムスタンプ形式
  timestampFormat?: string;
  
  // 自動型検出（デフォルト: true）
  autoDetect?: boolean;
}
```

### 実例

#### 基本的なCSVインポート

```javascript
// users.csv
// name,email,age
// 田中太郎,tanaka@example.com,30
// 佐藤花子,sato@example.com,25

await connection.importCSV(file, 'users', {
  header: true,
  delimiter: ','
});

// データを確認
const result = await connection.execute('SELECT * FROM users');
console.log(result.toArray());
// [
//   { name: '田中太郎', email: 'tanaka@example.com', age: 30 },
//   { name: '佐藤花子', email: 'sato@example.com', age: 25 }
// ]
```

#### TSVファイルのインポート

```javascript
// タブ区切りファイル
await connection.importCSV(file, 'products', {
  header: true,
  delimiter: '\t'
});
```

#### ヘッダーなしCSV

```javascript
// ヘッダーがないCSVファイルの場合
await connection.importCSV(file, 'data', {
  header: false,
  columns: ['id', 'name', 'value', 'created_at']
});
```

#### 日本語を含むCSV

```javascript
// Shift-JISエンコードのファイルを扱う場合
const text = await file.text();
const decoder = new TextDecoder('shift-jis');
const decodedText = decoder.decode(await file.arrayBuffer());
const utf8File = new File([decodedText], file.name, { type: 'text/csv' });

await connection.importCSV(utf8File, 'japanese_data', {
  header: true
});
```

## JSONのインポート

### 基本的な使い方

```javascript
// JavaScriptオブジェクトから
const data = [
  { id: 1, name: '商品A', price: 1000 },
  { id: 2, name: '商品B', price: 2000 },
  { id: 3, name: '商品C', price: 3000 }
];

await connection.importJSON(data, 'products');
```

### ファイルからのインポート

```javascript
// JSONファイルから
const file = fileInput.files[0];
const text = await file.text();
const data = JSON.parse(text);

await connection.importJSON(data, 'imported_data');
```

### ネストされたJSON

```javascript
// ネストされたJSONの処理
const nestedData = [
  {
    id: 1,
    name: '田中太郎',
    address: {
      city: '東京',
      postal: '100-0001'
    },
    tags: ['VIP', 'プレミアム']
  }
];

// フラット化してインポート
const flatData = nestedData.map(item => ({
  id: item.id,
  name: item.name,
  city: item.address.city,
  postal: item.address.postal,
  tags: JSON.stringify(item.tags)
}));

await connection.importJSON(flatData, 'users');
```

### 大きなJSONファイル

```javascript
// ストリーミング処理（大きなファイル用）
async function importLargeJSON(file, tableName, batchSize = 1000) {
  const text = await file.text();
  const data = JSON.parse(text);
  
  // バッチ処理
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await connection.importJSON(batch, tableName);
  }
}
```

## Parquetのインポート/エクスポート

### Parquetインポート

```javascript
// Parquetファイルのインポート
const parquetFile = fileInput.files[0];
await connection.importParquet(parquetFile, 'analytics_data');

// インポートしたデータを確認
const result = await connection.execute('SELECT COUNT(*) FROM analytics_data');
console.log('レコード数:', result.toArray()[0].count);
```

### Parquetエクスポート

```javascript
// クエリ結果をParquet形式でエクスポート
const parquetBlob = await connection.exportParquet('SELECT * FROM large_table');

// ダウンロード
const url = URL.createObjectURL(parquetBlob);
const a = document.createElement('a');
a.href = url;
a.download = 'data.parquet';
a.click();
```

### Parquetの利点

- **高圧縮率** - CSVと比較して10分の1以下のサイズ
- **型情報の保持** - データ型が保存される
- **高速な読み込み** - カラムナ形式で効率的
- **大規模データ** - 大きなデータセットに最適

## CSVのエクスポート

### 基本的なエクスポート

```javascript
// クエリ結果をCSVとしてエクスポート
const csv = await connection.exportCSV('SELECT * FROM users', {
  header: true,
  delimiter: ','
});

// ファイルとしてダウンロード
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'users.csv';
link.click();
```

### エクスポートオプション

```javascript
interface ExportCSVOptions {
  // ヘッダー行を含むか（デフォルト: true）
  header?: boolean;
  
  // 区切り文字（デフォルト: ','）
  delimiter?: string;
  
  // 引用符文字（デフォルト: '"'）
  quote?: string;
  
  // NULL値の表現（デフォルト: ''）
  nullString?: string;
  
  // 日付フォーマット
  dateFormat?: string;
  
  // タイムスタンプフォーマット
  timestampFormat?: string;
}
```

### 実例

```javascript
// カスタム設定でエクスポート
const csv = await connection.exportCSV(
  'SELECT * FROM sales WHERE date >= ?',
  ['2024-01-01'],
  {
    header: true,
    delimiter: '\t',  // タブ区切り
    nullString: 'N/A',
    dateFormat: 'YYYY-MM-DD'
  }
);
```

## JSONのエクスポート

### 基本的なエクスポート

```javascript
// クエリ結果をJSONとしてエクスポート
const json = await connection.exportJSON('SELECT * FROM products');

// ファイルとしてダウンロード
const blob = new Blob([JSON.stringify(json, null, 2)], { 
  type: 'application/json' 
});
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'products.json';
link.click();
```

### カスタム変換

```javascript
// データを変換してエクスポート
const data = await connection.exportJSON('SELECT * FROM users');

const transformedData = data.map(user => ({
  ...user,
  fullName: `${user.firstName} ${user.lastName}`,
  age: new Date().getFullYear() - new Date(user.birthDate).getFullYear()
}));

// 変換後のデータをエクスポート
const json = JSON.stringify(transformedData, null, 2);
```

## バルクインポート

### 大量データの効率的なインポート

```javascript
async function bulkImport(files, tableName) {
  const connection = await createConnection();
  
  // トランザクション開始
  await connection.execute('BEGIN TRANSACTION');
  
  try {
    // テーブル作成（最初のファイルから推測）
    await connection.importCSV(files[0], tableName, {
      header: true,
      createTable: true
    });
    
    // 残りのファイルをインポート
    for (let i = 1; i < files.length; i++) {
      await connection.importCSV(files[i], tableName, {
        header: true,
        createTable: false  // テーブルは既に存在
      });
    }
    
    // コミット
    await connection.execute('COMMIT');
    console.log(`${files.length}ファイルのインポート完了`);
    
  } catch (error) {
    // ロールバック
    await connection.execute('ROLLBACK');
    console.error('インポートエラー:', error);
    throw error;
  }
}
```

## フレームワーク統合

### React

```jsx
import { useImport, useExport } from '@northprint/duckdb-wasm-adapter-react';

function DataManager() {
  const { importCSV, importJSON, importing, error: importError } = useImport();
  const { exportCSV, exportJSON, exporting, error: exportError } = useExport();
  
  const handleCSVImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    await importCSV(file, 'imported_data', {
      header: true
    });
  };
  
  const handleExportCSV = async () => {
    const csv = await exportCSV('SELECT * FROM users');
    downloadFile(csv, 'users.csv', 'text/csv');
  };
  
  return (
    <div>
      <h3>インポート</h3>
      <input type="file" accept=".csv" onChange={handleCSVImport} />
      {importing && <p>インポート中...</p>}
      {importError && <p>エラー: {importError.message}</p>}
      
      <h3>エクスポート</h3>
      <button onClick={handleExportCSV} disabled={exporting}>
        CSVエクスポート
      </button>
      {exporting && <p>エクスポート中...</p>}
      {exportError && <p>エラー: {exportError.message}</p>}
    </div>
  );
}
```

### Vue

```vue
<template>
  <div>
    <h3>データインポート</h3>
    <input 
      type="file" 
      accept=".csv,.json"
      @change="handleFileImport"
      :disabled="importing"
    >
    
    <h3>データエクスポート</h3>
    <button @click="exportToCSV" :disabled="exporting">
      CSVエクスポート
    </button>
    <button @click="exportToJSON" :disabled="exporting">
      JSONエクスポート
    </button>
    
    <p v-if="importing || exporting">処理中...</p>
    <p v-if="error" class="error">{{ error.message }}</p>
  </div>
</template>

<script setup>
import { useImport, useExport } from '@northprint/duckdb-wasm-adapter-vue';

const { importCSV, importJSON, importing, error: importError } = useImport();
const { exportCSV, exportJSON, exporting, error: exportError } = useExport();

const error = computed(() => importError.value || exportError.value);

const handleFileImport = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.name.endsWith('.csv')) {
    await importCSV(file, 'imported_data', { header: true });
  } else if (file.name.endsWith('.json')) {
    const text = await file.text();
    const data = JSON.parse(text);
    await importJSON(data, 'imported_data');
  }
};

const exportToCSV = async () => {
  const csv = await exportCSV('SELECT * FROM users');
  downloadFile(csv, 'users.csv', 'text/csv');
};

const exportToJSON = async () => {
  const json = await exportJSON('SELECT * FROM users');
  downloadFile(JSON.stringify(json), 'users.json', 'application/json');
};
</script>
```

### Svelte

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  
  let importing = false;
  let exporting = false;
  let error = null;
  
  async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    importing = true;
    error = null;
    
    try {
      if (file.name.endsWith('.csv')) {
        await db.importCSV(file, 'imported_data', { header: true });
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        await db.importJSON(data, 'imported_data');
      } else if (file.name.endsWith('.parquet')) {
        await db.importParquet(file, 'imported_data');
      }
    } catch (e) {
      error = e;
    } finally {
      importing = false;
    }
  }
  
  async function exportData(format) {
    exporting = true;
    error = null;
    
    try {
      let data, filename, mimeType;
      
      if (format === 'csv') {
        data = await db.exportCSV('SELECT * FROM users');
        filename = 'users.csv';
        mimeType = 'text/csv';
      } else if (format === 'json') {
        const json = await db.exportJSON('SELECT * FROM users');
        data = JSON.stringify(json, null, 2);
        filename = 'users.json';
        mimeType = 'application/json';
      }
      
      downloadFile(data, filename, mimeType);
    } catch (e) {
      error = e;
    } finally {
      exporting = false;
    }
  }
</script>

<div>
  <h3>インポート</h3>
  <input 
    type="file" 
    accept=".csv,.json,.parquet"
    on:change={handleImport}
    disabled={importing}
  >
  
  <h3>エクスポート</h3>
  <button on:click={() => exportData('csv')} disabled={exporting}>
    CSV
  </button>
  <button on:click={() => exportData('json')} disabled={exporting}>
    JSON
  </button>
  
  {#if importing || exporting}
    <p>処理中...</p>
  {/if}
  
  {#if error}
    <p class="error">{error.message}</p>
  {/if}
</div>
```

## パフォーマンスのヒント

### 大きなファイルの処理

```javascript
// 10MB以上のファイルは自動的にファイル登録を使用
const largeFile = new File([...], 'large.csv', { type: 'text/csv' });

if (largeFile.size > 10 * 1024 * 1024) {
  // DuckDBのファイル登録システムを使用
  await connection.registerFile(largeFile);
  await connection.execute(`
    CREATE TABLE large_data AS 
    SELECT * FROM read_csv_auto('${largeFile.name}')
  `);
} else {
  // 通常のインポート
  await connection.importCSV(largeFile, 'large_data');
}
```

### ストリーミング処理

```javascript
// 大きなエクスポートをストリーミング
async function* streamExport(query, batchSize = 1000) {
  let offset = 0;
  
  while (true) {
    const batch = await connection.execute(
      `${query} LIMIT ${batchSize} OFFSET ${offset}`
    );
    
    const data = batch.toArray();
    if (data.length === 0) break;
    
    yield data;
    offset += batchSize;
  }
}

// 使用例
for await (const batch of streamExport('SELECT * FROM huge_table')) {
  // バッチごとに処理
  processBatch(batch);
}
```

## エラーハンドリング

```javascript
try {
  await connection.importCSV(file, 'data');
} catch (error) {
  if (error.code === 'INVALID_FORMAT') {
    console.error('ファイル形式が無効です');
  } else if (error.code === 'MEMORY_LIMIT') {
    console.error('メモリ不足です');
  } else if (error.code === 'DUPLICATE_COLUMN') {
    console.error('重複するカラム名があります');
  } else {
    console.error('インポートエラー:', error);
  }
}
```

## まとめ

DuckDB WASMアダプターは、様々な形式のデータインポート/エクスポートを簡単に行えます。適切な形式を選択することで、パフォーマンスとストレージ効率を最適化できます。