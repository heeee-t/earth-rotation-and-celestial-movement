import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Play,
  Pause,
  RotateCcw,
  Compass,
  Eye,
  Sparkles,
  BookOpen,
  Download,
  Copy,
  Check,
  Globe,
  Sun,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

import {
  KOREA_LATITUDE_DEG,
  KOREA_LATITUDE_RAD,
  STAR_CATALOG,
  CONSTELLATION_LINES,
  celestialToVector3,
  generateBackgroundStars,
  createCelestialGridGeometry,
  TIME_OFFSET_HOURS,
} from './utils/astronomy';
import {
  createStarSpriteTexture,
  createSunTexture,
  createGroundCompassTexture
} from './utils/proceduralTextures';
import { generateStandaloneHtml } from './utils/standaloneHtmlGenerator';
import {
  createDynamicTrailSystem,
  DynamicTrailSystem,
  TrailStar
} from './utils/dynamicTrails';

type DirectionKey = 'N' | 'E' | 'S' | 'W';

interface DirectionInfo {
  key: DirectionKey;
  label: string;
  engLabel: string;
  yaw: number; // observer yaw (radians)
  description: string;
  spaceCamTarget: { x: number; y: number; z: number };
}

// 대한민국 북위 37° 기준
// 동쪽 선택 = 지면의 서쪽(-X)에서 동쪽(+X)을 바라보는 방향
// 서쪽 선택 = 지면의 동쪽(+X)에서 서쪽(-X)을 바라보는 방향
// 남쪽 선택 = 지면의 북쪽(-Z)에서 남쪽(+Z)을 바라보는 방향
// 북쪽 선택 = 지면의 남쪽(+Z)에서 북쪽(-Z)을 바라보는 방향
const SPACE_CAM_DIST = 14.5;
const SPACE_CAM_HEIGHT = 4.2;

const DIRECTIONS: Record<DirectionKey, DirectionInfo> = {
  E: {
    key: 'E',
    label: '동쪽',
    engLabel: 'E',
    yaw: -Math.PI / 2, // 관측자: 동쪽(+X) 바라봄
    description: '서쪽에서 동쪽을 바라봄<br>별과 태양이 지평선에서 오른쪽 위로 비스듬히 떠오름 (동→서 일주 운동)',
    spaceCamTarget: { x: -SPACE_CAM_DIST, y: SPACE_CAM_HEIGHT, z: 0 }
  },
  S: {
    key: 'S',
    label: '남쪽',
    engLabel: 'S',
    yaw: Math.PI, // 관측자: 남쪽(+Z) 바라봄
    description: '북쪽에서 남쪽을 바라봄<br>별들이 최고 고도(남중 53°)를 거쳐 지평선과 평행하게 오른쪽으로 이동',
    spaceCamTarget: { x: 0, y: SPACE_CAM_HEIGHT, z: -SPACE_CAM_DIST }
  },
  W: {
    key: 'W',
    label: '서쪽',
    engLabel: 'W',
    yaw: Math.PI / 2, // 관측자: 서쪽(-X) 바라봄
    description: '동쪽에서 서쪽을 바라봄<br>별과 태양이 오른쪽 아래로 비스듬히 지평선 아래로 짐',
    spaceCamTarget: { x: SPACE_CAM_DIST, y: SPACE_CAM_HEIGHT, z: 0 }
  },
  N: {
    key: 'N',
    label: '북쪽',
    engLabel: 'N',
    yaw: 0, // 관측자: 북쪽(-Z) 바라봄
    description: '남쪽에서 북쪽을 바라봄<br>북극성(고도 37°)을 중심으로 반시계방향(시계 반대 방향)으로 회전',
    spaceCamTarget: { x: 0, y: SPACE_CAM_HEIGHT, z: SPACE_CAM_DIST }
  }
};

