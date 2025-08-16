# WASM Considerations

Important considerations and limitations when using DuckDB WASM in the browser.

## Overview

DuckDB WASM runs entirely in the browser, which provides many benefits but also comes with specific limitations and considerations that differ from server-side databases.

## Memory Management

### Browser Memory Limits

```javascript
// ⚠️ IMPORTANT: Browser memory is limited
// Typical limits:
// - Chrome: ~2GB-4GB per tab
// - Firefox: ~2GB per tab  
// - Safari: ~1GB-2GB per tab

// Monitor memory usage
function checkMemoryUsage() {
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize;
    const limit = performance.memory.jsHeapSizeLimit;
    const percentage = (used / limit) * 100;
    
    console.log(`Memory: ${(used / 1024 / 1024).toFixed(2)}MB / ${(limit / 1024 / 1024).toFixed(2)}MB (${percentage.toFixed(1)}%)`);
    
    if (percentage > 80) {
      console.warn('⚠️ High memory usage detected');
      // Consider clearing caches or reducing data
    }
  }
}

// Set memory configuration
const config = {
  maximumMemory: 512 * 1024 * 1024, // 512MB limit
  query: {
    // Limit result set sizes
    maxRowsReturned: 100000,
    timeout: 30000 // 30 second timeout
  }
};
```

### Memory-Efficient Queries

```javascript
// ❌ BAD: Loading entire large table into memory
const allData = await connection.execute('SELECT * FROM huge_table');

// ✅ GOOD: Use LIMIT and pagination
const pageSize = 1000;
const page = 0;
const data = await connection.execute(`
  SELECT * FROM huge_table 
  LIMIT ${pageSize} 
  OFFSET ${page * pageSize}
`);

// ✅ GOOD: Aggregate on database side
const summary = await connection.execute(`
  SELECT 
    COUNT(*) as total,
    AVG(value) as avg_value
  FROM huge_table
`);

// ✅ GOOD: Stream processing for large exports
async function* streamQuery(sql, batchSize = 1000) {
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const batch = await connection.execute(`
      ${sql} 
      LIMIT ${batchSize} 
      OFFSET ${offset}
    `);
    
    if (batch.length < batchSize) {
      hasMore = false;
    }
    
    yield batch;
    offset += batchSize;
    
    // Give browser time to garbage collect
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

// Usage
for await (const batch of streamQuery('SELECT * FROM large_table')) {
  processBatch(batch);
}
```

## File System Limitations

### No Direct File System Access

```javascript
// ⚠️ WASM cannot directly access the local file system

// ❌ This won't work in WASM
await connection.execute("COPY users FROM '/path/to/file.csv'");

// ✅ Use File API instead
async function importLocalFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Register file with DuckDB
  await connection.registerFileBuffer(file.name, uint8Array);
  
  // Now you can use it
  await connection.execute(`
    CREATE TABLE users AS 
    SELECT * FROM read_csv_auto('${file.name}')
  `);
  
  // Clean up
  await connection.dropFile(file.name);
}

// ✅ Handle file uploads properly
function FileUploadComponent() {
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    
    // Check file size before loading
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      alert('File too large. Please use a file smaller than 100MB');
      return;
    }
    
    await importLocalFile(file);
  };
  
  return <input type="file" onChange={handleFileSelect} />;
}
```

### Virtual File System

```javascript
// DuckDB WASM uses a virtual file system
// Files must be registered before use

// Register multiple files
async function registerFiles(files) {
  for (const file of files) {
    const buffer = await file.arrayBuffer();
    await connection.registerFileBuffer(
      file.name,
      new Uint8Array(buffer)
    );
  }
}

// Create persistent storage using IndexedDB
class PersistentStorage {
  constructor() {
    this.dbName = 'duckdb-storage';
  }
  
  async saveFile(name, data) {
    const db = await this.openDB();
    const tx = db.transaction(['files'], 'readwrite');
    await tx.objectStore('files').put({ name, data });
  }
  
  async loadFile(name) {
    const db = await this.openDB();
    const tx = db.transaction(['files'], 'readonly');
    const result = await tx.objectStore('files').get(name);
    return result?.data;
  }
  
  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'name' });
        }
      };
    });
  }
}
```

