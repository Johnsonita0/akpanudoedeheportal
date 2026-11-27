const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')
const localApiUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i

export const apiUrl = import.meta.env.DEV
  ? configuredApiUrl || 'http://localhost:4000'
  : configuredApiUrl && !localApiUrl.test(configuredApiUrl)
    ? configuredApiUrl
    : 'https://akpanudoedehbackend.vercel.app'
