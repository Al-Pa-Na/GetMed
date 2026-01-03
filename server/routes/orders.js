const express = require('express');
const { getDb } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Create order (Patient) - supports multi-vendor cart
router.post('/', authenticate, authorize('patient'), (req, res) => {
  const { prescriptionId, cartItems } = req.body;

  if (!prescriptionId || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: 'Prescription ID and cart items are required' });
  }

  const db = getDb();

  // Group items by vendor
  const vendorGroups = {};
  cartItems.forEach(item => {
    if (!vendorGroups[item.vendorId]) {
      vendorGroups[item.vendorId] = [];
    }
    vendorGroups[item.vendorId].push(item);
  });

  const orderIds = [];
  let completed = 0;
  const errors = [];

  // Create an order for each vendor
  Object.keys(vendorGroups).forEach(vendorId => {
    const items = vendorGroups[vendorId];
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    db.run(
      `INSERT INTO orders (patient_id, prescription_id, vendor_id, total_price, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [req.user.id, prescriptionId, vendorId, totalPrice],
      function(err) {
        if (err) {
          errors.push(`Failed to create order for vendor ${vendorId}`);
          completed++;
          if (completed === Object.keys(vendorGroups).length) {
            if (errors.length > 0) {
              return res.status(500).json({ error: errors.join(', ') });
            }
            res.json({ orderIds, message: 'Orders created successfully' });
          }
          return;
        }

        const orderId = this.lastID;
        orderIds.push(orderId);

        // Insert order items
        const stmt = db.prepare(
          `INSERT INTO order_items (order_id, medicine_name, quantity, price)
           VALUES (?, ?, ?, ?)`
        );

        items.forEach(item => {
          stmt.run([orderId, item.medicineName, item.quantity, item.price]);
        });

        stmt.finalize((err) => {
          if (err) {
            errors.push(`Failed to create order items for order ${orderId}`);
          }
          completed++;
          if (completed === Object.keys(vendorGroups).length) {
            if (errors.length > 0) {
              return res.status(500).json({ error: errors.join(', ') });
            }
            res.json({ orderIds, message: 'Orders created successfully' });
          }
        });
      }
    );
  });
});

// Get patient's orders
router.get('/patient', authenticate, authorize('patient'), (req, res) => {
  const db = getDb();
  db.all(
    `SELECT o.*, u.name as vendor_name
     FROM orders o
     JOIN users u ON o.vendor_id = u.id
     WHERE o.patient_id = ?
     ORDER BY o.created_at DESC`,
    [req.user.id],
    (err, orders) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Get order items for each order
      const ordersWithItems = orders.map(order => {
        return new Promise((resolve) => {
          db.all(
            `SELECT * FROM order_items WHERE order_id = ?`,
            [order.id],
            (err, items) => {
              if (err) {
                resolve({ ...order, items: [] });
              } else {
                resolve({ ...order, items });
              }
            }
          );
        });
      });

      Promise.all(ordersWithItems).then(results => {
        res.json(results);
      });
    }
  );
});

// Get receipt for an order
router.get('/:id/receipt', authenticate, authorize('patient'), (req, res) => {
  const db = getDb();
  
  db.get(
    `SELECT o.*, u.name as vendor_name, p.name as patient_name, p.email as patient_email
     FROM orders o
     JOIN users u ON o.vendor_id = u.id
     JOIN users p ON o.patient_id = p.id
     WHERE o.id = ? AND o.patient_id = ?`,
    [req.params.id, req.user.id],
    (err, order) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      db.all(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [order.id],
        (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Generate receipt HTML
          const receipt = generateReceiptHTML(order, items);
          res.setHeader('Content-Type', 'text/html');
          res.send(receipt);
        }
      );
    }
  );
});

// Download receipt as PDF-ready HTML
router.get('/:id/receipt/download', authenticate, authorize('patient'), (req, res) => {
  const db = getDb();
  
  db.get(
    `SELECT o.*, u.name as vendor_name, p.name as patient_name, p.email as patient_email
     FROM orders o
     JOIN users u ON o.vendor_id = u.id
     JOIN users p ON o.patient_id = p.id
     WHERE o.id = ? AND o.patient_id = ?`,
    [req.params.id, req.user.id],
    (err, order) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      db.all(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [order.id],
        (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          const receipt = generateReceiptHTML(order, items, true);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="receipt-order-${order.id}.html"`);
          res.send(receipt);
        }
      );
    }
  );
});

function generateReceiptHTML(order, items, forDownload = false) {
  const date = new Date(order.created_at).toLocaleString();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - Order #${order.id}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      ${forDownload ? 'background: white;' : ''}
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #2c3e50;
    }
    .info-section {
      margin-bottom: 30px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .info-label {
      font-weight: bold;
      color: #555;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #2c3e50;
      color: white;
    }
    .total-section {
      text-align: right;
      margin-top: 20px;
      font-size: 18px;
    }
    .total-amount {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #777;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PHARMACY RECEIPT</h1>
  </div>
  
  <div class="info-section">
    <div class="info-row">
      <span class="info-label">Order Number:</span>
      <span>#${order.id}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date:</span>
      <span>${date}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Patient:</span>
      <span>${order.patient_name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Vendor:</span>
      <span>${order.vendor_name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Status:</span>
      <span>${order.status.toUpperCase()}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Medicine</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${item.medicine_name}</td>
          <td>${item.quantity}</td>
          <td>₹${parseFloat(item.price).toFixed(2)}</td>
          <td>₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="total-section">
    <div class="info-row">
      <span class="info-label">Total Amount:</span>
      <span class="total-amount">₹${parseFloat(order.total_price).toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for your purchase!</p>
    <p>This is a computer-generated receipt.</p>
  </div>
</body>
</html>
  `;
}

module.exports = router;
