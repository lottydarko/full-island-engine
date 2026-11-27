import {
  CollisionWorld,
  getSurfaceAt,
  getTerrainHeight,
  SurfaceType,
} from './mapData';

export interface VehicleInput {
  throttle: number;  // 0..1
  brake: number;     // 0..1
  steer: number;     // -1 (right) .. +1 (left)
  handbrake: boolean;
}

export interface VehicleState {
  x: number;
  y: number;
  z: number;
  vy: number;           // vertical velocity m/s (airtime & curb hops!)
  isAirborne: boolean;
  heading: number;      // radians, 0 = facing -Z (North)
  vx: number;           // world m/s
  vz: number;
  forwardSpeed: number; // local m/s (+ = forward)
  lateralSpeed: number; // local m/s (+ = right)
  yawRate: number;      // rad/s
  steerAngle: number;   // front wheel angle rad
  speedKmh: number;
  rpm: number;          // 850..7400
  gear: string;         // 'R', 'N', '1'..'6'
  surface: SurfaceType;
  slipRatio: number;    // 0..1 visual/audio wet-drift intensity
  pitch: number;        // suspension pitch rad
  roll: number;         // suspension roll rad
  heave: number;        // suspension vertical bounce m
  isBraking: boolean;
  isReversing: boolean;
  wheelSpinDelta: number;
  health: number;       // 0..100 vehicle integrity
  damageFront: number;  // 0..1
  damageRear: number;   // 0..1
  damageLeft: number;   // 0..1
  damageRight: number;  // 0..1
}

export class IcyVehiclePhysics {
  public state: VehicleState;
  private pitchVel = 0;
  private rollVel = 0;
  private heaveVel = 0;
  private prevForwardSpeed = 0;
  private prevIsRoad = true;
  private prevGroundY = 0.088;
  private throttleSpool = 0;
  private lastDamageTime = 0;

  constructor(startX: number, startZ: number, startHeading: number) {
    this.state = {
      x: startX,
      y: 0.088,
      z: startZ,
      vy: 0,
      isAirborne: false,
      heading: startHeading,
      vx: 0,
      vz: 0,
      forwardSpeed: 0,
      lateralSpeed: 0,
      yawRate: 0,
      steerAngle: 0,
      speedKmh: 0,
      rpm: 880,
      gear: '1',
      surface: 'asphalt',
      slipRatio: 0,
      pitch: 0,
      roll: 0,
      heave: 0,
      isBraking: false,
      isReversing: false,
      wheelSpinDelta: 0,
      health: 100,
      damageFront: 0,
      damageRear: 0,
      damageLeft: 0,
      damageRight: 0,
    };
  }

  public repair() {
    this.state.health = 100;
    this.state.damageFront = 0;
    this.state.damageRear = 0;
    this.state.damageLeft = 0;
    this.state.damageRight = 0;
  }

  public teleport(x: number, z: number, heading: number) {
    const surf = getSurfaceAt(x, z);
    const isRoad = surf === 'asphalt' || surf === 'puddle';
    const groundY = isRoad
      ? 0.088
      : Math.max(0.02, getTerrainHeight(x, z) + 0.02);
    this.state.x = x;
    this.state.z = z;
    this.state.y = groundY;
    this.state.vy = 0;
    this.state.isAirborne = false;
    this.state.heading = heading;
    this.state.vx = 0;
    this.state.vz = 0;
    this.state.forwardSpeed = 0;
    this.state.lateralSpeed = 0;
    this.state.yawRate = 0;
    this.state.steerAngle = 0;
    this.state.speedKmh = 0;
    this.state.slipRatio = 0;
    this.prevForwardSpeed = 0;
    this.prevIsRoad = isRoad;
    this.prevGroundY = groundY;
    this.throttleSpool = 0;
  }

