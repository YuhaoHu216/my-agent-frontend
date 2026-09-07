<template>
  <div class="orchestrator-manage-page glass-page">
    <header class="page-toolbar">
      <h2>编排器管理</h2>
      <div class="toolbar-actions">
        <el-button type="primary" @click="openDialog()">
          <el-icon><Plus /></el-icon> 新增编排器
        </el-button>
      </div>
    </header>

    <el-card shadow="never" class="glass-card table-card">
      <el-table v-loading="loading" :data="orchestrators" border stripe>
        <el-table-column prop="orchestratorName" label="编排器名称" min-width="140" />
        <el-table-column prop="systemPrompt" label="系统提示词" min-width="280" show-overflow-tooltip />
        <el-table-column prop="provider" label="提供商" width="100" align="center">
          <template #default="{ row }">{{ providerLabel(row.provider) }}</template>
        </el-table-column>
        <el-table-column prop="modelName" label="模型" width="160" />
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch :model-value="row.enabled === 1" @change="handleToggle(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openBindDialog(row)">子Agent</el-button>
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无编排器，点击右上角新增" />
        </template>
      </el-table>
    </el-card>

    <!-- 新增/编辑编排器弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑编排器' : '新增编排器'" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="编排器名称" prop="orchestratorName">
          <el-input v-model="form.orchestratorName" placeholder="例如：研究主编排器" maxlength="100" />
        </el-form-item>
        <el-form-item label="系统提示词" prop="systemPrompt">
          <el-input
            v-model="form.systemPrompt"
            type="textarea"
            :rows="6"
            placeholder="你是主智能体，负责判断任务并委派给合适的子智能体…"
          />
        </el-form-item>
        <el-form-item label="供应商" prop="provider">
          <el-select v-model="form.provider" placeholder="选择模型供应商" style="width: 100%">
            <el-option v-for="p in providerOptions" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="模型" prop="modelName">
          <el-select
            v-model="form.modelName"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入模型名"
            style="width: 100%"
          >
            <el-option v-for="m in modelsOfProvider(form.provider)" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-alert
          v-if="!providerConfigured(form.provider)"
          type="warning"
          :closable="false"
          show-icon
          title="该供应商未配置 API Key，对话时将被拒绝，请先到「LLM 配置」页配置"
        />
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 绑定子 Agent 弹窗 -->
    <el-dialog v-model="bindDialogVisible" :title="`绑定子Agent - ${current?.orchestratorName ?? ''}`" width="520px" destroy-on-close>
      <el-select v-model="boundAgentIds" multiple filterable placeholder="选择要绑定的子 Agent（可多选）" style="width: 100%">
        <el-option v-for="a in agentOptions" :key="a.id" :label="a.agentName" :value="a.id" />
      </el-select>
      <template #footer>
        <el-button @click="bindDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="binding" @click="handleBindAgents">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { orchestratorApi } from '@/api/orchestrator'
import { agentApi } from '@/api/agent'
import { llmConfigApi } from '@/api/llmConfig'

defineOptions({ name: 'OrchestratorManage' })

const providerOptions = [
  { value: 'DASHSCOPE', label: '通义千问' },
  { value: 'DEEPSEEK', label: 'DeepSeek' },
]
const providerLabel = (p) => providerOptions.find((o) => o.value === p)?.label || p

const loading = ref(false)
const orchestrators = ref([])
// 该用户已配置的 LLM：list() 返回 [{provider, enabled, models:[...]}]
const llmConfigs = ref([])

const fetchList = async () => {
  loading.value = true
  try {
    const res = await orchestratorApi.list()
    orchestrators.value = res.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchLlmConfigs = async () => {
  try {
    const res = await llmConfigApi.list()
    llmConfigs.value = res.data || []
  } catch (e) {
    console.error(e)
  }
}

const modelsOfProvider = (provider) => llmConfigs.value.find((c) => c.provider === provider)?.models || []
const providerConfigured = (provider) => llmConfigs.value.some((c) => c.provider === provider && c.enabled === 1)

// ===== 新增/编辑 =====
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const form = reactive({
  id: null,
  orchestratorName: '',
  systemPrompt: '',
  provider: 'DEEPSEEK',
  modelName: '',
  enabled: true,
})

const rules = {
  orchestratorName: [{ required: true, message: '请输入编排器名称', trigger: 'blur' }],
  systemPrompt: [{ required: true, message: '请输入系统提示词', trigger: 'blur' }],
  provider: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  modelName: [{ required: true, message: '请选择或输入模型名', trigger: 'change' }],
}

const openDialog = (row) => {
  if (row) {
    form.id = row.id
    form.orchestratorName = row.orchestratorName
    form.systemPrompt = row.systemPrompt
    form.provider = row.provider
    form.modelName = row.modelName
    form.enabled = row.enabled === 1
  } else {
    form.id = null
    form.orchestratorName = ''
    form.systemPrompt = ''
    form.provider = 'DEEPSEEK'
    form.modelName = ''
    form.enabled = true
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    const payload = {
      id: form.id,
      orchestratorName: form.orchestratorName,
      systemPrompt: form.systemPrompt,
      provider: form.provider,
      modelName: form.modelName,
      enabled: form.enabled ? 1 : 0,
    }
    if (form.id) {
      await orchestratorApi.update(payload)
      ElMessage.success('修改成功')
    } else {
      await orchestratorApi.add(payload)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

// ===== 启停 =====
const handleToggle = async (row) => {
  try {
    await orchestratorApi.toggle(row.id)
    ElMessage.success(row.enabled === 1 ? '已停用' : '已启用')
    fetchList()
  } catch (e) {
    console.error(e)
  }
}

// ===== 删除 =====
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除编排器「${row.orchestratorName}」吗？`, '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await orchestratorApi.deleteById(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ===== 绑定子 Agent =====
const bindDialogVisible = ref(false)
const boundAgentIds = ref([])
const agentOptions = ref([])
const current = ref(null)
const binding = ref(false)

const openBindDialog = async (row) => {
  current.value = row
  bindDialogVisible.value = true
  boundAgentIds.value = []
  try {
    const [allAgents, bound] = await Promise.all([agentApi.list(), orchestratorApi.listAgents(row.id)])
    agentOptions.value = (allAgents.data || []).filter((a) => a.enabled === 1)
    boundAgentIds.value = (bound.data || []).map((a) => a.id)
  } catch (e) {
    console.error(e)
  }
}

const handleBindAgents = async () => {
  binding.value = true
  try {
    await orchestratorApi.bindAgents(current.value.id, boundAgentIds.value)
    ElMessage.success('绑定成功')
    bindDialogVisible.value = false
  } catch (e) {
    console.error(e)
  } finally {
    binding.value = false
  }
}

onMounted(() => {
  fetchList()
  fetchLlmConfigs()
})
</script>

<style scoped>
.orchestrator-manage-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>