import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'scanner.db';

let db = null;

export const getDatabase = () => {
  if (Platform.OS === 'web') {
    return {
      transaction: () => {
        return {
          executeSql: () => {},
        };
      },
    };
  }

  if (!db) {
    try {
      db = SQLite.openDatabase(DATABASE_NAME);
      console.log('Database opened successfully');
    } catch (error) {
      console.error('Error opening database:', error);
      throw error;
    }
  }
  return db;
};

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
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventId INTEGER,
        label TEXT,
        documentType TEXT,
        surname TEXT,
        firstName TEXT,
        middleName TEXT,
        passportNumber TEXT,
        nationality TEXT,
        dateOfBirth TEXT,
        sex TEXT,
        expiryDate TEXT,
        issuingCountry TEXT,
        carrier TEXT DEFAULT NULL,
        routing TEXT DEFAULT NULL,
        flightNumber TEXT DEFAULT NULL,
        dateOfFlight TEXT DEFAULT NULL,
        seats TEXT DEFAULT NULL,
        meal TEXT DEFAULT NULL,
        birthCity TEXT DEFAULT NULL,
        birthState TEXT DEFAULT NULL,
        birthCountry TEXT DEFAULT NULL,
        ssn TEXT DEFAULT NULL,
        currentLodging TEXT DEFAULT NULL,
        phoneNumber TEXT DEFAULT NULL,
        email TEXT DEFAULT NULL,
        emergencyLastName TEXT DEFAULT NULL,
        emergencyFirstName TEXT DEFAULT NULL,
        emergencyAddress1 TEXT DEFAULT NULL,
        emergencyAddress2 TEXT DEFAULT NULL,
        emergencyCity TEXT DEFAULT NULL,
        emergencyState TEXT DEFAULT NULL,
        emergencyCountry TEXT DEFAULT NULL,
        emergencyPhone TEXT DEFAULT NULL,
        emergencyEmail TEXT DEFAULT NULL,
        accompanyingPersons TEXT DEFAULT NULL,
        billingAddress1 TEXT DEFAULT NULL,
        billingAddress2 TEXT DEFAULT NULL,
        billingCity TEXT DEFAULT NULL,
        billingCountry TEXT DEFAULT NULL,
        billingPostalCode TEXT DEFAULT NULL,
        billingPhone TEXT DEFAULT NULL,
        billingEmail TEXT DEFAULT NULL,
        medicalConditions TEXT DEFAULT NULL,
        remarks TEXT DEFAULT NULL,
        signature TEXT DEFAULT NULL,
        confidence REAL,
        savedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
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

