<template>
  <div class="health-report">
    <AppHeader title="AI 健康报告" />
    <FamilyNav />

    <main class="container">
      <section class="report-hero">
        <div>
          <p class="eyebrow">硬件采集模拟 · 大模型分析</p>
          <h1>{{ elderlyName }}的健康报告</h1>
          <p class="hero-subtitle">
            基于心率、血氧和血压连续数据生成趋势图，并给出面向家属的照护建议。
          </p>
        </div>
        <div class="hero-actions">
          <button class="btn ghost" @click="refreshHardwareData">
            <IconSvg name="refresh-cw" :size="18" />
            刷新硬件数据
          </button>
          <button class="btn primary" @click="generateReport(false)" :disabled="generating">
            <IconSvg name="document-text" :size="18" />
            {{ generating ? '生成中...' : '一键生成健康报告' }}
          </button>
        </div>
      </section>

      <section class="metric-grid">
        <article
          v-for="metric in metricCards"
          :key="metric.key"
          class="metric-card"
          :class="metric.status"
        >
          <div class="metric-icon">
            <IconSvg :name="metric.icon" :size="24" />
          </div>
          <div>
            <p>{{ metric.label }}</p>
            <strong>{{ metric.value }}</strong>
            <span>{{ metric.detail }}</span>
          </div>
        </article>
      </section>

      <section class="workspace-grid">
        <article class="panel chart-panel">
          <div class="panel-header">
            <div>
              <h2>健康指标趋势</h2>
              <p>近 14 天，每日 4 次模拟采集</p>
            </div>
            <span class="risk-pill" :class="summary.risk.level">{{ summary.risk.text }}</span>
          </div>
          <div ref="trendChartRef" class="trend-chart"></div>
        </article>

        <aside class="panel side-panel">
          <div class="config-block">
            <h2>模型配置</h2>
            <label>
              <span>API Key</span>
              <input
                v-model="apiConfig.apiKey"
                type="password"
                autocomplete="off"
                placeholder="在这里输入密钥，本页不会保存"
              />
            </label>
            <label>
              <span>接口地址</span>
              <input
                v-model="apiConfig.endpoint"
                autocomplete="off"
                placeholder="https://api.deepseek.com/chat/completions"
              />
            </label>
            <label>
              <span>模型 ID</span>
              <input v-model="apiConfig.model" autocomplete="off" placeholder="deepseek-chat" />
            </label>
          </div>

          <div class="schedule-block">
            <div class="schedule-title">
              <h2>定时报告</h2>
              <span :class="{ active: scheduleEnabled }">{{ scheduleEnabled ? '已开启' : '未开启' }}</span>
            </div>
            <label>
              <span>每天生成时间</span>
              <input v-model="scheduleTime" type="time" />
            </label>
            <div class="schedule-actions">
              <button class="btn primary slim" @click="enableDailySchedule">
                <IconSvg name="calendar-check" :size="17" />
                开启
              </button>
              <button class="btn ghost slim" @click="disableDailySchedule" :disabled="!scheduleEnabled">
                关闭
              </button>
            </div>
            <p class="schedule-note">{{ scheduleHint }}</p>
          </div>
        </aside>
      </section>

      <section v-if="report" class="panel report-result">
        <div class="panel-header">
          <div>
            <h2>{{ report.auto ? '定时健康报告' : '健康报告' }}</h2>
            <p>{{ report.generatedAt }} · {{ report.source }}</p>
          </div>
          <button class="btn ghost" @click="downloadReport">
            <IconSvg name="download" :size="18" />
            下载 HTML
          </button>
        </div>

        <div class="report-body">
          <div class="report-image">
            <img :src="report.chartImage" alt="健康指标趋势图" />
          </div>
          <div class="report-analysis">
            <h3>模型分析</h3>
            <p v-for="paragraph in analysisParagraphs" :key="paragraph">{{ paragraph }}</p>
          </div>
        </div>
      </section>

      <section class="panel history-panel">
        <div class="panel-header">
          <div>
            <h2>生成记录</h2>
            <p>当前页面会保留最近 5 次报告结果</p>
          </div>
        </div>
        <div v-if="recentReports.length" class="history-list">
          <div v-for="item in recentReports" :key="item.id" class="history-item">
            <IconSvg :name="item.auto ? 'calendar-check' : 'document-text'" :size="20" />
            <div>
              <strong>{{ item.auto ? '定时生成' : '手动生成' }}</strong>
              <span>{{ item.generatedAt }} · {{ item.riskText }} · {{ item.source }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-history">还没有生成报告</div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import * as echarts from 'echarts';
import AppHeader from '../components/AppHeader.vue';
import FamilyNav from '../components/FamilyNav.vue';
import IconSvg from '../components/IconSvg.vue';
import { useElderlyStore } from '../stores/elderlyStore';
import { useUIStore } from '../stores/uiStore';
import {
  calculateHardwareTrendSummary,
  getHardwareMetricStatus,
  getSimulatedHardwareTrend
} from '../utils/hardwareHealthSimulator';

const elderlyStore = useElderlyStore();
const uiStore = useUIStore();

const trendChartRef = ref(null);
const trendData = ref([]);
const report = ref(null);
const recentReports = ref([]);
const generating = ref(false);
const hardwareVariant = ref(0);
const scheduleEnabled = ref(false);
const scheduleTime = ref('08:00');
const nextRunAt = ref(null);
let chartInstance = null;
let scheduleTimer = null;

const apiConfig = reactive({
  apiKey: '',
  endpoint: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-chat'
});

const elderlyId = computed(() => elderlyStore.currentElderlyId || localStorage.getItem('current_elderly_id') || '1001');
const elderlyName = computed(() => elderlyStore.currentElderly?.name || localStorage.getItem('current_elderly_name') || '老人');
const apiReady = computed(() => apiConfig.apiKey.trim() && apiConfig.endpoint.trim() && apiConfig.model.trim());
const summary = computed(() => calculateHardwareTrendSummary(trendData.value));
const latestSample = computed(() => trendData.value[trendData.value.length - 1] || null);
const latestStatus = computed(() => latestSample.value ? getHardwareMetricStatus(latestSample.value) : { level: 'low', text: '暂无数据' });
const analysisParagraphs = computed(() => (report.value?.analysis || '').split(/\n+/).map(item => item.trim()).filter(Boolean));

const metricCards = computed(() => {
  const latest = latestSample.value || {};
  return [
    {
      key: 'heartRate',
      label: '当前心率',
      value: latest.heartRate ? `${latest.heartRate} bpm` : '--',
      detail: `均值 ${summary.value.heartRate.avg || '--'} bpm · ${summary.value.heartRate.trend}`,
      icon: 'heart-pulse',
      status: latest.heartRate < 60 || latest.heartRate > 100 ? 'warning' : 'normal'
    },
    {
      key: 'bloodOxygen',
      label: '当前血氧',
      value: latest.bloodOxygen ? `${latest.bloodOxygen}%` : '--',
      detail: `均值 ${summary.value.bloodOxygen.avg || '--'}% · ${summary.value.bloodOxygen.trend}`,
      icon: 'droplet',
      status: latest.bloodOxygen < 95 ? 'warning' : 'normal'
    },
    {
      key: 'bloodPressure',
      label: '当前血压',
      value: latest.bloodPressure || '--',
      detail: `收缩压均值 ${summary.value.systolic.avg || '--'} mmHg`,
      icon: 'activity',
      status: latest.systolic >= 140 || latest.diastolic >= 90 ? 'warning' : 'normal'
    },
    {
      key: 'risk',
      label: '综合状态',
      value: latestStatus.value.text,
      detail: `异常计数 ${summary.value.abnormalCounts.total} 次`,
      icon: 'shield',
      status: latestStatus.value.level === 'low' ? 'normal' : 'warning'
    }
  ];
});

const scheduleHint = computed(() => {
  if (!scheduleEnabled.value || !nextRunAt.value) return '开启后会在页面保持打开时自动生成每日健康报告。';
  return `下次生成：${formatDateTime(nextRunAt.value)}`;
});

const refreshHardwareData = async () => {
  hardwareVariant.value += 1;
  trendData.value = getSimulatedHardwareTrend(elderlyId.value, 14, 4, hardwareVariant.value);
  await drawTrendChart();
  uiStore.showSuccess('已刷新模拟硬件数据');
};

const drawTrendChart = async () => {
  await nextTick();
  if (!trendChartRef.value || !trendData.value.length) return;

  if (!chartInstance) {
    chartInstance = echarts.init(trendChartRef.value);
  }

  const labels = trendData.value.map(item => item.label);
  chartInstance.setOption({
    color: ['#2563eb', '#16a34a', '#f97316', '#0f766e'],
    grid: { left: 44, right: 48, top: 44, bottom: 48 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2e8f0',
      textStyle: { color: '#0f172a' }
    },
    legend: {
      top: 6,
      data: ['心率', '血氧', '收缩压', '舒张压']
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: '#64748b', interval: Math.ceil(labels.length / 7), fontSize: 11 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#cbd5e1' } }
    },
    yAxis: [
      {
        type: 'value',
        name: 'bpm / mmHg',
        min: 50,
        max: 170,
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#eef2f7' } }
      },
      {
        type: 'value',
        name: '血氧 %',
        min: 90,
        max: 100,
        axisLabel: { color: '#64748b' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '心率',
        type: 'line',
        smooth: true,
        symbolSize: 5,
        data: trendData.value.map(item => item.heartRate)
      },
      {
        name: '血氧',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        symbolSize: 5,
        data: trendData.value.map(item => item.bloodOxygen)
      },
      {
        name: '收缩压',
        type: 'line',
        smooth: true,
        symbolSize: 5,
        data: trendData.value.map(item => item.systolic)
      },
      {
        name: '舒张压',
        type: 'line',
        smooth: true,
        symbolSize: 5,
        data: trendData.value.map(item => item.diastolic)
      }
    ]
  }, true);
  chartInstance.resize();
};

const generateReport = async (auto = false) => {
  if (generating.value) return;
  generating.value = true;

  try {
    if (!trendData.value.length) {
      trendData.value = getSimulatedHardwareTrend(elderlyId.value, 14, 4, hardwareVariant.value);
    }
    await drawTrendChart();
    await wait(160);

    const chartImage = chartInstance?.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff'
    }) || '';

    const modelPrompt = buildReportPrompt();
    let analysis = '';
    let source = '大模型分析';

    if (apiReady.value) {
      try {
        analysis = await callHealthModel(modelPrompt);
      } catch (error) {
        analysis = buildLocalAnalysis();
        source = '本地兜底分析';
        uiStore.showWarning('模型接口暂时不可用，已生成本地分析结果');
      }
    } else {
      analysis = buildLocalAnalysis();
      source = '本地模拟分析';
    }

    const generatedAt = formatDateTime(new Date());
    report.value = {
      id: `report_${Date.now()}`,
      auto,
      generatedAt,
      chartImage,
      analysis,
      source
    };

    recentReports.value.unshift({
      id: report.value.id,
      auto,
      generatedAt,
      riskText: summary.value.risk.text,
      source
    });
    recentReports.value = recentReports.value.slice(0, 5);

    uiStore.showSuccess(auto ? '定时健康报告已生成' : '健康报告已生成');
  } finally {
    generating.value = false;
  }
};

