<template>
  <div class="admin-statistics">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <button class="btn btn-secondary back-btn" @click="router.push('/admin/dashboard')">
          <IconSvg name="arrow-left" :size="16" />
          <span>返回</span>
        </button>
        <h1>数据统计与分析</h1>
      </div>
      <div class="header-actions">
        <div class="filter-box">
          <select v-model="selectedDateRange" class="filter-select">
            <option value="week">近7天</option>
            <option value="month">近30天</option>
            <option value="quarter">近90天</option>
            <option value="year">近1年</option>
          </select>
          <button class="btn btn-secondary" @click="handleFilter">筛选</button>
        </div>
        <button class="btn btn-primary" @click="exportStatistics">
          <IconSvg name="download" :size="16" />
          <span>导出报表</span>
        </button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="statistics-overview">
      <div class="overview-card">
        <div class="card-icon">
          <IconSvg name="users" :size="32" />
        </div>
        <div class="card-content">
          <h3>老人总数</h3>
          <p class="card-value">{{ totalElderly }}</p>
          <p class="card-desc">系统注册老人</p>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon">
          <IconSvg name="user" :size="32" />
        </div>
        <div class="card-content">
          <h3>家属总数</h3>
          <p class="card-value">{{ totalFamilies }}</p>
          <p class="card-desc">系统注册家属</p>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon warning">
          <IconSvg name="warning" :size="32" />
        </div>
        <div class="card-content">
          <h3>预警总数</h3>
          <p class="card-value">{{ totalWarnings }}</p>
          <p class="card-desc">健康预警记录</p>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon">
          <IconSvg name="calendar" :size="32" />
        </div>
        <div class="card-content">
          <h3>服务预约</h3>
          <p class="card-value">{{ totalServices }}</p>
          <p class="card-desc">服务预约记录</p>
        </div>
      </div>
    </div>

    <!-- 统计图表 -->
    <div class="statistics-charts">
      <!-- 健康预警趋势图 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>健康预警趋势</h3>
          <p class="chart-desc">近7天健康预警数量变化</p>
        </div>
        <div class="chart-content">
          <div ref="warningTrendChart" class="chart"></div>
        </div>
      </div>

      <!-- 服务预约分布图 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>服务预约分布</h3>
          <p class="chart-desc">各类型服务预约占比</p>
        </div>
        <div class="chart-content">
          <div ref="serviceDistributionChart" class="chart"></div>
        </div>
      </div>

      <!-- 老人健康状态图 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>老人健康状态</h3>
          <p class="chart-desc">老人健康状态分布</p>
        </div>
        <div class="chart-content">
          <div ref="healthStatusChart" class="chart"></div>
        </div>
      </div>

      <!-- 系统活跃度图 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>系统活跃度</h3>
          <p class="chart-desc">近7天系统登录活跃情况</p>
        </div>
        <div class="chart-content">
          <div ref="systemActivityChart" class="chart"></div>
        </div>
      </div>
    </div>

    <!-- 详细统计数据 -->
    <div class="detailed-statistics">
      <div class="statistics-section">
        <h2>健康数据统计</h2>
        <div class="statistics-grid">
          <div class="stat-item">
            <h4>平均心率</h4>
            <p class="stat-value">{{ avgHeartRate }} <span>bpm</span></p>
          </div>
          <div class="stat-item">
            <h4>平均血压</h4>
            <p class="stat-value">{{ avgBloodPressure }} <span>mmHg</span></p>
          </div>
          <div class="stat-item">
            <h4>平均体温</h4>
            <p class="stat-value">{{ avgTemperature }} <span>°C</span></p>
          </div>
          <div class="stat-item">
            <h4>平均睡眠</h4>
            <p class="stat-value">{{ avgSleep }} <span>小时</span></p>
          </div>
          <div class="stat-item">
            <h4>平均步数</h4>
            <p class="stat-value">{{ avgSteps }} <span>步</span></p>
          </div>
          <div class="stat-item">
            <h4>异常率</h4>
            <p class="stat-value">{{ abnormalRate }} <span>%</span></p>
          </div>
        </div>
      </div>

      <div class="statistics-section">
        <h2>服务统计</h2>
        <div class="statistics-grid">
          <div class="stat-item">
            <h4>护理服务</h4>
            <p class="stat-value">{{ nursingServices }}</p>
          </div>
          <div class="stat-item">
            <h4>医疗服务</h4>
            <p class="stat-value">{{ medicalServices }}</p>
          </div>
          <div class="stat-item">
            <h4>娱乐活动</h4>
            <p class="stat-value">{{ recreationServices }}</p>
          </div>
          <div class="stat-item">
            <h4>其他服务</h4>
            <p class="stat-value">{{ otherServices }}</p>
          </div>
          <div class="stat-item">
            <h4>预约成功率</h4>
            <p class="stat-value">{{ successRate }} <span>%</span></p>
          </div>
          <div class="stat-item">
            <h4>服务完成率</h4>
            <p class="stat-value">{{ completionRate }} <span>%</span></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import IconSvg from '../components/IconSvg.vue';

