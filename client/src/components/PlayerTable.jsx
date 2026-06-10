import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import StatCell from './StatCell.jsx'

const PAGE_SIZE = 50;

/**
 * PlayerTable - sortable, filterable, paginated data table
 *
 * Props:
 *   columns  - array of column definitions:
 *     { key, label, statKey, isPitcher, sortable, render, width }
 *   data     - array of row objects
 *   searchKeys - which keys to search when filtering (default: ['name'])
 *   filterText - optional external filter string (controlled)
 *   onAddWatchlist - optional callback(row) to add to watchlist
 *   emptyMessage - message when no rows
 */
export default function PlayerTable({
  columns = [],
  data = [],
  searchKeys = ['name'],
  filterText: externalFilter,
  onAddWatchlist,
  emptyMessage = 'No players found.',
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [internalFilter, setInternalFilter] = useState('');
  const [page, setPage] = useState(1);

  const filterText = externalFilter !== undefined ? externalFilter : internalFilter;

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    if (!filterText.trim()) return data;
    const q = filterText.toLowerCase();
    return data.filter(row =>
      searchKeys.some(k => {
        const v = row[k];
        return v && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, filterText, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      const numA = parseFloat(av);
      const numB = parseFloat(bv);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }
      const sa = String(av).toLowerCase();
      const sb = String(bv).toLowerCase();
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function SortIcon({ col }) {
    if (!col.sortable && col.sortable !== undefined) return null;
    if (sortKey !== col.key) return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: 'var(--accent)' }} />
      : <ChevronDown size={12} style={{ color: 'var(--accent)' }} />;
  }

  return (
    <div>
      {externalFilter === undefined && (
        <div className="filters-bar">
          <input
            type="text"
            className="form-input"
            style={{ maxWidth: 280 }}
            placeholder="Search players..."
            value={internalFilter}
            onChange={e => { setInternalFilter(e.target.value); setPage(1); }}
          />
          <span className="text-sm text-muted">
            {sorted.length} player{sorted.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={sortKey === col.key ? 'sorted' : ''}
                  style={{ width: col.width, textAlign: col.align || 'left' }}
                  onClick={() => (col.sortable !== false) && handleSort(col.key)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
              {onAddWatchlist && <th style={{ width: 80 }}>Watch</th>}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onAddWatchlist ? 1 : 0)} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 16px' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row, idx) => (
                <tr key={row.id || row.player_id || idx}>
                  {columns.map(col => (
                    <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                      {col.render ? (
                        col.render(row[col.key], row)
                      ) : col.statKey !== undefined || col.isStatCell ? (
                        <StatCell
                          value={row[col.key]}
                          stat={col.statKey || col.key}
                          isPitcher={col.isPitcher}
                        />
                      ) : (
                        <span>{row[col.key] ?? '—'}</span>
                      )}
                    </td>
                  ))}
                  {onAddWatchlist && (
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onAddWatchlist(row)}
                        title="Add to watchlist"
                      >
                        + Watch
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
