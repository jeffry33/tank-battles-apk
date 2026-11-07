import * as pc from 'playcanvas';
import { ArtilleryCombat } from './combat.js';
import { buildFrozenRiverArena } from './frozen-river.js';
import { DestructibleWorld } from './destructible-world.js';
import { MultiplayerClient } from './multiplayer-client.js';
import './style.css';

const canvas = document.getElementById('application-canvas');
const app = new pc.Application(canvas, {
  graphicsDeviceOptions: { antialias: true, alpha: false, preserveDrawingBuffer: false },
  mouse: new pc.Mouse(canvas),
  touch: new pc.TouchDevice(canvas)
});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.scene.ambientLight = new pc.Color(0.48, 0.52, 0.58);
app.start();

const camera = new pc.Entity('Camera');
camera.addComponent('camera', { clearColor: new pc.Color(0.48, 0.66, 0.82), farClip: 1200, fov: 58 });
app.root.addChild(camera);
camera.setPosition(0, 8, 13);
camera.lookAt(0, 0, 0);

const sun = new pc.Entity('Sun');
sun.addComponent('light', { type: 'directional', color: new pc.Color(1, 0.91, 0.78), intensity: 1.6, castShadows: true, shadowResolution: 1024 });
sun.setEulerAngles(45, 35, 0);
app.root.addChild(sun);

function material(color, metalness=0, gloss=0.35) {
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(color[0], color[1], color[2]);
  m.metalness = metalness;
  m.gloss = gloss;
  m.update();
  return m;
}
const groundMat = material([0.24,0.31,0.25]);
const tankMat = material([0.19,0.25,0.18], 0.35, 0.55);
const darkMat = material([0.055,0.065,0.06], 0.1, 0.2);
const metalMat = material([0.32,0.34,0.31], 0.7, 0.7);
const snowMat = material([0.78,0.84,0.88]);

function box(parent, name, pos, scale, mat) {
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'box', material: mat });
  e.setLocalPosition(pos[0],pos[1],pos[2]);
  e.setLocalScale(scale[0],scale[1],scale[2]);
  parent.addChild(e);
  return e;
}
function cylinder(parent, name, pos, scale, mat) {
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'cylinder', material: mat });
  e.setLocalPosition(pos[0],pos[1],pos[2]);
  e.setLocalScale(scale[0],scale[1],scale[2]);
  parent.addChild(e);
  return e;
}

// Expanded procedural Frozen River arena.
buildFrozenRiverArena(app);