  public step(
    dt: number,
    input: VehicleInput,
    weatherGripMultiplier: number,
    collisionWorld: CollisionWorld,
    resolveTrafficCollision: (
      px: number,
      pz: number,
      playerHeading: number,
      playerVx: number,
      playerVz: number
    ) => {
      hit: boolean;
      pushX: number;
      pushZ: number;
      nx: number;
      nz: number;
      dvx: number;
      dvz: number;
      impactSpeed: number;
      otherMass: number;
      otherSpeed: number;
      otherVx: number;
      otherVz: number;
      cornerFactor: number;
      hitFront: boolean;
      isParked: boolean;
    }
  ) {
    const s = this.state;
    const clampedDt = Math.min(dt, 0.04);

    // 1. Sample road/terrain surface under the vehicle
    const surface = getSurfaceAt(s.x, s.z);
    s.surface = surface;
    const isRoad = surface === 'asphalt' || surface === 'puddle';

    let baseGrip = 0.92; // rain-wet asphalt with subtle progressive tire slip
    let rollingDrag = 0.135;
    if (surface === 'puddle') {
      baseGrip = 0.76; // hydroplane shimmer puddles — tangible wet tire give
      rollingDrag = 0.165;
    } else if (surface === 'grass') {
      baseGrip = 0.66; // rain-soaked wet grass & mud
      rollingDrag = 0.34;
    }
    const grip = Math.min(1.0, baseGrip * Math.max(0.88, weatherGripMultiplier));
    const groundContact = s.isAirborne ? 0.12 : 1.0;

    // Forward unit vector (heading=0 => -Z; positive heading rotates CCW toward -X)
    const fwdX = -Math.sin(s.heading);
    const fwdZ = -Math.cos(s.heading);
    const rightX = Math.cos(s.heading);
    const rightZ = -Math.sin(s.heading);

    // Decompose world velocity into car-local longitudinal & lateral components
    let vFwd = s.vx * fwdX + s.vz * fwdZ;
    let vLat = s.vx * rightX + s.vz * rightZ;

    // 2. Grounded, Slightly Weightier Steering (A touch more real while staying crisp & fun!)
    const speedAbs = Math.abs(vFwd);
    // Natural speed-sensitive lock angle (tight low-speed lock, stable composed high-speed jukes)
    const maxSteer = 0.64 / (1 + speedAbs * 0.019 + speedAbs * speedAbs * 0.00014);
    const targetSteer = input.steer * maxSteer;
    // Slight rack weight & return-to-center feel (snappier self-centering than turn-in)
    const isCentering = Math.abs(targetSteer) < Math.abs(s.steerAngle);
    const steerRate = isCentering ? 9.8 : 7.2;
    s.steerAngle += (targetSteer - s.steerAngle) * Math.min(1, clampedDt * steerRate);

    // 3. Progressive Twin-Turbo AWD Acceleration (Touch more mechanical spool + slightly faster city pace!)
    const spoolTarget = input.throttle > 0.05 ? input.throttle : 0;
    const spoolRate = spoolTarget > this.throttleSpool ? 4.8 : 7.5;
    this.throttleSpool += (spoolTarget - this.throttleSpool) * Math.min(1, clampedDt * spoolRate);

    let driveForce = 0;
    let braking = false;
    let reversing = false;
    const damagePowerScale = s.health < 40 ? 0.86 + 0.14 * (s.health / 40) : 1.0;

    if (input.throttle > 0.01 && groundContact > 0.5) {
      if (vFwd < -1.0) {
        driveForce = 33.0 * grip * input.throttle;
        braking = true;
      } else {
        // Realistic torque curve: punchy launch with turbo swell in mid-gears, effortlessly reaching ~335 km/h!
        const launchBoost = 1.0 + Math.exp(-speedAbs * 0.065) * 0.16;
        const speedFactor = Math.max(0.37, 1 - speedAbs / 112);
        const tractionLimit = 38.5 * grip + 6.8;
        const rawDrive = 39.8 * launchBoost * speedFactor * damagePowerScale * (0.35 * input.throttle + 0.65 * this.throttleSpool);
        driveForce = Math.min(rawDrive, tractionLimit);
      }
    }

    if (input.brake > 0.01 && groundContact > 0.5) {
      if (vFwd > 0.8) {
        // Progressive brake bite (realistic deceleration feel without instant dead-stop)
        const brakeDecel = (19.5 + 17.5 * grip) * input.brake;
        driveForce -= brakeDecel;
        braking = true;
      } else {
        const revLimit = Math.max(0, 1 - Math.abs(vFwd) / 24);
        driveForce -= 15.5 * revLimit * input.brake;
        reversing = true;
      }
    }

    if (input.handbrake && groundContact > 0.5) {
      braking = true;
      if (Math.abs(vFwd) > 0.4) {
        driveForce -= Math.sign(vFwd) * (6.6 * grip + 2.4);
      }
    }

    // Clean low-drag aero curve so picking up top speed feels smooth, weighty & rewarding
    const aeroDrag = 0.00138 * vFwd * Math.abs(vFwd);
    const roll = rollingDrag * vFwd * groundContact;
    vFwd += (driveForce - aeroDrag - roll) * clampedDt;

    if (
      !s.isAirborne &&
      input.throttle < 0.02 &&
      input.brake < 0.02 &&
      Math.abs(vFwd) < 0.22 &&
      Math.abs(vLat) < 0.22
    ) {
      vFwd = 0;
      vLat = 0;
    }

    // 4. Weight-Transfer AWD Cornering & Authentic Wet-Asphalt Slip Angle
    const wheelBase = 2.78;
    const rearGripFactor = input.handbrake ? 0.34 : 1.0;

    // Subtle trail-braking front bite vs high-speed understeer (a touch more real, still super controllable!)
    const brakeFrontBite = braking && !input.handbrake && speedAbs > 10 ? 1.07 : 1.0;
    const wetUndersteer = Math.max(0.76, 1.0 - Math.max(0, speedAbs - 34) * 0.0038 * (1.18 - grip));

    const steerSign = vFwd >= -0.2 ? 1 : -1;
    const effectiveTurnSpeed = Math.min(speedAbs, 35);
    const rawYawTarget =
      (effectiveTurnSpeed / wheelBase) *
      Math.tan(s.steerAngle) *
      steerSign *
      brakeFrontBite *
      wetUndersteer;

    const oversteerBoost =
      input.handbrake && speedAbs > 5.0
        ? 1.44
        : surface === 'puddle' && input.throttle > 0.65 && speedAbs > 15.0
        ? 1.11
        : 1.0;

    // Weightier yaw inertia (slightly less instantaneous snap than pure arcade, freezes rotation slightly mid-air)
    const yawResponse = (4.4 + 4.9 * grip) * (input.handbrake ? 0.74 : 1.0) * (s.isAirborne ? 0.14 : 1.0);
    s.yawRate +=
      (rawYawTarget * oversteerBoost - s.yawRate) *
      Math.min(1, clampedDt * yawResponse);

    if (!s.isAirborne && speedAbs < 0.35 && Math.abs(vLat) < 0.35) {
      s.yawRate *= Math.max(0, 1 - clampedDt * 14);
    }

    s.heading += s.yawRate * clampedDt;

    // Realistic lateral tire compliance + gentle AWD exit pull (prevents sluggish turns without feeling fake)
    const prevTotalSpeed = Math.hypot(vFwd, vLat);
    const latScrubRate = (3.1 + 7.4 * grip) * rearGripFactor * groundContact;
    const turnCentrifugal =
      -s.yawRate *
      vFwd *
      (input.handbrake ? 0.48 : (1.0 - Math.min(0.88, grip * 0.94)) * 0.68) *
      groundContact;
    vLat += turnCentrifugal * clampedDt;
    vLat *= Math.exp(-latScrubRate * clampedDt);

    if (!s.isAirborne && !input.handbrake && input.throttle > 0.15 && vFwd > 4.0) {
      const newTotal = Math.hypot(vFwd, vLat);
      if (newTotal < prevTotalSpeed) {
        const recover = (prevTotalSpeed - newTotal) * 0.62;
        vFwd += recover;
      }
    }

    // Reconstruct world velocity
    const nFwdX = -Math.sin(s.heading);
    const nFwdZ = -Math.cos(s.heading);
    const nRightX = Math.cos(s.heading);
    const nRightZ = -Math.sin(s.heading);

    s.vx = nFwdX * vFwd + nRightX * vLat;
    s.vz = nFwdZ * vFwd + nRightZ * vLat;

    // 5. Sub-stepped Hard Solid Environment & Traffic Collisions (ZERO pass-through even at 330+ km/h!)
    const applyImpactDamage = (impactSpeed: number, colNx: number, colNz: number) => {
      if (impactSpeed < 5.5) return;
      const nowMs = performance.now();
      if (nowMs - this.lastDamageTime < 150) return;
      this.lastDamageTime = nowMs;

      const dmg = Math.min(34, (impactSpeed - 4.8) * 1.28);
      s.health = Math.max(0, s.health - dmg);

      const fwdDot = colNx * nFwdX + colNz * nFwdZ;
      const rightDot = colNx * nRightX + colNz * nRightZ;
      const zoneDelta = Math.min(0.48, dmg / 38);
      if (fwdDot < -0.35) {
        s.damageFront = Math.min(1, s.damageFront + zoneDelta);
      } else if (fwdDot > 0.35) {
        s.damageRear = Math.min(1, s.damageRear + zoneDelta);
      }
      if (rightDot < -0.35) {
        s.damageRight = Math.min(1, s.damageRight + zoneDelta);
      } else if (rightDot > 0.35) {
        s.damageLeft = Math.min(1, s.damageLeft + zoneDelta);
      }
    };

    const stepSpeed = Math.hypot(s.vx, s.vz);
    const subSteps = stepSpeed > 50 ? 4 : stepSpeed > 24 ? 2 : 1;
    const subDt = clampedDt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      s.x += s.vx * subDt;
      s.z += s.vz * subDt;

      // Solid tall buildings, cathedral walls, bridge rails, monuments
      const envCol = collisionWorld.resolveCircle(s.x, s.z, 1.85);
      if (envCol.hit) {
        s.x = envCol.x;
        s.z = envCol.z;
        const vn = s.vx * envCol.nx + s.vz * envCol.nz;
        if (vn < 0) {
          const hitSpd = Math.abs(vn);
          const preSpd = Math.hypot(s.vx, s.vz);
          applyImpactDamage(hitSpd, envCol.nx, envCol.nz);
          s.vx -= envCol.nx * vn * 1.24;
          s.vz -= envCol.nz * vn * 1.24;
          s.vx *= 0.84;
          s.vz *= 0.84;
          this.heaveVel += Math.min(1.3, hitSpd * 0.052);
          // Oblique high-speed barrier/wall strike can kick the outer wheel airborne!
          if (hitSpd > 11.0 && preSpd > 16.0) {
            const sideDot = envCol.nx * nRightX + envCol.nz * nRightZ;
            const oblique = Math.min(1, Math.abs(sideDot));
            const wallAir = Math.min(6.4, (hitSpd - 9.5) * 0.24 * (0.45 + oblique * 0.65));
            s.vy = Math.max(s.vy, wallAir);
            this.rollVel += Math.sign(sideDot || 1) * Math.min(3.6, wallAir * 0.55);
            this.pitchVel += Math.min(2.2, hitSpd * 0.06);
          }
        }
      }

      // Exact 2-Circle-vs-OBB Hard Solid Collision + Proportional Catch-Air Physics vs Moving Traffic, Buses & Parked Cars!
      const preHitSpeed = Math.hypot(s.vx, s.vz);
      const trafCol = resolveTrafficCollision(s.x, s.z, s.heading, s.vx, s.vz);
      if (trafCol.hit) {
        s.x += trafCol.pushX;
        s.z += trafCol.pushZ;

        if (trafCol.impactSpeed > 0.15) {
          const otherMass = Math.max(0.8, trafCol.otherMass || 1.2);
          const otherSpd = trafCol.otherSpeed || 0;
          const massRatio = otherMass / (1.15 + otherMass); // ~0.52 sedan, ~0.84 bus, ~0.86 truck!
          const closingSpd = trafCol.impactSpeed;
          const corner = Math.max(0, Math.min(1, trafCol.cornerFactor || 0));

          const headOnRatio =
            preHitSpeed > 1.0
              ? Math.min(1, closingSpd / (preHitSpeed * 1.12 + otherSpd * 0.6 + 0.8))
              : 1;
          const isPureSideBrush = preHitSpeed > 14 && otherSpd < 10 && headOnRatio < 0.22;

          // Proportional impact damage (bus/truck hits hurt noticeably more than a grazing sedan!)
          const massDmgScale = 0.72 + massRatio * 0.82;
          applyImpactDamage(
            closingSpd * massDmgScale * (isPureSideBrush ? 0.5 : 1.08),
            trafCol.nx,
            trafCol.nz
          );

          // Hard mass-weighted rigid-body velocity impulse (zero ghosting!)
          s.vx += trafCol.dvx * (isPureSideBrush ? 0.68 : 1.04);
          s.vz += trafCol.dvz * (isPureSideBrush ? 0.68 : 1.04);

          // Safety clamp: never allow remaining velocity into the struck vehicle's normal!
          const postVn = s.vx * trafCol.nx + s.vz * trafCol.nz;
          if (postVn < 0) {
            s.vx -= trafCol.nx * postVn * 1.1;
            s.vz -= trafCol.nz * postVn * 1.1;
          }

          // Crunch energy loss scaled to collision type (less scrub when bus blasts a stationary player!)
          const playerWasStanding = preHitSpeed < 4.5 && otherSpd > 4.5;
          const energyLoss = playerWasStanding
            ? 0.96
            : isPureSideBrush
            ? 0.94
            : Math.max(0.72, 0.92 - closingSpd * 0.0045 * massRatio);
          s.vx *= energyLoss;
          s.vz *= energyLoss;

          const sideDot = trafCol.nx * nRightX + trafCol.nz * nRightZ;
          const fwdDot = trafCol.nx * nFwdX + trafCol.nz * nFwdZ;
          const rollSign = sideDot !== 0 ? Math.sign(sideDot) : trafCol.hitFront ? 1 : -1;

          // =================================================================
          // SITUATION-PROPORTIONAL CATCH-AIR & TUMBLE REACTION PHYSICS!
          // =================================================================
          let airVy = 0;
          let kickPitch = 0;
          let kickRoll = 0;
          let kickYaw = sideDot * Math.min(3.4, closingSpd * (0.055 + corner * 0.08) * (0.7 + massRatio));

          if (playerWasStanding) {
            // SCENARIO 1: Standing/slow player slammed by a moving Bus, Truck, or Car!
            // Massive bus/truck shoves & launches the car up and sideways proportionally to mass & speed!
            if (otherMass >= 3.5 && closingSpd > 4.8) {
              airVy = Math.min(9.8, 2.2 + (closingSpd - 4.0) * 0.36 * massRatio);
              kickRoll = -rollSign * Math.min(4.8, 1.35 + closingSpd * 0.14);
              kickPitch = (fwdDot > 0 ? 1 : -1) * Math.min(3.2, 0.7 + closingSpd * 0.09);
              kickYaw += rollSign * Math.min(3.8, closingSpd * 0.11);
            } else if (closingSpd > 6.5) {
              airVy = Math.min(6.4, 1.4 + (closingSpd - 5.5) * 0.24 * massRatio);
              kickRoll = -rollSign * Math.min(3.2, 0.8 + closingSpd * 0.1);
              kickPitch = (fwdDot > 0 ? 1 : -1) * Math.min(2.2, closingSpd * 0.07);
            }
          } else if (otherSpd < 4.0 && preHitSpeed > 8.5) {
            // SCENARIO 2: Moving player slamming a standing traffic car or parked car!
            if (corner > 0.4 && closingSpd > 8.5) {
              // Wheel-on-bumper CORNER WEDGE VAULT: dramatic one-sided ramp launch + diagonal airborne roll!
              airVy = Math.min(10.8, 2.8 + (closingSpd - 7.5) * 0.29 * (0.72 + corner * 0.55));
              kickRoll = rollSign * Math.min(5.6, 1.8 + closingSpd * 0.14 * (0.6 + corner));
              kickPitch = (trafCol.hitFront ? 1.0 : -0.8) * Math.min(3.4, 0.85 + closingSpd * 0.085);
              kickYaw += rollSign * Math.min(4.4, closingSpd * 0.12 * corner);
            } else if (closingSpd > 11.5) {
              // Dead-center heavy slam: nose-dive crunch + rear-end kick-up air-hop!
              airVy = Math.min(7.2, 1.6 + (closingSpd - 10.5) * 0.21 * (0.65 + massRatio * 0.6));
              kickPitch = (trafCol.hitFront ? -1.0 : 1.0) * Math.min(3.0, 0.9 + closingSpd * 0.075);
              kickRoll = rollSign * Math.min(2.0, closingSpd * 0.05);
            }
          } else if (closingSpd > 8.0) {
            // SCENARIO 3: Moving-vs-Moving high-energy collision (T-bone / Head-on / Heavy bus clash!)
            const energyTerm = (closingSpd - 7.0) * (0.24 + massRatio * 0.22);
            airVy = Math.min(11.6, 2.0 + energyTerm * (0.78 + corner * 0.45));
            kickRoll = rollSign * Math.min(5.4, (1.1 + closingSpd * 0.13) * (0.65 + corner * 0.65));
            kickPitch = (fwdDot < 0 ? 1 : -1) * Math.min(3.6, 0.75 + closingSpd * 0.09);
            kickYaw += rollSign * Math.min(4.8, closingSpd * 0.11 * (0.5 + corner));
          }

          if (airVy > 0.4) {
            s.vy = Math.max(s.vy, airVy);
            s.isAirborne = true;
          }
          s.yawRate = Math.max(-6.8, Math.min(6.8, s.yawRate + kickYaw));
          this.rollVel += kickRoll;
          this.pitchVel += kickPitch - Math.min(0.65, closingSpd * 0.022);
          this.heaveVel += Math.min(1.65, closingSpd * 0.052 * (0.7 + massRatio));
        }
      }
    }

