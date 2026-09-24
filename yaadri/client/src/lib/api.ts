export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string[]>) {
    super(message)
  }
  get network() { return this.status === 0 }
}

async function request<T>(method: string, path: string, body?: unknown, retry = method === 'GET'): Promise<T> {
  let res: Response
  try {
    res = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'yaadri' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    if (retry) return request<T>(method, path, body, false)
    throw new ApiError(0, 'network', 'You seem to be offline, or YAADRI cannot be reached. Check your connection and try again.')
  }
  let data: any = null
  try { data = await res.json() } catch { /* empty */ }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'error', data?.message ?? 'Something went wrong. Please try again.', data?.fields)
  return data as T
}

export const api = {
  get: <T,>(p: string) => request<T>('GET', p),
  post: <T,>(p: string, b?: unknown) => request<T>('POST', p, b ?? {}),
  patch: <T,>(p: string, b: unknown) => request<T>('PATCH', p, b),
  put: <T,>(p: string, b: unknown) => request<T>('PUT', p, b),
  del: <T,>(p: string, b?: unknown) => request<T>('DELETE', p, b),
}

export async function postBlob(path: string, body: unknown): Promise<Blob> {
  let res: Response
  try {
    res = await fetch('/api' + path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'yaadri' }, body: JSON.stringify(body) })
  } catch {
    throw new ApiError(0, 'network', 'You seem to be offline.')
  }
  if (!res.ok) {
    let d: any = null
    try { d = await res.json() } catch { /* empty */ }
    throw new ApiError(res.status, d?.error ?? 'error', d?.message ?? 'Request failed.')
  }
  return res.blob()
}

export const errorText = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
