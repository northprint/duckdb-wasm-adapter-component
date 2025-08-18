import { createConnection, type Connection } from '@northprint/duckdb-wasm-adapter-core';
import type { DuckDBStoreConfig, ConnectionStatus, ColumnMetadata } from './types.js';

// Svelte 5 runes type definitions
declare global {
  function $state<T>(initial: T): T;
  function $derived<T>(fn: () => T): T;
  function $effect(fn: () => void | (() => void)): void;
}

/**
 * Svelte 5 runes-based DuckDB adapter
 * Uses state, derived, and effect for reactive state management
 * Note: This file should be imported in .svelte files where runes are available
 */
export class DuckDBRunes {
  // State properties that will be reactive in Svelte components
  connection: Connection | null = null;
  status: ConnectionStatus = 'idle';
  error: Error | null = null;
  
  // These getters will be replaced with $derived in actual Svelte components
  get isConnected(): boolean {
    return this.status === 'connected';
  }
  
  get isLoading(): boolean {
    return this.status === 'connecting';
  }
  
  get hasError(): boolean {
    return this.status === 'error';
  }
  
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
 * Reactive query class for Svelte 5
 * Note: In actual usage, state properties will be reactive using $state
 */
export class QueryRune<T = Record<string, unknown>> {
  // State properties
  data: T[] | null = null;
  loading: boolean = false;
  error: Error | null = null;
  metadata: ColumnMetadata[] | null = null;
  
  // Computed properties (will use $derived in components)
  get hasData(): boolean {
    return this.data !== null && this.data.length > 0;
  }
  
  get isEmpty(): boolean {
    return this.data !== null && this.data.length === 0;
  }
  
  get rowCount(): number {
    return this.data?.length || 0;
  }
  
  private db: DuckDBRunes;
  private sql: string | (() => string);
  private params?: unknown[] | (() => unknown[]);
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
    
    // Execute immediately if configured
    if (options?.immediate !== false) {
      void this.execute();
    }
    
    // Set up interval if configured
    if (options?.refetchInterval && options.refetchInterval > 0) {
      this.intervalId = setInterval(() => {
        void this.execute();
      }, options.refetchInterval);
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
  
  dispose(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

/**
 * Mutation class for Svelte 5
 */
export class MutationRune<T = Record<string, unknown>> {
  // State properties
  data: T[] | null = null;
  loading: boolean = false;
  error: Error | null = null;
  
  // Computed properties
  get isSuccess(): boolean {
    return this.data !== null && this.error === null;
  }
  
  get isError(): boolean {
    return this.error !== null;
  }
  
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
 * Table management class for Svelte 5
 */
export class TableRune<T extends Record<string, any>> {
  // State properties
  rows: T[] = [];
  selectedRows: Set<number> = new Set();
  sortColumn: keyof T | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  filterText: string = '';
  page: number = 1;
  pageSize: number = 10;
  
  // Computed properties
  get filteredRows(): T[] {
    if (!this.filterText) return this.rows;
    
    const searchText = this.filterText.toLowerCase();
    return this.rows.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchText)
      )
    );
  }
  
  get sortedRows(): T[] {
    if (!this.sortColumn) return this.filteredRows;
    
    const sorted = [...this.filteredRows].sort((a, b) => {
      const aVal = a[this.sortColumn as keyof T];
      const bVal = b[this.sortColumn as keyof T];
      
      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }
  
  get paginatedRows(): T[] {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.sortedRows.slice(start, end);
  }
  
  get totalPages(): number {
    return Math.ceil(this.sortedRows.length / this.pageSize);
  }
  
  get hasNextPage(): boolean {
    return this.page < this.totalPages;
  }
  
  get hasPrevPage(): boolean {
    return this.page > 1;
  }
  
  private query: QueryRune<T>;
  
  constructor(query: QueryRune<T>) {
    this.query = query;
    this.syncWithQuery();
  }
  
  private syncWithQuery(): void {
    // In actual Svelte components, this would use $effect
    // For now, we'll use a simple polling mechanism
    setInterval(() => {
      if (this.query.data) {
        this.rows = this.query.data;
      }
    }, 100);
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
    // Trigger reactivity by creating new Set
    this.selectedRows = new Set(this.selectedRows);
  }
  
  selectAll(): void {
    if (this.selectedRows.size === this.paginatedRows.length) {
      this.selectedRows.clear();
    } else {
      this.paginatedRows.forEach((_, index) => {
        this.selectedRows.add(index);
      });
    }
    // Trigger reactivity
    this.selectedRows = new Set(this.selectedRows);
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
 * Factory functions for creating runes-based instances
 */
export function createDuckDBRunes(config?: DuckDBStoreConfig): DuckDBRunes {
  return new DuckDBRunes(config);
}

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

export function createMutationRune<T = Record<string, unknown>>(
  db: DuckDBRunes,
  options?: {
    onSuccess?: (data: T[]) => void;
    onError?: (error: Error) => void;
  }
): MutationRune<T> {
  return new MutationRune<T>(db, options);
}

export function createTableRune<T extends Record<string, any>>(
  query: QueryRune<T>
): TableRune<T> {
  return new TableRune<T>(query);
}