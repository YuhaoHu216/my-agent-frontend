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
  line-height: 1.65;
  color: #f4f7fb;
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
  color: #fff;
}

.markdown-body :deep(h2) {
  font-size: 18px;
  font-weight: 600;
  margin: 14px 0 8px;
  color: #fff;
}

.markdown-body :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 12px 0 6px;
  color: #fff;
}

.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  font-size: 14px;
  font-weight: 600;
  margin: 10px 0 6px;
  color: #fff;
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
  background-color: rgba(255, 255, 255, 0.12);
  padding: 2px 5px;
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  color: #7dd3fc;
}

.markdown-body :deep(pre) {
  background-color: rgba(0, 0, 0, 0.28);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0 0 8px;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.5;
}

.markdown-body :deep(blockquote) {
  margin: 0 0 8px;
  padding: 4px 12px;
  border-left: 3px solid #2dd4bf;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.05);
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: 0 0 8px;
  width: 100%;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 6px 10px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: rgba(255, 255, 255, 0.08);
  font-weight: 600;
  color: #fff;
}

.markdown-body :deep(a) {
  color: #5eead4;
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
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  margin: 12px 0;
}

.markdown-body :deep(strong) {
  font-weight: 600;
  color: #fff;
}
</style>
