<template>
  <div>
    <AppHeader title="健康趋势分析" />
    <FamilyNav />
    <div class="container">
      <div class="card filter-card">
        <div class="filter-item">
          <label>数据类型：</label>
          <select v-model="selectedType" @change="fetchTrendData" class="form-control">
            <option value="heartRate">心率</option>
            <option value="bloodPressure">血压（收缩压）</option>
            <option value="bloodOxygen">血氧</option>
            <option value="bodyTemperature">体温</option>
            <option value="respirationRate">呼吸率</option>
            <option value="bloodGlucose">血糖</option>
          </select>
        </div>
        <div class="filter-item">
          <label>时间范围：</label>
          <select v-model="timeRange" @change="fetchTrendData" class="form-control">
            <option value="7">近7天</option>
            <option value="30">近30天</option>
            <option value="90">近90天</option>
          </select>
        </div>
        <div class="filter-item">
          <label>分析维度：</label>
          <select v-model="analysisDimension" @change="fetchTrendData" class="form-control">
            <option value="day">按日</option>
            <option value="week">按周</option>
            <option value="month">按月</option>
          </select>
        </div>
        <div class="filter-item">
          <label>对比模式：</label>
          <select v-model="comparisonMode" @change="fetchTrendData" class="form-control">
            <option value="none">无对比</option>
            <option value="previous">与上期对比</option>
            <option value="standard">与标准值对比</option>
          </select>
        </div>
        <div class="filter-item">
          <label>老人ID：</label>
          <input type="text" v-model="elderlyId" readonly class="form-control" />
        </div>
      </div>

      <div class="card chart-card">
        <div class="chart-header">
          <h3>{{ getChartTitle() }}</h3>
          <div class="chart-actions">
            <button class="btn btn-outline btn-sm" @click="exportChart">导出图表</button>
            <button class="btn btn-outline btn-sm" @click="exportData">导出数据</button>
          </div>
        </div>
        <div class="loading-overlay" v-if="isLoading">
          <div class="loading-spinner"></div>
          <div class="loading-text">加载中...</div>
        </div>
        <div id="trendChart" class="chart-container"></div>
      </div>

      <!-- 统计概览 -->
      <div class="statistics-section">
        <h3 class="section-title">
          <IconSvg name="pie-chart" :size="24" />
          <span>统计概览</span>
        </h3>
        <div class="statistics-grid">
          <div class="stat-card primary">
            <div class="stat-icon">
              <IconSvg name="activity" :size="28" />
            </div>
            <div class="stat-info">
              <div class="stat-label">平均值</div>
              <div class="stat-value">{{ statistics.avg }}</div>
              <div class="stat-unit">{{ getTypeUnit(selectedType) }}</div>
            </div>
          </div>
          <div class="stat-card success">
            <div class="stat-icon">
              <IconSvg name="trending-up" :size="28" />
            </div>
            <div class="stat-info">
              <div class="stat-label">最大值</div>
              <div class="stat-value">{{ statistics.max }}</div>
              <div class="stat-unit">{{ getTypeUnit(selectedType) }}</div>
            </div>
          </div>
          <div class="stat-card warning">
            <div class="stat-icon">
              <IconSvg name="trending-down" :size="28" />
            </div>
            <div class="stat-info">
              <div class="stat-label">最小值</div>
              <div class="stat-value">{{ statistics.min }}</div>
              <div class="stat-unit">{{ getTypeUnit(selectedType) }}</div>
            </div>
          </div>
          <div class="stat-card danger" :class="{ 'is-abnormal': statistics.abnormalCount > 0 }">
            <div class="stat-icon">
              <IconSvg name="alert-triangle" :size="28" />
            </div>
            <div class="stat-info">
              <div class="stat-label">异常次数</div>
              <div class="stat-value">{{ statistics.abnormalCount }}</div>
              <div class="stat-badge" v-if="statistics.abnormalCount > 0">需关注</div>
            </div>
          </div>
          <div class="stat-card info">
            <div class="stat-icon">
              <IconSvg name="percent" :size="28" />
            </div>
            <div class="stat-info">
              <div class="stat-label">异常率</div>
              <div class="stat-value">{{ statistics.abnormalRate }}</div>
              <div class="stat-progress">
                <div class="progress-bar" :style="{ width: statistics.abnormalRate }"></div>
              </div>
            </div>
          </div>
          <div class="stat-card purple">
            <div class="stat-icon">
              <IconSvg :name="getTrendIcon(statistics.trend)" :size="28" />
            </div>
            <div class="stat-info">
              <div class="stat-label">整体趋势</div>
              <div class="stat-value" :class="'trend-' + getTrendClass(statistics.trend)">
                {{ statistics.trend }}
              </div>
              <div class="stat-trend-indicator" :class="getTrendClass(statistics.trend)">
                <IconSvg :name="getTrendArrow(statistics.trend)" :size="16" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card analysis-card">
        <h3>数据分析</h3>
        <div class="analysis-content">
          <p>{{ getAnalysisText() }}</p>
          <div class="analysis-insights" v-if="analysisInsights.length > 0">
            <h4>关键洞察</h4>
            <ul>
              <li v-for="(insight, index) in analysisInsights" :key="index">{{ insight }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import AppHeader from '../components/AppHeader.vue';
import FamilyNav from '../components/FamilyNav.vue';
import { getHealthTrend } from '../api/health';

const elderlyId = ref(localStorage.getItem('current_elderly_id') || '1001');
const selectedType = ref('heartRate');
const timeRange = ref('7');
const analysisDimension = ref('day');
const comparisonMode = ref('none');
const isLoading = ref(false);
const statistics = ref({
  avg: '-',
  max: '-',
  min: '-',
  abnormalCount: '-',
  abnormalRate: '-',
  trend: '-'
});
const analysisInsights = ref([]);
let chartInstance = null;
let currentData = null;

// 计算属性：图表标题
const getChartTitle = () => {
  const typeMap = {
    heartRate: '心率',
    bloodPressure: '血压（收缩压）',
    bloodOxygen: '血氧',
    bodyTemperature: '体温',
    respirationRate: '呼吸率',
    bloodGlucose: '血糖'
  };
  const dimensionMap = {
    day: '按日',
    week: '按周',
    month: '按月'
  };
  return `${typeMap[selectedType.value]}近${timeRange.value}天趋势（${dimensionMap[analysisDimension.value]}）`;
};

// 计算属性：分析文本
const getAnalysisText = () => {
  const typeMap = {
    heartRate: '心率是反映心脏功能的重要指标，正常范围为60-100次/分。如果心率持续偏高或偏低，建议及时就医。',
    bloodPressure: '血压是反映心血管健康的重要指标，正常范围为≤140/90 mmHg。如果血压持续偏高，建议调整生活方式并咨询医生。',
    bloodOxygen: '血氧是反映呼吸系统功能的重要指标，正常范围为≥95%。如果血氧持续偏低，建议及时就医检查。',
    bodyTemperature: '体温是反映身体状态的重要指标，正常范围为36.0-37.3℃。如果体温异常，可能提示感染或其他健康问题。',
    respirationRate: '呼吸率是反映呼吸系统功能的重要指标，正常范围为12-20次/分。如果呼吸率异常，建议及时就医。',
    bloodGlucose: '血糖是反映代谢功能的重要指标，正常范围为3.9-6.1mmol/L。如果血糖异常，建议调整饮食并咨询医生。'
  };
  return typeMap[selectedType.value];
};

// 获取趋势图标
const getTrendIcon = (trend) => {
  const icons = {
    '上升': 'trending-up',
    '下降': 'trending-down',
    '稳定': 'minus'
  };
  return icons[trend] || 'minus';
};

// 获取趋势箭头
const getTrendArrow = (trend) => {
  const arrows = {
    '上升': 'arrow-up',
    '下降': 'arrow-down',
    '稳定': 'minus'
  };
  return arrows[trend] || 'minus';
};

// 获取趋势样式类
const getTrendClass = (trend) => {
  const classes = {
    '上升': 'up',
    '下降': 'down',
    '稳定': 'stable'
  };
  return classes[trend] || 'stable';
};

// 获取趋势数据
const fetchTrendData = async () => {
  try {
    isLoading.value = true;
    // 调用真实API获取数据
    const response = await getHealthTrend(
      elderlyId.value,
      selectedType.value,
      parseInt(timeRange.value)
    );

    currentData = {
      dates: response.dates,
      values: response.values,
      previousValues: response.previousValues
    };

    // 使用API返回的统计数据
    statistics.value = response.statistics;

    generateAnalysisInsights(currentData);

    // 等待 DOM 更新后再初始化图表
    await nextTick();
    initChart(currentData);
  } catch (error) {
    console.error('获取趋势数据失败：', error);
    // 使用模拟数据作为后备
    const mockData = generateMockData();
    currentData = mockData;
    calculateStatistics(mockData);
    generateAnalysisInsights(mockData);
    await nextTick();
    initChart(mockData);
  } finally {
    isLoading.value = false;
  }
};

// 生成模拟数据
const generateMockData = () => {
  const days = parseInt(timeRange.value);
  const dates = [];
  const values = [];
  const previousValues = [];
  
  // 生成日期
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toLocaleDateString('zh-CN'));
  }
  
  // 生成随机数据
  let baseValue, variation;
  switch (selectedType.value) {
    case 'heartRate':
      baseValue = 75;
      variation = 10;
      break;
    case 'bloodPressure':
      baseValue = 130;
      variation = 15;
      break;
    case 'bloodOxygen':
      baseValue = 98;
      variation = 2;
      break;
    case 'bodyTemperature':
      baseValue = 36.5;
      variation = 0.3;
      break;
    case 'respirationRate':
      baseValue = 16;
      variation = 3;
      break;
    case 'bloodGlucose':
      baseValue = 5.5;
      variation = 1;
      break;
    default:
      baseValue = 50;
      variation = 10;
  }
  
  for (let i = 0; i < days; i++) {
    const value = baseValue + (Math.random() - 0.5) * variation * 2;
    values.push(parseFloat(value.toFixed(1)));
    // 生成上期数据
    const previousValue = baseValue + (Math.random() - 0.5) * variation * 2;
    previousValues.push(parseFloat(previousValue.toFixed(1)));
  }
  
  return {
    dates,
    values,
    previousValues
  };
};

