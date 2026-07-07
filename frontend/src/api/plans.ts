import api from './auth'

export const plansApi = {
  create(data: any) {
    return api.post('/plans', data)
  },
  getList(page = 1, size = 20) {
    return api.get(`/plans?page=${page}&size=${size}`)
  },
  getById(id: number) {
    return api.get(`/plans/${id}`)
  },
  update(id: number, data: any) {
    return api.patch(`/plans/${id}`, data)
  },
  delete(id: number) {
    return api.delete(`/plans/${id}`)
  },
  chat(id: number, message: string) {
    return api.post(`/plans/${id}/chat`, { message })
  },
  sseProgress(id: number) {
    return new EventSource(`/api/v1/plans/${id}/sse/progress`)
  }
}
