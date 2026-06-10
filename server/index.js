import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDb } from './db.js';
import leaguesRouter from './routes/leagues.js';
import playersRouter from './routes/players.js';
import watchlistRouter from './routes/watchlist.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

// Initialize DB on startup
try {
  getDb();
  console.log('Database initialized successfully');
} catch (err) {
  console.error('Failed to initialize database:', err.message);
  process.exit(1);
}

// Routes
app.use('/api/leagues', leaguesRouter);
app.use('/api/players', playersRouter);
app.use('/api/watchlist', watchlistRouter);

// Cache refresh shortcut (also available at /api/players/cache/refresh)
app.post('/api/cache/refresh', async (req, res) => {
  const { season = new Date().getFullYear() } = req.body;
  try {
    const db = getDb();
    db.prepare("DELETE FROM statcast_cache WHERE season=?").run(parseInt(season));
    db.prepare("DELETE FROM player_cache WHERE season=?").run(parseInt(season));
    res.json({ success: true, message: `Cache cleared for season ${season}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 fallback for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route ${req.path} not found` });
});

app.listen(PORT, () => {
  console.log(`ESPN Fantasy Tracker server running on http://localhost:${PORT}`);
});