export const insertScan = async (scanData) => {
  try {
    const db = await getDatabase();
    
    // Log the full scan data
    console.log('FULL SCAN DATA TO INSERT:', JSON.stringify(scanData, null, 2));
    
    // Validate required fields
    if (!scanData.eventId) {
      throw new Error('eventId is required');
    }
    
    // Log each section of data separately for debugging
    console.log('Basic Document Info:', {
      label: scanData.label,
      documentType: scanData.documentType,
      surname: scanData.surname,
      firstName: scanData.firstName,
      middleName: scanData.middleName,
      passportNumber: scanData.passportNumber,
      nationality: scanData.nationality,
      dateOfBirth: scanData.dateOfBirth,
      sex: scanData.sex,
      expiryDate: scanData.expiryDate,
      issuingCountry: scanData.issuingCountry
    });
    
    console.log('Travel Info:', {
      carrier: scanData.carrier,
      routing: scanData.routing,
      flightNumber: scanData.flightNumber,
      dateOfFlight: scanData.dateOfFlight,
      seats: scanData.seats,
      meal: scanData.meal
    });
    
    console.log('Personal Info:', {
      birthCity: scanData.birthCity,
      birthState: scanData.birthState,
      birthCountry: scanData.birthCountry,
      ssn: scanData.ssn
    });
    
    console.log('Current Lodging:', {
      currentLodging: scanData.currentLodging,
      phoneNumber: scanData.phoneNumber,
      email: scanData.email
    });
    
    console.log('Emergency Contact:', {
      emergencyLastName: scanData.emergencyLastName,
      emergencyFirstName: scanData.emergencyFirstName,
      emergencyAddress1: scanData.emergencyAddress1,
      emergencyAddress2: scanData.emergencyAddress2,
      emergencyCity: scanData.emergencyCity,
      emergencyState: scanData.emergencyState,
      emergencyCountry: scanData.emergencyCountry,
      emergencyPhone: scanData.emergencyPhone,
      emergencyEmail: scanData.emergencyEmail
    });
    
    console.log('Additional Info:', {
      accompanyingPersons: scanData.accompanyingPersons,
      medicalConditions: scanData.medicalConditions,
      remarks: scanData.remarks,
      signature: scanData.signature,
      confidence: scanData.confidence
    });
    
    console.log('Billing Address:', {
      billingAddress1: scanData.billingAddress1,
      billingAddress2: scanData.billingAddress2,
      billingCity: scanData.billingCity,
      billingCountry: scanData.billingCountry,
      billingPostalCode: scanData.billingPostalCode,
      billingPhone: scanData.billingPhone,
      billingEmail: scanData.billingEmail
    });
    
    // Construct the SQL query for logging
    const columns = `eventId, label, documentType, surname, firstName, middleName,
      passportNumber, nationality, dateOfBirth, sex, expiryDate,
      issuingCountry, carrier, routing, flightNumber, dateOfFlight,
      seats, meal, birthCity, birthState, birthCountry, ssn,
      currentLodging, phoneNumber, email, emergencyLastName,
      emergencyFirstName, emergencyAddress1, emergencyAddress2,
      emergencyCity, emergencyState, emergencyCountry,
      emergencyPhone, emergencyEmail, accompanyingPersons,
      billingAddress1, billingAddress2, billingCity, billingCountry,
      billingPostalCode, billingPhone, billingEmail,
      medicalConditions, remarks, signature, confidence`;
    
    const placeholders = Array(columns.split(',').length).fill('?').join(', ');
    
    const sql = `INSERT INTO scans (${columns}) VALUES (${placeholders});`;
    
    console.log('SQL QUERY:', sql);
    
    const params = [
      scanData.eventId || null,
      scanData.label || null,
      scanData.documentType || null,
      scanData.surname || null,
      scanData.firstName || null,
      scanData.middleName || null,
      scanData.passportNumber || null,
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
      scanData.remarks || null,
      scanData.signature || null,
      scanData.confidence || null
    ];
    
    console.log('PARAMETER VALUES:', params);
    
    const result = await db.runAsync(sql, params);
    
    console.log('Scan inserted with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error inserting scan:', error);
    throw error;
  }
};

