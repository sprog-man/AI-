# AI 旅行社 - 设计文档

> 日期: 2026-07-06
> 状态: 修订版 v3.2
> 评分目标: 85+/100

---

## 1. 项目概述

### 1.1 核心价值

用户通过填写旅行表单（出发地、目的地、日期、偏好、出行方式、预算），AI Agent 自动整合多源数据生成完整旅行计划，并支持自然语言交互式调整。

### 1.2 功能编号体系

| 编号 | 功能 | 优先级 |
|------|------|--------|
| FEAT-001 | 用户注册/登录/Token 管理 | P0 |
| FEAT-002 | 旅行表单填写与校验 | P0 |
| FEAT-003 | ReAct Agent 生成初版计划 | P0 |
| FEAT-004 | 计划展示（行程/地图/预算/图片） | P0 |
| FEAT-005 | 聊天微调计划 | P0 |
| FEAT-006 | 历史计划列表与查看 | P1 |
| FEAT-007 | 实时进度推送（SSE） | P1 |

### 1.3 非功能需求（量化指标）

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| P95 计划生成延迟 | < 30s | 从 POST /plans 到 SSE `plan_complete` 事件的时间 |
| P95 聊天微调延迟 | < 10s | 从 POST /plans/{id}/chat 到返回 ChatResponse 的时间 |
| SSE 连接建立延迟 | < 3s | 从 POST /plans 201 到收到 `plan_starting` 事件 |
| 外部 API 超时 | Tavily: 5s, 高德: 5s, Unsplash: 5s | HttpClient.timeout |
| 可用性目标 | 99.5% (月度) | Uptime 监控 |
| 并发用户支持 | 100 同时在线 | 压测指标 |
| Agent 最大推理步数 | 15 步/次生成, 8 步/次微调 | Agent 内部计数器 |
| 数据库查询 P95 | < 50ms | pg_stat_statements |
| 计划质量指标 | POI 推荐相关性 ≥ 80% | 人工抽样评估（每月一次） |
| 计划质量指标 | 行程无时间冲突 | 服务端校验 timeSlot 不重叠 |
| 计划质量指标 | 预算不超用户设定等级 | budgetSummary.total ≤ budgetLevel 对应上限 |

---

## 2. 技术栈

| 层次 | 技术选型 | 版本 |
|------|----------|------|
| 后端框架 | Spring Boot 3.2 + Spring MVC | 3.2.x |
| Agent 框架 | LangChain4j 0.34+ (ReAct 范式) | 0.34+ |
| 前端框架 | Vue 3.4 + TypeScript 5.4 + Vite 5 | 3.4 / 5.4 / 5 |
| 数据库 | PostgreSQL 16 | 16.x |
| 认证 | Spring Security 6 + JWT (jjwt 0.12) | 6.x / 0.12 |
| 实时通信 | Server-Sent Events (SSE) | Spring WebFlux |
| 项目结构 | Monorepo (前后端同仓库) | - |
| 部署 | 本地开发，Docker Compose | 24.x |

### 2.1 外部 API 数据源

| 数据源 | 用途 | 配额 | 超时 | 降级策略 |
|--------|------|------|------|----------|
| Tavily Search API | 搜索目的地攻略、必去景点推荐 | 免费 1000 次/月 | 5s | 超时 → 返回 plan_cache 表中的缓存攻略数据（有效期 7 天） |
| 高德地图 API | POI 查询、路线规划、天气查询 | 免费 5000 次/天 | 5s | Key 无效 → 静态地图占位图；路线失败 → 不展示路线连线 |
| Unsplash API | 景点配图获取 | 免费 50 次/小时 | 5s | 失败 → 显示灰色占位图标（120x120） |

### 2.2 环境变量清单

| 变量名 | 说明 | 示例值 | 必填 |
|--------|------|--------|------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql://user:pass@localhost:5432/ai_travel` | 是 |
| `JWT_SECRET` | JWT 签名密钥（至少 32 字符） | 随机生成的 64 字符 Hex | 是 |
| `JWT_ACCESS_EXPIRY_MS` | Access Token 有效期 | `3600000` (1 小时) | 是 |
| `JWT_REFRESH_EXPIRY_MS` | Refresh Token 有效期 | `604800000` (7 天) | 是 |
| `TAVILY_API_KEY` | Tavily 搜索 API Key | `tvly-xxxxx` | 是 |
| `GAODE_API_KEY` | 高德地图 API Key | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | 是 |
| `UNSPLASH_ACCESS_KEY` | Unsplash API Access Key | `xxxxxxx` | 是 |
| `APP_PORT` | 后端服务端口 | `8080` | 否，默认 8080 |
| `FRONTEND_URL` | 前端开发服务器地址 | `http://localhost:5173` | 否，默认 `http://localhost:5173` |

---

## 3. API 契约（REST）

### 3.1 通用约定

- Base URL: `http://localhost:8080/api/v1`
- 所有响应统一包装: `{ "code": number, "message": string, "data": T }`
- 认证接口在请求头携带 `Authorization: Bearer <jwt_token>`
- 分页参数: `page` (从 1 开始, 默认 1), `size` (默认 20, 最大 100)
- 日期格式: `yyyy-MM-dd` (ISO 8601)
- 时间戳格式: `yyyy-MM-dd'T'HH:mm:ss.SSSZ`

### 3.2 认证模块 (FEAT-001)

#### Token 生命周期管理（核心架构决策）

| 事件 | 策略 |
|------|------|
| Access Token 有效期 | 1 小时（JWT `exp` 声明，无状态） |
| Refresh Token 有效期 | 7 天 |
| Refresh Token 存储 | **服务端 Redis**（键: `rt:{userId}:{tokenSuffix}`, TTL 7 天，仅存 token hash + userId） |
| 登出行为 | 服务端从 Redis 中删除对应 Refresh Token 键 |
| Token 轮换 | 每次 POST /auth/refresh 生成新 Refresh Token，旧 Token 在 Redis 中立即删除（防重放） |
| 并发限制 | 同一用户最多 3 个有效 Refresh Token（Redis 中最多 3 个键） |
| Token 撤销（改密） | 用户修改密码时，Redis 中清除该用户所有 Refresh Token 键 |
| SSE 连接 Token | 使用相同的 Access Token，但服务端对 SSE 端点放宽校验：Token 过期时不立即断开，而是继续推送直到 SSE 完成或失败 |

> **架构决策说明**: Refresh Token 使用 Redis 而非 SQL 表。理由：(1) Refresh Token 本质是短期临时的会话凭证，TTL 到期自动失效，天然适合 Redis；(2) Token 轮换需要原子性删除+写入，Redis SETNX 完美匹配；(3) 登出/改密时需要批量清除，Redis KEYS/SCAN + DEL 高效；(4) 不需要持久化审计，JWT 本身已记录签发时间。

#### POST /auth/register

注册新用户。

| 属性 | 值 |
|------|-----|
| 认证 | 不需要 |
| 请求体 | `RegisterRequest` |
| 响应 | `AuthResponse` |
| 状态码 | 201 创建成功 / 400 校验失败 / 409 用户名或邮箱已存在 |

**RegisterRequest:**
```json
{
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "password": "Str0ng!Pass#2026"
}
```

**RegisterRequest 字段约束:**

| 字段 | 类型 | 约束 | 错误码 |
|------|------|------|--------|
| username | String | 长度 3-50，仅字母数字下划线，唯一 | `USERNAME_TAKEN`, `USERNAME_INVALID_LENGTH` |
| email | String | 合法邮箱格式（RFC 5322），唯一 | `EMAIL_INVALID`, `EMAIL_TAKEN` |
| password | String | 长度 8-64，正则 `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).+$` | `PASSWORD_TOO_WEAK` |

