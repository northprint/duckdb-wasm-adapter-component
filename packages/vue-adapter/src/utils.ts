/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Convert query result to CSV string
 */
export function resultToCSV<T extends Record<string, any>>(data: T[]): string {
  if (!data || data.length === 0) {
    return '';
  }
  
  const firstRow = data[0];
  if (!firstRow) {
    return '';
  }
  
  const headers = Object.keys(firstRow);
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      // Escape values containing comma, quotes, or newlines
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Download data as file
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType = 'text/plain'
): void {
  const blob = content instanceof Blob 
    ? content 
    : new Blob([content], { type: mimeType });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Parse SQL query to determine type
 */
export function getQueryType(sql: string): string {
  const trimmed = sql.trim().toUpperCase();
  const firstWord = trimmed.split(/\s+/)[0];
  
  switch (firstWord) {
    case 'SELECT':
    case 'WITH':
      return 'SELECT';
    case 'INSERT':
      return 'INSERT';
    case 'UPDATE':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    case 'CREATE':
      return 'CREATE';
    case 'DROP':
      return 'DROP';
    case 'ALTER':
      return 'ALTER';
    case 'TRUNCATE':
      return 'TRUNCATE';
    default:
      return 'OTHER';
  }
}

/**
 * Check if query is read-only
 */
export function isReadOnlyQuery(sql: string): boolean {
  const queryType = getQueryType(sql);
  return queryType === 'SELECT';
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}