    // Re-sync local speeds after collision response
    s.forwardSpeed = s.vx * nFwdX + s.vz * nFwdZ;
    s.lateralSpeed = s.vx * nRightX + s.vz * nRightZ;
    const horizSpeed = Math.hypot(s.vx, s.vz);
    s.speedKmh = horizSpeed * 3.6;

    // =========================================================================
    // 6. REAL VERTICAL AIRBORNE, DRIVEABLE LOW-LEDGE RAMP LAUNCH & WEIGHTY LANDING!
    // =========================================================================
    const newSurface = getSurfaceAt(s.x, s.z);
    const newIsRoad = newSurface === 'asphalt' || newSurface === 'puddle';
    const terrainH = getTerrainHeight(s.x, s.z);
    const baseGroundY = newIsRoad ? 0.088 : Math.max(0.02, terrainH + 0.02);

    // Sample driveable low ledges (roundabout granite islands, monument steps, low plazas!)
    const ledgeSample = collisionWorld.sampleLedgeHeight(s.x, s.z);
    const groundY = Math.max(baseGroundY, ledgeSample.height + 0.06);

    // Climbing up onto a driveable low ledge: bump at low speed, catch real air at medium/high speed!
    const ledgeDelta = groundY - this.prevGroundY;
    if (!s.isAirborne && ledgeDelta > 0.045 && horizSpeed > 1.2) {
      // Subtle tire bump speed scrub (smaller at high speed as car vaults cleanly!)
      const scrub = horizSpeed < 10 ? 0.94 : 0.975;
      s.vx *= scrub;
      s.vz *= scrub;

      if (horizSpeed < 7.5) {
        // Gentle realistic curb climb thump & nose-lift without crazy jumping at crawling speeds
        this.heaveVel += Math.min(0.85, 0.25 + horizSpeed * 0.08);
        this.pitchVel += Math.min(1.1, 0.25 + horizSpeed * 0.11);
      } else {
        // Speed-proportional ramp air launch over the low ledge!
        const speedNorm = Math.min(1.0, (horizSpeed - 7.0) / 42.0);
        const launchVy = 2.4 + speedNorm * 8.2; // 2.4 m/s small hop up to 10.6 m/s huge jump!
        s.vy = Math.max(s.vy, launchVy);
        s.isAirborne = true;
        // Nose lifts naturally off the lip; oblique angle tilts one side slightly!
        const sideApproach = ledgeSample.nx * nRightX + ledgeSample.nz * nRightZ;
        this.pitchVel += Math.min(2.8, 0.85 + speedNorm * 1.9);
        this.rollVel += -sideApproach * Math.min(2.6, 0.6 + speedNorm * 2.1);
        this.heaveVel += 0.9 + speedNorm * 0.8;
      }
    }

