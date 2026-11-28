import * as THREE from 'three';
import { CourseBox, WallMaterialKind } from './courseData';

export interface WallCandidate {
  boxId: string;
  faceId: string;
  normalX: number;
  normalZ: number;
  /** Signed distance from player center to wall surface */
  distance: number;
  /** Width of this wall face in meters */
  faceLength: number;
  boxTop: number;
  boxBot: number;
  contactX: number;
  contactZ: number;
  climbable: boolean;
  materialKind: WallMaterialKind;
}

export interface ClimbCandidate {
  boxId: string;
  faceId: string;
  normalX: number;
  normalZ: number;
  tangentX: number;
  tangentZ: number;
  contactX: number;
  contactZ: number;
  boxTop: number;
  boxBot: number;
  halfSpan: number;
  materialKind: WallMaterialKind;
}

export interface CollisionStepResult {
  grounded: boolean;
  hitCeiling: boolean;
  wallCandidate: WallCandidate | null;
  climbCandidate: ClimbCandidate | null;
}

export interface LedgeCandidate {
  boxId: string;
  ledgeY: number;
  normalX: number;
  normalZ: number;
  contactX: number;
  contactZ: number;
  hangFeetPos: THREE.Vector3;
  standFeetPos: THREE.Vector3;
  materialKind: WallMaterialKind;
}

/**
 * Zero-allocation collision solver with multi-substep horizontal sweep & two-pass
 * depenetration so fast leaps/slides never pass through or bounce off seams.
 * Mutates `pos` and `vel` in place.
 */
export function integrateAndResolveCourseCollision(
  pos: THREE.Vector3,
  vel: THREE.Vector3,
  dt: number,
  playerRadius: number,
  playerHeight: number,
  mountReach: number,
  boxes: readonly CourseBox[],
): CollisionStepResult {
  const horizDisp = Math.hypot(vel.x, vel.z) * dt;
  const vertDisp = Math.abs(vel.y) * dt;
  const maxStep = playerRadius * 0.42;
  const subSteps = Math.max(
    1,
    Math.min(5, Math.ceil(Math.max(horizDisp / maxStep, vertDisp / 0.35))),
  );
  const subDt = dt / subSteps;

  let finalResult: CollisionStepResult = {
    grounded: false,
    hitCeiling: false,
    wallCandidate: null,
    climbCandidate: null,
  };

  for (let s = 0; s < subSteps; s++) {
    pos.x += vel.x * subDt;
    pos.z += vel.z * subDt;
    pos.y += vel.y * subDt;
    finalResult = resolveCourseCollision(
      pos,
      vel,
      playerRadius,
      playerHeight,
      mountReach,
      boxes,
    );
  }

  return finalResult;
}

/**
 * Zero-allocation single-step collision solver for oriented boxes, sloped recovery ramps,
 * and runnable/climbable wall-face detection. Mutates `pos` and `vel` in place.
 */
