import * as THREE from 'three';

export const KOREA_LATITUDE_DEG = 37.0;
export const KOREA_LATITUDE_RAD = THREE.MathUtils.degToRad(KOREA_LATITUDE_DEG);

export interface CelestialObject {
  id: string;
  name: string;
  koreanName: string;
  raHours: number;      // Right Ascension in hours (0 - 24)
  decDeg: number;       // Declination in degrees (-90 to +90)
  magnitude: number;    // Apparent magnitude (smaller = brighter)
  color: string;
  size: number;
  isPolaris?: boolean;
  isSun?: boolean;
}

export interface ConstellationLine {
  star1: string;
  star2: string;
}

// Key stars including Big Dipper (북두칠성), Cassiopeia (카시오페이아), Orion (오리온), Vega, Altair, Deneb
export const STAR_CATALOG: CelestialObject[] = [
  // 1. Polaris (북극성) - exactly at celestial north pole
  {
    id: 'polaris',
    name: 'Polaris',
    koreanName: '북극성',
    raHours: 2.5,
    decDeg: 89.3, // Very close to 90
    magnitude: 1.98,
    color: '#fef08a',
    size: 2.5,
    isPolaris: true,
  },

  // 2. Big Dipper (북두칠성 - 큰곰자리 꼬리) - Circumpolar in Korea
  { id: 'dubhe', name: 'Dubhe', koreanName: '두베', raHours: 11.06, decDeg: 61.75, magnitude: 1.8, color: '#fed7aa', size: 1.8 },
  { id: 'merak', name: 'Merak', koreanName: '메라크', raHours: 11.03, decDeg: 56.38, magnitude: 2.3, color: '#ffffff', size: 1.6 },
  { id: 'phecda', name: 'Phecda', koreanName: '페크다', raHours: 11.9, decDeg: 53.69, magnitude: 2.4, color: '#ffffff', size: 1.5 },
  { id: 'megrez', name: 'Megrez', koreanName: '메그레즈', raHours: 12.25, decDeg: 57.03, magnitude: 3.3, color: '#e2e8f0', size: 1.4 },
  { id: 'alioth', name: 'Alioth', koreanName: '알리오스', raHours: 12.9, decDeg: 55.96, magnitude: 1.76, color: '#ffffff', size: 1.8 },
  { id: 'mizar', name: 'Mizar', koreanName: '미자르', raHours: 13.4, decDeg: 54.92, magnitude: 2.2, color: '#ffffff', size: 1.6 },
  { id: 'alkaid', name: 'Alkaid', koreanName: '알카이드', raHours: 13.8, decDeg: 49.31, magnitude: 1.85, color: '#bfdbfe', size: 1.8 },

  // 3. Cassiopeia (카시오페이아자리 W 모양) - Opposite to Big Dipper across Polaris
  { id: 'schedar', name: 'Schedar', koreanName: '셰다르', raHours: 0.67, decDeg: 56.54, magnitude: 2.2, color: '#fed7aa', size: 1.6 },
  { id: 'caph', name: 'Caph', koreanName: '카프', raHours: 0.15, decDeg: 59.15, magnitude: 2.28, color: '#f8fafc', size: 1.6 },
  { id: 'gamma_cas', name: 'Navi', koreanName: '감마 카시오페이아', raHours: 0.94, decDeg: 60.72, magnitude: 2.15, color: '#bfdbfe', size: 1.6 },
  { id: 'ruchbah', name: 'Ruchbah', koreanName: '루크바', raHours: 1.43, decDeg: 60.23, magnitude: 2.68, color: '#f8fafc', size: 1.5 },
  { id: 'segin', name: 'Segin', koreanName: '세긴', raHours: 1.9, decDeg: 63.67, magnitude: 3.35, color: '#bfdbfe', size: 1.4 },

  // 4. Summer Triangle (여름철 대삼각형)
  { id: 'vega', name: 'Vega', koreanName: '직녀성(베가)', raHours: 18.62, decDeg: 38.78, magnitude: 0.03, color: '#dbeafe', size: 2.2 },
  { id: 'altair', name: 'Altair', koreanName: '견우성(알타이르)', raHours: 19.84, decDeg: 8.87, magnitude: 0.77, color: '#ffffff', size: 2.0 },
  { id: 'deneb', name: 'Deneb', koreanName: '데네브', raHours: 20.69, decDeg: 45.28, magnitude: 1.25, color: '#e0f2fe', size: 2.0 },

  // 5. Orion (오리온자리 - 겨울철 대표 별자리)
  { id: 'betelgeuse', name: 'Betelgeuse', koreanName: '베텔게우스', raHours: 5.92, decDeg: 7.41, magnitude: 0.5, color: '#f87171', size: 2.2 },
  { id: 'rigel', name: 'Rigel', koreanName: '리겔', raHours: 5.24, decDeg: -8.2, magnitude: 0.12, color: '#93c5fd', size: 2.2 },
  { id: 'bellatrix', name: 'Bellatrix', koreanName: '벨라트릭스', raHours: 5.42, decDeg: 6.35, magnitude: 1.64, color: '#bfdbfe', size: 1.7 },
  { id: 'saiph', name: 'Saiph', koreanName: '사이프', raHours: 5.79, decDeg: -9.67, magnitude: 2.07, color: '#bfdbfe', size: 1.6 },
  { id: 'alnitak', name: 'Alnitak', koreanName: '알니탁', raHours: 5.68, decDeg: -1.94, magnitude: 1.77, color: '#bfdbfe', size: 1.6 },
  { id: 'alnilam', name: 'Alnilam', koreanName: '알닐람', raHours: 5.6, decDeg: -1.2, magnitude: 1.69, color: '#bfdbfe', size: 1.6 },
  { id: 'mintaka', name: 'Mintaka', koreanName: '민타카', raHours: 5.53, decDeg: -0.3, magnitude: 2.23, color: '#bfdbfe', size: 1.5 },

  // 6. Sirius (시리우스) & Arcturus (아크투루스)
  { id: 'sirius', name: 'Sirius', koreanName: '시리우스', raHours: 6.75, decDeg: -16.72, magnitude: -1.46, color: '#60a5fa', size: 2.4 },
  { id: 'arcturus', name: 'Arcturus', koreanName: '아크투루스', raHours: 14.26, decDeg: 19.18, magnitude: -0.05, color: '#fb923c', size: 2.2 },

  // 7. Sun (태양) - placed on celestial sphere at declination +10° (spring/early summer)
  {
    id: 'sun',
    name: 'Sun',
    koreanName: '태양',
    raHours: 3.0,
    decDeg: 12.0,
    magnitude: -26.7,
    color: '#fbbf24',
    size: 4.5,
    isSun: true,
  },
];

