import { MeshToonMaterial, MeshBasicMaterial, DataTexture, RedFormat, NearestFilter, BackSide, UnsignedByteType } from 'three';

export const U = { uNight: { value: 0 } };
const ramp = new DataTexture(new Uint8Array([150, 186, 226, 255]), 4, 1, RedFormat, UnsignedByteType);
ramp.minFilter = ramp.magFilter = NearestFilter; ramp.needsUpdate = true;

export function toon(opts = {}) {
  const m = new MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: ramp, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = U.uNight;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlow;\nvarying float vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying float vGlow;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vGlow > 0.5) { diffuseColor.rgb = mix(vec3(0.62,0.82,0.92), vec3(1.0,0.8,0.42), uNight); }
        if (vGlow > 1.5) { diffuseColor.rgb = vec3(1.0,0.84,0.5); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += step(0.5, vGlow) * diffuseColor.rgb * (0.10 + uNight * 1.5) + step(1.5, vGlow) * diffuseColor.rgb * 0.25;`);
  };
  m.customProgramCacheKey = () => 'toonglow1';
  return m;
}
export function outline(th = 0.012, color = 0x6a4552) {
  const m = new MeshBasicMaterial({ color, side: BackSide });
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * ' + th.toFixed(4) + ';'); };
  m.customProgramCacheKey = () => 'ol' + th;
  return m;
}
