# TaskVault

A simple self-hosted web checklist app with authentication and drag-and-drop task management.

## Features

- Clean dark theme interface
- Password-protected access
- Drag-and-drop task reordering
- Two task types: headers and checkbox items
- Data persistence in JSON file
- Docker deployment ready

## Quick Start

1. Copy `.env.example` to `.env` and set your credentials:
   ```bash
   cp .env.example .env
   # Edit .env with your preferred username/password
   ```

2. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

3. Access at `http://localhost:3000`

## Environment Variables

- `ADMIN_USER`: Login username
- `ADMIN_PASS`: Login password  
- `SESSION_SECRET`: Session encryption key
- `PORT`: Server port (default: 3000)

## Health Check

Health endpoint available at `/health` for monitoring integration.