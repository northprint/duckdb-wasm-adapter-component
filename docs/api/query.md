# Query API

Comprehensive API reference for query execution in DuckDB WASM Adapter.

## Overview

The Query API provides the core functionality for executing SQL queries, managing query state, and handling results across all supported frameworks.

## Core Query Functions

### `useQuery`

Execute a SQL query and reactively manage its state.

#### Signature

```typescript
function useQuery<T = any>(
  sql: string | (() => string),
  params?: any[] | (() => any[]),
  options?: QueryOptions
): QueryResult<T>

interface QueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  staleTime?: number;
  cacheTime?: number;
  retry?: number | boolean;
  retryDelay?: number | ((attempt: number) => number);
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
  onSettled?: (data?: T[], error?: Error) => void;
  suspense?: boolean;
  keepPreviousData?: boolean;
  initialData?: T[];
}

interface QueryResult<T> {
  data: T[] | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isRefetching: boolean;
  isStale: boolean;
  status: 'idle' | 'loading' | 'error' | 'success';
  fetchStatus: 'idle' | 'fetching' | 'paused';
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  isPlaceholderData: boolean;
  isPreviousData: boolean;
  isFetched: boolean;
  isFetchedAfterMount: boolean;
  isLoading: boolean;
  isLoadingError: boolean;
  isRefetchError: boolean;
  isSuccess: boolean;
}
```

#### Examples

##### Basic Query

```javascript
// React
function UserList() {
  const { data, loading, error } = useQuery(
    'SELECT * FROM users WHERE active = true'
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {data?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

##### Parameterized Query

```javascript
function UserDetails({ userId }) {
  const { data: user } = useQuery(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  return <div>{user?.[0]?.name}</div>;
}
```

##### Dynamic Query

```javascript
function DynamicQuery() {
  const [table, setTable] = useState('users');
  const [orderBy, setOrderBy] = useState('name');

  const { data } = useQuery(
    () => `SELECT * FROM ${table} ORDER BY ${orderBy}`,
    undefined,
    {
      enabled: Boolean(table) // Only run when table is set
    }
  );

  return <div>{/* Display data */}</div>;
}
```

##### With Options

```javascript
function AutoRefreshData() {
  const { data, refetch, isRefetching } = useQuery(
    'SELECT * FROM live_metrics',
    undefined,
    {
      refetchInterval: 5000, // Refresh every 5 seconds
      refetchOnWindowFocus: true,
      staleTime: 1000, // Consider data stale after 1 second
      cacheTime: 60000, // Keep in cache for 1 minute
      retry: 3,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
      onSuccess: (data) => {
        console.log('Data fetched successfully:', data);
      },
      onError: (error) => {
        console.error('Query failed:', error);
      }
    }
  );

  return (
    <div>
      {isRefetching && <span>Refreshing...</span>}
      <button onClick={refetch}>Manual Refresh</button>
      {/* Display data */}
    </div>
  );
}
```

### `useMutation`

Execute SQL mutations (INSERT, UPDATE, DELETE) with state management.

#### Signature

```typescript
function useMutation<TData = any, TVariables = any>(
  options?: MutationOptions<TData, TVariables>
): MutationResult<TData, TVariables>

interface MutationOptions<TData, TVariables> {
  mutationFn?: (variables: TVariables) => Promise<TData>;
  onMutate?: (variables: TVariables) => Promise<void> | void;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data?: TData, error?: Error, variables?: TVariables) => void;
  retry?: number | boolean;
  retryDelay?: number | ((attempt: number) => number);
}

interface MutationResult<TData, TVariables> {
  mutate: (sql: string, params?: any[]) => Promise<TData>;
  mutateAsync: (sql: string, params?: any[]) => Promise<TData>;
  data: TData | undefined;
  error: Error | null;
  loading: boolean;
  isIdle: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  status: 'idle' | 'pending' | 'success' | 'error';
  reset: () => void;
}
```

#### Examples

##### Basic Mutation

```javascript
function CreateUser() {
  const { mutate, loading, error } = useMutation({
    onSuccess: (data) => {
      console.log('User created:', data);
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    }
  });

  const handleSubmit = async (userData) => {
    await mutate(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [userData.name, userData.email]
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
      {error && <div>Error: {error.message}</div>}
    </form>
  );
}
```

##### Optimistic Updates

```javascript
function UpdateUser({ user }) {
  const queryClient = useQueryClient();
  
  const { mutate } = useMutation({
    onMutate: async (variables) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries(['users']);
      
      // Snapshot previous value
      const previousUsers = queryClient.getQueryData(['users']);
      
      // Optimistically update
      queryClient.setQueryData(['users'], old => {
        return old.map(u => 
          u.id === user.id ? { ...u, ...variables } : u
        );
      });
      
      return { previousUsers };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['users'], context.previousUsers);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries(['users']);
    }
  });

  return <div>{/* Update form */}</div>;
}
```

### `useInfiniteQuery`

Implement infinite scrolling and pagination.

#### Signature

```typescript
function useInfiniteQuery<T = any>(
  sql: string | ((pageParam: any) => string),
  options?: InfiniteQueryOptions<T>
): InfiniteQueryResult<T>

