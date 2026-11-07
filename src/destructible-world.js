import * as pc from 'playcanvas';

export class DestructibleWorld {
  constructor(app, message) {
    this.app = app;
    this.message = message;
    this.objects = [];
    this.craters = [];
    this.debris = [];
    this.materials = {
      dust: this.makeMaterial([0.36, 0.34, 0.3], [0.08, 0.07, 0.06]),
      flash: this.makeMaterial([1, 0.36, 0.06], [0.8, 0.12, 0.01]),
      debris: this.makeMaterial([0.3, 0.32, 0.31], [0.04, 0.04, 0.04])
    };
    this.registerSceneObjects();
    app.on('update', dt => this.update(dt));
  }

  makeMaterial(rgb, emissive) {
    const m = new pc.StandardMaterial();
    m.diffuse = new pc.Color(...rgb);
    m.emissive = new pc.Color(...emissive);
    m.update();
    return m;
  }

  registerSceneObjects() {
    const candidates = this.app.root.findComponents('render');
    for (const component of candidates) {
      const entity = component.entity;
      const n = entity.name.toLowerCase();
      if (/bunker|sandbag|supply crate|alpine boulder|bridge plank|bridge rail/.test(n)) {
        this.objects.push({
          entity,
          name: entity.name,
          hp: /bunker/.test(n) ? 160 : /bridge/.test(n) ? 65 : 45,
          maxHp: /bunker/.test(n) ? 160 : /bridge/.test(n) ? 65 : 45,
          radius: /bunker/.test(n) ? 5 : 2.1
        });
      }
    }
  }

  applyAuthoritativeImpacts(impacts = []) {
    for (const impact of impacts) {
      const [kind, ...rest] = impact.id.split('-');
      const expected = impact.id.startsWith('bunker-') ? 'bunker'
        : impact.id.startsWith('sandbag-') ? 'sandbag'
        : impact.id.startsWith('bridge-rail-') ? 'bridge rail'
        : 'supply crate';
      const parts = impact.id.startsWith('bunker-') ? (impact.id.endsWith('west') ? [-20, 1.2, 13] : [20, 1.2, 13])
        : impact.id.startsWith('sandbag-') ? (impact.id.endsWith('west') ? [-13, 0.55, 5] : [13, 0.55, 5])
        : impact.id.startsWith('bridge-rail-') ? (impact.id.endsWith('west') ? [-8.4, 1.15, 8] : [8.4, 1.15, 8])
        : (() => { const n = Number(rest.join('-').replace('crate-', '')) - 1; return [n < 4 ? -23.6 + n * 2.4 : 16.4 + (n - 4) * 2.4, 0.65, n < 4 ? -20 : 24]; })();
      const target = this.objects
        .filter(item => item.name.toLowerCase().includes(expected))
        .sort((a, b) => a.entity.getPosition().distance(new pc.Vec3(...parts)) - b.entity.getPosition().distance(new pc.Vec3(...parts)))[0];
      if (!target) continue;
      target.hp = impact.hp;
      if (!impact.alive && target.entity.enabled) this.destroyObject(target);
      else if (target.hp > 0) {
        const ratio = Math.max(0.82, target.hp / target.maxHp);
        target.entity.setLocalScale(
          target.entity.getLocalScale().x * ratio,
          target.entity.getLocalScale().y * ratio,
          target.entity.getLocalScale().z * ratio
        );
      }
    }
  }

  applyImpact(position, radius, damage) {
    let hitCount = 0;
    for (const item of this.objects) {
      if (!item.entity.enabled || item.hp <= 0) continue;
      const center = item.entity.getPosition();
      const distance = center.distance(position);
      const effectiveRadius = radius + item.radius;
      if (distance > effectiveRadius) continue;
      const dealt = Math.max(0, damage * (1 - distance / (effectiveRadius + 0.001)));
      item.hp -= dealt;
      hitCount++;
      if (item.hp <= 0) this.destroyObject(item);
      else item.entity.setLocalScale(
        item.entity.getLocalScale().x * 0.985,
        item.entity.getLocalScale().y * 0.985,
        item.entity.getLocalScale().z * 0.985
      );
    }
    this.makeImpactFx(position, radius);
    if (hitCount) this.message.textContent = 'OBJECT IMPACT · ' + hitCount + ' target(s)';
    return hitCount;
  }

  destroyObject(item) {
    const position = item.entity.getPosition().clone();
    const scale = item.entity.getLocalScale().clone();
    item.entity.enabled = false;
    for (let i = 0; i < 5; i++) {
      const shard = new pc.Entity('Debris fragment');
      shard.addComponent('render', { type: 'box', material: this.materials.debris });
      shard.setLocalScale(
        Math.max(0.25, scale.x * 0.22),
        Math.max(0.2, scale.y * 0.3),
        Math.max(0.25, scale.z * 0.22)
      );
      shard.setPosition(
        position.x + (Math.random() - 0.5) * scale.x,
        position.y + Math.random() * scale.y,
        position.z + (Math.random() - 0.5) * scale.z
      );
      this.app.root.addChild(shard);
      this.debris.push({
        entity: shard,
        velocity: new pc.Vec3((Math.random() - 0.5) * 7, 3 + Math.random() * 5, (Math.random() - 0.5) * 7),
        life: 2.2
      });
    }
  }

  makeImpactFx(position, radius) {
    const puff = new pc.Entity('Impact dust');
    puff.addComponent('render', { type: 'sphere', material: this.materials.dust });
    puff.setPosition(position.x, Math.max(0.2, position.y), position.z);
    puff.setLocalScale(0.7, 0.45, 0.7);
    this.app.root.addChild(puff);
    this.craters.push({ entity: puff, life: 0.8, duration: 0.8, radius });
  }

  update(dt) {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      d.velocity.y -= 9.8 * dt;
      const p = d.entity.getPosition().clone().add(d.velocity.clone().mulScalar(dt));
      if (p.y < 0.15) { p.y = 0.15; d.velocity.y *= -0.22; d.velocity.x *= 0.65; d.velocity.z *= 0.65; }
      d.entity.setPosition(p);
      d.entity.rotate(90 * dt, 130 * dt, 65 * dt);
      if (d.life <= 0) { d.entity.destroy(); this.debris.splice(i, 1); }
    }
    for (let i = this.craters.length - 1; i >= 0; i--) {
      const fx = this.craters[i];
      fx.life -= dt;
      const factor = 1 + (1 - fx.life / fx.duration) * 1.7;
      fx.entity.setLocalScale(factor * fx.radius * 0.25, 0.18, factor * fx.radius * 0.25);
      if (fx.life <= 0) { fx.entity.destroy(); this.craters.splice(i, 1); }
    }
  }
}
