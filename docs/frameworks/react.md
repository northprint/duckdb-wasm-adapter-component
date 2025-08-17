# React Framework Guide

Complete guide to using DuckDB WASM Adapter with React applications.

## Quick Start

### Installation

```bash
npm install @northprint/duckdb-wasm-adapter-react
```

### Basic Setup

```jsx
// src/App.jsx
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <DuckDBProvider autoConnect>
      <div className="App">
        <Dashboard />
      </div>
    </DuckDBProvider>
  );
}

export default App;
```

### First Query

```jsx
// src/components/Dashboard.jsx
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

function Dashboard() {
  const { data, loading, error } = useQuery('SELECT 42 as answer');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>The answer is: {data?.[0]?.answer}</p>
    </div>
  );
}

export default Dashboard;
```

## Core Concepts

### Provider Context

The `DuckDBProvider` manages the database connection and provides context to child components:

```jsx
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';

function App() {
  return (
    <DuckDBProvider
      autoConnect={true}
      config={{
        worker: true,
        cache: { enabled: true },
        debug: { enabled: process.env.NODE_ENV === 'development' }
      }}
      onConnect={() => console.log('Connected!')}
      onError={(error) => console.error('Connection failed:', error)}
    >
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Router>
    </DuckDBProvider>
  );
}
```

### Hook-Based API

React hooks provide reactive access to database functionality:

```jsx
import { 
  useQuery, 
  useMutation, 
  useImportCSV, 
  useDuckDB 
} from '@northprint/duckdb-wasm-adapter-react';

function MyComponent() {
  // Connection status
  const { status, isConnected } = useDuckDB();
  
  // Data fetching
  const { data, loading, error, refetch } = useQuery('SELECT * FROM users');
  
  // Data mutations
  const { mutate } = useMutation();
  
  // Data import
  const { importCSV } = useImportCSV();
  
  // Component logic...
}
```

## Data Fetching Patterns

### Simple Queries

