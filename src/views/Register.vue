<template>
  <div class="register-container">
    <!-- 背景遮罩层 -->
    <div class="overlay"></div>

    <!-- 注册表单卡片 -->
    <div class="register-card">
      <h1 class="title">CREATE ACCOUNT</h1>

      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="rules"
        class="register-form"
      >
        <!-- 用户名 -->
        <el-form-item prop="username" class="form-item animate-in-1">
          <div class="input-wrap">
            <el-input
              v-model="registerForm.username"
              placeholder="请输入用户名（3-20 个字符）"
            />
            <i class="fa-solid fa-user input-icon"></i>
          </div>
        </el-form-item>

        <!-- 密码 -->
        <el-form-item prop="password" class="form-item animate-in-2">
          <div class="input-wrap">
            <el-input
              v-model="registerForm.password"
              type="password"
              placeholder="请输入密码（6-20 个字符）"
              show-password
            />
            <i class="fa-solid fa-lock input-icon"></i>
          </div>
        </el-form-item>

        <!-- 邮箱 -->
        <el-form-item prop="email" class="form-item animate-in-3">
          <div class="input-wrap">
            <el-input
              v-model="registerForm.email"
              placeholder="请输入邮箱地址"
            />
            <i class="fa-solid fa-envelope input-icon"></i>
          </div>
        </el-form-item>

        <!-- 手机号 -->
        <el-form-item prop="phone" class="form-item animate-in-4">
          <div class="input-wrap">
            <el-input
              v-model="registerForm.phone"
              placeholder="请输入手机号（可选）"
            />
            <i class="fa-solid fa-phone input-icon"></i>
          </div>
        </el-form-item>

        <!-- 邀请码 -->
        <el-form-item prop="inviteCode" class="form-item animate-in-5">
          <div class="input-wrap">
            <el-input
              v-model="registerForm.inviteCode"
              placeholder="请输入邀请码"
            />
            <i class="fa-solid fa-ticket input-icon"></i>
          </div>
        </el-form-item>

        <!-- 注册按钮 -->
        <el-form-item class="form-item animate-in-6">
          <button
            type="button"
            class="register-btn"
            :disabled="loading"
            @click="handleRegister"
          >
            <span v-if="!loading">注 册</span>
            <span v-else class="loading-text">注册中...</span>
          </button>
        </el-form-item>

        <!-- 返回登录链接 -->
        <p class="login-link animate-in-7">
          已有账号？
          <a @click="goToLogin">返回登录</a>
        </p>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { userApi } from '../api/user'

const router = useRouter()
const registerFormRef = ref(null)
const loading = ref(false)

const registerForm = reactive({
  username: '',
  password: '',
  email: '',
  phone: '',
  inviteCode: ''
})

const validateUsername = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入用户名'))
  } else if (value.length < 3 || value.length > 20) {
    callback(new Error('用户名长度必须在 3-20 之间'))
  } else {
    callback()
  }
}

const validatePassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入密码'))
  } else if (value.length < 6 || value.length > 20) {
    callback(new Error('密码长度必须在 6-20 之间'))
  } else {
    callback()
  }
}

const validateEmail = (rule, value, callback) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!value) {
    callback(new Error('请输入邮箱'))
  } else if (!emailRegex.test(value)) {
    callback(new Error('邮箱格式不正确'))
  } else {
    callback()
  }
}

const validateInviteCode = (rule, value, callback) => {
  if (!value || !value.trim()) {
    callback(new Error('请输入邀请码'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { validator: validateUsername, trigger: 'blur' }
  ],
  password: [
    { validator: validatePassword, trigger: 'blur' }
  ],
  email: [
    { validator: validateEmail, trigger: 'blur' }
  ],
  inviteCode: [
    { validator: validateInviteCode, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!registerFormRef.value) return

  await registerFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const res = await userApi.register(registerForm)
        if (res.code === 200) {
          ElMessage.success('注册成功')
          router.push('/login')
        } else {
          ElMessage.error(res.message || '注册失败')
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '注册失败')
      } finally {
        loading.value = false
      }
    }
  })
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

// ========== 容器 & 背景 ==========
.register-container {
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
  background-color: rgba(0, 0, 0, 0.25);
  z-index: 1;
}

// ========== 注册卡片（玻璃态） ==========
.register-card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.1);
  width: 38%;
  min-width: 400px;
  max-width: 550px;
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
  font-size: 2.6rem;
  color: white;
  margin: 0 0 40px;
  letter-spacing: 3px;
  font-weight: 700;

  animation: slideUp 1s ease-out forwards;
  opacity: 0;
  animation-delay: 0.2s;
}

// ========== 表单 ==========
.register-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.form-item {
  width: 90%;
  margin-bottom: 24px;
}

// ========== 输入框包装器 ==========
.input-wrap {
  border: 1px solid white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 55px;
  width: 100%;
  border-radius: 50px;
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.459);
  overflow: hidden;

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
        font-size: 1.1rem;
        font-family: 'Poppins', sans-serif;
        background: transparent;

        &::placeholder {
          color: rgba(255, 255, 255, 0.8);
          font-size: 1.1rem;
          font-family: 'Poppins', sans-serif;
        }
      }

      .el-input__suffix {
        .el-icon {
          color: white;
        }
      }
    }

    .el-input__wrapper.is-focus {
      box-shadow: none;
      border: none;
    }
  }
}

.input-icon {
  font-size: 1.1rem;
  color: white;
  padding-right: 25px;
  flex-shrink: 0;
}

:deep(.el-form-item__error) {
  color: #ff6b6b;
  padding-left: 25px;
  font-size: 0.85rem;
}

// ========== 注册按钮 ==========
.register-btn {
  font-size: 1.2rem;
  height: 55px;
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
  margin-top: 10px;

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

// ========== 返回登录链接 ==========
.login-link {
  font-size: 1.1rem;
  color: white;
  margin-top: 25px;
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
  animation-delay: 0.3s;
}
.animate-in-2 {
  animation: slideUp 1.2s ease-out forwards;
  opacity: 0;
  animation-delay: 0.45s;
}
.animate-in-3 {
  animation: slideUp 1.2s ease-out forwards;
  opacity: 0;
  animation-delay: 0.6s;
}
.animate-in-4 {
  animation: slideUp 1.2s ease-out forwards;
  opacity: 0;
  animation-delay: 0.75s;
}
.animate-in-5 {
  animation: slideUp 1.2s ease-out forwards;
  opacity: 0;
  animation-delay: 0.9s;
}
.animate-in-6 {
  animation: slideUp 1.2s ease-out forwards;
  opacity: 0;
  animation-delay: 1.05s;
}
.animate-in-7 {
  animation: slideUp 1.2s ease-out forwards;
  opacity: 0;
  animation-delay: 1.2s;
}

// ========== 响应式 ==========
@media (max-width: 768px) {
  .register-card {
    width: 85%;
    min-width: unset;
    padding: 40px 10px;
  }

  .title {
    font-size: 2rem;
  }
}
</style>
