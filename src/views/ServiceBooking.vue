<template>
  <div class="service-booking">
    <AppHeader title="社区服务预约" />
    <FamilyNav />

    <div class="container">
      <!-- 页面标题区域 -->
      <section class="page-hero">
        <div class="hero-content">
          <div class="hero-icon">
            <IconSvg name="calendar" :size="36" />
          </div>
          <div class="hero-text">
            <h1>上门服务预约</h1>
            <p>为老人预约专业社区健康服务</p>
          </div>
        </div>
        <div class="hero-stats">
          <div class="hero-stat">
            <span class="stat-num">{{ orderRecords.length }}</span>
            <span class="stat-lab">历史预约</span>
          </div>
          <div class="hero-stat">
            <span class="stat-num">{{ pendingOrders }}</span>
            <span class="stat-lab">待确认</span>
          </div>
          <div class="hero-stat">
            <span class="stat-num">{{ completedOrders }}</span>
            <span class="stat-lab">已完成</span>
          </div>
        </div>
      </section>

      <div class="main-grid">
        <!-- 预约表单 -->
        <section class="booking-form-section">
          <div class="section-header">
            <h2>
              <IconSvg name="plus-circle" :size="22" />
              新增预约
            </h2>
          </div>

          <!-- 成功提示 -->
          <div class="success-banner" v-if="successMessage">
            <IconSvg name="check-circle" :size="18" />
            <span>{{ successMessage }}</span>
          </div>

          <form @submit.prevent="handleSubmit" class="booking-form">
            <!-- 服务类型选择 -->
            <div class="form-group">
              <label>服务类型</label>
              <div class="service-types-grid">
                <div
                  v-for="stype in serviceTypeOptions"
                  :key="stype.value"
                  class="service-type-card"
                  :class="{ active: serviceType === stype.value }"
                  @click="serviceType = stype.value"
                >
                  <div class="type-icon" :style="{ background: stype.bg, color: stype.color }">
                    <IconSvg :name="stype.icon" :size="20" />
                  </div>
                  <span>{{ stype.label }}</span>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>预约日期</label>
                <input type="date" v-model="serviceTime" class="form-input" required />
              </div>
              <div class="form-group">
                <label>预约时段</label>
                <select v-model="servicePeriod" class="form-input" required>
                  <option value="上午">上午 (9:00-12:00)</option>
                  <option value="下午">下午 (14:00-17:00)</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>联系人</label>
                <input
                  type="text"
                  v-model="contactName"
                  class="form-input"
                  placeholder="请输入联系人姓名"
                  required
                />
              </div>
              <div class="form-group">
                <label>联系电话</label>
                <input
                  type="tel"
                  v-model="contactPhone"
                  class="form-input"
                  placeholder="请输入联系电话"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label>
                老人ID
                <span class="label-hint">自动填充</span>
              </label>
              <input type="text" v-model="elderlyId" readonly class="form-input readonly" />
            </div>

            <div class="form-group">
              <label>特殊备注 <span class="label-opt">选填</span></label>
              <textarea
                v-model="remark"
                class="form-textarea"
                rows="3"
                placeholder="请输入特殊需求，如老人行动不便、需要特别照护等..."
              ></textarea>
            </div>

            <button type="submit" class="submit-btn" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="btn-spinner"></span>
              <IconSvg v-else name="send" :size="18" />
              {{ isSubmitting ? '提交中...' : '提交预约' }}
            </button>
          </form>
        </section>

        <!-- 预约记录 -->
        <section class="records-section">
          <div class="section-header">
            <h2>
              <IconSvg name="list" :size="22" />
              服务记录
            </h2>
            <span class="record-count">共 {{ orderRecords.length }} 条</span>
          </div>

          <div class="records-list">
            <div
              class="record-card"
              v-for="(item, idx) in orderRecords"
              :key="item.orderId || idx"
            >
              <div class="record-header">
                <div class="record-title">
                <div class="record-icon">
                  <IconSvg name="calendar-check" :size="18" />
                </div>
                <h3>{{ getServiceTypeName(item.type || item.serviceType) }}</h3>
                <span v-if="item.autoGenerated" class="auto-tag">AI自动预约</span>
              </div>
                <div class="record-status-badge" :class="getStatusClass(item.status)">
                  {{ item.status }}
                </div>
              </div>

              <div class="record-info-grid">
                <div class="info-item">
                  <IconSvg name="calendar" :size="14" />
                  <span>{{ item.time || item.serviceDate }} {{ item.period || item.serviceTime || '全天' }}</span>
                </div>
                <div class="info-item">
                  <IconSvg name="user" :size="14" />
                  <span>{{ item.contactName || '家属' }}</span>
                </div>
                <div class="info-item">
                  <IconSvg name="phone" :size="14" />
                  <span>{{ item.contactPhone || '-' }}</span>
                </div>
                <div class="info-item" v-if="item.elderlyId">
                  <IconSvg name="tag" :size="14" />
                  <span>老人ID: {{ item.elderlyId }}</span>
                </div>
              </div>

              <p class="record-remark" v-if="item.remark">
                <IconSvg name="message-square" :size="13" />
                {{ item.remark }}
              </p>

              <!-- 评价区域 -->
              <div class="evaluation-box" v-if="item.evaluation">
                <div class="eval-header">
                  <span class="eval-label">服务评价</span>
                  <div class="stars">
                    <span
                      v-for="i in 5"
                      :key="i"
                      class="star"
                      :class="{ active: i <= item.evaluation.stars }"
                    >★</span>
                  </div>
                </div>
                <p class="eval-content">{{ item.evaluation.content }}</p>
              </div>

              <div class="record-footer">
                <span class="order-id">
                  <IconSvg name="hash" :size="13" />
                  {{ item.orderId }}
                </span>
                <div class="record-actions">
                  <button
                    class="btn-cancel"
                    @click="cancelOrder(item)"
                    v-if="item.status === '待确认（社区审核中）'"
                  >
                    取消预约
                  </button>
                  <button
                    class="btn-evaluate"
                    @click="openEvaluationModal(item)"
                    v-if="item.status === '已完成' && !item.evaluation"
                  >
                    <IconSvg name="star" :size="14" />
                    评价服务
                  </button>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div class="empty-state" v-if="orderRecords.length === 0">
              <div class="empty-icon">
                <IconSvg name="calendar" :size="48" />
              </div>
              <h3>暂无服务记录</h3>
              <p>您还没有提交过服务预约</p>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- 评价弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showEvaluationModal" @click="closeEvaluationModal">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h3>
              <IconSvg name="star" :size="20" />
              评价服务
            </h3>
            <button class="modal-close" @click="closeEvaluationModal">
              <IconSvg name="x" :size="20" />
            </button>
          </div>
          <div class="modal-body">
            <div class="eval-info-row">
              <span class="eval-key">服务类型</span>
              <span class="eval-val">{{ getServiceTypeName(currentOrder?.type || currentOrder?.serviceType) }}</span>
            </div>
            <div class="eval-info-row">
              <span class="eval-key">预约时间</span>
              <span class="eval-val">{{ currentOrder?.time || currentOrder?.serviceDate }} {{ currentOrder?.period || currentOrder?.serviceTime || '全天' }}</span>
            </div>
            <div class="eval-info-row">
              <span class="eval-key">老人ID</span>
              <span class="eval-val">{{ currentOrder?.elderlyId }}</span>
            </div>

            <div class="rating-section">
              <label>满意度评分</label>
              <div class="stars-large">
                <span
                  v-for="i in 5"
                  :key="i"
                  class="star-lg"
                  :class="{ active: i <= evaluationStars, hover: i <= hoverStar }"
                  @click="evaluationStars = i"
                  @mouseenter="hoverStar = i"
                  @mouseleave="hoverStar = 0"
                >★</span>
              </div>
              <span class="rating-hint" v-if="evaluationStars > 0">
                {{ ['', '很差', '较差', '一般', '满意', '非常满意'][evaluationStars] }}
              </span>
            </div>

            <div class="eval-form-group">
              <label>评价内容</label>
              <textarea
                v-model="evaluationContent"
                class="eval-textarea"
                rows="4"
                placeholder="请填写您对本次服务的评价..."
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-modal-cancel" @click="closeEvaluationModal">取消</button>
            <button
              class="btn-modal-submit"
              @click="submitEvaluation"
              :disabled="!evaluationStars"
            >提交评价</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import AppHeader from '../components/AppHeader.vue';