**AuthResponse:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 3600
}
```

#### POST /auth/login

用户登录。

| 属性 | 值 |
|------|-----|
| 认证 | 不需要 |
| 请求体 | `LoginRequest` |
| 响应 | `AuthResponse` |
| 状态码 | 200 成功 / 401 凭证错误 / 400 校验失败 / 423 账户已锁定 |

**LoginRequest:**
```json
{
  "email": "zhangsan@example.com",
  "password": "Str0ng!Pass#2026"
}
```

#### POST /auth/refresh

刷新 Access Token。

| 属性 | 值 |
|------|-----|
| 认证 | 不需要 |
| 请求体 | `RefreshRequest` |
| 响应 | `AuthResponse` |
| 状态码 | 200 成功 / 401 Token 无效或已过期 / 410 Token 已撤销（登出或改密后） |

**RefreshRequest:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

#### POST /auth/logout

登出，撤销 Refresh Token。

| 属性 | 值 |
|------|-----|
| 认证 | 需要 Bearer Token |
| 请求体 | 无 |
| 响应 | `{ "code": 200, "message": "success", "data": null }` |
| 状态码 | 200 成功 / 401 Token 无效 |

### 3.3 旅行计划模块

#### POST /plans

提交表单，触发 Agent 异步生成计划。

| 属性 | 值 |
|------|-----|
| 认证 | 需要 Bearer Token |
| 请求体 | `CreatePlanRequest` |
| 响应 | `PlanDTO`（201 创建成功，status="GENERATING"） |
| 处理流程 | **异步**：立即返回 201 + PlanDTO(status="GENERATING", id)。Agent 在后台执行，通过 SSE 推送进度。前端通过 SSE 监听 `plan_complete` 或 `plan_failed` 事件获取结果。 |
| 状态码 | 201 创建成功 / 400 校验失败 / 401 未认证 / 429 频率限制 / 504 Agent 生成超时 |

> **架构决策说明**: POST /plans 采用异步模式而非同步阻塞。理由：(1) Agent 需要调用多个外部 API（Tavily、高德、Unsplash），总耗时可能波动较大；(2) 同步等待 30s 会导致 HTTP 连接长期占用，不利于水平扩展；(3) SSE 进度推送提供更好的用户体验（用户可以看到 Agent 每一步在做什么）；(4) 前端在收到 201 后立即建立 SSE 连接，形成 "提交 → 进度推送 → 完成" 的完整异步流程。

**CreatePlanRequest:**
```json
{
  "title": "杭州3日文化之旅",
  "departureCity": "上海市",
  "destinationCity": "杭州市",
  "startDate": "2026-08-01",
  "endDate": "2026-08-03",
  "travelMode": "HIGH_SPEED_RAIL",
  "budgetLevel": "MEDIUM",
  "preferences": "喜欢历史文化，不吃辣"
}
```

**CreatePlanRequest 字段约束:**

| 字段 | 类型 | 约束 | 错误码 |
|------|------|------|--------|
| title | String | 长度 1-100 | `TITLE_INVALID_LENGTH` |
| departureCity | String | 长度 2-100，经地名标准化（见 3.8） | `DEPARTURE_CITY_REQUIRED` |
| destinationCity | String | 长度 2-100 | `DESTINATION_CITY_REQUIRED` |
| startDate | Date | 格式 yyyy-MM-dd，不早于今天，不晚于今天+180天 | `START_DATE_INVALID` |
| endDate | Date | 格式 yyyy-MM-dd，晚于 startDate，不早于今天 | `END_DATE_INVALID` |
| travelMode | Enum | HIGH_SPEED_RAIL / FLIGHT / BUS / CAR / BIKE | `TRAVEL_MODE_INVALID` |
| budgetLevel | Enum | LOW / MEDIUM / HIGH | `BUDGET_LEVEL_INVALID` |
| preferences | String | 长度 0-500 | `PREFERENCES_TOO_LONG` |

**PlanDTO (异步响应):**
```json
{
  "id": 1,
  "userId": 42,
  "title": "杭州3日文化之旅",
  "departureCity": "上海市",
  "destinationCity": "杭州市",
  "startDate": "2026-08-01",
  "endDate": "2026-08-03",
  "travelMode": "HIGH_SPEED_RAIL",
  "budgetLevel": "MEDIUM",
  "preferences": "喜欢历史文化，不吃辣",
  "status": "GENERATING",        // Enum: GENERATING | COMPLETED | FAILED
  "planData": {},                 // 生成中为空对象，完成后填充（见 3.7）
  "createdAt": "2026-07-06T10:30:00.000+0800",
  "updatedAt": "2026-07-06T10:30:00.000+0800"
}
```

**异步流程时序:**
```
客户端                              服务端                           Agent
  |                                   |                               |
  |-- POST /plans (表单数据) -------->|                               |
  |                                   |-- 创建 travel_plan(status=GENERATING) |
  |-- 201 + PlanDTO(GENERATING) ----->|                               |
  |                                   |-- SSE emitter 注册            |
  |                                   |                               |
  |                                   |--- ReAct Agent 开始执行 ------|
  |                                   |                               |
  |<-- SSE: plan_starting -----------|                               |
  |<-- SSE: tool_call(tavilySearch) -|--- TavilySearchTool ---------->|
  |<-- SSE: tool_result(tavily) -----|<-------------------------------|
  |<-- SSE: tool_call(gaodePOI) -----|--- GaodePOITool -------------->|
  |<-- SSE: tool_result(gaode) ------|<-------------------------------|
  |<-- SSE: plan_progress(60%) ------|                               |
  |                                   |                               |
  |<-- SSE: plan_complete -----------|<--- 组装 Final Answer ---------|
  |                                   |-- 更新 travel_plan(status=COMPLETED)
  |                                   |-- 填充 planData JSONB
