import { useMemo, useState } from 'react'
import { lgas, sampleEvents, sampleSupporters, supportGroups } from '../campaignData'
import './DashboardPage.css'

const navigation = [
  { label: 'Overview', path: '/dashboard', icon: '⌂' },
  { label: 'Supporters', path: '/dashboard/supporters', icon: '♙' },
  { label: 'Support groups', path: '/dashboard/groups', icon: '◎' },
  { label: 'LGAs & wards', path: '/dashboard/areas', icon: '⌖' },
  { label: 'Coordinators', path: '/dashboard/coordinators', icon: '♧' },
  { label: 'Events', path: '/dashboard/events', icon: '▦' },
  { label: 'News & media', path: '/dashboard/news', icon: '▤' },
  { label: 'Enquiries', path: '/dashboard/enquiries', icon: '✉' },
  { label: 'Reports', path: '/dashboard/reports', icon: '▥' },
  { label: 'Activity log', path: '/dashboard/activity', icon: '◷' },
  { label: 'Settings', path: '/dashboard/settings', icon: '⚙' },
]

const coordinators = [
  { name: 'Coordinator 1', role: 'State Coordinator', area: 'Akwa Ibom', status: 'Active' },
  { name: 'Coordinator 2', role: 'LGA Coordinator', area: 'Uyo', status: 'Active' },
  { name: 'Coordinator 3', role: 'LGA Coordinator', area: 'Eket', status: 'Active' },
  { name: 'Coordinator 4', role: 'Ward Coordinator', area: 'Uyo, Ward 3', status: 'Active' },
  { name: 'Coordinator 5', role: 'Ward Coordinator', area: 'Eket, Ward 2', status: 'Pending' },
]

function exportCsv() {
  const rows = [
    ['Name', 'Phone', 'LGA', 'Ward', 'Support group', 'VIN status', 'Registered on'],
    ...sampleSupporters.map(({ name, phone, lga, ward, group, status, date }) => [name, phone, lga, ward, group, status, date]),
  ]
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'campaign-supporters-sample.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function SampleBadge() {
  return <div className="dashboard-sample-banner"><span>DEMO PREVIEW</span> Figures and records shown are sample data. Admin actions are not connected to a live account.</div>
}

function Overview() {
  return (
    <>
      <div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; OVERVIEW</span><h1>Campaign overview</h1><p>Registrations and activity across Akwa Ibom State.</p></div><button className="admin-button outline" onClick={exportCsv} type="button">↓ Export sample data</button></div>
      <div className="admin-metrics"><article><span>Registered supporters</span><strong>12,480</strong><small>Across the state</small></article><article><span>Support groups</span><strong>86</strong><small>Community networks</small></article><article><span>LGAs covered</span><strong>31</strong><small>Akwa Ibom State</small></article><article><span>Upcoming events</span><strong>9</strong><small>Across 6 LGAs</small></article></div>
      <div className="admin-dashboard-grid">
        <section className="admin-panel lga-chart"><div className="admin-panel-heading"><div><h2>Registrations by LGA</h2><p>Supporter sign-ups across the state</p></div><button className="period-button" type="button">This month⌄</button></div>{[['Uyo', 88], ['Eket', 72], ['Ikot Ekpene', 63], ['Oron', 48], ['Abak', 39], ['Itu', 28]].map(([name, value]) => <div className="chart-row" key={name}><span>{name}</span><div><i style={{ width: `${value}%` }} /></div><b>{Number(value) * 14}</b></div>)}</section>
        <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Recent registrations</h2><p>Latest supporter activity</p></div><a href="/dashboard/supporters">View all </a></div><div className="recent-list">{sampleSupporters.slice(0, 4).map((person) => <a href={`/members/${person.id}`} key={person.id}><span className="supporter-initial">{person.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{person.name}</strong><small>{person.lga} LGA · {person.date}</small></span><i className={`mini-status ${person.status === 'Verified' ? 'positive' : ''}`}>{person.status}</i></a>)}</div></section>
      </div>
    </>
  )
}

function Supporters() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All statuses')
  const filtered = useMemo(() => sampleSupporters.filter((person) => `${person.name} ${person.lga} ${person.ward} ${person.group}`.toLowerCase().includes(query.toLowerCase()) && (status === 'All statuses' || status === person.status)), [query, status])
  return <>
    <div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; SUPPORTERS</span><h1>Supporters</h1><p>Search and review supporter registrations.</p></div><button className="admin-button outline" type="button" onClick={exportCsv}>↓ Export list</button></div>
    <section className="admin-panel table-panel"><div className="admin-panel-heading table-toolbar"><div className="admin-search"><span>⌕</span><input aria-label="Search supporters" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, LGA or group" /></div><select aria-label="Filter by VIN status" value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Verified</option><option>Pending</option><option>Not verified</option></select></div><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Supporter</th><th>Support group</th><th>LGA</th><th>Ward</th><th>Registered</th><th>VIN status</th></tr></thead><tbody>{filtered.map((person) => <tr key={person.id}><td><a className="table-person" href={`/members/${person.id}`}><span className="supporter-initial">{person.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{person.name}</strong><small>•••••• {person.phone.slice(-4)}</small></span></a></td><td>{person.group}</td><td>{person.lga}</td><td>{person.ward}</td><td>{person.date}</td><td><span className={`table-status ${person.status === 'Verified' ? 'verified' : person.status === 'Pending' ? 'pending' : ''}`}>{person.status}</span></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="empty-table">No sample supporters match your search.</p>}</div><div className="admin-table-footer">Showing {filtered.length} sample records <span>Page 1 of 1</span></div></section>
  </>
}