import FamilyNav from '../components/FamilyNav.vue';
import IconSvg from '../components/IconSvg.vue';
import { createServiceOrder } from '../api/health';
import { useServiceStore } from '../stores/serviceStore';

const elderlyId = ref(localStorage.getItem('current_elderly_id') || '1001');
const serviceType = ref('体检');
const serviceTime = ref('');
const servicePeriod = ref('上午');
const contactName = ref('');
const contactPhone = ref('');
const remark = ref('');
const isSubmitting = ref(false);
const successMessage = ref('');
const serviceStore = useServiceStore();

const orderRecords = computed(() => serviceStore.all);
const pendingOrders = computed(() => serviceStore.all.filter(o => o.status === '待确认（社区审核中）').length);
const completedOrders = computed(() => serviceStore.all.filter(o => o.status === '已完成').length);

const showEvaluationModal = ref(false);
const currentOrder = ref(null);
const evaluationStars = ref(0);
const hoverStar = ref(0);
const evaluationContent = ref('');

const serviceTypeOptions = [
  { value: '体检', label: '上门体检', icon: 'activity', bg: '#dbeafe', color: '#2563eb' },
  { value: '随访', label: '慢病随访', icon: 'user-check', bg: '#dcfce7', color: '#16a34a' },
  { value: '护理', label: '康复护理', icon: 'heart', bg: '#fce7f3', color: '#be185d' },
  { value: 'nursing', label: '生活照料', icon: 'home', bg: '#fef3c7', color: '#d97706' },
  { value: 'medicine', label: '送药服务', icon: 'package', bg: '#f3e8ff', color: '#7c3aed' },
  { value: 'cleaning', label: '家政保洁', icon: 'sun', bg: '#e0f2fe', color: '#0284c7' },
  { value: 'meal', label: '配餐服务', icon: 'coffee', bg: '#fef9c3', color: '#ca8a04' },
  { value: 'transport', label: '陪同就医', icon: 'truck', bg: '#fee2e2', color: '#dc2626' },
  { value: 'psychological', label: '心理疏导', icon: 'message-circle', bg: '#ecfdf5', color: '#059669' }
];