// Detailed procedural tank blockout: layered hull, tracks, road wheels, turret and elevated cannon.
const tank = new pc.Entity('Player Tank');
app.root.addChild(tank);
const trackMat = material([0.055,0.067,0.064], 0.18, 0.3);
const wheelMat = material([0.16,0.19,0.18], 0.62, 0.55);
const accentMat = material([0.38,0.34,0.23], 0.35, 0.5);
const glassMat = material([0.055,0.12,0.15], 0.72, 0.9);
box(tank,'Lower armored chassis',[0,0.46,0],[3.25,0.55,4.35],darkMat);
box(tank,'Upper sloped hull',[0,0.98,0],[2.9,0.82,3.95],tankMat);
box(tank,'Front glacis',[0,1.18,-1.75],[2.75,0.36,0.75],tankMat).setLocalEulerAngles(-17,0,0);
box(tank,'Rear engine deck',[0,1.32,1.35],[2.5,0.28,1.0],darkMat);
for (const side of [-1,1]) {
  box(tank,'Track belt '+side,[side*1.62,0.55,0],[0.42,0.86,4.5],trackMat);
  for (let i=0;i<7;i++) {
    const wheel = cylinder(tank,'Road wheel '+side+' '+i,[side*1.86,0.54,-1.65+i*0.55],[0.58,0.58,0.18],wheelMat);
    wheel.setLocalEulerAngles(0,0,90);
    const hub = cylinder(tank,'Wheel hub '+side+' '+i,[side*1.96,0.54,-1.65+i*0.55],[0.24,0.24,0.2],metalMat);
    hub.setLocalEulerAngles(0,0,90);
  }
  const sprocket = cylinder(tank,'Drive sprocket '+side,[side*1.86,0.56,2.02],[0.72,0.72,0.2],accentMat);
  sprocket.setLocalEulerAngles(0,0,90);
  for (let i=0;i<12;i++) {
    const z=-2.12+i*0.38;
    box(tank,'Track tread '+side+' '+i,[side*1.87,0.99,z],[0.45,0.08,0.25],metalMat);
    box(tank,'Track tread lower '+side+' '+i,[side*1.87,0.12,z],[0.45,0.08,0.25],metalMat);
  }
}
box(tank,'Front bumper',[0,0.62,-2.18],[2.75,0.24,0.25],metalMat);
for (const side of [-1,1]) {
  box(tank,'Headlight '+side,[side*1.05,1.02,-2.02],[0.28,0.2,0.12],glassMat);
  box(tank,'Side armor plate '+side,[side*1.48,0.88,0],[0.18,0.6,2.9],tankMat);
  box(tank,'Side marking '+side,[side*1.58,0.92,0.2],[0.04,0.12,0.65],accentMat);
}
const turret = new pc.Entity('Rotating Turret');
tank.addChild(turret);
turret.setLocalPosition(0,1.48,-0.1);
cylinder(turret,'Turret ring',[0,0,0],[1.72,0.32,1.72],metalMat);
box(turret,'Turret armored shell',[0,0.34,0],[1.9,0.66,2.0],tankMat);
box(turret,'Commander cupola',[0,0.76,0.48],[0.72,0.28,0.72],darkMat);
cylinder(turret,'Cupola hatch',[0,0.94,0.48],[0.45,0.12,0.45],metalMat);
const barrelPivot = new pc.Entity('Cannon Elevation Pivot');
turret.barrelPivot = barrelPivot;
turret.addChild(barrelPivot);
barrelPivot.setLocalPosition(0,0.42,-0.8);
const barrel = cylinder(barrelPivot,'Main cannon barrel',[0,0,-1.15],[0.2,0.2,2.5],metalMat);
barrel.setLocalEulerAngles(90,0,0);
const muzzle = cylinder(barrelPivot,'Muzzle brake',[0,0,-2.43],[0.34,0.34,0.42],darkMat);
muzzle.setLocalEulerAngles(90,0,0);
box(turret,'Optics housing',[0,0.62,-0.72],[0.48,0.22,0.4],glassMat);
for (const side of [-1,1]) {
  const smoke = cylinder(turret,'Smoke launcher '+side,[side*0.72,0.52,0.55],[0.18,0.18,0.52],darkMat);
  smoke.setLocalEulerAngles(90,0,0);
}
// Basic camera follow and temporary touch controls.
let moveX=0, moveY=0, turretYaw=0, shotCooldown=0;
const joystick = document.getElementById('joystick');
const stick = document.getElementById('stick');
let joyPointer=null, aimPointer=null, lastAimX=0, lastAimY=0;
joystick.addEventListener('pointerdown', e => { joyPointer=e.pointerId; joystick.setPointerCapture(e.pointerId); });
joystick.addEventListener('pointermove', e => {
  if (e.pointerId!==joyPointer) return;
  const r=joystick.getBoundingClientRect(), dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2);
  const len=Math.max(1,Math.hypot(dx,dy)), k=Math.min(1,42/len);
  moveX=dx/42*k; moveY=dy/42*k;
  stick.style.transform=`translate(${moveX*34}px,${moveY*34}px)`;
});
function resetJoy(e) { if(e.pointerId!==joyPointer)return; joyPointer=null; moveX=moveY=0; stick.style.transform=''; }
joystick.addEventListener('pointerup',resetJoy); joystick.addEventListener('pointercancel',resetJoy);
const aimPad=document.getElementById('aim-pad');
aimPad.addEventListener('pointerdown',e=>{aimPointer=e.pointerId;lastAimX=e.clientX;lastAimY=e.clientY;aimPad.setPointerCapture(e.pointerId);});
aimPad.addEventListener('pointermove',e=>{if(e.pointerId!==aimPointer)return;turretYaw-=(e.clientX-lastAimX)*0.45;lastAimX=e.clientX;lastAimY=e.clientY;});
aimPad.addEventListener('pointerup',e=>{if(e.pointerId===aimPointer)aimPointer=null;});
const message=document.getElementById('message');
const destructibleWorld = new DestructibleWorld(app, message);
const combat = new ArtilleryCombat(app, tank, turret, camera, message, destructibleWorld);
let networkMoveAccumulator = 0;
app.on('update', dt => {
  shotCooldown=Math.max(0,shotCooldown-dt);
  networkMoveAccumulator += dt;
  if (multiplayer.playerId && networkTurnDeadline > 0) {
    const remaining = Math.max(0, Math.ceil((networkTurnDeadline - Date.now()) / 1000));
    if (isMyNetworkTurn) combat.turnSeconds = remaining;
    const timer = document.getElementById('turn-timer');
    if (timer) timer.textContent = 'TURN ' + remaining + 's';
  }
  const forward = -moveY*dt*7;
  if (multiplayer.playerId && isDeployingNetwork) {
    myLandingX = Math.max(-44, Math.min(44, myLandingX + moveX * dt * 10));
    myLandingZ = Math.max(-44, Math.min(44, myLandingZ - moveY * dt * 10));
  } else if (!combat.turnLocked && (!multiplayer.playerId || isMyNetworkTurn)) tank.translateLocal(moveX*dt*7,0,forward);
  if (!combat.turnLocked && (!multiplayer.playerId || isMyNetworkTurn)) turret.setEulerAngles(0,turretYaw,0);
  if (networkMoveAccumulator >= 0.12) {
    networkMoveAccumulator = 0;
    if (multiplayer.playerId && isMyNetworkTurn && !combat.turnLocked) {
      const position = tank.getPosition();
      multiplayer.move(position.x, position.z, turretYaw);
    }
  }
  const current = camera.getPosition();
  const desired = tank.getPosition().clone().add(new pc.Vec3(0,7,12));
  camera.setPosition(current.lerp(desired,Math.min(1,dt*3)));
  camera.lookAt(tank.getPosition().clone().add(new pc.Vec3(0,1,0)));
});
window.addEventListener('resize',()=>app.resizeCanvas());
document.getElementById('message').textContent='TANK BATTLE · Visual foundation blockout';


