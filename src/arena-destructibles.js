// Canonical destructible props for Frozen River. Keep IDs and coordinates stable across clients.
export const ARENA_DESTRUCTIBLES = Object.freeze([
  { id: 'bunker-west', kind: 'bunker', x: -20, y: 1.2, z: 13, radius: 5, hp: 160 },
  { id: 'bunker-east', kind: 'bunker', x: 20, y: 1.2, z: 13, radius: 5, hp: 160 },
  { id: 'sandbag-west', kind: 'sandbag', x: -13, y: 0.55, z: 5, radius: 2.1, hp: 45 },
  { id: 'sandbag-east', kind: 'sandbag', x: 13, y: 0.55, z: 5, radius: 2.1, hp: 45 },
  { id: 'bridge-rail-west', kind: 'bridge-rail', x: -8.4, y: 1.15, z: 8, radius: 2.1, hp: 65 },
  { id: 'bridge-rail-east', kind: 'bridge-rail', x: 8.4, y: 1.15, z: 8, radius: 2.1, hp: 65 },
  ...Array.from({ length: 5 }, (_, i) => ({
    id: 'supply-crate-' + (i + 1), kind: 'supply-crate',
    x: i < 4 ? -23.6 + (i % 4) * 2.4 : 20 + (i - 4) * 2.4,
    y: 0.65, z: i < 4 ? -20 : 24, radius: 1.2, hp: 45
  }))
]);
