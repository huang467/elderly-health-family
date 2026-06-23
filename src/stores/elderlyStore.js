/**
 * 老人信息 Store
 * 管理所有老人相关的状态和操作
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useElderlyStore = defineStore('elderly', () => {
  // ============ State ============
  const list = ref([]);
  const current = ref(null);
  const loading = ref(false);
  const loaded = ref(false);

  // ============ Getters ============
  const count = computed(() => list.value.length);
  const onlineCount = computed(() => list.value.filter(e => e.deviceStatus === 'online').length);
  const offlineCount = computed(() => list.value.filter(e => e.deviceStatus === 'offline').length);

  const currentElderly = computed(() => current.value);
  const currentElderlyId = computed(() => current.value?.id || current.value?.elderlyId);

  // ============ Actions ============
  /**
   * 从 localStorage 加载数据
   */
  const loadFromStorage = () => {
    try {
      const savedList = localStorage.getItem('elderlyList');
      const savedCurrent = localStorage.getItem('current_elderly_info');

      if (savedList) {
        list.value = JSON.parse(savedList);
      }
      if (savedCurrent) {
        current.value = JSON.parse(savedCurrent);
      }
      loaded.value = true;
    } catch (error) {
      console.error('加载老人数据失败:', error);
    }
  };

  /**
   * 保存到 localStorage
   */
  const saveToStorage = () => {
    try {
      localStorage.setItem('elderlyList', JSON.stringify(list.value));
      if (current.value) {
        localStorage.setItem('current_elderly_id', current.value.id || current.value.elderlyId);
        localStorage.setItem('current_elderly_name', current.value.name);
        localStorage.setItem('current_elderly_info', JSON.stringify(current.value));
      }
    } catch (error) {
      console.error('保存老人数据失败:', error);
    }
  };

  /**
   * 设置当前老人
   */
  const setCurrent = (elderly) => {
    current.value = elderly;
    saveToStorage();
  };

  /**
   * 获取老人列表
   */
  const getAll = () => list.value;

  /**
   * 根据ID获取老人
   */
  const getById = (id) => {
    if (!id) return null;
    return list.value.find(e => e.id === id || e.id === String(id));
  };

  /**
   * 添加老人
   */
  const add = (elderly) => {
    const newElderly = {
      ...elderly,
      id: elderly.id || Date.now().toString(),
      deviceStatus: elderly.deviceStatus || 'online',
      bindDate: new Date().toISOString().split('T')[0],
      lastHealthCheck: new Date().toISOString().split('T')[0],
      createdAt: new Date().toLocaleString('zh-CN')
    };
    list.value.unshift(newElderly);
    saveToStorage();
    return newElderly;
  };

  /**
   * 更新老人信息
   */
  const update = (id, data) => {
    if (!id) return null;
    const index = list.value.findIndex(e => e.id === id || e.id === String(id));
    if (index !== -1) {
      list.value[index] = { ...list.value[index], ...data };
      // 如果更新的是当前老人，同步更新
      if (String(current.value?.id) === String(id)) {
        current.value = { ...current.value, ...data };
      }
      saveToStorage();
      return list.value[index];
    }
    return null;
  };

  /**
   * 删除老人
   */
  const remove = (id) => {
    if (!id) return;
    list.value = list.value.filter(e => e.id !== id && e.id !== String(id));
    if (String(current.value?.id) === String(id)) {
      current.value = null;
      localStorage.removeItem('current_elderly_id');
      localStorage.removeItem('current_elderly_name');
      localStorage.removeItem('current_elderly_info');
    }
    saveToStorage();
  };

  /**
   * 更新设备状态
   */
  const updateDeviceStatus = (id, status) => {
    const elderly = getById(id);
    if (elderly) {
      update(id, { deviceStatus: status });
    }
  };

  /**
   * 更新最后检查时间
   */
  const updateLastCheck = (id) => {
    update(id, { lastHealthCheck: new Date().toISOString().split('T')[0] });
  };

  /**
   * 清空数据
   */
  const reset = () => {
    list.value = [];
    current.value = null;
    saveToStorage();
  };

  // 初始化加载
  loadFromStorage();

  return {
    // State
    list,
    current,
    loading,
    loaded,

    // Getters
    count,
    onlineCount,
    offlineCount,
    currentElderly,
    currentElderlyId,

    // Actions
    loadFromStorage,
    saveToStorage,
    setCurrent,
    getAll,
    getById,
    add,
    update,
    remove,
    updateDeviceStatus,
    updateLastCheck,
    reset
  };
});
