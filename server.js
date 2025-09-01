require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs').promises;
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? '/data' : __dirname);
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    }
  }
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict'
  }
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const csrfProtection = csrf({ cookie: true });

app.use(express.static('public'));

const requireAuth = (req, res, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

const loadTasks = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(TASKS_FILE, 'utf8');
    const tasks = JSON.parse(data);
    
    const now = new Date().toISOString();
    tasks.forEach(task => {
      if (!task.createdAt) {
        task.createdAt = now;
      }
      if (!task.id) {
        task.id = generateId();
      }
    });
    
    return tasks;
  } catch (error) {
    return [];
  }
};

const saveTasks = async (tasks) => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth-status', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

app.get('/api/csrf-token', requireAuth, csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/tasks', requireAuth, async (req, res) => {
  try {
    const tasks = await loadTasks();
    res.json({ 
      items: tasks,
      lastSaved: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

app.put('/api/tasks', requireAuth, csrfProtection, async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid tasks format' });
    }

    const now = new Date().toISOString();
    const existingTasks = await loadTasks();
    const existingTasksMap = new Map(existingTasks.map(t => [t.id, t]));

    items.forEach(task => {
      if (!task.id) task.id = generateId();
      
      const existingTask = existingTasksMap.get(task.id);
      if (existingTask) {
        task.createdAt = existingTask.createdAt;
        if (task.type !== 'header') {
          if (task.done && !existingTask.done) {
            task.completedAt = now;
          } else if (!task.done && existingTask.done) {
            delete task.completedAt;
          } else if (existingTask.completedAt) {
            task.completedAt = existingTask.completedAt;
          }
        }
      } else {
        task.createdAt = now;
        if (task.type !== 'header' && task.done) {
          task.completedAt = now;
        }
      }
    });

    await saveTasks(items);
    res.json({ 
      success: true, 
      lastSaved: now 
    });
  } catch (error) {
    console.error('Save tasks error:', error);
    res.status(500).json({ error: 'Failed to save tasks' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`TaskVault running on ${HOST}:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});