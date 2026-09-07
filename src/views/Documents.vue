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
        <el-table-column label="向量模型" width="150">
          <template #default="{ row }">{{ row.vectorModel || '-' }}</template>
        </el-table-column>
        <el-table-column label="用途" width="110" align="center">
          <template #default="{ row }">
            <template v-if="typeof row.vectorized === 'boolean'">
              <el-tag :type="row.vectorized ? 'success' : 'warning'" effect="light">
                {{ row.vectorized ? '已向量化' : '中转文件' }}
              </el-tag>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="上传时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button v-if="row.vectorized" link type="primary" @click="openChunks(row)">分块</el-button>
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

    <el-dialog v-model="chunkDialogVisible" :title="chunkDialogTitle" width="880px" top="5vh" class="chunk-dialog">
      <div v-loading="chunkLoading" class="chunk-layout">
        <template v-if="chunkList.length">
          <ul class="chunk-nav">
            <li
              v-for="(chunk, i) in chunkList"
              :key="chunk.chunkId || i"
              :class="{ active: activeChunk === i }"
              @click="activeChunk = i"
            >
              <span class="chunk-nav-index">第 {{ (chunk.chunkIndex ?? i) + 1 }} 片</span>
              <span class="chunk-nav-title">{{ navTitle(chunk) }}</span>
              <span class="chunk-nav-meta">{{ chunk.content ? chunk.content.length : 0 }} 字</span>
            </li>
          </ul>
          <div v-if="activeChunkData" class="chunk-detail">
            <div class="chunk-detail-head">
              <span class="chunk-detail-count">
                第 {{ (activeChunkData.chunkIndex ?? activeChunk) + 1 }} / {{ activeChunkData.totalChunks ?? chunkList.length }} 片
              </span>
              <span v-if="activeChunkData.title" class="chunk-detail-title">{{ activeChunkData.title }}</span>
              <el-button-group class="chunk-detail-pager">
                <el-button size="small" :disabled="activeChunk === 0" @click="activeChunk--">上一片</el-button>
                <el-button size="small" :disabled="activeChunk === chunkList.length - 1" @click="activeChunk++">下一片</el-button>
              </el-button-group>
            </div>
            <div class="chunk-detail-content">{{ activeChunkData.content }}</div>
          </div>
        </template>
        <el-empty v-else-if="!chunkLoading" description="该文档暂无分片内容" :image-size="80" />
      </div>
      <template #footer>
        <el-button @click="chunkDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
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
const chunkDialogVisible = ref(false)
const chunkDialogTitle = ref('')
const chunkList = ref([])
const chunkLoading = ref(false)
const activeChunk = ref(0)
const activeChunkData = computed(() => chunkList.value[activeChunk.value] || null)
const navTitle = (chunk) => {
  const raw = (chunk.title && chunk.title.trim())
    ? chunk.title.trim()
    : (chunk.content ? chunk.content.replace(/\s+/g, ' ').trim() : '')
  return raw.length > 18 ? `${raw.slice(0, 18)}…` : (raw || '无标题')
}

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

const openChunks = async (row) => {
  chunkDialogTitle.value = `${row.fileName} 的分片内容`
  chunkList.value = []
  activeChunk.value = 0
  chunkDialogVisible.value = true
  chunkLoading.value = true
  try {
    const res = await documentApi.chunks(row.id)
    if (res.code === 200 && res.data) {
      chunkList.value = res.data
    }
  } catch (error) {
    console.error('获取文档分片失败:', error)
    ElMessage.error('获取分片失败')
  } finally {
    chunkLoading.value = false
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

.chunk-layout {
  display: flex;
  gap: 18px;
  height: 62vh;
}

.chunk-nav {
  flex: 0 0 232px;
  margin: 0;
  padding: 4px;
  list-style: none;
  overflow-y: auto;
  border-right: 1px solid var(--el-border-color-lighter);
}

.chunk-nav li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  margin-bottom: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.chunk-nav li:hover {
  background: var(--el-fill-color-light);
}

.chunk-nav li.active {
  background: var(--el-color-primary-light-9);
  box-shadow: inset 2px 0 0 var(--el-color-primary);
}

.chunk-nav-index {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}

.chunk-nav-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chunk-nav-meta {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.chunk-detail {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chunk-detail-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 4px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.chunk-detail-count {
  flex: 0 0 auto;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.chunk-detail-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.chunk-detail-pager {
  flex: 0 0 auto;
}

.chunk-detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 14px 4px 8px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.8;
  color: var(--text-primary);
  font-size: 14px;
}

</style>
