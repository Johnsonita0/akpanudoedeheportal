import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

export type PinDigits = [string, string, string, string]

type PinCodeInputProps = {
  label: string
  value: PinDigits
  onChange: (value: PinDigits) => void
  disabled?: boolean
  autoFocus?: boolean
}

export default function PinCodeInput({
  label,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
}: PinCodeInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  const enterDigits = (startIndex: number, entered: string) => {
    const digits = entered.replace(/\D/g, '').slice(0, 4 - startIndex)
    if (!digits) return
    const next = [...value] as PinDigits
    for (let offset = 0; offset < digits.length; offset += 1) {
      next[startIndex + offset] = digits[offset]
    }
    onChange(next)
    inputs.current[Math.min(startIndex + digits.length, 3)]?.focus()
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    const pasted = event.clipboardData.getData('text')
    if (!/\d/.test(pasted)) return
    event.preventDefault()
    enterDigits(index, pasted)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < 3) {
      event.preventDefault()
      inputs.current[index + 1]?.focus()
    }
  }

  return (
    <fieldset className="group-pin-fieldset" disabled={disabled}>
      <legend>{label}</legend>
      <div className="group-pin-inputs">
        {value.map((digit, index) => (
          <input
            key={index}
            ref={(element) => { inputs.current[index] = element }}
            type="password"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]*"
            maxLength={4}
            value={digit}
            aria-label={`PIN digit ${index + 1} of 4`}
            onChange={(event) => {
              const entered = event.currentTarget.value
              if (!entered) {
                const next = [...value] as PinDigits
                next[index] = ''
                onChange(next)
              } else {
                enterDigits(index, entered)
              }
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onPaste={(event) => handlePaste(event, index)}
            autoFocus={autoFocus && index === 0}
          />
        ))}
      </div>
    </fieldset>
  )
}
