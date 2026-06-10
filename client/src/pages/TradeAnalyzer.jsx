import { useState, useMemo } from 'react'
import { X, Plus, ArrowLeftRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useBatterStatcast, usePitcherStatcast } from '../hooks/useStatcast.js'
import StatCell from '../components/StatCell.jsx'

const CURRENT_SEASON = new Date().getFullYear();

// Compute a composite "value score" for a player using statcast
function computeScore(player, batters, pitchers) {
  if (!player) return 0;

  const isPitcher = ['SP', 'RP', 'P'].includes(player.position || '');
  const dataset = isPitcher ? pitchers : batters;
  const sc = dataset.find(d =>
    d.name.toLowerCase() === player.name.toLowerCase() ||
    d.name.toLowerCase().includes((player.name || '').toLowerCase().split(' ').pop())
  );

  if (!sc) return 0;

  if (!isPitcher) {
    // Batter: weighted sum of key metrics
    const xwoba = (sc.xwoba || 0) * 100;
    const barrel = (sc.barrel_pct || 0);
    const hardHit = (sc.hard_hit_pct || 0) * 0.3;
    const sprint = (sc.sprint_speed || 27) - 27;
    return xwoba + barrel + hardHit + sprint * 2;
  } else {
    // Pitcher: inverse metrics (lower ERA/WHIP = better)
    const xeraInv = sc.xera ? (6 - sc.xera) * 5 : 0;
    const kPct = (sc.k_pct || 0);
    const cswPct = (sc.csw_pct || 0) * 0.5;
    const barrelInv = sc.barrel_pct ? (12 - sc.barrel_pct) * 0.5 : 0;
    return Math.max(0, xeraInv + kPct + cswPct + barrelInv);
  }
}

function getStatcastData(name, batters, pitchers, position) {
  const isPitcher = ['SP', 'RP', 'P'].includes(position || '');
  const dataset = isPitcher ? pitchers : batters;
  return dataset.find(d =>
    d.name.toLowerCase() === name.toLowerCase() ||
    d.name.toLowerCase().includes(name.toLowerCase().split(' ').pop())
  );
}

function PlayerCard({ player, onRemove, batters, pitchers }) {
  const isPitcher = ['SP', 'RP', 'P'].includes(player.position || '');
  const sc = getStatcastData(player.name, batters, pitchers, player.position);

  return (
    <div style={{
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '12px',
      position: 'relative',
    }}>
      <button
        onClick={() => onRemove(player.name)}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 2,
        }}
      >
        <X size={14} />
      </button>

      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, paddingRight: 20 }}>{player.name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
        {player.position || '?'} {player.team ? `· ${player.team}` : ''}
      </div>

      {sc ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
          {!isPitcher ? (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>xBA</div>
              <StatCell value={sc.xba} stat="xba" />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>xwOBA</div>
              <StatCell value={sc.xwoba} stat="xwoba" />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Barrel%</div>
              <StatCell value={sc.barrel_pct} stat="barrel_pct" />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Hard Hit%</div>
              <StatCell value={sc.hard_hit_pct} stat="hard_hit_pct" />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Sprint</div>
              <StatCell value={sc.sprint_speed} stat="sprint_speed" />
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>xERA</div>
              <StatCell value={sc.xera} stat="xera" isPitcher />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>FIP</div>
              <StatCell value={sc.fip} stat="fip" isPitcher />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>K%</div>
              <StatCell value={sc.k_pct} stat="pitcher_k_pct" isPitcher />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>CSW%</div>
              <StatCell value={sc.csw_pct} stat="csw_pct" isPitcher />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Barrel%</div>
              <StatCell value={sc.barrel_pct} stat="barrel_pct" isPitcher />
            </>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          No statcast data found
        </div>
      )}
    </div>
  );
}

function AddPlayerInput({ onAdd, placeholder = 'Search player name...' }) {
  const [value, setValue] = useState('');
  const [position, setPosition] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd({ name: value.trim(), position: position || 'UTIL' });
    setValue('');
    setPosition('');
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
        style={{ flex: 1, fontSize: 12 }}
      />
      <select
        className="form-select"
        value={position}
        onChange={e => setPosition(e.target.value)}
        style={{ fontSize: 12, width: 70 }}
      >
        <option value="">Pos</option>
        {['C','1B','2B','3B','SS','OF','SP','RP'].map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      <button type="submit" className="btn btn-primary btn-sm">
        <Plus size={12} />
      </button>
    </form>
  );
}

