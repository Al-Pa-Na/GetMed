const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, name } = req.body;

    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['patient', 'doctor', 'vendor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const db = getDb();
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, role, name],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }

        const token = jwt.sign(
          { id: this.lastID, email, role },
          process.env.JWT_SECRET || 'secret-key',
          { expiresIn: '7d' }
        );

        res.json({ token, user: { id: this.lastID, email, role, name } });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    db.get(
      'SELECT * FROM users WHERE email = ?',
      [email],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'secret-key',
          { expiresIn: '7d' }
        );

        res.json({
          token,
          user: {
            id: user.id,
            email: user.email,
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

