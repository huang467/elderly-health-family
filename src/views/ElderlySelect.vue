<template>
  <div class="elderly-select">
    <AppHeader title="选择老人" />
    <div class="container">
      <!-- 页面头部 -->
      <section class="page-header">
        <div class="header-content">
          <div class="header-icon">
            <IconSvg name="users" :size="48" />
          </div>
          <h1>选择要查看的老人</h1>
          <p>您的账户已关联以下老人，请点击选择</p>
        </div>
      </section>

      <!-- 加载状态 -->
      <div class="loading-state" v-if="isLoading">
        <div class="loading-spinner"></div>
        <p>正在加载老人信息...</p>
      </div>

      <!-- 错误消息 -->
      <div class="error-state" v-if="errorMessage">
        <div class="error-icon">
          <IconSvg name="alert-triangle" :size="48" />
        </div>
        <p class="error-text">{{ errorMessage }}</p>
        <button class="btn btn-primary" @click="handleRetry">
          <IconSvg name="refresh" :size="18" />
          <span>重新加载</span>
        </button>
      </div>

      <!-- 老人列表 -->
      <div class="elderly-grid" v-if="!isLoading && !errorMessage">
        <ElderlyInfoCard
          v-for="elderly in elderlyList"
          :key="elderly.id"
          :elderly="elderly"
          @click="selectElderly"
        />
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-if="!isLoading && !errorMessage && elderlyList.length === 0">
        <div class="empty-icon">
          <IconSvg name="user" :size="64" />
        </div>
        <h3>暂无关联的老人</h3>
        <p>请联系社区管理员绑定老人信息</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import ElderlyInfoCard from '../components/ElderlyInfoCard.vue';
import IconSvg from '../components/IconSvg.vue';
import { useElderlyList } from '../composables/useElderlyList';
import { useElderlyStore } from '../stores/elderlyStore';

const router = useRouter();
const elderlyStore = useElderlyStore();

// 使用老人列表管理 composable
const { elderlyList, isLoading, errorMessage, fetchElderlyList } = useElderlyList();

/**
 * 选择老人
 * @param {Object} elderly - 老人信息对象
 */
const selectElderly = (elderly) => {
  try {
    // 存储选中的老人信息
    localStorage.setItem('current_elderly_id', elderly.id);
    localStorage.setItem('current_elderly_name', elderly.name);
    localStorage.setItem('current_elderly_info', JSON.stringify(elderly));
    elderlyStore.setCurrent(elderly);

    // 跳转到首页
    router.push('/home');
  } catch (error) {
    console.error('存储老人信息失败：', error);
  }
};

/**
 * 重试获取老人列表
 */
const handleRetry = () => {
  fetchElderlyList();
};
</script>

<style scoped lang="scss">
.elderly-select {
  min-height: 100vh;
  background: #f8fafc;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

// 页面头部
.page-header {
  margin-bottom: 32px;
}

.header-content {
  text-align: center;
  padding: 48px 32px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  border-radius: 24px;
  color: white;
  box-shadow: 0 10px 40px rgba(30, 58, 95, 0.3);

  .header-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 96px;
    height: 96px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 24px;
    margin-bottom: 24px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  h1 {
    font-size: 32px;
    font-weight: 700;
    margin: 0 0 12px;
  }

  p {
    font-size: 16px;
    opacity: 0.85;
    margin: 0;
  }
}

// 加载状态
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e2e8f0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 20px;
  }

  p {
    color: #64748b;
    font-size: 16px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 错误状态
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 60px 32px;
  background: #fef3c7;
  border-radius: 16px;
  margin: 20px 0;
  text-align: center;

  .error-icon {
    color: #d97706;
  }

  .error-text {
    color: #92400e;
    font-size: 16px;
    font-weight: 500;
  }

  .btn {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

// 老人网格
.elderly-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

// 空状态
.empty-state {
  text-align: center;
  padding: 80px 32px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);

  .empty-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 120px;
    height: 120px;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    border-radius: 32px;
    color: #94a3b8;
    margin-bottom: 24px;
  }

  h3 {
    font-size: 24px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 8px;
  }

  p {
    color: #64748b;
    font-size: 16px;
    margin: 0;
  }
}

// 响应式
@media (max-width: 768px) {
  .container {
    padding: 16px;
  }

  .header-content {
    padding: 32px 24px;

    .header-icon {
      width: 72px;
      height: 72px;
    }

    h1 {
      font-size: 24px;
    }
  }

  .elderly-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 24px 20px;

    .header-icon {
      width: 60px;
      height: 60px;
    }

    h1 {
      font-size: 20px;
    }

    p {
      font-size: 14px;
    }
  }
}
</style>
