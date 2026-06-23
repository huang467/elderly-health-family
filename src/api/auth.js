// 认证相关接口（家属端 + 后台管理端）
// eslint-disable-next-line no-unused-vars
import request from '../utils/request'; // request 将在对接真实接口时使用

/**
 * 家属端登录
 * @param {Object} loginData - 登录数据
 * @param {string} loginData.phone - 手机号
 * @param {string} loginData.password - 密码
 * @returns {Promise} 返回用户信息和token
 *
 * 后端接口示例：
 * POST /api/auth/family/login
 * Body: { phone: "13800000001", password: "xxx" }
 * Response: { code: 200, data: { token: "xxx", userInfo: {...} }, msg: "登录成功" }
 */
export const familyLogin = async (loginData) => {
  // TODO: 对接真实后端时，取消注释下面这行，删除模拟代码
  // return request.post('/api/auth/family/login', loginData);

  // 临时模拟（仅用于前端开发，后续必须删除）
  return Promise.resolve({
    token: 'mock_family_token_' + Date.now(),
    userInfo: {
      phone: loginData.phone,
      name: '张家属',
      id: 1001
    }
  });
};

/**
 * 获取家属关联的老人列表
 * @returns {Promise} 返回家属关联的所有老人信息
 *
 * 后端接口示例：
 * GET /api/family/elderly-list
 * Headers: { Authorization: "Bearer xxx" }
 * Response: {
 *   code: 200,
 *   data: {
 *     list: [
 *       {
 *         id: "1001",
 *         name: "张三",
 *         age: 72,
 *         gender: "男",
 *         relationship: "父子",
 *         chronicDiseases: ["高血压"],
 *         deviceStatus: "online",
 *         bindDate: "2025-12-01",
 *         lastHealthCheck: "2026-01-28"
 *       },
 *       {
 *         id: "1002",
 *         name: "李四",
 *         age: 75,
 *         gender: "女",
 *         relationship: "母女",
 *         chronicDiseases: ["糖尿病"],
 *         deviceStatus: "offline",
 *         bindDate: "2025-11-15",
 *         lastHealthCheck: "2026-01-25"
 *       }
 *     ],
 *     total: 2
 *   },
 *   msg: "获取成功"
 * }
 */
export const getFamilyElderlyList = async () => {
  // TODO: 对接真实后端时，取消注释下面这行
  // return request.get('/api/family/elderly-list');

  // 临时模拟数据（仅用于前端开发，后续必须删除）
  // 从localStorage读取已保存的老人列表，如果不存在则返回默认数据
  const savedList = localStorage.getItem('elderlyList');
  if (savedList) {
    return Promise.resolve({
      list: JSON.parse(savedList),
      total: JSON.parse(savedList).length
    });
  }

  // 默认模拟数据
  const defaultList = [
    {
      id: '1001',
      name: '张三',
      age: 72,
      gender: '男',
      relationship: '父子',
      chronicDiseases: ['高血压'],
      deviceStatus: 'online',
      bindDate: '2025-12-01',
      lastHealthCheck: '2026-01-28'
    },
    {
      id: '1002',
      name: '李四',
      age: 75,
      gender: '女',
      relationship: '母女',
      chronicDiseases: ['糖尿病'],
      deviceStatus: 'offline',
      bindDate: '2025-11-15',
      lastHealthCheck: '2026-01-25'
    }
  ];
  // 保存到localStorage以便后续使用
  localStorage.setItem('elderlyList', JSON.stringify(defaultList));

  return Promise.resolve({
    list: defaultList,
    total: defaultList.length
  });
};

/**
 * 后台管理员登录
 * @param {Object} loginData - 登录数据
 * @param {string} loginData.username - 管理员账号
 * @param {string} loginData.password - 密码
 * @returns {Promise} 返回管理员信息和token
 * 
 * 后端接口示例：
 * POST /api/auth/admin/login
 * Body: { username: "admin", password: "xxx" }
 * Response: { code: 200, data: { token: "xxx", adminInfo: {...} }, msg: "登录成功" }
 */
export const adminLogin = async (loginData) => {
  // TODO: 对接真实后端时，取消注释下面这行，删除模拟代码
  // return request.post('/api/auth/admin/login', loginData);
  
  // 临时模拟（仅用于前端开发，后续必须删除）
  if (loginData.username === 'admin' && loginData.password === '123456') {
    return Promise.resolve({
      token: 'mock_admin_token_' + Date.now(),
      adminInfo: {
        username: loginData.username,
        role: 'admin'
      }
    });
  }
  throw new Error('账号或密码不正确');
};

/**
 * 退出登录
 * @returns {Promise}
 * 
 * 后端接口示例：
 * POST /api/auth/logout
 * Headers: { Authorization: "Bearer xxx" }
 * Response: { code: 200, msg: "退出成功" }
 */
export const logout = async () => {
  // TODO: 对接真实后端时，取消注释下面这行
  // return request.post('/api/auth/logout');
  
  // 临时模拟
  return Promise.resolve({ msg: '退出成功' });
};

/**
 * 刷新token（用于token过期时自动刷新）
 * @returns {Promise} 返回新的token
 *
 * 后端接口示例：
 * POST /api/auth/refresh
 * Headers: { Authorization: "Bearer xxx" } (使用refresh token)
 * Response: { code: 200, data: { token: "new_token", refreshToken: "new_refresh_token" } }
 */
export const refreshToken = async () => {
  // TODO: 对接真实后端时，取消注释下面这行
  // return request.post('/api/auth/refresh');

  // 临时模拟
  return Promise.resolve({
    token: 'refreshed_token_' + Date.now()
  });
};

// ============ 老人端模拟接口 ============

/**
 * 老人端登录
 * @param {Object} data - 登录数据
 * @param {string} data.phone - 手机号
 * @param {string} data.password - 密码
 * @returns {Promise} 返回登录结果和token
 *
 * 测试账号：手机号 13800001111，密码 123456
 */
export const elderlyLogin = async (data) => {
  return new Promise((resolve) => {
    // 模拟半秒钟的网络请求延迟
    setTimeout(() => {
      // 写死测试账号：手机号 13800001111，密码 123456
      if (data.phone === '13800001111' && data.password === '123456') {
        resolve({
          code: 200,
          data: {
            token: "mock_elderly_token_888",
            elderlyInfo: { id: "1001", name: "张爷爷", age: 72 }
          },
          msg: "登录成功"
        });
      } else {
        // 返回错误状态
        resolve({
          code: 400,
          msg: "手机号或密码错误，请重试"
        });
      }
    }, 500);
  });
};

/**
 * 获取老人健康数据（模拟接口）
 * @returns {Promise} 返回老人健康数据
 */
export const getElderlyHealthMock = async () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        code: 200,
        data: {
          heartRate: 75,
          bloodPressure: '130/80',
          status: '正常'
        }
      });
    }, 300);
  });
};
