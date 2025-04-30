import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// We'll use a singleton pattern for database access
let dbInstance = null;

// Get or initialize the database
const getDatabase = async () => {
  if (!dbInstance) {
    try {
      console.log('Initializing SQLite database...');
      dbInstance = await SQLite.openDatabaseAsync('mrz_scanner.db');
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }
  return dbInstance;
};

// Database initialization
export const initDB = async () => {
  try {
    console.log('Running initDB...');
    const db = await getDatabase();
    
    // Create tables using execAsync for bulk operations
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        documentType TEXT,
        surname TEXT,
        firstName TEXT,
        middleName TEXT,
        documentNumber TEXT,
        nationality TEXT,
        dateOfBirth TEXT,
        sex TEXT,
        expiryDate TEXT,
        issuingCountry TEXT,
        carrier TEXT,
        routing TEXT,
        flightNumber TEXT,
        dateOfFlight TEXT,
        seats TEXT,
        meal TEXT,
        assistanceRequest TEXT,
        remarks TEXT,
        birthCity TEXT,
        birthState TEXT,
        birthCountry TEXT,
        ssn TEXT,
        currentLodging TEXT,
        phoneNumber TEXT,
        email TEXT,
        emergencyLastName TEXT,
        emergencyFirstName TEXT,
        emergencyAddress1 TEXT,
        emergencyAddress2 TEXT,
        emergencyCity TEXT,
        emergencyState TEXT,
        emergencyCountry TEXT,
        emergencyPhone TEXT,
        emergencyEmail TEXT,
        accompanyingPersons TEXT,
        billingAddress1 TEXT,
        billingAddress2 TEXT,
        billingCity TEXT,
        billingCountry TEXT,
        billingPostalCode TEXT,
        billingPhone TEXT,
        billingEmail TEXT,
        medicalConditions TEXT,
        signature TEXT,
        confidence REAL,
        savedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        eventId INTEGER,
        FOREIGN KEY (eventId) REFERENCES events (id)
      );
    `);
    
    console.log('Database tables created successfully');
    return true;
  } catch (error) {
    console.error('Error in initDB:', error);
    return false;
  }
};

// Insert a new scan
export const insertScan = async (scanData) => {
  try {
    const db = await getDatabase();
    
    // Log full scan data for debugging
    console.log('INSERTING SCAN DATA:', JSON.stringify(scanData, null, 2));
    
    const result = await db.runAsync(
      `INSERT INTO scans (
        documentType, surname, firstName, middleName, documentNumber,
        nationality, dateOfBirth, sex, expiryDate, issuingCountry,
        carrier, routing, flightNumber, dateOfFlight, seats,
        meal, assistanceRequest, remarks, eventId,
        birthCity, birthState, birthCountry, ssn,
        currentLodging, phoneNumber, email,
        emergencyLastName, emergencyFirstName, emergencyAddress1, emergencyAddress2,
        emergencyCity, emergencyState, emergencyCountry,
        emergencyPhone, emergencyEmail, accompanyingPersons,
        billingAddress1, billingAddress2, billingCity, billingCountry,
        billingPostalCode, billingPhone, billingEmail,
        medicalConditions, signature, confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        scanData.documentType || null,
        scanData.surname || null,
        scanData.firstName || null,
        scanData.middleName || null,
        scanData.documentNumber || null,
        scanData.nationality || null,
        scanData.dateOfBirth || null,
        scanData.sex || null,
        scanData.expiryDate || null,
        scanData.issuingCountry || null,
        scanData.carrier || null,
        scanData.routing || null,
        scanData.flightNumber || null,
        scanData.dateOfFlight || null,
        scanData.seats || null,
        scanData.meal || null,
        scanData.assistanceRequest || null,
        scanData.remarks || null,
        scanData.eventId || null,
        // Additional fields
        scanData.birthCity || null,
        scanData.birthState || null,
        scanData.birthCountry || null,
        scanData.ssn || null,
        scanData.currentLodging || null,
        scanData.phoneNumber || null,
        scanData.email || null,
        scanData.emergencyLastName || null,
        scanData.emergencyFirstName || null,
        scanData.emergencyAddress1 || null,
        scanData.emergencyAddress2 || null,
        scanData.emergencyCity || null,
        scanData.emergencyState || null,
        scanData.emergencyCountry || null,
        scanData.emergencyPhone || null,
        scanData.emergencyEmail || null,
        scanData.accompanyingPersons || null,
        scanData.billingAddress1 || null,
        scanData.billingAddress2 || null,
        scanData.billingCity || null,
        scanData.billingCountry || null,
        scanData.billingPostalCode || null,
        scanData.billingPhone || null,
        scanData.billingEmail || null,
        scanData.medicalConditions || null,
        scanData.signature || null,
        scanData.confidence || null
      ]
    );
    console.log('Scan inserted with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error inserting scan:', error);
    throw error;
  }
};

