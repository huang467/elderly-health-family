/**
 * 预警 Store
 * 管理所有预警相关的状态和操作
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useElderlyStore } from './elderlyStore';
import { useUIStore } from './uiStore';

const STORAGE_KEY = 'warning_store_data';

export const useWarningStore = defineStore('warning', () => {
  // ============ State ============
  const list = ref([]);
  const loading = ref(false);
  const unreadCount = ref(0);

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
        updateUnreadCount();
        return true;
      }
    } catch (error) {
      console.error('加载预警数据失败:', error);
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
      console.error('保存预警数据失败:', error);
    }
  };

  // ============ Getters ============
  /**
   * 所有预警
   */
  const all = computed(() => list.value);

  /**
   * 未处理预警
   */
  const unread = computed(() => list.value.filter(w => w.status === '未处理'));

  /**
   * 已处理预警
   */
  const handled = computed(() => list.value.filter(w => w.status === '已处理'));

  /**
   * 当前老人相关的预警
   */
  const currentElderlyWarnings = computed(() => {
    const elderlyStore = useElderlyStore();
    const elderlyId = elderlyStore.currentElderlyId;
    if (!elderlyId) return [];
    return list.value.filter(w => String(w.elderlyId) === String(elderlyId));
  });

  /**
   * 高优先级预警数量
   */
  const highPriorityCount = computed(() =>
    list.value.filter(w => w.level === 'high' && w.status === '未处理').length
  );

  // ============ Actions ============
  /**
   * 添加预警
   */
  const add = (warning) => {
    const recentDuplicate = list.value.find(item =>
      String(item.elderlyId) === String(warning.elderlyId) &&
      item.type === warning.type &&
      item.status === '未处理' &&
      Date.now() - new Date(item.createdAt || item.time).getTime() < 5 * 60 * 1000
    );

    if (recentDuplicate) {
      recentDuplicate.desc = warning.desc || recentDuplicate.desc;
      recentDuplicate.level = warning.level || recentDuplicate.level;
      recentDuplicate.snapshotUrl = warning.snapshotUrl || recentDuplicate.snapshotUrl;
      recentDuplicate.transmittedAt = warning.transmittedAt || recentDuplicate.transmittedAt;
      recentDuplicate.details = warning.details
        ? { ...(recentDuplicate.details || {}), ...warning.details }
        : recentDuplicate.details;
      recentDuplicate.time = new Date().toLocaleString('zh-CN');
      recentDuplicate.createdAt = new Date().toISOString();
      saveToStorage();
      return recentDuplicate;
    }

    const newWarning = {
      ...warning,
      id: warning.id || `W${Date.now()}`,
      time: warning.time || new Date().toLocaleString('zh-CN'),
      status: warning.status || '未处理',
      createdAt: new Date().toISOString()
    };
    list.value.unshift(newWarning);
    updateUnreadCount();

    // 显示通知
    const uiStore = useUIStore();
    uiStore.showToast({
      type: 'warning',
      title: '新的健康预警',
      message: `${warning.type}: ${warning.desc}`,
      duration: 5000
    });

    // 保存到本地存储
    saveToStorage();

    return newWarning;
  };

  /**
   * 处理预警
   */
  const handle = (id, note = '') => {
    const warning = list.value.find(w => w.id === id);
    if (warning) {
      warning.status = '已处理';
      warning.handledAt = new Date().toLocaleString('zh-CN');
      warning.handleNote = note;
      updateUnreadCount();

      // 显示成功通知
      const uiStore = useUIStore();
      uiStore.showToast({
        type: 'success',
        message: '预警已处理',
        duration: 3000
      });

      // 保存到本地存储
      saveToStorage();

      return true;
    }
    return false;
  };

  /**
   * 批量处理预警
   */
  const batchHandle = (ids, note = '') => {
    let count = 0;
    ids.forEach(id => {
      if (handle(id, note)) count++;
    });

    const uiStore = useUIStore();
    uiStore.showToast({
      type: 'success',
      message: `已处理 ${count} 条预警`,
      duration: 3000
    });

    return count;
  };

  /**
   * 删除预警
   */
  const remove = (id) => {
    const index = list.value.findIndex(w => w.id === id);
    if (index > -1) {
      list.value.splice(index, 1);
      updateUnreadCount();
      saveToStorage();
      return true;
    }
    return false;
  };

  /**
   * 更新未读数量
   */
  const updateUnreadCount = () => {
    unreadCount.value = list.value.filter(w => w.status === '未处理').length;
  };

  /**
   * 获取指定老人的预警
   */
  const getByElderlyId = (elderlyId) => {
    return list.value.filter(w => String(w.elderlyId) === String(elderlyId));
  };

  /**
   * 生成模拟预警数据
   */
  const generateMock = (elderlyId, count = 5) => {
    const types = ['血压异常', '心率偏高', '血氧偏低', '体温异常', '血糖异常'];
    const levels = ['high', 'medium', 'low'];
    const warnings = [];

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];

      warnings.push({
        id: `W${Date.now()}_${i}`,
        elderlyId,
        type,
        level,
        desc: `监测到${type}，请关注`,
        time: new Date(Date.now() - i * 86400000).toLocaleString('zh-CN'),
        status: i < 2 ? '未处理' : '已处理',
        details: { value: '异常值', normalRange: '正常范围' }
      });
    }

    list.value = [...warnings, ...list.value];
    updateUnreadCount();
    return warnings;
  };

  /**
   * 加载初始数据
   */
  const loadInitialData = () => {
    // 先尝试从本地存储加载
    const hasSavedData = loadFromStorage();

    // 如果没有保存的数据，生成模拟数据
    if (!hasSavedData || list.value.length === 0) {
      const elderlyStore = useElderlyStore();
      const elderlyId = elderlyStore.currentElderlyId;
      if (elderlyId && list.value.length === 0) {
        generateMock(elderlyId, 3);
        saveToStorage();
      }
    }
  };

  /**
   * 清空数据
   */
  const reset = () => {
    list.value = [];
    unreadCount.value = 0;
  };

  return {
    // State
    list,
    loading,
    unreadCount,

    // Getters
    all,
    unread,
    handled,
    currentElderlyWarnings,
    highPriorityCount,

    // Actions
    add,
    handle,
    batchHandle,
    remove,
    updateUnreadCount,
    getByElderlyId,
    generateMock,
    loadInitialData,
    reset
  };
});
