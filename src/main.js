import * as pc from 'playcanvas';
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

// Temporary arena: a visual blockout, to be replaced by production terrain and purchased/licensed assets.
box(app.root, 'Battlefield', [0,-0.35,0], [90,0.6,90], groundMat);
for (let i=0;i<9;i++) {
  const ridge = box(app.root, 'Snow Ridge '+i, [-38 + i*9.5, 2.0, -36], [12,5 + (i%3)*2,9], snowMat);
  ridge.setEulerAngles(0, (i%2)*8, 0);
}
box(app.root, 'River Bed', [0,-0.02,0], [9,0.08,88], material([0.12,0.24,0.31],0.3,0.8));
box(app.root, 'Bridge', [0,0.18,5], [15,0.35,5], material([0.34,0.31,0.26],0.1,0.3));

const tank = new pc.Entity('Player Tank');
app.root.addChild(tank);
box(tank,'Hull',[0,0.85,0],[2.9,0.85,4.0],tankMat);
box(tank,'Lower Hull',[0,0.42,0],[3.25,0.45,4.2],darkMat);
for (const side of [-1,1]) {
  box(tank,'Track '+side,[side*1.58,0.48,0],[0.42,0.72,4.15],darkMat);
  for (let i=0;i<5;i++) cylinder(tank,'Road Wheel',[side*1.8,0.47,-1.45+i*0.72],[0.23,0.23,0.23],metalMat);
}
const turret = new pc.Entity('Turret');
tank.addChild(turret);
turret.setLocalPosition(0,1.35,-0.15);
cylinder(turret,'Turret Base',[0,0,0],[1.55,0.48,1.55],tankMat);
box(turret,'Turret Armor',[0,0.28,0],[1.8,0.55,1.9],tankMat);
const barrel = box(turret,'Main Cannon',[0,0.42,-1.55],[0.28,0.28,2.7],metalMat);
box(turret,'Muzzle',[0,0.42,-2.92],[0.4,0.36,0.35],darkMat);

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
document.getElementById('fire').addEventListener('click',()=>{
  if(shotCooldown>0)return;
  shotCooldown=1.2;
  message.textContent='Test shot fired — projectile system is next milestone';
});
app.on('update', dt => {
  shotCooldown=Math.max(0,shotCooldown-dt);
  const forward = -moveY*dt*7;
  tank.translateLocal(moveX*dt*7,0,forward);
  turret.setEulerAngles(0,turretYaw,0);
  const target = tank.getPosition().clone().add(new pc.Vec3(0,5,10));
  const current = camera.getPosition();
  const desired = tank.getPosition().clone().add(new pc.Vec3(0,7,12));
  camera.setPosition(current.lerp(desired,Math.min(1,dt*3)));
  camera.lookAt(tank.getPosition().clone().add(new pc.Vec3(0,1,0)));
});
window.addEventListener('resize',()=>app.resizeCanvas());
document.getElementById('message').textContent='TANK BATTLE · Visual foundation blockout';
