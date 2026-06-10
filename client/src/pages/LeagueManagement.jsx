import { useState } from 'react'
import { Trophy, Trash2, ExternalLink, Plus, Key } from 'lucide-react'
import { useLeagues, useAddLeague, useDeleteLeague } from '../hooks/useLeagues.js'

const CURRENT_YEAR = new Date().getFullYear();

function LeagueForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    league_id: '',
    season: CURRENT_YEAR,
    name: '',
    espn_s2: '',
    swid: '',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.league_id.trim()) return;
    onSubmit({
      league_id: form.league_id.trim(),
      season: parseInt(form.season),
      name: form.name.trim() || `League ${form.league_id}`,
      espn_s2: form.espn_s2.trim() || undefined,
      swid: form.swid.trim() || undefined,
    });
    setForm({ league_id: '', season: CURRENT_YEAR, name: '', espn_s2: '', swid: '' });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">League ID *</label>
          <input
            name="league_id"
            className="form-input"
            placeholder="e.g. 123456"
            value={form.league_id}
            onChange={handleChange}
            required
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Found in your ESPN league URL
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Season</label>
          <input
            name="season"
            type="number"
            className="form-input"
            value={form.season}
            onChange={handleChange}
            min="2020"
            max={CURRENT_YEAR + 1}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input
            name="name"
            className="form-input"
            placeholder="My Fantasy League"
            value={form.name}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* ESPN cookies — required for all leagues */}
      <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Key size={13} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>ESPN Session Cookies</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>(required — ESPN blocks unauthenticated API calls)</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
          While logged into ESPN in this browser: open <strong>DevTools (F12) → Application → Cookies → fantasy.espn.com</strong> and copy the two values below.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">espn_s2</label>
            <input
              name="espn_s2"
              className="form-input"
              placeholder="Long cookie string..."
              value={form.espn_s2}
              onChange={handleChange}
              type="password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">SWID</label>
            <input
              name="swid"
              className="form-input"
              placeholder="{XXXXXXXX-XXXX-...}"
              value={form.swid}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-primary" disabled={loading || !form.league_id.trim()}>
          <Plus size={14} />
          {loading ? 'Adding...' : 'Add League'}
        </button>
      </div>
    </form>
  );
}

function LeagueRow({ league, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remove "${league.name}"?`)) return;
    setDeleting(true);
    await onDelete(league.id);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12, borderBottom: '1px solid var(--border-muted)' }}>
      <div style={{ width: 36, height: 36, background: 'var(--accent-muted)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Trophy size={16} style={{ color: 'var(--accent)' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{league.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
          ID: {league.league_id} · Season: {league.season}
          {league.espn_s2
            ? <span style={{ marginLeft: 8, color: 'var(--green)' }}>● cookies set</span>
            : <span style={{ marginLeft: 8, color: 'var(--red)' }}>● no cookies</span>
          }
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <a
          href={`https://fantasy.espn.com/baseball/league?leagueId=${league.league_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm"
          title="Open on ESPN"
        >
          <ExternalLink size={12} />
        </a>
        <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting} title="Remove league">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export default function LeagueManagement() {
  const { data: leagues, isLoading } = useLeagues();
  const addLeague = useAddLeague();
  const deleteLeague = useDeleteLeague();
  const [error, setError] = useState('');

  async function handleAdd(data) {
    setError('');
    try {
      await addLeague.mutateAsync(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to add league');
    }
  }

  const leagueList = leagues || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">League Management</div>
          <div className="page-header-sub">Add and manage your ESPN Fantasy Baseball leagues</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title"><Plus size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />Add New League</span>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
          <LeagueForm onSubmit={handleAdd} loading={addLeague.isPending} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Your Leagues
            {leagueList.length > 0 && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>{leagueList.length}</span>}
          </span>
        </div>
        {isLoading ? (
          <div className="loading-spinner"><div className="spinner" /> Loading leagues...</div>
        ) : leagueList.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <Trophy size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <h3>No leagues added</h3>
            <p>Add your first league using the form above.</p>
          </div>
        ) : (
          <div>{leagueList.map(league => <LeagueRow key={league.id} league={league} onDelete={(id) => deleteLeague.mutateAsync(id)} />)}</div>
        )}
      </div>
    </div>
  );
}
