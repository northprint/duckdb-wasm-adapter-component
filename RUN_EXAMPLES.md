# DuckDB WASM Adapter - サンプル実行ガイド

## 🚀 クイックスタート

### 1. 依存関係のインストール

```bash
# プロジェクトルートで実行
pnpm install
```

### 2. 全パッケージのビルド

```bash
# 全パッケージをビルド
pnpm build
```

### 3. サンプルアプリケーションの実行

#### Svelteサンプル

```bash
# 方法1: プロジェクトルートから
pnpm --filter svelte-duckdb-example dev

# 方法2: 直接ディレクトリで実行
cd examples/svelte-example
pnpm dev
```

アクセス: http://localhost:5173

#### Reactサンプル

```bash
# 方法1: プロジェクトルートから
pnpm --filter react-duckdb-example dev

# 方法2: 直接ディレクトリで実行
cd examples/react-example
pnpm dev
```

アクセス: http://localhost:5174

#### Vueサンプル

```bash
# 方法1: プロジェクトルートから
pnpm --filter vue-duckdb-example dev

# 方法2: 直接ディレクトリで実行
cd examples/vue-example
pnpm dev
```

アクセス: http://localhost:5175

## 📋 機能一覧

各サンプルアプリケーションで以下の機能を試せます：

### 基本機能
1. **接続管理**
   - 「Connect」ボタンでデータベースに接続
   - ステータス表示で接続状態を確認

2. **サンプルデータ作成**
   - 自動的に従業員テーブルが作成されます
   - 5件のサンプルデータが挿入されます

3. **クエリ実行**
   - Query Editorにお好きなSQLを入力
   - 「Execute Query」で実行
   - 結果がテーブル形式で表示されます

### サンプルクエリ

以下のボタンをクリックして、よく使うクエリを実行できます：

- **All Employees** - 全従業員を表示
- **High Earners** - 給与8万ドル以上の従業員
- **Avg Salary by Dept** - 部門別平均給与
- **Recent Hires** - 最近雇用された3名

### インポート/エクスポート

1. **データインポート**
   - CSVまたはJSONファイルを選択
   - テーブル名を指定
   - 「Import」ボタンでインポート

2. **データエクスポート**
   - 「Export as CSV」でCSV形式でダウンロード
   - 「Export as JSON」でJSON形式でダウンロード

## 🎯 試してみるクエリ例

```sql
-- 全データを見る
SELECT * FROM employees;

-- 条件で絞り込み
SELECT * FROM employees WHERE salary > 80000;

-- 集計
SELECT department, COUNT(*) as count, AVG(salary) as avg_salary 
FROM employees 
GROUP BY department;

-- ソート
SELECT name, salary 
FROM employees 
ORDER BY salary DESC;

-- 新しいテーブル作成
CREATE TABLE products (
    id INTEGER,
    name VARCHAR,
    price DECIMAL(10,2)
);

-- データ挿入
INSERT INTO products VALUES 
    (1, 'Laptop', 999.99),
    (2, 'Mouse', 29.99);
```

## 🐛 トラブルシューティング

### エラー: "Not connected to database"
→ 「Connect」ボタンをクリックして接続してください

### エラー: "Table does not exist"
→ サンプルデータが作成されるまで少し待つか、ページをリロードしてください

### ビルドエラー
```bash
# クリーンビルド
pnpm clean
pnpm install
pnpm build
```

### ポートが使用中
```bash
# 別のポートで起動
cd examples/svelte-example
pnpm dev --port 3000
```

## 📦 簡易テスト用HTMLファイル

ブラウザで直接テストしたい場合は、`test-example.html`をブラウザで開いてください：

```bash
# Pythonの簡易サーバーで起動
python3 -m http.server 8000

# または Node.jsのサーバー
npx serve .
```

http://localhost:8000/test-example.html にアクセス

## 🔧 開発モード

ライブラリを修正しながら開発する場合：

```bash
# ライブラリをウォッチモードでビルド
cd packages/core
pnpm dev

# 別ターミナルでサンプルを起動
cd examples/svelte-example
pnpm dev
```

## 📚 詳細ドキュメント

- [メインREADME](./README.md)
- [Core Library API](./packages/core/README.md)
- [Svelte Adapter API](./packages/svelte-adapter/README.md)
- [React Adapter API](./packages/react-adapter/README.md)
- [Vue Adapter API](./packages/vue-adapter/README.md)
- [Examples README](./examples/README.md)