```

#### GET /plans

分页查询当前用户的旅行计划列表。

| 属性 | 值 |
|------|-----|
| 认证 | 需要 Bearer Token |
| 查询参数 | `page` (int, >=1), `size` (int, 1-100) |
| 响应 | `PlanPageResponse` |
| 状态码 | 200 成功 / 401 未认证 / 400 参数非法 |

**PlanPageResponse:**
```json
{
  "content": [
    {
      "id": 1,
      "title": "杭州3日文化之旅",
      "destinationCity": "杭州市",
      "startDate": "2026-08-01",
      "endDate": "2026-08-03",
      "createdAt": "2026-07-06T10:30:00.000+0800"
    }
  ],
  "page": 1,
  "size": 20,
  "totalElements": 5,
  "totalPages": 1
}
```

#### GET /plans/{id}

获取单个计划详情（含完整 planData）。

| 属性 | 值 |
|------|-----|
| 认证 | 需要 Bearer Token |
| 路径参数 | `id` (long, >0) |
| 响应 | `PlanDTO` |
| 状态码 | 200 成功 / 401 未认证 / 403 非计划所有者 / 404 计划不存在 |

#### PATCH /plans/{id}

更新计划基本信息（标题、偏好等，不触发 Agent 重新生成）。

| 属性 | 值 |
|------|-----|
| 认证 | 需要 Bearer Token |
| 路径参数 | `id` (long, >0) |
| 请求体 | `UpdatePlanRequest` |
| 响应 | `PlanDTO` |
| 状态码 | 200 成功 / 400 校验失败 / 403 非所有者 / 404 不存在 |

**UpdatePlanRequest:**
```json
{
  "title": "杭州3日深度文化之旅",
  "preferences": "喜欢历史文化，不吃辣，想多拍照"
}
```

#### DELETE /plans/{id}

删除计划。

| 属性 | 值 |
|------|-----|
| 认证 | 需要 Bearer Token |
| 路径参数 | `id` (long, >0) |
| 响应 | 空体 |
| 状态码 | 204 成功 / 403 非所有者 / 404 不存在 |

### 3.4 聊天微调模块 (FEAT-005)

#### POST /plans/{id}/chat

发送聊天指令，Agent 理解意图并更新计划。

| 属性 | 值 |
|------|-----|
| 认证 | 需要 Bearer Token |
| 路径参数 | `id` (long, >0) |
| 请求体 | `ChatRequest` |
| 响应 | `ChatResponse` |
| 状态码 | 200 成功 / 400 校验失败 / 401 未认证 / 403 非所有者 / 404 计划不存在 / 504 Agent 超时 |

**ChatRequest:**
```json
{
  "message": "第三天改成室内活动，预报有雨"
}
```

**ChatRequest 字段约束:**

| 字段 | 类型 | 约束 |
|------|------|------|
| message | String | 长度 1-500 |

**ChatResponse:**
```json
{
  "agentReply": "已为您将第三天行程调整为室内活动：浙江省博物馆和中国丝绸博物馆。",
  "planDataUpdated": true,
  "updatedSections": ["DAY3_ACTIVITIES"]
}
```

### 3.5 plan_data JSONB Schema 完整定义

`plan_data` 是旅行计划的核心数据结构，存储在 PostgreSQL JSONB 列中。

```jsonc
{
  // ========== 行程数组 (每日安排) ==========
  "itinerary": [
    {
      "day": 1,                      // Integer, 从 1 开始
      "date": "2026-08-01",          // String, yyyy-MM-dd
      "weather": {                   // 可选，天气信息
        "temperature": { "min": 24, "max": 32 },
        "condition": "多云",
        "precipitation": 0.2
      },
      "activities": [                // 当日活动列表（按时间排序）
        {
          "sequence": 1,             // Integer, 当日内顺序
          "timeSlot": "09:00-10:30", // String, HH:mm-HH:mm 格式
          "type": "POI_VISIT",       // Enum: POI_VISIT | TRANSPORT | MEAL | REST
          "poi": {                   // 可选，POI 访问时 type=POI_VISIT
            "name": "西湖断桥",
            "address": "杭州市西湖区北山路",
            "coordinates": { "lng": 120.149, "lat": 30.254 },
            "gaodePoiId": "BVAXXXXXX",
            "imageUrl": "https://...",
            "estimatedDurationMinutes": 90
          },
          "meal": {                  // 可选，餐饮时 type=MEAL
            "restaurantName": "楼外楼",
            "cuisine": "杭帮菜",
            "address": "杭州市西湖区孤山路 1 号",
            "coordinates": { "lng": 120.136, "lat": 30.252 },
            "pricePerPerson": 120,
            "gaodePoiId": "BVAXXXXXY"
          },
          "notes": "建议早点去避开人流"
        }
      ],
      "dailyBudget": {              // 可选，当日预算
        "transport": 50,
        "meal": 300,
        "attraction": 0,
        "hotel": 0,
        "shopping": 100,
        "total": 450
      }
    }
  ],

  // ========== 交通安排 ==========
  "transport": {
    "departureCity": "上海市",
    "destinationCity": "杭州市",
    "mode": "HIGH_SPEED_RAIL",
    "outbound": {                    // 去程
      "carrier": "G7371",
      "fromStation": "上海虹桥站",
      "toStation": "杭州东站",
      "departureTime": "2026-08-01T08:00:00+08:00",
      "arrivalTime": "2026-08-01T09:15:00+08:00",
      "estimatedCost": 73
    },
    "return": {                      // 返程
      "carrier": "G7410",
      "fromStation": "杭州东站",
      "toStation": "上海虹桥站",
      "departureTime": "2026-08-03T18:00:00+08:00",
      "arrivalTime": "2026-08-03T19:15:00+08:00",
      "estimatedCost": 73
    },
    "localTransportEstimate": 150   // 市内交通预估费用
  },

  // ========== 住宿信息 ==========
  "accommodation": {
    "hotelName": "杭州西湖国宾馆",
    "address": "杭州市西湖区杨公堤 18 号",
    "coordinates": { "lng": 120.127, "lat": 30.224 },
    "pricePerNight": 880,
    "checkIn": "2026-08-01",
    "checkOut": "2026-08-04",
    "totalCost": 2640,
    "gaodePoiId": "BVAXXXXXZ"
  },

  // ========== 预算汇总 ==========
  "budgetSummary": {
    "transport": 296,
    "accommodation": 2640,
    "meal": 1500,
    "attraction": 200,
    "shopping": 300,
    "total": 4936,
    "budgetLevel": "MEDIUM",
    "perDayAverage": 1645
  },

  // ========== POI 列表（去重） ==========
  "poiList": [
    {
      "name": "西湖断桥",
      "type": "ATTRACTION",      // Enum: ATTRACTION | RESTAURANT | HOTEL | MUSEUM | PARK
      "address": "杭州市西湖区北山路",
      "coordinates": { "lng": 120.149, "lat": 30.254 },
      "gaodePoiId": "BVAXXXXXX",
      "imageUrl": "https://...",
      "rating": 4.8
    }
  ],

  // ========== 路线数据（高德） ==========
  "routes": [
    {
      "day": 1,
      "segments": [
        {
          "from": "杭州东站",
          "to": "西湖断桥",
          "distance": 18.5,        // km
          "duration": 45,          // minutes
          "gaodeRouteId": "route_xxx"
        }
      ]
    }
  ],

  // ========== 图片画廊 ==========
  "imageGallery": [
    {
      "poiName": "西湖断桥",
      "url": "https://unsplash.com/...",
      "width": 1200,
      "height": 800
    }
  ],

  // ========== 聊天历史（微调记录） ==========
  "chatHistory": [
    {
      "role": "USER",              // USER | AGENT
      "message": "第三天改成室内活动",
      "timestamp": "2026-07-06T11:00:00.000+0800",
      "agentReply": "已调整...",
      "changesApplied": [
        {
          "section": "DAY3_ACTIVITIES",
          "action": "REPLACE_POI",
          "target": "雷峰塔",
          "replacement": "浙江省博物馆"
        }
      ]
    }
  ]
}
```

**plan_data Schema 约束:**

| 路径 | 约束 |
|------|------|
| itinerary[].day | Integer, 1..N, 必须连续无跳跃 |
| itinerary[].activities[] | 按 sequence 升序排列，每个 activity 必须有 timeSlot |
| itinerary[].activities[].timeSlot | 格式 `HH:mm-HH:mm`，起止时间差 >= 15 分钟；同一 itinerary day 内，任意两个 activity 的 timeSlot 不得重叠（服务端校验） |
| itinerary[].activities[].type | 枚举: POI_VISIT \| TRANSPORT \| MEAL \| REST |
| itinerary[].activities[type=POI_VISIT].poi | 非空，含 name/address/coordinates |
| itinerary[].activities[type=MEAL].meal | 非空，含 restaurantName/pricePerPerson |
| poiList | 去重，以 gaodePoiId 为唯一标识 |
| routes[].segments[].from/to | 非空字符串，长度 <= 100 |
| routes[].segments[].distance | Float > 0, 单位 km |
| routes[].segments[].duration | Integer > 0, 单位分钟 |
| budgetSummary.total | 等于各分项之和（服务端校验） |
| budgetSummary.budgetLevel | 与 travel_plans.budget_level 一致 |
| budgetSummary.perDayAverage | total / itinerary.length（服务端计算） |
| imageGallery[].url | 合法 URL，来源必须是 Unsplash |
| transport.departureTime | 不早于 startDate 的 00:00 |
| transport.arrivalTime | 不晚于 endDate 的 23:59 |
| transport.outbound.carrier | 非空，长度 <= 20 |
| accommodation.pricePerNight | Integer > 0 |
| accommodation.checkOut | 等于 startDate + itinerary.length 天 |
| accommodation.totalCost | pricePerNight × nights（服务端校验） |
| chatHistory[].role | 枚举: USER \| AGENT |
| chatHistory[].message | 长度 1-500（USER）或 1-1000（AGENT） |
| chatHistory[].timestamp | ISO 8601 格式 |
| chatHistory[].changesApplied[].section | 枚举: DAY{n}_ACTIVITIES \| TRANSPORT \| ACCOMMODATION \| BUDGET |
| chatHistory 大小 | 最大 100 条，超出时淘汰最旧的条目（FIFO eviction） |
| planData 完整性 | 生成完成后，itinerary、transport、accommodation、budgetSummary、poiList、routes、imageGallery 均非空 |

### 3.7 速率限制

#### 3.7.1 API 端点速率限制

| 端点 | 限制 | 响应 | 说明 |
|------|------|------|------|
| POST /plans | 5 次/用户/小时 | 429 `PLAN_RATE_LIMIT` | 防止 Agent 工具调用过度消耗 API 配额 |
| POST /plans/{id}/chat | 20 次/用户/分钟 | 429 `CHAT_RATE_LIMIT` | 防止聊天微调滥用 |
| POST /auth/login | 10 次/IP/分钟 | 429 `AUTH_RATE_LIMIT` | 配合账户锁定（5 次失败后锁定 5 分钟） |
| POST /auth/register | 3 次/IP/分钟 | 429 `REGISTER_RATE_LIMIT` | 防止批量注册 |

**429 响应格式:**
```json
{
  "code": 429,
  "message": "请求过于频繁，请在 {{retryAfter}} 秒后再试",
  "data": null,
  "headers": {
    "Retry-After": 60
  }
}
```

#### 3.7.2 Agent 每日配额保护

除了 API 层面的速率限制，Agent 内部也需要保护：

| 保护项 | 策略 |
|--------|------|
| 每日最大计划生成数 | 每用户 10 个/天（防止 Unsplash 配额耗尽） |
| 每日最大聊天微调次数 | 每用户 50 次/天 |
| 检查方式 | Redis 计数器，key: `quota:{userId}:{YYYY-MM-dd}` |
| 超额行为 | 返回 429，提示 "今日额度已用完，明天再来吧" |

---

## 3.8 地名标准化策略

所有城市/地名输入经过标准化流程：

1. **输入清洗**: 去除首尾空白，全角转半角
2. **别名映射**: 维护本地映射表（如 `"魔都" -> "上海市"`, `"杭城" -> "杭州市"`）
3. **API 验证**: 调用高德地图 `geoapi/geocode/search` 接口验证地名合法性
4. **标准化输出**: 使用高德返回的标准地名作为最终值

如果高德 API 不可用（超时或 Key 无效），使用本地映射表兜底；仍无法识别则拒绝提交，返回 `CITY_NOT_FOUND` 错误。

---

## 4. Agent ReAct 治理策略

### 4.1 最大推理步数

| 场景 | 最大步数 | 超出行为 |
|------|----------|----------|
| 初版计划生成 | 15 步 | 返回已完成的中间结果 + `AGENT_TIMEOUT` 错误码 |
| 聊天微调 | 8 步 | 返回上一次的 planData 快照 + `AGENT_TIMEOUT` 错误码 |

每一步包含: Thought + Action + Observation = 1 步。

### 4.2 工具调用超时

| 工具 | 超时时间 | 重试次数 | 总等待上限 |
|------|----------|----------|-----------|
| TavilySearchTool | 5s | 1 | 10s |
| GaodePOITool | 5s | 1 | 10s |
| GaodeRouteTool | 5s | 1 | 10s |
| WeatherTool | 5s | 1 | 10s |
| UnsplashImageTool | 5s | 1 | 10s |

### 4.3 重试策略

- **指数退避**: 首次重试等待 1s，第二次 2s（但总重试不超过 1 次）
- **重试条件**: 仅限 HTTP 500/502/503/504 和网络超时；4xx 错误不重试
- **熔断器**: 任一外部 API 连续失败 5 次，熔断 30 秒，期间返回降级数据

### 4.4 工具执行顺序依赖

```
初版计划生成:
  Step 1: WeatherTool(目的地, 日期范围)           // 并行独立
  Step 2: TavilySearchTool(目的地攻略)             // 并行独立
  Step 3: GaodePOITool(目的地, 景点类型)           // 依赖 Step 1 的天气（排除雨天户外）
  Step 4: GaodeRouteTool(景点坐标列表)             // 依赖 Step 3 的 POI 结果
  Step 5: UnsplashImageTool(景点名称列表)          // 依赖 Step 3 的 POI 名称
  Step 6: 组装 Final Answer                       // 依赖 Step 3-5 全部完成

