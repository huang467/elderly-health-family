<template>
  <div class="fall-detection">
    <AppHeader title="跌倒检测" />
    <FamilyNav />

    <main class="container">
      <section class="camera-panel" :class="currentFrame.status">
        <div class="camera-header">
          <div>
            <h2>电脑摄像头</h2>
            <p>{{ cameraStatusText }} · {{ engineStatusText }}</p>
          </div>
          <div class="camera-status" :class="{ active: isMonitoring }">
            <span class="status-dot"></span>
            {{ isMonitoring ? '监测中' : '已暂停' }}
          </div>
        </div>

        <div class="camera-feed">
          <video ref="videoRef" autoplay muted playsinline></video>
          <canvas ref="captureCanvas" class="capture-canvas"></canvas>
          <div class="video-placeholder" v-if="!hasCameraStream">
            <IconSvg name="eye" :size="44" />
            <p>{{ cameraError || '摄像头未启动' }}</p>
          </div>
          <div class="scan-line" v-if="isMonitoring"></div>
          <div class="detect-box" :class="currentFrame.status" :style="detectBoxStyle">
            <span>{{ currentFrame.label }}</span>
          </div>
          <div class="feed-overlay">
            <span>{{ currentFrame.cameraId }}</span>
            <span>{{ currentFrame.time }}</span>
          </div>
        </div>

        <div class="control-row">
          <button class="control-btn primary" @click="toggleMonitor">
            <IconSvg :name="isMonitoring ? 'x-circle' : 'eye'" :size="18" />
            {{ isMonitoring ? '停止检测' : '启动检测' }}
          </button>
          <button class="control-btn danger" @click="triggerCameraFall">
            <IconSvg name="alert-triangle" :size="18" />
            触发跌倒事件
          </button>
          <button class="control-btn outline" @click="sampleNormal">
            <IconSvg name="refresh-cw" :size="18" />
            正常采样
          </button>
        </div>

        <div class="edge-transfer" v-if="latestFallSnapshot">
          <div class="edge-transfer__image">
            <img :src="latestFallSnapshot.snapshotUrl" alt="跌倒瞬间影像" />
            <span>仅事件上传</span>
          </div>
          <div class="edge-transfer__info">
            <span>亲属端已接收</span>
            <strong>跌倒瞬间关键帧</strong>
            <p>边缘端平时只保留本地检测结果，确认高危跌倒后上传这一帧影像。</p>
            <small>{{ latestFallSnapshot.transmittedAt }} · {{ latestFallSnapshot.cameraId }}</small>
          </div>
        </div>
      </section>

      <section class="metrics-grid">
        <div class="metric-card" :class="riskClass">
          <span class="metric-label">当前状态</span>
          <strong>{{ statusText }}</strong>
          <small>{{ statusDesc }}</small>
        </div>
        <div class="metric-card">
          <span class="metric-label">身体角度</span>
          <strong>{{ currentFrame.bodyAngle }}°</strong>
          <small>低角度伴随快速下落会触发高危预警</small>
        </div>
        <div class="metric-card">
          <span class="metric-label">运动速度</span>
          <strong>{{ currentFrame.velocity }} m/s</strong>
          <small>人体关键点位移速度</small>
        </div>
        <div class="metric-card">
          <span class="metric-label">识别置信度</span>
          <strong>{{ confidencePercent }}%</strong>
          <small>当前检测可信度</small>
        </div>
      </section>

      <section class="privacy-panel" :class="privacyFrame.status">
        <div class="privacy-info">
          <div class="privacy-icon">
            <IconSvg name="wifi" :size="26" />
          </div>
          <div>
            <h2>浴室隐私区域</h2>
            <p>无画面感知已接入，适用于浴室等不宜安装摄像头的空间</p>
          </div>
        </div>
        <div class="privacy-status">
          <strong>{{ privacyStatusText }}</strong>
          <span>{{ privacyFrame.time }}</span>
        </div>
      </section>

      <section class="event-section">
        <div class="section-header">
          <h2>
            <IconSvg name="clock" :size="22" />
            检测事件
          </h2>
          <button class="text-btn" @click="clearEvents">清空</button>
        </div>

        <div class="event-list" v-if="events.length > 0">
          <article v-for="event in events" :key="event.id" class="event-item" :class="event.status">
            <div class="event-icon">
              <IconSvg :name="event.status === 'fall' ? 'alert-circle' : event.source === 'privacy' ? 'wifi' : 'activity'" :size="20" />
            </div>
            <div class="event-body">
              <div class="event-title">
                <strong>{{ event.label }}</strong>
                <span>{{ event.time }}</span>
              </div>
              <p>{{ event.location }} · 身体角度 {{ event.bodyAngle }}° · 速度 {{ event.velocity }} m/s · 置信度 {{ Math.round(event.confidence * 100) }}%</p>
              <div class="event-evidence" v-if="event.status === 'fall' && event.snapshotUrl">
                <img :src="event.snapshotUrl" alt="跌倒瞬间影像" />
                <div>
                  <strong>跌倒瞬间影像已上传</strong>
                  <span>{{ event.transmittedAt }} · {{ event.cameraId }}</span>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div class="empty-state" v-else>
          <IconSvg name="shield" :size="44" />
          <p>暂无检测事件</p>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import AppHeader from '../components/AppHeader.vue';
