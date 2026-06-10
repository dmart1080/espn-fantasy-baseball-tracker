import { Link } from 'react-router-dom'
import { Trophy, Users, TrendingUp, AlertTriangle, ArrowRight, Activity } from 'lucide-react'
import { useLeagues, useLeagueRosters } from '../hooks/useLeagues.js'

function LeagueCard({ league }) {
  const { data: rosters, isLoading } = useLeagueRosters(league);

  const teams = rosters || [];
  const sorted = [...teams].sort((a, b) => b.wins - a.wins);
  const leader = sorted[0];

  // Top performers from all rosters
  const allPlayers = teams.flatMap(t => (t.players || []).map(p => ({ ...p, teamName: t.name })));
  const topHitters = allPlayers
    .filter(p => parseFloat(p.stats?.avg) > 0)
    .sort((a, b) => parseFloat(b.stats?.avg || 0) - parseFloat(a.stats?.avg || 0))
    .slice(0, 3);
  const injuredPlayers = allPlayers.filter(p =>
    p.injuryStatus && p.injuryStatus !== 'ACTIVE'
  ).slice(0, 3);

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={16} style={{ color: 'var(--accent)' }} />
          <span className="card-title">{league.name || `League ${league.league_id}`}</span>
        </div>
        <Link to="/roster" className="btn btn-ghost btn-sm">
          View <ArrowRight size={12} />
        </Link>
      </div>
      <div className="card-body" style={{ padding: '12px 20px' }}>
        {isLoading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div className="stat-box">
                <div className="stat-box-label">Teams</div>
                <div className="stat-box-value">{teams.length || '—'}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Season</div>
                <div className="stat-box-value">{league.season}</div>
              </div>
            </div>

            {leader && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Current Leader
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{leader.name}</span>
                  <span className="badge badge-green">{leader.wins}–{leader.losses}</span>
                </div>
              </div>
            )}

            {topHitters.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Top AVG This Week
                </div>
                {topHitters.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                    <span style={{ fontSize: 12 }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                      {parseFloat(p.stats?.avg || 0).toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {injuredPlayers.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--yellow)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={10} /> Injury Alerts
                </div>
                {injuredPlayers.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                    <span style={{ fontSize: 12 }}>{p.name}</span>
                    <span className="badge badge-yellow">{p.injuryStatus}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-muted)', display: 'flex', gap: 8 }}>
        <Link to="/roster" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
          <Users size={12} /> Roster
        </Link>
        <Link to="/waiver" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
          <TrendingUp size={12} /> Waiver
        </Link>
      </div>
    </div>
  );
}

function QuickStat({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { data: leagues, isLoading, error } = useLeagues();

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
        Loading dashboard...
      </div>
    );
  }

  const leagueList = leagues || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">Dashboard</div>
          <div className="page-header-sub">
            Season {new Date().getFullYear()} · {leagueList.length} league{leagueList.length !== 1 ? 's' : ''} tracked
          </div>
        </div>
        <Link to="/leagues" className="btn btn-primary">
          <Trophy size={14} /> Manage Leagues
        </Link>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        <QuickStat label="Leagues" value={leagueList.length} />
        <QuickStat label="Season" value={new Date().getFullYear()} color="var(--accent)" />
        <QuickStat label="Data Source" value="ESPN + Savant" />
      </div>

      {leagueList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚾</div>
          <h3>No leagues added yet</h3>
          <p>Add your ESPN Fantasy Baseball leagues to start tracking rosters, waiver wire, and statcast data.</p>
          <Link to="/leagues" className="btn btn-primary">
            <Trophy size={14} /> Add Your First League
          </Link>
        </div>
      ) : (
        <div className="dashboard-grid">
          {leagueList.map(league => (
            <LeagueCard key={league.id} league={league} />
          ))}

          {/* Add league card */}
          <Link to="/leagues" style={{ textDecoration: 'none' }}>
            <div className="card" style={{
              border: '1px dashed var(--border)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <Trophy size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                <div style={{ fontSize: 13, fontWeight: 500 }}>Add League</div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Info section */}
      <div style={{ marginTop: 32, padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Activity size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>How to use</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {[
            { icon: '🏟️', title: 'Add Leagues', desc: 'Go to Leagues and enter your ESPN league ID. Private leagues need espn_s2/SWID cookies.' },
            { icon: '📊', title: 'Analyze Rosters', desc: 'Roster Analysis shows your team with statcast metrics colored by MLB percentiles.' },
            { icon: '🔍', title: 'Find Waiver Adds', desc: 'Waiver Wire ranks available players by expected stats — catch breakouts early.' },
            { icon: '⚖️', title: 'Evaluate Trades', desc: 'Trade Analyzer compares player values using statcast data for informed decisions.' },
          ].map(item => (
            <div key={item.title}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
