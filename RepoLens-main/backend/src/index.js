require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const { initSocket } = require('./lib/socket');

const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const documentRoutes = require('./routes/documents');
const exportRoutes = require('./routes/export');

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
].filter(Boolean);

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

initSocket(io);
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join', ({ jobId }) => {
    socket.join(jobId);
    console.log(`Socket ${socket.id} joined room: ${jobId}`);
    socket.emit('joined', { jobId });
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());
app.set('trust proxy', 1);

// ── PostgreSQL session store ─────────────────────────────────────────────────
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

const sessionStore = new pgSession({
  pool: pgPool,
  tableName: 'session',
  createTableIfMissing: true,
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  name: 'repolens.sid',
  cookie: {
    // In production, requests come through Vercel proxy (same origin)
    // so we can use lax sameSite and don't need secure:true workarounds
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'lax' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/export', exportRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'RepoLens backend is running',
    environment: process.env.NODE_ENV,
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'RepoLens API v1.0' });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, async () => {
  console.log(`✅ RepoLens backend running on port ${PORT}`);
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
});