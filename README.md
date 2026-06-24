# Kabojja International School (KIS) Management System

A full-stack school management web application for tracking learner registration, ID cards with QR/barcode, gate entry/exit, lunch scanning, library access, and real-time office notifications.

**Motto:** *We strive to achieve*

## Features

- **Learner Registration** — Register learners and auto-generate ID cards with QR code and barcode
- **Gate Scanning** — Entry and exit (going home) with timestamp logging
- **Lunch Scanner** — Fast card scan with green light approval for cafeteria
- **Library Scanning** — Entry and exit tracking for library access
- **Office Notifications** — Real-time alerts to Main Office, Security, Library, and Cafeteria
- **Learner Lookup** — Search learners and view full activity history, location, and lunch status
- **Dashboard** — Live stats: learners in school, library, at lunch, or out

## Tech Stack

| Layer      | Technology                    |
|-----------|-------------------------------|
| Backend   | Node.js, Express, Socket.io   |
| Database  | PostgreSQL                    |
| Frontend  | React, Vite, React Router     |
| Cards     | QR Code + Barcode generation  |

## Color Scheme

- **Maroon** `#7B1E3A` — Primary actions, headers
- **Sky Blue** `#4DA6D9` — Accents, info
- **Yellow** `#F5C518` — K.I.S branding
- **Green** `#22C55E` — Scan approval (lunch machine)

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/) 14+

## Setup

### 1. Create the database

```bash
# In psql or pgAdmin, create the database:
CREATE DATABASE kis_school;
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials:
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/kis_school
```

### 3. Install dependencies

```bash
# From project root:
npm run install:all
```

### 4. Initialize database schema

```bash
npm run db:setup
```

### 5. Start the application

Open two terminals:

```bash
# Terminal 1 — Backend API (port 5000)
npm run dev:backend

# Terminal 2 — Frontend (port 3000)
npm run dev:frontend
```

Open **http://localhost:3000** in your browser.

## Usage Guide

### Register a Learner
1. Go to **Register Learner**
2. Fill in name, class, and optional parent details
3. Click **Register & Generate ID Card**
4. Print the generated card with QR code and barcode

### Gate Scanner
1. Go to **Gate Scan**
2. Toggle between **Entry** and **Exit (Going Home)**
3. Scan or type the card ID (e.g. `KIS25123456`)
4. System records timestamp and notifies offices

### Lunch Scanner
1. Go to **Lunch Scan**
2. Scan learner card — green light = approved
3. Each learner can only have lunch once per day

### Library Scanner
1. Go to **Library Scan**
2. Toggle **Enter** or **Exit**
3. Learner must be in school to enter library

### Learner Lookup
1. Search by name, card ID, or class
2. View current location, lunch status, and full activity timeline

## API Endpoints

| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| POST   | `/api/learners`             | Register learner         |
| GET    | `/api/learners/search?q=`   | Search learners          |
| GET    | `/api/learners/:id`         | Get learner details      |
| GET    | `/api/learners/:id/activity`| Get scan history         |
| POST   | `/api/scan`                 | Process a card scan      |
| GET    | `/api/scan/stats`           | Dashboard statistics     |
| GET    | `/api/notifications`        | Get office notifications |

### Scan Request Body

```json
{
  "card_id": "KIS25123456",
  "scan_type": "gate_in",
  "scanner_location": "Main Gate"
}
```

**Scan types:** `gate_in`, `gate_out`, `lunch`, `library_in`, `library_out`

## Project Structure

```
Kis90/
├── backend/           # Node.js API server
│   └── src/
│       ├── controllers/
│       ├── routes/
│       └── server.js
├── frontend/          # React web app
│   └── src/
│       ├── components/
│       ├── pages/
│       └── services/
├── database/
│   └── schema.sql     # PostgreSQL schema
└── README.md
```

## Hardware Integration

The scan interfaces accept card IDs via keyboard input (barcode scanner wedge mode). Connect a USB barcode/QR scanner — it types the card ID and sends Enter, which triggers the scan automatically.

For the lunch "green light" machine, display the **Lunch Scan** page on a dedicated screen or tablet at the cafeteria entrance.

## License

Built for Kabojja International School.
