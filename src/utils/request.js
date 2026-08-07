import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截器：自动附加 JWT token
request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 缓存 router 引用，避免循环依赖
let router = null
export function injectRouter(r) {
  router = r
}

// 响应拦截器：统一处理业务响应和 401
request.interceptors.response.use(
  (response) => {
    const { data } = response
    // 业务成功 (code === 200)
    if (data.code === 200) {
      return data
    }
    // 业务失败
    ElMessage.error(data.message || '操作失败')
    return Promise.reject(new Error(data.message || '操作失败'))
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        const userStore = useUserStore()
        // 未登录用户（本来就没有 token），静默处理
        if (!userStore.token) {
          return Promise.reject(error)
        }
        // 已登录用户 token 过期，清除状态并跳转登录页
        ElMessage.error('登录已过期，请重新登录')
        userStore.logout()
        if (router) {
          router.push('/login')
        } else {
          window.location.href = '/login'
        }
      } else {
        ElMessage.error(data?.message || `请求失败 (${status})`)
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请稍后重试')
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }
    return Promise.reject(error)
  },
)

export default request
