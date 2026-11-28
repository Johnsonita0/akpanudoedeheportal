import { getLgasForState } from '../nigeriaLocations'
import SearchableOptionSelect from './SearchableOptionSelect'

type SearchableLgaSelectProps = {
  state: string
  value: string
  onChange: (value: string) => void
  name?: string
  required?: boolean
  disabled?: boolean
}

export default function SearchableLgaSelect({
  state,
  value,
  onChange,
  name,
  required = false,
  disabled = false,
}: SearchableLgaSelectProps) {
  const lgas = getLgasForState(state)
  return (
    <SearchableOptionSelect
      options={lgas.map((lga) => ({ value: lga, label: lga }))}
      value={value}
      onChange={onChange}
      name={name}
      required={required}
      disabled={disabled || !state}
      placeholder={state ? 'Select LGA' : 'Select state first'}
      searchLabel="Search local government areas"
      searchPlaceholder="Search LGA"
    />
  )
}
