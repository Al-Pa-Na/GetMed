# Prescription Management System

A full-stack web application for managing prescriptions with three user roles: Patient, Doctor, and Vendor.

## Features

- **Patient Role**: Upload prescription images, view verified prescriptions, compare prices across vendors, and order medicines
- **Doctor Role**: Review and verify prescriptions extracted from images using OCR + LLM
- **Vendor Role**: Provide medicine prices for comparison (mock APIs)

## Tech Stack

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React
- **OCR**: Tesseract.js
- **LLM**: OpenAI API (configurable)

## Setup

1. Install dependencies:
```bash
npm run install-all
```

2. Create a `.env` file in the root directory:
```
JWT_SECRET=your-secret-key-here
OPENAI_API_KEY=your-openai-api-key-optional
PORT=5000
```

3. Run the application:
```bash
npm run dev
```

The backend will run on http://localhost:5000 and frontend on http://localhost:3000

## Default Accounts

- Patient: patient@test.com / password123
- Doctor: doctor@test.com / password123
- Vendor: vendor@test.com / password123

