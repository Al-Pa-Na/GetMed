const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Mock vendor data
const mockVendors = [
  { id: 1, name: 'Apollo Pharmacy', rating: 4.8 },
  { id: 2, name: 'True Meds', rating: 4.6 },
  { id: 3, name: 'MediStore', rating: 4.5 },
  { id: 4, name: 'HealthMart', rating: 4.3 },
  { id: 5, name: 'PharmaPlus', rating: 4.7 }
];

// Mock medicine prices
const mockPrices = {
  'Paracetamol 500mg': [
    { vendorId: 1, price: 25.50, stock: 100 },
    { vendorId: 2, price: 23.00, stock: 80 },
    { vendorId: 3, price: 27.00, stock: 120 },
    { vendorId: 4, price: 26.00, stock: 90 },
    { vendorId: 5, price: 24.50, stock: 110 }
  ],
  'Amoxicillin 250mg': [
    { vendorId: 1, price: 150.00, stock: 50 },
    { vendorId: 2, price: 145.00, stock: 60 },
    { vendorId: 3, price: 155.00, stock: 45 },
    { vendorId: 4, price: 148.00, stock: 55 },
    { vendorId: 5, price: 152.00, stock: 50 }
  ],
  'default': [
    { vendorId: 1, price: 100.00, stock: 50 },
    { vendorId: 2, price: 95.00, stock: 60 },
    { vendorId: 3, price: 105.00, stock: 45 },
    { vendorId: 4, price: 98.00, stock: 55 },
    { vendorId: 5, price: 102.00, stock: 50 }
  ]
};

// Get all vendors
router.get('/', authenticate, (req, res) => {
  res.json(mockVendors);
});

// Compare prices for medicines
router.post('/compare-prices', authenticate, authorize('patient'), (req, res) => {
  const { medicines } = req.body;

  if (!medicines || !Array.isArray(medicines)) {
    return res.status(400).json({ error: 'Medicines array is required' });
  }

  const comparison = medicines.map(medicine => {
    const medicineName = medicine.name;
    const prices = mockPrices[medicineName] || mockPrices['default'];

    return {
      medicine: medicineName,
      dosage: medicine.dosage,
      frequency: medicine.frequency,
      vendors: prices.map(p => ({
        vendor: mockVendors.find(v => v.id === p.vendorId),
        price: p.price,
        stock: p.stock,
        totalPrice: p.price * (medicine.quantity || 1)
      })).sort((a, b) => a.totalPrice - b.totalPrice)
    };
  });

  res.json(comparison);
});

module.exports = router;

