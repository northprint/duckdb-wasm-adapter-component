import { describe, bench, beforeAll } from 'vitest';
import { DuckDBAdapter } from '../src/index.js';
import type { QueryResult } from '../src/types.js';

describe('Connection Performance', () => {
  bench('initial connection', async () => {
    const adapter = new DuckDBAdapter();
    await adapter.connect();
    await adapter.close();
  });

  bench('reconnection', async () => {
    const adapter = new DuckDBAdapter();
    await adapter.connect();
    await adapter.close();
    await adapter.connect();
    await adapter.close();
  });
});

describe('Query Performance', () => {
  let adapter: DuckDBAdapter;

  beforeAll(async () => {
    adapter = new DuckDBAdapter();
    await adapter.connect();
    
    // Create test data
    await adapter.execute(`
      CREATE TABLE test_data (
        id INTEGER PRIMARY KEY,
        name VARCHAR,
        value DOUBLE,
        category VARCHAR,
        created_at TIMESTAMP
      )
    `);
    
    // Insert test data
    const insertQuery = `
      INSERT INTO test_data 
      SELECT 
        i as id,
        'Name_' || i as name,
        random() * 1000 as value,
        'Category_' || (i % 10) as category,
        TIMESTAMP '2024-01-01 00:00:00' + INTERVAL (i || ' seconds') as created_at
      FROM generate_series(1, 10000) as s(i)
    `;
    await adapter.execute(insertQuery);
  });

  bench('simple SELECT query', async () => {
    await adapter.query('SELECT * FROM test_data LIMIT 10');
  });

  bench('filtered SELECT query', async () => {
    await adapter.query('SELECT * FROM test_data WHERE id > 5000 AND id < 5100');
  });

  bench('aggregation query', async () => {
    await adapter.query(`
      SELECT 
        category,
        COUNT(*) as count,
        AVG(value) as avg_value,
        MAX(value) as max_value
      FROM test_data
      GROUP BY category
    `);
  });

  bench('complex JOIN query', async () => {
    await adapter.query(`
      WITH category_stats AS (
        SELECT 
          category,
          AVG(value) as avg_value
        FROM test_data
        GROUP BY category
      )
      SELECT 
        t.*,
        cs.avg_value as category_avg
      FROM test_data t
      JOIN category_stats cs ON t.category = cs.category
      WHERE t.value > cs.avg_value
      LIMIT 100
    `);
  });

  bench('full table scan', async () => {
    await adapter.query('SELECT COUNT(*) FROM test_data');
  });
});

describe('Data Import Performance', () => {
  let adapter: DuckDBAdapter;

  beforeAll(async () => {
    adapter = new DuckDBAdapter();
    await adapter.connect();
  });

  bench('CSV import (1000 rows)', async () => {
    const csvData = generateCSV(1000);
    await adapter.importCSV(csvData, 'csv_test_1k');
    await adapter.execute('DROP TABLE IF EXISTS csv_test_1k');
  });

  bench('CSV import (10000 rows)', async () => {
    const csvData = generateCSV(10000);
    await adapter.importCSV(csvData, 'csv_test_10k');
    await adapter.execute('DROP TABLE IF EXISTS csv_test_10k');
  });

  bench('JSON import (1000 rows)', async () => {
    const jsonData = generateJSON(1000);
    await adapter.importJSON(jsonData, 'json_test_1k');
    await adapter.execute('DROP TABLE IF EXISTS json_test_1k');
  });

  bench('JSON import (10000 rows)', async () => {
    const jsonData = generateJSON(10000);
    await adapter.importJSON(jsonData, 'json_test_10k');
    await adapter.execute('DROP TABLE IF EXISTS json_test_10k');
  });
});

describe('Cache Performance', () => {
  let adapter: DuckDBAdapter;

  beforeAll(async () => {
    adapter = new DuckDBAdapter({
      cache: {
        enabled: true,
        maxSize: 100,
        ttl: 60000,
        strategy: 'lru'
      }
    });
    await adapter.connect();
    
    await adapter.execute(`
      CREATE TABLE cache_test (
        id INTEGER,
        data VARCHAR
      )
    `);
    
    await adapter.execute(`
      INSERT INTO cache_test 
      SELECT i, 'data_' || i 
      FROM generate_series(1, 1000) as s(i)
    `);
  });

  bench('cache miss', async () => {
    const randomId = Math.floor(Math.random() * 1000);
    await adapter.query(`SELECT * FROM cache_test WHERE id = ${randomId}`);
  });

  bench('cache hit', async () => {
    // First execution to cache
    await adapter.query('SELECT * FROM cache_test WHERE id = 42');
    // Second execution should hit cache
    await adapter.query('SELECT * FROM cache_test WHERE id = 42');
  });

  bench('cache with parameters', async () => {
    const params = { id: 42 };
    await adapter.query('SELECT * FROM cache_test WHERE id = ?', [params.id]);
  });
});

describe('Memory Usage', () => {
  bench('memory footprint - small query', async () => {
    const adapter = new DuckDBAdapter();
    await adapter.connect();
    
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const before = process.memoryUsage().heapUsed;
      await adapter.query('SELECT 1');
      const after = process.memoryUsage().heapUsed;
      const diff = after - before;
      console.log(`Memory used: ${(diff / 1024 / 1024).toFixed(2)} MB`);
    }
    
    await adapter.close();
  });

  bench('memory footprint - large result set', async () => {
    const adapter = new DuckDBAdapter();
    await adapter.connect();
    
    await adapter.execute(`
      CREATE TABLE memory_test AS 
      SELECT i, repeat('x', 100) as data 
      FROM generate_series(1, 10000) as s(i)
    `);
    
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const before = process.memoryUsage().heapUsed;
      await adapter.query('SELECT * FROM memory_test');
      const after = process.memoryUsage().heapUsed;
      const diff = after - before;
      console.log(`Memory used: ${(diff / 1024 / 1024).toFixed(2)} MB`);
    }
    
    await adapter.close();
  });
});

// Helper functions
function generateCSV(rows: number): string {
  let csv = 'id,name,value,category\n';
  for (let i = 1; i <= rows; i++) {
    csv += `${i},Name_${i},${Math.random() * 1000},Category_${i % 10}\n`;
  }
  return csv;
}

function generateJSON(rows: number): any[] {
  const data = [];
  for (let i = 1; i <= rows; i++) {
    data.push({
      id: i,
      name: `Name_${i}`,
      value: Math.random() * 1000,
      category: `Category_${i % 10}`
    });
  }
  return data;
}