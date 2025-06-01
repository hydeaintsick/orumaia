import { initializeSchema, addCategory, getCategoryByName, getAllCategories, Category } from '../database';
import * as SQLite from 'expo-sqlite';

// Advanced Mock for expo-sqlite
jest.mock('expo-sqlite', () => {
  const actualSQLite = jest.requireActual('expo-sqlite'); // Get actual for constants, etc.

  // In-memory store for our mock database
  const mockDbStore: { [tableName: string]: any[] } = {
    categories: [],
    contacts: [],
    contact_events: [],
    contact_news: [],
  };
  let nextId: { [tableName: string]: number } = {
    categories: 1,
    contacts: 1,
    contact_events: 1,
    contact_news: 1,
  };

  const mockDb = {
    execAsync: jest.fn(async (source) => {
      // Simulate CREATE TABLE IF NOT EXISTS and other execAsync operations
      // This is simplified; a real parser for SQL would be complex.
      // For "CREATE TABLE IF NOT EXISTS categories", etc., we don't need to do much.
      // For PRAGMA, we can return a default.
      if (source.toLowerCase().includes('pragma foreign_keys=on')) {
        return [{ rows: [], rowCount: 1, lastInsertRowId: 0 }];
      }
      if (source.toLowerCase().includes('create table')) {
        // console.log(`Mock DB: Executing CREATE TABLE for ${source.substring(0,100)}`);
        return [{ rows: [], rowCount: 1, lastInsertRowId: 0 }];
      }
      if (source.toLowerCase().includes('create trigger')) {
        // console.log(`Mock DB: Executing CREATE TRIGGER for ${source.substring(0,100)}`);
        return [{ rows: [], rowCount: 1, lastInsertRowId: 0 }];
      }
      // console.warn(`Unhandled execAsync source: ${source}`);
      return []; // Default empty result for other execs
    }),
    runAsync: jest.fn(async (sql: string, params: any[]) => {
      // Simulate INSERT, UPDATE, DELETE
      // console.log('Mock DB: runAsync SQL:', sql, params);
      const lowerSql = sql.toLowerCase();
      let tableName = '';
      let rowsAffected = 0;
      let insertId: number | undefined = undefined;

      if (lowerSql.startsWith('insert into ')) {
        tableName = lowerSql.split(' ')[2];
        if (mockDbStore[tableName]) {
          // Simplified: assumes params match columns in order, and 'id' is auto-incremented
          const newItem: any = {};
          // This needs to be more robust based on actual SQL column names from the INSERT statement
          // For now, just store params and add an ID.
          if (tableName === 'categories' && params.length === 1) { // name
            const existing = mockDbStore.categories.find(c => c.name === params[0]);
            if (existing) { // Simulate UNIQUE constraint
              const error = new Error(`UNIQUE constraint failed: categories.name`);
              (error as any).code = actualSQLite.SQLiteErrorCode.CONSTRAINT_UNIQUE; // Use actual error code if available
              throw error;
            }
            newItem.name = params[0];
          } else {
            // Generic param storage - needs refinement for real tests
            params.forEach((p, i) => newItem[`col${i}`] = p);
          }

          newItem.id = nextId[tableName]++;
          mockDbStore[tableName].push(newItem);
          rowsAffected = 1;
          insertId = newItem.id;
        }
      } else if (lowerSql.startsWith('update ')) {
        // TODO: Implement mock update logic
        rowsAffected = 1; // Assume one row affected
      } else if (lowerSql.startsWith('delete from ')) {
        // TODO: Implement mock delete logic
        rowsAffected = 1; // Assume one row affected
      }
      return { rowsAffected, lastInsertRowId: insertId || 0 };
    }),
    getFirstAsync: jest.fn(async (sql: string, params: any[]) => {
      // console.log('Mock DB: getFirstAsync SQL:', sql, params);
      const lowerSql = sql.toLowerCase();
      const tableNameMatch = lowerSql.match(/from\s+(\w+)/);
      if (tableNameMatch && mockDbStore[tableNameMatch[1]]) {
        const table = mockDbStore[tableNameMatch[1]];
        // Simplified find: assumes "WHERE id = ?" or "WHERE name = ?" or "WHERE native_id = ?"
        let result = null;
        if (lowerSql.includes('where id = ?')) {
          result = table.find(item => item.id === params[0]) || null;
        } else if (lowerSql.includes('where name = ?') && tableNameMatch[1] === 'categories') {
          result = table.find(item => item.name === params[0]) || null;
        } else if (lowerSql.includes('where native_id = ?') && tableNameMatch[1] === 'contacts') {
          result = table.find(item => item.native_id === params[0]) || null;
        }
        return result;
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql: string, params: any[]) => {
      // console.log('Mock DB: getAllAsync SQL:', sql, params);
      const lowerSql = sql.toLowerCase();
      const tableNameMatch = lowerSql.match(/from\s+(\w+)/);
      if (tableNameMatch && mockDbStore[tableNameMatch[1]]) {
         // Simplified: returns all items or filters by category_id if present
        if (lowerSql.includes('where category_id = ?')) {
          return mockDbStore[tableNameMatch[1]].filter(item => item.category_id === params[0]);
        }
        return [...mockDbStore[tableNameMatch[1]]]; // Return a copy
      }
      return [];
    }),
    withTransactionAsync: jest.fn(async (transactionScope: () => Promise<void>) => {
      // Simulate transaction: simply execute the scope.
      // A real transaction mock might handle rollbacks.
      await transactionScope();
    }),
    closeAsync: jest.fn().mockResolvedValue(undefined),
    deleteAsync: jest.fn().mockResolvedValue(undefined),
    // Add any other methods from SQLiteDatabase if they are used.
  };

  return {
    ...actualSQLite, // Spread actual to keep constants like `SQLError`
    openDatabaseSync: jest.fn(() => mockDb as any),
  };
});


describe('Database Initialization and Categories', () => {
  // Clear mock store before each test in this suite for categories
  beforeEach(() => {
    mockDbStore.categories = [];
    nextId.categories = 1;
    // Re-populate default categories as initializeSchema does this.
    // This is a bit of a workaround due to the way initializeSchema is structured.
    // A better approach might be to mock initializeSchema's internals or test its effects more directly.
    const defaultCategories = ["Friends", "Family", "Work Colleagues", "Buddies / Casual Connections"];
    defaultCategories.forEach(name => mockDbStore.categories.push({ id: nextId.categories++, name }));
  });

  it('should add a new category and retrieve it', async () => {
    const categoryName = 'Test Category Unique';
    const addResult = await addCategory(categoryName);
    expect(addResult).toBeDefined();
    expect(addResult!.lastInsertRowId).toBeGreaterThan(0);

    const category = await getCategoryByName(categoryName);
    expect(category).not.toBeNull();
    if (category) {
      expect(category.name).toBe(categoryName);
    }
  });

  it('should retrieve all categories including defaults', async () => {
    const categories = await getAllCategories();
    expect(categories.length).toBeGreaterThanOrEqual(4); // At least the defaults
    expect(categories.some(cat => cat.name === "Friends")).toBe(true);
  });

  it('should not add a duplicate category name', async () => {
    const categoryName = "Friends"; // Already a default category
    try {
      await addCategory(categoryName);
      // If addCategory doesn't throw, this is a failure in the mock or logic
      expect(true).toBe(false); // Force fail if no error thrown
    } catch (error: any) {
      // Check if the error is due to UNIQUE constraint
      // The exact error code or message might vary based on SQLite.js or our mock
      expect(error.message).toContain('UNIQUE constraint failed');
    }
  });

  test.todo('should initialize schema (basic check, real check is side effects)');
});

describe('Contact Management (Placeholder Tests)', () => {
  // These would need more setup for mockDbStore.contacts and potentially related tables
  test.todo('should add a new contact');
  test.todo('should retrieve a contact by ID');
  test.todo('should retrieve a contact by native ID');
  test.todo('should update a contact');
  test.todo('should delete a contact');
  test.todo('should get contacts by category');
  test.todo('should correctly handle created_at and updated_at timestamps (requires more sophisticated mock)');
});

describe('Contact Events and News (Placeholder Tests)', () => {
  test.todo('should add an event for a contact');
  test.todo('should retrieve events for a contact');
  test.todo('should add news for a contact');
  test.todo('should retrieve news for a contact');
  test.todo('should cascade delete events/news when a contact is deleted');
});

// Note: This mock is still simplified. Testing database interactions thoroughly
// often requires a more robust in-memory SQL-like database or integration tests
// with the actual expo-sqlite running on a device/simulator.
// The current mock helps test if functions are called and basic paths,
// but not complex SQL logic or specific SQLite behaviors.
// initializeSchema's pre-population logic is hard to test without a more stateful mock
// or by checking its side effects (e.g., default categories exist).
