import { useState } from 'react'
import { Settings as SettingsIcon, RefreshCw, Database, Globe, Info, Check, Key } from 'lucide-react'
import axios from 'axios'
import { useLeagues } from '../hooks/useLeagues.js'

const CURRENT_SEASON = new Date().getFullYear();

export default function Settings() {
  const { data: leagues } = useLeagues();
  const [refreshSeason, setRefreshSeason] = useState(CURRENT_SEASON);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [espnS2, setEspnS2] = useState(() => localStorage.getItem('espn_s2') || '');
  const [espnSwid, setEspnSwid] = useState(() => localStorage.getItem('espn_swid') || '');
  const [cookieSaved, setCookieSaved] = useState(false);

  function saveCookies() {
    if (espnS2.trim()) localStorage.setItem('espn_s2', espnS2.trim());
    else localStorage.removeItem('espn_s2');
    if (espnSwid.trim()) localStorage.setItem('espn_swid', espnSwid.trim());
    else localStorage.removeItem('espn_swid');
    setCookieSaved(true);
    setTimeout(() => setCookieSaved(false), 2000);
  }

  async function handleCacheRefresh() {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await axios.post('/api/players/cache/refresh', { season: refreshSeason });
      setRefreshResult({ success: true, data: res.data });
    } catch (err) {
      setRefreshResult({ success: false, error: err.response?.data?.error || err.message });
    } finally {
      setRefreshing(false);
    }
  }

  async function checkHealth() {
    setCheckingHealth(true);
    try {
      const res = await axios.get('/api/health');
      setHealthStatus({ ok: true, data: res.data });
    } catch (err) {
      setHealthStatus({ ok: false, error: err.message });
    } finally {
      setCheckingHealth(false);
    }
  }

  const leagueList = leagues || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-header-title">Settings</div>
          <div className="page-header-sub">Configure the tracker and manage data</div>
        </div>
      </div>

      {/* ESPN Auth Cookies */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">
            <Key size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            ESPN Authentication
          </span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            ESPN's API requires your session cookies even for public leagues.
            Get them from your browser while logged into espn.com:
            <br />
            <strong style={{ color: 'var(--text-primary)' }}>F12 → Application → Cookies → espn.com</strong>
            <br />
            Copy the values for <code style={{ color: 'var(--accent)' }}>espn_s2</code> and <code style={{ color: 'var(--accent)' }}>SWID</code>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">espn_s2</label>
              <input
                className="form-input"
                placeholder="Paste espn_s2 cookie value..."
                value={espnS2}
                onChange={e => setEspnS2(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">SWID</label>
              <input
                className="form-input"
                placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
                value={espnSwid}
                onChange={e => setEspnSwid(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>
            <div>
              <button className="btn btn-primary" onClick={saveCookies}>
                {cookieSaved ? <><Check size={13} /> Saved!</> : 'Save Cookies'}
              </button>
              {(espnS2 || espnSwid) && (
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }}
                  onClick={() => { setEspnS2(''); setEspnSwid(''); localStorage.removeItem('espn_s2'); localStorage.removeItem('espn_swid'); }}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Server health */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">
            <Globe size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            Server Status
          </span>
          <button className="btn btn-secondary btn-sm" onClick={checkHealth} disabled={checkingHealth}>
            {checkingHealth ? 'Checking...' : 'Check'}
          </button>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>API Endpoint</div>
              <code style={{ fontSize: 12, color: 'var(--accent)' }}>http://localhost:3001</code>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Status</div>
              {healthStatus ? (
                <span className={`badge ${healthStatus.ok ? 'badge-green' : 'badge-red'}`}>
                  {healthStatus.ok ? <Check size={10} /> : '✗'}
                  {healthStatus.ok ? 'Online' : 'Error'}
                </span>
              ) : (
                <span className="badge badge-gray">Not checked</span>
              )}
            </div>
            {healthStatus?.ok && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Last Checked</div>
                <span style={{ fontSize: 12 }}>{new Date(healthStatus.data.timestamp).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          {healthStatus && !healthStatus.ok && (
            <div className="alert alert-error" style={{ marginTop: 10 }}>
              {healthStatus.error}
            </div>
          )}
        </div>
      </div>

      {/* Cache controls */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">
            <Database size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            Statcast Cache
          </span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Statcast data is cached in SQLite for 6 hours (batters/pitchers) or 24 hours (sprint speed).
            Use the refresh button to force a re-fetch from Baseball Savant.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <label className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Season:</label>
              <input
                type="number"
                className="form-input"
                value={refreshSeason}
                onChange={e => setRefreshSeason(parseInt(e.target.value))}
                min="2020"
                max={CURRENT_SEASON + 1}
                style={{ width: 90 }}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleCacheRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={13} />
              {refreshing ? 'Refreshing...' : 'Refresh Statcast Data'}
            </button>
          </div>

          {refreshResult && (
            <div
              className={`alert ${refreshResult.success ? 'alert-info' : 'alert-error'}`}
              style={{ marginTop: 12 }}
            >
              {refreshResult.success ? (
                <div>
                  <Check size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Cache refreshed — Batters: {refreshResult.data.counts?.batters || 0},
                  Pitchers: {refreshResult.data.counts?.pitchers || 0},
                  Sprint: {refreshResult.data.counts?.sprint || 0}
                </div>
              ) : (
                <div>Error: {refreshResult.error}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Leagues overview */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">
            <SettingsIcon size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            League Configuration
          </span>
        </div>
        <div className="card-body">
          {leagueList.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              No leagues configured. Add leagues in the League Management page.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leagueList.map(l => (
                <div key={l.id} style={{
                  padding: '10px 14px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border-muted)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        League ID: {l.league_id} · Season: {l.season}
                        {l.espn_s2 && ' · Private (with auth)'}
                      </div>
                    </div>
                    <span className="badge badge-blue">{l.season}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Info size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            About
          </span>
        </div>
        <div className="card-body">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text-primary)' }}>ESPN Fantasy Baseball Tracker</strong>
            <br />
            A full-stack app combining ESPN Fantasy Baseball data with Baseball Savant statcast metrics.
            <br /><br />
            <strong>Data Sources:</strong>
            <ul style={{ marginLeft: 16, marginTop: 4 }}>
              <li>ESPN Fantasy API — rosters, standings, free agents</li>
              <li>Baseball Savant (MLB Statcast) — expected stats, barrel rate, sprint speed</li>
            </ul>
            <br />
            <strong>Key Metrics:</strong>
            <ul style={{ marginLeft: 16, marginTop: 4 }}>
              <li><strong>xBA / xwOBA</strong> — expected batting average / weighted on-base average</li>
              <li><strong>Barrel%</strong> — % of batted balls with ideal launch angle + exit velocity</li>
              <li><strong>Hard Hit%</strong> — % of batted balls at 95+ mph exit velocity</li>
              <li><strong>xERA</strong> — expected ERA based on contact quality allowed</li>
              <li><strong>CSW%</strong> — called strikes + whiffs per pitch (pitch quality)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
