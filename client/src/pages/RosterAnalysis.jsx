import { useState, useMemo } from 'react'
import { useLeagues, useLeagueRosters } from '../hooks/useLeagues.js'
import { useBatterStatcast, usePitcherStatcast } from '../hooks/useStatcast.js'
import { useAddToWatchlist } from '../hooks/useWatchlist.js'
import PlayerTable from '../components/PlayerTable.jsx'
import StatCell from '../components/StatCell.jsx'
import { Users, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

const CURRENT_SEASON = new Date().getFullYear();

// Merge ESPN roster player with statcast data
function mergeWithStatcast(player, batters, pitchers) {
  const isPitcher = ['SP', 'RP', 'P'].includes(player.position);
  const dataset = isPitcher ? pitchers : batters;
  const sc = dataset.find(d =>
    d.name.toLowerCase() === player.name.toLowerCase() ||
    d.name.toLowerCase().includes(player.name.toLowerCase().split(' ').slice(-1)[0])
  );

  return {
    ...player,
    ...player.stats,
    // Statcast overlays
    xba: sc?.xba ?? null,
    xwoba: sc?.xwoba ?? null,
    barrel_pct: sc?.barrel_pct ?? null,
    hard_hit_pct: sc?.hard_hit_pct ?? null,
    avg_exit_velocity: sc?.avg_exit_velocity ?? null,
    sprint_speed: sc?.sprint_speed ?? null,
    babip: sc?.babip ?? null,
    era: sc?.era ?? player.stats?.era ?? null,
    xera: sc?.xera ?? null,
    whip: sc?.whip ?? player.stats?.whip ?? null,
    k_pct: sc?.k_pct ?? null,
    csw_pct: sc?.csw_pct ?? null,
    isPitcher,
    // Buy low / sell high flags
    buyLow: !isPitcher && sc?.xwoba && sc?.woba && (sc.xwoba - sc.woba) > 0.030,
    sellHigh: !isPitcher && sc?.xwoba && sc?.woba && (sc.woba - sc.xwoba) > 0.030,
  };
}

const BATTER_COLUMNS = [
  { key: 'name', label: 'Player', sortable: true,
    render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{row.position} · {row.team || row.proTeam || ''}</div>
      </div>
    )
  },
  { key: 'injuryStatus', label: 'Status', sortable: false,
    render: (v) => v && v !== 'ACTIVE'
      ? <span className="badge badge-yellow">{v}</span>
      : <span className="badge badge-green">ACTIVE</span>
  },
  { key: 'buyLow', label: 'Flag', sortable: false,
    render: (v, row) => {
      if (row.buyLow) return <span className="badge badge-blue" title="xwOBA >> wOBA: buy low candidate"><TrendingUp size={10} style={{marginRight:3}} />Buy Low</span>;
      if (row.sellHigh) return <span className="badge badge-red" title="wOBA >> xwOBA: sell high candidate"><TrendingDown size={10} style={{marginRight:3}} />Sell High</span>;
      return null;
    }
  },
  { key: 'avg', label: 'AVG', isStatCell: true, statKey: 'avg', sortable: true },
  { key: 'hr', label: 'HR', sortable: true, render: (v) => <span>{v ?? '—'}</span> },
  { key: 'rbi', label: 'RBI', sortable: true, render: (v) => <span>{v ?? '—'}</span> },
  { key: 'sb', label: 'SB', sortable: true, render: (v) => <span>{v ?? '—'}</span> },
  { key: 'xba', label: 'xBA', isStatCell: true, statKey: 'xba', sortable: true },
  { key: 'xwoba', label: 'xwOBA', isStatCell: true, statKey: 'xwoba', sortable: true },
  { key: 'barrel_pct', label: 'Barrel%', isStatCell: true, statKey: 'barrel_pct', sortable: true },
  { key: 'hard_hit_pct', label: 'Hard Hit%', isStatCell: true, statKey: 'hard_hit_pct', sortable: true },
  { key: 'sprint_speed', label: 'Sprint', isStatCell: true, statKey: 'sprint_speed', sortable: true },
];

const PITCHER_COLUMNS = [
  { key: 'name', label: 'Player', sortable: true,
    render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{row.position}</div>
      </div>
    )
  },
  { key: 'injuryStatus', label: 'Status', sortable: false,
    render: (v) => v && v !== 'ACTIVE'
      ? <span className="badge badge-yellow">{v}</span>
      : <span className="badge badge-green">ACTIVE</span>
  },
  { key: 'era', label: 'ERA', isStatCell: true, statKey: 'era', isPitcher: true, sortable: true },
  { key: 'whip', label: 'WHIP', isStatCell: true, statKey: 'whip', isPitcher: true, sortable: true },
  { key: 'k9', label: 'K/9', sortable: true, render: (v) => <span>{v ?? '—'}</span> },
  { key: 'sv', label: 'SV', sortable: true, render: (v) => <span>{v ?? '—'}</span> },
  { key: 'xera', label: 'xERA', isStatCell: true, statKey: 'xera', isPitcher: true, sortable: true },
  { key: 'k_pct', label: 'K%', isStatCell: true, statKey: 'pitcher_k_pct', isPitcher: true, sortable: true },
  { key: 'csw_pct', label: 'CSW%', isStatCell: true, statKey: 'csw_pct', isPitcher: true, sortable: true },
  { key: 'barrel_pct', label: 'Barrel%', isStatCell: true, statKey: 'barrel_pct', isPitcher: true, sortable: true },
];

