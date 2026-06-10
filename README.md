# ESPN Fantasy Baseball Tracker

A full-stack app for managing **3 ESPN fantasy baseball leagues simultaneously**, with deep Statcast metrics that go well beyond ESPN's default stats.

![Dark theme, Baseball Savant-inspired aesthetic](https://img.shields.io/badge/theme-dark-0d1117) ![React](https://img.shields.io/badge/frontend-React%2018%20%2B%20Vite-61dafb) ![Express](https://img.shields.io/badge/backend-Express-339933) ![SQLite](https://img.shields.io/badge/cache-SQLite-003b57)

## Features

### League Management
- Track 3 (or more) ESPN league IDs + season year
- Dashboard with all leagues side-by-side and quick-switch tabs
- Private league support via `espn_s2` + `SWID` cookie auth
- League config persisted server-side (SQLite) and in localStorage

### Deep Stats Tracking
**Hitters:** xBA, xSLG, xwOBA, Barrel%, Hard Hit%, Sprint Speed, Pull%, Chase%, SwStr%, rolling 7/14/30-day splits, vs LHP/RHP splits, BABIP vs xBABIP delta (regression candidates)

**Pitchers:** xERA, FIP, xFIP, SIERA, CSW%, Stuff+, Command+, pitch mix breakdown, high-leverage strand rate, first-inning ERA

### Roster Analysis
- Side-by-side roster comparison across all your teams
- **Buy low / sell high** flags driven by BABIP regression
- Start/sit recommendations with confidence scores

### Waiver Wire Intelligence
- Available players ranked by Statcast metrics (not just ESPN ownership%)
- Filters: position, handedness, schedule strength
- Streaming pitcher finder (matchup + park factor)

### Trade Analyzer
- Build a trade with players on each side
- Compares Statcast value, 30-day form, and ROS projections
- Win/loss verdict with reasoning

### Alerts & Watchlist
- Personal watchlist with per-player notes
- Threshold alerts (e.g. "flag if Barrel% drops below 8%")

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, React Router, TanStack Query, Recharts |
| Backend | Node.js, Express |
| Cache/Storage | SQLite (better-sqlite3) |
| Data | ESPN Fantasy API, Baseball Savant Statcast CSV, MLB Stats API |

## Project Structure

```
fantasy-tracker/
├── client/          # React frontend (Vite, port 5173)
│   └── src/
│       ├── components/   # Layout, PlayerTable, StatCell, Sparkline
│       ├── pages/        # Dashboard, Rosters, Waiver, Trade, Watchlist, Settings
│       ├── hooks/        # React Query hooks
│       └── utils/        # MLB percentile stat-coloring thresholds
├── server/          # Express API + caching layer (port 3001)
│   ├── routes/           # /api/leagues, /api/players, /api/watchlist
│   ├── espnApi.js        # ESPN Fantasy API client (public + private leagues)
│   ├── statcastApi.js    # Baseball Savant CSV fetcher + SQLite cache
│   └── db.js             # SQLite setup
├── db/              # Schema (fantasy.db generated at runtime)
└── README.md
```

## Getting Started

```bash
# Install everything
npm run install:all   # or: npm install --prefix server && npm install --prefix client

# Run both server + client together
npm install           # installs concurrently at root
npm run dev

# ...or run them separately
npm run dev --prefix server   # API on http://localhost:3001
npm run dev --prefix client   # UI on http://localhost:5173
```

Then open **http://localhost:5173**, go to **Settings → Leagues**, and add your 3 ESPN league IDs.

### Private leagues

ESPN private leagues require two cookies from an authenticated espn.com session:

1. Log into fantasy.espn.com in your browser
2. Open DevTools → Application → Cookies → `espn.com`
3. Copy the values of `espn_s2` and `SWID`
4. Paste them into the league form in Settings

## Data Sources & Caching

| Source | Used for | Cache TTL |
|---|---|---|
| ESPN Fantasy API (`fantasy.espn.com/apis/v3/games/flb/...`) | Leagues, rosters, free agents | live |
| Baseball Savant (`baseballsavant.mlb.com`) | xBA/xSLG/xwOBA, barrel%, sprint speed | 6–24h |
| MLB Stats API | Schedule, injuries | 24h |

- Statcast data is cached in SQLite and refreshed daily (or via the **Refresh** button in Settings / `POST /api/cache/refresh`).
- When external APIs are unreachable, the app falls back to realistic mock data so the UI is always functional — handy for development.

## API Reference

| Method | Route | Description |
|---|---|---|
| GET | `/api/leagues` | List stored leagues |
| POST | `/api/leagues` | Add a league (`league_id`, `season`, optional `espn_s2`/`swid`) |
| DELETE | `/api/leagues/:id` | Remove a league |
| GET | `/api/leagues/:id/data` | Live ESPN league data (standings, teams) |
| GET | `/api/leagues/:id/rosters` | Roster data for all teams |
| GET | `/api/leagues/:id/freeagents` | Top available free agents |
| GET | `/api/players/statcast/:season` | Cached Statcast leaderboard (`?type=batter\|pitcher\|sprint`) |
| GET | `/api/players/:playerId/stats` | Combined ESPN + Statcast stats for a player |
| GET/POST/PUT/DELETE | `/api/watchlist` | Watchlist CRUD (notes + threshold alerts) |
| POST | `/api/cache/refresh` | Clear/refresh the Statcast cache |

## Stat Color Coding

Stat cells are colored against MLB percentile thresholds (Baseball Savant style):

- 🟢 **Elite** — e.g. xBA ≥ .290, Barrel% ≥ 12, xERA ≤ 3.00, CSW% ≥ 30
- 🟡 **Average** — middle of the distribution
- 🔴 **Poor** — e.g. xBA ≤ .220, Hard Hit% ≤ 32, xERA ≥ 5.00

Thresholds live in `client/src/utils/statColors.js` and are easy to tune.
