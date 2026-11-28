import locations from './nigeriaLocations.json'

export const nigeriaStates = Object.keys(locations)

export function getLgasForState(state: string): string[] {
  return locations[state as keyof typeof locations] ?? []
}

function normalizeLocation(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, '')
}

function canonicalLgaName(state: string, lga: string): string {
  if (state === 'FCT' && normalizeLocation(lga) === 'abujamunicipalareacouncil') {
    return 'Municipal Area Council'
  }
  if (state === 'Oyo' && normalizeLocation(lga) === 'oyo') {
    return 'Oyo West'
  }
  return lga
}

export function canonicalLocation(state: string, lga: string): { state: string; lga: string } | null {
  const canonicalState = state.toLocaleLowerCase() === 'abuja'
    ? 'FCT'
    : nigeriaStates.find((item) => normalizeLocation(item) === normalizeLocation(state))
  if (!canonicalState) return null

  const requestedLga = normalizeLocation(canonicalLgaName(canonicalState, lga))
  const canonicalLga = getLgasForState(canonicalState)
    .find((item) => normalizeLocation(item) === requestedLga)
  return canonicalLga ? { state: canonicalState, lga: canonicalLga } : null
}

export function isValidLocation(state: string, lga: string): boolean {
  return canonicalLocation(state, lga) !== null
}

export function inferStateForLga(lga: string): string | null {
  const matchingStates = nigeriaStates.filter((state) => canonicalLocation(state, lga) !== null)
  return matchingStates.length === 1 ? matchingStates[0] : null
}