import FamilyNav from '../components/FamilyNav.vue';
import IconSvg from '../components/IconSvg.vue';
import { analyzeCameraFrame, analyzePrivacySensing } from '../api/fallDetection';
import { useWarningStore } from '../stores/warningStore';
import {
  createBrowserCameraFrame,
  createNormalFallFrame,
  createPrivacySensingFrame,
  isFallDetected,
  normalizeCameraDetection,
  toFallWarning
} from '../utils/fallDetection';

const FALL_EVENT_SNAPSHOT_URL = '/fall-event-snapshots/fall-moment.png';
const warningStore = useWarningStore();
const elderlyId = ref(localStorage.getItem('current_elderly_id') || '1001');
const videoRef = ref(null);
const captureCanvas = ref(null);
const isMonitoring = ref(false);
const hasCameraStream = ref(false);
const cameraError = ref('');
const serviceAvailable = ref(false);
const currentFrame = ref(createNormalFallFrame());
const privacyFrame = ref(createPrivacySensingFrame(false));
const events = ref([]);
let monitorTimer = null;
let privacyTimer = null;
let mediaStream = null;

const confidencePercent = computed(() => Math.round(currentFrame.value.confidence * 100));
const riskClass = computed(() => currentFrame.value.status);
const latestFallSnapshot = computed(() => events.value.find(event => event.status === 'fall' && event.snapshotUrl));
const cameraStatusText = computed(() => {
  if (hasCameraStream.value) return '摄像头已连接';
  if (cameraError.value) return '摄像头需要授权';
  return '等待启动';
});
const engineStatusText = computed(() => serviceAvailable.value ? '本地姿态识别服务在线' : '浏览器检测源运行中');
const statusText = computed(() => {
  if (currentFrame.value.status === 'fall') return '高危跌倒';
  if (currentFrame.value.status === 'risk') return '姿态风险';
  return '状态正常';
});
const statusDesc = computed(() => {
  if (currentFrame.value.status === 'fall') return '已写入预警记录，请及时处理';
  if (currentFrame.value.status === 'risk') return '姿态存在失衡风险，建议关注';
  return '未发现跌倒迹象';
});
const privacyStatusText = computed(() => {
  if (privacyFrame.value.status === 'fall') return '疑似跌倒';
  if (privacyFrame.value.status === 'risk') return '需要关注';
  return '状态正常';
});

