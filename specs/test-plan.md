# AI 旅行社 - 测试计划

> 基于设计文档 v3.2 | 覆盖已完成功能: feature-001 ~ feature-003
> 日期: 2026-07-08

---

## 概述

本测试计划覆盖以下已完成功能的验收测试：

| 编号 | 功能 | 优先级 | 对应 ACC 条目 |
|------|------|--------|--------------|
| FEAT-001 | 用户注册/登录/Token 管理 | P0 | ACC-001 ~ ACC-010 |
| FEAT-002 | 旅行表单填写与校验 | P0 | ACC-011 ~ ACC-016 |
| FEAT-003 | ReAct Agent 生成初版计划 | P0 | ACC-017 ~ ACC-023 |
| FEAT-004 | 计划展示（行程/地图/预算/图片） | P0 | ACC-024 ~ ACC-029 |
| FEAT-005 | 聊天微调计划 | P0 | ACC-030 ~ ACC-037 |
| FEAT-006 | 历史计划列表与查看 | P1 | ACC-038 ~ ACC-044 |
| FEAT-007 | 实时进度推送（SSE） | P1 | ACC-045 ~ ACC-054 |

---

## Suite 1: 认证模块 (FEAT-001)

### 1.1 用户注册

| 测试 | Given | When | Then |
|------|-------|------|------|
| TC-AUTH-001 | 用户访问 `/auth` 注册页 | 输入合法用户名、邮箱、密码并提交 | 返回 201，用户创建成功，显示登录页 |
| TC-AUTH-002 | 用户注册 | 用户名已存在 | 返回 409，错误码 `USERNAME_TAKEN` |
| TC-AUTH-003 | 用户注册 | 密码强度不足（如 "123456"） | 前端实时提示 "密码需包含大小写字母+数字+特殊字符"，拒绝提交 |
| TC-AUTH-004 | 用户注册 | 邮箱格式不合法（如 "not-an-email"） | 返回 400，错误码 `EMAIL_INVALID` |
| TC-AUTH-005 | 用户注册 | 邮箱已存在 | 返回 409，错误码 `EMAIL_TAKEN` |
| TC-AUTH-006 | 用户注册 | 用户名长度小于 3（如 "ab"） | 返回 400，错误码 `USERNAME_INVALID_LENGTH` |
| TC-AUTH-007 | 用户注册 | 用户名包含特殊字符（如 "zhang@san"） | 返回 400，错误码 `USERNAME_INVALID_LENGTH` |

### 1.2 用户登录

| 测试 | Given | When | Then |
|------|-------|------|------|
| TC-AUTH-008 | 用户访问 `/auth` 登录页 | 输入正确邮箱和密码 | 返回 200，获得 accessToken 和 refreshToken，存入 localStorage |
| TC-AUTH-009 | 用户登录 | 输入错误密码 | 返回 401，错误码 `INVALID_CREDENTIALS` |
| TC-AUTH-010 | 用户登录 | 输入不存在的邮箱 | 返回 401，错误码 `INVALID_CREDENTIALS` |
| TC-AUTH-011 | 用户连续登录失败 3 次 | 第 4 次尝试登录 | 返回 423，错误码 `ACCOUNT_LOCKED`，5 分钟内不可登录 |

### 1.3 Token 管理

| 测试 | Given | When | Then |
|------|-------|------|------|
| TC-AUTH-012 | 用户持有有效 accessToken | accessToken 过期后发起请求 | 后端返回 401，前端自动调用 POST /auth/refresh 刷新 |
| TC-AUTH-013 | 用户持有有效 refreshToken | 调用 POST /auth/refresh | 获得新 accessToken 和新 refreshToken，旧 refreshToken 立即失效 |
| TC-AUTH-014 | 用户已登录 | 调用 POST /auth/logout | refreshToken 被标记为 REVOKED，前端清除本地 Token |
| TC-AUTH-015 | 用户已登出 | 使用已撤销的 refreshToken 调用 /auth/refresh | 返回 410，错误码 `TOKEN_REVOKED`，跳转登录页 |
| TC-AUTH-016 | 用户并发持有 3 个有效 refreshToken | 第 4 个 refreshToken 调用 /auth/refresh | 返回 429，超出并发限制 |
| TC-AUTH-017 | 用户修改密码 | — | Redis 中清除该用户所有 Refresh Token 键 |

