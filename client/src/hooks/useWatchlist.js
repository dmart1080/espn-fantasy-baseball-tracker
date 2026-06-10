import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

export function useWatchlist() {
  return useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const res = await axios.get('/api/watchlist')
      return res.data
    },
  })
}

export function useAddToWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (player) => axios.post('/api/watchlist', player).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  })
}

export function useUpdateWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) =>
      axios.put(`/api/watchlist/${id}`, updates).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  })
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => axios.delete(`/api/watchlist/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  })
}
