import { useState, useMemo } from 'react'
import { useLeagues, useLeagueFreeAgents } from '../hooks/useLeagues.js'
import { useBatterStatcast, usePitcherStatcast, useSprintSpeed } from '../hooks/useStatcast.js'
import { useAddToWatchlist } from '../hooks/useWatchlist.js'
import PlayerTable from '../components/PlayerTable.jsx'
import StatCell from '../components/StatCell.jsx'
import { Star, TrendingUp, Zap } from 'lucide-react'

const CURRENT_SEASON = new Date().getFullYear();

const POSITIONS = ['All', 'C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'];

function mergePlayerData(player, batters, pitchers, sprintData) {
  const isPitcher = ['SP', 'RP', 'P'].includes(player.position);
  const dataset = isPitcher ? pitchers : batters;
  const sc = dataset.find(d =>
    d.name.toLowerCase() === player.name.toLowerCase() ||
    d.name.toLowerCase().includes(player.name.toLowerCase().split(' ').pop())
  );
  const sprint = !isPitcher && sprintData.find(s =>
    s.name.toLowerCase().includes(player.name.toLowerCase().split(' ').pop())
  );

  return {
    ...player,
    ...player.stats,
    xba: sc?.xba ?? null,
    xwoba: sc?.xwoba ?? null,
    xera: sc?.xera ?? null,
    barrel_pct: sc?.barrel_pct ?? null,
    hard_hit_pct: sc?.hard_hit_pct ?? null,
    k_pct: sc?.k_pct ?? null,
    csw_pct: sc?.csw_pct ?? null,
    whip: sc?.whip ?? player.stats?.whip ?? null,
    sprint_speed: sprint?.sprint_speed ?? sc?.sprint_speed ?? null,
    isPitcher,
  };
}

const BATTER_COLS = [
  {
    key: 'name', label: 'Player', sortable: true,
    render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
          {row.position} · {row.team || ''}
        </div>
      </div>
    )
  },
  {
    key: 'ownedPct', label: 'Own%', sortable: true,
    render: (v) => <span style={{ color: 'var(--text-secondary)' }}>{v != null ? `${parseFloat(v).toFixed(1)}%` : '—'}</span>
  },
  { key: 'avg', label: 'AVG', isStatCell: true, statKey: 'avg', sortable: true },
  { key: 'hr', label: 'HR', sortable: true, render: (v) => <span>{v ?? '—'}</span> },
  { key: 'sb', label: 'SB', sortable: true, render: (v) => <span>{v ?? '—'}</span> },
  { key: 'xba', label: 'xBA', isStatCell: true, statKey: 'xba', sortable: true },
  { key: 'xwoba', label: 'xwOBA', isStatCell: true, statKey: 'xwoba', sortable: true },
  { key: 'barrel_pct', label: 'Barrel%', isStatCell: true, statKey: 'barrel_pct', sortable: true },
  { key: 'hard_hit_pct', label: 'HH%', isStatCell: true, statKey: 'hard_hit_pct', sortable: true },
  { key: 'sprint_speed', label: 'Sprint', isStatCell: true, statKey: 'sprint_speed', sortable: true },
];

const PITCHER_COLS = [
  {
    key: 'name', label: 'Player', sortable: true,
    render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
          {row.position} · {row.team || ''}
        </div>
      </div>
    )
  },
  {
    key: 'ownedPct', label: 'Own%', sortable: true,
    render: (v) => <span style={{ color: 'var(--text-secondary)' }}>{v != null ? `${parseFloat(v).toFixed(1)}%` : '—'}</span>
  },
  { key: 'era', label: 'ERA', isStatCell: true, statKey: 'era', isPitcher: true, sortable: true },
  { key: 'whip', label: 'WHIP', isStatCell: true, statKey: 'whip', isPitcher: true, sortable: true },
  { key: 'k9', label: 'K/9', sortable: true, render: (v) => <span>{v ?? '—'}</span> },
  { key: 'xera', label: 'xERA', isStatCell: true, statKey: 'xera', isPitcher: true, sortable: true },
  { key: 'k_pct', label: 'K%', isStatCell: true, statKey: 'pitcher_k_pct', isPitcher: true, sortable: true },
  { key: 'csw_pct', label: 'CSW%', isStatCell: true, statKey: 'csw_pct', isPitcher: true, sortable: true },
  { key: 'barrel_pct', label: 'Barrel%', isStatCell: true, statKey: 'barrel_pct', isPitcher: true, sortable: true },
];

