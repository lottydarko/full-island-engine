import * as THREE from 'three';
import { TextureLibrary } from './textures';

export type HeadlightMode = 'off' | 'low' | 'high';

export interface HeroCarRig {
  root: THREE.Group;
  bodyTilt: THREE.Group; // suspension pitch/roll/heave pivot
  frontLeftPivot: THREE.Group;
  frontRightPivot: THREE.Group;
  wheels: THREE.Object3D[]; // 4 rotating wheel assemblies
  wipers: THREE.Object3D[];
  headlightSpots: THREE.SpotLight[];
  headlightCones: THREE.Mesh[];
  headlightEmissiveMat: THREE.MeshStandardMaterial;
  fogLightEmissiveMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  reverseLightMat: THREE.MeshStandardMaterial;
  taillightGlow: THREE.PointLight;
  setHeadlightMode: (mode: HeadlightMode) => void;
  setBrakeReverse: (braking: boolean, reversing: boolean) => void;
  setDynamicEnvMap: (envTex: THREE.Texture) => void;
  applyDamageVisuals: (
    front: number,
    rear: number,
    left: number,
    right: number,
    health: number,
    elapsed: number,
    dt: number
  ) => void;
  updateVisuals: (
    steerAngle: number,
    wheelSpinDelta: number,
    pitch: number,
    roll: number,
    heave: number,
    elapsedTime: number,
    forwardSpeed?: number,
    lateralAccel?: number
  ) => void;
}