// Get all scans
export const getAllScans = async () => {
  try {
    const db = await getDatabase();
    const scans = await db.getAllAsync('SELECT * FROM scans ORDER BY savedAt DESC;');
    return scans;
  } catch (error) {
    console.error('Error fetching scans:', error);
    throw error;
  }
};

// Get scans by event ID
export const getScansByEventId = async (eventId) => {
  try {
    const db = await getDatabase();
    const scans = await db.getAllAsync(
      'SELECT * FROM scans WHERE eventId = ? ORDER BY savedAt DESC;',
      [eventId]
    );
    return scans;
  } catch (error) {
    console.error('Error fetching scans for event:', error);
    throw error;
  }
};

// Insert a new event
export const insertEvent = async (eventData) => {
  try {
    const db = await getDatabase();
    const name = eventData.name || '';
    const description = eventData.description || '';
    
    const result = await db.runAsync(
      'INSERT INTO events (name, description) VALUES (?, ?)',
      [name, description]
    );
    
    const eventId = result.lastID;
    
    // If there are scans, insert them
    if (eventData.scans && eventData.scans.length > 0) {
      for (const scan of eventData.scans) {
        // Ensure eventId is set
        scan.eventId = eventId;
        
        // Use the same insertScan function to ensure consistency
        await insertScan(scan);
      }
    }
    
    return eventId;
  } catch (error) {
    console.error('Error in insertEvent:', error);
    throw error;
  }
};

// Get all events
export const getAllEvents = async () => {
  try {
    const db = await getDatabase();
    
    // Get all events
    const events = await db.getAllAsync('SELECT * FROM events ORDER BY createdAt DESC');
    
    // For each event, get its scans
    const eventsWithScans = await Promise.all(
      events.map(async (event) => {
        const scans = await db.getAllAsync(
          'SELECT * FROM scans WHERE eventId = ?',
          [event.id]
        );
        return {
          ...event,
          scans: scans || []
        };
      })
    );
    
    return eventsWithScans;
  } catch (error) {
    console.error('Error in getAllEvents:', error);
    throw error;
  }
};

// Get event by ID
export const getEventById = async (eventId) => {
  try {
    const db = await getDatabase();
    const event = await db.getFirstAsync('SELECT * FROM events WHERE id = ?;', [eventId]);
    return event;
  } catch (error) {
    console.error('Error fetching event:', error);
    throw error;
  }
};

