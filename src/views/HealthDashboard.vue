<template>
  <div class="health-dashboard">
    <AppHeader title="健康数据总览" />
    <FamilyNav />

    <div class="container">
      <!-- 老人信息卡片 -->
      <section class="user-info-card">
        <div class="user-info-header">
          <div class="user-avatar">
            <IconSvg name="user" :size="48" />
          </div>
          <div class="user-details">
            <h2 class="user-name">{{ elderlyStore.currentElderly?.name || '老人' }}</h2>
            <p class="user-meta">
              {{ elderlyStore.currentElderly?.age || 70 }}岁 |
              {{ elderlyStore.currentElderly?.chronicDiseases?.join('、') || '无慢性病' }}
            </p>
          </div>
          <div class="user-status" :class="deviceStatusClass">
            <span class="status-dot pulse-ring"></span>
            <span>{{ deviceStatusText }}</span>
          </div>
        </div>
        <div class="user-info-body">
          <div class="info-item">
            <span class="info-label">最后更新</span>
            <span class="info-value">{{ healthStore.currentHealthData?.updateTime || '刚刚' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">健康评分</span>
            <span class="info-value score">{{ healthStore.healthScore }}分</span>
          </div>
          <div class="info-item">
            <span class="info-label">设备编号</span>
            <span class="info-value">{{ elderlyStore.currentElderlyId || '1001' }}</span>
          </div>
        </div>
      </section>

      <!-- 健康状态概览 -->
      <section class="health-overview">
        <div class="overview-card" :class="healthStore.healthStatus.level">
          <div class="overview-icon">
            <IconSvg :name="healthStatusIcon" :size="48" />
          </div>
          <div class="overview-info">
            <h3>{{ healthStore.healthStatus.text }}</h3>
            <p>{{ healthStatusDesc }}</p>
          </div>
          <div class="overview-score">
            <div class="score-ring-small">
              <svg viewBox="0 0 100 100">
                <circle class="ring-bg" cx="50" cy="50" r="45" />
                <circle
                  class="ring-progress"
                  cx="50" cy="50" r="45"
                  :style="{ strokeDashoffset: 283 - (283 * healthStore.healthScore / 100) }"
                />
              </svg>
              <span class="score-number">{{ healthStore.healthScore }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 健康指标卡片 -->
      <section class="health-indicators">
        <div class="section-header">
          <h2 class="section-title">
            <IconSvg name="activity" :size="24" />
            实时健康指标
          </h2>
          <button class="refresh-btn" @click="refreshData" :disabled="isLoading">
            <IconSvg name="refresh-cw" :size="16" :spin="isLoading" />
            {{ isLoading ? '刷新中' : '刷新' }}
          </button>
        </div>
        <div class="indicators-grid">
          <BaseHealthCard
            v-for="indicator in healthIndicators"
            :key="indicator.key"
            :title="indicator.name"
            :value="indicator.value"
            :unit="indicator.unit"
            :isNormal="indicator.status === 'normal'"
            :normal-range="indicator.range"
            :status="indicator.status"
            :icon="indicator.icon"
            :trend="indicator.trend"
          />
        </div>
      </section>

      <!-- 健康趋势图表 -->
      <section class="health-trends">
        <div class="section-header">
          <h2 class="section-title">
            <IconSvg name="trending-up" :size="24" />
            健康趋势
          </h2>
          <div class="trend-tabs">
            <button
              v-for="tab in trendTabs"
              :key="tab.key"
              class="tab-btn"
              :class="{ active: currentTrendTab === tab.key }"
              @click="currentTrendTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
        <div class="trend-chart">
          <div id="miniTrendChart" class="mini-chart-container"></div>
        </div>
      </section>

      <!-- 功能按钮 -->
      <section class="action-buttons">
        <button class="action-btn primary" @click="router.push('/trend')">
          <IconSvg name="line-chart" :size="20" />
          查看详细趋势
        </button>
        <button class="action-btn warning" @click="router.push('/warning')">
          <IconSvg name="alert-triangle" :size="20" />
          查看预警记录
          <span v-if="warningStore.unreadCount > 0" class="btn-badge">
            {{ warningStore.unreadCount }}
          </span>
        </button>
        <button class="action-btn danger" @click="router.push('/fall-detection')">
          <IconSvg name="eye" :size="20" />
          跌倒检测
        </button>
        <button class="action-btn success" @click="router.push('/service')">
          <IconSvg name="calendar-plus" :size="20" />
          预约社区服务
        </button>
        <button class="action-btn outline" @click="router.push('/report')">
          <IconSvg name="document-text" :size="20" />
          AI 健康报告
        </button>
      </section>

      <!-- AI 自动预约 -->
      <section class="auto-service-panel">
        <div class="auto-service-header">
          <div>
            <h2 class="section-title">
              <IconSvg name="stethoscope" :size="24" />
              AI 异常自动预约
            </h2>
            <p>检测到心率、血氧或血压异常时，自动分析并预约合适的看病服务。</p>
          </div>
          <label class="auto-toggle">
            <input type="checkbox" v-model="autoBooking.enabled" />
            <span>{{ autoBooking.enabled ? '已开启' : '已关闭' }}</span>
          </label>
        </div>

        <div class="auto-config-grid">
          <label>
            <span>API Key</span>
            <input
              v-model="autoBooking.apiKey"
              type="password"
              autocomplete="off"
              placeholder="填入后由大模型决定服务类型"
            />
          </label>
          <label>
            <span>模型接口</span>
            <input v-model="autoBooking.endpoint" autocomplete="off" />
          </label>
          <label>
            <span>模型 ID</span>
            <input v-model="autoBooking.model" autocomplete="off" />
          </label>
        </div>

        <div class="auto-status-row" :class="autoBooking.statusLevel">
          <IconSvg :name="autoBooking.running ? 'refresh-cw' : 'info'" :size="16" :spin="autoBooking.running" />
          <span>{{ autoBooking.statusText }}</span>
          <strong>{{ autoBookingApiReady ? '大模型判断' : '本地规则兜底' }}</strong>
        </div>
      </section>

      <!-- 健康建议 -->
      <section class="health-tips">
        <h2 class="section-title">
          <IconSvg name="lightbulb" :size="24" />
          健康建议
        </h2>
        <div class="tips-list">
          <div
            v-for="(tip, index) in healthTips"
            :key="index"
            class="tip-item"
            :class="tip.priority"
          >
            <div class="tip-icon">
              <IconSvg :name="tip.icon" :size="20" />
            </div>
            <div class="tip-content">
              <h4>{{ tip.title }}</h4>
              <p>{{ tip.content }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch, reactive } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import AppHeader from '../components/AppHeader.vue';
import FamilyNav from '../components/FamilyNav.vue';
import BaseHealthCard from '../components/BaseHealthCard.vue';
import { useElderlyStore } from '../stores/elderlyStore';
import { useHealthStore } from '../stores/healthStore';
import { useWarningStore } from '../stores/warningStore';
import { useServiceStore } from '../stores/serviceStore';
import { useUIStore } from '../stores/uiStore';
import { createServiceOrder, getRealTimeHealth } from '../api/health';
import {
  assessHealthAbnormal,
  fallbackServiceRecommendation,
  getAutoServiceLabel,
  getSuggestedAppointmentSlot,
  recommendServiceByModel
} from '../utils/autoServiceBooking';

const router = useRouter();
const elderlyStore = useElderlyStore();
const healthStore = useHealthStore();
const warningStore = useWarningStore();
const serviceStore = useServiceStore();
const uiStore = useUIStore();

const isLoading = ref(false);
const refreshTimer = ref(null);
const currentTrendTab = ref('heartRate');
let chartInstance = null;

const autoBooking = reactive({
  enabled: true,
  running: false,
  apiKey: '',
  endpoint: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-chat',
  statusText: '等待下一次健康数据刷新',
  statusLevel: 'idle'
});

const trendTabs = [
  { key: 'heartRate', label: '心率' },
  { key: 'bloodPressure', label: '血压' },
  { key: 'bloodOxygen', label: '血氧' },
  { key: 'bodyTemperature', label: '体温' }
];

const deviceStatusClass = computed(() => {
  return elderlyStore.currentElderly?.deviceStatus === 'online' ? 'online' : 'offline';
});

const deviceStatusText = computed(() => {
  return elderlyStore.currentElderly?.deviceStatus === 'online' ? '在线' : '离线';
});

const autoBookingApiReady = computed(() =>
  autoBooking.apiKey.trim() && autoBooking.endpoint.trim() && autoBooking.model.trim()
);

const healthStatusIcon = computed(() => {
  const level = healthStore.healthStatus.level;
  const icons = {
    excellent: 'check-circle',
    good: 'smile',
    normal: 'meh',
    poor: 'frown',
    bad: 'alert-circle'
  };
  return icons[level] || 'activity';
});

const healthStatusDesc = computed(() => {
  const score = healthStore.healthScore;
  if (score >= 90) return '所有健康指标均在正常范围内，继续保持良好的生活习惯';
  if (score >= 80) return '健康状况良好，注意保持规律作息';
  if (score >= 70) return '健康状况一般，建议适当调整生活方式';
  if (score >= 60) return '健康状况需要关注，建议咨询医生';
  return '健康状况异常，请及时就医检查';
});

const healthIndicators = computed(() => {
  const data = healthStore.currentHealthData;
  return [
    {
      key: 'heartRate',
      name: '心率',
      value: data.heartRate || 75,
      unit: 'bpm',
      range: '60-100次/分',
      status: data.heartRate >= 60 && data.heartRate <= 100 ? 'normal' : 'warning',
      icon: 'heart-pulse',
      trend: 'stable'
    },
    {
      key: 'bloodPressure',
      name: '血压',
      value: data.bloodPressure || '135/85',
      unit: 'mmHg',
      range: '≤140/90mmHg',
      status: data.bloodPressure && parseInt(data.bloodPressure) <= 140 ? 'normal' : 'warning',
      icon: 'activity',
      trend: 'up'
    },
    {
      key: 'bloodOxygen',
      name: '血氧',
      value: data.bloodOxygen || 98,
      unit: '%',
      range: '≥95%',
      status: data.bloodOxygen >= 95 ? 'normal' : 'warning',
      icon: 'droplet',
      trend: 'stable'
    },
    {
      key: 'bodyTemperature',
      name: '体温',
      value: data.bodyTemperature || 36.5,
      unit: '℃',
      range: '36.0-37.3℃',
      status: data.bodyTemperature >= 36 && data.bodyTemperature <= 37.3 ? 'normal' : 'warning',
      icon: 'thermometer',
      trend: 'stable'
    },
    {
      key: 'respirationRate',
      name: '呼吸率',
      value: data.respirationRate || 16,
      unit: '次/分',
      range: '12-20次/分',
      status: data.respirationRate >= 12 && data.respirationRate <= 20 ? 'normal' : 'warning',
      icon: 'wind',
      trend: 'stable'
    },
    {
      key: 'bloodGlucose',
      name: '血糖',
      value: data.bloodGlucose || 5.2,
      unit: 'mmol/L',
      range: '3.9-6.1mmol/L',
      status: data.bloodGlucose >= 3.9 && data.bloodGlucose <= 6.1 ? 'normal' : 'warning',
      icon: 'droplet',
      trend: 'down'
    }
  ];
});

const healthTips = ref([
  {
    icon: 'moon',
    title: '保持规律作息',
    content: '每天保证7-8小时睡眠，有助于血压稳定',
    priority: 'normal'
  },
  {
    icon: 'footprints',
    title: '适量运动',
    content: '每天散步30分钟，可增强心肺功能',
    priority: 'normal'
  },
  {
    icon: 'apple',
    title: '饮食清淡',
    content: '减少盐分和油脂摄入，多吃蔬菜水果',
    priority: 'high'
  },
  {
    icon: 'clipboard-check',
    title: '定期监测',
    content: '建议每天定时测量血压和心率',
    priority: 'normal'
  }
]);

const refreshData = async () => {
  isLoading.value = true;
  try {
    const elderlyId = elderlyStore.currentElderlyId || '1001';
    const data = await getRealTimeHealth(elderlyId);
    if (data) {
      healthStore.update(elderlyId, data);
      await maybeAutoBookService(elderlyId, data);
      uiStore.showSuccess('数据刷新成功');
    }
  } catch (error) {
    uiStore.showError('数据刷新失败');
  } finally {
    isLoading.value = false;
  }
};

const maybeAutoBookService = async (elderlyId, healthData) => {
  if (!autoBooking.enabled || autoBooking.running) return;

  const assessment = assessHealthAbnormal(healthData);
  if (!assessment.abnormal) {
    autoBooking.statusText = '当前未检测到需要自动预约的健康异常';
    autoBooking.statusLevel = 'normal';
    return;
  }

  serviceStore.loadInitialData(false);
  if (hasPendingAutoBooking(elderlyId)) {
    autoBooking.statusText = '已存在待确认的 AI 自动预约，本次异常不重复提交';
    autoBooking.statusLevel = 'idle';
    return;
  }

  autoBooking.running = true;
  autoBooking.statusText = '检测到异常，正在分析适合的看病服务...';
  autoBooking.statusLevel = 'warning';

  try {
    let recommendation;
    let source = '大模型';

    if (autoBookingApiReady.value) {
      try {
        recommendation = await recommendServiceByModel({
          apiConfig: autoBooking,
          elderlyName: elderlyStore.currentElderly?.name || '老人',
          elderlyId,
          healthData,
          assessment
        });
      } catch (error) {
        recommendation = fallbackServiceRecommendation(assessment, healthData);
        source = '本地规则';
      }
    } else {
      recommendation = fallbackServiceRecommendation(assessment, healthData);
      source = '本地规则';
    }

    const slot = getSuggestedAppointmentSlot(recommendation.urgency);
    const serviceLabel = getAutoServiceLabel(recommendation.serviceType);
    const remark = `AI自动预约：${recommendation.reason} 异常指标：${assessment.issueText}`;
    const contactPhone = localStorage.getItem('family_phone') || '';

    const response = await createServiceOrder({
      elderlyId,
      serviceType: recommendation.serviceType,
      serviceTime: slot.serviceDate,
      servicePeriod: slot.serviceTime,
      contactName: '家属',
      contactPhone,
      remark
    });

    serviceStore.add({
      orderId: response.orderId,
      serviceType: serviceLabel,
      serviceDate: slot.serviceDate,
      serviceTime: slot.serviceTime,
      elderlyId,
      contactName: '家属',
      contactPhone,
      status: response.status,
      remark,
      autoGenerated: true,
      autoSource: source,
      healthSnapshot: {
        heartRate: healthData.heartRate,
        bloodOxygen: healthData.bloodOxygen,
        bloodPressure: healthData.bloodPressure
      }
    });

    autoBooking.statusText = `已自动预约${serviceLabel}：${slot.serviceDate} ${slot.serviceTime}`;
    autoBooking.statusLevel = 'success';
    uiStore.showWarning(`检测到健康异常，已自动预约${serviceLabel}`, 'AI 自动预约');
  } catch (error) {
    autoBooking.statusText = '自动预约失败，请到服务预约页手动提交';
    autoBooking.statusLevel = 'danger';
  } finally {
    autoBooking.running = false;
  }
};

const hasPendingAutoBooking = (elderlyId) => {
  return serviceStore.all.some(order =>
    String(order.elderlyId) === String(elderlyId) &&
    order.autoGenerated &&
    order.status === '待确认（社区审核中）'
  );
};

// 生成迷你图表数据
const generateMiniChartData = () => {
  const days = 7;
  const dates = [];
  const values = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(`${date.getMonth() + 1}/${date.getDate()}`);
  }

  let baseValue, variation;
  switch (currentTrendTab.value) {
    case 'heartRate':
      baseValue = 75; variation = 10;
      break;
    case 'bloodPressure':
      baseValue = 130; variation = 15;
      break;
    case 'bloodOxygen':
      baseValue = 98; variation = 2;
      break;
    case 'bodyTemperature':
      baseValue = 36.5; variation = 0.3;
      break;
    default:
      baseValue = 75; variation = 10;
  }

  for (let i = 0; i < days; i++) {
    const value = baseValue + (Math.random() - 0.5) * variation * 2;
    values.push(parseFloat(value.toFixed(1)));
  }

  return { dates, values };
};

// 初始化迷你趋势图表
const initMiniChart = async () => {
  await nextTick();

  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }

  const chartDom = document.getElementById('miniTrendChart');
  if (!chartDom) return;

  chartInstance = echarts.init(chartDom);
  const data = generateMiniChartData();

  const option = {
    grid: {
      left: '10%',
      right: '5%',
      top: '10%',
      bottom: '15%'
    },
    xAxis: {
      type: 'category',
      data: data.dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 11,
        color: '#94a3b8'
      }
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#f1f5f9'
        }
      },
      axisLabel: {
        fontSize: 11,
        color: '#94a3b8'
      }
    },
    series: [{
      data: data.values,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        width: 3,
        color: '#3b82f6'
      },
      itemStyle: {
        color: '#3b82f6',
        borderWidth: 2,
        borderColor: '#fff'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
          ]
        }
      }
    }],
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#1e293b' }
    }
  };

  chartInstance.setOption(option);
};