const detectBoxStyle = computed(() => ({
  left: `${Math.max(5, Math.min(68, currentFrame.value.centerX - 14))}%`,
  top: `${Math.max(10, Math.min(68, currentFrame.value.centerY - 18))}%`
}));

const captureFrame = () => {
  const video = videoRef.value;
  const canvas = captureCanvas.value;
  if (!video || !canvas || !hasCameraStream.value || video.videoWidth === 0) return null;

  const width = 320;
  const height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * width));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.62);
};

const addWarningOnce = (frame) => {
  const recentExists = warningStore.all.some(item =>
    (item.type === '跌倒检测' || item.type === '隐私区域跌倒检测') &&
    item.status === '未处理' &&
    Date.now() - new Date(item.createdAt || item.time).getTime() < 8000
  );

  if (!recentExists) {
    warningStore.add(toFallWarning(elderlyId.value, frame));
  }
};

const withFallEvidence = (frame) => {
  if (!isFallDetected(frame) || frame.source === 'privacy') return frame;

  return {
    ...frame,
    snapshotUrl: frame.snapshotUrl || FALL_EVENT_SNAPSHOT_URL,
    transmittedAt: frame.transmittedAt || new Date().toLocaleString('zh-CN'),
    edgePolicy: 'fall_only'
  };
};

const pushEvent = (frame) => {
  const eventFrame = withFallEvidence(frame);
  events.value.unshift(eventFrame);
  events.value = events.value.slice(0, 10);

  if (isFallDetected(eventFrame)) {
    addWarningOnce(eventFrame);
  }
};

const applyFrame = (frame) => {
  currentFrame.value = frame;
  if (frame.status !== 'normal') {
    pushEvent(frame);
  }
};

const requestCamera = async () => {
  if (mediaStream) return true;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 960 },
        height: { ideal: 540 },
        facingMode: 'user'
      },
      audio: false
    });

    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream;
    }
    hasCameraStream.value = true;
    cameraError.value = '';
    return true;
  } catch (error) {
    cameraError.value = '无法访问电脑摄像头，请检查浏览器权限';
    hasCameraStream.value = false;
    return false;
  }
};

const stopCamera = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  hasCameraStream.value = false;
};

const sampleCameraFrame = async () => {
  const image = captureFrame();
  const response = image
    ? await analyzeCameraFrame(image, { elderlyId: elderlyId.value, cameraId: 'PC-CAMERA', location: '电脑摄像头' })
    : null;

  const serviceFrame = normalizeCameraDetection(response);
  if (serviceFrame) {
    serviceAvailable.value = true;
    applyFrame(serviceFrame);
    return;
  }

  serviceAvailable.value = false;
  applyFrame(createBrowserCameraFrame());
};

const samplePrivacyFrame = async () => {
  const response = await analyzePrivacySensing({
    elderlyId: elderlyId.value,
    sensorId: 'WIFI-BATH-01',
    location: '浴室'
  });

  const serviceFrame = normalizeCameraDetection(response);
  const frame = serviceFrame
    ? { ...serviceFrame, source: 'privacy', cameraId: serviceFrame.cameraId || 'WIFI-BATH-01', location: '浴室' }
    : createPrivacySensingFrame(false);

  privacyFrame.value = frame;
  if (frame.status !== 'normal') {
    pushEvent(frame);
  }
};

const startMonitor = async () => {
  if (monitorTimer) return;
  await requestCamera();
  isMonitoring.value = true;
  await sampleCameraFrame();
  monitorTimer = setInterval(sampleCameraFrame, 2600);

  if (!privacyTimer) {
    await samplePrivacyFrame();
    privacyTimer = setInterval(samplePrivacyFrame, 5200);
  }
};

const stopMonitor = () => {
  isMonitoring.value = false;
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
  if (privacyTimer) {
    clearInterval(privacyTimer);
    privacyTimer = null;
  }
  stopCamera();
};

const toggleMonitor = () => {
  if (isMonitoring.value) {
    stopMonitor();
  } else {
    startMonitor();
  }
};