// 路由实例
const router = useRouter();

// 响应式数据
const selectedDateRange = ref('week');
const warningTrendChart = ref(null);
const serviceDistributionChart = ref(null);
const healthStatusChart = ref(null);
const systemActivityChart = ref(null);
let warningTrendChartInstance = null;
let serviceDistributionChartInstance = null;
let healthStatusChartInstance = null;
let systemActivityChartInstance = null;
let chartInitTimer = null;

// 统计数据
const totalElderly = ref(128);
const totalFamilies = ref(96);
const totalWarnings = ref(256);
const totalServices = ref(180);
const avgHeartRate = ref(78);
const avgBloodPressure = ref('120/80');
const avgTemperature = ref(36.5);
const avgSleep = ref(7.2);
const avgSteps = ref(3200);
const abnormalRate = ref(15.8);
const nursingServices = ref(85);
const medicalServices = ref(45);
const recreationServices = ref(35);
const otherServices = ref(15);
const successRate = ref(85.5);
const completionRate = ref(92.3);

// 生命周期：组件挂载后初始化图表
onMounted(() => {
  chartInitTimer = setTimeout(() => {
    initWarningTrendChart();
    initServiceDistributionChart();
    initHealthStatusChart();
    initSystemActivityChart();
  }, 100);
  window.addEventListener('resize', resizeAdminStatisticsCharts);
});

onUnmounted(() => {
  if (chartInitTimer) clearTimeout(chartInitTimer);
  window.removeEventListener('resize', resizeAdminStatisticsCharts);
  [
    warningTrendChartInstance,
    serviceDistributionChartInstance,
    healthStatusChartInstance,
    systemActivityChartInstance
  ].forEach(chart => chart?.dispose());
  warningTrendChartInstance = null;
  serviceDistributionChartInstance = null;
  healthStatusChartInstance = null;
  systemActivityChartInstance = null;
});

// 监听日期范围变化
watch(selectedDateRange, () => {
  handleFilter();
});

// 方法：筛选统计数据
const handleFilter = () => {
  // 根据日期范围更新图表数据
  updateCharts();
};

// 方法：导出统计报表
const exportStatistics = () => {
  alert('统计报表导出功能已触发');
};

// 方法：初始化预警趋势图表
const initWarningTrendChart = () => {
  if (warningTrendChart.value) {
    warningTrendChartInstance = echarts.init(warningTrendChart.value);
    updateWarningTrendChart();
  }
};

// 方法：初始化服务分布图表
const initServiceDistributionChart = () => {
  if (serviceDistributionChart.value) {
    serviceDistributionChartInstance = echarts.init(serviceDistributionChart.value);
    updateServiceDistributionChart();
  }
};

// 方法：初始化健康状态图表
const initHealthStatusChart = () => {
  if (healthStatusChart.value) {
    healthStatusChartInstance = echarts.init(healthStatusChart.value);
    updateHealthStatusChart();
  }
};

// 方法：初始化系统活跃度图表
const initSystemActivityChart = () => {
  if (systemActivityChart.value) {
    systemActivityChartInstance = echarts.init(systemActivityChart.value);
    updateSystemActivityChart();
  }
};

// 方法：更新预警趋势图表
const updateWarningTrendChart = () => {
  if (!warningTrendChartInstance) return;

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: ['1月14日', '1月15日', '1月16日', '1月17日', '1月18日', '1月19日', '1月20日']
    },
    yAxis: {
      type: 'value',
      name: '预警数'
    },
    series: [
      {
        data: [12, 19, 15, 25, 22, 30, 28],
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

  warningTrendChartInstance.setOption(option);
};

// 方法：更新服务分布图表
const updateServiceDistributionChart = () => {
  if (!serviceDistributionChartInstance) return;

  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      top: '5%',
      left: 'center'
    },
    series: [
      {
        name: '服务类型',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
          color: function(params) {
            const colors = ['#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
            return colors[params.dataIndex];
          }
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: 85, name: '护理服务' },
          { value: 45, name: '医疗服务' },
          { value: 35, name: '娱乐活动' },
          { value: 15, name: '其他服务' }
        ]
      }
    ]
  };

  serviceDistributionChartInstance.setOption(option);
};

