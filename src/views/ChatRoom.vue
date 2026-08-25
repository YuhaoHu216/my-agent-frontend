<template>
  <div class="chat-page">
    <div class="chat-header">
      <span class="chat-title">{{ chatMode === 'chat' ? 'AI 助手' : 'AI 智能体' }}</span>
    </div>

    <div class="chat-messages glass-scroll" v-show="messages.length > 0" ref="messagesContainer">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message', message.role, chatMode]"
      >
        <div class="message-avatar">
          <el-avatar v-if="message.role === 'ai'" :icon="chatMode === 'agent' ? Cpu : UserFilled" />
          <el-avatar v-else :icon="User" />
        </div>
        <div class="message-content">
          <div class="message-bubble">
            <template v-if="message.content || (message.role === 'ai' && message.events && message.events.length > 0)">
              <template v-if="message.role === 'ai'">
                <!-- 新格式：结构化事件展示（基于消息自身的 events 判断，不依赖当前模式） -->
                <template v-if="message.events && message.events.length > 0">
                  <div v-for="(stepEvents, stepIdx) in groupedEvents(message.events)" :key="stepIdx" class="step-block">
                    <!-- 思考过程 - 可折叠面板（包含工具调用和结果） -->
                    <div v-if="hasThinkOrToolEvents(stepEvents)" class="think-event">
                      <el-collapse v-model="activeThinkingPanels" class="think-collapse">
                        <el-collapse-item :name="'step-'+getStepNumber(stepEvents)">
                          <template #title>
                            <el-icon class="think-icon"><Loading v-if="getStepNumber(stepEvents) === message.currentStep && isSending" /></el-icon>
                            第 {{ getStepNumber(stepEvents) }} 步思考过程
                          </template>
                          <!-- 思考内容 -->
                          <div v-for="(event, eIdx) in stepEvents.filter(e => e.type === 'think')" :key="'think-'+stepIdx+'-'+eIdx" class="thinking-content">{{ event.content }}</div>
                          <!-- 工具调用信息 -->
                          <div v-if="hasToolEvents(stepEvents)" class="tool-section">
                            <div class="tool-section-divider">— 工具调用 —</div>
                            <div v-for="(event, eIdx) in stepEvents.filter(e => e.type === 'tool_call')" :key="'toolcall-'+stepIdx+'-'+eIdx" class="tool-call-info">
                              <el-tag size="small" type="info" class="tool-call-tag">调用工具</el-tag>
                              <span class="tool-call-detail">{{ formatToolCalls(event.content) }}</span>
                            </div>
                            <div v-for="(event, eIdx) in stepEvents.filter(e => e.type === 'tool_result')" :key="'result-'+stepIdx+'-'+eIdx" class="tool-result">
                              <div class="tool-result-text">{{ event.content }}</div>
                            </div>
                          </div>
                        </el-collapse-item>
                      </el-collapse>
                    </div>
                    <!-- 最终回答（finish 完整文本，或 answer 流式分块累积） -->
                    <div v-if="getAnswerText(stepEvents)" class="finish-answer">
                      <MarkdownRenderer :content="getAnswerText(stepEvents)" />
                    </div>
                    <!-- 错误提示 -->
                    <div v-for="(event, eIdx) in stepEvents.filter(e => e.type === 'error' || e.type === 'max_steps')" :key="'warn-'+stepIdx+'-'+eIdx">
                      <el-alert :title="event.content" type="warning" :closable="false" show-icon />
                    </div>
                  </div>
                </template>
                <!-- 旧格式：chat 模式 / 无结构化事件的 AI 消息，直接按 markdown 渲染 -->
                <template v-else>
                  <MarkdownRenderer :content="message.content" />
                </template>
              </template>
              <template v-else>
                {{ message.content }}
              </template>
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

    <div class="chat-input" :class="{ centered: messages.length === 0 }">
      <div v-if="messages.length === 0" class="welcome-greeting">
        <h2>你好，我是你的 AI 助手</h2>
        <p>今天想让我帮你做点什么？</p>
      </div>
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
        <div class="input-toolbar">
          <el-radio-group v-model="chatMode" size="small" @change="chatStore.setMode">
            <el-radio-button value="chat">Chat 模式</el-radio-button>
            <el-radio-button value="agent">Agent 模式</el-radio-button>
          </el-radio-group>
          <el-select
            v-model="selectedModel"
            size="small"
            class="model-select"
            popper-class="glass-popper"
            placeholder="未配置模型"
            @change="chatStore.setModel"
          >
            <el-option-group v-for="g in modelGroups" :key="g.label" :label="g.label">
              <el-option v-for="m in g.options" :key="m.value" :label="m.label" :value="m.value" />
            </el-option-group>
          </el-select>
          <el-button
            type="primary"
            @click="sendMessage"
            :disabled="!inputMessage.trim()"
            class="send-button"
          >
            <el-icon v-if="isSending" class="send-spinner"><Loading /></el-icon>
            <el-icon v-else class="send-arrow"><Top /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: 'ChatRoom' })

