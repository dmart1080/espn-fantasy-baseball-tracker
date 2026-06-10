import { useState } from 'react'
import { Star, Trash2, Edit2, Plus, Bell, Check, X } from 'lucide-react'
import { useWatchlist, useAddToWatchlist, useUpdateWatchlist, useRemoveFromWatchlist } from '../hooks/useWatchlist.js'
import { useBatterStatcast, usePitcherStatcast } from '../hooks/useStatcast.js'
import StatCell from '../components/StatCell.jsx'

const CURRENT_SEASON = new Date().getFullYear();

const ALERT_TEMPLATES = [
  { key: 'barrel_pct_min', label: 'Barrel% below', defaultValue: 8, unit: '%', higherBetter: true },
  { key: 'hard_hit_pct_min', label: 'Hard Hit% below', defaultValue: 35, unit: '%', higherBetter: true },
  { key: 'xwoba_min', label: 'xwOBA below', defaultValue: 0.320, unit: '', higherBetter: true },
  { key: 'era_max', label: 'ERA above', defaultValue: 4.50, unit: '', higherBetter: false },
  { key: 'whip_max', label: 'WHIP above', defaultValue: 1.40, unit: '', higherBetter: false },
  { key: 'k_pct_max', label: 'K% above (batters)', defaultValue: 25, unit: '%', higherBetter: false },
];

function getStatcastForPlayer(player, batters, pitchers) {
  const isPitcher = ['SP', 'RP', 'P'].includes(player.position || '');
  const dataset = isPitcher ? pitchers : batters;
  return dataset.find(d =>
    d.name.toLowerCase() === player.player_name.toLowerCase() ||
    d.name.toLowerCase().includes(player.player_name.toLowerCase().split(' ').pop())
  );
}

function checkAlerts(player, sc) {
  if (!sc || !player.alerts || !player.alerts.length) return [];
  const triggered = [];
  for (const alert of player.alerts) {
    const val = sc[alert.stat];
    if (val === undefined || val === null) continue;
    const v = parseFloat(val);
    const thresh = parseFloat(alert.threshold);
    let fired = false;
    if (alert.condition === 'below' && v < thresh) fired = true;
    if (alert.condition === 'above' && v > thresh) fired = true;
    if (fired) triggered.push({ ...alert, currentValue: v });
  }
  return triggered;
}

function AlertEditor({ alerts, onChange }) {
  const [newAlert, setNewAlert] = useState({ stat: 'barrel_pct', condition: 'below', threshold: '' });

  function addAlert() {
    if (!newAlert.threshold) return;
    onChange([...alerts, { ...newAlert, threshold: parseFloat(newAlert.threshold) }]);
    setNewAlert({ stat: 'barrel_pct', condition: 'below', threshold: '' });
  }

  function removeAlert(idx) {
    onChange(alerts.filter((_, i) => i !== idx));
  }

  const STAT_OPTIONS = [
    { value: 'barrel_pct', label: 'Barrel%' },
    { value: 'hard_hit_pct', label: 'Hard Hit%' },
    { value: 'xwoba', label: 'xwOBA' },
    { value: 'xba', label: 'xBA' },
    { value: 'era', label: 'ERA' },
    { value: 'whip', label: 'WHIP' },
    { value: 'k_pct', label: 'K%' },
    { value: 'csw_pct', label: 'CSW%' },
  ];

  return (
    <div>
      {alerts.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius)',
              marginBottom: 4,
              fontSize: 12,
            }}>
              <Bell size={10} style={{ color: 'var(--yellow)' }} />
              <span>{a.stat} {a.condition} {a.threshold}</span>
              <button
                onClick={() => removeAlert(i)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 4 }}>
        <select
          className="form-select"
          value={newAlert.stat}
          onChange={e => setNewAlert(a => ({ ...a, stat: e.target.value }))}
          style={{ fontSize: 11, padding: '4px 6px' }}
        >
          {STAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          className="form-select"
          value={newAlert.condition}
          onChange={e => setNewAlert(a => ({ ...a, condition: e.target.value }))}
          style={{ fontSize: 11, padding: '4px 6px' }}
        >
          <option value="below">below</option>
          <option value="above">above</option>
        </select>
        <input
          type="number"
          className="form-input"
          value={newAlert.threshold}
          onChange={e => setNewAlert(a => ({ ...a, threshold: e.target.value }))}
          placeholder="value"
          style={{ width: 70, fontSize: 11, padding: '4px 8px' }}
        />
        <button className="btn btn-secondary btn-sm" onClick={addAlert}>
          <Plus size={11} />
        </button>
      </div>
    </div>
  );
}

