<template>
  <div class="family-home">
    <AppHeader title="首页" />
    <FamilyNav />

    <div class="container">
      <!-- 欢迎区域 -->
      <section class="welcome-section">
        <div class="welcome-content">
          <h1 class="welcome-title">
            <span class="greeting">您好，</span>
            <span class="name">{{ elderlyStore.currentElderly?.name || '老人' }}</span>
          </h1>
          <p class="welcome-subtitle">{{ healthAdvice }}</p>
          <p class="update-time">
            <IconSvg name="clock" :size="14" />
            <span>数据更新于 {{ lastUpdateTime }}</span>
          </p>
        </div>
        <div class="welcome-actions">
          <div class="device-status" :class="deviceStatusClass">
            <div class="status-dot pulse-ring"></div>
            <span>{{ deviceStatusText }}</span>
          </div>
          <button class="refresh-btn" @click="refreshAllData" :disabled="isLoading">
            <IconSvg name="refresh" :size="16" :spin="isLoading" />
            <span>{{ isLoading ? '刷新中...' : '刷新' }}</span>
          </button>
        </div>
      </section>

      <!-- 统计卡片 -->
      <section class="stats-section">
        <div class="stat-card warning" @click="router.push('/warning')">
          <div class="stat-icon">
            <IconSvg name="warning" :size="24" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ warningStore.unreadCount }}</div>
            <div class="stat-label">未处理预警</div>
          </div>
          <div v-if="warningStore.highPriorityCount > 0" class="stat-badge high">高</div>
        </div>
        <div class="stat-card info" @click="router.push('/service')">
          <div class="stat-icon">
            <IconSvg name="calendar" :size="24" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ serviceStore.pendingCount }}</div>
            <div class="stat-label">待确认服务</div>
          </div>
        </div>
        <div class="stat-card success" @click="router.push('/service')">
          <div class="stat-icon">
            <IconSvg name="check" :size="24" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ serviceStore.completed.length }}</div>
            <div class="stat-label">已完成服务</div>
          </div>
        </div>
      </section>

      <!-- 健康评分卡片 -->
      <section class="health-score-section">
        <div class="score-card">
          <div class="score-circle" :class="healthStore.healthStatus.level">
            <svg class="score-ring" viewBox="0 0 100 100">
              <circle class="score-ring-bg" cx="50" cy="50" r="45" />
              <circle
                class="score-ring-progress"
                cx="50"
                cy="50"
                r="45"
                :style="{ strokeDashoffset: 283 - (283 * healthStore.healthScore / 100) }"
              />
            </svg>
            <div class="score-content">
              <div class="score-value">{{ healthStore.healthScore }}</div>
              <div class="score-label">健康评分</div>
            </div>
          </div>
          <div class="score-info">
            <h3 class="score-title">{{ healthStore.healthStatus.text }}</h3>
            <p class="score-desc">基于您最近7天的健康数据分析</p>
            <div class="score-trend" :class="trendDirection">
              <IconSvg :name="trendIcon" :size="16" />
              <span>{{ trendText }}</span>
            </div>
            <div class="score-indicators">
              <div class="indicator-item">
                <span class="indicator-dot normal"></span>
                <span>{{ healthStore.normalCount }} 项正常</span>
              </div>
              <div class="indicator-item">
                <span class="indicator-dot abnormal"></span>
                <span>{{ healthStore.abnormalCount }} 项异常</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 健康小贴士 -->
        <div class="tip-card">
          <div class="tip-header">
            <IconSvg name="lightbulb" :size="20" />
            <span>今日健康小贴士</span>
          </div>
          <p class="tip-content">{{ todaysTip }}</p>
          <div class="tip-actions">
            <button class="tip-btn" @click="refreshTip">
              <IconSvg name="refresh-cw" :size="14" />
              换一条
            </button>
          </div>
        </div>
      </section>

      <!-- 健康指标网格 -->
      <section class="indicators-section">
        <h2 class="section-title">
          <IconSvg name="activity" :size="24" />
          <span>实时健康指标</span>
          <span class="update-badge">实时</span>
        </h2>
        <div class="indicators-grid">
          <div
            v-for="indicator in healthStore.indicators"
            :key="indicator.key"
            class="indicator-card"
            :class="[indicator.status, { 'pulse-soft': indicator.status !== 'normal' }]"
            @click="showIndicatorDetail(indicator)"
          >
            <div class="indicator-icon" :class="`icon-${indicator.status}`">
              <IconSvg :name="indicator.icon" :size="28" />
            </div>
            <div class="indicator-content">
              <div class="indicator-name">{{ indicator.name }}</div>
              <div class="indicator-value">
                {{ indicator.value }}
                <span class="indicator-unit">{{ indicator.unit }}</span>
              </div>
              <div class="indicator-status-badge" :class="indicator.status">
                {{ indicator.statusText }}
              </div>
            </div>
            <div class="indicator-trend" v-if="indicator.trend !== 0">
              <IconSvg
                :name="indicator.trend > 0 ? 'trending-up' : 'trending-down'"
                :size="16"
                :class="indicator.trend > 0 ? 'up' : 'down'"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- 快速入口 -->
      <section class="quick-access-section">
        <h2 class="section-title">
          <IconSvg name="grid" :size="24" />
          <span>快速入口</span>
        </h2>
        <div class="access-grid">
          <div class="access-card" @click="router.push('/dashboard')">
            <div class="access-icon blue">
              <IconSvg name="bar-chart-2" :size="32" />
            </div>
            <div class="access-content">
              <h3>数据总览</h3>
              <p>查看实时健康数据详情</p>
            </div>
            <div class="access-arrow">
              <IconSvg name="chevron-right" :size="20" />
            </div>
          </div>

          <div class="access-card" @click="router.push('/trend')">
            <div class="access-icon green">
              <IconSvg name="trending-up" :size="32" />
            </div>
            <div class="access-content">
              <h3>健康趋势</h3>
              <p>分析健康变化趋势图表</p>
            </div>
            <div class="access-arrow">
              <IconSvg name="chevron-right" :size="20" />
            </div>
          </div>

          <div class="access-card" @click="router.push('/report')">
            <div class="access-icon teal">
              <IconSvg name="document-text" :size="32" />
            </div>
            <div class="access-content">
              <h3>AI 健康报告</h3>
              <p>生成含趋势图片的健康分析</p>
            </div>
            <div class="access-arrow">
              <IconSvg name="chevron-right" :size="20" />
            </div>
          </div>

          <div
            class="access-card warning"
           
           
            @click="router.push('/warning')"
          >
            <div class="access-icon orange">
              <IconSvg name="alert-triangle" :size="32" />
            </div>
            <div class="access-content">
              <h3>预警记录</h3>
              <p>查看异常预警信息</p>
            </div>
            <div v-if="warningStore.unreadCount > 0" class="access-badge">
              {{ warningStore.unreadCount }}
            </div>
            <div class="access-arrow">
              <IconSvg name="chevron-right" :size="20" />
            </div>
          </div>

          <div class="access-card" @click="router.push('/service')">
            <div class="access-icon purple">
              <IconSvg name="calendar" :size="32" />
            </div>
            <div class="access-content">
              <h3>服务预约</h3>
              <p>预约社区健康服务</p>
            </div>
            <div class="access-arrow">
              <IconSvg name="chevron-right" :size="20" />
            </div>
          </div>
        </div>
      </section>

      <!-- 个性化推荐 -->
      <section class="recommendation-section">
        <h2 class="section-title">
          <IconSvg name="sparkles" :size="24" />
          <span>个性化推荐</span>
        </h2>
        <div class="recommendation-list">
          <div
            v-for="(item, index) in recommendations"
            :key="index"
            class="recommendation-item"
            :class="item.priority"
          >
            <div class="recommendation-icon" :class="item.type">
              <IconSvg :name="item.icon" :size="24" />
            </div>
            <div class="recommendation-content">
              <h4>{{ item.title }}</h4>
              <p>{{ item.description }}</p>
              <div class="recommendation-tags" v-if="item.tags">
                <span v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
            <button class="recommendation-btn" @click="handleRecommendationAction(item)">
              {{ item.action }}
            </button>
          </div>
        </div>
      </section>

      <!-- 最近活动 -->
      <section class="activity-section">
        <h2 class="section-title">
          <IconSvg name="clock" :size="24" />
          <span>最近活动</span>
        </h2>
        <div class="activity-list">
          <div
            v-for="(activity, index) in recentActivities"
            :key="index"
            class="activity-item"
          >
            <div class="activity-icon" :class="activity.type">
              <IconSvg :name="activity.icon" :size="18" />
            </div>
            <div class="activity-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div class="activity-time">{{ activity.time }}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import FamilyNav from '../components/FamilyNav.vue';
