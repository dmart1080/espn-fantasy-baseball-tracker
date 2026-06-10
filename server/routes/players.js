import { Router } from 'express';
import { getDb } from '../db.js';
import {
  fetchBatterStatcast,
  fetchPitcherStatcast,
  fetchSprintSpeed,
} from '../statcastApi.js';

const router = Router();

// GET /api/players/statcast/:season - get cached statcast data (batters + pitchers)
router.get('/statcast/:season', async (req, res) => {
  try {
    const { season } = req.params;
    const { type = 'batter' } = req.query;
    const yr = parseInt(season);

    let data;
    if (type === 'pitcher') {
      data = await fetchPitcherStatcast(yr);
    } else if (type === 'sprint') {
      data = await fetchSprintSpeed(yr);
    } else {
      data = await fetchBatterStatcast(yr);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/players/:playerId/stats - get combined stats for a player
router.get('/:playerId/stats', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season = new Date().getFullYear() } = req.query;
    const db = getDb();

    // Check player cache first
    const cached = db.prepare(
      'SELECT data FROM player_cache WHERE player_id=? AND season=?'
    ).get(playerId, season);

    if (cached) {
      const age = Date.now() - new Date(JSON.parse(cached.data).updated_at || 0).getTime();
      if (age < 3600000) {
        return res.json(JSON.parse(cached.data));
      }
    }

    // Fetch statcast data and find player
    const [batters, pitchers, sprint] = await Promise.all([
      fetchBatterStatcast(parseInt(season)),
      fetchPitcherStatcast(parseInt(season)),
      fetchSprintSpeed(parseInt(season)),
    ]);

    const batterData = batters.find(b => b.player_id === playerId || b.name.toLowerCase().includes(playerId.toLowerCase()));
    const pitcherData = pitchers.find(p => p.player_id === playerId || p.name.toLowerCase().includes(playerId.toLowerCase()));
    const sprintData = sprint.find(s => s.player_id === playerId || s.name.toLowerCase().includes(playerId.toLowerCase()));

    const combined = {
      player_id: playerId,
      updated_at: new Date().toISOString(),
      batter: batterData || null,
      pitcher: pitcherData || null,
      sprint: sprintData || null,
    };

    // Cache the result
    db.prepare(`
      INSERT INTO player_cache (player_id, season, data, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(player_id, season) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at
    `).run(playerId, season, JSON.stringify(combined));

    res.json(combined);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cache/refresh - manually refresh statcast cache
router.post('/cache/refresh', async (req, res) => {
  try {
    const { season = new Date().getFullYear() } = req.body;
    const yr = parseInt(season);

    // Clear existing cache
    const db = getDb();
    db.prepare("DELETE FROM statcast_cache WHERE season=?").run(yr);
    db.prepare("DELETE FROM player_cache WHERE season=?").run(yr);

    // Re-fetch everything in parallel
    const [batters, pitchers, sprint] = await Promise.all([
      fetchBatterStatcast(yr),
      fetchPitcherStatcast(yr),
      fetchSprintSpeed(yr),
    ]);

    res.json({
      success: true,
      counts: {
        batters: batters.length,
        pitchers: pitchers.length,
        sprint: sprint.length,
      },
      refreshed_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
