import * as pc from 'playcanvas';

export class ArtilleryCombat {
  constructor(app, tank, turret, camera, message, destructibleWorld = null) {
    this.app = app;
    this.tank = tank;
    this.turret = turret;
    this.camera = camera;
    this.message = message;
    this.destructibleWorld = destructibleWorld;
    this.hp = 100;
    this.turnSeconds = 60;
    this.turnTransition = 0;
    this.turnLocked = false;
    this.projectiles = [];
    this.explosions = [];
    this.shellMaterial = this.makeMaterial([1, 0.68, 0.2], 0.35, 0.8);
    this.flashMaterial = this.makeMaterial([1, 0.34, 0.06], 0, 0.25);
    this.hpLabel = document.getElementById('tank-hp');
    this.turnLabel = document.getElementById('turn-timer');
    this.elevation = 35;
    this.turret.barrelPivot?.setLocalEulerAngles(this.elevation, 0, 0);
    this.power = 70;
    this.createControls();
    this.updateHud();
    app.on('update', dt => this.update(dt));
  }

  makeMaterial(rgb, metalness, gloss) {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(...rgb);
    material.emissive = new pc.Color(...rgb).mulScalar(0.12);
    material.metalness = metalness;
    material.gloss = gloss;
    material.update();
    return material;
  }

  createControls() {
    const elevation = document.getElementById('elevation');
    const power = document.getElementById('power');
    const weapon = document.getElementById('weapon');
    elevation?.addEventListener('input', () => {
      this.elevation = Number(elevation.value);
      this.turret.barrelPivot?.setLocalEulerAngles(this.elevation, 0, 0);
      this.updateHud();
    });
    power?.addEventListener('input', () => {
      this.power = Number(power.value);
      this.updateHud();
    });
    document.getElementById('fire')?.addEventListener('click', () => {
      if (window.tankBattleMultiplayer?.playerId) return; // Online shots are resolved by the server.
      this.fire(weapon?.value || 'standard');
    });
    document.getElementById('end-turn')?.addEventListener('click', () => this.endTurn('Turn ended manually'));
  }

  fire(weaponType) {
    if (this.turnLocked || this.hp <= 0) return;
    const origin = this.tank.getPosition().clone();
    const yaw = this.turret.getEulerAngles().y * pc.math.DEG_TO_RAD;
    const pitch = this.elevation * pc.math.DEG_TO_RAD;
    const direction = new pc.Vec3(
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    ).normalize();
    const muzzle = origin.clone().add(new pc.Vec3(0, 1.85, 0)).add(direction.clone().mulScalar(2.7));
    const speed = (this.power / 100) * 42;
    const shell = new pc.Entity('Artillery Shell');
    shell.addComponent('render', { type: 'sphere', material: this.shellMaterial });
    shell.setLocalScale(0.34, 0.34, 0.34);
    shell.setPosition(muzzle);
    this.app.root.addChild(shell);
    this.projectiles.push({
      entity: shell,
      velocity: direction.mulScalar(speed),
      damage: weaponType === 'heavy' ? 42 : weaponType === 'cluster' ? 26 : 30,
      radius: weaponType === 'heavy' ? 5.5 : 4,
      age: 0
    });
    this.turnLocked = true;
    this.message.textContent = 'SHOT FIRED · Resolving projectile…';
  }

  update(dt) {
    if (this.turnTransition > 0) { this.turnTransition -= dt; if (this.turnTransition <= 0 && this.hp > 0) { this.turnLocked = false; this.turnSeconds = 60; this.message.textContent = 'YOUR TURN · Aim and fire'; } }
    if (!this.turnLocked && this.hp > 0) {
      this.turnSeconds -= dt;
      if (this.turnSeconds <= 0) this.endTurn('TIME OUT · Turn skipped');
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;
      p.velocity.y -= 9.81 * dt;
      const next = p.entity.getPosition().clone().add(p.velocity.clone().mulScalar(dt));
      p.entity.setPosition(next);
      if (next.y <= 0.12 || p.age > 8 || Math.abs(next.x) > 60 || Math.abs(next.z) > 60) {
        this.explode(next, p);
        p.entity.destroy();
        this.projectiles.splice(i, 1);
      }
    }
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const fx = this.explosions[i];
      fx.life -= dt;
      const scale = 1 + (1 - fx.life / fx.duration) * 2.4;
      fx.entity.setLocalScale(scale, scale, scale);
      if (fx.life <= 0) {
        fx.entity.destroy();
        this.explosions.splice(i, 1);
      }
    }
    this.updateHud();
  }

  explode(position, projectile) {
    const blast = new pc.Entity('Explosion');
    blast.addComponent('render', { type: 'sphere', material: this.flashMaterial });
    blast.setPosition(position.x, Math.max(0.5, position.y), position.z);
    blast.setLocalScale(0.8, 0.8, 0.8);
    this.app.root.addChild(blast);
    this.explosions.push({ entity: blast, life: 0.42, duration: 0.42 });
    this.destructibleWorld?.applyImpact(position, projectile.radius, projectile.damage * 2.2);
    const tankPosition = this.tank.getPosition();
    if (tankPosition.distance(position) < projectile.radius + 2.5) {
      this.hp = Math.max(0, this.hp - projectile.damage);
      this.message.textContent = 'DAMAGE TAKEN · ' + projectile.damage + ' HP';
    } else {
      this.message.textContent = 'IMPACT · Projectile resolved';
    }
    this.endTurn(this.hp <= 0 ? 'TANK DESTROYED' : 'NEXT TURN · Waiting for opponent');
  }

  endTurn(label) {
    this.turnLocked = true;
    this.turnSeconds = 60;
    this.turnTransition = 2.5;
    this.message.textContent = label;
    this.updateHud();
  }

  updateHud() {
    if (this.hpLabel) this.hpLabel.textContent = 'HP ' + this.hp + '/100';
    if (this.turnLabel) this.turnLabel.textContent = this.turnTransition > 0 ? 'NEXT TURN…' : this.turnLocked ? 'SHOT IN FLIGHT' : 'TURN ' + Math.ceil(this.turnSeconds) + 's';
    const e = document.getElementById('elevation-value');
    const p = document.getElementById('power-value');
    if (e) e.textContent = this.elevation + '°';
    if (p) p.textContent = this.power + '%';
  }
}
