import { useEffect, useRef, useState, type FormEvent } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { candidateName, campaignName } from '../campaignData'
import adcLogo from '../assets/adc-logo-from-campaign-poster.png'
import campaignMomentOne from '../assets/campaign-moment-1.webp'
import campaignMomentTwo from '../assets/campaign-moment-2.webp'
import campaignMomentThree from '../assets/campaign-moment-3.webp'
import campaignMomentFour from '../assets/campaign-moment-4.webp'
import campaignMomentFive from '../assets/campaign-moment-5.webp'
import campaignMomentSix from '../assets/campaign-moment-6.webp'
import stateEmblem from '../assets/akwa-ibom-state-emblem.png'
import heroCandidateOne from '../assets/hero-candidate-1.webp'
import heroCandidateTwo from '../assets/hero-candidate-2.webp'
import heroCandidateThree from '../assets/hero-candidate-3.webp'
import heroCandidateFour from '../assets/hero-candidate-4.webp'
import './PublicSitePage.css'

const aosEffects = ['fade-up', 'fade-left', 'fade-right', 'zoom-in'] as const
const randomAosEffect = () => aosEffects[Math.floor(Math.random() * aosEffects.length)]
const entranceEffects = {
  homeIntro: randomAosEffect(),
  vision: randomAosEffect(),
  manifesto: randomAosEffect(),
  about: randomAosEffect(),
  quote: randomAosEffect(),
  priorities: randomAosEffect(),
  news: randomAosEffect(),
  events: randomAosEffect(),
  contact: randomAosEffect(),
  privacy: randomAosEffect(),
  supporter: randomAosEffect(),
  supportGroups: randomAosEffect(),
}
let aosInitialized = false
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'

type PublicSupportGroup = {
  id: number
  name: string
  lga: string
  logoUrl: string
  photoUrl: string
  logoScale: number
  photoScale: number
  membershipNumber: number
}

function isPublicSupportGroup(value: unknown): value is PublicSupportGroup {
  if (typeof value !== 'object' || value === null) return false
  const group = value as Record<string, unknown>
  const isSecureImageUrl = (url: unknown) => {
    if (typeof url !== 'string') return false
    try {
      return new URL(url).protocol === 'https:'
    } catch {
      return false
    }
  }
  return Number.isSafeInteger(group.id) &&
    typeof group.name === 'string' &&
    typeof group.lga === 'string' &&
    isSecureImageUrl(group.logoUrl) &&
    isSecureImageUrl(group.photoUrl) &&
    typeof group.logoScale === 'number' && group.logoScale >= 1 && group.logoScale <= 2.5 &&
    typeof group.photoScale === 'number' && group.photoScale >= 1 && group.photoScale <= 2.5 &&
    Number.isSafeInteger(group.membershipNumber) &&
    Number(group.membershipNumber) >= 0
}

const links = [
  ['Home', '/'],
  ['About', '/about'],
  ['Manifesto', '/manifesto'],
  ['News', '/news'],
  ['Events', '/events'],
  ['Contact', '/contact'],
]

const mobileLinks = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'News', href: '/news', icon: 'news' },
  { label: 'Events', href: '/events', icon: 'events' },
  { label: 'Join', href: '/register', icon: 'join' },
] as const