// Constellation line connections
export const CONSTELLATION_LINES: ConstellationLine[] = [
  // Big Dipper (북두칠성)
  { star1: 'dubhe', star2: 'merak' },
  { star1: 'merak', star2: 'phecda' },
  { star1: 'phecda', star2: 'megrez' },
  { star1: 'megrez', star2: 'dubhe' },
  { star1: 'megrez', star2: 'alioth' },
  { star1: 'alioth', star2: 'mizar' },
  { star1: 'mizar', star2: 'alkaid' },
  // Pointer line from Dubhe & Merak to Polaris! (교과서 핵심)
  { star1: 'dubhe', star2: 'polaris' },

  // Cassiopeia (카시오페이아 W)
  { star1: 'caph', star2: 'schedar' },
  { star1: 'schedar', star2: 'gamma_cas' },
  { star1: 'gamma_cas', star2: 'ruchbah' },
  { star1: 'ruchbah', star2: 'segin' },

  // Summer Triangle (여름철 대삼각형)
  { star1: 'vega', star2: 'deneb' },
  { star1: 'deneb', star2: 'altair' },
  { star1: 'altair', star2: 'vega' },

  // Orion (오리온)
  { star1: 'betelgeuse', star2: 'bellatrix' },
  { star1: 'bellatrix', star2: 'mintaka' },
  { star1: 'mintaka', star2: 'alnilam' },
  { star1: 'alnilam', star2: 'alnitak' },
  { star1: 'alnitak', star2: 'saiph' },
  { star1: 'saiph', star2: 'rigel' },
  { star1: 'rigel', star2: 'mintaka' },
  { star1: 'betelgeuse', star2: 'alnitak' },
];

/**
 * Generate 250 random background stars across the celestial sphere
 */
export function generateBackgroundStars(count: number = 300): CelestialObject[] {
  const stars: CelestialObject[] = [];
  for (let i = 0; i < count; i++) {
    // Uniform sphere sampling
    const u = Math.random();
    const v = Math.random();
    const raHours = u * 24;
    const decDeg = (Math.asin(2 * v - 1) * 180) / Math.PI;
    const mag = 2.5 + Math.random() * 3.5;
    const size = 0.8 + Math.random() * 0.9;
    stars.push({
      id: `bg_star_${i}`,
      name: `Star ${i}`,
      koreanName: `배경별`,
      raHours,
      decDeg,
      magnitude: mag,
      color: Math.random() > 0.8 ? '#fef08a' : Math.random() > 0.4 ? '#ffffff' : '#bfdbfe',
      size,
    });
  }
  return stars;
}

