# 认证路由修复文档

## 问题描述

项目启动时默认页面直接显示 ChatRoom 界面，即使没有登录（无 token）也是如此。

**预期行为：** 启动时先判断有无 token — 有 token 才到 ChatRoom，没有 token 则重定向到 Login 页面。

## 根因分析

### 核心问题：路由级静态重定向绕过了导航守卫

`src/router/index.js` 中的路由配置：

```js
{ path: '/', redirect: '/chat-room' }
```

这是一个**静态重定向**，在 Vue Router 的路由匹配阶段就触发 `/` → `/chat-room`。由于 `beforeEach` 守卫的重定向和路由级重定向在时序上存在竞争，静态重定向可能先于守卫完成，导致无 token 用户看到 ChatRoom 页面。

### 次要问题

| 问题 | 位置 | 说明 |
|------|------|------|
| 守卫隐式返回值 | `router/index.js:36` | 裸 `return` 和函数末尾隐式返回 `undefined`，不够显式 |
| Login 忽略 redirect | `Login.vue:82` | 登录后硬编码 `router.push('/chat-room')`，忽略守卫传入的 redirect 参数 |
| ChatRoom 用 push 而非 replace | `ChatRoom.vue:573` | 守卫失效时 `push` 会产生多余历史记录 |

## 修复内容

### 1. `src/router/index.js` — 重构路由和守卫

- **移除** `{ path: '/', redirect: '/chat-room' }` 路由
- 根路径跳转逻辑移到 `beforeEach` 守卫中，**统一由守卫决定跳转目标**
- 所有分支使用显式返回值：`return true`（放行）、`return { path, query }`（重定向）

```js
router.beforeEach((to, from) => {
  const token = localStorage.getItem('token')

  if (WHITE_LIST.includes(to.path)) return true   // 白名单放行
  if (!token) return { path: '/login', query: { redirect: to.fullPath } }  // 未登录→登录页
  if (to.path === '/') return '/chat-room'         // 已登录在根路径→聊天页
  return true                                       // 已登录→放行
})
```

### 2. `src/views/Login.vue` — 消费 redirect 参数

登录成功后读取 `route.query.redirect`，跳转到用户原始目标页面：

```js
const redirect = route.query.redirect
router.push(redirect || '/chat-room')
```

### 3. `src/views/ChatRoom.vue` — 防御性改进

`onMounted` 中的兜底检查从 `router.push` 改为 `router.replace`，避免产生多余历史记录。

## 导航流程（修复后）

### 无 token 用户访问 `/`
```
访问 /  →  beforeEach(/) →  无token →  重定向 /login?redirect=%2F
         →  beforeEach(/login) →  白名单 →  放行 →  显示 Login 页面
```

### 有 token 用户访问 `/`
```
访问 /  →  beforeEach(/) →  有token + 根路径 →  重定向 /chat-room
         →  beforeEach(/chat-room) →  有token →  放行 →  显示 ChatRoom 页面
```

### 无 token 用户访问 `/chat-room`
```
访问 /chat-room →  beforeEach(/chat-room) →  无token
                →  重定向 /login?redirect=%2Fchat-room →  显示 Login 页面
                →  登录成功后 →  router.push('/chat-room') →  回到目标页面
```

## 验证清单

- [ ] 无 token 访问 `http://localhost:5173/` → 重定向到 `/login`，不闪现 ChatRoom
- [ ] 无 token 访问 `/chat-room` → 重定向到 `/login?redirect=%2Fchat-room`
- [ ] 登录成功后自动跳转到 redirect 目标页面
- [ ] 有 token 访问 `/` → 重定向到 `/chat-room`
- [ ] 无 token 访问 `/login`、`/register` → 正常渲染
- [ ] 退出登录后 token 被清除，再次访问 `/` 回到 `/login`
