/**
 * Generates the full standalone single-file HTML code.
 * Contains HTML + CSS + JavaScript + Three.js & OrbitControls from CDN + embedded procedural graphics.
 * Updated with:
 * 1. Deep space view outside celestial sphere with level horizontal ground at 37°N
 * 2. Left viewport left-edge FOV zoom slider & Right viewport right-edge FOV zoom slider
 * 3. Correct diurnal rotation direction (rising in East and setting in West)
 * 4. Clean time display without degree angle
 */
export function generateStandaloneHtml(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>지구의 자전과 천체의 일주 운동 3D 시뮬레이터 (중학교 1학년 과학)</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
    }
    body {
      background-color: #030712;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Pretendard", sans-serif;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      word-break: keep-all;
      overflow-wrap: break-word;
    }

    header {
      background: linear-gradient(180deg, #0f172a 0%, #030712 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 20;
    }
    .header-title-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-badge {
      background: #0284c7;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .header-title {
      font-size: 16px;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: -0.3px;
    }
    .header-sub {
      font-size: 12px;
      color: #94a3b8;
      margin-left: 8px;
    }
    .guide-btn {
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .guide-btn:hover {
      background: rgba(56, 189, 248, 0.25);
    }

    .sim-container {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      position: relative;
      background: #020617;
      min-height: 0;
    }
    .viewport-box {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
    }
    .viewport-box:last-child {
      border-right: none;
    }
    .viewport-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    .view-tag {
      position: absolute;
      top: 14px;
      left: 16px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 6px 12px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      pointer-events: none;
      z-index: 10;
    }
    .view-tag-title {
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .view-tag-desc {
      font-size: 11px;
      color: #94a3b8;
    }
    .tag-dot-blue {
      width: 8px;
      height: 8px;
      background: #38bdf8;
      border-radius: 50%;
    }
    .tag-dot-amber {
      width: 8px;
      height: 8px;
      background: #f59e0b;
      border-radius: 50%;
    }

    .direction-hint-banner {
      position: absolute;
      top: 14px;
      right: 58px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(245, 158, 11, 0.4);
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 11.5px;
      color: #e2e8f0;
      max-width: 380px;
      line-height: 1.5;
      word-break: keep-all;
      overflow-wrap: break-word;
      text-align: right;
      pointer-events: none;
      z-index: 10;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
    }

    /* 화면 끝 수직 시야각(확대/축소) 슬라이더 컨트롤러 */
    .fov-slider-bar {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 25;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(8px);
      border-radius: 12px;
      padding: 10px 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
    }
    .fov-slider-left {
      left: 12px;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }
    .fov-slider-right {
      right: 12px;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .fov-btn {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: #f1f5f9;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
      transition: background 0.15s;
    }
    .fov-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .fov-range-container {
      height: 110px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .vertical-range {
      -webkit-appearance: none;
      writing-mode: vertical-lr;
      direction: rtl;
      height: 100px;
      width: 6px;
      background: #334155;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    }
    .vertical-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      cursor: pointer;
    }
    .fov-slider-left .vertical-range::-webkit-slider-thumb {
      background: #38bdf8;
    }
    .fov-slider-right .vertical-range::-webkit-slider-thumb {
      background: #f59e0b;
    }
    .fov-btn svg {
      width: 14px;
      height: 14px;
      display: block;
    }

    .controls-panel {
      background: #0b1329;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding: 12px 24px;
      display: grid;
      grid-template-columns: 1.4fr 1.6fr 1fr 1fr;
      gap: 20px;
      align-items: center;
      z-index: 20;
    }
    @media (max-width: 900px) {
      .controls-panel {
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        padding: 10px;
      }
    }
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .control-label {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .control-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f1f5f9;
      font-size: 12px;
      font-weight: 600;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn:hover {
      background: #334155;
      border-color: rgba(255, 255, 255, 0.3);
    }
    .btn:active {
      transform: scale(0.97);
    }
    .btn.primary {
      background: #0284c7;
      border-color: #38bdf8;
      color: #ffffff;
    }
    .btn.primary:hover {
      background: #0369a1;
    }
    .btn.active {
      background: #f59e0b;
      border-color: #fde047;
      color: #000000;
      font-weight: 700;
      box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
    }

    input[type="range"].horizontal-slider {
      -webkit-appearance: none;
      width: 100%;
      height: 6px;
      background: #334155;
      border-radius: 3px;
      outline: none;
    }
    input[type="range"].horizontal-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      background: #38bdf8;
      border-radius: 50%;
      cursor: pointer;
    }

    .time-badge {
      font-family: monospace;
      font-size: 13px;
      color: #38bdf8;
      background: rgba(15, 23, 42, 0.6);
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid rgba(56, 189, 248, 0.2);
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 20px;
    }
    .modal-overlay.open {
      display: flex;
    }
    .modal-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      max-width: 680px;
      width: 100%;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 12px;
    }
    .modal-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 22px;
      cursor: pointer;
    }
    .modal-content h3 {
      font-size: 15px;
      color: #38bdf8;
      margin: 16px 0 6px 0;
    }
    .modal-content p, .modal-content li {
      font-size: 13px;
      line-height: 1.6;
      color: #cbd5e1;
    }
    .modal-content ul {
      padding-left: 20px;
      margin-bottom: 10px;
    }
    .highlight-box {
      background: rgba(56, 189, 248, 0.1);
      border-left: 3px solid #38bdf8;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      margin: 12px 0;
      font-size: 13px;
    }
  </style>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body>

  <header>
    <div class="header-title-box">
      <span class="header-badge">중1 과학</span>
      <h1 class="header-title">지구의 자전과 천체의 일주 운동 3D 시뮬레이터</h1>
      <span class="header-sub">대한민국(북위 37°) 기준 · 수평면 고정 모델</span>
    </div>
    <div>
      <button class="guide-btn" onclick="toggleModal(true)">📖 교과서 핵심 원리 보기</button>
    </div>
  </header>

  <div class="sim-container">
    <!-- 왼쪽 화면 (우주 시점) -->
    <div class="viewport-box" id="space-viewport">
      <div class="view-tag">
        <div class="view-tag-title">
          <span class="tag-dot-blue"></span>
          우주 시점 (천구 밖 전지적 뷰)
        </div>
        <div class="view-tag-desc">북위 37° 수평면은 평평하게 유지 · 마우스 드래그로 360° 자유 회전</div>
      </div>

      <!-- 왼쪽 끝 확대/축소 슬라이더 -->
      <div class="fov-slider-bar fov-slider-left">
        <button class="fov-btn" onclick="adjustSpaceZoom(10)" title="화면 확대 (Zoom In)" aria-label="우주 시점 확대">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </button>
        <div class="fov-range-container">
          <input type="range" min="0" max="100" step="1" value="53" class="vertical-range" id="space-zoom-slider" oninput="updateSpaceZoom(this.value)" title="우주 시점 확대/축소" aria-label="우주 시점 확대 축소">
        </div>
        <button class="fov-btn" onclick="adjustSpaceZoom(-10)" title="화면 축소 (Zoom Out)" aria-label="우주 시점 축소">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </button>
      </div>

      <canvas id="space-canvas" class="viewport-canvas"></canvas>
    </div>

    <!-- 오른쪽 화면 (관측자 시점) -->
    <div class="viewport-box" id="obs-viewport">
      <div class="view-tag">
        <div class="view-tag-title">
          <span class="tag-dot-amber"></span>
          관측자 시점
        </div>
        <div class="view-tag-desc">북위 37° 지면에서 본 하늘 · 천체의 일주 운동: 동쪽 → 서쪽</div>
      </div>
      <div class="direction-hint-banner" id="direction-hint">
        <div style="font-weight: 700; color: #f59e0b; margin-bottom: 2px;">
          <span id="hint-dir-text">북쪽 하늘</span>
        </div>
        <div id="hint-desc-text" style="line-height: 1.5;">남쪽에서 북쪽을 바라봄<br>북극성(고도 37°)을 중심으로 반시계방향(시계 반대 방향)으로 회전</div>
      </div>

      <!-- 오른쪽 끝 확대/축소 슬라이더 -->
      <div class="fov-slider-bar fov-slider-right">
        <button class="fov-btn" onclick="adjustObsZoom(10)" title="화면 확대 (Zoom In)" aria-label="관측자 시점 확대">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </button>
        <div class="fov-range-container">
          <input type="range" min="0" max="100" step="1" value="42" class="vertical-range" id="obs-zoom-slider" oninput="updateObsZoom(this.value)" title="관측자 시점 확대/축소" aria-label="관측자 시점 확대 축소">
        </div>
        <button class="fov-btn" onclick="adjustObsZoom(-10)" title="화면 축소 (Zoom Out)" aria-label="관측자 시점 축소">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </button>
      </div>

      <canvas id="obs-canvas" class="viewport-canvas"></canvas>
    </div>
  </div>

  <!-- 하단 조작 UI 패널 -->
  <div class="controls-panel">
    <!-- 1. 시간 조절 (각도 표시 제거) -->
    <div class="control-group">
      <div class="control-label">
        <span>시간 흐름</span>
        <span class="time-badge" id="time-display">06:03</span>
      </div>
      <div class="control-row">
        <button class="btn primary" id="play-pause-btn" onclick="togglePlay()">⏸ 일시정지</button>
        <button class="btn" onclick="resetTime()">↺ 0시 리셋</button>
        <button class="btn" onclick="stepHour(-1)">-1시간</button>
        <button class="btn" onclick="stepHour(1)">+1시간</button>
      </div>
      <div class="control-row" style="margin-top: 4px;">
        <span style="font-size: 11px; color: #94a3b8; white-space: nowrap;">속도:</span>
        <input type="range" class="horizontal-slider" id="speed-slider" min="0.1" max="4.0" step="0.1" value="1.0" oninput="updateSpeed(this.value)">
        <span id="speed-label" style="font-size: 11px; color: #38bdf8; min-width: 38px;">1.0배</span>
      </div>
    </div>

    <!-- 2. 방위 조절 (지면 기준 동서남북 연동) -->
    <div class="control-group">
      <div class="control-label">
        <span>관측 방위 조절 (지면 기준 동서남북)</span>
        <span style="font-size: 10px; color: #f59e0b;">수평면 고정</span>
      </div>
      <div class="control-row">
        <button class="btn active" id="btn-dir-N" onclick="setDirection('N')">북쪽</button>
        <button class="btn" id="btn-dir-E" onclick="setDirection('E')">동쪽</button>
        <button class="btn" id="btn-dir-S" onclick="setDirection('S')">남쪽</button>
        <button class="btn" id="btn-dir-W" onclick="setDirection('W')">서쪽</button>
      </div>
    </div>

    <!-- 3. 고도 조절 -->
    <div class="control-group">
      <div class="control-label">
        <span>하늘 고도 조절 (올려다보기)</span>
        <span id="pitch-label" style="color: #38bdf8; font-size: 11px;">25°</span>
      </div>
      <input type="range" class="horizontal-slider" id="pitch-slider" min="0" max="80" step="1" value="25" oninput="updatePitch(this.value)">
      <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b;">
        <span>0° (지평선)</span>
        <span>45°</span>
        <span>80° (천정)</span>
      </div>
    </div>

    <!-- 4. 시각화 옵션 -->
    <div class="control-group">
      <div class="control-label">
        <span>시각화 도구</span>
      </div>
      <div class="control-row">
        <button class="btn active" id="trails-btn" onclick="toggleTrails()">✨ 궤적 켬</button>
        <button class="btn active" id="constellation-btn" onclick="toggleConstellations()">별자리선 켬</button>
        <button class="btn active" id="grid-btn" onclick="toggleGrid()">천구격자 켬</button>
      </div>
    </div>
  </div>

  <!-- 교과서 원리 안내 모달 -->
  <div class="modal-overlay" id="guide-modal" onclick="if(event.target === this) toggleModal(false)">
    <div class="modal-card">
      <div class="modal-header">
        <h2 style="font-size: 18px; color: #f8fafc;">중학교 1학년 과학: 지구의 자전과 천체의 일주 운동</h2>
        <button class="modal-close" onclick="toggleModal(false)">&times;</button>
      </div>
      <div class="modal-content">
        <div class="highlight-box">
          <strong>핵심 원리:</strong> 지구가 자전축을 중심으로 <strong>서쪽에서 동쪽으로</strong> 하루에 한 바퀴씩 자전하기 때문에, 지구 표면의 관측자가 볼 때는 하늘의 모든 별과 태양이 <strong>동쪽에서 서쪽으로</strong> 하루에 한 바퀴씩 회전하는 것처럼 보입니다(천체의 일주 운동).
        </div>

        <h3>1. 교과서 속 천구 모델 (수평면 고정 기준)</h3>
        <ul>
          <li><strong>수평면 (지평면):</strong> 관측자가 서 있는 지면을 평평한 원형 수평면으로 나타냅니다. 머리 꼭대기가 <strong>천정(Zenith)</strong>입니다.</li>
          <li><strong>자전축과 북극성 고도:</strong> 대한민국(북위 약 37°)에서는 천구의 북극(자전축 연장선)이 북쪽 지평선에서 <strong>37° 높이</strong>로 기울어져 있습니다. 따라서 북극성의 고도는 위도와 같은 37°입니다.</li>
          <li><strong>천구의 적도:</strong> 자전축에 수직이므로, 남쪽 지평선에서 최고 고도 <strong>53° (90° - 37°)</strong>로 남쪽을 향해 기울어져 있습니다.</li>
        </ul>

        <h3>2. 방위별 밤하늘의 일주 운동 (우리나라: 북위 37° 기준)</h3>
        <ul>
          <li><strong>동쪽 하늘 (서쪽에서 동쪽을 봄):</strong> 별과 태양이 지평선에서 <strong>오른쪽 위로 비스듬히</strong> 떠오릅니다.</li>
          <li><strong>남쪽 하늘 (북쪽에서 남쪽을 봄):</strong> 별들이 최고 고도(남중 53°)를 거친 후 <strong>지평선과 나란하게 오른쪽으로</strong> 이동합니다.</li>
          <li><strong>서쪽 하늘 (동쪽에서 서쪽을 봄):</strong> 별과 태양이 <strong>오른쪽 아래로 비스듬히</strong> 지평선 너머로 집니다.</li>
          <li><strong>북쪽 하늘 (남쪽에서 북쪽을 봄):</strong> 북극성(고도 약 37°)을 중심으로 모든 별이 <strong>시계 반대 방향(반시계 방향)</strong>으로 돕니다.</li>
        </ul>

        <div style="margin-top: 20px; text-align: right;">
          <button class="btn primary" onclick="toggleModal(false)">확인 및 탐구 계속하기</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const LATITUDE = 37.0;
    const LAT_RAD = THREE.MathUtils.degToRad(LATITUDE);

    // 태양의 일출(고도 0도) 시각 06:03(6.05h) 기준 시간 오프셋 계산
    const SUN_RISE_HOURS = 6 + 3 / 60; // 06:03 = 6.05h
    const SUN_RA_HOURS = 3.0;
    const SUN_DEC_DEG = 12.0;
    const cosLambdaRise = -Math.tan(THREE.MathUtils.degToRad(SUN_DEC_DEG)) * Math.tan(LAT_RAD);
    const lambdaRiseHours = (Math.acos(cosLambdaRise) / (2 * Math.PI)) * 24;
    const TIME_OFFSET_HOURS = SUN_RISE_HOURS + lambdaRiseHours - SUN_RA_HOURS;

    function createCelestialGridGeometry(radius) {
      const points = [];
      const latSteps = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75];
      const circleSegments = 72;

      for (let s = 0; s < latSteps.length; s++) {
        const latRad = THREE.MathUtils.degToRad(latSteps[s]);
        const r = radius * Math.cos(latRad);
        const y = radius * Math.sin(latRad);

        for (let i = 0; i < circleSegments; i++) {
          const a1 = (i / circleSegments) * Math.PI * 2;
          const a2 = ((i + 1) / circleSegments) * Math.PI * 2;
          points.push(r * Math.sin(a1), y, r * Math.cos(a1));
          points.push(r * Math.sin(a2), y, r * Math.cos(a2));
        }
      }

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

    const KEY_STARS = [
      { id: 'polaris', name: '북극성', ra: 2.5, dec: 89.4, color: '#fef08a', size: 3.2, isPolaris: true },
      { id: 'dubhe', name: '두베', ra: 11.06, dec: 61.75, color: '#fed7aa', size: 1.8 },
      { id: 'merak', name: '메라크', ra: 11.03, dec: 56.38, color: '#ffffff', size: 1.6 },
      { id: 'phecda', name: '페크다', ra: 11.9, dec: 53.69, color: '#ffffff', size: 1.6 },
      { id: 'megrez', name: '메그레즈', ra: 12.25, dec: 57.03, color: '#e2e8f0', size: 1.5 },
      { id: 'alioth', name: '알리오스', ra: 12.9, dec: 55.96, color: '#ffffff', size: 1.8 },
      { id: 'mizar', name: '미자르', ra: 13.4, dec: 54.92, color: '#ffffff', size: 1.6 },
      { id: 'alkaid', name: '알카이드', ra: 13.8, dec: 49.31, color: '#bfdbfe', size: 1.8 },
      { id: 'schedar', name: '셰다르', ra: 0.67, dec: 56.54, color: '#fed7aa', size: 1.7 },
      { id: 'caph', name: '카프', ra: 0.15, dec: 59.15, color: '#f8fafc', size: 1.7 },
      { id: 'gamma_cas', name: '감마 카시오페이아', ra: 0.94, dec: 60.72, color: '#bfdbfe', size: 1.7 },
      { id: 'ruchbah', name: '루크바', ra: 1.43, dec: 60.23, color: '#f8fafc', size: 1.6 },
      { id: 'segin', name: '세긴', ra: 1.9, dec: 63.67, color: '#bfdbfe', size: 1.5 },
      { id: 'vega', name: '직녀성', ra: 18.62, dec: 38.78, color: '#dbeafe', size: 2.3 },
      { id: 'altair', name: '견우성', ra: 19.84, dec: 8.87, color: '#ffffff', size: 2.1 },
      { id: 'deneb', name: '데네브', ra: 20.69, dec: 45.28, color: '#e0f2fe', size: 2.1 },
      { id: 'betelgeuse', name: '베텔게우스', ra: 5.92, dec: 7.41, color: '#f87171', size: 2.3 },
      { id: 'rigel', name: '리겔', ra: 5.24, dec: -8.2, color: '#93c5fd', size: 2.3 },
      { id: 'bellatrix', name: '벨라트릭스', ra: 5.42, dec: 6.35, color: '#bfdbfe', size: 1.8 },
      { id: 'saiph', name: '사이프', ra: 5.79, dec: -9.67, color: '#bfdbfe', size: 1.7 },
      { id: 'alnitak', name: '알니탁', ra: 5.68, dec: -1.94, color: '#bfdbfe', size: 1.7 },
      { id: 'alnilam', name: '알닐람', ra: 5.6, dec: -1.2, color: '#bfdbfe', size: 1.7 },
      { id: 'mintaka', name: '민타카', ra: 5.53, dec: -0.3, color: '#bfdbfe', size: 1.6 },
      { id: 'sirius', name: '시리우스', ra: 6.75, dec: -16.72, color: '#60a5fa', size: 2.5 },
      { id: 'arcturus', name: '아크투루스', ra: 14.26, dec: 19.18, color: '#fb923c', size: 2.3 },
      { id: 'sun', name: '태양', ra: 3.0, dec: 12.0, color: '#fbbf24', size: 5.0, isSun: true }
    ];

    const CONSTELLATION_EDGES = [
      ['dubhe', 'merak'], ['merak', 'phecda'], ['phecda', 'megrez'],
      ['megrez', 'dubhe'], ['megrez', 'alioth'], ['alioth', 'mizar'], ['mizar', 'alkaid'],
      ['dubhe', 'polaris'],
      ['caph', 'schedar'], ['schedar', 'gamma_cas'], ['gamma_cas', 'ruchbah'], ['ruchbah', 'segin'],
      ['vega', 'deneb'], ['deneb', 'altair'], ['altair', 'vega'],
      ['betelgeuse', 'bellatrix'], ['bellatrix', 'mintaka'], ['mintaka', 'alnilam'],
      ['alnilam', 'alnitak'], ['alnitak', 'saiph'], ['saiph', 'rigel'], ['rigel', 'mintaka'],
      ['betelgeuse', 'alnitak']
    ];

    function createStarSprite() {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 64;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
      grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    }

    function createSunSprite() {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 128;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 128, 128);
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, '#fef08a');
      grad.addColorStop(0.5, '#f59e0b');
      grad.addColorStop(0.8, '#ea580c');
      grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }

    function createGroundTexture() {
      const c = document.createElement('canvas');
      c.width = 1024; c.height = 1024;
      const ctx = c.getContext('2d');
      const cx = 512, cy = 512, rad = 490;

      const bg = ctx.createRadialGradient(cx, cy, 50, cx, cy, rad);
      bg.addColorStop(0, '#111827');
      bg.addColorStop(0.8, '#0b1329');
      bg.addColorStop(1, '#030712');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI*2); ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, 30); ctx.lineTo(cx, 994);
      ctx.moveTo(30, cy); ctx.lineTo(994, cy);
      ctx.stroke();

      ctx.font = 'bold 50px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ef4444'; ctx.fillText('북', cx, 80);
      ctx.fillStyle = '#38bdf8'; ctx.fillText('남', cx, 944);
      ctx.fillStyle = '#f59e0b'; ctx.fillText('동', 944, cy);
      ctx.fillStyle = '#10b981'; ctx.fillText('서', 80, cy);

      return new THREE.CanvasTexture(c);
    }

    function makeTextSprite(message, color = '#ffffff', fontSize = 42, worldHeight = 0.85) {
      const measureCanvas = document.createElement('canvas');
      const measureCtx = measureCanvas.getContext('2d');
      const font = 'bold ' + fontSize + 'px sans-serif';
      measureCtx.font = font;
      const textMetrics = measureCtx.measureText(message);
      const textWidth = Math.ceil(textMetrics.width);

      const padX = 36;
      const padY = 22;
      const canvasWidth = Math.max(160, textWidth + padX * 2);
      const canvasHeight = Math.max(76, fontSize + padY * 2);

      const c = document.createElement('canvas');
      c.width = canvasWidth;
      c.height = canvasHeight;
      const ctx = c.getContext('2d');

      const r = 12;
      const bx = 4, by = 4, bw = canvasWidth - 8, bh = canvasHeight - 8;
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

      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(message, canvasWidth / 2, canvasHeight / 2);

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: true
      }));
      sprite.renderOrder = 4; // 텍스트 라벨 우선순위 4
      const aspect = canvasWidth / canvasHeight;
      sprite.scale.set(worldHeight * aspect, worldHeight, 1);
      return sprite;
    }

    const spaceCanvas = document.getElementById('space-canvas');
    const obsCanvas = document.getElementById('obs-canvas');

    const spaceRenderer = new THREE.WebGLRenderer({ canvas: spaceCanvas, antialias: true });
    const obsRenderer = new THREE.WebGLRenderer({ canvas: obsCanvas, antialias: true });
    spaceRenderer.setPixelRatio(window.devicePixelRatio);
    obsRenderer.setPixelRatio(window.devicePixelRatio);

    const spaceScene = new THREE.Scene();
    spaceScene.background = new THREE.Color(0x020617);
    const obsScene = new THREE.Scene();
    obsScene.background = new THREE.Color(0x020617);

    const SPACE_CAM_DIST = 14.5;
    const SPACE_CAM_HEIGHT = 4.2;

    const SPACE_MIN_FOV = 20; // 줌 100% (최대 확대)
    const SPACE_MAX_FOV = 75; // 줌 0% (최대 축소)
    const OBS_MIN_FOV = 30;   // 줌 100% (최대 확대)
    const OBS_MAX_FOV = 90;   // 줌 0% (최대 축소)

    let spaceZoom = 53;
    let obsZoom = 42;

    const spaceCamera = new THREE.PerspectiveCamera(SPACE_MAX_FOV - (spaceZoom / 100) * (SPACE_MAX_FOV - SPACE_MIN_FOV), 1, 0.1, 200);
    spaceCamera.position.set(0, SPACE_CAM_HEIGHT, SPACE_CAM_DIST);

    const obsCamera = new THREE.PerspectiveCamera(OBS_MAX_FOV - (obsZoom / 100) * (OBS_MAX_FOV - OBS_MIN_FOV), 1, 0.1, 200);
    obsCamera.position.set(0, 0.5, 0);

    const spaceControls = new THREE.OrbitControls(spaceCamera, spaceCanvas);
    spaceControls.enableDamping = true;
    spaceControls.dampingFactor = 0.05;
    spaceControls.minDistance = 7;
    spaceControls.maxDistance = 35;
    spaceControls.target.set(0, 0.4, 0);

    spaceScene.add(new THREE.AmbientLight(0xffffff, 0.9));
    obsScene.add(new THREE.AmbientLight(0xffffff, 1.0));

    const celestialRadius = 6.2;
    const groundRadius = 3.2;

    const spaceGround = new THREE.Mesh(
      new THREE.CircleGeometry(groundRadius, 64),
      new THREE.MeshBasicMaterial({ map: createGroundTexture(), side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false, depthTest: true })
    );
    spaceGround.renderOrder = 1;
    spaceGround.rotation.x = -Math.PI / 2;
    spaceScene.add(spaceGround);

    const observerGroup = new THREE.Group();
    spaceScene.add(observerGroup);

    const obsPin = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 16), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    obsPin.position.y = 0.22;
    observerGroup.add(obsPin);

    const gazeArrow = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 16), new THREE.MeshBasicMaterial({ color: 0xfde047 }));
    gazeArrow.position.set(0, 0.15, -0.9);
    gazeArrow.rotation.x = -Math.PI / 2;
    observerGroup.add(gazeArrow);

    const zenithLabel = makeTextSprite('천정', '#a855f7', 44, 0.75);
    zenithLabel.position.set(0, celestialRadius + 0.45, 0);
    spaceScene.add(zenithLabel);

    // ============================================================
    // 천구 격자 및 반투명 가림막 구체 (Occlusion Sphere)
    // 렌더링 순서 명시적 분리:
    // 1. 가림막 구체(occlusionSphere): renderOrder = 1, 항상 켜짐 (visible = true 유지)
    //    - side: THREE.FrontSide, transparent: true, opacity: 0.35, depthWrite: false, depthTest: true
    // 2. 위도·경도 격자선: renderOrder = 2, [천구격자 켬/끔] 버튼으로 독립 토글
    //    - depthWrite: false, depthTest: true
    // ============================================================
    const occlusionSphere = new THREE.Mesh(
      new THREE.SphereGeometry(celestialRadius * 0.995, 36, 18),
      new THREE.MeshBasicMaterial({
        color: 0x020617,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        depthTest: true
      })
    );
    occlusionSphere.renderOrder = 1;
    occlusionSphere.visible = true;
    spaceScene.add(occlusionSphere);

    // 위도·경도 격자선 (대각선 없는 순수 가로/세로 바둑판 격자)
    const spaceCelestialSphere = new THREE.LineSegments(
      createCelestialGridGeometry(celestialRadius),
      new THREE.LineBasicMaterial({
        color: 0x3a6b8c,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        depthTest: true
      })
    );
    spaceCelestialSphere.renderOrder = 2;
    spaceCelestialSphere.visible = true;
    spaceScene.add(spaceCelestialSphere);

    const spaceCelestialTiltGroup = new THREE.Group();
    spaceCelestialTiltGroup.rotation.x = -(Math.PI / 2 - LAT_RAD);
    spaceScene.add(spaceCelestialTiltGroup);

    const axisMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, celestialRadius * 2.3, 16),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    spaceCelestialTiltGroup.add(axisMesh);

    // 천구의 적도선 (equator: renderOrder = 2)
    const eqRing = new THREE.Mesh(
      new THREE.RingGeometry(celestialRadius - 0.05, celestialRadius + 0.05, 72),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        depthTest: true
      })
    );
    eqRing.renderOrder = 2;
    eqRing.rotation.x = Math.PI / 2;
    spaceCelestialTiltGroup.add(eqRing);

    const eqLabel = makeTextSprite('천구 적도 (남중 고도 53°)', '#38bdf8', 38, 0.75);
    eqLabel.position.set(0, 0, celestialRadius + 0.4);
    spaceCelestialTiltGroup.add(eqLabel);

    const spaceDiurnalGroup = new THREE.Group();
    spaceCelestialTiltGroup.add(spaceDiurnalGroup);

    const obsGround = new THREE.Mesh(
      new THREE.CircleGeometry(12, 64),
      new THREE.MeshBasicMaterial({ map: createGroundTexture(), side: THREE.DoubleSide })
    );
    obsGround.rotation.x = -Math.PI / 2;
    obsGround.position.y = -0.05;
    obsScene.add(obsGround);

    const labelN = makeTextSprite('북', '#ef4444', 48, 1.1); labelN.position.set(0, 0.6, -9.5); obsScene.add(labelN);
    const labelS = makeTextSprite('남', '#38bdf8', 48, 1.1); labelS.position.set(0, 0.6, 9.5); obsScene.add(labelS);
    const labelE = makeTextSprite('동', '#f59e0b', 48, 1.1); labelE.position.set(9.5, 0.6, 0); obsScene.add(labelE);
    const labelW = makeTextSprite('서', '#10b981', 48, 1.1); labelW.position.set(-9.5, 0.6, 0); obsScene.add(labelW);

    const obsCelestialTiltGroup = new THREE.Group();
    obsCelestialTiltGroup.rotation.x = -(Math.PI / 2 - LAT_RAD);
    obsScene.add(obsCelestialTiltGroup);

    const obsDiurnalGroup = new THREE.Group();
    obsCelestialTiltGroup.add(obsDiurnalGroup);

    const starSpriteTex = createStarSprite();
    const sunSpriteTex = createSunSprite();
    const obsSkyRadius = 15.5;

    function celestialToVec3(raHours, decDeg, radius) {
      const raRad = (raHours / 24) * Math.PI * 2;
      const decRad = THREE.MathUtils.degToRad(decDeg);
      const cosDec = Math.cos(decRad);
      return new THREE.Vector3(
        radius * cosDec * Math.sin(raRad),
        radius * Math.sin(decRad),
        radius * cosDec * Math.cos(raRad)
      );
    }

    KEY_STARS.forEach(s => {
      const pS = celestialToVec3(s.ra, s.dec, celestialRadius);
      const matS = new THREE.SpriteMaterial({
        map: s.isSun ? sunSpriteTex : starSpriteTex,
        color: new THREE.Color(s.color),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true
      });
      const sprS = new THREE.Sprite(matS);
      sprS.renderOrder = 3; // 별, 태양: renderOrder = 3
      sprS.position.copy(pS);
      const scaleS = s.size * (s.isSun ? 0.75 : s.isPolaris ? 0.65 : 0.35);
      sprS.scale.set(scaleS, scaleS, 1);
      spaceDiurnalGroup.add(sprS);

      const pO = celestialToVec3(s.ra, s.dec, obsSkyRadius);
      const sprO = new THREE.Sprite(matS.clone());
      sprO.renderOrder = 3;
      sprO.position.copy(pO);
      const scaleO = s.size * (s.isSun ? 0.95 : s.isPolaris ? 0.8 : 0.45);
      sprO.scale.set(scaleO, scaleO, 1);
      obsDiurnalGroup.add(sprO);

      if (s.isPolaris) {
        const lblS = makeTextSprite('★ 북극성 (고도 37°)', '#fef08a', 40, 0.65);
        lblS.position.copy(pS).add(new THREE.Vector3(0, 0.45, 0));
        spaceDiurnalGroup.add(lblS);

        const lblO = makeTextSprite('★ 북극성 (고도 37°)', '#fef08a', 42, 0.95);
        lblO.position.copy(pO).add(new THREE.Vector3(0, 0.8, 0));
        obsDiurnalGroup.add(lblO);
      } else if (s.isSun) {
        const lblS = makeTextSprite('☀ 태양', '#fbbf24', 40, 0.65);
        lblS.position.copy(pS).add(new THREE.Vector3(0, 0.55, 0));
        spaceDiurnalGroup.add(lblS);

        const lblO = makeTextSprite('☀ 태양', '#fbbf24', 42, 0.95);
        lblO.position.copy(pO).add(new THREE.Vector3(0, 1.25, 0));
        obsDiurnalGroup.add(lblO);
      }
    });

    const bgStarGeomS = new THREE.BufferGeometry();
    const bgStarGeomO = new THREE.BufferGeometry();
    const posS = [], posO = [], cols = [];
    const allBgStars = [];
    for (let i = 0; i < 350; i++) {
      const u = Math.random(), v = Math.random();
      const ra = u * 24;
      const dec = (Math.asin(2 * v - 1) * 180) / Math.PI;
      const pS = celestialToVec3(ra, dec, celestialRadius);
      const pO = celestialToVec3(ra, dec, obsSkyRadius);
      posS.push(pS.x, pS.y, pS.z);
      posO.push(pO.x, pO.y, pO.z);
      const isGold = Math.random() > 0.8;
      const col = isGold ? [1, 0.9, 0.6] : [0.9, 0.95, 1];
      cols.push(...col);
      allBgStars.push({ ra, dec, color: isGold ? '#fef08a' : '#bfdbfe' });
    }
    bgStarGeomS.setAttribute('position', new THREE.Float32BufferAttribute(posS, 3));
    bgStarGeomS.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const bgPointsS = new THREE.Points(bgStarGeomS, new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    }));
    bgPointsS.renderOrder = 3;
    spaceDiurnalGroup.add(bgPointsS);

    bgStarGeomO.setAttribute('position', new THREE.Float32BufferAttribute(posO, 3));
    bgStarGeomO.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const bgPointsO = new THREE.Points(bgStarGeomO, new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    }));
    bgPointsO.renderOrder = 3;
    obsDiurnalGroup.add(bgPointsO);

    const constelGroupS = new THREE.Group();
    const constelGroupO = new THREE.Group();
    CONSTELLATION_EDGES.forEach(([id1, id2]) => {
      const s1 = KEY_STARS.find(s => s.id === id1);
      const s2 = KEY_STARS.find(s => s.id === id2);
      if (s1 && s2) {
        const p1S = celestialToVec3(s1.ra, s1.dec, celestialRadius * 0.995);
        const p2S = celestialToVec3(s2.ra, s2.dec, celestialRadius * 0.995);
        const gS = new THREE.BufferGeometry().setFromPoints([p1S, p2S]);
        const lineS = new THREE.Line(gS, new THREE.LineBasicMaterial({
          color: (id2 === 'polaris') ? 0xf59e0b : 0x38bdf8,
          opacity: 0.6,
          transparent: true,
          depthWrite: false,
          depthTest: true
        }));
        lineS.renderOrder = 3;
        constelGroupS.add(lineS);

        const p1O = celestialToVec3(s1.ra, s1.dec, obsSkyRadius * 0.995);
        const p2O = celestialToVec3(s2.ra, s2.dec, obsSkyRadius * 0.995);
        const gO = new THREE.BufferGeometry().setFromPoints([p1O, p2O]);
        const lineO = new THREE.Line(gO, new THREE.LineBasicMaterial({
          color: (id2 === 'polaris') ? 0xf59e0b : 0x38bdf8,
          opacity: 0.55,
          transparent: true,
          depthWrite: false,
          depthTest: true
        }));
        lineO.renderOrder = 3;
        constelGroupO.add(lineO);
      }
    });
    spaceDiurnalGroup.add(constelGroupS);
    obsDiurnalGroup.add(constelGroupO);

    // ============================================================
    // 다이내믹 트레일 시스템 (단일 BufferGeometry + LineSegments + ShaderMaterial)
    // 1.5시간(22.5°) 장노출 효과, 100% 불투명 헤드 -> 0% 페이드아웃 꼬리
    // renderOrder = 3
    // ============================================================
    const allTrailStars = [
      ...KEY_STARS.map(s => ({ ra: s.ra, dec: s.dec, color: s.color, isSun: s.isSun, isPolaris: s.isPolaris })),
      ...allBgStars.map(s => ({ ra: s.ra, dec: s.dec, color: s.color }))
    ];

    function createDynamicTrailSystem(stars, radius, segmentsPerStar) {
      segmentsPerStar = segmentsPerStar || 16;
      const totalStars = stars.length;
      const totalSegments = totalStars * segmentsPerStar;
      const totalVertices = totalSegments * 2;

      const positions = new Float32Array(totalVertices * 3);
      const colors = new Float32Array(totalVertices * 4);

      let colIdx = 0;
      for (let s = 0; s < totalStars; s++) {
        const star = stars[s];
        let r, g, b;
        if (star.isSun) {
          r = 1.0; g = 0.85; b = 0.25;
        } else if (star.isPolaris) {
          r = 1.0; g = 0.95; b = 0.55;
        } else {
          const c = new THREE.Color(star.color);
          r = c.r; g = c.g; b = c.b;
        }

        for (let k = 0; k < segmentsPerStar; k++) {
          const t1 = k / segmentsPerStar;
          const t2 = (k + 1) / segmentsPerStar;
          const a1 = Math.pow(Math.max(0, 1.0 - t1), 1.25);
          const a2 = Math.pow(Math.max(0, 1.0 - t2), 1.25);

          colors[colIdx++] = r; colors[colIdx++] = g; colors[colIdx++] = b; colors[colIdx++] = a1;
          colors[colIdx++] = r; colors[colIdx++] = g; colors[colIdx++] = b; colors[colIdx++] = a2;
        }
      }

      const geometry = new THREE.BufferGeometry();
      const posAttr = new THREE.BufferAttribute(positions, 3);
      const colorAttr = new THREE.BufferAttribute(colors, 4);
      geometry.setAttribute('position', posAttr);
      geometry.setAttribute('aColor', colorAttr);

      const material = new THREE.ShaderMaterial({
        vertexShader: \`
          attribute vec4 aColor;
          varying vec4 vColor;
          void main() {
            vColor = aColor;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        \`,
        fragmentShader: \`
          varying vec4 vColor;
          void main() {
            gl_FragColor = vColor;
          }
        \`,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending
      });

      const mesh = new THREE.LineSegments(geometry, material);
      mesh.renderOrder = 3;

      function update(trailDurationHours) {
        const maxHours = 1.5;
        const clampedHours = Math.max(0, Math.min(maxHours, trailDurationHours));
        const trailAngleRad = (clampedHours / 24) * Math.PI * 2;

        let posIdx = 0;
        for (let s = 0; s < totalStars; s++) {
          const star = stars[s];
          const raRad = (star.ra / 24) * Math.PI * 2;
          const decRad = THREE.MathUtils.degToRad(star.dec);
          const cosDec = Math.cos(decRad);
          const sinDec = Math.sin(decRad);
          const rCircle = radius * cosDec;
          const yVal = radius * sinDec;

          for (let k = 0; k < segmentsPerStar; k++) {
            const t1 = k / segmentsPerStar;
            const t2 = (k + 1) / segmentsPerStar;
            const angle1 = raRad + t1 * trailAngleRad;
            const angle2 = raRad + t2 * trailAngleRad;

            positions[posIdx++] = rCircle * Math.sin(angle1);
            positions[posIdx++] = yVal;
            positions[posIdx++] = rCircle * Math.cos(angle1);

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

      update(1.5);

      return { mesh, update, clear };
    }

    const spaceTrailSys = createDynamicTrailSystem(allTrailStars, celestialRadius, 16);
    spaceDiurnalGroup.add(spaceTrailSys.mesh);

    const obsTrailSys = createDynamicTrailSystem(allTrailStars, obsSkyRadius, 16);
    obsDiurnalGroup.add(obsTrailSys.mesh);

    let isPlaying = true;
    let timeHours = 6.05;
    let speedMultiplier = 1.0;
    let targetYaw = 0;
    let currentYaw = 0;
    let currentPitch = THREE.MathUtils.degToRad(25);
    let targetPitch = THREE.MathUtils.degToRad(25);

    const DIR_DATA = {
      E: { yaw: -Math.PI / 2, hintTitle: '동쪽 하늘', hintDesc: '서쪽에서 동쪽을 바라봄<br>별과 태양이 지평선에서 오른쪽 위로 비스듬히 떠오름 (동→서 일주 운동)', spaceCam: { x: -SPACE_CAM_DIST, y: SPACE_CAM_HEIGHT, z: 0 } },
      S: { yaw: Math.PI, hintTitle: '남쪽 하늘', hintDesc: '북쪽에서 남쪽을 바라봄<br>별들이 최고 고도(남중 53°)를 거쳐 지평선과 평행하게 오른쪽으로 이동', spaceCam: { x: 0, y: SPACE_CAM_HEIGHT, z: -SPACE_CAM_DIST } },
      W: { yaw: Math.PI / 2, hintTitle: '서쪽 하늘', hintDesc: '동쪽에서 서쪽을 바라봄<br>별과 태양이 오른쪽 아래로 비스듬히 지평선 아래로 짐', spaceCam: { x: SPACE_CAM_DIST, y: SPACE_CAM_HEIGHT, z: 0 } },
      N: { yaw: 0, hintTitle: '북쪽 하늘', hintDesc: '남쪽에서 북쪽을 바라봄<br>북극성(고도 37°)을 중심으로 반시계방향(시계 반대 방향)으로 회전', spaceCam: { x: 0, y: SPACE_CAM_HEIGHT, z: SPACE_CAM_DIST } }
    };

    function updateCameraObserver() {
      currentYaw += (targetYaw - currentYaw) * 0.08;
      currentPitch += (targetPitch - currentPitch) * 0.08;

      const cosP = Math.cos(currentPitch);
      const sinP = Math.sin(currentPitch);
      const lookDir = new THREE.Vector3(
        -Math.sin(currentYaw) * cosP,
        sinP,
        -Math.cos(currentYaw) * cosP
      );

      obsCamera.lookAt(obsCamera.position.clone().add(lookDir));
      gazeArrow.parent.rotation.y = currentYaw;
    }

    let spaceCamTargetPos = { x: 0, y: SPACE_CAM_HEIGHT, z: SPACE_CAM_DIST };

    function setDirection(dir) {
      ['N', 'E', 'S', 'W'].forEach(d => {
        document.getElementById('btn-dir-' + d).classList.toggle('active', d === dir);
      });
      const dInfo = DIR_DATA[dir];
      targetYaw = dInfo.yaw;
      document.getElementById('hint-dir-text').innerText = dInfo.hintTitle;
      document.getElementById('hint-desc-text').innerHTML = dInfo.hintDesc;
      spaceCamTargetPos = { ...dInfo.spaceCam };
    }

    /* 확대/축소 제어 함수 (+로 올릴수록 FOV가 줄어들어 확대됨) */
    function updateSpaceZoom(val) {
      spaceZoom = Math.max(0, Math.min(100, parseFloat(val)));
      const fov = SPACE_MAX_FOV - (spaceZoom / 100) * (SPACE_MAX_FOV - SPACE_MIN_FOV);
      spaceCamera.fov = fov;
      spaceCamera.updateProjectionMatrix();
      document.getElementById('space-zoom-slider').value = spaceZoom;
    }

    function adjustSpaceZoom(delta) {
      updateSpaceZoom(spaceZoom + delta);
    }

    function updateObsZoom(val) {
      obsZoom = Math.max(0, Math.min(100, parseFloat(val)));
      const fov = OBS_MAX_FOV - (obsZoom / 100) * (OBS_MAX_FOV - OBS_MIN_FOV);
      obsCamera.fov = fov;
      obsCamera.updateProjectionMatrix();
      document.getElementById('obs-zoom-slider').value = obsZoom;
    }

    function adjustObsZoom(delta) {
      updateObsZoom(obsZoom + delta);
    }

    function togglePlay() {
      isPlaying = !isPlaying;
      document.getElementById('play-pause-btn').innerText = isPlaying ? '⏸ 일시정지' : '▶ 재생';
    }

    let showTrails = true;
    let trailDurationHours = 1.5;

    function resetTime() {
      timeHours = 0;
      updateTimeDisplay();
      if (showTrails) {
        trailDurationHours = 0;
        spaceTrailSys.update(0);
        obsTrailSys.update(0);
      }
    }

    function stepHour(delta) {
      timeHours = (timeHours + delta + 24) % 24;
      updateTimeDisplay();
      if (showTrails && trailDurationHours < 1.5) {
        trailDurationHours = Math.min(1.5, trailDurationHours + 0.5);
        spaceTrailSys.update(trailDurationHours);
        obsTrailSys.update(trailDurationHours);
      }
    }

    function updateSpeed(val) {
      speedMultiplier = parseFloat(val);
      document.getElementById('speed-label').innerText = speedMultiplier.toFixed(1) + '배';
    }

    function updatePitch(val) {
      const p = parseFloat(val);
      targetPitch = THREE.MathUtils.degToRad(p);
      document.getElementById('pitch-label').innerText = p + '°';
    }

    function toggleTrails() {
      showTrails = !showTrails;
      if (showTrails) {
        trailDurationHours = 0;
        spaceTrailSys.update(0);
        obsTrailSys.update(0);
      } else {
        trailDurationHours = 0;
        spaceTrailSys.clear();
        obsTrailSys.clear();
      }
      const btn = document.getElementById('trails-btn');
      btn.classList.toggle('active', showTrails);
      btn.innerText = showTrails ? '✨ 궤적 켬' : '✨ 궤적 끔';
    }

    function toggleConstellations() {
      constelGroupS.visible = !constelGroupS.visible;
      constelGroupO.visible = !constelGroupO.visible;
      const btn = document.getElementById('constellation-btn');
      btn.classList.toggle('active', constelGroupS.visible);
      btn.innerText = constelGroupS.visible ? '별자리선 켬' : '별자리선 끔';
    }

    let showGrid = true;
    function toggleGrid() {
      showGrid = !showGrid;
      spaceCelestialSphere.visible = showGrid;
      const btn = document.getElementById('grid-btn');
      btn.classList.toggle('active', showGrid);
      btn.innerText = showGrid ? '천구격자 켬' : '천구격자 끔';
    }

    function toggleModal(show) {
      document.getElementById('guide-modal').classList.toggle('open', show);
    }

    function updateTimeDisplay() {
      const normH = ((timeHours % 24) + 24) % 24;
      const totalM = Math.round(normH * 60) % (24 * 60);
      const h = Math.floor(totalM / 60);
      const m = totalM % 60;
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      document.getElementById('time-display').innerText = \`\${hh}:\${mm}\`;
    }

    let lastTime = performance.now();

    function animate(now) {
      requestAnimationFrame(animate);
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying) {
        timeHours = (timeHours + dt * speedMultiplier) % 24;
        updateTimeDisplay();

        if (showTrails) {
          if (trailDurationHours < 1.5) {
            trailDurationHours = Math.min(1.5, trailDurationHours + dt * speedMultiplier);
          }
          spaceTrailSys.update(trailDurationHours);
          obsTrailSys.update(trailDurationHours);
        }
      } else if (showTrails) {
        spaceTrailSys.update(trailDurationHours);
        obsTrailSys.update(trailDurationHours);
      }

      // 회전 방향: 동에서 떠서 서로 지도록 -rotationAngle 적용 (일출 06:03 오프셋 동기화)
      const rotationAngle = (((timeHours - TIME_OFFSET_HOURS) % 24 + 24) % 24 / 24) * Math.PI * 2;
      const diurnalAngle = -rotationAngle;

      spaceDiurnalGroup.rotation.y = diurnalAngle;
      obsDiurnalGroup.rotation.y = diurnalAngle;

      spaceCamera.position.x += (spaceCamTargetPos.x - spaceCamera.position.x) * 0.05;
      spaceCamera.position.y += (spaceCamTargetPos.y - spaceCamera.position.y) * 0.05;
      spaceCamera.position.z += (spaceCamTargetPos.z - spaceCamera.position.z) * 0.05;

      spaceControls.update();
      updateCameraObserver();

      spaceRenderer.render(spaceScene, spaceCamera);
      obsRenderer.render(obsScene, obsCamera);
    }

    function handleResize() {
      const sw = spaceCanvas.parentElement.clientWidth;
      const sh = spaceCanvas.parentElement.clientHeight;
      if (sw > 0 && sh > 0) {
        spaceCamera.aspect = sw / sh;
        spaceCamera.updateProjectionMatrix();
        spaceRenderer.setSize(sw, sh);
      }
      const ow = obsCanvas.parentElement.clientWidth;
      const oh = obsCanvas.parentElement.clientHeight;
      if (ow > 0 && oh > 0) {
        obsCamera.aspect = ow / oh;
        obsCamera.updateProjectionMatrix();
        obsRenderer.setSize(ow, oh);
      }
    }

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);

    setDirection('N');
    updateTimeDisplay();
    requestAnimationFrame(animate);
  </script>
</body>
</html>`;
}
