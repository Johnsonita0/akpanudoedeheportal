import './Logo.css'

export default function Logo() {
  return (
    <div className="brand" aria-label="Supporters Group for Gov. Umo Eno">
      <div className="brand-mark">
        <svg viewBox="0 0 64 64" role="img" aria-label="Supporters Group logo">
          <circle cx="32" cy="32" r="29" fill="#fff" stroke="#168a5b" strokeWidth="3" />
          <circle cx="32" cy="32" r="24" fill="none" stroke="#168a5b" strokeWidth="1.5" />
          <path d="M32 10l5 8 9-2-2 9 8 7-9 4-1 10-10-4-10 4-1-10-9-4 8-7-2-9 9 2z" fill="#168a5b" />
          <circle cx="32" cy="32" r="8" fill="#f8d34b" />
        </svg>
      </div>
      <div className="brand-text">
        <span>SUPPORT</span>
        <strong>RISE</strong>
      </div>
    </div>
  )
}