```jsx
function UserList() {
  const { data: users, loading, error } = useQuery(`
    SELECT id, name, email, department 
    FROM users 
    WHERE active = true
    ORDER BY name
  `);

  if (loading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error">Failed to load users</div>;

  return (
    <div className="user-list">
      <h2>Active Users ({users?.length || 0})</h2>
      <div className="user-grid">
        {users?.map(user => (
          <div key={user.id} className="user-card">
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <span className="department">{user.department}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Parameterized Queries

```jsx
function FilteredUsers() {
  const [department, setDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, loading } = useQuery(
    `SELECT * FROM users 
     WHERE ($1 = '' OR department = $1)
     AND ($2 = '' OR name ILIKE '%' || $2 || '%')
     ORDER BY name`,
    [department, searchTerm],
    {
      enabled: true // Always enabled, will re-run when params change
    }
  );

  return (
    <div>
      <div className="filters">
        <select 
          value={department} 
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="">All Departments</option>
          <option value="Engineering">Engineering</option>
          <option value="Sales">Sales</option>
          <option value="Marketing">Marketing</option>
        </select>
        
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div>Searching...</div>
      ) : (
        <div>
          <p>Found {users?.length || 0} users</p>
          <UserGrid users={users} />
        </div>
      )}
    </div>
  );
}
```

### Conditional Queries

```jsx
function UserDetails({ userId }) {
  const { data: user, loading, error } = useQuery(
    'SELECT * FROM users WHERE id = ?',
    [userId],
    {
      enabled: Boolean(userId) // Only run when userId is provided
    }
  );

  const { data: userOrders } = useQuery(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    {
      enabled: Boolean(user) // Only run when user is loaded
    }
  );

  if (!userId) {
    return <div>Please select a user</div>;
  }

  if (loading) return <div>Loading user details...</div>;
  if (error) return <div>Error loading user</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-details">
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
      <p>Department: {user.department}</p>
      
      {userOrders && (
        <div>
          <h3>Recent Orders</h3>
          <OrdersList orders={userOrders} />
        </div>
      )}
    </div>
  );
}
```

## Data Mutations

### Creating Records

```jsx
function CreateUser() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: ''
  });

  const { mutate: createUser, loading, error } = useMutation({
    onSuccess: (result) => {
      console.log('User created:', result);
      setFormData({ name: '', email: '', department: '' });
      // Optionally refetch users list
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createUser(
      'INSERT INTO users (name, email, department) VALUES (?, ?, ?) RETURNING *',
      [formData.name, formData.email, formData.department]
    );
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="create-user-form">
      <h2>Create New User</h2>
      
      <div className="form-group">
        <label htmlFor="name">Name:</label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="department">Department:</label>
        <select
          id="department"
          name="department"
          value={formData.department}
          onChange={handleChange}
          required
        >
          <option value="">Select Department</option>
          <option value="Engineering">Engineering</option>
          <option value="Sales">Sales</option>
          <option value="Marketing">Marketing</option>
        </select>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>

      {error && (
        <div className="error">
          Error: {error.message}
        </div>
      )}
    </form>
  );
}
```

### Updating Records

```jsx
function EditUser({ user, onUpdate }) {
  const [formData, setFormData] = useState(user);

  const { mutate: updateUser, loading } = useMutation({
    onSuccess: (result) => {
      onUpdate(result[0]); // Updated user data
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateUser(
      'UPDATE users SET name = ?, email = ?, department = ? WHERE id = ? RETURNING *',
      [formData.name, formData.email, formData.department, user.id]
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        required
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        required
      />
      <select
        value={formData.department}
        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
        required
      >
        <option value="Engineering">Engineering</option>
        <option value="Sales">Sales</option>
        <option value="Marketing">Marketing</option>
      </select>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update User'}
      </button>
    </form>
  );
}
```

### Deleting Records

```jsx
function UserCard({ user, onDelete }) {
  const { mutate: deleteUser, loading } = useMutation({
    onSuccess: () => {
      onDelete(user.id);
    }
  });

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      await deleteUser('DELETE FROM users WHERE id = ?', [user.id]);
    }
  };

  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      
      <div className="actions">
        <button onClick={() => onEdit(user)}>Edit</button>
        <button 
          onClick={handleDelete} 
          disabled={loading}
          className="danger"
        >
          {loading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
```

## Data Import/Export

### CSV Import

```jsx
function CSVImporter() {
  const { importCSV, loading, error } = useImportCSV({
    onSuccess: (result) => {
      console.log('Import completed:', result);
    },
    onError: (error) => {
      console.error('Import failed:', error);
    }
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    await importCSV(file, 'imported_users', {
      header: true,
      delimiter: ',',
      nullString: 'NULL'
    });
  };

  return (
    <div className="csv-importer">
      <h3>Import Users from CSV</h3>
      
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={loading}
      />
      
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          Importing CSV file...
        </div>
      )}
      
      {error && (
        <div className="error">
          Import failed: {error.message}
        </div>
      )}
    </div>
  );
}
```

### Data Export

```jsx
function DataExporter() {
  const { exportCSV, exportJSON } = useExport();

  const handleExportCSV = async () => {
    try {
      const csv = await exportCSV('SELECT * FROM users ORDER BY name');
      downloadFile(csv, 'users.csv', 'text/csv');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportJSON = async () => {
    try {
      const data = await exportJSON('SELECT * FROM users ORDER BY name');
      downloadFile(JSON.stringify(data, null, 2), 'users.json', 'application/json');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="data-exporter">
      <h3>Export Data</h3>
      <button onClick={handleExportCSV}>Export as CSV</button>
      <button onClick={handleExportJSON}>Export as JSON</button>
    </div>
  );
}
```

## Advanced Patterns

### Custom Hooks

```jsx
// hooks/useUsers.js
import { useQuery, useMutation } from '@northprint/duckdb-wasm-adapter-react';

export function useUsers(filters = {}) {
  const { data: users, loading, error, refetch } = useQuery(
    buildUserQuery(filters),
    buildUserParams(filters)
  );

  const { mutate: createUser } = useMutation({
    onSuccess: () => refetch()
  });

  const { mutate: updateUser } = useMutation({
    onSuccess: () => refetch()
  });

  const { mutate: deleteUser } = useMutation({
    onSuccess: () => refetch()
  });

  return {
    users,
    loading,
    error,
    refetch,
    createUser: (userData) => createUser(
      'INSERT INTO users (name, email, department) VALUES (?, ?, ?)',
      [userData.name, userData.email, userData.department]
    ),
    updateUser: (id, userData) => updateUser(
      'UPDATE users SET name = ?, email = ?, department = ? WHERE id = ?',
      [userData.name, userData.email, userData.department, id]
    ),
    deleteUser: (id) => deleteUser('DELETE FROM users WHERE id = ?', [id])
  };
}

function buildUserQuery(filters) {
  let query = 'SELECT * FROM users WHERE 1=1';
  if (filters.department) query += ' AND department = ?';
  if (filters.active !== undefined) query += ' AND active = ?';
  return query + ' ORDER BY name';
}

function buildUserParams(filters) {
  const params = [];
  if (filters.department) params.push(filters.department);
  if (filters.active !== undefined) params.push(filters.active);
  return params;
}
```

### Error Boundaries

```jsx
import React from 'react';

class DuckDBErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('DuckDB Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Database Error</h2>
          <details>
            <summary>Error Details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <DuckDBErrorBoundary>
      <DuckDBProvider autoConnect>
        <Dashboard />
      </DuckDBProvider>
    </DuckDBErrorBoundary>
  );
}
```

### Query Builder Integration

```jsx
import { useQueryBuilder } from '@northprint/duckdb-wasm-adapter-react';
import { select } from '@northprint/duckdb-wasm-adapter-core';

function AdvancedUserSearch() {
  const [filters, setFilters] = useState({
    department: '',
    minSalary: 0,
    maxSalary: 200000,
    active: true
  });

  const queryBuilder = useQueryBuilder();

  const query = useMemo(() => {
    let builder = select('id', 'name', 'email', 'department', 'salary')
      .from('users');

    if (filters.department) {
      builder = builder.where('department', '=', filters.department);
    }

    if (filters.minSalary > 0) {
      builder = builder.where('salary', '>=', filters.minSalary);
    }

    if (filters.maxSalary < 200000) {
      builder = builder.where('salary', '<=', filters.maxSalary);
    }

    if (filters.active !== null) {
      builder = builder.where('active', '=', filters.active);
    }

    return builder.orderBy('name').limit(100);
  }, [filters]);

  const { data: users, loading } = queryBuilder.execute(query, {
    enabled: true
  });

  return (
    <div className="advanced-search">
      <div className="filters">
        <select
          value={filters.department}
          onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
        >
          <option value="">All Departments</option>
          <option value="Engineering">Engineering</option>
          <option value="Sales">Sales</option>
        </select>

        <input
          type="range"
          min="0"
          max="200000"
          step="5000"
          value={filters.minSalary}
          onChange={(e) => setFilters(prev => ({ ...prev, minSalary: Number(e.target.value) }))}
        />
        <span>Min Salary: ${filters.minSalary.toLocaleString()}</span>

        <label>
          <input
            type="checkbox"
            checked={filters.active}
            onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.checked }))}
          />
          Active Only
        </label>
      </div>

      {loading ? (
        <div>Searching...</div>
      ) : (
        <UserGrid users={users} />
      )}
    </div>
  );
}
```

## Performance Optimization

### Memoization

```jsx
import { memo, useMemo } from 'react';

const UserCard = memo(function UserCard({ user, onEdit, onDelete }) {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <button onClick={() => onEdit(user)}>Edit</button>
      <button onClick={() => onDelete(user.id)}>Delete</button>
    </div>
  );
});

