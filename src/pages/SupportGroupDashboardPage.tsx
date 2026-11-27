import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import SearchableLgaSelect from '../components/SearchableLgaSelect'
import { wards } from '../campaignData'
import { supabase } from '../supabase'
import './SupportGroupDashboardPage.css'

type SupportGroup = {
  id: number
  name: string
  lga: string
  status: 'pending' | 'approved' | 'suspended'
  logo_url: string | null
  photo_url: string | null
  logo_scale: number
  photo_scale: number
}

type GroupMember = {
  id: number
  full_name: string
  phone: string
  email: string | null
  lga: string
  ward: string
  vin_status: 'pending' | 'verified' | 'not_verified'
  created_at: string
}

function isSupportGroup(value: unknown): value is SupportGroup {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return Number.isSafeInteger(row.id) &&
    typeof row.name === 'string' &&
    typeof row.lga === 'string' &&
    (row.status === 'pending' || row.status === 'approved' || row.status === 'suspended') &&
    (row.logo_url === null || typeof row.logo_url === 'string') &&
    (row.photo_url === null || typeof row.photo_url === 'string') &&
    typeof row.logo_scale === 'number' && row.logo_scale >= 1 && row.logo_scale <= 2.5 &&
    typeof row.photo_scale === 'number' && row.photo_scale >= 1 && row.photo_scale <= 2.5
}

function isGroupMember(value: unknown): value is GroupMember {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return Number.isSafeInteger(row.id) &&
    typeof row.full_name === 'string' &&
    typeof row.phone === 'string' &&
    (row.email === null || typeof row.email === 'string') &&
    typeof row.lga === 'string' &&
    typeof row.ward === 'string' &&
    (row.vin_status === 'pending' || row.vin_status === 'verified' || row.vin_status === 'not_verified') &&
    typeof row.created_at === 'string'
}