import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { User, UserFilled, Cpu, Top, Loading } from '@element-plus/icons-vue'
import { aiApi } from '@/api/ai'
import { chatMemoryApi } from '@/api/chatMemory'
import { llmConfigApi } from '@/api/llmConfig'
import { useChatStore } from '@/stores/chat'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

const route = useRoute()
const chatStore = useChatStore()
const { messages, chatMode, selectedModel, isSending, currentChatId } = storeToRefs(chatStore)

// Model selection: 选中项存 "providerCode:modelName" 组合（如 "qwen:qwen-max"），选项来自用户 LLM 配置
const modelGroups = ref([])
// 后端 provider 枚举名 -> 前端 model 参数（ModelEnum code）
const providerCodeMap = { DASHSCOPE: 'qwen', DEEPSEEK: 'deepseek' }

// 从用户 LLM 配置动态生成"供应商分组 -> 模型"下拉选项；选中项未配置时回退到第一个已配置项
const loadModelOptions = async () => {
  try {
    const res = await llmConfigApi.list()
    const enabled = (res.data || []).filter((c) => c.enabled === 1)
    modelGroups.value = enabled
      .filter((c) => providerCodeMap[c.provider] && c.models && c.models.length)
      .map((c) => ({
        label: c.providerLabel,
        options: c.models.map((modelName) => ({
          value: `${providerCodeMap[c.provider]}:${modelName}`,
          label: modelName,
        })),
      }))
    const allOptions = modelGroups.value.flatMap((g) => g.options)
    if (!allOptions.some((m) => m.value === selectedModel.value)) {
      chatStore.setModel(allOptions.length ? allOptions[0].value : '')
    }
  } catch (e) {
    console.error(e)
  }
}

// 从 "providerCode:modelName" 组合中拆分出供应商 code 和模型名
const splitModel = (value) => {
  const idx = value.indexOf(':')
  return idx === -1 ? [value, ''] : [value.slice(0, idx), value.slice(idx + 1)]
}

const inputMessage = ref('')
const messagesContainer = ref(null)
// Agent 模式下当前正在思考的面板（默认展开当前步骤的思考）
const activeThinkingPanels = ref([])

const getCurrentTime = () => {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 消息时间分级显示：今天 → 时分；今年（非今天）→ 月-日 时分；往年 → 年-月-日 时分
const formatTimestamp = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
    return time
  }
  const date = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return d.getFullYear() === now.getFullYear()
    ? `${date} ${time}`
    : `${d.getFullYear()}-${date} ${time}`
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 拉取指定会话的历史消息并映射为前端结构
const fetchMessages = async (conversationId) => {
  const res = await chatMemoryApi.getConversationMessages(conversationId)
  if (res.code === 200 && Array.isArray(res.data)) {
    return res.data.map(msg => ({
      role: msg.role === 'USER' ? 'user' : 'ai',
      content: msg.text || '',
      events: msg.events || undefined,
      time: formatTimestamp(msg.timestamp)
    }))
  }
  return []
}

// 判断当前会话是否存在未完成的回复（最后一条为 USER 且无对应 ASSISTANT）
const isIncomplete = () => {
  if (!messages.value.length) return false
  return messages.value[messages.value.length - 1].role === 'user'
}

let pollTimer = null
const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// 会话存在进行中的回复时，轮询拉取直到出现 ASSISTANT（Agent 后台执行完成后落库）
const startPolling = (conversationId) => {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (currentChatId.value !== conversationId) {
      stopPolling()
      return
    }
    messages.value = await fetchMessages(conversationId)
    await scrollToBottom()
    if (!isIncomplete()) {
      stopPolling()
    }
  }, 1500)
}

