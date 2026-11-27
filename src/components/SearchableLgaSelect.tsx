import { useEffect, useId, useRef, useState, type InvalidEvent, type KeyboardEvent } from 'react'
import { lgas } from '../campaignData'
import './SearchableLgaSelect.css'

type SearchableLgaSelectProps = {
  value: string
  onChange: (value: string) => void
  name?: string
  required?: boolean
  disabled?: boolean
}

export default function SearchableLgaSelect({
  value,
  onChange,
  name,
  required = false,
  disabled = false,
}: SearchableLgaSelectProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const options = lgas.filter((lga) => lga.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))

  useEffect(() => {
    if (!open) return

    searchRef.current?.focus()
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const close = () => {
    setOpen(false)
    setQuery('')
    triggerRef.current?.focus()
  }

  const handleInvalid = (event: InvalidEvent<HTMLSelectElement>) => {
    event.preventDefault()
    setOpen(true)
  }

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const optionButtons = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('.searchable-lga-option') ?? [])
    const currentIndex = optionButtons.indexOf(event.currentTarget)
    const nextIndex = event.key === 'ArrowDown'
      ? Math.min(currentIndex + 1, optionButtons.length - 1)
      : Math.max(currentIndex - 1, 0)
    optionButtons[nextIndex]?.focus()
  }

  return (
    <div className="searchable-lga" ref={rootRef}>
      <button
        ref={triggerRef}
        className="searchable-lga-trigger"
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-required={required}
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current)
          setQuery('')
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span className={value ? '' : 'searchable-lga-placeholder'}>{value || 'Select LGA'}</span>
        <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m3 6 5 5 5-5" /></svg>
      </button>
      <select
        className="searchable-lga-validation"
        aria-hidden="true"
        tabIndex={-1}
        required={required}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onInvalid={handleInvalid}
      >
        <option value="">Select LGA</option>
        {lgas.map((lga) => <option key={lga} value={lga}>{lga}</option>)}
      </select>
      {open && (
        <div className="searchable-lga-menu">
          <input
            ref={searchRef}
            className="searchable-lga-search"
            type="search"
            autoComplete="off"
            aria-label="Search local government areas"
            placeholder="Search LGA"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                close()
              } else if (event.key === 'ArrowDown') {
                event.preventDefault()
                rootRef.current?.querySelector<HTMLButtonElement>('.searchable-lga-option')?.focus()
              }
            }}
          />
          <div className="searchable-lga-options" id={`${id}-options`} role="listbox" aria-label="Local government areas">
            {options.length > 0
              ? options.map((lga) => (
                <button
                  className="searchable-lga-option"
                  type="button"
                  role="option"
                  aria-selected={value === lga}
                  key={lga}
                  onClick={() => {
                    onChange(lga)
                    close()
                  }}
                  onKeyDown={handleOptionKeyDown}
                >
                  {lga}
                </button>
              ))
              : <p className="searchable-lga-empty" role="status">No LGAs match your search.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