// 监听标签切换
watch(currentTrendTab, () => {
  initMiniChart();
});

const resizeMiniChart = () => {
  chartInstance?.resize();
};

onMounted(() => {
  refreshData();
  initMiniChart();
  refreshTimer.value = setInterval(refreshData, 30000);
  window.addEventListener('resize', resizeMiniChart);
});

onUnmounted(() => {
  if (refreshTimer.value) clearInterval(refreshTimer.value);
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
  window.removeEventListener('resize', resizeMiniChart);
});
</script>

<style scoped lang="scss">
.health-dashboard {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding-bottom: 40px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

// 老人信息卡片
.user-info-card {
  background: white;
  border-radius: 24px;
  padding: 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
}

.user-info-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f1f5f9;
}

.user-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
}

.user-details {
  flex: 1;

  .user-name {
    font-size: 24px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 6px;
  }

  .user-meta {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }
}

.user-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;

  &.online {
    background: #dcfce7;
    color: #166534;

    .status-dot {
      background: #10b981;
    }
  }

  &.offline {
    background: #fee2e2;
    color: #991b1b;

    .status-dot {
      background: #ef4444;
    }
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
}

.user-info-body {
  display: flex;
  gap: 40px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .info-label {
    font-size: 13px;
    color: #94a3b8;
  }

  .info-value {
    font-size: 16px;
    font-weight: 500;
    color: #1e293b;

    &.score {
      color: #3b82f6;
      font-size: 20px;
      font-weight: 700;
    }
  }
}

