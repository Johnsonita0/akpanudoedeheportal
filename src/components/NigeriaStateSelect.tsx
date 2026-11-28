import { nigeriaStates } from '../nigeriaLocations'
import SearchableOptionSelect from './SearchableOptionSelect'

type NigeriaStateSelectProps = {
  value: string
  onChange: (value: string) => void
  name?: string
  required?: boolean
  disabled?: boolean
}

export default function NigeriaStateSelect({
  value,
  onChange,
  name,
  required = false,
  disabled = false,
}: NigeriaStateSelectProps) {
  return (
    <SearchableOptionSelect
      options={nigeriaStates.map((state) => ({
        value: state,
        label: state === 'FCT' ? 'Federal Capital Territory (FCT)' : state,
      }))}
      value={value}
      onChange={onChange}
      name={name}
      required={required}
      disabled={disabled}
      placeholder="Select state"
      searchLabel="Search Nigerian states"
      searchPlaceholder="Search state"
    />
  )
}
