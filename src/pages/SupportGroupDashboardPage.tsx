import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import MobileBottomNav from '../components/MobileBottomNav'
import SearchableLgaSelect from '../components/SearchableLgaSelect'
import { lgas, wards } from '../campaignData'
import { supabase } from '../supabase'
import adcLogo from '../assets/adc-logo-from-campaign-poster.png'
import akwaIbomLogo from '../assets/akwa-ibom-state-emblem.png'
import leaderPortrait from '../assets/hero-candidate-1.webp'
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

type GroupMemberDetails = GroupMember & {
  nin_masked: string | null
  account_name: string | null
  account_number_masked: string | null
  bank_name: string | null
  residential_address: string | null
  polling_unit_address: string | null
  photo_path: string | null
  photo_url: string | null
}

type GroupMemberDraft = {
  full_name: string
  phone: string
  email: string
  lga: string
  ward: string
  vin: string
  nin: string
  account_name: string
  account_number: string
  bank_name: string
  residential_address: string
  polling_unit_address: string
}

type GroupMemberImportRow = {
  rowNumber: number
  draft: GroupMemberDraft
  photo: File | null
  errors: string[]
  imported: boolean
}

type GroupToast = {
  message: string
  tone: 'success' | 'error' | 'info'
}

const emptyGroupMember: GroupMemberDraft = {
  full_name: '',
  phone: '',
  email: '',
  lga: '',
  ward: '',
  vin: '',
  nin: '',
  account_name: '',
  account_number: '',
  bank_name: '',
  residential_address: '',
  polling_unit_address: '',
}

const memberCsvColumns = [
  'full_name',
  'phone',
  'email',
  'lga',
  'ward',
  'vin',
  'nin',
  'account_name',
  'account_number',
  'bank_name',
  'residential_address',
  'polling_unit_address',
] as const satisfies readonly (keyof GroupMemberDraft)[]

function parseMemberCsv(source: string): GroupMemberDraft[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let closedQuote = false
  const text = source.replace(/^\uFEFF/, '')

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
          closedQuote = true
        }
      } else {
        field += character
      }
    } else if (character === ',' || character === '\n' || character === '\r') {
      if (character === ',') {
        row.push(field)
        field = ''
        closedQuote = false
      } else {
        row.push(field)
        if (row.some((cell) => cell.trim())) rows.push(row)
        row = []
        field = ''
        closedQuote = false
        if (character === '\r' && text[index + 1] === '\n') index += 1
      }
    } else if (character === '"') {
      if (field.trim() || closedQuote) throw new Error('The CSV contains a misplaced quote.')
      field = ''
      quoted = true
    } else {
      if (closedQuote && !/\s/.test(character)) throw new Error('The CSV contains text after a closing quote.')
      if (!closedQuote) field += character
    }
  }
  if (quoted) throw new Error('The CSV has an unclosed quoted field.')
  row.push(field)
  if (row.some((cell) => cell.trim())) rows.push(row)
  if (rows.length < 2) throw new Error('The CSV must include the template header and at least one member row.')

  const headers = rows[0].map((header) => header.trim().toLowerCase())
  const columnIndexes = memberCsvColumns.map((column) => headers.indexOf(column))
  const missingColumns = memberCsvColumns.filter((_, index) => columnIndexes[index] === -1)
  if (missingColumns.length) throw new Error(`Missing CSV columns: ${missingColumns.join(', ')}.`)
  const duplicateColumns = memberCsvColumns.filter((column) => headers.filter((header) => header === column).length > 1)
  if (duplicateColumns.length) throw new Error(`Duplicate CSV columns: ${[...new Set(duplicateColumns)].join(', ')}.`)

  return rows.slice(1).map((cells, index) => {
    if (cells.slice(headers.length).some((cell) => cell.trim())) {
      throw new Error(`CSV row ${index + 2} has more columns than the template.`)
    }
    const values = memberCsvColumns.map((_, columnIndex) => (cells[columnIndexes[columnIndex]] ?? '').trim())
    return {
      full_name: values[0],
      phone: values[1],
      email: values[2],
      lga: values[3],
      ward: values[4],
      vin: values[5],
      nin: values[6],
      account_name: values[7],
      account_number: values[8],
      bank_name: values[9],
      residential_address: values[10],
      polling_unit_address: values[11],
    }
  })
}

function validateMemberDraft(draft: GroupMemberDraft, basicImport = false): string[] {
  const errors: string[] = []
  const phoneDigits = draft.phone.replace(/\D/g, '')
  if (draft.full_name.length < 2 || draft.full_name.length > 120) errors.push('Name must be 2–120 characters.')
  if (!/^[+0-9 ().-]{7,30}$/.test(draft.phone) || phoneDigits.length < 7) errors.push('Phone number is invalid.')
  if (draft.email && (draft.email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email))) errors.push('Email address is invalid.')
  if (!lgas.includes(draft.lga)) errors.push('Local Government Area is invalid.')
  if (basicImport ? draft.ward.length < 1 || draft.ward.length > 100 : !wards.includes(draft.ward)) errors.push('Ward is invalid.')
  if (basicImport) {
    if (draft.residential_address.length < 2 || draft.residential_address.length > 500) errors.push('Residential address must be 2–500 characters.')
    if (draft.polling_unit_address.length > 500) errors.push('Polling unit address must be 500 characters or fewer.')
    return errors
  }
  if (draft.vin.length < 5 || draft.vin.length > 40 || !/^[A-Za-z0-9 -]+$/.test(draft.vin)) errors.push('VIN must be 5–40 letters, numbers, spaces or hyphens.')
  if (!/^[0-9]{11}$/.test(draft.nin)) errors.push('NIN must contain 11 digits.')
  if (draft.account_name.length < 2 || draft.account_name.length > 120) errors.push('Account name must be 2–120 characters.')
  if (!/^[0-9]{10}$/.test(draft.account_number)) errors.push('Account number must contain 10 digits.')
  if (draft.bank_name.length < 2 || draft.bank_name.length > 120) errors.push('Bank name must be 2–120 characters.')
  if (draft.residential_address.length < 2 || draft.residential_address.length > 500) errors.push('Residential address must be 2–500 characters.')
  if (draft.polling_unit_address.length < 2 || draft.polling_unit_address.length > 500) errors.push('Polling unit address must be 2–500 characters.')
  return errors
}

