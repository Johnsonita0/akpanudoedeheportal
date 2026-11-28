import { useEffect, useRef, useState } from 'react'
import './MobileBottomNav.css'

export type MobileNavAction =
  | { label: string; icon: string; href: string; onClick?: never }
  | { label: string; icon: string; onClick: () => void; href?: never }

type MobileBottomNavProps = {
  items: MobileNavAction[]
  moreItems: MobileNavAction[]
  activeLabel?: string
  moreActive?: boolean
}

export default function MobileBottomNav({
  items,
  moreItems,
  activeLabel,
  moreActive,
}: MobileBottomNavProps) {
  const [open, setOpen] = useState(false)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const primaryItems = items.slice(0, 3)
  const currentPath = window.location.pathname
  const isMoreActive = moreActive ??
    Boolean(activeLabel && !primaryItems.some((item) => item.label === activeLabel))

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        moreButtonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  const renderAction = (item: MobileNavAction, index: number, inMenu = false) => {
    const active = item.label === activeLabel ||
      ('href' in item && item.href?.split('#')[0] === currentPath)
    const className = `${inMenu ? 'mobile-app-more-link' : 'mobile-app-nav-item'}${active ? ' active' : ''}`
    const icon = !inMenu && <span className="mobile-app-nav-icon" aria-hidden="true">{item.icon}</span>
    const label = <span>{item.label}</span>
    const onClick = () => {
      setOpen(false)
      if ('onClick' in item && item.onClick) item.onClick()
    }

    return item.href
      ? <a className={className} href={item.href} key={`${item.label}-${index}`} aria-current={active ? 'page' : undefined} onClick={onClick}>{icon}{label}</a>
      : <button className={className} type="button" key={`${item.label}-${index}`} onClick={onClick}>{icon}{label}</button>
  }

  return (
    <>
      <div className="mobile-app-nav-spacer" aria-hidden="true" />
      <div className="mobile-app-nav-wrap">
        {open && <button className="mobile-app-nav-scrim" type="button" aria-label="Close more menu" onClick={() => setOpen(false)} />}
        <div className="mobile-app-more-menu" id="mobile-app-more-menu" aria-label="More navigation" hidden={!open}>
          {moreItems.map((item, index) => renderAction(item, index, true))}
        </div>
        <nav className="mobile-app-nav" aria-label="Mobile navigation">
          {primaryItems.map((item, index) => renderAction(item, index))}
          <button
            ref={moreButtonRef}
            className={`mobile-app-nav-item${isMoreActive ? ' active' : ''}`}
            type="button"
            aria-expanded={open}
            aria-controls="mobile-app-more-menu"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="mobile-app-nav-icon" aria-hidden="true">☰</span>
            <span>More</span>
          </button>
        </nav>
      </div>
    </>
  )
}
