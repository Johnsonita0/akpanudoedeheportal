import { sampleSupporters } from '../campaignData'
import './MemberDetailsPage.css'

export default function MemberDetailsPage() {
  const memberId = decodeURIComponent(window.location.pathname.split('/').filter(Boolean).at(-1) || '')
  const member = sampleSupporters.find((item) => item.id === memberId)
  if (!member) return <main className="member-details-shell"><div className="member-details-card"><a href="/dashboard/supporters"> Back to supporters</a><h1>Supporter not found</h1><p>This sample record is not available in the preview.</p></div></main>

  return <main className="member-details-shell"><a className="member-back-link" href="/dashboard/supporters"> Back to supporters</a><div className="member-details-card"><span className="admin-eyebrow">DEMO SUPPORTER RECORD</span><div className="member-detail-heading"><span className="member-detail-avatar">{member.name.split(' ').map((part) => part[0]).join('')}</span><div><h1>{member.name}</h1><p>Supporter reference #{member.id} · Registered {member.date}</p></div><span className={`table-status ${member.status === 'Verified' ? 'verified' : member.status === 'Pending' ? 'pending' : ''}`}>{member.status}</span></div><div className="member-detail-grid"><div><span>Phone number</span><strong>{member.phone}</strong></div><div><span>Local Government Area</span><strong>{member.lga}</strong></div><div><span>Ward</span><strong>{member.ward}</strong></div><div><span>Support group</span><strong>{member.group}</strong></div><div><span>Voter card verification</span><strong>{member.status}</strong></div></div><p className="member-data-note">This is illustrative sample information. Sensitive identity and account information is not displayed in this preview.</p></div></main>
}
