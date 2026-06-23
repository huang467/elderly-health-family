<template>
  <div class="admin-health">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <button class="btn btn-secondary back-btn" @click="router.push('/admin/dashboard')">
          <IconSvg name="arrow-left" :size="16" />
          <span>返回</span>
        </button>
        <h1>健康数据管理</h1>
      </div>
      <div class="header-actions">
        <div class="filter-box">
          <select v-model="selectedElderly" class="filter-select">
            <option value="">所有老人</option>
            <option v-for="elderly in elderlyList" :key="elderly.id" :value="elderly.id">
              {{ elderly.name }}
            </option>
          </select>
          <select v-model="selectedDateRange" class="filter-select">
            <option value="today">今日</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="year">本年</option>
          </select>
          <button class="btn btn-secondary" @click="handleFilter">筛选</button>
        </div>
        <button class="btn btn-primary" @click="exportHealthData">
          <IconSvg name="download" :size="16" />
          <span>导出数据</span>
        </button>
      </div>
    </div>

    <!-- 健康数据概览 -->
    <div class="health-overview">
      <div class="overview-card">
        <div class="card-icon">
          <IconSvg name="heartbeat" :size="32" />
        </div>
        <div class="card-content">
          <h3>心率</h3>
          <p class="card-value">{{ avgHeartRate }} <span>bpm</span></p>
          <p class="card-desc">平均心率</p>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon">
          <IconSvg name="droplet" :size="32" />
        </div>
        <div class="card-content">
          <h3>血压</h3>
          <p class="card-value">{{ avgBloodPressure }} <span>mmHg</span></p>
          <p class="card-desc">平均血压</p>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon">
          <IconSvg name="clock" :size="32" />
        </div>
        <div class="card-content">
          <h3>睡眠</h3>
          <p class="card-value">{{ avgSleepDuration }} <span>小时</span></p>
          <p class="card-desc">平均睡眠时长</p>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon">
          <IconSvg name="activity" :size="32" />
        </div>
        <div class="card-content">
          <h3>步数</h3>
          <p class="card-value">{{ avgSteps }} <span>步</span></p>
          <p class="card-desc">平均每日步数</p>
        </div>
      </div>
    </div>

    <!-- 健康数据趋势图 -->
    <div class="health-charts">
      <div class="chart-card">
        <div class="chart-header">
          <h3>心率趋势</h3>
          <select v-model="chartTimeRange" class="chart-filter">
            <option value="24h">24小时</option>
            <option value="7d">7天</option>
            <option value="30d">30天</option>
          </select>
        </div>
        <div class="chart-content">
          <div ref="heartRateChart" class="chart"></div>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3>血压趋势</h3>
          <select v-model="chartTimeRange" class="chart-filter">
            <option value="24h">24小时</option>
            <option value="7d">7天</option>
            <option value="30d">30天</option>
          </select>
        </div>
        <div class="chart-content">
          <div ref="bloodPressureChart" class="chart"></div>
        </div>
      </div>
    </div>

    <!-- 健康数据列表 -->
    <div class="health-data-list">
      <div class="list-header">
        <div class="list-item">
          <div class="col col-time">时间</div>
          <div class="col col-elderly">老人</div>
          <div class="col col-heart-rate">心率</div>
          <div class="col col-blood-pressure">血压</div>
          <div class="col col-temperature">体温</div>
          <div class="col col-sleep">睡眠</div>
          <div class="col col-steps">步数</div>
          <div class="col col-status">状态</div>
          <div class="col col-actions">操作</div>
        </div>
      </div>
      <div class="list-body">
        <div 
          v-for="data in filteredHealthData" 
          :key="data.id"
          class="list-item"
        >
          <div class="col col-time">{{ data.time }}</div>
          <div class="col col-elderly">{{ data.elderlyName }}</div>
          <div class="col col-heart-rate">{{ data.heartRate }} bpm</div>
          <div class="col col-blood-pressure">{{ data.bloodPressure }}</div>
          <div class="col col-temperature">{{ data.temperature }} °C</div>
          <div class="col col-sleep">{{ data.sleepDuration }} 小时</div>
          <div class="col col-steps">{{ data.steps }}</div>
          <div class="col col-status">
            <span 
              class="status-badge"
              :class="{
                'status-normal': data.status === 'normal',
                'status-warning': data.status === 'warning',
                'status-danger': data.status === 'danger'
              }"
            >
              {{ data.status === 'normal' ? '正常' : data.status === 'warning' ? '预警' : '异常' }}
            </span>
          </div>
          <div class="col col-actions">
            <button class="btn btn-sm btn-info" @click="viewHealthDetail(data.id)">详情</button>
            <button class="btn btn-sm btn-secondary" @click="generateReport(data.id)">生成报告</button>
          </div>
        </div>
      </div>
      <!-- 空状态 -->
      <div v-if="filteredHealthData.length === 0" class="empty-state">
        <span class="empty-icon">📊</span>
        <p>暂无健康数据</p>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="filteredHealthData.length > 0">
      <button class="page-btn" @click="prevPage" :disabled="currentPage === 1">上一页</button>
      <span class="page-info">第 {{ currentPage }} 页，共 {{ totalPages }} 页</span>
      <button class="page-btn" @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import IconSvg from '../components/IconSvg.vue';

