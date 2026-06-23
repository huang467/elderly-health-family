/**
 * 服务预约 Store
 * 管理服务预约相关的状态和操作
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useElderlyStore } from './elderlyStore';
import { useUIStore } from './uiStore';

// 服务状态枚举
const SERVICE_STATUS = {
  PENDING: '待确认（社区审核中）',
  CONFIRMED: '已确认',
  IN_PROGRESS: '服务中',
  COMPLETED: '已完成',
  CANCELLED: '已取消'
};

// 服务类型配置
const SERVICE_TYPES = {
  checkup: { name: '健康体检', icon: 'hospital', color: '#3b82f6' },
  followup: { name: '健康随访', icon: 'user-check', color: '#10b981' },
  nursing: { name: '上门护理', icon: 'heart', color: '#f59e0b' },
  consultation: { name: '专家咨询', icon: 'message-circle', color: '#8b5cf6' },
  rehabilitation: { name: '康复训练', icon: 'activity', color: '#ec4899' }
};

const STORAGE_KEY = 'service_store_data';

export const useServiceStore = defineStore('service', () => {
  // ============ State ============
  const list = ref([]);
  const loading = ref(false);
  const pendingCount = ref(0);

  // ============ Persistence ============
  /**
   * 从 localStorage 加载数据
   */
  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        list.value = data.list || [];
        updatePendingCount();
        return true;
      }
    } catch (error) {
      console.error('加载服务数据失败:', error);
    }
    return false;
  };

  /**
   * 保存到 localStorage
   */
  const saveToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        list: list.value,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('保存服务数据失败:', error);
    }
  };

  // ============ Getters ============
  /**
   * 所有服务预约
   */
  const all = computed(() => list.value);

  /**
   * 待确认服务
   */
  const pending = computed(() =>
    list.value.filter(s => s.status === SERVICE_STATUS.PENDING)
  );

  /**
   * 已完成服务
   */
  const completed = computed(() =>
    list.value.filter(s => s.status === SERVICE_STATUS.COMPLETED)
  );

  /**
   * 当前老人相关的服务
   */
  const currentElderlyServices = computed(() => {
    const elderlyStore = useElderlyStore();
    const elderlyId = elderlyStore.currentElderlyId;
    if (!elderlyId) return [];
    return list.value.filter(s => String(s.elderlyId) === String(elderlyId));
  });

  /**
   * 服务统计
   */
  const statistics = computed(() => ({
    total: list.value.length,
    pending: pending.value.length,
    completed: completed.value.length,
    inProgress: list.value.filter(s => s.status === SERVICE_STATUS.IN_PROGRESS).length,
    cancelled: list.value.filter(s => s.status === SERVICE_STATUS.CANCELLED).length
  }));

  // ============ Actions ============
  /**
   * 创建服务预约
   */
  const add = (service) => {
    const elderlyStore = useElderlyStore();
    const currentElderly = elderlyStore.currentElderly;

    const newService = {
      ...service,
      orderId: service.orderId || `ORD${Date.now()}`,
      status: SERVICE_STATUS.PENDING,
      createTime: new Date().toLocaleString('zh-CN'),
      elderlyId: service.elderlyId || elderlyStore.currentElderlyId,
      elderlyName: service.elderlyName || currentElderly?.name || '老人'
    };

    list.value.unshift(newService);
    updatePendingCount();

    // 显示成功通知
    const uiStore = useUIStore();
    uiStore.showToast({
      type: 'success',
      title: '预约成功',
      message: '服务预约已提交，社区将尽快联系您',
      duration: 3000
    });

    // 保存到本地存储
    saveToStorage();

    return newService;
  };

  /**
   * 更新服务状态
   */
  const updateStatus = (orderId, status) => {
    const service = list.value.find(s => s.orderId === orderId);
    if (service) {
      service.status = status;
      service.updateTime = new Date().toLocaleString('zh-CN');
      updatePendingCount();

      // 显示通知
      const uiStore = useUIStore();
      uiStore.showToast({
        type: status === SERVICE_STATUS.COMPLETED ? 'success' : 'info',
        message: `服务状态已更新为：${status}`,
        duration: 3000
      });

      // 保存到本地存储
      saveToStorage();

      return true;
    }
    return false;
  };

  /**
   * 取消服务预约
   */
  const cancel = (orderId, reason = '') => {
    const service = list.value.find(s => s.orderId === orderId);
    if (service) {
      service.status = SERVICE_STATUS.CANCELLED;
      service.cancelReason = reason;
      service.cancelTime = new Date().toLocaleString('zh-CN');
      updatePendingCount();

      const uiStore = useUIStore();
      uiStore.showToast({
        type: 'info',
        message: '服务预约已取消',
        duration: 3000
      });

      // 保存到本地存储
      saveToStorage();

      return true;
    }
    return false;
  };

  /**
   * 添加服务评价
   */
  const addEvaluation = (orderId, evaluation) => {
    const service = list.value.find(s => s.orderId === orderId);
    if (service) {
      service.evaluation = {
        ...evaluation,
        createTime: new Date().toLocaleString('zh-CN')
      };

      const uiStore = useUIStore();
      uiStore.showToast({
        type: 'success',
        message: '评价已提交，感谢您的反馈',
        duration: 3000
      });

      // 保存到本地存储
      saveToStorage();

      return true;
    }
    return false;
  };

  /**
   * 更新待确认数量
   */
  const updatePendingCount = () => {
    pendingCount.value = list.value.filter(
      s => s.status === SERVICE_STATUS.PENDING
    ).length;
  };

  /**
   * 获取指定老人的服务
   */
  const getByElderlyId = (elderlyId) => {
    return list.value.filter(s => String(s.elderlyId) === String(elderlyId));
  };

  /**
   * 生成模拟数据
   */
  const generateMock = (elderlyId, count = 2) => {
    const types = Object.keys(SERVICE_TYPES);
    const statuses = Object.values(SERVICE_STATUS);

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      list.value.push({
        orderId: `ORD${Date.now()}_${i}`,
        elderlyId,
        serviceType: SERVICE_TYPES[type].name,
        serviceDate: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
        serviceTime: i % 2 === 0 ? '上午' : '下午',
        status,
        createTime: new Date(Date.now() - i * 86400000).toLocaleString('zh-CN'),
        remark: i === 0 ? '请准时到达' : ''
      });
    }

    updatePendingCount();
  };

  /**
   * 加载初始数据
   */
  const loadInitialData = (seedMock = true) => {
    // 先尝试从本地存储加载
    const hasSavedData = loadFromStorage();

    // 如果没有保存的数据，生成模拟数据
    if (seedMock && (!hasSavedData || list.value.length === 0)) {
      const elderlyStore = useElderlyStore();
      const elderlyId = elderlyStore.currentElderlyId;
      if (elderlyId && list.value.length === 0) {
        generateMock(elderlyId, 2);
        saveToStorage();
      }
    }
  };

  /**
   * 清空数据
   */
  const reset = () => {
    list.value = [];
    pendingCount.value = 0;
  };

  return {
    // State
    list,
    loading,
    pendingCount,

    // Getters
    all,
    pending,
    completed,
    currentElderlyServices,
    statistics,

    // Actions
    add,
    updateStatus,
    cancel,
    addEvaluation,
    updatePendingCount,
    getByElderlyId,
    generateMock,
    loadInitialData,
    reset
  };
});
