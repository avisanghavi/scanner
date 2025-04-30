import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Test SQLite functionality
export const testSQLite = async () => {
  try {
    console.log('Testing SQLite module...');
    
    // Log SQLite module details
    console.log('SQLite module type:', typeof SQLite);
    console.log('SQLite object keys:', Object.keys(SQLite));
    
    // Check openDatabaseAsync availability
    if (typeof SQLite.openDatabaseAsync !== 'function') {
      console.error('SQLite.openDatabaseAsync is not a function!');
      return {
        success: false,
        error: 'SQLite.openDatabaseAsync is not available',
        details: {
          SQLiteType: typeof SQLite,
          SQLiteKeys: Object.keys(SQLite),
        }
      };
    }
    
    // Try to open a test database
    console.log('Attempting to open test database...');
    const db = await SQLite.openDatabaseAsync('test_db.db');
    console.log('Test database opened successfully:', db);
    
    // Try to create a simple table
    console.log('Creating test table...');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        value INTEGER
      );
    `);
    console.log('Test table created successfully');
    
    // Try to insert a test row
    console.log('Inserting test data...');
    const insertResult = await db.runAsync(
      'INSERT INTO test_table (name, value) VALUES (?, ?)',
      ['test_item', 42]
    );
    console.log('Test data inserted successfully:', insertResult);
    
    // Try to query the test data
    console.log('Querying test data...');
    const rows = await db.getAllAsync('SELECT * FROM test_table');
    console.log('Query results:', rows);
    
    return {
      success: true,
      details: {
        insertResult,
        queryResults: rows
      }
    };
  } catch (error) {
    console.error('Test SQLite error:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}; 