## Performance Considerations

### Single-Threaded Limitations

```javascript
// ⚠️ WASM runs in the browser's main thread by default
// Long-running queries can freeze the UI

// ❌ BAD: Blocking query on main thread
async function blockingQuery() {
  // This will freeze the UI
  const result = await connection.execute(`
    SELECT * FROM huge_table 
    JOIN another_huge_table ON complex_condition
  `);
}

// ✅ GOOD: Use Web Workers
const worker = new Worker('duckdb-worker.js');

function queryInWorker(sql, params) {
  return new Promise((resolve, reject) => {
    const id = Math.random();
    
    worker.postMessage({ id, sql, params });
    
    worker.addEventListener('message', function handler(e) {
      if (e.data.id === id) {
        worker.removeEventListener('message', handler);
        
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.result);
        }
      }
    });
  });
}

// duckdb-worker.js
import * as duckdb from '@duckdb/duckdb-wasm';

let connection;

self.addEventListener('message', async (e) => {
  const { id, sql, params } = e.data;
  
  if (!connection) {
    const MANUAL_BUNDLES = {
      mvp: {
        mainModule: './duckdb-mvp.wasm',
        mainWorker: './duckdb-browser-mvp.worker.js',
      },
      eh: {
        mainModule: './duckdb-eh.wasm',
        mainWorker: './duckdb-browser-eh.worker.js',
      },
    };
    
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    const worker = new Worker(bundle.mainWorker);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule);
    connection = await db.connect();
  }
  
  try {
    const result = await connection.query(sql, params);
    self.postMessage({ id, result: result.toArray() });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
});
```

### Query Optimization for WASM

```javascript
// ⚠️ Some operations are slower in WASM

// 1. Minimize data transfers
// ❌ BAD: Multiple round trips
for (const id of ids) {
  const result = await connection.execute(
    'SELECT * FROM users WHERE id = ?', [id]
  );
}

// ✅ GOOD: Single query
const result = await connection.execute(
  'SELECT * FROM users WHERE id = ANY(?)', [ids]
);

// 2. Use appropriate data types
// ❌ BAD: Large strings in WASM
CREATE TABLE logs (
  message VARCHAR(10000000) -- Very large strings
);

// ✅ GOOD: Reasonable sizes
CREATE TABLE logs (
  message VARCHAR(1000),
  details JSON -- Store structured data as JSON
);

// 3. Index strategically
// ✅ Create indexes for frequently queried columns
await connection.execute(`
  CREATE INDEX idx_users_email ON users(email);
  CREATE INDEX idx_orders_date ON orders(order_date);
`);

// 4. Avoid complex string operations
// ❌ BAD: Heavy string processing in SQL
SELECT 
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      LOWER(description),
      '[^a-z0-9]', ' '
    ),
    '\\s+', ' '
  ) as cleaned
FROM products;

// ✅ GOOD: Process in JavaScript after query
const results = await connection.execute('SELECT description FROM products');
const cleaned = results.map(row => 
  row.description
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
);
```

## Cross-Origin Restrictions

### CORS and Remote Files

```javascript
// ⚠️ CORS restrictions apply to remote file access

// ❌ This may fail due to CORS
await connection.execute(`
  CREATE TABLE data AS 
  SELECT * FROM read_parquet('https://example.com/data.parquet')
`);

// ✅ Handle CORS properly
async function loadRemoteFile(url) {
  try {
    // First try direct load (requires CORS headers)
    await connection.execute(`
      CREATE TABLE data AS 
      SELECT * FROM read_parquet('${url}')
    `);
  } catch (error) {
    console.error('Direct load failed, trying proxy...');
    
    // Fallback: Use a CORS proxy
    const proxyUrl = `https://cors-proxy.example.com/${url}`;
    const response = await fetch(proxyUrl);
    const buffer = await response.arrayBuffer();
    
    // Register and load manually
    await connection.registerFileBuffer('temp.parquet', new Uint8Array(buffer));
    await connection.execute(`
      CREATE TABLE data AS 
      SELECT * FROM read_parquet('temp.parquet')
    `);
  }
}