function MobileNavIcon({ name }: { name: 'home' | 'news' | 'events' | 'join' | 'menu' }) {
  let icon
  if (name === 'home') {
    icon = <><path d="m3 10 9-7 9 7" /><path d="M5.5 9v11h13V9M9 20v-6h6v6" /></>
  } else if (name === 'news') {
    icon = <><path d="M5 4h13a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" /><path d="M8.5 9h8M8.5 13h8M8.5 17h5" /></>
  } else if (name === 'events') {
    icon = <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>
  } else if (name === 'join') {
    icon = <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.1 2.4-5 6-5m8-3v8m-4-4h8" /></>
  } else {
    icon = <><path d="M4 7h16M4 12h16M4 17h16" /></>
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
}

function CampaignEmblems() {
  return (
    <span className="site-brand-emblems" aria-hidden="true">
      <img className="site-brand-adc" src={adcLogo} alt="" />
      <span className="site-brand-divider" />
      <img className="site-brand-state" src={stateEmblem} alt="" />
    </span>
  )
}

function SiteHeader({ active }: { active: string }) {
  return (
    <header className="site-header">
      <a className="site-brand" href="/" aria-label={`${campaignName} home`}>
        <CampaignEmblems />
        <span><strong>AKPANUDOEDHE</strong><small>AKWA IBOM 2027 CAMPAIGN</small></span>
      </a>
      <nav className="site-nav" aria-label="Main navigation">
        {links.map(([label, href]) => <a className={active === label ? 'selected' : ''} href={href} key={href}>{label}</a>)}
      </nav>
      <a className="button button-primary header-join" href="/register">Join as supporter</a>
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <a className="site-brand footer-brand" href="/">
          <CampaignEmblems />
          <span><strong>AKPANUDOEDHE</strong><small>AKWA IBOM 2027 CAMPAIGN</small></span>
        </a>
        <p>Building a stronger future, together.</p>
        <div className="footer-links"><a href="/contact">Contact</a><a href="/manifesto">Our vision</a><a href="/register">Volunteer</a><a href="/privacy">Privacy notice</a></div>
      </div>
      <p className="footer-symbol-note">The Akwa Ibom State Government emblem is shown as a state identifier only; this campaign is not an official state-government publication or endorsement.</p>
      <div className="footer-bottom"><span>© 2026 {campaignName}. Official campaign information.</span></div>
    </footer>
  )
}

const heroSlides = [
  {
    image: heroCandidateOne,
    eyebrow: 'ADC CANDIDATE FOR GOVERNOR',
    firstLine: 'A future built',
    secondLine: 'with everyone.',
    description: 'Senator John James Akpanudoedehe is the African Democratic Congress (ADC) candidate for the 2027 Akwa Ibom governorship election.',
  },
  {
    image: heroCandidateThree,
    eyebrow: 'AKWA IBOM 2027',
    firstLine: 'Opportunity in',
    secondLine: 'every community.',
    description: 'Share what matters in your community and help shape the conversations that will guide this campaign.',
  },
  {
    image: heroCandidateFour,
    eyebrow: 'ONE PEOPLE. ONE FUTURE.',
    firstLine: 'Let’s build a',
    secondLine: 'stronger future.',
    description: 'Follow campaign updates and take part in a people-first movement for Akwa Ibom.',
  },
  {
    image: heroCandidateTwo,
    eyebrow: 'YOUR VOICE MATTERS',
    firstLine: 'Every community',
    secondLine: 'deserves a voice.',
    description: 'Join the conversation and share the priorities that matter where you live.',
  },
  {
    image: campaignMomentSix,
    logo: adcLogo,
    eyebrow: 'AFRICAN DEMOCRATIC CONGRESS',
    firstLine: 'One people.',
    secondLine: 'One future.',
    description: 'Together, let us build a stronger Akwa Ibom where every community has a voice.',
  },
]

function HeroSlider() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % heroSlides.length)
    }, 5600)
    return () => window.clearTimeout(timer)
  }, [activeIndex])

  const showSlide = (index: number) => {
    setActiveIndex((index + heroSlides.length) % heroSlides.length)
  }
  const slide = heroSlides[activeIndex]

  return (
    <section className="home-hero hero-carousel" aria-label="Campaign highlights" aria-roledescription="carousel">
      <div className="hero-slides" aria-hidden="true">
        {heroSlides.map((item, index) => (
          <img
            className={`hero-slide ${activeIndex === index ? 'active' : ''}`}
            src={item.image}
            alt=""
            key={item.image}
          />
        ))}
      </div>
      <div className="hero-shade" />
      <div className="hero-copy" key={activeIndex}>
        {slide.logo && <img className="hero-party-logo" src={slide.logo} alt="African Democratic Congress logo" />}
        <span className="eyebrow"><i /> {slide.eyebrow}</span>
        <h1>{slide.firstLine}<br /><em>{slide.secondLine}</em></h1>
        <p>{slide.description}</p>
        <div className="hero-actions"><a className="button button-primary" href="/register">Join as supporter</a><a className="button button-outline" href="/manifesto">Read our vision</a></div>
        <div className="hero-signature"><span className="signature-rule" /><span><strong>{candidateName}</strong><small>2027 GOVERNORSHIP CANDIDATE</small></span></div>
      </div>
      <div className="hero-carousel-controls">
        <button type="button" className="hero-arrow" aria-label="Previous slide" onClick={() => showSlide(activeIndex - 1)}>Previous</button>
        <div className="hero-dots" role="group" aria-label="Choose campaign slide">
          {heroSlides.map((item, index) => (
            <button
              type="button"
              className={`hero-dot ${activeIndex === index ? 'active' : ''}`}
              aria-label={`Show campaign slide: ${item.eyebrow}`}
              aria-current={activeIndex === index ? 'true' : undefined}
              key={item.image}
              onClick={() => showSlide(index)}
            />
          ))}
        </div>
        <button type="button" className="hero-arrow" aria-label="Next slide" onClick={() => showSlide(activeIndex + 1)}>Next</button>
      </div>
    </section>
  )
}

