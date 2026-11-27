import * as THREE from 'three';

// =============================================================================
// AD ASSETS — lottydarko's finalized ad art (Nov 26, 2026), patched in.
// Stills live under public/assets/ads/ (billboards wired into the city
// billboard rotation below; posters/strips/facades/packaging are staged
// in the same folder tree for their surface passes).
// =============================================================================

export const AD_BILLBOARD_FILES: string[] = [
  'bb01_chyorny_kamen.webp',
  'bb02_oko_palantir.webp',
  'bb04_nedra_energo.webp',
  'bb05_radio_kaluga.webp',
  'bb07_zolotoy_bunker.webp',
  'bb08_sputnik_kredit.webp',
  'bb09_volga_bauhaus.webp',
  'bb11_giant_license.webp',
  'bb17_smoke_and_sin.webp',
  'bb25_vektor_neurochip.webp',
  'bb26_shyopot_selfie.webp',
  'bb27_shyopot_friends.webp',
  'bb28_shyopot_shhh.webp',
  'bb29_vektor_70s.webp',
  'bb30_nebo_tranzit_70s.webp',
  'bb30_nebo_tranzit_70s_wide.webp',
  'bb31_volga_70s.webp',
  'bb31_volga_70s_wide.webp',
  'bb32_radio_kaluga_70s.webp',
  'bb33_oko_70s.webp',
  'bb33_oko_70s_wide.webp',
  'bb34_shyopot_70s.webp',
  'bb34_shyopot_70s_wide.webp',
  'bb35_vektor_70s_photoreal.webp',
  'bb36_radio_70s_photoreal.webp',
  'bb37_oko_70s_photoreal.webp',
  'bb38_chyorny_70s_photoreal.webp',
  'bb39_siluet_fashion_wide.webp',
  'bb40_volna_soda.webp',
  'bb41_meteor_cola.webp',
  'bb42_siluet_heels_abstract.webp',
  'bb46_oldport_billboard.webp',
  'cornhub02_billboard.webp',
  'simps02_billboard.webp',
];

export function createAdBillboardMaterials(): THREE.MeshStandardMaterial[] {
  const loader = new THREE.TextureLoader();
  return AD_BILLBOARD_FILES.map((f) => {
    const tex = loader.load(`/assets/ads/billboards/${f}`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return new THREE.MeshStandardMaterial({
      map: tex,
      emissive: new THREE.Color('#ffffff'),
      emissiveMap: tex,
      emissiveIntensity: 0.55,
      roughness: 0.6,
      metalness: 0.0,
    });
  });
}