// 计算统计数据
const calculateStatistics = (data) => {
  const values = data.values;
  if (values.length === 0) return;

  const avg = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
  const max = parseFloat(Math.max(...values).toFixed(1));
  const min = parseFloat(Math.min(...values).toFixed(1));
  
  // 计算异常次数
  let abnormalCount = 0;
  values.forEach(val => {
    switch (selectedType.value) {
      case 'heartRate':
        if (val < 60 || val > 100) abnormalCount++;
        break;
      case 'bloodPressure':
        if (val > 140) abnormalCount++;
        break;
      case 'bloodOxygen':
        if (val < 95) abnormalCount++;
        break;
      case 'bodyTemperature':
        if (val < 36.0 || val > 37.3) abnormalCount++;
        break;
      case 'respirationRate':
        if (val < 12 || val > 20) abnormalCount++;
        break;
      case 'bloodGlucose':
        if (val < 3.9 || val > 6.1) abnormalCount++;
        break;
    }
  });
  
  const abnormalRate = ((abnormalCount / values.length) * 100).toFixed(1) + '%';
  
  // 计算趋势
  let trend = '稳定';
  if (values.length >= 2) {
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const changeRate = (Math.abs(secondAvg - firstAvg) / firstAvg) * 100;
    
    if (changeRate > 5) {
      trend = secondAvg > firstAvg ? '上升' : '下降';
    }
  }
  
  statistics.value = {
    avg,
    max,
    min,
    abnormalCount,
    abnormalRate,
    trend
  };
};