interface InfiniteQueryOptions<T> extends QueryOptions {
  getNextPageParam?: (lastPage: T[], pages: T[][]) => any;
  getPreviousPageParam?: (firstPage: T[], pages: T[][]) => any;
  initialPageParam?: any;
  maxPages?: number;
}

interface InfiniteQueryResult<T> extends QueryResult<T> {
  data: {
    pages: T[][];
    pageParams: any[];
  };
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
  fetchNextPage: () => Promise<void>;
  fetchPreviousPage: () => Promise<void>;
}
```

#### Example

```javascript
function InfiniteUserList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery(
    ({ pageParam = 0 }) => 
      `SELECT * FROM users ORDER BY id LIMIT 20 OFFSET ${pageParam}`,
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.length < 20) return undefined;
        return pages.length * 20;
      }
    }
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data?.pages.map((page, i) => (
        <React.Fragment key={i}>
          {page.map(user => (
            <div key={user.id}>{user.name}</div>
          ))}
        </React.Fragment>
      ))}
      
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage
          ? 'Loading more...'
          : hasNextPage
          ? 'Load More'
          : 'Nothing more to load'}
      </button>
    </div>
  );
}
```

## Query Utilities

### `useQueryClient`

Access the query client for cache management.

```javascript
function CacheManager() {
  const queryClient = useQueryClient();

  const invalidateUsers = () => {
    queryClient.invalidateQueries(['users']);
  };

  const prefetchUser = async (userId) => {
    await queryClient.prefetchQuery(
      ['user', userId],
      () => connection.execute('SELECT * FROM users WHERE id = ?', [userId])
    );
  };

  const setUserData = (userId, userData) => {
    queryClient.setQueryData(['user', userId], userData);
  };

  const getUserData = (userId) => {
    return queryClient.getQueryData(['user', userId]);
  };

  return (
    <div>
      <button onClick={invalidateUsers}>Refresh Users</button>
      <button onClick={() => prefetchUser(1)}>Prefetch User 1</button>
    </div>
  );
}
```

### `usePrefetch`

Prefetch data before it's needed.

```javascript
function Navigation() {
  const prefetch = usePrefetch();

  const handleMouseEnter = (userId) => {
    prefetch(
      ['user', userId],
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
  };

  return (
    <nav>
      <Link 
        to="/users/1" 
        onMouseEnter={() => handleMouseEnter(1)}
      >
        User 1
      </Link>
    </nav>
  );
}
```

### `useQueries`

Execute multiple queries in parallel.

```javascript
function Dashboard() {
  const results = useQueries([
    {
      queryKey: ['users'],
      queryFn: () => connection.execute('SELECT * FROM users')
    },
    {
      queryKey: ['orders'],
      queryFn: () => connection.execute('SELECT * FROM orders')
    },
    {
      queryKey: ['products'],
      queryFn: () => connection.execute('SELECT * FROM products')
    }
  ]);

  const isLoading = results.some(result => result.isLoading);
  const isError = results.some(result => result.isError);

  if (isLoading) return <div>Loading dashboard...</div>;
  if (isError) return <div>Error loading dashboard</div>;

  const [users, orders, products] = results.map(r => r.data);

  return (
    <div>
      <div>Users: {users.length}</div>
      <div>Orders: {orders.length}</div>
      <div>Products: {products.length}</div>
    </div>
  );
}
```

## Query Observers

### `QueryObserver`

Create custom query observers for advanced use cases.

```javascript
class CustomQueryObserver {
  constructor(queryClient, options) {
    this.queryClient = queryClient;
    this.options = options;
    this.currentResult = null;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    
    // Initial fetch
    this.fetch();
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  async fetch() {
    try {
      const result = await this.queryClient.fetchQuery(this.options);
      this.currentResult = { data: result, error: null };
    } catch (error) {
      this.currentResult = { data: null, error };
    }
    
    this.notify();
  }

  notify() {
    this.listeners.forEach(listener => {
      listener(this.currentResult);
    });
  }

  getCurrentResult() {
    return this.currentResult;
  }
}

// Usage
const observer = new CustomQueryObserver(queryClient, {
  queryKey: ['custom'],
  queryFn: async () => {
    return await connection.execute('SELECT * FROM custom_table');
  },
  staleTime: 5000
});

const unsubscribe = observer.subscribe(result => {
  console.log('Query result:', result);
});
```

## Query Filters

### Filter Queries

```javascript
// Get all active queries
const activeQueries = queryClient.getQueriesData({
  active: true
});

// Get queries by key prefix
const userQueries = queryClient.getQueriesData({
  queryKey: ['users']
});

// Get stale queries
const staleQueries = queryClient.getQueriesData({
  stale: true
});

// Get queries by predicate
const customQueries = queryClient.getQueriesData({
  predicate: query => query.queryKey[0] === 'custom'
});
```

### Invalidate Queries

```javascript
// Invalidate all queries
queryClient.invalidateQueries();

// Invalidate by key
queryClient.invalidateQueries(['users']);

// Invalidate by predicate
queryClient.invalidateQueries({
  predicate: query => query.queryKey.includes('stale')
});

// Invalidate with options
queryClient.invalidateQueries(['users'], {
  refetchActive: true,
  refetchInactive: false
});
```

## Query Persistence

### Persist Queries

```javascript
// Save query state
const dehydratedState = dehydrate(queryClient, {
  shouldDehydrateQuery: query => query.state.dataUpdatedAt > 0
});

localStorage.setItem('queryCache', JSON.stringify(dehydratedState));

// Restore query state
const persistedState = JSON.parse(localStorage.getItem('queryCache'));
hydrate(queryClient, persistedState);
```

## Error Handling

### Query Error Boundaries

```javascript
function QueryErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  const resetError = () => {
    setHasError(false);
    setError(null);
  };

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(event => {
      if (event.type === 'error') {
        setHasError(true);
        setError(event.error);
      }
    });

    return unsubscribe;
  }, []);

  if (hasError) {
    return fallback ? fallback(error, resetError) : (
      <div>
        <h2>Query Error</h2>
        <p>{error?.message}</p>
        <button onClick={resetError}>Reset</button>
      </div>
    );
  }

  return children;
}
```

### Global Error Handler

```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        console.error('Query error:', error);
        // Send to error tracking service
        trackError(error);
      },
      retry: (failureCount, error) => {
        if (error.status === 404) return false;
        if (failureCount >= 3) return false;
        return true;
      }
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error);
        // Show user notification
        showErrorNotification(error.message);
      }
    }
  }
});
```

## Performance Optimization

### Query Batching

```javascript
const batchedQuery = useBatchedQueries({
  queries: [
    { key: 'users', sql: 'SELECT * FROM users' },
    { key: 'orders', sql: 'SELECT * FROM orders' },
    { key: 'products', sql: 'SELECT * FROM products' }
  ],
  batchSize: 3,
  batchInterval: 100 // ms
});
```

### Query Deduplication

```javascript
// Multiple components requesting same data
// Only one network request is made
function ComponentA() {
  const { data } = useQuery('SELECT * FROM users');
  return <div>{/* Use data */}</div>;
}

function ComponentB() {
  const { data } = useQuery('SELECT * FROM users'); // Same query, no duplicate request
  return <div>{/* Use data */}</div>;
}
```

## Best Practices

1. **Use Query Keys**: Organize queries with structured keys
2. **Handle Loading States**: Always show loading indicators
3. **Handle Errors**: Provide meaningful error messages
4. **Use Caching**: Configure appropriate cache times
5. **Prefetch Data**: Anticipate user actions
6. **Optimize Refetching**: Use smart refetch strategies
7. **Clean Up**: Cancel queries when components unmount

## Next Steps

- [Mutation API](/api/mutation) - Data mutations
- [Cache API](/api/cache) - Cache management
- [Performance API](/api/performance) - Performance optimization