export const getScanById = async (id) => {
  try {
    const db = await getDatabase();
    const scan = await db.getAsync(
      `SELECT * FROM scans WHERE id = ?;`,
      [id]
    );
    
    // Log the full scan data for debugging
    console.log('RETRIEVED SCAN BY ID', id, ':', JSON.stringify(scan, null, 2));
    
    // Log each section of data separately for debugging
    if (scan) {
      console.log('Basic Document Info:', {
        label: scan.label,
        documentType: scan.documentType,
        surname: scan.surname,
        firstName: scan.firstName,
        middleName: scan.middleName,
        passportNumber: scan.passportNumber,
        nationality: scan.nationality,
        dateOfBirth: scan.dateOfBirth,
        sex: scan.sex,
        expiryDate: scan.expiryDate,
        issuingCountry: scan.issuingCountry
      });
      
      console.log('Travel Info:', {
        carrier: scan.carrier,
        routing: scan.routing,
        flightNumber: scan.flightNumber,
        dateOfFlight: scan.dateOfFlight,
        seats: scan.seats,
        meal: scan.meal
      });
      
      console.log('Personal Info:', {
        birthCity: scan.birthCity,
        birthState: scan.birthState,
        birthCountry: scan.birthCountry,
        ssn: scan.ssn
      });
      
      console.log('Current Lodging:', {
        currentLodging: scan.currentLodging,
        phoneNumber: scan.phoneNumber,
        email: scan.email
      });
      
      console.log('Emergency Contact:', {
        emergencyLastName: scan.emergencyLastName,
        emergencyFirstName: scan.emergencyFirstName,
        emergencyAddress1: scan.emergencyAddress1,
        emergencyAddress2: scan.emergencyAddress2,
        emergencyCity: scan.emergencyCity,
        emergencyState: scan.emergencyState,
        emergencyCountry: scan.emergencyCountry,
        emergencyPhone: scan.emergencyPhone,
        emergencyEmail: scan.emergencyEmail
      });
      
      console.log('Additional Info:', {
        accompanyingPersons: scan.accompanyingPersons,
        medicalConditions: scan.medicalConditions,
        remarks: scan.remarks,
        signature: scan.signature,
        confidence: scan.confidence
      });
      
      console.log('Billing Address:', {
        billingAddress1: scan.billingAddress1,
        billingAddress2: scan.billingAddress2,
        billingCity: scan.billingCity,
        billingCountry: scan.billingCountry,
        billingPostalCode: scan.billingPostalCode,
        billingPhone: scan.billingPhone,
        billingEmail: scan.billingEmail
      });
    }
    
    return scan;
  } catch (error) {
    console.error('Error getting scan:', error);
    throw error;
  }
};

export const getAllScans = () => {
  const database = getDatabase();
  return new Promise((resolve, reject) => {
    database.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM scans ORDER BY savedAt DESC',
        [],
        (_, { rows: { _array } }) => {
          resolve(_array);
        },
        (_, error) => {
          reject(error);
        }
      );
    });
  });
};

export const createEvent = (eventData) => {
  const database = getDatabase();
  return new Promise((resolve, reject) => {
    database.transaction(tx => {
      tx.executeSql(
        'INSERT INTO events (name, description, createdAt) VALUES (?, ?, ?)',
        [eventData.name, eventData.description, new Date().toISOString()],
        (_, result) => {
          resolve(result.insertId);
        },
        (_, error) => {
          reject(error);
        }
      );
    });
  });
};

export const getAllEvents = () => {
  const database = getDatabase();
  return new Promise((resolve, reject) => {
    database.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM events ORDER BY createdAt DESC',
        [],
        (_, { rows: { _array } }) => {
          resolve(_array);
        },
        (_, error) => {
          reject(error);
        }
      );
    });
  });
};

export const getEventScans = (eventId) => {
  const database = getDatabase();
  return new Promise((resolve, reject) => {
    database.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM scans WHERE eventId = ? ORDER BY savedAt DESC',
        [eventId],
        (_, { rows: { _array } }) => {
          resolve(_array);
        },
        (_, error) => {
          reject(error);
        }
      );
    });
  });
};

export const getEventById = (eventId) => {
  const database = getDatabase();
  return new Promise((resolve, reject) => {
    database.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM events WHERE id = ?',
        [eventId],
        (_, { rows: { _array } }) => {
          resolve(_array[0]);
        },
        (_, error) => {
          reject(error);
        }
      );
    });
  });
};

export const getScansByEventId = async (eventId) => {
  try {
    const db = await getDatabase();
    const scans = await db.getAllAsync(
      `SELECT * FROM scans WHERE eventId = ? ORDER BY id DESC;`,
      [eventId]
    );
    
    // Log the full scan data for debugging
    console.log('RETRIEVED SCANS FOR EVENT', eventId, ':', JSON.stringify(scans, null, 2));
    
    return scans;
  } catch (error) {
    console.error('Error getting scans by event ID:', error);
    throw error;
  }
}; 