// 加载会话消息；若回复未完成则启动轮询恢复
const loadMessages = async (conversationId, { poll = true } = {}) => {
  messages.value = await fetchMessages(conversationId)
  await scrollToBottom()
  if (poll && isIncomplete()) {
    startPolling(conversationId)
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isSending.value) return
  if (!selectedModel.value) {
    ElMessage.warning('请先在「LLM 配置」页面配置 API Key 和模型')
    return
  }

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  messages.value.push({
    role: 'user',
    content: userMessage,
    time: getCurrentTime()
  })

  await scrollToBottom()

  isSending.value = true

  const aiMessageIndex = messages.value.length
  messages.value.push({
    role: 'ai',
    content: '',
    time: getCurrentTime()
  })

  // 记录本次发送对应的会话，切走后再收到的流式输出将被丢弃（后端仍在后台执行并持久化）
  const targetChatId = currentChatId.value

  try {
    const [model, modelName] = splitModel(selectedModel.value)
    const stream = chatMode.value === 'agent'
      ? aiApi.doChatWithManus(userMessage, targetChatId, model, modelName)
      : aiApi.doChatWithLoveAppSse(userMessage, targetChatId, model, modelName)
    const reader = stream.getReader()
    let sessionsRefreshed = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // 切换会话后，丢弃旧流的输出，避免污染新会话
      if (currentChatId.value !== targetChatId) {
        await scrollToBottom()
        continue
      }

      // 首个事件到达时，后端已预写入 USER，刷新列表让新会话立即出现
      if (!sessionsRefreshed) {
        sessionsRefreshed = true
        chatStore.loadSessions()
      }

      // Agent 模式：检测结构化事件
      if (chatMode.value === 'agent' && typeof value === 'object' && value.type) {
        // 过滤掉 step_start / step_end 标记事件，它们只用于后端流程控制
        if (value.type === 'step_start' || value.type === 'step_end') {
          await scrollToBottom()
          continue
        }

        const aiMsg = messages.value[aiMessageIndex]
        if (!aiMsg.events) aiMsg.events = []
        aiMsg.events.push(value)
        aiMsg.currentStep = value.step

        // answer 是最终回答的流式分块，完整文本会由 finish 事件携带，故不重复拼接到 content
        if (value.type === 'answer') {
          await scrollToBottom()
          continue
        }

        // 同时拼接 content 用于向后兼容的文本展示和历史消息恢复
        const labelMap = { think: '[思考]', tool_call: '[工具调用]', tool_result: '[工具结果]', finish: '[最终回答]' }
        const label = labelMap[value.type] || ''
        aiMsg.content += (label ? label + ' ' : '') + value.content + '\n'
      } else {
        // Chat 模式或旧格式纯文本
        messages.value[aiMessageIndex].content += value
      }

      await scrollToBottom()
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    if (currentChatId.value === targetChatId) {
      messages.value[aiMessageIndex].content = '抱歉，出现了一些问题，请稍后再试。'
    }
  } finally {
    isSending.value = false
    await scrollToBottom()
    // 首轮完成后刷新侧边栏（会话名/内容已更新）
    if (currentChatId.value === targetChatId) {
      await chatStore.loadSessions()
    }
  }
}

// 按 step 编号分组事件
const groupedEvents = (events) => {
  if (!events || !events.length) return []
  const groups = {}
  for (const e of events) {
    const key = e.step || 0
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  }
  return Object.values(groups)
}

// 格式化工具调用 JSON 为可读文本
const formatToolCalls = (content) => {
  try {
    const calls = JSON.parse(content)
    if (Array.isArray(calls)) {
      return calls.map(c => `${c.name}(${c.arguments})`).join('；')
    }
  } catch {
    // 非 JSON 格式，直接返回
  }
  return content
}

// 判断步骤中是否包含工具相关事件
const hasToolEvents = (stepEvents) => {
  return stepEvents.some(e => e.type === 'tool_call' || e.type === 'tool_result')
}

// 判断步骤中是否有思考或工具事件
const hasThinkOrToolEvents = (stepEvents) => {
  return stepEvents.some(e => e.type === 'think' || e.type === 'tool_call' || e.type === 'tool_result')
}

// 获取步骤编号
const getStepNumber = (stepEvents) => {
  if (!stepEvents || !stepEvents.length) return 0
  return stepEvents[0].step || 0
}