// 方法：更新健康状态图表
const updateHealthStatusChart = () => {
  if (!healthStatusChartInstance) return;

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: ['健康', '轻度异常', '中度异常', '重度异常']
    },
    yAxis: {
      type: 'value',
      name: '老人数量'
    },
    series: [
      {
        data: [85, 25, 15, 3],
        type: 'bar',
        itemStyle: {
          color: function(params) {
            const colors = ['#4ecdc4', '#ffeaa7', '#fab1a0', '#ff7675'];
            return colors[params.dataIndex];
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  healthStatusChartInstance.setOption(option);
};

// 方法：更新系统活跃度图表
const updateSystemActivityChart = () => {
  if (!systemActivityChartInstance) return;

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: ['1月14日', '1月15日', '1月16日', '1月17日', '1月18日', '1月19日', '1月20日']
    },
    yAxis: {
      type: 'value',
      name: '登录次数'
    },
    series: [
      {
        name: '家属登录',
        data: [45, 52, 49, 60, 58, 65, 70],
        type: 'line',
        smooth: true,
        itemStyle: {
          color: '#45b7d1'
        }
      },
      {
        name: '管理员登录',
        data: [12, 15, 10, 18, 16, 20, 22],
        type: 'line',
        smooth: true,
        itemStyle: {
          color: '#96ceb4'
        }
      }
    ]
  };

  systemActivityChartInstance.setOption(option);
};

// 方法：更新所有图表
const updateCharts = () => {
  updateWarningTrendChart();
  updateServiceDistributionChart();
  updateHealthStatusChart();
  updateSystemActivityChart();
};

const resizeAdminStatisticsCharts = () => {
  warningTrendChartInstance?.resize();
  serviceDistributionChartInstance?.resize();
  healthStatusChartInstance?.resize();
  systemActivityChartInstance?.resize();
};
</script>

<style scoped lang="scss">
.admin-statistics {
  padding: 20px;
  background: #f8fafc;
  min-height: 100vh;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 15px;
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
          font-size: 14px;
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
          border-radius: 12px;
          font-size: 13px;
          min-width: 120px;

          &:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }
        }
      }
    }
  }

  .statistics-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;

    .overview-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 15px;
      transition: transform 0.25s ease, box-shadow 0.25s ease;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
      }

      .card-icon {
        font-size: 40px;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8fafc;
        border-radius: 50%;
      }

      .card-content {
        flex: 1;

        h3 {
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          margin: 0 0 8px 0;
        }

        .card-value {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .card-desc {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }
      }
    }
  }

  .statistics-charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 20px;
    margin-bottom: 30px;

    .chart-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      padding: 20px;

      .chart-header {
        margin-bottom: 20px;

        h3 {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .chart-desc {
          font-size: 13px;
          color: #64748b;
          margin: 0;
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

  .detailed-statistics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
    gap: 30px;

    .statistics-section {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      padding: 25px;

      h2 {
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 25px 0;
        padding-bottom: 15px;
        border-bottom: 1px solid #e2e8f0;
      }

      .statistics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 20px;

        .stat-item {
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          transition: transform 0.25s ease, box-shadow 0.25s ease;

          &:hover {
            transform: translateY(-3px);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          h4 {
            font-size: 13px;
            font-weight: 500;
            color: #64748b;
            margin: 0 0 10px 0;
          }

          .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
            margin: 0;

            span {
              font-size: 13px;
              font-weight: 500;
              color: #64748b;
              margin-left: 4px;
            }
          }
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 1024px) {
  .admin-statistics {
    .statistics-charts {
      grid-template-columns: 1fr;
    }

    .detailed-statistics {
      grid-template-columns: 1fr;
    }

    .statistics-overview {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}

@media (max-width: 768px) {
  .admin-statistics {
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

    .statistics-overview {
      grid-template-columns: 1fr;
    }

    .detailed-statistics {
      .statistics-section {
        .statistics-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    }
  }
}
</style>