const callHealthModel = async (prompt) => {
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
          content: '你是面向家属端的老人健康报告助手。请用中文给出谨慎、清晰、非诊断式的健康趋势分析，并提醒异常时联系医生或社区医护。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.35
    })
  });

  if (!response.ok) {
    throw new Error(`health report api failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.output_text || data.message;
  if (!content) throw new Error('empty health report response');
  return content.trim();
};

const buildReportPrompt = () => {
  const latest = latestSample.value;
  const recentSamples = trendData.value.slice(-16).map(item => ({
    time: item.label,
    heartRate: item.heartRate,
    bloodOxygen: item.bloodOxygen,
    bloodPressure: item.bloodPressure
  }));

  return [
    `老人姓名：${elderlyName.value}`,
    `老人ID：${elderlyId.value}`,
    `最新数据：心率 ${latest.heartRate} bpm，血氧 ${latest.bloodOxygen}%，血压 ${latest.bloodPressure} mmHg。`,
    `趋势统计：${JSON.stringify(summary.value)}`,
    `最近采样：${JSON.stringify(recentSamples)}`,
    '请生成一份家属可读的健康报告，包含：综合判断、重点异常、趋势解释、照护建议、是否建议联系医生。不要声称可以替代医生诊断。'
  ].join('\n');
};

const buildLocalAnalysis = () => {
  const data = summary.value;
  const latest = latestSample.value;
  const lines = [
    `综合判断：${elderlyName.value}当前综合状态为「${data.risk.text}」。最新心率 ${latest.heartRate} bpm，血氧 ${latest.bloodOxygen}%，血压 ${latest.bloodPressure} mmHg。`,
    `趋势变化：近 14 天心率整体${data.heartRate.trend}，血氧整体${data.bloodOxygen.trend}，收缩压整体${data.systolic.trend}。心率均值 ${data.heartRate.avg} bpm，血氧均值 ${data.bloodOxygen.avg}%，收缩压均值 ${data.systolic.avg} mmHg。`,
    `异常提示：本周期共识别 ${data.abnormalCounts.total} 次需关注指标，其中心率 ${data.abnormalCounts.heartRate} 次、血氧 ${data.abnormalCounts.bloodOxygen} 次、血压 ${data.abnormalCounts.bloodPressure} 次。`,
    '照护建议：建议家属继续观察血压和血氧变化，保持规律作息、清淡饮食和适量活动。如果连续出现血氧低于 95%、血压明显升高、胸闷头晕等情况，应及时联系医生或社区医护。'
  ];
  return lines.join('\n\n');
};

const enableDailySchedule = () => {
  scheduleEnabled.value = true;
  nextRunAt.value = computeNextRunAt(scheduleTime.value);
  restartScheduleTimer();
  uiStore.showSuccess(`已开启每日 ${scheduleTime.value} 自动生成健康报告`);
};

const disableDailySchedule = () => {
  scheduleEnabled.value = false;
  nextRunAt.value = null;
  if (scheduleTimer) {
    clearInterval(scheduleTimer);
    scheduleTimer = null;
  }
  uiStore.showInfo('已关闭每日健康报告');
};

const restartScheduleTimer = () => {
  if (scheduleTimer) clearInterval(scheduleTimer);
  scheduleTimer = setInterval(checkDailySchedule, 15000);
  checkDailySchedule();
};

const checkDailySchedule = () => {
  if (!scheduleEnabled.value || !nextRunAt.value) return;
  if (Date.now() < nextRunAt.value.getTime()) return;

  nextRunAt.value = computeNextRunAt(scheduleTime.value, new Date(Date.now() + 60000));
  generateReport(true);
};

const computeNextRunAt = (timeValue, from = new Date()) => {
  const [hour = 8, minute = 0] = timeValue.split(':').map(Number);
  const next = new Date(from);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= from.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

const downloadReport = () => {
  if (!report.value) return;
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${elderlyName.value}健康报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; line-height: 1.7; padding: 32px; }
    h1 { margin-bottom: 4px; }
    img { width: 100%; max-width: 980px; border: 1px solid #e2e8f0; border-radius: 12px; }
    .meta { color: #64748b; margin-bottom: 24px; }
    p { max-width: 980px; }
  </style>
</head>
<body>
  <h1>${elderlyName.value}健康报告</h1>
  <div class="meta">${report.value.generatedAt} · ${report.value.source}</div>
  <img src="${report.value.chartImage}" alt="健康指标趋势图">
  ${analysisParagraphs.value.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${elderlyName.value}_健康报告_${new Date().toISOString().slice(0, 10)}.html`;
  link.click();
  URL.revokeObjectURL(url);
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const formatDateTime = (value) => new Date(value).toLocaleString('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

const resizeChart = () => {
  chartInstance?.resize();
};

watch(scheduleTime, () => {
  if (scheduleEnabled.value) {
    nextRunAt.value = computeNextRunAt(scheduleTime.value);
  }
});

onMounted(async () => {
  trendData.value = getSimulatedHardwareTrend(elderlyId.value, 14, 4, hardwareVariant.value);
  await drawTrendChart();
  window.addEventListener('resize', resizeChart);
});

onBeforeUnmount(() => {
  if (scheduleTimer) clearInterval(scheduleTimer);
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
  window.removeEventListener('resize', resizeChart);
});
</script>

<style scoped lang="scss">
.health-report {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #eef4f8 100%);
  padding-bottom: 40px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.report-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  margin-bottom: 22px;
  border-radius: 18px;
  color: white;
  background: linear-gradient(135deg, #164e63 0%, #2563eb 100%);
  box-shadow: 0 16px 42px rgba(37, 99, 235, 0.24);

  h1 {
    margin: 6px 0 8px;
    font-size: 30px;
    line-height: 1.25;
  }
}

.eyebrow {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #bfdbfe;
}

.hero-subtitle {
  margin: 0;
  max-width: 620px;
  color: #dbeafe;
  line-height: 1.65;
}

.hero-actions,
.schedule-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  min-height: 42px;
  border: none;
  border-radius: 12px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.56;
    cursor: not-allowed;
  }

  &.primary {
    color: white;
    background: #2563eb;
    box-shadow: 0 8px 18px rgba(37, 99, 235, 0.24);
  }

  &.ghost {
    color: #0f172a;
    background: white;
    border: 1px solid #dbe3ef;
  }

  &.slim {
    min-height: 38px;
    flex: 1;
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 22px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);

  &.warning {
    border-color: #fed7aa;
    background: #fff7ed;
  }

  p,
  span {
    margin: 0;
    color: #64748b;
    font-size: 13px;
  }

  strong {
    display: block;
    margin: 5px 0;
    color: #0f172a;
    font-size: 22px;
  }
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #2563eb;
  background: #dbeafe;
  flex: 0 0 auto;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  margin-bottom: 22px;
}

.panel {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 22px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  h2 {
    margin: 0 0 5px;
    color: #0f172a;
    font-size: 20px;
  }

  p {
    margin: 0;
    color: #64748b;
    font-size: 14px;
  }
}

.risk-pill {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;

  &.low {
    color: #047857;
    background: #d1fae5;
  }

  &.medium {
    color: #b45309;
    background: #fef3c7;
  }

  &.high {
    color: #b91c1c;
    background: #fee2e2;
  }
}

.trend-chart {
  width: 100%;
  height: 420px;
}

.side-panel,
.config-block,
.schedule-block {
  display: grid;
  gap: 14px;
}

.config-block {
  padding-bottom: 18px;
  border-bottom: 1px solid #e2e8f0;
}

.side-panel h2 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
}

label {
  display: grid;
  gap: 7px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

input {
  min-height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0 12px;
  color: #0f172a;
  outline: none;

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }
}

.schedule-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  span {
    color: #64748b;
    font-size: 13px;
    font-weight: 700;

    &.active {
      color: #047857;
    }
  }
}

.schedule-note {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.report-result {
  margin-bottom: 22px;
}

.report-body {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(320px, 1.05fr);
  gap: 22px;
  align-items: start;
}

.report-image {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  background: #f8fafc;

  img {
    display: block;
    width: 100%;
  }
}

.report-analysis {
  h3 {
    margin: 0 0 10px;
    color: #0f172a;
    font-size: 18px;
  }

  p {
    margin: 0 0 12px;
    color: #334155;
    line-height: 1.75;
  }
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  color: #2563eb;
  background: #f8fafc;

  strong,
  span {
    display: block;
  }

  strong {
    color: #0f172a;
    font-size: 14px;
  }

  span {
    margin-top: 3px;
    color: #64748b;
    font-size: 13px;
  }
}

.empty-history {
  min-height: 72px;
  display: grid;
  place-items: center;
  color: #94a3b8;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
}

@media (max-width: 1100px) {
  .metric-grid,
  .workspace-grid,
  .report-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .container {
    padding: 16px;
  }

  .report-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .trend-chart {
    height: 340px;
  }

  .panel-header {
    flex-direction: column;
  }
}
</style>
