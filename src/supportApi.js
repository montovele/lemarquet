export async function supportRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {})
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`/api${path}`, { ...options, headers })
  const payload = await response.json()
  if (!response.ok) {
    const error = new Error(payload.error || 'No se pudo completar la solicitud.')
    error.status = response.status
    throw error
  }
  return payload
}
