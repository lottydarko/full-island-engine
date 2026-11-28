import * as THREE from 'three';

export interface GunMetalEnhanceOptions {
  edgeWear?: number;
  cavityDepth?: number;
  sheenColor?: number;
  sheenStrength?: number;
}

/**
 * Enhances gunmetal PBR materials with crisp grazing Fresnel edge-wear highlights
 * and subtle cavity grounding while keeping Three.js r187 shader compilation stable.
 */
export function enhanceGunMetalMaterial<T extends THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial>(
  material: T,
  opts: GunMetalEnhanceOptions = {},
): T {
  const edgeWear = opts.edgeWear ?? 0.42;
  const sheenColor = new THREE.Color(opts.sheenColor ?? 0x9ab2cc);
  const sheenStrength = opts.sheenStrength ?? 0.2;

  if (material instanceof THREE.MeshPhysicalMaterial) {
    material.sheen = Math.max(material.sheen, sheenStrength);
    material.sheenColor.copy(sheenColor);
    material.sheenRoughness = Math.min(0.6, Math.max(0.22, material.roughness + 0.1));
  }

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGunEdgeWear = { value: edgeWear };
    shader.uniforms.uGunEdgeTint = { value: sheenColor };
    shader.fragmentShader =
      `uniform float uGunEdgeWear;\nuniform vec3 uGunEdgeTint;\n` +
      shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        vec3 gunViewDir = normalize(vViewPosition);
        float gunRim = pow(1.0 - clamp(abs(dot(normalize(normal), gunViewDir)), 0.0, 1.0), 3.2);
        gl_FragColor.rgb += uGunEdgeTint * (gunRim * uGunEdgeWear * 0.11);
        #include <dithering_fragment>
        `,
      );
  };
  material.customProgramCacheKey = () =>
    `gun_metal_${edgeWear.toFixed(2)}_${sheenColor.getHexString()}`;

  return material;
}

export function enhanceGunWoodMaterial<T extends THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial>(
  material: T,
  strength = 0.22,
): T {
  if (material instanceof THREE.MeshPhysicalMaterial) {
    material.clearcoat = Math.max(material.clearcoat, Math.min(0.45, strength + 0.14));
  }
  return material;
}
