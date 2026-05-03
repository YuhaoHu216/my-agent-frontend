<template>
  <div class="chat-room">
    <div class="chat-header">
      <el-button type="primary" link @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <span class="chat-title">AI 助手</span>
      <span class="chat-id">会话 ID: {{ chatId }}</span>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message', message.role]"
      >
        <div class="message-avatar">
          <el-avatar v-if="message.role === 'ai'" :icon="UserFilled" />
          <el-avatar v-else :icon="User" />
        </div>
        <div class="message-content">
          <div class="message-bubble">
            <template v-if="message.content">
              {{ message.content }}
            </template>
            <div v-else class="typing">
              <span class="dot">.</span>
              <span class="dot">.</span>
              <span class="dot">.</span>
            </div>
          </div>
          <div class="message-time">{{ message.time }}</div>
        </div>
      </div>
    </div>

    <div class="chat-input">
      <div class="input-wrapper">
        <el-input
          v-model="inputMessage"
          placeholder="请输入消息..."
          @keyup.enter="sendMessage"
          :disabled="isSending"
          type="textarea"
          :rows="3"
          resize="none"
          class="message-textarea"
        />
        <el-button 
          type="primary" 
          @click="sendMessage" 
          :loading="isSending"
          :disabled="!inputMessage.trim()"
          class="send-button"
        >
          <el-icon><Top /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { User, UserFilled, ArrowLeft, Top } from '@element-plus/icons-vue'
import { aiApi } from '@/api/ai'

const router = useRouter()
const messages = ref([])
const inputMessage = ref('')
const isLoading = ref(false)
const isSending = ref(false)
const chatId = ref('')
const messagesContainer = ref(null)

const generateChatId = () => {
  return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

const getCurrentTime = () => {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isSending.value) return

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''
  
  messages.value.push({
    role: 'user',
    content: userMessage,
    time: getCurrentTime()
  })
  
  await scrollToBottom()
  
  isSending.value = true
  isLoading.value = true
  
  const aiMessageIndex = messages.value.length
  messages.value.push({
    role: 'ai',
    content: '',
    time: getCurrentTime()
  })
  
  try {
    const stream = aiApi.doChatWithLoveAppSse(userMessage, chatId.value)
    const reader = stream.getReader()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      messages.value[aiMessageIndex].content += value
      await scrollToBottom()
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    messages.value[aiMessageIndex].content = '抱歉，出现了一些问题，请稍后再试。'
  } finally {
    isSending.value = false
    isLoading.value = false
    await scrollToBottom()
  }
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  chatId.value = generateChatId()
})
</script>

<style scoped lang="scss">
.chat-room {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.chat-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  
  .chat-title {
    flex: 1;
    text-align: center;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
  
  .chat-id {
    font-size: 12px;
    color: #999;
  }
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  
  .message {
    display: flex;
    margin-bottom: 20px;
    
    &.user {
      flex-direction: row-reverse;
      
      .message-content {
        align-items: flex-end;
        
        .message-bubble {
          background-color: #409eff;
          color: #fff;
          border-radius: 16px 16px 0 16px;
        }
        
        .message-time {
          text-align: right;
        }
      }
    }
    
    &.ai {
      .message-content {
        align-items: flex-start;
        
        .message-bubble {
          background-color: #fff;
          color: #333;
          border-radius: 16px 16px 16px 0;
        }
      }
    }
    
    .message-avatar {
      flex-shrink: 0;
      margin: 0 10px;
    }
    
    .message-content {
      display: flex;
      flex-direction: column;
      max-width: 70%;
      
      .message-bubble {
        padding: 12px 16px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
        
        &.typing {
          display: flex;
          gap: 4px;
          padding: 16px;
          
          .dot {
            animation: typing 1.4s infinite;
            font-size: 20px;
            line-height: 1;
          }
          
          .dot:nth-child(2) {
            animation-delay: 0.2s;
          }
          
          .dot:nth-child(3) {
            animation-delay: 0.4s;
          }
        }
      }
      
      .message-time {
        font-size: 12px;
        color: #999;
        margin-top: 4px;
      }
    }
  }
}

.chat-input {
  padding: 20px;
  background-color: #fff;
  border-top: 1px solid #e0e0e0;
  
  .input-wrapper {
    position: relative;
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    align-items: flex-end;
    gap: 12px;
    background-color: #f7f7f8;
    border-radius: 16px;
    padding: 12px 16px;
    border: 1px solid #e5e5e5;
    transition: border-color 0.2s;
    
    &:focus-within {
      border-color: #10a37f;
    }
    
    .message-textarea {
      flex: 1;
      
      :deep(.el-textarea__inner) {
        background-color: transparent;
        border: none;
        box-shadow: none;
        padding: 0;
        font-size: 15px;
        line-height: 1.5;
        max-height: 200px;
        resize: none;
        
        &::placeholder {
          color: #8e8ea0;
        }
      }
    }
    
    .send-button {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background-color: #10a37f;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;
      
      &:hover {
        background-color: #0e8b6d;
      }
      
      &:disabled {
        background-color: #d1d5db;
        cursor: not-allowed;
      }
      
      .el-icon {
        font-size: 18px;
        color: #fff;
      }
    }
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}
</style>
