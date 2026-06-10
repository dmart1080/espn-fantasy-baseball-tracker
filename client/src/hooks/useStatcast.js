import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const CURRENT_SEASON = new Date().getFullYear()

export function useBatterStatcast(season = CURRENT_SEASON) {
  return useQuery({
    queryKey: ['statcast', 'batter', season],
    queryFn: async () => {
      const res = await axios.get(`/api/players/statcast/${season}?type=batter`)
      return res.data
    },
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  })
}

export function usePitcherStatcast(season = CURRENT_SEASON) {
  return useQuery({
    queryKey: ['statcast', 'pitcher', season],
    queryFn: async () => {
      const res = await axios.get(`/api/players/statcast/${season}?type=pitcher`)
      return res.data
    },
    staleTime: 6 * 60 * 60 * 1000,
  })
}

export function useSprintSpeed(season = CURRENT_SEASON) {
  return useQuery({
    queryKey: ['statcast', 'sprint', season],
    queryFn: async () => {
      const res = await axios.get(`/api/players/statcast/${season}?type=sprint`)
      return res.data
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  })
}
