import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

export function useLeagues() {
  return useQuery({
    queryKey: ['leagues'],
    queryFn: async () => {
      const res = await axios.get('/api/leagues')
      return res.data
    },
  })
}

export function useLeagueRosters(leagueId, enabled = true) {
  return useQuery({
    queryKey: ['league-rosters', leagueId],
    queryFn: async () => {
      const res = await axios.get(`/api/leagues/${leagueId}/rosters`)
      return res.data
    },
    enabled: !!leagueId && enabled,
    staleTime: 10 * 60 * 1000,
  })
}

export function useLeagueFreeAgents(leagueId, enabled = true) {
  return useQuery({
    queryKey: ['league-freeagents', leagueId],
    queryFn: async () => {
      const res = await axios.get(`/api/leagues/${leagueId}/freeagents`)
      return res.data
    },
    enabled: !!leagueId && enabled,
    staleTime: 10 * 60 * 1000,
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
