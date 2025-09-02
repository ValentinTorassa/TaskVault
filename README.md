# TaskVault

A secure, self-hosted checklist application with dark theme and timestamps. Built with Node.js, Express, and vanilla JavaScript.

## Features

- **Dark Theme** with responsive design
- **Timestamps** for task creation and completion
- **Drag & Drop** reordering
- **Outline Navigator** sidebar
- **Keyboard Shortcuts** (Ctrl+S, Ctrl+F, Enter, etc.)
- **Offline Support** with localStorage backup
- **Secure Authentication** with CSRF protection

## Quick Start

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd taskvault
   ```

2. **Configure environment:**
   Edit `.env` file:
   ```bash
   ADMIN_USER=your_username
   ADMIN_PASS=your_secure_password
   SESSION_SECRET=generate_a_random_32_char_string
   PORT=3000
   ```

3. **Run:**
   ```bash
   npm install
   npm start
   ```

4. **Access:** Open http://localhost:3000

## Running in Production

### With PM2 (Process Manager)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Start with PM2:**
   ```bash
   pm2 start server.js --name taskvault
   pm2 save
   pm2 startup
   ```

3. **Monitor:**
   ```bash
   pm2 status
   pm2 logs taskvault
   ```

### NPM Scripts

- `npm start` - Run in production mode
- `npm run dev` - Run in development mode with auto-reload

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_USER` | Admin username | `admin` |
| `ADMIN_PASS` | Admin password | `password123` |
| `SESSION_SECRET` | Session encryption key | Required |
| `DATA_DIR` | Data storage directory | `./data` |
| `PORT` | Server port | `3000` |



