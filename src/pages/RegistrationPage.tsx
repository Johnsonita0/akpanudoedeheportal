import { useState, type FormEvent } from 'react'
import { campaignName, lgas, supportGroups, wards } from '../campaignData'
import './RegistrationPage.css'

const steps = ['Personal details', 'Location & group', "Voter's card (VIN)", 'Consent']
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'

type Registration = {
  full_name: string
  phone: string
  email: string
  date_of_birth: string
  lga: string
  ward: string
  support_group: string
  polling_unit: string
  vin: string
  consent: boolean
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => null) as { error: string } | null
  return body?.error || `Request failed (${response.status}). Please try again.`
}

export default function RegistrationPage() {
  const [step, setStep] = useState(0)
  const [lga, setLga] = useState('')
  const [registration, setRegistration] = useState<Registration>({
    full_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    lga: '',
    ward: '',
    support_group: '',
    polling_unit: '',
    vin: '',
    consent: false,
  })
  const [vinStatus, setVinStatus] = useState<'idle' | 'checking' | 'verified' | 'unavailable'>('idle')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const verifyVin = async () => {
    const vin = registration.vin.trim()
    if (!vin) {
      setMessage('Enter your voter identification number first.')
      return
    }

    setVinStatus('checking')
    setMessage('')
    try {
      const response = await fetch(`${apiUrl}/api/vin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin, surname: registration.full_name.trim().split(/\s+/).slice(-1)[0] }),
      })
      if (!response.ok) throw new Error(await responseError(response))
      setVinStatus('verified')
    } catch (error) {
      setVinStatus('unavailable')
      setMessage(error instanceof Error ? error.message : 'VIN verification could not be completed.')
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step < steps.length - 1) {
      setMessage('')
      setStep((current) => current + 1)
      return
    }

    const payload: Registration = {
      ...registration,
      full_name: registration.full_name.trim(),
      phone: registration.phone.trim(),
      email: registration.email.trim(),
      lga,
      polling_unit: registration.polling_unit.trim(),
    }

    setSubmitting(true)
    setMessage('')
    try {
      const response = await fetch(`${apiUrl}/api/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(await responseError(response))
      const result = await response.json() as { message: string }
      setMessage(result.message || 'Registration received. VIN verification is pending.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Registration could not be submitted. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="registration-shell">
      <header className="registration-header"><a className="registration-brand" href="/"><span className="registration-mark">A</span><span><strong>AKPANUDOEDHE</strong><small>AKWA IBOM 2027</small></span></a><a href="/"> Back to campaign</a></header>
      <main className="registration-main">
        <div className="registration-title"><span className="eyebrow">VOLUNTARY CAMPAIGN PARTICIPATION</span><h1>Become a <em>supporter.</em></h1><p>Share your details to stay connected with campaign activities in your community.</p></div>
        <div className="registration-steps" aria-label="Registration progress">{steps.map((label, index) => <div key={label} className={`registration-step ${index === step ? 'current' : ''} ${index < step ? 'complete' : ''}`}><span>{index < step ? '✓' : index + 1}</span><strong>{label}</strong></div>)}</div>
        <form className="registration-form" onSubmit={submit}>
          <section className="registration-card">
            <div className="form-step-heading"><span>STEP {step + 1} OF 4</span><h2>{steps[step]}</h2></div>
            {step === 0 && <div className="registration-fields">
              <label className="span-two">Full name *<input required name="full_name" autoComplete="name" value={registration.full_name} onChange={(event) => setRegistration({ ...registration, full_name: event.target.value })} placeholder="Enter your full name" /></label>
              <label>Phone number *<input required name="phone" type="tel" autoComplete="tel" value={registration.phone} onChange={(event) => setRegistration({ ...registration, phone: event.target.value })} placeholder="+234" /></label>
              <label>Email <span className="field-note">(optional)</span><input name="email" type="email" autoComplete="email" value={registration.email} onChange={(event) => setRegistration({ ...registration, email: event.target.value })} placeholder="you@example.com" /></label>
              <label>Date of birth<input name="date_of_birth" type="date" value={registration.date_of_birth} onChange={(event) => setRegistration({ ...registration, date_of_birth: event.target.value })} /></label>
            </div>}
            {step === 1 && <div className="registration-fields">
              <label>Local Government Area *<select required value={lga} onChange={(event) => { setLga(event.target.value); setRegistration({ ...registration, lga: event.target.value, ward: '' }) }}><option value="">Select LGA</option>{lgas.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Ward *<select required name="ward" value={registration.ward} onChange={(event) => setRegistration({ ...registration, ward: event.target.value })} disabled={!lga}><option value="">{lga ? 'Select ward' : 'Select an LGA first'}</option>{wards.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="span-two">Support group *<select required name="support_group" value={registration.support_group} onChange={(event) => setRegistration({ ...registration, support_group: event.target.value })}><option value="">Select a support group</option>{supportGroups.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="span-two">Polling unit <span className="field-note">(optional)</span><input name="polling_unit" value={registration.polling_unit} onChange={(event) => setRegistration({ ...registration, polling_unit: event.target.value })} placeholder="Polling unit or nearby landmark" /></label>
              <p className="registration-hint span-two">Ward names shown are illustrative. Please confirm your ward with your local election authority.</p>
            </div>}
            {step === 2 && <div className="registration-fields">
              <div className="privacy-callout span-two"><span>i</span><p>Your VIN is sensitive information. It will be sent securely to the campaign registration service and is never displayed in full in your supporter profile.</p></div>
              <label className="span-two">Voter identification number (VIN) *<input required name="vin" autoComplete="off" value={registration.vin} onChange={(event) => setRegistration({ ...registration, vin: event.target.value })} placeholder="Enter the number on your voter's card" /></label>
              <div className="vin-actions span-two"><button className="button button-outline" disabled={vinStatus === 'checking'} onClick={() => void verifyVin()} type="button">{vinStatus === 'checking' ? 'Checking…' : 'Verify VIN'}</button>{vinStatus === 'verified' && <span className="verification-result verified">✓ VIN verified</span>}</div>
              <p className={`registration-hint span-two ${vinStatus === 'unavailable' ? 'verification-warning' : ''}`}>{vinStatus === 'unavailable' ? 'The verification service is not configured. You may continue, but your registration will remain pending verification.' : 'VIN verification is supplied by an external service. If it is unavailable, you may continue with a pending verification.'}</p>
            </div>}
            {step === 3 && <div className="consent-panel">
              <div className="privacy-callout"><span>i</span><p>Registration is voluntary. Your details will be used to coordinate campaign participation and may be shared with authorised campaign administrators for that purpose.</p></div>
              <label className="consent-check"><input required type="checkbox" name="consent" checked={registration.consent} onChange={(event) => setRegistration({ ...registration, consent: event.target.checked })} /><span>I confirm that the information I provided is accurate, and I consent to the use of my information for campaign participation and administration. I understand that my VIN may be shared with an authorised verification provider when one is configured.</span></label>
              <p className="registration-hint">VIN status: <strong>{vinStatus === 'verified' ? 'Verified' : 'Pending verification'}</strong></p>
            </div>}
            {message && <p className={`registration-message ${message.toLowerCase().includes('could not') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('unavailable') ? 'error' : ''}`} role="status">{message}</p>}
            <div className="registration-actions">{step > 0 && <button className="button button-text" type="button" onClick={() => { setMessage(''); setStep((current) => current - 1) }}> Back</button>}{step < steps.length - 1 ? <button className="button button-primary" type="submit">Continue <span></span></button> : <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit registration'} <span></span></button>}</div>
          </section>
        </form>
        <p className="registration-privacy">Your information is kept private and handled in line with our <a href="/privacy">privacy notice</a>.</p>
      </main>
      <footer className="registration-footer">© 2026 {campaignName}. Registration is voluntary.</footer>
    </div>
  )
}