// 生成分析洞察
const generateAnalysisInsights = () => {
  const insights = [];
  
  // 基于统计数据生成洞察
  if (statistics.value.abnormalCount > 0) {
    insights.push(`在过去${timeRange.value}天内，${getTypeLabel(selectedType.value)}出现了${statistics.value.abnormalCount}次异常，异常率为${statistics.value.abnormalRate}。`);
  }
  
  if (statistics.value.trend !== '稳定') {
    insights.push(`${getTypeLabel(selectedType.value)}整体呈${statistics.value.trend}趋势，建议关注。`);
  }
  
  // 基于具体数据生成洞察
  const avg = statistics.value.avg;
  switch (selectedType.value) {
    case 'heartRate':
      if (avg < 60) {
        insights.push('平均心率偏低，可能与运动量不足或某些药物有关。');
      } else if (avg > 100) {
        insights.push('平均心率偏高，可能与运动、情绪或某些健康问题有关。');
      }
      break;
    case 'bloodPressure':
      if (avg > 140) {
        insights.push('平均血压偏高，建议减少盐分摄入，增加运动量，并咨询医生。');
      }
      break;
    case 'bloodOxygen':
      if (avg < 95) {
        insights.push('平均血氧偏低，建议保持室内通风，必要时咨询医生。');
      }
      break;
    case 'bodyTemperature':
      if (avg < 36.0) {
        insights.push('平均体温偏低，可能与代谢率低或环境温度有关。');
      } else if (avg > 37.3) {
        insights.push('平均体温偏高，可能存在感染或其他健康问题，建议就医。');
      }
      break;
    case 'respirationRate':
      if (avg < 12) {
        insights.push('平均呼吸率偏低，可能与某些药物或健康问题有关。');
      } else if (avg > 20) {
        insights.push('平均呼吸率偏高，可能与运动、情绪或某些健康问题有关。');
      }
      break;
    case 'bloodGlucose':
      if (avg < 3.9) {
        insights.push('平均血糖偏低，建议规律饮食，避免长时间空腹。');
      } else if (avg > 6.1) {
        insights.push('平均血糖偏高，建议控制碳水化合物摄入，增加运动量，并咨询医生。');
      }
      break;
  }
  
  analysisInsights.value = insights;
};