import { useElderlyStore } from '../stores/elderlyStore';
import { useHealthStore } from '../stores/healthStore';
import { useWarningStore } from '../stores/warningStore';
import { useServiceStore } from '../stores/serviceStore';
import { useUIStore } from '../stores/uiStore';
import { getRealTimeHealth, getElderlyInfo, getHealthWarnings, getServiceOrders } from '../api/health';

const router = useRouter();
const elderlyStore = useElderlyStore();
const healthStore = useHealthStore();
const warningStore = useWarningStore();
const serviceStore = useServiceStore();
const uiStore = useUIStore();

// 响应式状态
const isLoading = ref(false);
const refreshTimer = ref(null);
const trendDirection = ref('up');
const trendText = ref('较上周提升 3%');

// 健康小贴士列表
const healthTips = [
  '保持规律作息，每天保证7-8小时睡眠，有助于血压稳定。',
  '适量运动，如散步、太极拳等，可增强心肺功能。',
  '饮食清淡，减少盐分和油脂摄入，多吃蔬菜水果。',
  '定期监测健康数据，关注异常变化，及时就医。',
  '保持心情愉悦，避免过度紧张和焦虑。',
  '按时服药，不随意增减药量，定期复诊。'
];
const currentTipIndex = ref(0);
const todaysTip = computed(() => healthTips[currentTipIndex.value]);

