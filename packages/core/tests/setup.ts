import { vi, beforeEach } from 'vitest';

// Create mock functions that can be accessed in tests
const mockQuery = vi.fn();
const mockPrepare = vi.fn();
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockRegisterFileText = vi.fn().mockResolvedValue(undefined);
const mockRegisterFileBuffer = vi.fn().mockResolvedValue(undefined);
const mockDropFile = vi.fn().mockResolvedValue(undefined);
const mockCopyFileToBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(0));

const mockConnection = {
  query: mockQuery,
  prepare: mockPrepare,
  close: mockClose,
  registerFileText: mockRegisterFileText,
  registerFileBuffer: mockRegisterFileBuffer,
  dropFile: mockDropFile,
  copyFileToBuffer: mockCopyFileToBuffer,
};

const mockInstantiate = vi.fn().mockResolvedValue(undefined);
const mockConnect = vi.fn().mockResolvedValue(mockConnection);
const mockTerminate = vi.fn().mockResolvedValue(undefined);

const mockDuckDB = {
  instantiate: mockInstantiate,
  connect: mockConnect,
  terminate: mockTerminate,
};

// Mock DuckDB WASM module
vi.mock('@duckdb/duckdb-wasm', () => ({
  AsyncDuckDB: vi.fn().mockImplementation(() => mockDuckDB),
  ConsoleLogger: vi.fn().mockImplementation(() => ({})),
  selectBundle: vi.fn().mockResolvedValue({
    mainModule: 'mock.wasm',
    mainWorker: 'mock.worker.js',
  }),
}));

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  
  // Reset mock implementations to default
  mockQuery.mockResolvedValue({
    toArray: () => [],
    schema: { fields: [] },
    numRows: 0,
  });
  
  mockPrepare.mockResolvedValue({
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
      toArray: () => [],
      schema: { fields: [] },
      numRows: 0,
    }),
    close: vi.fn().mockResolvedValue(undefined),
  });
});

// Setup global test environment
beforeAll(() => {
  // Add any global setup here
  
  // Mock File API if not available
  if (typeof File === 'undefined') {
    (global as any).File = class File {
      constructor(
        private parts: any[],
        public name: string,
        private options: any = {}
      ) {}
      
      async text() {
        return this.parts.join('');
      }
      
      async arrayBuffer() {
        if (this.parts[0] instanceof ArrayBuffer) {
          return this.parts[0];
        }
        const str = this.parts.join('');
        const buffer = new ArrayBuffer(str.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < str.length; i++) {
          view[i] = str.charCodeAt(i);
        }
        return buffer;
      }
    };
  }
});

afterAll(() => {
  // Add any global cleanup here
});