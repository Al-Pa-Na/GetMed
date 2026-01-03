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
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

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

    // Create default users
    createDefaultUsers();
  });
};

const createDefaultUsers = async () => {
  const defaultUsers = [
    { email: 'patient@test.com', password: 'password123', role: 'patient', name: 'John Patient' },
    { email: 'doctor@test.com', password: 'password123', role: 'doctor', name: 'Dr. Smith' },
    { email: 'vendor@test.com', password: 'password123', role: 'vendor', name: 'MediStore' }
  ];

  for (const user of defaultUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    db.run(
      `INSERT OR IGNORE INTO users (email, password, role, name) VALUES (?, ?, ?, ?)`,
      [user.email, hashedPassword, user.role, user.name]
    );
  }
};

const getDb = () => db;

module.exports = { init, getDb };

