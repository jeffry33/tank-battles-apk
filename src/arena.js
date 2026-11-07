import * as pc from 'playcanvas';

function makeMaterial(rgb, metalness = 0, gloss = 0.35) {
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(rgb[0], rgb[1], rgb[2]);
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
  const snow = makeMaterial([0.78, 0.85, 0.9], 0, 0.28);
  const ice = makeMaterial([0.22, 0.42, 0.52], 0.35, 0.82);
  const rock = makeMaterial([0.28, 0.32, 0.35], 0.05, 0.25);
  const pine = makeMaterial([0.07, 0.17, 0.15], 0, 0.3);
  const wood = makeMaterial([0.27, 0.22, 0.17], 0, 0.25);
  const metal = makeMaterial([0.22, 0.27, 0.3], 0.7, 0.7);
  const warning = makeMaterial([0.72, 0.18, 0.1], 0.1, 0.3);

  // Broad frozen channel and snow banks. These are art blockout meshes, not deformable terrain.
  primitive(app.root, 'Frozen river surface', 'box', [0, -0.08, 0], [10, 0.12, 88], ice);
  primitive(app.root, 'North river bank', 'box', [0, 0.02, -7], [14, 0.18, 72], snow);
  primitive(app.root, 'South river bank', 'box', [0, 0.02, 7], [14, 0.18, 72], snow);

  // Alpine rock formations and snow caps around the play space.
  const peaks = [
    [-42, 4, -35, 16, 10, 14], [-30, 3, -43, 13, 8, 12],
    [-12, 5, -43, 18, 12, 13], [12, 4, -43, 16, 10, 14],
    [34, 5, -39, 17, 12, 15], [43, 3, -16, 13, 8, 13],
    [-43, 4, 18, 15, 10, 16], [-33, 5, 40, 18, 12, 14],
    [-8, 4, 43, 17, 9, 13], [20, 5, 42, 18, 12, 14],
    [42, 4, 27, 16, 10, 15]
  ];
  peaks.forEach((p, i) => {
    primitive(app.root, 'Alpine rock ' + i, 'sphere', [p[0], p[1], p[2]], [p[3], p[4], p[5]], rock, [0, i * 13, i * 7]);
    primitive(app.root, 'Snow cap ' + i, 'sphere', [p[0] - 1, p[1] + p[4] * 0.34, p[2] - 0.5], [p[3] * 0.72, p[4] * 0.35, p[5] * 0.72], snow);
  });

  // Pine clusters along the outer perimeter.
  const treePositions = [
    [-35,-25],[-29,-32],[-22,-29],[-40,-7],[-35,2],[-30,29],[-23,34],
    [29,-31],[36,-24],[40,-5],[34,8],[29,30],[39,35],[-12,35],[14,35]
  ];
  treePositions.forEach((p, i) => {
    const h = 4.5 + (i % 3) * 0.8;
    primitive(app.root, 'Pine trunk ' + i, 'cylinder', [p[0], h * 0.22, p[1]], [0.42, h * 0.48, 0.42], wood);
    primitive(app.root, 'Pine crown ' + i, 'cone', [p[0], h * 0.72, p[1]], [2.6, h, 2.6], pine);
    primitive(app.root, 'Pine snow ' + i, 'cone', [p[0], h * 0.88, p[1]], [2.1, h * 0.7, 2.1], snow);
  });

  // Two reinforced bunkers with sandbag-style cover.
  [-1, 1].forEach((side, i) => {
    const x = side * 25;
    const z = i === 0 ? -4 : 4;
    primitive(app.root, 'Bunker concrete ' + i, 'box', [x, 1.1, z], [7, 2.2, 5], rock);
    primitive(app.root, 'Bunker roof ' + i, 'box', [x, 2.35, z], [7.8, 0.45, 5.8], snow);
    primitive(app.root, 'Bunker entrance ' + i, 'box', [x, 0.8, z + (side * -2.52)], [2.2, 1.5, 0.18], metal);
  });

  // Spawn pads and simple beacons for four deployment directions.
  const spawns = [[-31, -31], [31, -31], [-31, 31], [31, 31]];
  spawns.forEach((p, i) => {
    primitive(app.root, 'Spawn marker ' + (i + 1), 'cylinder', [p[0], 0.16, p[1]], [5.5, 0.22, 5.5], warning);
    primitive(app.root, 'Spawn beacon ' + (i + 1), 'cylinder', [p[0], 1.5, p[1]], [0.22, 2.7, 0.22], metal);
  });

  // Bridge rails and warning posts.
  [-2.7, 2.7].forEach((x, i) => {
    primitive(app.root, 'Bridge rail ' + i, 'box', [x, 0.72, 5], [0.22, 0.85, 7], wood);
  });
  [-1, 1].forEach((side) => {
    for (let i = 0; i < 4; i++) {
      primitive(app.root, 'Bridge warning post', 'box', [side * 3.4, 0.55, 2 + i * 2], [0.2, 1.1, 0.2], warning);
    }
  });

  // Cover crates and fuel drums. Combat can remove these on blast.
  const destructibles = [];
  [[-15, 0, -14], [15, 0, -14], [-18, 0, 17], [18, 0, 18], [-7, 0, 23], [8, 0, -23]].forEach((p, i) => {
    const crate = primitive(app.root, 'Destructible supply crate ' + i, 'box', [p[0], 0.85, p[2]], [1.7, 1.7, 1.7], wood, [0, i * 17, 0]);
    destructibles.push({ entity: crate, x: p[0], z: p[2], radius: 3.5 });
  });
  [[-20, 0, -20], [20, 0, 22]].forEach((p, i) => {
    const drum = primitive(app.root, 'Destructible fuel drum ' + i, 'cylinder', [p[0], 0.75, p[2]], [0.8, 1.5, 0.8], warning);
    destructibles.push({ entity: drum, x: p[0], z: p[2], radius: 4.5 });
  });

  window.tankBattleDestructibles = destructibles;
  return { destructibles };
}
