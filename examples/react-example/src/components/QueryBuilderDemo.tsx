import React, { useState, useCallback } from 'react';
import { useQueryBuilder, useQueryBuilderQuery } from '@duckdb-wasm-adapter/react';
import type { QueryBuilder } from '@duckdb-wasm-adapter/core';

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
  hire_date: string;
}

export default function QueryBuilderDemo() {
  const { isConnected, table, select, from } = useQueryBuilder();
  const [results, setResults] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [querySQL, setQuerySQL] = useState<string>('');

  // Example 1: Simple select
  const simpleSelect = useQueryBuilderQuery<Employee>((qb) => 
    qb.select('*').from('employees')
  );

  // Example 2: Filtered query
  const filteredQuery = useQueryBuilderQuery<Employee>((qb) =>
    qb.select('name', 'department', 'salary')
      .from('employees')
      .where('salary', '>', 55000)
      .orderBy('salary', 'DESC')
  );

  // Example 3: Aggregation
  const aggregateQuery = useQueryBuilderQuery<{ department: string; avg_salary: number; employee_count: number }>((qb) =>
    qb.select('department')
      .count('*', 'employee_count')
      .avg('salary', 'avg_salary')
      .from('employees')
      .groupBy('department')
      .orderBy('avg_salary', 'DESC')
  );

  // Example 4: Complex query with joins (if we had another table)
  const complexQuery = useQueryBuilderQuery<Employee>((qb) => {
    const query = qb.select('e.name', 'e.department', 'e.salary')
      .from('employees', 'e')
      .where('e.department', '=', 'Engineering')
      .orWhere('e.department', '=', 'Sales')
      .whereBetween('e.salary', 50000, 80000)
      .orderBy('e.salary', 'DESC')
      .limit(5);
    
    return query;
  });

  // Example 5: Using table helper
  const tableQuery = useQueryBuilderQuery<Employee>((qb) => {
    return qb.table('employees')
      .select('name', 'salary')
      .where('department', '=', 'Engineering')
      .orderBy('salary', 'DESC')
      .limit(3);
  });

  const handleQuery = useCallback(async (name: string, queryFn: () => Promise<any[]>, buildSql?: () => string) => {
    if (!isConnected) {
      setError('Not connected to database');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      if (buildSql) {
        setQuerySQL(buildSql());
      }
      const data = await queryFn();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Please connect to the database first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Query Builder Demo</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleQuery(
            'Simple Select',
            simpleSelect.execute,
            () => select('*').from('employees').build()
          )}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          disabled={loading}
        >
          Simple Select All
        </button>

        <button
          onClick={() => handleQuery(
            'Filtered Query',
            filteredQuery.execute,
            () => select('name', 'department', 'salary')
              .from('employees')
              .where('salary', '>', 55000)
              .orderBy('salary', 'DESC')
              .build()
          )}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
          disabled={loading}
        >
          High Salary Employees
        </button>

        <button
          onClick={() => handleQuery(
            'Aggregate Query',
            aggregateQuery.execute,
            () => select('department')
              .count('*', 'employee_count')
              .avg('salary', 'avg_salary')
              .from('employees')
              .groupBy('department')
              .orderBy('avg_salary', 'DESC')
              .build()
          )}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
          disabled={loading}
        >
          Department Statistics
        </button>

        <button
          onClick={() => handleQuery(
            'Complex Query',
            complexQuery.execute,
            () => select('e.name', 'e.department', 'e.salary')
              .from('employees', 'e')
              .where('e.department', '=', 'Engineering')
              .orWhere('e.department', '=', 'Sales')
              .whereBetween('e.salary', 50000, 80000)
              .orderBy('e.salary', 'DESC')
              .limit(5)
              .build()
          )}
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors"
          disabled={loading}
        >
          Complex Filtering
        </button>

        <button
          onClick={() => handleQuery(
            'Table Helper',
            tableQuery.execute,
            () => table('employees')
              .select('name', 'salary')
              .where('department', '=', 'Engineering')
              .orderBy('salary', 'DESC')
              .limit(3)
              .build()
          )}
          className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors"
          disabled={loading}
        >
          Top Engineers
        </button>

        <button
          onClick={async () => {
            if (!isConnected) return;
            setLoading(true);
            setError(null);
            try {
              // Build dynamic query
              const query = select('name', 'department')
                .from('employees');
              
              // Add random filter
              if (Math.random() > 0.5) {
                query.where('salary', '>', 60000);
              }
              
              query.orderBy('name', 'ASC').limit(10);
              
              setQuerySQL(query.build());
              const result = await query.execute<Employee>();
              setResults(result);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Query failed');
            } finally {
              setLoading(false);
            }
          }}
          className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition-colors"
          disabled={loading}
        >
          Dynamic Query
        </button>
      </div>

      {querySQL && (
        <div className="bg-gray-100 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Generated SQL:</h3>
          <pre className="bg-white p-3 rounded border border-gray-300 overflow-x-auto">
            <code className="text-sm">{querySQL}</code>
          </pre>
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gray-50 px-4 py-2">
            <h3 className="font-semibold">Results ({results.length} rows)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(results[0]).map((key) => (
                    <th
                      key={key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {Object.entries(row).map(([key, value], j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof value === 'number' && key.includes('salary') 
                          ? `$${value.toLocaleString()}`
                          : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}