// ✅ Set up proper CORS headers on your server
// Server-side configuration needed:
// Access-Control-Allow-Origin: *
// Access-Control-Allow-Methods: GET, POST, OPTIONS
// Access-Control-Allow-Headers: Content-Type
```

## Browser Compatibility

### WebAssembly Support

```javascript
// ⚠️ Check for WebAssembly support
function checkWASMSupport() {
  const requirements = {
    webAssembly: typeof WebAssembly !== 'undefined',
    bigInt: typeof BigInt !== 'undefined',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    atomics: typeof Atomics !== 'undefined'
  };
  
  const missing = Object.entries(requirements)
    .filter(([, supported]) => !supported)
    .map(([feature]) => feature);
  
  if (missing.length > 0) {
    console.error('Missing browser features:', missing);
    return false;
  }
  
  return true;
}

// Provide fallback for older browsers
if (!checkWASMSupport()) {
  // Show error message or load polyfill
  document.getElementById('app').innerHTML = `
    <div class="error">
      <h2>Browser Not Supported</h2>
      <p>Your browser doesn't support WebAssembly.</p>
      <p>Please upgrade to a modern browser:</p>
      <ul>
        <li>Chrome 57+</li>
        <li>Firefox 52+</li>
        <li>Safari 11+</li>
        <li>Edge 16+</li>
      </ul>
    </div>
  `;
}
```

### SharedArrayBuffer Requirements

```javascript
// ⚠️ SharedArrayBuffer requires specific headers
// Required HTTP headers for SharedArrayBuffer:
// Cross-Origin-Embedder-Policy: require-corp
// Cross-Origin-Opener-Policy: same-origin

// Check if SharedArrayBuffer is available
if (typeof SharedArrayBuffer === 'undefined') {
  console.warn('SharedArrayBuffer not available. Performance may be limited.');
  
  // Use fallback configuration
  const config = {
    useSharedMemory: false,
    maxThreads: 1 // Single-threaded mode
  };
}

// Vite configuration for proper headers
export default {
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  }
};
```

## Data Size Limitations

### Working with Large Datasets

```javascript
// ⚠️ Browser storage limits:
// - LocalStorage: ~5-10MB
// - SessionStorage: ~5-10MB  
// - IndexedDB: ~50% of free disk space
// - Memory: ~1-4GB depending on browser

class DataManager {
  constructor() {
    this.CHUNK_SIZE = 10000; // Process in chunks
    this.MAX_MEMORY_ROWS = 100000; // Limit in-memory rows
  }
  
  async importLargeDataset(file) {
    const fileSize = file.size;
    
    // Check if file is too large
    if (fileSize > 500 * 1024 * 1024) { // 500MB
      throw new Error('File too large for browser processing');
    }
    
    // For large files, process in chunks
    if (fileSize > 50 * 1024 * 1024) { // 50MB
      return this.importInChunks(file);
    }
    
    // Small files can be processed directly
    return this.importDirect(file);
  }
  
  async importInChunks(file) {
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let rowCount = 0;
    let isFirstChunk = true;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line
      
      // Process complete lines
      const chunk = lines.slice(0, this.CHUNK_SIZE);
      
      if (isFirstChunk) {
        await this.createTable(chunk[0]); // Use header
        isFirstChunk = false;
      }
      
      await this.insertChunk(chunk);
      rowCount += chunk.length;
      
      // Show progress
      this.updateProgress(rowCount, file.size);
      
      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return rowCount;
  }
  
  updateProgress(processed, total) {
    const percentage = (processed / total) * 100;
    console.log(`Processing: ${percentage.toFixed(1)}%`);
  }
}
```

## Network Considerations

### Offline Capability

```javascript
// ⚠️ DuckDB WASM can work offline, but remote files won't be accessible