function Groups() {
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; SUPPORT GROUPS</span><h1>Support groups</h1><p>Community networks and their registered supporters.</p></div><button className="admin-button" type="button">＋ Add support group</button></div><div className="group-cards">{supportGroups.map((group, index) => <article className="admin-panel group-card" key={group}><span className="group-icon">◎</span><h2>{group}</h2><p>{['Uyo', 'Eket', 'Ikot Ekpene', 'Oron', 'Statewide'][index]} · Akwa Ibom</p><div><strong>{[320, 284, 241, 198, 156][index]}</strong><span>registered supporters</span></div><a href="/dashboard/supporters">View members </a></article>)}</div></>
}

function Areas() {
  const [selected, setSelected] = useState('Uyo')
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; LGAS &amp; WARDS</span><h1>Local Government Areas</h1><p>31 LGAs and their wards across Akwa Ibom State.</p></div></div><div className="areas-layout"><section className="admin-panel areas-list">{lgas.map((name, index) => <button className={selected === name ? 'selected' : ''} key={name} onClick={() => setSelected(name)} type="button"><span>{name}</span><small>{[1240, 860, 740, 520, 410, 330][index] || Math.max(80, 260 - index * 6)}</small><b></b></button>)}</section><section className="admin-panel wards-panel"><div className="admin-panel-heading"><div><h2>Wards in {selected}</h2><p>Supporter totals and coordinator assignments</p></div><button className="admin-button outline" type="button">＋ Add ward</button></div><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Ward</th><th>Supporters</th><th>Coordinator</th><th>Status</th></tr></thead><tbody>{Array.from({ length: 5 }, (_, index) => <tr key={index}><td>Ward {index + 1}</td><td>{[142, 118, 165, 97, 121][index]}</td><td>{index === 3 ? 'Unassigned' : `Coordinator ${index + 1}`}</td><td><span className={`table-status ${index === 3 ? 'pending' : 'verified'}`}>{index === 3 ? 'Unassigned' : 'Active'}</span></td></tr>)}</tbody></table></div><p className="demo-data-note">Ward names and counts are illustrative sample data.</p></section></div></>
}

function Coordinators() {
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; COORDINATORS</span><h1>Coordinators</h1><p>Manage state, LGA and ward-level access.</p></div><button className="admin-button" type="button">＋ Add coordinator</button></div><section className="admin-panel table-panel"><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Name</th><th>Role</th><th>Assigned area</th><th>Status</th><th></th></tr></thead><tbody>{coordinators.map((person) => <tr key={person.name}><td><strong>{person.name}</strong></td><td>{person.role}</td><td>{person.area}</td><td><span className={`table-status ${person.status === 'Active' ? 'verified' : 'pending'}`}>{person.status}</span></td><td><button className="row-more" aria-label={`Actions for ${person.name}`} type="button">···</button></td></tr>)}</tbody></table></div><p className="demo-data-note">Coordinators only see the area assigned to them after secure role-based sign-in is connected.</p></section></>
}

