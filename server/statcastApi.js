import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';
import { getDb } from './db.js';

const SAVANT_BASE = 'https://baseballsavant.mlb.com';

async function fetchCSV(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FantasyTracker/1.0)',
      'Accept': 'text/csv,application/csv,*/*',
    }
  });
  if (!res.ok) throw new Error(`Savant returned ${res.status} for ${url}`);
  const text = await res.text();
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

export async function fetchBatterStatcast(season) {
  const db = getDb();
  const cached = db.prepare(
    `SELECT data, updated_at FROM statcast_cache WHERE season=? AND type='batter'`
  ).get(season);

  if (cached) {
    const age = Date.now() - new Date(cached.updated_at).getTime();
    if (age < 6 * 60 * 60 * 1000) {
      return JSON.parse(cached.data);
    }
  }

  try {
    const url = `${SAVANT_BASE}/leaderboard/expected_statistics?type=batter&year=${season}&position=&team=&min=25&csv=true`;
    const records = await fetchCSV(url);
    const normalized = records.map(r => normalizeBatterRow(r));
    cacheStatcast(db, season, 'batter', normalized);
    return normalized;
  } catch (err) {
    console.error('fetchBatterStatcast error:', err.message);
    if (cached) return JSON.parse(cached.data);
    return getMockBatterStatcast();
  }
}

export async function fetchPitcherStatcast(season) {
  const db = getDb();
  const cached = db.prepare(
    `SELECT data, updated_at FROM statcast_cache WHERE season=? AND type='pitcher'`
  ).get(season);

  if (cached) {
    const age = Date.now() - new Date(cached.updated_at).getTime();
    if (age < 6 * 60 * 60 * 1000) {
      return JSON.parse(cached.data);
    }
  }

  try {
    const url = `${SAVANT_BASE}/leaderboard/expected_statistics?type=pitcher&year=${season}&position=&team=&min=25&csv=true`;
    const records = await fetchCSV(url);
    const normalized = records.map(r => normalizePitcherRow(r));
    cacheStatcast(db, season, 'pitcher', normalized);
    return normalized;
  } catch (err) {
    console.error('fetchPitcherStatcast error:', err.message);
    if (cached) return JSON.parse(cached.data);
    return getMockPitcherStatcast();
  }
}

export async function fetchSprintSpeed(season) {
  const db = getDb();
  const cached = db.prepare(
    `SELECT data, updated_at FROM statcast_cache WHERE season=? AND type='sprint_speed'`
  ).get(season);

  if (cached) {
    const age = Date.now() - new Date(cached.updated_at).getTime();
    if (age < 24 * 60 * 60 * 1000) {
      return JSON.parse(cached.data);
    }
  }

  try {
    const url = `${SAVANT_BASE}/leaderboard/sprint_speed?min_opp=0&position=&team=0&year=${season}&csv=true`;
    const records = await fetchCSV(url);
    const normalized = records.map(r => ({
      player_id: r.player_id || r.mlb_id || '',
      name: r.last_name ? `${r.first_name || ''} ${r.last_name}`.trim() : r.player_name || '',
      team: r.team || r.team_id || '',
      sprint_speed: parseFloat(r.hp_to_1b || r.sprint_speed) || 0,
      competitive_runs: parseInt(r.competitive_runs || r.n) || 0,
      season,
    }));
    cacheStatcast(db, season, 'sprint_speed', normalized);
    return normalized;
  } catch (err) {
    console.error('fetchSprintSpeed error:', err.message);
    if (cached) return JSON.parse(cached.data);
    return getMockSprintSpeed();
  }
}

