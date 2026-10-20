# cypress-conf-2026

<p align="center">
  <strong>适用于 Cypress 的原子化测试架构 — API、Web 与 AI 智能体</strong><br />
  测试真实、独立部署的多区域市场系统：<a href="https://gsanchezm.github.io/OmniPizza/">OmniPizza</a>
</p>

<p align="center">
  <a href="README.md"><strong>English</strong></a> ·
  <a href="README_ES.md"><strong>Español</strong></a> ·
  <a href="README_DE.md"><strong>Deutsch</strong></a> ·
  <a href="README_ZH.md"><strong>简体中文</strong></a> ·
  <a href="README_HI.md"><strong>हिन्दी</strong></a>
</p>

---

## 🌟 项目概述

**cypress-conf-2026** 展示了一个端到端原子化测试（Atomic Testing）架构，由三大核心支柱驱动：
1. **原子化场景（Atomic Scenarios）：** 通过 API 极速注入（Hydrate）状态，随后在 UI 界面精准验证。
2. **AI 智能体治理（AI Agent Governance）：** 确定性的底层 Hook 机制，严防 AI 篡改测试契约或断言准则。
3. **企业级可观测性（Enterprise Observability）：** 批量聚合上报 **TestRail** 与 **Cypress Cloud CLI**，并结合 GitHub Actions 实现智能体自主 CI 分流与重试。