    // Curb / road-edge boundary step crossing impulse! (Jumping up onto sidewalk/grass or dropping off curb at speed!)
    if (newIsRoad !== this.prevIsRoad && horizSpeed > 5.5 && ledgeSample.height < 0.05) {
      const curbEnergy = Math.min(1.0, (horizSpeed - 5.0) / 36.0);
      if (!s.isAirborne) {
        // Kick upward over the curb lip + suspension jolt
        const hopImpulse = (newIsRoad ? 1.9 : 3.25) * (0.45 + curbEnergy * 0.95);
        s.vy = Math.max(s.vy, hopImpulse);
        this.pitchVel += (newIsRoad ? 0.35 : 0.78) * curbEnergy;
        this.heaveVel += 0.7 * curbEnergy;
      }
    }

    // Terrain crest launch (hitting forest hills, bridge crowns, or rough ground undulations at speed!)
    const groundSlopeVel = (groundY - this.prevGroundY) / Math.max(0.005, clampedDt);
    if (!s.isAirborne && groundSlopeVel > 0.65 && horizSpeed > 10.0) {
      s.vy = Math.max(s.vy, Math.min(7.2, groundSlopeVel * 1.2));
    }
    // Off-road rough bump hop when bombing across wet grass hills fast
    if (!s.isAirborne && !newIsRoad && horizSpeed > 24.0) {
      const bumpPhase = Math.sin(s.x * 0.24) * Math.cos(s.z * 0.22);
      if (bumpPhase > 0.92) {
        s.vy = Math.max(s.vy, 1.65 + Math.min(2.4, (horizSpeed - 24) * 0.09));
      }
    }

