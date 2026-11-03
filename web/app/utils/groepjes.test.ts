import { describe, expect, it } from 'vitest'
import { maakGroepjes } from './groepjes'

const kind = (naam: string, handen: number, springen: number, algemeen: number) =>
  ({ id: naam, naam, scores: { handen, springen, overig: algemeen } })

describe('maakGroepjes', () => {
  it('volgt het radslag-voorbeeld uit het bouwplan', () => {
    const kinderen = [kind('Tess', 1, 2, 1.2), kind('Sara', 3, 3, 1.4), kind('Noor', 3, 3, 2.8), kind('Liam', 2, 2, 1.6),
      kind('Finn', 3, 3, 1.9), kind('Daan', 3, 2, 2.0), kind('Emma', 3, 3, 2.1)]
    const { groepjes } = maakGroepjes(kinderen, ['handen', 'springen'], 3)
    expect(groepjes.map(g => g.map(k => k.naam))).toEqual([['Noor', 'Emma', 'Finn'], ['Sara', 'Daan', 'Liam', 'Tess']])
  })

  it.each([[7, 3, [3, 4]], [8, 3, [3, 3, 2]], [9, 5, [5, 4]], [11, 5, [5, 6]]])('restregel: %i kinderen, grootte %i', (n, grootte, verwacht) => {
    const kinderen = Array.from({ length: n }, (_, i) => kind(String(i), 3, 3, i))
    expect(maakGroepjes(kinderen, ['handen'], grootte).groepjes.map(g => g.length)).toEqual(verwacht)
  })

  it('zet kinderen zonder score op een oefeningskill apart', () => {
    const r = maakGroepjes([kind('A', 3, 3, 3), { id: 'B', naam: 'B', scores: { handen: 2 } }], ['handen', 'springen'], 3)
    expect(r.nietBeoordeeld.map(k => k.naam)).toEqual(['B'])
    expect(r.groepjes).toHaveLength(1)
  })
})
