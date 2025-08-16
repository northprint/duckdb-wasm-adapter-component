# Basic CRUD Example

A complete example showing Create, Read, Update, Delete operations with DuckDB WASM Adapter.

## Overview

This example demonstrates how to build a full CRUD (Create, Read, Update, Delete) application using DuckDB WASM Adapter. We'll create a simple employee management system that supports all basic operations.

## React Implementation

### Complete App Structure

```jsx
// src/App.jsx
import React from 'react';
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';
import EmployeeManager from './components/EmployeeManager';
import './App.css';

function App() {
  return (
    <DuckDBProvider autoConnect>
      <div className="App">
        <h1>Employee Management System</h1>
        <EmployeeManager />
      </div>
    </DuckDBProvider>
  );
}

export default App;
```

### Main Component

```jsx
// src/components/EmployeeManager.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@northprint/duckdb-wasm-adapter-react';
import EmployeeForm from './EmployeeForm';
import EmployeeList from './EmployeeList';

function EmployeeManager() {
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Initialize database table
  const { mutate: initDB } = useMutation();

  useEffect(() => {
    // Create table on component mount
    initDB(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY,
        first_name VARCHAR NOT NULL,
        last_name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        department VARCHAR NOT NULL,
        salary DECIMAL(10,2),
        hire_date DATE DEFAULT CURRENT_DATE,
        active BOOLEAN DEFAULT true
      )
    `);
  }, [initDB]);

  // Fetch all employees
  const { 
    data: employees, 
    loading, 
    error, 
    refetch 
  } = useQuery(`
    SELECT 
      id,
      first_name,
      last_name,
      email,
      department,
      salary,
      hire_date,
      active
    FROM employees 
    ORDER BY last_name, first_name
  `);

  // Create employee mutation
  const { mutate: createEmployee, loading: creating } = useMutation({
    onSuccess: () => {
      refetch();
      setShowForm(false);
      alert('Employee created successfully!');
    },
    onError: (error) => {
      alert('Failed to create employee: ' + error.message);
    }
  });

  // Update employee mutation
  const { mutate: updateEmployee, loading: updating } = useMutation({
    onSuccess: () => {
      refetch();
      setEditingEmployee(null);
      setShowForm(false);
      alert('Employee updated successfully!');
    },
    onError: (error) => {
      alert('Failed to update employee: ' + error.message);
    }
  });

  // Delete employee mutation
  const { mutate: deleteEmployee } = useMutation({
    onSuccess: () => {
      refetch();
      alert('Employee deleted successfully!');
    },
    onError: (error) => {
      alert('Failed to delete employee: ' + error.message);
    }
  });

  const handleCreate = (employeeData) => {
    createEmployee(
      `INSERT INTO employees (first_name, last_name, email, department, salary)
       VALUES (?, ?, ?, ?, ?)`,
      [
        employeeData.first_name,
        employeeData.last_name,
        employeeData.email,
        employeeData.department,
        employeeData.salary
      ]
    );
  };

  const handleUpdate = (employeeData) => {
    updateEmployee(
      `UPDATE employees 
       SET first_name = ?, last_name = ?, email = ?, department = ?, salary = ?
       WHERE id = ?`,
      [
        employeeData.first_name,
        employeeData.last_name,
        employeeData.email,
        employeeData.department,
        employeeData.salary,
        editingEmployee.id
      ]
    );
  };

  const handleDelete = (employeeId) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      deleteEmployee('DELETE FROM employees WHERE id = ?', [employeeId]);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingEmployee(null);
    setShowForm(false);
  };

  if (loading) return <div className="loading">Loading employees...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;

  return (
    <div className="employee-manager">
      <div className="header">
        <h2>Employees ({employees?.length || 0})</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={showForm}
        >
          Add Employee
        </button>
      </div>

      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          onSubmit={editingEmployee ? handleUpdate : handleCreate}
          onCancel={handleCancel}
          loading={creating || updating}
        />
      )}

      <EmployeeList
        employees={employees || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default EmployeeManager;
```

### Employee Form Component

```jsx
// src/components/EmployeeForm.jsx
import React, { useState, useEffect } from 'react';

function EmployeeForm({ employee, onSubmit, onCancel, loading }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    salary: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        department: employee.department || '',
        salary: employee.salary || ''
      });
    }
  }, [employee]);

  const departments = [
    'Engineering',
    'Sales',
    'Marketing',
    'Human Resources',
    'Finance',
    'Operations'
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.department) {
      newErrors.department = 'Department is required';
    }

    if (!formData.salary || isNaN(formData.salary) || parseFloat(formData.salary) <= 0) {
      newErrors.salary = 'Valid salary is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        salary: parseFloat(formData.salary)
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="employee-form">
      <h3>{employee ? 'Edit Employee' : 'Add New Employee'}</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="first_name">First Name *</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className={errors.first_name ? 'error' : ''}
            />
            {errors.first_name && <span className="error-text">{errors.first_name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="last_name">Last Name *</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className={errors.last_name ? 'error' : ''}
            />
            {errors.last_name && <span className="error-text">{errors.last_name}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="department">Department *</label>
            <select
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className={errors.department ? 'error' : ''}
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            {errors.department && <span className="error-text">{errors.department}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="salary">Salary *</label>
            <input
              type="number"
              id="salary"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={errors.salary ? 'error' : ''}
            />
            {errors.salary && <span className="error-text">{errors.salary}</span>}
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : (employee ? 'Update' : 'Create')}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EmployeeForm;
```

### Employee List Component

```jsx
// src/components/EmployeeList.jsx
import React, { useState } from 'react';

function EmployeeList({ employees, onEdit, onDelete }) {
  const [sortField, setSortField] = useState('last_name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterDepartment, setFilterDepartment] = useState('');

  // Get unique departments for filter
  const departments = [...new Set(employees.map(emp => emp.department))];

  // Filter and sort employees
  const filteredAndSortedEmployees = employees
    .filter(emp => !filterDepartment || emp.department === filterDepartment)
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (employees.length === 0) {
    return (
      <div className="empty-state">
        <p>No employees found. Add your first employee to get started.</p>
      </div>
    );
  }

  return (
    <div className="employee-list">
      <div className="list-controls">
        <div className="filter-group">
          <label htmlFor="department-filter">Filter by Department:</label>
          <select
            id="department-filter"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        
        <div className="results-count">
          Showing {filteredAndSortedEmployees.length} of {employees.length} employees
        </div>
      </div>

      <div className="table-container">
        <table className="employee-table">
          <thead>
            <tr>
              <th 
                className={`sortable ${sortField === 'first_name' ? sortDirection : ''}`}
                onClick={() => handleSort('first_name')}
              >
                First Name
              </th>
              <th 
                className={`sortable ${sortField === 'last_name' ? sortDirection : ''}`}
                onClick={() => handleSort('last_name')}
              >
                Last Name
              </th>
              <th 
                className={`sortable ${sortField === 'email' ? sortDirection : ''}`}
                onClick={() => handleSort('email')}
              >
                Email
              </th>
              <th 
                className={`sortable ${sortField === 'department' ? sortDirection : ''}`}
                onClick={() => handleSort('department')}
              >
                Department
              </th>
              <th 
                className={`sortable ${sortField === 'salary' ? sortDirection : ''}`}
                onClick={() => handleSort('salary')}
              >
                Salary
              </th>
              <th 
                className={`sortable ${sortField === 'hire_date' ? sortDirection : ''}`}
                onClick={() => handleSort('hire_date')}
              >
                Hire Date
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedEmployees.map(employee => (
              <tr key={employee.id}>
                <td>{employee.first_name}</td>
                <td>{employee.last_name}</td>
                <td>{employee.email}</td>
                <td>{employee.department}</td>
                <td>{formatCurrency(employee.salary)}</td>
                <td>{formatDate(employee.hire_date)}</td>
                <td className="actions">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => onEdit(employee)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => onDelete(employee.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EmployeeList;
```

### Styling

```css
/* src/App.css */
.App {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.employee-manager {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e1e5e9;
}

.employee-form {
  background: #f8f9fa;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #344054;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d0d5dd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input.error,
.form-group select.error {
  border-color: #f04438;
}

.error-text {
  display: block;
  color: #f04438;
  font-size: 12px;
  margin-top: 4px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-outline {
  background: white;
  color: #007bff;
  border: 1px solid #007bff;
}

.btn-outline:hover {
  background: #007bff;
  color: white;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.list-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 4px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-weight: 500;
  color: #344054;
}

.results-count {
  color: #6c757d;
  font-size: 14px;
}

.table-container {
  overflow-x: auto;
}

.employee-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}

.employee-table th,
.employee-table td {
  text-align: left;
  padding: 12px 8px;
  border-bottom: 1px solid #e1e5e9;
}

.employee-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #344054;
}

.employee-table th.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.employee-table th.sortable:hover {
  background: #e9ecef;
}

.employee-table th.sortable.asc::after {
  content: ' ↑';
  position: absolute;
  right: 4px;
}

.employee-table th.sortable.desc::after {
  content: ' ↓';
  position: absolute;
  right: 4px;
}

.employee-table .actions {
  display: flex;
  gap: 8px;
}

.loading {
  text-align: center;
  padding: 48px;
  color: #6c757d;
}

.error {
  text-align: center;
  padding: 48px;
  color: #dc3545;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: #6c757d;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .list-controls {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .employee-table {
    font-size: 14px;
  }
  
  .employee-table .actions {
    flex-direction: column;
  }
}
```

## Vue Implementation

```vue
<!-- src/components/EmployeeManager.vue -->
<template>
  <div class="employee-manager">
    <div class="header">
      <h2>Employees ({{ employees?.length || 0 }})</h2>
      <button 
        class="btn btn-primary"
        @click="showForm = true"
        :disabled="showForm"
      >
        Add Employee
      </button>
    </div>

    <EmployeeForm
      v-if="showForm"
      :employee="editingEmployee"
      @submit="editingEmployee ? handleUpdate($event) : handleCreate($event)"
      @cancel="handleCancel"
      :loading="creating || updating"
    />

    <div v-if="loading" class="loading">Loading employees...</div>
    <div v-else-if="error" class="error">Error: {{ error.message }}</div>
    <EmployeeList
      v-else
      :employees="employees || []"
      @edit="handleEdit"
      @delete="handleDelete"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useQuery, useMutation } from '@northprint/duckdb-wasm-adapter-vue';
import EmployeeForm from './EmployeeForm.vue';
import EmployeeList from './EmployeeList.vue';

const editingEmployee = ref(null);
const showForm = ref(false);

// Initialize database
const { mutate: initDB } = useMutation();

onMounted(() => {
  initDB(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY,
      first_name VARCHAR NOT NULL,
      last_name VARCHAR NOT NULL,
      email VARCHAR UNIQUE NOT NULL,
      department VARCHAR NOT NULL,
      salary DECIMAL(10,2),
      hire_date DATE DEFAULT CURRENT_DATE,
      active BOOLEAN DEFAULT true
    )
  `);
});

// Fetch employees
const { data: employees, loading, error, refetch } = useQuery(`
  SELECT 
    id, first_name, last_name, email, 
    department, salary, hire_date, active
  FROM employees 
  ORDER BY last_name, first_name
`);

// Mutations
const { mutate: createEmployee, loading: creating } = useMutation({
  onSuccess: () => {
    refetch();
    showForm.value = false;
    alert('Employee created successfully!');
  }
});

const { mutate: updateEmployee, loading: updating } = useMutation({
  onSuccess: () => {
    refetch();
    editingEmployee.value = null;
    showForm.value = false;
    alert('Employee updated successfully!');
  }
});

const { mutate: deleteEmployee } = useMutation({
  onSuccess: () => {
    refetch();
    alert('Employee deleted successfully!');
  }
});

const handleCreate = (employeeData) => {
  createEmployee(
    `INSERT INTO employees (first_name, last_name, email, department, salary)
     VALUES (?, ?, ?, ?, ?)`,
    [
      employeeData.first_name,
      employeeData.last_name,
      employeeData.email,
      employeeData.department,
      employeeData.salary
    ]
  );
};

const handleUpdate = (employeeData) => {
  updateEmployee(
    `UPDATE employees 
     SET first_name = ?, last_name = ?, email = ?, department = ?, salary = ?
     WHERE id = ?`,
    [
      employeeData.first_name,
      employeeData.last_name,
      employeeData.email,
      employeeData.department,
      employeeData.salary,
      editingEmployee.value.id
    ]
  );
};

const handleDelete = (employeeId) => {
  if (confirm('Are you sure you want to delete this employee?')) {
    deleteEmployee('DELETE FROM employees WHERE id = ?', [employeeId]);
  }
};

const handleEdit = (employee) => {
  editingEmployee.value = employee;
  showForm.value = true;
};

const handleCancel = () => {
  editingEmployee.value = null;
  showForm.value = false;
};
</script>
```

## Svelte Implementation

```svelte
<!-- src/components/EmployeeManager.svelte -->
<script>
  import { onMount } from 'svelte';
  import { duckdb, mutation } from '@northprint/duckdb-wasm-adapter-svelte';
  import EmployeeForm from './EmployeeForm.svelte';
  import EmployeeList from './EmployeeList.svelte';
  
  const db = duckdb({ autoConnect: true });
  
  let editingEmployee = null;
  let showForm = false;
  
  // Initialize database
  const initDB = mutation();
  
  onMount(() => {
    initDB.execute(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY,
        first_name VARCHAR NOT NULL,
        last_name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        department VARCHAR NOT NULL,
        salary DECIMAL(10,2),
        hire_date DATE DEFAULT CURRENT_DATE,
        active BOOLEAN DEFAULT true
      )
    `);
  });
  
  // Fetch employees
  $: employees = db.query(`
    SELECT 
      id, first_name, last_name, email, 
      department, salary, hire_date, active
    FROM employees 
    ORDER BY last_name, first_name
  `);
  
  // Mutations
  const createEmployee = mutation({
    onSuccess: () => {
      employees.refresh();
      showForm = false;
      alert('Employee created successfully!');
    }
  });
  
  const updateEmployee = mutation({
    onSuccess: () => {
      employees.refresh();
      editingEmployee = null;
      showForm = false;
      alert('Employee updated successfully!');
    }
  });
  
  const deleteEmployee = mutation({
    onSuccess: () => {
      employees.refresh();
      alert('Employee deleted successfully!');
    }
  });
  
  function handleCreate(event) {
    const { employeeData } = event.detail;
    createEmployee.execute(
      `INSERT INTO employees (first_name, last_name, email, department, salary)
       VALUES (?, ?, ?, ?, ?)`,
      [
        employeeData.first_name,
        employeeData.last_name,
        employeeData.email,
        employeeData.department,
        employeeData.salary
      ]
    );
  }
  
  function handleUpdate(event) {
    const { employeeData } = event.detail;
    updateEmployee.execute(
      `UPDATE employees 
       SET first_name = ?, last_name = ?, email = ?, department = ?, salary = ?
       WHERE id = ?`,
      [
        employeeData.first_name,
        employeeData.last_name,
        employeeData.email,
        employeeData.department,
        employeeData.salary,
        editingEmployee.id
      ]
    );
  }
  
  function handleDelete(event) {
    const { employeeId } = event.detail;
    if (confirm('Are you sure you want to delete this employee?')) {
      deleteEmployee.execute('DELETE FROM employees WHERE id = ?', [employeeId]);
    }
  }
  
  function handleEdit(event) {
    editingEmployee = event.detail.employee;
    showForm = true;
  }
  
  function handleCancel() {
    editingEmployee = null;
    showForm = false;
  }
</script>

<div class="employee-manager">
  <div class="header">
    <h2>Employees ({$employees.data?.length || 0})</h2>
    <button 
      class="btn btn-primary"
      on:click={() => showForm = true}
      disabled={showForm}
    >
      Add Employee
    </button>
  </div>

  {#if showForm}
    <EmployeeForm
      employee={editingEmployee}
      on:submit={editingEmployee ? handleUpdate : handleCreate}
      on:cancel={handleCancel}
      loading={$createEmployee.loading || $updateEmployee.loading}
    />
  {/if}

  {#if $employees.loading}
    <div class="loading">Loading employees...</div>
  {:else if $employees.error}
    <div class="error">Error: {$employees.error.message}</div>
  {:else}
    <EmployeeList
      employees={$employees.data || []}
      on:edit={handleEdit}
      on:delete={handleDelete}
    />
  {/if}
</div>
```

## Key Features

This CRUD example demonstrates:

1. **Complete CRUD Operations**
   - Create new employees
   - Read employee list with sorting and filtering
   - Update existing employee information
   - Delete employees with confirmation

2. **Data Validation**
   - Client-side form validation
   - Required field checking
   - Email format validation
   - Numeric salary validation

3. **User Experience**
   - Loading states during operations
   - Error handling and user feedback
   - Confirmation dialogs for destructive actions
   - Responsive design for mobile devices

4. **Database Features**
   - Automatic table creation
   - Unique constraints (email)
   - Default values (hire_date, active status)
   - Proper data types (DECIMAL for salary)

5. **Advanced UI Features**
   - Sortable table columns
   - Department filtering
   - Inline editing capabilities
   - Empty state handling

This example provides a solid foundation for building more complex applications with DuckDB WASM Adapter.