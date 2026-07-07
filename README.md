# AI Travel Agency - 让 AI 为你规划完美旅程

AI 旅行社是一个基于 ReAct Agent 的智能旅行规划平台。用户通过填写旅行表单（出发地、目的地、日期、偏好、出行方式、预算），AI Agent 自动整合多源数据生成完整旅行计划，并支持自然语言交互式调整。

## 技术栈

- **后端**: Spring Boot 3.2 + LangChain4j (ReAct Agent) + PostgreSQL 16
- **前端**: Vue 3.4 + TypeScript 5.4 + Vite 5
- **认证**: Spring Security 6 + JWT
- **外部 API**: Tavily (攻略搜索)、高德地图 (POI/路线/天气)、Unsplash (配图)

## 快速开始

### 前置条件

- Java 17+
- Node.js 18+
- PostgreSQL 16
- Redis (可选，用于 Refresh Token 管理)

### 后端

```bash
cd backend
./mvnw spring-boot:run
# 运行在 http://localhost:8080
```

### 前端

```bash
cd frontend
npm install
npm run dev
# 运行在 http://localhost:5173
```

## 项目结构

```
测验2/
├── backend/              # Spring Boot 后端
├── frontend/             # Vue 3 前端
└── docs/
    └── superpowers/
        └── specs/        # 设计文档
```

## 设计文档

详见 [AI 旅行社设计文档](docs/superpowers/specs/2026-07-06-ai-travel-agency-design.md)