const getServiceTypeName = (type) => {
  const found = serviceTypeOptions.find(o => o.value === type);
  if (found) return found.label;
  const map = {
    '体检': '上门体检', '随访': '慢病随访', '护理': '康复护理',
    'nursing': '生活照料', 'medicine': '送药服务', 'cleaning': '家政保洁',
    'meal': '配餐服务', 'transport': '陪同就医', 'psychological': '心理疏导'
  };
  return map[type] || type;
};

const fetchOrderRecords = async () => {
  try {
    serviceStore.loadInitialData();
  } catch (error) {
    console.error('获取预约记录失败：', error);
  }
};

const handleSubmit = async () => {
  try {
    if (!serviceTime.value) {
      alert('请选择预约时间');
      return;
    }

    isSubmitting.value = true;
    successMessage.value = '';

    const orderData = {
      elderlyId: elderlyId.value,
      serviceType: serviceType.value,
      serviceTime: serviceTime.value,
      servicePeriod: servicePeriod.value,
      contactName: contactName.value || '家属',
      contactPhone: contactPhone.value || localStorage.getItem('family_phone') || '',
      remark: remark.value
    };

    const response = await createServiceOrder(orderData);

    serviceStore.add({
      orderId: response.orderId,
      serviceType: getServiceTypeName(serviceType.value),
      serviceDate: serviceTime.value,
      serviceTime: servicePeriod.value,
      elderlyId: elderlyId.value,
      contactName: contactName.value || '家属',
      contactPhone: contactPhone.value || localStorage.getItem('family_phone') || '',
      status: response.status,
      remark: remark.value
    });

    successMessage.value = response.message;

    serviceType.value = '体检';
    serviceTime.value = '';
    servicePeriod.value = '上午';
    contactName.value = '';
    contactPhone.value = '';
    remark.value = '';
  } catch (error) {
    console.error('预约失败：', error);
    alert(`预约失败：${error.message || '请稍后重试'}`);
  } finally {
    isSubmitting.value = false;
  }
};

