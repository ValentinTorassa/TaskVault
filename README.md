# TaskVault

A secure, self-hosted checklist application with a premium dark theme, outline navigator, and timestamps. Built with Node.js, Express, and vanilla JavaScript.

## Features

### ✨ UI/UX
- **Premium Dark Theme**: Clean, elegant dark theme with soft shadows and subtle gradients  
- **Glassmorphism Navbar**: Bold navbar with translucent background, blur effects, and pill-shaped buttons
- **Compact Row Design**: Denser task rows (36-42px) with right-aligned timestamps for better information density
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Sticky Header**: Save, Add Item, Add Header, Search, and status indicator always visible
- **Outline Navigator**: Right sidebar that lists all headers with smooth scrolling and scroll spy
- **Enhanced Search**: Pill-shaped search with magnifying glass icon and live filtering

### ⏰ Timestamps
- **Creation Timestamps**: Every item and header gets a `createdAt` timestamp
- **Completion Timestamps**: Tasks get a `completedAt` timestamp when checked
- **Relative Time Display**: Shows "2h ago", "3d ago" etc. with full datetime on hover
- **Backward Compatible**: Automatically adds timestamps to existing tasks

### 🎯 Productivity Features  
- **Compact Design**: Denser rows (36-42px) for better visual density while maintaining readability
- **Right-Aligned Timestamps**: Show "Done · 2h" or "Created · 1d" with full datetime tooltips  
- **Drag & Drop**: Reorder items and headers with visual feedback
- **Keyboard Shortcuts**:
  - `Ctrl/Cmd+S`: Save tasks
  - `Ctrl/Cmd+F`: Focus search  
  - `Ctrl/Cmd+Shift+H`: Add header
  - `Enter`: Create new item below current
  - `Escape`: Close search/sidebar
- **Undo Support**: One-step undo for accidental changes
- **Smart Delete**: Confirms before deleting headers with items below

### 🔒 Security & Reliability
- **Hardcoded Authentication**: Simple admin user/password via environment variables
- **CSRF Protection**: Secure forms with CSRF tokens
- **Rate Limiting**: Login attempt throttling
- **Helmet Security**: CSP headers and security best practices
- **Session Management**: Secure cookie-based sessions

### 💾 Local-First Behavior
- **100% Reliable localStorage**: Robust save/load with schema validation and integrity checks
- **Offline Support**: Keep working even when server is unavailable  
- **Conflict Resolution**: Smart merging of local and server changes
- **Auto-Backup**: Local changes saved immediately with debounced persistence
- **Error Recovery**: Graceful handling of network failures with non-blocking toasts
- **Schema Migration**: Automatically adds missing timestamps to legacy data

## Quick Start

### Using Docker (Recommended)

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd taskvault
   cp .env .env.backup  # Backup existing config if needed
   ```

2. **Configure environment:**
   Edit `.env` file:
   ```bash
   ADMIN_USER=your_username
   ADMIN_PASS=your_secure_password
   SESSION_SECRET=generate_a_random_32_char_string
   DATA_DIR=/data
   PORT=3000
   ```

3. **Run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

4. **Access the app:**
   Open http://localhost:3000

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables:**
   ```bash
   # Edit .env with your settings
   ```

3. **Run the application:**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_USER` | Admin username | `admin` |
| `ADMIN_PASS` | Admin password | `password123` |
| `SESSION_SECRET` | Session encryption key | Required |
| `DATA_DIR` | Data storage directory | `./data` (dev) or `/data` (prod) |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |

### Docker Setup

The application is designed to run behind a reverse proxy (like Cloudflare or nginx):

- **Binding**: Binds to `127.0.0.1` by default for security
- **Data Persistence**: Uses `/data` volume mount
- **Health Checks**: Built-in health monitoring
- **Non-root User**: Runs as `node` user for security

### Data Storage

- **Single JSON File**: All tasks stored in `tasks.json`
- **Automatic Backups**: Local browser storage for offline support
- **Schema**: Each task has `id`, `type`, `text`, `done`, `createdAt`, `completedAt`

## API Reference

### Authentication

- `POST /api/login` - Login with username/password
- `POST /api/logout` - Logout current session
- `GET /api/auth-status` - Check authentication status

### Tasks

- `GET /api/tasks` - Load all tasks with metadata
- `PUT /api/tasks` - Save tasks (requires CSRF token)
- `GET /api/csrf-token` - Get CSRF token

### Health

- `GET /health` - Health check endpoint

## Development

### Project Structure

```
taskvault/
├── server.js          # Express server with security
├── public/
│   ├── index.html     # Single-page application
│   ├── style.css      # Premium dark theme
│   └── script.js      # Vanilla JS application logic
├── Dockerfile         # Container configuration
├── docker-compose.yml # Docker Compose setup
├── package.json       # Dependencies
└── README.md         # This file
```

### Key Features Implementation

**Compact Design**: Flexbox layout with 36-42px row heights and right-aligned timestamps  
**Glassmorphism**: CSS backdrop-filter with translucent backgrounds and blur effects  
**Timestamps**: Handled in both frontend and backend with conflict resolution  
**Reliable localStorage**: Schema validation, integrity checks, and automatic migration  
**Search**: Enhanced pill design with icon and debounced filtering  
**Outline**: Built from headers with scroll spy functionality  
**Drag & Drop**: Native HTML5 with visual feedback  
**Local-First**: 100% reliable localStorage with smart conflict resolution  
**Security**: Helmet, CSRF, rate limiting, secure sessions  

## Security Considerations

- Change default credentials in production
- Use a strong `SESSION_SECRET` (32+ random characters)
- Run behind HTTPS reverse proxy
- Consider adding IP whitelisting for admin access
- Regularly backup your `tasks.json` file

## Troubleshooting

**Can't login**: Check `ADMIN_USER` and `ADMIN_PASS` environment variables

**Data not persisting**: Ensure data directory has proper permissions and is mounted correctly

**Search not working**: Clear browser cache and reload

**Outline not updating**: Check console for JavaScript errors

**Network errors**: Check if server is running and accessible

## Deployment with Cloudflare/Tailscale

For secure internet exposure:

1. **Cloudflare Zero Trust**: Use Cloudflare Tunnel to expose the service securely
2. **Tailscale**: Set up Tailscale for private network access
3. **nginx proxy**: Configure nginx with SSL termination

Example nginx config:
```nginx
server {
    listen 443 ssl;
    server_name your-taskvault.domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```