import * as THREE from 'three';
import {
  BurstEffectSpec,
  getHurdleImpactSpec,
  getQuizGateBurstSpec,
  HurdleKind,
  ParticleKind,
  ParticleLayerRecipe,
  ParticleSlot,
  ShockwaveRecipe,
  ShockwaveSlot,
  stepParticleSlot,
  stepShockwaveSlot,
} from './particlePresets';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

interface InstancedPool {
  mesh: THREE.InstancedMesh;
  slots: ParticleSlot[];
  cursor: number;
  capacity: number;
}

/**
 * Zero-GC pooled Three.js InstancedMesh particle & shockwave VFX system.
 * Uses 4 dedicated InstancedMeshes (confetti ribbons, faceted spark shards,
 * bouncy debris cubes, and expanding 3D shockwave torus rings) for crisp,
 * high-impact feedback on quiz gate completions and hurdle collisions.
 */
export class ParticleVfxSystem {
  private group = new THREE.Group();
  private pools: Record<ParticleKind, InstancedPool>;
  private ringMesh: THREE.InstancedMesh;
  private rings: ShockwaveSlot[] = [];
  private ringCursor = 0;

  constructor(scene: THREE.Scene) {
    // 1. Confetti Ribbons (flat rectangular strips that flutter & tumble)
    const confettiGeo = new THREE.BoxGeometry(0.46, 0.06, 0.24);
    const confettiMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.34,
      metalness: 0.04,
    });
    const confettiPool = this.createPool('confetti', confettiGeo, confettiMat, 140);

    // 2. Faceted Star / Spark Shards (bright diamond octahedra for impact bursts)
    const sparkGeo = new THREE.OctahedronGeometry(0.24, 0);
    const sparkMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.24,
      metalness: 0.14,
    });
    const sparkPool = this.createPool('spark', sparkGeo, sparkMat, 120);

    // 3. Bouncy Debris / Dust Cubes
    const debrisGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.44,
      metalness: 0.06,
    });
    const debrisPool = this.createPool('debris', debrisGeo, debrisMat, 100);

    this.pools = {
      confetti: confettiPool,
      spark: sparkPool,
      debris: debrisPool,
    };

    // 4. Expanding 3D Impact & Portal Shockwave Rings (16 pooled Torus instances)
    const ringCapacity = 16;
    const ringGeo = new THREE.TorusGeometry(1, 0.052, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    this.ringMesh = new THREE.InstancedMesh(ringGeo, ringMat, ringCapacity);
    this.ringMesh.frustumCulled = false;

    for (let i = 0; i < ringCapacity; i++) {
      this.rings.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vertical: false,
        startRadius: 0.5,
        endRadius: 3.5,
        thickness: 0.2,
        life: 0,
        maxLife: 0.4,
      });
      _dummy.position.set(0, -100, 0);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.setScalar(0.0001);
      _dummy.updateMatrix();
      this.ringMesh.setMatrixAt(i, _dummy.matrix);
      this.ringMesh.setColorAt(i, _color.setHex(0xffffff));
    }
    this.ringMesh.instanceMatrix.needsUpdate = true;
    if (this.ringMesh.instanceColor) this.ringMesh.instanceColor.needsUpdate = true;
    this.group.add(this.ringMesh);

    scene.add(this.group);
  }

  private createPool(
    kind: ParticleKind,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    capacity: number,
  ): InstancedPool {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.frustumCulled = false;
    const slots: ParticleSlot[] = [];

    for (let i = 0; i < capacity; i++) {
      slots.push({
        active: false,
        kind,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        spinX: 0,
        spinY: 0,
        spinZ: 0,
        gravity: 18,
        drag: 0,
        bounceFloorY: null,
        life: 0,
        maxLife: 1,
        scale: 1,
      });
      _dummy.position.set(0, -100, 0);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.setScalar(0.0001);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
      mesh.setColorAt(i, _color.setHex(0xfacc15));
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.group.add(mesh);

    return { mesh, slots, cursor: 0, capacity };
  }

  public emitQuizGateClear(x: number, y: number, z: number, firstTry: boolean): void {
    this.emitBurstSpec(x, y, z, getQuizGateBurstSpec(firstTry));
  }

  public emitHurdleImpact(x: number, y: number, z: number, kind: HurdleKind): void {
    this.emitBurstSpec(x, y, z, getHurdleImpactSpec(kind));
  }

  public emitSimpleBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    colors: number[],
    speed = 6.5,
    kind: ParticleKind = 'debris',
  ): void {
    this.emitLayer(x, y, z, {
      kind,
      count,
      colors,
      speedMin: speed * 0.45,
      speedMax: speed * 1.15,
      vyMin: 2.6,
      vyMax: 2.6 + speed * 0.85,
      spreadXZ: 0.45,
      spreadY: 0.4,
      gravity: kind === 'confetti' ? 7.5 : 18,
      drag: kind === 'confetti' ? 2.2 : 0.4,
      lifeMin: 0.42,
      lifeMax: 0.85,
      scaleMin: 0.65,
      scaleMax: 1.3,
      bounceFloor: kind === 'debris',
    });
  }

  private emitBurstSpec(x: number, y: number, z: number, spec: BurstEffectSpec): void {
    for (const layer of spec.layers) {
      this.emitLayer(x, y, z, layer);
    }
    for (const sw of spec.shockwaves) {
      this.emitShockwave(x, y, z, sw);
    }
  }

  private emitLayer(x: number, y: number, z: number, recipe: ParticleLayerRecipe): void {
    const pool = this.pools[recipe.kind];
    for (let i = 0; i < recipe.count; i++) {
      const idx = pool.cursor;
      pool.cursor = (pool.cursor + 1) % pool.capacity;
      const slot = pool.slots[idx];

      const angle = Math.random() * Math.PI * 2;
      const speed = recipe.speedMin + Math.random() * (recipe.speedMax - recipe.speedMin);
      const maxLife = recipe.lifeMin + Math.random() * (recipe.lifeMax - recipe.lifeMin);

      slot.active = true;
      slot.kind = recipe.kind;
      slot.x = x + (Math.random() - 0.5) * recipe.spreadXZ;
      slot.y = y + Math.random() * recipe.spreadY;
      slot.z = z + (Math.random() - 0.5) * recipe.spreadXZ;
      slot.vx = Math.cos(angle) * speed;
      slot.vy = recipe.vyMin + Math.random() * (recipe.vyMax - recipe.vyMin);
      slot.vz = Math.sin(angle) * speed;
      slot.rx = Math.random() * Math.PI * 2;
      slot.ry = Math.random() * Math.PI * 2;
      slot.rz = Math.random() * Math.PI * 2;
      slot.spinX = (Math.random() - 0.5) * (recipe.kind === 'confetti' ? 16 : 10);
      slot.spinY = (Math.random() - 0.5) * (recipe.kind === 'confetti' ? 14 : 10);
      slot.spinZ = (Math.random() - 0.5) * (recipe.kind === 'confetti' ? 16 : 8);
      slot.gravity = recipe.gravity;
      slot.drag = recipe.drag;
      slot.bounceFloorY = recipe.bounceFloor ? Math.max(0.14, y - 0.65) : null;
      slot.maxLife = maxLife;
      slot.life = maxLife;
      slot.scale = recipe.scaleMin + Math.random() * (recipe.scaleMax - recipe.scaleMin);

      _color.setHex(recipe.colors[i % recipe.colors.length]);
      pool.mesh.setColorAt(idx, _color);
    }

    if (pool.mesh.instanceColor) {
      pool.mesh.instanceColor.needsUpdate = true;
    }
  }

  private emitShockwave(x: number, y: number, z: number, recipe: ShockwaveRecipe): void {
    const idx = this.ringCursor;
    this.ringCursor = (this.ringCursor + 1) % this.rings.length;
    const ring = this.rings[idx];

    ring.active = true;
    ring.x = x;
    ring.y = y + recipe.offsetY;
    ring.z = z;
    ring.vertical = recipe.vertical;
    ring.startRadius = recipe.startRadius;
    ring.endRadius = recipe.endRadius;
    ring.thickness = recipe.thickness;
    ring.maxLife = recipe.duration;
    ring.life = recipe.duration;

    _color.setHex(recipe.color);
    this.ringMesh.setColorAt(idx, _color);
    if (this.ringMesh.instanceColor) {
      this.ringMesh.instanceColor.needsUpdate = true;
    }
  }

  public update(dt: number): void {
    // Step the 3 particle pools
    (Object.keys(this.pools) as ParticleKind[]).forEach((kind) => {
      const pool = this.pools[kind];
      let anyDirty = false;

      for (let i = 0; i < pool.capacity; i++) {
        const slot = pool.slots[i];
        if (!slot.active) continue;
        anyDirty = true;

        const alive = stepParticleSlot(slot, dt);
        if (!alive) {
          _dummy.position.set(0, -100, 0);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.setScalar(0.0001);
          _dummy.updateMatrix();
          pool.mesh.setMatrixAt(i, _dummy.matrix);
          continue;
        }

        const ratio = slot.life / Math.max(0.001, slot.maxLife);
        _dummy.position.set(slot.x, slot.y, slot.z);
        _dummy.rotation.set(slot.rx, slot.ry, slot.rz);

        if (kind === 'confetti') {
          // Hold full ribbon size longer, then pop down smoothly near end of life
          const fade = Math.min(1, ratio * 2.2);
          _dummy.scale.setScalar(slot.scale * fade);
        } else if (kind === 'spark') {
          // Elongated crisp spark shard shrinking cleanly
          const s = slot.scale * Math.pow(ratio, 0.7);
          _dummy.scale.set(s * 0.75, s * 1.45, s * 0.75);
        } else {
          _dummy.scale.setScalar(slot.scale * ratio);
        }

        _dummy.updateMatrix();
        pool.mesh.setMatrixAt(i, _dummy.matrix);
      }

      if (anyDirty) {
        pool.mesh.instanceMatrix.needsUpdate = true;
      }
    });

    // Step expanding 3D shockwave rings
    let ringsDirty = false;
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      if (!ring.active) continue;
      ringsDirty = true;

      const stepped = stepShockwaveSlot(ring, dt);
      if (!stepped.alive) {
        _dummy.position.set(0, -100, 0);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.setScalar(0.0001);
        _dummy.updateMatrix();
        this.ringMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      _dummy.position.set(ring.x, ring.y, ring.z);
      _dummy.rotation.set(ring.vertical ? 0 : Math.PI * 0.5, 0, 0);
      _dummy.scale.set(stepped.radius, stepped.radius, stepped.thicknessScale);
      _dummy.updateMatrix();
      this.ringMesh.setMatrixAt(i, _dummy.matrix);
    }

    if (ringsDirty) {
      this.ringMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose(): void {
    (Object.keys(this.pools) as ParticleKind[]).forEach((kind) => {
      const pool = this.pools[kind];
      pool.mesh.geometry.dispose();
      (pool.mesh.material as THREE.Material).dispose();
    });
    this.ringMesh.geometry.dispose();
    (this.ringMesh.material as THREE.Material).dispose();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
