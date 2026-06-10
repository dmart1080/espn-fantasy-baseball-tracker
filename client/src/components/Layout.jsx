import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Trophy,
  Users,
  TrendingUp,
  ArrowLeftRight,
  Star,
  Settings,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react'
import axios from 'axios'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/leagues', icon: Trophy, label: 'Leagues' },
  { to: '/roster', icon: Users, label: 'Roster Analysis' },
  { to: '/waiver', icon: TrendingUp, label: 'Waiver Wire' },
  { to: '/trade', icon: ArrowLeftRight, label: 'Trade Analyzer' },
  { to: '/watchlist', icon: Star, label: 'Watchlist' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const location = useLocation();

  const currentPage = NAV_ITEMS.find(n => n.to === location.pathname);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await axios.post('/api/cache/refresh', { season: new Date().getFullYear() });
    } catch (e) {
      // silent
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="app-shell">
      {/* Overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚾</div>
          <div className="sidebar-logo-text">
            ESPN Fantasy
            <span>Baseball Tracker</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Navigation</div>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border-muted)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Season {new Date().getFullYear()}
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="main-area">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="hamburger"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="page-title">
              {currentPage?.label || 'ESPN Fantasy Baseball Tracker'}
            </span>
          </div>
          <div className="topbar-right">
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh statcast cache"
            >
              <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