// 健康状态概览
.health-overview {
  margin-bottom: 24px;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 28px;
  border-radius: 24px;
  color: white;

  &.excellent {
    background: linear-gradient(135deg, #10b981, #059669);
  }

  &.good {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
  }

  &.normal {
    background: linear-gradient(135deg, #f59e0b, #d97706);
  }

  &.poor, &.bad {
    background: linear-gradient(135deg, #ef4444, #dc2626);
  }
}

.overview-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.overview-info {
  flex: 1;

  h3 {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 8px;
  }

  p {
    font-size: 15px;
    opacity: 0.9;
    margin: 0;
    line-height: 1.5;
  }
}

.overview-score {
  .score-ring-small {
    position: relative;
    width: 100px;
    height: 100px;

    svg {
      transform: rotate(-90deg);
      width: 100%;
      height: 100%;

      circle {
        fill: none;
        stroke-width: 8;
      }

      .ring-bg {
        stroke: rgba(255, 255, 255, 0.3);
      }

      .ring-progress {
        stroke: white;
        stroke-linecap: round;
        stroke-dasharray: 283;
        transition: stroke-dashoffset 1s ease;
      }
    }

    .score-number {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 28px;
      font-weight: 700;
    }
  }
}

// 健康指标
.health-indicators {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.indicators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

// 健康趋势
.health-trends {
  margin-bottom: 24px;
}

.trend-tabs {
  display: flex;
  gap: 8px;
  background: white;
  padding: 4px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.tab-btn {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
  }

  &:hover:not(.active) {
    background: #f1f5f9;
  }
}

.trend-chart {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.mini-chart-container {
  width: 100%;
  height: 300px;
}

// 功能按钮
.action-buttons {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &.primary {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
    }
  }

  &.warning {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(245, 158, 11, 0.3);
    }
  }

  &.success {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
    }
  }

  &.danger {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(220, 38, 38, 0.3);
    }
  }

  &.outline {
    background: white;
    border: 2px solid #e2e8f0;
    color: #64748b;

    &:hover {
      border-color: #3b82f6;
      color: #3b82f6;
      transform: translateY(-2px);
    }
  }

  .btn-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    min-width: 24px;
    height: 24px;
    padding: 0 8px;
    background: #ef4444;
    color: white;
    font-size: 12px;
    font-weight: 600;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.auto-service-panel {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
}

.auto-service-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;

  p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 14px;
    line-height: 1.6;
  }
}