export function resolveCourseCollision(
  pos: THREE.Vector3,
  vel: THREE.Vector3,
  playerRadius: number,
  playerHeight: number,
  mountReach: number,
  boxes: readonly CourseBox[],
): CollisionStepResult {
  let grounded = false;
  let hitCeiling = false;
  let bestWall: WallCandidate | null = null;
  let bestWallScore = Infinity;
  let bestClimb: ClimbCandidate | null = null;
  let bestClimbScore = Infinity;

  const r = playerRadius;
  const maxDetect = r + mountReach;

  // 1. Floor / Ramp / Ceiling pass
  let bestGroundY = -Infinity;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const dx = pos.x - b.center.x;
    const dz = pos.z - b.center.z;

    const lx = dx * b.cosYaw - dz * b.sinYaw;
    const lz = dx * b.sinYaw + dz * b.cosYaw;

    const hx = b.halfExtents.x;
    const hy = b.halfExtents.y;
    const hz = b.halfExtents.z;

    if (b.pitchRad !== 0) {
      const effHz = hz * b.cosPitch + hy * Math.abs(b.sinPitch);
      if (Math.abs(lx) <= hx + r * 0.45 && Math.abs(lz) <= effHz + r * 0.45) {
        const topY = b.center.y + (hy - lz * b.sinPitch) / b.cosPitch;
        if (pos.y <= topY + 0.42 && pos.y >= topY - 0.65 && vel.y <= 2.2) {
          if (topY > bestGroundY) bestGroundY = topY;
        }
      }
      continue;
    }

    const boxTop = b.center.y + hy;
    const boxBot = b.center.y - hy;

    if (Math.abs(lx) <= hx + r * 0.36 && Math.abs(lz) <= hz + r * 0.36) {
      if (pos.y <= boxTop + 0.045 && pos.y >= boxTop - 0.34 && vel.y <= 0.8) {
        if (boxTop > bestGroundY) bestGroundY = boxTop;
      }
      const headY = pos.y + playerHeight;
      if (headY >= boxBot && headY <= boxBot + 0.35 && vel.y > 0) {
        pos.y = boxBot - playerHeight;
        vel.y = 0;
        hitCeiling = true;
      }
    }
  }

  if (bestGroundY > -Infinity) {
    pos.y = bestGroundY;
    if (vel.y < 0) vel.y = 0;
    grounded = true;
  }

  // 2. Two-pass Horizontal Wall Push-Out + Runnable & Climbable Face Detection
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.pitchRad !== 0) continue;

      const hy = b.halfExtents.y;
      const boxBot = b.center.y - hy;
      const boxTop = b.center.y + hy;

      if (pos.y >= boxTop - 0.14 || pos.y + playerHeight <= boxBot + 0.12) {
        continue;
      }

      const dx = pos.x - b.center.x;
      const dz = pos.z - b.center.z;
      const lx = dx * b.cosYaw - dz * b.sinYaw;
      const lz = dx * b.sinYaw + dz * b.cosYaw;

      const hx = b.halfExtents.x;
      const hz = b.halfExtents.z;

      const cx = Math.max(-hx, Math.min(hx, lx));
      const cz = Math.max(-hz, Math.min(hz, lz));

      const vx = lx - cx;
      const vz = lz - cz;
      let dist = Math.hypot(vx, vz);

      let lnx = 0;
      let lnz = 0;
      let pen = 0;

      if (dist < 1e-5) {
        const penX = hx - Math.abs(lx);
        const penZ = hz - Math.abs(lz);
        if (penX < penZ) {
          lnx = lx >= 0 ? 1 : -1;
          pen = penX + r;
        } else {
          lnz = lz >= 0 ? 1 : -1;
          pen = penZ + r;
        }
        dist = 0;
      } else {
        lnx = vx / dist;
        lnz = vz / dist;
        if (dist < r) {
          pen = r - dist;
        }
      }

      const wnx = lnx * b.cosYaw + lnz * b.sinYaw;
      const wnz = -lnx * b.sinYaw + lnz * b.cosYaw;

      if (pen > 0) {
        pos.x += wnx * pen;
        pos.z += wnz * pen;
        const vn = vel.x * wnx + vel.z * wnz;
        if (vn < 0) {
          vel.x -= wnx * vn;
          vel.z -= wnz * vn;
        }
        dist = r;
      }

      if (pass === 1) {
        const isXFace = Math.abs(lnx) >= Math.abs(lnz);
        const faceLength = isXFace ? hz * 2 : hx * 2;
        const snapLnx = isXFace ? (lnx >= 0 ? 1 : -1) : 0;
        const snapLnz = isXFace ? 0 : lnz >= 0 ? 1 : -1;
        const fnx = snapLnx * b.cosYaw + snapLnz * b.sinYaw;
        const fnz = -snapLnx * b.sinYaw + snapLnz * b.cosYaw;
        const localContactX = isXFace ? snapLnx * hx : cx;
        const localContactZ = isXFace ? cz : snapLnz * hz;
        const contactX =
          b.center.x + localContactX * b.cosYaw + localContactZ * b.sinYaw;
        const contactZ =
          b.center.z - localContactX * b.sinYaw + localContactZ * b.cosYaw;
        const faceId = `${b.id}:${isXFace ? (snapLnx > 0 ? 'px' : 'nx') : snapLnz > 0 ? 'pz' : 'nz'}`;

        if (
          b.runnable &&
          dist <= maxDetect &&
          pos.y >= boxBot - 0.15 &&
          pos.y <= boxTop - 0.25 &&
          faceLength >= 3.0
        ) {
          if (dist < bestWallScore) {
            bestWallScore = dist;
            bestWall = {
              boxId: b.id,
              faceId,
              normalX: fnx,
              normalZ: fnz,
              distance: dist,
              faceLength,
              boxTop,
              boxBot,
              contactX,
              contactZ,
              climbable: Boolean(b.climbable),
              materialKind: b.materialKind,
            };
          }
        }

        if (
          b.climbable &&
          dist <= r + 0.56 &&
          pos.y >= boxBot - 0.35 &&
          pos.y <= boxTop - 0.50 &&
          faceLength >= 2.0
        ) {
          if (dist < bestClimbScore) {
            bestClimbScore = dist;
            const tx = -fnz;
            const tz = fnx;
            bestClimb = {
              boxId: b.id,
              faceId,
              normalX: fnx,
              normalZ: fnz,
              tangentX: tx,
              tangentZ: tz,
              contactX,
              contactZ,
              boxTop,
              boxBot,
              halfSpan: faceLength * 0.5 - 0.35,
              materialKind: b.materialKind,
            };
          }
        }
      }
    }
  }

  return {
    grounded,
    hitCeiling,
    wallCandidate: bestWall,
    climbCandidate: bestClimb,
  };
}