function HomePage() {
  return (
    <>
      <HeroSlider />

      <section className="home-intro content-section" data-aos={entranceEffects.homeIntro}>
        <div className="section-kicker">OUR PURPOSE</div>
        <div className="intro-grid"><h2>Progress begins<br />by <em>listening.</em></h2><div><p>Akwa Ibom's greatest strength is its people. This campaign is a chance to hear every voice, build on our shared potential and shape a future rooted in opportunity and public service.</p><a className="text-link" href="/about">Get to know the candidate</a></div></div>
      </section>

      <section className="vision-section" data-aos={entranceEffects.vision}>
        <div className="vision-card"><span>OUR VISION</span><h2>A state where every community has the opportunity to thrive.</h2><a href="/manifesto">Explore our vision</a></div>
        <div className="vision-card vision-card-light"><span>OUR MISSION</span><h2>Listen closely. Serve openly. Build progress that reaches everyone.</h2><a href="/about">Learn about the campaign</a></div>
      </section>

      <section className="content-section manifesto-preview" data-aos={entranceEffects.manifesto}>
        <div><div className="section-kicker">POLICY &amp; PRIORITIES</div><h2>A practical vision<br />for <em>our state.</em></h2><p>Explore the priorities shaping our plan for a more prosperous Akwa Ibom. The full manifesto will be published here as campaign policies are approved.</p><a className="button button-outline" href="/manifesto">Explore the manifesto</a></div>
        <div className="policy-list"><a href="/manifesto">Opportunity and livelihoods</a><a href="/manifesto">Education and young people</a><a href="/manifesto">Health and community wellbeing</a><a href="/manifesto">Transparent public service</a></div>
      </section>

      <NewsPreview />
      <SupportGroupsPreview />
      <EventsPreview />
      <SupporterCallout />
    </>
  )
}

