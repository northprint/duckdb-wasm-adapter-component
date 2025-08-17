import { createConnection, type Connection } from '@northprint/duckdb-wasm-adapter-core';
import type { DuckDBStoreConfig, ConnectionStatus, ColumnMetadata } from './types.js';

/**
 * Svelte 5 runes-based DuckDB adapter
 * Uses $state, $derived, and $effect for reactive state management
 */
export class DuckDBRunes {
  // State runes
  connection = $state<Connection | null>(null);
  status = $state<ConnectionStatus>('idle');
  error = $state<Error | null>(null);
  
  // Derived state
  isConnected = $derived(this.status === 'connected');
  isLoading = $derived(this.status === 'connecting');
  hasError = $derived(this.status === 'error');
  
  private config?: DuckDBStoreConfig;
  
  constructor(config?: DuckDBStoreConfig) {
    this.config = config;
    
    // Auto-connect if configured
    if (config?.autoConnect) {
      this.connect().catch(err => {
        console.error('Auto-connect failed:', err);
      });
    }
  }
  
  async connect(): Promise<void> {
    try {
      this.status = 'connecting';
      this.error = null;
      
      const conn = await createConnection(this.config, {
        onConnect: () => {
          this.status = 'connected';
          this.config?.events?.onConnect?.();
        },
        onDisconnect: () => {
          this.status = 'disconnected';
          this.config?.events?.onDisconnect?.();
        },
        onError: (err) => {
          this.error = err;
          this.status = 'error';
          this.config?.events?.onError?.(err);
        },
        onQuery: this.config?.events?.onQuery,
      });
      
      this.connection = conn;
      this.status = 'connected';
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.error = error;
      this.status = 'error';
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.close();
        this.connection = null;
        this.status = 'disconnected';
        this.error = null;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.error = error;
        throw error;
      }
    }
  }
  
  async execute<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<{ data: T[]; metadata: ColumnMetadata[] }> {
    if (!this.connection) {
      throw new Error('Not connected to database');
    }
    
    const result = await this.connection.execute<T>(sql, params);
    return {
      data: result.toArray(),
      metadata: result.getMetadata(),
    };
  }
}

/**
 * Reactive query class using Svelte 5 runes
 */
export class QueryRune<T = Record<string, unknown>> {
  // State runes
  data = $state<T[] | null>(null);
  loading = $state(false);
  error = $state<Error | null>(null);
  metadata = $state<ColumnMetadata[] | null>(null);
  
  // Derived state
  hasData = $derived(this.data !== null && this.data.length > 0);
  isEmpty = $derived(this.data !== null && this.data.length === 0);
  rowCount = $derived(this.data?.length || 0);
  
  private db: DuckDBRunes;
  private sql: string | (() => string);
  private params?: unknown[] | (() => unknown[]);
  private autoRefetch: boolean;
  private refetchInterval?: number;
  private intervalId?: NodeJS.Timeout;
  
  constructor(
    db: DuckDBRunes,
    sql: string | (() => string),
    params?: unknown[] | (() => unknown[]),
    options?: {
      immediate?: boolean;
      refetchInterval?: number;
      autoRefetch?: boolean;
    }
  ) {
    this.db = db;
    this.sql = sql;
    this.params = params;
    this.autoRefetch = options?.autoRefetch ?? false;
    this.refetchInterval = options?.refetchInterval;
    
    // Execute immediately if configured
    if (options?.immediate !== false) {
      this.execute();
    }
    
    // Set up auto-refetch with $effect
    if (this.refetchInterval && this.refetchInterval > 0) {
      $effect(() => {
        if (this.db.isConnected) {
          this.intervalId = setInterval(() => {
            this.execute();
          }, this.refetchInterval);
          
          return () => {
            if (this.intervalId) {
              clearInterval(this.intervalId);
            }
          };
        }
      });
    }
    
    // Re-execute when connection changes
    if (this.autoRefetch) {
      $effect(() => {
        if (this.db.isConnected) {
          this.execute();
        }
      });
    }
  }
  
  async execute(): Promise<void> {
    if (!this.db.connection) {
      this.error = new Error('Not connected to database');
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    try {
      const query = typeof this.sql === 'function' ? this.sql() : this.sql;
      const parameters = typeof this.params === 'function' ? this.params() : this.params;
      
      const result = await this.db.execute<T>(query, parameters);
      this.data = result.data;
      this.metadata = result.metadata;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.error = error;
    } finally {
      this.loading = false;
    }
  }
  
  refetch(): Promise<void> {
    return this.execute();
  }
  
  reset(): void {
    this.data = null;
    this.error = null;
    this.metadata = null;
    this.loading = false;
  }
}

/**
 * Mutation class using Svelte 5 runes
 */
export class MutationRune<T = Record<string, unknown>> {
  // State runes
  data = $state<T[] | null>(null);
  loading = $state(false);
  error = $state<Error | null>(null);
  
