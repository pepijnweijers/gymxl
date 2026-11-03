export type Kind = { id: string; naam: string; scores: Record<string, number> } // skillId -> score 1 t/m 3

export function maakGroepjes<K extends Kind>(kinderen: K[], oefeningSkills: string[], grootte: number) {
  const nietBeoordeeld = kinderen.filter(k => oefeningSkills.some(s => k.scores[s] == null))
  const beoordeeld = kinderen.filter(k => !nietBeoordeeld.includes(k))

  const primair = (k: K) => oefeningSkills.reduce((som, s) => som + k.scores[s]!, 0)
  const algemeen = (k: K) => {
    const andere = Object.entries(k.scores).filter(([s]) => !oefeningSkills.includes(s))
    return andere.length ? andere.reduce((som, [, v]) => som + v, 0) / andere.length : 0
  }

  const rij = [...beoordeeld].sort((a, b) => primair(b) - primair(a) || algemeen(b) - algemeen(a))

  const groepjes: K[][] = []
  for (let i = 0; i < rij.length; i += grootte) groepjes.push(rij.slice(i, i + grootte))

  // Restregel: laatste groepje kleiner dan de helft? Dan bij het groepje ervoor.
  if (groepjes.length > 1 && groepjes.at(-1)!.length < grootte / 2) {
    const rest = groepjes.pop()!
    groepjes.at(-1)!.push(...rest)
  }

  return { groepjes, nietBeoordeeld }
}