function Events() {
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; EVENTS</span><h1>Campaign events</h1><p>Plan public activities and manage event information.</p></div><button className="admin-button" type="button">＋ Create event</button></div><section className="admin-panel table-panel"><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Event</th><th>Date</th><th>Time</th><th>Location</th><th>Registrations</th><th>Status</th></tr></thead><tbody>{sampleEvents.map((event, index) => <tr key={event.day}><td><strong>{event.title}</strong></td><td>{event.day} {event.month} 2026</td><td>{event.time}</td><td>{event.location}</td><td>{[118, 86, 54][index]}</td><td><span className="table-status verified">Upcoming</span></td></tr>)}</tbody></table></div><p className="demo-data-note">Sample events are for layout illustration only.</p></section></>
}

function NewsEditor() {
  const [notice, setNotice] = useState('')
  const [title, setTitle] = useState('')
  const save = (mode: 'draft' | 'publish') => {
    setNotice(title.trim() ? `"${title}" was ${mode === 'draft' ? 'saved as a sample draft' : 'prepared for publication'} in this preview. Nothing has been published.` : 'Add a title before saving.')
  }
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; NEWS &amp; MEDIA</span><h1>News &amp; media</h1><p>Prepare official campaign stories and announcements.</p></div></div><form className="admin-panel news-editor" onSubmit={(event) => { event.preventDefault(); save('draft') }}><div className="editor-title-row"><div><h2>New post</h2><p>Draft content for the public website.</p></div><div><button className="admin-button outline" type="submit">Save draft</button><button className="admin-button" type="button" onClick={() => save('publish')}>Publish</button></div></div><div className="editor-grid"><label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Write a clear headline" /></label><label>Category<select><option>News</option><option>Press release</option><option>Speech</option><option>Gallery</option><option>Video</option></select></label><label>Status<select><option>Draft</option><option>Scheduled</option></select></label><label className="wide-editor">Content<textarea rows={7} placeholder="Write your story…" /></label><label>Cover image<input type="file" accept="image/*" /></label></div>{notice && <p className="editor-notice" role="status">{notice}</p>}</form></>
}

function Enquiries() {
  const [reply, setReply] = useState('')
  const [notice, setNotice] = useState('')
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; ENQUIRIES</span><h1>Public enquiries</h1><p>Review and respond to community messages.</p></div></div><div className="enquiries-layout"><section className="admin-panel enquiry-list"><h2>Inbox</h2>{['General enquiry', 'Suggestion', 'Community concern', 'General enquiry', 'Suggestion'].map((topic, index) => <button className={`enquiry-item ${index === 0 ? 'active' : ''}`} key={`${topic}-${index}`} type="button"><span><strong>Sender {index + 1}</strong><small>{topic}</small></span><i className={`table-status ${index < 2 ? 'pending' : 'verified'}`}>{index < 2 ? 'New' : 'Replied'}</i></button>)}</section><section className="admin-panel enquiry-detail"><span className="admin-eyebrow">GENERAL ENQUIRY · NEW</span><h2>Message from Sender 1</h2><p className="enquiry-message">Thank you for reaching out to the campaign. We would like to know more about upcoming community events in our area.</p><label>Write a reply<textarea rows={5} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Type your response…" /></label><button className="admin-button" type="button" onClick={() => setNotice(reply.trim() ? 'Reply preview saved locally. Messaging is not connected.' : 'Write a reply first.')}>Send reply</button>{notice && <p className="editor-notice" role="status">{notice}</p>}</section></div></>
}

function Reports() {
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; REPORTS</span><h1>Reports &amp; exports</h1><p>Review sample participation summaries and export records.</p></div><button className="admin-button" type="button" onClick={exportCsv}>↓ Export supporter list</button></div><div className="admin-metrics"><article><span>Registrations this month</span><strong>1,284</strong><small>Sample total</small></article><article><span>VIN verified</span><strong>78%</strong><small>Sample rate</small></article><article><span>LGAs with activity</span><strong>31 / 31</strong><small>Statewide coverage</small></article><article><span>Event attendance</span><strong>2,460</strong><small>Sample total</small></article></div><section className="admin-panel report-note"><h2>Report filters</h2><p>Filter by date range, local government area, ward, group or verification status when connected to live campaign data.</p><div><label>From <input type="date" /></label><label>To <input type="date" /></label><label>LGA <select><option>All LGAs</option>{lgas.map((item) => <option key={item}>{item}</option>)}</select></label></div></section></>
}

function Activity() {
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; ACTIVITY LOG</span><h1>Activity log</h1><p>Important administrative activity and changes.</p></div></div><section className="admin-panel table-panel"><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Activity</th><th>Administrator</th><th>Area</th><th>Date &amp; time</th></tr></thead><tbody>{[['Added a new coordinator', 'Campaign Admin', 'Eket LGA', 'Nov 24, 2026 · 10:14 AM'], ['Published campaign announcement', 'Media Admin', 'Statewide', 'Nov 23, 2026 · 4:32 PM'], ['Reviewed new supporter registrations', 'Uyo Coordinator', 'Uyo LGA', 'Nov 22, 2026 · 1:08 PM']].map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div><p className="demo-data-note">Sample audit entries. A live activity log requires authenticated administrative actions.</p></section></>
}

function Settings() {
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">CAMPAIGN ADMIN &nbsp; / &nbsp; SETTINGS</span><h1>Platform settings</h1><p>Campaign information and administrative configuration.</p></div></div><section className="admin-panel settings-panel"><h2>Campaign profile</h2><label>Campaign name<input value="Akpanudoedehe for Akwa Ibom" readOnly /></label><label>State<select defaultValue="Akwa Ibom"><option>Akwa Ibom</option></select></label><label>Support email<input placeholder="Add official contact email" /></label><p className="demo-data-note">Settings are preview-only until administrator sign-in and secure storage are configured.</p></section></>
}

function currentSection(path: string) {
  const route = path.replace(/\/+$/, '') || '/dashboard'
  if (/^\/dashboard\/supporters\/$/.test(route) || /^\/dashboard\/members\/$/.test(route)) return 'Supporters'
  return navigation.find((item) => item.path === route)?.label || 'Overview'
}

export default function DashboardPage() {
  const path = window.location.pathname
  const section = currentSection(path)
  const [menuOpen, setMenuOpen] = useState(false)
  let content
  switch (section) {
    case 'Supporters': content = <Supporters />; break
    case 'Support groups': content = <Groups />; break
    case 'LGAs & wards': content = <Areas />; break
    case 'Coordinators': content = <Coordinators />; break
    case 'Events': content = <Events />; break
    case 'News & media': content = <NewsEditor />; break
    case 'Enquiries': content = <Enquiries />; break
    case 'Reports': content = <Reports />; break
    case 'Activity log': content = <Activity />; break
    case 'Settings': content = <Settings />; break
    default: content = <Overview />
  }
  return <div className="dashboard-shell"><aside className={`dashboard-sidebar ${menuOpen ? 'mobile-open' : ''}`}><a href="/" className="dashboard-brand"><span className="dashboard-brand-mark">A</span><span><strong>CAMPAIGN</strong><small>ADMINISTRATION</small></span></a><span className="admin-nav-caption">WORKSPACE</span><nav>{navigation.map((item) => <a className={section === item.label ? 'active' : ''} href={item.path} key={item.path}><span className="admin-nav-icon">{item.icon}</span>{item.label}</a>)}</nav><div className="dashboard-sidebar-bottom"><span className="admin-avatar">CA</span><span><strong>Campaign Admin</strong><small>Demo preview</small></span><a href="/" aria-label="Return to campaign"></a></div></aside><main className="dashboard-main"><header className="dashboard-topbar"><button className="dashboard-mobile-menu" onClick={() => setMenuOpen(!menuOpen)} type="button" aria-label="Toggle menu">☰</button><div className="admin-breadcrumb">Campaign Admin <span>/</span> {section}</div><div className="dashboard-top-actions"><button type="button" aria-label="Notifications">♢<i /></button><span className="topbar-admin">Admin</span><span className="admin-avatar">CA</span></div></header><div className="dashboard-content"><SampleBadge />{content}</div></main></div>
}