// 路由实例
const router = useRouter();

// 响应式数据
const elderlyList = ref([]);
const healthDataList = ref([]);
const selectedElderly = ref('');
const selectedDateRange = ref('week');
const chartTimeRange = ref('7d');
const currentPage = ref(1);
const pageSize = ref(10);

// 图表实例
const heartRateChart = ref(null);
const bloodPressureChart = ref(null);
let heartRateChartInstance = null;
let bloodPressureChartInstance = null;
let chartInitTimer = null;

// 计算属性：过滤后的健康数据
const filteredHealthData = computed(() => {
  let filtered = healthDataList.value;
  if (selectedElderly.value) {
    filtered = filtered.filter(data => data.elderlyId === parseInt(selectedElderly.value));
  }
  // 分页处理
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filtered.slice(start, end);
});

// 计算属性：总页数
const totalPages = computed(() => {
  let filtered = healthDataList.value;
  if (selectedElderly.value) {
    filtered = filtered.filter(data => data.elderlyId === parseInt(selectedElderly.value));
  }
  return Math.ceil(filtered.length / pageSize.value);
});

// 计算属性：平均心率
const avgHeartRate = computed(() => {
  if (healthDataList.value.length === 0) return 0;
  const sum = healthDataList.value.reduce((acc, data) => acc + data.heartRate, 0);
  return Math.round(sum / healthDataList.value.length);
});

// 计算属性：平均血压
const avgBloodPressure = computed(() => {
  if (healthDataList.value.length === 0) return '0/0';
  // 简化处理，实际应该计算收缩压和舒张压的平均值
  return '120/80';
});

// 计算属性：平均睡眠时长
const avgSleepDuration = computed(() => {
  if (healthDataList.value.length === 0) return 0;
  const sum = healthDataList.value.reduce((acc, data) => acc + data.sleepDuration, 0);
  return (sum / healthDataList.value.length).toFixed(1);
});

// 计算属性：平均步数
const avgSteps = computed(() => {
  if (healthDataList.value.length === 0) return 0;
  const sum = healthDataList.value.reduce((acc, data) => acc + data.steps, 0);
  return Math.round(sum / healthDataList.value.length);
});

onMounted(() => {
  fetchElderlyList();
  fetchHealthData();
  chartInitTimer = setTimeout(() => {
    initHeartRateChart();
    initBloodPressureChart();
  }, 100);
  window.addEventListener('resize', resizeAdminHealthCharts);
});

onUnmounted(() => {
  if (chartInitTimer) clearTimeout(chartInitTimer);
  window.removeEventListener('resize', resizeAdminHealthCharts);
  if (heartRateChartInstance) {
    heartRateChartInstance.dispose();
    heartRateChartInstance = null;
  }
  if (bloodPressureChartInstance) {
    bloodPressureChartInstance.dispose();
    bloodPressureChartInstance = null;
  }
});

// 监听图表时间范围变化
watch(chartTimeRange, () => {
  updateCharts();
});

// 方法：获取老人列表
const fetchElderlyList = () => {
  // 从localStorage中获取数据，如果没有则使用模拟数据
  const savedElderlyList = localStorage.getItem('elderlyList');
  if (savedElderlyList) {
    elderlyList.value = JSON.parse(savedElderlyList).map(elderly => ({
      id: elderly.id,
      name: elderly.name
    }));
  } else {
    // 模拟API请求
    setTimeout(() => {
      elderlyList.value = [
        { id: 1, name: '张三' },
        { id: 2, name: '李四' },
        { id: 3, name: '王五' },
        { id: 4, name: '赵六' },
        { id: 5, name: '钱七' }
      ];
    }, 300);
  }
};