// Optional network integration. Enter the publicly hosted WebSocket URL on the HUD.
const networkStatus = document.getElementById('message');
const networkProjectiles = [];
const networkExplosions = [];
const networkTrailPuffs = [];
let cinematicProjectile = null;
let cinematicCameraReturn = null;
let recoilRemaining = 0;
let muzzleFlashRemaining = 0;
let muzzleFlashEntity = null;
const muzzleFlashMaterial = material([1, 0.68, 0.2], 0, 0.9);
muzzleFlashMaterial.emissive = new pc.Color(1, 0.38, 0.05);
muzzleFlashMaterial.update();
const recoilOrigin = new pc.Vec3(0, 0, -0.8);
const networkTrailMaterial = material([0.32, 0.34, 0.33], 0, 0.12);
networkTrailMaterial.opacity = 0.52;
networkTrailMaterial.blendType = pc.BLEND_NORMAL;
networkTrailMaterial.update();
function spawnNetworkShot(data) {
  if (!data?.impact || !data?.shot || !data?.state) return;
  const shooter = (data.state.players || []).find(player => player.id === data.playerId);
  if (!shooter) return;
  const shot = data.shot;
  const yaw = shot.yaw * Math.PI / 180;
  const elevation = shot.elevation * Math.PI / 180;
  const speed = shot.power / 100 * 42;
  const velocity = new pc.Vec3(
    -Math.sin(yaw) * Math.cos(elevation) * speed,
    Math.sin(elevation) * speed,
    -Math.cos(yaw) * Math.cos(elevation) * speed
  );
  const shellMaterial = material([1, 0.58, 0.12], 0.25, 0.8);
  shellMaterial.emissive = new pc.Color(1, 0.32, 0.04);
  shellMaterial.update();
  const shell = new pc.Entity('Network Artillery Projectile');
  shell.addComponent('render', { type: 'sphere', material: shellMaterial });
  shell.setLocalScale(0.42, 0.42, 0.42);
  shell.setPosition(shooter.x, 1.8, shooter.z);
  app.root.addChild(shell);
  // Brief muzzle flash and cannon recoil on the local tank when it fires.
  if (data.playerId === multiplayer.playerId) {
    muzzleFlashEntity?.destroy();
    muzzleFlashEntity = new pc.Entity('Cannon muzzle flash');
    muzzleFlashEntity.addComponent('render', { type: 'sphere', material: muzzleFlashMaterial });
    muzzleFlashEntity.setLocalScale(0.95, 0.95, 1.5);
    barrelPivot.addChild(muzzleFlashEntity);
    muzzleFlashEntity.setLocalPosition(0, 0, -2.8);
    muzzleFlashRemaining = 0.12;
    recoilRemaining = 0.18;
  }
  // Camera follows the authoritative projectile for a short cinematic shot.
  if (!cinematicProjectile) {
    cinematicCameraReturn = camera.getPosition().clone();
    cinematicProjectile = shell;
  }
  networkProjectiles.push({
    entity: shell,
    origin: new pc.Vec3(shooter.x, 1.8, shooter.z),
    velocity,
    elapsed: 0,
    duration: Math.max(0.04, data.impact.flightSeconds || 0.04),
    impact: data.impact,
    lastTrailAt: 0
  });
}
function spawnNetworkExplosion(position, radius) {
  const fxMaterial = material([1, 0.26, 0.035], 0, 0.25);
  fxMaterial.emissive = new pc.Color(1, 0.12, 0.015);
  fxMaterial.update();
  const fx = new pc.Entity('Network Impact Explosion');
  fx.addComponent('render', { type: 'sphere', material: fxMaterial });
  fx.setPosition(position.x, Math.max(0.5, position.y), position.z);
  fx.setLocalScale(0.6, 0.6, 0.6);
  app.root.addChild(fx);
  networkExplosions.push({ entity: fx, life: 0.65, duration: 0.65, radius: Math.max(2, radius || 4) });
}
const remoteTanks = new Map();
const parachuteRigs = new Map();
let deploymentStartAt = 0;
let myLandingX = -30, myLandingZ = -30;
let isDeployingNetwork = false;
let isMyNetworkTurn = false;
let networkTurnDeadline = 0;
const multiplayer = new MultiplayerClient({
  onStatus: status => { networkStatus.textContent = status; },
  onState: state => {
    const count = state.players?.length ?? 0;
    isMyNetworkTurn = state.currentPlayerId === multiplayer.playerId;
    combat.onlineMode = Boolean(multiplayer.playerId);
    networkTurnDeadline = state.turnDeadline || 0;
    if (multiplayer.playerId) {
      const me = (state.players || []).find(p => p.id === multiplayer.playerId);
      if (me) {
        combat.hp = me.hp;
        combat.updateHud();
        combat.turnLocked = !isMyNetworkTurn || !me.alive || state.status !== 'combat';
      }
      const winnerLabel = state.status === 'finished'
        ? (state.winner === null ? 'DRAW · MATCH FINISHED' : state.mode === 'team-battle' ? 'TEAM ' + (state.winner + 1) + ' WINS' : 'PLAYER ' + state.winner.slice(0, 6) + ' WINS')
        : '';
      if (winnerLabel) networkStatus.textContent = winnerLabel;
    }
    isDeployingNetwork = state.status === 'deploying';
    if (state.status === 'deploying' && !deploymentStartAt) deploymentStartAt = Date.now();
    if (state.status !== 'deploying') deploymentStartAt = 0;
    if (state.status === 'deploying') {
      for (const player of (state.players || [])) {
        if (parachuteRigs.has(player.id)) continue;
        const rig = new pc.Entity('Parachute rig ' + player.displayName);
        const canopy = new pc.Entity('Parachute canopy');
        canopy.addComponent('render', { type: 'sphere', material: material([0.82,0.12,0.08],0,0.25) });
        canopy.setLocalScale(4.2,0.55,2.2);
        canopy.setLocalPosition(0,5.8,0);
        rig.addChild(canopy);
        const tankProxy = new pc.Entity('Airborne tank');
        tankProxy.addComponent('render', { type: 'box', material: material([0.24,0.29,0.19],0.2,0.3) });
        tankProxy.setLocalScale(2.1,0.8,3);
        tankProxy.setLocalPosition(0,1.2,0);
        rig.addChild(tankProxy);
        const ropeMat = material([0.85,0.85,0.8],0,0.2);
        for (const side of [-1,1]) {
          const rope = new pc.Entity('Parachute line');
          rope.addComponent('render',{type:'cylinder',material:ropeMat});
          rope.setLocalScale(0.035,2.3,0.035);
          rope.setLocalPosition(side*0.7,3.3,0);
          rig.addChild(rope);
        }
        app.root.addChild(rig);
        parachuteRigs.set(player.id,rig);
      }
    } else {
      for (const rig of parachuteRigs.values()) rig.destroy();
      parachuteRigs.clear();
    }
    const turn = isMyNetworkTurn ? 'YOUR TURN' : 'OPPONENT TURN';
    const lobby = document.getElementById('lobby-status');
    if (lobby) {
      const host = state.hostId === multiplayer.playerId;
      lobby.textContent = state.status.toUpperCase() + ' · ' + count + '/4 · ' + (host ? 'HOST' : 'PLAYER') + ' · ' + (state.mode === 'team-battle' ? '2v2' : 'FFA');
      const startButton = document.getElementById('start-deployment');
      if (startButton) startButton.disabled = !host || count < 2 || state.status !== 'waiting';
    }
    networkStatus.textContent = 'ROOM ' + state.status.toUpperCase() + ' · ' + count + '/4 PLAYERS · ' + turn;
    for (const player of (state.players || [])) {
      if (player.id === multiplayer.playerId) {
        myLandingX = player.x; myLandingZ = player.z;
        if (state.status === 'combat') {
          tank.setPosition(player.x, tank.getPosition().y, player.z);
          turretYaw = player.yaw || 0;
          turret.setEulerAngles(0, turretYaw, 0);
        }
        continue;
      }
      let remote = remoteTanks.get(player.id);
      if (!remote) {
        remote = new pc.Entity('Remote Tank ' + player.displayName);
        const hull = new pc.Entity('Remote Hull');
        hull.addComponent('render', { type: 'box', material: material([0.35,0.16,0.12],0.25,0.4) });
        hull.setLocalScale(2.7,1.1,3.5);
        remote.addChild(hull);
        const turretMesh = new pc.Entity('Remote Turret');
        turretMesh.addComponent('render', { type: 'box', material: material([0.22,0.12,0.1],0.3,0.45) });
        turretMesh.setLocalPosition(0,0.8,0);
        turretMesh.setLocalScale(1.5,0.55,1.6);
        remote.addChild(turretMesh);
        app.root.addChild(remote);
        remoteTanks.set(player.id, remote);
      }
      remote.setPosition(player.x, 0.7, player.z);
      remote.setEulerAngles(0, player.yaw || 0, 0);
      remote.enabled = player.alive;
      if (player.id === state.currentPlayerId) {
        remote.name = 'ACTIVE · ' + player.displayName;
      } else {
        remote.name = 'Remote Tank ' + player.displayName;
      }
    }
  },
  onShot: data => {
    if (data.impact) {
      spawnNetworkShot(data);
      const damageText = (data.impacts || []).map(hit => hit.damage + ' DMG').join(', ') || 'NO DAMAGE';
      networkStatus.textContent = 'IMPACT · ' + damageText + ' · ' + data.impact.flightSeconds + 's flight';
      const ownHit = (data.impacts || []).find(hit => hit.playerId === multiplayer.playerId);
      if (ownHit) {
        combat.hp = ownHit.hp;
        combat.updateHud();
      }
    } else networkStatus.textContent = 'PLAYER SHOT RECEIVED · ' + data.playerId;
  }
});
document.getElementById('connect-server')?.addEventListener('click', () => {
  const url = document.getElementById('server-url')?.value.trim();
  const roomId = document.getElementById('room-id')?.value.trim() || 'quick-match';
  if (!url) { networkStatus.textContent = 'Enter a WebSocket server URL'; return; }
  const mode = document.getElementById('game-mode')?.value || 'free-for-all';
  multiplayer.connect(url, roomId, mode, 'Commander');
});
document.getElementById('start-deployment')?.addEventListener('click', () => {
  multiplayer.startDeployment();
});
window.tankBattleMultiplayer = multiplayer;