// 计算属性
const deviceStatusClass = computed(() => {
  return elderlyStore.currentElderly?.deviceStatus === 'online' ? 'online' : 'offline';
});

const deviceStatusText = computed(() => {
  return elderlyStore.currentElderly?.deviceStatus === 'online' ? '设备在线' : '设备离线';
});

const lastUpdateTime = computed(() => {
  return healthStore.lastUpdate
    ? new Date(healthStore.lastUpdate).toLocaleString('zh-CN')
    : '刚刚';
});

const healthAdvice = computed(() => {
  const score = healthStore.healthScore;
  if (score >= 90) return '今日健康状态优秀，继续保持！';
  if (score >= 80) return '今日健康状态良好，继续保持！';
  if (score >= 70) return '今日健康状态一般，请注意休息。';
  if (score >= 60) return '健康状况需要关注，建议咨询医生。';
  return '健康状况异常，请及时就医！';
});

const trendIcon = computed(() => {
  return trendDirection.value === 'up' ? 'trending-up' : 'trending-down';
});

// 个性化推荐
const recommendations = computed(() => {
  const items = [];
  const diseases = elderlyStore.currentElderly?.chronicDiseases || [];

  // 如果有未处理预警，优先显示
  if (warningStore.unreadCount > 0) {
    items.push({
      icon: 'alert-triangle',
      title: `您有 ${warningStore.unreadCount} 条未处理预警`,
      description: '请及时查看并处理老人的健康预警信息',
      action: '去处理',
      type: 'warning',
      priority: 'high',
      tags: ['需处理']
    });
  }

  if (diseases.includes('高血压') || healthStore.abnormalCount > 0) {
    items.push({
      icon: 'stethoscope',
      title: '高血压管理咨询',
      description: '针对老人高血压情况，推荐专业医生咨询服务',
      action: '立即预约',
      type: 'service',
      priority: 'high',
      tags: ['高血压', '专家咨询']
    });
    items.push({
      icon: 'book-open',
      title: '高血压健康知识',
      description: '了解如何通过饮食和运动控制血压',
      action: '查看详情',
      type: 'knowledge',
      priority: 'normal',
      tags: ['饮食建议']
    });
  }

  items.push({
    icon: 'pill',
    title: '用药提醒设置',
    description: '为老人设置定时用药提醒，避免漏服',
    action: '去设置',
    type: 'medication',
    priority: 'normal',
    tags: ['用药管理']
  });

  return items.slice(0, 3);
});

