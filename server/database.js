const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'prescriptions.db');
let db;

const init = () => {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      return;
    }
    console.log('Connected to SQLite database');
  });

  // Create tables
  db.serialize(() => {
    // Users table with new schema
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
      }
    });

    // Prescriptions table
    db.run(`CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER,
      image_path TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      extracted_data TEXT,
      verified_data TEXT,
      confidence REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified_at DATETIME,
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    )`);

    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      prescription_id INTEGER NOT NULL,
      vendor_id INTEGER NOT NULL,
      total_price REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
      FOREIGN KEY (vendor_id) REFERENCES users(id)
    )`);

    // Order items table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      medicine_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )`);

    // Check for old schema and create default users
    checkSchemaAndCreateUsers();
  });
};

const checkSchemaAndCreateUsers = () => {
  // Check if table has old schema (email column) or new schema (user_id column)
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
      console.error('Error checking table schema:', err);
      createDefaultUsers();
      return;
    }

    if (!columns || columns.length === 0) {
      // Table doesn't exist or is empty, create default users
      createDefaultUsers();
      return;
    }

    const hasEmail = columns.some(col => col.name === 'email');
    const hasUserId = columns.some(col => col.name === 'user_id');

    if (hasEmail && !hasUserId) {
      // Old schema detected
      console.error('\n========================================');
      console.error('DATABASE SCHEMA MISMATCH DETECTED!');
      console.error('========================================');
      console.error('The database has the old schema (with email field).');
      console.error('Please delete the database file to use the new schema:');
      console.error(`  Delete: ${dbPath}`);
      console.error('Then restart the server.');
      console.error('========================================\n');
      // Don't create users - they won't work with old schema
    } else if (hasUserId) {
      // New schema - create default users
      createDefaultUsers();
    } else {
      // Unknown schema state - try to create users anyway
      createDefaultUsers();
    }
  });
};

const createDefaultUsers = async () => {
  const defaultUsers = [
    { user_id: 'PAT001', password: 'password123', role: 'patient', name: 'John Patient' },
    { user_id: 'DOC001', password: 'password123', role: 'doctor', name: 'Dr. Smith' },
    { user_id: 'VEND001', password: 'password123', role: 'vendor', name: 'MediStore' }
  ];

  for (const user of defaultUsers) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      db.run(
        `INSERT OR IGNORE INTO users (user_id, password, role, name) VALUES (?, ?, ?, ?)`,
        [user.user_id, hashedPassword, user.role, user.name],
        (err) => {
          if (err && !err.message.includes('UNIQUE constraint')) {
            console.error(`Error creating default user ${user.user_id}:`, err);
          }
        }
      );
    } catch (error) {
      console.error(`Error hashing password for ${user.user_id}:`, error);
    }
  }
};

const getDb = () => db;

module.exports = { init, getDb };
