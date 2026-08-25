<template>
  <div class="documents-page glass-page">
    <header class="page-toolbar">
      <h2>文档</h2>
      <div class="toolbar-actions">
        <el-input
          v-model="searchQuery"
          placeholder="搜索文档..."
          clearable
          class="doc-search"
          @keyup.enter="handleDocSearch"
        />
        <el-button :loading="searching" @click="handleDocSearch">搜索</el-button>
        <el-upload :auto-upload="false" :show-file-list="false" :on-change="handleFileChange" accept="*">
          <el-button type="primary">
            <el-icon><Upload /></el-icon> 上传文档
          </el-button>
        </el-upload>
      </div>
    </header>

    <el-card class="glass-card doc-card" shadow="never">
      <el-table v-loading="loadingDocs" :data="filteredDocs">
        <el-table-column prop="fileName" label="文件名" min-width="220" show-overflow-tooltip />
        <el-table-column label="大小" width="100">
          <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column prop="chunkCount" label="分块数" width="90" align="center">
          <template #default="{ row }">{{ row.chunkCount ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="上传时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110" align="center">
          <template #default="{ row }">
            <el-button link @click="handleDocDownload(row)">
              <el-icon><Download /></el-icon>
            </el-button>
            <el-popconfirm
              title="确定要删除该文档吗？"
              confirm-button-text="删除"
              cancel-button-text="取消"
              popper-class="glass-popper"
              @confirm="handleDocDelete(row.id)"
            >
              <template #reference>
                <el-button link type="danger">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无文档，点击右上角上传" :image-size="60" />
        </template>
      </el-table>
    </el-card>

    <section class="glass-card vector-info">
      <h3>存入向量数据库的文档信息</h3>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="该功能后端尚未实现，当前为占位区"
        class="vector-tips"
      />
      <div class="vector-placeholder">
        <el-empty
          description="向量化文档信息将在后端支持后展示：文档名称 / 分块数 / 向量模型 / 向量化状态 / 入库时间"
          :image-size="90"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Download, Delete } from '@element-plus/icons-vue'
import { documentApi } from '@/api/document'

const docs = ref([])
const loadingDocs = ref(false)
const searchQuery = ref('')
const searching = ref(false)
const searchResults = ref(null)
const uploading = ref(false)

const filteredDocs = computed(() => {
  return searchResults.value !== null ? searchResults.value : docs.value
})

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatFileSize = (size) => {
  if (size === null || size === undefined) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const loadDocs = async () => {
  loadingDocs.value = true
  try {
    const res = await documentApi.list()
    if (res.code === 200 && res.data) {
      docs.value = res.data
      searchResults.value = null
    }
  } catch (error) {
    console.error('获取文档列表失败:', error)
  } finally {
    loadingDocs.value = false
  }
}

const handleDocSearch = async () => {
  if (!searchQuery.value.trim()) {
    await loadDocs()
    return
  }
  searching.value = true
  try {
    const res = await documentApi.search(searchQuery.value.trim())
    if (res.code === 200 && res.data) {
      searchResults.value = res.data
    }
  } catch (error) {
    console.error('搜索文档失败:', error)
    ElMessage.error('搜索失败')
  } finally {
    searching.value = false
  }
}

const handleFileChange = async (file) => {
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file.raw)
    const res = await documentApi.upload(formData)
    if (res.code === 200) {
      ElMessage.success('上传成功')
      await loadDocs()
    } else {
      ElMessage.error(res.message || '上传失败')
    }
  } catch (error) {
    console.error('上传文档失败:', error)
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
  }
}

const handleDocDelete = async (id) => {
  try {
    const res = await documentApi.deleteById(id)
    if (res.code === 200) {
      docs.value = docs.value.filter((d) => d.id !== id)
      if (searchResults.value !== null) {
        searchResults.value = searchResults.value.filter((d) => d.id !== id)
      }
      ElMessage.success('删除成功')
    }
  } catch (error) {
    console.error('删除文档失败:', error)
    ElMessage.error('删除失败')
  }
}

const handleDocDownload = async (doc) => {
  try {
    await documentApi.downloadById(doc.id, doc.fileName)
  } catch (error) {
    console.error('下载文档失败:', error)
    ElMessage.error('下载失败')
  }
}

onMounted(loadDocs)
</script>

<style scoped>
.doc-search {
  width: 220px;
}

.doc-card {
  margin-bottom: 20px;
}

.vector-info {
  padding: 20px 24px;
}

.vector-info h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.vector-tips {
  margin-bottom: 16px;
}

.vector-placeholder {
  padding: 8px 0 4px;
}
</style>
