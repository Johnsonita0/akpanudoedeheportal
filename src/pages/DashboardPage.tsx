import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import MobileBottomNav from '../components/MobileBottomNav'
import { supabase } from '../supabase'
import './DashboardPage.css'

type Supporter = {
  id: number
  registration_type: 'individual' | 'group_member'
  full_name: string
  phone: string
  email: string | null
  lga: string
  ward: string
  support_group_id: number | null
  vin_status: 'pending' | 'verified' | 'not_verified'
  created_at: string
}

type SupportGroup = {
  id: number
  name: string
  lga: string
  is_public: boolean
  status: 'pending' | 'approved' | 'suspended'
  coordinator_name: string | null
  coordinator_phone: string | null
  contact_email: string | null
  consent_at: string
  consent_notice_version: string
  created_at: string
}

type SupporterDetails = Supporter & {
  date_of_birth: string | null
  support_group: string | null
  polling_unit: string | null
  vin: string | null
  nin: string | null
  account_name: string | null
  account_number: string | null
  bank_name: string | null
  residential_address: string | null
  polling_unit_address: string | null
  photo_path: string | null
  photo_url: string | null
  consent: boolean
  consent_at: string
  consent_notice_version: string
  consent_method: 'self' | 'group_coordinator_attestation'
  vin_verification_consent: boolean
  vin_verification_consent_at: string | null
}

type PublicEnquiry = {
  id: number
  name: string
  phone: string
  topic: string
  message: string
  status: 'new' | 'replied'
  created_at: string
}

type DashboardData = {
  supporterCount: number
  groupCount: number
  verifiedCount: number
  pendingCount: number
  recentSupporters: Supporter[]
  groups: SupportGroup[]
}

const pageSize = 25

const navigation = [
  { label: 'Overview', path: '/dashboard', icon: '⌂' },
  { label: 'Supporters', path: '/dashboard/supporters', icon: '♙' },
  { label: 'Support groups', path: '/dashboard/groups', icon: '◎' },
  { label: 'Public enquiries', path: '/dashboard/enquiries', icon: '✉' },
  { label: 'Reports', path: '/dashboard/reports', icon: '▥' },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSupporter(value: unknown): value is Supporter {
  if (!isRecord(value)) return false
  return Number.isSafeInteger(value.id) &&
    (value.registration_type === 'individual' || value.registration_type === 'group_member') &&
    typeof value.full_name === 'string' &&
    typeof value.phone === 'string' &&
    (value.email === null || typeof value.email === 'string') &&
    typeof value.lga === 'string' &&
    typeof value.ward === 'string' &&
    (value.support_group_id === null || Number.isSafeInteger(value.support_group_id)) &&
    (value.vin_status === 'pending' || value.vin_status === 'verified' || value.vin_status === 'not_verified') &&
    typeof value.created_at === 'string'
}

function isSupportGroup(value: unknown): value is SupportGroup {
  if (!isRecord(value)) return false
  return Number.isSafeInteger(value.id) &&
    typeof value.name === 'string' &&
    typeof value.lga === 'string' &&
  typeof value.is_public === 'boolean' &&
    (value.status === 'pending' || value.status === 'approved' || value.status === 'suspended') &&
    (value.coordinator_name === null || typeof value.coordinator_name === 'string') &&
    (value.coordinator_phone === null || typeof value.coordinator_phone === 'string') &&
    (value.contact_email === null || typeof value.contact_email === 'string') &&
    typeof value.consent_at === 'string' &&
    typeof value.consent_notice_version === 'string' &&
    typeof value.created_at === 'string'
}

function isSupporterDetails(value: unknown): value is Omit<SupporterDetails, 'photo_url'> {
  if (!isRecord(value)) return false
  const detailFieldsAreValid =
    (value.date_of_birth === null || typeof value.date_of_birth === 'string') &&
    (value.support_group === null || typeof value.support_group === 'string') &&
    (value.polling_unit === null || typeof value.polling_unit === 'string') &&
    (value.vin === null || typeof value.vin === 'string') &&
    (value.nin === null || typeof value.nin === 'string') &&
    (value.account_name === null || typeof value.account_name === 'string') &&
    (value.account_number === null || typeof value.account_number === 'string') &&
    (value.bank_name === null || typeof value.bank_name === 'string') &&
    (value.residential_address === null || typeof value.residential_address === 'string') &&
    (value.polling_unit_address === null || typeof value.polling_unit_address === 'string') &&
    (value.photo_path === null || typeof value.photo_path === 'string') &&
    typeof value.consent === 'boolean' &&
    typeof value.consent_at === 'string' &&
    typeof value.consent_notice_version === 'string' &&
    (value.consent_method === 'self' || value.consent_method === 'group_coordinator_attestation') &&
    typeof value.vin_verification_consent === 'boolean' &&
    (value.vin_verification_consent_at === null || typeof value.vin_verification_consent_at === 'string')
  return detailFieldsAreValid && isSupporter(value)
}

function isPublicEnquiry(value: unknown): value is PublicEnquiry {
  if (!isRecord(value)) return false
  return Number.isSafeInteger(value.id) &&
    typeof value.name === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.topic === 'string' &&
    typeof value.message === 'string' &&
    (value.status === 'new' || value.status === 'replied') &&
    typeof value.created_at === 'string'
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en-NG').format(value)
}

function maskedPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `•••• ${digits.slice(-4)}`
}

