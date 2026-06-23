import { createRouter, createWebHistory } from 'vue-router';
// 家属端页面
import FamilyLogin from '../views/FamilyLogin.vue';
import ElderlySelect from '../views/ElderlySelect.vue';
import FamilyHome from '../views/FamilyHome.vue';
import HealthDashboard from '../views/HealthDashboard.vue';
import HealthTrend from '../views/HealthTrend.vue';
import HealthWarning from '../views/HealthWarning.vue';
import FallDetection from '../views/FallDetection.vue';
import HealthReport from '../views/HealthReport.vue';
import ServiceBooking from '../views/ServiceBooking.vue';
// 后台管理页面
import AdminLogin from '../views/AdminLogin.vue';
import AdminDashboard from '../views/AdminDashboard.vue';
import AdminElderly from '../views/AdminElderly.vue';
import AdminHealth from '../views/AdminHealth.vue';
import AdminWarning from '../views/AdminWarning.vue';
import AdminService from '../views/AdminService.vue';
import AdminStatistics from '../views/AdminStatistics.vue';

// 老人端页面
import ElderlyLogin from '../views/Elderly/ElderlyLogin.vue';
import ElderlyDashboard from '../views/Elderly/ElderlyDashboard.vue';

// 路由规则
const routes = [
  { path: '/', redirect: '/login' },

  // 家属端
  { path: '/login', name: 'FamilyLogin', component: FamilyLogin },
  { path: '/select-elderly', name: 'ElderlySelect', component: ElderlySelect, meta: { requiresFamilyAuth: true } },
  { path: '/home', name: 'FamilyHome', component: FamilyHome, meta: { requiresFamilyAuth: true } },
  { path: '/dashboard', name: 'HealthDashboard', component: HealthDashboard, meta: { requiresFamilyAuth: true } },
  { path: '/trend', name: 'HealthTrend', component: HealthTrend, meta: { requiresFamilyAuth: true } },
  { path: '/warning', name: 'HealthWarning', component: HealthWarning, meta: { requiresFamilyAuth: true } },
  { path: '/fall-detection', name: 'FallDetection', component: FallDetection, meta: { requiresFamilyAuth: true } },
  { path: '/report', name: 'HealthReport', component: HealthReport, meta: { requiresFamilyAuth: true } },
  { path: '/service', name: 'ServiceBooking', component: ServiceBooking, meta: { requiresFamilyAuth: true } },

  // 后台管理（管理员端）
  { path: '/admin/login', name: 'AdminLogin', component: AdminLogin },
  { path: '/admin/dashboard', name: 'AdminDashboard', component: AdminDashboard, meta: { requiresAdminAuth: true } },
  { path: '/admin/elderly', name: 'AdminElderly', component: AdminElderly, meta: { requiresAdminAuth: true } },
  { path: '/admin/health', name: 'AdminHealth', component: AdminHealth, meta: { requiresAdminAuth: true } },
  { path: '/admin/warning', name: 'AdminWarning', component: AdminWarning, meta: { requiresAdminAuth: true } },
  { path: '/admin/service', name: 'AdminService', component: AdminService, meta: { requiresAdminAuth: true } },
  { path: '/admin/statistics', name: 'AdminStatistics', component: AdminStatistics, meta: { requiresAdminAuth: true } },

  // 老人端
  { path: '/elderly/login', name: 'ElderlyLogin', component: ElderlyLogin, meta: { title: '老人端登录' } },
  { path: '/elderly/dashboard', name: 'ElderlyDashboard', component: ElderlyDashboard, meta: { title: '颐境感知 - 陪伴大屏', requiresElderlyAuth: true } }
];

// 创建路由实例
const routerInstance = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

// 简单路由守卫：前端访问控制（真正的权限验证仍需后端配合）
routerInstance.beforeEach((to, from, next) => {
  const isFamilyLogin = localStorage.getItem('family_login') === 'true';
  const isAdminLogin = localStorage.getItem('admin_login') === 'true';
  const isElderlyLogin = !!localStorage.getItem('elderly_token');

  if (to.meta.requiresFamilyAuth && !isFamilyLogin) {
    next({ path: '/login' });
    return;
  }

  if (to.meta.requiresAdminAuth && !isAdminLogin) {
    next({ path: '/admin/login' });
    return;
  }

  if (to.meta.requiresElderlyAuth && !isElderlyLogin) {
    next({ path: '/elderly/login' });
    return;
  }

  // 家属端页面检查是否已选择老人
  if (to.meta.requiresFamilyAuth && isFamilyLogin) {
    const currentElderlyId = localStorage.getItem('current_elderly_id');
    // 如果不是老人选择页面且没有选择老人，则跳转到老人选择页面
    if (to.path !== '/select-elderly' && !currentElderlyId) {
      next({ path: '/select-elderly' });
      return;
    }
  }

  next();
});

// 导出路由实例
export default routerInstance;
