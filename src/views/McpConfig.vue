<template>
  <div class="mcp-config-page glass-page">
    <header class="page-toolbar">
      <h2>MCP 服务配置</h2>
      <div class="toolbar-actions">
        <el-button type="primary" @click="openDialog()">
          <el-icon><Plus /></el-icon> 新增服务
        </el-button>
      </div>
    </header>

    <el-card shadow="never" class="glass-card table-card">
      <el-table v-loading="loading" :data="servers" border stripe>
        <el-table-column prop="serverName" label="服务名称" min-width="140" />
        <el-table-column prop="url" label="服务地址" min-width="280" show-overflow-tooltip />
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch :model-value="row.enabled === 1" @change="handleToggle(row)" />
          </template>
        </el-table-column>
        <el-table-column label="连接状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusMeta(row.connectStatus).type" size="small">
              {{ statusMeta(row.connectStatus).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button link type="primary" :loading="testingId === row.id" @click="handleTest(row)">
              测试
            </el-button>
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无 MCP 服务，点击右上角新增" />
        </template>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑 MCP 服务' : '新增 MCP 服务'" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="服务名称" prop="serverName">
          <el-input v-model="form.serverName" placeholder="例如：高德地图" maxlength="100" />
        </el-form-item>
        <el-form-item label="服务地址" prop="url">
          <el-input v-model="form.url" placeholder="https://example.com/mcp" maxlength="500" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <McpServerDetail v-model:visible="detailVisible" :server="detailServer" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { mcpApi } from '@/api/mcp'
import McpServerDetail from './McpServerDetail.vue'

const loading = ref(false)
const servers = ref([])
const testingId = ref(null)
const detailVisible = ref(false)
const detailServer = ref(null)

const openDetail = (row) => {
  detailServer.value = row
  detailVisible.value = true
}

const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const form = reactive({ id: null, serverName: '', url: '', enabled: true })

const rules = {
  serverName: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  url: [
    { required: true, message: '请输入服务地址', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/, message: '服务地址必须以 http:// 或 https:// 开头', trigger: 'blur' },
  ],
}

const statusMap = {
  0: { text: '未检测', type: 'info' },
  1: { text: '正常', type: 'success' },
  2: { text: '失败', type: 'danger' },
}
const statusMeta = (s) => statusMap[s] ?? statusMap[0]

const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 19) : '-')

const fetchList = async () => {
  loading.value = true
  try {
    const res = await mcpApi.list()
    servers.value = res.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const openDialog = (row) => {
  if (row) {
    form.id = row.id
    form.serverName = row.serverName
    form.url = row.url
    form.enabled = row.enabled === 1
  } else {
    form.id = null
    form.serverName = ''
    form.url = ''
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
    const payload = { ...form, enabled: form.enabled ? 1 : 0 }
    if (form.id) {
      await mcpApi.update(payload)
      ElMessage.success('修改成功')
    } else {
      await mcpApi.add(payload)
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

const handleToggle = async (row) => {
  try {
    await mcpApi.toggle(row.id)
    ElMessage.success(row.enabled === 1 ? '已停用' : '已启用')
    fetchList()
  } catch (e) {
    console.error(e)
  }
}

const handleTest = async (row) => {
  testingId.value = row.id
  try {
    const res = await mcpApi.test(row.id)
    ElMessage.success(res.message || '测试成功')
    fetchList()
  } catch (e) {
    console.error(e)
  } finally {
    testingId.value = null
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除服务「${row.serverName}」吗？`, '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await mcpApi.deleteById(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

onMounted(fetchList)
</script>

<style scoped>
.mcp-config-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