export function createHeroCar(textures: TextureLibrary, isSoftwareGl: boolean): HeroCarRig {
  const root = new THREE.Group();
  const bodyTilt = new THREE.Group();
  root.add(bodyTilt);

  // =========================================================================
  // ADVANCED DUAL-LAYER WET METALLIC CLEARCOAT + PEARLESCENT IRIDESCENCE SHADING
  // =========================================================================
  const basePaintColor = new THREE.Color('#222c3a');
  const damagedPaintColor = new THREE.Color('#13171e');

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: basePaintColor.clone(),
    map: textures.carPaintMap,
    roughnessMap: textures.carPaintRoughness,
    bumpMap: textures.carBodyBump,
    bumpScale: 0.024,
    metalness: 0.86,
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.075, // liquid midnight wet clearcoat gliding across sculpted ridges & creases!
    iridescence: 0.24,
    iridescenceIOR: 1.42,
    sheen: 0.22,
    sheenColor: new THREE.Color('#4a668a'),
    sheenRoughness: 0.42,
    specularIntensity: 1.0,
    specularColor: new THREE.Color('#c8dcf5'),
    envMapIntensity: 0.72,
  });

  const trimCarbonMat = new THREE.MeshPhysicalMaterial({
    color: '#202630',
    map: textures.carbonWeaveMap,
    bumpMap: textures.carBodyBump,
    bumpScale: 0.012,
    roughness: 0.34,
    metalness: 0.44,
    clearcoat: 0.62,
    clearcoatRoughness: 0.18,
    envMapIntensity: 0.78,
  });

  const chromeMat = new THREE.MeshPhysicalMaterial({
    color: '#ccd6e2',
    roughness: 0.12,
    metalness: 0.96,
    clearcoat: 0.5,
    envMapIntensity: 1.08,
  });

  // Tinted panoramic fastback glass with crisp clearcoat & faint iridescence
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0a1320',
    roughness: 0.06,
    metalness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    iridescence: 0.16,
    reflectivity: 0.96,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    envMapIntensity: 0.78,
  });

  // Smoked translucent outer polycarbonate taillight lens cover (gives real optical depth over LED blades!)
  const smokedLensMat = new THREE.MeshPhysicalMaterial({
    color: '#1b0408',
    roughness: 0.07,
    metalness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    envMapIntensity: 0.95,
  });

  const interiorMat = new THREE.MeshStandardMaterial({
    color: '#1b2028',
    roughness: 0.82,
    metalness: 0.08,
  });

  // Restrained futuristic cockpit glow WITHIN the car (never spills blinding blue onto the roof!)
  const cockpitCyanMat = new THREE.MeshStandardMaterial({
    color: '#7cd4e8',
    emissive: new THREE.Color('#1ea8c4'),
    emissiveIntensity: 1.05,
    roughness: 0.25,
  });
  const cockpitAmberMat = new THREE.MeshStandardMaterial({
    color: '#ffcf86',
    emissive: new THREE.Color('#ff8c24'),
    emissiveIntensity: 0.95,
    roughness: 0.3,
  });

  // Sparingly applied sleek futuristic exterior accent thread
  const cyberAccentMat = new THREE.MeshStandardMaterial({
    color: '#9ee8fa',
    emissive: new THREE.Color('#2bc8ec'),
    emissiveIntensity: 1.25,
    roughness: 0.18,
  });

  const headlightEmissiveMat = new THREE.MeshStandardMaterial({
    color: '#f0f7ff',
    emissive: new THREE.Color('#e8f4ff'),
    emissiveIntensity: 2.2,
    roughness: 0.08,
    metalness: 0.1,
  });
  // Separate left headlight material so heavy front damage can visibly flicker/break one lamp!
  const leftHeadlightMat = headlightEmissiveMat.clone();

  const fogLightEmissiveMat = new THREE.MeshStandardMaterial({
    color: '#ffe8a8',
    emissive: new THREE.Color('#ffb838'),
    emissiveIntensity: 1.45,
    roughness: 0.15,
  });

  // Photorealistic multi-cell smoked ruby OLED taillight filament material (NEVER flat cartoon red!)
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: '#48060c',
    map: textures.tailLightMap,
    emissiveMap: textures.tailLightMap,
    emissive: new THREE.Color('#ff241c'),
    emissiveIntensity: 1.45,
    roughness: 0.14,
    metalness: 0.22,
  });

  const reverseLightMat = new THREE.MeshStandardMaterial({
    color: '#cbd4dc',
    emissive: new THREE.Color('#eef6ff'),
    emissiveIntensity: 0.0,
    roughness: 0.12,
  });

  const amberMarkerMat = new THREE.MeshStandardMaterial({
    color: '#c46a18',
    emissive: new THREE.Color('#ff921c'),
    emissiveIntensity: 1.05,
    roughness: 0.22,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    map: textures.tireTreadMap,
    color: '#2c3138',
    roughness: 0.84,
    metalness: 0.08,
  });

  const alloyMat = new THREE.MeshStandardMaterial({
    color: '#c4ceda',
    roughness: 0.18,
    metalness: 0.92,
    envMapIntensity: 1.15,
  });

  const caliperMat = new THREE.MeshStandardMaterial({
    color: '#b82026',
    roughness: 0.32,
    metalness: 0.58,
  });

  // =========================================================================
  // SCULPTED CURVED GRAND-TOURING FASTBACK BODY (Forward = -Z)
  // + Surface-Hugging Flowing Water Film Meshes on Hull, Hood, Cabin & Roof!
  // =========================================================================

  // 1. Sculpted Main Fastback Lower Body
  const lowerShape = new THREE.Shape();
  lowerShape.moveTo(-2.22, 0.28);
  lowerShape.quadraticCurveTo(-2.36, 0.42, -2.32, 0.62);
  lowerShape.bezierCurveTo(-2.26, 0.78, -1.96, 0.86, -1.52, 0.89);
  lowerShape.quadraticCurveTo(-1.12, 0.91, -0.82, 0.93);
  lowerShape.bezierCurveTo(-0.1, 0.94, 0.75, 0.96, 1.38, 0.95);
  lowerShape.bezierCurveTo(1.88, 0.94, 2.24, 0.9, 2.32, 0.72);
  lowerShape.quadraticCurveTo(2.36, 0.48, 2.22, 0.32);
  lowerShape.lineTo(-2.22, 0.28);

  const lowerGeo = new THREE.ExtrudeGeometry(lowerShape, {
    depth: 1.66,
    curveSegments: 18,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 0.11,
    bevelThickness: 0.12,
  });
  lowerGeo.center();
  lowerGeo.rotateY(Math.PI * 0.5);
  const lowerHull = new THREE.Mesh(lowerGeo, paintMat);
  lowerHull.position.set(0, 0.62, 0);
  lowerHull.castShadow = true;
  lowerHull.receiveShadow = true;
  bodyTilt.add(lowerHull);

  // 2. Sculpted Curved Hood Dome (can dent/pop slightly on heavy front impacts!)
  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(-0.74, 0);
  hoodShape.quadraticCurveTo(-0.42, 0.085, 0.05, 0.09);
  hoodShape.quadraticCurveTo(0.55, 0.08, 0.74, 0);
  hoodShape.lineTo(-0.74, 0);
  const hoodGeo = new THREE.ExtrudeGeometry(hoodShape, {
    depth: 1.06,
    curveSegments: 14,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.05,
    bevelThickness: 0.05,
  });
  hoodGeo.center();
  hoodGeo.rotateY(Math.PI * 0.5);
  const hoodGroup = new THREE.Group();
  hoodGroup.position.set(0, 0.91, -1.48);
  hoodGroup.rotation.x = 0.06;
  const hoodDome = new THREE.Mesh(hoodGeo, paintMat);
  hoodGroup.add(hoodDome);
  // Sculpted hood power-dome character creases & extractor heat vents!
  for (const vx of [-0.34, 0.34]) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.024, 0.38), trimCarbonMat);
    vent.position.set(vx, 0.078, -0.05);
    hoodGroup.add(vent);
    // Tapered sculptural hood power-ridge running forward from A-pillar toward nose
    const crease = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.036, 1.02, 6, 10),
      paintMat
    );
    crease.rotation.x = Math.PI * 0.5;
    crease.rotation.z = vx > 0 ? 0.11 : -0.11;
    crease.scale.set(1.2, 1.0, 0.48);
    crease.position.set(vx * 1.18, 0.068, 0.02);
    hoodGroup.add(crease);
  }
  bodyTilt.add(hoodGroup);

  // 3. Flowing Curved Fastback Greenhouse Cabin + Water Sheet
  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(-1.02, 0.0);
  cabinShape.bezierCurveTo(-0.74, 0.26, -0.46, 0.48, -0.14, 0.52);
  cabinShape.bezierCurveTo(0.28, 0.56, 0.74, 0.52, 1.12, 0.34);
  cabinShape.quadraticCurveTo(1.48, 0.18, 1.72, 0.02);
  cabinShape.lineTo(-1.02, 0.0);

  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
    depth: 1.32,
    curveSegments: 18,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.08,
    bevelThickness: 0.08,
  });
  cabinGeo.center();
  cabinGeo.rotateY(Math.PI * 0.5);
  const cabinGlass = new THREE.Mesh(cabinGeo, glassMat);
  cabinGlass.position.set(0, 1.12, 0.22);
  cabinGlass.renderOrder = 2;
  bodyTilt.add(cabinGlass);

  // Sculpted Painted Roof Arch Panel
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.48, 0.0);
  roofShape.bezierCurveTo(-0.12, 0.09, 0.42, 0.09, 0.88, -0.02);
  roofShape.lineTo(0.84, -0.06);
  roofShape.bezierCurveTo(0.4, 0.03, -0.12, 0.03, -0.45, -0.04);
  roofShape.lineTo(-0.48, 0.0);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: 1.24,
    curveSegments: 14,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.03,
    bevelThickness: 0.04,
  });
  roofGeo.center();
  roofGeo.rotateY(Math.PI * 0.5);
  const roofCap = new THREE.Mesh(roofGeo, paintMat);
  roofCap.position.set(0, 1.385, 0.14);
  roofCap.castShadow = true;
  bodyTilt.add(roofCap);

  // Occasional subtle sprinkle of tiny discrete raindrops landing on hood, glass & roof (ZERO dripping lines!)
  const sprinkleCount = 24;
  const sprinkleGeo = new THREE.PlaneGeometry(0.055, 0.055);
  sprinkleGeo.rotateX(-Math.PI * 0.5);
  const sprinkleMat = new THREE.MeshBasicMaterial({
    map: textures.rippleMap,
    color: '#c8d6e4',
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const sprinkleInst = new THREE.InstancedMesh(sprinkleGeo, sprinkleMat, sprinkleCount);
  sprinkleInst.renderOrder = 4;
  bodyTilt.add(sprinkleInst);

  const sprinkleSlots: { x: number; y: number; z: number; tiltX: number; period: number; phase: number }[] = [];
  for (let i = 0; i < sprinkleCount; i++) {
    const zone = i % 3;
    const rx = ((i * 73) % 100) / 100 - 0.5;
    const rz = ((i * 37) % 100) / 100 - 0.5;
    if (zone === 0) {
      // Hood
      sprinkleSlots.push({ x: rx * 1.15, y: 1.015, z: -1.48 + rz * 0.95, tiltX: 0.06, period: 1.9 + (i % 5) * 0.45, phase: i * 1.37 });
    } else if (zone === 1) {
      // Roof
      sprinkleSlots.push({ x: rx * 1.05, y: 1.445, z: 0.14 + rz * 0.85, tiltX: 0.0, period: 2.1 + (i % 4) * 0.52, phase: i * 2.13 });
    } else {
      // Rear fastback deck / trunk
      sprinkleSlots.push({ x: rx * 1.12, y: 1.06, z: 1.48 + rz * 0.55, tiltX: -0.18, period: 2.3 + (i % 6) * 0.38, phase: i * 1.81 });
    }
  }
  const sprinkleDummy = new THREE.Object3D();

  // Sculpted Side Haunches, Chrome Window Trim, Side Brake Vents, Mirrors & Rocker Accents
  const leftSideParts: THREE.Object3D[] = [];
  const rightSideParts: THREE.Object3D[] = [];

  for (const sx of [-1, 1]) {
    const sideList = sx < 0 ? leftSideParts : rightSideParts;

    // Sculpted rear muscular quarter-panel haunch sweeping into tail fascia!
    const haunch = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.21, 1.52, 8, 16),
      paintMat
    );
    haunch.rotation.x = Math.PI * 0.5;
    haunch.scale.set(0.68, 1.0, 0.74);
    haunch.position.set(sx * 0.895, 0.76, 0.96);
    bodyTilt.add(haunch);

    // Sculpted front fender arch swell & upper shoulder character ridge along the doors!
    const frontSwell = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 1.08, 8, 14),
      paintMat
    );
    frontSwell.rotation.x = Math.PI * 0.5;
    frontSwell.scale.set(0.64, 1.0, 0.68);
    frontSwell.position.set(sx * 0.885, 0.74, -1.36);
    bodyTilt.add(frontSwell);

    const shoulderCrease = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.052, 2.75, 6, 12),
      paintMat
    );
    shoulderCrease.rotation.x = Math.PI * 0.5;
    shoulderCrease.scale.set(0.85, 1.0, 0.46);
    shoulderCrease.position.set(sx * 0.945, 0.84, 0.04);
    bodyTilt.add(shoulderCrease);

    // Lower sculpted door-scallop aero crease catching wet streetlights along the flanks
    const lowerBladeCrease = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.045, 1.92, 6, 10),
      paintMat
    );
    lowerBladeCrease.rotation.x = Math.PI * 0.5;
    lowerBladeCrease.rotation.y = sx * 0.04;
    lowerBladeCrease.scale.set(0.72, 1.0, 0.42);
    lowerBladeCrease.position.set(sx * 0.94, 0.44, 0.02);
    bodyTilt.add(lowerBladeCrease);

    // Sculpted front-fender aero brake cooling intake vent + chrome louver
    const fenderVent = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.26), trimCarbonMat);
    fenderVent.position.set(sx * 0.945, 0.58, -0.82);
    bodyTilt.add(fenderVent);
    const ventChrome = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.025, 0.24), chromeMat);
    ventChrome.position.set(sx * 0.948, 0.58, -0.82);
    bodyTilt.add(ventChrome);

    // Sculpted rear bumper corner aero extractor vent (gives the back corners real supercar contour!)
    const rearCornerVent = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.16), trimCarbonMat);
    rearCornerVent.position.set(sx * 0.935, 0.54, 1.98);
    rearCornerVent.rotation.y = sx * -0.18;
    bodyTilt.add(rearCornerVent);

    // Chrome greenhouse side beltline trim strip + sculpted A-pillar frame
    const beltTrim = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.022, 1.98), chromeMat);
    beltTrim.position.set(sx * 0.83, 0.97, 0.16);
    bodyTilt.add(beltTrim);

    const sideSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.095, 2.28), trimCarbonMat);
    sideSkirt.position.set(sx * 0.945, 0.29, 0.0);
    bodyTilt.add(sideSkirt);
    sideList.push(sideSkirt);

    const sideGlow = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.018, 1.72), cyberAccentMat);
    sideGlow.position.set(sx * 0.995, 0.305, 0.0);
    bodyTilt.add(sideGlow);

    for (const wz of [-1.42, 1.38]) {
      const flare = new THREE.Mesh(
        new THREE.TorusGeometry(0.415, 0.068, 12, 24, Math.PI),
        paintMat
      );
      flare.rotation.y = Math.PI * 0.5;
      flare.position.set(sx * 0.935, 0.42, wz);
      bodyTilt.add(flare);
    }

    const mirrorGroup = new THREE.Group();
    mirrorGroup.position.set(sx * 0.92, 0.96, -0.52);
    const mirrorStalk = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.055), trimCarbonMat);
    mirrorGroup.add(mirrorStalk);
    const mirrorPod = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.09, 6, 10), paintMat);
    mirrorPod.rotation.z = Math.PI * 0.5;
    mirrorPod.position.set(sx * 0.09, 0.025, 0.02);
    mirrorGroup.add(mirrorPod);
    bodyTilt.add(mirrorGroup);
    sideList.push(mirrorGroup);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.14), chromeMat);
    handle.position.set(sx * 0.955, 0.82, 0.08);
    bodyTilt.add(handle);
  }

  // =========================================================================
  // RESTRAINED FUTURISTIC ILLUMINATED COCKPIT INTERIOR (LOW GLOW, ZERO ROOF GLARE!)
  // =========================================================================
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.4), interiorMat);
  dash.position.set(0, 0.95, -0.54);
  bodyTilt.add(dash);

  const wideHudScreen = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.095, 0.04), cockpitCyanMat);
  wideHudScreen.position.set(-0.08, 1.045, -0.42);
  wideHudScreen.rotation.x = -0.18;
  bodyTilt.add(wideHudScreen);

  const centerConsoleGlow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.72), cockpitAmberMat);
  centerConsoleGlow.position.set(0, 0.85, 0.02);
  bodyTilt.add(centerConsoleGlow);

  for (const sx of [-0.34, 0.34]) {
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.14), interiorMat);
    seatBack.position.set(sx, 1.0, 0.18);
    seatBack.rotation.x = -0.22;
    bodyTilt.add(seatBack);
    const headrest = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.08, 6, 8), interiorMat);
    headrest.position.set(sx, 1.29, 0.24);
    bodyTilt.add(headrest);
    const seatPiping = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.03), cockpitCyanMat);
    seatPiping.position.set(sx, 1.18, 0.25);
    bodyTilt.add(seatPiping);
  }

  // (Internal emissive dash & console strips glow cleanly inside the cabin without a PointLight fireball on the roof!)

  // Animated Windshield Wipers
  const wipers: THREE.Object3D[] = [];
  for (const wx of [-0.34, 0.18]) {
    const wiperPivot = new THREE.Group();
    wiperPivot.position.set(wx, 0.94, -0.86);
    wiperPivot.rotation.x = -0.78;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.016, 0.016), trimCarbonMat);
    arm.position.set(0.22, 0, 0);
    wiperPivot.add(arm);
    bodyTilt.add(wiperPivot);
    wipers.push(wiperPivot);
  }

  // =========================================================================
  // 4. FRONT FASCIA: Detailed Louvered Grille, Aero Splitter, DRL Blade & Projectors
  // =========================================================================
  const grilleRecess = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.2, 0.08), trimCarbonMat);
  grilleRecess.position.set(0, 0.64, -2.35);
  bodyTilt.add(grilleRecess);

  // Fine metallic grille louvers + center emblem badge
  for (let ly = -0.055; ly <= 0.055; ly += 0.055) {
    const louver = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.014, 0.095), chromeMat);
    louver.position.set(0, 0.64 + ly, -2.355);
    bodyTilt.add(louver);
  }
  const frontEmblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.048, 0), chromeMat);
  frontEmblem.scale.set(1.2, 1.0, 0.35);
  frontEmblem.position.set(0, 0.64, -2.405);
  bodyTilt.add(frontEmblem);

  const frontDrlBlade = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.026, 0.045), cyberAccentMat);
  frontDrlBlade.position.set(0, 0.745, -2.375);
  bodyTilt.add(frontDrlBlade);

  const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.055, 0.26), trimCarbonMat);
  frontSplitter.position.set(0, 0.27, -2.32);
  bodyTilt.add(frontSplitter);

  for (const sx of [-1, 1]) {
    const hlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.1), trimCarbonMat);
    hlHousing.position.set(sx * 0.72, 0.68, -2.33);
    hlHousing.rotation.y = sx * -0.14;
    bodyTilt.add(hlHousing);

    const hlLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.09, 0.06),
      sx < 0 ? leftHeadlightMat : headlightEmissiveMat
    );
    hlLens.position.set(sx * 0.72, 0.68, -2.365);
    hlLens.rotation.y = sx * -0.14;
    bodyTilt.add(hlLens);

    const sideMarker = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.09), amberMarkerMat);
    sideMarker.position.set(sx * 0.93, 0.66, -2.24);
    bodyTilt.add(sideMarker);

    const fogPod = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.06), fogLightEmissiveMat);
    fogPod.position.set(sx * 0.68, 0.42, -2.37);
    bodyTilt.add(fogPod);
  }

  // =========================================================================
  // 5. SCULPTED CURVED REAR FASCIA: Contoured Ducktail Deck, Multi-Layer Smoked
  //    3D OLED Taillights, Volumetric Crimson Halo, Carbon Diffuser & Quad Exhausts!
  // =========================================================================
  const rearDiffuserGroup = new THREE.Group();
  rearDiffuserGroup.position.set(0, 0.36, 2.28);
  const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.22, 0.24), trimCarbonMat);
  rearDiffuserGroup.add(rearDiffuser);
  // Sculpted curved bumper valance overhang above diffuser
  const rearValanceLip = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.085, 1.56, 8, 14),
    paintMat
  );
  rearValanceLip.rotation.z = Math.PI * 0.5;
  rearValanceLip.scale.set(1.0, 0.92, 0.82);
  rearValanceLip.position.set(0, 0.16, 0.04);
  rearDiffuserGroup.add(rearValanceLip);
  for (const fx of [-0.38, -0.19, 0, 0.19, 0.38]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.19, 0.28), trimCarbonMat);
    fin.position.set(fx, -0.02, 0.06);
    rearDiffuserGroup.add(fin);
  }
  bodyTilt.add(rearDiffuserGroup);

  // Curved sculptural rear decklid ducktail contour & recessed license cove
  const deckDucktail = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.075, 1.58, 8, 14),
    paintMat
  );
  deckDucktail.rotation.z = Math.PI * 0.5;
  deckDucktail.scale.set(0.95, 1.0, 0.72);
  deckDucktail.position.set(0, 0.925, 2.24);
  bodyTilt.add(deckDucktail);

  // Curved aerodynamic wing (sculpted airfoil cross-section, not a flat slab!)
  const spoilerGroup = new THREE.Group();
  spoilerGroup.position.set(0, 1.04, 2.17);
  const spoilerWing = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.048, 1.62, 6, 12),
    paintMat
  );
  spoilerWing.rotation.z = Math.PI * 0.5;
  spoilerWing.scale.set(0.45, 1.0, 2.45);
  spoilerWing.rotation.x = 0.09;
  spoilerWing.castShadow = true;
  spoilerGroup.add(spoilerWing);
  for (const sx of [-0.85, 0.85]) {
    const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.13, 0.28), trimCarbonMat);
    endplate.position.set(sx, 0.01, 0);
    endplate.rotation.y = sx > 0 ? 0.08 : -0.08;
    spoilerGroup.add(endplate);
  }
  bodyTilt.add(spoilerGroup);

  for (const sx of [-0.62, 0.62]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.12, 0.16), trimCarbonMat);
    strut.position.set(sx, 0.96, 2.16);
    bodyTilt.add(strut);
  }

  // Deep smoked carbon recessed rear fascia housing + twin metallic trim brows
  const tailPanel = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.21, 0.08), trimCarbonMat);
  tailPanel.position.set(0, 0.76, 2.325);
  bodyTilt.add(tailPanel);
  const tailChromeUpper = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.012, 0.06), chromeMat);
  tailChromeUpper.position.set(0, 0.865, 2.355);
  bodyTilt.add(tailChromeUpper);

  // Recessed dark license cove + twin warm-white LED license plate downlights
  const plateCove = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.2, 0.05), trimCarbonMat);
  plateCove.position.set(0, 0.59, 2.345);
  bodyTilt.add(plateCove);
  const plateLampMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: new THREE.Color('#dceaff'),
    emissiveIntensity: 1.5,
  });
  for (const px of [-0.14, 0.14]) {
    const pLamp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.025), plateLampMat);
    pLamp.position.set(px, 0.678, 2.372);
    bodyTilt.add(pLamp);
  }

  // Sculpted thin continuous OLED signature thread + 3D crystalline LED side blades + smoked glass covers!
  const rearLightThread = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.024, 0.032), brakeLightMat);
  rearLightThread.position.set(0, 0.79, 2.368);
  bodyTilt.add(rearLightThread);

  // Smoked curved polycarbonate outer lens spanning the taillight housing (gives real depth & glass shine!)
  const outerTailLens = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.155, 0.036), smokedLensMat);
  outerTailLens.position.set(0, 0.76, 2.382);
  outerTailLens.renderOrder = 3;
  bodyTilt.add(outerTailLens);

  // Soft Fresnel/Gaussian Volumetric Crimson Taillight Glow Halo Shader (feathered wet-night atmospheric bloom!)
  const tailHaloMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#ff2218') },
      uIntensity: { value: 0.34 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      void main() {
        vec2 d = (vUv - 0.5) * 2.0;
        float r2 = d.x * d.x * 0.78 + d.y * d.y * 1.35;
        float glow = exp(-r2 * 4.2) * smoothstep(1.0, 0.15, sqrt(r2));
        vec3 col = mix(uColor, vec3(1.0, 0.45, 0.25), pow(glow, 3.0) * 0.45);
        gl_FragColor = vec4(col, glow * uIntensity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const rearCenterHalo = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 0.48), tailHaloMat);
  rearCenterHalo.position.set(0, 0.77, 2.41);
  rearCenterHalo.renderOrder = 4;
  bodyTilt.add(rearCenterHalo);

  for (const sx of [-1, 1]) {
    // 5 sculpted 3D crystalline OLED light-signature fins angled sleekly outward per side!
    for (let f = 0; f < 5; f++) {
      const fx = sx * (0.44 + f * 0.095);
      const finH = 0.075 + f * 0.011;
      const oledFin = new THREE.Mesh(new THREE.BoxGeometry(0.056, finH, 0.044), brakeLightMat);
      oledFin.position.set(fx, 0.755, 2.364 - f * 0.004);
      oledFin.rotation.z = sx * -0.18;
      oledFin.rotation.y = sx * 0.16;
      bodyTilt.add(oledFin);
    }

    // Wrap-around side crimson marker curve wrapping onto the rear haunch
    const wrapTail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.085, 0.18), brakeLightMat);
    wrapTail.position.set(sx * 0.915, 0.76, 2.26);
    bodyTilt.add(wrapTail);

    // Subtle soft atmospheric halo per taillight pod
    const podHalo = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.46), tailHaloMat);
    podHalo.position.set(sx * 0.66, 0.76, 2.415);
    podHalo.renderOrder = 4;
    bodyTilt.add(podHalo);

    const revLamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.042, 0.044), reverseLightMat);
    revLamp.position.set(sx * 0.34, 0.715, 2.368);
    bodyTilt.add(revLamp);

    // Sculpted lower rear bumper red reflectors
    const lowerRef = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.026, 0.03), brakeLightMat);
    lowerRef.position.set(sx * 0.72, 0.46, 2.35);
    bodyTilt.add(lowerRef);

    // Quad brushed-titanium exhaust tips with dark recessed inner bores!
    for (const dx of [-0.078, 0.078]) {
      const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.048, 0.26, 14),
        chromeMat
      );
      exhaust.rotation.x = Math.PI * 0.5;
      exhaust.position.set(sx * 0.58 + dx, 0.31, 2.36);
      bodyTilt.add(exhaust);

      const bore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.036, 0.04, 12),
        interiorMat
      );
      bore.rotation.x = Math.PI * 0.5;
      bore.position.set(sx * 0.58 + dx, 0.31, 2.482);
      bodyTilt.add(bore);
    }
  }

  // Russian License Plates
  const plateMat = new THREE.MeshStandardMaterial({
    map: textures.licensePlateMap,
    roughness: 0.38,
    metalness: 0.2,
    emissive: new THREE.Color('#eef2f6'),
    emissiveMap: textures.licensePlateMap,
    emissiveIntensity: 0.32,
  });
  const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.13), plateMat);
  rearPlate.position.set(0, 0.6, 2.385);
  bodyTilt.add(rearPlate);

  const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.13), plateMat);
  frontPlate.rotation.y = Math.PI;
  frontPlate.position.set(0, 0.42, -2.41);
  bodyTilt.add(frontPlate);

  const antenna = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.13, 6), trimCarbonMat);
  antenna.position.set(0, 1.46, 0.72);
  antenna.rotation.x = -0.38;
  bodyTilt.add(antenna);

  // =========================================================================
  // 6. ENGINE DAMAGE STEAM / SMOKE WISPS (Only visible when health < 55%!)
  // =========================================================================
  const smokeCount = 16;
  const smokeSprites: THREE.Sprite[] = [];
  const smokePhases: number[] = [];
  const smokeMat = new THREE.SpriteMaterial({
    map: textures.raindropMap,
    color: '#9aa4b0',
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  for (let i = 0; i < smokeCount; i++) {
    const sp = new THREE.Sprite(smokeMat.clone());
    sp.visible = false;
    sp.position.set((i % 5 - 2) * 0.16, 1.0, -1.7);
    bodyTilt.add(sp);
    smokeSprites.push(sp);
    smokePhases.push(i / smokeCount);
  }

  // =========================================================================
  // 7. 4 ARTICULATED CONCAVE ALLOY WHEELS (10-Spoke Metallic + Calipers)
  // =========================================================================
  const wheels: THREE.Object3D[] = [];

  const createWheel = (isRight: boolean): THREE.Group => {
    const wheelGroup = new THREE.Group();
    const radius = 0.36;
    const width = 0.27;

    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
    tireGeo.rotateZ(Math.PI * 0.5);
    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    const rimBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.248, 0.248, width + 0.014, 20),
      alloyMat
    );
    rimBarrel.rotation.z = Math.PI * 0.5;
    wheelGroup.add(rimBarrel);

    const innerHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.215, 0.215, width + 0.02, 18),
      trimCarbonMat
    );
    innerHub.rotation.z = Math.PI * 0.5;
    wheelGroup.add(innerHub);

    const faceX = isRight ? width * 0.5 + 0.008 : -width * 0.5 - 0.008;
    for (let s = 0; s < 5; s++) {
      const ang = (s / 5) * Math.PI * 2;
      for (const offset of [-0.14, 0.14]) {
        const a = ang + offset;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.215, 0.028), alloyMat);
        spoke.position.set(faceX, Math.cos(a) * 0.115, Math.sin(a) * 0.115);
        spoke.rotation.x = a;
        wheelGroup.add(spoke);
      }
    }

    // Machined metallic vented brake rotor behind the spokes!
    const brakeRotor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.195, 0.195, 0.028, 20),
      chromeMat
    );
    brakeRotor.rotation.z = Math.PI * 0.5;
    brakeRotor.position.x = isRight ? 0.055 : -0.055;
    wheelGroup.add(brakeRotor);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 12), chromeMat);
    cap.rotation.z = Math.PI * 0.5;
    cap.position.x = faceX;
    wheelGroup.add(cap);

    return wheelGroup;
  };

  const frontLeftPivot = new THREE.Group();
  frontLeftPivot.position.set(-0.9, 0.36, -1.42);
  const flWheel = createWheel(false);
  frontLeftPivot.add(flWheel);
  const flCal = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.1), caliperMat);
  flCal.position.set(0.05, 0.06, 0.12);
  frontLeftPivot.add(flCal);
  root.add(frontLeftPivot);

  const frontRightPivot = new THREE.Group();
  frontRightPivot.position.set(0.9, 0.36, -1.42);
  const frWheel = createWheel(true);
  frontRightPivot.add(frWheel);
  const frCal = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.1), caliperMat);
  frCal.position.set(-0.05, 0.06, 0.12);
  frontRightPivot.add(frCal);
  root.add(frontRightPivot);

  const rearLeftWheel = createWheel(false);
  rearLeftWheel.position.set(-0.9, 0.36, 1.38);
  root.add(rearLeftWheel);

  const rearRightWheel = createWheel(true);
  rearRightWheel.position.set(0.9, 0.36, 1.38);
  root.add(rearRightWheel);

  wheels.push(flWheel, frWheel, rearLeftWheel, rearRightWheel);

  // Soft Grounded Contact Shadow Plane beneath car
  const shadowGeo = new THREE.PlaneGeometry(2.8, 5.5);
  shadowGeo.rotateX(-Math.PI * 0.5);
  const shadowMesh = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
  );
  shadowMesh.position.y = 0.055;
  root.add(shadowMesh);

  // =========================================================================
  // 8. PHOTOREALISTIC WIDE, SOFT-PENUMBRA HEADLIGHTS + FEATHERED VOLUMETRIC MIST
  //    (Zero harsh polygonal cones! Wide road throw + faint reflections on cars & buildings!)
  // =========================================================================
  const headlightSpots: THREE.SpotLight[] = [];
  const headlightCones: THREE.Mesh[] = [];

  // Open cylinder/cone frustum rendered with Fresnel edge dissolution + smooth axial fade (ZERO hard edges!)
  const coneGeo = new THREE.CylinderGeometry(0.18, 6.2, 26, 28, 12, true);
  coneGeo.translate(0, -13, 0);
  coneGeo.rotateX(Math.PI * 0.5);

  const coneMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#dceaff') },
      uOpacity: { value: 0.055 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vNormalView = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        // vUv.y = 1.0 at lens, 0.0 at far tip
        float distT = 1.0 - vUv.y;
        // Soft entrance fade right off the headlamp lens & long silky exponential far falloff
        float nearFade = smoothstep(0.0, 0.12, distT);
        float farFade = pow(clamp(1.0 - distT, 0.0, 1.0), 2.15);
        // Fresnel edge dissolution eliminates ALL harsh cone borders from every camera angle!
        float ndotv = abs(dot(normalize(vNormalView), normalize(vViewPos)));
        float edgeSoft = pow(ndotv, 2.65);
        float alpha = nearFade * farFade * edgeSoft * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  // Wide low-intensity forward bounce light so headlights cast faint, natural reflections on our hood,
  // oncoming cars, wet road spray, and nearby building facades!
  const forwardBounceLight = new THREE.PointLight('#d8e8ff', 6.5, 34, 1.45);
  forwardBounceLight.position.set(0, 1.05, -4.6);
  bodyTilt.add(forwardBounceLight);

  for (const sx of [-1, 1]) {
    const spot = new THREE.SpotLight(
      new THREE.Color('#f2f6ff'),
      46,
      150,
      Math.PI * 0.36, // wide photorealistic multi-lane beam spread!
      0.96,           // ultra-soft feathered penumbra edge (no harsh spotlight circle!)
      1.38
    );
    spot.position.set(sx * 0.72, 0.72, -2.38);
    const target = new THREE.Object3D();
    target.position.set(sx * 3.1, -0.35, -38);
    bodyTilt.add(target);
    spot.target = target;
    spot.castShadow = !isSoftwareGl && sx === -1;
    if (spot.castShadow) {
      spot.shadow.mapSize.set(512, 512);
      spot.shadow.camera.near = 1.0;
      spot.shadow.camera.far = 95;
      spot.shadow.bias = -0.0008;
    }
    bodyTilt.add(spot);
    headlightSpots.push(spot);

    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(sx * 0.72, 0.68, -2.4);
    cone.rotation.x = -0.025;
    cone.rotation.y = sx * -0.06; // slightly splayed outward for wide atmospheric mist throw
    bodyTilt.add(cone);
    headlightCones.push(cone);
  }

  // Photorealistic wet-asphalt crimson taillight reflection spill (subtle running glow, swells dynamically on braking!)
  const taillightGlow = new THREE.PointLight('#ff1e18', 1.35, 11.5, 1.85);
  taillightGlow.position.set(0, 0.72, 2.85);
  bodyTilt.add(taillightGlow);

  let activeHeadlightMode: HeadlightMode = 'low';
  let baseSpotIntensity = 46;
  let baseEmissiveIntensity = 2.2;

  // =========================================================================
  // DYNAMIC CONTROL & DAMAGE VISUALS METHODS
  // =========================================================================
  const setHeadlightMode = (mode: HeadlightMode) => {
    activeHeadlightMode = mode;
    if (mode === 'off') {
      baseSpotIntensity = 0;
      baseEmissiveIntensity = 0.08;
      headlightSpots.forEach((s) => (s.intensity = 0));
      headlightCones.forEach((c) => (c.visible = false));
      forwardBounceLight.intensity = 0;
      headlightEmissiveMat.emissiveIntensity = 0.08;
      leftHeadlightMat.emissiveIntensity = 0.08;
      fogLightEmissiveMat.emissiveIntensity = 0.05;
    } else if (mode === 'low') {
      baseSpotIntensity = 46;
      baseEmissiveIntensity = 2.2;
      headlightSpots.forEach((s, idx) => {
        s.intensity = 46;
        s.distance = 148;
        s.angle = Math.PI * 0.36;
        s.penumbra = 0.96;
        s.target.position.set((idx === 0 ? -1 : 1) * 3.1, -0.42, -38);
      });
      coneMat.uniforms.uOpacity.value = 0.048;
      headlightCones.forEach((c) => {
        c.visible = true;
        c.scale.set(1.0, 0.78, 0.92);
      });
      forwardBounceLight.intensity = 6.2;
      forwardBounceLight.distance = 34;
      headlightEmissiveMat.emissiveIntensity = 2.2;
      leftHeadlightMat.emissiveIntensity = 2.2;
      fogLightEmissiveMat.emissiveIntensity = 1.45;
    } else {
      baseSpotIntensity = 78;
      baseEmissiveIntensity = 2.9;
      headlightSpots.forEach((s, idx) => {
        s.intensity = 78;
        s.distance = 215;
        s.angle = Math.PI * 0.43;
        s.penumbra = 0.97;
        s.target.position.set((idx === 0 ? -1 : 1) * 3.8, 0.35, -48);
      });
      coneMat.uniforms.uOpacity.value = 0.068;
      headlightCones.forEach((c) => {
        c.visible = true;
        c.scale.set(1.28, 1.0, 1.32);
      });
      forwardBounceLight.intensity = 10.5;
      forwardBounceLight.distance = 48;
      headlightEmissiveMat.emissiveIntensity = 2.9;
      leftHeadlightMat.emissiveIntensity = 2.9;
      fogLightEmissiveMat.emissiveIntensity = 2.0;
    }
  };

  const setBrakeReverse = (braking: boolean, reversing: boolean) => {
    brakeLightMat.emissiveIntensity = braking ? 3.2 : 1.35;
    tailHaloMat.uniforms.uIntensity.value = braking ? 0.62 : 0.28;
    taillightGlow.intensity = braking ? 4.4 : 1.35;
    taillightGlow.distance = braking ? 16.5 : 11.0;
    reverseLightMat.emissiveIntensity = reversing ? 2.1 : 0.0;
  };

  const applyDamageVisuals = (
    front: number,
    rear: number,
    left: number,
    right: number,
    health: number,
    elapsed: number,
    dt: number
  ) => {
    const wear = 1 - Math.max(0, Math.min(1, health / 100));

    // Scuff & dull paint slightly as body takes hits
    paintMat.color.copy(basePaintColor).lerp(damagedPaintColor, wear * 0.65);
    paintMat.roughness = 0.16 + wear * 0.30;
    paintMat.clearcoat = 1.0 - wear * 0.45;

    // Front impact bends hood up/crooked & drops front aero splitter!
    hoodGroup.position.y = 0.91 + front * 0.095;
    hoodGroup.rotation.x = 0.06 - front * 0.14;
    hoodGroup.rotation.z = (right - left) * 0.065;
    frontSplitter.position.y = 0.27 - front * 0.055;
    frontSplitter.rotation.z = front * 0.075 * (left >= right ? 1 : -1);

    // Rear impact tilts rear aero wing & diffuser!
    spoilerGroup.rotation.z = rear * 0.13;
    spoilerGroup.rotation.x = rear * 0.12;
    rearDiffuserGroup.position.y = 0.36 - rear * 0.05;
    rearDiffuserGroup.rotation.z = -rear * 0.06;

    // Side hits tilt side skirts & mirrors subtly
    for (let i = 0; i < leftSideParts.length; i++) {
      leftSideParts[i].rotation.z = left * 0.22;
    }
    for (let i = 0; i < rightSideParts.length; i++) {
      rightSideParts[i].rotation.z = -right * 0.22;
    }

    // Heavy front impact flickers or breaks the left headlight!
    if (activeHeadlightMode !== 'off' && front > 0.42) {
      const flicker =
        front > 0.8
          ? 0.05
          : Math.sin(elapsed * 29.0) * Math.sin(elapsed * 13.7) > 0.15
          ? 1.0
          : 0.08;
      headlightSpots[0].intensity = baseSpotIntensity * flicker;
      leftHeadlightMat.emissiveIntensity = baseEmissiveIntensity * flicker;
    } else if (activeHeadlightMode !== 'off') {
      headlightSpots[0].intensity = baseSpotIntensity;
      leftHeadlightMat.emissiveIntensity = baseEmissiveIntensity;
    }

    // Rising hood engine steam / smoke wisps when damaged below 55% health
    const smokeIntensity = Math.max(0, (55 - health) / 55);
    const showSmoke = smokeIntensity > 0.02;
    for (let i = 0; i < smokeCount; i++) {
      const sp = smokeSprites[i];
      if (!showSmoke) {
        sp.visible = false;
        continue;
      }
      sp.visible = true;
      smokePhases[i] = (smokePhases[i] + dt * (0.55 + smokeIntensity * 0.65)) % 1;
      const t = smokePhases[i];
      const sway = Math.sin(elapsed * 3.2 + i * 1.9) * 0.22 * t;
      sp.position.set(
        ((i % 5) - 2) * 0.14 + sway,
        0.98 + t * (0.95 + smokeIntensity * 0.65),
        -1.62 + t * 0.65
      );
      const sz = 0.28 + t * (0.72 + smokeIntensity * 0.45);
      sp.scale.set(sz, sz, 1);
      const mat = sp.material as THREE.SpriteMaterial;
      mat.opacity = Math.sin(t * Math.PI) * (0.18 + smokeIntensity * 0.28);
      mat.color.setHex(health < 25 ? 0x3b4048 : 0x9aa8b8);
    }
  };

  const updateVisuals = (
    steerAngle: number,
    wheelSpinDelta: number,
    pitch: number,
    roll: number,
    heave: number,
    elapsedTime: number,
    forwardSpeed = 0,
    lateralAccel = 0
  ) => {
    frontLeftPivot.rotation.y = steerAngle;
    frontRightPivot.rotation.y = steerAngle;
    for (let i = 0; i < wheels.length; i++) {
      wheels[i].rotation.x -= wheelSpinDelta;
    }
    bodyTilt.rotation.x = pitch;
    bodyTilt.rotation.z = roll;
    bodyTilt.position.y = heave;

    // Occasional gentle sprinkle of tiny raindrops landing on hood/roof/deck (no dripping streaks!)
    for (let i = 0; i < sprinkleCount; i++) {
      const sl = sprinkleSlots[i];
      const cyc = ((elapsedTime + sl.phase) % sl.period) / sl.period;
      // Only visible for a brief soft pulse (~26% of cycle) so it feels genuinely occasional!
      if (cyc < 0.26) {
        const u = cyc / 0.26;
        const sc = Math.sin(u * Math.PI) * (0.65 + u * 0.85);
        sprinkleDummy.position.set(sl.x, sl.y, sl.z);
        sprinkleDummy.rotation.set(sl.tiltX, i * 1.1, 0);
        sprinkleDummy.scale.set(sc, 1, sc);
      } else {
        sprinkleDummy.position.set(0, -10, 0);
        sprinkleDummy.scale.set(0.001, 0.001, 0.001);
      }
      sprinkleDummy.updateMatrix();
      sprinkleInst.setMatrixAt(i, sprinkleDummy.matrix);
    }
    sprinkleInst.instanceMatrix.needsUpdate = true;
    void forwardSpeed;
    void lateralAccel;

    const sweep = (Math.sin(elapsedTime * 3.2) * 0.5 + 0.5) * 1.05;
    wipers[0].rotation.z = sweep;
    wipers[1].rotation.z = sweep;
  };

  const setDynamicEnvMap = (envTex: THREE.Texture) => {
    paintMat.envMap = envTex;
    glassMat.envMap = envTex;
    chromeMat.envMap = envTex;
    paintMat.needsUpdate = true;
    glassMat.needsUpdate = true;
    chromeMat.needsUpdate = true;
  };

  setHeadlightMode('low');

  return {
    root,
    bodyTilt,
    frontLeftPivot,
    frontRightPivot,
    wheels,
    wipers,
    headlightSpots,
    headlightCones,
    headlightEmissiveMat,
    fogLightEmissiveMat,
    brakeLightMat,
    reverseLightMat,
    taillightGlow,
    setHeadlightMode,
    setBrakeReverse,
    setDynamicEnvMap,
    applyDamageVisuals,
    updateVisuals,
  };
}
