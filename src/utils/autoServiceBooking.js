export const AUTO_SERVICE_CHOICES = [
  { value: 'transport', label: '陪同就医', scenario: '血氧明显偏低、血压或心率达到高风险，建议尽快线下就医' },
  { value: '体检', label: '上门体检', scenario: '需要尽快复核生命体征、排查指标波动原因' },
  { value: '随访', label: '慢病随访', scenario: '血压、心率等慢病相关指标持续偏高或偏低' },
  { value: '护理', label: '康复护理', scenario: '老人行动不便、指标异常并需要上门照护协助' },
  { value: 'psychological', label: '心理疏导', scenario: '指标异常伴随焦虑、睡眠或情绪照护需求' }
];

export const getAutoServiceLabel = (serviceType) => {
  const found = AUTO_SERVICE_CHOICES.find(item => item.value === serviceType || item.label === serviceType);
  return found?.label || serviceType || '上门体检';
};

export const assessHealthAbnormal = (healthData = {}) => {
  const [systolic, diastolic] = parseBloodPressure(healthData.bloodPressure);
  const heartRate = Number(healthData.heartRate);
  const bloodOxygen = Number(healthData.bloodOxygen);
  const issues = [];

  if (Number.isFinite(heartRate) && (heartRate < 60 || heartRate > 100)) {
    issues.push({
      key: 'heartRate',
      label: '心率异常',
      value: `${heartRate} bpm`,
      level: heartRate < 50 || heartRate > 110 ? 'high' : 'medium'
    });
  }

  if (Number.isFinite(bloodOxygen) && bloodOxygen < 95) {
    issues.push({
      key: 'bloodOxygen',
      label: '血氧偏低',
      value: `${bloodOxygen}%`,
      level: bloodOxygen < 93 ? 'high' : 'medium'
    });
  }

  if (Number.isFinite(systolic) && Number.isFinite(diastolic) && (systolic >= 140 || diastolic >= 90)) {
    issues.push({
      key: 'bloodPressure',
      label: '血压偏高',
      value: `${systolic}/${diastolic} mmHg`,
      level: systolic >= 160 || diastolic >= 100 ? 'high' : 'medium'
    });
  }

  const highRisk = issues.some(item => item.level === 'high') || issues.length >= 2;

  return {
    abnormal: issues.length > 0,
    level: highRisk ? 'high' : issues.length ? 'medium' : 'normal',
    issues,
    issueText: issues.map(item => `${item.label}：${item.value}`).join('；') || '未发现异常'
  };
};

export const recommendServiceByModel = async ({ apiConfig, elderlyName, elderlyId, healthData, assessment }) => {
  const response = await fetch(apiConfig.endpoint.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiConfig.apiKey.trim()}`
    },
    body: JSON.stringify({
      model: apiConfig.model.trim(),
      messages: [
        {
          role: 'system',
          content: '你是老人健康异常自动预约助手。你只能从给定服务中选择一种，输出严格 JSON，不要输出 Markdown。'
        },
        {
          role: 'user',
          content: buildModelPrompt({ elderlyName, elderlyId, healthData, assessment })
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`auto booking model failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.output_text || data.message || '';
  return normalizeRecommendation(parseModelJson(content), assessment);
};

export const fallbackServiceRecommendation = (assessment, healthData = {}) => {
  const [systolic, diastolic] = parseBloodPressure(healthData.bloodPressure);
  const heartRate = Number(healthData.heartRate);
  const bloodOxygen = Number(healthData.bloodOxygen);

  if (assessment.level === 'high' || bloodOxygen < 93 || systolic >= 160 || diastolic >= 100 || heartRate > 110) {
    return {
      serviceType: 'transport',
      urgency: 'today',
      reason: '指标达到较高风险，建议安排陪同就医，尽快进行线下检查。'
    };
  }

  if (systolic >= 140 || diastolic >= 90) {
    return {
      serviceType: '随访',
      urgency: 'tomorrow',
      reason: '血压偏高，适合预约慢病随访，由社区医生复核血压并评估用药与生活方式。'
    };
  }

  if (bloodOxygen < 95) {
    return {
      serviceType: '体检',
      urgency: 'tomorrow',
      reason: '血氧低于正常范围，建议预约上门体检复测血氧并观察呼吸状态。'
    };
  }

  return {
    serviceType: '体检',
    urgency: 'tomorrow',
    reason: '检测到健康指标异常，建议预约上门体检进行复核。'
  };
};

export const getSuggestedAppointmentSlot = (urgency = 'tomorrow') => {
  const date = new Date();
  if (urgency === 'today' && date.getHours() < 16) {
    return {
      serviceDate: date.toISOString().slice(0, 10),
      serviceTime: '下午'
    };
  }

  date.setDate(date.getDate() + 1);
  return {
    serviceDate: date.toISOString().slice(0, 10),
    serviceTime: '上午'
  };
};

const buildModelPrompt = ({ elderlyName, elderlyId, healthData, assessment }) => {
  return [
    `老人：${elderlyName || '老人'}，ID：${elderlyId || '1001'}`,
    `当前健康数据：心率 ${healthData.heartRate} bpm，血氧 ${healthData.bloodOxygen}%，血压 ${healthData.bloodPressure} mmHg，体温 ${healthData.bodyTemperature || '-'}℃。`,
    `异常判断：${assessment.issueText}，风险等级：${assessment.level}。`,
    `可选服务：${AUTO_SERVICE_CHOICES.map(item => `${item.value}(${item.label})：${item.scenario}`).join('；')}`,
    '请返回 JSON：{"serviceType":"可选服务 value","urgency":"today 或 tomorrow","reason":"选择原因，30字以内"}。'
  ].join('\n');
};

const parseModelJson = (content) => {
  const text = String(content || '').trim();
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] || text;
  return JSON.parse(jsonText);
};

const normalizeRecommendation = (raw, assessment) => {
  const allowedValues = AUTO_SERVICE_CHOICES.map(item => item.value);
  const allowedLabels = AUTO_SERVICE_CHOICES.map(item => item.label);
  const indexByLabel = allowedLabels.indexOf(raw.serviceType);
  const serviceType = allowedValues.includes(raw.serviceType)
    ? raw.serviceType
    : indexByLabel >= 0
      ? allowedValues[indexByLabel]
      : fallbackServiceRecommendation(assessment).serviceType;

  return {
    serviceType,
    urgency: raw.urgency === 'today' ? 'today' : 'tomorrow',
    reason: String(raw.reason || '模型判断需要预约健康服务。').slice(0, 80)
  };
};

const parseBloodPressure = (value) => {
  if (!value) return [NaN, NaN];
  const [systolic, diastolic] = String(value).split('/').map(Number);
  return [systolic, diastolic];
};
