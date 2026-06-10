import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const ESPN_BASE = '/espn-proxy/apis/v3/games/flb'

// ── ESPN API via Vite proxy ──
// Requests go: browser → localhost:5173/espn-proxy → fantasy.espn.com
// The proxy rewrites Origin/Referer and forwards espn_s2/SWID as Cookie.

async function espnFetch(url, league = {}) {
  const headers = {}
  if (league.espn_s2) headers['x-espn-s2'] = league.espn_s2
  if (league.swid)    headers['x-swid']     = league.swid
  const res = await fetch(url, { headers })
  if (res.status === 401) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'ESPN auth required — add espn_s2 + SWID in League Management')
  }
  if (!res.ok) throw new Error(`ESPN ${res.status}`)
  return res.json()
}

function getPositionName(slotId) {
  const slots = {
    0: 'C', 1: '1B', 2: '2B', 3: '3B', 4: 'SS',
    5: 'OF', 6: 'OF', 7: 'OF', 8: 'DH', 9: 'SP',
    10: 'SP', 11: 'RP', 12: 'RP', 13: 'P', 14: 'P',
    15: 'BN', 16: 'IL', 17: 'NA',
  }
  return slots[slotId] || 'UTIL'
}

function parseRosters(data) {
  if (!data?.teams) return []
  return data.teams.map(team => ({
    id: team.id,
    name: `${team.location || ''} ${team.nickname || ''}`.trim() || `Team ${team.id}`,
    abbrev: team.abbrev,
    wins: team.record?.overall?.wins ?? 0,
    losses: team.record?.overall?.losses ?? 0,
    ties: team.record?.overall?.ties ?? 0,
    players: (team.roster?.entries || []).map(entry => {
      const info = entry.playerPoolEntry?.playerInfo ?? {}
      const statsArr = info.stats ?? []
      const season = new Date().getFullYear()
      const current = statsArr.find(s => s.seasonId === season && s.statSplitTypeId === 0)
      const raw = current?.stats ?? {}
      const posId = entry.lineupSlotId
      const isPitcher = [9, 10, 11, 12, 13, 14].includes(posId)
      return {
        id: entry.playerId,
        name: info.fullName || 'Unknown',
        position: getPositionName(posId),
        eligiblePositions: (info.eligibleSlots || []).map(getPositionName).filter(Boolean),
        injuryStatus: info.injuryStatus || 'ACTIVE',
        proTeam: info.proTeamId,
        stats: isPitcher
          ? {
              era:  raw[47] != null ? raw[47].toFixed(2) : '—',
              whip: raw[41] != null ? raw[41].toFixed(2) : '—',
              k9:   raw[48] != null ? raw[48].toFixed(1) : '—',
              sv:   raw[57] ?? 0,
              wins: raw[53] ?? 0,
            }
          : {
              avg:  raw[2]  != null ? raw[2].toFixed(3)  : '—',
              hr:   raw[5]  ?? 0,
              rbi:  raw[6]  ?? 0,
              sb:   raw[23] ?? 0,
              runs: raw[4]  ?? 0,
              ops:  raw[18] != null ? raw[18].toFixed(3) : '—',
            },
      }
    }),
  }))
}

// ── React Query hooks ──

export function useLeagues() {
  return useQuery({
    queryKey: ['leagues'],
    queryFn: async () => {
      const res = await axios.get('/api/leagues')
      return res.data
    },
  })
}

export function useLeagueRosters(league, enabled = true) {
  return useQuery({
    queryKey: ['league-rosters', league?.league_id, league?.season],
    queryFn: async () => {
      const url = `${ESPN_BASE}/seasons/${league.season}/segments/0/leagues/${league.league_id}?view=mRoster&view=mTeam`
      const data = await espnFetch(url, league)
      return parseRosters(data)
    },
    enabled: !!league?.league_id && !!league?.season && enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}

export function useLeagueFreeAgents(league, enabled = true) {
  return useQuery({
    queryKey: ['league-freeagents', league?.league_id, league?.season],
    queryFn: async () => {
      const filter = JSON.stringify({
        players: {
          filterStatus: { value: ['FREEAGENT', 'WAIVERS'] },
          limit: 50,
          sortPercOwned: { sortAsc: false, sortPriority: 1 },
        },
      })
      const url = `${ESPN_BASE}/seasons/${league.season}/segments/0/leagues/${league.league_id}?view=kona_player_info`
      const headers = { 'X-Fantasy-Filter': filter }
      if (league.espn_s2) headers['x-espn-s2'] = league.espn_s2
      if (league.swid)    headers['x-swid']     = league.swid
      const res = await fetch(url, { headers })
      if (res.status === 401) throw new Error('ESPN auth required — add espn_s2 + SWID in League Management')
      if (!res.ok) throw new Error(`ESPN ${res.status}`)
      const data = await res.json()
      if (!data?.players) return []
      return data.players.map(p => ({
        id: p.id,
        name: p.playerPoolEntry?.playerInfo?.fullName || 'Unknown',
        position: getPositionName(p.playerPoolEntry?.playerInfo?.defaultPositionId),
        ownedPct: p.playerPoolEntry?.percentOwned ?? 0,
        injuryStatus: p.playerPoolEntry?.playerInfo?.injuryStatus || 'ACTIVE',
      }))
    },
    enabled: !!league?.league_id && !!league?.season && enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}

export function useAddLeague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => axios.post('/api/leagues', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leagues'] }),
  })
}

export function useDeleteLeague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => axios.delete(`/api/leagues/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leagues'] }),
  })
}
