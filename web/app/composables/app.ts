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

/** Expand die teamRecht nodig heeft voor rechten via trainersgroepen. */
export const TEAM_EXPAND = 'groepen_bewerken'

/** Rechten van de ingelogde gebruiker op een team (team geladen met TEAM_EXPAND). */
export function teamRecht(team: RecordModel | null | undefined) {
  const u = useUser().value
  if (!team || !u) return { eigenaar: false, bewerken: false }
  const eigenaar = u.rol === 'admin' || team.eigenaar === u.id
  const viaGroep = (team.expand?.groepen_bewerken ?? []).some((g: RecordModel) => g.leden?.includes(u.id))
  return { eigenaar, bewerken: eigenaar || team.bewerkers?.includes(u.id) || viaGroep }
}

/** Huidige scores van alle kinderen in een team. Overal dezelfde query, zodat de offline-cache gedeeld wordt. */
export const huidigeScores = (teamId: string) =>
  lijst('huidige_scores', { filter: usePb().filter('leerling.team_leerlingen_via_leerling.team ?= {:t}', { t: teamId }), fields: 'leerling,skill,score,datum' })
