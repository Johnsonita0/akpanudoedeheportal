import { useEffect, useState, type FormEvent } from 'react'
import { apiUrl } from '../api'
import { campaignName } from '../campaignData'
import NigeriaStateSelect from '../components/NigeriaStateSelect'
import SearchableLgaSelect from '../components/SearchableLgaSelect'
import SearchableOptionSelect from '../components/SearchableOptionSelect'
import { isValidLocation } from '../nigeriaLocations'
import { supabase } from '../supabase'
import './GroupMemberRegistrationPage.css'

type RegistrationGroup = {
  id: number
  name: string
  state: string | null
  lga: string
}

type ApplicationForm = {
  full_name: string
  phone: string
  email: string
  state: string
  lga: string
  ward: string
}

type VerificationResponse = {
  campaign: string
  member: {
    member_id: string
    name: string
    group: string
    status: 'verified'
  }
}

const emptyForm: ApplicationForm = {
  full_name: '',
  phone: '',
  email: '',
  state: '',
  lga: '',
  ward: '',
}

function isRegistrationGroup(value: unknown): value is RegistrationGroup {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return Number.isSafeInteger(row.id) &&
    typeof row.name === 'string' &&
    (row.state === null || typeof row.state === 'string') &&
    typeof row.lga === 'string'
}

function isVerificationResponse(value: unknown): value is VerificationResponse {
  if (!value || typeof value !== 'object') return false
  const response = value as Record<string, unknown>
  if (!response.member || typeof response.member !== 'object') return false
  const member = response.member as Record<string, unknown>
  return typeof response.campaign === 'string' &&
    typeof member.member_id === 'string' &&
    typeof member.name === 'string' &&
    typeof member.group === 'string' &&
    member.status === 'verified'
}

function readPhotoAsBase64(file: File): Promise<{ contentType: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The selected photo could not be read.'))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('The selected photo could not be read.'))
        return
      }
      const base64 = reader.result.split(',')[1]
      if (!base64) {
        reject(new Error('The selected photo could not be read.'))
        return
      }
      resolve({ contentType: file.type, base64 })
    }
    reader.readAsDataURL(file)
  })
}

