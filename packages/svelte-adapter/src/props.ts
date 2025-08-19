/**
 * Svelte 5 component props types
 * These types and utilities help create type-safe component props
 */

/**
 * Props for DuckDB query components
 */
export interface QueryProps<T = Record<string, unknown>> {
  sql: string;
  params?: unknown[];
  immediate?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
}

/**
 * Bindable props for form components
 */
export interface FormProps<T = Record<string, unknown>> {
  value: T;
  tableName: string;
  onChange?: (value: T) => void;
  onSave?: (value: T) => Promise<void>;
  validator?: (value: T) => { valid: boolean; errors?: string[] };
}

/**
 * Props for table components
 */
export interface TableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: {
    key: keyof T;
    label: string;
    sortable?: boolean;
    width?: string;
    render?: (value: unknown, row: T) => string;
  }[];
  pageSize?: number;
  selectable?: boolean;
  onRowClick?: (row: T, index: number) => void;
  onSelectionChange?: (selected: T[]) => void;
}

/**
 * Create reactive props type helper
 */
export type DuckDBQueryProps<T = Record<string, unknown>> = {
  sql: string;
  params?: unknown[];
  autoRefetch?: boolean;
  refetchInterval?: number;
  enabled?: boolean;
  onDataChange?: (data: T[]) => void;
};

/**
 * Create bindable model props
 */
export type BindableModelProps<T = Record<string, unknown>> = {
  value: T;
  onChange?: (value: T) => void;
};

/**
 * Chart component props
 */
export interface ChartProps<T = Record<string, unknown>> {
  data: T[];
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  xField: keyof T;
  yField: keyof T | Array<keyof T>;
  title?: string;
  colors?: string[];
  height?: number;
  width?: number;
  responsive?: boolean;
}

/**
 * Filter component props
 */
export interface FilterProps<T = Record<string, unknown>> {
  columns: Array<{
    key: keyof T;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
    options?: Array<{ value: unknown; label: string }>;
  }>;
  onFilterChange?: (filters: Partial<T>) => void;
  debounce?: number;
}

/**
 * Export component props
 */
export interface ExportProps {
  query: string;
  filename?: string;
  format: 'csv' | 'json' | 'parquet';
  onExport?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

/**
 * Import component props  
 */
export interface ImportProps {
  tableName: string;
  format: 'csv' | 'json' | 'parquet';
  onImport?: (rowCount: number) => void;
  onError?: (error: Error) => void;
  accept?: string;
  multiple?: boolean;
}

/**
 * Dashboard component props
 */
export interface DashboardProps {
  queries: Record<string, {
    sql: string;
    params?: unknown[];
    refreshInterval?: number;
  }>;
  layout?: 'grid' | 'flex' | 'masonry';
  columns?: number;
  gap?: string;
  onAllLoaded?: () => void;
}

/**
 * Schema viewer component props
 */
export interface SchemaProps {
  showTables?: boolean;
  showViews?: boolean;
  showIndexes?: boolean;
  expandAll?: boolean;
  searchable?: boolean;
  onTableClick?: (tableName: string) => void;
}

/**
 * Query editor component props
 */
export interface QueryEditorProps {
  initialSql?: string;
  height?: string;
  theme?: 'light' | 'dark';
  autoComplete?: boolean;
  syntaxHighlight?: boolean;
  lineNumbers?: boolean;
  onExecute?: (sql: string) => void;
  onSave?: (sql: string, name: string) => void;
}

/**
 * Pagination component props
 */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

/**
 * Helper function to create typed props in components
 */
export type QueryComponentProps<T = Record<string, unknown>> = QueryProps<T> & {
  class?: string;
  style?: string;
};

export type TableComponentProps<T extends Record<string, unknown>> = TableProps<T> & {
  class?: string;
  style?: string;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
};

export type FormComponentProps<T = Record<string, unknown>> = FormProps<T> & {
  class?: string;
  style?: string;
  disabled?: boolean;
  readonly?: boolean;
};

/**
 * Advanced bindable props for two-way binding
 */
export interface BindableQueryProps<T = Record<string, unknown>> {
  sql: string;
  params?: unknown[];
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Props for virtualized table (large datasets)
 */
export interface VirtualTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Array<{
    key: keyof T;
    label: string;
    width: number;
  }>;
  rowHeight: number;
  visibleRows: number;
  onScroll?: (startIndex: number, endIndex: number) => void;
}

/**
 * Props for query history component
 */
export interface QueryHistoryProps {
  maxItems?: number;
  showDuration?: boolean;
  showRowCount?: boolean;
  onRerun?: (query: string, params?: unknown[]) => void;
  onClear?: () => void;
}

/**
 * Props for connection status component
 */
export interface ConnectionStatusProps {
  showDetails?: boolean;
  reconnectButton?: boolean;
  onReconnect?: () => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}