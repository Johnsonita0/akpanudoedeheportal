import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type InvalidEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import './SearchableOptionSelect.css'

export type SearchableOption = {
  value: string
  label: string
  disabled?: boolean
}

type SearchableOptionSelectProps = {
  options: SearchableOption[]
  value: string
  onChange: (value: string) => void
  name?: string
  required?: boolean
  disabled?: boolean
  className?: string
  ariaLabel?: string
  placeholder: string
  searchLabel: string
  searchPlaceholder: string
}

export default function SearchableOptionSelect({
  options,
  value,
  onChange,
  name,
  required = false,
  disabled = false,
  className,
  ariaLabel,
  placeholder,
  searchLabel,
  searchPlaceholder,
}: SearchableOptionSelectProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuPosition, setMenuPosition] = useState<CSSProperties>({})
  const selectedOption = options.find((option) => option.value === value)
  const filteredOptions = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  )

  useEffect(() => {
    if (!open) return

    searchRef.current?.focus()
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  useLayoutEffect(() => {
    if (!open) return

    const positionMenu = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const viewportPadding = 12
      const maxHeight = Math.min(320, window.innerHeight - viewportPadding * 2)
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const spaceAbove = rect.top - 8
      const openAbove = spaceBelow < Math.min(260, maxHeight) && spaceAbove > spaceBelow
      const availableHeight = Math.max(100, Math.min(maxHeight, openAbove ? spaceAbove : spaceBelow))
      const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2)
      const left = Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - width - viewportPadding))
      const top = openAbove ? rect.top - availableHeight - 5 : rect.bottom + 5
      setMenuPosition({
        top: Math.max(viewportPadding, top),
        left,
        width,
        maxHeight: availableHeight,
        '--option-menu-max-height': `${availableHeight}px`,
      } as CSSProperties)
    }

    positionMenu()
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
    }
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
    const optionButtons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('.searchable-option-item') ?? [])
    const currentIndex = optionButtons.indexOf(event.currentTarget)
    const nextIndex = event.key === 'ArrowDown'
      ? Math.min(currentIndex + 1, optionButtons.length - 1)
      : Math.max(currentIndex - 1, 0)
    optionButtons[nextIndex]?.focus()
  }

  return (
    <div className={`searchable-option${className ? ` ${className}` : ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        className="searchable-option-trigger"
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-required={required}
        aria-label={ariaLabel}
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
        <span className={selectedOption ? '' : 'searchable-option-placeholder'}>{selectedOption?.label ?? placeholder}</span>
        <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m3 6 5 5 5-5" /></svg>
      </button>
      <select
        className="searchable-option-validation"
        aria-hidden="true"
        tabIndex={-1}
        required={required}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onInvalid={handleInvalid}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
      {open && createPortal(
        <div className="searchable-option-menu" ref={menuRef} style={menuPosition}>
          <input
            ref={searchRef}
            className="searchable-option-search"
            type="search"
            autoComplete="off"
            aria-label={searchLabel}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                close()
              } else if (event.key === 'ArrowDown') {
                event.preventDefault()
                menuRef.current?.querySelector<HTMLButtonElement>('.searchable-option-item')?.focus()
              }
            }}
          />
          <div className="searchable-option-list" id={`${id}-options`} role="listbox" aria-label={searchLabel}>
            {filteredOptions.length > 0
              ? filteredOptions.map((option) => (
                <button
                  className="searchable-option-item"
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  disabled={option.disabled}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    close()
                  }}
                  onKeyDown={handleOptionKeyDown}
                >
                  {option.label}
                </button>
              ))
              : <p className="searchable-option-empty" role="status">No options match your search.</p>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