class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.sync();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }
  
  async executeQuery(sql, params) {
    if (this.requiresNetwork(sql) && !this.isOnline) {
      throw new Error('This query requires network access');
    }
    
    return connection.execute(sql, params);
  }
  
  requiresNetwork(sql) {
    // Check if query references remote resources
    return /https?:\/\//.test(sql) || 
           /read_parquet|read_csv/.test(sql);
  }
  
  async cacheForOffline(query, key) {
    if (!this.isOnline) {
      // Try to load from cache
      const cached = await this.loadFromCache(key);
      if (cached) return cached;
      
      throw new Error('No cached data available offline');
    }
    
    // Execute and cache
    const result = await connection.execute(query);
    await this.saveToCache(key, result);
    return result;
  }
  
  async saveToCache(key, data) {
    const db = await openDB('offline-cache', 1);
    await db.put('queries', { key, data, timestamp: Date.now() });
  }
  
  async loadFromCache(key) {
    const db = await openDB('offline-cache', 1);
    const cached = await db.get('queries', key);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < 24 * 60 * 60 * 1000) { // 24 hours
        return cached.data;
      }
    }
    
    return null;
  }
}
```

## Security Considerations

### SQL Injection Prevention

```javascript
// ⚠️ Always use parameterized queries

// ❌ DANGEROUS: String concatenation
const userInput = "'; DROP TABLE users; --";
await connection.execute(`SELECT * FROM users WHERE name = '${userInput}'`);

// ✅ SAFE: Parameterized query
await connection.execute(
  'SELECT * FROM users WHERE name = ?',
  [userInput]
);

// ✅ SAFE: Query builder with sanitization
import { select } from '@northprint/duckdb-wasm-adapter-core';

const query = select('*')
  .from('users')
  .where('name', '=', userInput)
  .build();
```

### Data Privacy

```javascript
// ⚠️ All data stays in the browser - be mindful of sensitive information

class PrivacyManager {
  // Encrypt sensitive data before storing
  async encryptData(data, password) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    const key = await this.deriveKey(password);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );
    
    return { encrypted, iv };
  }
  
  // Clear sensitive data when done
  async clearSensitiveData() {
    // Clear DuckDB tables
    await connection.execute('DROP TABLE IF EXISTS sensitive_data');
    
    // Clear browser storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear IndexedDB
    const databases = await indexedDB.databases();
    for (const db of databases) {
      await indexedDB.deleteDatabase(db.name);
    }
  }
  
  // Mask sensitive columns
  async maskSensitiveColumns() {
    await connection.execute(`
      CREATE VIEW users_masked AS
      SELECT 
        id,
        name,
        SUBSTR(email, 1, 3) || '***@***' as email,
        '***-***-' || SUBSTR(phone, -4) as phone
      FROM users
    `);
  }
}
```

## Best Practices for WASM

1. **Always check memory usage** before processing large datasets
2. **Use Web Workers** for heavy computations
3. **Process data in chunks** to avoid memory issues
4. **Cache query results** to minimize re-computation
5. **Validate browser compatibility** before initializing
6. **Handle offline scenarios** gracefully
7. **Implement proper error handling** for WASM-specific errors
8. **Use parameterized queries** to prevent SQL injection
9. **Clear sensitive data** when no longer needed
10. **Monitor performance** and adjust strategies accordingly

## Debugging WASM Issues

```javascript
// Enable detailed logging
const logger = {
  log: (...args) => console.log('[DuckDB]', ...args),
  error: (...args) => console.error('[DuckDB Error]', ...args),
  warn: (...args) => console.warn('[DuckDB Warning]', ...args)
};

// Monitor WASM memory
function monitorMemory() {
  setInterval(() => {
    if (performance.memory) {
      const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
      console.log({
        used: mb(performance.memory.usedJSHeapSize) + ' MB',
        total: mb(performance.memory.totalJSHeapSize) + ' MB',
        limit: mb(performance.memory.jsHeapSizeLimit) + ' MB'
      });
    }
  }, 5000);
}

// Catch and handle WASM errors
window.addEventListener('error', (event) => {
  if (event.message.includes('WebAssembly') || 
      event.message.includes('wasm')) {
    console.error('WASM Error detected:', event);
    // Show user-friendly error message
  }
});
```

## Next Steps

- [Performance Guide](/guide/performance) - Optimize for WASM environment
- [Error Handling](/guide/error-handling) - Handle WASM-specific errors
- [Deployment](/guide/deployment) - Deploy WASM applications