---

## Suite 2: 旅行表单 (FEAT-002)

| 测试 | Given | When | Then |
|------|-------|------|------|
| TC-FORM-001 | 用户访问表单页 | 出发日期设置为昨天（过去日期） | 提交时返回 400，错误码 `START_DATE_INVALID` |
| TC-FORM-002 | 用户填写表单 | 返程日期早于出发日期 | 提交时返回 400，错误码 `END_DATE_INVALID` |
| TC-FORM-003 | 用户填写表单 | 日期跨度超过 180 天 | 提交时返回 400，错误码 `DATE_RANGE_EXCEEDED` |
| TC-FORM-004 | 用户填写表单 | 目的地输入 "魔都"（别名） | 提交后目的地标准化为 "上海市" |
| TC-FORM-005 | 用户填写表单 | 目的地输入不存在的城市名 "xyzabc123" | 提交时返回 400，错误码 `CITY_NOT_FOUND` |
| TC-FORM-006 | 用户填写表单 | 偏好文本超过 500 字符 | 提交时返回 400，错误码 `PREFERENCES_TOO_LONG` |
| TC-FORM-007 | 用户填写表单 | 标题为空字符串 | 提交时返回 400，错误码 `TITLE_INVALID_LENGTH` |
| TC-FORM-008 | 用户填写表单 | 出行方式选择 FLIGHT | 表单正常接受，无校验错误 |
| TC-FORM-009 | 用户填写表单 | 预算等级选择 HIGH | 表单正常接受，无校验错误 |
| TC-FORM-010 | 用户填写表单 | 出发地输入 "上海市"，目的地输入 "北京市" | 地名标准化通过，提交成功 |

---

## Suite 3: Agent 计划生成 (FEAT-003)

| 测试 | Given | When | Then |
|------|-------|------|------|
| TC-AGENT-001 | 用户提交表单 | Agent 开始生成计划 | SSE 连接在 3s 内建立，收到 `plan_starting` 事件 |
| TC-AGENT-002 | Agent 正在生成 | 30 秒后仍未完成 | 返回 504，错误码 `AGENT_TIMEOUT`，前端显示 "计划生成超时" |
| TC-AGENT-003 | Agent 正在生成 | Tavily API 超时 | 使用缓存攻略数据继续生成，planData 中 `notes` 标记 "攻略数据可能过时" |
| TC-AGENT-004 | Agent 正在生成 | 高德 API Key 无效 | POI 查询返回空数组，地图模块显示占位图 |
| TC-AGENT-005 | Agent 正在生成 | Unsplash API 失败 | 景点图片显示灰色占位图标 |
| TC-AGENT-006 | Agent 完成生成 | 所有工具调用成功 | 返回 201，planData 包含完整的 itinerary、transport、accommodation、budgetSummary、poiList、routes、imageGallery |
| TC-AGENT-007 | Agent 生成 | 推理步数达到 15 步仍未完成 | 返回已完成的中间结果 + 错误码 `MAX_STEPS_EXCEEDED` |
| TC-AGENT-008 | 用户 1 小时内第 6 次提交表单 | — | 返回 429，错误码 `PLAN_RATE_LIMIT` |
| TC-AGENT-009 | 用户当日第 11 次提交表单 | — | 返回 429，提示 "今日额度已用完，明天再来吧" |
| TC-AGENT-010 | Agent 正在生成 | 全部外部 API 熔断（连续失败 5 次） | 返回空计划骨架，提示 "AI 服务暂时不可用" |

---

## Suite 4: 计划展示 (FEAT-004)