function RosterTable({ leagueId }) {
  const { data: rosters, isLoading, error } = useLeagueRosters(leagueId);
  const { data: batters = [] } = useBatterStatcast(CURRENT_SEASON);
  const { data: pitchers = [] } = usePitcherStatcast(CURRENT_SEASON);
  const addToWatchlist = useAddToWatchlist();

  const [activeTeam, setActiveTeam] = useState(null);
  const [viewMode, setViewMode] = useState('batters'); // 'batters' | 'pitchers' | 'all'
  const [search, setSearch] = useState('');

  const teams = rosters || [];

  const selectedTeam = activeTeam
    ? teams.find(t => t.id === activeTeam)
    : teams[0];

  const allPlayers = useMemo(() => {
    if (!selectedTeam) return [];
    return selectedTeam.players.map(p => mergeWithStatcast(p, batters, pitchers));
  }, [selectedTeam, batters, pitchers]);

  const displayPlayers = useMemo(() => {
    let result = allPlayers;
    if (viewMode === 'batters') result = result.filter(p => !p.isPitcher);
    if (viewMode === 'pitchers') result = result.filter(p => p.isPitcher);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q));
    }
    return result;
  }, [allPlayers, viewMode, search]);

  if (isLoading) return <div className="loading-spinner"><div className="spinner" /> Loading rosters...</div>;
  if (error) return <div className="alert alert-error">Failed to load roster data</div>;
  if (!teams.length) return <div className="alert alert-warning">No teams found. Make sure the league ID is correct.</div>;

  const pitcherCount = displayPlayers.filter(p => p.isPitcher).length;
  const batterCount = displayPlayers.filter(p => !p.isPitcher).length;
  const injuredCount = allPlayers.filter(p => p.injuryStatus && p.injuryStatus !== 'ACTIVE').length;

  async function handleAddWatchlist(player) {
    await addToWatchlist.mutateAsync({
      player_id: String(player.id),
      player_name: player.name,
      position: player.position,
    });
  }

  return (
    <div>
      {/* Team tabs */}
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <div className="tabs" style={{ flexWrap: 'nowrap', minWidth: 'max-content' }}>
          {teams.map(team => (
            <button
              key={team.id}
              className={`tab ${(activeTeam === team.id || (!activeTeam && team === teams[0])) ? 'active' : ''}`}
              onClick={() => setActiveTeam(team.id)}
            >
              {team.name}
              <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 11 }}>
                {team.wins}-{team.losses}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedTeam && (
        <>
          {/* Summary badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <span className="badge badge-gray">
              <Users size={10} /> {selectedTeam.players?.length || 0} players
            </span>
            {injuredCount > 0 && (
              <span className="badge badge-yellow">
                <AlertTriangle size={10} /> {injuredCount} injured
              </span>
            )}
            {allPlayers.filter(p => p.buyLow).length > 0 && (
              <span className="badge badge-blue">
                <TrendingUp size={10} /> {allPlayers.filter(p => p.buyLow).length} buy-low
              </span>
            )}
          </div>

          {/* Filters */}
          <div className="filters-bar">
            <div className="tabs" style={{ borderBottom: 'none', marginBottom: 0 }}>
              {['all', 'batters', 'pitchers'].map(mode => (
                <button
                  key={mode}
                  className={`tab ${viewMode === mode ? 'active' : ''}`}
                  onClick={() => setViewMode(mode)}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="form-input"
              style={{ maxWidth: 200 }}
              placeholder="Search players..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="card">
            <PlayerTable
              columns={
                viewMode === 'pitchers' ? PITCHER_COLUMNS :
                viewMode === 'batters' ? BATTER_COLUMNS :
                [...BATTER_COLUMNS.slice(0, 3), ...PITCHER_COLUMNS.slice(2, 5)]
              }
              data={displayPlayers}
              filterText={search}
              searchKeys={['name']}
              onAddWatchlist={handleAddWatchlist}
              emptyMessage="No players match the current filters."
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function RosterAnalysis() {
  const { data: leagues, isLoading } = useLeagues();
  const [activeLeague, setActiveLeague] = useState(null);

  const leagueList = leagues || [];
  const selectedLeague = activeLeague
    ? leagueList.find(l => l.id === activeLeague)
    : leagueList[0];

  if (isLoading) {
    return <div className="loading-spinner"><div className="spinner" /> Loading...</div>;
  }

  if (!leagueList.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <h3>No leagues configured</h3>
        <p>Add a league in League Management to analyze your rosters.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">Roster Analysis</div>
          <div className="page-header-sub">
            Analyze your roster with statcast metrics and regression indicators
          </div>
        </div>
      </div>

      {/* League selector */}
      {leagueList.length > 1 && (
        <div className="tabs" style={{ marginBottom: 20 }}>
          {leagueList.map(league => (
            <button
              key={league.id}
              className={`tab ${(activeLeague === league.id || (!activeLeague && league === leagueList[0])) ? 'active' : ''}`}
              onClick={() => setActiveLeague(league.id)}
            >
              {league.name}
            </button>
          ))}
        </div>
      )}

      {selectedLeague && <RosterTable leagueId={selectedLeague.id} />}
    </div>
  );
}