/**
 * Detects a grabbable building/platform top edge right in front of an airborne
 * player, returning exact hang & mantle-stand coordinates with headroom check.
 */
export function detectLedgeGrabCandidate(
  pos: THREE.Vector3,
  lookDirX: number,
  lookDirZ: number,
  playerRadius: number,
  playerHeight: number,
  boxes: readonly CourseBox[],
): LedgeCandidate | null {
  let bestScore = Infinity;
  let best: LedgeCandidate | null = null;

  const maxReachHoriz = playerRadius + 0.72;
  const minEdgeY = pos.y + 0.62;
  const maxEdgeY = pos.y + playerHeight + 0.62;

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.pitchRad !== 0) continue;

    const hx = b.halfExtents.x;
    const hy = b.halfExtents.y;
    const hz = b.halfExtents.z;
    if (hx < 0.35 || hz < 0.35) continue;

    const boxTop = b.center.y + hy;
    if (boxTop < minEdgeY || boxTop > maxEdgeY) continue;

    const dx = pos.x - b.center.x;
    const dz = pos.z - b.center.z;
    const lx = dx * b.cosYaw - dz * b.sinYaw;
    const lz = dx * b.sinYaw + dz * b.cosYaw;

    const cx = Math.max(-hx, Math.min(hx, lx));
    const cz = Math.max(-hz, Math.min(hz, lz));

    const vx = lx - cx;
    const vz = lz - cz;
    const dist = Math.hypot(vx, vz);

    // Must be just outside the ledge face within arm's reach
    if (dist < playerRadius * 0.38 || dist > maxReachHoriz) continue;

    const lnx = vx / dist;
    const lnz = vz / dist;

    // Snap cleanly to the nearest straight edge normal when near a face
    const isXFace = Math.abs(lnx) >= Math.abs(lnz);
    const snapLnx = isXFace ? (lnx >= 0 ? 1 : -1) : 0;
    const snapLnz = isXFace ? 0 : lnz >= 0 ? 1 : -1;

    const wnx = snapLnx * b.cosYaw + snapLnz * b.sinYaw;
    const wnz = -snapLnx * b.sinYaw + snapLnz * b.cosYaw;

    // Player must be looking generally toward the ledge
    const facingDot = -(lookDirX * wnx + lookDirZ * wnz);
    if (facingDot < 0.28) continue;

    // World contact point right on top of the edge lip
    const localContactX = isXFace ? snapLnx * hx : cx;
    const localContactZ = isXFace ? cz : snapLnz * hz;
    const contactX =
      b.center.x + localContactX * b.cosYaw + localContactZ * b.sinYaw;
    const contactZ =
      b.center.z - localContactX * b.sinYaw + localContactZ * b.cosYaw;

    const hangX = contactX + wnx * (playerRadius + 0.04);
    const hangZ = contactZ + wnz * (playerRadius + 0.04);

    // Eye-at-lip height is boxTop - 1.72 (eye at boxTop - 0.06), clamped above supporting floor so feet never sink underground on low ledges
    let hangY = boxTop - 1.72;
    let floorBelowY = -Infinity;
    for (let f = 0; f < boxes.length; f++) {
      const fb = boxes[f];
      if (fb.id === b.id || fb.pitchRad !== 0) continue;
      const fTop = fb.center.y + fb.halfExtents.y;
      if (fTop >= boxTop - 0.35 || fTop < hangY - 0.15) continue;
      const fdx = hangX - fb.center.x;
      const fdz = hangZ - fb.center.z;
      const flx = fdx * fb.cosYaw - fdz * fb.sinYaw;
      const flz = fdx * fb.sinYaw + fdz * fb.cosYaw;
      if (
        Math.abs(flx) <= fb.halfExtents.x + playerRadius * 0.45 &&
        Math.abs(flz) <= fb.halfExtents.z + playerRadius * 0.45
      ) {
        if (fTop > floorBelowY) floorBelowY = fTop;
      }
    }
    if (floorBelowY > -Infinity) {
      hangY = Math.max(hangY, floorBelowY);
    }

    const boxDepth = isXFace ? hx * 2 : hz * 2;
    const inwardStep = Math.min(playerRadius + 0.40, Math.max(0.32, boxDepth - 0.24));

    const hangFeetPos = new THREE.Vector3(hangX, hangY, hangZ);
    const standFeetPos = new THREE.Vector3(
      contactX - wnx * inwardStep,
      boxTop,
      contactZ - wnz * inwardStep,
    );

    // Verify unobstructed standing headroom on top of the platform/building
    let blockedAbove = false;
    for (let j = 0; j < boxes.length; j++) {
      const ob = boxes[j];
      if (ob.id === b.id || ob.pitchRad !== 0) continue;
      const oTop = ob.center.y + ob.halfExtents.y;
      const oBot = ob.center.y - ob.halfExtents.y;
      if (oTop <= boxTop + 0.12 || oBot >= boxTop + 1.65) continue;

      const odx = standFeetPos.x - ob.center.x;
      const odz = standFeetPos.z - ob.center.z;
      const olx = odx * ob.cosYaw - odz * ob.sinYaw;
      const olz = odx * ob.sinYaw + odz * ob.cosYaw;
      if (
        Math.abs(olx) <= ob.halfExtents.x + playerRadius * 0.6 &&
        Math.abs(olz) <= ob.halfExtents.z + playerRadius * 0.6
      ) {
        blockedAbove = true;
        break;
      }
    }
    if (blockedAbove) continue;

    const score = dist + Math.abs(boxTop - (pos.y + 1.52)) * 0.45 - facingDot * 0.25;
    if (score < bestScore) {
      bestScore = score;
      best = {
        boxId: b.id,
        ledgeY: boxTop,
        normalX: wnx,
        normalZ: wnz,
        contactX,
        contactZ,
        hangFeetPos,
        standFeetPos,
        materialKind: b.materialKind,
      };
    }
  }

  return best;
}
