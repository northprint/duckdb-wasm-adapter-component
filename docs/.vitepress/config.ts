import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'DuckDB WASM Adapter',
  description: 'A powerful adapter for using DuckDB WASM in React, Vue, and Svelte applications',
  base: '/duckdb-wasm-adapter-component/',
  
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/duckdb-wasm-adapter-component/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#654FF0' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'DuckDB WASM Adapter' }],
    ['meta', { name: 'og:image', content: '/duckdb-wasm-adapter-component/hero-banner.svg' }],
  ],

  themeConfig: {
    logo: '/duck-logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/core' },
      { text: 'Examples', link: '/examples/' },
      {
        text: 'Frameworks',
        items: [
          { text: 'React', link: '/frameworks/react' },
          { text: 'Vue', link: '/frameworks/vue' },
          { text: 'Svelte', link: '/frameworks/svelte' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Basic Usage', link: '/guide/basic-usage' },
            { text: 'Concepts', link: '/guide/concepts' }
          ]
        },
        {
          text: 'Features',
          items: [
            { text: 'Query Execution', link: '/guide/query-execution' },
            { text: 'Data Import/Export', link: '/guide/data-import-export' },
            { text: 'Query Builder', link: '/guide/query-builder' },
            { text: 'Caching', link: '/guide/caching' },
            { text: 'Debug Mode', link: '/guide/debug-mode' },
            { text: 'Spatial Extension', link: '/guide/spatial' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'WASM Considerations', link: '/guide/wasm-considerations' },
            { text: 'Performance', link: '/guide/performance' },
            { text: 'Error Handling', link: '/guide/error-handling' },
            { text: 'TypeScript', link: '/guide/typescript' },
            { text: 'Best Practices', link: '/guide/best-practices' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'Core',
          items: [
            { text: 'Overview', link: '/api/core' },
            { text: 'Connection', link: '/api/connection' },
            { text: 'Query', link: '/api/query' },
            { text: 'Import/Export', link: '/api/import-export' },
            { text: 'Query Builder', link: '/api/query-builder-api' },
            { text: 'Cache', link: '/api/cache' },
            { text: 'Debug', link: '/api/debug' },
            { text: 'Types', link: '/api/types' }
          ]
        },
        {
          text: 'React',
          items: [
            { text: 'Provider', link: '/api/react/provider' },
            { text: 'Hooks', link: '/api/react/hooks' },
            { text: 'Context', link: '/api/react/context' }
          ]
        },
        {
          text: 'Vue',
          items: [
            { text: 'Plugin', link: '/api/vue/plugin' },
            { text: 'Composables', link: '/api/vue/composables' }
          ]
        },
        {
          text: 'Svelte',
          items: [
            { text: 'Stores', link: '/api/svelte/stores' },
            { text: 'Actions', link: '/api/svelte/actions' }
          ]
        }
      ],
      '/frameworks/': [
        {
          text: 'Framework Guides',
          items: [
            { text: 'React', link: '/frameworks/react' },
            { text: 'Vue', link: '/frameworks/vue' },
            { text: 'Svelte', link: '/frameworks/svelte' }
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Basic Queries', link: '/examples/basic-queries' },
            { text: 'Data Import', link: '/examples/data-import' },
            { text: 'Query Builder', link: '/examples/query-builder-examples' },
            { text: 'Caching', link: '/examples/caching-examples' },
            { text: 'Spatial Queries', link: '/examples/spatial-examples' },
            { text: 'Full Applications', link: '/examples/full-apps' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/northprint/duckdb-wasm-adapter-component' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/@duckdb-wasm-adapter/core' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 DuckDB WASM Adapter'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/northprint/duckdb-wasm-adapter-component/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
})