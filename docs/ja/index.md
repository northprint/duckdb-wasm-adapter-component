---
layout: home

hero:
  name: "DuckDB WASM アダプター"
  text: "ブラウザで動作する高速SQLデータベース"
  tagline: React、Vue、Svelte向けのモダンなDuckDBアダプター
  image:
    src: /hero-image.svg
    alt: DuckDB WASM Adapter
  actions:
    - theme: brand
      text: はじめる
      link: /ja/guide/getting-started
    - theme: alt
      text: API ドキュメント
      link: /ja/api/core
    - theme: alt
      text: GitHub
      link: https://github.com/northprint/duckdb-wasm-adapter-component

features:
  - icon: 🚀
    title: ゼロ設定
    details: 自動WASM読み込みで、すぐに使い始められます。複雑な設定は不要です。
    
  - icon: 🔧
    title: フレームワーク対応
    details: React、Vue、Svelteのネイティブ統合。お好みのフレームワークで使用できます。
    
  - icon: 📊
    title: ブラウザ内分析
    details: サーバーとの通信なしでデータを処理。高速なクライアントサイド分析を実現。
    
  - icon: 🔒
    title: 型安全
    details: 完全なTypeScriptサポートで、開発時の安全性と生産性を向上。
    
  - icon: ⚡
    title: 高パフォーマンス
    details: 大規模データセット用に最適化。クエリキャッシングで更なる高速化。
    
  - icon: 📦
    title: インポート/エクスポート
    details: CSV、JSON、Parquet形式をサポート。データの入出力が簡単。
---

## クイックスタート

### React

```bash
npm install @northprint/duckdb-wasm-adapter-react
```

```jsx
import { DuckDBProvider, useQuery } from '@northprint/duckdb-wasm-adapter-react';

function App() {
  return (
    <DuckDBProvider autoConnect>
      <DataTable />
    </DuckDBProvider>
  );
}

function DataTable() {
  const { data, loading, error } = useQuery('SELECT * FROM users');
  
  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;
  
  return (
    <table>
      {data?.map(row => (
        <tr key={row.id}>
          <td>{row.name}</td>
          <td>{row.email}</td>
        </tr>
      ))}
    </table>
  );
}
```

### Vue

```bash
npm install @northprint/duckdb-wasm-adapter-vue
```

```vue
<template>
  <div>
    <div v-if="loading">読み込み中...</div>
    <div v-else-if="error">エラー: {{ error.message }}</div>
    <table v-else>
      <tr v-for="row in data" :key="row.id">
        <td>{{ row.name }}</td>
        <td>{{ row.email }}</td>
      </tr>
    </table>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading, error } = useQuery('SELECT * FROM users');
</script>
```

### Svelte

```bash
npm install @northprint/duckdb-wasm-adapter-svelte
```

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  $: users = db.query('SELECT * FROM users');
</script>

{#if $users.loading}
  <p>読み込み中...</p>
{:else if $users.error}
  <p>エラー: {$users.error.message}</p>
{:else}
  <table>
    {#each $users.data as user}
      <tr>
        <td>{user.name}</td>
        <td>{user.email}</td>
      </tr>
    {/each}
  </table>
{/if}
```

## 主な機能

### 🔍 SQLクエリの実行
ブラウザ内で直接SQLクエリを実行。パラメーターバインディングでSQLインジェクションを防止。

### 📁 データのインポート/エクスポート
CSV、JSON、Parquetファイルの読み込みと書き出しをサポート。

### 🏗️ クエリビルダー
プログラマティックにクエリを構築。型安全で直感的なAPI。

### 💾 キャッシング
自動的なクエリ結果のキャッシング。パフォーマンスを大幅に向上。

### 🎯 デバッグモード
詳細なログ出力とパフォーマンス測定で開発を支援。

### 🌐 空間拡張
GIS機能とPostGIS互換の空間クエリをサポート。

## なぜDuckDB WASMアダプター？

### 問題
- サーバーサイドでのデータ処理はネットワーク遅延が発生
- 大量のデータ転送はコストが高い
- リアルタイム分析には不向き

### 解決策
DuckDB WASMアダプターは、ブラウザ内で完結するデータ処理を実現：
- **ゼロレイテンシー**: サーバー通信なし
- **プライバシー**: データがブラウザから出ない
- **コスト削減**: サーバーリソース不要
- **高速**: ネイティブに近いパフォーマンス

## パッケージ

| パッケージ | バージョン | 説明 |
|---------|---------|------|
| [@northprint/duckdb-wasm-adapter-core](https://www.npmjs.com/package/@northprint/duckdb-wasm-adapter-core) | ![npm](https://img.shields.io/npm/v/@northprint/duckdb-wasm-adapter-core) | コアライブラリ |
| [@northprint/duckdb-wasm-adapter-react](https://www.npmjs.com/package/@northprint/duckdb-wasm-adapter-react) | ![npm](https://img.shields.io/npm/v/@northprint/duckdb-wasm-adapter-react) | React統合 |
| [@northprint/duckdb-wasm-adapter-vue](https://www.npmjs.com/package/@northprint/duckdb-wasm-adapter-vue) | ![npm](https://img.shields.io/npm/v/@northprint/duckdb-wasm-adapter-vue) | Vue統合 |
| [@northprint/duckdb-wasm-adapter-svelte](https://www.npmjs.com/package/@northprint/duckdb-wasm-adapter-svelte) | ![npm](https://img.shields.io/npm/v/@northprint/duckdb-wasm-adapter-svelte) | Svelte統合 |

## リンク

- 📚 [ドキュメント](https://northprint.github.io/duckdb-wasm-adapter-component/)
- 💻 [GitHub](https://github.com/northprint/duckdb-wasm-adapter-component)
- 📦 [NPMパッケージ](https://www.npmjs.com/package/@northprint/duckdb-wasm-adapter-core)
- 🐛 [イシュー](https://github.com/northprint/duckdb-wasm-adapter-component/issues)
- 📄 [ライセンス](https://github.com/northprint/duckdb-wasm-adapter-component/blob/main/LICENSE)