const triggerCameraFall = () => {
  applyFrame(createBrowserCameraFrame('fall'));
};

const sampleNormal = () => {
  currentFrame.value = createNormalFallFrame();
};

const clearEvents = () => {
  events.value = [];
};

onMounted(() => {
  warningStore.loadInitialData();
});

onUnmounted(() => {
  stopMonitor();
});
</script>

<style scoped lang="scss">
.fall-detection {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  padding-bottom: 40px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.camera-panel,
.metric-card,
.privacy-panel,
.event-section {
  background: white;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
}

.camera-panel {
  border-radius: 18px;
  padding: 24px;
  margin-bottom: 20px;

  &.fall {
    border-color: #fecaca;
    box-shadow: 0 12px 30px rgba(220, 38, 38, 0.12);
  }
}

.camera-header,
.section-header,
.control-row,
.event-title,
.privacy-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.camera-header {
  margin-bottom: 18px;

  h2 {
    margin: 0 0 6px;
    color: #1e293b;
    font-size: 22px;
  }

  p {
    margin: 0;
    color: #64748b;
    font-size: 14px;
  }
}

.camera-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;

  &.active {
    background: #dcfce7;
    color: #166534;
  }
}

.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: currentColor;
}

.camera-feed {
  position: relative;
  height: 430px;
  overflow: hidden;
  border-radius: 14px;
  background: #0f172a;
  border: 1px solid #cbd5e1;
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.capture-canvas {
  display: none;
}

.video-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #cbd5e1;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.24), rgba(15, 23, 42, 0.56)),
    linear-gradient(135deg, #1e293b 0%, #334155 100%);

  p {
    margin: 0;
    font-size: 15px;
  }
}

.scan-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(37, 99, 235, 0.65);
  animation: scan 2.4s linear infinite;
  z-index: 2;
}

@keyframes scan {
  from { top: 0; }
  to { top: 100%; }
}

.detect-box {
  position: absolute;
  width: 210px;
  height: 160px;
  border: 2px solid #2563eb;
  border-radius: 12px;
  transition: all 0.45s ease;
  z-index: 3;

  span {
    position: absolute;
    left: 10px;
    top: -32px;
    padding: 5px 10px;
    border-radius: 8px;
    background: #2563eb;
    color: white;
    font-size: 13px;
    font-weight: 600;
  }

  &.risk {
    border-color: #d97706;

    span {
      background: #d97706;
    }
  }

  &.fall {
    border-color: #dc2626;
    animation: dangerPulse 1s ease-in-out infinite;

    span {
      background: #dc2626;
    }
  }
}

@keyframes dangerPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.32); }
  50% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
}

.feed-overlay {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: white;
  font-size: 13px;
  text-shadow: 0 1px 6px rgba(15, 23, 42, 0.45);
  z-index: 3;
}

.control-row {
  justify-content: flex-start;
  flex-wrap: wrap;
  margin-top: 18px;
}

.edge-transfer {
  display: grid;
  grid-template-columns: minmax(240px, 360px) 1fr;
  gap: 18px;
  align-items: center;
  margin-top: 18px;
  padding: 16px;
  border: 1px solid #fecaca;
  border-radius: 14px;
  background: #fff7f7;
}

.edge-transfer__image {
  position: relative;
  min-height: 150px;
  border-radius: 12px;
  overflow: hidden;
  background: #111827;

  img {
    width: 100%;
    height: 100%;
    max-height: 220px;
    object-fit: cover;
    display: block;
  }

  span {
    position: absolute;
    left: 10px;
    top: 10px;
    padding: 4px 9px;
    border-radius: 999px;
    background: rgba(127, 29, 29, 0.86);
    color: white;
    font-size: 12px;
    font-weight: 600;
  }
}