export default function GroupMemberRegistrationPage({ token }: { token: string }) {
  const [group, setGroup] = useState<RegistrationGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ApplicationForm>(emptyForm)
  const [photo, setPhoto] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)

  useEffect(() => {
    let active = true
    const loadGroup = async () => {
      if (!supabase) {
        setMessage('Group registration is not available right now.')
        setMessageIsError(true)
        setLoading(false)
        return
      }
      const { data, error } = await supabase.rpc('get_public_support_group_registration', { p_token: token })
      if (!active) return
      if (error) {
        console.error('Could not load the group registration link:', error.message)
        setMessage('This group registration link could not be checked. Please try again later.')
        setMessageIsError(true)
        setLoading(false)
        return
      }
      const row = Array.isArray(data) ? data[0] : null
      if (!isRegistrationGroup(row)) {
        setMessage('This group registration link is invalid or no longer available.')
        setMessageIsError(true)
        setLoading(false)
        return
      }
      setGroup(row)
      setForm((current) => ({
        ...current,
        state: row.state ?? '',
        lga: row.state && isValidLocation(row.state, row.lga) ? row.lga : '',
      }))
      setLoading(false)
    }
    void loadGroup()
    return () => { active = false }
  }, [token])

  const updateForm = (field: keyof ApplicationForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'state' ? { lga: '' } : {}),
    }))
  }

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!consent) {
      setMessage('Please agree to the privacy notice and confirm you are submitting your own details.')
      setMessageIsError(true)
      return
    }
    if (!isValidLocation(form.state, form.lga)) {
      setMessage('Choose a valid state and Local Government Area.')
      setMessageIsError(true)
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      const encodedPhoto = photo ? await readPhotoAsBase64(photo) : null
      const response = await fetch(`${apiUrl}/api/group-member-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_token: token,
          ...form,
          consent: true,
          ...(encodedPhoto ? { photo: encodedPhoto } : {}),
        }),
      })
      const result = await response.json() as { message?: unknown; error?: unknown }
      if (!response.ok) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Your application could not be submitted. Please try again.')
      }
      setMessage(typeof result.message === 'string' ? result.message : 'Your application was sent to the group for review.')
      setMessageIsError(false)
      setForm((current) => ({ ...emptyForm, state: current.state, lga: current.lga }))
      setPhoto(null)
      setConsent(false)
    } catch (error) {
      console.error('Could not submit a group-member application:', error)
      setMessage(error instanceof Error ? error.message : 'Your application could not be submitted. Please try again.')
      setMessageIsError(true)
    } finally {
      setSubmitting(false)
    }
  }

  const choosePhoto = (file: File | undefined) => {
    setMessage('')
    setPhoto(null)
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setMessage('Choose a JPG, PNG or WebP photo smaller than 2 MB.')
      setMessageIsError(true)
      return
    }
    setPhoto(file)
  }

  return (
    <div className="group-member-registration-shell">
      <header className="group-member-registration-header">
        <a href="/" className="group-member-registration-brand"><strong>AKPANUDOEDHE</strong><small>AKWA IBOM 2027 CAMPAIGN</small></a>
        <a href="/privacy">Privacy notice</a>
      </header>
      <main className="group-member-registration-main">
        <div className="group-member-registration-title">
          <span className="eyebrow">SUPPORT-GROUP MEMBERSHIP</span>
          <h1>Register with<br /><em>{group?.name ?? 'your support group'}</em></h1>
          <p>Submit your details to the group coordinator. Your membership will be pending until they review and approve your application.</p>
        </div>
        {loading ? (
          <p className="group-member-registration-message" role="status">Checking this group registration link…</p>
        ) : group ? (
          <>
            <section className="group-member-registration-card">
              <div className="group-member-registration-heading"><span>MEMBER APPLICATION</span><h2>Your contact and location details</h2></div>
              <form className="group-member-registration-form" onSubmit={(event) => void submitApplication(event)}>
                <label>Full name<input required minLength={2} maxLength={120} autoComplete="name" value={form.full_name} onChange={(event) => updateForm('full_name', event.target.value)} /></label>
                <label>Phone number<input required type="tel" maxLength={30} autoComplete="tel" placeholder="+234" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} /></label>
                <label>Email <span>(optional)</span><input type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} /></label>
                <label>State<NigeriaStateSelect name="state" required value={form.state} onChange={(value) => updateForm('state', value)} /></label>
                <label>Local Government Area<SearchableLgaSelect name="lga" state={form.state} required value={form.lga} onChange={(value) => updateForm('lga', value)} /></label>
                <label>Ward<SearchableOptionSelect
                  name="ward"
                  required
                  value={form.ward}
                  onChange={(value) => updateForm('ward', value)}
                  options={Array.from({ length: 10 }, (_, index) => `Ward ${index + 1}`).map((ward) => ({ value: ward, label: ward }))}
                  placeholder="Select ward"
                  searchLabel="Search wards"
                  searchPlaceholder="Search ward"
                /></label>
                <label className="group-member-registration-photo">Photo <span>(optional)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.currentTarget.files?.[0])} /><small>{photo ? `${photo.name} selected` : 'JPG, PNG or WebP, up to 2 MB.'}</small></label>
                <label className="group-member-registration-consent">
                  <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                  <span>I agree to the <a href="/privacy" target="_blank" rel="noreferrer">privacy notice</a> and confirm these are my own details. The group coordinator will review this application before my membership is approved.</span>
                </label>
                {message && <p className={`group-member-registration-message${messageIsError ? ' error' : ''}`} role={messageIsError ? 'alert' : 'status'}>{message}</p>}
                <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit application'}</button>
              </form>
            </section>
            <p className="group-member-registration-footnote">Submitting an application does not guarantee membership. A QR verification ID card is issued only after coordinator approval.</p>
          </>
        ) : (
          <p className="group-member-registration-message error" role="alert">{message}</p>
        )}
      </main>
      <footer className="group-member-registration-footer">© 2026 {campaignName}. Registration is voluntary.</footer>
    </div>
  )
}

export function MemberVerificationPage({ token }: { token: string }) {
  const [verification, setVerification] = useState<VerificationResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const verify = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/member-verifications?token=${encodeURIComponent(token)}`, {
          headers: { Accept: 'application/json' },
        })
        const result: unknown = await response.json()
        if (!response.ok) {
          const apiError = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
            ? result.error
            : 'This member could not be verified.'
          throw new Error(apiError)
        }
        if (!isVerificationResponse(result)) throw new Error('The verification service returned an invalid response.')
        if (active) setVerification(result)
      } catch (verificationError) {
        console.error('Could not verify a member card:', verificationError)
        if (active) setError(verificationError instanceof Error ? verificationError.message : 'Member verification is temporarily unavailable.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void verify()
    return () => { active = false }
  }, [token])

  return (
    <main className="member-verification-shell">
      <header className="member-verification-header"><a href="/"><strong>AKPANUDOEDHE</strong><small>AKWA IBOM 2027 CAMPAIGN</small></a></header>
      <section className="member-verification-content">
        <span className="eyebrow">MEMBER CARD CHECK</span>
        <h1>Membership verification</h1>
        {loading ? <p role="status">Checking this member card…</p> : verification ? (
          <>
            <p className="member-verification-status"><span aria-hidden="true">✓</span> Verified active member</p>
            <p>The QR code is valid for this approved member record.</p>
            <pre aria-label="Member verification data">{JSON.stringify(verification, null, 2)}</pre>
          </>
        ) : (
          <>
            <p className="member-verification-failure">This card could not be verified.</p>
            <p>{error}</p>
            <pre aria-label="Member verification result">{JSON.stringify({ status: 'not_verified' }, null, 2)}</pre>
          </>
        )}
        <a href="/" className="member-verification-home">Return to campaign website</a>
      </section>
    </main>
  )
}
