import { useEffect, useState, type FormEvent } from 'react'
import { campaignName, wards } from '../campaignData'
import adcLogo from '../assets/adc-logo-from-campaign-poster.png'
import stateEmblem from '../assets/akwa-ibom-state-emblem.png'
import SearchableLgaSelect from '../components/SearchableLgaSelect'
import { supabase } from '../supabase'
import './RegistrationPage.css'

const steps = ['Personal details', 'Location & group', "Voter's card (VIN)", 'Consent']

type Registration = {
  full_name: string
  phone: string
  email: string
  lga: string
  ward: string
  support_group_id: string
  polling_unit: string
  vin: string
  consent: boolean | null
}

type PublicSupportGroup = {
  id: number
  name: string
  lga: string
}

type GroupAccount = {
  name: string
  lga: string
  coordinatorName: string
  phone: string
  email: string
  password: string
}

function isPublicSupportGroup(value: unknown): value is PublicSupportGroup {
  if (!value || typeof value !== 'object') return false
  const group = value as Record<string, unknown>
  return Number.isSafeInteger(group.id) &&
    typeof group.name === 'string' &&
    typeof group.lga === 'string'
}

export default function RegistrationPage() {
  const [registrationType, setRegistrationType] = useState<'individual' | 'group'>(() =>
    new URLSearchParams(window.location.search).get('type') === 'group' ? 'group' : 'individual',
  )
  const [step, setStep] = useState(0)
  const [supportGroups, setSupportGroups] = useState<PublicSupportGroup[]>([])
  const [groupsMessage, setGroupsMessage] = useState('')
  const [registration, setRegistration] = useState<Registration>({
    full_name: '',
    phone: '',
    email: '',
    lga: '',
    ward: '',
    support_group_id: '',
    polling_unit: '',
    vin: '',
    consent: null,
  })
  const [groupAccount, setGroupAccount] = useState<GroupAccount>({
    name: '',
    lga: '',
    coordinatorName: '',
    phone: '',
    email: '',
    password: '',
  })
  const [groupConsent, setGroupConsent] = useState<boolean | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setGroupsMessage('Support-group choices are unavailable until the campaign database is configured.')
      return
    }

    let active = true
    void supabase.rpc('list_public_support_groups').then(({ data, error }) => {
      if (!active) return
      if (error) {
        console.error('Could not load approved support groups:', error.message)
        setGroupsMessage('Approved support groups could not be loaded. You can still register as an individual.')
        return
      }

      if (!Array.isArray(data) || !data.every(isPublicSupportGroup)) {
        console.error('The support-group list returned an invalid response.')
        setGroupsMessage('Approved support groups could not be loaded. You can still register as an individual.')
        return
      }

      setSupportGroups(data)
      setGroupsMessage(data.length === 0 ? 'No approved support groups are available yet. You can register without joining a group.' : '')
    })

    return () => {
      active = false
    }
  }, [])

  const submitIndividual = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step < steps.length - 1) {
      setMessage('')
      setStep((current) => current + 1)
      return
    }

    if (registration.consent !== true) {
      setMessage('You must agree to the privacy notice and data use to submit this registration.')
      return
    }
    if (!supabase) {
      setMessage('Registration is unavailable until the campaign database is configured.')
      return
    }

    setSubmitting(true)
    setMessage('')
    const registrationData = {
      ...registration,
      full_name: registration.full_name.trim(),
      phone: registration.phone.trim(),
      email: registration.email.trim(),
      polling_unit: registration.polling_unit.trim(),
      support_group_id: registration.support_group_id ? Number(registration.support_group_id) : null,
    }

    try {
      const { error } = await supabase.rpc('register_individual', { registration_data: registrationData })
      if (error) throw error
      setMessage('Registration received. Your VIN will remain pending until an authorised verification service is configured.')
    } catch (error) {
      console.error('Could not submit individual registration:', error)
      setMessage('Registration could not be submitted. Please check your details and try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  const registerGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (groupConsent !== true) {
      setMessage('You must agree to the privacy notice and confirm you are authorised to register this group.')
      return
    }
    if (!supabase) {
      setMessage('Group registration is unavailable until the campaign database is configured.')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      const { data, error } = await supabase.auth.signUp({
        email: groupAccount.email.trim(),
        password: groupAccount.password,
        options: {
          data: {
            account_type: 'support_group',
            group_name: groupAccount.name.trim(),
            group_lga: groupAccount.lga,
            coordinator_name: groupAccount.coordinatorName.trim(),
            coordinator_phone: groupAccount.phone.trim(),
            group_consent: true,
            consent_notice_version: '2026-11-27',
          },
        },
      })
      if (error) throw error
      setGroupAccount((current) => ({ ...current, password: '' }))
      if (data.session) {
        window.location.assign('/group-dashboard')
        return
      }
      setMessage('Group account created. Check the coordinator email to confirm the account, then sign in to add members and group photos.')
    } catch (error) {
      console.error('Could not create support-group account:', error)
      setMessage('Group registration could not be completed. The email may already be registered; try signing in to the group dashboard.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="registration-shell">
      <header className="registration-header">
        <a className="registration-brand" href="/" aria-label={`${campaignName} home`}>
          <span className="registration-brand-emblems" aria-hidden="true">
            <img src={adcLogo} alt="" />
            <span />
            <img src={stateEmblem} alt="" />
          </span>
          <span><strong>AKPANUDOEDHE</strong><small>AKWA IBOM 2027</small></span>
        </a>
        <a href="/">Back to campaign</a>
      </header>
      <main className="registration-main">
        <div className="registration-title">
          <span className="eyebrow">VOLUNTARY CAMPAIGN PARTICIPATION</span>
          <h1>{registrationType === 'individual' ? <>Become a <em>supporter.</em></> : <>Register your <em>group.</em></>}</h1>
          <p>{registrationType === 'individual' ? 'Share your details to stay connected with campaign activities in your community.' : 'Create one coordinator account for your support group, then add consenting members from its private dashboard.'}</p>
        </div>

        <fieldset className="registration-type">
          <legend>Choose a registration type</legend>
          <label className={registrationType === 'individual' ? 'selected' : ''}>
            <input type="radio" name="registration_type" value="individual" checked={registrationType === 'individual'} onChange={() => { setRegistrationType('individual'); setStep(0); setMessage('') }} />
            <span><strong>Individual</strong><small>Register as a supporter</small></span>
          </label>
          <label className={registrationType === 'group' ? 'selected' : ''}>
            <input type="radio" name="registration_type" value="group" checked={registrationType === 'group'} onChange={() => { setRegistrationType('group'); setMessage('') }} />
            <span><strong>Support group</strong><small>Create a coordinator account</small></span>
          </label>
        </fieldset>

        {registrationType === 'individual' ? (
          <>
            <div className="registration-steps" aria-label="Registration progress">{steps.map((label, index) => <div key={label} className={`registration-step ${index === step ? 'current' : ''} ${index < step ? 'complete' : ''}`}><span>{index < step ? '✓' : index + 1}</span><strong>{label}</strong></div>)}</div>
            <form className="registration-form" onSubmit={(event) => void submitIndividual(event)}>
              <section className="registration-card">
                <div className="form-step-heading"><span>STEP {step + 1} OF 4</span><h2>{steps[step]}</h2></div>
                {step === 0 && <div className="registration-fields">
                  <label className="span-two">Full name *<input required name="full_name" autoComplete="name" value={registration.full_name} onChange={(event) => setRegistration({ ...registration, full_name: event.target.value })} placeholder="Enter your full name" /></label>
                  <label>Phone number *<input required name="phone" type="tel" autoComplete="tel" value={registration.phone} onChange={(event) => setRegistration({ ...registration, phone: event.target.value })} placeholder="+234" /></label>
                  <label>Email <span className="field-note">(optional)</span><input name="email" type="email" autoComplete="email" value={registration.email} onChange={(event) => setRegistration({ ...registration, email: event.target.value })} placeholder="you@example.com" /></label>
                </div>}
                {step === 1 && <div className="registration-fields">
                  <label>Local Government Area *<SearchableLgaSelect required name="lga" value={registration.lga} onChange={(lga) => setRegistration({ ...registration, lga, ward: '' })} /></label>
                  <label>Ward *<select required name="ward" value={registration.ward} onChange={(event) => setRegistration({ ...registration, ward: event.target.value })} disabled={!registration.lga}><option value="">{registration.lga ? 'Select ward' : 'Select an LGA first'}</option>{wards.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="span-two">Support group <span className="field-note">(optional)</span><select name="support_group_id" value={registration.support_group_id} onChange={(event) => setRegistration({ ...registration, support_group_id: event.target.value })}><option value="">Register without a group</option>{supportGroups.map((group) => <option key={group.id} value={group.id}>{group.name} — {group.lga}</option>)}</select></label>
                  {groupsMessage && <p className="registration-hint span-two" role="status">{groupsMessage}</p>}
                  <label className="span-two">Polling unit <span className="field-note">(optional)</span><input name="polling_unit" value={registration.polling_unit} onChange={(event) => setRegistration({ ...registration, polling_unit: event.target.value })} placeholder="Polling unit or nearby landmark" /></label>
                  <p className="registration-hint span-two">Ward names shown are illustrative. Please confirm your ward with your local election authority.</p>
                </div>}
                {step === 2 && <div className="registration-fields">
                  <div className="privacy-callout span-two"><span>i</span><p>Your VIN is collected for campaign registration and is not shown to group coordinators. You can independently check your voter details on the official <a href="https://cvr.inecnigeria.org/vvs" target="_blank" rel="noreferrer">INEC Voter Verification Service</a>. This form does not send your information to INEC; automatic verification is unavailable because no authorised API is configured.</p></div>
                  <label className="span-two">Voter identification number (VIN) *<input required name="vin" autoComplete="off" value={registration.vin} onChange={(event) => setRegistration({ ...registration, vin: event.target.value })} placeholder="Enter the number on your voter's card" /></label>
                </div>}
                {step === 3 && <div className="consent-panel">
                  <div className="privacy-callout"><span>i</span><p>Registration is voluntary. Read the <a href="/privacy" target="_blank" rel="noreferrer">privacy notice</a> for what is collected, how the campaign uses it, who can see it, and how to make a data request.</p></div>
                  <fieldset className="consent-options">
                    <legend>Do you agree to the collection and use described in the privacy notice? *</legend>
                    <label><input required type="radio" name="individual_consent" checked={registration.consent === true} onChange={() => setRegistration({ ...registration, consent: true })} /><span>I agree and consent to submit my information, including my VIN, for the campaign purposes described.</span></label>
                    <label><input required type="radio" name="individual_consent" checked={registration.consent === false} onChange={() => setRegistration({ ...registration, consent: false })} /><span>I do not agree.</span></label>
                  </fieldset>
                  <p className="registration-hint">If you do not agree, the form will not submit. You can withdraw consent later by contacting the campaign.</p>
                </div>}
                {message && <p className={`registration-message ${message.toLowerCase().includes('could not') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('unavailable') || message.toLowerCase().includes('must agree') ? 'error' : ''}`} role="status">{message}</p>}
                <div className="registration-actions">{step > 0 && <button className="button button-text" type="button" onClick={() => { setMessage(''); setStep((current) => current - 1) }}>Back</button>}{step < steps.length - 1 ? <button className="button button-primary" type="submit">Continue</button> : <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit registration'}</button>}</div>
              </section>
            </form>
          </>
        ) : (
          <form className="registration-form" onSubmit={(event) => void registerGroup(event)}>
            <section className="registration-card">
              <div className="form-step-heading"><span>SUPPORT-GROUP ACCOUNT</span><h2>Coordinator details</h2></div>
              <div className="registration-fields">
                <label className="span-two">Support group name *<input required maxLength={120} value={groupAccount.name} onChange={(event) => setGroupAccount({ ...groupAccount, name: event.target.value })} autoComplete="organization" /></label>
                <label>Local Government Area *<SearchableLgaSelect required name="group_lga" value={groupAccount.lga} onChange={(lga) => setGroupAccount({ ...groupAccount, lga })} /></label>
                <label>Coordinator full name *<input required maxLength={120} value={groupAccount.coordinatorName} onChange={(event) => setGroupAccount({ ...groupAccount, coordinatorName: event.target.value })} autoComplete="name" /></label>
                <label>Coordinator phone number *<input required type="tel" autoComplete="tel" value={groupAccount.phone} onChange={(event) => setGroupAccount({ ...groupAccount, phone: event.target.value })} placeholder="+234" /></label>
                <label>Group login email *<input required type="email" autoComplete="email" value={groupAccount.email} onChange={(event) => setGroupAccount({ ...groupAccount, email: event.target.value })} /></label>
                <label className="span-two">Create password *<input required type="password" autoComplete="new-password" minLength={8} value={groupAccount.password} onChange={(event) => setGroupAccount({ ...groupAccount, password: event.target.value })} /><span className="field-note">Use at least 8 characters. Keep this login with the designated group coordinator.</span></label>
              </div>
              <div className="privacy-callout group-consent-note"><span>i</span><p>This creates one coordinator account for the group. The coordinator can add members after signing in. Each member's information, including VIN, must only be entered after that member has agreed. Group coordinators will not see members' full VINs.</p></div>
              <fieldset className="consent-options">
                <legend>Do you agree to the privacy notice and confirm you are authorised to register this group? *</legend>
                <label><input required type="radio" name="group_consent" checked={groupConsent === true} onChange={() => setGroupConsent(true)} /><span>I agree and confirm I am authorised to act for this group.</span></label>
                <label><input required type="radio" name="group_consent" checked={groupConsent === false} onChange={() => setGroupConsent(false)} /><span>I do not agree.</span></label>
              </fieldset>
              {message && <p className={`registration-message ${message.toLowerCase().includes('could not') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('unavailable') || message.toLowerCase().includes('must agree') ? 'error' : ''}`} role="status">{message}</p>}
              <div className="registration-actions"><a className="group-login-link" href="/group-dashboard">Already registered? Group login</a><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create group account'}</button></div>
            </section>
          </form>
        )}

        <p className="registration-privacy">By registering, you agree to the applicable data-use terms in our <a href="/privacy">privacy notice</a>. <a href="/group-dashboard">Support-group login</a></p>
      </main>
      <footer className="registration-footer">© 2026 {campaignName}. Registration is voluntary. <a href="/privacy">Privacy notice</a></footer>
    </div>
  )
}