.edge-transfer__info {
  span {
    display: inline-flex;
    width: fit-content;
    margin-bottom: 8px;
    padding: 4px 10px;
    border-radius: 999px;
    background: #fee2e2;
    color: #b91c1c;
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    display: block;
    color: #7f1d1d;
    font-size: 22px;
    margin-bottom: 8px;
  }

  p {
    margin: 0 0 10px;
    color: #475569;
    line-height: 1.6;
  }

  small {
    color: #94a3b8;
  }
}

.control-btn,
.text-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.control-btn {
  min-height: 42px;
  padding: 10px 16px;
  border-radius: 10px;

  &.primary {
    background: #2563eb;
    color: white;
  }

  &.danger {
    background: #dc2626;
    color: white;
  }

  &.outline {
    background: white;
    color: #475569;
    border: 1px solid #cbd5e1;
  }

  &:hover {
    transform: translateY(-1px);
  }
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.metric-card {
  border-radius: 14px;
  padding: 18px;

  &.normal strong {
    color: #16a34a;
  }

  &.risk strong {
    color: #d97706;
  }

  &.fall strong {
    color: #dc2626;
  }
}

.metric-label {
  display: block;
  color: #64748b;
  font-size: 13px;
  margin-bottom: 8px;
}

.metric-card strong {
  display: block;
  color: #1e293b;
  font-size: 26px;
  line-height: 1.1;
  margin-bottom: 8px;
}

.metric-card small {
  color: #94a3b8;
  line-height: 1.45;
}

.privacy-panel {
  border-radius: 18px;
  padding: 20px;
  margin-bottom: 20px;

  &.fall {
    border-color: #fecaca;
    background: #fff5f5;
  }

  &.risk {
    border-color: #fde68a;
    background: #fffbeb;
  }
}

.privacy-info {
  display: flex;
  align-items: center;
  gap: 14px;

  h2 {
    margin: 0 0 6px;
    font-size: 20px;
    color: #1e293b;
  }

  p {
    margin: 0;
    color: #64748b;
    font-size: 14px;
  }
}

.privacy-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dbeafe;
  color: #2563eb;
  flex-shrink: 0;
}

.privacy-status {
  text-align: right;

  strong {
    display: block;
    color: #1e293b;
    font-size: 20px;
  }

  span {
    color: #94a3b8;
    font-size: 13px;
  }
}

.event-section {
  border-radius: 18px;
  padding: 22px;
}

.section-header {
  margin-bottom: 16px;

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 20px;
    color: #1e293b;
  }
}

.text-btn {
  background: transparent;
  color: #2563eb;
  font-size: 14px;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;

  &.fall {
    background: #fff5f5;
    border-color: #fecaca;

    .event-icon {
      color: #dc2626;
      background: #fee2e2;
    }
  }
}

.event-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dbeafe;
  color: #2563eb;
  flex-shrink: 0;
}

.event-body {
  flex: 1;
  min-width: 0;

  p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 14px;
    line-height: 1.5;
  }
}

.event-evidence {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 10px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);

  img {
    width: 118px;
    height: 78px;
    border-radius: 8px;
    object-fit: cover;
    background: #111827;
    flex-shrink: 0;
  }

  strong {
    display: block;
    color: #991b1b;
    font-size: 14px;
    margin-bottom: 4px;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.event-title {
  align-items: flex-start;

  strong {
    color: #1e293b;
  }

  span {
    color: #94a3b8;
    font-size: 12px;
    white-space: nowrap;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  color: #94a3b8;

  p {
    margin: 10px 0 0;
  }
}

@media (max-width: 1024px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }

  .camera-header,
  .event-title,
  .privacy-panel {
    flex-direction: column;
    align-items: flex-start;
  }

  .privacy-status {
    text-align: left;
  }

  .camera-feed {
    height: 340px;
  }

  .edge-transfer,
  .event-evidence {
    grid-template-columns: 1fr;
  }

  .event-evidence {
    flex-direction: column;
    align-items: flex-start;

    img {
      width: 100%;
      height: 180px;
    }
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
