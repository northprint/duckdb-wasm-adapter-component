import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

/**
 * Svelte 5 runes-based DuckDB adapter
 * Uses $state for reactive state management
 */
export class DuckDBRunes {
  connection = $state(null);
  status = $state('idle');
  error = $state(null);
  
  get isConnected() {
    return this.status === 'connected';
  }
  
  get isLoading() {
    return this.status === 'connecting';
  }
  
  get hasError() {
    return this.status === 'error';
  }
  
  constructor(config) {
    this.config = config;
    
    if (config?.autoConnect) {
      this.connect().catch(err => {
        console.error('Auto-connect failed:', err);
      });
    }
  }
  
  async connect() {
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
  
  async disconnect() {
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
  
  async execute(sql, params) {
    if (!this.connection) {
      throw new Error('Not connected to database');
    }
    
    const result = await this.connection.execute(sql, params);
    return {
      data: result.toArray(),
      metadata: result.getMetadata(),
    };
  }
}

/**
 * Reactive query class for Svelte 5 with $state
 */
export class QueryRune {
  data = $state(null);
  loading = $state(false);
  error = $state(null);
  metadata = $state(null);
  
  get hasData() {
    return this.data !== null && this.data.length > 0;
  }
  
  get isEmpty() {
    return this.data !== null && this.data.length === 0;
  }
  
  get rowCount() {
    return this.data?.length || 0;
  }
  
  constructor(db, sql, params, options) {
    this.db = db;
    this.sql = sql;
    this.params = params;
    
    if (options?.immediate !== false) {
      this.execute();
    }
    
    if (options?.refetchInterval && options.refetchInterval > 0) {
      this.intervalId = setInterval(() => {
        this.execute();
      }, options.refetchInterval);
    }
  }
  
  async execute() {
    if (!this.db.connection) {
      this.error = new Error('Not connected to database');
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    try {
      const query = typeof this.sql === 'function' ? this.sql() : this.sql;
      const parameters = typeof this.params === 'function' ? this.params() : this.params;
      
      const result = await this.db.execute(query, parameters);
      this.data = result.data;
      this.metadata = result.metadata;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.error = error;
    } finally {
      this.loading = false;
    }
  }
  
  refetch() {
    return this.execute();
  }
  
  reset() {
    this.data = null;
    this.error = null;
    this.metadata = null;
    this.loading = false;
  }
  
  dispose() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

/**
 * Mutation class for Svelte 5 with $state
 */
export class MutationRune {
  data = $state(null);
  loading = $state(false);
  error = $state(null);
  
  get isSuccess() {
    return this.data !== null && this.error === null;
  }
  
  get isError() {
    return this.error !== null;
  }
  
  constructor(db, options) {
    this.db = db;
    this.onSuccess = options?.onSuccess;
    this.onError = options?.onError;
  }
  
  async mutate(sql, params) {
    if (!this.db.connection) {
      throw new Error('Not connected to database');
    }
    
    this.loading = true;
    this.error = null;
    
    try {
      const result = await this.db.execute(sql, params);
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
  
  reset() {
    this.data = null;
    this.error = null;
    this.loading = false;
  }
}

/**
 * Table management class for Svelte 5 with $state
 */
export class TableRune {
  rows = $state([]);
  selectedRows = $state(new Set());
  sortColumn = $state(null);
  sortDirection = $state('asc');
  filterText = $state('');
  page = $state(1);
  pageSize = $state(10);
  
  get filteredRows() {
    if (!this.filterText) return this.rows;
    
    const searchText = this.filterText.toLowerCase();
    return this.rows.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchText)
      )
    );
  }
  
  get sortedRows() {
    if (!this.sortColumn) return this.filteredRows;
    
    const sorted = [...this.filteredRows].sort((a, b) => {
      const aVal = a[this.sortColumn];
      const bVal = b[this.sortColumn];
      
      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }
  
  get paginatedRows() {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.sortedRows.slice(start, end);
  }
  
  get totalPages() {
    return Math.ceil(this.sortedRows.length / this.pageSize);
  }
  
  get hasNextPage() {
    return this.page < this.totalPages;
  }
  
  get hasPrevPage() {
    return this.page > 1;
  }
  
  constructor(query) {
    this.query = query;
    
    // Use $effect to sync with query data
    $effect(() => {
      if (this.query.data) {
        this.rows = [...this.query.data];
      }
    });
  }
  
  sort(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }
  
  filter(text) {
    this.filterText = text;
    this.page = 1;
  }
  
  selectRow(index) {
    const newSet = new Set(this.selectedRows);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    this.selectedRows = newSet;
  }
  
  selectAll() {
    if (this.selectedRows.size === this.paginatedRows.length) {
      this.selectedRows = new Set();
    } else {
      const newSet = new Set();
      this.paginatedRows.forEach((_, index) => {
        newSet.add(index);
      });
      this.selectedRows = newSet;
    }
  }
  
  nextPage() {
    if (this.hasNextPage) {
      this.page++;
    }
  }
  
  prevPage() {
    if (this.hasPrevPage) {
      this.page--;
    }
  }
  
  goToPage(page) {
    if (page >= 1 && page <= this.totalPages) {
      this.page = page;
    }
  }
  
  setPageSize(size) {
    this.pageSize = size;
    this.page = 1;
  }
}

/**
 * Factory functions
 */
export function createDuckDBRunes(config) {
  return new DuckDBRunes(config);
}

export function createQueryRune(db, sql, params, options) {
  return new QueryRune(db, sql, params, options);
}

export function createMutationRune(db, options) {
  return new MutationRune(db, options);
}

export function createTableRune(query) {
  return new TableRune(query);
}