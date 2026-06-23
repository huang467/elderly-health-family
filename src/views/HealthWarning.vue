<template>
  <div class="health-warning">
    <AppHeader title="预警通知记录" />
    <FamilyNav />

    <div class="container">
      <!-- 统计概览 -->
      <section class="stats-section">
        <div class="stat-card total">
          <div class="stat-icon">
            <IconSvg name="bell" :size="28" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalCount }}</div>
            <div class="stat-label">总预警数</div>
          </div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon">
            <IconSvg name="alert-triangle" :size="28" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ unhandledCount }}</div>
            <div class="stat-label">未处理</div>
          </div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon">
            <IconSvg name="check-circle" :size="28" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ handledCount }}</div>
            <div class="stat-label">已处理</div>
          </div>
        </div>
        <div class="stat-card danger">
          <div class="stat-icon">
            <IconSvg name="alert-circle" :size="28" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ highRiskCount }}</div>
            <div class="stat-label">高危预警</div>
          </div>
        </div>
      </section>

      <!-- 筛选区域 -->
      <section class="filter-section">
        <div class="filter-grid">
          <div class="filter-item">
            <label>老人ID</label>
            <input type="text" v-model="elderlyId" readonly class="filter-input" />
          </div>
          <div class="filter-item">
            <label>状态筛选</label>
            <select v-model="statusFilter" @change="fetchWarningList" class="filter-input">
              <option value="">全部状态</option>
              <option value="未处理">未处理</option>
              <option value="已处理">已处理</option>
            </select>
          </div>
          <div class="filter-item">
            <label>预警类型</label>
            <select v-model="typeFilter" @change="fetchWarningList" class="filter-input">
              <option value="">全部类型</option>
              <option value="血压异常">血压异常</option>
              <option value="心率偏高">心率偏高</option>
              <option value="心率偏低">心率偏低</option>
              <option value="血氧偏低">血氧偏低</option>
              <option value="体温异常">体温异常</option>
              <option value="呼吸率异常">呼吸率异常</option>
              <option value="血糖异常">血糖异常</option>
              <option value="跌倒检测">跌倒检测</option>
              <option value="隐私区域跌倒检测">隐私区域跌倒检测</option>
            </select>
          </div>
          <div class="filter-item">
            <label>预警等级</label>
            <select v-model="levelFilter" @change="fetchWarningList" class="filter-input">
              <option value="">全部等级</option>
              <option value="high">高危</option>
              <option value="medium">中危</option>
              <option value="low">低危</option>
            </select>
          </div>
        </div>
      </section>

      <!-- 预警列表 -->
      <section class="warning-list-section">
        <div class="list-header">
          <h2 class="section-title">
            <IconSvg name="alert-triangle" :size="22" />
            预警记录
            <span class="count-badge">{{ filteredWarnings.length }} 条</span>
          </h2>
          <div class="list-actions">
            <button class="action-btn outline" @click="batchHandleWarnings" v-if="unhandledCount > 0">
              <IconSvg name="check-square" :size="16" />
              批量处理
            </button>
            <button class="action-btn outline" @click="exportWarningData">
              <IconSvg name="download" :size="16" />
              导出数据
            </button>
          </div>
        </div>

        <!-- 加载状态 -->
        <div class="loading-state" v-if="isLoading">
          <div class="spinner"></div>
          <span>加载中...</span>
        </div>

        <!-- 预警列表 -->
        <div class="warning-items" v-if="!isLoading">
          <div
            class="warning-card"
            v-for="(item, idx) in filteredWarnings"
            :key="item.id || idx"
            :class="[item.level, { 'unhandled': item.status === '未处理' }]"
          >
            <div class="card-left">
              <div class="level-icon" :class="item.level">
                <IconSvg name="alert-circle" :size="22" />
              </div>
            </div>

            <div class="card-body">
              <div class="card-header">
                <div class="header-left">
                  <span class="warning-type-tag" :class="item.level">{{ item.type }}</span>
                  <span class="level-badge" :class="getLevelClass(item.level)">{{ getLevelText(item.level) }}</span>
                </div>
                <span class="warning-time">
                  <IconSvg name="clock" :size="13" />
                  {{ item.time }}
                </span>
              </div>

              <p class="warning-desc">{{ item.desc }}</p>

              <div class="warning-evidence" v-if="item.snapshotUrl">
                <img :src="item.snapshotUrl" alt="跌倒瞬间影像" />
                <div>
                  <strong>跌倒瞬间影像</strong>
                  <span>边缘端于 {{ item.transmittedAt || item.time }} 上传</span>
                </div>
              </div>

              <div class="detail-tags" v-if="item.details">
                <div class="detail-tag" v-for="(detail, key) in item.details" :key="key">
                  <span class="tag-key">{{ key }}</span>
                  <span class="tag-val">{{ detail }}</span>
                </div>
              </div>

              <div class="card-footer">
                <div class="status-group">
                  <span class="status-badge" :class="item.status === '已处理' ? 'handled' : 'unhandled'">
                    <IconSvg :name="item.status === '已处理' ? 'check-circle' : 'clock'" :size="13" />
                    {{ item.status }}
                  </span>
                  <span class="handle-time" v-if="item.handledAt">
                    处理于 {{ item.handledAt }}
                  </span>
                </div>
                <div class="card-actions">
                  <button class="btn-primary-sm" @click="handleWarning(item)" v-if="item.status === '未处理'">
                    处理
                  </button>
                  <button class="btn-outline-sm" @click="viewWarningDetail(item)">
                    详情
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div class="empty-state" v-if="filteredWarnings.length === 0">
            <div class="empty-icon">
              <IconSvg name="bell" :size="48" />
            </div>
            <h3>暂无预警记录</h3>
            <p>当前筛选条件下没有相关预警</p>
          </div>
        </div>
      </section>
    </div>

    <!-- 预警详情弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showDetailModal" @click="showDetailModal = false">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h3>
              <IconSvg name="info" :size="20" />
              预警详情
            </h3>
            <button class="modal-close" @click="showDetailModal = false">
              <IconSvg name="x" :size="20" />
            </button>
          </div>
          <div class="modal-body" v-if="selectedWarning">
            <div class="detail-row">
              <span class="detail-label">预警类型</span>
              <span class="detail-value">{{ selectedWarning.type }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">预警时间</span>
              <span class="detail-value">{{ selectedWarning.time }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">预警等级</span>
              <span class="detail-value">
                <span class="level-badge" :class="getLevelClass(selectedWarning.level)">
                  {{ getLevelText(selectedWarning.level) }}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">预警描述</span>
              <span class="detail-value">{{ selectedWarning.desc }}</span>
            </div>
            <div class="detail-row evidence-detail-row" v-if="selectedWarning.snapshotUrl">
              <span class="detail-label">事件影像</span>
              <div class="detail-value">
                <div class="detail-evidence">
                  <img :src="selectedWarning.snapshotUrl" alt="跌倒瞬间影像" />
                  <div>
                    <strong>跌倒瞬间关键帧</strong>
                    <span>{{ selectedWarning.transmittedAt || selectedWarning.time }} · 边缘端上传</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="detail-row" v-if="selectedWarning.details">
              <span class="detail-label">详细数据</span>
              <div class="detail-value">
                <div class="detail-data-grid">
                  <div class="data-item" v-for="(detail, key) in selectedWarning.details" :key="key">
                    <span class="data-key">{{ key }}</span>
                    <span class="data-val">{{ detail }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="detail-row" v-if="selectedWarning.status === '已处理'">
              <span class="detail-label">处理时间</span>
              <span class="detail-value">{{ selectedWarning.handledAt }}</span>
            </div>
            <div class="detail-row" v-if="selectedWarning.handledBy">
              <span class="detail-label">处理人</span>
              <span class="detail-value">{{ selectedWarning.handledBy }}</span>
            </div>
            <div class="detail-row" v-if="selectedWarning.handleNote">
              <span class="detail-label">处理备注</span>
              <span class="detail-value">{{ selectedWarning.handleNote }}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-outline-modal" @click="showDetailModal = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 处理预警弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showHandleModal" @click="showHandleModal = false">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h3>
              <IconSvg name="check-circle" :size="20" />
              处理预警
            </h3>
            <button class="modal-close" @click="showHandleModal = false">
              <IconSvg name="x" :size="20" />
            </button>
          </div>
          <div class="modal-body" v-if="selectedWarning">
            <div class="detail-row">
              <span class="detail-label">预警类型</span>
              <span class="detail-value">{{ selectedWarning.type }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">预警时间</span>
              <span class="detail-value">{{ selectedWarning.time }}</span>
            </div>
            <div class="form-field">
              <label>处理备注</label>
              <textarea
                v-model="handleNote"
                class="note-textarea"
                rows="3"
                placeholder="请输入处理备注（选填）"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-outline-modal" @click="showHandleModal = false">取消</button>
            <button class="btn-primary-modal" @click="confirmHandleWarning">确定处理</button>
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
import { getHealthWarnings } from '../api/health';
import { useWarningStore } from '../stores/warningStore';

const elderlyId = ref(localStorage.getItem('current_elderly_id') || '1001');
const warningStore = useWarningStore();

const statusFilter = ref('');
const typeFilter = ref('');
const levelFilter = ref('');
const isLoading = ref(false);

// 使用 store 中的预警数据（未过滤的原始数据）
const warnings = computed(() => warningStore.all);
const showDetailModal = ref(false);
const showHandleModal = ref(false);
const selectedWarning = ref(null);
const handleNote = ref('');

// 获取预警数据
const fetchWarningList = async () => {
  try {
    isLoading.value = true;

    warningStore.loadInitialData();

    if (warningStore.all.length === 0) {
      const result = await getHealthWarnings(elderlyId.value, {
        status: statusFilter.value,
        type: typeFilter.value,
        level: levelFilter.value
      });

      if (result.list && result.list.length > 0) {
        result.list.forEach(w => warningStore.add(w));
      } else {
        generateMockWarnings().forEach(w => warningStore.add(w));
      }
    }
  } catch (error) {
    console.error('预警数据获取失败：', error);
    if (warningStore.all.length === 0) {
      generateMockWarnings().forEach(w => warningStore.add(w));
    }
  } finally {
    isLoading.value = false;
  }
};

const generateMockWarnings = () => {
  const types = ['血压异常', '心率偏高', '心率偏低', '血氧偏低', '体温异常', '呼吸率异常', '血糖异常', '跌倒检测', '隐私区域跌倒检测'];
  const levels = ['high', 'medium', 'low'];
  const result = [];

  for (let i = 1; i <= 20; i++) {
    const date = new Date();
    date.setMinutes(date.getMinutes() - i * 10);

    const type = types[Math.floor(Math.random() * types.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const status = i % 3 === 0 ? '已处理' : '未处理';

    result.push({
      id: `warning_${i}`,
      type,
      level,
      status,
      time: date.toLocaleString('zh-CN'),
      desc: `${type}预警：${getRandomValue(type)}，超出正常范围`,
      details: {
        '测量值': getRandomValue(type),
        '正常范围': getNormalRange(type),
        '设备ID': `device_${Math.floor(Math.random() * 1000)}`,
        '测量位置': ['手腕', '手指', '腋下'][Math.floor(Math.random() * 3)]
      },
      handledAt: status === '已处理' ? new Date(date.getTime() + 30 * 60000).toLocaleString('zh-CN') : undefined,
      handledBy: status === '已处理' ? '家属' : undefined,
      handleNote: status === '已处理' ? '已确认，无大碍' : undefined
    });
  }

  return result;
};

const getRandomValue = (type) => {
  switch (type) {
    case '血压异常': return `${Math.floor(Math.random() * 30) + 140}/${Math.floor(Math.random() * 20) + 90}`;
    case '心率偏高': return `${Math.floor(Math.random() * 30) + 100}次/分`;
    case '心率偏低': return `${Math.floor(Math.random() * 10) + 50}次/分`;
    case '血氧偏低': return `${Math.floor(Math.random() * 10) + 85}%`;
    case '体温异常': return `${(Math.random() * 1.5 + 37.5).toFixed(1)}℃`;
    case '呼吸率异常': return `${Math.floor(Math.random() * 10) + 21}次/分`;
    case '血糖异常': return `${(Math.random() * 2 + 7).toFixed(1)}mmol/L`;
    case '跌倒检测': return '疑似跌倒，置信度96%';
    case '隐私区域跌倒检测': return '浴室疑似跌倒，置信度94%';
    default: return '异常值';
  }
};

const getNormalRange = (type) => {
  switch (type) {
    case '血压异常': return '90-140/60-90 mmHg';
    case '心率偏高':
    case '心率偏低': return '60-100次/分';
    case '血氧偏低': return '≥95%';
    case '体温异常': return '36.0-37.3℃';
    case '呼吸率异常': return '12-20次/分';
    case '血糖异常': return '3.9-6.1mmol/L';
    case '跌倒检测': return '未检测到跌倒';
    case '隐私区域跌倒检测': return '未检测到跌倒';
    default: return '正常范围';
  }
};

const filteredWarnings = computed(() => {
  let filtered = warnings.value;

  if (statusFilter.value) {
    filtered = filtered.filter(item => item.status === statusFilter.value);
  }
  if (typeFilter.value) {
    filtered = filtered.filter(item => item.type === typeFilter.value);
  }
  if (levelFilter.value) {
    filtered = filtered.filter(item => item.level === levelFilter.value);
  }

  return filtered;
});

const totalCount = computed(() => warnings.value.length);
const unhandledCount = computed(() => warnings.value.filter(item => item.status === '未处理').length);
const handledCount = computed(() => warnings.value.filter(item => item.status === '已处理').length);
const highRiskCount = computed(() => warnings.value.filter(item => item.level === 'high').length);

const getLevelClass = (level) => {
  const map = { high: 'level-high', medium: 'level-medium', low: 'level-low' };
  return map[level] || 'level-medium';
};

const getLevelText = (level) => {
  const map = { high: '高危', medium: '中危', low: '低危' };
  return map[level] || '中危';
};

const viewWarningDetail = (item) => {
  selectedWarning.value = item;
  showDetailModal.value = true;
};

const handleWarning = (item) => {
  selectedWarning.value = item;
  handleNote.value = '';
  showHandleModal.value = true;
};

const confirmHandleWarning = async () => {
  try {
    if (!selectedWarning.value) return;
    const success = warningStore.handle(selectedWarning.value.id, handleNote.value);
    if (success) {
      showHandleModal.value = false;
      handleNote.value = '';
    }
  } catch (error) {
    console.error('处理预警失败：', error);
  }
};

const batchHandleWarnings = async () => {
  const unhandled = warnings.value.filter(item => item.status === '未处理');
  if (unhandled.length === 0) return;

  if (confirm(`确定要批量处理 ${unhandled.length} 条未处理预警吗？`)) {
    warningStore.batchHandle(unhandled.map(item => item.id), '批量处理');
  }
};

const exportWarningData = () => {
  const filtered = filteredWarnings.value;
  if (filtered.length === 0) {
    alert('没有可导出的数据');
    return;
  }

  let csvContent = '类型,时间,等级,状态,描述,处理时间,处理人,处理备注\n';
  filtered.forEach(item => {
    csvContent += `${item.type},${item.time},${getLevelText(item.level)},${item.status},${item.desc},${item.handledAt || ''},${item.handledBy || ''},${item.handleNote || ''}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `预警记录_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

onMounted(() => fetchWarningList());
</script>

<style scoped lang="scss">
.health-warning {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding-bottom: 40px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

// 统计概览
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  }

  &.total {
    .stat-icon { background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #3b82f6; }
    .stat-value { color: #3b82f6; }
  }

  &.warning {
    .stat-icon { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706; }
    .stat-value { color: #d97706; }
  }

  &.success {
    .stat-icon { background: linear-gradient(135deg, #dcfce7, #bbf7d0); color: #16a34a; }
    .stat-value { color: #16a34a; }
  }

  &.danger {
    .stat-icon { background: linear-gradient(135deg, #fee2e2, #fecaca); color: #dc2626; }
    .stat-value { color: #dc2626; }
  }
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-content {
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
}

// 筛选区域
.filter-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.filter-item {
  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #64748b;
    margin-bottom: 8px;
  }
}

.filter-input {
  width: 100%;
  padding: 10px 14px;
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

  &[readonly] {
    cursor: not-allowed;
    color: #94a3b8;
  }
}

// 预警列表区域
.warning-list-section {
  background: white;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;

  .count-badge {
    margin-left: 4px;
    padding: 4px 12px;
    background: #f1f5f9;
    color: #64748b;
    font-size: 13px;
    font-weight: 500;
    border-radius: 20px;
  }
}

.list-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &.outline {
    background: white;
    border: 1.5px solid #e2e8f0;
    color: #64748b;

    &:hover {
      border-color: #3b82f6;
      color: #3b82f6;
    }
  }
}

// 加载状态
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: #64748b;

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #e2e8f0;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// 预警卡片
.warning-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.warning-card {
  display: flex;
  gap: 20px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1.5px solid #e2e8f0;
  transition: all 0.3s ease;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }

  &.high {
    border-left: 4px solid #ef4444;
    border-color: #fecaca;
    background: #fff5f5;
  }

  &.medium {
    border-left: 4px solid #f59e0b;
    border-color: #fde68a;
    background: #fffbeb;
  }

  &.low {
    border-left: 4px solid #3b82f6;
    border-color: #bfdbfe;
    background: #eff6ff;
  }

  &.unhandled {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  }
}

.card-left {
  flex-shrink: 0;
  padding-top: 2px;
}

.level-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  &.high { background: #fee2e2; color: #dc2626; }
  &.medium { background: #fef3c7; color: #d97706; }
  &.low { background: #dbeafe; color: #2563eb; }
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-type-tag {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;

  &.high { background: #fee2e2; color: #b91c1c; }
  &.medium { background: #fef3c7; color: #92400e; }
  &.low { background: #dbeafe; color: #1d4ed8; }
}

.level-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;

  &.level-high { background: #fecaca; color: #991b1b; }
  &.level-medium { background: #fed7aa; color: #9a3412; }
  &.level-low { background: #bfdbfe; color: #1e40af; }
}

.warning-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
}

.warning-desc {
  margin: 0 0 12px;
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
}

.warning-evidence {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding: 10px;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);

  img {
    width: 132px;
    height: 84px;
    border-radius: 9px;
    object-fit: cover;
    background: #111827;
    flex-shrink: 0;
  }

  strong {
    display: block;
    color: #991b1b;
    font-size: 14px;
    margin-bottom: 4px;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.detail-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.06);

  .tag-key {
    font-size: 12px;
    color: #94a3b8;
  }

  .tag-val {
    font-size: 12px;
    font-weight: 500;
    color: #1e293b;
  }
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.status-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;

  &.handled {
    background: #dcfce7;
    color: #166534;
  }

  &.unhandled {
    background: #fef3c7;
    color: #92400e;
  }
}

.handle-time {
  font-size: 12px;
  color: #94a3b8;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.btn-primary-sm {
  padding: 7px 16px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  }
}

.btn-outline-sm {
  padding: 7px 16px;
  background: white;
  border: 1.5px solid #e2e8f0;
  color: #64748b;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
    color: #3b82f6;
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
    width: 100px;
    height: 100px;
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
  max-width: 560px;
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

.detail-row {
  display: flex;
  gap: 12px;

  .detail-label {
    width: 90px;
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    padding-top: 2px;
  }

  .detail-value {
    flex: 1;
    font-size: 14px;
    color: #1e293b;
    line-height: 1.6;
  }
}

.detail-data-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.evidence-detail-row {
  align-items: flex-start;
}

.detail-evidence {
  overflow: hidden;
  border: 1px solid #fecaca;
  border-radius: 14px;
  background: #fff7f7;

  img {
    width: 100%;
    max-height: 260px;
    object-fit: cover;
    display: block;
    background: #111827;
  }

  div {
    padding: 12px 14px;
  }

  strong {
    display: block;
    color: #991b1b;
    font-size: 15px;
    margin-bottom: 4px;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.data-item {
  display: flex;
  gap: 8px;
  font-size: 13px;

  .data-key {
    color: #94a3b8;
    width: 70px;
    flex-shrink: 0;
  }

  .data-val {
    color: #374151;
    font-weight: 500;
  }
}

.form-field {
  label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
  }
}

.note-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  color: #1e293b;
  resize: vertical;
  transition: all 0.2s;
  box-sizing: border-box;

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

.btn-outline-modal {
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

.btn-primary-modal {
  padding: 10px 20px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: all 0.25s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
  }
}

// 响应式
@media (max-width: 1024px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .warning-card {
    flex-direction: column;
    gap: 12px;
  }

  .warning-evidence {
    flex-direction: column;
    align-items: flex-start;

    img {
      width: 100%;
      height: 180px;
    }
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-header,
  .modal-footer {
    padding-left: 20px;
    padding-right: 20px;
  }

  .detail-row {
    flex-direction: column;
    gap: 4px;

    .detail-label {
      width: auto;
    }
  }
}

@media (max-width: 480px) {
  .stats-section {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .stat-card {
    padding: 16px;
    gap: 12px;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
  }

  .stat-content .stat-value {
    font-size: 24px;
  }
}
</style>