function downloadMemberCsvTemplate() {
  const csv = `\uFEFF${memberCsvColumns.join(',')}\r\n`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'support-group-members-template.csv'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
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

function isGroupMemberDetails(value: unknown): value is Omit<GroupMemberDetails, 'photo_url'> {
  if (!isGroupMember(value)) return false
  const row = value as Record<string, unknown>
  const nullableStrings = [
    row.nin_masked,
    row.account_name,
    row.account_number_masked,
    row.bank_name,
    row.residential_address,
    row.polling_unit_address,
    row.photo_path,
  ]
  return nullableStrings.every((field) => field === null || typeof field === 'string')
}

function maskPhone(value: string): string {
  const suffix = value.replace(/\D/g, '').slice(-2)
  return suffix ? `••••••••${suffix}` : '••••'
}

function GroupMemberDetailView({
  member,
  onBack,
}: {
  member: GroupMemberDetails
  onBack: () => void
}) {
  const detailItems: Array<[string, string | null]> = [
    ['Phone number', maskPhone(member.phone)],
    ['Email', member.email],
    ['NIN', member.nin_masked],
    ['VIN', 'Protected'],
    ['VIN verification', member.vin_status === 'verified' ? 'Verified' : member.vin_status === 'not_verified' ? 'Not verified' : 'Pending'],
    ['Account name', member.account_name],
    ['Account number', member.account_number_masked],
    ['Bank', member.bank_name],
    ['Residential address', member.residential_address],
    ['Polling unit address', member.polling_unit_address],
  ]

  return (
    <section className="group-panel group-member-details-panel">
      <button className="group-detail-back" type="button" onClick={onBack}>← Back to group members</button>
      <div className="group-member-detail-card">
        <aside className="group-member-id-card" aria-label="Support-group member identity card">
          <div className="group-member-id-header">
            <img className="group-member-id-adc" src={adcLogo} alt="ADC" />
            <div>
              <span>SUPPORT-GROUP</span>
              <strong>IDENTITY CARD</strong>
            </div>
            <img className="group-member-id-state" src={akwaIbomLogo} alt="Akwa Ibom State" />
          </div>
          <div className="group-member-id-body">
            <div className="group-member-id-photo">
              {member.photo_url
                ? <img src={member.photo_url} alt={`${member.full_name} profile`} />
                : <span aria-hidden="true">{member.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>}
              <img className="group-member-id-leader" src={leaderPortrait} alt="Campaign leader" />
            </div>
            <div className="group-member-id-info">
              <span>MEMBER ID</span>
              <strong>SG-{String(member.id).padStart(6, '0')}</strong>
              <h2>{member.full_name}</h2>
              <p>{member.lga} · {member.ward}</p>
              <p className="group-member-id-phone">{maskPhone(member.phone)}</p>
            </div>
          </div>
          <div className="group-member-id-footer">
            <span>AKPANUDOEDHE FOR AKWA IBOM</span>
            <span className="group-member-id-status">{member.vin_status === 'verified' ? 'VERIFIED MEMBER' : 'MEMBER RECORD'}</span>
          </div>
        </aside>
        <div className="group-member-detail-content">
          <span className="eyebrow">MEMBER DETAILS</span>
          <h2>Personal and account information</h2>
          <div className="group-member-detail-grid">
            {detailItems.map(([label, value]) => (
              <div className="group-member-detail-field" key={label}>
                <span>{label}</span>
                <strong>{value || 'Not provided'}</strong>
              </div>
            ))}
          </div>
          <p className="group-member-sensitive-note">NIN, account number and VIN are protected. Only masked NIN and account details are shown here; the full VIN is never displayed.</p>
        </div>
      </div>
    </section>
  )
}

export default function SupportGroupDashboardPage() {
  const isMemberPreview = import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('previewMember') === '1'
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [group, setGroup] = useState<SupportGroup | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [toast, setToast] = useState<GroupToast | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [memberConsent, setMemberConsent] = useState<boolean | null>(null)
  const [member, setMember] = useState<GroupMemberDraft>(emptyGroupMember)
  const [memberPhoto, setMemberPhoto] = useState<File | null>(null)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [importMembersOpen, setImportMembersOpen] = useState(false)
  const [importRows, setImportRows] = useState<GroupMemberImportRow[]>([])
  const [importConsent, setImportConsent] = useState(false)
  const [importingMembers, setImportingMembers] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importTotal, setImportTotal] = useState(0)
  const [selectedMember, setSelectedMember] = useState<GroupMemberDetails | null>(null)
  const [loadingMemberId, setLoadingMemberId] = useState<number | null>(null)
  const [uploading, setUploading] = useState<'logo' | 'photo' | null>(null)
  const [logoScale, setLogoScale] = useState(1)
  const [photoScale, setPhotoScale] = useState(1)
  const [savingImageSettings, setSavingImageSettings] = useState(false)
  const [activeGroupNav, setActiveGroupNav] = useState('Overview')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsCloseButtonRef = useRef<HTMLButtonElement>(null)
  const [headerMenuOpen, setHeaderMenuOpen] = useState<'notifications' | 'profile' | null>(null)
  const headerMenusRef = useRef<HTMLDivElement>(null)

  const notify = useCallback((message: string, tone: GroupToast['tone'] = 'info') => {
    setToast({ message, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (settingsOpen) settingsCloseButtonRef.current?.focus()
    if (!settingsOpen && !addMemberOpen && !importMembersOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || submitting || importingMembers) return
      setSettingsOpen(false)
      setAddMemberOpen(false)
      setImportMembersOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [settingsOpen, addMemberOpen, importMembersOpen, importingMembers, submitting])

  useEffect(() => {
    if (!headerMenuOpen) return
    const closeMenu = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        setHeaderMenuOpen(null)
        return
      }
      if (event instanceof MouseEvent && event.target instanceof Node && !headerMenusRef.current?.contains(event.target)) {
        setHeaderMenuOpen(null)
      }
    }
    window.addEventListener('keydown', closeMenu)
    window.addEventListener('mousedown', closeMenu)
    return () => {
      window.removeEventListener('keydown', closeMenu)
      window.removeEventListener('mousedown', closeMenu)
    }
  }, [headerMenuOpen])

  useEffect(() => {
    if (isMemberPreview) {
      setAuthReady(true)
      return
    }
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
        notify('Your group session could not be verified. Please sign in again.', 'error')
      }
      setSession(data.session)
      setAuthReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [notify])

  useEffect(() => {
    if (isMemberPreview) {
      setLoading(false)
      return
    }
    if (!authReady || !session) {
      setGroup(null)
      setMembers([])
      setSelectedMember(null)
      setMember({ ...emptyGroupMember })
      setMemberPhoto(null)
      setMemberConsent(null)
      setAddMemberOpen(false)
      setImportMembersOpen(false)
      setImportRows([])
      setImportConsent(false)
      setSettingsOpen(false)
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
        const notice = groupError
          ? 'We could not verify this support-group account, so this session is being cleared. Please try again later.'
          : 'This account is not linked to a support group. Sign in with the coordinator email used to register the group.'
        notify(notice, 'error')
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
        if (signOutError) {
          console.error('Could not clear an unlinked support-group session:', signOutError.message)
          notify('This account is not linked to a support group, and its session could not be cleared automatically. Close this tab and contact the group coordinator.', 'error')
        } else if (active) {
          setSession(null)
        }
        if (active) {
          setGroup(null)
          setMembers([])
          setLoading(false)
        }
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
        notify('Your group is verified, but its member list could not be loaded. Please try again later.', 'error')
        setGroup(groupData)
        setMembers([])
        setLoading(false)
        return
      }

      setGroup(groupData)
      setLogoScale(groupData.logo_scale)
      setPhotoScale(groupData.photo_scale)
      setMembers(memberData)
      setToast(null)
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [authReady, session?.user.id, isMemberPreview, notify])

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      notify('Group sign-in is unavailable until Supabase is configured.', 'error')
      return
    }
    setSubmitting(true)
    setToast(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      setPassword('')
    } catch (error) {
      console.error('Support-group sign-in failed:', error)
      notify('Sign-in failed. Check the coordinator email and password, then try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const requestPasswordReset = async () => {
    if (!supabase || !email.trim()) {
      notify('Enter the coordinator email first to request a password reset.', 'info')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/group-dashboard`,
    })
    if (error) {
      console.error('Could not request support-group password reset:', error.message)
      notify('A password reset could not be requested. Please try again later.', 'error')
      return
    }
    notify('If the coordinator account exists, a password-reset link will be sent to its email.', 'info')
  }

  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Support-group sign-out failed:', error.message)
      notify('Could not sign out. Please try again.', 'error')
      return
    }
    setGroup(null)
    setMembers([])
    setSelectedMember(null)
    setMember({ ...emptyGroupMember })
    setMemberPhoto(null)
    setMemberConsent(null)
    setAddMemberOpen(false)
    setImportMembersOpen(false)
    setImportRows([])
    setImportConsent(false)
    setSettingsOpen(false)
    setToast(null)
  }

  const saveGroupMemberRecord = async (draft: GroupMemberDraft, photo: File, basicImport = false) => {
    if (!supabase || !group || !session) throw new Error('Group session is unavailable.')
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const extension = extensions[photo.type]
    if (!extension || photo.size > 5 * 1024 * 1024) {
      throw new Error('Choose a JPG, PNG or WebP member photo smaller than 5 MB.')
    }

    const photoPath = `${session.user.id}/${group.id}/${crypto.randomUUID()}.${extension}`
    let photoUploaded = false
    let memberSaved = false
    try {
      const photoBucket = basicImport ? 'support-group-member-import-photos' : 'support-group-member-photos'
      const { error: uploadError } = await supabase.storage
        .from(photoBucket)
        .upload(photoPath, photo, { contentType: photo.type, upsert: false })
      if (uploadError) throw uploadError
      photoUploaded = true

      const rpcName = basicImport
        ? 'register_basic_support_group_member'
        : 'register_group_member_with_private_details'
      const memberData = basicImport
        ? {
            full_name: draft.full_name.trim(),
            phone: draft.phone.trim(),
            email: draft.email.trim(),
            lga: draft.lga,
            ward: draft.ward,
            residential_address: draft.residential_address.trim(),
            polling_unit_address: draft.polling_unit_address.trim(),
            photo_path: photoPath,
            consent: true,
          }
        : {
          full_name: draft.full_name.trim(),
          phone: draft.phone.trim(),
          email: draft.email.trim(),
          lga: draft.lga,
          ward: draft.ward,
          vin: draft.vin.trim(),
          nin: draft.nin.trim(),
          account_name: draft.account_name.trim(),
          account_number: draft.account_number.trim(),
          bank_name: draft.bank_name.trim(),
          residential_address: draft.residential_address.trim(),
          polling_unit_address: draft.polling_unit_address.trim(),
          photo_path: photoPath,
          consent: true,
        }
      const { error } = await supabase.rpc(rpcName, {
        p_group_id: group.id,
        p_member_data: memberData,
      })
      if (error) throw error
      memberSaved = true
    } catch (error) {
      if (photoUploaded && !memberSaved) {
        const { error: cleanupError } = await supabase.storage
          .from(basicImport ? 'support-group-member-import-photos' : 'support-group-member-photos')
          .remove([photoPath])
        if (cleanupError) console.error('Could not remove the unused member photo:', cleanupError.message)
      }
      throw error
    }
  }

  const addMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    if (!supabase || !group || !session) return
    if (memberConsent !== true) {
      notify('Confirm that this member has personally agreed before submitting their information.', 'error')
      return
    }
    if (!memberPhoto) {
      notify('Upload a member photo before submitting the registration.', 'error')
      return
    }

    setSubmitting(true)
    setToast(null)
    let memberSaved = false
    try {
      await saveGroupMemberRecord(member, memberPhoto)
      memberSaved = true
      setMember({ ...emptyGroupMember })
      setMemberPhoto(null)
      setMemberConsent(null)
      setAddMemberOpen(false)
      form.reset()
      setSelectedMember(null)
      notify('Member added. Sensitive identifiers remain masked in the dashboard.', 'success')
      const { data, error: reloadError } = await supabase
        .from('supporter_registrations')
        .select('id,full_name,phone,email,lga,ward,vin_status,created_at')
        .eq('support_group_id', group.id)
        .order('created_at', { ascending: false })
      if (reloadError) throw reloadError
      if (!Array.isArray(data) || !data.every(isGroupMember)) throw new Error('The group member list returned an invalid response.')
      setMembers(data)
    } catch (error) {
      console.error('Could not complete group-member registration:', error instanceof Error ? error.message : 'Unknown error')
      notify(memberSaved
        ? 'The member was added, but the list could not be refreshed. Reload the page to confirm.'
        : error instanceof Error && error.message.includes('member photo')
          ? error.message
          : 'The member could not be added. Check the details and consent, and confirm the latest database schema and private photo storage are installed.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const readMemberCsv = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      notify('Choose a CSV file smaller than 5 MB.', 'error')
      return
    }
    try {
      const drafts = parseMemberCsv(await file.text())
      setImportRows(drafts.map((draft, index) => ({
        rowNumber: index + 2,
        draft,
        photo: null,
        errors: validateMemberDraft(draft, true),
        imported: false,
      })))
      setImportTotal(drafts.length)
      setImportConsent(false)
      setImportProgress(0)
      setImportMembersOpen(true)
      notify(`${drafts.length} member row${drafts.length === 1 ? '' : 's'} loaded. Attach a photo to each row before importing.`, 'info')
    } catch (error) {
      console.error('Could not read the group member CSV:', error)
      notify(error instanceof Error ? error.message : 'The CSV file could not be read. Download the template and try again.', 'error')
    }
  }

  const importGroupMembers = async () => {
    if (!supabase || !group || !session) return
    if (!importConsent) {
      notify('Confirm that every person in this CSV has personally agreed to share their information.', 'error')
      return
    }
    const pending = importRows.filter((row) => !row.imported)
    if (!pending.length) {
      notify('There are no member rows waiting to be imported.', 'info')
      return
    }

    const readyRows = pending.map((row) => {
      const errors = [...validateMemberDraft(row.draft, true)]
      if (!row.photo) errors.push('Attach a member photo.')
      else if (!['image/jpeg', 'image/png', 'image/webp'].includes(row.photo.type) || row.photo.size > 5 * 1024 * 1024) {
        errors.push('Photo must be JPG, PNG or WebP under 5 MB.')
      }
      return { ...row, errors }
    })
    setImportRows((rows) => rows.map((row) => readyRows.find((candidate) => candidate.rowNumber === row.rowNumber) ?? row))
    const invalidCount = readyRows.filter((row) => row.errors.length > 0).length
    if (invalidCount) {
      notify(`${invalidCount} row${invalidCount === 1 ? '' : 's'} need attention before import.`, 'error')
      return
    }

    setImportingMembers(true)
    setImportProgress(0)
    setImportTotal(readyRows.length)
    setToast(null)
    let importedCount = 0
    let failedCount = 0
    let refreshFailed = false
    for (let index = 0; index < readyRows.length; index += 1) {
      const row = readyRows[index]
      if (!row.photo) continue
      try {
        await saveGroupMemberRecord(row.draft, row.photo, true)
        importedCount += 1
        setImportRows((rows) => rows.map((current) => current.rowNumber === row.rowNumber
          ? { ...current, imported: true, errors: [] }
          : current))
      } catch (error) {
        failedCount += 1
        console.error(`Could not import member CSV row ${row.rowNumber}:`, error)
        setImportRows((rows) => rows.map((current) => current.rowNumber === row.rowNumber
          ? { ...current, errors: ['Import failed. Check this row and try again.'] }
          : current))
      } finally {
        setImportProgress(index + 1)
      }
    }

    if (importedCount > 0) {
      const { data, error } = await supabase
        .from('supporter_registrations')
        .select('id,full_name,phone,email,lga,ward,vin_status,created_at')
        .eq('support_group_id', group.id)
        .order('created_at', { ascending: false })
      if (error || !Array.isArray(data) || !data.every(isGroupMember)) {
        if (error) console.error('Could not refresh group members after import:', error.message)
        refreshFailed = true
      } else {
        setMembers(data)
      }
    }

    setImportingMembers(false)
    if (failedCount) {
      notify(`${importedCount} imported; ${failedCount} failed.${refreshFailed ? ' The member list also could not be refreshed; reload to confirm saved records.' : ' Failed rows remain available to retry.'}`, 'error')
    } else if (refreshFailed) {
      notify(`${importedCount} imported, but the member list could not be refreshed. Reload the page to confirm.`, 'error')
    } else {
      setImportMembersOpen(false)
      setImportRows([])
      setImportConsent(false)
      notify(`${importedCount} member${importedCount === 1 ? '' : 's'} imported successfully.`, 'success')
    }
  }

  const openMemberDetails = async (item: GroupMember) => {
    if (!supabase || !group) return
    setLoadingMemberId(item.id)
    setToast(null)
    try {
      const { data, error } = await supabase.rpc('get_group_member_details', {
        p_group_id: group.id,
        p_registration_id: item.id,
      })
      if (error) throw error
      if (!Array.isArray(data) || data.length !== 1 || !isGroupMemberDetails(data[0])) {
        throw new Error('Member detail response was invalid.')
      }

      const details = data[0]
      let photoUrl: string | null = null
      if (details.photo_path) {
        const { data: signedPhoto, error: photoError } = await supabase.storage
          .from('support-group-member-photos')
          .createSignedUrl(details.photo_path, 300)
        if (!photoError && signedPhoto?.signedUrl) {
          photoUrl = signedPhoto.signedUrl
        } else {
          const { data: publicPhoto } = supabase.storage
            .from('support-group-member-import-photos')
            .getPublicUrl(details.photo_path)
          photoUrl = publicPhoto.publicUrl
        }
      }
      setSelectedMember({ ...details, photo_url: photoUrl })
    } catch {
      console.error('Could not load group-member details.')
      notify('Member details could not be loaded. Please try again later.', 'error')
    } finally {
      setLoadingMemberId(null)
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
      notify('Choose a JPG, PNG or WebP image smaller than 5 MB.', 'error')
      return
    }

    setUploading(kind)
    setToast(null)
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
      notify(kind === 'logo' ? 'Group logo uploaded.' : 'Group photo uploaded.', 'success')
    } catch (error) {
      console.error(`Could not upload group ${kind}:`, error)
      notify('The image could not be uploaded. Please try again later.', 'error')
    } finally {
      setUploading(null)
    }
  }

  const saveImageSettings = async () => {
    if (!supabase || !session || !group) return
    setSavingImageSettings(true)
    setToast(null)
    const { error } = await supabase
      .from('support_groups')
      .update({ logo_scale: logoScale, photo_scale: photoScale })
      .eq('id', group.id)
      .eq('owner_user_id', session.user.id)
    if (error) {
      console.error('Could not save support-group image framing:', error.message)
      notify('Image framing could not be saved. Please try again.', 'error')
    } else {
      setGroup({ ...group, logo_scale: logoScale, photo_scale: photoScale })
      notify('Group image framing saved.', 'success')
      setSettingsOpen(false)
    }
    setSavingImageSettings(false)
  }

  const navigateToGroupSection = (id: string, label: string) => {
    setActiveGroupNav(label)
    if (selectedMember) setSelectedMember(null)
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  if (isMemberPreview) {
    const previewMember: GroupMemberDetails = {
      id: 1,
      full_name: 'Sample Member',
      phone: '+234 800 000 0042',
      email: 'member@example.test',
      lga: 'Uyo',
      ward: 'Ward 1',
      vin_status: 'pending',
      created_at: '2026-11-27T00:00:00.000Z',
      nin_masked: '*******4321',
      account_name: 'Sample Member',
      account_number_masked: '******6789',
      bank_name: 'Example Bank',
      residential_address: 'Sample Street, Uyo',
      polling_unit_address: 'Sample Polling Unit, Ward 1',
      photo_path: null,
      photo_url: null,
    }

    return (
      <div className="group-dashboard-shell">
        <header className="group-dashboard-header">
          <a href="/" className="group-dashboard-brand"><strong>AKPANUDOEDHE</strong><small>SUPPORT-GROUP PORTAL</small></a>
          <a href="/group-dashboard">Exit preview</a>
        </header>
        <main className="group-dashboard-main">
          <section className="group-dashboard-heading">
            <div><span className="eyebrow">SUPPORT-GROUP DASHBOARD · PREVIEW</span><h1>Sample Support Group</h1><p>Uyo Local Government Area</p></div>
          </section>
          <p className="group-review-status">Development preview using synthetic member data only.</p>
          <GroupMemberDetailView member={previewMember} onBack={() => window.location.assign('/group-dashboard')} />
        </main>
        <MobileBottomNav
          items={[
            { label: 'Home', icon: '⌂', href: '/' },
            { label: 'Join', icon: '+', href: '/register?type=group' },
            { label: 'Group login', icon: '◎', href: '/group-dashboard' },
          ]}
          moreItems={[
            { label: 'Campaign website', icon: '⌂', href: '/' },
            { label: 'Privacy notice', icon: '◉', href: '/privacy' },
            { label: 'Exit preview', icon: '↪', href: '/group-dashboard' },
          ]}
          activeLabel="Group login"
        />
      </div>
    )
  }

  return (
    <div className="group-dashboard-shell">
      <header className="group-dashboard-header">
        <a href="/" className="group-dashboard-brand"><strong>AKPANUDOEDHE</strong><small>SUPPORT-GROUP PORTAL</small></a>
        <div className="group-header-actions">
          {group && (
            <div className="group-header-menus" ref={headerMenusRef}>
              <div className="group-header-menu">
                <button
                  className="group-header-icon-button"
                  type="button"
                  aria-label="Notifications"
                  aria-expanded={headerMenuOpen === 'notifications'}
                  onClick={() => setHeaderMenuOpen((open) => open === 'notifications' ? null : 'notifications')}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
                </button>
                {headerMenuOpen === 'notifications' && (
                  <section className="group-header-dropdown group-notifications-dropdown" aria-label="Group notifications and activity">
                    <h2>Notifications</h2>
                    <p className={`group-header-status status-${group.status}`}>
                      Group profile: <strong>{group.status === 'approved' ? 'Approved and public' : group.status === 'suspended' ? 'Suspended' : 'Pending review'}</strong>
                    </p>
                    <p>{members.length} registered member{members.length === 1 ? '' : 's'} in this group.</p>
                    <h3>Recent member activity</h3>
                    {members.length ? members.slice(0, 3).map((item) => (
                      <p className="group-header-activity" key={item.id}>
                        <strong>{item.full_name}</strong><span>Added {new Date(item.created_at).toLocaleDateString('en-NG')}</span>
                      </p>
                    )) : <p>No members have been added yet.</p>}
                  </section>
                )}
              </div>
              <div className="group-header-menu">
                <button
                  className="group-profile-menu-button"
                  type="button"
                  aria-label="Open group profile menu"
                  aria-expanded={headerMenuOpen === 'profile'}
                  onClick={() => setHeaderMenuOpen((open) => open === 'profile' ? null : 'profile')}
                >
                  {group.logo_url
                    ? <img className="group-profile-avatar" src={group.logo_url} alt="" />
                    : <span className="group-profile-avatar" aria-hidden="true">{group.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>}
                  <span className="group-profile-menu-name">{group.name}</span>
                  <span aria-hidden="true">⌄</span>
                </button>
                {headerMenuOpen === 'profile' && (
                  <div className="group-header-dropdown group-profile-dropdown" aria-label="Group profile menu">
                    <strong>{group.name}</strong>
                    <button type="button" onClick={() => { setHeaderMenuOpen(null); setSettingsOpen(true) }}>Group settings</button>
                    <a href="/privacy">Privacy notice</a>
                    <button type="button" onClick={() => void signOut()}>Sign out</button>
                  </div>
                )}
              </div>
            </div>
          )}
          {!session && authReady && <a href="/">Back to campaign</a>}
        </div>
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
              <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
              <button className="group-text-button" type="button" onClick={() => void requestPasswordReset()}>Forgot password?</button>
            </form>
            <p className="group-login-note">New group? <a href="/register?type=group">Register your support group</a>.</p>
          </section>
        ) : loading ? (
          <p className="group-loading" role="status">Loading your group dashboard…</p>
        ) : !group ? (
          <section className="group-panel"><h1>Verifying group access</h1><p role="status">Checking that this login belongs to a registered support-group coordinator…</p></section>
        ) : (
          <>
            <section className="group-dashboard-grid">
              <article className="group-panel group-dashboard-identity" id="group-identity">
                <div className="group-dashboard-cover">
                  {group.photo_url ? <img src={group.photo_url} alt={`${group.name} cover`} style={{ transform: `scale(${photoScale})` }} /> : <span>Add a cover photo in group settings</span>}
                </div>
                <div className="group-dashboard-identity-row">
                  <div className="group-logo-preview" style={{ width: `${76 * logoScale}px`, height: `${76 * logoScale}px` }}>
                    {group.logo_url ? <img src={group.logo_url} alt={`${group.name} logo`} /> : <span>Logo</span>}
                  </div>
                  <div className="group-dashboard-identity-copy">
                    <span className="eyebrow">SUPPORT-GROUP DASHBOARD</span>
                    <h1>{group.name}</h1>
                    <p>{group.lga} Local Government Area</p>
                    <p className={`group-identity-status status-${group.status}`} role="status">
                      {group.status === 'approved' ? 'Approved and public' : group.status === 'suspended' ? 'Suspended' : 'Pending review'}
                      {group.status === 'pending' && ' — public listing starts after campaign review.'}
                    </p>
                  </div>
                </div>
              </article>
              <article className="group-panel group-count-panel" id="group-overview"><span>MEMBER OVERVIEW</span><strong>{members.length}</strong><p>Registered members in this support group.</p></article>
            </section>
            {selectedMember ? (
              <GroupMemberDetailView member={selectedMember} onBack={() => setSelectedMember(null)} />
            ) : (
              <>
                <section className="group-panel group-members-panel" id="group-members">
                  <div className="group-panel-heading">
                    <div className="group-member-title">
                      <span className="eyebrow">MEMBER DIRECTORY</span>
                      <div className="group-member-title-row"><h2>Group members</h2><span className="group-member-count">{members.length} member{members.length === 1 ? '' : 's'}</span></div>
                      <p>Members registered or imported to this group appear here. Sensitive details stay protected.</p>
                    </div>
                    <div className="group-member-actions">
                      <button className="button button-primary" type="button" onClick={() => setAddMemberOpen(true)}>+ Add member</button>
                      <button className="button button-outline" type="button" onClick={() => setImportMembersOpen(true)}>Import CSV</button>
                    </div>
                  </div>
                  {members.length === 0 ? (
                    <div className="group-empty-state">
                      <span className="group-empty-icon" aria-hidden="true">♙</span>
                      <div><strong>Your member list is empty</strong><p>Once a member is registered or imported, their record will appear in this directory.</p></div>
                    </div>
                  ) : (
                    <div className="group-member-table-wrap" role="region" aria-label="Group member table" tabIndex={0}>
                      <table className="group-member-table">
                        <thead><tr><th scope="col">Member</th><th scope="col">Phone</th><th scope="col">Location</th><th scope="col">VIN verification</th><th scope="col"><span className="group-visually-hidden">Actions</span></th></tr></thead>
                        <tbody>
                          {members.map((item) => (
                            <tr key={item.id}>
                              <th scope="row"><strong>{item.full_name}</strong><small>Added {new Date(item.created_at).toLocaleDateString('en-NG')}</small></th>
                              <td>{maskPhone(item.phone)}</td>
                              <td>{item.lga}, {item.ward}</td>
                              <td><span className={`group-member-status status-${item.vin_status}`}>{item.vin_status === 'verified' ? 'Verified' : item.vin_status === 'not_verified' ? 'Not verified' : 'Pending'}</span></td>
                              <td><button className="group-member-open" type="button" disabled={loadingMemberId !== null} onClick={() => void openMemberDetails(item)} aria-label={`View details for ${item.full_name}`}>{loadingMemberId === item.id ? 'Loading…' : 'View details →'}</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
            <p className="group-dashboard-privacy"><a href="/privacy">Privacy notice and data rights</a> · Do not share coordinator login details with group members.</p>
          </>
        )}
      </main>
      {group && addMemberOpen && (
        <div className="group-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddMemberOpen(false) }}>
          <section className="group-modal group-add-member-modal" role="dialog" aria-modal="true" aria-labelledby="add-member-heading">
            <header className="group-modal-heading">
              <div><span className="eyebrow">GROUP MEMBERS</span><h2 id="add-member-heading">Add a member</h2></div>
              <button type="button" className="group-modal-close" onClick={() => setAddMemberOpen(false)} aria-label="Close add member form">×</button>
            </header>
            <p>Enter the member details and confirm that they have agreed to share this information.</p>
            <form className="group-form group-member-form" id="group-add-member" onSubmit={(event) => void addMember(event)}>
              <label>Member full name *<input required maxLength={120} value={member.full_name} onChange={(event) => setMember({ ...member, full_name: event.target.value })} /></label>
              <label>Phone number *<input required type="tel" value={member.phone} onChange={(event) => setMember({ ...member, phone: event.target.value })} /></label>
              <label>Email <span>(optional)</span><input type="email" value={member.email} onChange={(event) => setMember({ ...member, email: event.target.value })} /></label>
              <label>Local Government Area *<SearchableLgaSelect required name="member_lga" value={member.lga} onChange={(lga) => setMember({ ...member, lga, ward: '' })} /></label>
              <label>Ward *<select required value={member.ward} onChange={(event) => setMember({ ...member, ward: event.target.value })} disabled={!member.lga}><option value="">Select ward</option>{wards.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Voter identification number (VIN) *<input required autoComplete="off" minLength={5} maxLength={40} pattern="[A-Za-z0-9 -]{5,40}" value={member.vin} onChange={(event) => setMember({ ...member, vin: event.target.value })} /></label>
              <label>National identification number (NIN) *<input required inputMode="numeric" autoComplete="off" maxLength={11} pattern="[0-9]{11}" value={member.nin} onChange={(event) => setMember({ ...member, nin: event.target.value })} /></label>
              <label>Account name *<input required maxLength={120} value={member.account_name} onChange={(event) => setMember({ ...member, account_name: event.target.value })} /></label>
              <label>Account number *<input required inputMode="numeric" autoComplete="off" maxLength={10} pattern="[0-9]{10}" value={member.account_number} onChange={(event) => setMember({ ...member, account_number: event.target.value })} /></label>
              <label>Bank *<input required maxLength={120} value={member.bank_name} onChange={(event) => setMember({ ...member, bank_name: event.target.value })} /></label>
              <label>Residential address *<input required maxLength={500} value={member.residential_address} onChange={(event) => setMember({ ...member, residential_address: event.target.value })} /></label>
              <label>Polling unit address *<input required maxLength={500} value={member.polling_unit_address} onChange={(event) => setMember({ ...member, polling_unit_address: event.target.value })} /></label>
              <label className="group-member-photo-field">Member photo *<input required type="file" accept="image/png,image/jpeg,image/webp" disabled={submitting} onChange={(event) => setMemberPhoto(event.target.files?.[0] ?? null)} /><span>Private to your group. JPG, PNG or WebP, max 5 MB.</span></label>
              <fieldset className="group-member-consent">
                <legend>Member consent *</legend>
                <label><input required type="radio" name="member_consent" checked={memberConsent === true} onChange={() => setMemberConsent(true)} /><span>I confirm this member personally agreed to share their photo, contact and location details, VIN, NIN and bank details with the campaign for group membership records, and has read the <a href="/privacy" target="_blank" rel="noreferrer">privacy notice</a>.</span></label>
                <label><input required type="radio" name="member_consent" checked={memberConsent === false} onChange={() => setMemberConsent(false)} /><span>I do not have their consent.</span></label>
              </fieldset>
              <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Adding member…' : 'Add member'}</button>
            </form>
          </section>
        </div>
      )}
      {group && importMembersOpen && (
        <div className="group-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !importingMembers) setImportMembersOpen(false) }}>
          <section className="group-modal group-import-modal" role="dialog" aria-modal="true" aria-labelledby="import-members-heading">
            <header className="group-modal-heading">
              <div><span className="eyebrow">BULK MEMBER IMPORT</span><h2 id="import-members-heading">Import members from CSV</h2></div>
              <button type="button" className="group-modal-close" onClick={() => setImportMembersOpen(false)} disabled={importingMembers} aria-label="Close CSV import">×</button>
            </header>
            <p>Download the template, fill it in with Excel, save it as CSV, then upload it here. The file contains sensitive member information; store and share it securely.</p>
            <div className="group-import-tools">
              <button className="button button-outline" type="button" onClick={downloadMemberCsvTemplate}>Download CSV template</button>
              <label className="button button-outline group-csv-file-button">Choose populated CSV<input type="file" accept=".csv,text/csv" disabled={importingMembers} onChange={(event) => { void readMemberCsv(event.target.files?.[0]); event.currentTarget.value = '' }} /></label>
            </div>
            <p className="group-import-note">Keep the template column headings unchanged. Email is optional; all other columns are required. Every row needs a separate JPG, PNG or WebP member photo (max 5 MB).</p>
            {importRows.length > 0 && (
              <>
                <div className="group-import-row-list">
                  {importRows.map((row) => (
                    <article className={`group-import-row${row.imported ? ' imported' : ''}`} key={row.rowNumber}>
                      <div className="group-import-row-summary">
                        <strong>Row {row.rowNumber}: {row.draft.full_name || 'Name missing'}</strong>
                        <span>{row.draft.lga || 'LGA missing'}{row.draft.ward ? ` · ${row.draft.ward}` : ''}</span>
                        {row.imported ? <small>Imported</small> : row.errors.length > 0 ? <small className="group-import-error">{row.errors.join(' ')}</small> : <small>Ready for photo</small>}
                      </div>
                      {!row.imported && (
                        <label className="group-import-photo">Member photo *<input type="file" accept="image/png,image/jpeg,image/webp" disabled={importingMembers} onChange={(event) => {
                          const photo = event.target.files?.[0] ?? null
                          setImportRows((rows) => rows.map((item) => item.rowNumber === row.rowNumber ? { ...item, photo, errors: validateMemberDraft(item.draft, true) } : item))
                        }} />{row.photo && <span>{row.photo.name}</span>}</label>
                      )}
                    </article>
                  ))}
                </div>
                <label className="group-import-consent"><input type="checkbox" checked={importConsent} disabled={importingMembers} onChange={(event) => setImportConsent(event.target.checked)} /><span>I confirm that every person listed in this CSV has personally agreed to share the information and photo provided, and has read the <a href="/privacy" target="_blank" rel="noreferrer">privacy notice</a>.</span></label>
                {importingMembers && <p className="group-message" role="status">Importing row {importProgress} of {importTotal}…</p>}
                <button className="button button-primary group-import-submit" type="button" disabled={importingMembers || !importConsent || importRows.every((row) => row.imported)} onClick={() => void importGroupMembers()}>
                  {importingMembers ? 'Importing…' : `Import ${importRows.filter((row) => !row.imported).length} member${importRows.filter((row) => !row.imported).length === 1 ? '' : 's'}`}
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {group && settingsOpen && (
        <div className="group-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false) }}>
          <section className="group-modal group-settings-modal" role="dialog" aria-modal="true" aria-labelledby="group-settings-heading">
            <header className="group-modal-heading">
              <div><span className="eyebrow">SUPPORT-GROUP PROFILE</span><h2 id="group-settings-heading">Group settings</h2></div>
              <button ref={settingsCloseButtonRef} type="button" className="group-modal-close" onClick={() => setSettingsOpen(false)} aria-label="Close group settings">×</button>
            </header>
            <p>Update the cover photo, group logo and image framing. Uploaded group images are public; use images intended for public display.</p>
            <div className="group-profile-preview group-settings-preview">
              <div className="group-cover-preview">
                {group.photo_url ? <img src={group.photo_url} alt={`${group.name} cover`} style={{ transform: `scale(${photoScale})` }} /> : <span>Upload a group cover photo</span>}
                <label className="group-cover-change">Change cover<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading !== null} onChange={(event) => { void uploadGroupImage('photo', event.target.files?.[0]); event.currentTarget.value = '' }} /></label>
              </div>
              <div className="group-logo-preview" style={{ width: `${76 * logoScale}px`, height: `${76 * logoScale}px` }}>
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
            <button className="button button-primary group-save-images" type="button" onClick={() => void saveImageSettings()} disabled={savingImageSettings}>{savingImageSettings ? 'Saving…' : 'Save image framing'}</button>
            {uploading && <p className="group-message" role="status">Uploading {uploading}…</p>}
          </section>
        </div>
      )}
      {toast && (
        <div className={`group-toast group-toast-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'} aria-live={toast.tone === 'error' ? 'assertive' : 'polite'} aria-atomic="true">
          <p>{toast.message}</p>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification">×</button>
        </div>
      )}
      <MobileBottomNav
        items={group ? [
          { label: 'Overview', icon: '⌂', onClick: () => navigateToGroupSection('group-overview', 'Overview') },
          { label: 'Members', icon: '♙', onClick: () => navigateToGroupSection('group-members', 'Members') },
          { label: 'Add member', icon: '+', onClick: () => { setActiveGroupNav('Add member'); setAddMemberOpen(true) } },
        ] : [
          { label: 'Home', icon: '⌂', href: '/' },
          { label: 'Join', icon: '+', href: '/register?type=group' },
          { label: 'Group login', icon: '◎', href: '/group-dashboard' },
        ]}
        moreItems={group ? [
          { label: 'Group settings', icon: '⚙', onClick: () => { setActiveGroupNav('Group settings'); setSettingsOpen(true) } },
          { label: 'Privacy notice', icon: '◉', href: '/privacy' },
          { label: 'Campaign website', icon: '⌂', href: '/' },
          { label: 'Sign out', icon: '↪', onClick: () => void signOut() },
        ] : [
          { label: 'Campaign website', icon: '⌂', href: '/' },
          { label: 'Privacy notice', icon: '◉', href: '/privacy' },
          { label: 'Supporter registration', icon: '+', href: '/register' },
        ]}
        activeLabel={group ? selectedMember ? 'Members' : activeGroupNav : 'Group login'}
        moreActive={Boolean(group && activeGroupNav === 'Group settings')}
      />
    </div>
  )
}
