<template>
  <div class="llm-config-page">
    <div class="page-header">
      <div class="header-left">
        <el-button link @click="router.push('/chat-room')">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>LLM 配置</h2>
      </div>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="tips"
      title="每个供应商配置一个 API Key，在该 Key 下可添加多个模型；未配置前无法使用对话功能。"
    />

    <el-card v-for="p in providerOptions" :key="p.value" shadow="never" class="provider-card">
      <template #header>
        <div class="card-header">
          <span class="provider-name">{{ p.label }}</span>
          <div class="card-header-right">
            <span class="enable-label">启用</span>
            <el-switch v-model="edits[p.value].enabled" @change="handleToggle(p.value)" />
            <el-button v-if="edits[p.value].hasConfig" link type="danger" @click="handleDelete(p.value)">
              删除配置
            </el-button>
          </div>
        </div>
      </template>

      <el-form label-width="90px" label-position="left">
        <el-form-item label="API Key">
          <el-input
            v-model="edits[p.value].apiKey"
            type="password"
            show-password
            :placeholder="edits[p.value].hasConfig ? '留空表示保持不变' : '请输入 API Key（必填）'"
          />
        </el-form-item>
        <el-form-item label="模型">
          <div class="model-tags">
            <el-tag
              v-for="(m, i) in edits[p.value].modelNames"
              :key="m"
              closable
              @close="removeModel(p.value, i)"
            >
              {{ m }}
            </el-tag>
            <el-text v-if="!edits[p.value].modelNames.length" type="info" size="small">
              暂无模型，请添加至少一个
            </el-text>
          </div>
          <el-select
            v-model="newModelInput[p.value]"
            filterable
            allow-create
            default-first-option
            placeholder="选择预置或输入自定义模型名后回车"
            size="small"
            class="model-add-select"
            @change="addModel(p.value)"
          >
            <el-option v-for="m in presetModels(p.value)" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
      </el-form>

      <div class="card-actions">
        <el-button :loading="testing[p.value]" @click="handleTest(p.value)">测试连接</el-button>
        <el-button type="primary" :loading="saving[p.value]" @click="handleSave(p.value)">保存</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { llmConfigApi } from '@/api/llmConfig'

const router = useRouter()

const providerOptions = [
  { value: 'DASHSCOPE', label: '通义千问' },
  { value: 'DEEPSEEK', label: 'DeepSeek' },
]

const presets = ref({})
const testing = reactive({ DASHSCOPE: false, DEEPSEEK: false })
const saving = reactive({ DASHSCOPE: false, DEEPSEEK: false })
const newModelInput = reactive({ DASHSCOPE: '', DEEPSEEK: '' })

// 每个供应商一个编辑块：{ hasConfig, apiKey, enabled, modelNames }
const edits = reactive({})
providerOptions.forEach((p) => {
  edits[p.value] = { hasConfig: false, apiKey: '', enabled: true, modelNames: [] }
})

const presetModels = (provider) => presets.value[provider] || []

const fetchList = async () => {
  try {
    const res = await llmConfigApi.list()
    const configs = res.data || []
    providerOptions.forEach((p) => {
      const cfg = configs.find((c) => c.provider === p.value)
      edits[p.value] = {
        hasConfig: !!cfg,
        apiKey: '',
        enabled: cfg ? cfg.enabled === 1 : true,
        modelNames: cfg ? [...(cfg.models || [])] : [],
      }
    })
  } catch (e) {
    console.error(e)
  }
}

const fetchPresets = async () => {
  try {
    const res = await llmConfigApi.presets()
    presets.value = res.data || {}
  } catch (e) {
    console.error(e)
  }
}

const addModel = (provider) => {
  const name = (newModelInput[provider] || '').trim()
  if (!name) return
  if (!edits[provider].modelNames.includes(name)) {
    edits[provider].modelNames.push(name)
  }
  newModelInput[provider] = ''
}

const removeModel = (provider, index) => {
  edits[provider].modelNames.splice(index, 1)
}

const buildPayload = (provider) => ({
  provider,
  apiKey: edits[provider].apiKey,
  enabled: edits[provider].enabled ? 1 : 0,
  modelNames: edits[provider].modelNames,
})

const handleSave = async (provider) => {
  const edit = edits[provider]
  if (!edit.hasConfig && !edit.apiKey.trim()) {
    ElMessage.warning('新增配置时必须填写 API Key')
    return
  }
  if (!edit.modelNames.length) {
    ElMessage.warning('请至少添加一个模型')
    return
  }
  saving[provider] = true
  try {
    const res = await llmConfigApi.save(buildPayload(provider))
    ElMessage.success(res.message || '保存成功')
    await fetchList()
  } catch (e) {
    console.error(e)
  } finally {
    saving[provider] = false
  }
}

const handleTest = async (provider) => {
  const edit = edits[provider]
  if (!edit.modelNames.length) {
    ElMessage.warning('请先添加模型')
    return
  }
  testing[provider] = true
  try {
    const res = await llmConfigApi.test({
      provider,
      apiKey: edit.apiKey,
      modelNames: [edit.modelNames[0]],
    })
    ElMessage.success(res.message || '连接成功')
  } catch (e) {
    console.error(e)
  } finally {
    testing[provider] = false
  }
}

const handleToggle = async (provider) => {
  const edit = edits[provider]
  if (!edit.hasConfig) {
    // 尚未保存过配置，仅本地切换，保存时生效
    return
  }
  try {
    const res = await llmConfigApi.save(buildPayload(provider))
    ElMessage.success(edit.enabled ? '已启用' : '已停用')
    await fetchList()
  } catch (e) {
    console.error(e)
  }
}

const handleDelete = async (provider) => {
  const edit = edits[provider]
  try {
    await ElMessageBox.confirm(
      `确定删除「${providerOptions.find((p) => p.value === provider).label}」的配置吗？`,
      '提示',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
    await llmConfigApi.deleteByProvider(provider)
    ElMessage.success('删除成功')
    await fetchList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

onMounted(() => {
  fetchList()
  fetchPresets()
})
</script>

<style scoped>
.llm-config-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-left h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}
.tips {
  margin-bottom: 16px;
}
.provider-card {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.provider-name {
  font-size: 16px;
  font-weight: 600;
}
.card-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.enable-label {
  font-size: 13px;
  color: #909399;
}
.model-tags {
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.model-add-select {
  width: 100%;
}
.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
</style>
