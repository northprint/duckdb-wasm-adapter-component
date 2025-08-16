import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionManager } from '../src/connection';
import { ErrorCode } from '../src/types';
import type { ConnectionConfig, ConnectionEvents } from '../src/types';

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = ConnectionManager.getInstance();
  });

  afterEach(async () => {
    await manager.closeAll();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ConnectionManager.getInstance();
      const instance2 = ConnectionManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createConnection', () => {
    it('should create a connection with default config', async () => {
      const connection = await manager.createConnection();
      
      expect(connection).toBeDefined();
      expect(connection.id).toMatch(/^conn-\d+$/);
      expect(connection.status).toBe('connected');
    });

    it('should create a connection with custom config', async () => {
      const config: ConnectionConfig = {
        worker: false,
        logLevel: 'debug',
        query: {
          castBigIntToDouble: true,
        },
      };

      const connection = await manager.createConnection(config);
      
      expect(connection).toBeDefined();
      expect(connection.status).toBe('connected');
    });

    it('should call connection events', async () => {
      const events: ConnectionEvents = {
        onConnect: vi.fn(),
        onDisconnect: vi.fn(),
        onError: vi.fn(),
        onQuery: vi.fn(),
      };

      const connection = await manager.createConnection(undefined, events);
      
      expect(events.onConnect).toHaveBeenCalled();
      expect(connection.status).toBe('connected');
    });

    it('should handle multiple connections', async () => {
      const conn1 = await manager.createConnection();
      const conn2 = await manager.createConnection();
      
      expect(conn1.id).not.toBe(conn2.id);
      expect(manager.getActiveConnections()).toHaveLength(2);
    });
  });

  describe('closeConnection', () => {
    it('should close a specific connection', async () => {
      const connection = await manager.createConnection();
      const connectionId = connection.id;
      
      await manager.closeConnection(connectionId);
      
      const retrievedConnection = await manager.getConnection(connectionId);
      expect(retrievedConnection).toBeUndefined();
    });

    it('should handle closing non-existent connection', async () => {
      await expect(
        manager.closeConnection('non-existent-id')
      ).resolves.not.toThrow();
    });
  });

  describe('closeAll', () => {
    it('should close all connections', async () => {
      await manager.createConnection();
      await manager.createConnection();
      await manager.createConnection();
      
      expect(manager.getActiveConnections()).toHaveLength(3);
      
      await manager.closeAll();
      
      expect(manager.getActiveConnections()).toHaveLength(0);
      expect(manager.isInitialized()).toBe(false);
    });
  });

  describe('getActiveConnections', () => {
    it('should return list of active connection IDs', async () => {
      const conn1 = await manager.createConnection();
      const conn2 = await manager.createConnection();
      
      const activeConnections = manager.getActiveConnections();
      
      expect(activeConnections).toContain(conn1.id);
      expect(activeConnections).toContain(conn2.id);
      expect(activeConnections).toHaveLength(2);
    });
  });

  describe('isInitialized', () => {
    it('should return false before first connection', () => {
      const newManager = ConnectionManager.getInstance();
      expect(newManager.isInitialized()).toBe(false);
    });

    it('should return true after creating connection', async () => {
      await manager.createConnection();
      expect(manager.isInitialized()).toBe(true);
    });

    it('should return false after closing all connections', async () => {
      await manager.createConnection();
      await manager.closeAll();
      expect(manager.isInitialized()).toBe(false);
    });
  });
});

describe('Connection', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = ConnectionManager.getInstance();
  });

  afterEach(async () => {
    await manager.closeAll();
  });

  describe('execute', () => {
    it('should execute a simple query', async () => {
      const connection = await manager.createConnection();
      
      // Access the mocked connection through the private property
      const mockConn = (connection as any).connection;
      
      // Mock the query result
      const mockResult = {
        toArray: () => [{ value: 1 }],
        schema: { 
          fields: [{ name: 'value', type: 'INTEGER', nullable: false }] 
        },
        numRows: 1,
        getChild: vi.fn((name: string) => ({
          get: vi.fn((index: number) => {
            if (name === 'value' && index === 0) return 1;
            return null;
          })
        }))
      };
      
      mockConn.query.mockResolvedValueOnce(mockResult);
      
      const result = await connection.execute('SELECT 1 as value');
      
      expect(result).toBeDefined();
      expect(result.rows).toEqual([{ value: 1 }]);
      expect(result.rowCount).toBe(1);
    });

    it('should execute parameterized query', async () => {
      const connection = await manager.createConnection();
      
      const mockPreparedStatement = {
        bindNull: vi.fn(),
        bindBoolean: vi.fn(),
        bindInt8: vi.fn(),
        bindInt16: vi.fn(),
        bindInt32: vi.fn(),
        bindInt64: vi.fn(),
        bindDouble: vi.fn(),
        bindVarchar: vi.fn(),
        bindTimestamp: vi.fn(),
        bindBlob: vi.fn(),
        query: vi.fn().mockResolvedValue({
          toArray: () => [{ id: 1, name: 'Test' }],
          schema: { fields: [{ name: 'id' }, { name: 'name' }] },
          numRows: 1,
        }),
        close: vi.fn().mockResolvedValue(undefined),
      };
      
      // Access the mocked connection
      const mockConn = (connection as any).connection;
      mockConn.prepare.mockResolvedValueOnce(mockPreparedStatement);
      
      const result = await connection.execute(
        'SELECT * FROM users WHERE id = ? AND name = ?',
        [1, 'Test']
      );
      
      expect(mockPreparedStatement.bindInt8).toHaveBeenCalledWith(1, 1);
      expect(mockPreparedStatement.bindVarchar).toHaveBeenCalledWith(2, 'Test');
      expect(result.rows).toEqual([{ id: 1, name: 'Test' }]);
    });

    it('should throw error when not connected', async () => {
      const connection = await manager.createConnection();
      await connection.close();
      
      await expect(
        connection.execute('SELECT 1')
      ).rejects.toThrow('Database connection not established');
    });

    it('should track query execution time', async () => {
      const onQuery = vi.fn();
      const connection = await manager.createConnection(undefined, { onQuery });
      
      const mockResult = {
        toArray: () => [],
        schema: { fields: [] },
        numRows: 0,
      };
      
      vi.mocked(connection['connection']!.query).mockResolvedValue(mockResult as any);
      
      await connection.execute('SELECT 1');
      
      expect(onQuery).toHaveBeenCalledWith(
        'SELECT 1',
        expect.any(Number)
      );
    });
  });

  describe('close', () => {
    it('should close connection and update status', async () => {
      const onDisconnect = vi.fn();
      const connection = await manager.createConnection(undefined, { onDisconnect });
      
      expect(connection.status).toBe('connected');
      
      await connection.close();
      
      expect(connection.status).toBe('disconnected');
      expect(onDisconnect).toHaveBeenCalled();
    });

    it('should handle multiple close calls', async () => {
      const connection = await manager.createConnection();
      
      await connection.close();
      await expect(connection.close()).resolves.not.toThrow();
    });
  });

  describe('executeSync', () => {
    it('should throw unsupported operation error', async () => {
      const connection = await manager.createConnection();
      
      expect(() => connection.executeSync('SELECT 1')).toThrow(
        'Unsupported operation: Synchronous execution is not supported in browser environment'
      );
    });
  });
});