/**
 * Convert Right Ascension (hours) & Declination (deg) into 3D coordinates on a celestial sphere of given radius.
 * Coordinate convention on celestial sphere:
 * +Y is Celestial North Pole (Dec = +90°)
 * X-Z plane is Celestial Equator (Dec = 0°)
 */
export function celestialToVector3(raHours: number, decDeg: number, radius: number): THREE.Vector3 {
  const raRad = (raHours / 24) * Math.PI * 2;
  const decRad = THREE.MathUtils.degToRad(decDeg);

  const cosDec = Math.cos(decRad);
  const sinDec = Math.sin(decRad);

  const x = radius * cosDec * Math.sin(raRad);
  const y = radius * sinDec;
  const z = radius * cosDec * Math.cos(raRad);

  return new THREE.Vector3(x, y, z);
}

/**
 * Generate a diurnal trail circle geometry for a given declination
 * (A circle parallel to the celestial equator)
 */
export function createDiurnalCircle(decDeg: number, radius: number, segments: number = 64): THREE.BufferGeometry {
  const decRad = THREE.MathUtils.degToRad(decDeg);
  const rCircle = radius * Math.cos(decRad);
  const y = radius * Math.sin(decRad);

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(rCircle * Math.sin(angle), y, rCircle * Math.cos(angle)));
  }

  return new THREE.BufferGeometry().setFromPoints(points);
}

/**
 * 8. 일출 시각(오전 06:03) 및 시간-일주 운동 동기화 상수 & 함수
 * 태양 객체가 동쪽 지평면(고도 0도)을 뚫고 올라오는 순간이 정확히 06:03(6.05h)이 되도록 회전 오프셋 산출
 */
export const SUN_RISE_TIME_HOURS = 6 + 3 / 60; // 06:03 = 6.05h

export function calculateTimeOffsetForSunrise(
  sunRaHours: number = 3.0,
  sunDecDeg: number = 12.0,
  latDeg: number = KOREA_LATITUDE_DEG,
  sunriseTimeHours: number = SUN_RISE_TIME_HOURS
): number {
  const decRad = THREE.MathUtils.degToRad(sunDecDeg);
  const latRad = THREE.MathUtils.degToRad(latDeg);
  const cosLambdaRise = -Math.tan(decRad) * Math.tan(latRad);
  const lambdaRiseRad = Math.acos(cosLambdaRise);
  const lambdaRiseHours = (lambdaRiseRad / (2 * Math.PI)) * 24;
  return sunriseTimeHours + lambdaRiseHours - sunRaHours;
}

export const TIME_OFFSET_HOURS = calculateTimeOffsetForSunrise();

/**
 * 대각선(삼각형 wireframe)이 전혀 없는 순수 가로(위도선, Parallels) 및 세로(경도선, Meridians) 바둑판 격자 생성
 */
export function createCelestialGridGeometry(radius: number): THREE.BufferGeometry {
  const points: number[] = [];

  // 가로 방향 원 (위도선 / Altitude circles): -75° ~ +75° (15° 간격)
  const latSteps = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75];
  const circleSegments = 72;

  for (const latDeg of latSteps) {
    const latRad = THREE.MathUtils.degToRad(latDeg);
    const r = radius * Math.cos(latRad);
    const y = radius * Math.sin(latRad);

    for (let i = 0; i < circleSegments; i++) {
      const a1 = (i / circleSegments) * Math.PI * 2;
      const a2 = ((i + 1) / circleSegments) * Math.PI * 2;

      points.push(r * Math.sin(a1), y, r * Math.cos(a1));
      points.push(r * Math.sin(a2), y, r * Math.cos(a2));
    }
  }

  // 세로 방향 대원 (경도선 / Azimuth meridians): 15° 간격 12개 대원 = 24개 경도선
  const lonCount = 12;
  const meridianSegments = 72;

  for (let m = 0; m < lonCount; m++) {
    const lonAngle = (m / lonCount) * Math.PI;
    const sinLon = Math.sin(lonAngle);
    const cosLon = Math.cos(lonAngle);

    for (let i = 0; i < meridianSegments; i++) {
      const a1 = (i / meridianSegments) * Math.PI * 2;
      const a2 = ((i + 1) / meridianSegments) * Math.PI * 2;

      const x1 = radius * Math.cos(a1) * sinLon;
      const y1 = radius * Math.sin(a1);
      const z1 = radius * Math.cos(a1) * cosLon;

      const x2 = radius * Math.cos(a2) * sinLon;
      const y2 = radius * Math.sin(a2);
      const z2 = radius * Math.cos(a2) * cosLon;

      points.push(x1, y1, z1);
      points.push(x2, y2, z2);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geom;
}
