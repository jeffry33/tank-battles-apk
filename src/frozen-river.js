import * as pc from 'playcanvas';

function makeMaterial(rgb, metalness = 0, gloss = 0.35) {
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(...rgb);
  m.metalness = metalness;
  m.gloss = gloss;
  m.update();
  return m;
}

function primitive(parent, name, type, position, scale, material, rotation = [0, 0, 0]) {
  const entity = new pc.Entity(name);
  entity.addComponent('render', { type, material });
  entity.setLocalPosition(...position);
  entity.setLocalScale(...scale);
  entity.setLocalEulerAngles(...rotation);
  parent.addChild(entity);
  return entity;
}

export function buildFrozenRiverArena(app) {
  const root = new pc.Entity('Frozen River Alpine Warzone');
  app.root.addChild(root);
  const snow = makeMaterial([0.79, 0.86, 0.9], 0.04, 0.68);
  const ice = makeMaterial([0.22, 0.48, 0.59], 0.42, 0.9);
  const iceEdge = makeMaterial([0.55, 0.72, 0.78], 0.2, 0.78);
  const rock = makeMaterial([0.28, 0.33, 0.37], 0.08, 0.3);
  const darkRock = makeMaterial([0.15, 0.19, 0.22], 0.04, 0.25);
  const pine = makeMaterial([0.075, 0.19, 0.17], 0, 0.28);
  const wood = makeMaterial([0.31, 0.25, 0.18], 0.05, 0.28);
  const concrete = makeMaterial([0.37, 0.42, 0.44], 0.12, 0.42);
  const metal = makeMaterial([0.17, 0.23, 0.27], 0.68, 0.7);

  primitive(root, 'Snowfield', 'box', [0, -0.55, 0], [110, 0.8, 110], snow);
  primitive(root, 'Frozen river channel', 'box', [0, -0.08, 0], [11, 0.14, 106], ice);
  primitive(root, 'River left ice shelf', 'box', [-6.1, 0.02, 0], [1.4, 0.18, 105], iceEdge);
  primitive(root, 'River right ice shelf', 'box', [6.1, 0.02, 0], [1.4, 0.18, 105], iceEdge);

  // Layered mountain walls create a stronger alpine silhouette than the old box ridge.
  for (let i = 0; i < 13; i++) {
    const x = -52 + i * 8.7;
    const h = 11 + ((i * 7) % 13);
    const z = -48 + (i % 3) * 5;
    primitive(root, 'Alpine peak ' + i, 'cone', [x, h * 0.42, z], [13 + (i % 3) * 3, h, 15], rock, [0, i * 19, 0]);
    primitive(root, 'Snow cap ' + i, 'cone', [x, h * 0.78, z - 0.2], [8 + (i % 2) * 2, h * 0.48, 9], snow, [0, i * 19, 0]);
  }

  // Bridge deck, side rails and support piers.
  primitive(root, 'Military bridge deck', 'box', [0, 0.42, 8], [18, 0.65, 7], wood);
  for (const side of [-1, 1]) {
    primitive(root, 'Bridge rail ' + side, 'box', [side * 8.4, 1.15, 8], [0.38, 1.1, 7], metal);
    for (let p = -1; p <= 1; p++) primitive(root, 'Bridge pier', 'box', [side * 5.2, -0.4, 8 + p * 2.4], [0.8, 2.4, 0.8], concrete);
  }
  for (let z = 5; z <= 11; z += 1.5) primitive(root, 'Bridge plank', 'box', [0, 0.77, z], [17.2, 0.08, 0.12], concrete);

  // Bunkers on both banks with visible firing slits.
  for (const side of [-1, 1]) {
    const bx = side * 20;
    primitive(root, 'Concrete bunker', 'box', [bx, 1.2, 13], [10, 3.2, 8], concrete);
    primitive(root, 'Bunker roof snow', 'box', [bx, 2.95, 13], [10.8, 0.35, 8.8], snow);
    primitive(root, 'Bunker firing slit', 'box', [bx, 1.55, 8.94], [3.6, 0.48, 0.12], darkRock);
    primitive(root, 'Bunker entrance', 'box', [bx + side * 3.4, 0.8, 13], [1.2, 2.0, 0.14], darkRock);
    primitive(root, 'Sandbag wall', 'box', [bx - side * 7, 0.55, 5], [7, 1.1, 1.5], wood);
  }

  // Pine clusters and boulders around the perimeter, avoiding the central river/bridge.
  let seed = 91731;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 52; i++) {
    const x = (rand() - 0.5) * 96;
    const z = (rand() - 0.5) * 96;
    if (Math.abs(x) < 9 || (Math.abs(z - 8) < 7 && Math.abs(x) < 12)) continue;
    const h = 3.5 + rand() * 4.5;
    primitive(root, 'Pine trunk', 'cylinder', [x, 0.8, z], [0.42, 1.6, 0.42], wood);
    primitive(root, 'Pine lower crown', 'cone', [x, 1.9 + h * 0.25, z], [2.5, h * 0.58, 2.5], pine);
    primitive(root, 'Pine upper crown', 'cone', [x, 2.8 + h * 0.42, z], [1.8, h * 0.5, 1.8], pine);
  }
  for (let i = 0; i < 36; i++) {
    const x = (rand() - 0.5) * 96;
    const z = (rand() - 0.5) * 96;
    if (Math.abs(x) < 8) continue;
    const size = 1.2 + rand() * 2.8;
    primitive(root, 'Alpine boulder', 'sphere', [x, size * 0.3, z], [size, size * 0.7, size * 0.8], i % 2 ? rock : darkRock, [rand() * 30, rand() * 180, rand() * 20]);
  }

  // Four marked deployment pads.
  const spawnMat = makeMaterial([0.78, 0.58, 0.23], 0.25, 0.6);
  const spawns = [[-37, -36], [37, -36], [-37, 36], [37, 36]];
  spawns.forEach(([x, z], index) => {
    primitive(root, 'Deployment pad ' + (index + 1), 'box', [x, 0.04, z], [12, 0.12, 12], spawnMat);
    primitive(root, 'Landing marker ' + (index + 1), 'box', [x, 0.14, z], [5.5, 0.05, 0.25], metal);
    primitive(root, 'Landing marker cross ' + (index + 1), 'box', [x, 0.14, z], [0.25, 0.05, 5.5], metal);
  });

  // Military crates and radar mast as readable points of interest.
  for (let i = 0; i < 8; i++) {
    const x = (i % 4) * 2.4 - 3.6;
    const z = i < 4 ? -20 : 24;
    primitive(root, 'Supply crate', 'box', [x + (i < 4 ? -20 : 20), 0.65, z], [1.3, 1.3, 1.3], wood);
  }
  primitive(root, 'Radar mast', 'cylinder', [32, 4, -18], [0.18, 8, 0.18], metal);
  primitive(root, 'Radar dish', 'sphere', [32, 8.2, -18], [2.2, 0.45, 2.2], metal);

  return root;
}