// 获取数据类型标签
const getTypeLabel = (type) => {
  const typeMap = {
    heartRate: '心率',
    bloodPressure: '血压',
    bloodOxygen: '血氧',
    bodyTemperature: '体温',
    respirationRate: '呼吸率',
    bloodGlucose: '血糖'
  };
  return typeMap[type] || type;
};

// 获取数据单位
const getTypeUnit = (type) => {
  const unitMap = {
    heartRate: '次/分',
    bloodPressure: 'mmHg',
    bloodOxygen: '%',
    bodyTemperature: '℃',
    respirationRate: '次/分',
    bloodGlucose: 'mmol/L'
  };
  return unitMap[type] || '';
};

// 获取正常值范围
const getNormalRange = (type) => {
  const rangeMap = {
    heartRate: { min: 60, max: 100 },
    bloodPressure: { min: 90, max: 140 },
    bloodOxygen: { min: 95, max: 100 },
    bodyTemperature: { min: 36.0, max: 37.3 },
    respirationRate: { min: 12, max: 20 },
    bloodGlucose: { min: 3.9, max: 6.1 }
  };
  return rangeMap[type] || { min: 0, max: 100 };
};

// 初始化ECharts图表
const initChart = (data) => {
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
  const chartDom = document.getElementById('trendChart');
  if (!chartDom) {
    console.warn('Chart container not found');
    return;
  }
  chartInstance = echarts.init(chartDom);

  // 标记异常数据
  const markPoint = data.values.map((val, idx) => {
    const range = getNormalRange(selectedType.value);
    const isAbnormal = val < range.min || val > range.max;
    return isAbnormal ? { name: '异常', value: val, xAxis: idx, yAxis: val } : null;
  }).filter(Boolean);

  // 计算正常值范围
  let minValue = Math.min(...data.values);
  let maxValue = Math.max(...data.values);
  const normalRange = getNormalRange(selectedType.value);
  let normalMin = normalRange.min;
  let normalMax = normalRange.max;

  // 调整Y轴范围
  minValue = Math.min(minValue, normalMin - 10);
  maxValue = Math.max(maxValue, normalMax + 10);

  // 构建系列数据
  const series = [
    {
      name: getTypeLabel(selectedType.value),
      data: data.values,
      type: 'line',
      smooth: true,
      lineStyle: { width: 3, color: '#165DFF' },
      itemStyle: { color: '#165DFF' },
      symbol: 'circle',
      symbolSize: 8,
      markPoint: {
        data: markPoint,
        itemStyle: { color: '#FF4D4F' },
        symbolSize: 40
      },
      markArea: {
        silent: true,
        data: [
          [
            {
              yAxis: normalMin,
              itemStyle: {
                color: 'rgba(82, 196, 26, 0.1)'
              }
            },
            {
              yAxis: normalMax
            }
          ]
        ]
      }
    }
  ];

  // 添加对比数据
  if (comparisonMode.value === 'previous' && data.previousValues) {
    series.push({
      name: '上期数据',
      data: data.previousValues,
      type: 'line',
      smooth: true,
      lineStyle: { width: 2, color: '#95DE64', type: 'dashed' },
      itemStyle: { color: '#95DE64' },
      symbol: 'circle',
      symbolSize: 6
    });
  }

  const option = {
    title: {
      text: getChartTitle(),
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    xAxis: {
      type: 'category',
      data: data.dates,
      axisLabel: {
        rotate: 45,
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      min: minValue,
      max: maxValue,
      axisLabel: {
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#f0f0f0'
        }
      }
    },
    series: series,
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        let result = `${params[0].name}<br/>`;
        params.forEach(param => {
          result += `${param.seriesName}: ${param.value} ${getTypeUnit(selectedType.value)}<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: series.map(s => s.name),
      top: 30
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '15%',
      top: '20%'
    },
    toolbox: {
      feature: {
        saveAsImage: {
          title: '保存图片'
        },
        dataZoom: {
          title: {
            zoom: '区域缩放',
            back: '缩放还原'
          }
        }
      }
    }
  };
  chartInstance.setOption(option);
};

// 导出图表
const exportChart = () => {
  if (chartInstance) {
    const url = chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff'
    });
    const link = document.createElement('a');
    link.download = `${getChartTitle()}.png`;
    link.href = url;
    link.click();
  }
};

// 导出数据
const exportData = () => {
  if (!currentData) return;
  
  const exportContent = generateExportContent(currentData);
  const blob = new Blob([exportContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${getTypeLabel(selectedType.value)}_趋势数据_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 生成导出内容
const generateExportContent = (data) => {
  const typeLabel = getTypeLabel(selectedType.value);
  const unit = getTypeUnit(selectedType.value);
  
  let content = `日期,${typeLabel}(${unit})`;
  if (comparisonMode.value === 'previous') {
    content += `,上期${typeLabel}(${unit})`;
  }
  content += '\n';
  
  data.dates.forEach((date, index) => {
    content += `${date},${data.values[index]}`;
    if (comparisonMode.value === 'previous' && data.previousValues) {
      content += `,${data.previousValues[index]}`;
    }
    content += '\n';
  });
  
  // 添加统计数据
  content += '\n统计数据,\n';
  content += `平均值,${statistics.value.avg}\n`;
  content += `最大值,${statistics.value.max}\n`;
  content += `最小值,${statistics.value.min}\n`;
  content += `异常次数,${statistics.value.abnormalCount}\n`;
  content += `异常率,${statistics.value.abnormalRate}\n`;
  content += `趋势,${statistics.value.trend}\n`;
  
  return content;
};

// 页面生命周期
const resizeTrendChart = () => {
  chartInstance?.resize();
};

onMounted(() => {
  fetchTrendData();
  window.addEventListener('resize', resizeTrendChart);
});
onUnmounted(() => {
  if (chartInstance) chartInstance.dispose();
  window.removeEventListener('resize', resizeTrendChart);
});
</script>

<style scoped lang="scss">
.filter-card {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;

  .filter-item {
    display: flex;
    align-items: center;
    gap: 8px;

    label {
      font-weight: 500;
      color: #1e293b;
      white-space: nowrap;
    }

    .form-control {
      padding: 8px 12px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      min-width: 160px;
      font-size: 14px;

      &:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
      }

      &[readonly] {
        background-color: #f8fafc;
        cursor: not-allowed;
      }
    }
  }
}

.chart-card {
  position: relative;
  margin-bottom: 24px;

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }

    .chart-actions {
      display: flex;
      gap: 10px;
    }
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 10;
    border-radius: 12px;

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(37, 99, 235, 0.2);
      border-top: 3px solid #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 12px;
    }

    .loading-text {
      color: #1e293b;
      font-size: 14px;
    }
  }

  .chart-container {
    width: 100%;
    height: 450px;
  }
}

.analysis-card {
  margin-top: 24px;
  border-radius: 12px;

  h3 {
    margin-bottom: 20px;
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 10px;

    &::before {
      content: '';
      width: 4px;
      height: 20px;
      background: linear-gradient(180deg, #722ED1, #B37FEB);
      border-radius: 2px;
    }
  }

  .analysis-content {
    background: linear-gradient(135deg, rgba(114, 46, 209, 0.05), rgba(179, 127, 235, 0.05));
    padding: 24px;
    border-radius: 12px;
    border-left: 4px solid #722ED1;

    p {
      margin: 0 0 20px 0;
      color: #1e293b;
      line-height: 1.8;
      font-size: 14px;
    }

    .analysis-insights {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(226, 232, 240, 0.5);

      h4 {
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;

        &::before {
          content: '💡';
          font-size: 18px;
        }
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          position: relative;
          padding: 12px 12px 12px 32px;
          margin-bottom: 10px;
          background: #fff;
          border-radius: 8px;
          font-size: 14px;
          color: #1e293b;
          line-height: 1.6;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
          transition: all 0.3s ease;

          &:hover {
            transform: translateX(4px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          }

          &::before {
            content: '';
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: linear-gradient(135deg, #722ED1, #B37FEB);
          }

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }
  }
}

// 动画效果
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 统计概览样式
.statistics-section {
  margin: 24px 0;

  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid rgba(37, 99, 235, 0.1);

    svg {
      color: #2563eb;
    }
  }
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
  }

  &.primary {
    &::before { background: linear-gradient(180deg, #165DFF, #4080FF); }
    .stat-icon { background: rgba(22, 93, 255, 0.1); color: #165DFF; }
  }

  &.success {
    &::before { background: linear-gradient(180deg, #52C41A, #73D13D); }
    .stat-icon { background: rgba(82, 196, 26, 0.1); color: #52C41A; }
  }

  &.warning {
    &::before { background: linear-gradient(180deg, #FAAD14, #FFC53D); }
    .stat-icon { background: rgba(250, 173, 20, 0.1); color: #FAAD14; }
  }

  &.danger {
    &::before { background: linear-gradient(180deg, #FF4D4F, #FF7875); }
    .stat-icon { background: rgba(255, 77, 79, 0.1); color: #FF4D4F; }

    &.is-abnormal {
      border-color: #FF4D4F;
      animation: pulse-danger 2s ease-in-out infinite;
    }
  }

  &.info {
    &::before { background: linear-gradient(180deg, #13C2C2, #36CFC9); }
    .stat-icon { background: rgba(19, 194, 194, 0.1); color: #13C2C2; }
  }

  &.purple {
    &::before { background: linear-gradient(180deg, #722ED1, #B37FEB); }
    .stat-icon { background: rgba(114, 46, 209, 0.1); color: #722ED1; }
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.3s ease;

    svg {
      transition: transform 0.3s ease;
    }
  }

  &:hover .stat-icon svg {
    transform: scale(1.1);
  }

  .stat-info {
    flex: 1;
    min-width: 0;

    .stat-label {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 6px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.2;
      margin-bottom: 4px;

      &.trend-up {
        color: #FF4D4F;
      }

      &.trend-down {
        color: #52C41A;
      }

      &.trend-stable {
        color: #8C8C8C;
      }
    }

    .stat-unit {
      font-size: 12px;
      color: #64748b;
    }

    .stat-badge {
      display: inline-block;
      padding: 2px 8px;
      background: #FF4D4F;
      color: #fff;
      font-size: 11px;
      border-radius: 10px;
      margin-top: 4px;
      font-weight: 500;
    }

    .stat-progress {
      height: 6px;
      background: rgba(0, 0, 0, 0.06);
      border-radius: 3px;
      margin-top: 8px;
      overflow: hidden;

      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #13C2C2, #36CFC9);
        border-radius: 3px;
        transition: width 0.6s ease;
      }
    }

    .stat-trend-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      margin-top: 6px;

      &.up {
        background: rgba(255, 77, 79, 0.1);
        color: #FF4D4F;
      }

      &.down {
        background: rgba(82, 196, 26, 0.1);
        color: #52C41A;
      }

      &.stable {
        background: rgba(140, 140, 140, 0.1);
        color: #8C8C8C;
      }
    }
  }
}

@keyframes pulse-danger {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 77, 79, 0);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .filter-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;

    .filter-item {
      width: 100%;

      .form-control {
        flex: 1;
        min-width: auto;
      }
    }
  }

  .chart-card {
    .chart-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }

    .chart-container {
      height: 350px;
    }
  }

  .statistics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat-card {
    padding: 16px;

    .stat-icon {
      width: 44px;
      height: 44px;
    }

    .stat-info {
      .stat-value {
        font-size: 20px;
      }

      .stat-label {
        font-size: 12px;
      }
    }
  }
}

@media (max-width: 480px) {
  .statistics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
