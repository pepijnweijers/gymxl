import { describe, expect, it } from 'vitest'
import { metOutbox, outbox } from '../composables/offline'

describe('metOutbox', () => {
  it('legt offline wijzigingen over een gecachte lijst', () => {
    outbox.value = [
      { collection: 'aanwezigheid', method: 'create', id: 'nieuw', data: { training: 't1', aanwezig: true } },
      { collection: 'aanwezigheid', method: 'create', id: 'ander', data: { training: 't2', aanwezig: true } },
      { collection: 'aanwezigheid', method: 'update', id: 'a', data: { aanwezig: false } },
      { collection: 'aanwezigheid', method: 'delete', id: 'b' },
      { collection: 'skills', method: 'delete', id: 'a' },
    ]
    const items = [{ id: 'a', aanwezig: true }, { id: 'b', aanwezig: true }] as any[]
    const r = metOutbox('aanwezigheid', items, d => d.training === 't1')
    expect(r.map(x => [x.id, x.aanwezig])).toEqual([['a', false], ['nieuw', true]])
  })
})
