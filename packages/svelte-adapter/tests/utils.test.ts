import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatBytes,
  formatDuration,
  formatNumber,
  resultToCSV,
  downloadFile,
  debounce,
  getQueryType,
  isReadOnlyQuery,
} from '../src/utils.js';

describe('formatBytes', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(500)).toBe('500 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(1099511627776)).toBe('1 TB');
  });
});

describe('formatDuration', () => {
  it('should format duration correctly', () => {
    expect(formatDuration(100)).toBe('100ms');
    expect(formatDuration(999)).toBe('999ms');
    expect(formatDuration(1000)).toBe('1.00s');
    expect(formatDuration(1500)).toBe('1.50s');
    expect(formatDuration(59999)).toBe('60.00s');
    expect(formatDuration(60000)).toBe('1.00m');
    expect(formatDuration(90000)).toBe('1.50m');
  });
});

describe('formatNumber', () => {
  it('should format numbers with thousands separator', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(123456789)).toBe('123,456,789');
  });
});

describe('resultToCSV', () => {
  it('should convert query result to CSV', () => {
    const result = {
      data: [
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 },
      ],
      loading: false,
      error: null,
      metadata: null,
    };
    
    const csv = resultToCSV(result);
    expect(csv).toBe('id,name,age\n1,Alice,30\n2,Bob,25');
  });

  it('should handle empty data', () => {
    const result = {
      data: [],
      loading: false,
      error: null,
      metadata: null,
    };
    
    const csv = resultToCSV(result);
    expect(csv).toBe('');
  });

  it('should handle null data', () => {
    const result = {
      data: null,
      loading: false,
      error: null,
      metadata: null,
    };
    
    const csv = resultToCSV(result);
    expect(csv).toBe('');
  });

  it('should escape special characters in CSV', () => {
    const result = {
      data: [
        { id: 1, name: 'Alice, Smith', description: 'Uses "quotes"' },
        { id: 2, name: 'Bob\nJones', description: 'Has,comma,and,"quotes"' },
      ],
      loading: false,
      error: null,
      metadata: null,
    };
    
    const csv = resultToCSV(result);
    expect(csv).toContain('"Alice, Smith"');
    expect(csv).toContain('"Uses ""quotes"""');
    expect(csv).toContain('"Bob\nJones"');
    expect(csv).toContain('"Has,comma,and,""quotes"""');
  });

  it('should handle null and undefined values', () => {
    const result = {
      data: [
        { id: 1, name: null, age: undefined },
      ],
      loading: false,
      error: null,
      metadata: null,
    };
    
    const csv = resultToCSV(result);
    expect(csv).toBe('id,name,age\n1,,');
  });
});

describe('downloadFile', () => {
  let createElementSpy: any;
  let appendChildSpy: any;
  let removeChildSpy: any;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(() => {
    // Mock DOM methods
    createElementSpy = vi.spyOn(document, 'createElement');
    appendChildSpy = vi.spyOn(document.body, 'appendChild');
    removeChildSpy = vi.spyOn(document.body, 'removeChild');
    
    // Mock URL methods if they don't exist (jsdom issue)
    if (!URL.createObjectURL) {
      (URL as any).createObjectURL = vi.fn().mockReturnValue('blob:test');
    }
    if (!URL.revokeObjectURL) {
      (URL as any).revokeObjectURL = vi.fn();
    }
    
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should download string content', () => {
    const mockLink = document.createElement('a');
    mockLink.click = vi.fn();
    createElementSpy.mockReturnValue(mockLink);
    
    downloadFile('test content', 'test.txt', 'text/plain');
    
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(mockLink.href).toBe('blob:test');
    expect(mockLink.download).toBe('test.txt');
    expect(mockLink.click).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
    expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test');
  });

  it('should download blob content', () => {
    const mockLink = document.createElement('a');
    mockLink.click = vi.fn();
    createElementSpy.mockReturnValue(mockLink);
    
    const blob = new Blob(['test content'], { type: 'text/plain' });
    downloadFile(blob, 'test.txt');
    
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(mockLink.download).toBe('test.txt');
    expect(mockLink.click).toHaveBeenCalled();
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce function calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);
    
    debouncedFn('call1');
    debouncedFn('call2');
    debouncedFn('call3');
    
    expect(fn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(100);
    
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('call3');
  });

  it('should cancel previous timeout on new call', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);
    
    debouncedFn('call1');
    vi.advanceTimersByTime(50);
    
    debouncedFn('call2');
    vi.advanceTimersByTime(50);
    
    expect(fn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(50);
    
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('call2');
  });
});

