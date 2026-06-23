// 健康相关接口封装（对接硬件设备和数据库）
// ============================================
// 使用说明：
// 1. 当前为模拟数据模式，用于前端开发调试
// 2. 对接真实后端时，取消注释真实接口调用，删除模拟代码
// 3. 确保后端接口返回格式符合约定：{ code: 200, data: {...}, msg: "成功" }

// 假设你的 Python 服务跑在本地 8000 端口
const AI_BASE_URL = 'https://yijing-ai-backend.onrender.com';

/**
 * 将实时生理数据发送给 MIRMAD 算法进行高维异常检测
 * @param {Object} data - { elderlyId, bloodOxygen, heartRate, bloodPressureSys }
 */
export const checkHealthAnomaly = async (data) => {
  try {
    const response = await fetch(`${AI_BASE_URL}/api/ai/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    console.error('AI 算法检测服务连接失败:', error);
    return null;
  }
};

// ============================================
// 以下是原有代码
// ============================================

// eslint-disable-next-line no-unused-vars
import request from '../utils/request'; // request 将在对接真实接口时使用

/**
 * 获取实时健康数据（从硬件设备或数据库）
 * @param {string} elderlyId - 老人ID（硬件设备绑定的ID）
 * @returns {Promise} 返回实时健康数据
 * 
 * 后端接口规范：
 * GET /api/health/realtime?elderlyId=1001
 * Headers: { Authorization: "Bearer xxx" }
 * Response: { 
 *   code: 200, 
 *   data: { 
 *     heartRate: 75,           // 心率（次/分）
 *     bloodPressure: "130/80",  // 血压（mmHg）
 *     bloodOxygen: 98,          // 血氧（%）
 *     updateTime: "2026-01-29 18:00:00", // 数据更新时间
 *     deviceStatus: "online"    // 设备状态（online/offline）
 *   },
 *   msg: "成功"
 * }
 */
// eslint-disable-next-line no-unused-vars
export const getRealTimeHealth = async (elderlyId) => {
  // ✅ 对接真实后端时，取消注释下面这行，删除模拟代码
  // return request.get('/api/health/realtime', { params: { elderlyId } });
  
  // ⚠️ 临时模拟数据（仅用于前端开发，后续必须删除）
  const now = new Date();
  return Promise.resolve({
    heartRate: 75 + Math.floor(Math.random() * 10), // 75 ~ 84
    bloodPressure: `${130 + Math.floor(Math.random() * 15)}/${80 + Math.floor(Math.random() * 10)}`,
    bloodOxygen: 96 + Math.floor(Math.random() * 3), // 96 ~ 98
    updateTime: now.toLocaleString(),
    deviceStatus: 'online'
  });
};

// 为了兼容现有代码，保留这个别名（内部调用上面的函数）
export const getMockRealTimeHealth = getRealTimeHealth;

/**
 * 获取健康趋势数据（用于图表展示）
 * @param {string} elderlyId - 老人ID
 * @param {string} type - 数据类型（heartRate/bloodPressure/bloodOxygen/bodyTemperature/respirationRate/bloodGlucose）
 * @param {number} days - 时间范围天数
 * @returns {Promise} 返回趋势数据
 *
 * 后端接口规范：
 * GET /api/health/trend?elderlyId=1001&type=heartRate&days=7
 * Response: {
 *   code: 200,
 *   data: {
 *     dates: ["2026-01-23", "2026-01-24", ...],
 *     values: [75, 78, 82, ...],
 *     previousValues: [74, 77, 81, ...],
 *     unit: "次/分",
 *     statistics: { avg: 77, max: 82, min: 72, abnormalCount: 1, abnormalRate: "14.3%", trend: "上升" }
 *   }
 * }
 */
// eslint-disable-next-line no-unused-vars
export const getHealthTrend = async (elderlyId, type, days = 7) => {
  // ✅ 对接真实后端时，取消注释下面这行
  // return request.get('/api/health/trend', {
  //   params: { elderlyId, type, days }
  // });

  // 配置不同数据类型的参数
  const typeConfig = {
    heartRate: { base: 75, variation: 10, min: 60, max: 100, unit: '次/分' },
    bloodPressure: { base: 130, variation: 15, min: 90, max: 140, unit: 'mmHg' },
    bloodOxygen: { base: 97, variation: 2, min: 95, max: 100, unit: '%' },
    bodyTemperature: { base: 36.5, variation: 0.4, min: 36.0, max: 37.3, unit: '℃' },
    respirationRate: { base: 16, variation: 3, min: 12, max: 20, unit: '次/分' },
    bloodGlucose: { base: 5.2, variation: 0.8, min: 3.9, max: 6.1, unit: 'mmol/L' }
  };

  const config = typeConfig[type] || typeConfig.heartRate;
  const dates = [];
  const values = [];
  const previousValues = [];

  // 生成日期
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(`${date.getMonth() + 1}/${date.getDate()}`);
  }

  // 生成当前期数据（带有一些随机波动）
  for (let i = 0; i < days; i++) {
    const randomFactor = (Math.random() - 0.5) * 2;
    const value = config.base + randomFactor * config.variation;
    values.push(Number(value.toFixed(1)));
  }

  // 生成上期数据（用于对比）
  for (let i = 0; i < days; i++) {
    const randomFactor = (Math.random() - 0.5) * 2;
    const value = config.base + randomFactor * config.variation;
    previousValues.push(Number(value.toFixed(1)));
  }

  // 计算统计数据
  const avg = Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
  const max = Number(Math.max(...values).toFixed(1));
  const min = Number(Math.min(...values).toFixed(1));

  // 计算异常次数
  let abnormalCount = 0;
  values.forEach(val => {
    if (val < config.min || val > config.max) {
      abnormalCount++;
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

    if (changeRate > 3) {
      trend = secondAvg > firstAvg ? '上升' : '下降';
    }
  }

  return Promise.resolve({
    dates,
    values,
    previousValues,
    unit: config.unit,
    statistics: {
      avg,
      max,
      min,
      abnormalCount,
      abnormalRate,
      trend
    }
  });
};

/**
 * 获取健康预警列表
 * @param {string} elderlyId - 老人ID
 * @param {Object} params - 查询参数（可选）
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise} 返回预警列表
 * 
 * 后端接口规范：
 * GET /api/health/warnings?elderlyId=1001&page=1&pageSize=20
 * Response: { 
 *   code: 200, 
 *   data: { 
 *     list: [
 *       {
 *         id: "W001",
 *         time: "2026-01-29 18:00:00",
 *         type: "血压异常",              // 预警类型
 *         desc: "血压145/92 mmHg",       // 预警描述
 *         status: "未处理",              // 处理状态（未处理/已处理）
 *         level: "high"                  // 预警级别（low/medium/high）
 *       }
 *     ],
 *     total: 10
 *   }
 * }
 */
// eslint-disable-next-line no-unused-vars
export const getHealthWarnings = async (elderlyId, params = {}) => {
  // ✅ 对接真实后端时，取消注释下面这行
  // return request.get('/api/health/warnings', { 
  //   params: { elderlyId, ...params } 
  // });
  
  // ⚠️ 临时模拟数据
  return Promise.resolve({
    list: [
      { 
        id: 'W001',
        time: new Date().toLocaleString(), 
        type: '血压异常', 
        desc: '血压145/92 mmHg（硬件上报）', 
        status: '未处理',
        level: 'high'
      },
      { 
        id: 'W002',
        time: '2026-01-16 08:15', 
        type: '心率偏高', 
        desc: '心率105次/分（算法预警）', 
        status: '已处理',
        level: 'medium'
      },
      { 
        id: 'W003',
        time: '2026-01-15 20:00', 
        type: '血氧偏低', 
        desc: '血氧94%（硬件上报）', 
        status: '已处理',
        level: 'high'
      }
    ],
    total: 3
  });
};

/**
 * 提交社区服务预约
 * @param {Object} orderData - 预约数据
 * @param {string} orderData.elderlyId - 老人ID
 * @param {string} orderData.serviceType - 服务类型（体检/随访/护理）
 * @param {string} orderData.serviceTime - 预约时间（YYYY-MM-DD）
 * @param {string} orderData.remark - 备注
 * @returns {Promise} 返回预约结果
 * 
 * 后端接口规范：
 * POST /api/service/order
 * Body: { elderlyId: "1001", serviceType: "体检", serviceTime: "2026-02-01", remark: "..." }
 * Response: { 
 *   code: 200, 
 *   data: { 
 *     orderId: "ORD001",
 *     status: "待确认",
 *     message: "预约提交成功，社区将尽快联系您"
 *   }
 * }
 */
// eslint-disable-next-line no-unused-vars
export const createServiceOrder = async (orderData) => {
  // ✅ 对接真实后端时，取消注释下面这行
  // return request.post('/api/service/order', orderData);
  
  // 从localStorage中获取老人信息
  const savedElderlyList = localStorage.getItem('elderlyList');
  let elderlyName = '老人';
  
  if (savedElderlyList) {
    const elderlyList = JSON.parse(savedElderlyList);
    const elderly = elderlyList.find(e => String(e.id) === String(orderData.elderlyId));
    if (elderly) {
      elderlyName = elderly.name;
    }
  }
  
  // ⚠️ 临时模拟
  return Promise.resolve({
    orderId: 'ORD' + Date.now(),
    status: '待确认（社区审核中）',
    message: `预约提交成功！社区将根据${elderlyName}老人的信息上门服务`
  });
};

/**
 * 获取服务预约列表
 * @param {string} elderlyId - 老人ID
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise} 返回预约列表
 * 
 * 后端接口规范：
 * GET /api/service/orders?elderlyId=1001&page=1&pageSize=20
 * Response: { 
 *   code: 200, 
 *   data: { 
 *     list: [
 *       {
 *         id: "ORD20260206100001",
 *         serviceType: "体检",
 *         serviceDate: "2026-02-10",
 *         serviceTime: "上午",
 *         status: "待确认",
 *         createdAt: "2026-02-06 10:00:00"
 *       }
 *     ],
 *     total: 1
 *   }
 * }
 */
// eslint-disable-next-line no-unused-vars
export const getServiceOrders = async (elderlyId, params = {}) => {
  // ✅ 对接真实后端时，取消注释下面这行
  // return request.get('/api/service/orders', { 
  //   params: { elderlyId, ...params } 
  // });
  
  // ⚠️ 临时模拟数据
  return Promise.resolve({
    list: [
      {
        id: 'ORD20260206100001',
        serviceType: '体检',
        serviceDate: '2026-02-10',
        serviceTime: '上午',
        status: '待确认',
        createdAt: '2026-02-06 10:00:00'
      },
      {
        id: 'ORD20260120150002',
        serviceType: '随访',
        serviceDate: '2026-01-20',
        serviceTime: '下午',
        status: '已完成',
        createdAt: '2026-01-18 14:30:00'
      }
    ],
    total: 2
  });
};

/**
 * 获取老人基本信息（从数据库）
 * @param {string} elderlyId - 老人ID
 * @returns {Promise} 返回老人信息
 * 
 * 后端接口规范：
 * GET /api/elderly/info?elderlyId=1001
 * Response: { 
 *   code: 200, 
 *   data: { 
 *     elderlyId: "1001",
 *     name: "张三",
 *     age: 72,
 *     chronicDiseases: ["高血压"],
 *     deviceStatus: "online",
 *     bindDate: "2025-12-01"
 *   }
 * }
 */
export const getElderlyInfo = async (elderlyId) => {
  // ✅ 对接真实后端时，取消注释下面这行
  // return request.get('/api/elderly/info', { params: { elderlyId } });
  
  // 从localStorage中获取老人信息，如果没有则使用模拟数据
  const savedElderlyList = localStorage.getItem('elderlyList');
  if (savedElderlyList) {
    const elderlyList = JSON.parse(savedElderlyList);
    // 尝试不同的匹配方式：直接匹配、转换为数字匹配、转换为字符串匹配
    let elderly = elderlyList.find(e => e.id === elderlyId);
    if (!elderly) {
      elderly = elderlyList.find(e => e.id === parseInt(elderlyId));
    }
    if (!elderly) {
      elderly = elderlyList.find(e => String(e.id) === String(elderlyId));
    }
    // 如果找到了老人信息，返回最新的信息
    if (elderly) {
      return Promise.resolve({
        elderlyId: elderly.id,
        name: elderly.name,
        age: elderly.age,
        chronicDiseases: ['高血压'],
        deviceStatus: 'online',
        bindDate: '2025-12-01'
      });
    }
    // 如果没有找到匹配的老人，但是有老人列表，返回第一个老人的信息
    if (elderlyList.length > 0) {
      const firstElderly = elderlyList[0];
      return Promise.resolve({
        elderlyId: firstElderly.id,
        name: firstElderly.name,
        age: firstElderly.age,
        chronicDiseases: ['高血压'],
        deviceStatus: 'online',
        bindDate: '2025-12-01'
      });
    }
  }
  
  // ⚠️ 临时模拟
  return Promise.resolve({
    elderlyId: elderlyId,
    name: '张三',
    age: 72,
    chronicDiseases: ['高血压'],
    deviceStatus: 'online',
    bindDate: '2025-12-01'
  });
};