export default function App() {
  const spaceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const obsCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeHours, setTimeHours] = useState<number>(6.05);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [currentDir, setCurrentDir] = useState<DirectionKey>('N');
  const [pitchDeg, setPitchDeg] = useState<number>(25);
  const [showTrails, setShowTrails] = useState<boolean>(true);
  const [showConstellations, setShowConstellations] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);

  // Zoom / FOV constants & helper functions
  const SPACE_MIN_FOV = 20; // 줌 100% (최대 확대 Zoom In)
  const SPACE_MAX_FOV = 75; // 줌 0% (최대 축소 Zoom Out)
  const OBS_MIN_FOV = 30;   // 줌 100% (최대 확대 Zoom In)
  const OBS_MAX_FOV = 90;   // 줌 0% (최대 축소 Zoom Out)

  const zoomToSpaceFov = (z: number) => SPACE_MAX_FOV - (z / 100) * (SPACE_MAX_FOV - SPACE_MIN_FOV);
  const zoomToObsFov = (z: number) => OBS_MAX_FOV - (z / 100) * (OBS_MAX_FOV - OBS_MIN_FOV);

  // Zoom level state (0: 최대 축소 ~ 100: 최대 확대)
  const [spaceZoom, setSpaceZoom] = useState<number>(53);
  const [obsZoom, setObsZoom] = useState<number>(42);

  // Simulation mutable references for 60fps render loop
  const simRef = useRef({
    isPlaying: true,
    timeHours: 6.05,
    speedMultiplier: 1.0,
    targetYaw: 0,
    currentYaw: 0,
    targetPitch: THREE.MathUtils.degToRad(25),
    currentPitch: THREE.MathUtils.degToRad(25),
    spaceCamTargetPos: new THREE.Vector3(0, SPACE_CAM_HEIGHT, SPACE_CAM_DIST),
    spaceDiurnalGroup: null as THREE.Group | null,
    obsDiurnalGroup: null as THREE.Group | null,
    spaceGazeArrow: null as THREE.Mesh | null,
    isTrailsActive: true,
    trailDurationHours: 1.5,
    spaceTrailSystem: null as DynamicTrailSystem | null,
    obsTrailSystem: null as DynamicTrailSystem | null,
    spaceConstelGroup: null as THREE.Group | null,
    obsConstelGroup: null as THREE.Group | null,
    spaceCelestialMesh: null as THREE.LineSegments | null,
    spaceControls: null as OrbitControls | null,
    spaceCamera: null as THREE.PerspectiveCamera | null,
    obsCamera: null as THREE.PerspectiveCamera | null,
  });

  useEffect(() => {
    simRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    simRef.current.speedMultiplier = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    const sim = simRef.current;
    sim.isTrailsActive = showTrails;
    if (showTrails) {
      // 궤적 켬: 0부터 다시 꼬리가 자라나며 동적 장노출 트레일 생성
      sim.trailDurationHours = 0;
      sim.spaceTrailSystem?.update(0);
      sim.obsTrailSystem?.update(0);
    } else {
      // 궤적 끔: 버퍼 데이터를 즉시 초기화(clear)하고 화면에서 제거
      sim.trailDurationHours = 0;
      sim.spaceTrailSystem?.clear();
      sim.obsTrailSystem?.clear();
    }
  }, [showTrails]);

  useEffect(() => {
    if (simRef.current.spaceConstelGroup) simRef.current.spaceConstelGroup.visible = showConstellations;
    if (simRef.current.obsConstelGroup) simRef.current.obsConstelGroup.visible = showConstellations;
  }, [showConstellations]);

  useEffect(() => {
    if (simRef.current.spaceCelestialMesh) {
      simRef.current.spaceCelestialMesh.visible = showGrid;
    }
  }, [showGrid]);

  // 확대/축소 핸들러: + (100 방향)으로 이동할수록 FOV 값이 줄어들어 확대(Zoom In)됨
  const handleSpaceZoomChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setSpaceZoom(clamped);
    if (simRef.current.spaceCamera) {
      simRef.current.spaceCamera.fov = zoomToSpaceFov(clamped);
      simRef.current.spaceCamera.updateProjectionMatrix();
    }
  };

  const handleObsZoomChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setObsZoom(clamped);
    if (simRef.current.obsCamera) {
      simRef.current.obsCamera.fov = zoomToObsFov(clamped);
      simRef.current.obsCamera.updateProjectionMatrix();
    }
  };

  const handleSelectDirection = (dirKey: DirectionKey) => {
    setCurrentDir(dirKey);
    const dirInfo = DIRECTIONS[dirKey];
    simRef.current.targetYaw = dirInfo.yaw;
    simRef.current.spaceCamTargetPos.set(
      dirInfo.spaceCamTarget.x,
      dirInfo.spaceCamTarget.y,
      dirInfo.spaceCamTarget.z
    );
  };

  const handlePitchChange = (deg: number) => {
    setPitchDeg(deg);
    simRef.current.targetPitch = THREE.MathUtils.degToRad(deg);
  };

  const handleStepHour = (delta: number) => {
    setTimeHours((prev) => {
      const next = (prev + delta + 24) % 24;
      simRef.current.timeHours = next;
      if (simRef.current.isTrailsActive && simRef.current.trailDurationHours < 1.5) {
        simRef.current.trailDurationHours = Math.min(1.5, simRef.current.trailDurationHours + 0.5);
        simRef.current.spaceTrailSystem?.update(simRef.current.trailDurationHours);
        simRef.current.obsTrailSystem?.update(simRef.current.trailDurationHours);
      }
      return next;
    });
  };

  const handleDownloadStandaloneHtml = () => {
    const code = generateStandaloneHtml();
    const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'earth_rotation_and_diurnal_motion_simulator.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = async () => {
    try {
      const code = generateStandaloneHtml();
      await navigator.clipboard.writeText(code);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2500);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    const spaceCanvas = spaceCanvasRef.current;
    const obsCanvas = obsCanvasRef.current;
    if (!spaceCanvas || !obsCanvas) return;

    // 1. Renderers
    const spaceRenderer = new THREE.WebGLRenderer({ canvas: spaceCanvas, antialias: true, alpha: false });
    const obsRenderer = new THREE.WebGLRenderer({ canvas: obsCanvas, antialias: true, alpha: false });
    spaceRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    obsRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    spaceRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    obsRenderer.toneMapping = THREE.ACESFilmicToneMapping;

    // 2. Scenes
    const spaceScene = new THREE.Scene();
    spaceScene.background = new THREE.Color(0x020617);

    const obsScene = new THREE.Scene();
    obsScene.background = new THREE.Color(0x020617);

    // 3. Cameras
    const spaceCamera = new THREE.PerspectiveCamera(zoomToSpaceFov(spaceZoom), 1, 0.1, 200);
    spaceCamera.position.set(0, SPACE_CAM_HEIGHT, SPACE_CAM_DIST);
    simRef.current.spaceCamera = spaceCamera;

    const obsCamera = new THREE.PerspectiveCamera(zoomToObsFov(obsZoom), 1, 0.1, 200);
    obsCamera.position.set(0, 0.5, 0);
    simRef.current.obsCamera = obsCamera;

    // 4. OrbitControls (우주 시점용)
    const spaceControls = new OrbitControls(spaceCamera, spaceCanvas);
    spaceControls.enableDamping = true;
    spaceControls.dampingFactor = 0.05;
    spaceControls.minDistance = 7.0;
    spaceControls.maxDistance = 35.0;
    spaceControls.target.set(0, 0.4, 0);
    simRef.current.spaceControls = spaceControls;

    // 5. Lights
    spaceScene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dirSpace = new THREE.DirectionalLight(0xfffbeb, 1.2);
    dirSpace.position.set(12, 10, 14);
    spaceScene.add(dirSpace);

    obsScene.add(new THREE.AmbientLight(0xffffff, 1.0));

    // 6. Text sprite generator (텍스트 라벨: renderOrder = 4 고정, 동적 여백 및 가독성 배경 상자)
    function createTextSprite(
      text: string,
      color: string = '#ffffff',
      fontSize: number = 44,
      worldHeight: number = 0.85
    ) {
      const measureCanvas = document.createElement('canvas');
      const measureCtx = measureCanvas.getContext('2d')!;
      const font = `bold ${fontSize}px "Pretendard", "Noto Sans KR", system-ui, -apple-system, sans-serif`;
      measureCtx.font = font;
      const textMetrics = measureCtx.measureText(text);
      const textWidth = Math.ceil(textMetrics.width);

      // 넉넉한 가로/세로 여백으로 글씨 테두리 잘림 완전 방지
      const padX = 36;
      const padY = 22;
      const canvasWidth = Math.max(160, textWidth + padX * 2);
      const canvasHeight = Math.max(76, fontSize + padY * 2);

      const c = document.createElement('canvas');
      c.width = canvasWidth;
      c.height = canvasHeight;
      const ctx = c.getContext('2d')!;

      // 글자 가시성을 위한 반투명 어두운 배경 상자
      const r = 12;
      const bx = 4;
      const by = 4;
      const bw = canvasWidth - 8;
      const bh = canvasHeight - 8;

      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + bw - r, by);
      ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
      ctx.lineTo(bx + bw, by + bh - r);
      ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
      ctx.lineTo(bx + r, by + bh);
      ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.closePath();

      ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.stroke();

      // 텍스트를 상자 정중앙에 여유 있게 배치
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      const spriteMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: true,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.renderOrder = 4; // 라벨 최상단 우선순위 고정

      // 캔버스 가로세로 비율에 맞춰 왜곡 없이 스케일 적용
      const aspect = canvasWidth / canvasHeight;
      sprite.scale.set(worldHeight * aspect, worldHeight, 1);
      return sprite;
    }

    // ============================================================
    // A. 왼쪽 화면 (우주 시점: 수평면 수평 유지 모델)
    // ============================================================
    const celestialRadius = 6.2;
    const groundRadius = 3.2;

    const groundTexture = createGroundCompassTexture();
    const spaceGroundGeom = new THREE.CircleGeometry(groundRadius, 64);
    const spaceGroundMat = new THREE.MeshBasicMaterial({
      map: groundTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      depthTest: true,
    });
    const spaceGroundMesh = new THREE.Mesh(spaceGroundGeom, spaceGroundMat);
    spaceGroundMesh.renderOrder = 1;
    spaceGroundMesh.rotation.x = -Math.PI / 2;
    spaceScene.add(spaceGroundMesh);

    const groundRimGeom = new THREE.RingGeometry(groundRadius - 0.04, groundRadius + 0.04, 64);
    const groundRimMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true,
    });
    const groundRim = new THREE.Mesh(groundRimGeom, groundRimMat);
    groundRim.renderOrder = 1;
    groundRim.rotation.x = -Math.PI / 2;
    spaceScene.add(groundRim);

    const sLabelN = createTextSprite('북', '#ef4444', 44, 0.65);
    sLabelN.position.set(0, 0.25, -groundRadius - 0.5);
    spaceScene.add(sLabelN);

    const sLabelS = createTextSprite('남', '#38bdf8', 44, 0.65);
    sLabelS.position.set(0, 0.25, groundRadius + 0.5);
    spaceScene.add(sLabelS);

    const sLabelE = createTextSprite('동', '#f59e0b', 44, 0.65);
    sLabelE.position.set(groundRadius + 0.5, 0.25, 0);
    spaceScene.add(sLabelE);

    const sLabelW = createTextSprite('서', '#10b981', 44, 0.65);
    sLabelW.position.set(-groundRadius - 0.5, 0.25, 0);
    spaceScene.add(sLabelW);

    const observerCenterGroup = new THREE.Group();
    spaceScene.add(observerCenterGroup);

    const obsPinGeom = new THREE.ConeGeometry(0.12, 0.45, 16);
    const obsPinMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const obsPin = new THREE.Mesh(obsPinGeom, obsPinMat);
    obsPin.position.y = 0.22;
    observerCenterGroup.add(obsPin);

    const gazeArrowGeom = new THREE.ConeGeometry(0.1, 0.4, 16);
    const gazeArrowMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const gazeArrowMesh = new THREE.Mesh(gazeArrowGeom, gazeArrowMat);
    gazeArrowMesh.position.set(0, 0.15, -0.9);
    gazeArrowMesh.rotation.x = -Math.PI / 2;
    observerCenterGroup.add(gazeArrowMesh);
    simRef.current.spaceGazeArrow = gazeArrowMesh;

    const gazeSightGeom = new THREE.ConeGeometry(0.5, 1.4, 16, 1, true);
    const gazeSightMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true,
    });
    const gazeSightMesh = new THREE.Mesh(gazeSightGeom, gazeSightMat);
    gazeSightMesh.renderOrder = 2;
    gazeSightMesh.position.set(0, 0.15, -0.7);
    gazeSightMesh.rotation.x = -Math.PI / 2;
    observerCenterGroup.add(gazeSightMesh);

    const zenithLabel = createTextSprite('천정', '#a855f7', 44, 0.75);
    zenithLabel.position.set(0, celestialRadius + 0.45, 0);
    spaceScene.add(zenithLabel);

    const zenithAxisGeom = new THREE.CylinderGeometry(0.015, 0.015, celestialRadius * 2, 16);
    const zenithAxisMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      depthTest: true,
    });
    const zenithAxisMesh = new THREE.Mesh(zenithAxisGeom, zenithAxisMat);
    zenithAxisMesh.renderOrder = 2;
    spaceScene.add(zenithAxisMesh);

    // ============================================================
    // 천구 격자 및 반투명 가림막 구체 (Occlusion Sphere)
    // 렌더링 순서 명시적 분리:
    // 1. 가림막 구체(occlusionSphere): renderOrder = 1, 항상 켜짐 (visible = true 유지)
    //    - side: THREE.FrontSide, transparent: true, opacity: 0.35, depthWrite: false, depthTest: true
    // 2. 위도·경도 격자선(gridMesh): renderOrder = 2, [천구격자 켬/끔] 버튼으로 독립 토글
    //    - depthWrite: false, depthTest: true
    // ============================================================
    const occlusionSphereGeom = new THREE.SphereGeometry(celestialRadius * 0.995, 36, 18);
    const occlusionSphereMat = new THREE.MeshBasicMaterial({
      color: 0x020617,
      side: THREE.FrontSide,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      depthTest: true,
    });
    const occlusionSphereMesh = new THREE.Mesh(occlusionSphereGeom, occlusionSphereMat);
    occlusionSphereMesh.renderOrder = 1; // 가림막 구체 우선순위 1
    occlusionSphereMesh.visible = true; // 격자 토글에 영향받지 않고 항상 유지
    spaceScene.add(occlusionSphereMesh);

    // 위도·경도 격자선 (대각선 없는 순수 가로/세로 바둑판 격자)
    const spaceCelestialSphereGeom = createCelestialGridGeometry(celestialRadius);
    const spaceCelestialSphereMat = new THREE.LineBasicMaterial({
      color: 0x3a6b8c,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      depthTest: true,
    });
    const spaceCelestialMesh = new THREE.LineSegments(spaceCelestialSphereGeom, spaceCelestialSphereMat);
    spaceCelestialMesh.renderOrder = 2; // 격자선 우선순위 2
    spaceCelestialMesh.visible = showGrid;
    spaceScene.add(spaceCelestialMesh);
    simRef.current.spaceCelestialMesh = spaceCelestialMesh;

    const meridianGeom = new THREE.RingGeometry(celestialRadius - 0.03, celestialRadius + 0.03, 72);
    const meridianMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true,
    });
    const meridianMesh = new THREE.Mesh(meridianGeom, meridianMat);
    meridianMesh.renderOrder = 2;
    meridianMesh.rotation.y = Math.PI / 2;
    spaceScene.add(meridianMesh);

    const spaceCelestialTiltGroup = new THREE.Group();
    spaceCelestialTiltGroup.rotation.x = -(Math.PI / 2 - KOREA_LATITUDE_RAD);
    spaceScene.add(spaceCelestialTiltGroup);

    const spaceAxisGeom = new THREE.CylinderGeometry(0.03, 0.03, celestialRadius * 2.3, 16);
    const spaceAxisMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const spaceAxisMesh = new THREE.Mesh(spaceAxisGeom, spaceAxisMat);
    spaceCelestialTiltGroup.add(spaceAxisMesh);

    const spaceArrowGeom = new THREE.ConeGeometry(0.12, 0.45, 16);
    const spaceArrowMesh = new THREE.Mesh(spaceArrowGeom, spaceAxisMat);
    spaceArrowMesh.position.y = celestialRadius * 1.15;
    spaceCelestialTiltGroup.add(spaceArrowMesh);

    // 천구의 적도선 (equator: renderOrder = 2)
    const spaceEqRingGeom = new THREE.RingGeometry(celestialRadius - 0.05, celestialRadius + 0.05, 72);
    const spaceEqRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      depthTest: true,
    });
    const spaceEqRing = new THREE.Mesh(spaceEqRingGeom, spaceEqRingMat);
    spaceEqRing.renderOrder = 2;
    spaceEqRing.rotation.x = Math.PI / 2;
    spaceCelestialTiltGroup.add(spaceEqRing);

    const eqLabel = createTextSprite('천구 적도 (남중 고도 53°)', '#38bdf8', 38, 0.75);
    eqLabel.position.set(0, 0, celestialRadius + 0.4);
    spaceCelestialTiltGroup.add(eqLabel);

    const spaceDiurnalGroup = new THREE.Group();
    spaceCelestialTiltGroup.add(spaceDiurnalGroup);
    simRef.current.spaceDiurnalGroup = spaceDiurnalGroup;

    // ============================================================
    // B. 오른쪽 화면 (관측자 시점)
    // ============================================================
    const obsSkyRadius = 16.0;

    const obsGroundGeom = new THREE.CircleGeometry(12.5, 64);
    const obsGroundMat = new THREE.MeshBasicMaterial({
      map: groundTexture,
      side: THREE.DoubleSide,
    });
    const obsGroundMesh = new THREE.Mesh(obsGroundGeom, obsGroundMat);
    obsGroundMesh.rotation.x = -Math.PI / 2;
    obsGroundMesh.position.y = -0.05;
    obsScene.add(obsGroundMesh);

    const oLabelN = createTextSprite('북', '#ef4444', 48, 1.1);
    oLabelN.position.set(0, 0.7, -9.5);
    obsScene.add(oLabelN);

    const oLabelS = createTextSprite('남', '#38bdf8', 48, 1.1);
    oLabelS.position.set(0, 0.7, 9.5);
    obsScene.add(oLabelS);

    const oLabelE = createTextSprite('동', '#f59e0b', 48, 1.1);
    oLabelE.position.set(9.5, 0.7, 0);
    obsScene.add(oLabelE);

    const oLabelW = createTextSprite('서', '#10b981', 48, 1.1);
    oLabelW.position.set(-9.5, 0.7, 0);
    obsScene.add(oLabelW);

    const obsCelestialTiltGroup = new THREE.Group();
    obsCelestialTiltGroup.rotation.x = -(Math.PI / 2 - KOREA_LATITUDE_RAD);
    obsScene.add(obsCelestialTiltGroup);

    const obsDiurnalGroup = new THREE.Group();
    obsCelestialTiltGroup.add(obsDiurnalGroup);
    simRef.current.obsDiurnalGroup = obsDiurnalGroup;

    // ============================================================
    // C. 천체 (별, 북극성, 태양, 별자리선, 일주 궤적)
    // ============================================================
    const starSpriteTex = createStarSpriteTexture('#ffffff');
    const polarisSpriteTex = createStarSpriteTexture('#fef08a');
    const sunSpriteTex = createSunTexture();

    STAR_CATALOG.forEach((star) => {
      const posSpace = celestialToVector3(star.raHours, star.decDeg, celestialRadius);
      const matSpace = new THREE.SpriteMaterial({
        map: star.isSun ? sunSpriteTex : star.isPolaris ? polarisSpriteTex : starSpriteTex,
        color: new THREE.Color(star.color),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
      });
      const spriteSpace = new THREE.Sprite(matSpace);
      spriteSpace.renderOrder = 3; // 별, 태양: renderOrder = 3
      spriteSpace.position.copy(posSpace);
      const scaleSpace = star.size * (star.isSun ? 0.75 : star.isPolaris ? 0.65 : 0.35);
      spriteSpace.scale.set(scaleSpace, scaleSpace, 1);
      spaceDiurnalGroup.add(spriteSpace);

      const posObs = celestialToVector3(star.raHours, star.decDeg, obsSkyRadius);
      const matObs = matSpace.clone();
      const spriteObs = new THREE.Sprite(matObs);
      spriteObs.renderOrder = 3;
      spriteObs.position.copy(posObs);
      const scaleObs = star.size * (star.isSun ? 0.95 : star.isPolaris ? 0.8 : 0.45);
      spriteObs.scale.set(scaleObs, scaleObs, 1);
      obsDiurnalGroup.add(spriteObs);

      if (star.isPolaris) {
        const pLabelSpace = createTextSprite('★ 북극성 (고도 37°)', '#fef08a', 40, 0.65);
        pLabelSpace.position.copy(posSpace).add(new THREE.Vector3(0, 0.45, 0));
        spaceDiurnalGroup.add(pLabelSpace);

        const pLabelObs = createTextSprite('★ 북극성 (고도 37°)', '#fef08a', 42, 0.95);
        pLabelObs.position.copy(posObs).add(new THREE.Vector3(0, 0.8, 0));
        obsDiurnalGroup.add(pLabelObs);
      } else if (star.isSun) {
        const sLabelSpace = createTextSprite('☀ 태양', '#fbbf24', 40, 0.65);
        sLabelSpace.position.copy(posSpace).add(new THREE.Vector3(0, 0.6, 0));
        spaceDiurnalGroup.add(sLabelSpace);

        const sLabelObs = createTextSprite('☀ 태양', '#fbbf24', 42, 0.95);
        sLabelObs.position.copy(posObs).add(new THREE.Vector3(0, 1.3, 0));
        obsDiurnalGroup.add(sLabelObs);
      }
    });

    const bgStars = generateBackgroundStars(350);
    const spaceBgGeom = new THREE.BufferGeometry();
    const spaceBgPositions: number[] = [];
    const spaceBgColors: number[] = [];
    const obsBgGeom = new THREE.BufferGeometry();
    const obsBgPositions: number[] = [];
    const obsBgColors: number[] = [];

    bgStars.forEach((s) => {
      const pS = celestialToVector3(s.raHours, s.decDeg, celestialRadius);
      spaceBgPositions.push(pS.x, pS.y, pS.z);

      const pO = celestialToVector3(s.raHours, s.decDeg, obsSkyRadius);
      obsBgPositions.push(pO.x, pO.y, pO.z);

      const col = new THREE.Color(s.color);
      spaceBgColors.push(col.r, col.g, col.b);
      obsBgColors.push(col.r, col.g, col.b);
    });

    spaceBgGeom.setAttribute('position', new THREE.Float32BufferAttribute(spaceBgPositions, 3));
    spaceBgGeom.setAttribute('color', new THREE.Float32BufferAttribute(spaceBgColors, 3));
    const spaceBgPoints = new THREE.Points(spaceBgGeom, new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }));
    spaceBgPoints.renderOrder = 3;
    spaceDiurnalGroup.add(spaceBgPoints);

    obsBgGeom.setAttribute('position', new THREE.Float32BufferAttribute(obsBgPositions, 3));
    obsBgGeom.setAttribute('color', new THREE.Float32BufferAttribute(obsBgColors, 3));
    const obsBgPoints = new THREE.Points(obsBgGeom, new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }));
    obsBgPoints.renderOrder = 3;
    obsDiurnalGroup.add(obsBgPoints);

    const spaceConstelGroup = new THREE.Group();
    const obsConstelGroup = new THREE.Group();

    CONSTELLATION_LINES.forEach((edge) => {
      const s1 = STAR_CATALOG.find((s) => s.id === edge.star1);
      const s2 = STAR_CATALOG.find((s) => s.id === edge.star2);
      if (s1 && s2) {
        const p1S = celestialToVector3(s1.raHours, s1.decDeg, celestialRadius * 0.995);
        const p2S = celestialToVector3(s2.raHours, s2.decDeg, celestialRadius * 0.995);
        const geomS = new THREE.BufferGeometry().setFromPoints([p1S, p2S]);
        const lineS = new THREE.Line(geomS, new THREE.LineBasicMaterial({
          color: edge.star2 === 'polaris' ? 0xf59e0b : 0x38bdf8,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
          depthTest: true,
        }));
        lineS.renderOrder = 3;
        spaceConstelGroup.add(lineS);

        const p1O = celestialToVector3(s1.raHours, s1.decDeg, obsSkyRadius * 0.995);
        const p2O = celestialToVector3(s2.raHours, s2.decDeg, obsSkyRadius * 0.995);
        const geomO = new THREE.BufferGeometry().setFromPoints([p1O, p2O]);
        const lineO = new THREE.Line(geomO, new THREE.LineBasicMaterial({
          color: edge.star2 === 'polaris' ? 0xf59e0b : 0x38bdf8,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          depthTest: true,
        }));
        lineO.renderOrder = 3;
        obsConstelGroup.add(lineO);
      }
    });

    spaceConstelGroup.visible = showConstellations;
    obsConstelGroup.visible = showConstellations;
    spaceDiurnalGroup.add(spaceConstelGroup);
    obsDiurnalGroup.add(obsConstelGroup);
    simRef.current.spaceConstelGroup = spaceConstelGroup;
    simRef.current.obsConstelGroup = obsConstelGroup;

    // ============================================================
    // C. 다이내믹 트레일 시스템 (Dynamic Trail System)
    // Draw Call 1회 최적화: 단일 BufferGeometry + LineSegments
    // 1.5시간(22.5도) 분량의 장노출 효과 & 100% 불투명 헤드 -> 0% 페이드아웃 꼬리
    // renderOrder = 3
    // ============================================================
    const allTrailStars: TrailStar[] = [
      ...STAR_CATALOG.map((s) => ({
        raHours: s.raHours,
        decDeg: s.decDeg,
        color: s.color,
        isSun: s.isSun,
        isPolaris: s.isPolaris,
      })),
      ...bgStars.map((s) => ({
        raHours: s.raHours,
        decDeg: s.decDeg,
        color: s.color,
        isSun: false,
        isPolaris: false,
      })),
    ];

    const spaceTrailSystem = createDynamicTrailSystem(allTrailStars, celestialRadius, 16);
    spaceTrailSystem.mesh.renderOrder = 3;
    spaceDiurnalGroup.add(spaceTrailSystem.mesh);
    simRef.current.spaceTrailSystem = spaceTrailSystem;

    const obsTrailSystem = createDynamicTrailSystem(allTrailStars, obsSkyRadius, 16);
    obsTrailSystem.mesh.renderOrder = 3;
    obsDiurnalGroup.add(obsTrailSystem.mesh);
    simRef.current.obsTrailSystem = obsTrailSystem;

    if (!showTrails) {
      spaceTrailSystem.clear();
      obsTrailSystem.clear();
    }

    // ============================================================
    // Animation & Resize Loop
    // ============================================================
    let animationFrameId: number;
    let lastTime = performance.now();

    const handleResize = () => {
      const sw = spaceCanvas.parentElement?.clientWidth || spaceCanvas.clientWidth;
      const sh = spaceCanvas.parentElement?.clientHeight || spaceCanvas.clientHeight;
      if (sw > 0 && sh > 0) {
        spaceCamera.aspect = sw / sh;
        spaceCamera.updateProjectionMatrix();
        spaceRenderer.setSize(sw, sh);
      }

      const ow = obsCanvas.parentElement?.clientWidth || obsCanvas.clientWidth;
      const oh = obsCanvas.parentElement?.clientHeight || obsCanvas.clientHeight;
      if (ow > 0 && oh > 0) {
        obsCamera.aspect = ow / oh;
        obsCamera.updateProjectionMatrix();
        obsRenderer.setSize(ow, oh);
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    if (spaceCanvas.parentElement) resizeObserver.observe(spaceCanvas.parentElement);
    if (obsCanvas.parentElement) resizeObserver.observe(obsCanvas.parentElement);
    window.addEventListener('resize', handleResize);
    handleResize();

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const sim = simRef.current;

      if (sim.isPlaying) {
        sim.timeHours = (sim.timeHours + dt * sim.speedMultiplier) % 24;
        setTimeHours(sim.timeHours);

        // [궤적 켬] 상태일 때 별과 태양의 이동에 따라 꼬리가 생성되며 최대 1.5시간(22.5°)까지 확장
        if (sim.isTrailsActive) {
          if (sim.trailDurationHours < 1.5) {
            sim.trailDurationHours = Math.min(1.5, sim.trailDurationHours + dt * sim.speedMultiplier);
          }
          sim.spaceTrailSystem?.update(sim.trailDurationHours);
          sim.obsTrailSystem?.update(sim.trailDurationHours);
        }
      } else if (sim.isTrailsActive) {
        sim.spaceTrailSystem?.update(sim.trailDurationHours);
        sim.obsTrailSystem?.update(sim.trailDurationHours);
      }

      // 핵심 과학 수정:
      // 지구가 서에서 동으로 자전하므로, 겉보기 일주 운동은 '동에서 떠서 서로 진다'!
      // 태양 객체가 동쪽 지평면(고도 0도)을 뚫고 올라오는 '일출' 순간이 정확히 06:03이 되도록 오프셋 동기화
      const rotationAngle = (((sim.timeHours - TIME_OFFSET_HOURS) % 24 + 24) % 24 / 24) * Math.PI * 2;
      const diurnalAngle = -rotationAngle;

      if (sim.spaceDiurnalGroup) {
        sim.spaceDiurnalGroup.rotation.y = diurnalAngle;
      }
      if (sim.obsDiurnalGroup) {
        sim.obsDiurnalGroup.rotation.y = diurnalAngle;
      }

      // 관측자 1인칭 카메라 보간
      sim.currentYaw += (sim.targetYaw - sim.currentYaw) * 0.08;
      sim.currentPitch += (sim.targetPitch - sim.currentPitch) * 0.08;

      const cosP = Math.cos(sim.currentPitch);
      const sinP = Math.sin(sim.currentPitch);
      const lookDir = new THREE.Vector3(
        -Math.sin(sim.currentYaw) * cosP,
        sinP,
        -Math.cos(sim.currentYaw) * cosP
      );
      obsCamera.lookAt(obsCamera.position.clone().add(lookDir));

      if (sim.spaceGazeArrow) {
        sim.spaceGazeArrow.parent!.rotation.y = sim.currentYaw;
      }

      spaceCamera.position.x += (sim.spaceCamTargetPos.x - spaceCamera.position.x) * 0.05;
      spaceCamera.position.y += (sim.spaceCamTargetPos.y - spaceCamera.position.y) * 0.05;
      spaceCamera.position.z += (sim.spaceCamTargetPos.z - spaceCamera.position.z) * 0.05;

      spaceControls.update();

      spaceRenderer.render(spaceScene, spaceCamera);
      obsRenderer.render(obsScene, obsCamera);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      simRef.current.spaceTrailSystem?.dispose();
      simRef.current.obsTrailSystem?.dispose();
      spaceRenderer.dispose();
      obsRenderer.dispose();
    };
  }, []);

  const formatTime = (hVal: number) => {
    const normH = ((hVal % 24) + 24) % 24;
    const totalM = Math.round(normH * 60) % (24 * 60);
    const h = Math.floor(totalM / 60);
    const m = totalM % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#030712] text-slate-100 font-sans overflow-hidden select-none">
      {/* 1. Header */}
      <header className="shrink-0 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-sky-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-sm">
              중1 과학
            </span>
            <span className="font-semibold text-slate-100 text-base tracking-tight">
              지구의 자전과 천체의 일주 운동 3D 시뮬레이터
            </span>
          </div>
          <span className="hidden md:inline-flex text-xs text-slate-400 border-l border-slate-700/80 pl-3 items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            대한민국(북위 37°) 기준 · 수평면 고정 모델
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            title="단일 HTML 코드 복사"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-all active:scale-95"
          >
            {copiedHtml ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">복사 완료</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>코드 복사</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadStandaloneHtml}
            title="별도 설치 없이 어디서나 실행 가능한 단일 HTML 파일로 저장"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-sky-900/40 hover:bg-sky-800/60 text-sky-300 border border-sky-600/50 rounded-md transition-all active:scale-95 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>단일 HTML 다운로드</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-md transition-all active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>교과서 핵심 원리</span>
          </button>
        </div>
      </header>

      {/* 2. Simulation Viewports (좌/우 5:5 분할) */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 relative bg-[#020617] min-h-0">
        {/* Left: 우주 시점 */}
        <div className="relative w-full h-full overflow-hidden border-b md:border-b-0 md:border-r border-slate-800/80">
          {/* View Tag */}
          <div className="absolute top-3.5 left-4 z-10 pointer-events-none bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg px-3 py-1.5 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 ring-2 ring-sky-500/30" />
              <span className="text-sm font-bold text-slate-100">우주 시점 (천구 밖 전지적 뷰)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              북위 37° <strong className="text-sky-300">수평면은 평평하게 유지</strong> · 자전축 37° 경사
            </p>
          </div>

          {/* 왼쪽 화면 왼쪽 끝: 확대/축소 슬라이더 */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-sky-500/40 rounded-xl px-2 py-2.5 shadow-2xl">
            <button
              onClick={() => handleSpaceZoomChange(spaceZoom + 10)}
              title="화면 확대 (Zoom In)"
              aria-label="우주 시점 확대"
              className="text-slate-300 hover:text-sky-300 transition-colors p-1.5 rounded-lg hover:bg-slate-800 active:scale-95"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="h-32 flex items-center justify-center py-1">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={spaceZoom}
                onChange={(e) => handleSpaceZoomChange(parseFloat(e.target.value))}
                title="우주 시점 확대/축소"
                aria-label="우주 시점 확대 축소"
                className="accent-sky-400 h-28 w-2 cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
              />
            </div>
            <button
              onClick={() => handleSpaceZoomChange(spaceZoom - 10)}
              title="화면 축소 (Zoom Out)"
              aria-label="우주 시점 축소"
              className="text-slate-300 hover:text-sky-300 transition-colors p-1.5 rounded-lg hover:bg-slate-800 active:scale-95"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Current Perspective Indicator */}
          <div className="absolute bottom-3 left-14 z-10 pointer-events-none bg-slate-900/85 backdrop-blur-sm border border-slate-700/50 rounded-md px-2.5 py-1 text-[11px] text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              현재 시선: <strong className="text-amber-300">
                {currentDir === 'E' && '지면 서쪽에서 동쪽을 바라봄'}
                {currentDir === 'W' && '지면 동쪽에서 서쪽을 바라봄'}
                {currentDir === 'S' && '지면 북쪽에서 남쪽을 바라봄'}
                {currentDir === 'N' && '지면 남쪽에서 북쪽을 바라봄'}
              </strong>
            </span>
          </div>

          <canvas ref={spaceCanvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />
        </div>

        {/* Right: 관측자 시점 */}
        <div className="relative w-full h-full overflow-hidden">
          {/* View Tag */}
          <div className="absolute top-3.5 left-4 z-10 pointer-events-none bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg px-3.5 py-2 shadow-lg break-keep [word-break:keep-all] [overflow-wrap:break-word]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-500/30" />
              <span className="text-sm font-bold text-slate-100">관측자 시점</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-[1.5] break-keep [word-break:keep-all]">
              북위 37° 지면에서 본 하늘 · 천체의 일주 운동: <strong className="text-amber-300">동쪽 → 서쪽</strong>
            </p>
          </div>

          {/* Direction Hint Banner */}
          <div className="absolute top-3.5 right-14 z-10 pointer-events-none bg-slate-900/90 backdrop-blur-md border border-amber-500/40 rounded-xl px-4 py-2.5 shadow-lg max-w-xs sm:max-w-sm text-right break-keep [word-break:keep-all] [overflow-wrap:break-word]">
            <div className="text-xs font-bold text-amber-300 flex items-center justify-end gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>{DIRECTIONS[currentDir].label} 하늘</span>
            </div>
            <p
              className="text-[11.5px] text-slate-200 mt-1 leading-[1.5] break-keep [word-break:keep-all] [overflow-wrap:break-word]"
              dangerouslySetInnerHTML={{ __html: DIRECTIONS[currentDir].description }}
            />
          </div>

          {/* 오른쪽 화면 오른쪽 끝: 확대/축소 슬라이더 */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-amber-500/40 rounded-xl px-2 py-2.5 shadow-2xl">
            <button
              onClick={() => handleObsZoomChange(obsZoom + 10)}
              title="화면 확대 (Zoom In)"
              aria-label="관측자 시점 확대"
              className="text-slate-300 hover:text-amber-300 transition-colors p-1.5 rounded-lg hover:bg-slate-800 active:scale-95"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="h-32 flex items-center justify-center py-1">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={obsZoom}
                onChange={(e) => handleObsZoomChange(parseFloat(e.target.value))}
                title="관측자 시점 확대/축소"
                aria-label="관측자 시점 확대 축소"
                className="accent-amber-400 h-28 w-2 cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
              />
            </div>
            <button
              onClick={() => handleObsZoomChange(obsZoom - 10)}
              title="화면 축소 (Zoom Out)"
              aria-label="관측자 시점 축소"
              className="text-slate-300 hover:text-amber-300 transition-colors p-1.5 rounded-lg hover:bg-slate-800 active:scale-95"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Polaris Callout */}
          {currentDir === 'N' && (
            <div className="absolute bottom-3 left-4 z-10 pointer-events-none bg-amber-950/70 backdrop-blur-sm border border-amber-500/40 rounded-md px-2.5 py-1 text-[11px] text-amber-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
              <span>북극성은 움직이지 않고 고도 37°에 고정됨</span>
            </div>
          )}

          <canvas ref={obsCanvasRef} className="w-full h-full block" />
        </div>
      </main>

      {/* 3. Bottom Control UI Panel */}
      <footer className="shrink-0 bg-slate-950/95 border-t border-slate-800/80 px-4 md:px-6 py-3 z-20 backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* 1) 시간 및 속도 제어 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                시간 흐름
              </span>
              <span className="font-mono text-sky-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-xs">
                {formatTime(timeHours)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                  isPlaying
                    ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? '일시정지' : '재생'}</span>
              </button>

              <button
                onClick={() => handleStepHour(-1)}
                title="1시간 뒤로"
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md text-xs font-medium transition-all"
              >
                -1h
              </button>
              <button
                onClick={() => handleStepHour(1)}
                title="1시간 앞으로"
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md text-xs font-medium transition-all"
              >
                +1h
              </button>
              <button
                onClick={() => {
                  setTimeHours(0);
                  simRef.current.timeHours = 0;
                  if (simRef.current.isTrailsActive) {
                    simRef.current.trailDurationHours = 0;
                    simRef.current.spaceTrailSystem?.update(0);
                    simRef.current.obsTrailSystem?.update(0);
                  }
                }}
                title="0시 리셋"
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md text-xs font-medium transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 속도 슬라이더 */}
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[11px] text-slate-400 shrink-0">속도:</span>
              <input
                type="range"
                min="0.1"
                max="4.0"
                step="0.1"
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[11px] font-mono text-sky-300 w-9 text-right shrink-0">
                {speedMultiplier.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* 2) 방위 조절 */}
          <div className="flex flex-col gap-1.5">
            <div className="text-xs text-slate-300 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                관측 방위 (지면 기준 동서남북)
              </span>
              <span className="text-[10px] text-amber-400 font-medium">수평면 고정</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {(['E', 'S', 'W', 'N'] as DirectionKey[]).map((dirKey) => {
                const info = DIRECTIONS[dirKey];
                const isActive = currentDir === dirKey;
                return (
                  <button
                    key={dirKey}
                    onClick={() => handleSelectDirection(dirKey)}
                    className={`py-2 px-2 rounded-md text-xs font-bold transition-all text-center flex items-center justify-center ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 shadow-md font-extrabold'
                        : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <span>{info.label}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-slate-400 truncate">
              {currentDir === 'E' && '서쪽에서 동쪽을 봄: 별과 태양이 오른쪽 위로 뜸'}
              {currentDir === 'S' && '북쪽에서 남쪽을 봄: 지평선과 나란히 오른쪽으로 이동'}
              {currentDir === 'W' && '동쪽에서 서쪽을 봄: 별과 태양이 오른쪽 아래로 짐'}
              {currentDir === 'N' && '남쪽에서 북쪽을 봄: 북극성 기준 반시계 회전'}
            </span>
          </div>

          {/* 3) 고도 조절 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                하늘 고도각 (올려다보기)
              </span>
              <span className="font-mono text-emerald-400 text-xs">{pitchDeg}°</span>
            </div>

            <input
              type="range"
              min="0"
              max="80"
              step="1"
              value={pitchDeg}
              onChange={(e) => handlePitchChange(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg mt-1"
            />

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0° (지평선)</span>
              <span>45°</span>
              <span>80° (천정)</span>
            </div>
          </div>

          {/* 4) 시각화 도구 */}
          <div className="flex flex-col gap-1.5">
            <div className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              시각화 도구
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setShowTrails(!showTrails)}
                className={`py-1.5 px-1.5 rounded-md text-xs font-semibold transition-all border text-center ${
                  showTrails
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {showTrails ? '✨ 궤적 켬' : '✨ 궤적 끔'}
              </button>

              <button
                onClick={() => setShowConstellations(!showConstellations)}
                className={`py-1.5 px-1.5 rounded-md text-xs font-semibold transition-all border text-center ${
                  showConstellations
                    ? 'bg-sky-600/30 text-sky-300 border-sky-500 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {showConstellations ? '별자리선 켬' : '별자리선 끔'}
              </button>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`py-1.5 px-1.5 rounded-md text-xs font-semibold transition-all border text-center ${
                  showGrid
                    ? 'bg-teal-600/30 text-teal-300 border-teal-500 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {showGrid ? '천구격자 켬' : '천구격자 끔'}
              </button>
            </div>
            <span className="text-[10px] text-slate-400">
              화면 양 끝 슬라이더로 각 뷰포트 시야각(확대/축소)을 자유 조절하세요.
            </span>
          </div>
        </div>
      </footer>

      {/* 4. Educational Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-xl max-w-2xl w-full p-6 shadow-2xl text-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="bg-sky-600 text-white text-xs font-bold px-2 py-0.5 rounded">중1 과학</span>
                <h2 className="text-lg font-bold text-slate-100">지구의 자전과 천체의 일주 운동 핵심 모델</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-100 text-xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-sm mt-4 leading-relaxed">
              <div className="bg-sky-950/40 border border-sky-800/60 p-3.5 rounded-lg">
                <h4 className="font-bold text-sky-300 mb-1">핵심 원리 한 줄 요약:</h4>
                <p className="text-xs text-sky-100">
                  지구가 자전축을 중심으로 <strong>서쪽에서 동쪽으로</strong> 하루에 한 바퀴씩 자전하기 때문에, 지구 표면의 관측자가 볼 때는 하늘의 모든 별과 태양이 <strong>동쪽에서 서쪽으로</strong> 하루에 한 바퀴씩 회전하는 것처럼 보입니다(천체의 일주 운동).
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-100 text-base mb-2">1. 교과서 속 천구 모델 (수평면 고정 기준)</h3>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
                  <li><strong>수평면 (지평면):</strong> 관측자가 서 있는 지면을 평평한 원형 수평면으로 나타냅니다. 머리 꼭대기가 <strong>천정(Zenith)</strong>입니다.</li>
                  <li><strong>자전축과 북극성 고도:</strong> 대한민국(북위 약 37°)에서는 천구의 북극(자전축 연장선)이 북쪽 지평선에서 <strong>37° 높이</strong>로 기울어져 있습니다. 따라서 북극성의 고도는 위도와 같은 37°입니다.</li>
                  <li><strong>천구의 적도:</strong> 자전축에 수직이므로, 남쪽 지평선에서 최고 고도 <strong>53° ($90° - 37°$)</strong>로 남쪽을 향해 기울어져 있습니다.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-100 text-base mb-2">2. 방위별 밤하늘 일주 운동 (동서남북)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-xs">
                  <div className="bg-slate-800/80 p-3 rounded-md border border-slate-700">
                    <strong className="text-amber-400 block mb-1">동쪽 하늘 (서쪽에서 동쪽을 봄):</strong>
                    별과 태양이 지평선에서 <strong>오른쪽 위로 비스듬히</strong> 떠오릅니다 (남쪽 방향을 향해 경사).
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-md border border-slate-700">
                    <strong className="text-amber-400 block mb-1">남쪽 하늘 (북쪽에서 남쪽을 봄):</strong>
                    별들이 최고 고도(남중 53°)를 거친 후 <strong>지평선과 나란하게 오른쪽(서쪽)으로</strong> 이동합니다.
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-md border border-slate-700">
                    <strong className="text-amber-400 block mb-1">서쪽 하늘 (동쪽에서 서쪽을 봄):</strong>
                    별과 태양이 <strong>오른쪽 아래로 비스듬히</strong> 지평선 너머로 집니다.
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-md border border-slate-700">
                    <strong className="text-amber-400 block mb-1">북쪽 하늘 (남쪽에서 북쪽을 봄):</strong>
                    북극성(고도 37°)을 중심으로 모든 별이 <strong>시계 반대 방향(반시계 방향)</strong>으로 돕니다.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={handleDownloadStandaloneHtml}
                className="px-3 py-1.5 bg-sky-900/40 hover:bg-sky-800/60 text-sky-300 border border-sky-600/50 rounded-md text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                HTML 파일 다운로드
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-xs font-semibold"
              >
                탐구 계속하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
