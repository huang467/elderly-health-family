const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hashString = (value) => {
  let hash = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
};

const random01 = (seed) => {
  const x = Math.sin(hashString(seed)) * 10000;
  return x - Math.floor(x);
};

const randomAround = (seed, spread) => (random01(seed) * 2 - 1) * spread;

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const formatLabel = (date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, '0');
  return `${month}/${day} ${hour}:00`;
};

const formatDateKey = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export const getSimulatedHardwareTrend = (elderlyId = '1001', days = 14, samplesPerDay = 4, variant = 0) => {
  const safeDays = clamp(Number(days) || 14, 1, 60);
  const safeSamplesPerDay = clamp(Number(samplesPerDay) || 4, 1, 12);
  const total = safeDays * safeSamplesPerDay;
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const intervalMs = (24 / safeSamplesPerDay) * 60 * 60 * 1000;
  const samples = [];

  for (let i = total - 1; i >= 0; i -= 1) {
    const time = new Date(now.getTime() - i * intervalMs);
    const dateKey = formatDateKey(time);
    const hour = time.getHours() + time.getMinutes() / 60;
    const circadian = Math.sin(((hour - 7) / 24) * Math.PI * 2);
    const progress = (total - 1 - i) / Math.max(total - 1, 1);
    const seedPrefix = `${elderlyId}-${variant}-${dateKey}-${time.getHours()}`;
    const stressSignal = random01(`${elderlyId}-${variant}-${dateKey}-stress`) > 0.82 ? 1 : 0;
    const sleepSignal = hour >= 0 && hour <= 5 ? 1 : 0;

    const heartRate = round(clamp(
      74 + circadian * 7 + progress * 2 + randomAround(`${seedPrefix}-hr`, 5) + stressSignal * 8 - sleepSignal * 5,
      54,
      118
    ));

    const systolic = round(clamp(
      128 + circadian * 8 + progress * 4 + randomAround(`${seedPrefix}-sys`, 6) + stressSignal * 10,
      98,
      162
    ));

    const diastolic = round(clamp(
      78 + circadian * 4 + progress * 2 + randomAround(`${seedPrefix}-dia`, 4) + stressSignal * 5,
      58,
      98
    ));

    const bloodOxygen = round(clamp(
      97.4 - progress * 0.5 + randomAround(`${seedPrefix}-spo2`, 1.1) - stressSignal * 1.2 + sleepSignal * 0.4,
      91,
      100
    ), 1);

    samples.push({
      id: `${dateKey}-${time.getHours()}`,
      time: time.toISOString(),
      label: formatLabel(time),
      heartRate,
      bloodOxygen,
      systolic,
      diastolic,
      bloodPressure: `${systolic}/${diastolic}`,
      source: 'hardware-simulator'
    });
  }

  return samples;
};

export const getSimulatedHardwareSnapshot = (elderlyId = '1001', variant = 0) => {
  const samples = getSimulatedHardwareTrend(elderlyId, 1, 8, variant);
  return samples[samples.length - 1];
};

const average = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const getTrend = (values, stableThreshold = 2) => {
  if (values.length < 4) return '稳定';
  const mid = Math.floor(values.length / 2);
  const first = average(values.slice(0, mid));
  const second = average(values.slice(mid));
  const diff = second - first;
  if (Math.abs(diff) <= stableThreshold) return '稳定';
  return diff > 0 ? '上升' : '下降';
};

const metricStats = (samples, key, stableThreshold) => {
  const values = samples.map(item => Number(item[key])).filter(Number.isFinite);
  return {
    avg: round(average(values), key === 'bloodOxygen' ? 1 : 0),
    min: round(Math.min(...values), key === 'bloodOxygen' ? 1 : 0),
    max: round(Math.max(...values), key === 'bloodOxygen' ? 1 : 0),
    trend: getTrend(values, stableThreshold)
  };
};

export const getHardwareMetricStatus = (sample) => {
  const heartRateWarning = sample.heartRate < 60 || sample.heartRate > 100;
  const oxygenWarning = sample.bloodOxygen < 95;
  const pressureWarning = sample.systolic >= 140 || sample.diastolic >= 90 || sample.systolic < 90;

  if (sample.bloodOxygen < 93 || sample.systolic >= 155 || sample.diastolic >= 95 || sample.heartRate > 110) {
    return { level: 'high', text: '高风险', warnings: { heartRateWarning, oxygenWarning, pressureWarning } };
  }

  if (heartRateWarning || oxygenWarning || pressureWarning) {
    return { level: 'medium', text: '需关注', warnings: { heartRateWarning, oxygenWarning, pressureWarning } };
  }

  return { level: 'low', text: '平稳', warnings: { heartRateWarning, oxygenWarning, pressureWarning } };
};

export const calculateHardwareTrendSummary = (samples = []) => {
  if (!samples.length) {
    return {
      heartRate: { avg: 0, min: 0, max: 0, trend: '稳定' },
      bloodOxygen: { avg: 0, min: 0, max: 0, trend: '稳定' },
      systolic: { avg: 0, min: 0, max: 0, trend: '稳定' },
      diastolic: { avg: 0, min: 0, max: 0, trend: '稳定' },
      abnormalCounts: { heartRate: 0, bloodOxygen: 0, bloodPressure: 0, total: 0 },
      risk: { level: 'low', text: '暂无数据' }
    };
  }

  const abnormalCounts = samples.reduce((counts, sample) => {
    const status = getHardwareMetricStatus(sample).warnings;
    if (status.heartRateWarning) counts.heartRate += 1;
    if (status.oxygenWarning) counts.bloodOxygen += 1;
    if (status.pressureWarning) counts.bloodPressure += 1;
    counts.total = counts.heartRate + counts.bloodOxygen + counts.bloodPressure;
    return counts;
  }, { heartRate: 0, bloodOxygen: 0, bloodPressure: 0, total: 0 });

  const latest = samples[samples.length - 1];
  const latestStatus = getHardwareMetricStatus(latest);
  const risk = abnormalCounts.total >= 8 || latestStatus.level === 'high'
    ? { level: 'high', text: '高风险' }
    : abnormalCounts.total > 0 || latestStatus.level === 'medium'
      ? { level: 'medium', text: '需关注' }
      : { level: 'low', text: '平稳' };

  return {
    heartRate: metricStats(samples, 'heartRate', 2),
    bloodOxygen: metricStats(samples, 'bloodOxygen', 0.4),
    systolic: metricStats(samples, 'systolic', 3),
    diastolic: metricStats(samples, 'diastolic', 2),
    abnormalCounts,
    risk
  };
};