  // Derived state
  isSuccess = $derived(this.data !== null && this.error === null);
  isError = $derived(this.error !== null);
  
  private db: DuckDBRunes;
  private onSuccess?: (data: T[]) => void;
  private onError?: (error: Error) => void;
  
  constructor(
    db: DuckDBRunes,
    options?: {
      onSuccess?: (data: T[]) => void;
      onError?: (error: Error) => void;
    }
  ) {
    this.db = db;
    this.onSuccess = options?.onSuccess;
    this.onError = options?.onError;
  }
  
  async mutate(sql: string, params?: unknown[]): Promise<T[]> {
    if (!this.db.connection) {
      throw new Error('Not connected to database');
    }
    
    this.loading = true;
    this.error = null;
    
    try {
      const result = await this.db.execute<T>(sql, params);
      this.data = result.data;
      this.onSuccess?.(result.data);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.error = error;
      this.onError?.(error);
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  reset(): void {
    this.data = null;
    this.error = null;
    this.loading = false;
  }
}

/**
 * Create a reactive DuckDB instance with runes
 */
export function createDuckDBRunes(config?: DuckDBStoreConfig): DuckDBRunes {
  return new DuckDBRunes(config);
}

/**
 * Create a reactive query with runes
 */
export function createQueryRune<T = Record<string, unknown>>(
  db: DuckDBRunes,
  sql: string | (() => string),
  params?: unknown[] | (() => unknown[]),
  options?: {
    immediate?: boolean;
    refetchInterval?: number;
    autoRefetch?: boolean;
  }
): QueryRune<T> {
  return new QueryRune<T>(db, sql, params, options);
}

/**
 * Create a reactive mutation with runes
 */
export function createMutationRune<T = Record<string, unknown>>(
  db: DuckDBRunes,
  options?: {
    onSuccess?: (data: T[]) => void;
    onError?: (error: Error) => void;
  }
): MutationRune<T> {
  return new MutationRune<T>(db, options);
}

/**
 * Reactive table binding with runes
 */
export class TableRune<T extends Record<string, any>> {
  // State runes
  rows = $state<T[]>([]);
  selectedRows = $state<Set<number>>(new Set());
  sortColumn = $state<keyof T | null>(null);
  sortDirection = $state<'asc' | 'desc'>('asc');
  filterText = $state('');
  page = $state(1);
  pageSize = $state(10);
  
  // Derived state
  filteredRows = $derived(() => {
    if (!this.filterText) return this.rows;
    
    const searchText = this.filterText.toLowerCase();
    return this.rows.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchText)
      )
    );
  });
  
  sortedRows = $derived(() => {
    if (!this.sortColumn) return this.filteredRows;
    
    const sorted = [...this.filteredRows].sort((a, b) => {
      const aVal = a[this.sortColumn!];
      const bVal = b[this.sortColumn!];
      
      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  });
  
  paginatedRows = $derived(() => {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.sortedRows.slice(start, end);
  });
  
  totalPages = $derived(Math.ceil(this.sortedRows.length / this.pageSize));
  hasNextPage = $derived(this.page < this.totalPages);
  hasPrevPage = $derived(this.page > 1);
  
  private query: QueryRune<T>;
  
  constructor(query: QueryRune<T>) {
    this.query = query;
    
    // Sync rows with query data
    $effect(() => {
      if (this.query.data) {
        this.rows = this.query.data;
      }
    });
  }
  
  sort(column: keyof T): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }
  
  filter(text: string): void {
    this.filterText = text;
    this.page = 1; // Reset to first page when filtering
  }
  
  selectRow(index: number): void {
    if (this.selectedRows.has(index)) {
      this.selectedRows.delete(index);
    } else {
      this.selectedRows.add(index);
    }
    this.selectedRows = new Set(this.selectedRows); // Trigger reactivity
  }
  
  selectAll(): void {
    if (this.selectedRows.size === this.paginatedRows.length) {
      this.selectedRows.clear();
    } else {
      this.paginatedRows.forEach((_, index) => {
        this.selectedRows.add(index);
      });
    }
    this.selectedRows = new Set(this.selectedRows); // Trigger reactivity
  }
  
  nextPage(): void {
    if (this.hasNextPage) {
      this.page++;
    }
  }
  
  prevPage(): void {
    if (this.hasPrevPage) {
      this.page--;
    }
  }
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.page = page;
    }
  }
  
  setPageSize(size: number): void {
    this.pageSize = size;
    this.page = 1; // Reset to first page when changing page size
  }
}

/**
 * Create a reactive table with runes
 */
export function createTableRune<T extends Record<string, any>>(
  query: QueryRune<T>
): TableRune<T> {
  return new TableRune<T>(query);
}