// 方法：获取健康数据
const fetchHealthData = () => {
  // 从localStorage中获取老人列表
  const savedElderlyList = localStorage.getItem('elderlyList');
  const elderlyMap = {};
  
  if (savedElderlyList) {
    const elderlyData = JSON.parse(savedElderlyList);
    elderlyData.forEach(elderly => {
      elderlyMap[elderly.id] = elderly.name;
    });
  }
  
  // 模拟API请求
  setTimeout(() => {
    const baseHealthData = [
      { id: 1, time: '2024-01-20 08:00', elderlyId: 1, heartRate: 75, bloodPressure: '120/80', temperature: 36.5, sleepDuration: 7.5, steps: 2500, status: 'normal' },
      { id: 2, time: '2024-01-20 09:00', elderlyId: 1, heartRate: 82, bloodPressure: '125/85', temperature: 36.6, sleepDuration: 7.5, steps: 3200, status: 'normal' },
      { id: 3, time: '2024-01-20 10:00', elderlyId: 2, heartRate: 95, bloodPressure: '140/90', temperature: 36.7, sleepDuration: 6.5, steps: 1800, status: 'warning' },
      { id: 4, time: '2024-01-20 11:00', elderlyId: 3, heartRate: 68, bloodPressure: '115/75', temperature: 36.4, sleepDuration: 8.0, steps: 4500, status: 'normal' },
      { id: 5, time: '2024-01-20 12:00', elderlyId: 4, heartRate: 105, bloodPressure: '150/95', temperature: 36.9, sleepDuration: 5.5, steps: 1200, status: 'danger' },
      { id: 6, time: '2024-01-20 13:00', elderlyId: 5, heartRate: 78, bloodPressure: '120/80', temperature: 36.5, sleepDuration: 7.0, steps: 2800, status: 'normal' },
      { id: 7, time: '2024-01-20 14:00', elderlyId: 1, heartRate: 76, bloodPressure: '122/82', temperature: 36.5, sleepDuration: 7.5, steps: 3500, status: 'normal' },
      { id: 8, time: '2024-01-20 15:00', elderlyId: 2, heartRate: 90, bloodPressure: '135/88', temperature: 36.6, sleepDuration: 6.5, steps: 2100, status: 'warning' },
      { id: 9, time: '2024-01-20 16:00', elderlyId: 3, heartRate: 70, bloodPressure: '118/76', temperature: 36.4, sleepDuration: 8.0, steps: 4800, status: 'normal' },
      { id: 10, time: '2024-01-20 17:00', elderlyId: 4, heartRate: 100, bloodPressure: '145/92', temperature: 36.8, sleepDuration: 5.5, steps: 1500, status: 'danger' }
    ];
    
    // 根据老人列表更新健康数据中的老人名称
    healthDataList.value = baseHealthData.map(data => ({
      ...data,
      elderlyName: elderlyMap[data.elderlyId] || data.elderlyName
    }));
  }, 300);
};

// 方法：筛选健康数据
const handleFilter = () => {
  currentPage.value = 1;
  // 重新获取最新的老人列表和健康数据
  fetchElderlyList();
  fetchHealthData();
};

// 方法：导出健康数据
const exportHealthData = () => {
  alert('健康数据导出功能已触发');
};

// 方法：查看健康数据详情
const viewHealthDetail = () => {
  // 跳转到健康数据详情页面
  console.log('查看健康数据详情');
};

// 方法：生成健康报告
const generateReport = () => {
  alert('健康报告生成功能已触发');
};

// 方法：上一页
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

// 方法：下一页
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

// 方法：初始化心率图表
const initHeartRateChart = () => {
  if (heartRateChart.value) {
    heartRateChartInstance = echarts.init(heartRateChart.value);
    updateHeartRateChart();
  }
};

// 方法：初始化血压图表
const initBloodPressureChart = () => {
  if (bloodPressureChart.value) {
    bloodPressureChartInstance = echarts.init(bloodPressureChart.value);
    updateBloodPressureChart();
  }
};

// 方法：更新心率图表
const updateHeartRateChart = () => {
  if (!heartRateChartInstance) return;

  const option = {
    title: {
      text: '心率趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00']
    },
    yAxis: {
      type: 'value',
      name: '心率 (bpm)',
      min: 60,
      max: 120
    },
    series: [
      {
        data: [70, 68, 72, 80, 75, 85, 78, 72],
        type: 'line',
        smooth: true,
        itemStyle: {
          color: '#ff6b6b'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(255, 107, 107, 0.3)'
            },
            {
              offset: 1,
              color: 'rgba(255, 107, 107, 0.1)'
            }
          ])
        }
      }
    ]
  };

  heartRateChartInstance.setOption(option);
};

// 方法：更新血压图表
const updateBloodPressureChart = () => {
  if (!bloodPressureChartInstance) return;

  const option = {
    title: {
      text: '血压趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00']
    },
    yAxis: {
      type: 'value',
      name: '血压 (mmHg)',
      min: 60,
      max: 160
    },
    series: [
      {
        name: '收缩压',
        data: [120, 118, 122, 125, 128, 130, 126, 122],
        type: 'line',
        smooth: true,
        itemStyle: {
          color: '#4ecdc4'
        }
      },
      {
        name: '舒张压',
        data: [80, 78, 82, 85, 88, 90, 86, 82],
        type: 'line',
        smooth: true,
        itemStyle: {
          color: '#45b7d1'
        }
      }
    ]
  };

  bloodPressureChartInstance.setOption(option);
};

