<template>
  <div class="login-container">
    <!-- 背景遮罩层 -->
    <div class="overlay"></div>

    <!-- 登录表单卡片 -->
    <div class="login-card">
      <h1 class="title">WELCOME</h1>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        class="login-form"
      >
        <!-- 用户名 -->
        <el-form-item prop="username" class="form-item animate-in-1">
          <div class="input-wrap">
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              :class="{ 'has-value': loginForm.username }"
            />
            <i class="fa-solid fa-user input-icon"></i>
          </div>
        </el-form-item>

        <!-- 密码 -->
        <el-form-item prop="password" class="form-item animate-in-2">
          <div class="input-wrap">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              show-password
              :class="{ 'has-value': loginForm.password }"
              @keyup.enter="handleLogin"
            />
            <i class="fa-solid fa-lock input-icon"></i>
          </div>
        </el-form-item>

        <!-- 记住我 & 忘记密码 -->
        <div class="rem-row animate-in-3">
          <label class="remember-me">
            <input type="checkbox" v-model="rememberMe" />
            <span>记住我</span>
          </label>
          <a class="forgot-link">忘记密码？</a>
        </div>

        <!-- 登录按钮 -->
        <el-form-item class="form-item animate-in-4">
          <button
            type="button"
            class="login-btn"
            :disabled="loading"
            @click="handleLogin"
          >
            <span v-if="!loading">登 录</span>
            <span v-else class="loading-text">登录中...</span>
          </button>
        </el-form-item>

        <!-- 注册链接 -->
        <p class="register-link animate-in-5">
          还没有账号？
          <a @click="goToRegister">立即注册</a>
        </p>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { userApi } from '../api/user'

const router = useRouter()
const route = useRoute()
const loginFormRef = ref(null)
const loading = ref(false)
const rememberMe = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const res = await userApi.login(loginForm)
        if (res.code === 200) {
          localStorage.setItem('token', res.data)
          ElMessage.success('登录成功')
          const redirect = route.query.redirect
          router.push(redirect || '/chat-room')
        } else {
          ElMessage.error(res.message || '登录失败')
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '登录失败')
      } finally {
        loading.value = false
      }
    }
  })
}

const goToRegister = () => {
  router.push('/register')
}
</script>

<style scoped lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

// ========== 容器 & 背景 ==========
.login-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: url('@/assets/back.jpg');
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  font-family: 'Poppins', sans-serif;
  overflow: hidden;
}

// 暗色遮罩层
.overlay {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 1;
}

// ========== 登录卡片（玻璃态） ==========
.login-card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.1);
  width: 35%;
  min-width: 380px;
  max-width: 500px;
  padding: 50px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.329);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.13);
  overflow: hidden;
}

// ========== 标题 ==========
.title {
  font-size: 3rem;
  color: white;
  margin: 0 0 50px;
  letter-spacing: 3px;
  font-weight: 700;

  animation: slideUp 1s ease-out forwards;
  opacity: 0;
  animation-delay: 0.2s;
}

// ========== 表单 ==========
.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.form-item {
  width: 90%;
  margin-bottom: 30px;
}

// ========== 输入框包装器 ==========
.input-wrap {
  border: 1px solid white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  width: 100%;
  border-radius: 50px;
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.459);
  overflow: hidden;

  // 覆盖 Element Plus 输入框样式
  :deep(.el-input) {
    flex: 1;
    height: 100%;

    .el-input__wrapper {
      background-color: transparent;
      box-shadow: none;
      border: none;
      padding: 5px 25px;
      height: 100%;
      border-radius: 0;

      .el-input__inner {
        color: white;
        font-size: 1.2rem;
        font-family: 'Poppins', sans-serif;
        background: transparent;

        &::placeholder {
          color: rgba(255, 255, 255, 0.8);
          font-size: 1.2rem;
          font-family: 'Poppins', sans-serif;
        }
      }

      // 密码显示/隐藏图标
      .el-input__suffix {
        .el-icon {
          color: white;
        }
      }
    }

    // hover/focus 状态去除边框
    .el-input__wrapper.is-focus {
      box-shadow: none;
      border: none;
    }
  }
}

// 右侧图标
.input-icon {
  font-size: 1.2rem;
  color: white;
  padding-right: 25px;
  flex-shrink: 0;
}

// 隐藏 el-form-item 的错误信息默认样式，改用自定义
:deep(.el-form-item__error) {
  color: #ff6b6b;
  padding-left: 25px;
  font-size: 0.85rem;
}

// ========== 记住我 & 忘记密码行 ==========
.rem-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 90%;
  margin-bottom: 30px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 1.1rem;
  cursor: pointer;

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: white;
  }
}

.forgot-link {
  font-size: 1.1rem;
  color: white;
  cursor: pointer;
  transition: opacity 0.3s;

  &:hover {
    opacity: 0.7;
  }
}

// ========== 登录按钮 ==========
.login-btn {
  font-size: 1.2rem;
  height: 60px;
  width: 90%;
  border-radius: 50px;
  font-weight: 600;
  letter-spacing: 2px;
  border: none;
  outline: none;
  cursor: pointer;
  background-color: white;
  color: #333;
  transition: 0.3s;
  font-family: 'Poppins', sans-serif;

  &:hover:not(:disabled) {
    background-color: rgb(221, 221, 221);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading-text {
    letter-spacing: 1px;
  }
}

// ========== 注册链接 ==========
.register-link {
  font-size: 1.2rem;
  color: white;
  margin-top: 35px;
  text-align: center;

  a {
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.3s;

    &:hover {
      opacity: 0.7;
    }
  }
}

// ========== 动画 ==========
@keyframes slideUp {
  from {
    transform: translateY(250px);
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-in-1 {
  animation: slideUp 1.2s ease-out forwards;
  opacity: 0;
  animation-delay: 0.4s;
}

.animate-in-2 {
  animation: slideUp 1.4s ease-out forwards;
  opacity: 0;
  animation-delay: 0.6s;
}

.animate-in-3 {
  animation: slideUp 1.8s ease-out forwards;
  opacity: 0;
  animation-delay: 0.8s;
}

.animate-in-4 {
  animation: slideUp 2s ease-out forwards;
  opacity: 0;
  animation-delay: 1s;
}

.animate-in-5 {
  animation: slideUp 2.2s ease-out forwards;
  opacity: 0;
  animation-delay: 1.2s;
}

// ========== 响应式 ==========
@media (max-width: 768px) {
  .login-card {
    width: 85%;
    min-width: unset;
    padding: 40px 10px;
  }

  .title {
    font-size: 2.2rem;
  }
}
</style>
