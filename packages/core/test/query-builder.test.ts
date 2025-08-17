import { describe, it, expect, beforeEach } from 'vitest';
import { SelectQueryBuilder } from '../src/query-builder/select.js';
import { query, select, from, raw, createQueryBuilder } from '../src/query-builder/index.js';
import type { Connection } from '../src/types.js';

describe('Query Builder', () => {
  describe('SelectQueryBuilder', () => {
    let builder: SelectQueryBuilder;

    beforeEach(() => {
      builder = new SelectQueryBuilder();
    });

    describe('SELECT clause', () => {
      it('should build simple select', () => {
        const sql = builder.select('id', 'name').from('users').build();
        expect(sql).toBe('SELECT id, name\nFROM users');
      });

      it('should build select with wildcard', () => {
        const sql = builder.from('users').build();
        expect(sql).toBe('SELECT *\nFROM users');
      });

      it('should build select distinct', () => {
        const sql = builder.distinct().select('department').from('employees').build();
        expect(sql).toBe('SELECT DISTINCT department\nFROM employees');
      });

      it('should build select with raw expression', () => {
        const sql = builder.selectRaw('COUNT(*) as total').from('users').build();
        expect(sql).toBe('SELECT COUNT(*) as total\nFROM users');
      });
    });

    describe('Aggregate functions', () => {
      it('should build count query', () => {
        const sql = builder.count('*', 'total').from('users').build();
        expect(sql).toBe('SELECT COUNT(*) AS total\nFROM users');
      });

      it('should build sum query', () => {
        const sql = builder.sum('amount', 'total_amount').from('orders').build();
        expect(sql).toBe('SELECT SUM(amount) AS total_amount\nFROM orders');
      });

      it('should build avg query', () => {
        const sql = builder.avg('salary').from('employees').build();
        expect(sql).toBe('SELECT AVG(salary)\nFROM employees');
      });

      it('should build min/max queries', () => {
        const sql = builder
          .min('price', 'min_price')
          .max('price', 'max_price')
          .from('products')
          .build();
        expect(sql).toBe('SELECT MIN(price) AS min_price, MAX(price) AS max_price\nFROM products');
      });
    });

    describe('FROM clause', () => {
      it('should build from with alias', () => {
        const sql = builder.select('u.id', 'u.name').from('users', 'u').build();
        expect(sql).toBe('SELECT u.id, u.name\nFROM users AS u');
      });

      it('should build from subquery', () => {
        const subquery = new SelectQueryBuilder().select('id').from('users').where('active', '=', true);
        const sql = builder.select('*').fromSubquery(subquery, 'active_users').build();
        expect(sql).toBe('SELECT *\nFROM (SELECT id\nFROM users\nWHERE active = TRUE) AS active_users');
      });
    });

    describe('JOIN clauses', () => {
      it('should build inner join', () => {
        const sql = builder
          .select('u.name', 'p.title')
          .from('users', 'u')
          .join('posts', 'p.user_id = u.id', 'p')
          .build();
        expect(sql).toBe('SELECT u.name, p.title\nFROM users AS u\nINNER JOIN posts AS p ON p.user_id = u.id');
      });

      it('should build left join', () => {
        const sql = builder
          .select('*')
          .from('users')
          .leftJoin('orders', 'orders.user_id = users.id')
          .build();
        expect(sql).toBe('SELECT *\nFROM users\nLEFT JOIN orders ON orders.user_id = users.id');
      });

      it('should build right join', () => {
        const sql = builder
          .from('users')
          .rightJoin('orders', 'orders.user_id = users.id')
          .build();
        expect(sql).toBe('SELECT *\nFROM users\nRIGHT JOIN orders ON orders.user_id = users.id');
      });

      it('should build full join', () => {
        const sql = builder
          .from('users')
          .fullJoin('orders', 'orders.user_id = users.id')
          .build();
        expect(sql).toBe('SELECT *\nFROM users\nFULL JOIN orders ON orders.user_id = users.id');
      });

      it('should build cross join', () => {
        const sql = builder
          .from('users')
          .crossJoin('departments')
          .build();
        expect(sql).toBe('SELECT *\nFROM users\nCROSS JOIN departments');
      });
    });

    describe('WHERE clause', () => {
      it('should build simple where', () => {
        const sql = builder.from('users').where('id', '=', 1).build();
        expect(sql).toBe('SELECT *\nFROM users\nWHERE id = 1');
      });

      it('should build where with default equals operator', () => {
        const sql = builder.from('users').where('name', undefined, 'John').build();
        expect(sql).toBe("SELECT *\nFROM users\nWHERE name = 'John'");
      });

      it('should build where with comparison operators', () => {
        const sql = builder
          .from('products')
          .where('price', '>', 100)
          .where('stock', '>=', 10)
          .build();
        expect(sql).toBe('SELECT *\nFROM products\nWHERE (price > 100 AND stock >= 10)');
      });

      it('should build where in', () => {
        const sql = builder.from('users').whereIn('id', [1, 2, 3]).build();
        expect(sql).toBe('SELECT *\nFROM users\nWHERE id IN (1, 2, 3)');
      });

      it('should build where not in', () => {
        const sql = builder.from('users').whereNotIn('status', ['inactive', 'deleted']).build();
        expect(sql).toBe("SELECT *\nFROM users\nWHERE status NOT IN ('inactive', 'deleted')");
      });

      it('should build where null', () => {
        const sql = builder.from('users').whereNull('deleted_at').build();
        expect(sql).toBe('SELECT *\nFROM users\nWHERE deleted_at IS NULL');
      });

      it('should build where not null', () => {
        const sql = builder.from('users').whereNotNull('email').build();
        expect(sql).toBe('SELECT *\nFROM users\nWHERE email IS NOT NULL');
      });

      it('should build where between', () => {
        const sql = builder.from('orders').whereBetween('amount', 100, 500).build();
        expect(sql).toBe('SELECT *\nFROM orders\nWHERE amount BETWEEN 100 AND 500');
      });

      it('should build where not between', () => {
        const sql = builder.from('orders').whereNotBetween('amount', 100, 500).build();
        expect(sql).toBe('SELECT *\nFROM orders\nWHERE amount NOT BETWEEN 100 AND 500');
      });

      it('should build where exists', () => {
        const subquery = new SelectQueryBuilder().select('1').from('orders').whereRaw('orders.user_id = users.id');
        const sql = builder.from('users').whereExists(subquery).build();
        expect(sql).toBe('SELECT *\nFROM users\nWHERE EXISTS (SELECT 1\nFROM orders\nWHERE orders.user_id = users.id)');
      });

      it('should build where raw', () => {
        const sql = builder.from('users').whereRaw("date_part('year', created_at) = 2024").build();
        expect(sql).toBe("SELECT *\nFROM users\nWHERE date_part('year', created_at) = 2024");
      });
    });

    describe('OR WHERE clause', () => {
      it('should build or where', () => {
        const sql = builder
          .from('users')
          .where('role', '=', 'admin')
          .orWhere('role', '=', 'moderator')
          .build();
        expect(sql).toBe("SELECT *\nFROM users\nWHERE (role = 'admin' OR role = 'moderator')");
      });

      it('should build complex or/and conditions', () => {
        const sql = builder
          .from('products')
          .where('category', '=', 'electronics')
          .where('price', '<', 1000)
          .orWhere('featured', '=', true)
          .build();
        expect(sql).toBe("SELECT *\nFROM products\nWHERE ((category = 'electronics' AND price < 1000) OR featured = TRUE)");
      });

      it('should build or where in', () => {
        const sql = builder
          .from('users')
          .where('status', '=', 'active')
          .orWhereIn('id', [1, 2, 3])
          .build();
        expect(sql).toBe("SELECT *\nFROM users\nWHERE (status = 'active' OR id IN (1, 2, 3))");
      });

      it('should build or where null', () => {
        const sql = builder
          .from('users')
          .where('active', '=', true)
          .orWhereNull('deleted_at')
          .build();
        expect(sql).toBe('SELECT *\nFROM users\nWHERE (active = TRUE OR deleted_at IS NULL)');
      });
    });

    describe('GROUP BY and HAVING', () => {
      it('should build group by', () => {
        const sql = builder
          .select('department')
          .count('*', 'total')
          .from('employees')
          .groupBy('department')
          .build();
        expect(sql).toBe('SELECT department, COUNT(*) AS total\nFROM employees\nGROUP BY department');
      });

      it('should build group by multiple columns', () => {
        const sql = builder
          .select('department', 'position')
          .count('*', 'total')
          .from('employees')
          .groupBy('department', 'position')
          .build();
        expect(sql).toBe('SELECT department, position, COUNT(*) AS total\nFROM employees\nGROUP BY department, position');
      });

      it('should build having clause', () => {
        const sql = builder
          .select('department')
          .count('*', 'total')
          .from('employees')
          .groupBy('department')
          .having('COUNT(*)', '>', 5)
          .build();
        expect(sql).toBe('SELECT department, COUNT(*) AS total\nFROM employees\nGROUP BY department\nHAVING COUNT(*) > 5');
      });

      it('should build having raw', () => {
        const sql = builder
          .select('department')
          .avg('salary', 'avg_salary')
          .from('employees')
          .groupBy('department')
          .havingRaw('AVG(salary) > 50000')
          .build();
        expect(sql).toBe('SELECT department, AVG(salary) AS avg_salary\nFROM employees\nGROUP BY department\nHAVING AVG(salary) > 50000');
      });
    });

    describe('ORDER BY', () => {
      it('should build order by', () => {
        const sql = builder.from('users').orderBy('name').build();
        expect(sql).toBe('SELECT *\nFROM users\nORDER BY name ASC');
      });

      it('should build order by desc', () => {
        const sql = builder.from('users').orderBy('created_at', 'DESC').build();
        expect(sql).toBe('SELECT *\nFROM users\nORDER BY created_at DESC');
      });

      it('should build multiple order by', () => {
        const sql = builder
          .from('users')
          .orderBy('department', 'ASC')
          .orderBy('salary', 'DESC')
          .build();
        expect(sql).toBe('SELECT *\nFROM users\nORDER BY department ASC, salary DESC');
      });

      it('should build order by raw', () => {
        const sql = builder.from('users').orderByRaw('RANDOM()').build();
        expect(sql).toBe('SELECT *\nFROM users\nORDER BY RANDOM()');
      });
    });

    describe('LIMIT and OFFSET', () => {
      it('should build limit', () => {
        const sql = builder.from('users').limit(10).build();
        expect(sql).toBe('SELECT *\nFROM users\nLIMIT 10');
      });

      it('should build limit with offset', () => {
        const sql = builder.from('users').limit(10).offset(20).build();
        expect(sql).toBe('SELECT *\nFROM users\nLIMIT 10\nOFFSET 20');
      });

      it('should build offset without limit', () => {
        const sql = builder.from('users').offset(20).build();
        expect(sql).toBe('SELECT *\nFROM users\nOFFSET 20');
      });
    });

    describe('UNION', () => {
      it('should build union', () => {
        const query1 = new SelectQueryBuilder().select('name').from('customers');
        const query2 = new SelectQueryBuilder().select('name').from('suppliers');
        const sql = query1.union(query2).build();
        expect(sql).toBe('SELECT name\nFROM customers\nUNION\nSELECT name\nFROM suppliers');
      });

      it('should build union all', () => {
        const query1 = new SelectQueryBuilder().select('id').from('table1');
        const query2 = new SelectQueryBuilder().select('id').from('table2');
        const sql = query1.unionAll(query2).build();
        expect(sql).toBe('SELECT id\nFROM table1\nUNION ALL\nSELECT id\nFROM table2');
      });

      it('should build multiple unions', () => {
        const query1 = new SelectQueryBuilder().select('id').from('table1');
        const query2 = new SelectQueryBuilder().select('id').from('table2');
        const query3 = new SelectQueryBuilder().select('id').from('table3');
        const sql = query1.union(query2).unionAll(query3).orderBy('id').build();
        expect(sql).toBe('SELECT id\nFROM table1\nUNION\nSELECT id\nFROM table2\nUNION ALL\nSELECT id\nFROM table3\nORDER BY id ASC');
      });
    });

    describe('CTE (WITH clause)', () => {
      it('should build simple CTE', () => {
        const cte = new SelectQueryBuilder().select('*').from('users').where('active', '=', true);
        const sql = builder
          .with('active_users', cte)
          .select('*')
          .from('active_users')
          .build();
        expect(sql).toBe('WITH active_users AS (SELECT *\nFROM users\nWHERE active = TRUE)\nSELECT *\nFROM active_users');
      });

      it('should build CTE with columns', () => {
        const cte = new SelectQueryBuilder().select('id', 'name').from('users');
        const sql = builder
          .with('user_names', cte, ['user_id', 'username'])
          .select('*')
          .from('user_names')
          .build();
        expect(sql).toBe('WITH user_names (user_id, username) AS (SELECT id, name\nFROM users)\nSELECT *\nFROM user_names');
      });

      it('should build multiple CTEs', () => {
        const cte1 = new SelectQueryBuilder().select('*').from('users').where('role', '=', 'admin');
        const cte2 = new SelectQueryBuilder().select('*').from('posts').where('published', '=', true);
        const sql = builder
          .with('admins', cte1)
          .with('published_posts', cte2)
          .select('a.name', 'p.title')
          .from('admins', 'a')
          .join('published_posts', 'p.user_id = a.id', 'p')
          .build();
        expect(sql).toBe(
          "WITH admins AS (SELECT *\nFROM users\nWHERE role = 'admin'), published_posts AS (SELECT *\nFROM posts\nWHERE published = TRUE)\n" +
          'SELECT a.name, p.title\nFROM admins AS a\nINNER JOIN published_posts AS p ON p.user_id = a.id'
        );
      });
    });

    describe('Complex queries', () => {
      it('should build complex query with multiple features', () => {
        const sql = builder
          .select('d.name', 'd.location')
          .count('e.id', 'employee_count')
          .avg('e.salary', 'avg_salary')
          .from('departments', 'd')
          .leftJoin('employees', 'e.department_id = d.id', 'e')
          .where('d.active', '=', true)
          .whereNotNull('d.location')
          .groupBy('d.id', 'd.name', 'd.location')
          .having('COUNT(e.id)', '>', 0)
          .orderBy('avg_salary', 'DESC')
          .limit(10)
          .build();
        
        expect(sql).toBe(
          'SELECT d.name, d.location, COUNT(e.id) AS employee_count, AVG(e.salary) AS avg_salary\n' +
          'FROM departments AS d\n' +
          'LEFT JOIN employees AS e ON e.department_id = d.id\n' +
          'WHERE (d.active = TRUE AND d.location IS NOT NULL)\n' +
          'GROUP BY d.id, d.name, d.location\n' +
          'HAVING COUNT(e.id) > 0\n' +
          'ORDER BY avg_salary DESC\n' +
          'LIMIT 10'
        );
      });

      it('should build nested subquery', () => {
        const innerSubquery = new SelectQueryBuilder()
          .select('department_id')
          .avg('salary', 'avg_salary')
          .from('employees')
          .groupBy('department_id');
        
        const sql = builder
          .select('e.*', 's.avg_salary')
          .from('employees', 'e')
          .join('(' + innerSubquery.build() + ')', 's.department_id = e.department_id', 's')
          .whereRaw('e.salary > s.avg_salary')
          .build();
        
        expect(sql.includes('JOIN (SELECT department_id, AVG(salary) AS avg_salary')).toBe(true);
        expect(sql.includes('WHERE e.salary > s.avg_salary')).toBe(true);
      });
    });

    describe('Value formatting', () => {
      it('should format string values with quotes', () => {
        const sql = builder.from('users').where('name', '=', "O'Brien").build();
        expect(sql).toBe("SELECT *\nFROM users\nWHERE name = 'O''Brien'");
      });

      it('should format boolean values', () => {
        const sql = builder.from('users').where('active', '=', true).where('deleted', '=', false).build();
        expect(sql).toBe('SELECT *\nFROM users\nWHERE (active = TRUE AND deleted = FALSE)');
      });

      it('should format null values', () => {
        const sql = builder.from('users').where('email', '=', null).build();
        expect(sql).toBe('SELECT *\nFROM users\nWHERE email = NULL');
      });

      it('should format date values', () => {
        const date = new Date('2024-01-01T00:00:00.000Z');
        const sql = builder.from('orders').where('created_at', '>', date).build();
        expect(sql).toBe("SELECT *\nFROM orders\nWHERE created_at > '2024-01-01T00:00:00.000Z'");
      });
    });

    describe('Clone', () => {
      it('should clone query builder', () => {
        const original = builder.select('id', 'name').from('users').where('active', '=', true);
        const cloned = original.clone();
        
        // Modify cloned
        cloned.where('role', '=', 'admin').orderBy('name');
        
        // Original should not be affected
        expect(original.build()).toBe('SELECT id, name\nFROM users\nWHERE active = TRUE');
        expect(cloned.build()).toBe("SELECT id, name\nFROM users\nWHERE (active = TRUE AND role = 'admin')\nORDER BY name ASC");
      });
    });

    describe('Helper functions', () => {
      it('should create query with query()', () => {
        const sql = query().select('*').from('users').build();
        expect(sql).toBe('SELECT *\nFROM users');
      });

      it('should create query with select()', () => {
        const sql = select('id', 'name').from('users').build();
        expect(sql).toBe('SELECT id, name\nFROM users');
      });

      it('should create query with from()', () => {
        const sql = from('users').where('active', '=', true).build();
        expect(sql).toBe('SELECT *\nFROM users\nWHERE active = TRUE');
      });

      it('should create raw sql with raw()', () => {
        const result = raw('SELECT * FROM users WHERE id = ?', [1]);
        expect(result.sql).toBe('SELECT * FROM users WHERE id = ?');
        expect(result.bindings).toEqual([1]);
      });
    });

    describe('QueryBuilderFactory', () => {
      // Mock connection
      const mockConnection: Partial<Connection> = {
        execute: async (sql: string) => ({
          toArray: () => [{ id: 1, name: 'Test' }],
          getMetadata: () => [],
        } as any),
      };

      it('should use table() helper for select', () => {
        const factory = createQueryBuilder(mockConnection as Connection);
        const sql = factory.table('users')
          .select('id', 'name')
          .where('active', '=', true)
          .build();
        expect(sql).toBe('SELECT id, name\nFROM users\nWHERE active = TRUE');
      });

      it('should use table() helper with where shortcut', () => {
        const factory = createQueryBuilder(mockConnection as Connection);
        const sql = factory.table('users')
          .where('id', '>', 10)
          .build();
        expect(sql).toBe('SELECT *\nFROM users\nWHERE id > 10');
      });
    });
  });
});