// 方法：更新所有图表
const updateCharts = () => {
  updateHeartRateChart();
  updateBloodPressureChart();
};

const resizeAdminHealthCharts = () => {
  heartRateChartInstance?.resize();
  bloodPressureChartInstance?.resize();
};
</script>

<style scoped lang="scss">
.admin-health {
  padding: 24px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  min-height: 100vh;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e2e8f0;

    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;

      .back-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 8px 15px;

        .btn-icon {
          font-size: 16px;
        }
      }

      h1 {
        font-size: 24px;
        font-weight: 700;
        color: #1e293b;
        margin: 0;
      }
    }

    .header-actions {
      display: flex;
      gap: 15px;
      align-items: center;

      .filter-box {
        display: flex;
        gap: 10px;
        align-items: center;

        .filter-select {
          padding: 10px 15px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          min-width: 120px;
          background: white;
          color: #1e293b;

          &:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
        }
      }
    }
  }

  .health-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 28px;

    .overview-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 20px;
      transition: transform 0.3s ease, box-shadow 0.3s ease;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
      }

      .card-icon {
        width: 72px;
        height: 72px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #dbeafe, #bfdbfe);
        color: #3b82f6;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .card-content {
        flex: 1;

        h3 {
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          margin: 0 0 8px 0;
        }

        .card-value {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px 0;
          line-height: 1.1;

          span {
            font-size: 14px;
            font-weight: 500;
            color: #64748b;
            margin-left: 4px;
          }
        }

        .card-desc {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }
      }
    }
  }

  .health-charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 20px;
    margin-bottom: 28px;

    .chart-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      padding: 24px;

      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .chart-filter {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 12px;
          background: white;
          color: #1e293b;

          &:focus {
            outline: none;
            border-color: #3b82f6;
          }
        }
      }

      .chart-content {
        .chart {
          width: 100%;
          height: 300px;
        }
      }
    }
  }

  .health-data-list {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    overflow: hidden;

    .list-header {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;

      .list-item {
        display: flex;
        padding: 14px 20px;
        font-weight: 600;
        color: #1e293b;

        .col {
          font-weight: 600;
          font-size: 13px;
          color: #64748b;
        }
      }
    }

    .list-body {
      .list-item {
        display: flex;
        padding: 14px 20px;
        border-bottom: 1px solid #e2e8f0;
        transition: background-color 0.2s ease;

        &:hover {
          background: #f8fafc;
        }

        &:last-child {
          border-bottom: none;
        }

        .col {
          display: flex;
          align-items: center;
          padding: 0 10px;
          font-size: 14px;
          color: #1e293b;

          &.col-time {
            width: 150px;
          }

          &.col-elderly {
            width: 120px;
          }

          &.col-heart-rate {
            width: 100px;
          }

          &.col-blood-pressure {
            width: 120px;
          }

          &.col-temperature {
            width: 100px;
          }

          &.col-sleep {
            width: 120px;
          }

          &.col-steps {
            width: 100px;
          }

          &.col-status {
            width: 100px;

            .status-badge {
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 500;

              &.status-normal {
                background: #dcfce7;
                color: #166534;
              }

              &.status-warning {
                background: #fef3c7;
                color: #92400e;
              }

              &.status-danger {
                background: #fee2e2;
                color: #991b1b;
              }
            }
          }

          &.col-actions {
            width: 150px;
            display: flex;
            gap: 8px;

            .btn {
              padding: 6px 12px;
              font-size: 12px;
            }
          }
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #64748b;

      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      p {
        margin: 0;
        font-size: 14px;
      }
    }
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    margin-top: 28px;

    .page-btn {
      padding: 8px 20px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: white;
      cursor: pointer;
      font-size: 14px;
      color: #1e293b;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        border-color: #3b82f6;
        color: #3b82f6;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .page-info {
      font-size: 14px;
      color: #64748b;
    }
  }
}

// 响应式设计
@media (max-width: 1024px) {
  .admin-health {
    .health-charts {
      grid-template-columns: 1fr;
    }

    .health-overview {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}

@media (max-width: 768px) {
  .admin-health {
    padding: 15px;

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;

      .header-actions {
        flex-direction: column;
        align-items: stretch;

        .filter-box {
          flex-wrap: wrap;
        }
      }
    }

    .health-overview {
      grid-template-columns: 1fr;
    }

    .health-data-list {
      .list-item {
        flex-wrap: wrap;

        .col {
          flex: 1 1 calc(33.333% - 20px);
          margin-bottom: 10px;

          &:last-child {
            flex: 1 1 100%;
            justify-content: flex-start;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
          }
        }
      }
    }
  }
}
</style>
