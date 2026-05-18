const ANON_ID_KEY = 'dn_anon_id'

export function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return ''
  let id = window.localStorage.getItem(ANON_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    window.localStorage.setItem(ANON_ID_KEY, id)
  }
  return id
}
