<template>
  <div class="agent-manage-page glass-page">
    <header class="page-toolbar">
      <h2>Agent 管理</h2>
      <div class="toolbar-actions">
        <el-button type="primary" @click="openDialog()">
          <el-icon><Plus /></el-icon> 新增 Agent
        </el-button>
      </div>
    </header>

    <el-card shadow="never" class="glass-card table-card">
      <el-table v-loading="loading" :data="agents" border stripe>
        <el-table-column prop="agentName" label="Agent名称" min-width="140" />
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
        <el-table-column label="操作" width="280" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openSkillDialog(row)">技能</el-button>
            <el-button link type="primary" @click="openMcpDialog(row)">MCP</el-button>
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无 Agent，点击右上角新增" />
        </template>
      </el-table>
    </el-card>

    <!-- 新增/编辑 Agent 弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑 Agent' : '新增 Agent'" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="Agent名称" prop="agentName">
          <el-input v-model="form.agentName" placeholder="例如：研究助理" maxlength="100" />
        </el-form-item>
        <el-form-item label="系统提示词" prop="systemPrompt">
          <el-input
            v-model="form.systemPrompt"
            type="textarea"
            :rows="6"
            placeholder="你是…请全程使用中文…输出 Markdown 排版…"
          />
        </el-form-item>
        <el-form-item label="下一步提示词">
          <el-input
            v-model="form.nextStepPrompt"
            type="textarea"
            :rows="3"
            placeholder="可空。例如：接到任务先调用 doTerminate 前的工具…"
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

    <!-- 绑定技能弹窗 -->
    <el-dialog v-model="skillDialogVisible" :title="`绑定技能 - ${currentAgent?.agentName ?? ''}`" width="520px" destroy-on-close>
      <el-select v-model="boundSkillIds" multiple filterable placeholder="选择要绑定的技能" style="width: 100%">
        <el-option v-for="s in skillOptions" :key="s.id" :label="s.skillName" :value="s.id" />
      </el-select>
      <template #footer>
        <el-button @click="skillDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="binding" @click="handleBindSkills">保存</el-button>
      </template>
    </el-dialog>

    <!-- 绑定 MCP 弹窗 -->
    <el-dialog v-model="mcpDialogVisible" :title="`绑定MCP - ${currentAgent?.agentName ?? ''}`" width="520px" destroy-on-close>
      <el-select v-model="boundMcpIds" multiple filterable placeholder="选择要绑定的 MCP 服务" style="width: 100%">
        <el-option v-for="m in mcpOptions" :key="m.id" :label="m.serverName" :value="m.id" />
      </el-select>
      <template #footer>
        <el-button @click="mcpDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="binding" @click="handleBindMcps">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { agentApi } from '@/api/agent'
import { skillApi } from '@/api/skill'
import { mcpApi } from '@/api/mcp'
import { llmConfigApi } from '@/api/llmConfig'

const providerOptions = [
  { value: 'DASHSCOPE', label: '通义千问' },
  { value: 'DEEPSEEK', label: 'DeepSeek' },
]
const providerLabel = (p) => providerOptions.find((o) => o.value === p)?.label || p

const loading = ref(false)
const agents = ref([])
// 该用户已配置的 LLM：list() 返回 [{provider, enabled, models:[...]}]
const llmConfigs = ref([])

const fetchList = async () => {
  loading.value = true
  try {
    const res = await agentApi.list()
    agents.value = res.data || []
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
  agentName: '',
  systemPrompt: '',
  nextStepPrompt: '',
  provider: 'DEEPSEEK',
  modelName: '',
  enabled: true,
})

const rules = {
  agentName: [{ required: true, message: '请输入 Agent 名称', trigger: 'blur' }],
  systemPrompt: [{ required: true, message: '请输入系统提示词', trigger: 'blur' }],
  provider: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  modelName: [{ required: true, message: '请选择或输入模型名', trigger: 'change' }],
}

const openDialog = (row) => {
  if (row) {
    form.id = row.id
    form.agentName = row.agentName
    form.systemPrompt = row.systemPrompt
    form.nextStepPrompt = row.nextStepPrompt || ''
    form.provider = row.provider
    form.modelName = row.modelName
    form.enabled = row.enabled === 1
  } else {
    form.id = null
    form.agentName = ''
    form.systemPrompt = ''
    form.nextStepPrompt = ''
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
      agentName: form.agentName,
      systemPrompt: form.systemPrompt,
      nextStepPrompt: form.nextStepPrompt?.trim() || null,
      provider: form.provider,
      modelName: form.modelName,
      enabled: form.enabled ? 1 : 0,
    }
    if (form.id) {
      await agentApi.update(payload)
      ElMessage.success('修改成功')
    } else {
      await agentApi.add(payload)
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
    await agentApi.toggle(row.id)
    ElMessage.success(row.enabled === 1 ? '已停用' : '已启用')
    fetchList()
  } catch (e) {
    console.error(e)
  }
}

// ===== 删除 =====
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除 Agent「${row.agentName}」吗？`, '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await agentApi.deleteById(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ===== 绑定技能 =====
const skillDialogVisible = ref(false)
const boundSkillIds = ref([])
const skillOptions = ref([])
const currentAgent = ref(null)
const binding = ref(false)

const openSkillDialog = async (row) => {
  currentAgent.value = row
  skillDialogVisible.value = true
  boundSkillIds.value = []
  try {
    const [allSkills, detail] = await Promise.all([skillApi.list(), agentApi.detail(row.id)])
    skillOptions.value = (allSkills.data || []).filter((s) => s.enabled === 1)
    boundSkillIds.value = (detail.data?.skills || []).map((s) => s.id)
  } catch (e) {
    console.error(e)
  }
}

const handleBindSkills = async () => {
  binding.value = true
  try {
    await agentApi.bindSkills(currentAgent.value.id, boundSkillIds.value)
    ElMessage.success('绑定成功')
    skillDialogVisible.value = false
  } catch (e) {
    console.error(e)
  } finally {
    binding.value = false
  }
}

// ===== 绑定 MCP =====
const mcpDialogVisible = ref(false)
const boundMcpIds = ref([])
const mcpOptions = ref([])

const openMcpDialog = async (row) => {
  currentAgent.value = row
  mcpDialogVisible.value = true
  boundMcpIds.value = []
  try {
    const [allMcps, detail] = await Promise.all([mcpApi.list(), agentApi.detail(row.id)])
    mcpOptions.value = (allMcps.data || []).filter((m) => m.enabled === 1)
    boundMcpIds.value = (detail.data?.mcps || []).map((m) => m.id)
  } catch (e) {
    console.error(e)
  }
}

const handleBindMcps = async () => {
  binding.value = true
  try {
    await agentApi.bindMcps(currentAgent.value.id, boundMcpIds.value)
    ElMessage.success('绑定成功')
    mcpDialogVisible.value = false
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
.agent-manage-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>