    // Apply gravity & integrate Y
    s.vy -= 21.0 * clampedDt;
    s.y += s.vy * clampedDt;

    if (s.y <= groundY) {
      // Touchdown! Convert downward vertical speed into weighty suspension compression & bounce!
      const impactDown = -s.vy;
      s.y = groundY;
      if (impactDown > 1.25) {
        // Compress chassis down on landing, then let suspension spring rebound naturally!
        this.heaveVel -= Math.min(3.1, impactDown * 0.44);
        this.pitchVel -= Math.min(1.1, impactDown * 0.095);
        // Heavy slam landing from huge air can scuff undercarriage slightly
        if (impactDown > 12.0) {
          applyImpactDamage((impactDown - 8.5) * 1.4, 0, 0);
        }
        // Playful realistic tire rebound bounce on big landings
        s.vy = impactDown > 4.6 ? impactDown * 0.19 : 0;
      } else {
        s.vy = 0;
      }
      s.isAirborne = s.vy > 0.55;
    } else {
      s.isAirborne = s.y - groundY > 0.09;
    }

    this.prevIsRoad = newIsRoad;
    this.prevGroundY = groundY;

    // 7. Automatic 6-Speed High-Performance Gearbox & Realistic RPM
    const kmh = Math.abs(s.forwardSpeed) * 3.6;
    if (s.forwardSpeed < -0.5 || (reversing && kmh < 2)) {
      s.gear = 'R';
      s.rpm = Math.min(6800, 1050 + kmh * 95);
    } else if (kmh < 0.6 && input.throttle < 0.05) {
      s.gear = 'N';
      s.rpm = 880 + Math.sin(performance.now() * 0.008) * 18;
    } else {
      const thresholds = [0, 58, 114, 172, 232, 290, 355];
      let gIdx = 1;
      for (let g = 1; g <= 6; g++) {
        if (kmh >= thresholds[g - 1]) gIdx = g;
      }
      s.gear = String(gIdx);
      const gearMin = thresholds[gIdx - 1];
      const gearMax = thresholds[gIdx];
      const ratio = Math.max(0, Math.min(1, (kmh - gearMin) / (gearMax - gearMin)));
      const targetRpm = 1480 + ratio * 5550 + input.throttle * 420;
      s.rpm += (targetRpm - s.rpm) * Math.min(1, clampedDt * 9.5);
    }