function UserList() {
  const { data: users } = useQuery('SELECT * FROM users ORDER BY name');

  const sortedUsers = useMemo(() => {
    return users?.sort((a, b) => a.name.localeCompare(b.name)) || [];
  }, [users]);

  const handleEdit = useCallback((user) => {
    // Edit logic
  }, []);

  const handleDelete = useCallback((userId) => {
    // Delete logic
  }, []);

  return (
    <div className="user-list">
      {sortedUsers.map(user => (
        <UserCard
          key={user.id}
          user={user}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
```

### Pagination

```jsx
function PaginatedUsers() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const offset = (page - 1) * pageSize;

  const { data: users, loading } = useQuery(
    'SELECT * FROM users ORDER BY name LIMIT ? OFFSET ?',
    [pageSize, offset]
  );

  const { data: countResult } = useQuery('SELECT COUNT(*) as total FROM users');
  const totalUsers = countResult?.[0]?.total || 0;
  const totalPages = Math.ceil(totalUsers / pageSize);

  return (
    <div className="paginated-users">
      <div className="pagination-info">
        Showing {users?.length || 0} of {totalUsers} users
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <UserGrid users={users} />
      )}

      <div className="pagination">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>

        <span className="page-info">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

## React 19.1 Features

### Using with useActionState

React 19.1's `useActionState` hook provides better form state management:

```jsx
import { useActionState } from 'react';
import { useMutation } from '@northprint/duckdb-wasm-adapter-react';

function UserForm() {
  const { mutate } = useMutation();
  
  const [state, formAction, isPending] = useActionState(
    async (prevState, formData) => {
      try {
        const result = await mutate(
          'INSERT INTO users (name, email) VALUES (?, ?) RETURNING *',
          [formData.get('name'), formData.get('email')]
        );
        return { success: true, user: result[0] };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    { success: false }
  );

  return (
    <form action={formAction}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </button>
      {state.success && <p>User created successfully!</p>}
      {state.error && <p>Error: {state.error}</p>}
    </form>
  );
}
```

### Optimistic Updates with useOptimistic

React 19.1's `useOptimistic` enables immediate UI updates:

```jsx
import { useOptimistic } from 'react';
import { useQuery, useMutation } from '@northprint/duckdb-wasm-adapter-react';

function TodoList() {
  const { data: todos, refetch } = useQuery('SELECT * FROM todos ORDER BY created_at DESC');
  const { mutate } = useMutation();
  
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos || [],
    (state, newTodo) => [newTodo, ...state]
  );

  const handleAddTodo = async (text) => {
    const tempTodo = { 
      id: `temp-${Date.now()}`, 
      text, 
      completed: false,
      created_at: new Date().toISOString()
    };
    
    // Optimistically add the todo
    addOptimisticTodo(tempTodo);
    
    try {
      await mutate(
        'INSERT INTO todos (text, completed) VALUES (?, false)',
        [text]
      );
      await refetch(); // Sync with database
    } catch (error) {
      console.error('Failed to add todo:', error);
      // The optimistic update will be rolled back automatically
    }
  };

  return (
    <div>
      <TodoInput onAdd={handleAddTodo} />
      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id} className={todo.id.startsWith('temp-') ? 'pending' : ''}>
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Background Data Loading with useTransition

React 19.1's `useTransition` helps manage non-urgent updates:

```jsx
import { useState, useTransition } from 'react';
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

function DataAnalytics() {
  const [isPending, startTransition] = useTransition();
  const [timeRange, setTimeRange] = useState('week');
  const [displayRange, setDisplayRange] = useState('week');
  
  const { data, loading } = useQuery(
    `SELECT * FROM analytics 
     WHERE created_at > now() - interval '1 ${displayRange}'
     ORDER BY created_at DESC`,
    [displayRange]
  );

  const handleRangeChange = (newRange) => {
    setTimeRange(newRange);
    startTransition(() => {
      setDisplayRange(newRange);
    });
  };

  return (
    <div>
      <div className="controls">
        <select value={timeRange} onChange={(e) => handleRangeChange(e.target.value)}>
          <option value="day">Last Day</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="year">Last Year</option>
        </select>
        {isPending && <span className="pending-indicator">Updating...</span>}
      </div>
      
      <div className={isPending ? 'updating' : ''}>
        {loading ? (
          <div>Loading analytics...</div>
        ) : (
          <AnalyticsChart data={data} />
        )}
      </div>
    </div>
  );
}
```

### Suspense with use() Hook

React 19.1's `use()` hook works seamlessly with Suspense:

```jsx
import { use, Suspense } from 'react';
import { createConnection } from '@northprint/duckdb-wasm-adapter-react';

// Create a promise that resolves with query results
function createQueryPromise(sql, params) {
  return createConnection().then(conn => 
    conn.execute(sql, params).then(result => result.toArray())
  );
}

function UserData({ userPromise }) {
  // use() unwraps the promise in a Suspense-compatible way
  const userData = use(userPromise);
  
  return (
    <div className="user-data">
      <h2>{userData.name}</h2>
      <p>Email: {userData.email}</p>
      <p>Department: {userData.department}</p>
    </div>
  );
}

function UserProfile({ userId }) {
  const userPromise = createQueryPromise(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  ).then(results => results[0]);

  return (
    <Suspense fallback={<div>Loading user profile...</div>}>
      <UserData userPromise={userPromise} />
    </Suspense>
  );
}
```

### Server Components Integration

When using React Server Components with DuckDB:

```jsx
// app/users/page.jsx (Server Component)
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

async function UsersPage() {
  const connection = await createConnection();
  const result = await connection.execute('SELECT * FROM users ORDER BY name');
  const users = result.toArray();
  
  return (
    <div>
      <h1>Users</h1>
      <UserList users={users} />
    </div>
  );
}

// components/UserList.jsx (Client Component)
'use client';

import { useState } from 'react';
import { useOptimistic } from 'react';

export function UserList({ users: initialUsers }) {
  const [users, setUsers] = useState(initialUsers);
  const [optimisticUsers, updateOptimisticUsers] = useOptimistic(users);
  
  // Client-side interactions...
  
  return (
    <ul>
      {optimisticUsers.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## Testing

### Component Testing

```jsx
// __tests__/UserList.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';
import UserList from '../components/UserList';

function renderWithProvider(component) {
  return render(
    <DuckDBProvider config={{ worker: false }}>
      {component}
    </DuckDBProvider>
  );
}

test('renders user list', async () => {
  renderWithProvider(<UserList />);
  
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText('Users')).toBeInTheDocument();
  });
});
```

### Hook Testing

```jsx
// __tests__/useUsers.test.jsx
import { renderHook, waitFor } from '@testing-library/react';
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';
import { useUsers } from '../hooks/useUsers';

const wrapper = ({ children }) => (
  <DuckDBProvider config={{ worker: false }}>
    {children}
  </DuckDBProvider>
);

test('fetches users', async () => {
  const { result } = renderHook(() => useUsers(), { wrapper });
  
  expect(result.current.loading).toBe(true);
  
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.users).toBeDefined();
  });
});
```

## Best Practices

### 1. Use TypeScript

```tsx
interface User {
  id: number;
  name: string;
  email: string;
  department: string;
  active: boolean;
}

function UserList(): JSX.Element {
  const { data: users, loading, error } = useQuery<User>(
    'SELECT * FROM users ORDER BY name'
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {users?.map((user: User) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### 2. Handle Loading States

```jsx
function UserList() {
  const { data, loading, error } = useQuery('SELECT * FROM users');

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        Loading users...
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <h3>Failed to load users</h3>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return <UserGrid users={data} />;
}
```

### 3. Optimize Re-renders

```jsx
// Use React.memo for expensive components
const ExpensiveUserCard = memo(function UserCard({ user }) {
  return (
    <div className="user-card">
      {/* Complex rendering logic */}
    </div>
  );
});

// Use useCallback for event handlers
function UserList() {
  const { data: users } = useQuery('SELECT * FROM users');

  const handleUserClick = useCallback((userId) => {
    // Handle click
  }, []);

  return (
    <div>
      {users?.map(user => (
        <ExpensiveUserCard
          key={user.id}
          user={user}
          onClick={handleUserClick}
        />
      ))}
    </div>
  );
}
```

### 4. Error Boundaries

```jsx
function App() {
  return (
    <ErrorBoundary>
      <DuckDBProvider autoConnect>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<UserManagement />} />
          </Routes>
        </Router>
      </DuckDBProvider>
    </ErrorBoundary>
  );
}
```

This guide covers the essential patterns for building React applications with DuckDB WASM Adapter. The reactive hooks pattern makes it easy to build responsive, data-driven applications entirely in the browser.