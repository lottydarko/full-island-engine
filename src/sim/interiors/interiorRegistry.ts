import * as THREE from 'three';
import { CollisionWorld } from '../mapData';

export type InteractableKind =
  | 'coffee'
  | 'turnstile'
  | 'grid_breaker'
  | 'elevator_down'
  | 'elevator_up'
  | 'bunker_intel';

export interface WorldInteractable {
  id: string;
  label: string;
  prompt: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  kind: InteractableKind;
  onInteract: () => string;
}

export interface InteriorCullEntry {
  group: THREE.Object3D;
  x: number;
  z: number;
  maxDistSq: number;
}

export interface ArchipelagoCallbacks {
  toggleGridPower: () => boolean;
  isGridPowerOnline: () => boolean;
  teleportPlayer: (x: number, y: number, z: number, yaw?: number) => void;
  drinkCoffee: (stationName: string) => string;
}

/**
 * Central registry for all enterable interiors, [E] world interactables,
 * and 45m distance-culling groups to keep 60 fps on Chromebook-class hardware.
 */
export class InteriorRegistry {
  public readonly interactables: WorldInteractable[] = [];
  public readonly cullGroups: InteriorCullEntry[] = [];

  registerInteractable(item: WorldInteractable): void {
    this.interactables.push(item);
  }

  registerCullGroup(group: THREE.Object3D, x: number, z: number, maxDist = 45): void {
    this.cullGroups.push({
      group,
      x,
      z,
      maxDistSq: maxDist * maxDist,
    });
  }

  /**
   * Registers 4 solid perimeter walls with an explicit doorway cutout (default 2.6m wide)
   * on the chosen wall side so the player can walk freely inside while remaining blocked by walls.
   */
  addEnterableRoomColliders(
    collisionWorld: CollisionWorld,
    cx: number,
    cz: number,
    w: number,
    d: number,
    rotY = 0,
    doorSides: ('north' | 'south' | 'east' | 'west')[] = ['south'],
    doorWidth = 2.8,
    wallThickness = 0.6
  ): void {
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const addLocalBox = (lx: number, lz: number, bw: number, bd: number) => {
      const wx = cx + lx * cos + lz * sin;
      const wz = cz - lx * sin + lz * cos;
      collisionWorld.addBox(wx, wz, bw, bd, rotY);
    };

    const hasN = doorSides.includes('north');
    const hasS = doorSides.includes('south');
    const hasE = doorSides.includes('east');
    const hasW = doorSides.includes('west');

    const hw = w * 0.5;
    const hd = d * 0.5;

    // North wall (-Z)
    if (hasN) {
      const seg = Math.max(0.5, (w - doorWidth) * 0.5);
      addLocalBox(-hw + seg * 0.5, -hd, seg, wallThickness);
      addLocalBox(hw - seg * 0.5, -hd, seg, wallThickness);
    } else {
      addLocalBox(0, -hd, w, wallThickness);
    }

    // South wall (+Z)
    if (hasS) {
      const seg = Math.max(0.5, (w - doorWidth) * 0.5);
      addLocalBox(-hw + seg * 0.5, hd, seg, wallThickness);
      addLocalBox(hw - seg * 0.5, hd, seg, wallThickness);
    } else {
      addLocalBox(0, hd, w, wallThickness);
    }

    // West wall (-X)
    if (hasW) {
      const seg = Math.max(0.5, (d - doorWidth) * 0.5);
      addLocalBox(-hw, -hd + seg * 0.5, wallThickness, seg);
      addLocalBox(-hw, hd - seg * 0.5, wallThickness, seg);
    } else {
      addLocalBox(-hw, 0, wallThickness, d);
    }

    // East wall (+X)
    if (hasE) {
      const seg = Math.max(0.5, (d - doorWidth) * 0.5);
      addLocalBox(hw, -hd + seg * 0.5, wallThickness, seg);
      addLocalBox(hw, hd - seg * 0.5, wallThickness, seg);
    } else {
      addLocalBox(hw, 0, wallThickness, d);
    }
  }

  /**
   * Distance-culls fine interior props beyond maxDist (45m default).
   * Zero allocations in hot loop.
   */
  updateCulling(px: number, pz: number): void {
    for (let i = 0; i < this.cullGroups.length; i++) {
      const c = this.cullGroups[i];
      const dx = px - c.x;
      const dz = pz - c.z;
      c.group.visible = dx * dx + dz * dz <= c.maxDistSq;
    }
  }

  /**
   * Finds the closest interactable within its trigger radius (3D check).
   */
  findNearestInteractable(px: number, py: number, pz: number): WorldInteractable | null {
    let best: WorldInteractable | null = null;
    let bestD2 = Infinity;
    for (let i = 0; i < this.interactables.length; i++) {
      const item = this.interactables[i];
      const dx = px - item.x;
      const dy = py - item.y;
      const dz = pz - item.z;
      if (Math.abs(dy) > 4.2) continue;
      const d2 = dx * dx + dz * dz;
      const r2 = item.radius * item.radius;
      if (d2 <= r2 && d2 < bestD2) {
        bestD2 = d2;
        best = item;
      }
    }
    return best;
  }
}
