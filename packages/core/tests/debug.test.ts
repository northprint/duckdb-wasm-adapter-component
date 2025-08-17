import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DebugLogger } from '../src/debug.js';

describe('DebugLogger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    group: ReturnType<typeof vi.spyOn>;
    groupEnd: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    table: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      group: vi.spyOn(console, 'group').mockImplementation(() => {}),
      groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      table: vi.spyOn(console, 'table').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when disabled', () => {
    it('should not log anything when disabled', () => {
      const logger = new DebugLogger({ enabled: false });
      
      logger.startQuery('SELECT * FROM test');
      logger.endQuery(10);
      logger.logConnection('connected');
      logger.logError(new Error('Test error'));
      
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.group).not.toHaveBeenCalled();
    });
  });

  describe('when enabled', () => {
    it('should log queries when logQueries is true', () => {
      const logger = new DebugLogger({ 
        enabled: true, 
        logQueries: true 
      });
      
      logger.startQuery('SELECT * FROM test', [1, 'test']);
      
      expect(consoleSpy.group).toHaveBeenCalledWith('🦆 DuckDB Query');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('SQL:'),
        expect.any(String),
        'SELECT * FROM test'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Params:'),
        expect.any(String),
        [1, 'test']
      );
    });

    it('should log timing when logTiming is true', () => {
      const logger = new DebugLogger({ 
        enabled: true, 
        logTiming: true 
      });
      
      logger.startQuery('SELECT * FROM test');
      logger.endQuery(100);
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/Execution Time:/),
        expect.any(String)
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/Rows: 100/),
        expect.any(String)
      );
    });

    it('should warn about slow queries', () => {
      const logger = new DebugLogger({ 
        enabled: true, 
        slowQueryThreshold: 10 
      });
      
      // Mock performance.now to simulate slow query
      const originalPerformanceNow = performance.now;
      let currentTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => {
        const result = currentTime;
        currentTime += 20; // Simulate 20ms elapsed time
        return result;
      });
      
      logger.startQuery('SELECT * FROM test');
      logger.endQuery(100);
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow query detected')
      );
      
      // Restore performance.now
      vi.spyOn(performance, 'now').mockRestore();
    });

    it('should log connection status changes', () => {
      const logger = new DebugLogger({ enabled: true });
      
      logger.logConnection('connected');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ DuckDB Connection: connected');
      
      logger.logConnection('disconnected');
      expect(consoleSpy.log).toHaveBeenCalledWith('🔌 DuckDB Connection: disconnected');
    });

    it('should log errors with query context', () => {
      const logger = new DebugLogger({ enabled: true });
      const error = new Error('Test error');
      
      logger.logError(error, 'SELECT * FROM test');
      
      expect(consoleSpy.group).toHaveBeenCalledWith('❌ DuckDB Error');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.any(String),
        'Test error'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Query:'),
        expect.any(String),
        'SELECT * FROM test'
      );
    });

    it('should format memory correctly', () => {
      const logger = new DebugLogger({ 
        enabled: true, 
        logMemory: true 
      });
      
      const profile = {
        executionTime: 10,
        planningTime: 2,
        totalTime: 12,
        rowsProcessed: 100,
        memoryUsed: 1024 * 1024 * 5, // 5 MB
      };
      
      logger.startQuery('SELECT * FROM test');
      logger.endQuery(100, profile);
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/Memory Used: 5.00 MB/),
        expect.any(String)
      );
    });

    it('should log query profile when profileQueries is true', () => {
      const logger = new DebugLogger({ 
        enabled: true, 
        profileQueries: true 
      });
      
      const profile = {
        executionTime: 10,
        planningTime: 2,
        totalTime: 12,
        rowsProcessed: 100,
        memoryUsed: 1024 * 512,
        plan: 'SCAN employees',
      };
      
      logger.startQuery('SELECT * FROM test');
      logger.endQuery(100, profile);
      
      expect(consoleSpy.table).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Execution Plan:'),
        expect.any(String)
      );
      expect(consoleSpy.log).toHaveBeenCalledWith('SCAN employees');
    });

    it('should wrap operations with timing', async () => {
      const logger = new DebugLogger({ 
        enabled: true, 
        logTiming: true 
      });
      
      const promise = logger.createTimingWrapper(
        'Test operation',
        async () => {
          await new Promise(resolve => {
            setTimeout(resolve, 10);
            vi.runAllTimers();
          });
          return 'result';
        }
      );
      
      const result = await promise;
      
      expect(result).toBe('result');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/⏱️ Test operation: \d+\.\d+ms/)
      );
    });

    it('should log import operations', () => {
      const logger = new DebugLogger({ enabled: true });
      
      logger.logImport('CSV', 'employees', 1000);
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '📥 Imported CSV data into table "employees" (1000 rows)'
      );
    });

    it('should log export operations', () => {
      const logger = new DebugLogger({ enabled: true });
      
      logger.logExport('JSON', 500);
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '📤 Exported 500 rows as JSON'
      );
    });
  });
});