CREATE TABLE IF NOT EXISTS leagues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  name TEXT,
  espn_s2 TEXT,
  swid TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS player_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(player_id, season)
);

CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT,
  player_name TEXT NOT NULL,
  team TEXT,
  position TEXT,
  notes TEXT DEFAULT '',
  alerts TEXT DEFAULT '[]',
  added_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS statcast_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season INTEGER NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(season, type)
);