// 获取某步骤的最终回答文本：优先 finish 完整文本，否则拼接 answer 流式分块
const getAnswerText = (stepEvents) => {
  if (!stepEvents || !stepEvents.length) return ''
  const finish = stepEvents.find(e => e.type === 'finish')
  if (finish) return finish.content
  return stepEvents.filter(e => e.type === 'answer').map(e => e.content).join('')
}

onMounted(async () => {
  await loadModelOptions()
  const id = route.query.conversationId
  if (id) {
    chatStore.setCurrent(id)
    await loadMessages(id)
  } else {
    await chatStore.newChat()
  }
})

// 侧边栏点会话 / 新聊天会推新 query → 这里触发加载；keep-alive 下组件保持活动也能响应
watch(
  () => route.query.conversationId,
  (id, old) => {
    if (id && id !== old) {
      stopPolling()
      chatStore.setCurrent(id)
      loadMessages(id)
    }
  }
)

onUnmounted(stopPolling)
</script>

<style scoped lang="scss">
// ========== 聊天主区（外层背景 / 遮罩 / 字体由 AppLayout 的 glass.css 提供） ==========
.chat-page {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

// ---- Header ----
.chat-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid var(--glass-border);

  .chat-title {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 1px;
    color: var(--text-primary);
  }
}

// ---- Messages ----
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 28px 20px;

  .message {
    display: flex;
    margin-bottom: 20px;
    animation: messageIn 0.35s ease both;

    &.user {
      flex-direction: row-reverse;

      .message-content {
        align-items: flex-end;

        .message-bubble {
          background: rgba(255, 255, 255, 0.95);
          color: #1e2a3a;
          border-radius: 18px 18px 4px 18px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }

        .message-time {
          text-align: right;
          color: rgba(255, 255, 255, 0.45);
        }
      }
    }

    &.ai {
      .message-content {
        align-items: flex-start;

        .message-bubble {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--text-primary);
          border-radius: 18px 18px 18px 4px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        }

        .message-time {
          color: rgba(255, 255, 255, 0.45);
        }
      }
    }

    .message-avatar {
      flex-shrink: 0;
      margin: 0 10px;

      :deep(.el-avatar) {
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
      }
    }

    &.user .message-avatar :deep(.el-avatar) {
      background: #fff;
      color: #0f1c2b;
    }

    &.ai .message-avatar :deep(.el-avatar) {
      background: linear-gradient(135deg, var(--accent), var(--accent-deep));
      color: #0c2230;
    }

    .message-content {
      display: flex;
      flex-direction: column;
      max-width: 72%;

      .message-bubble {
        padding: 12px 16px;
        font-size: 14px;
        line-height: 1.65;
        word-wrap: break-word;

        // Agent 模式结构化事件样式
        .step-block {
          margin-bottom: 6px;

          &:last-child {
            margin-bottom: 0;
          }
        }

        .think-event {
          .think-collapse {
            border: none;
            background: transparent;

            :deep(.el-collapse-item__header) {
              font-size: 13px;
              color: var(--text-secondary);
              height: 32px;
              line-height: 32px;
              border: none;
              background: transparent;
              padding: 0 4px;
            }

            :deep(.el-collapse-item__wrap) {
              border: none;
              background: rgba(0, 0, 0, 0.2);
              border-radius: 8px;
              margin: 4px 0;
            }

            :deep(.el-collapse-item__content) {
              padding: 10px 14px;
              font-size: 13px;
              color: rgba(255, 255, 255, 0.75);
              line-height: 1.7;
              white-space: pre-wrap;
              word-break: break-word;
            }
          }

          .think-icon {
            margin-right: 6px;
            font-size: 14px;
          }

          .tool-section {
            margin-top: 10px;

            .tool-section-divider {
              text-align: center;
              font-size: 12px;
              color: var(--text-tertiary);
              margin-bottom: 8px;
            }
          }
        }

        .thinking-content {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .tool-call-info {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 4px 0;

          .tool-call-tag {
            flex-shrink: 0;
            background: rgba(94, 234, 212, 0.16);
            border-color: rgba(94, 234, 212, 0.4);
            color: var(--accent);
          }

          .tool-call-detail {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.75);
            line-height: 1.5;
            word-break: break-all;
          }
        }

        .tool-result {
          .tool-result-text {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.85);
            line-height: 1.6;
            white-space: pre-wrap;
            word-break: break-word;
          }
        }

        .finish-answer {
          padding-top: 4px;
        }

        :deep(.el-alert) {
          border-radius: 8px;

          &.el-alert--warning {
            background: rgba(250, 173, 20, 0.12);
            border: 1px solid rgba(250, 173, 20, 0.3);

            .el-alert__title {
              color: #fcd34d;
            }

            .el-alert__icon {
              color: #fbbf24;
            }
          }
        }
      }

      .message-time {
        font-size: 12px;
        margin-top: 5px;
      }
    }
  }
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ---- Typing animation ----
.typing {
  display: flex;
  gap: 4px;
  padding: 8px 2px;

  .dot {
    animation: typing 1.4s infinite;
    font-size: 22px;
    line-height: 1;
  }

  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}