    // 8. Tire Slip Ratio (for wet asphalt streaks, hydroplane spray & audio)
    const latSlip = Math.min(1, Math.abs(s.lateralSpeed) / 6.8);
    const launchSlip =
      input.throttle > 0.75 && kmh < 55 && surface === 'puddle' ? 0.44 : 0;
    const brakeSlip = braking && kmh > 35 && input.brake > 0.7 ? 0.52 : 0;
    const targetSlip = s.isAirborne
      ? 0
      : Math.max(
          latSlip,
          launchSlip,
          brakeSlip,
          input.handbrake && kmh > 10 ? 0.88 : 0
        );
    s.slipRatio += (targetSlip - s.slipRatio) * Math.min(1, clampedDt * 9);

    // 9. Spring-Damped Suspension Pitch, Roll & Weighty Bounce Heave
    const accel = (s.forwardSpeed - this.prevForwardSpeed) / Math.max(0.001, clampedDt);
    this.prevForwardSpeed = s.forwardSpeed;

    // In mid-air, allow expressive realistic pitch/roll tilt while preserving momentum, then self-right smoothly on touchdown!
    const airPitch = s.isAirborne
      ? Math.max(-0.28, Math.min(0.32, s.vy * 0.032))
      : 0;
    const targetPitch = s.isAirborne
      ? airPitch
      : Math.max(-0.048, Math.min(0.046, accel * 0.0025));
    const targetRoll = s.isAirborne
      ? 0
      : Math.max(
          -0.068,
          Math.min(0.068, -s.yawRate * Math.min(24, speedAbs) * 0.0032)
        );
    const bumpTarget =
      !s.isAirborne && speedAbs > 1.5
        ? Math.sin(s.x * 0.65 + s.z * 0.65) *
          (surface === 'grass' ? 0.028 : 0.006) *
          Math.min(1, speedAbs / 15)
        : 0;

