import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// GET /api/watchlist - get all watchlist entries
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare('SELECT * FROM watchlist ORDER BY added_at DESC').all();
    const parsed = items.map(item => ({
      ...item,
      alerts: JSON.parse(item.alerts || '[]'),
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/watchlist - add a player to watchlist
router.post('/', (req, res) => {
  try {
    const { player_id, player_name, team, position, notes, alerts } = req.body;
    if (!player_name) {
      return res.status(400).json({ error: 'player_name is required' });
    }
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO watchlist (player_id, player_name, team, position, notes, alerts)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      player_id || null,
      player_name,
      team || null,
      position || null,
      notes || '',
      JSON.stringify(alerts || [])
    );
    const entry = db.prepare('SELECT * FROM watchlist WHERE id=?').get(result.lastInsertRowid);
    res.status(201).json({
      ...entry,
      alerts: JSON.parse(entry.alerts || '[]'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/watchlist/:id - update notes/alerts
router.put('/:id', (req, res) => {
  try {
    const { notes, alerts, team, position } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT * FROM watchlist WHERE id=?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Watchlist entry not found' });

    db.prepare(`
      UPDATE watchlist SET
        notes = COALESCE(?, notes),
        alerts = COALESCE(?, alerts),
        team = COALESCE(?, team),
        position = COALESCE(?, position)
      WHERE id = ?
    `).run(
      notes !== undefined ? notes : null,
      alerts !== undefined ? JSON.stringify(alerts) : null,
      team !== undefined ? team : null,
      position !== undefined ? position : null,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM watchlist WHERE id=?').get(req.params.id);
    res.json({
      ...updated,
      alerts: JSON.parse(updated.alerts || '[]'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/watchlist/:id - remove from watchlist
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM watchlist WHERE id=?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
