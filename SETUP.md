# Setup Instructions

## Prerequisites
- Node.js (v14 or higher)
- npm or yarn

## Installation Steps

1. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

2. **Create a `.env` file in the root directory:**
   ```
   JWT_SECRET=your-secret-key-here
   OPENAI_API_KEY=your-openai-api-key-optional
   PORT=5000
   ```
   
   Note: OPENAI_API_KEY is optional. If not provided, the system will use mock data for prescription extraction.

3. **Start the development servers:**
   ```bash
   npm run dev
   ```
   
   This will start:
   - Backend server on http://localhost:5000
   - Frontend React app on http://localhost:3000

## Default Demo Accounts

- **Patient**: patient@test.com / password123
- **Doctor**: doctor@test.com / password123
- **Vendor**: vendor@test.com / password123

## Features

### Patient Role
- Upload prescription images
- View all prescriptions (pending, verified, rejected)
- Compare prices across vendors for verified prescriptions
- Place orders for medicines
- View order history

### Doctor Role
- View pending prescriptions with extracted data
- Review prescription images and OCR results
- Approve, reject, or edit prescription data
- Generate verified prescriptions

### Vendor Role
- Dashboard (basic implementation)
- Prices are managed through mock APIs for demonstration

## Architecture

- **Backend**: Node.js + Express + SQLite
- **Frontend**: React with React Router
- **OCR**: Tesseract.js for text extraction
- **LLM**: Optional OpenAI API integration (falls back to mock data)
- **Authentication**: JWT-based authentication
- **File Storage**: Local file system for prescription images

