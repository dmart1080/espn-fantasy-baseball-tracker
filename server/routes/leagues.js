import { Router } from 'express';
import { getDb } from '../db.js';
import {
  fetchLeague,
  fetchLeagueRosters,
  fetchFreeAgents,
  getMockRosters,
  getMockFreeAgents,
} from '../espnApi.js';

const router = Router();

// GET /api/leagues - list all stored leagues
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const leagues = db.prepare('SELECT * FROM leagues ORDER BY created_at DESC').all();
    res.json(leagues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leagues - add a new league
router.post('/', (req, res) => {
  try {
    const { league_id, season, name, espn_s2, swid } = req.body;
    if (!league_id || !season) {
      return res.status(400).json({ error: 'league_id and season are required' });
    }
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO leagues (league_id, season, name, espn_s2, swid)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(league_id, season, name || `League ${league_id}`, espn_s2 || null, swid || null);
    const league = db.prepare('SELECT * FROM leagues WHERE id=?').get(result.lastInsertRowid);
    res.status(201).json(league);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leagues/:id - remove a league
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM leagues WHERE id=?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'League not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leagues/:id/data - fetch live ESPN data for a league
router.get('/:id/data', async (req, res) => {
  try {
    const db = getDb();
    const league = db.prepare('SELECT * FROM leagues WHERE id=?').get(req.params.id);
    if (!league) return res.status(404).json({ error: 'League not found' });

    const data = await fetchLeague(
      league.league_id,
      league.season,
      league.espn_s2,
      league.swid
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leagues/:id/rosters - get roster data
router.get('/:id/rosters', async (req, res) => {
  try {
    const db = getDb();
    const league = db.prepare('SELECT * FROM leagues WHERE id=?').get(req.params.id);
    if (!league) return res.status(404).json({ error: 'League not found' });

    const rosters = await fetchLeagueRosters(
      league.league_id,
      league.season,
      league.espn_s2,
      league.swid
    );
    res.json(rosters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leagues/:id/freeagents - get free agents
router.get('/:id/freeagents', async (req, res) => {
  try {
    const db = getDb();
    const league = db.prepare('SELECT * FROM leagues WHERE id=?').get(req.params.id);
    if (!league) return res.status(404).json({ error: 'League not found' });

    const freeAgents = await fetchFreeAgents(
      league.league_id,
      league.season,
      league.espn_s2,
      league.swid
    );
    res.json(freeAgents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