| 测试 | Given | When | Then |
|------|-------|------|------|
| TC-DISPLAY-001 | 用户访问计划详情页 | GET /plans/{id} 返回 200 | 页面展示完整的行程卡片、地图、预算表格、图片画廊 |
| TC-DISPLAY-002 | 用户访问计划详情页 | planData.itinerary 为空数组 | 显示 "暂无行程安排，请尝试微调" |
| TC-DISPLAY-003 | 用户访问计划详情页 | planData.routes 为空 | 地图区域显示占位图 + "路线规划不可用" |
| TC-DISPLAY-004 | 用户访问计划详情页 | planData.budgetSummary 缺失 | 预算表格显示 "暂无预算信息" |
| TC-DISPLAY-005 | 用户访问计划详情页 | GET /plans/{id} 返回 403 | 显示 "无权访问此计划"，3 秒后跳转首页 |
| TC-DISPLAY-006 | 用户访问计划详情页 | GET /plans/{id} 返回 404 | 显示 "计划不存在"，3 秒后跳转历史列表页 |
| TC-DISPLAY-007 | 用户访问计划详情页 | planData.itinerary[0].activities 中 type=POI_VISIT | 行程卡片显示 POI 名称、地址、时间、图片 |
| TC-DISPLAY-008 | 用户访问计划详情页 | planData.budgetSummary.total 与各分项之和一致 | 预算表格显示正确的总计金额 |

---

## Suite 5: 聊天微调 (FEAT-005)

| 测试 | Given | When | Then |
|------|-------|------|------|
| TC-CHAT-001 | 用户在聊天框输入 "第三天改成室内活动" | 计划只有 2 天 | Agent 回复 "您的计划只有 2 天，没有第三天。请问您想修改哪一天的行程？" |
| TC-CHAT-002 | 用户在聊天框输入 "把第二天第一个景点换成博物馆" | 第二天有多个景点 | 替换 sequence=1 的 POI，返回 `updatedSections: ["DAY2_ACTIVITIES"]` |
| TC-CHAT-003 | 用户在聊天框输入 "预算太高了" | 当前 budgetLevel=MEDIUM | 重新生成计划，budgetLevel 变为 HIGH，返回更新后的 budgetSummary |
| TC-CHAT-004 | 用户在聊天框输入 "加一个晚上活动" | 未指定天数 | 添加到最后一天的 activities 末尾 |
| TC-CHAT-005 | 用户在聊天框输入 "" (空消息) | 点击发送 | 前端拦截，不发送请求 |
| TC-CHAT-006 | 用户发送聊天消息 | Agent 10 秒未响应 | 前端显示 "AI 正在思考中..." + 取消按钮 |
| TC-CHAT-007 | 聊天微调成功 | Agent 返回 ChatResponse | 左侧计划展示区仅更新变化的部分，不刷新整个页面 |
| TC-CHAT-008 | 聊天微调失败 | planData 更新后校验失败 | 回滚到更新前的快照，显示 "调整失败，已恢复原计划" |
| TC-CHAT-009 | 用户在聊天框输入 "帮我订酒店" | — | Agent 回复 "目前不支持预订功能，但可以帮您更换推荐的酒店" |
| TC-CHAT-010 | 用户 1 小时内第 21 次发送聊天消息 | — | 返回 429，错误码 `CHAT_RATE_LIMIT` |
| TC-CHAT-011 | 用户当日第 51 次发送聊天消息 | — | 返回 429，提示 "今日额度已用完，明天再来吧" |
| TC-CHAT-012 | 聊天历史已达 100 条 | 用户发送新的聊天消息 | 淘汰最旧的条目（FIFO），chatHistory 保持最多 100 条 |

---

## Suite 6: 历史计划列表 (FEAT-006)

| 测试 | Given | When | Then |
|------|-------|------|------|
| TC-HISTORY-001 | 用户有 5 条历史计划 | 访问 `/plans` | 显示 5 张计划卡片，按 created_at 倒序排列 |
| TC-HISTORY-002 | 用户有 25 条历史计划 | 访问 `/plans?page=1&size=20` | 第一页显示 20 条，totalPages=2 |
| TC-HISTORY-003 | 用户点击删除按钮 | 二次确认后点击 "确认删除" | DELETE /plans/{id} 返回 204，列表中移除该卡片 |
| TC-HISTORY-004 | 用户有 0 条历史计划 | 访问 `/plans` | 显示空状态页面 "暂无旅行计划，去创建一个吧" + 跳转按钮 |
| TC-HISTORY-005 | 用户访问 `/plans?page=999`（超出总页数） | — | 返回 200 + content=[] + totalPages=0，不返回 400 |
| TC-HISTORY-006 | 用户删除自己拥有的计划后访问该计划 | GET /plans/{deletedId} | 返回 404，错误码 `PLAN_NOT_FOUND` |
| TC-HISTORY-007 | 用户访问他人计划 | GET /plans/{otherUserId} | 返回 403，错误码 `FORBIDDEN` |
| TC-HISTORY-008 | 用户 PATCH /plans/{id} 更新标题 | — | 返回 200，标题更新成功，不触发 Agent 重新生成 |

