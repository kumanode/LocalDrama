import request from '@/utils/request'

export const taskAPI = {
  get(taskId) {
    return request.get(`/tasks/${taskId}`)
  },
  cancel(taskId, body) {
    return request.post(`/tasks/${taskId}/cancel`, body || {})
  },
  retry(taskId) {
    return request.post(`/tasks/${taskId}/retry`)
  },
  listByResource(resourceId) {
    return request.get('/tasks', { params: { resource_id: String(resourceId) } })
  },
  listRecent(limit = 200) {
    return request.get('/tasks', { params: { limit } })
  },
}
