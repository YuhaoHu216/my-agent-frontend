<template>
  <div class="skill-manage-page glass-page">
    <header class="page-toolbar">
      <h2>技能管理</h2>
      <div class="toolbar-actions">
        <el-button type="primary" @click="openDialog()">
          <el-icon><Plus /></el-icon> 新增技能
        </el-button>
      </div>
    </header>

    <el-card shadow="never" class="glass-card table-card">
      <el-table v-loading="loading" :data="skills" border stripe>
        <el-table-column prop="skillName" label="技能名称" min-width="140" />
        <el-table-column prop="skillContent" label="技能内容" min-width="360" show-overflow-tooltip />
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch :model-value="row.enabled === 1" @change="handleToggle(row)" />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无技能，点击右上角新增" />
        </template>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑技能' : '新增技能'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="技能名称" prop="skillName">
          <el-input v-model="form.skillName" placeholder="例如：邮件撰写专家" maxlength="100" />
        </el-form-item>
        <el-form-item label="技能内容" prop="skillContent">
          <el-input
            v-model="form.skillContent"
            type="textarea"
            :rows="8"
            placeholder="填写领域指导语/提示词知识包"
          />
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { skillApi } from '@/api/skill'

const loading = ref(false)
const skills = ref([])

const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 19) : '-')

const fetchList = async () => {
  loading.value = true
  try {
    const res = await skillApi.list()
    skills.value = res.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const form = reactive({ id: null, skillName: '', skillContent: '', enabled: true })

const rules = {
  skillName: [{ required: true, message: '请输入技能名称', trigger: 'blur' }],
  skillContent: [{ required: true, message: '请输入技能内容', trigger: 'blur' }],
}

const openDialog = (row) => {
  if (row) {
    form.id = row.id
    form.skillName = row.skillName
    form.skillContent = row.skillContent
    form.enabled = row.enabled === 1
  } else {
    form.id = null
    form.skillName = ''
    form.skillContent = ''
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
      await skillApi.update(payload)
      ElMessage.success('修改成功')
    } else {
      await skillApi.add(payload)
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
    await skillApi.toggle(row.id)
    ElMessage.success(row.enabled === 1 ? '已停用' : '已启用')
    fetchList()
  } catch (e) {
    console.error(e)
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除技能「${row.skillName}」吗？`, '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await skillApi.deleteById(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

onMounted(fetchList)
</script>

<style scoped>
.skill-manage-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>