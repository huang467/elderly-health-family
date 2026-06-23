const DEFAULT_SERVICE_URL = process.env.VUE_APP_FALL_DETECTION_URL || 'http://127.0.0.1:8765';
const REQUEST_TIMEOUT = 2200;

const postJson = async (path, payload) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${DEFAULT_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

export const analyzeCameraFrame = (image, payload = {}) => {
  return postJson('/api/fall/camera-frame', {
    image,
    ...payload
  });
};

export const analyzePrivacySensing = (payload = {}) => {
  return postJson('/api/fall/privacy-sensing', payload);
};