function AboutPage() {
  return (
    <main className="inner-page">
      <div className="inner-hero"><span className="eyebrow">ABOUT THE CANDIDATE</span><h1>Service shaped<br />by <em>experience.</em></h1><p>A public life dedicated to listening, working with communities and creating opportunity for Akwa Ibom.</p></div>
      <section className="inner-content two-column" data-aos={entranceEffects.about}><figure className="candidate-portrait"><img src={heroCandidateOne} alt={candidateName} /><figcaption>Campaign portrait supplied for this website.</figcaption></figure><div><div className="section-kicker">A LIFE IN PUBLIC SERVICE</div><h2>{candidateName}</h2><p>Senator John James Akpanudoedehe is the African Democratic Congress (ADC) candidate for the 2027 Akwa Ibom governorship election. His name appears on the Independent National Electoral Commission's final candidate list.</p><p>His full biography and verified record of public service will be published here as official campaign materials are prepared.</p><a className="text-link" href="https://www.inecnigeria.org/documents/FINAL%20LIST%20-%20AKWA%20IBOM%20STATE%20GOVERNORSHIP.pdf" target="_blank" rel="noreferrer">View INEC's final candidate list</a></div></section>
      <section className="quote-band" data-aos={entranceEffects.quote}><p>“A stronger Akwa Ibom is built when every community has a voice in its future.”</p><span>THE CAMPAIGN VISION</span></section>
    </main>
  )
}

function ManifestoPage() {
  return (
    <main className="inner-page">
      <div className="inner-hero"><span className="eyebrow">OUR PLAN FOR AKWA IBOM</span><h1>Priorities for<br />shared <em>progress.</em></h1><p>Our manifesto will set out practical commitments shaped by the concerns and aspirations of people across the state.</p></div>
      <section className="priorities-list" data-aos={entranceEffects.priorities}>
        {[
          ['Opportunity and livelihoods', 'Supporting local enterprise, skills and pathways to meaningful work.'],
          ['Education and young people', 'Expanding opportunity for learners and investing in the potential of our youth.'],
          ['Health and community wellbeing', 'Strengthening access to care and supporting healthier communities.'],
          ['Infrastructure and connection', 'Building reliable connections between communities and essential services.'],
          ['Transparent public service', 'Listening to residents and making public decisions open and accountable.'],
        ].map(([title, copy]) => <article key={title}><div><h2>{title}</h2><p>{copy}</p></div></article>)}
      </section>
      <p className="notice-text">These are campaign themes for design preview. Approved manifesto documents will be published here when available.</p>
    </main>
  )
}

const campaignMoments = [
  { image: campaignMomentOne, caption: 'A gathering with community members.' },
  { image: campaignMomentTwo, caption: 'A moment shared with supporters.' },
  { image: campaignMomentThree, caption: 'Addressing a public gathering.' },
  { image: campaignMomentFour, caption: 'Supporters come together outdoors.' },
  { image: campaignMomentFive, caption: 'Meeting with community members.' },
  { image: campaignMomentSix, caption: 'A crowd gathers at a campaign event.' },
]

function NewsPreview({ fullPage = false }: { fullPage?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const moment = campaignMoments[activeIndex]

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % campaignMoments.length)
    }, 5600)
    return () => window.clearTimeout(timer)
  }, [activeIndex])

  const showMoment = (index: number) => {
    setActiveIndex((index + campaignMoments.length) % campaignMoments.length)
  }

  return (
    <section className={`news-section ${fullPage ? 'news-full' : ''}`} data-aos={entranceEffects.news}>
      <div className="content-section">
        <div className="section-kicker">CAMPAIGN MOMENTS <span>PHOTOGRAPHS</span></div>
        <div className="section-heading-row"><div><h2>{fullPage ? <>News &amp; <em>updates.</em></> : <>Campaign <em>moments.</em></>}</h2><p>Photographs shared from campaign and community gatherings.</p></div>{!fullPage && <a className="text-link" href="/news">All updates</a>}</div>
        <div className="moments-carousel" role="region" aria-label="Campaign photographs" aria-roledescription="carousel">
          <figure className="moment-figure">
            <img key={moment.image} src={moment.image} alt={moment.caption} loading="lazy" />
            <figcaption><span>CAMPAIGN PHOTOGRAPH</span><strong>{moment.caption}</strong></figcaption>
          </figure>
          <div className="moment-controls">
            <button type="button" className="moment-arrow" aria-label="Previous campaign photograph" onClick={() => showMoment(activeIndex - 1)}>Previous</button>
            <div className="moment-dots" role="group" aria-label="Choose a campaign photograph">
              {campaignMoments.map((item, index) => (
                <button
                  type="button"
                  className={`moment-dot ${activeIndex === index ? 'active' : ''}`}
                  aria-label={`Show photograph: ${item.caption}`}
                  aria-current={activeIndex === index ? 'true' : undefined}
                  key={item.image}
                  onClick={() => showMoment(index)}
                />
              ))}
            </div>
            <button type="button" className="moment-arrow" aria-label="Next campaign photograph" onClick={() => showMoment(activeIndex + 1)}>Next</button>
          </div>
        </div>
        <p className="photo-note">Dates and locations were not provided for these photographs.</p>
      </div>
    </section>
  )
}