document.getElementById('fire')?.addEventListener('click', () => {
  if (!multiplayer.playerId || !isMyNetworkTurn) return;
  const elevation = Number(document.getElementById('elevation')?.value || 35);
  const power = Number(document.getElementById('power')?.value || 70);
  const weapon = document.getElementById('weapon')?.value || 'standard';
  multiplayer.shoot({ yaw: turretYaw, elevation, power, weapon });
});

document.getElementById('start-deployment')?.insertAdjacentHTML('afterend',
  '<button id="land-tank" style="padding:7px;background:#315b43;color:white;border:1px solid #9fc7a9;border-radius:5px">LAND</button>');
document.getElementById('land-tank')?.addEventListener('click', () => {
  multiplayer.land(myLandingX, myLandingZ);
});
app.on('update', dt => {
  if (recoilRemaining > 0) {
    recoilRemaining = Math.max(0, recoilRemaining - dt);
    const kick = Math.sin((recoilRemaining / 0.18) * Math.PI) * 0.22;
    barrelPivot.setLocalPosition(0, 0.42, -0.8 + kick);
  } else {
    barrelPivot.setLocalPosition(0, 0.42, -0.8);
  }
  if (muzzleFlashRemaining > 0) {
    muzzleFlashRemaining = Math.max(0, muzzleFlashRemaining - dt);
    if (muzzleFlashEntity) {
      const size = 0.35 + (muzzleFlashRemaining / 0.12) * 0.9;
      muzzleFlashEntity.setLocalScale(size, size, size * 1.5);
    }
  } else if (muzzleFlashEntity) {
    muzzleFlashEntity.destroy();
    muzzleFlashEntity = null;
  }
  for (let i = networkProjectiles.length - 1; i >= 0; i--) {
    const projectile = networkProjectiles[i];
    projectile.elapsed += dt;
    const t = Math.min(projectile.elapsed, projectile.duration);
    const position = projectile.origin.clone().add(projectile.velocity.clone().mulScalar(t));
    position.y -= 0.5 * 9.81 * t * t;
    if (projectile.elapsed - projectile.lastTrailAt >= 0.055 && projectile.elapsed < projectile.duration) {
      projectile.lastTrailAt = projectile.elapsed;
      const puff = new pc.Entity('Projectile smoke trail');
      puff.addComponent('render', { type: 'sphere', material: networkTrailMaterial });
      puff.setPosition(position);
      puff.setLocalScale(0.18, 0.18, 0.18);
      app.root.addChild(puff);
      networkTrailPuffs.push({ entity: puff, life: 0.42, duration: 0.42 });
    }
    if (projectile.elapsed >= projectile.duration) {
      projectile.entity.destroy();
      spawnNetworkExplosion(projectile.impact, projectile.impact.radius);
      networkProjectiles.splice(i, 1);
    } else {
      projectile.entity.setPosition(position);
    }
  }
  if (cinematicProjectile && cinematicProjectile.enabled) {
    const p = cinematicProjectile.getPosition();
    const offset = new pc.Vec3(0, 3.2, 7.5);
    const targetCamera = p.clone().add(offset);
    camera.setPosition(camera.getPosition().lerp(targetCamera, Math.min(1, dt * 4)));
    camera.lookAt(p);
    if (!networkProjectiles.some(item => item.entity === cinematicProjectile)) {
      cinematicProjectile = null;
      cinematicCameraReturn = null;
    }
  }
  for (let i = networkTrailPuffs.length - 1; i >= 0; i--) {
    const puff = networkTrailPuffs[i];
    puff.life -= dt;
    const fade = Math.max(0, puff.life / puff.duration);
    puff.entity.setLocalScale(0.12 + (1 - fade) * 0.38, 0.12 + (1 - fade) * 0.38, 0.12 + (1 - fade) * 0.38);
    if (puff.life <= 0) {
      puff.entity.destroy();
      networkTrailPuffs.splice(i, 1);
    }
  }
  for (let i = networkExplosions.length - 1; i >= 0; i--) {
    const explosion = networkExplosions[i];
    explosion.life -= dt;
    const progress = 1 - Math.max(0, explosion.life) / explosion.duration;
    const scale = 0.6 + progress * explosion.radius * 0.55;
    explosion.entity.setLocalScale(scale, scale, scale);
    if (explosion.life <= 0) {
      explosion.entity.destroy();
      networkExplosions.splice(i, 1);
    }
  }
});
app.on('update', () => {
  if (!parachuteRigs.size || !deploymentStartAt) return;
  const elapsed = (Date.now() - deploymentStartAt) / 1000;
  for (const [id, rig] of parachuteRigs) {
    const index = [...parachuteRigs.keys()].indexOf(id);
    const x = id === multiplayer.playerId ? myLandingX : ([-30,30,-30,30][index] || 0);
    const z = id === multiplayer.playerId ? myLandingZ : ([-30,-30,30,30][index] || 0);
    const height = Math.max(2, 38 - elapsed * 2.8);
    rig.setPosition(x, height, z);
    if (id === multiplayer.playerId) {
      const landingLabel = document.getElementById('lobby-status');
      if (landingLabel) landingLabel.textContent = 'DEPLOYING · STEER TO LANDING ZONE';
    }
  }
});
