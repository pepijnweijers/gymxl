import type { RecordModel } from 'pocketbase'
import { ref } from 'vue'

// Tijdelijk offline werken:
// - lezen: laatste antwoord per query staat in localStorage en wordt gebruikt als er geen netwerk is;
// - schrijven: lukt het niet door geen netwerk, dan gaat de wijziging in een wachtrij (outbox)
//   die op volgorde wordt verstuurd zodra er weer bereik is.
// shortcut: localStorage (±5 MB), ruim genoeg voor één club; bij groei naar IndexedDB.

type Actie = { collection: string; method: 'create' | 'update' | 'delete'; id: string; data?: Record<string, any>; expand?: Record<string, any> }

const CACHE = 'gymxl-cache:'
const OUTBOX = 'gymxl-outbox'

const opslag = {
  lees: <T>(key: string, standaard: T): T => { try { return JSON.parse(localStorage.getItem(key) ?? '') } catch { return standaard } },
  schrijf: (key: string, waarde: unknown) => { try { localStorage.setItem(key, JSON.stringify(waarde)) } catch { /* vol of geblokkeerd: dan alleen online */ } },
}

export const outbox = ref<Actie[]>(import.meta.client ? opslag.lees(OUTBOX, []) : [])
const bewaarOutbox = () => opslag.schrijf(OUTBOX, outbox.value)

/** Geen antwoord van de server (offline, time-out). Status 0 bij een mislukte fetch in de PocketBase-SDK. */
export const isNetwerkFout = (e: any) => e?.status === 0 && !e?.isAbort

/** PocketBase-id: 15 tekens a-z0-9, zodat records ook offline een id krijgen. */
export const nieuwId = () => Array.from(crypto.getRandomValues(new Uint8Array(15)), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('')

function verstuur(a: Actie) {
  const c = usePb().collection(a.collection)
  if (a.method === 'create') return c.create({ id: a.id, ...a.data })
  if (a.method === 'update') return c.update(a.id, a.data!)
  return c.delete(a.id)
}

/** Schrijf een wijziging; offline komt hij in de wachtrij. Geeft (een voorlopige versie van) het record terug. */
export async function schrijf(collection: string, method: Actie['method'], id: string | null, data?: Record<string, any>, expand?: Record<string, any>): Promise<RecordModel> {
  const actie: Actie = { collection, method, id: id ?? nieuwId(), data, expand }
  // Staat er al iets in de wachtrij, dan erachter aansluiten: volgorde blijft gelijk.
  if (!outbox.value.length) {
    try {
      const r = await verstuur(actie)
      return (typeof r === 'object' ? r : { id: actie.id }) as RecordModel
    } catch (e) {
      if (!isNetwerkFout(e)) throw e
    }
  }
  outbox.value.push(actie)
  bewaarOutbox()
  return { id: actie.id, collectionId: '', collectionName: collection, ...data, ...(expand && { expand }) } as RecordModel
}

let bezig = false
/** Wachtrij versturen. Wordt aangeroepen bij start, bij 'online' en periodiek. */
export async function synchroniseer() {
  if (bezig || !outbox.value.length) return
  bezig = true
  const toast = useToast()
  let verstuurd = 0
  try {
    while (outbox.value.length) {
      try {
        await verstuur(outbox.value[0]!)
        verstuurd++
      } catch (e: any) {
        if (isNetwerkFout(e)) return
        // De server weigert (bijv. al verwerkt of geen rechten meer): overslaan en melden, niet blijven proberen.
        toast.add({ title: 'Een offline wijziging kon niet worden opgeslagen', description: e?.message, color: 'error' })
      }
      outbox.value.shift()
      bewaarOutbox()
    }
  } finally {
    bezig = false
    if (verstuurd) toast.add({ title: `${verstuurd} offline wijziging(en) verstuurd`, color: 'success' })
  }
}

/** Wachtrij over een lijst leggen, zodat offline wijzigingen zichtbaar blijven. `hoort` bepaalt welke nieuwe records erbij horen. */
export function metOutbox(collection: string, items: RecordModel[], hoort?: (data: Record<string, any>, id: string) => boolean) {
  for (const a of outbox.value.filter(a => a.collection === collection)) {
    const i = items.findIndex(r => r.id === a.id)
    if (a.method === 'create' && i < 0 && hoort?.(a.data ?? {}, a.id)) items.push({ id: a.id, collectionId: '', collectionName: collection, ...a.data, expand: a.expand })
    else if (a.method === 'update' && i >= 0) Object.assign(items[i]!, a.data)
    else if (a.method === 'delete' && i >= 0) items.splice(i, 1)
  }
  return items
}

/** getFullList met offline-terugval. */
export async function lijst(collection: string, opties: Record<string, any> = {}, hoort?: (data: Record<string, any>, id: string) => boolean) {
  const key = CACHE + collection + JSON.stringify(opties)
  let items: RecordModel[]
  try {
    items = await usePb().collection(collection).getFullList(opties)
    opslag.schrijf(key, items)
  } catch (e) {
    if (!isNetwerkFout(e)) throw e
    items = opslag.lees(key, [])
  }
  return metOutbox(collection, items, hoort)
}

/** getOne met offline-terugval; vindt ook records die offline zijn aangemaakt. */
export async function een(collection: string, id: string, opties: Record<string, any> = {}) {
  const [r] = await lijst(collection, { ...opties, filter: usePb().filter('id = {:id}', { id }) }, (_, nieuw) => nieuw === id)
  if (!r) throw Object.assign(new Error('Niet gevonden (offline nog niet geladen)'), { status: 404 })
  return r
}

/** Bij uitloggen: gegevens van kinderen niet op het toestel laten staan. */
export function wisOfflineCache() {
  for (const key of Object.keys(localStorage)) if (key.startsWith(CACHE)) localStorage.removeItem(key)
}