export default function SupportGroupDashboardPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [group, setGroup] = useState<SupportGroup | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [memberConsent, setMemberConsent] = useState<boolean | null>(null)
  const [member, setMember] = useState({ full_name: '', phone: '', email: '', lga: '', ward: '', vin: '' })
  const [uploading, setUploading] = useState<'logo' | 'photo' | null>(null)
  const [logoScale, setLogoScale] = useState(1)
  const [photoScale, setPhotoScale] = useState(1)
  const [savingImageSettings, setSavingImageSettings] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return
    }

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession)
        setAuthReady(true)
      }
    })
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        console.error('Could not restore support-group session:', error.message)
        setMessage('Your group session could not be verified. Please sign in again.')
      }
      setSession(data.session)
      setAuthReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authReady || !session) {
      setGroup(null)
      setMembers([])
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    void (async () => {
      if (!supabase) return
      const { data: groupData, error: groupError } = await supabase
        .from('support_groups')
        .select('id,name,lga,status,logo_url,photo_url,logo_scale,photo_scale')
        .eq('owner_user_id', session.user.id)
        .maybeSingle()
      if (!active) return
      if (groupError || !groupData || !isSupportGroup(groupData)) {
        if (groupError) console.error('Could not load support-group account:', groupError.message)
        setMessage('No support-group account is linked to this login. Use the coordinator email that registered the group.')
        setGroup(null)
        setMembers([])
        setLoading(false)
        return
      }

      const { data: memberData, error: memberError } = await supabase
        .from('supporter_registrations')
        .select('id,full_name,phone,email,lga,ward,vin_status,created_at')
        .eq('support_group_id', groupData.id)
        .order('created_at', { ascending: false })
      if (!active) return
      if (memberError || !Array.isArray(memberData) || !memberData.every(isGroupMember)) {
        if (memberError) console.error('Could not load support-group members:', memberError.message)
        setMessage('The group member list could not be loaded. Please try again later.')
        setGroup(groupData)
        setMembers([])
        setLoading(false)
        return
      }

      setGroup(groupData)
      setLogoScale(groupData.logo_scale)
      setPhotoScale(groupData.photo_scale)
      setMembers(memberData)
      setMessage('')
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [authReady, session?.user.id])

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      setMessage('Group sign-in is unavailable until Supabase is configured.')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      setPassword('')
    } catch (error) {
      console.error('Support-group sign-in failed:', error)
      setMessage('Sign-in failed. Check the coordinator email and password, then try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const requestPasswordReset = async () => {
    if (!supabase || !email.trim()) {
      setMessage('Enter the coordinator email first to request a password reset.')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/group-dashboard`,
    })
    if (error) {
      console.error('Could not request support-group password reset:', error.message)
      setMessage('A password reset could not be requested. Please try again later.')
      return
    }
    setMessage('If the coordinator account exists, a password-reset link will be sent to its email.')
  }

  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Support-group sign-out failed:', error.message)
      setMessage('Could not sign out. Please try again.')
      return
    }
    setGroup(null)
    setMembers([])
    setMessage('')
  }

  const addMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !group) return
    if (memberConsent !== true) {
      setMessage('Confirm that this member has personally agreed before submitting their information.')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      const { error } = await supabase.rpc('register_group_member', {
        p_group_id: group.id,
        p_member_data: {
          full_name: member.full_name.trim(),
          phone: member.phone.trim(),
          email: member.email.trim(),
          lga: member.lga,
          ward: member.ward,
          vin: member.vin.trim(),
          consent: true,
        },
      })
      if (error) throw error
      setMember({ full_name: '', phone: '', email: '', lga: '', ward: '', vin: '' })
      setMemberConsent(null)
      setMessage('Member added. Their VIN is not visible in this dashboard.')
      const { data, error: reloadError } = await supabase
        .from('supporter_registrations')
        .select('id,full_name,phone,email,lga,ward,vin_status,created_at')
        .eq('support_group_id', group.id)
        .order('created_at', { ascending: false })
      if (reloadError) throw reloadError
      if (!Array.isArray(data) || !data.every(isGroupMember)) throw new Error('The group member list returned an invalid response.')
      setMembers(data)
    } catch (error) {
      console.error('Could not add group member:', error)
      setMessage('The member could not be added. Check the member details and consent, then try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const uploadGroupImage = async (kind: 'logo' | 'photo', file: File | undefined) => {
    if (!supabase || !session || !group || !file) return
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const extension = extensions[file.type]
    if (!extension || file.size > 5 * 1024 * 1024) {
      setMessage('Choose a JPG, PNG or WebP image smaller than 5 MB.')
      return
    }

    setUploading(kind)
    setMessage('')
    const filePath = `${session.user.id}/${group.id}/${kind}-${Date.now()}.${extension}`
    try {
      const { error: uploadError } = await supabase.storage
        .from('support-group-media')
        .upload(filePath, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('support-group-media').getPublicUrl(filePath)
      const update = kind === 'logo' ? { logo_url: data.publicUrl } : { photo_url: data.publicUrl }
      const { error: updateError } = await supabase
        .from('support_groups')
        .update(update)
        .eq('id', group.id)
        .eq('owner_user_id', session.user.id)
      if (updateError) throw updateError
      setGroup({ ...group, ...update })
      setMessage(kind === 'logo' ? 'Group logo uploaded.' : 'Group photo uploaded.')
    } catch (error) {
      console.error(`Could not upload group ${kind}:`, error)
      setMessage('The image could not be uploaded. Please try again later.')
    } finally {
      setUploading(null)
    }
  }

  const saveImageSettings = async () => {
    if (!supabase || !session || !group) return
    setSavingImageSettings(true)
    setMessage('')
    const { error } = await supabase
      .from('support_groups')
      .update({ logo_scale: logoScale, photo_scale: photoScale })
      .eq('id', group.id)
      .eq('owner_user_id', session.user.id)
    if (error) {
      console.error('Could not save support-group image framing:', error.message)
      setMessage('Image framing could not be saved. Please try again.')
    } else {
      setGroup({ ...group, logo_scale: logoScale, photo_scale: photoScale })
      setMessage('Group image framing saved.')
    }
    setSavingImageSettings(false)
  }

  return (
    <div className="group-dashboard-shell">
      <header className="group-dashboard-header">
        <a href="/" className="group-dashboard-brand"><strong>AKPANUDOEDHE</strong><small>SUPPORT-GROUP PORTAL</small></a>
        <a href="/">Back to campaign</a>
      </header>
      <main className="group-dashboard-main">
        {!supabase ? (
          <section className="group-panel"><h1>Group sign-in unavailable</h1><p>Supabase is not configured for this deployment. No group records are exposed.</p></section>
        ) : !session ? (
          <section className="group-panel group-login-panel">
            <span className="eyebrow">SUPPORT-GROUP COORDINATOR</span>
            <h1>Group dashboard</h1>
            <p>Sign in with the coordinator email used when the support group was registered.</p>
            <form className="group-form" onSubmit={(event) => void signIn(event)}>
              <label>Coordinator email<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              {message && <p className="group-message" role="status">{message}</p>}
              <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
              <button className="group-text-button" type="button" onClick={() => void requestPasswordReset()}>Forgot password?</button>
            </form>
            <p className="group-login-note">New group? <a href="/register?type=group">Register your support group</a>.</p>
          </section>
        ) : loading ? (
          <p className="group-loading" role="status">Loading your group dashboard…</p>
        ) : !group ? (
          <section className="group-panel"><h1>Group account not found</h1><p role="status">{message || 'This login is not linked to a support group.'}</p><button className="button button-outline" type="button" onClick={() => void signOut()}>Sign out</button></section>
        ) : (
          <>
            <section className="group-dashboard-heading">
              <div><span className="eyebrow">SUPPORT-GROUP DASHBOARD</span><h1>{group.name}</h1><p>{group.lga} Local Government Area</p></div>
              <button className="button button-outline" type="button" onClick={() => void signOut()}>Sign out</button>
            </section>
            <p className={`group-review-status status-${group.status}`} role="status">Group profile status: <strong>{group.status === 'approved' ? 'Approved and public' : group.status === 'suspended' ? 'Suspended' : 'Pending review'}</strong>{group.status === 'pending' && ' — public listing starts after campaign review.'}</p>
            <section className="group-dashboard-grid">
              <article className="group-panel group-count-panel"><span>REGISTERED MEMBERS</span><strong>{members.length}</strong><p>Only members registered to this group are listed here.</p></article>
              <article className="group-panel group-media-panel">
                <h2>Group identity</h2>
                <p>Set the cover photo and round logo shown on your group profile. Uploaded image files use public-read storage; use images intended for public display.</p>
                <div className="group-profile-preview">
                  <div className="group-cover-preview">
                    {group.photo_url ? <img src={group.photo_url} alt={`${group.name} cover`} style={{ transform: `scale(${photoScale})` }} /> : <span>Upload a group cover photo</span>}
                    <label className="group-cover-change">Change cover<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading !== null} onChange={(event) => { void uploadGroupImage('photo', event.target.files?.[0]); event.currentTarget.value = '' }} /></label>
                  </div>
                  <div className="group-logo-preview" style={{ width: `${88 * logoScale}px`, height: `${88 * logoScale}px` }}>
                    {group.logo_url ? <img src={group.logo_url} alt={`${group.name} logo`} /> : <span>Logo</span>}
                  </div>
                </div>
                <div className="group-image-controls">
                  <label>Cover photo zoom <input type="range" min="1" max="2.5" step="0.05" value={photoScale} onChange={(event) => setPhotoScale(Number(event.target.value))} /><span>{Math.round(photoScale * 100)}%</span></label>
                  <label>Logo size <input type="range" min="1" max="1.8" step="0.05" value={logoScale} onChange={(event) => setLogoScale(Number(event.target.value))} /><span>{Math.round(logoScale * 100)}%</span></label>
                </div>
                <div className="group-image-upload">
                  <label>Upload group logo<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading !== null} onChange={(event) => { void uploadGroupImage('logo', event.target.files?.[0]); event.currentTarget.value = '' }} /></label>
                </div>
                <button className="button button-outline group-save-images" type="button" onClick={() => void saveImageSettings()} disabled={savingImageSettings}>{savingImageSettings ? 'Saving…' : 'Save image framing'}</button>
                {uploading && <p className="group-message" role="status">Uploading {uploading}…</p>}
              </article>
            </section>
            <section className="group-panel group-members-panel">
              <div className="group-panel-heading"><div><h2>Group members</h2><p>VINs and passwords are never displayed here.</p></div></div>
              {message && <p className="group-message" role="status">{message}</p>}
              <form className="group-form group-member-form" onSubmit={(event) => void addMember(event)}>
                <label>Member full name *<input required maxLength={120} value={member.full_name} onChange={(event) => setMember({ ...member, full_name: event.target.value })} /></label>
                <label>Phone number *<input required type="tel" value={member.phone} onChange={(event) => setMember({ ...member, phone: event.target.value })} /></label>
                <label>Email <span>(optional)</span><input type="email" value={member.email} onChange={(event) => setMember({ ...member, email: event.target.value })} /></label>
                <label>Local Government Area *<SearchableLgaSelect required name="member_lga" value={member.lga} onChange={(lga) => setMember({ ...member, lga, ward: '' })} /></label>
                <label>Ward *<select required value={member.ward} onChange={(event) => setMember({ ...member, ward: event.target.value })} disabled={!member.lga}><option value="">Select ward</option>{wards.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Voter identification number (VIN) *<input required autoComplete="off" value={member.vin} onChange={(event) => setMember({ ...member, vin: event.target.value })} /></label>
                <fieldset className="group-member-consent">
                  <legend>Member consent *</legend>
                  <label><input required type="radio" name="member_consent" checked={memberConsent === true} onChange={() => setMemberConsent(true)} /><span>I confirm this member personally agreed to share these details, including their VIN, with the campaign.</span></label>
                  <label><input required type="radio" name="member_consent" checked={memberConsent === false} onChange={() => setMemberConsent(false)} /><span>I do not have their consent.</span></label>
                </fieldset>
                <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Adding member…' : 'Add member'}</button>
              </form>
              {members.length === 0 ? <p className="group-empty-state">No members have been added to this group yet.</p> : (
                <div className="group-member-list">
                  {members.map((item) => <article className="group-member-row" key={item.id}><strong>{item.full_name}</strong><span>{item.phone}</span><span>{item.lga}, {item.ward}</span><span>VIN: {item.vin_status === 'verified' ? 'Verified' : 'Pending verification'}</span></article>)}
                </div>
              )}
            </section>
            {message && <p className="group-message" role="status">{message}</p>}
            <p className="group-dashboard-privacy"><a href="/privacy">Privacy notice and data rights</a> · Do not share coordinator login details with group members.</p>
          </>
        )}
      </main>
    </div>
  )
}
