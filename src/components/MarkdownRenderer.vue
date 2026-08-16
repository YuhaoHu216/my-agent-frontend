<template>
  <div class="markdown-body" v-html="rendered"></div>
</template>

<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

// html:false 禁用原始 HTML 渲染，避免 XSS；linkify 自动识别链接；breaks 单个换行转 <br>
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

const rendered = computed(() => {
  if (!props.content) return ''
  return md.render(props.content)
})
</script>

<style scoped lang="scss">
.markdown-body {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  word-break: break-word;
}

.markdown-body :deep(p) {
  margin: 0 0 8px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(h1) {
  font-size: 20px;
  font-weight: 600;
  margin: 16px 0 8px;
}

.markdown-body :deep(h2) {
  font-size: 18px;
  font-weight: 600;
  margin: 14px 0 8px;
}

.markdown-body :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 12px 0 6px;
}

.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  font-size: 14px;
  font-weight: 600;
  margin: 10px 0 6px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0 0 8px;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin: 2px 0;
}

.markdown-body :deep(code) {
  background-color: #f0f2f5;
  padding: 2px 5px;
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  color: #d63384;
}

.markdown-body :deep(pre) {
  background-color: #f6f8fa;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0 0 8px;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  color: #333;
  font-size: 13px;
  line-height: 1.5;
}

.markdown-body :deep(blockquote) {
  margin: 0 0 8px;
  padding: 4px 12px;
  border-left: 3px solid #dcdfe6;
  color: #606266;
  background: #fafafa;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: 0 0 8px;
  width: 100%;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #dcdfe6;
  padding: 6px 10px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: #f5f7fa;
  font-weight: 600;
}

.markdown-body :deep(a) {
  color: #409eff;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 4px;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid #e8e8e8;
  margin: 12px 0;
}

.markdown-body :deep(strong) {
  font-weight: 600;
}
</style>
