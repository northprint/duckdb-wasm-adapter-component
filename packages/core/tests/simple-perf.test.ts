import { describe, it, expect, beforeAll } from 'vitest';
import { performance } from 'perf_hooks';

describe('Performance Metrics', () => {
  const metrics: Record<string, number> = {};

  beforeAll(() => {
    console.log('\n=== Performance Test Results ===\n');
  });

  it('should measure class instantiation performance', () => {
    const start = performance.now();
    
    // Simulate creating multiple instances
    for (let i = 0; i < 1000; i++) {
      const obj = {
        id: i,
        cache: new Map(),
        config: { enabled: true, maxSize: 100 }
      };
    }
    
    const end = performance.now();
    const time = end - start;
    metrics['Class instantiation (1000x)'] = time;
    
    console.log(`Class instantiation (1000x): ${time.toFixed(2)}ms`);
    expect(time).toBeLessThan(50); // Should be very fast
  });

  it('should measure cache operations performance', () => {
    const cache = new Map<string, any>();
    const iterations = 10000;
    
    // Measure write performance
    const writeStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      cache.set(`key-${i}`, { data: `value-${i}`, timestamp: Date.now() });
    }
    const writeEnd = performance.now();
    const writeTime = writeEnd - writeStart;
    metrics[`Cache writes (${iterations}x)`] = writeTime;
    
    console.log(`Cache writes (${iterations}x): ${writeTime.toFixed(2)}ms`);
    expect(writeTime).toBeLessThan(100);
    
    // Measure read performance
    const readStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const value = cache.get(`key-${i}`);
    }
    const readEnd = performance.now();
    const readTime = readEnd - readStart;
    metrics[`Cache reads (${iterations}x)`] = readTime;
    
    console.log(`Cache reads (${iterations}x): ${readTime.toFixed(2)}ms`);
    expect(readTime).toBeLessThan(50);
    
    // Measure delete performance
    const deleteStart = performance.now();
    for (let i = 0; i < iterations / 2; i++) {
      cache.delete(`key-${i}`);
    }
    const deleteEnd = performance.now();
    const deleteTime = deleteEnd - deleteStart;
    metrics[`Cache deletes (${iterations/2}x)`] = deleteTime;
    
    console.log(`Cache deletes (${iterations/2}x): ${deleteTime.toFixed(2)}ms`);
    expect(deleteTime).toBeLessThan(50);
  });

  it('should measure array processing performance', () => {
    const data = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Name ${i}`,
      value: Math.random() * 1000,
      category: `Category ${i % 10}`
    }));
    
    // Measure filtering
    const filterStart = performance.now();
    const filtered = data.filter(item => item.value > 500);
    const filterEnd = performance.now();
    const filterTime = filterEnd - filterStart;
    metrics['Array filter (10000 items)'] = filterTime;
    
    console.log(`Array filter (10000 items): ${filterTime.toFixed(2)}ms`);
    expect(filterTime).toBeLessThan(10);
    
    // Measure mapping
    const mapStart = performance.now();
    const mapped = data.map(item => ({
      ...item,
      formattedValue: `$${item.value.toFixed(2)}`
    }));
    const mapEnd = performance.now();
    const mapTime = mapEnd - mapStart;
    metrics['Array map (10000 items)'] = mapTime;
    
    console.log(`Array map (10000 items): ${mapTime.toFixed(2)}ms`);
    expect(mapTime).toBeLessThan(20);
    
    // Measure reduce
    const reduceStart = performance.now();
    const sum = data.reduce((acc, item) => acc + item.value, 0);
    const reduceEnd = performance.now();
    const reduceTime = reduceEnd - reduceStart;
    metrics['Array reduce (10000 items)'] = reduceTime;
    
    console.log(`Array reduce (10000 items): ${reduceTime.toFixed(2)}ms`);
    expect(reduceTime).toBeLessThan(10);
  });

  it('should measure string operations performance', () => {
    const iterations = 10000;
    
    // Measure string concatenation
    const concatStart = performance.now();
    let str = '';
    for (let i = 0; i < iterations; i++) {
      str = `prefix-${i}-suffix`;
    }
    const concatEnd = performance.now();
    const concatTime = concatEnd - concatStart;
    metrics[`String concatenation (${iterations}x)`] = concatTime;
    
    console.log(`String concatenation (${iterations}x): ${concatTime.toFixed(2)}ms`);
    expect(concatTime).toBeLessThan(50);
    
    // Measure regex operations
    const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    const regexStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      regex.test(`table_name_${i}`);
    }
    const regexEnd = performance.now();
    const regexTime = regexEnd - regexStart;
    metrics[`Regex validation (${iterations}x)`] = regexTime;
    
    console.log(`Regex validation (${iterations}x): ${regexTime.toFixed(2)}ms`);
    expect(regexTime).toBeLessThan(50);
  });

  it('should measure error handling performance', () => {
    class CustomError extends Error {
      constructor(message: string, public code: string) {
        super(message);
        this.name = 'CustomError';
      }
    }
    
    const iterations = 1000;
    
    const errorStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      try {
        if (i % 2 === 0) {
          throw new CustomError(`Error ${i}`, `CODE_${i}`);
        }
      } catch (error) {
        // Handle error
        const e = error as CustomError;
        const _ = e.code;
      }
    }
    const errorEnd = performance.now();
    const errorTime = errorEnd - errorStart;
    metrics[`Error handling (${iterations}x)`] = errorTime;
    
    console.log(`Error handling (${iterations}x): ${errorTime.toFixed(2)}ms`);
    expect(errorTime).toBeLessThan(50);
  });

  it('should generate performance summary', () => {
    console.log('\n=== Performance Summary ===\n');
    
    const sortedMetrics = Object.entries(metrics)
      .sort(([, a], [, b]) => a - b);
    
    console.log('Top 5 Fastest Operations:');
    sortedMetrics.slice(0, 5).forEach(([name, time], index) => {
      console.log(`${index + 1}. ${name}: ${time.toFixed(2)}ms`);
    });
    
    console.log('\nTop 5 Slowest Operations:');
    sortedMetrics.slice(-5).reverse().forEach(([name, time], index) => {
      console.log(`${index + 1}. ${name}: ${time.toFixed(2)}ms`);
    });
    
    const totalTime = Object.values(metrics).reduce((sum, time) => sum + time, 0);
    console.log(`\nTotal execution time: ${totalTime.toFixed(2)}ms`);
    
    expect(totalTime).toBeLessThan(500); // All operations should complete quickly
  });
});