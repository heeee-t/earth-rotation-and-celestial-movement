import * as THREE from 'three';

/**
 * Procedurally generates an Earth texture with continents, oceans, latitude/longitude grids,
 * and highlights for Korea (37°N) and the Equator.
 * 100% self-contained without external image dependencies.
 */
export function createProceduralEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep Ocean Background with gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGrad.addColorStop(0, '#0f2952');
  oceanGrad.addColorStop(0.3, '#143c72');
  oceanGrad.addColorStop(0.5, '#19498a');
  oceanGrad.addColorStop(0.7, '#143c72');
  oceanGrad.addColorStop(1, '#0f2952');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Helper coordinate converter: lon [-180, 180], lat [-90, 90] to canvas x, y
  const toXY = (lon: number, lat: number): [number, number] => {
    const x = ((lon + 180) / 360) * canvas.width;
    const y = ((90 - lat) / 180) * canvas.height;
    return [x, y];
  };

  // 2. Draw Continents (Simplified recognizable landmasses)
  ctx.fillStyle = '#2d6a4f';
  ctx.strokeStyle = '#40916c';
  ctx.lineWidth = 2;

  const drawLand = (coords: [number, number][]) => {
    ctx.beginPath();
    const [startX, startY] = toXY(coords[0][0], coords[0][1]);
    ctx.moveTo(startX, startY);
    for (let i = 1; i < coords.length; i++) {
      const [px, py] = toXY(coords[i][0], coords[i][1]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // Eurasia (Europe + Asia)
  drawLand([
    [-10, 36], [0, 42], [10, 54], [25, 70], [60, 72], [100, 76], [140, 72], [170, 65],
    [160, 55], [140, 50], [130, 42], [125, 38], [120, 30], [110, 20], [100, 10], [80, 10],
    [70, 22], [50, 25], [40, 30], [30, 35], [20, 38], [0, 36], [-10, 36]
  ]);

  // Korean Peninsula & East Asia detail
  ctx.fillStyle = '#38b000';
  drawLand([
    [124, 40], [128, 43], [131, 42], [129, 38], [129, 35], [126, 34], [125, 37], [124, 40]
  ]);

  // Japan
  drawLand([
    [130, 32], [135, 35], [140, 37], [142, 44], [140, 45], [136, 40], [132, 34], [130, 32]
  ]);

  // Africa
  ctx.fillStyle = '#2d6a4f';
  drawLand([
    [-17, 15], [-5, 36], [10, 37], [32, 31], [45, 12], [51, 10], [40, -10],
    [30, -32], [20, -35], [18, -34], [12, -15], [9, 4], [-10, 5], [-17, 15]
  ]);

  // North America
  drawLand([
    [-168, 65], [-140, 70], [-100, 74], [-80, 70], [-60, 60], [-65, 45], [-75, 35],
    [-80, 25], [-97, 26], [-105, 20], [-90, 15], [-80, 8], [-95, 16], [-105, 22],
    [-115, 30], [-125, 48], [-140, 58], [-165, 60], [-168, 65]
  ]);

  // South America
  drawLand([
    [-80, 8], [-60, 10], [-50, 0], [-35, -5], [-35, -10], [-40, -22], [-50, -35],
    [-65, -55], [-75, -50], [-70, -30], [-75, -15], [-80, -2], [-80, 8]
  ]);

  // Australia
  drawLand([
    [114, -22], [120, -14], [135, -12], [145, -15], [152, -28], [150, -37],
    [140, -38], [130, -32], [115, -34], [114, -22]
  ]);

  // Antarctica (Bottom white strip)
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, canvas.height * 0.9, canvas.width, canvas.height * 0.1);

  // 3. Grid lines (Latitude & Longitude)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  // Latitudes every 30 degrees
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = toXY(0, lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  // Longitudes every 30 degrees
  for (let lon = -180; lon < 180; lon += 30) {
    const [x] = toXY(lon, 0);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // 4. Highlight Equator (0°)
  const [, eqY] = toXY(0, 0);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.moveTo(0, eqY);
  ctx.lineTo(canvas.width, eqY);
  ctx.stroke();

  // 5. Highlight Korea Latitude (37°N)
  const [, korY] = toXY(0, 37);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, korY);
  ctx.lineTo(canvas.width, korY);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // Korea location beacon
  const [korX] = toXY(127, 37);
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(korX, korY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Creates radial star/flare sprite texture
 */
export function createStarSpriteTexture(color: string = '#ffffff'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const center = 64;

  const grad = ctx.createRadialGradient(center, center, 0, center, center, 60);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.2, color);
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  // Soft 4-point diffraction spike
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(center, 10);
  ctx.lineTo(center, 118);
  ctx.moveTo(10, center);
  ctx.lineTo(118, center);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Creates radiant Sun glow sprite texture
 */
export function createSunTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);
  const center = 128;

  const grad = ctx.createRadialGradient(center, center, 0, center, center, 120);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.2, '#fef08a');
  grad.addColorStop(0.4, '#f59e0b');
  grad.addColorStop(0.7, '#ea580c');
  grad.addColorStop(1, 'rgba(234, 88, 12, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Creates Ground Compass Rose Texture for observer view
 */
export function createGroundCompassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const center = 512;
  const radius = 480;

  // Ground base gradient
  const bgGrad = ctx.createRadialGradient(center, center, 50, center, center, radius);
  bgGrad.addColorStop(0, '#111827');
  bgGrad.addColorStop(0.7, '#0f172a');
  bgGrad.addColorStop(1, '#030712');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();

  // Outer border
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Concentric distance rings
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
  ctx.lineWidth = 2;
  [120, 240, 360].forEach((r) => {
    ctx.beginPath();
    ctx.arc(center, center, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Cross lines (N-S, E-W)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(center, 40);
  ctx.lineTo(center, 984);
  ctx.moveTo(40, center);
  ctx.lineTo(984, center);
  ctx.stroke();

  // Tick marks every 15 degrees
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const innerR = deg % 45 === 0 ? radius - 30 : radius - 15;
    const x1 = center + Math.sin(rad) * innerR;
    const y1 = center - Math.cos(rad) * innerR;
    const x2 = center + Math.sin(rad) * radius;
    const y2 = center - Math.cos(rad) * radius;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Cardinal direction labels on the ground
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#ef4444'; // North red highlight
  ctx.fillText('북', center, 90);

  ctx.fillStyle = '#38bdf8';
  ctx.fillText('남', center, 934);

  ctx.fillStyle = '#f59e0b';
  ctx.fillText('동', 934, center);

  ctx.fillStyle = '#10b981';
  ctx.fillText('서', 90, center);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