function ScoreBar({ score, max, label }) {
  const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0;
  const color = pct >= 60 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{score.toFixed(1)}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

export default function TradeAnalyzer() {
  const { data: batters = [] } = useBatterStatcast(CURRENT_SEASON);
  const { data: pitchers = [] } = usePitcherStatcast(CURRENT_SEASON);

  const [myPlayers, setMyPlayers] = useState([]);
  const [theirPlayers, setTheirPlayers] = useState([]);

  function addPlayer(side, player) {
    if (side === 'my') {
      if (myPlayers.some(p => p.name.toLowerCase() === player.name.toLowerCase())) return;
      setMyPlayers(prev => [...prev, player]);
    } else {
      if (theirPlayers.some(p => p.name.toLowerCase() === player.name.toLowerCase())) return;
      setTheirPlayers(prev => [...prev, player]);
    }
  }

  function removePlayer(side, name) {
    if (side === 'my') setMyPlayers(prev => prev.filter(p => p.name !== name));
    else setTheirPlayers(prev => prev.filter(p => p.name !== name));
  }

  const myScore = useMemo(() =>
    myPlayers.reduce((sum, p) => sum + computeScore(p, batters, pitchers), 0),
    [myPlayers, batters, pitchers]
  );

  const theirScore = useMemo(() =>
    theirPlayers.reduce((sum, p) => sum + computeScore(p, batters, pitchers), 0),
    [theirPlayers, batters, pitchers]
  );

  const maxScore = Math.max(myScore, theirScore, 1);
  const diff = myScore - theirScore;
  const verdict = diff > 5 ? 'win' : diff < -5 ? 'loss' : 'even';
  const bothHavePlayers = myPlayers.length > 0 && theirPlayers.length > 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">Trade Analyzer</div>
          <div className="page-header-sub">
            Compare player statcast values to evaluate trade fairness
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <div>
          Search for players by name. Scores are computed from xwOBA, Barrel%, Hard Hit%, xERA, and K% relative to MLB averages.
          Scores are relative, not absolute — use for comparison only.
        </div>
      </div>

      <div className="trade-columns">
        {/* My side */}
        <div className="trade-panel">
          <div className="card">
            <div className="card-header" style={{ background: 'rgba(31, 111, 235, 0.08)' }}>
              <span className="card-title" style={{ color: 'var(--accent)' }}>My Players</span>
              {myPlayers.length > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Score: <strong style={{ color: 'var(--text-primary)' }}>{myScore.toFixed(1)}</strong>
                </span>
              )}
            </div>
            <div className="card-body">
              <AddPlayerInput
                onAdd={(p) => addPlayer('my', p)}
                placeholder="Add my player..."
              />
              {myPlayers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                  Add players you are giving up
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myPlayers.map(p => (
                    <PlayerCard
                      key={p.name}
                      player={p}
                      onRemove={(name) => removePlayer('my', name)}
                      batters={batters}
                      pitchers={pitchers}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="trade-divider">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}>
            <ArrowLeftRight size={20} style={{ color: 'var(--text-muted)' }} />
            {bothHavePlayers && (
              <span
                className={`verdict-badge verdict-${verdict}`}
              >
                {verdict === 'win' && <TrendingUp size={14} />}
                {verdict === 'loss' && <TrendingDown size={14} />}
                {verdict === 'even' && <Minus size={14} />}
                {verdict === 'win' ? 'WIN' : verdict === 'loss' ? 'LOSS' : 'EVEN'}
              </span>
            )}
          </div>
        </div>

        {/* Their side */}
        <div className="trade-panel">
          <div className="card">
            <div className="card-header" style={{ background: 'rgba(248, 81, 73, 0.08)' }}>
              <span className="card-title" style={{ color: 'var(--red)' }}>Their Players</span>
              {theirPlayers.length > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Score: <strong style={{ color: 'var(--text-primary)' }}>{theirScore.toFixed(1)}</strong>
                </span>
              )}
            </div>
            <div className="card-body">
              <AddPlayerInput
                onAdd={(p) => addPlayer('their', p)}
                placeholder="Add their player..."
              />
              {theirPlayers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                  Add players you are receiving
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {theirPlayers.map(p => (
                    <PlayerCard
                      key={p.name}
                      player={p}
                      onRemove={(name) => removePlayer('their', name)}
                      batters={batters}
                      pitchers={pitchers}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Score comparison */}
      {bothHavePlayers && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <span className="card-title">Value Comparison</span>
            <span
              className={`verdict-badge verdict-${verdict}`}
              style={{ fontSize: 13 }}
            >
              {verdict === 'win' && <TrendingUp size={14} />}
              {verdict === 'loss' && <TrendingDown size={14} />}
              {verdict === 'even' && <Minus size={14} />}
              {verdict === 'win'
                ? `You win by ${Math.abs(diff).toFixed(1)} pts`
                : verdict === 'loss'
                ? `You lose by ${Math.abs(diff).toFixed(1)} pts`
                : 'Roughly even trade'}
            </span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ScoreBar score={myScore} max={maxScore} label="My Side" />
            <ScoreBar score={theirScore} max={maxScore} label="Their Side" />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              * Scores are derived from statcast metrics (xwOBA, Barrel%, xERA, K%, CSW%).
              Consider playing time, roster need, and position scarcity when making decisions.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