function NewsPage() {
  return <main className="inner-page"><div className="inner-hero compact-hero"><span className="eyebrow">CAMPAIGN JOURNAL</span><h1>News &amp; <em>updates.</em></h1><p>Official news, statements and stories from across the campaign.</p></div><NewsPreview fullPage /></main>
}

function SupportGroupsPreview() {
  const [groups, setGroups] = useState<PublicSupportGroup[] | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const loadGroups = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/support-groups`, { signal: controller.signal })
        const body: unknown = await response.json()
        if (!response.ok) {
          const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
            ? body.error
            : 'Support groups could not be loaded. Please try again later.'
          throw new Error(message)
        }
        if (typeof body !== 'object' || body === null || !('groups' in body) || !Array.isArray(body.groups)) {
          throw new Error('Support groups could not be loaded because the response was invalid.')
        }
        if (!body.groups.every(isPublicSupportGroup)) {
          throw new Error('Support groups could not be loaded because the response contained invalid group details.')
        }
        setGroups(body.groups)
      } catch (loadError) {
        if (controller.signal.aborted) return
        console.error('Could not load public support groups:', loadError)
        setError(loadError instanceof Error ? loadError.message : 'Support groups could not be loaded. Please try again later.')
        setGroups([])
      }
    }
    void loadGroups()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!groups || groups.length < 2) return
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % groups.length)
    }, 5600)
    return () => window.clearTimeout(timer)
  }, [activeIndex, groups])

  const showGroup = (index: number) => {
    if (!groups || groups.length === 0) return
    setActiveIndex((index + groups.length) % groups.length)
  }

  const activeGroup = groups?.[activeIndex]

  return (
    <section className="support-groups-section" data-aos={entranceEffects.supportGroups}>
      <div className="content-section">
        <div className="section-kicker">COMMUNITY NETWORKS <span>REGISTERED SUPPORT GROUPS</span></div>
        <div className="section-heading-row">
          <div><h2>Stronger <em>together.</em></h2><p>Meet the support groups bringing people together across Akwa Ibom.</p></div>
        </div>
        {groups === null ? (
          <p className="public-empty-state" role="status">Loading registered support groups...</p>
        ) : error ? (
          <p className="public-empty-state" role="alert">{error}</p>
        ) : activeGroup ? (
          <div className="support-groups-carousel" role="region" aria-label="Registered support groups" aria-roledescription="carousel">
            <article className="support-group-card" aria-live="polite">
              <div className="support-group-photo">
                <img src={activeGroup.photoUrl} alt={`${activeGroup.name} members`} loading="lazy" style={{ transform: `scale(${activeGroup.photoScale})` }} />
                <img className="support-group-logo" src={activeGroup.logoUrl} alt={`${activeGroup.name} logo`} loading="lazy" style={{ transform: `scale(${activeGroup.logoScale})` }} />
              </div>
              <div className="support-group-copy">
                <span>REGISTERED SUPPORT GROUP</span>
                <h3>{activeGroup.name}</h3>
                <p>{activeGroup.lga} Local Government Area</p>
                <div className="support-group-membership"><strong>{activeGroup.membershipNumber.toLocaleString()}</strong><span>registered members</span></div>
              </div>
            </article>
            {groups.length > 1 && (
              <div className="support-group-controls">
                <button type="button" className="support-group-control" aria-label="Previous support group" onClick={() => showGroup(activeIndex - 1)}>Previous</button>
                <div className="moment-dots" role="group" aria-label="Choose a support group">
                  {groups.map((group, index) => (
                    <button
                      type="button"
                      className={`moment-dot ${activeIndex === index ? 'active' : ''}`}
                      aria-label={`Show support group: ${group.name}`}
                      aria-current={activeIndex === index ? 'true' : undefined}
                      key={group.id}
                      onClick={() => showGroup(index)}
                    />
                  ))}
                </div>
                <button type="button" className="support-group-control" aria-label="Next support group" onClick={() => showGroup(activeIndex + 1)}>Next</button>
              </div>
            )}
          </div>
        ) : (
          <p className="public-empty-state">No public support groups have been registered yet. Check back for updates.</p>
        )}
      </div>
    </section>
  )
}

function EventsPreview({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <section className={`events-section ${fullPage ? 'events-full' : ''}`} data-aos={entranceEffects.events}>
      <div className="content-section">
        <div className="section-kicker">MEET THE CAMPAIGN <span>UPCOMING</span></div>
        <div className="section-heading-row"><div><h2>On the <em>ground.</em></h2><p>Join a conversation or community event near you.</p></div>{!fullPage && <a className="text-link" href="/events">View all events</a>}</div>
        <p className="public-empty-state">No confirmed campaign events have been announced yet. Check back for official details.</p>
      </div>
    </section>
  )
}

function EventsPage() {
  return <main className="inner-page"><div className="inner-hero compact-hero"><span className="eyebrow">UPCOMING CAMPAIGN ACTIVITIES</span><h1>Let's meet<br /><em>in person.</em></h1><p>Find a community conversation or campaign event near you.</p></div><EventsPreview fullPage /></main>
}

function ContactPage() {
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    setSubmitting(true)
    setStatus('')
    const formData = new FormData(form)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(formData.get('name') || '').trim(),
          phone: String(formData.get('phone') || '').trim(),
          topic: String(formData.get('topic') || ''),
          message: String(formData.get('message') || '').trim(),
        }),
      })
      const result = await response.json().catch(() => null) as { error: string; message: string } | null
      if (!response.ok) throw new Error(result?.error || `Request failed (${response.status}). Please try again.`)
      setStatus(result?.message || 'Your enquiry has been received.')
      form.reset()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Your enquiry could not be sent. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <main className="inner-page">
      <div className="inner-hero compact-hero"><span className="eyebrow">YOUR VOICE MATTERS</span><h1>Let's start<br /><em>a conversation.</em></h1><p>Share a question, suggestion or community concern with the campaign.</p></div>
      <section className="contact-layout inner-content" data-aos={entranceEffects.contact}><form className="contact-form" onSubmit={submit}><label>Full name<input required name="name" placeholder="Your name" /></label><label>Phone number<input required name="phone" type="tel" placeholder="+234" /></label><label>Topic<select name="topic"><option>General enquiry</option><option>Suggestion</option><option>Community concern</option><option>Privacy or data rights request</option></select></label><label>Message<textarea required name="message" rows={5} placeholder="How can we help? Do not include your VIN or password." /></label>{status && <p className={`form-message ${status.includes('received') ? 'success' : ''}`} role="status">{status}</p>}<button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send enquiry'}</button></form><aside className="contact-aside"><span className="section-kicker">GET IN TOUCH</span><h2>We want to<br /><em>hear from you.</em></h2><p>Use this form to share a general enquiry, an idea, a community concern or a privacy/data-rights request. Never send a VIN or password in a message.</p><div className="contact-rule" /><span className="section-kicker">FOLLOW THE CAMPAIGN</span><p>Official social media links will be added when confirmed.</p></aside></section>
    </main>
  )
}

function PrivacyPage() {
  return (
    <main className="inner-page">
      <div className="inner-hero compact-hero">
        <span className="eyebrow">DATA COLLECTION &amp; PRIVACY NOTICE</span>
        <h1>Your information.<br /><em>Your choice.</em></h1>
        <p>Registration is voluntary. This notice explains what the Akpanudoedehe for Akwa Ibom campaign collects, why it is used, and how to make a privacy request.</p>
      </div>
      <section className="inner-content privacy-copy" data-aos={entranceEffects.privacy}>
        <p className="privacy-updated"><strong>Effective date:</strong> 27 November 2026</p>
        <h2>Who is responsible</h2>
        <p>The campaign team operating the Akpanudoedehe for Akwa Ibom website is responsible for personal information submitted through this site. To ask about your information, withdraw consent, or request access, correction or deletion, use the <a href="/contact">contact form</a> and select “Privacy or data rights request.” Do not include your VIN, password or other sensitive information in a message.</p>

        <h2>Information we collect</h2>
        <p>Depending on how you register, we may collect your name, phone number, optional email, Local Government Area, ward, optional polling-unit details, support-group membership, and voter identification number (VIN). A support-group coordinator account also uses the coordinator’s email and password through the sign-in provider, along with the group name, location and coordinator contact details. Group coordinators may enter member details only after each member has agreed to provide them.</p>
        <p>Support-group membership may reveal a person’s political participation. Registration is voluntary, and choosing not to register does not prevent access to public campaign information.</p>

        <h2>How information is used</h2>
        <ul>
          <li>To record voluntary individual and support-group registrations and manage group membership.</li>
          <li>To contact people about campaign participation, community activities and registration matters.</li>
          <li>To display approved support-group names, locations, logos and photos, and a count of members who have registered with that group.</li>
          <li>To verify a VIN only if an authorised verification service is configured and the required safeguards are in place. No external VIN-verification provider is currently configured; VIN status therefore remains pending.</li>
          <li>To respond to privacy requests and meet applicable legal obligations.</li>
        </ul>

        <h2>Who can see information</h2>
        <p>Authorised campaign administrators can access registration records for campaign operations. A support-group coordinator can access the member list for that coordinator’s own group, including member names, contact details, location and verification status. Coordinators cannot view members’ full VINs or account passwords. A group profile and its uploaded logo or photo become public only after campaign review and approval. The site does not sell personal information.</p>
        <p>Website hosting, authentication, database and file-storage services are provided by Vercel and Supabase. They process information to operate the service under their respective terms and security controls. We do not send VINs to an external verification provider at this time.</p>

        <h2>Consent and group registrations</h2>
        <p>Individual registration requires an affirmative choice to agree to this notice and the stated campaign uses. If you do not agree, the individual form will not submit. You may withdraw consent by making a privacy request; this does not affect processing that already occurred or information that must be retained by law.</p>
        <p>A coordinator submitting a member’s details must first obtain that member’s permission and confirm this on the form. Coordinators must not submit another person’s VIN or contact details without permission. Group login credentials belong to the designated coordinator and should not be shared. The campaign will never display a member’s full VIN in the group dashboard.</p>

        <h2>Storage, security and retention</h2>
        <p>Information is transmitted over HTTPS and stored using the campaign’s Supabase database and authentication services. Access is restricted by account and group permissions. VINs are kept separately from the group member list and are not readable by coordinators. No system can guarantee absolute security; please do not send VINs or passwords through the contact form or share your account credentials.</p>
        <p>There is no fixed automatic deletion date at present. Information is retained while needed to administer campaign registrations and groups, and longer only where required for legal obligations or resolving a dispute. You may request deletion; requests are assessed against applicable legal and record-keeping requirements. The campaign should review retained data periodically and delete information it no longer needs.</p>

        <h2>Your choices and data requests</h2>
        <p>Subject to applicable law, you may ask to access or correct your information, request deletion, withdraw consent, or raise a concern about how information is used. Use the <a href="/contact">privacy/data-rights contact form</a>. We may need to verify your identity before acting on a request. Do not put your VIN or password in the request.</p>

        <h2>Changes to this notice</h2>
        <p>We will update this page when registration fields, group access, verification providers or data practices change. Please review this notice before submitting a registration. This notice describes the current service and is not a promise that a verification service or other feature is active when it is not.</p>
      </section>
    </main>
  )
}

export default function PublicSitePage({ path }: { path: string }) {
  const active = links.find(([, href]) => href === path)?.[0] || 'Home'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const isMobilePrimaryPage = mobileLinks.some((link) => link.href === path)

  useEffect(() => {
    if (!aosInitialized) {
      aosInitialized = true
      const prefersReducedMotion = typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!prefersReducedMotion) {
        try {
          AOS.init({
            duration: 750,
            easing: 'ease-out-cubic',
            offset: 75,
            once: true,
          })
          document.documentElement.classList.add('aos-enabled')
        } catch (error) {
          console.warn('Scroll animations are unavailable; showing all content without them.', error)
        }
      }
    }
    if (document.documentElement.classList.contains('aos-enabled')) {
      try {
        AOS.refreshHard()
      } catch (error) {
        document.documentElement.classList.remove('aos-enabled')
        console.warn('Scroll animations could not refresh; showing all content without them.', error)
      }
    }
  }, [path])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        mobileMenuButtonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileMenuOpen])

  let content
  if (path === '/about') content = <AboutPage />
  else if (path === '/manifesto') content = <ManifestoPage />
  else if (path === '/news') content = <NewsPage />
  else if (path === '/events') content = <EventsPage />
  else if (path === '/contact') content = <ContactPage />
  else if (path === '/privacy') content = <PrivacyPage />
  else content = <HomePage />

  return (
    <div className="public-site">
      <SiteHeader active={active} />
      {content}
      <SiteFooter />
      {mobileMenuOpen && <button className="mobile-menu-scrim" type="button" aria-label="Close mobile menu" onClick={() => setMobileMenuOpen(false)} />}
      <div className="mobile-menu-panel" id="mobile-more-menu" aria-label="More campaign pages" hidden={!mobileMenuOpen}>
        <a href="/about" onClick={() => setMobileMenuOpen(false)}>About the candidate</a>
        <a href="/manifesto" onClick={() => setMobileMenuOpen(false)}>Manifesto</a>
        <a href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
        <a href="/privacy" onClick={() => setMobileMenuOpen(false)}>Privacy notice</a>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {mobileLinks.map(({ label, href, icon }) => (
          <a className={path === href ? 'active' : ''} href={href} key={href} aria-current={path === href ? 'page' : undefined}>
            <span className="mobile-nav-icon"><MobileNavIcon name={icon} /></span><span>{label}</span>
          </a>
        ))}
        <button ref={mobileMenuButtonRef} type="button" className={!isMobilePrimaryPage ? 'active' : ''} aria-expanded={mobileMenuOpen} aria-controls="mobile-more-menu" aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileMenuOpen((open) => !open)}>
          <span className="mobile-nav-icon"><MobileNavIcon name="menu" /></span><span>Menu</span>
        </button>
      </nav>
    </div>
  )
}

function SupporterCallout() {
  return <section className="supporter-callout" data-aos={entranceEffects.supporter}><span className="eyebrow">YOUR VOICE. YOUR FUTURE.</span><h2>Be part of the<br /><em>conversation.</em></h2><p>Register your interest in campaign activities and stay connected with your community.</p><a className="button button-light" href="/register">Become a supporter</a></section>
}
