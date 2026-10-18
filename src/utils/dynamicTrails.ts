import * as THREE from 'three';

export interface TrailStar {
  raHours: number;
  decDeg: number;
  color: string;
  isSun?: boolean;
  isPolaris?: boolean;
}

export interface DynamicTrailSystem {
  mesh: THREE.LineSegments;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  posAttr: THREE.BufferAttribute;
  colorAttr: THREE.BufferAttribute;
  update: (trailDurationHours: number) => void;
  clear: () => void;
  dispose: () => void;
}

/**
 * Creates a high-performance dynamic star trail system.
 * - Single BufferGeometry and LineSegments per scene (minimizing draw calls to 1).
 * - Dynamic trailing tail following stars/sun during diurnal rotation.
 * - Long-exposure effect: exactly 1.5 hours (22.5 degrees) max trail length.
 * - Vertex alpha gradient: 100% opaque at head, smoothly fading out to 0% at tail.
 * - Fast CPU-to-GPU buffer update when trails are active; instant buffer clear on toggle off.
 */
export function createDynamicTrailSystem(
  stars: TrailStar[],
  radius: number,
  segmentsPerStar: number = 16
): DynamicTrailSystem {
  const totalStars = stars.length;
  const totalSegments = totalStars * segmentsPerStar;
  const totalVertices = totalSegments * 2;

  const positions = new Float32Array(totalVertices * 3);
  const colors = new Float32Array(totalVertices * 4); // RGBA

  // 1. Initialize vertex colors with smooth alpha gradient
  let colIdx = 0;
  for (let s = 0; s < totalStars; s++) {
    const star = stars[s];
    let r: number, g: number, b: number;
    if (star.isSun) {
      r = 1.0;
      g = 0.85;
      b = 0.25;
    } else if (star.isPolaris) {
      r = 1.0;
      g = 0.95;
      b = 0.55;
    } else {
      const c = new THREE.Color(star.color);
      r = c.r;
      g = c.g;
      b = c.b;
    }

    for (let k = 0; k < segmentsPerStar; k++) {
      const t1 = k / segmentsPerStar;
      const t2 = (k + 1) / segmentsPerStar;

      // Non-linear fade-out: starts fully bright (1.0), softly fades to 0.0
      const a1 = Math.pow(Math.max(0, 1.0 - t1), 1.25);
      const a2 = Math.pow(Math.max(0, 1.0 - t2), 1.25);

      // Vertex 1
      colors[colIdx++] = r;
      colors[colIdx++] = g;
      colors[colIdx++] = b;
      colors[colIdx++] = a1;

      // Vertex 2
      colors[colIdx++] = r;
      colors[colIdx++] = g;
      colors[colIdx++] = b;
      colors[colIdx++] = a2;
    }
  }

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  const colorAttr = new THREE.BufferAttribute(colors, 4);

  geometry.setAttribute('position', posAttr);
  geometry.setAttribute('aColor', colorAttr);

  const material = new THREE.ShaderMaterial({
    vertexShader: `
      attribute vec4 aColor;
      varying vec4 vColor;
      void main() {
        vColor = aColor;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec4 vColor;
      void main() {
        gl_FragColor = vColor;
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.LineSegments(geometry, material);
  mesh.renderOrder = 3;

  function update(trailDurationHours: number) {
    const maxHours = 1.5;
    const clampedHours = Math.max(0, Math.min(maxHours, trailDurationHours));
    // 1.5 hours corresponds to 22.5 degrees = PI / 8 radians
    const trailAngleRad = (clampedHours / 24) * Math.PI * 2;

    let posIdx = 0;
    for (let s = 0; s < totalStars; s++) {
      const star = stars[s];
      const raRad = (star.raHours / 24) * Math.PI * 2;
      const decRad = THREE.MathUtils.degToRad(star.decDeg);
      const cosDec = Math.cos(decRad);
      const sinDec = Math.sin(decRad);
      const rCircle = radius * cosDec;
      const yVal = radius * sinDec;

      for (let k = 0; k < segmentsPerStar; k++) {
        const t1 = k / segmentsPerStar;
        const t2 = (k + 1) / segmentsPerStar;

        // Tail stretches in the positive angle direction relative to the rotating frame
        const angle1 = raRad + t1 * trailAngleRad;
        const angle2 = raRad + t2 * trailAngleRad;

        // Vertex 1
        positions[posIdx++] = rCircle * Math.sin(angle1);
        positions[posIdx++] = yVal;
        positions[posIdx++] = rCircle * Math.cos(angle1);

        // Vertex 2
        positions[posIdx++] = rCircle * Math.sin(angle2);
        positions[posIdx++] = yVal;
        positions[posIdx++] = rCircle * Math.cos(angle2);
      }
    }

    posAttr.needsUpdate = true;
    geometry.setDrawRange(0, totalVertices);
    mesh.visible = true;
  }

  function clear() {
    positions.fill(0);
    posAttr.needsUpdate = true;
    geometry.setDrawRange(0, 0);
    mesh.visible = false;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  // Initial population
  update(1.5);

  return {
    mesh,
    geometry,
    material,
    posAttr,
    colorAttr,
    update,
    clear,
    dispose,
  };
}