function normalizeBatterRow(r) {
  return {
    player_id: r.player_id || r.mlb_id || '',
    name: r.last_name ? `${r.first_name || ''} ${r.last_name}`.trim() : r.player_name || '',
    team: r.team || '',
    pa: parseInt(r.pa) || 0,
    ab: parseInt(r.ab) || 0,
    ba: parseFloat(r.ba) || 0,
    xba: parseFloat(r.est_ba) || parseFloat(r.xba) || 0,
    slg: parseFloat(r.slg) || 0,
    xslg: parseFloat(r.est_slg) || parseFloat(r.xslg) || 0,
    woba: parseFloat(r.woba) || 0,
    xwoba: parseFloat(r.est_woba) || parseFloat(r.xwoba) || 0,
    wobacon: parseFloat(r.wobacon) || 0,
    xwobacon: parseFloat(r.est_woba_minus_woba_diff) || 0,
    barrel_pct: parseFloat(r.barrel_batted_rate) || parseFloat(r['barrel%']) || 0,
    hard_hit_pct: parseFloat(r.hard_hit_rate) || parseFloat(r['hard_hit%']) || 0,
    avg_exit_velocity: parseFloat(r.avg_hit_speed) || parseFloat(r.exit_velocity_avg) || 0,
    avg_launch_angle: parseFloat(r.avg_hit_angle) || parseFloat(r.launch_angle_avg) || 0,
    k_pct: parseFloat(r.k_percent) || 0,
    bb_pct: parseFloat(r.bb_percent) || 0,
    iso: parseFloat(r.iso) || 0,
    babip: parseFloat(r.babip) || 0,
    sprint_speed: parseFloat(r.sprint_speed) || 0,
  };
}

function normalizePitcherRow(r) {
  return {
    player_id: r.player_id || r.mlb_id || '',
    name: r.last_name ? `${r.first_name || ''} ${r.last_name}`.trim() : r.player_name || '',
    team: r.team || '',
    pa: parseInt(r.pa) || 0,
    era: parseFloat(r.era) || 0,
    xera: parseFloat(r.est_era) || parseFloat(r.xera) || 0,
    fip: parseFloat(r.fip) || 0,
    ba: parseFloat(r.ba) || 0,
    xba: parseFloat(r.est_ba) || parseFloat(r.xba) || 0,
    slg: parseFloat(r.slg) || 0,
    xslg: parseFloat(r.est_slg) || parseFloat(r.xslg) || 0,
    woba: parseFloat(r.woba) || 0,
    xwoba: parseFloat(r.est_woba) || parseFloat(r.xwoba) || 0,
    barrel_pct: parseFloat(r.barrel_batted_rate) || 0,
    hard_hit_pct: parseFloat(r.hard_hit_rate) || 0,
    avg_exit_velocity: parseFloat(r.avg_hit_speed) || 0,
    k_pct: parseFloat(r.k_percent) || 0,
    bb_pct: parseFloat(r.bb_percent) || 0,
    whip: parseFloat(r.whip) || 0,
    csw_pct: parseFloat(r.csw_rate) || parseFloat(r['csw%']) || 0,
  };
}

function cacheStatcast(db, season, type, data) {
  db.prepare(`
    INSERT INTO statcast_cache (season, type, data, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(season, type) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at
  `).run(season, type, JSON.stringify(data));
}

// Mock data fallbacks
function getMockBatterStatcast() {
  const players = [
    { name: 'Shohei Ohtani', team: 'LAD' },
    { name: 'Ronald Acuna Jr.', team: 'ATL' },
    { name: 'Freddie Freeman', team: 'LAD' },
    { name: 'Yordan Alvarez', team: 'HOU' },
    { name: 'Mike Trout', team: 'LAA' },
    { name: 'Jose Altuve', team: 'HOU' },
    { name: 'Trea Turner', team: 'PHI' },
    { name: 'Manny Machado', team: 'SD' },
    { name: 'Bo Bichette', team: 'TOR' },
    { name: 'Pete Alonso', team: 'NYM' },
    { name: 'Julio Rodriguez', team: 'SEA' },
    { name: 'Gunnar Henderson', team: 'BAL' },
    { name: 'Bobby Witt Jr.', team: 'KC' },
    { name: 'Corbin Carroll', team: 'ARI' },
    { name: 'Francisco Alvarez', team: 'NYM' },
    { name: 'Austin Riley', team: 'ATL' },
    { name: 'Luis Robert Jr.', team: 'CWS' },
    { name: 'Rafael Devers', team: 'BOS' },
    { name: 'Corey Seager', team: 'TEX' },
    { name: 'Kyle Tucker', team: 'HOU' },
  ];

  return players.map((p, i) => ({
    player_id: (1000 + i).toString(),
    name: p.name,
    team: p.team,
    pa: Math.floor(Math.random() * 300 + 200),
    ab: Math.floor(Math.random() * 270 + 180),
    ba: parseFloat((Math.random() * 0.110 + 0.230).toFixed(3)),
    xba: parseFloat((Math.random() * 0.100 + 0.240).toFixed(3)),
    slg: parseFloat((Math.random() * 0.200 + 0.390).toFixed(3)),
    xslg: parseFloat((Math.random() * 0.190 + 0.400).toFixed(3)),
    woba: parseFloat((Math.random() * 0.090 + 0.320).toFixed(3)),
    xwoba: parseFloat((Math.random() * 0.085 + 0.330).toFixed(3)),
    barrel_pct: parseFloat((Math.random() * 12 + 4).toFixed(1)),
    hard_hit_pct: parseFloat((Math.random() * 20 + 35).toFixed(1)),
    avg_exit_velocity: parseFloat((Math.random() * 8 + 87).toFixed(1)),
    avg_launch_angle: parseFloat((Math.random() * 10 + 8).toFixed(1)),
    k_pct: parseFloat((Math.random() * 15 + 14).toFixed(1)),
    bb_pct: parseFloat((Math.random() * 8 + 6).toFixed(1)),
    iso: parseFloat((Math.random() * 0.120 + 0.150).toFixed(3)),
    babip: parseFloat((Math.random() * 0.080 + 0.280).toFixed(3)),
    sprint_speed: parseFloat((Math.random() * 4 + 26).toFixed(1)),
  }));
}

