import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import './AdminAccessPage.css'

export default function AdminAccessPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(Boolean(supabase))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession)
    })
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setErrorMessage('Could not verify the current session. Please try again.')
      setSession(data.session)
      setLoading(false)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const hasAdminRole = session?.user.app_metadata.role === 'admin'

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setSubmitting(true)
    setErrorMessage('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      if (data.user.app_metadata.role !== 'admin') {
        await supabase.auth.signOut()
        setSession(null)
        setErrorMessage('This account is not authorized for administrator access.')
        return
      }
      setSession(data.session)
      setPassword('')
    } catch (error) {
      console.error('Administrator sign-in failed:', error)
      setErrorMessage('Sign-in failed. Check your credentials and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Administrator sign-out failed:', error)
      setErrorMessage('Could not end the administrator session. Please try again.')
      return
    }
    setSession(null)
    setErrorMessage('')
  }

  return (
    <>
      <meta name="robots" content="noindex,nofollow" />
      <main className="admin-access-screen">
        <section className="admin-access-card" aria-labelledby="admin-access-heading">
          <span className="admin-access-kicker">RESTRICTED AREA</span>
          <h1 id="admin-access-heading">Administrator sign-in</h1>
          {!supabase ? (
            <p role="status">Sign-in is unavailable until the Supabase project URL and publishable key are configured. No administration data is exposed.</p>
          ) : loading ? (
            <p role="status">Checking your secure session...</p>
          ) : hasAdminRole ? (
            <>
              <p role="status">Your administrator session is verified. The administration workspace remains closed until its live data policies are configured.</p>
              <button className="admin-access-submit" type="button" onClick={() => void signOut()}>Sign out</button>
            </>
          ) : session ? (
            <>
              <p role="alert">This account is not authorized for administrator access.</p>
              <button className="admin-access-submit" type="button" onClick={() => void signOut()}>Sign out</button>
            </>
          ) : (
            <>
              <p>Sign in with an administrator account. Access is granted only to accounts with the trusted Supabase app metadata role set to <code>admin</code>.</p>
              <form className="admin-access-form" onSubmit={(event) => void signIn(event)}>
                <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
                {errorMessage && <p className="admin-access-error" role="alert">{errorMessage}</p>}
                <button className="admin-access-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</button>
              </form>
            </>
          )}
          <a href="/">Return to the public campaign site</a>
        </section>
      </main>
    </>
  )
}