describe('getQueryType', () => {
  it('should identify SELECT queries', () => {
    expect(getQueryType('SELECT * FROM users')).toBe('SELECT');
    expect(getQueryType('  select id from table  ')).toBe('SELECT');
    expect(getQueryType('WITH cte AS (SELECT 1) SELECT * FROM cte')).toBe('SELECT');
  });

  it('should identify INSERT queries', () => {
    expect(getQueryType('INSERT INTO users VALUES (1, "test")')).toBe('INSERT');
    expect(getQueryType('  INSERT INTO table (col) VALUES (1)  ')).toBe('INSERT');
  });

  it('should identify UPDATE queries', () => {
    expect(getQueryType('UPDATE users SET name = "test"')).toBe('UPDATE');
    expect(getQueryType('  update table set col = 1  ')).toBe('UPDATE');
  });

  it('should identify DELETE queries', () => {
    expect(getQueryType('DELETE FROM users WHERE id = 1')).toBe('DELETE');
    expect(getQueryType('  delete from table  ')).toBe('DELETE');
  });

  it('should identify CREATE queries', () => {
    expect(getQueryType('CREATE TABLE users (id INT)')).toBe('CREATE');
    expect(getQueryType('  create view v as select 1  ')).toBe('CREATE');
  });

  it('should identify DROP queries', () => {
    expect(getQueryType('DROP TABLE users')).toBe('DROP');
    expect(getQueryType('  drop view v  ')).toBe('DROP');
  });

  it('should identify ALTER queries', () => {
    expect(getQueryType('ALTER TABLE users ADD COLUMN age INT')).toBe('ALTER');
    expect(getQueryType('  alter table t add col int  ')).toBe('ALTER');
  });

  it('should identify TRUNCATE queries', () => {
    expect(getQueryType('TRUNCATE TABLE users')).toBe('TRUNCATE');
    expect(getQueryType('  truncate users  ')).toBe('TRUNCATE');
  });

  it('should return OTHER for unknown queries', () => {
    expect(getQueryType('EXPLAIN SELECT * FROM users')).toBe('OTHER');
    expect(getQueryType('DESCRIBE users')).toBe('OTHER');
    expect(getQueryType('  ')).toBe('OTHER');
  });
});

describe('isReadOnlyQuery', () => {
  it('should identify read-only queries', () => {
    expect(isReadOnlyQuery('SELECT * FROM users')).toBe(true);
    expect(isReadOnlyQuery('WITH cte AS (SELECT 1) SELECT * FROM cte')).toBe(true);
  });

  it('should identify non-read-only queries', () => {
    expect(isReadOnlyQuery('INSERT INTO users VALUES (1)')).toBe(false);
    expect(isReadOnlyQuery('UPDATE users SET name = "test"')).toBe(false);
    expect(isReadOnlyQuery('DELETE FROM users')).toBe(false);
    expect(isReadOnlyQuery('CREATE TABLE users (id INT)')).toBe(false);
    expect(isReadOnlyQuery('DROP TABLE users')).toBe(false);
    expect(isReadOnlyQuery('ALTER TABLE users ADD COLUMN age INT')).toBe(false);
    expect(isReadOnlyQuery('TRUNCATE TABLE users')).toBe(false);
  });
});