function getMockPitcherStatcast() {
  const pitchers = [
    { name: 'Gerrit Cole', team: 'NYY' },
    { name: 'Spencer Strider', team: 'ATL' },
    { name: 'Zack Wheeler', team: 'PHI' },
    { name: 'Freddy Peralta', team: 'MIL' },
    { name: 'Logan Webb', team: 'SF' },
    { name: 'Nestor Cortes', team: 'NYY' },
    { name: 'Kodai Senga', team: 'NYM' },
    { name: 'Sandy Alcantara', team: 'MIA' },
    { name: 'Dylan Cease', team: 'SD' },
    { name: 'Shane McClanahan', team: 'TB' },
    { name: 'Pablo Lopez', team: 'MIN' },
    { name: 'Julio Urias', team: 'LAD' },
    { name: 'Tyler Glasnow', team: 'LAD' },
    { name: 'Max Fried', team: 'ATL' },
    { name: 'Kevin Gausman', team: 'TOR' },
  ];

  return pitchers.map((p, i) => ({
    player_id: (3000 + i).toString(),
    name: p.name,
    team: p.team,
    pa: Math.floor(Math.random() * 200 + 150),
    era: parseFloat((Math.random() * 2.5 + 2.5).toFixed(2)),
    xera: parseFloat((Math.random() * 2.3 + 2.7).toFixed(2)),
    fip: parseFloat((Math.random() * 2.2 + 2.8).toFixed(2)),
    ba: parseFloat((Math.random() * 0.060 + 0.210).toFixed(3)),
    xba: parseFloat((Math.random() * 0.055 + 0.220).toFixed(3)),
    woba: parseFloat((Math.random() * 0.060 + 0.280).toFixed(3)),
    xwoba: parseFloat((Math.random() * 0.055 + 0.290).toFixed(3)),
    barrel_pct: parseFloat((Math.random() * 6 + 4).toFixed(1)),
    hard_hit_pct: parseFloat((Math.random() * 12 + 28).toFixed(1)),
    avg_exit_velocity: parseFloat((Math.random() * 5 + 85).toFixed(1)),
    k_pct: parseFloat((Math.random() * 12 + 22).toFixed(1)),
    bb_pct: parseFloat((Math.random() * 5 + 5).toFixed(1)),
    whip: parseFloat((Math.random() * 0.4 + 0.95).toFixed(2)),
    csw_pct: parseFloat((Math.random() * 10 + 25).toFixed(1)),
  }));
}

function getMockSprintSpeed() {
  const players = [
    { name: 'Bobby Witt Jr.', team: 'KC' },
    { name: 'Trea Turner', team: 'PHI' },
    { name: 'Ronald Acuna Jr.', team: 'ATL' },
    { name: 'Corbin Carroll', team: 'ARI' },
    { name: 'Julio Rodriguez', team: 'SEA' },
    { name: 'Jose Caballero', team: 'TB' },
    { name: 'Elly De La Cruz', team: 'CIN' },
    { name: 'Jarren Duran', team: 'BOS' },
  ];

  return players.map((p, i) => ({
    player_id: (5000 + i).toString(),
    name: p.name,
    team: p.team,
    sprint_speed: parseFloat((Math.random() * 2 + 28).toFixed(1)),
    competitive_runs: Math.floor(Math.random() * 50 + 20),
  }));
}
