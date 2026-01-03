const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');

const router = express.Router();

// Generate user ID based on role
const generateUserId = (role, db) => {
  return new Promise((resolve, reject) => {
    const prefix = role === 'patient' ? 'PAT' : role === 'doctor' ? 'DOC' : 'VEND';
    
    // Get the highest existing ID for this role
    db.all(
      `SELECT user_id FROM users WHERE user_id LIKE ? ORDER BY user_id DESC LIMIT 1`,
      [`${prefix}%`],
      (err, rows) => {
        if (err) {
          return reject(err);
        }

        if (rows.length === 0) {
          // First user of this role
          resolve(`${prefix}001`);
        } else {
          // Extract number and increment
          const lastId = rows[0].user_id;
          const lastNum = parseInt(lastId.replace(prefix, ''));
          const newNum = lastNum + 1;
          const newId = `${prefix}${newNum.toString().padStart(3, '0')}`;
          resolve(newId);
        }
      }
    );
  });
};

// Register/Signup
router.post('/register', async (req, res) => {
  try {
    const { password, role, name } = req.body;

    if (!password || !role || !name) {
      return res.status(400).json({ error: 'Password, role, and name are required' });
    }

    if (!['patient', 'doctor', 'vendor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be patient, doctor, or vendor' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const db = getDb();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate user ID
    const userId = await generateUserId(role, db);

    db.run(
      'INSERT INTO users (user_id, password, role, name) VALUES (?, ?, ?, ?)',
      [userId, hashedPassword, role, name],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'User ID already exists. Please try again.' });
          }
          return res.status(500).json({ error: 'Database error' });
        }

        const token = jwt.sign(
          { id: this.lastID, user_id: userId, role },
          process.env.JWT_SECRET || 'secret-key',
          { expiresIn: '7d' }
        );

        res.json({ 
          token, 
          user: { id: this.lastID, user_id: userId, role, name },
          message: 'Account created successfully! Your User ID is: ' + userId
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { user_id, password } = req.body;

    if (!user_id || !password) {
      return res.status(400).json({ error: 'User ID and password are required' });
    }

    const db = getDb();
    db.get(
      'SELECT * FROM users WHERE user_id = ?',
      [user_id],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
          return res.status(401).json({ error: 'Invalid User ID or password' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid User ID or password' });
        }

        const token = jwt.sign(
          { id: user.id, user_id: user.user_id, role: user.role },
          process.env.JWT_SECRET || 'secret-key',
          { expiresIn: '7d' }
        );

        res.json({
          token,
          user: {
            id: user.id,
            user_id: user.user_id,
            role: user.role,
            name: user.name
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