// Delete all data (for testing/reset)
export const deleteAllData = async () => {
  try {
    const db = await getDatabase();
    await db.execAsync('DELETE FROM scans; DELETE FROM events;');
    console.log('All data deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
};

// Get database info
export const getDatabaseInfo = async () => {
  try {
    const db = await getDatabase();
    const tables = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table';");
    console.log('Database tables:', tables);
    return tables;
  } catch (error) {
    console.error('Error getting database info:', error);
    throw error;
  }
};

// Simple test function to check if SQLite is working
export const testDatabase = () => {
  console.log('Testing SQLite module...');
  console.log('SQLite module type:', typeof SQLite);
  
  if (SQLite) {
    console.log('SQLite module keys:', Object.keys(SQLite));
    console.log('openDatabase type:', typeof SQLite.openDatabase);
  } else {
    console.log('SQLite module is undefined or null');
  }
  
  return SQLite !== undefined && typeof SQLite.openDatabase === 'function';
};

// Update the updateEventById function to use a simpler query
export const updateEventById = async (eventId, eventData) => {
  try {
    const db = await getDatabase();
    const name = eventData.name || '';
    const description = eventData.description || '';
    
    await db.runAsync(
      'UPDATE events SET name = ?, description = ? WHERE id = ?',
      [name, description, eventId]
    );
    
    // If there are new scans to add
    if (eventData.scans && eventData.scans.length > 0) {
      for (const scan of eventData.scans) {
        // Check if this is a new scan (no id) and belongs to this event
        if (!scan.id && (!scan.eventId || scan.eventId === eventId)) {
          // Set the eventId
          scan.eventId = eventId;
          
          // Use the same insertScan function to ensure consistency
          await insertScan(scan);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateEventById:', error);
    throw error;
  }
};

// Add a function to migrate existing database if needed
export const migrateDatabase = async () => {
  try {
    const db = await getDatabase();
    
    // Check for events table migration
    const eventsTableInfo = await db.getAllAsync("PRAGMA table_info(events);");
    const hasUpdatedAt = eventsTableInfo.some(column => column.name === 'updatedAt');
    
    if (!hasUpdatedAt) {
      // Create a new table with the updatedAt column
      await db.execAsync(`
        CREATE TABLE events_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Copy data from old table to new table
        INSERT INTO events_new (id, name, description, createdAt)
        SELECT id, name, description, createdAt FROM events;
        
        -- Drop the old table
        DROP TABLE events;
        
        -- Rename the new table to the original name
        ALTER TABLE events_new RENAME TO events;
      `);
      console.log('Events table migration completed successfully');
    }
    
    // Check for scans table migration
    const scansTableInfo = await db.getAllAsync("PRAGMA table_info(scans);");
    const hasNewFields = scansTableInfo.some(column => column.name === 'birthCity') && 
                         scansTableInfo.some(column => column.name === 'ssn') &&
                         scansTableInfo.some(column => column.name === 'medicalConditions');
    
    if (!hasNewFields) {
      console.log('Migrating scans table to add missing columns...');
      
      // Add missing columns to the scans table
      try {
        // Add personal information fields
        if (!scansTableInfo.some(column => column.name === 'birthCity'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN birthCity TEXT;");
        if (!scansTableInfo.some(column => column.name === 'birthState'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN birthState TEXT;");
        if (!scansTableInfo.some(column => column.name === 'birthCountry'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN birthCountry TEXT;");
        if (!scansTableInfo.some(column => column.name === 'ssn'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN ssn TEXT;");
          
        // Add current lodging fields
        if (!scansTableInfo.some(column => column.name === 'currentLodging'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN currentLodging TEXT;");
        if (!scansTableInfo.some(column => column.name === 'phoneNumber'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN phoneNumber TEXT;");
        if (!scansTableInfo.some(column => column.name === 'email'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN email TEXT;");
          
        // Add emergency contact fields
        if (!scansTableInfo.some(column => column.name === 'emergencyLastName'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN emergencyLastName TEXT;");
        if (!scansTableInfo.some(column => column.name === 'emergencyFirstName'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN emergencyFirstName TEXT;");
        if (!scansTableInfo.some(column => column.name === 'emergencyAddress1'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN emergencyAddress1 TEXT;");
        if (!scansTableInfo.some(column => column.name === 'emergencyAddress2'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN emergencyAddress2 TEXT;");
        if (!scansTableInfo.some(column => column.name === 'emergencyCity'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN emergencyCity TEXT;");
        if (!scansTableInfo.some(column => column.name === 'emergencyState'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN emergencyState TEXT;");
        if (!scansTableInfo.some(column => column.name === 'emergencyCountry'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN emergencyCountry TEXT;");
        if (!scansTableInfo.some(column => column.name === 'emergencyPhone'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN emergencyPhone TEXT;");
        if (!scansTableInfo.some(column => column.name === 'emergencyEmail'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN emergencyEmail TEXT;");
          
        // Add accompanying persons field
        if (!scansTableInfo.some(column => column.name === 'accompanyingPersons'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN accompanyingPersons TEXT;");
          
        // Add billing address fields
        if (!scansTableInfo.some(column => column.name === 'billingAddress1'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN billingAddress1 TEXT;");
        if (!scansTableInfo.some(column => column.name === 'billingAddress2'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN billingAddress2 TEXT;");
        if (!scansTableInfo.some(column => column.name === 'billingCity'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN billingCity TEXT;");
        if (!scansTableInfo.some(column => column.name === 'billingCountry'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN billingCountry TEXT;");
        if (!scansTableInfo.some(column => column.name === 'billingPostalCode'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN billingPostalCode TEXT;");
        if (!scansTableInfo.some(column => column.name === 'billingPhone'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN billingPhone TEXT;");
        if (!scansTableInfo.some(column => column.name === 'billingEmail'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN billingEmail TEXT;");
          
        // Add medical conditions field
        if (!scansTableInfo.some(column => column.name === 'medicalConditions'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN medicalConditions TEXT;");
          
        // Add signature field
        if (!scansTableInfo.some(column => column.name === 'signature'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN signature TEXT;");
          
        // Add confidence field if not exists
        if (!scansTableInfo.some(column => column.name === 'confidence'))
          await db.execAsync("ALTER TABLE scans ADD COLUMN confidence REAL;");
          
        console.log('Scans table migration completed successfully');
      } catch (error) {
        console.error('Error altering scans table:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error migrating database:', error);
    throw error;
  }
};

// Get event by ID with scans
export const getEventWithScans = async (eventId) => {
  try {
    const db = await getDatabase();
    
    // Get the event
    const event = await db.getFirstAsync('SELECT * FROM events WHERE id = ?', [eventId]);
    
    if (!event) {
      return null;
    }
    
    // Get all scans for this event
    const scans = await db.getAllAsync(
      'SELECT * FROM scans WHERE eventId = ?',
      [eventId]
    );
    
    return {
      ...event,
      scans: scans || []
    };
  } catch (error) {
    console.error('Error in getEventWithScans:', error);
    throw error;
  }
}; 