// 最近活动
const recentActivities = ref([
  { icon: 'heart-pulse', title: '心率监测完成', time: '10分钟前', type: 'health' },
  { icon: 'check-circle', title: '血压数据已同步', time: '30分钟前', type: 'success' },
  { icon: 'calendar-check', title: '预约了健康体检服务', time: '2小时前', type: 'service' },
  { icon: 'alert-circle', title: '收到一条健康预警', time: '3小时前', type: 'warning' }
]);

// 方法
const fetchElderlyInfo = async () => {
  try {
    const elderlyId = elderlyStore.currentElderlyId || '1001';
    const info = await getElderlyInfo(elderlyId);
    if (info) {
      elderlyStore.update(elderlyId, info);
    }
  } catch (error) {
    console.error('获取老人信息失败:', error);
  }
};

const fetchHealthData = async () => {
  try {
    const elderlyId = elderlyStore.currentElderlyId || '1001';
    const data = await getRealTimeHealth(elderlyId);
    if (data) {
      healthStore.update(elderlyId, data);
    }
  } catch (error) {
    console.error('获取健康数据失败:', error);
  }
};

const fetchWarningStats = async () => {
  try {
    const elderlyId = elderlyStore.currentElderlyId || '1001';
    const response = await getHealthWarnings(elderlyId);
    if (response?.list) {
      response.list.forEach(w => {
        if (!warningStore.list.find(existing => existing.id === w.id)) {
          warningStore.add(w);
        }
      });
    }
  } catch (error) {
    console.error('获取预警统计失败:', error);
  }
};

const fetchServiceStats = async () => {
  try {
    const elderlyId = elderlyStore.currentElderlyId || '1001';
    const response = await getServiceOrders(elderlyId);
    if (response?.list) {
      // 更新服务统计数据
      serviceStore.updatePendingCount();
    }
  } catch (error) {
    console.error('获取服务统计失败:', error);
  }
};

const refreshAllData = async () => {
  isLoading.value = true;
  uiStore.setLoading(true, '正在刷新数据...');

  try {
    await Promise.all([
      fetchElderlyInfo(),
      fetchHealthData(),
      fetchWarningStats(),
      fetchServiceStats()
    ]);

    uiStore.showSuccess('数据刷新成功');
  } catch (error) {
    uiStore.showError('数据刷新失败，请重试');
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false);
  }
};

const refreshTip = () => {
  currentTipIndex.value = (currentTipIndex.value + 1) % healthTips.length;
};

const showIndicatorDetail = (indicator) => {
  uiStore.showInfo(
    `${indicator.name}: ${indicator.value}${indicator.unit}`,
    '健康指标详情'
  );
};

const handleRecommendationAction = (item) => {
  switch (item.type) {
    case 'service':
      router.push('/service');
      break;
    case 'knowledge':
      router.push('/dashboard');
      break;
    case 'medication':
      router.push('/dashboard');
      break;
    case 'warning':
      router.push('/warning');
      break;
  }
};

// 生命周期
onMounted(() => {
  refreshAllData();
  warningStore.loadInitialData();
  serviceStore.loadInitialData();

  // 每30秒自动刷新
  refreshTimer.value = setInterval(refreshAllData, 30000);
});

onUnmounted(() => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
  }
});
</script>

<style scoped lang="scss">
.family-home {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding-bottom: 40px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

// 欢迎区域
.welcome-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 32px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3b82f6 100%);
  border-radius: 24px;
  color: white;
  box-shadow: 0 20px 60px rgba(30, 58, 95, 0.4);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
    animation: shimmer 8s infinite linear;
  }
}