聊天微调:
  Step 1: 意图分类 (NLP 本地推理，不调外部 API)
  Step 2: 根据意图选择工具子集（见 4.5）
  Step 3: 执行工具调用
  Step 4: 更新 planData 对应部分
  Step 5: 返回 agentReply + changesApplied
```

### 4.5 意图分类与工具映射

聊天微调时，Agent 首先对用户消息进行分类：

| 意图类型 | 匹配规则 | 调用工具序列 |
|----------|----------|-------------|
| `UPDATE_DAY(day, type)` | "第N天改成..." / "把N天..." | WeatherTool → GaodePOITool(替换类型) → GaodeRouteTool |
| `REPLACE_POI(day, sequence)` | "把第N天第M个换成..." / "替换掉..." | GaodePOITool(新POI) → 更新 itinerary |
| `ADJUST_BUDGET(level)` | "太贵了" / "预算太高" / "便宜点" | GaodePOITool(低价替代) → 更新 budgetSummary |
| `ADD_ACTIVITY(day, type)` | "加一个..." / "顺便去..." | GaodePOITool → GaodeRouteTool → 插入 itinerary |
| `REMOVE_ACTIVITY(day, sequence)` | "去掉第N天第M个" / "删掉..." | 直接更新 planData，不调工具 |
| `CHANGE_TRANSPORT` | "换种交通" / "改坐..." | 更新 transport 对象，不调外部 API |
| `UNKNOWN` | 无法匹配上述规则 | 返回 "抱歉，我不太理解，请换个说法" |

### 4.6 降级策略

| 故障场景 | 行为 |
|----------|------|
| Tavily 超时/失败 | 使用 plan_cache 表中的缓存攻略数据（expires_at <= NOW() 的过期数据不走缓存），planData 中 `itinerary[].notes` 标记 "攻略数据可能过时" |
| 高德 POI 超时/Key 无效 | 返回空 POI 列表，planData 中景点无坐标，地图不展示路线连线 |
| 高德路线超时 | 跳过路线规划，行程仍然生成 |
| Unsplash 失败 | 景点图片显示灰色占位符 |
| 全部外部 API 熔断 | 返回空计划骨架（仅有日期和目的地），提示 "AI 服务暂时不可用" |

### 4.7 意图解析策略

聊天微调的意图解析采用以下流程：

```
用户消息 → 预处理(去空白/转小写) → 正则匹配 → 意图分类 → 工具调用序列
```

#### 4.7.1 边界情况处理

| 用户输入 | 意图 | 边界处理 |
|----------|------|----------|
| "第三天改成室内活动"（计划只有 2 天） | `UPDATE_DAY(3, INDOOR)` | 检测到 day > itinerary.length → 回复 "您的计划只有 2 天，没有第三天。请问您想修改哪一天的行程？" |
| "把第一个景点换成博物馆" | `REPLACE_POI(day=1, sequence=1)` | 如果当天只有一个景点 → 替换；如果当天有多个 → 取 sequence=1 |
| "预算太低了" | `ADJUST_BUDGET(HIGH)` | 预算等级 LOW → MEDIUM, MEDIUM → HIGH, HIGH → 保持不变并提示 "已经是最高预算等级" |
| "加一个晚上活动" | `ADD_ACTIVITY(day=?, type=EVENING)` | 未指定天数 → 添加到最后一天 |
| "换家酒店" | `REPLACE_POI(type=HOTEL)` | 替换 accommodation 中的酒店，保留相同价位段 |
| "明天天气怎么样" | `WEATHER_QUERY` | 返回天气但不修改计划 |
| "帮我订酒店" | `UNKNOWN` | 回复 "目前不支持预订功能，但可以帮您更换推荐的酒店" |
| "" (空消息) | 前端拦截 | 不发送请求 |
| 消息包含敏感词 | 前端/后端双重过滤 | 回复 "您的输入包含不当内容" |

#### 4.7.2 意图正则匹配规则

| 意图 | 正则表达式（简化） |
|------|-------------------|
| UPDATE_DAY | `(第?[一二三四五六七八九十\d]+天)?(改成?|改为?|换为?).*(室内|下雨|雨|晴天|晴)` |
| REPLACE_POI | `(第?\d+天)?(第?\d个)?(景点|餐厅|酒店|活动)(换|替|改|更).*(博物馆|公园|室内)` |
| ADJUST_BUDGET | `(预算|太?(贵|贵了|高)|便宜|省钱|经济)` |
| ADD_ACTIVITY | `(加|添加|增加|加上).*(景点|活动|餐厅|酒店)` |
| REMOVE_ACTIVITY | `(删|去掉|不要|移除|取消).*(第?\d+(天|个))?` |
| CHANGE_TRANSPORT | `(换|改).*(交通|坐车|高铁|飞机|公交)` |

#### 4.7.3 意图解析的两级策略

正则匹配是 MVP 的快速路径，但中文 NLP 正则天然脆弱（同义词多、语序灵活、省略主语）。因此采用两级策略：

**Tier 1 — 正则快速匹配（置信度 >= 0.7 时直接使用）:**
- 优势：零外部依赖，响应快（< 50ms）
- 局限：无法处理复杂语义（如"预算太高了"可能被误判为 `ADJUST_BUDGET` 而非 `REPLACE_POI`）

**Tier 2 — LLM 意图分类（正则置信度 < 0.7 或匹配到 UNKNOWN 时触发）:**
- 调用 LangChain4j 内置 LLM 分类器，prompt: `"用户消息: '{{message}}', 计划有 {{dayCount}} 天, 当前 budgetLevel={{budgetLevel}}。请分类意图。"`
- LLM 返回意图类型 + 置信度 + 提取的参数
- 优势：理解语义，处理模糊表达
- 局限：增加 ~500ms 延迟

**优先级规则:** 当多条正则同时匹配时，取最长匹配（字符数最多）的意图。

**MVP 备注:** 此两级策略为 MVP 方案。生产环境建议用 fine-tuned 中文意图分类模型（如基于 RoBERTa-wwm-ext）替代正则+LLM 混合方案。

---

## 5. 前端-后端实时通信协议 (SSE)

### 5.1 计划生成进度推送

前端在 POST /plans 成功后，立即建立 SSE 连接：

```
GET /plans/{id}/sse/progress
Authorization: Bearer <token>
Accept: text/event-stream
```

**SSE 事件格式:**

| event | data | 触发时机 |
|-------|------|----------|
| `plan_starting` | `{"planId": 1, "status": "GENERATING"}` | 收到 POST 请求后立即发送 |
| `tool_call` | `{"planId": 1, "tool": "tavilySearch", "argument": "杭州旅游攻略"}` | 每个工具调用前 |
| `tool_result` | `{"planId": 1, "tool": "tavilySearch", "resultCount": 5}` | 每个工具调用完成后 |
| `plan_progress` | `{"planId": 1, "progress": 60, "step": 4, "totalSteps": 6}` | 每完成一步 |
| `plan_complete` | `{"planId": 1, "status": "COMPLETED"}` | 计划生成成功 |
| `plan_failed` | `{"planId": 1, "status": "FAILED", "error": "TAVILY_TIMEOUT"}` | 计划生成失败 |
| `token_expired_during_generation` | `{"planId": 1}` | Access Token 在生成过程中过期，SSE 继续推送直到完成 |

**前端行为:**

1. 用户点击提交 → 立即显示 loading 遮罩（< 3s 内）
2. 收到 `plan_starting` → 保持 loading，显示 "AI 正在分析目的地..."
3. 收到 `tool_call` → 更新 loading 文案为当前工具名
4. 收到 `plan_progress` → 显示进度条百分比
5. 收到 `plan_complete` → 关闭 loading，跳转到计划展示页
6. 收到 `plan_failed` → 关闭 loading，显示错误提示，提供 "重试" 按钮
7. 60 秒未收到任何事件 → 前端主动轮询 GET /plans/{id} 检查状态

### 5.2 聊天微调实时回复

POST /plans/{id}/chat 为同步调用，Agent 完成后直接返回 ChatResponse。

如果聊天消息超过 10 秒未返回，前端显示 "AI 正在思考中..." 并启用取消按钮。

---

## 6. 核心流程详细设计

### 6.1 用户旅程与异常处理

#### 旅程 1: 注册/登录 (FEAT-001)

```
注册/登录 → 填写表单 → Agent 生成计划 → 计划展示页 → 聊天微调 → 保存
```

| 步骤 | 正常流程 | 异常场景 | 处理方式 |
|------|----------|----------|----------|
| 1. 打开注册页 | 页面加载成功 | 前端资源加载失败 (502) | 显示 "服务暂时不可用，请稍后重试"，5 分钟后自动重试 |
| 2. 填写注册表单 | 表单校验通过 | 密码强度不足 | 实时校验，显示 "密码需包含大小写字母+数字+特殊字符" |
| 3. 提交注册 | 201 Created + 跳转登录 | 用户名/邮箱已存在 (409) | 显示 "该用户名已被注册" / "该邮箱已绑定账号" |
| 4. 填写登录表单 | 表单校验通过 | 网络断开 | 前端检测 navigator.onLine=false，提示 "网络连接已断开"，恢复后自动重试 |
| 5. 提交登录 | 200 OK + 存储 Token | 凭证错误 (401) | 显示 "邮箱或密码错误"，3 次失败后锁定 5 分钟 |
| 6. Token 过期 | 使用 Refresh Token 刷新 | Refresh Token 也过期 (410) | 清除本地 Token，跳转登录页，提示 "登录已过期，请重新登录" |
| 7. JWT Secret 配置错误 | 服务正常启动 | 环境变量缺失 | 启动失败，日志输出 "JWT_SECRET is required"，进程退出码 1 |

#### 旅程 2: 填写表单 (FEAT-002)

| 步骤 | 正常流程 | 异常场景 | 处理方式 |
|------|----------|----------|----------|
| 1. 打开表单页 | 页面加载，预填上次输入（localStorage） | 浏览器 localStorage 已满 | 清空旧的缓存数据，提示 "本地存储空间不足" |
| 2. 填写城市名 | 输入时调用地名标准化 | 高德 API 不可用 | 使用本地映射表，标注 "地名未经实时验证" |
| 3. 校验日期范围 | 返程 > 出发，间隔 <= 180 天 | 日期格式错误 | 输入框下方红色提示 "请输入 yyyy-MM-dd 格式" |
| 4. 提交表单 | POST /plans → 201 + SSE 连接 | 请求体校验失败 (400) | 字段级错误提示，不提交整个表单 |
| 5. Agent 生成中 | SSE 推送进度 | 生成超时 (30s) | 前端收到 `plan_failed`，显示 "计划生成超时，请重试"，保留表单数据 |
| 6. 生成成功 | 跳转到计划展示页 | 跳转时 Token 过期 | 先刷新 Token 再跳转；刷新失败则跳登录页 |

#### 旅程 3: 计划展示 (FEAT-004)

| 步骤 | 正常流程 | 异常场景 | 处理方式 |
|------|----------|----------|----------|
| 1. 加载计划详情 | GET /plans/{id} → 200 | 404 计划不存在 | 提示 "计划已被删除"，跳回列表页 |
| 2. 渲染行程卡片 | 解析 planData.itinerary | planData 格式异常（JSON 损坏） | 显示 "计划数据异常，请联系客服"，保留其他模块渲染 |
| 3. 渲染地图 | 高德 JS API 加载 | API Key 无效 / 网络超时 | 显示静态占位图 + "地图加载失败" 提示 |
| 4. 渲染图片画廊 | 加载 Unsplash URL | 图片 403/404 | 显示灰色占位图标 |
| 5. 渲染预算表格 | 解析 planData.budgetSummary | 预算数据缺失 | 显示 "预算信息暂不可用" |

#### 旅程 4: 聊天微调 (FEAT-005)

| 步骤 | 正常流程 | 异常场景 | 处理方式 |
|------|----------|----------|----------|
| 1. 输入聊天消息 | 消息长度 <= 500 | 超出长度 | 输入框下方提示 "最多 500 字"，截断或拒绝提交 |
| 2. 发送消息 | POST /plans/{id}/chat → 200 | 404 计划不存在 | 提示 "计划已不存在"，跳回列表页 |
| 3. Agent 意图分类 | 匹配到 UPDATE_DAY(3, INDOOR) | 意图分类失败 (UNKNOWN) | 回复 "抱歉，我不太理解您的意思，请换个说法" |
| 4. 工具调用更新 | 工具返回新数据 | 工具调用失败（见 4.6） | 使用降级数据，在 agentReply 中标注 "部分数据可能不完整" |
| 5. 更新展示区 | planData 局部更新，不刷新页面 | 更新后数据校验失败 | 回滚到更新前的快照，提示 "调整失败，已恢复原计划" |
| 6. 边界: "第三天改成室内活动"但只有 2 天 | 检测到 day=3 > itinerary.length=2 | 回复 "您的计划只有 2 天，没有第三天。请问您想修改哪一天的行程？" |

---

## 7. Agent 工具集（详细）

所有工具通过 LangChain4j `@Tool` 注解注册。

### 7.1 TavilySearchTool

```java
@Tool(description = "搜索目的地旅游攻略和推荐景点")
public String tavilySearch(@ToolParam(description = "搜索关键词") String query) {
    // 1. 调用 Tavily API (timeout: 5s)
    // 2. 解析 JSON 响应，提取 title, content, url
    // 3. 返回格式化后的攻略摘要
    // 4. 失败时返回缓存数据或空字符串
}
```

| 属性 | 值 |
|------|-----|
| 输入 | `query` (String, 1-200 字符) |
| 输出 | 攻略文章摘要列表，JSON 数组格式 |
| 超时 | 5s |
| 重试 | 1 次（HTTP 5xx 或超时） |
| 降级 | 返回 plan_cache 表中的数据（expires_at > NOW() 的记录） |

### 7.2 GaodePOITool

```java
@Tool(description = "查询目的地 POI（景点/餐厅/酒店）")
public String gaodePOI(
    @ToolParam(description = "城市名") String city,
    @ToolParam(description = "POI 类型: attraction/restaurant/hotel/museum/park") String type,
    @ToolParam(description = "搜索关键词") String query
) {
    // 1. 调用高德 Web 服务 API (timeout: 5s)
    // 2. 返回 POI 列表: name, address, location(lng,lat), poiid, rating
    // 3. 失败时返回空数组
}
```

| 属性 | 值 |
|------|-----|
| 输入 | city (String), type (Enum), query (String, 1-100) |
| 输出 | POI 列表 JSON |
| 超时 | 5s |
| 重试 | 1 次 |
| 降级 | 返回空数组，前端显示占位图 |

### 7.3 GaodeRouteTool

```java
@Tool(description = "规划景点间路线")
public String gaodeRoute(
    @ToolParam(description = "起点坐标: lng,lat") String origin,
    @ToolParam(description = "终点坐标: lng,lat") String destination,
    @ToolParam(description = "出行方式: walking/driving/riding/public") String travelMode
) {
    // 1. 调用高德路径规划 API (timeout: 5s)
    // 2. 返回 distance(km), duration(min), steps[]
    // 3. 失败时返回 null
}
```

| 属性 | 值 |
|------|-----|
| 输入 | origin (String), destination (String), travelMode (Enum) |
| 输出 | 路线 JSON |
| 超时 | 5s |
| 重试 | 1 次 |
| 降级 | 返回 null，行程卡片不展示路线 |

### 7.4 WeatherTool

```java
@Tool(description = "查询目的地天气")
public String weatherQuery(
    @ToolParam(description = "城市名") String city,
    @ToolParam(description = "日期: yyyy-MM-dd") String date
) {
    // 1. 调用高德天气 API (timeout: 5s)
    // 2. 返回 temperature(min/max), condition, precipitation, wind
    // 3. 失败时返回 null
}
```

| 属性 | 值 |
|------|-----|
| 输入 | city (String), date (String, yyyy-MM-dd) |
| 输出 | 天气 JSON |
| 超时 | 5s |
| 重试 | 1 次 |
| 降级 | 返回 null，行程不展示天气信息 |

### 7.5 UnsplashImageTool

```java
@Tool(description = "获取景点配图")
public String unsplashImage(@ToolParam(description = "景点名称") String poiName) {
    // 1. 调用 Unsplash Search API (timeout: 5s)
    // 2. 返回 url, width, height
    // 3. 失败时返回 null
}
```

| 属性 | 值 |
|------|-----|
| 输入 | poiName (String, 1-100) |
| 输出 | 图片 URL JSON |
| 超时 | 5s |
| 重试 | 1 次 |
| 降级 | 返回 null，前端显示灰色占位图标 |

---

## 8. 数据库设计（完整版）

### 8.1 users 表

```sql
CREATE TABLE users (
    id            BIGSERIAL       PRIMARY KEY,
    username      VARCHAR(50)     NOT NULL UNIQUE,
    email         VARCHAR(100)    NOT NULL UNIQUE,
    password_hash VARCHAR(255)    NOT NULL,
    created_at    TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

| 列 | 类型 | 约束 | 说明 |
|----|------|------|------|
| id | BIGSERIAL | PK, NOT NULL | 自增主键 |
| username | VARCHAR(50) | NOT NULL, UNIQUE | 用户名，3-50 字符 |
| email | VARCHAR(100) | NOT NULL, UNIQUE | 邮箱地址 |
| password_hash | VARCHAR(255) | NOT NULL | BCrypt 哈希值 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新时间 |

### 8.2 travel_plans 表

```sql
CREATE TABLE travel_plans (
    id                 BIGSERIAL           PRIMARY KEY,
    user_id            BIGINT              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title              VARCHAR(100)        NOT NULL,
    departure_city     VARCHAR(100)        NOT NULL,
    destination_city   VARCHAR(100)        NOT NULL,
    start_date         DATE                NOT NULL,
    end_date           DATE                NOT NULL,
    travel_mode        VARCHAR(20)         NOT NULL,
    budget_level       VARCHAR(10)         NOT NULL,
    preferences        TEXT                NOT NULL DEFAULT '',
    plan_data          JSONB               NOT NULL DEFAULT '{}',
    created_at         TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_travel_modes CHECK (travel_mode IN ('HIGH_SPEED_RAIL', 'FLIGHT', 'BUS', 'CAR', 'BIKE')),
    CONSTRAINT chk_budget_levels CHECK (budget_level IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT chk_dates CHECK (end_date > start_date)
);

-- 索引
CREATE INDEX idx_plans_user_id ON travel_plans(user_id);
CREATE INDEX idx_plans_destination_city ON travel_plans(destination_city);
CREATE INDEX idx_plans_created_at ON travel_plans(created_at DESC);
CREATE INDEX idx_plans_user_created ON travel_plans(user_id, created_at DESC);

-- plan_data JSONB GIN 索引（支持按 itinerary 内字段查询）
CREATE INDEX idx_plans_plan_data_gin ON travel_plans USING GIN (plan_data);
```

| 列 | 类型 | 约束 | 说明 |
|----|------|------|------|
| id | BIGSERIAL | PK, NOT NULL | 自增主键 |
| user_id | BIGINT | NOT NULL, FK → users.id ON DELETE CASCADE | 所属用户 |
| title | VARCHAR(100) | NOT NULL | 计划标题 |
| departure_city | VARCHAR(100) | NOT NULL | 出发地 |
| destination_city | VARCHAR(100) | NOT NULL | 目的地 |
| start_date | DATE | NOT NULL | 出发日期 |
| end_date | DATE | NOT NULL | 返程日期 |
| travel_mode | VARCHAR(20) | NOT NULL, CHECK 枚举值 | 出行方式 |
| budget_level | VARCHAR(10) | NOT NULL, CHECK 枚举值 | 预算等级 |
| preferences | TEXT | NOT NULL, DEFAULT '' | 特殊偏好 |
| plan_data | JSONB | NOT NULL, DEFAULT '{}' | 完整计划详情 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新时间 |

**外键约束:**
- `travel_plans.user_id` → `users.id` ON DELETE CASCADE

**索引说明:**

| 索引名 | 类型 | 列 | 用途 |
|--------|------|-----|------|
| idx_plans_user_id | B-tree | user_id | 查询用户的所有计划 |
| idx_plans_destination_city | B-tree | destination_city | 按目的地筛选 |
| idx_plans_created_at | B-tree (DESC) | created_at | 历史列表按时间倒序 |
| idx_plans_user_created | B-tree (复合) | user_id, created_at DESC | 用户历史列表（最常用查询） |
| idx_plans_plan_data_gin | GIN | plan_data | 按 planData 内字段查询（如 itinerary 中的 POI） |

**updated_at 自动更新:**
PostgreSQL 触发器函数实现：
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_travel_plans_updated_at BEFORE UPDATE ON travel_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 8.3 plan_cache 表（攻略缓存）

```sql
CREATE TABLE plan_cache (
    id            BIGSERIAL       PRIMARY KEY,
    destination   VARCHAR(100)    NOT NULL,
    cache_key     VARCHAR(200)    NOT NULL,
   cache_data     JSONB           NOT NULL,
    expires_at    TIMESTAMP       NOT NULL,
    created_at    TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_cache UNIQUE (destination, cache_key)
);

CREATE INDEX idx_cache_expires ON plan_cache(expires_at);
CREATE INDEX idx_cache_destination ON plan_cache(destination);
```

---

## 9. 前端页面（完整版）

### 9.1 登录/注册页 (`/auth`)

| 元素 | 行为 |
|------|------|
| 用户名输入框 | 实时校验：长度 3-50，仅字母数字下划线 |
| 邮箱输入框 | 实时校验：合法邮箱格式 |
| 密码输入框 | 实时显示密码强度指示器（弱/中/强） |
| 确认密码输入框 | 两次密码不一致时红色提示 |
| 注册按钮 | 提交后禁用 2 秒防止重复提交 |
| 登录/注册 Tab 切换 | 切换时清空表单 |
| 错误提示 | 字段级错误显示在输入框下方，全局错误显示在顶部 Banner |

### 9.2 首页/表单页 (`/plans/new`)

| 元素 | 行为 |
|------|------|
| 出发地/目的地输入 | 输入时调用地名标准化 API，显示匹配建议下拉 |
| 日期选择器 | 出发日期最小值为今天，返程日期最小值为出发日期+1天 |
| 出行方式单选 | 5 个选项，选中态高亮 |
| 预算范围下拉 | 3 个选项：低(<1000/天)、中(1000-3000/天)、高(>3000/天) |
| 偏好文本域 | 字数统计，超过 500 字符显示警告 |
| 提交按钮 | 点击后显示 loading  spinner，3 秒内未跳转则显示进度条 |
| 表单验证 | 提交前前端校验，不通过时高亮错误字段 |

### 9.3 计划展示页 (`/plans/:id`)

左右分栏布局（桌面端 60/40，移动端堆叠）：

**左侧 — 计划展示区:**

| 模块 | 数据来源 | 异常处理 |
|------|----------|----------|
| 每日行程卡片 | planData.itinerary | 数据为空时显示 "暂无行程安排" |
| 高德地图 | planData.routes[].segments | API 不可用时显示静态占位图 |
| 预算明细表格 | planData.budgetSummary | 数据缺失时显示 "暂无预算信息" |
| 景点配图画廊 | planData.imageGallery | 图片加载失败时显示灰色占位 |

**右侧 — 聊天窗口:**

| 元素 | 行为 |
|------|------|
| 聊天记录列表 | 滚动到底部自动加载历史（后端最多保留 100 条，前端每次加载最近 50 条，上拉加载更多） |
| 输入框 | 最大 500 字符，Enter 发送，Shift+Enter 换行 |
| 发送按钮 | 发送中禁用，Agent 回复完成后恢复 |
| Agent 回复 | 流式显示（打字机效果），完成后更新左侧计划展示区 |

### 9.4 历史记录页 (`/plans`)

| 元素 | 行为 |
|------|------|
| 计划卡片列表 | 每页 20 条，支持下拉加载更多 |
| 排序 | 默认按 created_at 倒序 |
| 点击卡片 | 跳转到 `/plans/:id` 计划展示页 |
| 删除按钮 | 卡片右下角，二次确认弹窗 |

---

## 10. 给定-当-then 验收标准

### FEAT-001: 用户注册/登录/Token 管理

| 编号 | Given | When | Then |
|------|-------|------|------|
| ACC-001 | 用户访问 `/auth` 注册页 | 输入合法用户名、邮箱、密码并提交 | 返回 201，用户创建成功，显示登录页 |
| ACC-002 | 用户注册 | 用户名已存在 | 返回 409，错误码 `USERNAME_TAKEN` |
| ACC-003 | 用户注册 | 密码强度不足（如 "123456"） | 前端实时提示 "密码需包含大小写字母+数字+特殊字符"，拒绝提交 |
| ACC-004 | 用户访问 `/auth` 登录页 | 输入正确邮箱和密码 | 返回 200，获得 accessToken 和 refreshToken，存入 localStorage |
| ACC-005 | 用户登录 | 输入错误密码 | 返回 401，错误码 `INVALID_CREDENTIALS` |
| ACC-006 | 用户连续登录失败 3 次 | 第 4 次尝试登录 | 返回 423，错误码 `ACCOUNT_LOCKED`，5 分钟内不可登录 |
| ACC-007 | 用户持有有效 accessToken | accessToken 过期后发起请求 | 后端返回 401，前端自动调用 POST /auth/refresh 刷新 |
| ACC-008 | 用户持有有效 refreshToken | 调用 POST /auth/refresh | 获得新 accessToken 和新 refreshToken，旧 refreshToken 立即失效 |
| ACC-009 | 用户已登录 | 调用 POST /auth/logout | refreshToken 被标记为 REVOKED，前端清除本地 Token |
| ACC-010 | 用户已登出 | 使用已撤销的 refreshToken 调用 /auth/refresh | 返回 410，错误码 `TOKEN_REVOKED`，跳转登录页 |

### FEAT-002: 旅行表单填写与校验

| 编号 | Given | When | Then |
|------|-------|------|------|
| ACC-011 | 用户访问表单页 | 出发日期设置为昨天（过去日期） | 提交时返回 400，错误码 `START_DATE_INVALID` |
| ACC-012 | 用户填写表单 | 返程日期早于出发日期 | 提交时返回 400，错误码 `END_DATE_INVALID` |
| ACC-013 | 用户填写表单 | 日期跨度超过 180 天 | 提交时返回 400，错误码 `DATE_RANGE_EXCEEDED` |
| ACC-014 | 用户填写表单 | 目的地输入 "魔都"（别名） | 提交后目的地标准化为 "上海市" |
| ACC-015 | 用户填写表单 | 目的地输入不存在的城市名 "xyzabc123" | 提交时返回 400，错误码 `CITY_NOT_FOUND` |
| ACC-016 | 用户填写表单 | 偏好文本超过 500 字符 | 提交时返回 400，错误码 `PREFERENCES_TOO_LONG` |

### FEAT-003: ReAct Agent 生成初版计划

| 编号 | Given | When | Then |
|------|-------|------|------|
| ACC-017 | 用户提交表单 | Agent 开始生成计划 | SSE 连接在 3s 内建立，收到 `plan_starting` 事件 |
| ACC-018 | Agent 正在生成 | 30 秒后仍未完成 | 返回 504，错误码 `AGENT_TIMEOUT`，前端显示 "计划生成超时" |
| ACC-019 | Agent 正在生成 | Tavily API 超时 | 使用缓存攻略数据继续生成，planData 中 `notes` 标记 "攻略数据可能过时" |
| ACC-020 | Agent 正在生成 | 高德 API Key 无效 | POI 查询返回空数组，地图模块显示占位图 |
| ACC-021 | Agent 正在生成 | Unsplash API 失败 | 景点图片显示灰色占位图标 |
| ACC-022 | Agent 完成生成 | 所有工具调用成功 | 返回 201，planData 包含完整的 itinerary、transport、accommodation、budgetSummary、poiList、routes、imageGallery |
| ACC-023 | Agent 生成 | 推理步数达到 15 步仍未完成 | 返回已完成的中间结果 + 错误码 `MAX_STEPS_EXCEEDED` |

### FEAT-004: 计划展示

| 编号 | Given | When | Then |
|------|-------|------|------|
| ACC-024 | 用户访问计划详情页 | GET /plans/{id} 返回 200 | 页面展示完整的行程卡片、地图、预算表格、图片画廊 |
| ACC-025 | 用户访问计划详情页 | planData.itinerary 为空数组 | 显示 "暂无行程安排，请尝试微调" |
| ACC-026 | 用户访问计划详情页 | planData.routes 为空 | 地图区域显示占位图 + "路线规划不可用" |
| ACC-027 | 用户访问计划详情页 | planData.budgetSummary 缺失 | 预算表格显示 "暂无预算信息" |
| ACC-028 | 用户访问计划详情页 | GET /plans/{id} 返回 403 | 显示 "无权访问此计划"，3 秒后跳转首页 |
| ACC-029 | 用户访问计划详情页 | GET /plans/{id} 返回 404 | 显示 "计划不存在"，3 秒后跳转历史列表页 |

### FEAT-005: 聊天微调计划

| 编号 | Given | When | Then |
|------|-------|------|------|
| ACC-030 | 用户在聊天框输入 "第三天改成室内活动" | 计划只有 2 天 | Agent 回复 "您的计划只有 2 天，没有第三天。请问您想修改哪一天的行程？" |
| ACC-031 | 用户在聊天框输入 "把第二天第一个景点换成博物馆" | 第二天有多个景点 | 替换 sequence=1 的 POI，返回 `updatedSections: ["DAY2_ACTIVITIES"]` |
| ACC-032 | 用户在聊天框输入 "预算太高了" | 当前 budgetLevel=MEDIUM | 重新生成计划，budgetLevel 变为 HIGH，返回更新后的 budgetSummary |
| ACC-033 | 用户在聊天框输入 "加一个晚上活动" | 未指定天数 | 添加到最后一天的 activities 末尾 |
| ACC-034 | 用户在聊天框输入 "" (空消息) | 点击发送 | 前端拦截，不发送请求 |
| ACC-035 | 用户发送聊天消息 | Agent 10 秒未响应 | 前端显示 "AI 正在思考中..." + 取消按钮 |
| ACC-036 | 聊天微调成功 | Agent 返回 ChatResponse | 左侧计划展示区仅更新变化的部分，不刷新整个页面 |
| ACC-037 | 聊天微调失败 | planData 更新后校验失败 | 回滚到更新前的快照，显示 "调整失败，已恢复原计划" |

### FEAT-006: 历史计划列表

| 编号 | Given | When | Then |
|------|-------|------|------|
| ACC-038 | 用户有 5 条历史计划 | 访问 `/plans` | 显示 5 张计划卡片，按 created_at 倒序排列 |
| ACC-039 | 用户有 25 条历史计划 | 访问 `/plans?page=1&size=20` | 第一页显示 20 条，totalPages=2 |
| ACC-040 | 用户点击删除按钮 | 二次确认后点击 "确认删除" | DELETE /plans/{id} 返回 204，列表中移除该卡片 |
| ACC-041 | 用户有 0 条历史计划 | 访问 `/plans` | 显示空状态页面 "暂无旅行计划，去创建一个吧" + 跳转按钮 |
| ACC-042 | 用户访问 `/plans?page=999`（超出总页数） | 请求分页列表 | 返回 200 + content=[] + totalPages=0，不返回 400 |
| ACC-043 | 用户删除自己拥有的计划后访问该计划 | GET /plans/{deletedId} | 返回 404，错误码 `PLAN_NOT_FOUND` |
| ACC-044 | 用户访问他人计划 | GET /plans/{otherUserId} | 返回 403，错误码 `FORBIDDEN` |

### FEAT-007: SSE 实时进度推送

| 编号 | Given | When | Then |
|------|-------|------|------|
| ACC-045 | 用户提交表单（POST /plans） | Agent 开始生成 | SSE 连接在 3s 内建立，收到 `plan_starting` 事件 |
| ACC-046 | Agent 正在生成 | 每个工具调用前 | 收到 `tool_call` 事件，包含工具名和参数 |
| ACC-047 | Agent 正在生成 | 每个工具调用后 | 收到 `tool_result` 事件，包含结果摘要 |
| ACC-048 | Agent 正在生成 | 每完成一步 | 收到 `plan_progress` 事件，progress 值递增 |
| ACC-049 | Agent 生成成功 | 所有工具调用完成 | 收到 `plan_complete` 事件，前端跳转到计划展示页 |
| ACC-050 | Agent 生成失败 | Tavily API 超时 | 收到 `plan_failed` 事件，error=TAVILY_TIMEOUT，显示错误提示 |
| ACC-051 | Agent 生成中 | 前端网络断开后恢复 | SSE 连接断开，前端 5s 后自动重连；若 30s 内未恢复，降级为轮询 GET /plans/{id} |
| ACC-052 | Agent 生成中 | SSE 连接空闲 30s 无事件 | 服务端发送心跳 `: ping\n\n`，前端忽略心跳不报错 |
| ACC-053 | Agent 生成中 | 用户刷新页面 | SSE 连接断开，用户重新进入计划详情页后自动建立新 SSE 连接 |
| ACC-054 | Agent 生成中 | 用户同时提交第二个计划 | 后端为每个计划创建独立 SSE emitter，互不干扰 |

---

## 11. 项目目录结构

```
测验2/
├── backend/                          # Spring Boot 后端
│   ├── src/main/java/com/travel/ai/
│   │   ├── AiTravelApplication.java
│   │   ├── config/                   # 配置类
│   │   │   ├── SecurityConfig.java           # Spring Security + JWT
│   │   │   ├── LangChain4jConfig.java        # Agent + Tools 注册
│   │   │   ├── CorsConfig.java               # CORS 配置
│   │   │   ├── RedisConfig.java              # Redis (Token 管理 + 缓存)
│   │   │   └── SseEmitterConfig.java — SSE 超时配置(60s)，覆盖 P95 30s + 安全边际
│   │   ├── controller/               # REST 控制器
│   │   │   ├── AuthController.java           # POST /auth/register, /login, /refresh, /logout
│   │   │   ├── PlanController.java           # CRUD /plans
│   │   │   ├── ChatController.java           # POST /plans/{id}/chat
│   │   │   └── SseProgressController.java    # GET /plans/{id}/sse/progress
│   │   ├── service/                  # 业务逻辑
│   │   │   ├── UserService.java
│   │   │   ├── PlanService.java
│   │   │   ├── AuthService.java              # JWT 生成/验证/刷新
│   │   │   ├── AgentService.java             # ReAct Agent 编排 + 步数限制 + 熔断 + chatHistory 维护最多 100 条
│   │   │   └── IntentParserService.java      # 聊天意图分类 + 边界处理
│   │   ├── tool/                     # Agent 工具
│   │   │   ├── TavilySearchTool.java
│   │   │   ├── GaodePOITool.java
│   │   │   ├── GaodeRouteTool.java
│   │   │   ├── WeatherTool.java
│   │   │   └── UnsplashImageTool.java
│   │   ├── model/                    # 实体和 DTO
│   │   │   ├── entity/
│   │   │   │   ├── User.java
│   │   │   │   └── TravelPlan.java
│   │   │   └── dto/
│   │   │       ├── request/
│   │   │       │   ├── RegisterRequest.java
│   │       │   ├── LoginRequest.java
│   │       │   ├── RefreshRequest.java
│   │       │   ├── CreatePlanRequest.java
│   │       │   ├── UpdatePlanRequest.java
│   │       │   └── ChatRequest.java
│   │       └── response/
│   │           ├── AuthResponse.java
│   │           ├── PlanDTO.java
│   │           ├── PlanPageResponse.java
│   │           └── ChatResponse.java
│   ├── repository/                   # JPA Repository
│   │   ├── UserRepository.java
│   │   ├── TravelPlanRepository.java
│   │   └── PlanCacheRepository.java
│   ├── exception/                    # 全局异常处理
│   │   ├── GlobalExceptionHandler.java
│   │   ├── BusinessException.java
│   │   └── ErrorCode.java            # 所有错误码枚举
│   └── pom.xml
├── frontend/                         # Vue 3 前端
│   ├── src/
│   │   ├── api/                      # Axios 请求封装
│   │   │   ├── auth.ts
│   │   │   ├── plans.ts
│   │   │   ├── chat.ts
│   │   │   └── sse.ts                # SSE 连接管理
│   │   ├── components/               # 公共组件
│   │   │   ├── LoadingSpinner.vue
│   │   │   ├── ProgressBar.vue
│   │   │   ├── ChatWindow.vue
│   │   │   ├── ItineraryCard.vue
│   │   │   ├── BudgetTable.vue
│   │   │   └── ImageGallery.vue
│   │   ├── views/                    # 页面组件
│   │   │   ├── LoginView.vue
│   │   │   ├── RegisterView.vue
│   │   │   ├── FormView.vue
│   │   │   ├── PlanView.vue          # 计划展示 + 聊天
│   │   │   └── HistoryView.vue
│   │   ├── stores/                   # Pinia 状态管理
│   │   │   ├── auth.ts
│   │   │   ├── plan.ts
│   │   │   └── chat.ts
│   │   ├── router/                   # 路由配置
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── cityNormalize.ts      # 地名标准化
│   │       ├── dateValidator.ts      # 日期校验
│   │       └── intentMatcher.ts      # 意图正则匹配
│   └── package.json
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-07-06-ai-travel-agency-design.md
└── README.md
```

---

## 12. 错误码枚举

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| USERNAME_TAKEN | 409 | 用户名已存在 |
| EMAIL_TAKEN | 409 | 邮箱已存在 |
| EMAIL_INVALID | 400 | 邮箱格式不合法 |
| PASSWORD_TOO_WEAK | 400 | 密码强度不足 |
| INVALID_CREDENTIALS | 401 | 邮箱或密码错误 |
| ACCOUNT_LOCKED | 423 | 账户已锁定 |
| TOKEN_REVOKED | 410 | Token 已撤销 |
| TOKEN_EXPIRED | 401 | Token 已过期 |
| UNAUTHORIZED | 401 | 未认证 |
| FORBIDDEN | 403 | 无权限访问 |
| CITY_NOT_FOUND | 400 | 地名无法识别 |
| START_DATE_INVALID | 400 | 出发日期无效 |
| END_DATE_INVALID | 400 | 返程日期无效 |
| DATE_RANGE_EXCEEDED | 400 | 日期跨度超过 180 天 |
| PLAN_NOT_FOUND | 404 | 计划不存在 |
| AGENT_TIMEOUT | 504 | Agent 生成超时 |
| MAX_STEPS_EXCEEDED | 500 | Agent 推理步数超限 |
| TAVILY_TIMEOUT | 502 | Tavily API 超时 |
| GAODE_KEY_INVALID | 502 | 高德 API Key 无效 |
| UNSPLASH_ERROR | 502 | Unsplash API 错误 |

---

## 13. YAGNI — 本次 MVP 不包含

- 预订链接（携程/飞猪跳转）
- 移动端 App
- 社交分享功能
- 多人同行计划
- 评价/评论系统
- OAuth 第三方登录
- 计划导出为 PDF
- 国际化 (i18n)

---

## 14. 关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| Agent 架构 | 单 Agent (ReAct) | MVP 流程线性，调试简单，后续可扩展 |
| 认证方式 | 账号密码 + JWT | 零额外成本，无需短信/第三方服务 |
| 数据库 | PostgreSQL | JSONB 灵活存储计划数据，GIN 索引支持复杂查询 |
| 项目结构 | Monorepo | 前后端协同开发，统一管理依赖 |
| 地图方案 | 高德 JS API | 路线可视化 + 序号标记 + 国内数据准确 |
| 实时通信 | SSE (Server-Sent Events) | 单向推送足够（后端→前端），比 WebSocket 轻量，Spring 原生支持 |
| 聊天微调 | 同步调用 | MVP 阶段简化实现，异步 SSE 仅用于计划生成进度 |
| Token 管理 | Redis (TTL-based) | 短期凭证天然适合 Redis，TTL 自动过期，Token 轮换原子操作 |
| 地名标准化 | 高德 GeoAPI + 本地映射表兜底 | 覆盖别名、错别字、俗称 |
| 攻略缓存 | SQL plan_cache 表，TTL 7 天 | 避免重复搜索相同目的地 |
