<template>
  <el-dialog
    :model-value="visible"
    :title="`${server?.serverName || 'MCP'} - 工具调试`"
    width="920px"
    top="6vh"
    @update:model-value="emit('update:visible', $event)"
    destroy-on-close
  >
    <div class="detail-layout" v-loading="loading">
      <div class="tool-list">
        <div
          v-for="tool in tools"
          :key="tool.name"
          :class="['tool-item', { active: selectedTool?.name === tool.name }]"
          @click="selectTool(tool)"
        >
          {{ tool.name }}
        </div>
        <el-empty v-if="!loading && !tools.length" description="该服务暂无工具" :image-size="60" />
      </div>

      <div class="tool-detail">
        <template v-if="selectedTool">
          <h3 class="tool-name">{{ selectedTool.name }}</h3>
          <p class="tool-desc">{{ selectedTool.description }}</p>

          <el-form ref="formRef" :model="form" :rules="rules" label-width="140px" class="param-form">
            <el-form-item v-for="f in formFields" :key="f.name" :label="f.name" :prop="f.name">
              <el-select
                v-if="f.def.enum"
                v-model="form[f.name]"
                :placeholder="f.placeholder"
                clearable
                style="width: 100%"
              >
                <el-option v-for="opt in f.def.enum" :key="opt" :label="String(opt)" :value="opt" />
              </el-select>
              <el-switch v-else-if="f.type === 'boolean'" v-model="form[f.name]" />
              <el-input-number
                v-else-if="f.type === 'number' || f.type === 'integer'"
                v-model="form[f.name]"
                :controls="false"
                style="width: 100%"
              />
              <el-input
                v-else-if="f.type === 'array' || f.type === 'object'"
                v-model="form[f.name]"
                type="textarea"
                :rows="3"
                :placeholder="f.placeholder + '（JSON 格式）'"
              />
              <el-input v-else v-model="form[f.name]" :placeholder="f.placeholder" />
            </el-form-item>
            <el-form-item v-if="!formFields.length">
              <span class="no-param">该工具无参数，可直接执行</span>
            </el-form-item>
          </el-form>

          <div class="action-row">
            <el-button type="primary" :loading="calling" @click="handleCall">执行</el-button>
          </div>

          <div v-if="result" class="result-box" :class="{ error: !result.success }">
            <div class="result-title">{{ result.success ? '执行结果' : '执行失败' }}</div>
            <pre class="result-content">{{ result.content || '(无内容)' }}</pre>
          </div>
        </template>
        <el-empty v-else description="请选择左侧工具" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { mcpApi } from '@/api/mcp'

const props = defineProps({
  visible: { type: Boolean, default: false },
  server: { type: Object, default: null },
})
const emit = defineEmits(['update:visible'])

const loading = ref(false)
const tools = ref([])
const selectedTool = ref(null)
const formRef = ref(null)
const form = reactive({})
const calling = ref(false)
const result = ref(null)

// 由 inputSchema.properties 生成表单字段
const formFields = computed(() => {
  const schema = selectedTool.value?.inputSchema || {}
  const properties = schema.properties || {}
  const required = schema.required || []
  return Object.entries(properties).map(([name, def]) => ({
    name,
    type: def.type || 'string',
    def,
    required: required.includes(name),
    placeholder: def.description || '',
  }))
})

const rules = computed(() => {
  const r = {}
  formFields.value.forEach((f) => {
    if (f.required && (f.type === 'string' || f.type === 'number' || f.type === 'integer')) {
      r[f.name] = [{ required: true, message: `请输入${f.name}`, trigger: 'blur' }]
    }
  })
  return r
})

const resetForm = (tool) => {
  Object.keys(form).forEach((k) => delete form[k])
  const schema = tool?.inputSchema || {}
  const properties = schema.properties || {}
  Object.entries(properties).forEach(([name, def]) => {
    if (def.default !== undefined) {
      form[name] = def.type === 'array' || def.type === 'object' ? JSON.stringify(def.default) : def.default
    } else if (def.type === 'boolean') {
      form[name] = false
    } else if (def.type === 'number' || def.type === 'integer') {
      form[name] = null
    } else {
      form[name] = ''
    }
  })
}

const selectTool = (tool) => {
  selectedTool.value = tool
  result.value = null
  resetForm(tool)
}

const loadTools = async () => {
  if (!props.server) return
  loading.value = true
  try {
    const res = await mcpApi.listTools(props.server.id)
    tools.value = res.data || []
    if (tools.value.length) {
      selectTool(tools.value[0])
    } else {
      selectedTool.value = null
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleCall = async () => {
  if (!selectedTool.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  const args = {}
  formFields.value.forEach((f) => {
    const val = form[f.name]
    if (val === null || val === undefined || val === '') return
    if (f.type === 'array' || f.type === 'object') {
      try {
        args[f.name] = JSON.parse(val)
      } catch {
        args[f.name] = val
      }
    } else {
      args[f.name] = val
    }
  })
  calling.value = true
  try {
    const res = await mcpApi.callTool(props.server.id, {
      toolName: selectedTool.value.name,
      arguments: args,
    })
    result.value = res.data
  } catch (e) {
    result.value = { success: false, content: e?.message || '调用失败' }
  } finally {
    calling.value = false
  }
}

watch(
  () => props.visible,
  (v) => {
    if (v) loadTools()
  }
)
</script>

<style scoped>
.detail-layout {
  display: flex;
  gap: 16px;
  min-height: 320px;
}
.tool-list {
  width: 220px;
  flex-shrink: 0;
  max-height: 480px;
  overflow-y: auto;
  border-right: 1px solid var(--glass-border);
  padding-right: 12px;
}
.tool-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  word-break: break-all;
}
.tool-item:hover {
  background: rgba(255, 255, 255, 0.08);
}
.tool-item.active {
  background: rgba(94, 234, 212, 0.16);
  color: var(--accent);
  font-weight: 600;
}
.tool-detail {
  flex: 1;
  min-width: 0;
  max-height: 480px;
  overflow-y: auto;
}
.tool-name {
  margin: 0 0 6px;
  font-size: 16px;
  color: var(--text-primary);
}
.tool-desc {
  margin: 0 0 12px;
  color: var(--text-secondary);
  font-size: 12px;
}
.param-form {
  margin-bottom: 8px;
}
.no-param {
  color: var(--text-secondary);
  font-size: 13px;
}
.action-row {
  margin-bottom: 12px;
}
.result-box {
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.25);
}
.result-box.error {
  border-color: var(--el-color-danger);
}
.result-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-primary);
}
.result-content {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 260px;
  overflow-y: auto;
  color: var(--text-primary);
}
</style>