@keyframes shimmer {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.welcome-title {
  margin: 0 0 8px;
  font-size: 36px;
  font-weight: 700;
  position: relative;
  z-index: 1;

  .greeting {
    font-weight: 400;
    opacity: 0.9;
  }

  .name {
    color: #60a5fa;
    text-shadow: 0 0 20px rgba(96, 165, 250, 0.5);
  }
}

.welcome-subtitle {
  margin: 0 0 12px;
  font-size: 17px;
  opacity: 0.9;
  position: relative;
  z-index: 1;
}

.update-time {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 13px;
  opacity: 0.7;
  position: relative;
  z-index: 1;
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.device-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.2);

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.3);
  }

  &.offline .status-dot {
    background: #f59e0b;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.3);
  }
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

// 统计区域
.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  }

  &.warning {
    .stat-icon {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      color: #d97706;
    }
    .stat-value {
      color: #d97706;
    }
  }

  &.info {
    .stat-icon {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      color: #2563eb;
    }
    .stat-value {
      color: #2563eb;
    }
  }

  &.success {
    .stat-icon {
      background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
      color: #16a34a;
    }
    .stat-value {
      color: #16a34a;
    }
  }
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
}

.stat-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 20px;
}

// 健康评分
.health-score-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.score-card {
  display: flex;
  align-items: center;
  gap: 40px;
  padding: 40px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.score-circle {
  position: relative;
  width: 180px;
  height: 180px;
  flex-shrink: 0;

  &.excellent .score-ring-progress { stroke: #10b981; }
  &.good .score-ring-progress { stroke: #3b82f6; }
  &.normal .score-ring-progress { stroke: #f59e0b; }
  &.poor .score-ring-progress { stroke: #f97316; }
  &.bad .score-ring-progress { stroke: #ef4444; }
}

.score-ring {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;

  circle {
    fill: none;
    stroke-width: 10;
  }
}

.score-ring-bg {
  stroke: #f1f5f9;
}

.score-ring-progress {
  stroke-linecap: round;
  stroke-dasharray: 283;
  transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.score-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-value {
  font-size: 48px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.score-label {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.score-info {
  flex: 1;
}

.score-title {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 600;
  color: #1e293b;
}

.score-desc {
  margin: 0 0 16px;
  font-size: 15px;
  color: #64748b;
}

.score-trend {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;

  &.up {
    background: #dcfce7;
    color: #166534;
  }

  &.down {
    background: #fee2e2;
    color: #991b1b;
  }
}

.score-indicators {
  display: flex;
  gap: 20px;
}

.indicator-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #64748b;

  .indicator-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;

    &.normal {
      background: #10b981;
    }

    &.abnormal {
      background: #ef4444;
    }
  }
}

// 健康小贴士
.tip-card {
  display: flex;
  flex-direction: column;
  padding: 28px;
  background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
  border-radius: 24px;
  border: 1px solid rgba(234, 179, 8, 0.2);
}

.tip-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  color: #a16207;
  font-weight: 600;
}

.tip-content {
  margin: 0 0 20px;
  font-size: 15px;
  color: #713f12;
  line-height: 1.7;
  flex: 1;
}

.tip-actions {
  margin-top: auto;
}

.tip-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(161, 98, 7, 0.1);
  border: none;
  border-radius: 8px;
  color: #a16207;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(161, 98, 7, 0.2);
  }
}

// 区域标题
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;

  .update-badge {
    margin-left: auto;
    padding: 4px 10px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    font-size: 11px;
    font-weight: 600;
    border-radius: 20px;
    animation: pulse-soft 2s ease-in-out infinite;
  }
}

// 健康指标
.indicators-section {
  margin-bottom: 24px;
}

.indicators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.indicator-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  }

  &.normal { border-color: #dcfce7; }
  &.warning { border-color: #fef3c7; }
  &.danger { border-color: #fee2e2; }
}

.indicator-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 16px;
  transition: all 0.3s ease;

  &.icon-normal {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    color: #16a34a;
  }

  &.icon-warning {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #d97706;
  }

  &.icon-danger {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    color: #dc2626;
  }
}

.indicator-content {
  flex: 1;
}

.indicator-name {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 6px;
}

.indicator-value {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;

  .indicator-unit {
    font-size: 16px;
    font-weight: 500;
    color: #94a3b8;
    margin-left: 4px;
  }
}

.indicator-status-badge {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;

  &.normal {
    background: #dcfce7;
    color: #166534;
  }

  &.warning {
    background: #fef3c7;
    color: #92400e;
  }

  &.danger {
    background: #fee2e2;
    color: #991b1b;
  }
}

.indicator-trend {
  position: absolute;
  top: 16px;
  right: 16px;

  .up {
    color: #10b981;
  }

  .down {
    color: #ef4444;
  }
}

// 快速入口
.quick-access-section {
  margin-bottom: 24px;
}

.access-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.access-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);

    .access-arrow {
      transform: translateX(4px);
      color: #3b82f6;
    }
  }

  &.warning {
    border: 2px solid #fef3c7;
  }
}

