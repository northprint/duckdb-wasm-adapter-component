import { writable } from 'svelte/store';
import type { QueryResult } from './types.js';

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
 * Convert query result to CSV string
 */
export function resultToCSV<T>(result: QueryResult<T>): string {
  if (!result.data || result.data.length === 0) {
    return '';
  }
  
  const headers = Object.keys(result.data[0] as object);
  const rows = result.data.map(row => 
    headers.map(header => {
      const value = (row as any)[header];
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
 * Parse SQL query to determine type (SELECT, INSERT, UPDATE, DELETE, etc.)
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
 * Check if query is a read-only query
 */
export function isReadOnlyQuery(sql: string): boolean {
  const queryType = getQueryType(sql);
  return queryType === 'SELECT';
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Create a derived store that automatically refetches on interval
 */
export function createAutoRefreshStore<T>(
  queryFn: () => Promise<T>,
  interval: number,
  initialValue: T
) {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const { subscribe, set } = writable(initialValue);
  
  const start = async () => {
    // Initial fetch
    try {
      const data = await queryFn();
      set(data);
    } catch (error) {
      console.error('Auto-refresh query failed:', error);
    }
    
    // Set up interval
    intervalId = setInterval(async () => {
      try {
        const data = await queryFn();
        set(data);
      } catch (error) {
        console.error('Auto-refresh query failed:', error);
      }
    }, interval);
  };
  
  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
  
  return {
    subscribe,
    start,
    stop,
  };
}

