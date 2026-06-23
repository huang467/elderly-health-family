const POSTURES = [
  { label: '站立', bodyAngle: 86, velocity: 0.18, confidence: 0.96, level: 'low' },
  { label: '缓慢行走', bodyAngle: 78, velocity: 0.32, confidence: 0.92, level: 'low' },
  { label: '坐下', bodyAngle: 62, velocity: 0.48, confidence: 0.9, level: 'low' },
  { label: '弯腰取物', bodyAngle: 42, velocity: 0.58, confidence: 0.86, level: 'medium' },
  { label: '疑似失衡', bodyAngle: 31, velocity: 0.82, confidence: 0.9, level: 'medium' }
];

const FALL_SCENE = {
  label: '疑似跌倒',
  bodyAngle: 12,
  velocity: 1.46,
  confidence: 0.97,
  level: 'high'
};

const PRIVACY_SCENES = [
  { label: '浴室活动正常', level: 'low', bodyAngle: 82, velocity: 0.16, confidence: 0.93, room: '浴室' },
  { label: '浴室短暂停留', level: 'low', bodyAngle: 76, velocity: 0.12, confidence: 0.9, room: '浴室' },
  { label: '隐私区域姿态风险', level: 'medium', bodyAngle: 34, velocity: 0.68, confidence: 0.88, room: '浴室' }
];

const PRIVACY_FALL_SCENE = {
  label: '隐私区域疑似跌倒',
  level: 'high',
  bodyAngle: 16,
  velocity: 1.24,
  confidence: 0.95,
  room: '浴室'
};

export const createFallFrame = (forceFall = false) => {
  const scene = forceFall || Math.random() > 0.84
    ? FALL_SCENE
    : POSTURES[Math.floor(Math.random() * POSTURES.length)];

  const centerX = Math.round(38 + Math.random() * 24);
  const centerY = scene.level === 'high'
    ? Math.round(72 + Math.random() * 8)
    : Math.round(36 + Math.random() * 18);

  return {
    id: `FD${Date.now()}`,
    time: new Date().toLocaleString('zh-CN'),
    status: scene.level === 'high' ? 'fall' : scene.level === 'medium' ? 'risk' : 'normal',
    label: scene.label,
    bodyAngle: Math.max(0, Math.round(scene.bodyAngle + (Math.random() * 8 - 4))),
    velocity: Number(Math.max(0, scene.velocity + (Math.random() * 0.16 - 0.08)).toFixed(2)),
    confidence: Number(Math.min(0.99, Math.max(0.75, scene.confidence + (Math.random() * 0.05 - 0.02))).toFixed(2)),
    centerX,
    centerY,
    cameraId: 'CAM-LIVING-01',
    location: '客厅摄像头'
  };
};

export const createNormalFallFrame = () => {
  const scene = POSTURES[Math.floor(Math.random() * 3)];
  const centerX = Math.round(38 + Math.random() * 24);
  const centerY = Math.round(36 + Math.random() * 12);

  return {
    id: `FD${Date.now()}`,
    time: new Date().toLocaleString('zh-CN'),
    status: 'normal',
    label: scene.label,
    bodyAngle: Math.max(65, Math.round(scene.bodyAngle + (Math.random() * 6 - 3))),
    velocity: Number(Math.max(0.08, scene.velocity + (Math.random() * 0.08 - 0.04)).toFixed(2)),
    confidence: Number(Math.min(0.99, Math.max(0.9, scene.confidence + (Math.random() * 0.04 - 0.01))).toFixed(2)),
    centerX,
    centerY,
    cameraId: 'CAM-LIVING-01',
    location: '客厅摄像头'
  };
};

export const createBrowserCameraFrame = (status = 'normal') => {
  if (status === 'fall') return createFallFrame(true);
  if (status === 'normal') return createNormalFallFrame();
  return createFallFrame(false);
};

export const normalizeCameraDetection = (payload) => {
  if (!payload) return null;

  const data = payload.data || payload;
  const label = data.label || data.action || data.statusText || '摄像头检测中';
  const confidence = Number(data.confidence ?? data.score ?? 0.9);
  const isFall = data.isFall === true || data.fall === true || label.includes('跌倒') || label.includes('摔倒');
  const isRisk = data.isRisk === true || label.includes('踉跄') || label.includes('失衡');

  return {
    id: data.id || `CAM_${Date.now()}`,
    time: data.time || new Date().toLocaleString('zh-CN'),
    status: isFall ? 'fall' : isRisk ? 'risk' : 'normal',
    label,
    bodyAngle: Number(data.bodyAngle ?? data.angle ?? (isFall ? 16 : 78)),
    velocity: Number(data.velocity ?? data.speed ?? (isFall ? 1.32 : 0.22)),
    confidence: Number(Math.min(0.99, Math.max(0.5, confidence)).toFixed(2)),
    centerX: Number(data.centerX ?? 50),
    centerY: Number(data.centerY ?? (isFall ? 75 : 48)),
    cameraId: data.cameraId || 'PC-CAMERA',
    location: data.location || '电脑摄像头',
    source: 'camera'
  };
};

export const createPrivacySensingFrame = (forceFall = false) => {
  const scene = forceFall || Math.random() > 0.9
    ? PRIVACY_FALL_SCENE
    : PRIVACY_SCENES[Math.floor(Math.random() * PRIVACY_SCENES.length)];

  return {
    id: `WIFI_${Date.now()}`,
    time: new Date().toLocaleString('zh-CN'),
    status: scene.level === 'high' ? 'fall' : scene.level === 'medium' ? 'risk' : 'normal',
    label: scene.label,
    bodyAngle: Math.max(0, Math.round(scene.bodyAngle + (Math.random() * 6 - 3))),
    velocity: Number(Math.max(0, scene.velocity + (Math.random() * 0.12 - 0.04)).toFixed(2)),
    confidence: Number(Math.min(0.99, Math.max(0.78, scene.confidence + (Math.random() * 0.04 - 0.02))).toFixed(2)),
    centerX: 50,
    centerY: scene.level === 'high' ? 76 : 48,
    cameraId: 'WIFI-BATH-01',
    location: scene.room,
    source: 'privacy'
  };
};

export const isFallDetected = (frame) => {
  return frame.status === 'fall' || (frame.bodyAngle <= 25 && frame.velocity >= 1.1 && frame.confidence >= 0.9);
};

export const toFallWarning = (elderlyId, frame) => ({
  id: `FALL_${Date.now()}`,
  elderlyId,
  type: frame.source === 'privacy' ? '隐私区域跌倒检测' : '跌倒检测',
  level: 'high',
  status: '未处理',
  time: frame.time,
  snapshotUrl: frame.snapshotUrl,
  transmittedAt: frame.transmittedAt,
  desc: `${frame.location}检测到疑似跌倒，置信度 ${(frame.confidence * 100).toFixed(0)}%，请立即确认老人状态。`,
  details: {
    '检测源': frame.cameraId,
    '位置': frame.location,
    '姿态': frame.label,
    '身体角度': `${frame.bodyAngle}°`,
    '下落速度': `${frame.velocity} m/s`,
    '置信度': `${(frame.confidence * 100).toFixed(0)}%`,
    '影像状态': frame.snapshotUrl ? '已上传跌倒瞬间关键帧' : '隐私区域无画面'
  }
});