// ---- Input ----
.chat-input {
  padding: 16px 20px 20px;
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 1px solid var(--glass-border);

  // 新会话（无消息）时输入区整体垂直居中，上方显示问候语
  &.centered {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: transparent;
    border-top: none;
  }

  .welcome-greeting {
    text-align: center;
    margin-bottom: 32px;

    h2 {
      margin: 0 0 10px;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: var(--text-primary);
    }

    p {
      margin: 0;
      font-size: 14px;
      color: var(--text-secondary);
    }
  }

  .input-wrapper {
    position: relative;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 14px 16px 12px;
    border: 1px solid var(--glass-border);
    transition: border-color 0.2s, box-shadow 0.2s;

    &:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(94, 234, 212, 0.16);
    }

    .message-textarea {
      :deep(.el-textarea__inner) {
        background-color: transparent;
        border: none;
        box-shadow: none;
        padding: 0;
        font-size: 15px;
        line-height: 20px;
        max-height: 200px;
        resize: none;
        color: var(--text-primary);
        caret-color: var(--accent);

        &::placeholder {
          color: var(--text-tertiary);
          line-height: 26px;
          vertical-align: baseline;
        }
      }
    }

    // 底部工具条：模式切换 + 模型选择在左，发送按钮推到最右
    .input-toolbar {
      display: flex;
      align-items: center;
      gap: 10px;

      :deep(.el-radio-button__inner) {
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 14px;
        font-size: 12px;
        line-height: 1;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--glass-border);
        color: var(--text-secondary);
        transition: all 0.25s ease;
      }

      :deep(.el-radio-button:first-child .el-radio-button__inner) {
        border-radius: 10px 0 0 10px;
      }

      :deep(.el-radio-button:last-child .el-radio-button__inner) {
        border-radius: 0 10px 10px 0;
      }

      :deep(.el-radio-button.is-active .el-radio-button__inner) {
        background: rgba(255, 255, 255, 0.95);
        color: #0f1c2b;
        border-color: transparent;
        box-shadow: none;
      }

      .model-select {
        width: 140px;

        :deep(.el-select__wrapper) {
          height: 30px;
          min-height: 30px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.06);
          box-shadow: none;
          border: 1px solid var(--glass-border);
          border-radius: 10px;
        }

        :deep(.el-select__selected-item),
        :deep(.el-select__placeholder) {
          line-height: 1;
        }

        :deep(.el-select__wrapper.is-focused) {
          box-shadow: 0 0 0 1px var(--accent) inset;
        }

        :deep(.el-select__placeholder) {
          color: var(--text-tertiary);
        }

        :deep(.el-select__selected-item) {
          color: var(--text-primary);
        }

        :deep(.el-select__caret) {
          color: var(--text-secondary);
        }
      }

      .send-button {
        margin-left: auto;
        height: 34px;
        padding: 0 12px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--accent), var(--accent-deep)) !important;
        border: none !important;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        flex-shrink: 0;
        transition: all 0.2s;

        .el-icon {
          font-size: 17px;
          color: #0c2230;
        }

        .send-spinner {
          animation: sendSpin 1s linear infinite;
        }

        &:hover:not(.is-disabled) {
          background: linear-gradient(135deg, #7ff0dd, #34d6bf) !important;
          filter: brightness(1.05);
          box-shadow: 0 4px 14px rgba(45, 212, 191, 0.4);
        }

        &:disabled {
          background: rgba(255, 255, 255, 0.12) !important;
          cursor: not-allowed;

          .el-icon {
            color: var(--text-tertiary);
          }
        }
      }
    }
  }
}

@keyframes sendSpin {
  to {
    transform: rotate(360deg);
  }
}
</style>
