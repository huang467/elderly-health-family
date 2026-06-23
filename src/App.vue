<template>
  <div id="app" :data-theme="theme">
    <!-- 路由出口 -->
    <RouterView v-slot="{ Component }">
      <Transition :name="pageTransition" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <!-- 全局组件 -->
    <ToastContainer />
    <GlobalLoading />
    <ConfirmModal />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useUIStore } from './stores/uiStore';
import { getRealTimeHealth, checkHealthAnomaly } from './api/health';
import { useWarningStore } from './stores/warningStore';

const uiStore = useUIStore();
const theme = computed(() => uiStore.theme);
const pageTransition = computed(() => uiStore.pageTransition);

let monitorInterval = null;

onMounted(() => {
  uiStore.init();

  // 每隔 15 秒抓取一次体征并送给 AI 分析
  monitorInterval = setInterval(async () => {
    const elderlyId = localStorage.getItem('current_elderly_id');
    const isFamilyLogin = localStorage.getItem('family_login') === 'true';
    if (!isFamilyLogin || !elderlyId) return;

    try {
      // 1. 抓取（模拟或真实）硬件数据
      const realtimeData = await getRealTimeHealth(elderlyId);
      const sysBp = parseFloat(realtimeData.bloodPressure.split('/')[0]);

      // 2. 送入深度异常检测网络
      const aiResult = await checkHealthAnomaly({
        elderlyId: elderlyId,
        bloodOxygen: realtimeData.bloodOxygen,
        heartRate: realtimeData.heartRate,
        bloodPressureSys: sysBp
      });

      // 3. 一旦判定游离出安全聚类簇，立即派发预警到页面
      if (aiResult && aiResult.code === 200 && aiResult.data.is_anomaly) {
        const warningStore = useWarningStore();
        warningStore.add({
          elderlyId: elderlyId,
          type: '多维特征异常 (AI判定)',
          level: aiResult.data.level,
          desc: `高维空间偏离常态，游离分数: ${aiResult.data.details['游离分数']}，可能存在综合健康风险。`
        });
      }
    } catch (error) {
      console.error('健康监控轮询出错:', error);
    }
  }, 15000);
});

onUnmounted(() => {
  if (monitorInterval) clearInterval(monitorInterval);
});
</script>

<style lang="scss">
// 页面切换动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 滑动动画
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

// 弹性动画
.bounce-enter-active {
  animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.bounce-leave-active {
  animation: bounce-out 0.3s ease;
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes bounce-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.5);
  }
}
</style>