function WaiverTable({ league }) {
  const { data: freeAgents, isLoading } = useLeagueFreeAgents(league);
  const { data: batters = [] } = useBatterStatcast(CURRENT_SEASON);
  const { data: pitchers = [] } = usePitcherStatcast(CURRENT_SEASON);
  const { data: sprintData = [] } = useSprintSpeed(CURRENT_SEASON);
  const addToWatchlist = useAddToWatchlist();

  const [posFilter, setPosFilter] = useState('All');
  const [maxOwn, setMaxOwn] = useState(50);
  const [viewMode, setViewMode] = useState('batters');
  const [search, setSearch] = useState('');

  const enriched = useMemo(() => {
    const players = freeAgents || [];
    return players.map(p => mergePlayerData(p, batters, pitchers, sprintData));
  }, [freeAgents, batters, pitchers, sprintData]);

  const filtered = useMemo(() => {
    return enriched.filter(p => {
      if (viewMode === 'batters' && p.isPitcher) return false;
      if (viewMode === 'pitchers' && !p.isPitcher) return false;
      if (posFilter !== 'All' && p.position !== posFilter) return false;
      if (p.ownedPct > maxOwn) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [enriched, viewMode, posFilter, maxOwn, search]);

  async function handleAddWatchlist(player) {
    await addToWatchlist.mutateAsync({
      player_id: String(player.id),
      player_name: player.name,
      position: player.position,
    });
  }

  if (isLoading) return <div className="loading-spinner"><div className="spinner" /> Loading free agents...</div>;

  return (
    <div>
      {/* Filters */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <div className="seg-control">
          {['batters', 'pitchers'].map(mode => (
            <button
              key={mode}
              className={`seg-btn ${viewMode === mode ? 'active' : ''}`}
              onClick={() => { setViewMode(mode); setPosFilter('All'); }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        <select
          className="form-select"
          value={posFilter}
          onChange={e => setPosFilter(e.target.value)}
          style={{ fontSize: 12, padding: '6px 10px' }}
        >
          {POSITIONS.filter(p => {
            if (viewMode === 'batters') return !['SP', 'RP'].includes(p);
            if (viewMode === 'pitchers') return ['All', 'SP', 'RP'].includes(p);
            return true;
          }).map(p => (
            <option key={p} value={p}>{p === 'All' ? 'All Positions' : p}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Max Owned%</span>
          <input
            type="range"
            min={0} max={100} step={5}
            value={maxOwn}
            onChange={e => setMaxOwn(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <span style={{ fontSize: 12, width: 32 }}>{maxOwn}%</span>
        </div>

        <input
          type="text"
          className="form-input"
          style={{ maxWidth: 180, fontSize: 12 }}
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <span className="text-sm text-muted">{filtered.length} available</span>
      </div>

      <div className="card">
        <PlayerTable
          columns={viewMode === 'pitchers' ? PITCHER_COLS : BATTER_COLS}
          data={filtered}
          filterText=""
          searchKeys={['name']}
          onAddWatchlist={handleAddWatchlist}
          emptyMessage="No players match current filters."
        />
      </div>
    </div>
  );
}

export default function WaiverWire() {
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
        <div className="empty-state-icon"><TrendingUp size={40} /></div>
        <h3>No leagues configured</h3>
        <p>Add a league to browse the waiver wire with statcast metrics.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">Waiver Wire</div>
          <div className="page-header-sub">
            Available players ranked by statcast quality metrics
          </div>
        </div>
      </div>

      {/* Pro tips */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        {[
          { icon: <Zap size={12} />, color: 'var(--yellow)', text: 'High xwOBA with low wOBA = positive regression candidate' },
          { icon: <TrendingUp size={12} />, color: 'var(--green)', text: 'High Barrel% + Hard Hit% = sustainable power' },
          { icon: <Star size={12} />, color: 'var(--accent)', text: 'Low CSW% for pitchers = weak stuff, avoid' },
        ].map((tip, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-muted)',
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}>
            <span style={{ color: tip.color }}>{tip.icon}</span>
            {tip.text}
          </div>
        ))}
      </div>

      {/* League tabs */}
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

      {selectedLeague && <WaiverTable league={selectedLeague} />}
    </div>
  );
}