### 🍕 被测系统 (SUT)：OmniPizza
专为自动化测试打造的生产级完整应用：
- **Web 应用前端：** [omnipizza-frontend.onrender.com](https://omnipizza-frontend.onrender.com)
- **API 接口 (OpenAPI 3.1)：** [omnipizza-backend.onrender.com/api/docs](https://omnipizza-backend.onrender.com/api/docs)
- **5 个区域市场：** 🇺🇸 美国 (邮政编码) · 🇲🇽 墨西哥 (社区 Colonia) · 🇨🇭 瑞士 (邮编) · 🇯🇵 日本 (都道府县) · 🇸🇦 沙特阿拉伯 (区 District，阿语 RTL 从右至左布局)。
- **Setup 专用接口：** 带有 `(atomic test setup)` 标签的 API 接口可在几毫秒内直接完成用户登录与购物车数据灌入。

---

## 📐 原子化测试架构

传统测试往往需要走完冗长脆弱的多屏 UI 路径（登录 ➔ 商品列表 ➔ 加购 ➔ 结算）。本项目采用基于 `AtomicScenario` 的**模板方法模式（Template Method）**：

```text
1. arrangeViaApi()  ➔ 真实 HTTP 请求准备测试数据，同时校验 API 契约。
        ⬇
2. hydrateUi()      ➔ 将状态注入浏览器（Session/localStorage），仅执行当前用例的核心操作。
        ⬇
3. assertUi()       ➔ 对渲染后的 DOM 树执行唯一一次最终校验。
```

### 断言预算规则（Assertion Budget）：最多 2 个断言
- **1 个 API 断言：** 验证业务逻辑与契约（例如 HTTP 201 Created）。
- **1 个 UI 断言：** 验证渲染结果（例如 UI 显示的金额与 API 返回的金额逐字节一致）。
- **前置条件与防护守护（Preconditions & Guards）：** 环境检查（`precondition()`）与 DOM 渲染等待（`.should('be.visible')`）**不计入**预算；若不满足则抛出 `PreconditionError`，明确区分环境故障与产品 Bug。

---

## 🤖 智能体生态与安全防线（Hooks）

代码库设计支持全自动智能体（Claude Code、Codex、Copilot、DeepSeek）协同操作，同时保证测试基准坚不可摧：

| 组件 | 职责 | 实现机制 |
|---|---|---|
| **`AGENTS.md`** | 共享仓库契约 | 规范代码风格、强制 pnpm 以及严禁操作列表。 |
| **`guard-oracle.ts`** | 测试基准守护 Hook | 拦截并禁止智能体修改 `.feature` 文件与 `assert*` 方法（Exit 2）。 |
| **`guard-bash.ts`** | 命令网关 Hook | 阻止未经允许的 `--record`、`cyPrompt` 以及 `git push` 执行。 |
| **`cypress-tap`** | 交互式实时反馈 | `cy-fixer` 角色 借助 `cypress open` 实时检查 DOM 快照。 |
| **`cypress-cloud-cli`** | 云端观测排查 | `cy-triage` 角色 借助 `cy-cloud` 深度查询运行历史与重放时间线。 |
| **Cypress Cloud MCP** | 智能体证据 | 已在 `.mcp.json` 中声明；MCP 客户端认证与 CLI 登录相互独立。 |
| **GitHub MCP** | CI 证据 | 已配置只读 Actions 端点，用于查询日志和构件。 |
| **Graphify** | 本地代码知识图谱 | 离线建立 630+ 符号与调用关系的图数据库，无需消耗 LLM API Token。 |

---

## 🛡️ 三层自愈机制（"Ring Check" 演示）

当页面发生实际变动导致选择器失效时（在演示中通过 `MUTATE_DOM=checkout.address` 动态重命名 `data-testid` 模拟）：

1. **A11y 无障碍属性自愈（`HEAL_LOCATORS=a11y`）：** 毫秒级恢复，零成本，无需调用大模型。依次通过后备层级匹配（`id` ➔ `name` ➔ `aria-label` ➔ `placeholder`），对 RTL 阿拉伯语界面同样完美自愈。
2. **AI 智能体排查与修补（`cy-fixer`）：** 通过 `cypress tap` 查看报错快照，在 5 轮迭代内自动修改 `locators/*.json` 配置文件。
3. **AI 语义化测试（`UI_STRATEGY=cyPrompt`）：** 直接在 Markdown（`checkout.prompt.md`）中书写自然语言步骤，由 Cypress 官方 AI 模型直接对屏幕语义进行解析，完全摆脱选择器维护。

---

## 📊 企业级可观测性

### TestRail 批量聚合上报
- 自定义 `TestRailObserver` 挂载在 Cypress 的 `after:run` 生命周期。
- 整个测试套件仅需 **3 次批量 HTTP 请求** 完成全部用例与运行状态上报（从容应对 180 req/min 的云端限流）。
- TestRail 网络波动绝对不会使原本成功的测试构建变红。

### Cypress Cloud CLI 与自动化 CI
- **终端即时查询：** 运行 `pnpm cloud:runs` 和 `cy-cloud` 即可在本地命令行查看运行记录、失败截图与回放。
- **已验证状态：** 2026 年 10 月 19 日，CLI 已认证并成功列出运行记录；这并不证明当前智能体主机已连接 MCP。
- **自主 CI 分流（`ci-triage.yml`）：** 构建失败时智能体自动介入。若判定为偶发性 Flake 或免费容器冷启动（置信度 ≥ 0.7），将自动触发重跑，无需人工值守。

[演示文稿](docs/index.html) 包含全部 38 张幻灯片的英文演讲者备注。详细讲稿保留在本地，不纳入仓库。

---

## 🚀 快速上手与命令

```bash
# 1. 安装项目依赖
pnpm install

# 2. 唤醒云端后端服务（Render 免费容器冷启动预热）
pnpm warmup

# 3. 类型检查并运行测试
pnpm typecheck
pnpm cy:run --browser chrome --spec cypress/e2e/checkout/checkout.feature

# 4. 现场运行自愈演示（A11y fallbacks）
pnpm exec cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature \
  --expose MUTATE_DOM=checkout.address,HEAL_LOCATORS=a11y --config retries=0

# 5. 查看 Cypress Cloud CLI 运行状态
pnpm cloud:status
pnpm cloud:runs
```

---

## 📄 开源许可证
ISC © [Gilberto Sánchez (Mexitester)](https://linkedin.com/in/gilberto-sanchez-mares)
