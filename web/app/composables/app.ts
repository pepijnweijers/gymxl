import type { RecordModel } from 'pocketbase'

export const usePb = () => useNuxtApp().$pb
export const useUser = () => useState<RecordModel | null>('user')
export const useIsAdmin = () => computed(() => useUser().value?.rol === 'admin')

/** Toast bij een fout; geeft de foutmelding van PocketBase door. */
export function useFout() {
  const toast = useToast()
  return (e: any) => {
    const velden = e?.response?.data ? Object.values(e.response.data).map((v: any) => v?.message).filter(Boolean).join(' ') : ''
    toast.add({ title: 'Er ging iets mis', description: velden || e?.response?.message || e?.message, color: 'error' })
  }
}

export const kindNaam = (l: RecordModel | undefined) => l ? [l.voornaam, l.initiaal].filter(Boolean).join(' ') : '?'
export const datumTekst = (d: string) => d ? new Date(d.replace(' ', 'T')).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
export const SCORES = [{ waarde: 1, label: 'Nog niet' }, { waarde: 2, label: 'Bezig' }, { waarde: 3, label: 'Beheerst' }]

/** Rechten van de ingelogde gebruiker op een team. */
export function teamRecht(team: RecordModel | null | undefined) {
  const u = useUser().value
  if (!team || !u) return { eigenaar: false, bewerken: false }
  const eigenaar = u.rol === 'admin' || team.eigenaar === u.id
  return { eigenaar, bewerken: eigenaar || team.bewerkers?.includes(u.id) }
}