function WatchlistItem({ item, batters, pitchers, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [alerts, setAlerts] = useState(item.alerts || []);
  const [saving, setSaving] = useState(false);

  const sc = getStatcastForPlayer(item, batters, pitchers);
  const triggeredAlerts = checkAlerts(item, sc);
  const isPitcher = ['SP', 'RP', 'P'].includes(item.position || '');

  async function handleSave() {
    setSaving(true);
    await onUpdate({ id: item.id, notes, alerts });
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setNotes(item.notes || '');
    setAlerts(item.alerts || []);
    setEditing(false);
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Star size={14} style={{ color: 'var(--yellow)' }} />
          <div>
            <div style={{ fontWeight: 600 }}>{item.player_name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {item.position || '?'} {item.team ? `· ${item.team}` : ''}
              {' · Added '}{new Date(item.added_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {triggeredAlerts.length > 0 && (
            <span className="badge badge-yellow">
              <Bell size={10} /> {triggeredAlerts.length} alert{triggeredAlerts.length > 1 ? 's' : ''}
            </span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(e => !e)}>
            <Edit2 size={12} />
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => onRemove(item.id)}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="card-body" style={{ paddingTop: 12 }}>
        {/* Triggered alerts */}
        {triggeredAlerts.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {triggeredAlerts.map((a, i) => (
              <div key={i} className="alert alert-warning" style={{ marginBottom: 4, padding: '6px 10px' }}>
                <Bell size={12} />
                <span>{a.stat} is {a.currentValue?.toFixed(3)} ({a.condition} threshold of {a.threshold})</span>
              </div>
            ))}
          </div>
        )}

        {/* Statcast stats */}
        {sc ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {!isPitcher ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>xBA</span>
                  <StatCell value={sc.xba} stat="xba" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>xwOBA</span>
                  <StatCell value={sc.xwoba} stat="xwoba" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Barrel%</span>
                  <StatCell value={sc.barrel_pct} stat="barrel_pct" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Hard Hit%</span>
                  <StatCell value={sc.hard_hit_pct} stat="hard_hit_pct" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Sprint</span>
                  <StatCell value={sc.sprint_speed} stat="sprint_speed" />
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>xERA</span>
                  <StatCell value={sc.xera} stat="xera" isPitcher />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>WHIP</span>
                  <StatCell value={sc.whip} stat="whip" isPitcher />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>K%</span>
                  <StatCell value={sc.k_pct} stat="pitcher_k_pct" isPitcher />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>CSW%</span>
                  <StatCell value={sc.csw_pct} stat="csw_pct" isPitcher />
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            No statcast data available
          </div>
        )}

        {/* Notes */}
        {!editing && item.notes && (
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius)',
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginBottom: 8,
          }}>
            {item.notes}
          </div>
        )}

        {/* Alert badges */}
        {!editing && item.alerts?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {item.alerts.map((a, i) => (
              <span key={i} className="badge badge-gray" style={{ fontSize: 10 }}>
                <Bell size={9} /> {a.stat} {a.condition} {a.threshold}
              </span>
            ))}
          </div>
        )}

        {/* Edit panel */}
        {editing && (
          <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: 12, marginTop: 4 }}>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add scouting notes..."
              />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">
                <Bell size={11} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />
                Alert Thresholds
              </label>
              <AlertEditor alerts={alerts} onChange={setAlerts} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                <Check size={12} /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddPlayerForm({ onAdd }) {
  const [form, setForm] = useState({ player_name: '', position: '', team: '', notes: '' });
  const [open, setOpen] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.player_name.trim()) return;
    onAdd({ ...form, player_name: form.player_name.trim() });
    setForm({ player_name: '', position: '', team: '', notes: '' });
    setOpen(false);
  }

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)} style={{ marginBottom: 20 }}>
        <Plus size={14} /> Add Player to Watchlist
      </button>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <span className="card-title">Add to Watchlist</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}><X size={14} /></button>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Player Name *</label>
              <input className="form-input" value={form.player_name} onChange={e => setForm(f => ({ ...f, player_name: e.target.value }))} placeholder="Full name" required />
            </div>
            <div className="form-group">
              <label className="form-label">Position</label>
              <select className="form-select" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}>
                <option value="">Unknown</option>
                {['C','1B','2B','3B','SS','OF','SP','RP'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Team</label>
              <input className="form-input" value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))} placeholder="e.g. LAD" />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Why are you watching this player?" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary">
              <Star size={13} /> Add to Watchlist
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Watchlist() {
  const { data: watchlist, isLoading } = useWatchlist();
  const { data: batters = [] } = useBatterStatcast(CURRENT_SEASON);
  const { data: pitchers = [] } = usePitcherStatcast(CURRENT_SEASON);
  const addToWatchlist = useAddToWatchlist();
  const updateWatchlist = useUpdateWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  const items = watchlist || [];
  const triggeredCount = items.filter(item => {
    const sc = getStatcastForPlayer(item, batters, pitchers);
    return checkAlerts(item, sc).length > 0;
  }).length;

  if (isLoading) {
    return <div className="loading-spinner"><div className="spinner" /> Loading watchlist...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">Watchlist & Alerts</div>
          <div className="page-header-sub">
            Monitor players with custom threshold alerts
          </div>
        </div>
        {triggeredCount > 0 && (
          <span className="badge badge-yellow" style={{ fontSize: 13, padding: '6px 12px' }}>
            <Bell size={12} /> {triggeredCount} alert{triggeredCount > 1 ? 's' : ''} triggered
          </span>
        )}
      </div>

      <AddPlayerForm onAdd={(data) => addToWatchlist.mutateAsync(data)} />

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Star size={40} /></div>
          <h3>No players on watchlist</h3>
          <p>Add players to monitor their statcast metrics and set alert thresholds.</p>
        </div>
      ) : (
        <div>
          {items.map(item => (
            <WatchlistItem
              key={item.id}
              item={item}
              batters={batters}
              pitchers={pitchers}
              onUpdate={(data) => updateWatchlist.mutateAsync(data)}
              onRemove={(id) => removeFromWatchlist.mutateAsync(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