.auto-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  input {
    width: 16px;
    height: 16px;
    accent-color: #2563eb;
  }
}

.auto-config-grid {
  display: grid;
  grid-template-columns: 0.9fr 1.35fr 0.75fr;
  gap: 14px;
  margin-bottom: 14px;

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
    outline: none;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
  }
}

.auto-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 10px 12px;
  border-radius: 12px;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 14px;

  span {
    flex: 1;
  }

  strong {
    color: #0f172a;
    font-size: 13px;
  }

  &.normal,
  &.success {
    color: #047857;
    background: #ecfdf5;
    border-color: #bbf7d0;
  }

  &.warning {
    color: #b45309;
    background: #fffbeb;
    border-color: #fde68a;
  }

  &.danger {
    color: #b91c1c;
    background: #fef2f2;
    border-color: #fecaca;
  }
}

// 健康建议
.health-tips {
  margin-bottom: 24px;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #3b82f6;
  transition: all 0.3s ease;

  &:hover {
    transform: translateX(4px);
  }

  &.high {
    border-left-color: #ef4444;

    .tip-icon {
      background: #fee2e2;
      color: #dc2626;
    }
  }

  &.normal {
    border-left-color: #3b82f6;

    .tip-icon {
      background: #dbeafe;
      color: #2563eb;
    }
  }
}

.tip-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tip-content {
  flex: 1;

  h4 {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 6px;
  }

  p {
    font-size: 14px;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
  }
}

// 脉冲动画
@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}

.pulse-ring {
  animation: pulse-ring 1.5s ease-out infinite;
}

// 响应式
@media (max-width: 1024px) {
  .action-buttons {
    grid-template-columns: repeat(2, 1fr);
  }

  .auto-config-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }

  .user-info-header {
    flex-wrap: wrap;
  }

  .user-info-body {
    flex-wrap: wrap;
    gap: 20px;
  }

  .overview-card {
    flex-direction: column;
    text-align: center;
  }

  .indicators-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }

  .auto-service-header,
  .auto-status-row {
    align-items: stretch;
    flex-direction: column;
  }

  .trend-tabs {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .user-avatar {
    width: 56px;
    height: 56px;
  }

  .user-name {
    font-size: 20px !important;
  }

  .overview-icon {
    width: 60px;
    height: 60px;
  }

  .overview-info h3 {
    font-size: 22px;
  }
}
</style>
