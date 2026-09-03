# FireOps AI｜工厂消防设备运维 Agent

> GOAI「无界应用」AI+工业制造参赛作品。全部内容为合成演示数据；系统不上控、不自动启动灭火装置、不自动拨打 119。

FireOps AI 把火警主机 Modbus 事件、点位编码、维保记录、说明书和巡查隐患接入同一个事件与工单中枢。Agent 负责理解任务、补齐上下文、检索证据、诊断和起草；火警核实、工单派发、开工、完工和复查由人确认。

**在线评委演示：** [https://francischi-ark.github.io/fireops-ai-goai-2026/#/home](https://francischi-ark.github.io/fireops-ai-goai-2026/#/home)

公开页面无需后端：从多建筑厂区总览点击任一参赛车间，直接进入对应工艺的二维消防平面；评委模式串联真实火警、误报转维保和巡查整改复查三条路线。本地启动完整服务后会自动切换到数据库工作流。

![FireOps AI 标志](assets/fireops-logo.svg)

## 为什么它不是普通告警大屏

- **从工业协议开始**：解析含 CRC 的 Modbus RTU 事件帧，再映射到控制器、回路、点位和车间档案。
- **AI 有证据边界**：工具白名单、参数校验、证据编号校验、状态机和人工审批共同拦截越权；缺少依据时明确拒答。
- **三条链进入同一中枢**：火警处置、故障/维保、巡查整改都能走到责任人、状态和审计证据闭环。
- **桌面与手机共用一套流程**：桌面端负责态势、核实与调度，手机端支持班组和网格现场操作。

## 已完成能力

1. 火警：`Modbus 帧 → 点位解析 → 人工核实 → 派单 → 签收/出动/到场 → 对讲态势与设施确认 → 归档 → 战评草稿`。
2. 故障与维保：`故障/逾期 → 手册与记录检索 → 草稿 → 人工派发 → 开工 → 测试证据 → 设施部门验收关闭`，并显示 24 小时规则、超时升级和缺失字段。
3. 防火巡查：`图片/口述 → 隐患草稿 → 人工派发 → 网格整改 → 巡查复查 → 关闭`。
4. Copilot：五个离线场景、中枢事件绑定、工具轨迹、证据引用和五段式运行记录；原始 JSON 作为二级下载。
5. 企业档案：聚合点位、事件、维保、隐患、工单和应急资料包。
6. 3D 厂区：13 栋匿名建筑，其中 5 个参赛车间可独立点击；包含消防车道、室外消火栓和静态车辆，WebGL 失败时保留二维入口。
7. 维修历史：完成工单继续保留在维保班组收件箱中，结果可回看、可追溯。
8. 价值证据：分开标注历史观测、离线回放、人员估计和合成测试；未形成配对计时前不宣称已提效。

完整页面与操作说明见 [功能与演示说明](docs/product-walkthrough.md)。

## 快速开始

```bash
./start-demo.command
# 浏览器打开 http://127.0.0.1:4173/#/monitoring
```

脚本可从任意当前目录调用，会启动 PostgreSQL，等待数据库、API 和前端健康后再打开页面。重置演示数据：

```bash
FIREGUARD_DATABASE_URL=postgresql://fireguard:fireguard-demo@127.0.0.1:54330/fireguard \
  PYTHONPATH=backend backend/.venv/bin/python backend/tests/reset_demo_database.py
```

`FIREGUARD_DATABASE_URL` 是历史兼容环境变量名，不是对外产品名称。

## Scenario 与 Live

Scenario 模式无需外网，可重复运行：误报研判、确认火警、主机故障、数据不足拒答和气体灭火延时咨询。

Live 模式设置 `COPILOT_MODEL_API_KEY` 后使用 OpenAI 兼容接口。未配置、请求失败或模型输出不合格时，系统立即显示原因并回退到确定性计划；AI 仍不能直接修改业务状态。

## 验证

```bash
node scripts/engine.test.cjs
bash scripts/runtime_contract.test.sh
bash scripts/e2e_contract.test.sh

cd backend
FIREGUARD_TEST_DATABASE_URL=postgresql://fireguard:fireguard-demo@127.0.0.1:54330/fireguard_test \
  PYTHONPATH=. .venv/bin/python -m unittest discover -s tests
```

浏览器合同覆盖 6 个工作台、五场景 Copilot、15 步评委导览、三条完整跨页闭环、390×844 手机端、3D 渲染和五套工艺化二维平面。

## 文档与报名材料

- [功能与演示说明](docs/product-walkthrough.md)
- [开发交接](docs/HANDOFF.md)
- [技术架构](docs/submission/architecture.md)
- [数据与安全合规](docs/submission/data-compliance.md)
- [评测报告](docs/submission/eval-report.md)
- [运行指南](docs/submission/run-guide.md)
- [500 字以内项目简介](docs/submission/project-intro-500.md)
- [GOAI 提交检查表](docs/submission/goai-checklist.md)
- [77.17 秒演示脚本](docs/demo-script.md)
- [12 页复赛 PPTX v7](docs/submission/FireOps-AI-GOAI-semifinal-v7.pptx)
- [12 页复赛 PDF v7](docs/submission/FireOps-AI-GOAI-semifinal-v7.pdf)
- [77.17 秒最终 Demo v7](docs/submission/FireOps-AI-GOAI-demo-v7.mp4)
- [图表化消防安全周报 v7](docs/submission/FireOps-AI-fire-weekly-report-v7.docx)
- [复赛与评委要求最终对齐](docs/submission/FireOps-AI-semifinal-alignment-v7.md)
- [v7 干净提交包（13 个白名单文件）](docs/submission/FireOps-AI-GOAI-semifinal-v7-submission.zip)
- [v7 文件 SHA-256 校验清单](docs/submission/SHA256SUMS-v7.txt)
- [公网发布数据审查](docs/submission/publication-data-review.md)
- [视频设计、脚本、分镜与统一时间轴](docs/submission/video/)

## 许可证

代码、文档和合成数据以 [MIT](LICENSE) 发布。第三方前端库与后端依赖沿用各自许可证。