function currentSection(path: string) {
  const route = path.replace(/\/+$/, '') || '/dashboard'
  return navigation.find((item) => item.path === route)?.label || 'Overview'
}

function Overview({ data }: { data: DashboardData }) {
  const verificationRate = data.supporterCount === 0
    ? '—'
    : `${Math.round((data.verifiedCount / data.supporterCount) * 100)}%`

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; OVERVIEW</span>
          <h1>Campaign overview</h1>
          <p>Current registrations and support-group activity.</p>
        </div>
        <span className="admin-live-badge">LIVE DATA</span>
      </div>
      <div className="admin-metrics">
        <article><span>Registered supporters</span><strong>{formatCount(data.supporterCount)}</strong><small>All campaign registrations</small></article>
        <article><span>Support groups</span><strong>{formatCount(data.groupCount)}</strong><small>Registered groups</small></article>
        <article><span>VIN verified</span><strong>{verificationRate}</strong><small>{formatCount(data.verifiedCount)} verified</small></article>
        <article><span>Pending verification</span><strong>{formatCount(data.pendingCount)}</strong><small>Awaiting an eligible check</small></article>
      </div>
      <div className="admin-dashboard-grid">
        <section className="admin-panel live-list-panel">
          <div className="admin-panel-heading">
            <div><h2>Recent registrations</h2><p>Latest supporter activity</p></div>
            <a href="/dashboard/supporters">View all</a>
          </div>
          {data.recentSupporters.length === 0 ? (
            <p className="admin-empty-state">No supporter registrations have been submitted yet.</p>
          ) : (
            <div className="recent-list">
              {data.recentSupporters.map((person) => (
                <div className="live-recent-row" key={person.id}>
                  <span className="supporter-initial">{person.full_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
                  <span><strong>{person.full_name}</strong><small>{person.lga} LGA · {formatDate(person.created_at)}</small></span>
                  <i className={`mini-status ${person.vin_status === 'verified' ? 'positive' : ''}`}>{person.vin_status.replace('_', ' ')}</i>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="admin-panel live-list-panel">
          <div className="admin-panel-heading">
            <div><h2>Support groups</h2><p>Recently registered groups</p></div>
            <a href="/dashboard/groups">View all</a>
          </div>
          {data.groups.length === 0 ? (
            <p className="admin-empty-state">No support groups have been registered yet.</p>
          ) : (
            <div className="admin-group-list">
              {data.groups.slice(0, 6).map((group) => (
                <div className="admin-group-row" key={group.id}>
                  <span className="group-icon">◎</span>
                  <span><strong>{group.name}</strong><small>{group.lga} LGA</small></span>
                  <i className={`table-status ${group.status === 'approved' ? 'verified' : group.status === 'pending' ? 'pending' : ''}`}>{group.status}</i>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function Supporters({ groupNames, refreshKey, onChange }: { groupNames: Map<number, string>; refreshKey: number; onChange: () => void }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | Supporter['vin_status']>('all')
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<Supporter[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [selected, setSelected] = useState<SupporterDetails | null>(null)
  const [loadingMemberId, setLoadingMemberId] = useState<number | null>(null)
  const [savingMemberId, setSavingMemberId] = useState<number | null>(null)
  const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      setErrorMessage('Supabase is not configured for this deployment.')
      return
    }

    let active = true
    setLoading(true)
    setErrorMessage('')

    void (async () => {
      let request = supabase
        .from('supporter_registrations')
        .select('id,registration_type,full_name,phone,email,lga,ward,support_group_id,vin_status,created_at', { count: 'exact' })
      if (query.trim()) request = request.ilike('full_name', `%${query.trim()}%`)
      if (status !== 'all') request = request.eq('vin_status', status)
      const { data, error, count } = await request
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw error
      if (!Array.isArray(data) || !data.every(isSupporter) || count === null) {
        throw new Error('The supporter query returned an invalid response.')
      }
      if (!active) return
      setRows(data)
      setTotal(count)
    })().catch((error: unknown) => {
      console.error('Could not load administrator supporter list:', error)
      if (active) setErrorMessage('The supporter list could not be loaded. Confirm the admin dashboard schema is applied, then retry.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [groupNames, page, query, refreshKey, status])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const openMemberDetails = async (person: Supporter) => {
    if (!supabase) return
    setLoadingMemberId(person.id)
    setActionMessage('')
    try {
      const { data, error } = await supabase.rpc('admin_get_supporter_details', {
        p_registration_id: person.id,
      })
      if (error) throw error
      if (!Array.isArray(data) || data.length !== 1 || !isSupporterDetails(data[0])) {
        throw new Error('The supporter detail response was invalid.')
      }

      const details = data[0]
      let photoUrl: string | null = null
      if (details.photo_path) {
        const { data: signedPhoto, error: photoError } = await supabase.storage
          .from('support-group-member-photos')
          .createSignedUrl(details.photo_path, 300)
        if (photoError) throw photoError
        photoUrl = signedPhoto.signedUrl
      }
      setSelected({ ...details, photo_url: photoUrl })
    } catch (error) {
      console.error('Could not load administrator supporter details:', error)
      setActionMessage('Full supporter details could not be loaded. Confirm the admin dashboard schema and photo permissions are applied.')
    } finally {
      setLoadingMemberId(null)
    }
  }

  const updateVerificationStatus = async (nextStatus: 'pending' | 'not_verified') => {
    if (!supabase || !selected) return
    setSavingMemberId(selected.id)
    setActionMessage('')
    try {
      const { error } = await supabase.rpc('admin_update_supporter_vin_status', {
        p_registration_id: selected.id,
        p_status: nextStatus,
      })
      if (error) throw error
      setSelected({ ...selected, vin_status: nextStatus })
      setRows((current) => current.map((person) => person.id === selected.id ? { ...person, vin_status: nextStatus } : person))
      setActionMessage('Supporter verification status updated.')
      onChange()
    } catch (error) {
      console.error('Could not update supporter verification status:', error)
      setActionMessage('The verification status could not be changed. Provider-confirmed verified status cannot be set manually.')
    } finally {
      setSavingMemberId(null)
    }
  }

  const deleteSupporter = async () => {
    if (!supabase || !selected || !window.confirm(`Permanently delete ${selected.full_name}'s supporter record and private details? This cannot be undone.`)) return
    setDeletingMemberId(selected.id)
    setActionMessage('')
    try {
      if (selected.photo_path) {
        const { error: photoError } = await supabase.storage
          .from('support-group-member-photos')
          .remove([selected.photo_path])
        if (photoError) throw photoError
      }
      const { error } = await supabase
        .from('supporter_registrations')
        .delete()
        .eq('id', selected.id)
      if (error) throw error
      setRows((current) => current.filter((person) => person.id !== selected.id))
      setTotal((current) => Math.max(0, current - 1))
      if (rows.length === 1 && page > 0) setPage((value) => value - 1)
      setSelected(null)
      setActionMessage('Supporter record and private details deleted.')
      onChange()
    } catch (error) {
      console.error('Could not delete supporter record:', error)
      setActionMessage('Supporter deletion failed. If the photo was already removed, the record may remain without its photo; retry or contact the database operator.')
    } finally {
      setDeletingMemberId(null)
    }
  }

  return (
    <>
      <div className="admin-page-heading">
        <div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; SUPPORTERS</span><h1>Supporters</h1><p>Search, review, and manage all live supporter registrations.</p></div>
      </div>
      <section className="admin-panel table-panel">
        <div className="admin-panel-heading table-toolbar">
          <div className="admin-search"><span>⌕</span><input aria-label="Search supporter names" value={query} onChange={(event) => { setPage(0); setQuery(event.target.value) }} placeholder="Search supporter name" /></div>
          <select aria-label="Filter by VIN status" value={status} onChange={(event) => { setPage(0); setStatus(event.target.value as typeof status) }}>
            <option value="all">All statuses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="not_verified">Not verified</option>
          </select>
        </div>
        {errorMessage ? <p className="admin-data-error" role="alert">{errorMessage}</p> : loading ? <p className="admin-empty-state" role="status">Loading supporters…</p> : (
          <>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead><tr><th>Supporter</th><th>Type</th><th>Support group</th><th>LGA</th><th>Ward</th><th>Registered</th><th>VIN status</th><th>Details</th></tr></thead>
                <tbody>
                  {rows.map((person) => (
                    <tr key={person.id}>
                      <td><span className="table-person"><span className="supporter-initial">{person.full_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><span><strong>{person.full_name}</strong><small>{maskedPhone(person.phone)}</small></span></span></td>
                      <td>{person.registration_type === 'group_member' ? 'Group member' : 'Individual'}</td>
                      <td>{person.support_group_id ? groupNames.get(person.support_group_id) || 'Group' : '—'}</td>
                      <td>{person.lga}</td>
                      <td>{person.ward}</td>
                      <td>{formatDate(person.created_at)}</td>
                      <td><span className={`table-status ${person.vin_status === 'verified' ? 'verified' : person.vin_status === 'pending' ? 'pending' : ''}`}>{person.vin_status.replace('_', ' ')}</span></td>
                      <td><button className="admin-row-action" type="button" disabled={loadingMemberId === person.id} onClick={() => void openMemberDetails(person)}>{loadingMemberId === person.id ? 'Loading…' : 'View details'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && <p className="empty-table">No supporter records match these filters.</p>}
            </div>
            <div className="admin-table-footer"><span>{formatCount(total)} matching records</span><div className="admin-pagination"><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page + 1} of {pageCount}</span><button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>
          </>
        )}
      </section>
      {actionMessage && <p className="admin-action-message" role="status">{actionMessage}</p>}
      {selected && (
        <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}>
          <section className="admin-detail-modal" role="dialog" aria-modal="true" aria-labelledby="supporter-detail-heading">
            <header><div><span className="admin-eyebrow">RESTRICTED ADMIN DETAIL</span><h2 id="supporter-detail-heading">{selected.full_name}</h2><p>Supporter reference #{selected.id} · Registered {formatDate(selected.created_at)}</p></div><button className="admin-modal-close" type="button" aria-label="Close supporter details" onClick={() => setSelected(null)}>×</button></header>
            <p className="admin-sensitive-notice">Contains sensitive identity and banking information. Access only for an authorized campaign purpose.</p>
            {selected.photo_url && <img className="admin-member-photo" src={selected.photo_url} alt={`Member photo for ${selected.full_name}`} />}
            <div className="admin-detail-grid">
              <div><span>Registration type</span><strong>{selected.registration_type === 'group_member' ? 'Group member' : 'Individual'}</strong></div>
              <div><span>Phone number</span><strong>{selected.phone}</strong></div>
              <div><span>Email</span><strong>{selected.email || 'Not provided'}</strong></div>
              <div><span>Date of birth</span><strong>{selected.date_of_birth || 'Not stored'}</strong></div>
              <div><span>Local Government Area</span><strong>{selected.lga}</strong></div>
              <div><span>Ward</span><strong>{selected.ward}</strong></div>
              <div><span>Polling unit</span><strong>{selected.polling_unit || 'Not provided'}</strong></div>
              <div><span>Support group</span><strong>{selected.support_group || (selected.support_group_id ? groupNames.get(selected.support_group_id) : null) || 'None'}</strong></div>
              <div><span>Full VIN</span><strong>{selected.vin || 'Not provided'}</strong></div>
              <div><span>Full NIN</span><strong>{selected.nin || 'Not provided'}</strong></div>
              <div><span>Account name</span><strong>{selected.account_name || 'Not provided'}</strong></div>
              <div><span>Account number</span><strong>{selected.account_number || 'Not provided'}</strong></div>
              <div><span>Bank</span><strong>{selected.bank_name || 'Not provided'}</strong></div>
              <div><span>Residential address</span><strong>{selected.residential_address || 'Not provided'}</strong></div>
              <div><span>Polling-unit address</span><strong>{selected.polling_unit_address || 'Not provided'}</strong></div>
              <div><span>General consent</span><strong>{selected.consent ? 'Recorded' : 'Not recorded'}</strong></div>
              <div><span>Consent recorded</span><strong>{formatDate(selected.consent_at)}</strong></div>
              <div><span>Consent notice version</span><strong>{selected.consent_notice_version}</strong></div>
              <div><span>Registration method</span><strong>{selected.consent_method.replace(/_/g, ' ')}</strong></div>
              <div><span>VIN verification consent</span><strong>{selected.vin_verification_consent ? 'Yes' : 'No'}</strong></div>
              <div><span>VIN consent recorded</span><strong>{selected.vin_verification_consent_at ? formatDate(selected.vin_verification_consent_at) : 'Not provided'}</strong></div>
            </div>
            <div className="admin-detail-actions">
              <label>VIN status
                <select value={selected.vin_status} disabled={savingMemberId === selected.id} onChange={(event) => {
                  const value = event.target.value
                  if (value === 'pending' || value === 'not_verified') void updateVerificationStatus(value)
                }}>
                  <option value="pending">Pending</option>
                  <option value="not_verified">Not verified</option>
                  <option value="verified" disabled>Verified (provider-confirmed)</option>
                </select>
              </label>
              <button className="admin-button danger" type="button" disabled={deletingMemberId === selected.id} onClick={() => void deleteSupporter()}>{deletingMemberId === selected.id ? 'Deleting…' : 'Delete supporter'}</button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

function Groups({ refreshKey, onChange }: { refreshKey: number; onChange: () => void }) {
  const [groups, setGroups] = useState<SupportGroup[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [savingGroupId, setSavingGroupId] = useState<number | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      setErrorMessage('Supabase is not configured for this deployment.')
      return
    }
    let active = true
    setLoading(true)
    setErrorMessage('')
    void (async () => {
      const { data, error, count } = await supabase
        .from('support_groups')
        .select('id,name,lga,is_public,status,coordinator_name,coordinator_phone,contact_email,consent_at,consent_notice_version,created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (error) throw error
      if (!Array.isArray(data) || !data.every(isSupportGroup) || count === null) {
        throw new Error('The support-group query returned an invalid response.')
      }
      if (active) {
        setGroups(data)
        setTotal(count)
      }
    })().catch((error: unknown) => {
      console.error('Could not load administrator support groups:', error)
      if (active) setErrorMessage('Support groups could not be loaded. Confirm the admin dashboard schema is applied, then retry.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [page, refreshKey])

  const updateStatus = async (group: SupportGroup, status: SupportGroup['status']) => {
    if (!supabase) return
    setSavingGroupId(group.id)
    setActionMessage('')
    try {
      const { error } = await supabase.rpc('admin_update_support_group_status', {
        p_group_id: group.id,
        p_status: status,
      })
      if (error) throw error
      setGroups((current) => current.map((item) => item.id === group.id
        ? { ...item, status, is_public: status === 'approved' ? item.is_public : false }
        : item))
      setActionMessage(`“${group.name}” status updated.`)
      onChange()
    } catch (error) {
      console.error('Could not update support-group status:', error)
      setActionMessage('The support-group status could not be updated.')
    } finally {
      setSavingGroupId(null)
    }
  }

  const updateVisibility = async (group: SupportGroup, isPublic: boolean) => {
    if (!supabase) return
    setSavingGroupId(group.id)
    setActionMessage('')
    try {
      const { error } = await supabase.rpc('admin_update_support_group_visibility', {
        p_group_id: group.id,
        p_is_public: isPublic,
      })
      if (error) throw error
      setGroups((current) => current.map((item) => item.id === group.id ? { ...item, is_public: isPublic } : item))
      setActionMessage(`“${group.name}” ${isPublic ? 'published' : 'removed from public listing'}.`)
      onChange()
    } catch (error) {
      console.error('Could not update support-group visibility:', error)
      setActionMessage('The group cannot be published until it is approved and has both public images.')
    } finally {
      setSavingGroupId(null)
    }
  }

  const deleteGroup = async (group: SupportGroup) => {
    if (!supabase || !window.confirm(`Permanently delete the support group “${group.name}”? Supporter records will remain but be unlinked. The coordinator's Supabase sign-in will remain active without a group profile.`)) return
    setSavingGroupId(group.id)
    setActionMessage('')
    try {
      const { error } = await supabase.from('support_groups').delete().eq('id', group.id)
      if (error) throw error
      setGroups((current) => current.filter((item) => item.id !== group.id))
      setTotal((current) => Math.max(0, current - 1))
      if (groups.length === 1 && page > 0) setPage((value) => value - 1)
      setActionMessage(`“${group.name}” was deleted.`)
      onChange()
    } catch (error) {
      console.error('Could not delete support group:', error)
      setActionMessage('The support group could not be deleted.')
    } finally {
      setSavingGroupId(null)
    }
  }

  return (
    <>
      <div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; SUPPORT GROUPS</span><h1>Support groups</h1><p>Review and manage every live group account and its coordinator.</p></div></div>
      <section className="admin-panel table-panel">
        {errorMessage ? <p className="admin-data-error" role="alert">{errorMessage}</p> : loading ? <p className="admin-empty-state" role="status">Loading support groups…</p> : groups.length === 0 ? <p className="admin-empty-state">No support groups have been registered yet.</p> : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead><tr><th>Group</th><th>Coordinator</th><th>Phone</th><th>Email</th><th>LGA</th><th>Status</th><th>Public listing</th><th>Coordinator consent</th><th>Registered</th><th>Actions</th></tr></thead>
              <tbody>{groups.map((group) => <tr key={group.id}><td><strong>{group.name}</strong></td><td>{group.coordinator_name || 'Not provided'}</td><td>{group.coordinator_phone || '—'}</td><td>{group.contact_email || '—'}</td><td>{group.lga}</td><td><span className={`table-status ${group.status === 'approved' ? 'verified' : group.status === 'pending' ? 'pending' : ''}`}>{group.status}</span></td><td><select aria-label={`Change public listing for ${group.name}`} value={group.is_public ? 'public' : 'private'} disabled={savingGroupId === group.id} onChange={(event) => void updateVisibility(group, event.target.value === 'public')}><option value="private">Private</option><option value="public">Public</option></select></td><td>{group.consent_notice_version} · {formatDate(group.consent_at)}</td><td>{formatDate(group.created_at)}</td><td><div className="admin-row-controls"><select aria-label={`Change status for ${group.name}`} value={group.status} disabled={savingGroupId === group.id} onChange={(event) => { const value = event.target.value; if (value === 'pending' || value === 'approved' || value === 'suspended') void updateStatus(group, value) }}><option value="pending">Pending</option><option value="approved">Approved</option><option value="suspended">Suspended</option></select><button className="admin-row-action danger-text" type="button" disabled={savingGroupId === group.id} onClick={() => void deleteGroup(group)}>Delete</button></div></td></tr>)}</tbody>
            </table>
          </div>
        )}
        {!errorMessage && !loading && <div className="admin-table-footer"><span>{formatCount(total)} support groups</span><div className="admin-pagination"><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}</span><button type="button" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>}
      </section>
      {actionMessage && <p className="admin-action-message" role="status">{actionMessage}</p>}
    </>
  )
}

function Enquiries({ refreshKey, onChange }: { refreshKey: number; onChange: () => void }) {
  const [rows, setRows] = useState<PublicEnquiry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [savingEnquiryId, setSavingEnquiryId] = useState<number | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      setErrorMessage('Supabase is not configured for this deployment.')
      return
    }

    let active = true
    setLoading(true)
    setErrorMessage('')
    void (async () => {
      const { data, error, count } = await supabase
        .from('public_enquiries')
        .select('id,name,phone,topic,message,status,created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (error) throw error
      if (!Array.isArray(data) || !data.every(isPublicEnquiry) || count === null) {
        throw new Error('The enquiry query returned an invalid response.')
      }
      if (active) {
        setRows(data)
        setTotal(count)
      }
    })().catch((error: unknown) => {
      console.error('Could not load administrator enquiries:', error)
      if (active) setErrorMessage('Public enquiries could not be loaded. Confirm the admin dashboard schema is applied, then retry.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [page, refreshKey])

  const updateStatus = async (item: PublicEnquiry, status: PublicEnquiry['status']) => {
    if (!supabase) return
    setSavingEnquiryId(item.id)
    setActionMessage('')
    try {
      const { error } = await supabase.rpc('admin_update_public_enquiry_status', {
        p_enquiry_id: item.id,
        p_status: status,
      })
      if (error) throw error
      setRows((current) => current.map((row) => row.id === item.id ? { ...row, status } : row))
      setActionMessage(`Enquiry from ${item.name} marked as ${status}.`)
      onChange()
    } catch (error) {
      console.error('Could not update public enquiry status:', error)
      setActionMessage('The enquiry status could not be updated.')
    } finally {
      setSavingEnquiryId(null)
    }
  }

  const deleteEnquiry = async (item: PublicEnquiry) => {
    if (!supabase || !window.confirm(`Permanently delete the enquiry from ${item.name}? This cannot be undone.`)) return
    setSavingEnquiryId(item.id)
    setActionMessage('')
    try {
      const { error } = await supabase.from('public_enquiries').delete().eq('id', item.id)
      if (error) throw error
      setRows((current) => current.filter((row) => row.id !== item.id))
      setTotal((current) => Math.max(0, current - 1))
      if (rows.length === 1 && page > 0) setPage((value) => value - 1)
      setActionMessage('Enquiry deleted.')
      onChange()
    } catch (error) {
      console.error('Could not delete public enquiry:', error)
      setActionMessage('The enquiry could not be deleted.')
    } finally {
      setSavingEnquiryId(null)
    }
  }

  return (
    <>
      <div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; ENQUIRIES</span><h1>Public enquiries</h1><p>Review and manage every message submitted through the campaign website.</p></div></div>
      {errorMessage ? <p className="admin-data-error" role="alert">{errorMessage}</p> : loading ? <p className="admin-empty-state" role="status">Loading enquiries…</p> : rows.length === 0 ? <section className="admin-panel"><p className="admin-empty-state">There are no public enquiries yet.</p></section> : (
        <>
        <div className="admin-enquiry-list">
          {rows.map((item) => (
            <article className="admin-panel admin-enquiry-card" key={item.id}>
              <header><div><span className="admin-eyebrow">{item.topic}</span><h2>{item.name}</h2><p>{item.phone} · {formatDate(item.created_at)}</p></div><span className={`table-status ${item.status === 'replied' ? 'verified' : 'pending'}`}>{item.status}</span></header>
              <p>{item.message}</p>
              <footer className="admin-enquiry-actions"><label>Processing status<select aria-label={`Change status for enquiry from ${item.name}`} value={item.status} disabled={savingEnquiryId === item.id} onChange={(event) => { const value = event.target.value; if (value === 'new' || value === 'replied') void updateStatus(item, value) }}><option value="new">New</option><option value="replied">Replied</option></select></label><button className="admin-row-action danger-text" type="button" disabled={savingEnquiryId === item.id} onClick={() => void deleteEnquiry(item)}>Delete enquiry</button></footer>
            </article>
          ))}
        </div>
        <div className="admin-table-footer"><span>{formatCount(total)} enquiries</span><div className="admin-pagination"><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}</span><button type="button" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>
        </>
      )}
      {actionMessage && <p className="admin-action-message" role="status">{actionMessage}</p>}
    </>
  )
}

function Reports({ data }: { data: DashboardData }) {
  const notVerified = Math.max(0, data.supporterCount - data.verifiedCount - data.pendingCount)
  return (
    <>
      <div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; REPORTS</span><h1>Live reports</h1><p>Registration and verification counts from the campaign database.</p></div></div>
      <div className="admin-metrics">
        <article><span>All supporters</span><strong>{formatCount(data.supporterCount)}</strong><small>Live count</small></article>
        <article><span>Verified VIN</span><strong>{formatCount(data.verifiedCount)}</strong><small>Verified records</small></article>
        <article><span>Pending VIN</span><strong>{formatCount(data.pendingCount)}</strong><small>Pending checks</small></article>
        <article><span>Not verified</span><strong>{formatCount(notVerified)}</strong><small>Live count</small></article>
      </div>
    </>
  )
}

function DashboardLoading({ message }: { message: string }) {
  return <main className="admin-dashboard-state" role="status"><section className="admin-panel"><span className="admin-eyebrow">CAMPAIGN ADMIN</span><h1>Administrator workspace</h1><p>{message}</p></section></main>
}

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const path = window.location.pathname
  const section = currentSection(path)
  const hasAdminRole = session?.user.app_metadata.role === 'admin'
  const groupNames = useMemo(() => new Map((data?.groups ?? []).map((group) => [group.id, group.name])), [data?.groups])
  const refreshDashboard = useCallback(() => setReloadKey((value) => value + 1), [])

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return
    }

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setAuthReady(true)
    })
    void supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (!active) return
      if (error) console.error('Could not verify the administrator session:', error.message)
      setSession(sessionData.session)
      setAuthReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authReady || !supabase) return
    if (!session || !hasAdminRole) {
      window.location.replace('/admin')
    }
  }, [authReady, hasAdminRole, session])

  useEffect(() => {
    if (!authReady || !supabase || !session || !hasAdminRole) return

    let active = true
    setLoadingData(true)
    setDataError('')

    void (async () => {
      const [supporterCountResult, groupCountResult, verifiedCountResult, pendingCountResult, recentResult, groupsResult] = await Promise.all([
        supabase.from('supporter_registrations').select('id', { count: 'exact', head: true }),
        supabase.from('support_groups').select('id', { count: 'exact', head: true }),
        supabase.from('supporter_registrations').select('id', { count: 'exact', head: true }).eq('vin_status', 'verified'),
        supabase.from('supporter_registrations').select('id', { count: 'exact', head: true }).eq('vin_status', 'pending'),
        supabase.from('supporter_registrations')
          .select('id,registration_type,full_name,phone,email,lga,ward,support_group_id,vin_status,created_at')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('support_groups')
          .select('id,name,lga,is_public,status,coordinator_name,coordinator_phone,contact_email,consent_at,consent_notice_version,created_at')
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      const queryError = supporterCountResult.error ||
        groupCountResult.error ||
        verifiedCountResult.error ||
        pendingCountResult.error ||
        recentResult.error ||
        groupsResult.error
      if (queryError) throw queryError
      if (
        supporterCountResult.count === null ||
        groupCountResult.count === null ||
        verifiedCountResult.count === null ||
        pendingCountResult.count === null ||
        !Array.isArray(recentResult.data) || !recentResult.data.every(isSupporter) ||
        !Array.isArray(groupsResult.data) || !groupsResult.data.every(isSupportGroup)
      ) {
        throw new Error('The administrator dashboard query returned an invalid response.')
      }

      if (active) {
        setData({
          supporterCount: supporterCountResult.count,
          groupCount: groupCountResult.count,
          verifiedCount: verifiedCountResult.count,
          pendingCount: pendingCountResult.count,
          recentSupporters: recentResult.data,
          groups: groupsResult.data,
        })
      }
    })().catch((error: unknown) => {
      console.error('Could not load administrator dashboard:', error)
      if (active) setDataError('Live dashboard data could not be loaded. Confirm the admin dashboard schema is applied, then retry.')
    }).finally(() => {
      if (active) setLoadingData(false)
    })

    return () => { active = false }
  }, [authReady, hasAdminRole, reloadKey, session])

  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Administrator sign-out failed:', error.message)
      setDataError('Could not end the administrator session. Please try again.')
      return
    }
    window.location.replace('/admin')
  }

  if (!supabase) return <DashboardLoading message="Administrator access is unavailable because Supabase is not configured." />
  if (!authReady) return <DashboardLoading message="Verifying your administrator session…" />
  if (!session || !hasAdminRole) return <DashboardLoading message="Redirecting to administrator sign-in…" />

  let content
  if (loadingData) {
    content = <section className="admin-panel"><p className="admin-empty-state" role="status">Loading live campaign data…</p></section>
  } else if (dataError) {
    content = <section className="admin-panel admin-error-panel"><p className="admin-data-error" role="alert">{dataError}</p><button className="admin-button outline" type="button" onClick={() => setReloadKey((value) => value + 1)}>Retry</button></section>
  } else if (!data) {
    content = <section className="admin-panel"><p className="admin-empty-state" role="status">Dashboard data is not available.</p></section>
  } else {
    switch (section) {
      case 'Supporters': content = <Supporters groupNames={groupNames} refreshKey={reloadKey} onChange={refreshDashboard} />; break
      case 'Support groups': content = <Groups refreshKey={reloadKey} onChange={refreshDashboard} />; break
      case 'Public enquiries': content = <Enquiries refreshKey={reloadKey} onChange={refreshDashboard} />; break
      case 'Reports': content = <Reports data={data} />; break
      default: content = <Overview data={data} />
    }
  }

  const email = session.user.email || 'Administrator'
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <a href="/" className="dashboard-brand"><span className="dashboard-brand-mark">A</span><span><strong>CAMPAIGN</strong><small>ADMINISTRATION</small></span></a>
        <span className="admin-nav-caption">WORKSPACE</span>
        <nav>{navigation.map((item) => <a className={section === item.label ? 'active' : ''} href={item.path} key={item.path}><span className="admin-nav-icon">{item.icon}</span>{item.label}</a>)}</nav>
        <div className="dashboard-sidebar-bottom"><span className="admin-avatar">{initials}</span><span><strong>{email}</strong><small>Administrator</small></span><button type="button" onClick={() => void signOut()}>Sign out</button></div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-topbar"><div className="admin-breadcrumb">Campaign Admin <span>/</span> {section}</div><div className="dashboard-top-actions"><span className="topbar-admin">{email}</span><span className="admin-avatar">{initials}</span></div></header>
        <div className="dashboard-content">{dataError && !loadingData && <p className="admin-data-error" role="alert">{dataError}</p>}{content}</div>
        <MobileBottomNav
          items={[
            { label: 'Overview', icon: '⌂', href: '/dashboard' },
            { label: 'Supporters', icon: '♙', href: '/dashboard/supporters' },
            { label: 'Groups', icon: '◎', href: '/dashboard/groups' },
          ]}
          moreItems={[
            { label: 'Public enquiries', icon: '✉', href: '/dashboard/enquiries' },
            { label: 'Reports', icon: '▥', href: '/dashboard/reports' },
            { label: 'Campaign website', icon: '⌂', href: '/' },
            { label: 'Sign out', icon: '↪', onClick: () => void signOut() },
          ]}
          activeLabel={section === 'Support groups' ? 'Groups' : section}
        />
      </main>
    </div>
  )
}