.access-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  transition: all 0.3s ease;

  &.blue {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    color: #2563eb;
  }

  &.green {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    color: #16a34a;
  }

  &.orange {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #d97706;
  }

  &.purple {
    background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
    color: #9333ea;
  }

  &.teal {
    background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%);
    color: #0f766e;
  }
}

.access-content {
  flex: 1;

  h3 {
    margin: 0 0 6px;
    font-size: 17px;
    font-weight: 600;
    color: #1e293b;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #64748b;
  }
}

.access-arrow {
  color: #94a3b8;
  transition: all 0.3s ease;
}

.access-badge {
  position: absolute;
  top: 16px;
  right: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  animation: pulse-soft 2s ease-in-out infinite;
}

// 个性化推荐
.recommendation-section {
  margin-bottom: 24px;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recommendation-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border-left: 4px solid transparent;

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    transform: translateX(4px);
  }

  &.high {
    border-left-color: #ef4444;
  }

  &.normal {
    border-left-color: #3b82f6;
  }
}

.recommendation-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  flex-shrink: 0;

  &.service {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    color: #2563eb;
  }

  &.knowledge {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    color: #16a34a;
  }

  &.medication {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #d97706;
  }

  &.warning {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    color: #dc2626;
  }
}

.recommendation-content {
  flex: 1;

  h4 {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  }

  p {
    margin: 0 0 10px;
    font-size: 14px;
    color: #64748b;
  }
}

.recommendation-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  .tag {
    padding: 4px 10px;
    background: #f1f5f9;
    color: #64748b;
    font-size: 12px;
    border-radius: 20px;
  }
}

.recommendation-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
  }
}

// 最近活动
.activity-section {
  margin-bottom: 24px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }
}

.activity-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;

  &.health {
    background: #dbeafe;
    color: #3b82f6;
  }

  &.success {
    background: #dcfce7;
    color: #10b981;
  }

  &.service {
    background: #f3e8ff;
    color: #8b5cf6;
  }

  &.warning {
    background: #fef3c7;
    color: #f59e0b;
  }
}

.activity-content {
  flex: 1;

  .activity-title {
    font-size: 14px;
    font-weight: 500;
    color: #1e293b;
    margin-bottom: 2px;
  }

  .activity-time {
    font-size: 12px;
    color: #94a3b8;
  }
}

// 脉冲动画
@keyframes pulse-soft {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

// 响应式
@media (max-width: 1024px) {
  .health-score-section {
    grid-template-columns: 1fr;
  }

  .stats-section {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }

  .welcome-section {
    flex-direction: column;
    text-align: center;
    gap: 20px;
    padding: 24px;
  }

  .welcome-actions {
    align-items: center;
  }

  .welcome-title {
    font-size: 28px;
  }

  .stats-section {
    grid-template-columns: 1fr;
  }

  .score-card {
    flex-direction: column;
    text-align: center;
    gap: 24px;
    padding: 24px;
  }

  .score-circle {
    width: 150px;
    height: 150px;
  }

  .score-value {
    font-size: 40px;
  }

  .score-indicators {
    justify-content: center;
  }

  .indicators-grid,
  .access-grid {
    grid-template-columns: 1fr;
  }

  .recommendation-item {
    flex-direction: column;
    text-align: center;
    padding: 20px;

    .recommendation-tags {
      justify-content: center;
    }
  }

  .recommendation-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .welcome-title {
    font-size: 24px;
  }

  .indicator-card {
    padding: 16px;
  }

  .access-card {
    padding: 16px;
  }

  .section-title {
    font-size: 18px;
  }
}
</style>