const cancelOrder = async (item) => {
  try {
    if (confirm('确定要取消此预约吗？')) {
      serviceStore.cancel(item.orderId, '用户主动取消');
    }
  } catch (error) {
    console.error('取消预约失败：', error);
    alert('取消预约失败，请稍后重试');
  }
};

const openEvaluationModal = (item) => {
  currentOrder.value = item;
  evaluationStars.value = 0;
  hoverStar.value = 0;
  evaluationContent.value = '';
  showEvaluationModal.value = true;
};

const closeEvaluationModal = () => {
  showEvaluationModal.value = false;
  currentOrder.value = null;
  evaluationStars.value = 0;
  hoverStar.value = 0;
  evaluationContent.value = '';
};

const submitEvaluation = async () => {
  try {
    if (!evaluationStars.value) {
      alert('请选择满意度评分');
      return;
    }

    serviceStore.addEvaluation(currentOrder.value.orderId, {
      stars: evaluationStars.value,
      content: evaluationContent.value
    });

    closeEvaluationModal();
  } catch (error) {
    console.error('提交评价失败：', error);
    alert('提交评价失败，请稍后重试');
  }
};

const getStatusClass = (status) => {
  if (status === '待确认（社区审核中）') return 'status-pending';
  if (status === '已确认') return 'status-confirmed';
  if (status === '已完成') return 'status-completed';
  if (status === '已取消') return 'status-canceled';
  return '';
};

onMounted(() => {
  fetchOrderRecords();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  serviceTime.value = tomorrow.toISOString().split('T')[0];
});
</script>

<style scoped lang="scss">
.service-booking {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding-bottom: 40px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

// 页面头部
.page-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32px 40px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3b82f6 100%);
  border-radius: 24px;
  color: white;
  margin-bottom: 28px;
  box-shadow: 0 20px 60px rgba(30, 58, 95, 0.35);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -10%;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
  }
}

.hero-content {
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 1;
}

.hero-icon {
  width: 72px;
  height: 72px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.hero-text {
  h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 6px;
  }

  p {
    font-size: 16px;
    opacity: 0.85;
    margin: 0;
  }
}

.hero-stats {
  display: flex;
  gap: 32px;
  position: relative;
  z-index: 1;
}

.hero-stat {
  text-align: center;

  .stat-num {
    display: block;
    font-size: 32px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 6px;
  }

  .stat-lab {
    font-size: 13px;
    opacity: 0.8;
  }
}

// 主内容网格
.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
}

// 公共 section 样式
.booking-form-section,
.records-section {
  background: white;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .record-count {
    font-size: 13px;
    color: #94a3b8;
  }
}

// 成功提示
.success-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: #dcfce7;
  color: #166534;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
  border: 1px solid #bbf7d0;
}

// 预约表单
.booking-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 10px;

    .label-hint {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 400;
    }

    .label-opt {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 400;
      padding: 2px 8px;
      background: #f1f5f9;
      border-radius: 10px;
    }
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-input {
  width: 100%;
  padding: 11px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  color: #1e293b;
  background: #f8fafc;
  transition: all 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &.readonly {
    cursor: not-allowed;
    color: #94a3b8;
    background: #f1f5f9;
  }
}

.form-textarea {
  width: 100%;
  padding: 11px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  color: #1e293b;
  background: #f8fafc;
  resize: vertical;
  transition: all 0.2s;
  box-sizing: border-box;
  min-height: 90px;
  line-height: 1.6;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

// 服务类型网格
.service-types-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.service-type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  text-align: center;

  &:hover {
    border-color: #93c5fd;
    background: #f0f9ff;
  }

  &.active {
    border-color: #3b82f6;
    background: #eff6ff;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .type-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  span {
    font-size: 12px;
    color: #374151;
    font-weight: 500;
    line-height: 1.3;
  }
}

// 提交按钮
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  margin-top: 4px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .btn-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// 服务记录
.records-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 780px;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
}

.record-card {
  padding: 20px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1.5px solid #e2e8f0;
  transition: all 0.3s ease;

  &:hover {
    border-color: #93c5fd;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
}

.record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 10px;
}