---

## Suite 7: SSE 实时进度推送 (FEAT-007)

| 测试 | Given | When | Then |
|------|-------|------|------|
| TC-SSE-001 | 用户提交表单（POST /plans） | Agent 开始生成 | SSE 连接在 3s 内建立，收到 `plan_starting` 事件 |
| TC-SSE-002 | Agent 正在生成 | 每个工具调用前 | 收到 `tool_call` 事件，包含工具名和参数 |
| TC-SSE-003 | Agent 正在生成 | 每个工具调用后 | 收到 `tool_result` 事件，包含结果摘要 |
| TC-SSE-004 | Agent 正在生成 | 每完成一步 | 收到 `plan_progress` 事件，progress 值递增 |
| TC-SSE-005 | Agent 生成成功 | 所有工具调用完成 | 收到 `plan_complete` 事件，前端跳转到计划展示页 |
| TC-SSE-006 | Agent 生成失败 | Tavily API 超时 | 收到 `plan_failed` 事件，error=TAVILY_TIMEOUT，显示错误提示 |
| TC-SSE-007 | Agent 生成中 | 前端网络断开后恢复 | SSE 连接断开，前端 5s 后自动重连；若 30s 内未恢复，降级为轮询 GET /plans/{id} |
| TC-SSE-008 | Agent 生成中 | SSE 连接空闲 30s 无事件 | 服务端发送心跳 `: ping\n\n`，前端忽略心跳不报错 |
| TC-SSE-009 | Agent 生成中 | 用户刷新页面 | SSE 连接断开，用户重新进入计划详情页后自动建立新 SSE 连接 |
| TC-SSE-010 | Agent 生成中 | 用户同时提交第二个计划 | 后端为每个计划创建独立 SSE emitter，互不干扰 |
| TC-SSE-011 | Agent 生成中 | Access Token 在生成过程中过期 | 收到 `token_expired_during_generation` 事件，SSE 继续推送直到完成 |
| TC-SSE-012 | 60 秒未收到任何 SSE 事件 | — | 前端主动轮询 GET /plans/{id} 检查状态 |

---

## 端到端集成测试

| 测试 | 描述 |
|------|------|
| TC-E2E-001 | **完整旅程**: 注册 → 登录 → 填写表单 → 等待 Agent 生成 → 查看计划详情 → 聊天微调 → 查看历史列表 → 删除计划 |
| TC-E2E-002 | **Token 过期旅程**: 登录 → 等待 Token 过期 → 提交表单 → 验证前端自动刷新 Token 并继续 |
| TC-E2E-003 | **降级旅程**: 模拟 Tavily + 高德 API 同时超时 → 验证使用缓存数据生成计划 |
| TC-E2E-004 | **边界旅程**: 提交 1 天短途计划 → 验证 itinerary 仅包含 1 天，accommodation.checkOut = startDate + 1 |
| TC-E2E-005 | **并发旅程**: 同一用户 2 个浏览器标签页同时提交表单 → 验证两个计划独立生成，互不干扰 |

---

## 非功能测试

| 测试 | 指标 | 目标值 |
|------|------|--------|
| TC-NFR-001 | P95 计划生成延迟 | < 30s |
| TC-NFR-002 | P95 聊天微调延迟 | < 10s |
| TC-NFR-003 | SSE 连接建立延迟 | < 3s |
| TC-NFR-004 | 外部 API 超时 (Tavily/高德/Unsplash) | 5s |
| TC-NFR-005 | 数据库查询 P95 | < 50ms |
| TC-NFR-006 | 并发用户支持 | 100 同时在线 |