    // Softer angular spring/damping while airborne so wedge vaults & bus launches visibly tilt in mid-air!
    const kSpring = s.isAirborne ? 8.5 : 52;
    const cDamp = s.isAirborne ? 2.1 : 9.4;
    this.pitchVel += ((targetPitch - s.pitch) * kSpring - this.pitchVel * cDamp) * clampedDt;
    s.pitch = Math.max(-0.54, Math.min(0.54, s.pitch + this.pitchVel * clampedDt));

    this.rollVel += ((targetRoll - s.roll) * kSpring - this.rollVel * cDamp) * clampedDt;
    s.roll = Math.max(-0.64, Math.min(0.64, s.roll + this.rollVel * clampedDt));

    this.heaveVel += ((bumpTarget - s.heave) * 62 - this.heaveVel * 8.6) * clampedDt;
    s.heave = Math.max(-0.26, Math.min(0.28, s.heave + this.heaveVel * clampedDt));

    // Prevent player car bumpers, sills, or fenders from EVER clipping below ground during extreme pitch/roll!
    const tiltFloorLift = Math.max(
      0,
      1.04 * Math.abs(Math.sin(s.roll)) * 0.78 +
        2.38 * Math.abs(Math.sin(s.pitch)) * 0.56 -
        0.12 -
        Math.min(0, s.heave)
    );
    if (s.y < groundY + tiltFloorLift) {
      s.y = groundY + tiltFloorLift;
      if (s.vy < 0) s.vy = 0;
    }

    s.isBraking = braking;
    s.isReversing = reversing;
    s.wheelSpinDelta = (s.forwardSpeed * clampedDt) / 0.36;
  }
}