.record-title {
  display: flex;
  align-items: center;
  gap: 10px;

  .record-icon {
    width: 36px;
    height: 36px;
    background: #dbeafe;
    color: #2563eb;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  h3 {
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }
}

.auto-tag {
  padding: 4px 8px;
  border-radius: 999px;
  color: #0f766e;
  background: #ccfbf1;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.record-status-badge {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;

  &.status-pending {
    background: #dbeafe;
    color: #1d4ed8;
  }

  &.status-confirmed {
    background: #d1fae5;
    color: #065f46;
  }

  &.status-completed {
    background: #dcfce7;
    color: #166534;
  }

  &.status-canceled {
    background: #f1f5f9;
    color: #64748b;
  }
}

.record-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;

  svg {
    flex-shrink: 0;
    color: #94a3b8;
  }
}

.record-remark {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
  background: rgba(59, 130, 246, 0.05);
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
}

// 评价展示
.evaluation-box {
  background: linear-gradient(135deg, #fffbeb, #fef9c3);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 12px;
  border: 1px solid #fde68a;

  .eval-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;

    .eval-label {
      font-size: 13px;
      font-weight: 600;
      color: #92400e;
    }
  }

  .stars {
    display: flex;
    gap: 2px;

    .star {
      font-size: 16px;
      color: #e2e8f0;

      &.active { color: #f59e0b; }
    }
  }

  .eval-content {
    font-size: 13px;
    color: #713f12;
    margin: 0;
    line-height: 1.5;
  }
}

.record-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  gap: 10px;
}

.order-id {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.record-actions {
  display: flex;
  gap: 8px;
}

.btn-cancel {
  padding: 6px 14px;
  background: white;
  border: 1.5px solid #e2e8f0;
  color: #64748b;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #ef4444;
    color: #ef4444;
  }
}

.btn-evaluate {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  color: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);
  }
}

// 空状态
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #94a3b8;

  .empty-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 96px;
    height: 96px;
    background: #f1f5f9;
    border-radius: 24px;
    margin-bottom: 20px;
    color: #cbd5e1;
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #475569;
    margin: 0 0 8px;
  }

  p {
    font-size: 14px;
    margin: 0;
  }
}

// 弹窗
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid #f1f5f9;

  h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
  }

  .modal-close {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border: none;
    border-radius: 10px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #e2e8f0;
      color: #1e293b;
    }
  }
}

.modal-body {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.eval-info-row {
  display: flex;
  gap: 12px;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 10px;

  .eval-key {
    width: 80px;
    flex-shrink: 0;
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
  }

  .eval-val {
    font-size: 13px;
    color: #1e293b;
  }
}

.rating-section {
  label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 12px;
  }
}

.stars-large {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.star-lg {
  font-size: 32px;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.15s;

  &.active, &.hover {
    color: #f59e0b;
    transform: scale(1.1);
  }
}

.rating-hint {
  font-size: 14px;
  color: #f59e0b;
  font-weight: 500;
}

.eval-form-group {
  label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
  }
}

.eval-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  color: #1e293b;
  resize: vertical;
  transition: all 0.2s;
  box-sizing: border-box;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px 28px 24px;
  border-top: 1px solid #f1f5f9;
}

.btn-modal-cancel {
  padding: 10px 20px;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #94a3b8;
    color: #1e293b;
  }
}

.btn-modal-submit {
  padding: 10px 20px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: all 0.25s;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// 响应式
@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }

  .page-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
    padding: 24px;
  }

  .hero-stats {
    width: 100%;
    justify-content: space-around;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .service-types-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .record-info-grid {
    grid-template-columns: 1fr;
  }

  .record-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .record-actions {
    width: 100%;

    button {
      flex: 1;
    }
  }
}

@media (max-width: 480px) {
  .service-types-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .service-type-card {
    padding: 10px 6px;

    .type-icon {
      width: 34px;
      height: 34px;
    }

    span {
      font-size: 11px;
    }
  }

  .modal-body,
  .modal-header,
  .modal-footer {
    padding-left: 20px;
    padding-right: 20px;
  }
}
</style>
