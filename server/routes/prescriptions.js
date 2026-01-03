const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { getDb } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const { extractTextFromImage } = require('../services/ocrService');
const { extractPrescriptionData, calculateConfidence } = require('../services/llmService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'prescription-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload prescription (Patient)
router.post('/upload', authenticate, authorize('patient'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imagePath = req.file.path;
    const db = getDb();

    // Extract text using OCR
    const extractedText = await extractTextFromImage(imagePath);

    // Extract prescription data using LLM
    const medicines = await extractPrescriptionData(extractedText);
    const confidence = calculateConfidence(medicines);

    // Store prescription
    db.run(
      `INSERT INTO prescriptions (patient_id, image_path, extracted_data, confidence, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [req.user.id, req.file.filename, JSON.stringify(medicines), confidence],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to save prescription' });
        }

        res.json({
          id: this.lastID,
          message: 'Prescription uploaded and processed',
          extractedData: medicines,
          confidence
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending prescriptions (Doctor)
router.get('/pending', authenticate, authorize('doctor'), (req, res) => {
  const db = getDb();
  db.all(
    `SELECT p.*, u.name as patient_name, u.email as patient_email
     FROM prescriptions p
     JOIN users u ON p.patient_id = u.id
     WHERE p.status = 'pending'
     ORDER BY p.created_at DESC`,
    [],
    (err, prescriptions) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const formatted = prescriptions.map(p => ({
        ...p,
        extracted_data: JSON.parse(p.extracted_data || '[]'),
        verified_data: p.verified_data ? JSON.parse(p.verified_data) : null
      }));

      res.json(formatted);
    }
  );
});

// Verify prescription (Doctor)
router.post('/:id/verify', authenticate, authorize('doctor'), (req, res) => {
  const { verifiedData, action } = req.body; // action: 'approve' or 'reject'

  if (!verifiedData && action !== 'reject') {
    return res.status(400).json({ error: 'Verified data is required' });
  }

  const db = getDb();
  const status = action === 'reject' ? 'rejected' : 'verified';
  const verifiedAt = new Date().toISOString();

  db.run(
    `UPDATE prescriptions
     SET status = ?, verified_data = ?, doctor_id = ?, verified_at = ?
     WHERE id = ?`,
    [status, JSON.stringify(verifiedData || []), req.user.id, verifiedAt, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update prescription' });
      }

      res.json({ message: `Prescription ${status}` });
    }
  );
});

// Get patient's prescriptions
router.get('/patient', authenticate, authorize('patient'), (req, res) => {
  const db = getDb();
  db.all(
    `SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY created_at DESC`,
    [req.user.id],
    (err, prescriptions) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const formatted = prescriptions.map(p => ({
        ...p,
        extracted_data: JSON.parse(p.extracted_data || '[]'),
        verified_data: p.verified_data ? JSON.parse(p.verified_data) : null
      }));

      res.json(formatted);
    }
  );
});

// Get verified prescriptions for patient
router.get('/patient/verified', authenticate, authorize('patient'), (req, res) => {
  const db = getDb();
  db.all(
    `SELECT * FROM prescriptions
     WHERE patient_id = ? AND status = 'verified'
     ORDER BY verified_at DESC`,
    [req.user.id],
    (err, prescriptions) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const formatted = prescriptions.map(p => ({
        ...p,
        extracted_data: JSON.parse(p.extracted_data || '[]'),
        verified_data: JSON.parse(p.verified_data || '[]')
      }));

      res.json(formatted);
    }
  );
});

module.exports = router;

