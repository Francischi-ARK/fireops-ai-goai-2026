"use strict";

const DATA_CUTOFF = "2026-07-29 12:00";
const DEMO_RULESET = (window.FireGuardEngine && window.FireGuardEngine.RULESET) || "FG-DEMO-v0";

// 「星澜新能源汽车工厂（虚拟）」内部厂区单元；companies 命名沿用旧引擎接口。
const companies = [
  { id: "ent-001", name: "电池车间（PACK/化成）", industry: "锂电 PACK 与化成工艺", score: 58, level: "high", levelLabel: "高风险", openHazards: 12, building: "电池车间厂房", area: "12,800 ㎡", ert: "9/12", primaryRisk: "消控室值班记录问题重复出现" },
  { id: "ent-005", name: "涂装车间（PT）", industry: "喷涂与调漆工艺", score: 69, level: "high", levelLabel: "高风险", openHazards: 8, building: "涂装车间厂房", area: "9,600 ㎡", ert: "7/10", primaryRisk: "整改逾期与重复隐患" },
  { id: "ent-002", name: "总装车间", industry: "整车总装", score: 76, level: "medium", levelLabel: "中风险", openHazards: 6, building: "总装车间厂房", area: "8,200 ㎡", ert: "8/10", primaryRisk: "季度维保计划逾期" },
  { id: "ent-003", name: "立体仓库", industry: "高架仓储", score: 91, level: "low", levelLabel: "低风险", openHazards: 2, building: "立体库", area: "6,400 ㎡", ert: "5/6", primaryRisk: "暂无规则触发" },
  { id: "ent-004", name: "冲压车间", industry: "冲压成型", score: 74, level: "medium", levelLabel: "中风险", openHazards: 3, building: "冲压车间厂房", area: "11,300 ㎡", ert: "6/8", primaryRisk: "消防电源监测模块待排障" },
];

// 各单元对应火警主机首个烟感点位的合成 Modbus 事件帧（海湾规约，含 CRC16），
// 供「模拟报警帧」按钮走真实网关解析链路。
const demoAlarmFrames = {
  "ent-001": "01030801010300201001007d4f",
  "ent-005": "01030801010300101001007d40",
  "ent-002": "0103080101030030100100bd4b",
  "ent-003": "0103080101090040100100d751",
  "ent-004": "0103080101030050100100bd55",
};
// 机2主机备电故障（海湾事件池，data_source=自身设备）
const demoFaultFrame = "0103080205000020000000ce4a";

const issues = [
  {
    id: "hazard-01",
    number: 1,
    title: "消控室值班记录问题",
    location: "消防控制室（电池车间）",
    tag: "重复隐患",
    status: "待复查",
    statusType: "urgent",
    description: "值班记录填写不完整，未记录火警处置流程。",
    department: "安保部",
    owner: "张伟",
    dueAt: "2026-06-15",
    dueText: "已逾期 20 天",
    foundAt: "2026-07-09 09:02",
    repeated: "近 180 天重复 3 次",
    image: "assets/evidence-control-room-log.png",
    completionEvidence: { name: "消控室值班记录整改后.png", url: "assets/evidence-control-room-log.png" },
    pin: { left: 43, top: 47 },
  },
  {
    id: "hazard-02",
    number: 2,
    title: "灭火器被遮挡",
    location: "PACK 产线 · 通道东侧",
    tag: "现场隐患",
    status: "隐患整改中",
    statusType: "progress",
    description: "灭火器被物料箱遮挡，影响紧急情况下快速取用。",
    department: "生产部",
    owner: "李强",
    dueAt: "2026-08-05",
    dueText: "剩余 7 天",
    foundAt: "2026-07-22 09:41",
    repeated: "首次发现",
    image: "assets/evidence-extinguisher-blocked.png",
    pin: { left: 78, top: 46 },
  },
  {
    id: "hazard-03",
    number: 3,
    title: "疏散指示标志故障",
    location: "化成区 · 西侧通道",
    tag: "设备故障",
    status: "待整改",
    statusType: "urgent",
    description: "疏散指示灯不亮，夜间状态无法辨识疏散方向。",
    department: "工程部",
    owner: "王磊",
    dueAt: "2026-07-28",
    dueText: "剩余 0 天",
    foundAt: "2026-07-28 15:16",
    repeated: "近 180 天 1 次",
    image: "assets/evidence-exit-sign-fault.png",
    pin: { left: 14, top: 66 },
  },
];

const inspectionRoute = [
  { number: 1, title: "消防控制室", status: "待复查", time: "09:00", tone: "danger", issueId: "hazard-01" },
  { number: 2, title: "PACK 产线", status: "隐患整改中", time: "09:35", tone: "warning", issueId: "hazard-02" },
  { number: 3, title: "化成区", status: "待整改", time: "10:10", tone: "warning", issueId: "hazard-03" },
  { number: 4, title: "电池测试间", status: "已闭环", time: "10:45", tone: "success" },
  { number: 5, title: "配电间", status: "已闭环", time: "11:20", tone: "success" },
  { number: 6, title: "装卸平台", status: "已闭环", time: "11:55", tone: "success" },
];

const equipment = [
  { icon: "radio-tower", name: "火灾报警控制器（机2）", location: "消防控制室", state: "正常", updated: "2 分钟前" },
  { icon: "siren", name: "声光警报器", location: "PACK 产线", state: "故障 1", updated: "11 分钟前" },
  { icon: "door-open", name: "安全出口", location: "全车间 8 处", state: "正常", updated: "8 分钟前" },
  { icon: "droplets", name: "消防水系统", location: "消防泵房", state: "正常", updated: "5 分钟前" },
  { icon: "battery-warning", name: "消防电源监测模块", location: "冲压车间控制柜", state: "故障 1", updated: "18 分钟前" },
];

const workspaces = [
  { module: "assets", route: "monitoring", role: "报警定位与空间核实", icon: "map", title: "报警与空间", description: "从厂区告警进入车间消防平面，核实楼层、通道、消防设施和报警点位。", status: "空间核实" },
  { module: "emergency", route: "incidents", role: "接警、核实、调度与现场处置", icon: "siren", title: "应急处置", description: "从设备报警到巡查核实、消防队与 ERT 出动、现场反馈和事件归档。", status: "火警闭环" },
  { module: "operations", route: "station?crew_id=crew-wb-01", role: "故障、维保与验收", icon: "wrench", title: "设施运维", description: "处理设备故障、维保派单、维修反馈和设施部门验收。", status: "维保闭环" },
  { module: "prevention", route: "inspections", role: "巡查、整改与复查", icon: "clipboard-check", title: "日常防控", description: "执行巡查计划，上报隐患并跟踪车间整改和复查关闭。", status: "巡查闭环" },
  { module: "analysis", route: "analysis/ent-001", role: "管理分析与事件复盘", icon: "chart-no-axes-combined", title: "分析复盘", description: "查看车间风险、问题分布、整改效率和有证据的改进建议。", status: "管理视图" },
];
const OWNER_OPTIONS = ["张伟", "李强", "王磊", "赵敏", "陈刚", "周倩", "孙磊"];

const monitoringProfiles = {
  "ent-001": { district: "西区", online: "89%", signal: "设备火警信号 3 条", fault: "报警系统故障 18 次", maintenance: "维保逾期 2 项", freshness: "2 分钟前" },
  "ent-005": { district: "西区", online: "93%", signal: "设备火警信号 1 条", fault: "报警系统故障 9 次", maintenance: "维保逾期 1 项", freshness: "4 分钟前" },
  "ent-002": { district: "东区", online: "97%", signal: "无未核实火警信号", fault: "设备故障 4 次", maintenance: "季度维保逾期", freshness: "3 分钟前" },
  "ent-003": { district: "东区", online: "99%", signal: "无未核实火警信号", fault: "设备故障 1 次", maintenance: "维保计划正常", freshness: "1 分钟前" },
  "ent-004": { district: "西区", online: "96%", signal: "无未核实火警信号", fault: "消防电源监测模块故障 1 次", maintenance: "维保工单处理中", freshness: "3 分钟前" },
};
const OFFLINE_SITE_PROFILES = {
  "ent-001": {
    address: "星澜新能源汽车工厂（虚拟）西区 电池车间厂房",
    hazards: ["锂电池模组半成品缓存区（合成）", "电芯化成区（合成）"],
    access_points: ["车间南门（合成）", "车间东门（合成）"],
    water_sources: ["厂区环网消火栓（合成）", "厂区消防水池（合成）"],
    facilities: ["自动喷水灭火系统（合成）", "电池测试间气体灭火系统（合成）", "锂电专用灭火器材（合成）"],
  },
  "ent-005": {
    address: "星澜新能源汽车工厂（虚拟）西区 涂装车间厂房",
    hazards: ["调漆间可燃液体（合成）", "喷涂作业区（合成）"],
    access_points: ["车间东出口（合成）"],
    water_sources: ["厂区环网消火栓（合成）"],
    facilities: ["自动喷水灭火系统（合成）", "调漆间气体灭火系统（合成）"],
  },
};
const monitoringFloorPositions = {
  "ent-001": { left: 50, top: 73, label: "PACK 产线 A1 半成品缓存区" },
  "ent-005": { left: 25, top: 31, label: "喷漆线 3#" },
  "ent-002": { left: 51, top: 31, label: "测试区 B2" },
  "ent-003": { left: 30, top: 70, label: "堆垛机通道" },
  "ent-004": { left: 75, top: 70, label: "冲压线控制柜" },
};

let selectedCompanyId = "ent-001";
let selectedIssueId = "hazard-01";
let activeRightTab = "hazards";
let hazardFilter = "all";
let planZoom = 1;
let inspectionFloor = "all";
let monitoringState = {
  events: window.FireGuardEngine.monitoringEvents(),
  selectedId: "evt-fire-001",
  filter: "all",
  tab: "location",
  floor: "2F",
  spatialLevel: "factory",
};
window.FireOpsReview = {
  setMonitoringEvents(events) {
    monitoringState.events = events;
    monitoringState.selectedId = events[0]?.id || null;
    if (monitoringState.spatialLevel !== "factory" && !buildingForEnterprise(events[0]?.enterpriseId)) monitoringState.spatialLevel = "factory";
    renderRoute();
  },
};
let toastTimer;
let workflowStarted = false;
let spatialSite = null;
let legacyMap = null;
let workshopScenes = null;
let semifinalScenarios = [];
let semifinalRoleContract = [];
let semifinalOpsRecords = null;
let judgeScenarioRuntime = null;
let judgeNarration = null;
const ZONE_FILLS = { process: "#eef1fb", storage: "#fdf3e3", buffer: "#e9f6ef", hazard_room: "#fdecec", office: "#f2f2f4", electrical: "#f3eefc", logistics: "#e7f4f4" };
const LAYOUT_PROFILE_LABELS = { multi_bay_process_line: "多跨电池产线", linear_booth_line: "线性喷涂工艺", u_shaped_assembly: "U 形总装工艺", heavy_press_row: "重型冲压设备列", high_rack_aisles: "高位货架巷道" };
const WORKSHOP_PLAN_ASSETS = {
  "ws-battery": "assets/floorplans/battery-pack.png",
  "ws-painting": "assets/floorplans/paint-shop.png",
  "ws-assembly": "assets/floorplans/general-assembly.png",
  "ws-stamping": "assets/floorplans/stamping-shop.png",
  "ws-warehouse": "assets/floorplans/high-bay-warehouse.png",
};
const WORKSHOP_PLAN_ASPECTS = {
  "ws-battery": "1672 / 941",
  "ws-painting": "1774 / 887",
  "ws-assembly": "1672 / 941",
  "ws-stamping": "1672 / 941",
  "ws-warehouse": "1672 / 941",
};
const WORKSHOP_PLAN_BOUNDS = {
  "ws-battery": { left: 1, top: 4, right: 99, bottom: 96 },
  "ws-painting": { left: 4, top: 10, right: 97, bottom: 89 },
  "ws-assembly": { left: 2, top: 4, right: 98, bottom: 95 },
  "ws-stamping": { left: 5, top: 6, right: 96, bottom: 94 },
  "ws-warehouse": { left: 5, top: 3, right: 95, bottom: 95 },
};
function workshopPlanPoint(building, x, y) {
  const bounds = WORKSHOP_PLAN_BOUNDS[building.workshop_id];
  return bounds ? {
    x: bounds.left + x / 100 * (bounds.right - bounds.left),
    y: bounds.top + y / 100 * (bounds.bottom - bounds.top),
  } : { x, y };
}
function loadSemifinalSpatial() {
  const scenarioFiles = ["fire-confirmed", "false-alarm-maintenance", "inspection-rectification"];
  Promise.all([
    fetch("demo-data/semifinal/site_spatial.json").then((response) => response.json()),
    fetch("demo-data/semifinal/legacy_map.json?v=2").then((response) => response.json()),
    fetch("demo-data/semifinal/role_permissions.json").then((response) => response.json()).catch(() => ({ roles: [] })),
    fetch("demo-data/semifinal/ops_records.json?v=2").then((response) => response.json()).catch(() => null),
    fetch("demo-data/semifinal/workshop_scenes.json").then((response) => response.json()).catch(() => null),
    fetch("demo-data/semifinal/judge_tour_narration.json").then((response) => response.json()).catch(() => null),
    ...scenarioFiles.map((name) => fetch(`demo-data/semifinal/scenarios/${name}.json`).then((response) => response.json())),
  ]).then(([site, map, roles, opsRecords, scenes, narration, ...scenarios]) => {
    spatialSite = site;
    legacyMap = map;
    workshopScenes = scenes;
    semifinalRoleContract = roles.roles || [];
    semifinalOpsRecords = opsRecords;
    judgeNarration = narration;
    semifinalScenarios = scenarios;
    judgeScenarioRuntime = window.FireGuardEngine.createScenarioRuntime(semifinalScenarios, semifinalRoleContract);
    if (judgeTour.active) renderJudgeTourController();
    else renderRoute();
  }).catch(() => {});
}
function buildingForEnterprise(enterpriseId) {
  const buildingId = legacyMap?.enterprises?.[enterpriseId]?.building_id;
  return spatialSite?.buildings.find((item) => item.id === buildingId) || null;
}
// 巡查页平面图：与监测页共用同一套空间数据，按建筑工艺布局逐层绘制，不再是同一张静态图片。
function issuePlanPosition(building, issue, enterpriseId) {
  const rules = legacyMap?.location_rules?.[enterpriseId] || [];
  const text = `${issue.location || ""} ${issue.title || ""}`;
  for (const rule of rules) {
    if (!text.includes(rule.match)) continue;
    if (rule.zone) {
      for (const floor of building.floors || []) {
        const zone = (floor.zones || []).find((item) => item.id === rule.zone);
        if (zone) return { x: zone.coords.x + zone.coords.w / 2, y: 100 - zone.coords.y - zone.coords.h / 2, floor: floorShort(floor.label), zoneId: zone.id };
      }
    }
  }
  return { x: issue.pin?.left ?? 50, y: issue.pin?.top ?? 50, floor: floorShort(building.floors?.[0]?.label || "1F"), zoneId: null };
}
function processPlanMotif(profile, floor, offset) {
  if ((floor.zones || []).length < 2) return "";
  const y = (value) => offset + value;
  const motifs = {
    multi_bay_process_line: `<g class="process-motif battery-motif" data-process-motif="battery-bays"><path d="M8 ${y(50)}H92 M50 ${y(8)}V${y(92)}"></path>${[18, 27, 64, 73].map((x) => `<rect x="${x}" y="${y(18)}" width="5" height="4"></rect><rect x="${x}" y="${y(78)}" width="5" height="4"></rect>`).join("")}</g>`,
    linear_booth_line: `<g class="process-motif paint-motif" data-process-motif="paint-conveyor"><path d="M8 ${y(50)}H90"></path><path class="motif-arrow" d="M86 ${y(46)}L92 ${y(50)}L86 ${y(54)}"></path>${[18, 40, 66, 86].map((x) => `<rect x="${x - 4}" y="${y(43)}" width="8" height="14" rx="2"></rect>`).join("")}</g>`,
    u_shaped_assembly: `<g class="process-motif assembly-motif" data-process-motif="assembly-u-line"><path d="M20 ${y(78)}V${y(24)}Q20 ${y(14)} 30 ${y(14)}H70Q80 ${y(14)} 80 ${y(24)}V${y(78)}"></path>${[[20,34],[20,58],[38,14],[62,14],[80,34],[80,58]].map(([x, yy]) => `<circle cx="${x}" cy="${y(yy)}" r="2.1"></circle>`).join("")}</g>`,
    heavy_press_row: `<g class="process-motif stamping-motif" data-process-motif="press-row"><path d="M8 ${y(18)}H92 M8 ${y(82)}H92"></path>${[22, 42, 62, 82].map((x) => `<path d="M${x - 5} ${y(64)}V${y(38)}H${x + 5}V${y(64)} M${x - 7} ${y(67)}H${x + 7} M${x - 3} ${y(43)}H${x + 3}V${y(53)}H${x - 3}Z"></path>`).join("")}</g>`,
    high_rack_aisles: `<g class="process-motif warehouse-motif" data-process-motif="rack-aisles">${[18, 34, 50, 66, 82].map((x) => `<rect x="${x - 4}" y="${y(16)}" width="8" height="68"></rect><path d="M${x - 4} ${y(32)}H${x + 4} M${x - 4} ${y(50)}H${x + 4} M${x - 4} ${y(68)}H${x + 4}"></path>`).join("")}</g>`,
  };
  return motifs[profile] || "";
}
function spatialPlanSvg(building, floors, highlightedZoneIds = new Set(), className = "plan-svg", highlightedRouteEdges = new Set(), routeTarget = null, overlayOnly = false) {
  const nodeById = new Map((building.route_nodes || []).map((node) => [node.id, node]));
  const routeMarkerId = `response-route-arrow-${building.id}`;
  const svgFloors = floors.map((floor, index) => {
    const offset = index * 100;
    const zones = overlayOnly ? "" : (floor.zones || []).map((zone) => {
      const c = zone.coords;
      const highlighted = highlightedZoneIds.has(zone.id);
      return `<g><rect x="${c.x}" y="${offset + 100 - c.y - c.h}" width="${c.w}" height="${c.h}" rx="1.2" class="${highlighted ? "zone-alarm" : ""}" fill="${ZONE_FILLS[zone.kind] || "#f4f4f6"}" stroke="#c9c4d4" stroke-width="0.35"></rect><text x="${c.x + c.w / 2}" y="${offset + 100 - c.y - c.h / 2}" text-anchor="middle" font-size="3" fill="#4b4656">${escapeHtml(zone.name)}</text></g>`;
    }).join("");
    const edges = (building.route_edges || []).filter((edge) => {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      return from && to && from.floor === floor.id && to.floor === floor.id;
    }).map((edge) => {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      const forward = highlightedRouteEdges.has(`${edge.from}>${edge.to}`);
      const reverse = highlightedRouteEdges.has(`${edge.to}>${edge.from}`);
      const highlighted = forward || reverse;
      if (overlayOnly && !highlighted) return "";
      if (!highlighted) return `<line x1="${from.x}" y1="${offset + 100 - from.y}" x2="${to.x}" y2="${offset + 100 - to.y}" stroke="#b7b3c2" stroke-width="0.28" class="plan-route-network"></line>`;
      const start = reverse && !forward ? to : from;
      const end = reverse && !forward ? from : to;
      const startPoint = overlayOnly ? workshopPlanPoint(building, start.x, 100 - start.y) : { x: start.x, y: 100 - start.y };
      const endPoint = overlayOnly ? workshopPlanPoint(building, end.x, 100 - end.y) : { x: end.x, y: 100 - end.y };
      return `<path d="M${startPoint.x} ${offset + startPoint.y}V${offset + endPoint.y}H${endPoint.x}" class="response-route-edge" marker-end="url(#${routeMarkerId})" data-response-route-edge></path>`;
    }).join("");
    const doors = overlayOnly ? "" : (building.route_nodes || []).filter((node) => node.floor === floor.id && node.kind === "exterior_door").map((node) =>
      `<g><rect x="${node.x - 1.6}" y="${offset + 100 - node.y - 0.9}" width="3.2" height="1.8" rx="0.3" fill="#1f9d55"></rect><text x="${node.x}" y="${offset + 100 - node.y - 1.6}" text-anchor="middle" font-size="2" fill="#1f7a44">${escapeHtml(node.name)}</text></g>`).join("");
    const interiorDoors = overlayOnly ? "" : (building.route_nodes || []).filter((node) => node.floor === floor.id && node.kind === "interior_door").map((node) =>
      `<rect x="${node.x - 1}" y="${offset + 100 - node.y - 0.6}" width="2" height="1.2" rx="0.3" fill="#7c5cd6"><title>${escapeHtml(node.name)}</title></rect>`).join("");
    const stairs = overlayOnly ? "" : (building.route_nodes || []).filter((node) => node.floor === floor.id && node.kind === "stair").map((node) =>
      `<g><rect x="${node.x - 1.4}" y="${offset + 100 - node.y - 1.4}" width="2.8" height="2.8" rx="0.4" fill="#eceaf3" stroke="#8f89a3" stroke-width="0.25"></rect><text x="${node.x}" y="${offset + 100 - node.y + 0.9}" text-anchor="middle" font-size="2.2" fill="#5d5770">梯</text></g>`).join("");
    const points = overlayOnly ? "" : (building.device_points || []).filter((point) => point.floor === floor.id).map((point) =>
      `<circle cx="${point.x}" cy="${offset + 100 - point.y}" r="0.9" fill="${{ smoke: "#d64545", temperature: "#e6862e", gas: "#8a5cf6", hydrant: "#2f7fd6" }[point.type] || "#666"}"><title>${escapeHtml(point.name)}</title></circle>`).join("");
    const routeEnd = nodeById.get(routeTarget?.endId);
    let routeTargetLine = "";
    if (routeEnd?.floor === floor.id && routeTarget?.position?.floor === floorShort(floor.label)) {
      const routeEndPoint = overlayOnly ? workshopPlanPoint(building, routeEnd.x, 100 - routeEnd.y) : { x: routeEnd.x, y: 100 - routeEnd.y };
      const targetPoint = overlayOnly ? workshopPlanPoint(building, routeTarget.position.x, routeTarget.position.y) : routeTarget.position;
      routeTargetLine = `<path d="M${routeEndPoint.x} ${offset + routeEndPoint.y}V${offset + targetPoint.y}H${targetPoint.x}" class="response-route-edge response-route-target" marker-end="url(#${routeMarkerId})" data-response-route-edge></path>`;
    }
    const processMotif = overlayOnly ? "" : processPlanMotif(building.layout_profile, floor, offset);
    return `<g>${overlayOnly ? "" : `<rect class="plan-building-shell" x="3" y="${offset + 7}" width="94" height="88" rx="1"></rect>`}${zones}${processMotif}${edges}${routeTargetLine}${doors}${interiorDoors}${stairs}${points}${overlayOnly ? "" : `<text x="4" y="${offset + 5}" font-size="3.2" font-weight="700" fill="#36313a">${escapeHtml(floor.label)}</text>`}</g>`;
  }).join("");
  const routeMarker = highlightedRouteEdges.size || routeTarget ? `<defs><marker id="${routeMarkerId}" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto" markerUnits="strokeWidth"><path d="M0 0L5 2.5L0 5Z" fill="#d92d36"></path></marker></defs>` : "";
  return `<svg class="${className}" data-building-id="${escapeHtml(building.id)}" data-layout-profile="${escapeHtml(building.layout_profile)}" viewBox="0 0 100 ${100 * floors.length}" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(building.name)}工艺消防脱敏平面图"><title>${escapeHtml(building.name)} · ${escapeHtml(building.layout_profile)} · 脱敏示意</title>${routeMarker}${svgFloors}</svg>`;
}
function inspectionPlanTemplate(building, issueList, enterpriseId) {
  const shownFloors = inspectionFloor === "all" ? building.floors : building.floors.filter((floor) => floorShort(floor.label) === inspectionFloor);
  const floors = shownFloors.length ? shownFloors : building.floors.slice(0, 1);
  const rows = floors.length;
  const visibleFloorNames = new Set(floors.map((floor) => floorShort(floor.label)));
  const positions = new Map(issueList.map((issue) => [issue.id, issuePlanPosition(building, issue, enterpriseId)]));
  const issueZoneIds = new Set([...positions.values()].map((pos) => pos.zoneId).filter(Boolean));
  const pins = issueList.map((issue) => {
    const pos = positions.get(issue.id);
    if (!visibleFloorNames.has(pos.floor)) return "";
    const floorIndex = floors.findIndex((floor) => floorShort(floor.label) === pos.floor);
    const top = (floorIndex * 100 + pos.y) / rows;
    return `<button class="map-pin ${issue.id === selectedIssueId ? "active" : ""}" style="--pin-left:${pos.x}%;--pin-top:${top}%" type="button" data-issue-id="${issue.id}" aria-label="隐患 ${issue.number}：${escapeHtml(issue.title)}">${issue.number}</button>`;
  }).join("");
  const planAsset = WORKSHOP_PLAN_ASSETS[building.workshop_id];
  return `
    <div class="monitoring-floor-selector plan-floor-selector" aria-label="楼层筛选">${[["all", "全部楼层"], ...building.floors.map((floor) => [floorShort(floor.label), floorShort(floor.label)])].map(([value, label]) => `<button type="button" data-plan-floor="${value}" aria-pressed="${inspectionFloor === value}" class="${inspectionFloor === value ? "active" : ""}">${label}</button>`).join("")}</div>
    ${planAsset ? `<img class="workshop-plan-image" src="${planAsset}" alt="${escapeHtml(building.name)}脱敏合成消防平面图">` : ""}
    ${spatialPlanSvg(building, floors, issueZoneIds, planAsset ? "plan-svg plan-route-overlay" : "plan-svg", new Set(), null, Boolean(planAsset))}
    ${pins}`;
}
function floorShort(label) {
  return String(label || "").split(" ")[0];
}
function eventPlanPosition(building, event) {
  const rules = legacyMap?.location_rules?.[event.enterpriseId] || [];
  const text = `${event.point} ${event.location}`;
  for (const rule of rules) {
    if (!text.includes(rule.match)) continue;
    if (rule.zone) {
      for (const floor of building.floors || []) {
        const zone = (floor.zones || []).find((item) => item.id === rule.zone);
        if (zone) return { x: zone.coords.x + zone.coords.w / 2, y: 100 - zone.coords.y - zone.coords.h / 2, floor: floorShort(floor.label), zoneId: zone.id };
      }
    }
    if (rule.door) {
      const node = (building.route_nodes || []).find((item) => item.id === (building.exterior_doors || []).find((door) => door.id === rule.door)?.node);
      if (node) return { x: node.x, y: 100 - node.y, floor: floorShort((building.floors.find((floor) => floor.id === node.floor) || {}).label || "1F"), zoneId: null };
    }
  }
  return { x: event.left, y: event.top, floor: event.floor, zoneId: null };
}
function workshopFloor(building, event) {
  const mapped = event ? eventPlanPosition(building, event).floor : null;
  return building.floors.some((floor) => floorShort(floor.label) === mapped)
    ? mapped
    : floorShort(building.floors[0]?.label) || "all";
}
function responseRoute(building, event, startId, sourceLabel) {
  if (!spatialSite?.site || !building || !event) return null;
  const nodes = [
    ...(spatialSite.site.route_nodes || []).map((node) => ({ ...node, scope: "site" })),
    ...spatialSite.buildings.flatMap((item) => (item.route_nodes || []).map((node) => ({ ...node, scope: item.id }))),
  ];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  if (!nodeById.has(startId)) return null;
  const target = eventPlanPosition(building, event);
  const floorId = building.floors.find((floor) => floorShort(floor.label) === target.floor)?.id;
  const candidates = (building.route_nodes || []).filter((node) => node.floor === floorId && node.kind !== "exterior_door");
  const targetNode = candidates.reduce((best, node) => {
    const distance = Math.hypot(node.x - target.x, 100 - node.y - target.y);
    return !best || distance < best.distance ? { node, distance } : best;
  }, null);
  if (!targetNode) return null;
  const neighbors = new Map(nodes.map((node) => [node.id, []]));
  const edges = [...(spatialSite.site.route_edges || []), ...(building.route_edges || [])];
  for (const edge of edges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    const weight = from.scope !== to.scope ? 12
      : from.floor && to.floor && from.floor !== to.floor ? 18
        : Math.max(1, Math.hypot(from.x - to.x, from.y - to.y));
    neighbors.get(from.id).push({ id: to.id, weight });
    if (edge.bidirectional) neighbors.get(to.id).push({ id: from.id, weight });
  }
  const distance = new Map(nodes.map((node) => [node.id, Infinity]));
  const previous = new Map();
  const open = new Set(nodes.map((node) => node.id));
  distance.set(startId, 0);
  while (open.size) {
    let current = null;
    for (const id of open) if (current === null || distance.get(id) < distance.get(current)) current = id;
    if (current === targetNode.node.id || distance.get(current) === Infinity) break;
    open.delete(current);
    for (const next of neighbors.get(current) || []) {
      const score = distance.get(current) + next.weight;
      if (score >= distance.get(next.id)) continue;
      distance.set(next.id, score);
      previous.set(next.id, current);
    }
  }
  if (distance.get(targetNode.node.id) === Infinity) return null;
  const path = [];
  for (let id = targetNode.node.id; id; id = previous.get(id)) path.unshift(id);
  const targetDoors = new Set((building.exterior_doors || []).map((door) => door.node));
  const entryId = path.find((id) => targetDoors.has(id));
  return {
    sourceLabel,
    entry: nodeById.get(entryId)?.name || "入口待确认",
    target: event.point,
    floor: target.floor,
    path,
    pathEdges: path.slice(1).map((id, index) => [path[index], id]),
    nodes: path.map((id) => nodeById.get(id)).filter(Boolean),
    labels: [...path.map((id) => nodeById.get(id)?.name).filter(Boolean), event.point],
  };
}
function routeJourneyTemplate(route) {
  const nodes = route?.nodes || [];
  const stages = [];
  const add = (id, label, detail) => {
    if (id && !stages.some((stage) => stage.id === id)) stages.push({ id, label, detail });
  };
  add(nodes[0]?.id, "室外入口", nodes[0]?.name);
  const siteExit = nodes.filter((node) => node.scope === "site").at(-1);
  add(siteExit?.id, "厂区道路", siteExit?.name);
  const entry = nodes.find((node) => node.kind === "exterior_door");
  add(entry?.id, "车间入口", entry?.name);
  const stairs = nodes.filter((node) => node.kind === "stair");
  if (stairs.length) add(`stairs-${route.floor}`, "垂直交通", stairs.map((node) => node.name).join(" → "));
  const interior = [...nodes].reverse().find((node) => !["exterior_door", "stair"].includes(node.kind));
  add(interior?.id, "楼内通道", interior?.name);
  add(`target-${route.floor}`, "事件点", route.target);
  return `<ol class="route-journey" style="--route-stages:${stages.length}" data-route-start="${escapeHtml(route.path[0])}" data-route-target="${escapeHtml(route.target)}">${stages.map((stage) => `<li data-route-node-id="${escapeHtml(stage.id)}"><i aria-hidden="true"></i><span><b>${escapeHtml(stage.label)}</b><small>${escapeHtml(stage.detail)}</small></span></li>`).join("")}</ol>`;
}
function responseRouteTemplate(routes) {
  if (!routes?.patrol && !routes?.brigade) return "";
  const item = (label, route) => `<div><strong>${label}</strong><span>${escapeHtml(route.sourceLabel)} → ${escapeHtml(route.entry)} → ${escapeHtml(route.target)}</span>${routeJourneyTemplate(route)}<small>${escapeHtml(route.labels.join(" → "))}</small></div>`;
  return `<section class="monitoring-response-route" data-response-route><header><strong><i data-lucide="route"></i>推荐到场路线</strong><span>路径辅助</span></header>${routes.patrol ? item("巡查核实", routes.patrol) : ""}${routes.brigade ? item("专职消防队", routes.brigade) : ""}<p>现场人员需结合道路、门禁和烟气情况确认实际通行路线。</p></section>`;
}
function workshopLabel(workshopId) {
  const building = spatialSite?.buildings.find((item) => item.workshop_id === workshopId);
  if (building) return building.name;
  const enterpriseId = Object.keys(legacyMap?.enterprises || {}).find((id) => legacyMap.enterprises[id].workshop_id === workshopId);
  return companies.find((item) => item.id === enterpriseId)?.name || workshopId || "未分配车间";
}
function weeklyRecordCopy(item) {
  const type = item.id?.startsWith("ALM") ? "报警处置记录" : item.id?.startsWith("WO") ? "设施维保工单" : "巡查隐患记录";
  const status = ({ closed: "已闭环", assigned: "整改中", in_progress: "处理中" })[item.status] || "待跟进";
  const evidence = [...new Set((item.evidence_refs || []).map((ref) => ref.startsWith("monitoring_events") ? "报警接入" : ref.startsWith("patrol_report") ? "现场核实" : ref.startsWith("incident_report") ? "处置归档" : ref.startsWith("workorder") ? "工单与验收" : ref.startsWith("inspection_plan") ? "巡查计划" : "整改复查"))];
  return { type, status, evidence: evidence.join("、") || "等待业务记录" };
}
function businessSourceLabel(source) {
  return ({
    "site-profile/hazards": "企业危险源档案",
    "site-profile/access-route": "厂区入口与消防路线",
    "site-profile/facilities": "消防设施台账",
  })[source] || "相关业务记录";
}
function incidentEventLabel(type) {
  return ({
    incident_created: "确认火警",
    dispatch_issued: "派发处置任务",
    ert_notified: "通知车间 ERT",
    ert_acknowledged: "ERT 已签收",
    acknowledged: "消防队已签收",
    enroute: "消防队出动",
    arrived: "到达现场",
    first_report: "现场首报",
    incident_closed: "事件归档",
  })[type] || "处置状态更新";
}
function countBy(items, key) {
  return items.reduce((result, item) => {
    const value = item[key] || "未分类";
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}
function percentOf(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}
function elapsedMinutes(start, end) {
  const value = (Date.parse(end) - Date.parse(start)) / 60000;
  return Number.isFinite(value) && value >= 0 ? value : null;
}
function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * ratio) - 1];
}
function opsMetrics() {
  if (!semifinalOpsRecords) return null;
  const alarms = semifinalOpsRecords.alarms || [];
  const workorders = semifinalOpsRecords.workorders || [];
  const findings = semifinalOpsRecords.findings || [];
  const closedFindings = findings.filter((item) => item.status === "closed").length;
  const closedWorkorders = workorders.filter((item) => item.status === "closed").length;
  const alarmMinutes = alarms.map((item) => elapsedMinutes(item.occurred_at, item.closed_at)).filter((value) => value !== null);
  const workorderHours = workorders.map((item) => elapsedMinutes(item.created_at, item.closed_at)).filter((value) => value !== null).map((value) => value / 60);
  const findingHours = findings.map((item) => elapsedMinutes(item.found_at, item.closed_at)).filter((value) => value !== null).map((value) => value / 60);
  const workshopIds = [...new Set([
    ...(spatialSite?.buildings || []).map((item) => item.workshop_id),
    ...alarms.map((item) => item.workshop_id),
    ...workorders.map((item) => item.workshop_id),
    ...findings.map((item) => item.workshop_id),
  ].filter(Boolean))];
  const workshopStats = workshopIds.map((workshopId) => {
    const workshopFindings = findings.filter((item) => item.workshop_id === workshopId);
    const closed = workshopFindings.filter((item) => item.status === "closed").length;
    return {
      id: workshopId,
      name: workshopLabel(workshopId),
      count: workshopFindings.length,
      closed,
      rate: percentOf(closed, workshopFindings.length),
      openWorkorders: workorders.filter((item) => item.workshop_id === workshopId && item.status !== "closed").length,
      alarms: alarms.filter((item) => item.workshop_id === workshopId).length,
    };
  }).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "zh-CN"));
  return {
    week: semifinalOpsRecords.week,
    alarmCount: alarms.length,
    confirmedFireCount: alarms.filter((item) => item.result === "confirmed_fire").length,
    falseAlarmCount: alarms.filter((item) => item.result === "false_alarm").length,
    findingCount: findings.length,
    closedFindings,
    openFindings: findings.length - closedFindings,
    workorderCount: workorders.length,
    closedWorkorders,
    openWorkorders: workorders.length - closedWorkorders,
    rectificationRate: percentOf(closedFindings, findings.length),
    maintenanceRate: percentOf(closedWorkorders, workorders.length),
    timeliness: {
      alarm: { p50: percentile(alarmMinutes, .5), p90: percentile(alarmMinutes, .9), sample: alarmMinutes.length },
      workorder: { p50: percentile(workorderHours, .5), sample: workorderHours.length },
      finding: { p50: percentile(findingHours, .5), sample: findingHours.length },
    },
    categories: Object.entries(countBy(findings, "category")).map(([name, count]) => ({ name, count, percent: percentOf(count, findings.length) })),
    workshops: workshopStats,
    records: [...alarms, ...workorders, ...findings],
    operations: semifinalOpsRecords.operations || null,
  };
}
function workshopPlanTemplate(building, buildingEvents, selectedEvent, pendingFire, responseRoutes) {
  const shownFloors = monitoringState.floor === "all" ? building.floors : building.floors.filter((floor) => floorShort(floor.label) === monitoringState.floor);
  const floors = shownFloors.length ? shownFloors : building.floors.slice(0, 1);
  const visibleFloorNames = new Set(floors.map((floor) => floorShort(floor.label)));
  const visibleEvents = buildingEvents.filter((event) => visibleFloorNames.has(eventPlanPosition(building, event).floor));
  const selectedPos = eventPlanPosition(building, selectedEvent);
  const eventZoneIds = new Set([selectedPos.zoneId].filter(Boolean));
  const responseRouteEdges = new Set(Object.values(responseRoutes || {}).flatMap((route) => route?.pathEdges || []).map(([from, to]) => `${from}>${to}`));
  const patrolRoute = responseRoutes?.patrol;
  const planAsset = WORKSHOP_PLAN_ASSETS[building.workshop_id];
  const routeOverlayEnabled = Boolean(patrolRoute);
  const rows = floors.length;
  const pinFor = (event) => {
    const pos = eventPlanPosition(building, event);
    const floorIndex = floors.findIndex((floor) => floorShort(floor.label) === pos.floor);
    if (floorIndex < 0) return "";
    const point = planAsset ? workshopPlanPoint(building, pos.x, pos.y) : pos;
    const top = (floorIndex * 100 + point.y) / rows;
    return `<button type="button" class="monitoring-event-pin ${event.id === selectedEvent.id ? "active" : ""}" style="--pin-left:${point.x}%;--pin-top:${top}%" data-monitoring-event-pin="${event.id}" aria-label="${escapeHtml(event.point)} ${escapeHtml(event.typeLabel)}"><i data-lucide="${event.type === "fire" ? "flame" : "circle-alert"}"></i></button>`;
  };
  const pins = visibleEvents.map(pinFor).join("");
  const selectedFloorIndex = floors.findIndex((floor) => floorShort(floor.label) === selectedPos.floor);
  const selectedPoint = planAsset ? workshopPlanPoint(building, selectedPos.x, selectedPos.y) : selectedPos;
  const alarmPin = selectedFloorIndex >= 0
    ? (pendingFire
      ? `<button type="button" class="monitoring-alarm-pin" style="--alarm-left:${selectedPoint.x}%;--alarm-top:${(selectedFloorIndex * 100 + selectedPoint.y) / rows}%" data-action="open-monitoring-copilot"><i data-lucide="flame"></i><span><strong>${escapeHtml(selectedEvent.point)}</strong><small>${escapeHtml(selectedEvent.time)} ${escapeHtml(selectedEvent.typeLabel)}</small></span></button>`
      : `<div class="monitoring-alarm-pin" style="--alarm-left:${selectedPoint.x}%;--alarm-top:${(selectedFloorIndex * 100 + selectedPoint.y) / rows}%"><i data-lucide="${selectedEvent.type === "fault" ? "wrench" : "circle-alert"}"></i><span><strong>${escapeHtml(selectedEvent.point)}</strong><small>${escapeHtml(selectedEvent.time)} ${escapeHtml(selectedEvent.statusLabel)}</small></span></div>`)
    : "";
  const planLayers = `${planAsset ? `<img class="workshop-plan-image" src="${planAsset}" alt="${escapeHtml(building.name)}脱敏合成消防平面图">` : ""}
      ${spatialPlanSvg(building, floors, eventZoneIds, planAsset ? "monitoring-svg-plan plan-route-overlay" : "monitoring-svg-plan", routeOverlayEnabled ? responseRouteEdges : new Set(), routeOverlayEnabled ? { endId: patrolRoute.path.at(-1), position: selectedPos } : null, Boolean(planAsset))}
      ${pins}
      ${alarmPin}`;
  return `
    <div class="monitoring-floor-summary"><strong>${escapeHtml(building.name)} · ${monitoringState.floor === "all" ? "全部楼层" : escapeHtml(monitoringState.floor)} · ${visibleEvents.length} 个事件点</strong><span>${escapeHtml(LAYOUT_PROFILE_LABELS[building.layout_profile] || "工艺分区")} · 脱敏合成图</span></div>
    <div class="monitoring-floorplan ${planAsset ? "has-plan-image" : ""}">
      <div class="monitoring-floor-selector" aria-label="楼层筛选">${[["all", "全部楼层"], ...building.floors.map((floor) => [floorShort(floor.label), floorShort(floor.label)])].map(([value, label]) => `<button type="button" data-monitoring-floor="${value}" aria-pressed="${monitoringState.floor === value}" class="${monitoringState.floor === value ? "active" : ""}">${label}</button>`).join("")}</div>
      ${patrolRoute ? `<div class="monitoring-route-key" data-response-route-map><span><i aria-hidden="true"></i>从室外入口到事件点</span>${routeJourneyTemplate(patrolRoute)}<small>${escapeHtml(patrolRoute.labels.join(" → "))}</small></div>` : ""}
      <div class="monitoring-plan-stamp"><strong>${escapeHtml(LAYOUT_PROFILE_LABELS[building.layout_profile] || "工艺消防平面")}</strong><span>${escapeHtml(building.name)} · 合成脱敏示意</span></div>
      ${planAsset ? `<div class="monitoring-plan-stage" style="--plan-aspect:${WORKSHOP_PLAN_ASPECTS[building.workshop_id] || "16 / 9"}">${planLayers}</div>` : planLayers}
    </div>`;
}
const localApiDefault = ["127.0.0.1", "localhost"].includes(location.hostname) ? "http://127.0.0.1:8000" : "";
const MONITORING_API_BASE = Object.prototype.hasOwnProperty.call(window, "FIREGUARD_API_BASE")
  ? String(window.FIREGUARD_API_BASE || "")
  : localApiDefault;
const OFFLINE_JUDGE_SCENARIO = {
  scenario_id: "B-confirmed-fire-battery-workorder",
  title: "确认火警：电池车间 PACK 缓存区两点报警",
  enterprise_id: "ent-001",
  input: {
    signal: { event_type: "fire_alarm", severity: "critical", payload: { device_ref: "pt-02-01-005", location: "电池车间 PACK 半成品缓存区" } },
    reporter_text: "PACK 半成品缓存区冒烟并见明火，南门手报已按下，现场人员正在疏散。",
    images: [{ asset: "assets/fire-floorplan.png", note: "电池车间平面图（合成）" }],
  },
  safe_failure: "Agent 只整理证据和起草处置建议；核实、派单与归档均由人确认。",
};
const ROLE_ACTOR_IDS = {
  company_management: "ehs-demo",
  control_room_operator: "duty-demo",
  fire_patrol: "patrol-demo",
  full_time_fire_brigade: "brigade-demo",
  workshop_ert: "ert-demo",
  facility_department: "facility-demo",
  maintenance_contractor: "contractor-demo",
  workshop_liaison: "liaison-demo",
};
const ACTOR_ROLE_IDS = {
  "ehs-demo": "company_management",
  "duty-demo": "control_room_operator",
  "inspector-demo": "fire_patrol",
  "crew-demo": "full_time_fire_brigade",
  "owner-demo": "workshop_liaison",
  "patrol-demo": "fire_patrol",
  "brigade-demo": "full_time_fire_brigade",
  "ert-demo": "workshop_ert",
  "facility-demo": "facility_department",
  "contractor-demo": "maintenance_contractor",
  "liaison-demo": "workshop_liaison",
};
const ROUTE_MODULES = {
  home: "home", incidents: "emergency", workflow: "emergency", copilot: "emergency",
  inspections: "prevention", owner: "prevention",
  analysis: "analysis", weekly: "analysis", review: "analysis", monitoring: "assets", enterprises: "assets",
};
const ROLE_SCOPE_LABELS = { factory: "全厂", assigned_workshop: "本车间", assigned_workorder: "已分配工单", assigned_incident: "已分配事件" };
const UI_ACTION_ROLES = {
  "verify-signal": ["control_room_operator"],
  "dismiss-monitoring-event": ["control_room_operator"],
  "confirm-device-signal": ["control_room_operator"],
  "dismiss-device-signal": ["control_room_operator"],
  "assign-patrol-verification": ["control_room_operator"],
  "report-onsite-confirmed": ["fire_patrol"],
  "report-onsite-dismissed": ["fire_patrol"],
  "dispatch-incident": ["control_room_operator"],
  "notify-incident-ert": ["control_room_operator"],
  "ack-incident-ert": ["workshop_ert"],
  "close-incident": ["control_room_operator"],
  "start-radio-command": ["control_room_operator"],
  "locate-radio-fire": ["control_room_operator"],
  "submit-radio-transcript": ["control_room_operator"],
  "confirm-radio-facilities": ["control_room_operator"],
  "finish-radio-command": ["control_room_operator"],
  "approve-inbox-workorder": ["facility_department"],
  "station-next-action": ["full_time_fire_brigade", "maintenance_contractor"],
  "submit-first-report": ["full_time_fire_brigade"],
  "start-inbox-workorder": ["maintenance_contractor", "workshop_liaison"],
  "complete-inbox-workorder": ["maintenance_contractor", "workshop_liaison"],
  "accept-inbox-workorder": ["facility_department"],
  "reject-inbox-workorder": ["facility_department"],
  "open-inspect-capture": ["fire_patrol"],
  reinspect: ["fire_patrol"],
  "scan-maintenance": ["facility_department"],
  "approve-maintenance-plan": ["facility_department"],
  "start-maintenance-plan": ["maintenance_contractor"],
  "complete-maintenance-plan": ["maintenance_contractor"],
  "accept-maintenance-plan": ["facility_department"],
  "ack-maintenance-sla": ["facility_department"],
  "save-report": ["control_room_operator"],
  regenerate: ["control_room_operator"],
  "confirm-report": ["control_room_operator"],
  "confirm-review-meeting": ["control_room_operator"],
  "confirm-review-report": ["control_room_operator"],
};
let activeRoleId = localStorage.getItem("fireops-active-role") || ACTOR_ROLE_IDS[localStorage.getItem("fireops-demo-actor")] || "company_management";
if (!ROLE_ACTOR_IDS[activeRoleId]) activeRoleId = "company_management";
let demoActorId = ROLE_ACTOR_IDS[activeRoleId];
const actorHeaders = (actorId = demoActorId) => ({ "Content-Type": "application/json", "X-FireOps-Actor": actorId });
const DEMO_INSPECT_ASSETS = [
  "assets/evidence-extinguisher-blocked.png",
  "assets/evidence-exit-sign-fault.png",
  "assets/evidence-control-room-log.png",
];
let inspectCapture = {
  imageAsset: DEMO_INSPECT_ASSETS[0],
  voiceText: "",
  draft: null,
  findingId: null,
  busy: false,
  recognition: null,
};
let dynamicIssues = [];
let maintenanceDrafts = [];
let maintenanceOpsState = {
  plans: [
    { id: "MP-2026-0831", title: "火警主机回路巡检", asset: "机2火警主机", cycle: "每月", due: "2026-08-31 18:00", owner: "设施维保组", qualification: "高级技能以上（由设施部门核验）", status: "awaiting_approval", evidence: "" },
    { id: "MP-2026-0901", title: "自动喷水末端试水", asset: "涂装车间 2F 末端试水装置", cycle: "每周", due: "2026-09-01 09:00", owner: "设施维保组", qualification: "高级技能以上（由设施部门核验）", status: "planned", evidence: "" },
    { id: "MP-2026-0829", title: "消防泵自动启动测试", asset: "消防泵组 FP-01", cycle: "每周", due: "2026-08-29 15:00", owner: "设施维保组", qualification: "高级技能以上（由设施部门核验）", status: "done", evidence: "TEST-20260829-03" },
  ],
  spares: [
    { id: "SP-DET-01", name: "点型感烟探测器", stock: 8, minimum: 5, unit: "只" },
    { id: "SP-ISO-01", name: "回路隔离模块", stock: 3, minimum: 4, unit: "只" },
    { id: "SP-BAT-01", name: "24V 备电电池", stock: 4, minimum: 2, unit: "组" },
  ],
  slaAlerts: [
    { id: "SLA-FAULT-008", title: "主机故障工单距离 24 小时期限不足 6 小时", owner: "消防设施部门", acknowledged: false },
  ],
  logs: [
    { time: "2026-08-29 15:32", plan: "消防泵自动启动测试", result: "通过", evidence: "TEST-20260829-03", safety: "测试期间安排专人值守并保持备用泵可用" },
  ],
  draft: { planId: null, result: "", note: "", spareId: "none", safety: "" },
};
let copilotState = {
  scenarios: null, selectedId: null, mode: "scenario",
  phase: "select", eventId: null, run: null, verification: null, dispatch: null, busy: false,
  verificationActor: null, dispatchActor: null,
  judgeMode: false, judgeProgress: [], offline: false,
  bindSource: "scenario", // scenario | hub
  hubEventId: null,
  hubEnterpriseId: null,
};
let monitoringBackend = { status: "connecting", summary: null, enterpriseIds: companies.map((company) => company.id) };
let monitoringEventSource = null;
let monitoringInitialized = false;
let monitoringRefreshTimer = null;
let incidentBackend = {
  status: "connecting", signals: [], incidents: [], stations: [], station: null, tasks: [],
  inbox: [], repairDrafts: [],
};
let incidentEventSource = null;
let incidentRefreshTimer = null;
let incidentRefreshVersion = 0;
let incidentInitialized = false;
let selectedSignalEventId = null;
let selectedIncidentId = null;
let selectedStationTaskId = null;
let selectedInboxId = null;
let terminalStationId = "crew-wx-01";
let terminalOwnerName = "张伟";
let enterpriseDossierState = { id: null, data: null, loading: false, error: "" };
let threeDFallbackTimer = null;
const CREW_OPTIONS = [
  { id: "crew-wx-01", label: "微型消防站·西区" },
  { id: "crew-wb-01", label: "消防设施维保组（维修/维保）" },
  { id: "crew-wx-02", label: "微型消防站·东区" },
];
const JUDGE_TOUR_STEPS = [
  { id: "overview", scenario: "fire-confirmed", source: ["fc-01", "fc-01"], role: "company_management", route: "#/home", title: "全厂消防态势总览", detail: "管理层先看到全厂建筑、火警、巡查隐患和维保工单。电池车间风险点已高亮，随后进入应急处置。", result: "同一厂区视图汇总三条业务链，管理层保持只读", action: { kind: "inspect", target: "#monitoring-3d", fallback: ".management-command", label: "查看高亮建筑与全厂指标" } },
  { id: "alarm", scenario: "fire-confirmed", source: ["fc-01", "fc-02"], role: "control_room_operator", route: "#/monitoring", title: "报警接入、定位与最佳路线", detail: "火警主机信号进入平台，系统定位到电池车间 2F PACK 产线 A1，并给出室外集结点、车间入口和到场步骤。", result: "设备事件、2D 点位和推荐入口均已显示", action: { kind: "click", target: "[data-enter-workshop='ent-001']", fallback: "#monitoring-3d", label: "进入车间查看推荐入口与到场步骤" } },
  { id: "analysis", scenario: "fire-confirmed", source: ["fc-02", "fc-02"], role: "control_room_operator", route: "#/copilot", title: "AI 证据研判与人工闸门", detail: "值班员查看 Agent 调用过的业务工具、采用的信息、缺失字段和风险提示；AI 只生成核实草稿，火警结论仍由现场人员确认。", result: "工具轨迹和证据来源可追溯，核实决定仍由人作出", action: { kind: "inspect", target: ".copilot-trace", fallback: ".copilot-approval", label: "核对工具轨迹、证据来源与人工闸门" } },
  { id: "verification", scenario: "fire-confirmed", source: ["fc-03", "fc-05"], role: "fire_patrol", route: "#/incidents", title: "巡查人员现场核实", detail: "巡查人员收到点位、楼层和推荐入口，到场后反馈发现明火。", result: "真实火警已由人工确认", action: { kind: "click", target: "[data-action='report-onsite-confirmed']", label: "点击“巡查反馈真实火警”", after: { resultTarget: ".signal-chip.danger" } } },
  { id: "dispatch", scenario: "fire-confirmed", source: ["fc-06", "fc-07c"], role: "control_room_operator", route: "#/incidents", title: "消控室升级并调派", detail: "现场确认明火后，值班员在同一处置台调派专职消防队和对应车间 ERT。", result: "处置任务、最佳入口和岗位简报已同步", action: { kind: "click", target: "[data-action='dispatch-incident']", fallback: ".incident-dispatch", label: "值班员人工确认调派" } },
  { id: "response", scenario: "fire-confirmed", source: ["fc-08", "fc-13"], role: "full_time_fire_brigade", route: "#/station?crew_id=crew-wx-01", title: "消防队签收并到场", detail: "专职消防队接收危险源、优先入口和人员信息，按任务卡出动并反馈到场。", result: "现场处置状态持续回传消控室", action: { kind: "fill", target: "#report-situation", fallback: ".first-report", value: "明火已扑灭，人员全部撤离，现场继续监护复燃风险。", label: "填写并提交现场处置反馈", after: { selectTarget: "#report-people", selectValue: "no_risk", submitTarget: "[data-action='submit-first-report']", resultTarget: ".report-received" } } },
  { id: "feedback", scenario: "fire-confirmed", source: ["fc-13", "fc-13"], role: "control_room_operator", route: "#/incidents", title: "对讲指挥与设施反馈", detail: "平台从监听模式进入应急状态，整理现场对讲、关键时间和设施反馈；值班员核对后结束事件。", result: "指挥台已记录火点、ERT、人员与消防设施状态", action: { kind: "click", target: "[data-action='start-radio-command']", fallback: "#radio-command-console", label: "启动指挥台并核对现场信息", after: { resultTarget: "[data-radio-message]", sequence: [
    { target: "[data-action='locate-radio-fire']", label: "从对讲中定位明火", resultTarget: "[data-action='confirm-radio-facilities']" },
    { target: "[data-action='confirm-radio-facilities']", label: "核对应急广播等设施状态", resultTarget: "[data-action='finish-radio-command']" },
    { target: "[data-action='finish-radio-command']", label: "人工结束指挥并生成战评", resultTarget: "[data-radio-report-ready]" },
    { target: "[data-action='close-incident']", label: "核验现场反馈并归档", resultTarget: ".judge-complete" }
  ] } } },
  { id: "archive", scenario: "fire-confirmed", source: ["fc-14", "fc-16"], role: "control_room_operator", route: "#/incidents", title: "流程闭环与出警报告", detail: "系统汇总出警报告、参与人员清单和战评会议待办，全程保留来源记录。", result: "事件进入战评与改进行动阶段", action: { kind: "inspect", target: ".incident-timeline", fallback: ".incident-console", label: "检查事件闭环时间线" } },
  { id: "review", scenario: "fire-confirmed", source: ["fc-14", "fc-16"], role: "company_management", route: "#/review/OFFLINE-INC-001", title: "管理层复盘", detail: "管理层查看出警报告、处置时效和改进行动，只读查看，不介入一线操作。", result: "结构化战评 Word 已导出，真实火警闭环完成", action: { kind: "click", target: "[data-judge-review-export]", fallback: ".incident-review-page", label: "导出结构化战评 Word" } },
  { id: "false-alarm", scenario: "false-alarm-maintenance", source: ["fa-01", "fa-06"], role: "control_room_operator", route: "#/monitoring", title: "误报核实并转故障", detail: "巡查人员按推荐路线到达涂装车间并反馈无火情；消控室登记误报，故障自动进入设施部门待办。", result: "报警已关闭，关联故障工单草稿已建立", action: { kind: "click", target: "[data-action='dismiss-monitoring-event']", fallback: ".monitoring-human-gate", label: "点击“登记误报并关闭”" } },
  { id: "maintenance", scenario: "false-alarm-maintenance", source: ["fa-07", "fa-13"], role: "facility_department", route: "#/station?crew_id=crew-wb-01", title: "设施维保与验收关闭", detail: "设施部门审核并派发，维保单位开工、提交测试证据；最终由设施部门验收关闭。", result: "维保单位不能自行关闭，验收责任保持分离", action: { kind: "click", target: "[data-action='approve-inbox-workorder']", fallback: ".station-task-detail", label: "确认派发后依次演示维保开工、提交完工和设施验收", after: { resultTarget: "[data-action='start-inbox-workorder']", sequence: [
    { role: "maintenance_contractor", target: "[data-action='start-inbox-workorder']", label: "维保单位开始处理", resultTarget: "[data-action='complete-inbox-workorder']" },
    { target: "[data-action='complete-inbox-workorder']", label: "维保单位提交完工证据", resultTarget: "[data-workorder-status='acceptance_pending']" },
    { role: "facility_department", target: "[data-action='accept-inbox-workorder']", label: "设施部门独立验收关闭", resultTarget: "[data-workorder-status='done']" }
  ] } } },
  { id: "inspection", scenario: "inspection-rectification", source: ["ir-01", "ir-03"], role: "fire_patrol", route: "#/inspections", title: "巡查计划与现场发现", detail: "巡查人员按计划检查重点区域，照片和口述先生成隐患草稿，确认后才进入整改流程。", result: "隐患候选经人工确认后已派发车间整改", action: { kind: "click", target: "[data-action='open-inspect-capture']", fallback: ".inspection-shell", label: "打开巡查识别并填写口述", after: { fieldTarget: "#inspect-voice-text", value: "PACK 通道东侧灭火器被物料箱挡住了，请车间问题对接人处理。", submitTarget: "#inspect-analyze-btn", resultTarget: "#inspect-draft-panel .inspect-draft-card", sequence: [
    { target: "#inspect-dispatch-btn", label: "巡查员人工确认并派发", resultTarget: "[data-action='complete-inbox-workorder']" }
  ] } } },
  { id: "rectification", scenario: "inspection-rectification", source: ["ir-04", "ir-06"], role: "workshop_liaison", route: "#/owner", title: "车间整改与证据回传", detail: "车间问题对接人清除通道遮挡，上传整改后照片；没有图片不能提交复查。", result: "整改照片已回传，任务转交巡查人员复查", action: { kind: "click", target: "[data-action='use-demo-rectification-evidence']", fallback: ".station-task-detail", label: "上传整改后现场照片", after: { resultTarget: "[data-rectification-evidence-ready]", sequence: [
    { target: "[data-action='complete-inbox-workorder']", label: "提交整改并等待复查", resultTarget: "[data-workorder-status='done']" }
  ] } } },
  { id: "reinspection", scenario: "inspection-rectification", source: ["ir-07", "ir-08"], role: "fire_patrol", route: "#/inspections", title: "巡查复查闸门", detail: "巡查人员复核现场与整改证据；通过后关闭，不通过则退回原责任人继续整改。", result: "巡查独立复查通过后，隐患才标记闭环", action: { kind: "click", target: "[data-action='reinspect']", fallback: ".issues-list", label: "打开复查记录并由巡查人员确认闭环", after: { submitTarget: "#start-reinspection", resultTarget: "#start-reinspection[data-reinspection-status='closed']" } } },
  { id: "weekly", scenario: "inspection-rectification", source: ["ir-09", "ir-09"], role: "company_management", route: "#/weekly", title: "全厂周报与改进建议", detail: "平台汇总火警、巡查、整改和设施故障，按车间与问题类型形成周报和改进建议。", result: "三条业务链进入同一管理视图，完整演示结束", action: { kind: "click", target: "[data-action='weekly-export']", fallback: ".weekly-report-header", label: "导出正式周报" } },
];
const JUDGE_TOUR_CHAPTERS = [
  { id: "fire", label: "01 真实火警闭环", start: 0, end: 8 },
  { id: "maintenance", label: "02 误报转维保", start: 9, end: 10 },
  { id: "inspection", label: "03 巡查整改复查", start: 11, end: 14 },
];
const JUDGE_TOUR_RESULT_HOLD = 6500;
const JUDGE_TOUR_NAV_HOLD = 1200;
const JUDGE_TOUR_SCAN_HOLD = 900;
let judgeTour = { active: false, paused: false, index: 0, stepStartedAt: 0, actionPhase: "准备演示", timer: null, actionTimer: null, typingTimer: null, restore: null };
let reviewState = { meetingConfirmed: false, reportConfirmed: false };
let rectificationEvidence = null;
const RADIO_COMMAND_MESSAGES = [
  { time: "10:29:04", source: "防火巡查人员", group: "调度组", location: "电池车间 2F", kind: "现场事实", text: "PACK 半成品缓存区发现明火和浓烟，请求升级处置。", evidence: "radio/FIRE-001-02" },
  { time: "10:29:08", source: "AI 结构化", group: "事实提取", location: "PACK 产线 A1", kind: "高置信事实", text: "已识别：明火、浓烟、具体点位；火情结论仍待值班员确认。", evidence: "asr/FIRE-001-02" },
  { time: "10:31:22", source: "消控室值班员", group: "应急组", location: "消控室", kind: "人工指令", text: "立即启动应急预案，专职消防队与车间 ERT 按南门路线进入。", evidence: "radio/FIRE-001-03" },
  { time: "10:32:18", source: "专职消防队", group: "现场组", location: "车间南门", kind: "设施反馈", text: "排烟风机已启动，消防泵运行信号待现场复核。", evidence: "radio/FIRE-001-04" },
  { time: "10:33:02", source: "车间 ERT", group: "疏散组", location: "PACK 产线 A1", kind: "人员状态", text: "人员疏散完成，无人员被困；现场正在清点。", evidence: "radio/FIRE-001-05" },
];
const RADIO_COMMAND_FACILITIES = [
  { id: "fire-panel", name: "火灾报警控制器", state: "报警信号已接收", confirmed: true },
  { id: "emergency-broadcast", name: "应急广播", state: "等待对讲确认", confirmed: false },
  { id: "sprinkler", name: "自动喷水系统", state: "等待现场反馈", confirmed: false },
  { id: "smoke-exhaust", name: "排烟风机", state: "等待现场反馈", confirmed: false },
  { id: "fire-pump", name: "消防泵", state: "运行信号待人工复核", confirmed: false },
];

function buildRadioCommandState({ active = false, verified = false, complete = false } = {}) {
  return {
    status: complete ? "closed" : active ? "active" : "idle",
    wakeWord: active ? "立即启动应急预案" : "",
    messages: active ? structuredClone(RADIO_COMMAND_MESSAGES) : [],
    facilities: RADIO_COMMAND_FACILITIES.map((item) => verified ? { ...item, confirmed: true, state: item.confirmed ? item.state : "现场人工复核：运行正常" } : { ...item }),
    reportReady: complete,
  };
}

let radioCommandState = buildRadioCommandState();
let latestAssessment = {
  ruleVersion: DEMO_RULESET,
  enterpriseId: "ent-001",
  enterpriseName: "电池车间（PACK/化成）",
  dataCutoff: "2026-07-29T12:00:00+08:00",
  inputHash: "fg-demo-preview",
  totalScore: 58,
  riskLevel: "high",
  triggeredRules: [
    { code: "FG-ALARM-01", title: "报警系统故障频率增加", deduction: 14, metric: "18 / 5", evidence: ["demo/alarm/001"] },
    { code: "FG-IOT-01", title: "设备长时间离线", deduction: 10, metric: "30 小时", evidence: ["demo/iot/ark-gw-01"] },
    { code: "FG-RECT-01", title: "隐患整改逾期", deduction: 10, metric: "1 项", evidence: ["demo/finding/001"] },
    { code: "FG-REPEAT-01", title: "重复隐患", deduction: 8, metric: "3 次", evidence: ["demo/finding/001", "demo/finding/002", "demo/finding/003"] },
  ],
};

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

function selectedCompany() {
  return companies.find((company) => company.id === selectedCompanyId) || companies[0];
}

function selectedIssue() {
  const catalog = allIssues();
  return catalog.find((issue) => issue.id === selectedIssueId) || catalog[0];
}

function scoreText(value) {
  return value === null ? "—" : value;
}

function riskBadge(company) {
  return `<span class="risk-badge risk-${company.level}">${company.levelLabel}</span>`;
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function roleDefinition(roleId) {
  const base = window.FireGuardEngine.roleDefinitions().find((role) => role.id === roleId);
  const contract = semifinalRoleContract.find((role) => role.id === roleId);
  if (!base || !contract) return base;
  return {
    ...base,
    label: contract.label,
    scope: contract.scope,
    visibleModules: contract.visible_modules,
    allowedActions: contract.allowed_actions,
    forbiddenActions: contract.forbidden_actions,
    dataVisibility: contract.data_visibility,
  };
}

function activeRoleDefinition() {
  return roleDefinition(activeRoleId) || roleDefinition("control_room_operator");
}

function setActiveRole(roleId) {
  if (!ROLE_ACTOR_IDS[roleId]) return;
  activeRoleId = roleId;
  demoActorId = ROLE_ACTOR_IDS[roleId];
  localStorage.setItem("fireops-active-role", roleId);
  localStorage.setItem("fireops-demo-actor", demoActorId);
  const actorSelect = document.querySelector("#demo-actor");
  if (actorSelect) actorSelect.value = roleId;
}

function setDemoActor(actorId) {
  setActiveRole(ROLE_ACTOR_IDS[actorId] ? actorId : ACTOR_ROLE_IDS[actorId] || activeRoleId);
}

function routeModule(root) {
  if (root === "station" && ["full_time_fire_brigade", "workshop_ert"].includes(activeRoleId)) return "emergency";
  if (root === "station") return "operations";
  return ROUTE_MODULES[root] || "home";
}

function updateRoleNavigation(root) {
  const role = activeRoleDefinition();
  const visibleModules = new Set(role.modules);
  document.querySelectorAll("[data-module]").forEach((item) => {
    item.hidden = !visibleModules.has(item.dataset.module);
  });
  const activeModule = routeModule(root);
  document.querySelectorAll("[data-top-nav]").forEach((item) => item.classList.toggle("active", item.dataset.topNav === activeModule));
  document.querySelectorAll("[data-mobile-nav]").forEach((item) => item.classList.toggle("active", item.dataset.mobileNav === activeModule));
}

function applyRoleActionPermissions() {
  document.querySelectorAll("[data-role-disabled='true']").forEach((element) => {
    element.disabled = false;
    element.removeAttribute("aria-disabled");
    element.removeAttribute("title");
    delete element.dataset.roleDisabled;
  });
  let restricted = 0;
  app.querySelectorAll("[data-action]").forEach((element) => {
    const roles = UI_ACTION_ROLES[element.dataset.action];
    if (!roles || roles.includes(activeRoleId)) return;
    element.disabled = true;
    element.dataset.roleDisabled = "true";
    element.setAttribute("aria-disabled", "true");
    element.title = `当前角色不可执行；责任岗位：${roles.map((id) => roleDefinition(id)?.label || id).join("、")}`;
    restricted += 1;
  });
  app.querySelectorAll("[data-copilot-verify], [data-copilot-action='run'], [data-copilot-action='judge-run'], [data-copilot-action='dispatch'], [data-copilot-action='offline-archive']").forEach((element) => {
    if (activeRoleId === "control_room_operator") return;
    element.disabled = true;
    element.dataset.roleDisabled = "true";
    element.setAttribute("aria-disabled", "true");
    element.title = "处置研判和人工闸门由消控室值班员执行";
    restricted += 1;
  });
  [document.querySelector("#inspect-dispatch-btn"), document.querySelector("#start-reinspection")].filter(Boolean).forEach((element) => {
    if (activeRoleId === "fire_patrol") return;
    element.disabled = true;
    element.dataset.roleDisabled = "true";
    element.setAttribute("aria-disabled", "true");
    element.title = "隐患派发和复查由防火巡查人员执行";
  });
  if (!restricted || app.querySelector(".role-scope-notice")) return;
  app.firstElementChild?.insertAdjacentHTML("afterbegin", `<div class="role-scope-notice" role="status"><i data-lucide="eye"></i><span><strong>${escapeHtml(activeRoleDefinition().label)}查看模式</strong>本页有 ${restricted} 个操作属于其他岗位，已按权限禁用。</span></div>`);
}

function routeHash(root, context = {}) {
  const params = new URLSearchParams(Object.entries(context).filter(([, value]) => value !== null && value !== undefined && value !== ""));
  return `#/${root}${params.size ? `?${params}` : ""}`;
}

function applyRouteContext(params) {
  const enterpriseId = params.get("enterprise_id");
  if (enterpriseId && companies.some((company) => company.id === enterpriseId)) selectedCompanyId = enterpriseId;
  const eventId = Number(params.get("event_id"));
  if (eventId) selectedSignalEventId = eventId;
  const workorderId = Number(params.get("workorder_id"));
  if (workorderId) selectedInboxId = `workorder-${workorderId}`;
  const findingId = Number(params.get("finding_id"));
  if (findingId) selectedIssueId = `finding-${findingId}`;
  const incidentId = Number(params.get("incident_id"));
  if (incidentId) selectedIncidentId = incidentId;
  const crewId = params.get("crew_id");
  if (crewId && CREW_OPTIONS.some((crew) => crew.id === crewId)) terminalStationId = crewId;
  const owner = params.get("owner");
  if (owner && OWNER_OPTIONS.includes(owner)) terminalOwnerName = owner;
}

function enterpriseContext(extra = {}) {
  const context = { enterprise_id: selectedCompanyId, ...extra };
  const dossier = enterpriseDossierState.id === selectedCompanyId ? enterpriseDossierState.data : null;
  return {
    ...context,
    event_id: context.event_id ?? dossier?.next_context?.event_id,
    workorder_id: context.workorder_id ?? dossier?.next_context?.workorder_id,
    finding_id: context.finding_id ?? dossier?.next_context?.finding_id,
  };
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
}

function riskLabel(level) {
  return { high: "高风险", medium: "中风险", low: "低风险", unrated: "待补全" }[level] || "待补全";
}

function updateMonitoringConnection(status) {
  monitoringBackend.status = status;
  const indicator = document.querySelector("[data-monitoring-connection]");
  if (!indicator) return;
  indicator.className = `monitoring-connection ${status}`;
  indicator.innerHTML = `<b></b>${status === "live" ? "后端实时连接" : status === "connecting" ? "正在连接后端" : "使用本地演示数据"}`;
}

function monitoringFreshness(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "时间未知";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 2) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  return `${Math.round(minutes / 60)} 小时前`;
}

function applyBackendEnterprises(items) {
  if (!Array.isArray(items)) throw new Error("monitoring_enterprises_invalid");
  monitoringBackend.enterpriseIds = items.map((item) => item.id).filter((id) => companies.some((company) => company.id === id));
  items.forEach((item) => {
    const company = companies.find((entry) => entry.id === item.id);
    if (!company) return;
    company.name = item.name;
    company.industry = item.industry;
    company.building = item.building;
    company.score = item.risk_level === "unrated" ? null : item.health_score;
    company.level = item.risk_level;
    company.levelLabel = riskLabel(item.risk_level);
    company.openHazards = item.open_hazards;
    monitoringProfiles[item.id] = {
      district: item.district,
      online: `${Math.round(item.online_rate)}%`,
      signal: item.pending_signal_count ? `设备火警信号 ${item.pending_signal_count} 条` : "无未核实火警信号",
      fault: `报警系统故障 ${item.fault_count_30d} 次`,
      maintenance: item.maintenance_overdue ? `维保逾期 ${item.maintenance_overdue} 项` : "维保计划正常",
      freshness: monitoringFreshness(item.last_seen_at),
    };
  });
}

function scheduleMonitoringRefresh() {
  clearTimeout(monitoringRefreshTimer);
  monitoringRefreshTimer = setTimeout(refreshMonitoringFromBackend, 120);
}

async function refreshMonitoringFromBackend() {
  if (!MONITORING_API_BASE) return updateMonitoringConnection("offline");
  try {
    const [summaryResponse, enterprisesResponse] = await Promise.all([
      fetch(`${MONITORING_API_BASE}/monitoring/summary`),
      fetch(`${MONITORING_API_BASE}/monitoring/enterprises`),
    ]);
    if (!summaryResponse.ok || !enterprisesResponse.ok) throw new Error("monitoring_api_unavailable");
    monitoringBackend.summary = await summaryResponse.json();
    const enterprisesPayload = await enterprisesResponse.json();
    applyBackendEnterprises(enterprisesPayload.items);
    updateMonitoringConnection("live");
    if ((location.hash || "#/home").startsWith("#/monitoring")) renderRoute();
  } catch {
    updateMonitoringConnection("offline");
  }
}

function startMonitoringBackend() {
  if (judgeTour.active || !MONITORING_API_BASE) {
    updateMonitoringConnection("offline");
    return;
  }
  if (!monitoringInitialized) {
    monitoringInitialized = true;
    refreshMonitoringFromBackend();
  }
  if (monitoringEventSource) return;
  updateMonitoringConnection("connecting");
  monitoringEventSource = new EventSource(`${MONITORING_API_BASE}/monitoring/events/stream`);
  monitoringEventSource.addEventListener("open", () => {
    updateMonitoringConnection("live");
    scheduleMonitoringRefresh();
  });
  monitoringEventSource.addEventListener("monitoring", scheduleMonitoringRefresh);
  monitoringEventSource.addEventListener("error", () => updateMonitoringConnection("offline"));
}

function stopMonitoringBackend() {
  monitoringEventSource?.close();
  monitoringEventSource = null;
  monitoringInitialized = false;
  clearTimeout(monitoringRefreshTimer);
}

async function postMonitoringEvent(eventType, successMessage) {
  try {
    const response = await fetch(`${MONITORING_API_BASE}/monitoring/events`, {
      method: "POST",
      headers: actorHeaders(),
      body: JSON.stringify({
        enterprise_id: selectedCompanyId,
        event_type: eventType,
        severity: eventType === "verification_requested" ? "info" : "high",
        source: "fireops_demo_console",
        payload: { synthetic: true },
      }),
    });
    if (!response.ok) throw new Error("monitoring_event_failed");
    showToast(successMessage);
    scheduleMonitoringRefresh();
  } catch {
    showToast("后端未连接，事件没有写入数据库");
  }
}

function createLocalMaintenanceWorkorder(event, { workorderId = `LOCAL-MAINT-${Date.now()}`, summary } = {}) {
  const enterpriseId = event.enterpriseId || selectedCompanyId;
  const company = companies.find((item) => item.id === enterpriseId) || selectedCompany();
  const workorder = {
    inbox_id: `workorder-${workorderId}`, source: "ops_workorder", workorder_id: workorderId,
    event_id: event.id, source_event_id: event.id, enterprise_id: enterpriseId, kind: "maintenance",
    enterprise_name: company.name, summary: summary || `${event.point}主机故障，待设施部门审核派发`,
    owner: "消防设施部门", crew_id: "crew-wb-01", status: "draft", sla_status: "tracking",
    created_at: new Date().toISOString(), due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    missing_fields: ["故障原因明细"], acceptance_log: [],
  };
  incidentBackend.status = "offline";
  incidentBackend.inbox = [workorder, ...incidentBackend.inbox.filter((item) => item.source_event_id !== event.id)];
  incidentBackend.repairDrafts = [workorder, ...incidentBackend.repairDrafts.filter((item) => item.source_event_id !== event.id)];
  terminalStationId = "crew-wb-01";
  selectedInboxId = workorder.inbox_id;
  return workorder;
}

// 「模拟 Modbus 报警帧」走真实网关链路：帧解析 -> 点位表定位 -> 落库。
async function postDemoModbusFrame(frameHex, { jumpToVerify = true } = {}) {
  const hex = frameHex || demoAlarmFrames[selectedCompanyId];
  if (!hex) return showToast("该单元没有预置报警帧");
  if (monitoringBackend.status !== "live") {
    const type = hex === demoFaultFrame ? "fault" : "fire";
    monitoringState.events = window.FireGuardEngine.createMonitoringEvent(monitoringState.events, type, selectedCompanyId);
    const event = monitoringState.events[0];
    monitoringState.selectedId = event.id;
    monitoringState.filter = "pending";
    monitoringState.floor = event.floor;
    monitoringState.tab = "location";
    if (type === "fault") {
      createLocalMaintenanceWorkorder(event);
      showToast("已加入本地故障事件并生成维保草稿，等待设施部门确认派发");
    } else {
      showToast("已加入本地火警事件，等待人工核实");
    }
    renderRoute();
    return;
  }
  try {
    const response = await fetch(`${MONITORING_API_BASE}/gateway/modbus/frames`, {
      method: "POST",
      headers: actorHeaders(),
      body: JSON.stringify({ frame_hex: hex, gateway_id: "ark-gw-demo" }),
    });
    if (!response.ok) throw new Error("gateway_ingest_failed");
    const payload = await response.json();
    const decoded = payload.decoded || {};
    const event = payload.event || {};
    const eventType = decoded.event_type || event.event_type;
    showToast(`已解析报警帧：机${decoded.controller_no}回路${decoded.loop_no}点位${decoded.point_no} ${decoded.location || ""}`);
    scheduleMonitoringRefresh();
    if (eventType === "fire_alarm" && event.id && jumpToVerify) {
      selectedSignalEventId = event.id;
      showToast("火警已入待核实队列，正在打开核实台…");
      location.hash = routeHash("incidents", { enterprise_id: selectedCompanyId, event_id: event.id });
      scheduleIncidentRefresh();
    } else if (eventType === "fault" && event.id) {
      showToast("故障已生成维修工单草稿，可到班组终端（维保组）或 FireOps AI 辅助研判确认派发");
      terminalStationId = "crew-wb-01";
      selectedInboxId = null;
      location.hash = routeHash("station", { enterprise_id: selectedCompanyId, event_id: event.id });
      scheduleIncidentRefresh();
    }
  } catch {
    showToast("实时链路暂不可用，已保留当前页面状态");
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function incidentTime(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "--:--";
}

async function refreshIncidentBackend(requestVersion = ++incidentRefreshVersion) {
  if (judgeTour.active) return;
  if (!MONITORING_API_BASE) {
    incidentBackend.status = "offline";
    ensureOfflineIncidentDemo();
    return;
  }
  const routeAtStart = (location.hash || "").split("?")[0];
  const isStale = () => requestVersion !== incidentRefreshVersion || !(location.hash || "").startsWith(routeAtStart);
  try {
    const overviewResponse = await fetch(`${MONITORING_API_BASE}/incidents/overview`);
    if (!overviewResponse.ok) throw new Error("incident_api_unavailable");
    const overview = await overviewResponse.json();
    if (isStale()) return;
    Object.assign(incidentBackend, overview, { status: "live" });

    const dutyInbox = await fetch(`${MONITORING_API_BASE}/workbench/inbox?role=duty`);
    if (dutyInbox.ok) {
      const duty = await dutyInbox.json();
      if (isStale()) return;
      incidentBackend.repairDrafts = (duty.items || []).filter((item) => item.kind === "repair" && item.status === "draft");
    }

    if ((location.hash || "").startsWith("#/station")) {
      const inboxResponse = await fetch(
        `${MONITORING_API_BASE}/workbench/inbox?role=crew&crew_id=${encodeURIComponent(terminalStationId)}`,
      );
      if (!inboxResponse.ok) throw new Error("inbox_api_unavailable");
      const inbox = await inboxResponse.json();
      if (isStale()) return;
      incidentBackend.inbox = inbox.items || [];
      incidentBackend.station = (inbox.stations || []).find((item) => item.id === terminalStationId)
        || { id: terminalStationId, name: CREW_OPTIONS.find((item) => item.id === terminalStationId)?.label || terminalStationId, status: "available" };
      // 兼容旧处置任务详情：仍拉取 station tasks 供签收状态机使用
      const stationResponse = await fetch(`${MONITORING_API_BASE}/stations/${terminalStationId}/tasks`);
      if (stationResponse.ok) {
        const stationPayload = await stationResponse.json();
        if (isStale()) return;
        incidentBackend.tasks = stationPayload.tasks || [];
        if (stationPayload.station) incidentBackend.station = stationPayload.station;
      } else {
        incidentBackend.tasks = [];
      }
    }

    if ((location.hash || "").startsWith("#/owner")) {
      const inboxResponse = await fetch(
        `${MONITORING_API_BASE}/workbench/inbox?role=owner&owner=${encodeURIComponent(terminalOwnerName)}`,
      );
      if (!inboxResponse.ok) throw new Error("owner_inbox_unavailable");
      const inbox = await inboxResponse.json();
      if (isStale()) return;
      const localRectifications = (incidentBackend.inbox || []).filter((item) => item.source === "local_demo" && item.kind === "rectification" && item.owner === terminalOwnerName);
      incidentBackend.inbox = [...localRectifications, ...(inbox.items || []).filter((item) => !localRectifications.some((local) => local.inbox_id === item.inbox_id))];
      incidentBackend.station = { id: "owner", name: `车间问题对接人 · ${terminalOwnerName}`, status: "available" };
      incidentBackend.tasks = [];
    }

    if ((location.hash || "").startsWith("#/inspections")) {
      const findingsResponse = await fetch(`${MONITORING_API_BASE}/inspection/findings?enterprise_id=${encodeURIComponent(selectedCompanyId)}`);
      if (!findingsResponse.ok) throw new Error("inspection_findings_unavailable");
      const findings = await findingsResponse.json();
      if (isStale()) return;
      const localIssues = dynamicIssues.filter((issue) => !issue.findingId);
      dynamicIssues = [...(findings.items || []).map((finding, index) => findingToIssue(finding, index + 1)), ...localIssues];
    }

    selectedSignalEventId ||= incidentBackend.signals.find((item) => item.verification_status === "pending")?.monitoring_event_id || null;
    selectedIncidentId ||= incidentBackend.incidents[0]?.id || null;
    selectedStationTaskId ||= incidentBackend.tasks[0]?.id || null;
    selectedInboxId ||= incidentBackend.inbox[0]?.inbox_id || null;
    if (["#/incidents", "#/station", "#/owner", "#/inspections", "#/copilot", "#/workflow"].some((route) => (location.hash || "").startsWith(route))) {
      const reportDraft = document.querySelector("#report-situation")?.value;
      const peopleDraft = document.querySelector("#report-people")?.value;
      const focusedDraftId = document.activeElement?.closest?.(".first-report")?.querySelector?.(":focus")?.id;
      renderRoute();
      const reportField = document.querySelector("#report-situation");
      const peopleField = document.querySelector("#report-people");
      if (reportField && reportDraft !== undefined) reportField.value = reportDraft;
      if (peopleField && peopleDraft !== undefined) peopleField.value = peopleDraft;
      if (focusedDraftId) document.querySelector(`#${focusedDraftId}`)?.focus();
    }
  } catch {
    if (isStale()) return;
    incidentBackend.status = "offline";
    ensureOfflineIncidentDemo();
    if (["#/incidents", "#/station", "#/owner", "#/inspections", "#/copilot", "#/workflow"].some((route) => (location.hash || "").startsWith(route))) renderRoute();
  }
}

function scheduleIncidentRefresh() {
  const requestVersion = ++incidentRefreshVersion;
  clearTimeout(incidentRefreshTimer);
  incidentRefreshTimer = setTimeout(() => refreshIncidentBackend(requestVersion), 100);
}

function startIncidentBackend() {
  if (judgeTour.active || !MONITORING_API_BASE) {
    incidentBackend.status = "offline";
    ensureOfflineIncidentDemo();
    return;
  }
  if (!incidentInitialized) {
    incidentInitialized = true;
    scheduleIncidentRefresh();
  }
  if (incidentEventSource) return;
  incidentEventSource = new EventSource(`${MONITORING_API_BASE}/incidents/events/stream`);
  incidentEventSource.addEventListener("open", scheduleIncidentRefresh);
  incidentEventSource.addEventListener("incident", scheduleIncidentRefresh);
  incidentEventSource.addEventListener("error", () => { incidentBackend.status = "offline"; });
}

function stopIncidentBackend() {
  incidentEventSource?.close();
  incidentEventSource = null;
  incidentInitialized = false;
  clearTimeout(incidentRefreshTimer);
  incidentRefreshVersion += 1;
}

async function postIncidentAction(path, body, successMessage) {
  try {
    const response = await fetch(`${MONITORING_API_BASE}${path}`, {
      method: "POST", headers: actorHeaders(), body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "incident_action_failed");
    if (payload.incident?.id) selectedIncidentId = payload.incident.id;
    showToast(successMessage);
    await refreshIncidentBackend();
    return payload;
  } catch (error) {
    showToast(`操作未完成：${incidentErrorMessage(error.message)}`);
    return null;
  }
}

function incidentErrorMessage(code) {
  return {
    station_busy: "处置班组正在执行其他任务，请到处置进度继续当前工单",
    role_not_allowed: "当前身份无权执行此步骤，请按处置进度提示切换角色",
    close_before_report: "班组尚未提交现场反馈，暂不能归档",
    crew_unavailable: "当前没有可用的对应班组",
    verification_assignment_required: "请先由消控室派发巡查核实任务",
    feedback_conflict: "该信号已有不同的巡查反馈，不能重复改写",
  }[code] || code;
}

function workorderStatusLabel(status, kind = "") {
  if (status === "acceptance_pending") return "待设施部门验收";
  if (status === "done" && kind === "rectification") return "待巡查复查";
  return { draft: "待审批", approved: "待开工", in_progress: "处理中", acceptance_pending: "待设施部门验收", done: "已验收完成", closed: "已闭环" }[status] || status;
}

function timelineTemplate(incident) {
  if (!incident?.timeline?.length) return `<div class="incident-empty">暂无事件时间线</div>`;
  return `<ol class="incident-timeline">${incident.timeline.map((item) => `<li><time>${incidentTime(item.occurred_at)}</time><strong>${incidentEventLabel(item.event_type)}</strong><span>${escapeHtml(item.actor)}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</span></li>`).join("")}</ol>`;
}

function acceptanceTimelineTemplate(workorder) {
  const entries = workorder?.acceptance_log || [];
  if (!entries.length) return guidedEmpty("等待验收记录", ["承包商提交完工后，由消防设施部门复测并填写验收结论", "驳回将退回处理中，通过后才关闭工单"]);
  return `<ol class="incident-timeline">${entries.map((entry) => `<li><time>${incidentTime(entry.at)}</time><strong>${entry.result === "accepted" ? "验收通过" : "驳回返工"}</strong><span>${escapeHtml(entry.actor)}${entry.note ? ` · ${escapeHtml(entry.note)}` : ""}</span></li>`).join("")}</ol>`;
}

function workorderGovernanceTemplate(workorder) {
  const stages = ["故障接入", "人工审核", "维保开工", "提交测试证据", "设施部门验收", "工单关闭"];
  const rank = { draft: 0, approved: 1, in_progress: 2, acceptance_pending: 3, done: 5, closed: 5 }[workorder.status] ?? 0;
  const created = workorder.created_at || "2026-08-19T14:30:00+08:00";
  const due = workorder.due_at || new Date(new Date(created).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const missing = workorder.missing_fields || [];
  const stamp = (value) => value ? value.replace("T", " ").slice(0, 16) : "未记录";
  return `<section class="workorder-governance" data-workorder-governance>
    <header><div><span>24H FAULT GOVERNANCE</span><h3>主机故障 24 小时闭环</h3></div><b>${workorder.sla_status === "overdue" ? "已超时" : "计时中"}</b></header>
    <ol>${stages.map((stage, index) => `<li data-workorder-stage class="${index <= rank ? "done" : "pending"}"><i>${index + 1}</i><span>${stage}</span></li>`).join("")}</ol>
    <dl><div><dt>故障起点</dt><dd>${escapeHtml(stamp(created))}</dd></div><div><dt>24 小时期限</dt><dd>${escapeHtml(stamp(due))}</dd></div><div><dt>超时升级</dt><dd>上报消防安全责任人，并安排临时巡查</dd></div><div><dt>数据质量</dt><dd>${missing.length ? `缺少：${escapeHtml(missing.join("、"))}` : "必填节点完整"}</dd></div></dl>
    <p>人工填报空值单独标记，不推断为“未发生”或零时长，也不进入时效均值。</p>
  </section>`;
}

function radioCommandTemplate(incident) {
  if (!incident) return "";
  const active = radioCommandState.status === "active";
  const allConfirmed = radioCommandState.facilities.every((item) => item.confirmed);
  const canOperate = activeRoleId === "control_room_operator";
  const roleNote = canOperate ? "当前由消控室值班员操作" : `${activeRoleDefinition().label}只读查看；调派与设施确认由消控室完成`;
  const statusLabel = radioCommandState.status === "closed" ? "会话已归档" : active ? "应急指挥进行中" : "监听模式 · 等待唤醒";
  const intelligence = active || radioCommandState.status === "closed" ? [
    ["10:29:04", "发现明火", "电池车间 2F · PACK 产线 A1"],
    ["10:31:22", "启动应急响应", "专职消防队与车间 ERT 已呼叫"],
    ["10:32:18", "消防设施反馈", "排烟、消防泵与应急广播待确认"],
    ["10:33:02", "人员状态", "已完成疏散，无人员被困"],
  ] : [];
  return `<section id="radio-command-console" class="radio-command" data-radio-command>
    <header><div><span>消防智能作战指挥台</span><h2>报警核实、对讲指挥与设备反馈</h2><p>平台平时保持监听；识别到“发现明火”或“启动应急响应”后，才进入指挥状态并记录关键时间。</p><small class="radio-role-note">${escapeHtml(roleNote)}</small></div><b class="${radioCommandState.status}"><i></i>${statusLabel}</b></header>
    <div class="radio-command-grid">
      <aside class="radio-control"><header><h3>指挥控制台</h3><span>${active ? "系统运行中" : "监听中"}</span></header><p>监听关键词：发现明火、启动应急响应、呼叫 ERT。</p><button type="button" data-action="start-radio-command">启动应急响应</button><button type="button" data-action="locate-radio-fire">定位明火信息</button><section><h4>历史战评档案</h4><a href="#/review/${incident.id}">PACK 产线火警战评</a><a href="#/weekly">本周报警与整改报告</a></section></aside>
      <div class="radio-center">
        <section class="radio-transcript"><header><h3>实时语音流</h3><span>${radioCommandState.messages.length} 条已整理</span></header><ol>${radioCommandState.messages.length ? radioCommandState.messages.map((item) => `<li data-radio-message><time>${escapeHtml(item.time)}</time><span><b>${escapeHtml(item.source)} · ${escapeHtml(item.kind)}</b><small>${escapeHtml(item.location)} · ${escapeHtml(item.text)}</small><em>已记录</em></span></li>`).join("") : `<li class="radio-empty"><span><b>当前处于监听模式</b><small>出现关键语句后，系统会自动开始记录。</small></span></li>`}</ol><div class="radio-input"><label for="radio-command-input">补充一条现场对讲</label><textarea id="radio-command-input" maxlength="300" placeholder="例如：东侧排烟风机已启动，现场人工确认运行正常"></textarea><button type="button" data-action="submit-radio-transcript">记录现场反馈</button></div></section>
        <section class="radio-equipment"><header><h3>消防设备状态监控</h3><span>${radioCommandState.facilities.filter((item) => item.confirmed).length}/${radioCommandState.facilities.length} 已确认</span></header><ul>${radioCommandState.facilities.map((item) => `<li data-radio-facility="${item.id}" class="${item.confirmed ? "confirmed" : "pending"}"><i data-lucide="${item.confirmed ? "circle-check" : "circle-dashed"}"></i><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.state)}</small></span></li>`).join("")}</ul>${!allConfirmed ? `<button type="button" data-action="confirm-radio-facilities">核对对讲反馈并更新状态</button>` : `<em>设备状态已由值班员逐项复核</em>`}</section>
      </div>
      <aside class="radio-intelligence"><section><header><h3>实时情报</h3><span>关键字段</span></header>${intelligence.length ? `<ol>${intelligence.map(([time, title, detail]) => `<li><time>${time}</time><span><b>${title}</b><small>${detail}</small></span></li>`).join("")}</ol>` : `<p>等待唤醒后提取火点、人员、ERT 呼叫和设施反馈。</p>`}</section><section><header><h3>AI 战术研判</h3><span>辅助建议</span></header><p>${active || radioCommandState.status === "closed" ? "建议专职消防队从厂区南门进入，经消防车道抵达车间南门；车间 ERT 负责疏散清点，持续关注锂电池复燃风险。" : "系统进入应急状态后，基于对讲事实给出路线、人员和设施处置建议。"}</p><small>最终指令由现场总指挥确认。</small></section></aside>
    </div>
    <footer><span>本页只整理对讲和设备反馈，不自动控制现场设备。</span>${radioCommandState.reportReady ? `<a data-radio-report-ready href="#/review/${incident.id}"><i data-lucide="file-check-2"></i>查看战评报告</a>${incident.status !== "closed" ? `<button type="button" data-action="close-incident">核验现场反馈并归档</button>` : ""}` : active ? `<button type="button" data-action="finish-radio-command">人工结束并生成战评报告</button>` : ""}</footer>
  </section>`;
}

function incidentCommandTemplate() {
  const pendingSignals = incidentBackend.signals.filter((item) => item.verification_status === "pending");
  const signal = pendingSignals.find((item) => item.monitoring_event_id === selectedSignalEventId) || pendingSignals[0];
  const patrolAssignment = signal?.patrol_assignment;
  const onsiteFeedback = signal?.onsite_feedback;
  const onsiteResult = onsiteFeedback?.payload?.result;
  const incident = incidentBackend.incidents.find((item) => item.id === selectedIncidentId) || incidentBackend.incidents[0];
  // 火警处置只派微型消防站；维保组（crew-wb-*）走维修/维保工单，不进处置派单下拉。
  const stations = incident
    ? incidentBackend.stations.filter((item) => item.district === incident.district && String(item.id).startsWith("crew-wx"))
    : [];
  const availableStation = stations.find((item) => item.status === "available");
  const occupiedStation = stations.find((item) => item.status !== "available");
  const occupyingIncident = occupiedStation
    ? incidentBackend.incidents.find((item) => item.dispatch?.station_id === occupiedStation.id && item.status !== "closed")
    : null;
  const workflowState = incident ? incidentWorkflowState(incident) : null;
  const isJudgeIncident = copilotState.judgeMode && incident?.id === copilotState.run?.incident_id;
  const ertNotified = Boolean(incident?.timeline?.some((item) => item.event_type === "ert_notified"));
  const ertAcknowledged = Boolean(incident?.timeline?.some((item) => item.event_type === "ert_acknowledged"));
  const repairDrafts = incidentBackend.repairDrafts || [];
  const sourceEvent = monitoringState.events.find((item) => String(item.id) === String(signal?.monitoring_event_id))
    || monitoringState.events.find((item) => item.type === "fire" && item.enterpriseId === signal?.enterprise_id);
  const signalLocation = sourceEvent ? `${sourceEvent.floor} · ${sourceEvent.point}` : "点位编码已映射，等待现场复核";
  const verificationRoute = patrolAssignment?.payload?.route || "推荐入口与室内路径将在派巡查后显示";
  return `
    <section class="incident-console" aria-labelledby="incident-console-title">
      <header class="incident-console-header"><div><span>报警核实 / 应急指挥</span><h1 id="incident-console-title">火警应急处置台</h1><p>从报警核实、人员调派到对讲指挥和设备反馈，在同一页面连续完成。</p></div><div class="incident-live ${incidentBackend.status}"><b></b>${incidentBackend.status === "live" ? "实时数据已连接" : "本地演示数据已就绪"}</div></header>
      <div class="incident-grid">
        <aside class="incident-queue" aria-label="报警信号与处置事件队列">
          <h2>待核实报警信号 <b>${pendingSignals.length}</b></h2>
          <div class="incident-list">${pendingSignals.length ? pendingSignals.map((item) => `<button type="button" data-signal-select="${item.monitoring_event_id}" class="${item.monitoring_event_id === signal?.monitoring_event_id ? "active" : ""}"><strong>${escapeHtml(item.enterprise_name)}</strong><span>${incidentTime(item.occurred_at)} · 等待现场核实</span></button>`).join("") : `<div class="incident-empty">暂无待核实信号</div>`}</div>
          ${signal ? `<div class="signal-actions">
            ${!patrolAssignment ? `<button type="button" data-action="assign-patrol-verification">派巡查核实</button>` : `<span class="signal-chip">已派巡查 · ${escapeHtml(incidentTime(patrolAssignment.occurred_at))}</span>`}
            ${patrolAssignment && !onsiteFeedback ? `<button type="button" data-action="report-onsite-confirmed">巡查反馈真实火警</button><button type="button" data-action="report-onsite-dismissed">巡查反馈误报</button>` : ""}
            ${onsiteFeedback ? `<span class="signal-chip ${onsiteResult === "confirmed" ? "danger" : ""}">巡查反馈：${onsiteResult === "confirmed" ? "真实火警" : "误报/无火情"}</span>` : ""}
            <button type="button" data-action="dismiss-device-signal">登记误报</button><button type="button" class="danger" data-action="confirm-device-signal">确认火警</button><button type="button" data-action="bind-signal-copilot">用 FireOps AI 辅助研判</button>
          </div>` : ""}
          <h2>故障维修草稿 <b>${repairDrafts.length}</b></h2>
          <div class="incident-list">${repairDrafts.length ? repairDrafts.map((item) => `<button type="button" data-repair-select="${item.workorder_id}" data-repair-event="${item.event_id || ""}"><strong>${escapeHtml(item.enterprise_name)}</strong><span>${escapeHtml((item.summary || "").slice(0, 36))}…</span></button>`).join("") : `<div class="incident-empty">监测注入故障后会出现在此</div>`}</div>
          <h2>处置事件 <b>${incidentBackend.incidents.length}</b></h2>
          <div class="incident-list">${incidentBackend.incidents.length ? incidentBackend.incidents.map((item) => `<button type="button" data-incident-select="${item.id}" class="${item.id === incident?.id ? "active" : ""}"><strong>${escapeHtml(item.enterprise_name)}</strong><span>${window.FireGuardEngine.incidentStatusLabel(item.status)}</span></button>`).join("") : `<div class="incident-empty">人工确认火警后才会生成处置事件</div>`}</div>
        </aside>
        <main class="incident-main">
          ${incident ? `<div class="incident-title-row"><div><span>正在处置</span><h2>${escapeHtml(incident.enterprise_name)}</h2><p>${escapeHtml(incident.district)} · ${escapeHtml(incident.response_brief.address)}</p></div><div class="incident-title-actions"><button type="button" class="secondary-action" data-action="focus-radio-command"><i data-lucide="radio-tower"></i>查看现场对讲态势</button><strong>${window.FireGuardEngine.incidentStatusLabel(incident.status)}</strong></div></div>
          <section class="response-brief"><header><i data-lucide="shield-alert"></i><div><span>AI 处置提示 · 规则草案</span><h3>车间处置信息卡</h3></div></header>${incident.response_brief.items.map((item) => `<div><strong>${escapeHtml(item.text)}</strong><small>资料来源：${escapeHtml(item.sources.map(businessSourceLabel).join("、"))}</small></div>`).join("")}<p>${escapeHtml(incident.response_brief.disclaimer)}</p></section>${radioCommandTemplate(incident)}` : signal ? `<section class="signal-preview-card"><header><i data-lucide="map-pinned"></i><div><span>ALARM VERIFICATION / HUMAN GATE</span><h2>${escapeHtml(signal.enterprise_name)}</h2></div><b>待人工核实</b></header><dl><div><dt>报警位置</dt><dd>${escapeHtml(signalLocation)}</dd></div><div><dt>推荐核实路线</dt><dd>${escapeHtml(verificationRoute)}</dd></div><div><dt>当前任务</dt><dd>${patrolAssignment ? "巡查人员已接收，等待现场反馈" : "由消控室派发巡查核实"}</dd></div></dl><p>设备信号只触发核实任务；巡查人员确认真实火警后，系统才建立处置事件和调派时间线。</p></section>` : `<div class="incident-empty large">当前没有待核实信号</div>`}
        </main>
        <aside class="incident-dispatch" aria-label="班组派单与时间线">
          <h2>片区处置力量</h2>
          ${incident && !incident.dispatch ? availableStation
            ? `<select id="dispatch-station">${stations.map((item) => `<option value="${item.id}" ${item.status !== "available" ? "disabled" : ""}>${escapeHtml(item.name)} · ${window.FireGuardEngine.stationStatusLabel(item.status)}</option>`).join("")}</select><button type="button" class="dispatch-button" data-action="dispatch-incident">派发专职消防队</button><button type="button" class="dispatch-button dispatch-secondary" data-action="notify-incident-ert">通知本车间 ERT</button>`
            : `<div class="dispatch-card"><strong>当前片区班组正在执行${occupyingIncident ? `事件 #${occupyingIncident.id}` : "其他任务"}</strong><span>${escapeHtml(occupiedStation?.name || "处置班组")}释放后，本事件才能派发。</span></div>${workflowState?.crewId ? `<button type="button" class="dispatch-button" data-workflow-continue data-actor="${workflowState.actor}" data-crew-id="${workflowState.crewId}" data-route="${workflowState.route}">进入占用班组的当前任务</button>` : `<a class="workflow-inline-link" href="#/incidents?view=progress">查看处置进度</a>`}`
            : incident?.dispatch ? `<div class="dispatch-card"><strong>${escapeHtml(incident.dispatch.station_name)}</strong><span>${window.FireGuardEngine.incidentStatusLabel(incident.status)}</span></div>${ertNotified ? ertAcknowledged ? `<div class="dispatch-card ert-card"><strong>车间 ERT 已签收</strong><span>增援记录已写入事件时间线</span></div>` : `<button type="button" class="dispatch-button dispatch-secondary" data-action="ack-incident-ert">ERT 签收增援</button>` : ""}${incident.report && incident.status !== "closed" ? `${isJudgeIncident ? `<div class="judge-gate"><b>人工闸门 3/3</b><span>值班员核验现场反馈后归档，AI 不代替最终决定。</span></div>` : ""}<button type="button" class="dispatch-button" data-action="close-incident">核验反馈并归档</button>` : isJudgeIncident && incident.status === "closed" ? `<div class="judge-complete"><strong>评委演示闭环完成</strong><span>报警、证据、人工审批、班组反馈与归档均已写入审计时间线。</span></div>` : ""}` : signal ? `<section class="incident-guidance"><strong>推荐核实路线</strong><span>${escapeHtml(verificationRoute)}</span><small>现场确认后才生成处置力量与事件时间线</small></section>` : `<div class="incident-empty">当前没有待处置事件</div>`}
          <h2>事件时间线</h2>${incident ? timelineTemplate(incident) : `<section class="incident-guidance"><strong>确认后生成事件时间线</strong><span>报警接入 → 派巡查 → 现场反馈 → 人工确认</span><small>现在仍停留在人工核实闸门，不提前生成处置记录。</small></section>`}
        </aside>
      </div>
    </section>`;
}

function maintenancePlanStatusLabel(status) {
  return ({ awaiting_approval: "待设施部门确认", planned: "待维保执行", in_progress: "执行中", acceptance_pending: "待设施部门验收", done: "已完成" })[status] || status;
}

function maintenanceOperationsTemplate() {
  const plans = maintenanceOpsState.plans;
  const activePlan = plans.find((item) => item.status === "in_progress");
  const lowStock = maintenanceOpsState.spares.filter((item) => item.stock < item.minimum).length;
  const openPlans = plans.filter((item) => item.status !== "done").length;
  const unacknowledged = maintenanceOpsState.slaAlerts.filter((item) => !item.acknowledged).length;
  return `
    <section class="maintenance-ops" data-maintenance-ops aria-labelledby="maintenance-ops-title">
      <header><div><span>PLANNED MAINTENANCE / SYNTHETIC DATA</span><h2 id="maintenance-ops-title">周期维保、SLA 与备件</h2><p>计划确认、维保执行、测试证据和设施验收分岗留痕。</p></div><b>合成演示台账</b></header>
      <dl class="maintenance-ops-kpis"><div><dt>周期计划</dt><dd>${plans.length}</dd><small>${openPlans} 项未完成</small></div><div><dt>SLA 预警</dt><dd>${unacknowledged}</dd><small>24 小时故障闭环</small></div><div><dt>低库存</dt><dd>${lowStock}</dd><small>低于安全库存</small></div><div><dt>执行记录</dt><dd>${maintenanceOpsState.logs.length}</dd><small>包含测试证据编号</small></div></dl>
      <div class="maintenance-ops-grid">
        <article class="maintenance-plan-board"><header><h3>周期计划</h3><span>按到期日排序</span></header><div class="maintenance-plan-list">
          ${plans.map((plan) => `<div data-maintenance-plan="${plan.id}" data-plan-status="${plan.status}"><span><strong>${escapeHtml(plan.title)}</strong><small>${escapeHtml(plan.asset)} · ${escapeHtml(plan.cycle)} · 到期 ${escapeHtml(plan.due)}</small><small>执行资质：${escapeHtml(plan.qualification)}</small></span><em>${escapeHtml(maintenancePlanStatusLabel(plan.status))}</em>${plan.status === "awaiting_approval" ? `<button type="button" data-action="approve-maintenance-plan" data-plan-id="${plan.id}">确认计划并派发</button>` : plan.status === "planned" ? `<button type="button" data-action="start-maintenance-plan" data-plan-id="${plan.id}">开始执行</button>` : plan.status === "acceptance_pending" ? `<button type="button" data-action="accept-maintenance-plan" data-plan-id="${plan.id}">验收通过</button>` : ""}</div>`).join("")}
        </div></article>
        <article class="maintenance-sla-board"><header><h3>SLA 预警</h3><span>人工确认升级</span></header>${maintenanceOpsState.slaAlerts.map((alert) => `<div class="maintenance-sla-alert ${alert.acknowledged ? "acknowledged" : ""}" data-maintenance-sla="${alert.id}"><i data-lucide="${alert.acknowledged ? "circle-check" : "clock-alert"}"></i><span><strong>${escapeHtml(alert.title)}</strong><small>责任：${escapeHtml(alert.owner)} · 超时后升级责任人并增加临时巡查</small></span>${alert.acknowledged ? `<em>已确认</em>` : `<button type="button" data-action="ack-maintenance-sla" data-sla-id="${alert.id}">确认接收</button>`}</div>`).join("")}</article>
        <article class="maintenance-spares-board"><header><h3>备件台账</h3><span>库存低于阈值自动标红</span></header><div class="maintenance-spares-list">${maintenanceOpsState.spares.map((spare) => `<div data-maintenance-spare="${spare.id}" class="${spare.stock < spare.minimum ? "low" : ""}"><span><strong>${escapeHtml(spare.name)}</strong><small>${escapeHtml(spare.id)} · 安全库存 ${spare.minimum}${escapeHtml(spare.unit)}</small></span><b>${spare.stock}${escapeHtml(spare.unit)}</b><em>${spare.stock < spare.minimum ? "需补货" : "库存正常"}</em></div>`).join("")}</div></article>
        <article class="maintenance-execution-board"><header><h3>执行记录</h3><span>${activePlan ? "填写测试结果后提交验收" : "开始计划后显示录入表单"}</span></header>
          ${activePlan ? `<form id="maintenance-execution-form"><strong>${escapeHtml(activePlan.title)}</strong><small>作业资质：${escapeHtml(activePlan.qualification)}</small><label>维修期间消防安全措施<select id="maintenance-safety-measure"><option value="">请选择</option><option value="增加临时巡查并保持值班人员在岗" ${maintenanceOpsState.draft.safety === "增加临时巡查并保持值班人员在岗" ? "selected" : ""}>增加临时巡查并保持值班人员在岗</option><option value="切换备用设备并设置现场监护" ${maintenanceOpsState.draft.safety === "切换备用设备并设置现场监护" ? "selected" : ""}>切换备用设备并设置现场监护</option></select></label><label>测试结论<select id="maintenance-test-result"><option value="">请选择</option><option value="通过" ${maintenanceOpsState.draft.result === "通过" ? "selected" : ""}>通过</option><option value="不通过" ${maintenanceOpsState.draft.result === "不通过" ? "selected" : ""}>不通过</option></select></label><label>测试与现场记录<textarea id="maintenance-test-note" maxlength="160" placeholder="例如：回路通信正常，抽测 12 个点位，联动反馈一致">${escapeHtml(maintenanceOpsState.draft.note)}</textarea></label><label>领用备件<select id="maintenance-spare-used"><option value="none">未领用备件</option>${maintenanceOpsState.spares.map((item) => `<option value="${item.id}" ${maintenanceOpsState.draft.spareId === item.id ? "selected" : ""}>${escapeHtml(item.name)} · 库存 ${item.stock}${escapeHtml(item.unit)}</option>`).join("")}</select></label><button type="button" class="station-action" data-action="complete-maintenance-plan" data-plan-id="${activePlan.id}">提交执行记录并转验收</button></form>` : `<div class="maintenance-log-list">${maintenanceOpsState.logs.map((log) => `<div><time>${escapeHtml(log.time)}</time><span><strong>${escapeHtml(log.plan)} · ${escapeHtml(log.result)}</strong><small>证据 ${escapeHtml(log.evidence)} · 安全措施 ${escapeHtml(log.safety)}</small></span></div>`).join("")}</div>`}
        </article>
      </div>
      <footer class="maintenance-record-policy"><strong>记录与档案边界</strong><span>维修、维护保养计划和记录按不少于 5 年展示；原始技术资料需长期保存。人员资质与证明文件由设施部门核验，AI 不判定证件有效性。</span><small>依据 GB 25201-2010 第 8、9、10 章整理；当前内容均为合成演示数据。</small></footer>
    </section>`;
}

function stationTerminalTemplate() {
  const inbox = incidentBackend.inbox || [];
  const activeCrew = CREW_OPTIONS.find((crew) => crew.id === terminalStationId) || CREW_OPTIONS[0];
  const selected = inbox.find((item) => item.inbox_id === selectedInboxId) || inbox[0];
  const task = selected?.source === "incident_dispatch"
    ? incidentBackend.tasks.find((item) => item.dispatch?.id === selected.dispatch_id)
      || incidentBackend.tasks.find((item) => item.id === selected.incident_id)
    : null;
  const nextAction = task?.dispatch ? window.FireGuardEngine.nextStationAction(task.dispatch.status) : null;
  const kindLabel = { response: "处置", repair: "维修", maintenance: "维保", rectification: "整改" };
  const maintenanceFirst = terminalStationId === "crew-wb-01" && !selected;
  return `
    <section class="station-console" aria-labelledby="station-console-title">
      <header class="station-console-header">
        <div>
          <span>CREW TERMINAL / UNIFIED INBOX</span>
          <h1 id="station-console-title">${escapeHtml(incidentBackend.station?.name || "处置 / 维保任务终端")}</h1>
          <p>统一收件箱：处置派单 + 维修/维保/整改工单</p>
        </div>
        <label class="crew-switch">班组
          <select id="terminal-crew-select">
            ${CREW_OPTIONS.map((crew) => `<option value="${crew.id}" ${crew.id === terminalStationId ? "selected" : ""}>${escapeHtml(crew.label)}</option>`).join("")}
          </select>
        </label>
      </header>
      ${maintenanceFirst ? maintenanceOperationsTemplate() : ""}
      <div class="station-grid">
        <aside class="station-task-list">
          <h2>本组任务 <b>${inbox.length}</b></h2>
          ${inbox.length ? inbox.map((item) => `
            <button type="button" data-inbox-select="${item.inbox_id}" class="${item.inbox_id === selected?.inbox_id ? "active" : ""}">
              <strong>${kindLabel[item.kind] || item.kind} · ${escapeHtml(item.enterprise_name || "")}</strong>
              <span>${escapeHtml((item.summary || "").slice(0, 40))} · ${escapeHtml(workorderStatusLabel(item.status, item.kind))}</span>
            </button>
          `).join("") : `<div class="incident-empty">暂无派发工单</div>`}
        </aside>
        <main class="station-task-detail">
          ${!selected ? `<div class="guided-empty station-empty"><strong>${escapeHtml(activeCrew.label)}当前没有待办任务</strong><p>处置台派单后，任务会自动进入对应消防站或维保组，无需人工查找。</p><a class="primary-action" href="#/incidents">返回应急处置台</a></div>` : ""}
          ${selected?.source === "incident_dispatch" && task ? `
            <div class="incident-title-row"><div><span>任务 #${task.dispatch.id}</span><h2>${escapeHtml(task.enterprise_name)}</h2><p>${escapeHtml(task.response_brief.address)}</p></div><strong>${task.report && task.status !== "closed" ? "待核验归档" : window.FireGuardEngine.incidentStatusLabel(task.status)}</strong></div>
            <section class="station-brief">${task.response_brief.items.map((item) => `<div><strong>${escapeHtml(item.text)}</strong><small>${escapeHtml(item.sources.map(businessSourceLabel).join("、"))}</small></div>`).join("")}<p>${escapeHtml(task.response_brief.disclaimer)}</p></section>
            <a class="secondary-action station-radio-link" href="#/incidents?incident_id=${task.id}"><i data-lucide="radio-tower"></i>查看现场对讲态势</a>
            ${nextAction ? `<button type="button" class="station-action" data-action="station-next-action" data-next-action="${nextAction.action}">${nextAction.label}</button>` : ""}
            ${task.dispatch.status === "arrived" && !task.report ? `<section class="first-report"><h3>现场处理反馈</h3><textarea id="report-situation" maxlength="300" placeholder="填写现场情况与处理结果（1–300 字）"></textarea><select id="report-people"><option value="unknown">人员情况未知</option><option value="no_risk">无被困风险</option><option value="at_risk">存在风险</option></select><button type="button" data-action="submit-first-report">提交反馈</button></section>` : task.report && task.status !== "closed" ? `<div class="report-received"><strong>现场反馈已提交</strong><span>${escapeHtml(task.report.situation)} · 下一步由消控室值班员核验归档</span></div><button type="button" class="station-action" data-workflow-continue data-actor="duty-demo" data-incident-id="${task.id}" data-route="#/incidents?incident_id=${task.id}">交回消控室核验归档</button>` : task.report ? `<div class="report-received"><strong>事件已归档</strong><span>${escapeHtml(task.report.situation)}</span></div>` : ""}
          ` : ""}
          ${selected?.source === "ops_workorder" ? `
            <div class="incident-title-row"><div><span>OPS #${selected.workorder_id}</span><h2>${escapeHtml(selected.enterprise_name)}</h2><p>${kindLabel[selected.kind] || selected.kind}工单</p></div><strong>${escapeHtml(workorderStatusLabel(selected.status, selected.kind))}</strong></div>
            <section class="station-brief"><div><strong>${escapeHtml(selected.summary)}</strong><small>责任：${escapeHtml(selected.owner || selected.crew_id || "—")}${selected.source_event_id ? ` · 来源事件 #${escapeHtml(selected.source_event_id)}` : ""}</small></div>
            <p>来自统一工单中枢；草稿需人工确认后派发生效，维保完工必须由消防设施部门验收。</p></section>
            ${["maintenance", "repair"].includes(selected.kind) ? workorderGovernanceTemplate(selected) : ""}
            ${selected.status === "draft" ? `<button type="button" class="station-action" data-action="approve-inbox-workorder" data-workorder-id="${selected.workorder_id}">确认派发（人工）</button>` : ""}
            ${selected.status === "approved" ? `<button type="button" class="station-action" data-action="start-inbox-workorder" data-workorder-id="${selected.workorder_id}">开始处理</button>` : ""}
            ${selected.status === "in_progress" ? `<button type="button" class="station-action" data-action="complete-inbox-workorder" data-workorder-id="${selected.workorder_id}">${["maintenance", "repair"].includes(selected.kind) ? "提交完工（待设施部门验收）" : selected.kind === "rectification" ? "提交整改（待巡查复查）" : "提交完成结果"}</button>` : ""}
            ${selected.status === "acceptance_pending" ? `<div class="report-received" data-workorder-status="acceptance_pending"><strong>承包商已提交完工证据</strong><span>当前工单未关闭，等待消防设施部门独立验收。</span></div>${activeRoleId === "facility_department" ? `<button type="button" class="station-action" data-action="accept-inbox-workorder" data-workorder-id="${selected.workorder_id}">复测合格并验收关闭</button><button type="button" class="secondary-action" data-action="reject-inbox-workorder" data-workorder-id="${selected.workorder_id}">复测不合格，驳回返工</button>` : `<button type="button" class="station-action" data-workflow-continue data-actor="facility-demo" data-crew-id="crew-wb-01" data-route="#/station?crew_id=crew-wb-01&workorder_id=${selected.workorder_id}">交消防设施部门验收</button>`}` : ""}
            ${selected.status === "done" ? `<div class="report-received" data-workorder-status="done"><strong>工单已验收关闭</strong><span>完工、验收结论和责任人均已留痕。</span></div>` : ""}
            ${selected.event_id ? `<button type="button" class="secondary-action" data-action="diagnose-event-copilot" data-event-id="${selected.event_id}" data-enterprise-id="${selected.enterprise_id}">用 FireOps AI 诊断此故障</button>` : ""}
          ` : ""}
          ${selected?.source === "incident_dispatch" && !task ? `<div class="incident-empty large">处置任务详情加载中或班组不匹配——请确认左上角班组是否为处置站</div>` : ""}
        </main>
        <aside class="station-timeline"><h2>${selected?.source === "ops_workorder" ? "验收时间线" : "工单时间线"}</h2>${task ? timelineTemplate(task) : selected?.source === "ops_workorder" ? acceptanceTimelineTemplate(selected) : guidedEmpty("时间线随任务出现", [
          "有处置派单后，这里显示签收/到场/反馈时间线",
          "切换班组下拉框可分别查看处置站与维保组收件箱",
        ])}</aside>
      </div>
      ${terminalStationId === "crew-wb-01" && !maintenanceFirst ? maintenanceOperationsTemplate() : ""}
    </section>`;
}

function ownerInboxTemplate() {
  const inbox = (incidentBackend.inbox || []).filter((item) => item.kind === "rectification");
  const selected = inbox.find((item) => item.inbox_id === selectedInboxId) || inbox[0];
  const selectedEvidence = selected?.completion_evidence?.url
    ? selected.completion_evidence
    : rectificationEvidence?.workorderId === String(selected?.workorder_id) ? rectificationEvidence : null;
  return `
    <section class="station-console" aria-labelledby="owner-console-title">
      <header class="station-console-header">
        <div>
          <span>AREA OWNER / RECTIFICATION INBOX</span>
          <h1 id="owner-console-title">整改待办</h1>
          <p>接收防火巡查发现的隐患，派给车间责任人整改；完成后由巡查员复查闭环。</p>
        </div>
        <label class="crew-switch">责任人
          <select id="terminal-owner-select">
            ${OWNER_OPTIONS.map((name) => `<option value="${name}" ${name === terminalOwnerName ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}
          </select>
        </label>
      </header>
      <div class="station-grid">
        <aside class="station-task-list">
          <h2>我的整改待办 <b>${inbox.length}</b></h2>
          ${inbox.length ? inbox.map((item) => `
            <button type="button" data-inbox-select="${item.inbox_id}" class="${item.inbox_id === selected?.inbox_id ? "active" : ""}">
              <strong>${escapeHtml(item.enterprise_name || "")}</strong>
              <span>${escapeHtml((item.summary || "").slice(0, 40))} · ${escapeHtml(workorderStatusLabel(item.status, item.kind))}</span>
            </button>
          `).join("") : `<div class="incident-empty">暂无整改任务</div>`}
        </aside>
        <main class="station-task-detail">
          ${!selected ? `<div class="guided-empty owner-empty"><strong>整改待办是将巡查隐患派给车间责任人的整改任务</strong><p>当前没有待整改事项。可先到防火巡查创建隐患记录，返回后会在这里跟踪整改与复查。</p><button type="button" class="primary-action" data-action="go-inspections">去防火巡查新建任务</button></div>` : `
            <div class="incident-title-row"><div><span>整改 #${selected.workorder_id}</span><h2>${escapeHtml(selected.enterprise_name)}</h2><p>车间问题对接人 ${escapeHtml(selected.owner || terminalOwnerName)}</p></div><strong>${escapeHtml(workorderStatusLabel(selected.status, selected.kind))}</strong></div>
            <section class="station-brief"><div><strong>${escapeHtml(selected.summary)}</strong><small>关联隐患 #${selected.finding_id || "—"}</small></div>
            <p>整改完成后标记完成；复查通过后隐患才正式关闭。</p></section>
            ${selected.status === "approved" ? `<button type="button" class="station-action" data-action="start-inbox-workorder" data-workorder-id="${selected.workorder_id}">开始整改</button>` : ""}
            ${selected.status === "in_progress" ? `<section class="rectification-evidence"><header><div><span>整改证据</span><strong>上传整改后的现场照片</strong></div><b>必填</b></header>${selectedEvidence ? `<img src="${escapeHtml(selectedEvidence.url)}" alt="整改后现场照片"><p data-rectification-evidence-ready><i data-lucide="circle-check"></i>${escapeHtml(selectedEvidence.name)} · 已加入本次整改记录</p>` : `<label for="rectification-evidence-file"><i data-lucide="image-up"></i><span><strong>选择现场照片</strong><small>支持 PNG、JPEG、WebP，最大 5 MB</small></span><input id="rectification-evidence-file" type="file" accept="image/png,image/jpeg,image/webp"></label><button type="button" class="secondary-action" data-action="use-demo-rectification-evidence" data-workorder-id="${selected.workorder_id}">使用演示整改照片</button>`}</section><button type="button" class="station-action" data-action="complete-inbox-workorder" data-workorder-id="${selected.workorder_id}" ${selectedEvidence ? "" : "disabled"}>提交整改（待巡查复查）</button>` : ""}
            ${selected.status === "done" ? `<div class="report-received" data-workorder-status="done"><strong>整改结果已提交</strong><span>整改照片和责任人已留痕，等待防火巡查人员独立复查。</span></div>${selectedEvidence ? `<section class="rectification-evidence completed"><img src="${escapeHtml(selectedEvidence.url)}" alt="已留存的整改现场照片"><p data-persisted-rectification-evidence><i data-lucide="circle-check"></i>${escapeHtml(selectedEvidence.name)} · 后端记录已留存</p></section>` : `<div class="incident-empty">历史工单缺少整改照片，不能通过复查。</div>`}` : ""}
            ${selected.finding_id ? `<a class="secondary-action" href="#/inspections">去防火巡查发起复查</a>` : ""}
          `}
        </main>
        <aside class="station-timeline"><h2>闭环说明</h2>${guidedEmpty("整改链", [
          "防火巡查派发 → 本页开始/完成整改 → 巡查复查通过 → 隐患关闭",
          "火警处置单不在这里，请到「应急处置」任务终端查看",
        ])}</aside>
      </div>
    </section>`;
}

function managementHomeTemplate() {
  const role = activeRoleDefinition();
  const roleBoundary = activeRoleId === "company_management"
    ? "查看全厂汇总和闭环结果，不执行火警确认、派发、维保验收或隐患关闭。"
    : `从同一厂区总览进入业务；菜单、数据范围和可执行动作仍按${role.label}岗位权限控制。`;
  const metrics = opsMetrics();
  const activeEvents = monitoringState.events.filter((event) => event.status !== "closed");
  const pendingFire = activeEvents.filter((event) => event.type === "fire" && event.status === "pending").length;
  const openHazards = metrics?.openFindings ?? companies.reduce((sum, company) => sum + company.openHazards, 0);
  const openWorkorders = metrics?.openWorkorders ?? equipment.filter((item) => item.state !== "正常").length;
  const rankedCompanies = [...companies].sort((left, right) => (left.score ?? -1) - (right.score ?? -1));
  const weeklyFocus = metrics
    ? (semifinalOpsRecords.findings || []).slice(0, 3).map((item) => ({ tag: workshopLabel(item.workshop_id), title: `${item.category} · ${item.status === "closed" ? "复查通过" : "整改中"}`, location: "巡查隐患", status: item.status === "closed" ? "已闭环" : "待车间整改" }))
    : issues;
  return `
    <section class="management-dashboard management-command" aria-labelledby="management-title">
      <header class="management-header">
        <div><span>FACTORY FIRE OPERATIONS</span><h1 id="management-title">星澜新能源汽车工厂</h1><p>全厂总览：建筑风险、火警、巡查隐患和设施维保在同一空间中汇总，具体处置仍由对应岗位完成。</p></div>
        <div class="management-header-actions"><a href="#/weekly">查看消防周报 <i data-lucide="arrow-up-right"></i></a></div>
      </header>
      <div class="management-command-grid">
        <aside class="management-command-rail">
          <header><span>FACTORY INDEX</span><h2>消防运行指标</h2></header>
          <dl class="management-kpis">
            <div data-management-kpi><dt>本周报警</dt><dd class="status-red">${metrics?.alarmCount ?? pendingFire}</dd><small>确认 ${metrics?.confirmedFireCount ?? 0} · 误报 ${metrics?.falseAlarmCount ?? 0}</small></div>
            <div data-management-kpi><dt>未闭环隐患</dt><dd>${openHazards}</dd><small>等待整改或巡查复查</small></div>
            <div data-management-kpi><dt>维保未闭环</dt><dd class="status-amber">${openWorkorders}</dd><small>设施部门验收后关闭</small></div>
            <div data-management-kpi><dt>整改闭环率</dt><dd>${metrics ? `${metrics.rectificationRate}%` : `${inspectionRoute.filter((item) => item.status === "已闭环").length}/${inspectionRoute.length}`}</dd><small>仅统计复查通过记录</small></div>
          </dl>
          <section class="management-panel management-risk-panel">
            <header><div><span>WORKSHOP RISK</span><h2>车间风险排序</h2></div><a href="#/analysis/ent-001">分析</a></header>
          <div class="management-risk-list">
            ${rankedCompanies.map((company, index) => `<a href="#/analysis/${company.id}" data-workshop-risk-row><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(company.name)}</strong><em>${company.score === null ? "待评估" : `${company.score} 分`}</em>${riskBadge(company)}</a>`).join("")}
          </div>
          </section>
        </aside>
        <section class="management-map-panel" aria-label="厂区三维消防总览">
          <div class="management-map-toolbar"><span><b></b>风险点实时标注</span><div><button type="button" data-3d-view="top">俯视</button><button type="button" data-3d-view="reset">复位</button></div></div>
          <div id="monitoring-3d" class="twin-viewport factory-overview management-3d" data-scene-theme="command" data-spatial-level="factory" data-selected-company="ent-001" data-risk-levels="${companies.map((item) => `${item.id}:${item.level}`).join(",")}" role="region" aria-label="星澜新能源汽车工厂三维总览">
            <div class="twin-loading"><span></span>正在加载厂区建筑模型</div>
            <div class="factory-overview-copy"><span>FACTORY DIGITAL TWIN · 脱敏合成园区</span><strong>全厂空间态势</strong><small>拖动旋转 · 滚轮缩放 · 点击风险点进入车间 · 非真实 BIM</small></div>
            <div class="management-workshop-labels" aria-label="主要车间信息">
              ${companies.map((company) => `<button type="button" class="management-workshop-label" data-company="${company.id}" data-enter-workshop="${company.id}"><strong>${escapeHtml(company.name.replace(/（.*?）/g, ""))}</strong><span>${escapeHtml(company.industry)}</span><small>${escapeHtml(company.area)} · ERT ${escapeHtml(company.ert)} 在位</small></button>`).join("")}
            </div>
            <button type="button" class="management-selected-workshop" data-enter-workshop="ent-001"><i data-lucide="flame"></i><span><strong>电池车间 · 2F PACK 产线 A1</strong><small>待核实火警 · 消防指数 58</small></span><b>进入现场</b></button>
          </div>
          <footer><span>点击车间查看平面、消防资源与报警点位</span><a href="#/monitoring">打开报警与空间 <i data-lucide="arrow-right"></i></a></footer>
        </section>
        <aside class="management-command-rail management-command-rail-right">
          <section class="management-panel management-event-panel">
            <header><div><span>LIVE EVENTS</span><h2>全厂事件</h2></div><b>${activeEvents.length}</b></header>
            <div class="management-event-list">${activeEvents.slice(0, 4).map((event) => { const item = companies.find((company) => company.id === event.enterpriseId) || companies[0]; return `<a href="#/monitoring"><i data-lucide="${event.type === "fire" ? "flame" : "wrench"}"></i><span><strong>${escapeHtml(item.name.replace(/（.*?）/g, ""))}</strong><small>${escapeHtml(event.floor)} · ${escapeHtml(event.point)}</small></span><em>${escapeHtml(event.statusLabel)}</em></a>`; }).join("")}</div>
          </section>
          <section class="management-panel management-flow-panel">
            <header><div><span>OPERATIONS</span><h2>三条业务闭环</h2></div></header>
          <div class="management-flow-list">
            <a href="#/incidents"><i data-lucide="siren"></i><span><strong>火警与应急处置</strong><small>${activeEvents.length} 个进行中事件，${pendingFire} 个待核实火警</small></span><i data-lucide="arrow-right"></i></a>
            <a href="#/inspections"><i data-lucide="clipboard-check"></i><span><strong>巡查与隐患整改</strong><small>${openHazards} 项未闭环，巡查员负责复查关闭</small></span><i data-lucide="arrow-right"></i></a>
            <a href="#/station?crew_id=crew-wb-01"><i data-lucide="wrench"></i><span><strong>故障与设施维保</strong><small>${metrics ? `${openWorkorders} 张工单待闭环，设施部门负责验收` : `${openWorkorders} 台异常设备，设施部门负责验收`}</small></span><i data-lucide="arrow-right"></i></a>
          </div>
          </section>
          <aside class="management-note"><i data-lucide="shield-check"></i><span><strong>${escapeHtml(role.label)}岗位边界</strong>${escapeHtml(roleBoundary)}</span></aside>
        </aside>
      </div>
      <section class="management-panel management-weekly">
        <header><div><span>本周待办</span><h2>本周需要关注</h2></div><a href="#/weekly">查看消防周报</a></header>
        <div>${weeklyFocus.map((issue) => `<article><span>${escapeHtml(issue.tag)}</span><strong>${escapeHtml(issue.title)}</strong><small>${escapeHtml(issue.location)} · ${escapeHtml(issue.status)}</small></article>`).join("")}</div>
      </section>
    </section>
  `;
}

function homeTemplate() {
  if (activeRoleId === "company_management") return managementHomeTemplate();
  const role = activeRoleDefinition();
  const availableWorkspaces = workspaces.filter((workspace) => role.modules.includes(workspace.module));
  return `
    <section class="workspace-home" aria-labelledby="workspace-home-title">
      <header class="workspace-home-header">
        <span>FIREOPS / ROLE WORKSPACE</span>
        <h1 id="workspace-home-title">${escapeHtml(role.label)}工作台</h1>
        <p>这里只显示本岗位可以查看和处理的业务。切换角色只改变菜单、任务范围和操作权限，不会切换到另一套系统。</p>
      </header>
      <aside class="workspace-boundary"><i data-lucide="badge-check"></i><span><strong>数据范围：${escapeHtml(ROLE_SCOPE_LABELS[role.scope] || role.scope)}</strong>${escapeHtml(role.dataVisibility || "按岗位职责查看相关任务")}；可用模块 ${availableWorkspaces.length} 个；高风险动作仍需人工确认。</span></aside>
      <div class="workspace-grid">
        ${availableWorkspaces.map((workspace, index) => `
          <a class="workspace-card workspace-card-ready" href="#/${workspace.route}" data-workspace-link>
            <span class="workspace-index">${String(index + 1).padStart(2, "0")}</span>
            <span class="workspace-icon"><i data-lucide="${workspace.icon}"></i></span>
            <small>${workspace.role}</small>
            <h2>${workspace.title}</h2>
            <p>${workspace.description}</p>
            <span class="workspace-status">${workspace.status}<i data-lucide="arrow-up-right"></i></span>
          </a>
        `).join("")}
      </div>
      <aside class="workspace-boundary"><i data-lucide="shield-check"></i><span><strong>安全边界</strong>Agent 只读取火警主机数据并生成草稿，不控制真实设备、不自动启动灭火装置；确认火警后拨打 119 由人工执行。</span></aside>
      ${activeRoleId === "control_room_operator" ? `<a class="copilot-entry" href="#/copilot">
        <i data-lucide="sparkles"></i>
        <span><strong>FireOps AI 辅助研判</strong>查看报警证据、缺失字段和建议草稿；火警核实、调派与归档仍由值班员确认。</span>
        <i data-lucide="arrow-right"></i>
      </a>` : ""}
    </section>
  `;
}

function workspacePlaceholderTemplate(routeName) {
  const workspace = workspaces.find((item) => item.route.split("/")[0] === routeName) || workspaces[0];
  return `
    <section class="workspace-placeholder" aria-labelledby="placeholder-title">
      <div class="placeholder-panel">
        <span class="workspace-icon"><i data-lucide="${workspace.icon}"></i></span>
        <small>${workspace.role}</small>
        <h1 id="placeholder-title">${workspace.title}</h1>
        <p>${workspace.description}</p>
        <div class="placeholder-scope"><strong>本轮已完成</strong><span>独立入口、角色边界和路由已经建立。具体业务页面按开发计划逐项接入。</span></div>
        <a class="secondary-action" href="#/home"><i data-lucide="arrow-left"></i>返回工作台</a>
      </div>
    </section>
  `;
}

function roleAccessDeniedTemplate() {
  const role = activeRoleDefinition();
  return `
    <section class="workspace-placeholder" aria-labelledby="role-denied-title">
      <div class="placeholder-panel">
        <span class="workspace-icon"><i data-lucide="shield-x"></i></span>
        <small>ROLE SCOPE</small>
        <h1 id="role-denied-title">当前角色无权进入此模块</h1>
        <p>${escapeHtml(role.label)}只显示与本岗位职责有关的数据和动作。请返回工作台，或切换演示角色。</p>
        <a class="secondary-action" href="#/home"><i data-lucide="arrow-left"></i>返回${escapeHtml(role.label)}工作台</a>
      </div>
    </section>
  `;
}

const INCIDENT_WORKFLOW_STEPS = ["信号接入", "人工核实", "派发处置单", "班组签收", "出动到场", "现场反馈", "人工归档"];

function incidentWorkflowState(incident) {
  const dispatchStatus = incident.dispatch?.status;
  const responders = incidentBackend.stations.filter((station) => station.district === incident.district && String(station.id).startsWith("crew-wx"));
  const available = responders.find((station) => station.status === "available");
  if (incident.status === "closed" || dispatchStatus === "completed") return { current: 7, role: "已完成", action: "准备出警报告与战评", actor: "duty-demo", route: `#/review/${incident.id}` };
  if (!incident.dispatch) {
    if (!available && responders[0]) return { current: 2, role: "处置班组", action: "先完成占用班组的当前任务", actor: "brigade-demo", crewId: responders[0].id, route: `#/station?crew_id=${responders[0].id}` };
    return { current: 2, role: "消控室值班员", action: "选择处置站并派发", actor: "duty-demo", route: `#/incidents?incident_id=${incident.id}` };
  }
  if (dispatchStatus === "issued") return { current: 3, role: "处置班组", action: "签收任务", actor: "brigade-demo", crewId: incident.dispatch.station_id, route: `#/station?crew_id=${incident.dispatch.station_id}` };
  if (["acknowledged", "enroute"].includes(dispatchStatus)) return { current: 4, role: "处置班组", action: dispatchStatus === "acknowledged" ? "确认出动" : "确认到场", actor: "brigade-demo", crewId: incident.dispatch.station_id, route: `#/station?crew_id=${incident.dispatch.station_id}` };
  if (dispatchStatus === "arrived" && !incident.report) return { current: 5, role: "处置班组", action: "提交现场反馈", actor: "brigade-demo", crewId: incident.dispatch.station_id, route: `#/station?crew_id=${incident.dispatch.station_id}` };
  return { current: 6, role: "消控室值班员 / EHS", action: "核验反馈并归档", actor: "duty-demo", route: `#/incidents?incident_id=${incident.id}` };
}

function workflowStepsTemplate(current) {
  return `<ol class="workflow-steps">${INCIDENT_WORKFLOW_STEPS.map((step, index) => {
    const state = current >= INCIDENT_WORKFLOW_STEPS.length || index < current ? "done" : index === current ? "current" : "pending";
    return `<li class="${state}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${step}</strong></li>`;
  }).join("")}</ol>`;
}

function workflowSupervisionTemplate() {
  const incidents = [...incidentBackend.incidents].sort((a, b) => (a.status === "closed") - (b.status === "closed") || b.id - a.id);
  const pendingSignals = incidentBackend.signals.filter((signal) => signal.verification_status === "pending");
  const awaitingCrew = incidents.filter((incident) => ["issued", "acknowledged", "enroute", "arrived"].includes(incident.dispatch?.status) && !incident.report).length;
  const awaitingClose = incidents.filter((incident) => incident.report && incident.status !== "closed").length;
  return `
    <section class="workflow-page" aria-labelledby="workflow-page-title">
      <header class="workflow-page-header">
        <div><span>OPERATIONS WORKFLOW / LIVE STATE</span><h1 id="workflow-page-title">事件处置进度</h1><p>事件到了哪一步、现在由谁负责、下一步做什么，都从数据库实时计算。</p></div>
        <div class="incident-live ${incidentBackend.status}"><b></b>${incidentBackend.status === "live" ? "数据库实时同步" : "正在连接本地后端"}</div>
      </header>
      <div class="workflow-value-grid">
        <article><span>AI 负责</span><strong>解析信号、补齐证据、生成核实与工单草稿</strong></article>
        <article><span>人负责</span><strong>确认火情、批准派单、现场处置与最终归档</strong></article>
        <article><span>监管负责</span><strong>追踪状态、责任角色、下一动作和审计时间线</strong></article>
      </div>
      <dl class="workflow-summary-strip"><div><dt>待核实</dt><dd>${pendingSignals.length}</dd></div><div><dt>待班组处理</dt><dd>${awaitingCrew}</dd></div><div><dt>待归档</dt><dd>${awaitingClose}</dd></div><div><dt>全部事件</dt><dd>${incidents.length}</dd></div></dl>
      <div class="workflow-case-list">
        ${pendingSignals.map((signal) => `<article class="workflow-case"><header><div><span>SIGNAL #${signal.monitoring_event_id}</span><h2>${escapeHtml(signal.enterprise_name)}</h2></div><b>待人工核实</b></header><ol class="workflow-steps"><li class="done"><span>01</span><strong>信号接入</strong></li><li class="current"><span>02</span><strong>人工核实</strong></li>${INCIDENT_WORKFLOW_STEPS.slice(2).map((step, index) => `<li class="pending"><span>${String(index + 3).padStart(2, "0")}</span><strong>${step}</strong></li>`).join("")}</ol><footer><p><span>当前责任</span><strong>消控室值班员</strong><small>下一步：确认火警或登记误报</small></p><button type="button" data-workflow-continue data-actor="duty-demo" data-route="#/incidents?event_id=${signal.monitoring_event_id}">去人工核实</button></footer></article>`).join("")}
        ${incidents.map((incident) => {
          const state = incidentWorkflowState(incident);
          return `<article class="workflow-case ${incident.status === "closed" ? "closed" : ""}"><header><div><span>EVENT #${incident.id}</span><h2>${escapeHtml(incident.enterprise_name)}</h2><small>${escapeHtml(incident.district)} · ${escapeHtml(incident.response_brief.address)}</small></div><b>${window.FireGuardEngine.incidentStatusLabel(incident.status)}</b></header>${workflowStepsTemplate(state.current)}<footer><p><span>当前责任</span><strong>${state.role}</strong><small>下一步：${state.action}</small></p><button type="button" data-workflow-continue data-actor="${state.actor}" data-incident-id="${incident.id}" data-crew-id="${state.crewId || ""}" data-route="${state.route}">${state.action}</button></footer></article>`;
        }).join("") || (pendingSignals.length ? "" : `<div class="workflow-empty">当前没有事件流程。请先从报警与空间注入一条模拟火警帧。</div>`)}
      </div>
    </section>`;
}

function incidentReviewTemplate(eventId = "OFFLINE-INC-001") {
  const incident = incidentBackend.incidents.find((item) => String(item.id) === String(eventId));
  const signal = incidentBackend.signals.find((item) => String(item.monitoring_event_id) === String(incident?.source_event_id));
  const fallbackParticipants = [
    ["消控室值班员", "事件记录与设备操作确认"],
    ["防火巡查人员", "现场核实与首报"],
    ["专职消防队", "火灾扑救与现场反馈"],
    ["电池车间 ERT", "人员疏散与工艺协同"],
    ["车间问题对接人", "后续改进行动协调"],
  ];
  const fallbackTimeline = [
    ["10:24", "报警接入", "烟感与相邻探测器信号进入平台"],
    ["10:26", "巡查受领", "系统下发点位、楼层和推荐入口"],
    ["10:29", "确认火警", "巡查人员反馈发现明火"],
    ["10:31", "消防队出动", "专职消防队与车间 ERT 同步受领"],
    ["10:36", "到达现场", "按南门入口进入 PACK 产线 A1"],
    ["10:44", "火势受控", "现场反馈人员已撤离，持续监护复燃"],
    ["10:49", "事件结束", "值班员核验反馈并完成归档"],
  ];
  const eventLabels = {
    incident_created: "人工确认火警", dispatch_issued: "派发处置任务", ert_notified: "同步车间 ERT",
    ert_acknowledged: "ERT 签收", acknowledged: "消防队签收", enroute: "消防队出动",
    arrived: "到达现场", first_report: "现场反馈", incident_closed: "人工归档",
  };
  const sourceTimeline = incident?.timeline || [];
  const timeline = sourceTimeline.length
    ? sourceTimeline.map((item) => [incidentTime(item.occurred_at), eventLabels[item.event_type] || item.event_type, item.note || item.actor])
    : fallbackTimeline;
  const eventAt = (...types) => types.map((type) => sourceTimeline.find((item) => item.event_type === type)?.occurred_at).find(Boolean);
  const elapsed = (from, to) => {
    const start = new Date(from).getTime();
    const end = new Date(to).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.round((end - start) / 60000) : null;
  };
  const metric = (value) => value === null ? "待测" : `${value} 分钟`;
  const alarmAt = signal?.occurred_at || incident?.created_at || eventAt("incident_created");
  const confirmAt = incident?.created_at || eventAt("incident_created");
  const departAt = incident?.dispatch?.departed_at || eventAt("enroute", "dispatch_issued");
  const arriveAt = incident?.dispatch?.arrived_at || eventAt("arrived");
  const closeAt = eventAt("incident_closed") || (incident?.status === "closed" ? incident.updated_at : null);
  const metrics = [elapsed(alarmAt, confirmAt), elapsed(confirmAt, departAt), elapsed(departAt, arriveAt), elapsed(alarmAt, closeAt)];
  const participantDuty = (actor) => /消控室|值班/.test(actor) ? "事件记录与人工归档" : /巡查/.test(actor) ? "现场核实与首报" : /消防队|班组/.test(actor) ? "现场处置与反馈" : /ERT|应急/.test(actor) ? "疏散与工艺协同" : "事件处置与证据确认";
  const dynamicActors = [...new Set([...sourceTimeline.map((item) => item.actor), ...radioCommandState.messages.map((item) => item.source)].filter((actor) => actor && !/AI|合成输入/.test(actor)))];
  const participants = dynamicActors.length ? dynamicActors.map((actor) => [actor, participantDuty(actor)]) : fallbackParticipants;
  const enterpriseName = incident?.enterprise_name || "电池车间（PACK/化成）";
  const address = incident?.response_brief?.address || "电池车间 2F · PACK 产线 A1";
  const reportText = incident?.report?.situation || "明火已扑灭，人员完成疏散；现场继续执行复燃监护。";
  const radioLog = radioCommandState.messages.length ? radioCommandState.messages.map((item) => [item.time, item.source, item.group || item.kind, item.location, item.text, item.evidence]) : [
    ["10:25", "消控室值班员", "调度组", "冲压车间东门", "巡查员请按推荐路线前往电池车间 2F PACK 缓存区核实。", "radio/FIRE-001-01"],
    ["10:29", "防火巡查人员", "调度组", "电池车间 2F", "现场确认有明火和浓烟，请求升级处置。", "radio/FIRE-001-02"],
    ["10:31", "消控室值班员", "应急组", "消控室", "专职消防队与电池车间 ERT 同步受领，按南门路线进入。", "radio/FIRE-001-03"],
    ["10:44", "专职消防队", "现场组", "PACK 产线 A1", "火势受控，人员已撤离，继续监护复燃风险。", "radio/FIRE-001-04"],
  ];
  return `
    <section class="incident-review-page" aria-labelledby="incident-review-title">
      ${analysisSubnav("review")}
      <header class="incident-review-header">
        <div><span>AFTER ACTION REVIEW</span><h1 id="incident-review-title">出警报告与战评</h1><p>事件 ${escapeHtml(eventId)} · ${escapeHtml(enterpriseName)} · ${escapeHtml(address)} · 当前事件动态汇总</p></div>
        <a class="secondary-action" href="#/incidents?view=progress"><i data-lucide="arrow-left"></i>返回处置进度</a>
      </header>
      <dl class="review-metrics">
        <div><dt>报警至确认</dt><dd>${metric(metrics[0])}</dd><small>设备信号到人工确认</small></div>
        <div><dt>确认至出动</dt><dd>${metric(metrics[1])}</dd><small>人工确认到班组出动</small></div>
        <div><dt>出动至到场</dt><dd>${metric(metrics[2])}</dd><small>班组反馈时间线</small></div>
        <div><dt>事件总时长</dt><dd>${metric(metrics[3])}</dd><small>${incidentTime(alarmAt)}–${incidentTime(closeAt)}</small></div>
      </dl>
      <div class="incident-review-grid">
        <article class="review-card review-report">
          <header><div><span>INCIDENT REPORT</span><h2>出警报告</h2></div><b class="${reviewState.reportConfirmed ? "confirmed" : ""}">${reviewState.reportConfirmed ? "已确认" : "待人工确认"}</b></header>
          <div class="review-report-body">
            <section><h3>事件摘要</h3><p>${escapeHtml(enterpriseName)} ${escapeHtml(address)}发生经人工确认的火警。平台按当前事件时间线汇总核实、调派、到场、现场反馈和归档节点。</p></section>
            <section><h3>处置结果</h3><p>${escapeHtml(reportText)}</p></section>
            ${radioCommandState.reportReady ? `<section><h3>对讲指挥摘要</h3><p>系统从 ${radioCommandState.messages.length} 条现场对讲记录中整理现场事实、人工指令、人员状态和 ${radioCommandState.facilities.length} 项关键设施反馈，其中 ${radioCommandState.facilities.filter((item) => item.confirmed).length} 项已人工确认。</p></section>` : ""}
          </div>
          <footer class="review-report-actions"><button type="button" class="primary-action" data-action="confirm-review-report" ${reviewState.reportConfirmed ? "disabled" : ""}><i data-lucide="check-check"></i>${reviewState.reportConfirmed ? "出警报告已确认" : "确认出警报告"}</button><a class="secondary-action" data-judge-review-export href="docs/submission/FireOps-AI-incident-review.docx" download><i data-lucide="file-down"></i>下载结构化战评 Word</a></footer>
        </article>
        <article class="review-card review-meeting">
          <header><div><span>MEETING PLAN</span><h2>战评会议安排</h2></div><b class="${reviewState.meetingConfirmed ? "confirmed" : ""}">${reviewState.meetingConfirmed ? "已确认" : "待值班员确认"}</b></header>
          <div class="review-meeting-time"><i data-lucide="calendar-clock"></i><span><strong>建议时间：事件结束后 24 小时内</strong><small>会议时长 45 分钟 · 线上 + 消控室会议室</small></span></div>
          <h3>根据事件记录识别的参会人员</h3>
          <div class="review-participants">${participants.map(([name, duty]) => `<div data-review-participant><span>${escapeHtml(name.slice(0, 1))}</span><p><strong>${escapeHtml(name)}</strong><small>${escapeHtml(duty)}</small></p></div>`).join("")}</div>
          <button type="button" class="primary-action" data-action="confirm-review-meeting" ${reviewState.meetingConfirmed ? "disabled" : ""}><i data-lucide="calendar-check"></i>${reviewState.meetingConfirmed ? "会议安排已确认" : "确认会议安排"}</button>
          <small class="review-boundary">确认后进入会议待办，演示环境不向外部系统发送邀请。</small>
        </article>
        <article class="review-card review-timeline">
          <header><div><span>AUDIT TIMELINE</span><h2>事件时间线</h2></div><b>${timeline.length} 个节点</b></header>
          <ol>${timeline.map(([time, title, note]) => `<li><time>${time}</time><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(note)}</small></span></li>`).join("")}</ol>
        </article>
        <article class="review-card review-timeline review-radio">
          <header><div><span>RADIO RECORD</span><h2>现场对讲与定位留痕</h2></div><b>${radioLog.length} 条</b></header>
          <ol>${radioLog.map(([time, actor, group, location, transcript]) => `<li><time>${time}</time><span><strong>${escapeHtml(actor)} · ${escapeHtml(group)}</strong><small>${escapeHtml(location)} · ${escapeHtml(transcript)}</small></span></li>`).join("")}</ol>
          <footer>现场状态变化、设备操作和事件归档均由授权岗位确认。</footer>
        </article>
        <article class="review-card review-agenda">
          <header><div><span>REVIEW AGENDA</span><h2>战评议题与改进行动</h2></div><b>待会议确认</b></header>
          <ol>
            <li><span>01</span><div><strong>核实阶段</strong><p>报警至人工确认：${metric(metrics[0])}。复盘现场核实路线、证据完整性和漏填节点。</p></div></li>
            <li><span>02</span><div><strong>调派阶段</strong><p>确认至班组出动：${metric(metrics[1])}；出动至到场：${metric(metrics[2])}。核对人员签收和岗位简报。</p></div></li>
            <li><span>03</span><div><strong>现场处置</strong><p>根据当前现场反馈与 ${radioLog.length} 条对讲留痕，补充复燃监护、受影响设备和后续专项检查。</p></div></li>
          </ol>
          <aside><i data-lucide="sparkles"></i><span><strong>系统辅助</strong>汇总时间线、识别参与人员并整理议题；事实确认、责任认定和改进行动仍由战评会议决定。</span></aside>
        </article>
      </div>
    </section>`;
}

function firstResponsePack(company, dossier) {
  return window.FireGuardEngine.buildFirstResponsePack({
    enterprise: company,
    profile: dossier?.profile || OFFLINE_SITE_PROFILES[company.id] || {},
    devicePoints: dossier?.device_points || [],
    evidenceRefs: dossier?.evidence_refs || [`enterprise_response_profiles/${company.id}`],
  });
}

function firstResponsePackTemplate(company, dossier) {
  const pack = firstResponsePack(company, dossier);
  const traceLabels = {
    get_enterprise_profile: "读取企业基本档案",
    get_site_packet: "聚合危险源、入口、水源和设施",
    get_device_context: "读取消防设备点位",
    check_missing_fields: "检查应急资料缺项",
    build_external_brief: "生成外部救援资料草稿",
  };
  return `
    <article class="dossier-card dossier-response-pack">
      <header>
        <div><span>ENTERPRISE READINESS / AI EVIDENCE</span><h2>企业应急准备与首战资料</h2><p>Agent 只整理企业内部数据、标出缺项并生成只读草稿；对外共享与报警仍由授权人员确认。</p></div>
        <strong class="readiness-score">${pack.readiness.score}<small>/100</small></strong>
      </header>
      <div class="readiness-checks">
        ${pack.readiness.checks.map((item) => `<div class="${item.ready ? "ready" : "missing"}"><i data-lucide="${item.ready ? "check" : "alert-triangle"}"></i><span><strong>${escapeHtml(item.label)}</strong><small>${item.ready ? "资料已就绪" : "需要企业补录"}</small></span></div>`).join("")}
      </div>
      <div class="response-pack-grid">
        <section>
          <h3>首战资料草稿</h3>
          <dl>
            <div><dt>地址</dt><dd>${escapeHtml(pack.site.address)}</dd></div>
            <div><dt>重点危险源</dt><dd>${escapeHtml(pack.site.hazards.join("、") || "未知")}</dd></div>
            <div><dt>优先入口</dt><dd>${escapeHtml(pack.site.access_points.join("、") || "未知")}</dd></div>
            <div><dt>可用水源</dt><dd>${escapeHtml(pack.site.water_sources.join("、") || "未知")}</dd></div>
            <div><dt>消防设施</dt><dd>${escapeHtml(pack.site.facilities.join("、") || "未知")}</dd></div>
          </dl>
        </section>
        <section>
          <h3>Agent 工具与证据链</h3>
          <ol class="response-pack-trace">
            ${pack.agent.tool_trace.map((item) => `<li><i data-lucide="check-circle-2"></i><span><strong>${escapeHtml(traceLabels[item.name] || "核对相关业务资料")}</strong><small>已核对 ${item.evidence_refs.length} 项业务信息</small></span></li>`).join("")}
          </ol>
        </section>
      </div>
      <footer>
        <label><input id="response-pack-confirm" type="checkbox" /> 我已核对合成数据，同意导出给外部救援力量作为辅助资料</label>
        <button type="button" class="primary-action" data-action="export-first-response-pack"><i data-lucide="download"></i>人工确认并导出资料包</button>
        <small>${dossier ? "来源：企业档案、设备点位、事件与工单证据" : "离线演示：使用内置合成场地档案，未连接 119 或真实设备"}</small>
      </footer>
    </article>`;
}

function enterpriseDossierTemplate(enterpriseId) {
  const company = companies.find((item) => item.id === enterpriseId) || selectedCompany();
  const profile = monitoringProfiles[company.id] || {};
  const dossier = enterpriseDossierState.id === company.id ? enterpriseDossierState.data : null;
  const companyIssues = dossier?.findings || [];
  const companyEquipment = dossier?.device_points || [];
  const workorders = dossier?.workorders || [];
  const events = dossier?.recent_events || [];
  return `
    <section class="enterprise-dossier" aria-labelledby="dossier-title">
      <header class="workspace-context-bar">
        <div>
          <span>EHS / 车间消防档案</span>
          <h1 id="dossier-title">${escapeHtml(company.name)}</h1>
          <p>${escapeHtml(company.industry)} · ${escapeHtml(company.building)} · ${escapeHtml(profile.district || "")} · 健康指数 ${scoreText(company.score)}</p>
        </div>
        <div class="workspace-context-actions">
          <select id="dossier-enterprise-select" aria-label="切换车间">
            ${companies.map((item) => `<option value="${item.id}" ${item.id === company.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
          </select>
          <a class="secondary-action" href="#/home"><i data-lucide="arrow-left"></i>工作台</a>
        </div>
      </header>
      <div class="dossier-grid">
        ${firstResponsePackTemplate(company, dossier)}
        <article class="dossier-card">
          <h2>风险画像</h2>
          <dl>
            <div><dt>风险等级</dt><dd>${riskLabel(company.level)}</dd></div>
            <div><dt>数据在线率</dt><dd>${escapeHtml(profile.online || "—")}</dd></div>
            <div><dt>火警信号</dt><dd>${escapeHtml(profile.signal || "—")}</dd></div>
            <div><dt>故障趋势</dt><dd>${escapeHtml(profile.fault || "—")}</dd></div>
            <div><dt>维保状态</dt><dd>${escapeHtml(profile.maintenance || "—")}</dd></div>
            <div><dt>未闭环隐患</dt><dd>${company.openHazards}</dd></div>
          </dl>
          <p class="dossier-note">档案是「看清这个车间」的摘要页，不代替核实台或工单终端；下面的按钮把你带进对应岗位流程。</p>
        </article>
        <article class="dossier-card">
          <h2>设备摘要</h2>
          <ul class="dossier-list">
            ${companyEquipment.length ? companyEquipment.slice(0, 5).map((item) => `<li><strong>${escapeHtml(item.device_type || item.point_id)}</strong><span>${escapeHtml(item.location)} · 机${item.controller_no}回路${item.loop_no}点位${item.point_no}</span></li>`).join("") : `<li><strong>${enterpriseDossierState.loading ? "正在读取设备台账" : "设备台账暂不可用"}</strong><span>${enterpriseDossierState.error ? "本地演示未连接设备台账" : "等待后端连接"}</span></li>`}
          </ul>
        </article>
        <article class="dossier-card">
          <h2>隐患摘要</h2>
          <ul class="dossier-list">
            ${companyIssues.length ? companyIssues.slice(0, 5).map((issue) => `<li><strong>${escapeHtml(issue.title)}</strong><span>#${issue.id} · ${escapeHtml(issue.status)} · ${escapeHtml(issue.owner)}</span></li>`).join("") : "<li><strong>暂无未闭环隐患</strong><span>可从防火巡查新建</span></li>"}
          </ul>
        </article>
        <article class="dossier-card">
          <h2>事件与工单</h2>
          <ul class="dossier-list">
            ${events.slice(0, 3).map((event) => `<li><strong>事件 #${event.id} · ${escapeHtml(event.event_type)}</strong><span>${escapeHtml(event.verification_status || "已入库")} · ${escapeHtml(event.raw_ref)}</span></li>`).join("") || "<li><strong>暂无事件</strong><span>可从报警与空间注入演示帧</span></li>"}
            ${workorders.slice(0, 3).map((workorder) => `<li><strong>工单 #${workorder.id} · ${escapeHtml(workorder.kind)}</strong><span>${escapeHtml(workorder.status)} · ${escapeHtml(workorder.summary)}</span></li>`).join("")}
          </ul>
        </article>
        <article class="dossier-card">
          <h2>审计证据</h2>
          <ul class="dossier-list">
            ${(dossier?.evidence_refs || []).slice(0, 6).map((ref) => `<li><strong>${escapeHtml(ref)}</strong><span>可回溯原始记录</span></li>`).join("") || "<li><strong>暂无证据引用</strong><span>业务操作后会自动汇总</span></li>"}
          </ul>
        </article>
        <article class="dossier-card dossier-actions">
          <h2>从这里继续处理</h2>
          <ol class="dossier-flow">
            <li><strong>有火警/待核实</strong> → 应急处置台确认或排除</li>
            <li><strong>确认火警/故障</strong> → FireOps AI 辅助研判或值班台生成任务</li>
            <li><strong>现场隐患</strong> → 防火巡查派发 → 整改待办处理 → 复查闭环</li>
          </ol>
          <div class="dossier-cta-row">
            <button type="button" class="primary-action" data-action="verify-signal"><i data-lucide="shield-alert"></i>去人工核实</button>
            <a class="secondary-action" href="${routeHash("inspections", enterpriseContext())}"><i data-lucide="clipboard-check"></i>去防火巡查</a>
            <a class="secondary-action" href="${routeHash("station", enterpriseContext())}"><i data-lucide="siren"></i>去任务终端</a>
            <a class="secondary-action" href="${routeHash("copilot", enterpriseContext())}"><i data-lucide="sparkles"></i>打开辅助研判</a>
          </div>
        </article>
      </div>
    </section>
  `;
}

async function loadEnterpriseDossier(enterpriseId) {
  if (enterpriseDossierState.id === enterpriseId && (enterpriseDossierState.loading || enterpriseDossierState.data || enterpriseDossierState.error)) return;
  enterpriseDossierState = { id: enterpriseId, data: null, loading: true, error: "" };
  if (!MONITORING_API_BASE) {
    enterpriseDossierState = { id: enterpriseId, data: null, loading: false, error: "公开静态演示未连接设备台账" };
    if ((location.hash || "").startsWith(`#/enterprises/${enterpriseId}`)) renderRoute();
    return;
  }
  try {
    const response = await fetch(`${MONITORING_API_BASE}/enterprises/${enterpriseId}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "dossier_unavailable");
    enterpriseDossierState = { id: enterpriseId, data: payload, loading: false, error: "" };
  } catch (error) {
    enterpriseDossierState = { id: enterpriseId, data: null, loading: false, error: error.message };
  }
  if ((location.hash || "").startsWith(`#/enterprises/${enterpriseId}`)) renderRoute();
}

function exportFirstResponsePack() {
  if (!document.querySelector("#response-pack-confirm")?.checked) return showToast("请先核对资料并勾选人工确认");
  const company = selectedCompany();
  const dossier = enterpriseDossierState.id === company.id ? enterpriseDossierState.data : null;
  const pack = {
    ...firstResponsePack(company, dossier),
    exported_at: new Date().toISOString(),
    human_confirmation: { confirmed: true, actor_id: demoActorId },
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `fireops-first-response-${company.id}.json` });
  link.click();
  URL.revokeObjectURL(url);
  showToast("首战资料包已导出；未向任何外部系统发送");
}

function guidedEmpty(title, steps) {
  return `
    <div class="guided-empty">
      <strong>${escapeHtml(title)}</strong>
      <ol>${steps.map((step) => `<li>${step}</li>`).join("")}</ol>
    </div>
  `;
}

function monitoringTemplate() {
  const events = window.FireGuardEngine.filterMonitoringEvents(monitoringState.events, monitoringState.filter);
  const selectedEvent = monitoringState.events.find((event) => event.id === monitoringState.selectedId) || events[0] || monitoringState.events[0];
  const company = companies.find((item) => item.id === selectedEvent.enterpriseId) || companies[0];
  const profile = monitoringProfiles[company.id];
  selectedCompanyId = company.id;
  const counts = {
    all: monitoringState.events.length,
    pending: monitoringState.events.filter((event) => event.status === "pending").length,
    processing: monitoringState.events.filter((event) => event.status === "processing").length,
  };
  const building = buildingForEnterprise(company.id);
  const patrolRoute = building ? responseRoute(building, selectedEvent, "sn-gate-south", "厂区南门（室外巡查集结点）") : null;
  const responseRoutes = patrolRoute ? {
    patrol: patrolRoute,
    brigade: selectedEvent.type === "fire" ? responseRoute(building, selectedEvent, "sn-gate-south", "厂区南门（专职消防队集结点）") : null,
  } : null;
  const buildingEvents = building ? events.filter((event) => event.enterpriseId === company.id) : [];
  const floorEvents = events.filter((event) => event.enterpriseId === company.id && (monitoringState.floor === "all" || event.floor === monitoringState.floor));
  const floorDevices = new Set(floorEvents.flatMap((event) => event.devices));
  const selectedOnFloor = floorEvents.some((event) => event.id === selectedEvent.id);
  const pendingFire = selectedEvent.type === "fire" && selectedEvent.status === "pending";
  const tabLabels = { location: "现场位置", trend: "报警信号", devices: "消防设施", history: "处置记录" };
  const panel = monitoringState.tab === "trend" ? `
    <section class="monitoring-data-panel" data-monitoring-panel="trend"><header><strong>${escapeHtml(selectedEvent.point)}报警强度</strong><span>0–100 · 最近 5 次采样</span></header><p class="monitoring-panel-note">用于判断信号是否持续上升；火警结论仍由现场核实。</p><div class="signal-trend-bars">${selectedEvent.trend.map((value, index) => `<div><span>${index === selectedEvent.trend.length - 1 ? "当前" : `前 ${selectedEvent.trend.length - index - 1} 次`}</span><i style="--trend:${value}%"></i><strong>${value}</strong></div>`).join("")}</div></section>
  ` : monitoringState.tab === "devices" ? `
    <section class="monitoring-data-panel" data-monitoring-panel="devices"><header><strong>报警点关联消防设施</strong><span>${selectedEvent.devices.length} 项</span></header><p class="monitoring-panel-note">展示报警来源和同一处置范围内需要核对的消防设施。</p><ul class="monitoring-data-list">${selectedEvent.devices.map((device, index) => `<li><i data-lucide="${index ? "shield-check" : "radio-tower"}"></i><span><strong>${escapeHtml(device)}</strong><small>${index ? "关联设施 · 等待现场或对讲确认" : "报警来源 · 信号已接收"}</small></span></li>`).join("")}</ul></section>
  ` : monitoringState.tab === "history" ? `
    <section class="monitoring-data-panel" data-monitoring-panel="history"><header><strong>本次报警处置记录</strong><span>${selectedEvent.statusLabel}</span></header><p class="monitoring-panel-note">按时间记录接入、联查、人工核实和后续处置。</p><ol class="monitoring-history-list">${selectedEvent.history.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ol></section>
  ` : `
    <section class="monitoring-location-panel" data-monitoring-panel="location">
      <div class="monitoring-checks"><strong>FireOps 已检查</strong><span><i data-lucide="check"></i>信号稳定性</span><span><i data-lucide="check"></i>相邻探测器</span><span><i data-lucide="check"></i>关联消防设施</span><span><i data-lucide="check"></i>设备状态</span></div>
      ${building ? workshopPlanTemplate(building, buildingEvents, selectedEvent, pendingFire, responseRoutes) : `
      <div class="monitoring-floor-summary"><strong>空间数据未加载</strong><span>请通过本地服务打开页面以加载车间空间模型</span></div>
      <div class="monitoring-floorplan spatial-missing"><i data-lucide="loader-2"></i><p>车间平面模型加载中或不可用；请确认通过 http 服务访问而不是直接双击 html 文件。</p></div>`}
    </section>`;
  const enterWorkshopButtons = spatialSite && legacyMap
    ? companies.map((item) => `<button type="button" class="management-workshop-label" data-company="${item.id}" data-enter-workshop="${item.id}"><strong>${escapeHtml(item.name.replace(/（.*?）/g, ""))}</strong><span>${escapeHtml(item.industry)}</span><small>${escapeHtml(item.area)} · ERT ${escapeHtml(item.ert)} 在位</small></button>`).join("")
    : "";
  const factoryPanel = `
    <div id="monitoring-3d" class="twin-viewport factory-overview" data-spatial-level="factory" data-selected-company="${company.id}" data-risk-levels="${companies.map((item) => `${item.id}:${item.level}`).join(",")}" role="region" aria-label="星澜新能源汽车工厂三维总览">
      <div class="twin-loading"><span></span>正在加载厂区建筑模型</div>
      <div class="factory-overview-copy"><span>FACTORY DIGITAL TWIN · 脱敏合成园区</span><strong>星澜新能源汽车工厂</strong><small>点击风险点进入消防平面 · 空间定位示意，非真实 BIM</small></div>
      <div class="management-workshop-labels" aria-label="主要车间信息">${enterWorkshopButtons}</div>
    </div>`;
  return `
    <section class="monitoring-page" aria-labelledby="monitoring-title">
      <div class="monitoring-layout">
        <aside class="monitoring-list" aria-labelledby="monitoring-list-title">
          <div class="monitoring-panel-title"><div><h2 id="monitoring-list-title">事件队列 <b>${counts.all}</b></h2></div><i data-lucide="list-filter"></i></div>
          <div class="monitoring-queue-filters" aria-label="事件筛选">${[["all","全部"],["pending","待核实"],["processing","处理中"]].map(([value,label]) => `<button type="button" data-monitoring-filter="${value}" aria-pressed="${monitoringState.filter === value}" class="${monitoringState.filter === value ? "active" : ""}">${label} ${counts[value]}</button>`).join("")}</div>
          <div class="monitoring-company-list">
            ${events.map((event) => { const item = companies.find((entry) => entry.id === event.enterpriseId) || companies[0]; return `<button type="button" class="monitoring-company ${event.id === selectedEvent.id ? "active" : ""}" data-monitoring-event="${event.id}" data-status="${event.status}" aria-pressed="${event.id === selectedEvent.id}"><span class="monitoring-event-icon"><i data-lucide="${event.type === "fire" ? "flame" : event.type === "fault" ? "wrench" : "circle-alert"}"></i></span><span><small>${event.typeLabel} <time>${event.time}</time></small><strong>${escapeHtml(item.name.replace(/（.*?）/g, ""))}</strong><em>${escapeHtml(event.floor)} · ${escapeHtml(event.point)}</em><small>${event.statusLabel} · 指数 ${scoreText(item.score)}</small></span><i data-lucide="chevron-right"></i></button>`; }).join("") || `<div class="monitoring-empty"><strong>当前筛选暂无事件</strong><button type="button" data-monitoring-filter="all">查看全部</button></div>`}
          </div>
          <div class="monitoring-source"><i data-lucide="database"></i><span>${monitoringBackend.status === "live" ? "实时数据已连接" : "评审演示模式 · 本地合成数据"}</span></div>
        </aside>
        <section class="twin-panel" aria-labelledby="twin-title">
          <header class="monitoring-focus-header">
            <div><span>${escapeHtml(selectedEvent.typeLabel)} · ${escapeHtml(selectedEvent.statusLabel)}</span><h1 id="monitoring-title">${escapeHtml(company.name.replace(/（.*?）/g, ""))} ${escapeHtml(selectedEvent.location)}</h1><dl><div><dt>事件时间</dt><dd>${escapeHtml(selectedEvent.time)}</dd></div><div><dt>探测点</dt><dd>${escapeHtml(selectedEvent.point)}</dd></div><div><dt>位置</dt><dd>${escapeHtml(selectedEvent.floor)} / ${escapeHtml(profile.district)} / ${escapeHtml(selectedEvent.location)}</dd></div><div><dt>消防指数</dt><dd>${scoreText(company.score)} / 100</dd></div></dl></div>
            <div class="twin-actions"><button type="button" data-action="inject-demo-event"><i data-lucide="radio-tower"></i>模拟火警帧</button><button type="button" data-action="inject-demo-fault"><i data-lucide="wrench"></i>模拟故障</button></div>
          </header>
          ${monitoringState.spatialLevel === "floor" ? `<div class="monitoring-workshop-nav"><button type="button" data-return-factory><i data-lucide="arrow-left"></i>返回工厂总览</button><span>工厂总览 / ${escapeHtml(building?.name || "车间")} / ${escapeHtml(selectedEvent.floor)}</span></div><nav class="monitoring-view-tabs" role="tablist" aria-label="事件视图">${Object.entries(tabLabels).map(([value,label]) => `<button type="button" role="tab" data-monitoring-tab="${value}" aria-selected="${monitoringState.tab === value}" class="${monitoringState.tab === value ? "active" : ""}">${label}</button>`).join("")}</nav><div class="twin-viewport" data-spatial-level="floor" data-selected-company="${company.id}" role="region" aria-label="${escapeHtml(building?.name || "车间")}消防平面视图">${panel}</div>` : factoryPanel}
        </section>
        <aside class="monitoring-detail" aria-labelledby="monitoring-detail-title">
          <div class="detail-eyebrow"><h2 id="monitoring-detail-title">证据摘要</h2><strong>5/5</strong></div>
          <section class="monitoring-evidence-summary" aria-label="证据摘要">
            ${[["chart-no-axes-column-increasing","报警强度"],["radio-tower","相邻探测器"],["link","关联消防设施"],["video","视频复核"],["battery-charging","设备运行状态"]].map(([icon,label]) => `<div><i data-lucide="${icon}"></i><strong>${label}</strong><span>已检查 <i data-lucide="circle-check"></i></span></div>`).join("")}
          </section>
          ${pendingFire ? `<section class="monitoring-human-gate"><header><strong>待人工核实</strong><span>必须</span></header><p>请现场或视频确认是否存在火情。</p><ul><li>进入 FireOps AI 辅助研判补齐证据并生成处置草案</li><li>如为误报，登记原因并关闭事件</li></ul><button class="monitoring-primary" type="button" data-action="open-monitoring-copilot"><i data-lucide="shield-alert"></i>进入辅助研判</button><button class="monitoring-secondary" type="button" data-action="dismiss-monitoring-event">登记误报并关闭</button></section>`
            : `<section class="monitoring-human-gate monitoring-state-card"><header><strong>${selectedEvent.status === "closed" ? "事件已恢复" : selectedEvent.type === "fault" && selectedEvent.status === "pending" ? "待人工排障" : selectedEvent.type === "fault" ? "故障处理中" : "事件处理中"}</strong><span>${escapeHtml(selectedEvent.statusLabel)}</span></header><p>${selectedEvent.status === "closed" ? "该事件已完成复核并恢复，处置过程保留在记录中。" : selectedEvent.type === "fault" ? "该事件按设备维修流程处理，不进入火警确认与应急派单。" : "责任班组已受领，请在本页查看后续进度。"}</p></section>`}
          ${responseRouteTemplate(responseRoutes)}
          <section class="monitoring-recommendation"><strong><i data-lucide="clipboard-check"></i>建议行动</strong><ol><li>通知现场人员前往核实</li><li>准备灭火器材，等待支援</li></ol></section>
          <button class="monitoring-dossier-link" type="button" data-action="company-overview">查看 ${escapeHtml(company.name)} 档案 <i data-lucide="arrow-up-right"></i></button>
        </aside>
      </div>
    </section>
  `;
}

function allIssues() {
  return [...dynamicIssues, ...issues];
}

function inspectionTemplate() {
  return `
    <section class="inspection-workspace">
      <header class="workspace-context-bar">
        <div><span>防火巡查员 / 车间问题对接人</span><h1>防火巡查与隐患闭环</h1><p>拍照识别隐患、语音辅助录入、派发车间问题对接人整改与复查</p></div>
        <div class="workspace-context-actions">
          <button type="button" class="primary-action" data-action="open-inspect-capture"><i data-lucide="camera"></i>新建巡查识别</button>
          <button type="button" class="secondary-action" data-action="scan-maintenance"><i data-lucide="wrench"></i>扫描维保逾期</button>
          <a href="#/analysis/${selectedCompanyId}" class="secondary-action"><i data-lucide="file-text"></i>消防健康报告</a>
        </div>
      </header>
      ${maintenanceDrafts.length ? `
        <aside class="maintenance-draft-strip" aria-label="预防性维保草稿">
          <strong>维保逾期工单草稿（${maintenanceDrafts.length}）</strong>
          ${maintenanceDrafts.slice(0, 3).map((item) => `
            <button type="button" data-approve-workorder="${item.id}" ${item.status === "approved" ? "disabled" : ""}>
              #${item.id} · ${escapeHtml(item.summary || "").slice(0, 48)}… · ${item.status === "approved" ? "已派发" : "待确认派发"}
            </button>
          `).join("")}
        </aside>
      ` : ""}
      ${workbenchTemplate()}
    </section>
  `;
}

function companyRail(company) {
  return `
    <aside class="company-rail" aria-labelledby="company-ranking-title">
      <div class="rail-title">
        <h2 id="company-ranking-title">检查对象与风险线索</h2>
        <button type="button" class="help-button" aria-label="检查优先级说明" data-action="ranking-help"><i data-lucide="circle-help"></i></button>
      </div>
      <div class="company-list">
        ${companies.map((item, index) => `
          <button class="company-row ${item.id === company.id ? "active" : ""}" type="button" data-company-id="${item.id}" aria-pressed="${item.id === company.id}">
            <span class="rank rank-${item.level}">${index + 1}</span>
            <span class="company-row-copy"><strong>${item.name}</strong><small>综合得分 ${scoreText(item.score)} · 未闭环 ${item.openHazards}</small></span>
            ${riskBadge(item)}
          </button>
        `).join("")}
      </div>
      <button class="secondary-action" type="button" data-action="company-detail"><i data-lucide="building-2"></i>查看企业详情</button>
      <div class="rail-note"><i data-lucide="shield-alert"></i><span>Demo 分数仅用于辅助分析，不替代现场检查和专业判断。</span></div>
    </aside>
  `;
}

function workbenchTemplate() {
  const company = selectedCompany();
  return `
    <div class="workbench-shell">
      ${companyRail(company)}
      <section class="plan-workspace" aria-labelledby="company-title">
        <header class="company-context">
          <div>
            <div class="company-title-line"><h1 id="company-title">${company.name}</h1>${riskBadge(company)}</div>
            <p>${company.building}<span>建筑面积 ${company.area}</span><span>地上 1 层</span><span>投用时间 2023-05</span></p>
          </div>
          <div class="building-context"><span><small>空间位置</small><strong>厂区总览 <i>/</i> ${escapeHtml(company.building)}</strong></span><button type="button" data-action="open-factory-overview"><i data-lucide="map"></i>返回厂区总览</button></div>
        </header>

        <section class="plan-panel" aria-labelledby="plan-title">
          <div class="plan-toolbar">
            <h2 id="plan-title">建筑消防平面与隐患定位</h2>
            <div class="plan-legend" aria-label="消防图例">
              <span><i data-lucide="square-dashed"></i>防火分区</span>
              <span class="legend-route"><i data-lucide="move-right"></i>疏散路线</span>
              <span class="legend-exit"><i data-lucide="door-open"></i>安全出口</span>
              <span class="legend-fire"><i data-lucide="fire-extinguisher"></i>灭火器</span>
              <span class="legend-water"><i data-lucide="droplets"></i>消火栓</span>
            </div>
          </div>
          <div class="plan-viewport">
            <div id="plan-canvas" class="plan-canvas" style="--plan-zoom: ${planZoom}">
              ${(() => {
                const building = buildingForEnterprise(company.id);
                if (building) return inspectionPlanTemplate(building, allIssues(), company.id);
                return `<img src="assets/fire-floorplan.png" alt="${escapeHtml(company.name)}消防平面图（空间数据未加载时的静态兜底）" />`
                  + allIssues().map((issue) => `<button class="map-pin ${issue.id === selectedIssueId ? "active" : ""}" style="--pin-left:${issue.pin.left}%;--pin-top:${issue.pin.top}%" type="button" data-issue-id="${issue.id}" aria-label="隐患 ${issue.number}：${issue.title}">${issue.number}</button>`).join("");
              })()}
            </div>
            <div class="zoom-controls" aria-label="平面图缩放">
              <button type="button" data-action="zoom-in" aria-label="放大"><i data-lucide="plus"></i></button>
              <button type="button" data-action="zoom-out" aria-label="缩小"><i data-lucide="minus"></i></button>
              <button type="button" data-action="zoom-reset">适应窗口</button>
            </div>
          </div>
        </section>

        <section class="route-section" aria-labelledby="route-title">
          <div class="section-heading"><div><h2 id="route-title">今日检查路线与状态</h2><span>2026-07-29</span></div><button type="button" data-action="route-history">查看历史路线<i data-lucide="chevron-right"></i></button></div>
          <div class="route-list">
            ${inspectionRoute.map((step, index) => `
              <button class="route-step route-${step.tone}" type="button" ${step.issueId ? `data-issue-id="${step.issueId}"` : ""}>
                <span class="route-number">${step.number}</span><strong>${step.title}</strong><small>${step.status}</small><time>${step.time}</time>
              </button>${index < inspectionRoute.length - 1 ? `<i class="route-arrow" data-lucide="arrow-right"></i>` : ""}
            `).join("")}
          </div>
          <div class="route-key"><span><b class="dot dot-muted"></b>待检查</span><span><b class="dot dot-amber"></b>检查中</span><span><b class="dot dot-orange"></b>隐患整改中</span><span><b class="dot dot-red"></b>待复查</span><span><b class="dot dot-green"></b>已闭环</span></div>
        </section>
      </section>
      ${rightPanel()}
    </div>
  `;
}

function rightPanel() {
  return `
    <aside class="risk-panel" aria-label="企业消防问题详情">
      <div class="panel-tabs" role="tablist">
        <button type="button" role="tab" data-panel-tab="hazards" aria-selected="${activeRightTab === "hazards"}" class="${activeRightTab === "hazards" ? "active" : ""}">隐患与整改</button>
        <button type="button" role="tab" data-panel-tab="equipment" aria-selected="${activeRightTab === "equipment"}" class="${activeRightTab === "equipment" ? "active" : ""}">设备设施状态</button>
      </div>
      ${activeRightTab === "hazards" ? hazardPanelContent() : equipmentPanelContent()}
    </aside>
  `;
}

function hazardPanelContent() {
  const catalog = allIssues();
  const visibleIssues = hazardFilter === "all" ? catalog : catalog.filter((issue) => issue.statusType === hazardFilter);
  return `
    <div class="filter-pills" aria-label="隐患筛选">
      <button class="${hazardFilter === "all" ? "active" : ""}" type="button" data-hazard-filter="all">全部 <b>${catalog.length}</b></button>
      <button class="${hazardFilter === "urgent" ? "active" : ""}" type="button" data-hazard-filter="urgent">待整改 <b>${catalog.filter((item) => item.statusType === "urgent").length}</b></button>
      <button class="${hazardFilter === "progress" ? "active" : ""}" type="button" data-hazard-filter="progress">整改中 <b>${catalog.filter((item) => item.statusType === "progress").length}</b></button>
      <button type="button" data-hazard-filter="closed">已闭环 <b>0</b></button>
    </div>
    <div class="panel-filters"><select aria-label="隐患状态"><option>全部状态</option><option>逾期</option><option>重复隐患</option></select><select aria-label="隐患排序"><option>按发现时间</option><option>按整改期限</option></select></div>
    <div class="issue-list">
      ${visibleIssues.length ? visibleIssues.map(issueCard).join("") : `<div class="empty-panel"><i data-lucide="circle-check-big"></i><strong>当前筛选没有隐患</strong><span>已闭环记录可在历史列表中查看。</span></div>`}
    </div>
    <div class="panel-pagination"><span>共 ${catalog.length} 条</span><div><button type="button" disabled aria-label="上一页"><i data-lucide="chevron-left"></i></button><button type="button" class="active" disabled data-disabled-reason="当前仅一页">1</button></div></div>
  `;
}

function issueCard(issue) {
  return `
    <article class="issue-card issue-${issue.statusType} ${issue.id === selectedIssueId ? "selected" : ""}" data-issue-card="${issue.id}">
      <button class="issue-select" type="button" data-issue-id="${issue.id}" aria-label="在平面图定位${issue.title}"><span>${issue.number}</span><strong>${issue.title}</strong><small>${issue.status}</small></button>
      <div class="issue-location">${issue.location}<span>${issue.tag}</span></div>
      <dl><div><dt>问题描述</dt><dd>${issue.description}</dd></div><div><dt>责任部门</dt><dd>${issue.department}</dd></div><div><dt>整改责任人</dt><dd>${issue.owner}</dd></div><div><dt>整改期限</dt><dd>${issue.dueAt} <b>${issue.dueText}</b></dd></div><div><dt>发现时间</dt><dd>${issue.foundAt}</dd></div></dl>
      <div class="evidence-row"><img src="${issue.image}" alt="${issue.title}现场证据照片" /><span>证据（1）</span><button type="button" data-action="open-evidence" data-issue-id="${issue.id}"><i data-lucide="paperclip"></i><span class="sr-only">查看证据</span></button></div>
      <div class="issue-footer"><span>${issue.repeated}</span><button type="button" data-action="reinspect" data-issue-id="${issue.id}">${issue.number === 1 ? "发起专项复查" : "查看整改详情"}</button></div>
    </article>
  `;
}

function equipmentPanelContent() {
  return `
    <div class="equipment-summary"><div><strong>40</strong><span>设备总数</span></div><div><strong class="status-green">37</strong><span>正常</span></div><div><strong class="status-amber">2</strong><span>故障</span></div><div><strong class="status-red">1</strong><span>离线</span></div></div>
    <div class="equipment-list">
      ${equipment.map((item) => `<button type="button" data-action="equipment-detail"><span class="equipment-icon"><i data-lucide="${item.icon}"></i></span><span><strong>${item.name}</strong><small>${item.location} · 更新 ${item.updated}</small></span><b class="${item.state.includes("正常") ? "status-green" : item.state.includes("故障") ? "status-amber" : "status-red"}">${item.state}</b><i data-lucide="chevron-right"></i></button>`).join("")}
    </div>
    <button class="primary-action panel-primary" type="button" data-action="all-equipment"><i data-lucide="list-checks"></i>查看全部设备</button>
  `;
}

function analysisSubnav(active) {
  return `<nav class="analysis-subnav" aria-label="分析复盘子模块"><a href="#/analysis/ent-001" class="${active === "risk" ? "active" : ""}">车间风险</a><a href="#/weekly" class="${active === "weekly" ? "active" : ""}">消防周报</a><a href="#/review/OFFLINE-INC-001" class="${active === "review" ? "active" : ""}">出警战评</a></nav>`;
}

function weeklyReportTemplate() {
  const metrics = opsMetrics();
  const categories = metrics?.categories.length ? metrics.categories : [{ name: "暂无巡查记录", count: 0, percent: 0 }];
  const workshops = metrics?.workshops.length ? metrics.workshops : companies.map((company) => ({ name: company.name.replace(/（.*?）/g, ""), count: 0, rate: 0, alarms: 0, openWorkorders: 0 }));
  const formatDate = (value) => value ? value.slice(0, 10) : "待加载";
  const topOpenWorkshop = metrics?.workshops.find((item) => item.count > item.closed);
  const suggestions = metrics ? [
    topOpenWorkshop ? `优先跟进${topOpenWorkshop.name} ${topOpenWorkshop.count - topOpenWorkshop.closed} 项未闭环问题，复查通过前不计入整改率。` : null,
    metrics.falseAlarmCount ? `复盘 ${metrics.falseAlarmCount} 起误报对应的探测器和维保记录，减少同类重复报警。` : null,
    metrics.openWorkorders ? `还有 ${metrics.openWorkorders} 张维保工单待验收，设施部门关闭前需要核对测试证据。` : null,
  ].filter(Boolean) : ["运营记录正在加载，周报指标会按合成明细自动计算。"];
  const evidenceItems = metrics?.records.slice(0, 6) || [];
  const operations = metrics?.operations;
  const alarmTrend = operations?.alarm_trend || [];
  const timing = metrics?.timeliness;
  const quality = operations?.data_quality;
  const rounded = (value) => Number.isFinite(value) ? Math.round(value) : "—";
  const breakdown = (value) => Object.entries(value || {}).map(([name, count]) => `${name} ${count}`).join(" · ") || "暂无记录";
  return `
    <section class="weekly-report-page" aria-labelledby="weekly-report-title">
      ${analysisSubnav("weekly")}
      <header class="weekly-report-header"><div><span>WEEKLY FIRE SAFETY</span><h1 id="weekly-report-title">消防安全周报</h1><p>${formatDate(metrics?.week?.start)} 至 ${formatDate(metrics?.week?.end)} · 合成演示数据，不含企业历史 Excel</p></div><button type="button" class="secondary-action" data-action="weekly-export"><i data-lucide="download"></i>导出正式周报</button></header>
      <dl class="weekly-kpis"><div><dt>本周报警</dt><dd>${metrics?.alarmCount ?? "—"}</dd><small>确认火警 ${metrics?.confirmedFireCount ?? 0} · 误报 ${metrics?.falseAlarmCount ?? 0}</small></div><div><dt>巡查发现</dt><dd>${metrics?.findingCount ?? "—"}</dd><small>按问题标签与车间统计</small></div><div><dt>整改闭环率</dt><dd>${metrics ? `${metrics.rectificationRate}%` : "—"}</dd><small>巡查复查通过后才关闭</small></div><div><dt>维保闭环率</dt><dd>${metrics ? `${metrics.maintenanceRate}%` : "—"}</dd><small>设施部门验收后才关闭</small></div></dl>
      <section class="efficiency-baseline" data-efficiency-baseline><header><div><span>PROCESS BASELINE</span><h2>人工流程基线与测量口径</h2></div><b>人工基线已录入</b></header><div><article><strong>主机故障</strong><span>人工录入约 3 分钟 + 电话转派约 3 分钟</span><em>约 6 分钟/单 · 一线估计</em></article><article><strong>消防巡查</strong><span>约 10 条/日 × 二次录入约 3 分钟/条</span><em>约 30 分钟/日 · 一线估计</em></article><article><strong>配对测量方案</strong><span>系统已记录五个流程节点，可与人工流程逐项配对</span><em>按中位数、P90 和样本量报告</em></article></div><p>这组数字用于说明人工现状；样本形成前不提前宣称 FireOps 的提效比例。</p></section>
      <div class="weekly-grid">
        <article class="weekly-card"><header><div><span>ISSUE CATEGORY</span><h2>问题类型分布</h2></div><b>${metrics?.findingCount ?? 0} 项</b></header><div class="weekly-category-list">${categories.map((item) => `<div data-weekly-category><span><strong>${escapeHtml(item.name)}</strong><small>${item.count} 项 · ${item.percent}%</small></span><i><b style="width:${item.percent}%"></b></i></div>`).join("")}</div></article>
        <article class="weekly-card"><header><div><span>WORKSHOP COMPARISON</span><h2>车间问题与整改率</h2></div><b>${workshops.length} 个车间</b></header><div class="weekly-workshop-list">${workshops.map((item, index) => `<div data-weekly-workshop><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(item.name)}</strong><em>${item.count} 项</em><i><b style="width:${item.rate}%"></b></i><small>${item.rate}%</small></div>`).join("")}</div></article>
        <article class="weekly-card weekly-trend"><header><div><span>ALARM TREND</span><h2>接处警趋势</h2></div><b>按日统计</b></header><div class="weekly-bars">${alarmTrend.map((item) => `<div><span><i style="height:${Math.max(8, item.received * 30)}px"></i><b style="height:${Math.max(4, item.false_alarm * 30)}px"></b></span><small>周${escapeHtml(item.day)}</small></div>`).join("")}</div><footer><span><i></i>接警</span><span><i></i>误报</span></footer></article>
        <article class="weekly-card weekly-ai"><header><div><span>MANAGEMENT ACTIONS</span><h2>本周管理建议</h2></div><b>下载后可在 Word 中修改</b></header><ol>${suggestions.map((suggestion, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><p><strong data-weekly-editable>${escapeHtml(suggestion)}</strong><small>依据报警、维保和巡查明细生成，责任判断由管理层确认。</small></p></li>`).join("")}</ol><aside><i data-lucide="shield-check"></i><span>导出文件包含趋势图、闭环对比、样本量和数据边界，可在 Word 中继续修改。</span></aside></article>
      </div>
      <details class="weekly-details"><summary>查看运行统计、时效样本与业务记录</summary><div class="weekly-grid weekly-grid-details">
        <article class="weekly-card weekly-evidence"><header><div><span>OPERATIONS COVERAGE</span><h2>运行管理维度</h2></div><b>按本周台账统计</b></header><div class="weekly-evidence-list"><div><strong>消防系统中断</strong><span>${operations?.system_interruptions?.total ?? 0} 起 · 已闭环 ${operations?.system_interruptions?.closed ?? 0} · 逾期 ${operations?.system_interruptions?.overdue ?? 0}</span><small>从主机故障与关闭时间字段计算</small></div><div><strong>动火作业监管</strong><span>${operations?.hot_work?.permits ?? 0} 项 · 监护 ${operations?.hot_work?.monitored ?? 0} · 异常 ${operations?.hot_work?.exceptions ?? 0}</span><small>统计许可、监护与复查记录</small></div><div><strong>每日防火巡查</strong><span>计划 ${operations?.patrol?.planned ?? 0} · 完成 ${operations?.patrol?.completed ?? 0} · 隐患 ${operations?.patrol?.findings ?? 0}</span><small>重复隐患 ${operations?.patrol?.repeat ?? 0} 项，需独立复查后关闭</small></div><div><strong>ERT 响应记录</strong><span>触发 ${operations?.ert?.alerts ?? 0} · 参与 ${operations?.ert?.participations ?? 0} · 已记录到场 ${operations?.ert?.arrival_recorded ?? 0}</span><small>缺少到场时间的记录单独标记，不参与时效均值</small></div></div></article>
        <article class="weekly-card weekly-evidence" data-weekly-analytics="timeliness"><header><div><span>RESPONSE TIMELINESS</span><h2>闭环时效与样本</h2></div><b>按有效记录计算</b></header><div class="weekly-evidence-list"><div><strong>接警到闭环</strong><span>P50 ${rounded(timing?.alarm?.p50)} 分钟 · P90 ${rounded(timing?.alarm?.p90)} 分钟</span><small>有效样本 n=${timing?.alarm?.sample ?? 0}</small></div><div><strong>维保工单关闭</strong><span>P50 ${rounded(timing?.workorder?.p50)} 小时</span><small>有效样本 n=${timing?.workorder?.sample ?? 0}</small></div><div><strong>隐患整改关闭</strong><span>P50 ${rounded(timing?.finding?.p50)} 小时</span><small>有效样本 n=${timing?.finding?.sample ?? 0}</small></div><div><strong>数据完整率</strong><span>${percentOf(quality?.complete ?? 0, quality?.records ?? 0)}% · ${quality?.complete ?? 0}/${quality?.records ?? 0} 条</span><small>缺确认时间 ${quality?.missing_confirmation_time ?? 0} 条 · 缺到场时间 ${quality?.missing_arrival_time ?? 0} 条；缺失端点不计入时效</small></div></div></article>
        <article class="weekly-card weekly-evidence" data-weekly-analytics="depth"><header><div><span>OPERATIONS DEPTH</span><h2>运行深度分布</h2></div><b>按管理维度拆分</b></header><div class="weekly-evidence-list"><div data-weekly-dimension><strong>系统中断类型</strong><span>${breakdown(operations?.system_interruptions?.type_breakdown)}</span></div><div data-weekly-dimension><strong>中断持续时间</strong><span>${breakdown(operations?.system_interruptions?.duration_buckets)}</span></div><div data-weekly-dimension><strong>动火作业级别</strong><span>${breakdown(operations?.hot_work?.level_breakdown)}</span></div><div data-weekly-dimension><strong>巡查抽检</strong><span>天气 ${operations?.patrol?.weather_sampling?.completed ?? 0}/${operations?.patrol?.weather_sampling?.planned ?? 0} · 能力 ${operations?.patrol?.ability_checks?.passed ?? 0}/${operations?.patrol?.ability_checks?.sampled ?? 0}</span></div><div data-weekly-dimension><strong>ERT 车间参与</strong><span>${breakdown(operations?.ert?.by_workshop)}</span></div><small>接入正式台账后仍按这一口径计算。</small></div></article>
        <article class="weekly-card weekly-evidence"><header><div><span>业务记录</span><h2>本周记录与证据</h2></div><b>${metrics?.records.length ?? 0} 条</b></header><div class="weekly-evidence-list">${evidenceItems.map((item) => { const copy = weeklyRecordCopy(item); return `<div><strong>${escapeHtml(copy.type)}</strong><span>${escapeHtml(workshopLabel(item.workshop_id))} · ${escapeHtml(copy.status)}</span><small>已留存：${escapeHtml(copy.evidence)}</small></div>`; }).join("") || "<div><strong>暂无运营记录</strong><span>等待业务记录加载</span></div>"}</div></article>
      </div></details>
    </section>`;
}

function reportTemplate() {
  const company = selectedCompany();
  const assessment = company.id === latestAssessment.enterpriseId ? latestAssessment : null;
  if (!assessment) return `
    <section class="report-page report-empty-page">${analysisSubnav("risk")}
      <header class="report-header"><div><span>FIRE SAFETY ASSESSMENT</span><h1>${escapeHtml(company.name)}消防健康报告</h1><p>用于完成风险评分后的研判，以及月度、季度消防复盘。</p></div><a href="#/inspections" class="secondary-action"><i data-lucide="arrow-left"></i>返回防火巡查</a></header>
      <div class="report-empty-state"><i data-lucide="file-warning"></i><h2>暂无评分数据</h2><p>当前车间还没有可用于生成报告的结构化评分。请先导入数据，或载入固定演示数据查看完整报告。</p><button type="button" class="primary-action" data-action="use-demo-assessment">使用演示数据</button><small>演示数据不会写入数据库，也不代表真实检查结论。</small></div>
    </section>`;
  const score = assessment.totalScore;
  const level = assessment.riskLevel;
  const rules = assessment.triggeredRules || [];
  return `
    <section class="report-page">${analysisSubnav("risk")}
        <header class="report-header"><div><span>结构化模板生成 · ${assessment.ruleVersion || DEMO_RULESET}</span><h1>${escapeHtml(company.name)}消防健康报告</h1><p>用于风险评分后或周期复盘 · 数据截止 ${assessment.dataCutoff?.replace("T", " ").slice(0, 16) || DATA_CUTOFF} · 当前得分 ${scoreText(score)} · ${riskLabel(level)}</p></div><a href="#/inspections" class="secondary-action"><i data-lucide="arrow-left"></i>返回防火巡查</a></header>
      <div class="report-layout">
        <aside class="report-facts"><h2>结构化事实</h2><div><span>触发规则</span><strong>${rules.length}</strong></div><div><span>累计扣分</span><strong>${score === null ? "—" : 100 - score}</strong></div><div><span>原始证据</span><strong>${rules.reduce((sum, rule) => sum + rule.evidence.length, 0)}</strong></div><div><span>数据状态</span><strong>${level === "unrated" ? "不足" : "完整"}</strong></div><p>输入指纹 ${assessment.inputHash || "演示固定输入"}<br />以上字段来自确定性规则，报告不得改写数值。</p></aside>
        <article class="report-document"><div class="document-meta"><span>报告状态：草稿</span><button type="button" data-action="save-report">保存修订</button></div><textarea id="report-editor">${reportText(company, assessment)}</textarea><div class="document-actions"><button type="button" data-action="regenerate">重新生成</button><button class="primary-action" type="button" data-action="confirm-report">确认报告</button></div></article>
      </div>
    </section>
  `;
}

function reportText(company, assessment) {
  const score = assessment?.totalScore ?? company.score;
  const level = assessment?.riskLevel || company.level;
  const ruleLines = assessment?.triggeredRules?.length
    ? assessment.triggeredRules.map((rule, index) => `${index + 1}. ${rule.title}（${rule.code}）\n   指标：${rule.metric || "数据缺失"}；扣分：${rule.deduction}；证据：${rule.evidence.length} 条。`).join("\n")
    : "当前没有可用的结构化评分结果。";
  return `一、总体结论\n\n${company.name}当前消防健康指数为 ${scoreText(score)}，风险等级为${riskLabel(level)}。本报告基于 ${assessment?.ruleVersion || DEMO_RULESET} 确定性规则生成。\n\n二、重点风险与证据\n\n${ruleLines}\n\n三、建议行动\n\n优先处理逾期整改和重复隐患，核对消防控制室值班记录、人员履职与火警处置流程，并跟踪现场隐患至复查闭环。\n\n四、数据局限\n\n${level === "unrated" ? "当前数据缺失或无效，不能据此判断设施运行正常。" : "当前数据满足 Demo 评分要求，正式结论仍需结合现场检查和专家判断。"}\n\n声明：本报告仅用于内部辅助分析，不替代法定检查、行政执法结论或消防专业判断。`;
}

function renderRoute() {
  const previousRoot = document.body.dataset.route;
  const [routePath, queryString = ""] = (location.hash || "#/home").replace(/^#\//, "").split("?");
  const route = routePath.split("/");
  applyRouteContext(new URLSearchParams(queryString));
  let root = route[0] || "home";
  if (root === "workbench") {
    root = "inspections";
    history.replaceState(null, "", "#/inspections");
  }
  if (root === "workflow") {
    root = "incidents";
    history.replaceState(null, "", "#/incidents?view=progress");
  }
  if (root === "incidents" && !judgeTour.active && !MONITORING_API_BASE) ensureOfflineIncidentDemo();
  updateRoleNavigation(root);
  const hasRoleAccess = root === "home" || activeRoleDefinition().modules.includes(routeModule(root));
  const importButton = document.querySelector(".header-import");
  if (importButton) importButton.hidden = !hasRoleAccess || !["fire_patrol", "control_room_operator"].includes(activeRoleId) || !["inspections", "analysis"].includes(root);
  document.body.dataset.route = root;
  if (!hasRoleAccess) {
    app.innerHTML = roleAccessDeniedTemplate();
  } else if (root === "review") {
    app.innerHTML = incidentReviewTemplate(route[1]);
  } else if (root === "weekly") {
    app.innerHTML = weeklyReportTemplate();
  } else if (root === "analysis") {
    if (route[1]) selectedCompanyId = route[1];
    app.innerHTML = reportTemplate();
  } else if (root === "inspections") {
    app.innerHTML = inspectionTemplate();
  } else if (root === "home") {
    app.innerHTML = homeTemplate();
  } else if (root === "monitoring") {
    app.innerHTML = monitoringTemplate();
  } else if (root === "incidents") {
    app.innerHTML = incidentCommandTemplate();
  } else if (root === "copilot") {
    app.innerHTML = copilotTemplate();
    loadCopilotScenarios();
  } else if (root === "station") {
    app.innerHTML = stationTerminalTemplate();
  } else if (root === "owner") {
    app.innerHTML = ownerInboxTemplate();
  } else if (root === "enterprises") {
    if (route[1]) selectedCompanyId = route[1];
    app.innerHTML = enterpriseDossierTemplate(selectedCompanyId);
  } else {
    app.innerHTML = homeTemplate();
  }
  bindDynamicActions();
  applyRoleActionPermissions();
  refreshIcons();
  window.dispatchEvent(new CustomEvent("fireguard:route-rendered", { detail: { root } }));
  clearTimeout(threeDFallbackTimer);
  if (hasRoleAccess && document.querySelector("#monitoring-3d, #workshop-3d")) {
    threeDFallbackTimer = setTimeout(() => {
      const host = document.querySelector("#monitoring-3d, #workshop-3d");
      if (host && host.getAttribute("data-3d-state") !== "ready") renderThreeDFallback(host);
    }, 3500);
  }
  if (root === "enterprises" && hasRoleAccess) loadEnterpriseDossier(selectedCompanyId);
  if (!judgeTour.active && root === "monitoring" && hasRoleAccess) startMonitoringBackend();
  else if (monitoringEventSource) stopMonitoringBackend();
  if (!judgeTour.active && hasRoleAccess && ["incidents", "station", "owner", "inspections", "copilot"].includes(root)) startIncidentBackend();
  else if (incidentEventSource) stopIncidentBackend();
  if (!judgeTour.active || previousRoot !== root) window.scrollTo({ top: 0, behavior: "instant" });
}

function renderThreeDFallback(host) {
  if (!host || host.getAttribute("data-3d-state") === "ready") return;
  host.setAttribute("data-3d-state", "fallback");
  host.classList.add("no-webgl");
  host.querySelector(".twin-loading")?.remove();
  const workshop = host.id === "workshop-3d";
  if (!host.querySelector(".twin-fallback")) host.insertAdjacentHTML("beforeend", `
    <div class="twin-fallback">
      <strong>三维态势暂不可用</strong>
      <span>仍可通过二维入口完成评审流程。</span>
      <button type="button" ${workshop ? "data-open-floor" : 'data-enter-workshop="ent-001"'}>${workshop ? "进入楼层平面" : "进入电池车间"}</button>
    </div>`);
  bindSpatialActions();
}

function bindSpatialActions() {
  app.querySelectorAll("[data-enter-workshop]").forEach((button) => button.addEventListener("click", () => {
    const enterpriseId = button.dataset.enterWorkshop;
    const building = buildingForEnterprise(enterpriseId);
    if (!building) return showToast("车间空间数据尚未加载完成，请稍后再试");
    selectedCompanyId = enterpriseId;
    const firstEvent = monitoringState.events.find((event) => event.enterpriseId === enterpriseId);
    if (firstEvent) monitoringState.selectedId = firstEvent.id;
    monitoringState.floor = workshopFloor(building, firstEvent);
    monitoringState.spatialLevel = "floor";
    if (document.body.dataset.route === "home") {
      location.hash = "#/monitoring";
      return;
    }
    renderRoute();
  }));
  app.querySelectorAll("[data-return-factory]").forEach((button) => button.addEventListener("click", () => {
    monitoringState.spatialLevel = "factory";
    renderRoute();
  }));
  app.querySelectorAll("[data-open-floor]").forEach((button) => button.addEventListener("click", () => {
    monitoringState.spatialLevel = "floor";
    renderRoute();
  }));
  app.querySelectorAll("[data-return-workshop]").forEach((button) => button.addEventListener("click", () => {
    monitoringState.spatialLevel = "workshop";
    renderRoute();
  }));
}

function bindDynamicActions() {
  bindSpatialActions();
  app.querySelectorAll("[data-signal-select]").forEach((button) => button.addEventListener("click", () => {
    selectedSignalEventId = button.dataset.signalSelect; renderRoute();
  }));
  app.querySelectorAll("[data-incident-select]").forEach((button) => button.addEventListener("click", () => {
    selectedIncidentId = button.dataset.incidentSelect; renderRoute();
  }));
  app.querySelectorAll("[data-station-task]").forEach((button) => button.addEventListener("click", () => {
    selectedStationTaskId = Number(button.dataset.stationTask); renderRoute();
  }));
  app.querySelectorAll("[data-inbox-select]").forEach((button) => button.addEventListener("click", () => {
    selectedInboxId = button.dataset.inboxSelect;
    const item = (incidentBackend.inbox || []).find((row) => row.inbox_id === selectedInboxId);
    if (item?.incident_id) selectedStationTaskId = item.incident_id;
    renderRoute();
  }));
  document.querySelector("#terminal-crew-select")?.addEventListener("change", (event) => {
    terminalStationId = event.target.value;
    selectedInboxId = null;
    scheduleIncidentRefresh();
  });
  document.querySelector("#terminal-owner-select")?.addEventListener("change", (event) => {
    terminalOwnerName = event.target.value;
    selectedInboxId = null;
    history.replaceState(null, "", routeHash("owner", { owner: terminalOwnerName }));
    scheduleIncidentRefresh();
  });
  document.querySelector("#dossier-enterprise-select")?.addEventListener("change", (event) => {
    selectedCompanyId = event.target.value;
    enterpriseDossierState = { id: null, data: null, loading: false, error: "" };
    location.hash = `#/enterprises/${selectedCompanyId}`;
  });
  app.querySelectorAll("[data-repair-select]").forEach((button) => button.addEventListener("click", () => {
    const eventId = Number(button.dataset.repairEvent);
    const workorderId = Number(button.dataset.repairSelect);
    const draft = (incidentBackend.repairDrafts || []).find((item) => item.workorder_id === workorderId);
    if (eventId) {
      bindHubSignal(eventId, draft?.enterprise_id || selectedCompanyId, "C-controller-fault-diagnosis");
    } else {
      terminalStationId = "crew-wb-01";
      selectedInboxId = `workorder-${workorderId}`;
      location.hash = "#/station";
      scheduleIncidentRefresh();
    }
  }));
  app.querySelectorAll("[data-monitoring-company]").forEach((button) => button.addEventListener("click", () => {
    selectedCompanyId = button.dataset.monitoringCompany;
    renderRoute();
  }));
  app.querySelectorAll("[data-monitoring-filter]").forEach((button) => button.addEventListener("click", () => {
    monitoringState.filter = button.dataset.monitoringFilter;
    const visible = window.FireGuardEngine.filterMonitoringEvents(monitoringState.events, monitoringState.filter);
    if (visible.length && !visible.some((event) => event.id === monitoringState.selectedId)) {
      monitoringState.selectedId = visible[0].id;
      monitoringState.floor = visible[0].floor;
    }
    const selected = monitoringState.events.find((event) => event.id === monitoringState.selectedId);
    if (monitoringState.spatialLevel !== "factory" && !buildingForEnterprise(selected?.enterpriseId)) monitoringState.spatialLevel = "factory";
    renderRoute();
  }));
  app.querySelectorAll("[data-monitoring-event], [data-monitoring-event-pin]").forEach((button) => button.addEventListener("click", () => {
    monitoringState.selectedId = button.dataset.monitoringEvent || button.dataset.monitoringEventPin;
    const event = monitoringState.events.find((item) => item.id === monitoringState.selectedId);
    if (event) {
      selectedCompanyId = event.enterpriseId;
      const building = buildingForEnterprise(event.enterpriseId);
      monitoringState.floor = building ? workshopFloor(building, event) : event.floor;
      if (monitoringState.spatialLevel !== "factory" && !buildingForEnterprise(event.enterpriseId)) monitoringState.spatialLevel = "factory";
      else monitoringState.spatialLevel = "floor";
    }
    renderRoute();
  }));
  app.querySelectorAll("[data-monitoring-tab]").forEach((button) => button.addEventListener("click", () => {
    monitoringState.tab = button.dataset.monitoringTab;
    renderRoute();
  }));
  app.querySelectorAll("[data-monitoring-floor]").forEach((button) => button.addEventListener("click", () => {
    monitoringState.floor = button.dataset.monitoringFloor;
    renderRoute();
  }));
  app.querySelectorAll("[data-plan-floor]").forEach((button) => button.addEventListener("click", () => {
    inspectionFloor = button.dataset.planFloor;
    renderRoute();
  }));
  app.querySelectorAll("[data-enterprise-beacon]").forEach((button) => button.addEventListener("click", () => {
    selectedCompanyId = button.dataset.enterpriseBeacon;
    renderRoute();
  }));
  app.querySelectorAll("[data-copilot-bind]").forEach((button) => button.addEventListener("click", () => {
    copilotState.bindSource = button.dataset.copilotBind;
    if (copilotState.bindSource === "scenario") {
      copilotState.hubEventId = null;
      copilotState.hubEnterpriseId = null;
    }
    renderRoute();
  }));
  app.querySelectorAll("[data-hub-signal]").forEach((button) => button.addEventListener("click", () => {
    copilotState.bindSource = "hub";
    copilotState.hubEventId = Number(button.dataset.hubSignal);
    copilotState.hubEnterpriseId = button.dataset.hubEnterprise || null;
    renderRoute();
  }));

  app.querySelectorAll("[data-company-id]").forEach((button) => button.addEventListener("click", () => {
    selectedCompanyId = button.dataset.companyId;
    selectedIssueId = allIssues()[0]?.id || "hazard-01";
    renderRoute();
  }));

  app.querySelectorAll("[data-approve-workorder]").forEach((button) => button.addEventListener("click", () => {
    approveMaintenanceWorkorder(Number(button.dataset.approveWorkorder));
  }));

  app.querySelectorAll("[data-issue-id]").forEach((button) => button.addEventListener("click", () => {
    selectedIssueId = button.dataset.issueId;
    renderRoute();
    document.querySelector(`[data-issue-card="${selectedIssueId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }));

  app.querySelectorAll("[data-panel-tab]").forEach((button) => button.addEventListener("click", () => {
    activeRightTab = button.dataset.panelTab;
    renderRoute();
  }));

  app.querySelectorAll("[data-hazard-filter]").forEach((button) => button.addEventListener("click", () => {
    hazardFilter = button.dataset.hazardFilter;
    renderRoute();
  }));

  document.querySelector("#maintenance-test-result")?.addEventListener("change", (event) => { maintenanceOpsState.draft.result = event.target.value; });
  document.querySelector("#maintenance-safety-measure")?.addEventListener("change", (event) => { maintenanceOpsState.draft.safety = event.target.value; });
  document.querySelector("#maintenance-test-note")?.addEventListener("input", (event) => { maintenanceOpsState.draft.note = event.target.value; });
  document.querySelector("#maintenance-spare-used")?.addEventListener("change", (event) => { maintenanceOpsState.draft.spareId = event.target.value; });
  document.querySelector("#rectification-evidence-file")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return showToast("请选择 PNG、JPEG 或 WebP 图片");
    if (file.size > 5 * 1024 * 1024) return showToast("整改照片不能超过 5 MB");
    const reader = new FileReader();
    reader.onload = () => {
      const selected = (incidentBackend.inbox || []).find((item) => item.inbox_id === selectedInboxId);
      rectificationEvidence = { workorderId: String(selected?.workorder_id || ""), name: file.name, url: reader.result };
      renderRoute();
      showToast("整改照片已加入本次记录");
    };
    reader.readAsDataURL(file);
  });

  app.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.action === "approve-inbox-workorder") {
      approveMaintenanceWorkorder(button.dataset.workorderId).then(() => scheduleIncidentRefresh());
      return;
    }
    if (button.dataset.action === "start-inbox-workorder") {
      startInboxWorkorder(button.dataset.workorderId);
      return;
    }
    if (button.dataset.action === "complete-inbox-workorder") {
      completeInboxWorkorder(button.dataset.workorderId);
      return;
    }
    if (button.dataset.action === "accept-inbox-workorder" || button.dataset.action === "reject-inbox-workorder") {
      acceptInboxWorkorder(button.dataset.workorderId, button.dataset.action === "accept-inbox-workorder" ? "accepted" : "rejected");
      return;
    }
    if (button.dataset.action === "diagnose-event-copilot") {
      bindHubSignal(Number(button.dataset.eventId), button.dataset.enterpriseId, "C-controller-fault-diagnosis");
      return;
    }
    handleAction(button.dataset.action, button.dataset.issueId, button);
  }));

  app.querySelectorAll("[data-workflow-continue]").forEach((button) => button.addEventListener("click", () => {
    const actor = button.dataset.actor;
    if (actor) setDemoActor(actor);
    if (button.dataset.incidentId) selectedIncidentId = Number(button.dataset.incidentId);
    if (button.dataset.crewId) {
      terminalStationId = button.dataset.crewId;
      selectedInboxId = null;
      selectedStationTaskId = null;
    }
    location.hash = button.dataset.route || "#/incidents?view=progress";
    scheduleIncidentRefresh();
  }));

  app.querySelectorAll("[data-copilot-scenario]").forEach((button) => button.addEventListener("click", () => {
    copilotState.selectedId = button.dataset.copilotScenario;
    renderRoute();
  }));
  app.querySelectorAll("[data-copilot-mode]").forEach((button) => button.addEventListener("click", () => {
    copilotState.mode = button.dataset.copilotMode;
    renderRoute();
  }));
  app.querySelectorAll("[data-copilot-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.copilotAction;
    if (action === "judge-run") startJudgeDemo();
    else if (action === "run") runCopilotScenario();
    else if (action === "reset") resetCopilot();
    else if (action === "dispatch") confirmCopilotDispatch();
    else if (action === "offline-archive") archiveOfflineJudgeDemo();
    else if (action === "view-record") openCopilotRunRecord();
    else if (action === "export-audit") exportCopilotAuditPack();
  }));
  app.querySelectorAll("[data-copilot-verify]").forEach((button) => button.addEventListener("click", () => {
    confirmCopilotVerification(button.dataset.copilotVerify);
  }));
}

const expectedCsvFiles = ["alarm_events.csv", "enterprises.csv", "findings.csv", "iot_devices.csv", "maintenance_records.csv"];

function bindDialogs() {
  const fileInput = document.querySelector("#csv-files");
  const runImport = document.querySelector("#run-import");
  document.querySelector("#run-record-download")?.addEventListener("click", exportCopilotAuditPack);
  fileInput.addEventListener("change", () => {
    const names = [...fileInput.files].map((file) => file.name).sort();
    document.querySelector("#import-file-list").textContent = names.length ? names.join(" · ") : "尚未选择文件";
    runImport.disabled = names.length !== expectedCsvFiles.length;
    document.querySelector("#import-result").textContent = "";
  });
  runImport.addEventListener("click", async () => {
    runImport.disabled = true;
    runImport.textContent = "正在校验…";
    const resultBox = document.querySelector("#import-result");
    try {
      const assessment = await importCsvFiles([...fileInput.files]);
      resultBox.className = "import-result success";
      resultBox.textContent = `导入成功：${assessment.totalScore ?? "—"} 分，${riskLabel(assessment.riskLevel)}，触发 ${assessment.triggeredRules.length} 条规则，输入指纹 ${assessment.inputHash || "无"}`;
      showToast("CSV 数据已校验并完成风险评分");
    } catch (error) {
      resultBox.className = "import-result error";
      resultBox.textContent = error.message;
    } finally {
      runImport.textContent = "校验并评分";
      runImport.disabled = false;
    }
  });

  document.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", () => document.querySelector(`#${button.dataset.dialogClose}`)?.close()));
  document.querySelector("#start-reinspection").addEventListener("click", () => {
    recheckInspectionFinding();
  });

  const assetGrid = document.querySelector("#inspect-asset-grid");
  if (assetGrid) {
    assetGrid.innerHTML = DEMO_INSPECT_ASSETS.map((asset) => `
      <button type="button" class="inspect-asset ${asset === inspectCapture.imageAsset ? "selected" : ""}" data-inspect-asset="${asset}" role="option" aria-selected="${asset === inspectCapture.imageAsset}">
        <img src="${asset}" alt="演示证据 ${asset.split("/").pop()}" />
      </button>
    `).join("");
    assetGrid.querySelectorAll("[data-inspect-asset]").forEach((button) => button.addEventListener("click", () => {
      inspectCapture.imageAsset = button.dataset.inspectAsset;
      inspectCapture.draft = null;
      inspectCapture.findingId = null;
      assetGrid.querySelectorAll("[data-inspect-asset]").forEach((item) => {
        const selected = item.dataset.inspectAsset === inspectCapture.imageAsset;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-selected", selected ? "true" : "false");
      });
      renderInspectDraftPanel();
    }));
  }
  document.querySelector("#inspect-analyze-btn")?.addEventListener("click", () => analyzeInspectionDraft());
  document.querySelector("#inspect-dispatch-btn")?.addEventListener("click", () => dispatchInspectionFinding());
  document.querySelector("#inspect-voice-btn")?.addEventListener("click", () => startInspectVoiceInput());
  document.querySelector("#inspect-voice-text")?.addEventListener("input", (event) => {
    inspectCapture.voiceText = event.target.value;
  });
}

function findingToIssue(finding, number) {
  const statusMap = {
    draft: { status: "待派发确认", statusType: "urgent" },
    assigned: { status: "隐患整改中", statusType: "progress" },
    in_progress: { status: "隐患整改中", statusType: "progress" },
    closed: { status: "已闭环", statusType: "progress" },
    abstained: { status: "证据不足", statusType: "urgent" },
  };
  const mapped = statusMap[finding.status] || statusMap.draft;
  const pin = finding.pin && typeof finding.pin === "object" ? finding.pin : { left: 50, top: 50 };
  return {
    id: `finding-${finding.id}`,
    number,
    title: finding.title,
    location: finding.location || "未知位置",
    tag: finding.category || "巡查隐患",
    status: mapped.status,
    statusType: mapped.statusType,
    description: finding.description || "",
    department: finding.department || "",
    owner: finding.owner || "",
    dueAt: (finding.due_at || "").slice(0, 10) || "—",
    dueText: finding.status === "assigned" ? "已派发车间问题对接人" : "待人工确认派发",
    foundAt: (finding.created_at || "").replace("T", " ").slice(0, 16) || "刚刚",
    repeated: finding.voice_text ? `口述：${finding.voice_text.slice(0, 24)}` : "巡查识别新建",
    image: finding.image_asset || DEMO_INSPECT_ASSETS[0],
    pin,
    findingId: finding.id,
  };
}

function openInspectCapture() {
  inspectCapture = {
    imageAsset: DEMO_INSPECT_ASSETS[0],
    voiceText: "",
    draft: null,
    findingId: null,
    busy: false,
    recognition: null,
  };
  const voice = document.querySelector("#inspect-voice-text");
  if (voice) voice.value = "";
  const grid = document.querySelector("#inspect-asset-grid");
  if (grid) {
    grid.querySelectorAll("[data-inspect-asset]").forEach((item) => {
      const selected = item.dataset.inspectAsset === inspectCapture.imageAsset;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-selected", selected ? "true" : "false");
    });
  }
  renderInspectDraftPanel();
  document.querySelector("#inspect-capture-dialog")?.showModal();
  refreshIcons();
}

function renderInspectDraftPanel() {
  const panel = document.querySelector("#inspect-draft-panel");
  const dispatchBtn = document.querySelector("#inspect-dispatch-btn");
  if (!panel || !dispatchBtn) return;
  const draft = inspectCapture.draft;
  if (!draft) {
    panel.hidden = true;
    panel.innerHTML = "";
    dispatchBtn.disabled = true;
    return;
  }
  panel.hidden = false;
  panel.innerHTML = `
    <div class="inspect-draft-card ${draft.abstained ? "abstained" : ""}">
      <strong>${escapeHtml(draft.title)}</strong>
      <span>置信度 ${(Number(draft.confidence || 0) * 100).toFixed(0)}% · 建议责任人 ${escapeHtml(draft.owner)}（${escapeHtml(draft.department)}）</span>
      <p>${escapeHtml(draft.description)}</p>
      <span>识别来源 ${escapeHtml(draft.provider || "unknown")} / ${escapeHtml(draft.model_name || "unknown")} · ${draft.is_simulation ? "演示推理" : "外部模型"}${draft.fallback_reason ? ` · 已回退：${escapeHtml(draft.fallback_reason)}` : ""}</span>
      <small>${escapeHtml(draft.disclaimer || "")}</small>
    </div>
  `;
  dispatchBtn.disabled = Boolean(draft.abstained) || inspectCapture.busy;
}

function buildOfflineInspectionDraft() {
  const voice = inspectCapture.voiceText.trim();
  const templates = {
    "assets/evidence-extinguisher-blocked.png": { title: "灭火器被遮挡", category: "现场隐患", severity: "high", location: "PACK 产线 · 通道东侧", description: "现场照片显示灭火器被物料箱遮挡，紧急情况下无法快速取用。", department: "生产部", owner: "李强", tag: "现场隐患", pin: { left: 78, top: 46 }, confidence: .86 },
    "assets/evidence-exit-sign-fault.png": { title: "疏散指示标志故障", category: "设备故障", severity: "high", location: "化成区 · 西侧通道", description: "疏散指示灯不亮或标识残损，夜间无法辨识疏散方向。", department: "工程部", owner: "王磊", tag: "设备故障", pin: { left: 14, top: 66 }, confidence: .84 },
    "assets/evidence-control-room-log.png": { title: "消控室值班记录问题", category: "管理隐患", severity: "medium", location: "消防控制室（电池车间）", description: "值班记录填写不完整，未完整记录火警处置与交接事项。", department: "安保部", owner: "张伟", tag: "重复隐患", pin: { left: 43, top: 47 }, confidence: .81 },
  };
  const template = templates[inspectCapture.imageAsset];
  if (!template) return {
    recognized: false, abstained: true, confidence: 0, title: "证据不足，未生成隐患结论", category: "unknown", severity: "low", location: "待补充",
    description: "图片和口述不足以判断隐患类型、位置与严重程度，请补充清晰证据后重试。", department: "待确认", owner: "待确认", tag: "安全拒答", pin: { left: 50, top: 50 },
    missing_fields: ["隐患类型", "具体位置", "严重程度"], evidence_refs: [],
    disclaimer: "证据不足时不编造结论，不派发整改任务。", provider: "browser-demo", model_name: "deterministic-image-catalog-v1", fallback_reason: "backend_unavailable", is_simulation: true,
  };
  return {
    ...template, recognized: true, abstained: false,
    description: `${template.description}${voice ? ` 巡查员口述补充：${voice}` : ""}`,
    missing_fields: [], evidence_refs: [`image:${inspectCapture.imageAsset}`, voice ? "voice:note" : "voice:none"],
    disclaimer: "识别结果仅供辅助，不替代现场检查与专业判断；派发须人工确认。", provider: "browser-demo", model_name: "deterministic-image-catalog-v1", fallback_reason: "backend_unavailable", is_simulation: true,
  };
}

async function analyzeInspectionDraft() {
  if (inspectCapture.busy) return;
  inspectCapture.busy = true;
  inspectCapture.voiceText = document.querySelector("#inspect-voice-text")?.value || "";
  try {
    if (judgeTour.active || !MONITORING_API_BASE) throw new Error("backend_unavailable");
    const response = await fetch(`${MONITORING_API_BASE}/inspection/analyze`, {
      method: "POST",
      headers: actorHeaders(),
      body: JSON.stringify({
        enterprise_id: selectedCompanyId,
        image_asset: inspectCapture.imageAsset,
        voice_text: inspectCapture.voiceText,
        mode: copilotState.mode,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "analyze_failed");
    inspectCapture.draft = payload.draft;
    renderInspectDraftPanel();
    showToast(payload.draft.abstained ? "证据不足，已安全拒答" : "已生成隐患草稿，请人工确认后派发");
  } catch (error) {
    inspectCapture.draft = buildOfflineInspectionDraft();
    showToast(inspectCapture.draft.abstained ? "证据不足，已安全拒答" : "后端不可用，已用浏览器本地规则生成演示草稿");
  } finally {
    inspectCapture.busy = false;
    renderInspectDraftPanel();
  }
}

async function dispatchInspectionFinding() {
  if (!inspectCapture.draft || inspectCapture.draft.abstained || inspectCapture.busy) return;
  inspectCapture.busy = true;
  renderInspectDraftPanel();
  try {
    if (judgeTour.active || !MONITORING_API_BASE) throw new Error("backend_unavailable");
    const created = await fetch(`${MONITORING_API_BASE}/inspection/findings`, {
      method: "POST",
      headers: actorHeaders(),
      body: JSON.stringify({
        enterprise_id: selectedCompanyId,
        image_asset: inspectCapture.imageAsset,
        voice_text: inspectCapture.voiceText,
      }),
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "create_failed");
      return payload;
    });
    const findingId = created.finding.id;
    const dispatched = await fetch(`${MONITORING_API_BASE}/inspection/findings/${findingId}/dispatch`, {
      method: "POST",
      headers: actorHeaders(),
      body: JSON.stringify({ note: "巡查员人工确认派发车间问题对接人（模拟）" }),
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "dispatch_failed");
      return payload;
    });
    const issue = findingToIssue(dispatched.finding, dynamicIssues.length + issues.length + 1);
    dynamicIssues = [issue, ...dynamicIssues.filter((item) => item.id !== issue.id)];
    selectedIssueId = issue.id;
    const company = companies.find((item) => item.id === selectedCompanyId);
    if (company) company.openHazards = Number(company.openHazards || 0) + 1;
    document.querySelector("#inspect-capture-dialog")?.close();
    if (issue.owner) terminalOwnerName = issue.owner;
    selectedInboxId = dispatched.workorder?.id ? `workorder-${dispatched.workorder.id}` : null;
    showToast(`已派发整改任务给 ${issue.owner}（${issue.department}），正在打开整改待办…`);
    location.hash = routeHash("owner", { owner: terminalOwnerName });
    scheduleIncidentRefresh();
  } catch (error) {
    const localFinding = { ...inspectCapture.draft, id: `LOCAL-${Date.now()}`, status: "assigned", created_at: new Date().toISOString(), image_asset: inspectCapture.imageAsset, voice_text: inspectCapture.voiceText };
    const issue = findingToIssue(localFinding, dynamicIssues.length + issues.length + 1);
    issue.findingId = null;
    dynamicIssues = [issue, ...dynamicIssues];
    selectedIssueId = issue.id;
    terminalOwnerName = issue.owner;
    selectedInboxId = `workorder-${localFinding.id}`;
    incidentBackend.inbox = [{ inbox_id: selectedInboxId, source: "local_demo", workorder_id: localFinding.id, finding_id: issue.id, kind: "rectification", enterprise_name: selectedCompany().name, summary: issue.description, owner: issue.owner, status: "in_progress" }, ...incidentBackend.inbox.filter((item) => item.inbox_id !== selectedInboxId)];
    document.querySelector("#inspect-capture-dialog")?.close();
    showToast(`静态演示：已派发整改任务给 ${issue.owner}，未连接外部系统`);
    location.hash = routeHash("owner", { owner: terminalOwnerName });
  } finally {
    inspectCapture.busy = false;
  }
}

function startInspectVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voice = document.querySelector("#inspect-voice-text");
  if (!SpeechRecognition || !voice) {
    voice.value = (voice.value ? `${voice.value} ` : "") + "PACK 通道东侧灭火器被物料箱挡住了";
    inspectCapture.voiceText = voice.value;
    showToast("当前浏览器不支持语音识别，已填入演示口述文本");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const text = event.results[0]?.[0]?.transcript || "";
    voice.value = voice.value ? `${voice.value} ${text}` : text;
    inspectCapture.voiceText = voice.value;
    showToast("语音已写入备注");
  };
  recognition.onerror = () => showToast("语音识别失败，可改用手输备注");
  recognition.start();
  showToast("正在聆听…请口述隐患要点");
}

async function scanMaintenanceOverdue() {
  if (!MONITORING_API_BASE) {
    const id = Date.now();
    maintenanceDrafts = [{
      id, workorder_id: id, enterprise_id: selectedCompanyId, kind: "maintenance", status: "draft",
      summary: `${selectedCompany().name} 消防设施维保周期到期，待人工确认派发`,
    }];
    showToast("静态演示：扫描到 1 项维保到期建议，已生成草稿待确认");
    renderRoute();
    return;
  }
  try {
    const response = await fetch(`${MONITORING_API_BASE}/maintenance/overdue-scan`, {
      method: "POST",
      headers: actorHeaders(),
      body: JSON.stringify({ enterprise_id: selectedCompanyId, create_drafts: true }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "scan_failed");
    maintenanceDrafts = payload.workorders || [];
    showToast(`扫描到 ${payload.suggestions?.length || 0} 项维保逾期，已生成草稿待确认`);
    renderRoute();
  } catch (error) {
    showToast(`维保扫描失败：${error.message}`);
  }
}

async function approveMaintenanceWorkorder(workorderId) {
  if (judgeTour.active || incidentBackend.status !== "live") {
    updateLocalWorkorder(workorderId, "approved");
    renderRoute();
    showToast(`维保工单 ${workorderId} 已确认派发`);
    return;
  }
  try {
    const response = await fetch(`${MONITORING_API_BASE}/workorders/${workorderId}/approve`, {
      method: "POST",
      headers: actorHeaders(),
      body: JSON.stringify({ note: "值班负责人确认派发维保组（模拟）" }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "approve_failed");
    maintenanceDrafts = maintenanceDrafts.map((item) => (
      item.id === workorderId ? { ...item, ...payload.workorder } : item
    ));
    showToast(`维保工单 #${workorderId} 已确认派发`);
    renderRoute();
  } catch (error) {
    showToast(`工单确认失败：${error.message}`);
  }
}

function updateLocalWorkorder(workorderId, status, acceptance, completionEvidence) {
  const update = (item) => String(item.workorder_id) === String(workorderId) ? {
    ...item, status,
    acceptance_log: acceptance ? [...(item.acceptance_log || []), acceptance] : item.acceptance_log,
    completion_evidence: completionEvidence || item.completion_evidence,
  } : item;
  incidentBackend.inbox = incidentBackend.inbox.map(update);
  incidentBackend.repairDrafts = incidentBackend.repairDrafts.map(update);
  maintenanceDrafts = maintenanceDrafts.map(update);
  selectedInboxId = `workorder-${workorderId}`;
}

async function postWorkorderTransition(workorderId, action, note, extra = {}) {
  const response = await fetch(`${MONITORING_API_BASE}/workorders/${workorderId}/${action}`, {
    method: "POST",
    headers: actorHeaders(),
    body: JSON.stringify({ note, ...extra }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || `${action}_failed`);
  return payload;
}

async function startInboxWorkorder(workorderId) {
  if (judgeTour.active || incidentBackend.status !== "live") {
    updateLocalWorkorder(workorderId, "in_progress");
    renderRoute();
    showToast(`工单 #${workorderId} 已开始处理`);
    return;
  }
  try {
    await postWorkorderTransition(workorderId, "start", "人工确认开始处理（模拟）");
    showToast(`工单 #${workorderId} 已开始处理`);
    selectedInboxId = `workorder-${workorderId}`;
    scheduleIncidentRefresh();
  } catch (error) {
    showToast(`开工失败：${error.message}`);
  }
}

async function completeInboxWorkorder(workorderId) {
  const item = incidentBackend.inbox.find((entry) => String(entry.workorder_id) === String(workorderId));
  if (item?.kind === "rectification" && rectificationEvidence?.workorderId !== String(workorderId)) {
    showToast("请先上传整改后的现场照片");
    return false;
  }
  const completionEvidence = item?.kind === "rectification" ? { name: rectificationEvidence.name, url: rectificationEvidence.url } : null;
  if (judgeTour.active || incidentBackend.status !== "live") {
    updateLocalWorkorder(workorderId, ["maintenance", "repair"].includes(item?.kind) ? "acceptance_pending" : "done", null, completionEvidence);
    renderRoute();
    showToast(["maintenance", "repair"].includes(item?.kind) ? `工单 #${workorderId} 已提交设施部门验收` : `整改工单 ${workorderId} 已提交复查`);
    return;
  }
  try {
    await postWorkorderTransition(workorderId, "complete", item?.kind === "rectification" ? `已上传整改照片：${rectificationEvidence.name}` : "人工完成核验（模拟）", completionEvidence ? {
      evidence_name: completionEvidence.name,
      evidence_url: completionEvidence.url,
    } : {});
    showToast(["maintenance", "repair"].includes(item?.kind) ? `工单 #${workorderId} 已提交设施部门验收` : `工单 #${workorderId} 已提交复查`);
    selectedInboxId = `workorder-${workorderId}`;
    scheduleIncidentRefresh();
  } catch (error) {
    showToast(`完成核验失败：${error.message}`);
  }
}

async function acceptInboxWorkorder(workorderId, result) {
  if (judgeTour.active || incidentBackend.status !== "live") {
    updateLocalWorkorder(workorderId, result === "accepted" ? "done" : "in_progress", {
      result, actor: "消防设施部门（演示）", note: result === "accepted" ? "复测合格" : "复测不合格，驳回返工", at: new Date().toISOString(),
    });
    renderRoute();
    showToast(result === "accepted" ? `工单 #${workorderId} 已验收关闭` : `工单 #${workorderId} 已驳回返工`);
    return;
  }
  try {
    const response = await fetch(`${MONITORING_API_BASE}/workorders/${workorderId}/acceptance`, {
      method: "POST",
      headers: actorHeaders(),
      body: JSON.stringify({ result, note: result === "accepted" ? "设施部门复测合格，验收通过（模拟）" : "设施部门复测不合格，驳回返工（模拟）" }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || "acceptance_failed");
    selectedInboxId = `workorder-${workorderId}`;
    showToast(result === "accepted" ? `工单 #${workorderId} 已验收关闭` : `工单 #${workorderId} 已驳回返工`);
    scheduleIncidentRefresh();
  } catch (error) {
    showToast(`验收操作失败：${error.message}`);
  }
}

async function recheckInspectionFinding() {
  const issue = selectedIssue();
  if (!issue?.findingId) {
    const workorder = (incidentBackend.inbox || []).find((item) => item.kind === "rectification" && String(item.finding_id) === String(issue?.id));
    if (!issue?.completionEvidence?.url && !workorder?.completion_evidence?.url) {
      showToast("整改照片尚未留存，不能通过复查");
      return;
    }
    workflowStarted = true;
    Object.assign(issue, { status: "已闭环", statusType: "closed", dueText: "复查通过" });
    renderWorkflow(issue);
    showToast("演示隐患已由巡查人员复查通过并闭环");
    return;
  }
  try {
    const response = await fetch(`${MONITORING_API_BASE}/inspection/findings/${issue.findingId}/recheck`, {
      method: "POST",
      headers: actorHeaders(),
      body: JSON.stringify({ result: "passed", note: "专项复查通过（模拟）" }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "recheck_failed");
    workflowStarted = true;
    renderWorkflow(issue);
    showToast(`隐患 #${issue.findingId} 复查通过，已闭环`);
    if ((location.hash || "").startsWith("#/inspections")) {
      const findingsResponse = await fetch(`${MONITORING_API_BASE}/inspection/findings?enterprise_id=${encodeURIComponent(selectedCompanyId)}`);
      if (findingsResponse.ok) {
        const body = await findingsResponse.json();
        // 触发巡查列表刷新：复用既有导入后路径
        if (Array.isArray(body.items)) {
          body.items.forEach((finding, index) => {
            const mapped = findingToIssue(finding, index + 1);
            const existing = issues.find((row) => row.findingId === finding.id);
            if (existing) Object.assign(existing, mapped);
          });
        }
      }
      renderRoute();
    }
  } catch (error) {
    showToast(`复查失败：${error.message}`);
  }
}

async function importCsvFiles(files) {
  const names = files.map((file) => file.name).sort();
  if (JSON.stringify(names) !== JSON.stringify(expectedCsvFiles)) throw new Error(`文件不完整，应选择：${expectedCsvFiles.join("、")}`);
  if (files.some((file) => file.size > 1_000_000)) throw new Error("单个 CSV 不得超过 1 MB");
  const bundle = {};
  for (const file of files) {
    bundle[file.name] = window.FireGuardEngine.parseCsv(await file.text());
  }
  const enterpriseId = bundle["enterprises.csv"]?.[0]?.enterprise_id;
  for (const fileName of expectedCsvFiles.slice(1)) bundle[fileName] = bundle[fileName].filter((row) => row.enterprise_id === enterpriseId);
  const validation = window.FireGuardEngine.validateBundle(bundle);
  if (!validation.valid) throw new Error(validation.errors.slice(0, 3).join("；"));

  latestAssessment = window.FireGuardEngine.scoreBundle(bundle);
  const company = companies.find((item) => item.id === latestAssessment.enterpriseId);
  if (company) {
    company.score = latestAssessment.totalScore;
    company.level = latestAssessment.riskLevel;
    company.levelLabel = riskLabel(latestAssessment.riskLevel);
    company.openHazards = bundle["findings.csv"].filter((finding) => !["verified", "closed"].includes(finding.status)).length;
  }
  selectedCompanyId = latestAssessment.enterpriseId || selectedCompanyId;
  renderRoute();
  return latestAssessment;
}

function openEvidence(issue) {
  document.querySelector("#evidence-title").textContent = issue.title;
  const image = document.querySelector("#evidence-image");
  image.src = issue.image;
  image.alt = `${issue.title}现场证据照片`;
  document.querySelector("#evidence-caption").textContent = `${issue.location} · ${issue.foundAt} · ${issue.description}`;
  document.querySelector("#evidence-dialog").showModal();
}

function openWorkflow(issue) {
  selectedIssueId = issue.id;
  renderWorkflow(issue);
  document.querySelector("#workflow-dialog").showModal();
}

function renderWorkflow(issue) {
  document.querySelector("#workflow-title").textContent = issue.title;
  document.querySelector("#workflow-summary").innerHTML = `<div><span>责任部门</span><strong>${issue.department}</strong></div><div><span>责任人</span><strong>${issue.owner}</strong></div><div><span>整改期限</span><strong>${issue.dueText}</strong></div>`;
  const closed = issue.status === "已闭环" || issue.statusType === "closed";
  const steps = [
    [issue.foundAt, "发现隐患", `${issue.location}现场检查形成记录`],
    ["2026-07-09 10:20", "指派整改", `${issue.department} · ${issue.owner}`],
    ["2026-07-12 16:00", "提交整改", "已上传整改说明和现场证据"],
    [closed ? "2026-07-30 09:30" : "待处理", closed ? "复查通过，隐患闭环" : "等待复查", closed ? "巡查人员已独立核验整改证据与现场状态" : "复查通过后才能关闭隐患"],
  ];
  document.querySelector("#workflow-timeline").innerHTML = steps.map((step, index) => `<li class="${index === steps.length - 1 ? "current" : "done"}"><time>${step[0]}</time><strong>${step[1]}</strong><span>${step[2]}</span></li>`).join("");
  const button = document.querySelector("#start-reinspection");
  button.disabled = workflowStarted || closed;
  if (closed) button.dataset.reinspectionStatus = "closed";
  else delete button.dataset.reinspectionStatus;
  button.textContent = closed || workflowStarted ? "复查已完成" : "复查通过并闭环";
  refreshIcons();
}

function appendRadioMessage(message) {
  radioCommandState.messages.push({
    time: `10:${String(34 + Math.floor(radioCommandState.messages.length / 2)).padStart(2, "0")}:${radioCommandState.messages.length % 2 ? "36" : "12"}`,
    group: "现场组", location: "电池车间 2F", evidence: `radio/demo-${radioCommandState.messages.length + 1}`,
    ...message,
  });
}

function finalizeRadioCommand() {
  if (radioCommandState.status === "active" && radioCommandState.facilities.some((item) => !item.confirmed)) return false;
  if (radioCommandState.status !== "idle") {
    radioCommandState.status = "closed";
    radioCommandState.reportReady = true;
    if (!radioCommandState.messages.some((item) => item.evidence === "report/command-summary")) {
      appendRadioMessage({ source: "系统汇总", kind: "战评报告", text: "已汇总现场事实、人工指令、设施状态与人员反馈，等待值班员确认。", evidence: "report/command-summary" });
    }
  }
  return true;
}

function exportWeeklyReport() {
  if (!document.querySelector(".weekly-report-page")) return false;
  const link = Object.assign(document.createElement("a"), {
    href: "docs/submission/FireOps-AI-fire-weekly-report-v7.docx",
    download: "FireOps消防安全周报-2026-08-23.docx",
  });
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

function handleMaintenanceOpsAction(action, sourceElement) {
  if (action === "ack-maintenance-sla") {
    const alert = maintenanceOpsState.slaAlerts.find((item) => item.id === sourceElement?.dataset.slaId);
    if (!alert) return showToast("未找到 SLA 预警");
    alert.acknowledged = true;
    renderRoute();
    return showToast("SLA 预警已由设施部门确认接收");
  }
  const plan = maintenanceOpsState.plans.find((item) => item.id === sourceElement?.dataset.planId);
  if (!plan) return showToast("未找到周期维保计划");
  if (action === "approve-maintenance-plan") {
    plan.status = "planned";
    renderRoute();
    return showToast("周期计划已确认并派发维保单位");
  }
  if (action === "start-maintenance-plan") {
    plan.status = "in_progress";
    maintenanceOpsState.draft = { planId: plan.id, result: "", note: "", spareId: "none", safety: "" };
    renderRoute();
    return showToast("维保单位已开始执行，请填写测试记录");
  }
  if (action === "complete-maintenance-plan") {
    const { result, note: draftNote, spareId, safety } = maintenanceOpsState.draft;
    const note = draftNote.trim();
    if (!safety) return showToast("请选择维修期间消防安全措施");
    if (!result) return showToast("请选择测试结论");
    if (note.length < 6) return showToast("请填写至少 6 个字的测试与现场记录");
    const spare = maintenanceOpsState.spares.find((item) => item.id === spareId);
    if (spare && spare.stock < 1) return showToast("所选备件库存不足");
    if (spare) spare.stock -= 1;
    plan.status = "acceptance_pending";
    plan.evidence = `TEST-${plan.id}`;
    maintenanceOpsState.logs.unshift({ time: new Date().toLocaleString("zh-CN", { hour12: false }).replaceAll("/", "-"), plan: plan.title, result, evidence: plan.evidence, safety });
    maintenanceOpsState.draft = { planId: null, result: "", note: "", spareId: "none", safety: "" };
    renderRoute();
    return showToast(`执行记录已提交${spare ? `，领用 ${spare.name} 1${spare.unit}` : ""}，等待设施部门验收`);
  }
  if (action === "accept-maintenance-plan") {
    plan.status = "done";
    renderRoute();
    return showToast("周期维保计划已由设施部门验收关闭");
  }
}

function handleAction(action, issueId, sourceElement) {
  if (["approve-maintenance-plan", "start-maintenance-plan", "complete-maintenance-plan", "accept-maintenance-plan", "ack-maintenance-sla"].includes(action)) return handleMaintenanceOpsAction(action, sourceElement);
  if (action === "start-judge-tour") return startJudgeTour();
  if (action === "focus-radio-command") {
    document.querySelector("#radio-command-console")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (action === "start-radio-command") {
    radioCommandState = buildRadioCommandState({ active: true });
    renderRoute();
    return showToast("现场对讲指挥已由值班员启动");
  }
  if (action === "locate-radio-fire") {
    if (radioCommandState.status === "idle") radioCommandState = buildRadioCommandState({ active: true });
    if (!radioCommandState.messages.some((item) => item.evidence === "radio/location-query")) {
      appendRadioMessage({ source: "消控室值班员", kind: "人工问询", text: "哪里发生明火？请报告准确位置。", evidence: "radio/location-query" });
      appendRadioMessage({ source: "防火巡查人员", kind: "现场事实", text: "电池车间 2F，PACK 产线 A1 半成品缓存区。", evidence: "radio/location-reply" });
    }
    renderRoute();
    return showToast("已从现场对讲记录中定位明火位置并保留来源");
  }
  if (action === "submit-radio-transcript") {
    const text = document.querySelector("#radio-command-input")?.value.trim() || "";
    if (text.length < 4) return showToast("请输入至少 4 个字的对讲转写");
    if (radioCommandState.status === "idle") radioCommandState = buildRadioCommandState({ active: true });
    appendRadioMessage({ source: "现场对讲", kind: /启动|关闭|撤离/.test(text) ? "指令 / 反馈" : "现场反馈", text });
    renderRoute();
    return showToast("现场反馈已整理并保留来源");
  }
  if (action === "confirm-radio-facilities") {
    radioCommandState.facilities = radioCommandState.facilities.map((item) => item.confirmed ? item : { ...item, confirmed: true, state: "对讲确认：已启动并反馈正常" });
    appendRadioMessage({ source: "消控室值班员", kind: "设备问询", text: "请总指挥确认，是否启动应急广播？", evidence: "radio/broadcast-query" });
    appendRadioMessage({ source: "现场总指挥", kind: "人工指令", text: "确认，立即启动应急广播。", evidence: "radio/broadcast-order" });
    appendRadioMessage({ source: "消控室值班员", kind: "设备反馈", text: "应急广播已启动；排烟、喷淋和消防泵反馈已逐项核对。", evidence: "human-gate/facilities" });
    renderRoute();
    return showToast("对讲确认已记录，关键消防设施状态已更新");
  }
  if (action === "finish-radio-command") {
    if (!finalizeRadioCommand()) return showToast("仍有关键消防设施状态待人工复核，不能结束指挥");
    renderRoute();
    return showToast("指挥会话已人工结束，战评报告已生成");
  }
  if (action === "confirm-review-meeting") {
    reviewState.meetingConfirmed = true;
    renderRoute();
    return showToast("战评会议安排已确认");
  }
  if (action === "confirm-review-report") {
    reviewState.reportConfirmed = true;
    renderRoute();
    return showToast("出警报告已确认，战评结论仍待会议形成");
  }
  if (action === "weekly-export") return showToast(exportWeeklyReport() ? "正式周报已导出" : "当前页面没有可导出的周报");
  if (action === "use-demo-rectification-evidence") {
    rectificationEvidence = { workorderId: String(sourceElement?.dataset.workorderId || "OFFLINE-RECT-001"), name: "灭火器通道整改后.jpg", url: "assets/evidence-extinguisher-rectified.png" };
    renderRoute();
    return showToast("整改后现场照片已加入记录");
  }
  if (action === "go-inspections") {
    location.hash = "#/inspections";
    return;
  }
  if (action === "open-monitoring-copilot") {
    const event = monitoringState.events.find((item) => item.id === monitoringState.selectedId);
    if (!event || event.type !== "fire" || event.status !== "pending") return showToast("当前事件不需要火警核实");
    event.history = [...event.history, "人工进入 FireOps AI 辅助研判"];
    location.hash = `#/copilot?source_event=${encodeURIComponent(event.id)}`;
    return;
  }
  if (action === "dismiss-monitoring-event") {
    const event = monitoringState.events.find((item) => item.id === monitoringState.selectedId);
    if (!event || event.type !== "fire" || event.status !== "pending") return showToast("当前事件不能登记为误报");
    Object.assign(event, { status: "closed", statusLabel: "已排除", history: [...event.history, "人工登记误报并关闭"] });
    createLocalMaintenanceWorkorder(event, {
      workorderId: judgeTour.active ? "OFFLINE-MAINT-001" : undefined,
      summary: `${event.point}污染误报，待设施部门审核派发`,
    });
    monitoringState.filter = "all";
    renderRoute();
    return showToast("已登记误报并建立关联维保工单草稿");
  }
  if (action === "export-first-response-pack") return exportFirstResponsePack();
  if (action === "assign-patrol-verification") {
    return postIncidentAction(`/signals/${selectedSignalEventId}/patrol-assignment`, { note: "系统推送点位、楼层和推荐路线，巡查到场后反馈" }, "巡查核实任务已派发");
  }
  if (action === "report-onsite-confirmed" || action === "report-onsite-dismissed") {
    const result = action === "report-onsite-confirmed" ? "confirmed" : "dismissed";
    if (judgeTour.active) {
      incidentBackend.signals = incidentBackend.signals.map((signal) => signal.monitoring_event_id === selectedSignalEventId ? {
        ...signal,
        onsite_feedback: { occurred_at: new Date().toISOString(), payload: { result, location: "报警点位现场（合成定位）" } },
      } : signal);
      renderRoute();
      return showToast("巡查反馈已回传消控室");
    }
    return postIncidentAction(`/signals/${selectedSignalEventId}/onsite-feedback`, {
      result,
      note: result === "confirmed" ? "现场确认有明火/烟雾" : "现场确认无火情，疑似误报",
      location: "报警点位现场（合成定位）",
    }, "巡查反馈已回传消控室");
  }
  if (action === "confirm-device-signal") return postIncidentAction(`/signals/${selectedSignalEventId}/verification`, { result: "confirmed", note: "人工核实确认（模拟）" }, "已确认火警并建立处置事件，对外报警由人工执行");
  if (action === "dismiss-device-signal") return postIncidentAction(`/signals/${selectedSignalEventId}/verification`, { result: "dismissed", note: "人工核实排除（模拟）" }, "已登记误报，不建立处置事件");
  if (action === "dispatch-incident") {
    if (judgeTour.active) {
      seedJudgeTourIncident(3);
      renderRoute();
      return showToast("工单已派发至专职消防队与车间 ERT");
    }
    const stationId = document.querySelector("#dispatch-station")?.value;
    if (!stationId) return showToast("当前片区没有可派单的班组");
    return postIncidentAction(`/incidents/${selectedIncidentId}/dispatch`, { station_id: stationId }, "工单已派发至处置班组");
  }
  if (action === "notify-incident-ert") {
    if (!selectedIncidentId) return showToast("请先确认火警并建立处置事件");
    return postIncidentAction(`/incidents/${selectedIncidentId}/ert-notify`, { note: "消控室已同步本车间 ERT，包含点位、入口和危险源" }, "ERT 增援任务已同步");
  }
  if (action === "ack-incident-ert") {
    if (!selectedIncidentId) return showToast("请先选择处置事件");
    return postIncidentAction(`/incidents/${selectedIncidentId}/ert-acknowledge`, { note: "ERT 已签收，按岗位简报协助疏散与先期处置" }, "ERT 已签收增援任务");
  }
  if (action === "close-incident") {
    if (!finalizeRadioCommand()) return showToast("请先人工确认关键消防设施状态，再归档事件");
    if (judgeTour.active) {
      incidentBackend.incidents = incidentBackend.incidents.map((incident) => incident.id === selectedIncidentId ? {
        ...incident, status: "closed", updated_at: "2026-08-26T10:49:00+08:00", dispatch: { ...incident.dispatch, status: "completed" },
        timeline: [...(incident.timeline || []).filter((item) => item.event_type !== "incident_closed"), { event_type: "incident_closed", actor: "消控室值班员（演示）", note: "现场反馈已核验，事件归档", occurred_at: "2026-08-26T10:49:00+08:00" }],
      } : incident);
      renderRoute();
      return showToast("现场反馈已核验，事件已归档");
    }
    return postIncidentAction(`/incidents/${selectedIncidentId}/close`, { note: "现场反馈已人工核验，事件归档" }, "事件已归档，处置班组恢复可调派");
  }
  if (action === "station-next-action") {
    const selected = (incidentBackend.inbox || []).find((item) => item.inbox_id === selectedInboxId);
    const task = incidentBackend.tasks.find((item) => item.dispatch?.id === selected?.dispatch_id)
      || incidentBackend.tasks.find((item) => item.id === selectedStationTaskId)
      || incidentBackend.tasks[0];
    const nextAction = document.querySelector("[data-next-action]")?.dataset.nextAction;
    if (!task?.dispatch || !nextAction) return;
    return postIncidentAction(`/dispatches/${task.dispatch.id}/transition`, { action: nextAction, note: "班组状态反馈（模拟）" }, "工单状态已实时回传值班台");
  }
  if (action === "submit-first-report") {
    const selected = (incidentBackend.inbox || []).find((item) => item.inbox_id === selectedInboxId);
    const task = incidentBackend.tasks.find((item) => item.dispatch?.id === selected?.dispatch_id)
      || incidentBackend.tasks.find((item) => item.id === selectedStationTaskId)
      || incidentBackend.tasks[0];
    const situation = document.querySelector("#report-situation")?.value.trim();
    const peopleStatus = document.querySelector("#report-people")?.value;
    if (!situation) return showToast("请填写现场情况");
    if (judgeTour.active) {
      const report = { situation, people_status: peopleStatus };
      incidentBackend.tasks = incidentBackend.tasks.map((item) => item.id === task.id ? { ...item, report, timeline: [...(item.timeline || []), { event_type: "first_report", actor: "专职消防队（演示）", note: situation, occurred_at: new Date().toISOString() }] } : item);
      incidentBackend.incidents = incidentBackend.incidents.map((item) => item.id === task.id ? { ...item, report, timeline: [...(item.timeline || []), { event_type: "first_report", actor: "专职消防队（演示）", note: situation, occurred_at: new Date().toISOString() }] } : item);
      renderRoute();
      return showToast("现场反馈已回传消控室（固定合成演示）");
    }
    return postIncidentAction(`/dispatches/${task.dispatch.id}/report`, { situation, people_status: peopleStatus }, "现场反馈已回传值班台");
  }
  if (action === "bind-signal-copilot") {
    if (!selectedSignalEventId) return showToast("请先选择待核实信号");
    const signal = incidentBackend.signals.find((item) => item.monitoring_event_id === selectedSignalEventId);
    return bindHubSignal(selectedSignalEventId, signal?.enterprise_id, "B-confirmed-fire-battery-workorder");
  }
  if (action === "zoom-in" || action === "zoom-out" || action === "zoom-reset") {
    planZoom = action === "zoom-in" ? Math.min(1.5, planZoom + 0.1) : action === "zoom-out" ? Math.max(0.8, planZoom - 0.1) : 1;
    const canvas = document.querySelector("#plan-canvas");
    if (canvas) canvas.style.setProperty("--plan-zoom", planZoom);
    return;
  }
  if (action === "reinspect") {
    selectedIssueId = issueId || selectedIssueId;
    openWorkflow(selectedIssue());
    return;
  }
  if (action === "open-evidence") {
    selectedIssueId = issueId || selectedIssueId;
    openEvidence(selectedIssue());
    return;
  }
  if (action === "save-report") return showToast("报告修订已保存到当前演示会话");
  if (action === "use-demo-assessment") {
    const company = selectedCompany();
    latestAssessment = { ...latestAssessment, enterpriseId: company.id, enterpriseName: company.name, inputHash: `fg-demo-${company.id}` };
    renderRoute();
    return showToast("已载入固定演示评分，不会写入数据库");
  }
  if (action === "regenerate") {
    const editor = document.querySelector("#report-editor");
    if (editor) editor.value = reportText(selectedCompany(), selectedCompanyId === latestAssessment.enterpriseId ? latestAssessment : null);
    return showToast("已根据结构化事实重新生成报告");
  }
  if (action === "confirm-report") return showToast("报告已确认（仅限演示）");
  if (action === "ranking-help") return showToast("风险线索用于安排巡查优先级，不替代现场检查结论");
  if (action === "verify-signal") {
    location.hash = "#/incidents";
    return;
  }
  if (action === "inject-demo-event") return postDemoModbusFrame();
  if (action === "inject-demo-fault") return postDemoModbusFrame(demoFaultFrame, { jumpToVerify: false });
  if (action === "company-overview") {
    location.hash = `#/enterprises/${selectedCompanyId}`;
    return;
  }
  if (action === "company-detail") {
    location.hash = `#/enterprises/${selectedCompanyId}`;
    return;
  }
  if (action === "open-factory-overview") {
    monitoringState.spatialLevel = "factory";
    location.hash = "#/monitoring";
    return;
  }
  if (action === "route-history") return showToast("当前演示保留 2026-07-29 路线，历史记录未导入");
  if (action === "equipment-detail") return showToast("设备状态来自当前车间台账；完整点位编号请在车间档案查看");
  if (action === "all-equipment") {
    activeRightTab = "equipment";
    location.hash = routeHash("inspections", { enterprise_id: selectedCompanyId });
    renderRoute();
    return;
  }
  if (action === "hazards") { activeRightTab = "hazards"; location.hash = "#/inspections"; renderRoute(); return; }
  if (action === "equipment") { activeRightTab = "equipment"; location.hash = "#/inspections"; renderRoute(); return; }
  if (action === "inspection") { activeRightTab = "hazards"; location.hash = "#/inspections"; renderRoute(); return; }
  if (action === "import-data") {
    document.querySelector("#import-dialog").showModal();
    return;
  }
  if (action === "open-inspect-capture") {
    openInspectCapture();
    return;
  }
  if (action === "scan-maintenance") {
    scanMaintenanceOverdue();
    return;
  }
  console.error(`Unhandled UI action: ${action}`);
}

function bindHeaderActions() {
  document.querySelectorAll(".app-header [data-action]").forEach((button) => button.addEventListener("click", () => handleAction(button.dataset.action)));
  const actor = document.querySelector("#demo-actor");
  if (!actor) return;
  actor.value = activeRoleId;
  actor.addEventListener("change", () => {
    setActiveRole(actor.value);
    showToast(`已切换演示身份：${actor.options[actor.selectedIndex].text}`);
    const root = (location.hash || "#/home").replace(/^#\//, "").split(/[/?]/)[0] || "home";
    if (root !== "home" && !activeRoleDefinition().modules.includes(routeModule(root))) location.hash = "#/home";
    else renderRoute();
  });
}

function runSelfCheck() {
  console.assert(companies.length === 5, "Demo must contain five companies");
  console.assert(issues.length === 3, "Selected workbench needs three mapped issues");
  console.assert(issues.every((issue) => issue.image && issue.pin), "Every issue needs evidence and a map pin");
  console.assert(new Set(companies.map((company) => company.id)).size === companies.length, "Company IDs must be unique");
  console.assert(companies.every((company) => monitoringProfiles[company.id]), "Every company needs a monitoring profile");
  console.assert(window.FireGuardEngine.roleDefinitions().length === 8, "Enterprise demo needs eight fixed roles");
  console.assert(businessSourceLabel("site-profile/hazards") === "企业危险源档案", "Technical source paths must have user-facing labels");
  console.assert(incidentEventLabel("dispatch_issued") === "派发处置任务", "Incident timeline must not expose event codes");
}

function seedJudgeTourIncident(completedFireIndex) {
  const hasIncident = completedFireIndex >= 2;
  const hasDispatch = completedFireIndex >= 3;
  const hasReport = completedFireIndex >= 4;
  const closed = completedFireIndex >= 5;
  const dispatchStatus = closed ? "completed" : "arrived";
  const incidentStatus = closed ? "closed" : hasDispatch ? "arrived" : "pending_dispatch";
  const timeline = [
    ...(hasIncident ? [{ event_type: "incident_created", actor: "消控室值班员（演示）", note: "巡查人员确认现场明火", occurred_at: "2026-08-26T10:29:00+08:00" }] : []),
    ...(hasDispatch ? [
      { event_type: "dispatch_issued", actor: "消控室值班员（演示）", note: "专职消防队与车间 ERT 已收到任务", occurred_at: "2026-08-26T10:31:00+08:00" },
      { event_type: "acknowledged", actor: "专职消防队（演示）", note: "任务已签收", occurred_at: "2026-08-26T10:32:00+08:00" },
      { event_type: "enroute", actor: "专职消防队（演示）", note: "已从车间南门出动", occurred_at: "2026-08-26T10:33:00+08:00" },
      { event_type: "arrived", actor: "专职消防队（演示）", note: "已按推荐入口到达现场", occurred_at: "2026-08-26T10:36:00+08:00" },
    ] : []),
    ...(hasReport ? [{ event_type: "first_report", actor: "专职消防队（演示）", note: "火势受控，人员已撤离", occurred_at: "2026-08-26T10:44:00+08:00" }] : []),
    ...(closed ? [{ event_type: "incident_closed", actor: "消控室值班员（演示）", note: "现场反馈已核验，事件归档", occurred_at: "2026-08-26T10:49:00+08:00" }] : []),
  ];
  const dispatch = hasDispatch ? {
    id: "OFFLINE-DISPATCH-001", station_id: "crew-wx-01", station_name: "专职消防队·西区站（合成）", status: dispatchStatus,
  } : null;
  const incident = hasIncident ? {
    id: "OFFLINE-INC-001", enterprise_id: "ent-001", enterprise_name: "电池车间（PACK/化成）", district: "西区",
    source_event_id: "OFFLINE-001", status: incidentStatus, dispatch, timeline,
    created_at: "2026-08-26T10:29:00+08:00", updated_at: closed ? "2026-08-26T10:49:00+08:00" : "2026-08-26T10:44:00+08:00",
    response_brief: {
      address: "电池车间 2F · PACK 产线 A1",
      items: [
        { text: "重点危险源：锂电池模组半成品缓存区", sources: ["site-profile/hazards"] },
        { text: "优先入口：车间南门，进入后沿东侧通道前往 A1", sources: ["site-profile/access-route"] },
        { text: "可用设施：自动喷水系统、室内消火栓", sources: ["site-profile/facilities"] },
      ],
      disclaimer: "固定合成回放，不控制真实设备，不替代现场指挥。",
    },
    report: hasReport ? { situation: "明火已扑灭，人员全部撤离；持续监护复燃风险。", people_status: "no_risk", created_at: "2026-08-26T10:44:00+08:00" } : null,
  } : null;
  incidentBackend.status = "offline";
  incidentBackend.signals = completedFireIndex >= 0 ? [{
    monitoring_event_id: "OFFLINE-001", enterprise_name: "电池车间（PACK/化成）", verification_status: hasIncident ? "confirmed" : "pending", occurred_at: "2026-08-26T10:24:00+08:00",
    patrol_assignment: completedFireIndex >= 1 ? { occurred_at: "2026-08-26T10:26:00+08:00", payload: { route: "南门 → 2F PACK A1" } } : null,
  }] : [];
  incidentBackend.incidents = incident ? [incident] : [];
  incidentBackend.stations = [{ id: "crew-wx-01", name: "专职消防队·西区站（合成）", district: "西区", status: hasDispatch && !closed ? "on_scene" : "available" }];
  incidentBackend.station = incidentBackend.stations[0];
  incidentBackend.tasks = dispatch ? [incident] : [];
  incidentBackend.inbox = dispatch ? [{ inbox_id: "dispatch-OFFLINE-DISPATCH-001", source: "incident_dispatch", dispatch_id: dispatch.id, incident_id: incident.id, kind: "response", enterprise_name: incident.enterprise_name, summary: "电池车间 PACK 产线火警处置", status: dispatch.status }] : [];
  selectedSignalEventId = completedFireIndex >= 0 && completedFireIndex < 2 ? "OFFLINE-001" : null;
  selectedIncidentId = incident?.id || null;
  selectedInboxId = incident ? "dispatch-OFFLINE-DISPATCH-001" : null;
  terminalStationId = "crew-wx-01";
}

function ensureOfflineIncidentDemo() {
  if (!/^#\/(incidents|workflow)/.test(location.hash) || incidentBackend.signals.length || incidentBackend.incidents.length) return;
  seedJudgeTourIncident(4);
  radioCommandState = buildRadioCommandState({ active: true });
  const pending = monitoringState.events.find((event) => event.type === "fire" && event.status === "pending");
  if (!pending) return;
  const company = companies.find((item) => item.id === pending.enterpriseId) || companies[0];
  incidentBackend.signals.unshift({
    monitoring_event_id: pending.id,
    enterprise_id: pending.enterpriseId,
    enterprise_name: company.name,
    verification_status: "pending",
    occurred_at: "2026-08-31T10:24:00+08:00",
  });
  selectedSignalEventId = pending.id;
}

function prepareJudgeTourStep(stepIndex) {
  const step = JUDGE_TOUR_STEPS[stepIndex];
  const fireStepIndex = ["alarm", "analysis", "verification", "dispatch", "response", "feedback", "archive", "review"].indexOf(step.id);
  const completedFireIndex = fireStepIndex - 1;
  if (fireStepIndex >= 0) {
    seedJudgeTourIncident(completedFireIndex);
    radioCommandState = buildRadioCommandState({ active: completedFireIndex >= 4, verified: completedFireIndex >= 5, complete: completedFireIndex >= 5 });
  }
  const isFalseAlarmFlow = ["false-alarm", "maintenance"].includes(step.id);
  selectedCompanyId = isFalseAlarmFlow ? "ent-005" : "ent-001";
  if (step.id === "false-alarm") {
    monitoringState.events = [{
      id: "judge-false-alarm-001", enterpriseId: "ent-005", type: "fire", typeLabel: "火警", status: "pending", statusLabel: "待核实",
      time: "10:42", floor: "1F", point: "喷漆线 3# 感烟", location: "喷涂通道", left: 25, top: 31,
      devices: ["感烟探测器 PT-01-03", "排烟风机 PF-01"], trend: [18, 31, 54, 48, 22],
      history: ["10:42 报警帧接入", "10:45 巡查反馈现场无火情", "等待消控室登记误报"],
    }, ...monitoringState.events.filter((event) => event.id !== "judge-false-alarm-001")];
  }
  const completedRectification = (incidentBackend.inbox || []).find((item) => item.kind === "rectification" && item.status === "done" && item.completion_evidence?.url);
  selectedIssueId = step.id === "reinspection" ? completedRectification?.finding_id || "hazard-01" : "hazard-02";
  if (step.id === "rectification") {
    const linkedIssueId = dynamicIssues[0]?.id || "hazard-02";
    rectificationEvidence = null;
    terminalOwnerName = "李强";
    selectedInboxId = "workorder-OFFLINE-RECT-001";
    incidentBackend.station = { id: "owner", name: "车间问题对接人 · 李强", status: "available" };
    incidentBackend.inbox = [{ inbox_id: selectedInboxId, source: "ops_workorder", workorder_id: "OFFLINE-RECT-001", finding_id: linkedIssueId, kind: "rectification", enterprise_name: "电池车间（PACK/化成）", summary: "PACK 通道东侧灭火器被物料遮挡", owner: "李强", status: "in_progress" }];
  } else if (step.id === "maintenance") {
    terminalStationId = "crew-wb-01";
    selectedInboxId = "workorder-OFFLINE-MAINT-001";
    incidentBackend.station = { id: terminalStationId, name: "消防设施维保组（合成）", status: "available" };
    incidentBackend.inbox = [{
      inbox_id: selectedInboxId, source: "ops_workorder", workorder_id: "OFFLINE-MAINT-001", kind: "maintenance",
      enterprise_name: "涂装车间（PT）", summary: "喷漆室 3# 烟感污染误报，待设施部门审核派发",
      source_event_id: "judge-false-alarm-001",
      owner: "消防设施部门", crew_id: terminalStationId, status: "draft", sla_status: "tracking",
      created_at: "2026-08-19T14:30:00+08:00", due_at: "2026-08-20T14:30:00+08:00",
      missing_fields: ["现场反馈时间", "故障原因明细"],
    }];
  }
  monitoringState.spatialLevel = ["overview", "alarm"].includes(step.id) ? "factory" : "floor";
  const selectedEvent = step.id === "false-alarm"
    ? monitoringState.events.find((event) => event.id === "judge-false-alarm-001")
    : monitoringState.events.find((event) => event.enterpriseId === selectedCompanyId);
  monitoringState.selectedId = selectedEvent?.id || monitoringState.selectedId;
  const building = buildingForEnterprise(selectedCompanyId);
  monitoringState.floor = building ? workshopFloor(building, selectedEvent) : selectedEvent?.floor || "all";
  copilotState.scenarios = [OFFLINE_JUDGE_SCENARIO];
  copilotState.selectedId = OFFLINE_JUDGE_SCENARIO.scenario_id;
  copilotState.offline = true;
  copilotState.judgeMode = true;
  copilotState.eventId = "OFFLINE-001";
  copilotState.run = completedFireIndex >= 2 ? buildOfflineCopilotRun("dispatch") : completedFireIndex >= 0 ? buildOfflineCopilotRun("verification") : null;
  copilotState.phase = completedFireIndex >= 5 ? "archived" : completedFireIndex >= 3 ? "crew_simulation" : completedFireIndex >= 2 ? "dispatch" : completedFireIndex >= 0 ? "verification" : "select";
  copilotState.dispatch = completedFireIndex >= 3 ? "crew-wx-01" : null;
  copilotState.verification = completedFireIndex >= 2 ? "confirmed" : null;
  copilotState.judgeProgress = JUDGE_TOUR_STEPS.slice(0, stepIndex).map((item) => item.title);
}

function judgeTourSource(step) {
  if (judgeScenarioRuntime) {
    const range = judgeScenarioRuntime.range(step.source[0], step.source[1]);
    return { title: range.scenarioTitle, steps: range.steps, count: range.count, humanGates: range.humanGates, fromState: range.fromState, toState: range.toState };
  }
  const scenario = semifinalScenarios.find((item) => item.id === step.scenario);
  if (!scenario) return null;
  const start = scenario.steps.findIndex((item) => item.step_id === step.source[0]);
  const end = scenario.steps.findIndex((item) => item.step_id === step.source[1]);
  const steps = start >= 0 && end >= start ? scenario.steps.slice(start, end + 1) : [];
  return { title: scenario.title, steps, count: steps.length, humanGates: steps.filter((item) => item.human_gate).length };
}

function activeJudgeTourChapter() {
  return JUDGE_TOUR_CHAPTERS.find((chapter) => judgeTour.index >= chapter.start && judgeTour.index <= chapter.end) || JUDGE_TOUR_CHAPTERS[0];
}

function setJudgeTourActionPhase(phase, label) {
  if (!judgeTour.active) return;
  judgeTour.actionPhase = label;
  const controller = document.querySelector("#judge-tour");
  if (!controller) return;
  controller.dataset.actionPhase = phase;
  const phaseNode = controller.querySelector("[data-judge-action-phase]");
  if (phaseNode) phaseNode.textContent = label;
  const resultLabel = controller.querySelector("[data-judge-result-label]");
  if (resultLabel) resultLabel.textContent = phase === "complete" ? "已完成" : "完成后";
  controller.querySelectorAll("[data-judge-tour-action='previous'], [data-judge-tour-action='toggle'], [data-judge-tour-action='next']")
    .forEach((button) => { button.disabled = phase === "role"; });
  const order = ["role", "scrolling", "acting", "complete"];
  const current = order.indexOf(phase);
  controller.querySelectorAll("[data-judge-tour-stage]").forEach((node, index) => {
    node.dataset.state = phase === "blocked" ? "blocked" : index < current ? "done" : index === current ? "active" : "pending";
  });
}

function renderJudgeTourController() {
  const controller = document.querySelector("#judge-tour");
  if (!controller) return;
  controller.hidden = !judgeTour.active;
  document.querySelector("[data-action='start-judge-tour']")?.toggleAttribute("hidden", judgeTour.active);
  const actorSelect = document.querySelector("#demo-actor");
  if (actorSelect) actorSelect.disabled = judgeTour.active;
  if (!judgeTour.active) {
    controller.innerHTML = "";
    return;
  }
  const step = JUDGE_TOUR_STEPS[judgeTour.index];
  const role = roleDefinition(step.role);
  const source = judgeTourSource(step);
  const firstSourceStep = source?.steps[0];
  const lastSourceStep = source?.steps.at(-1);
  const narration = judgeNarration?.items?.find((item) => item.step_id === step.id);
  const chapter = activeJudgeTourChapter();
  controller.dataset.stepIndex = String(judgeTour.index);
  controller.dataset.scenarioStep = lastSourceStep?.step_id || step.source.at(-1) || "";
  controller.dataset.chapter = chapter.id;
  controller.dataset.actionPhase ||= "ready";
  controller.innerHTML = `
    <div class="judge-tour-progress"><span style="width:${Math.round((judgeTour.index + 1) / JUDGE_TOUR_STEPS.length * 100)}%"></span></div>
    <nav class="judge-tour-chapters" aria-label="评委演示路线">${JUDGE_TOUR_CHAPTERS.map((item) => `<button type="button" data-judge-tour-chapter="${item.start}" ${item.id === chapter.id ? 'aria-current="step"' : ""}>${item.label}</button>`).join("")}</nav>
    <div class="judge-tour-step"><span>${String(judgeTour.index + 1).padStart(2, "0")} / ${String(JUDGE_TOUR_STEPS.length).padStart(2, "0")}</span><small>${judgeTour.paused ? "已暂停" : judgeTour.index === JUDGE_TOUR_STEPS.length - 1 ? "演示完成" : "自动播放中"}</small></div>
    <div class="judge-tour-copy"><small>${escapeHtml(role?.label || step.role)}</small><h2>${escapeHtml(step.title)}</h2>${narration ? `<blockquote class="judge-tour-narration"><i data-lucide="message-square-text"></i><span>${escapeHtml(narration.narration)}</span><cite>${escapeHtml(narration.speaker)} · 请看：${escapeHtml(narration.watch_for)}</cite></blockquote>` : ""}<strong class="judge-tour-completion"><i data-lucide="check-circle-2"></i><span data-judge-result-label>${controller.dataset.actionPhase === "complete" ? "已完成" : "完成后"}</span> · ${escapeHtml(step.result)}</strong><details class="judge-tour-evidence"><summary>查看本步说明</summary><p class="judge-tour-why"><b>为什么</b>${escapeHtml(step.detail)}</p>${firstSourceStep ? `<em data-judge-source-range>场景 ${escapeHtml(firstSourceStep.step_id)}–${escapeHtml(lastSourceStep.step_id)} · ${escapeHtml(firstSourceStep.from_state)} → ${escapeHtml(lastSourceStep.to_state)} · ${source.count} 个步骤 / ${source.humanGates} 个人工确认点</em>` : ""}</details><div class="judge-tour-action-row"><em class="judge-tour-action">现在操作 · ${escapeHtml(step.action?.label || "查看当前页面")}</em><em class="judge-tour-phase" data-judge-action-phase>${escapeHtml(judgeTour.actionPhase)}</em></div></div>
    <div class="judge-tour-controls">
      <button type="button" data-judge-tour-action="previous" aria-label="上一步" ${judgeTour.index === 0 ? "disabled" : ""}><i data-lucide="chevron-left"></i></button>
      <button type="button" data-judge-tour-action="toggle"><i data-lucide="${judgeTour.paused ? "play" : "pause"}"></i>${judgeTour.paused ? "继续" : "暂停"}</button>
      <button type="button" data-judge-tour-action="next" aria-label="下一步" ${judgeTour.index === JUDGE_TOUR_STEPS.length - 1 ? "disabled" : ""}><i data-lucide="chevron-right"></i></button>
      <button type="button" data-judge-tour-action="exit">退出演示</button>
    </div>`;
  refreshIcons();
}

function clearJudgeTourActor() {
  clearTimeout(judgeTour.actionTimer);
  clearInterval(judgeTour.typingTimer);
  judgeTour.actionTimer = null;
  judgeTour.typingTimer = null;
  document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
  document.querySelectorAll("[data-judge-tour-target]").forEach((element) => element.removeAttribute("data-judge-tour-target"));
  const pointer = document.querySelector("#judge-tour-pointer");
  if (pointer) {
    pointer.hidden = true;
    pointer.classList.remove("is-clicking");
    delete pointer.dataset.pointerStage;
  }
}

function visibleJudgeTourTarget(selector) {
  if (!selector) return null;
  return [...document.querySelectorAll(selector)].find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }) || null;
}

function performJudgeTourAction(index) {
  const step = JUDGE_TOUR_STEPS[index];
  if (!judgeTour.active || judgeTour.paused || !step?.action) return;
  setJudgeTourActionPhase("scrolling", "正在浏览当前业务页面");
  judgeTour.actionTimer = setTimeout(() => {
    if (!judgeTour.active || judgeTour.paused || judgeTour.index !== index) return;
    const action = step.action;
    const exactTarget = visibleJudgeTourTarget(action.target);
    const target = exactTarget || visibleJudgeTourTarget(action.fallback);
    const pointer = document.querySelector("#judge-tour-pointer");
    if (!target || !pointer) return setJudgeTourActionPhase("blocked", "未找到演示控件，请手动进入下一步");
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const scanStops = maxScroll > window.innerHeight * .75 ? [0, maxScroll * .5, maxScroll] : maxScroll > 40 ? [0, maxScroll] : [0];
    let scanIndex = 0;
    pointer.style.left = "36px";
    pointer.style.top = "112px";
    pointer.dataset.pointerStage = "scanning";
    pointer.hidden = false;
    const scanPage = () => {
      if (!judgeTour.active || judgeTour.paused || judgeTour.index !== index) return;
      if (scanIndex < scanStops.length) {
        window.scrollTo({ top: scanStops[scanIndex], behavior: "smooth" });
        pointer.style.left = `${36 + Math.min(scanIndex, 2) * 80}px`;
        pointer.style.top = `${112 + Math.min(scanIndex, 2) * 34}px`;
        pointer.querySelector("span").textContent = `浏览第 ${scanIndex + 1}/${scanStops.length} 屏`;
        setJudgeTourActionPhase("scrolling", `正在浏览当前页面（第 ${scanIndex + 1}/${scanStops.length} 屏）`);
        scanIndex += 1;
        judgeTour.actionTimer = setTimeout(scanPage, JUDGE_TOUR_SCAN_HOLD);
        return;
      }
      const controller = document.querySelector("#judge-tour");
      if (controller) controller.dataset.scrollPasses = String(Number(controller.dataset.scrollPasses || 0) + 1);
      setJudgeTourActionPhase("scrolling", "页面已浏览完成，正在定位本步操作控件");
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      target.setAttribute("data-judge-tour-target", "");
      pointer.querySelector("span").textContent = action.label;
      pointer.dataset.pointerStage = "targeted";
      judgeTour.actionTimer = setTimeout(() => {
        if (!judgeTour.active || judgeTour.index !== index) return;
        const rect = target.getBoundingClientRect();
        const panelTop = document.querySelector("#judge-tour")?.getBoundingClientRect().top || window.innerHeight;
        pointer.style.left = `${Math.min(window.innerWidth - 28, Math.max(12, rect.left + Math.min(rect.width * .6, rect.width - 10)))}px`;
        pointer.style.top = `${Math.min(window.innerHeight - 40, Math.max(12, panelTop - 64), Math.max(12, rect.top + Math.min(rect.height * .55, rect.height - 8)))}px`;
        if (action.kind === "inspect") {
          judgeTour.actionTimer = setTimeout(() => completeJudgeTourAction(index), 2400);
          return;
        }
        judgeTour.actionTimer = setTimeout(() => {
          if (!judgeTour.active || judgeTour.index !== index) return;
          setJudgeTourActionPhase("acting", `正在执行：${action.label}`);
          pointer.classList.add("is-clicking");
          setTimeout(() => pointer.classList.remove("is-clicking"), 560);
          if (action.kind === "click") {
            target.click();
            judgeTour.actionTimer = setTimeout(() => action.after ? performJudgeTourFollowup(index, action.after, pointer) : completeJudgeTourAction(index), 900);
            return;
          }
          if (action.kind !== "fill") return;
          const field = target.matches("input, textarea") ? target : target.querySelector("input, textarea");
          if (!field) return setJudgeTourActionPhase("blocked", "未找到可填写控件，请手动进入下一步");
          field.focus();
          field.value = "";
          let offset = 0;
          judgeTour.typingTimer = setInterval(() => {
            if (!judgeTour.active || judgeTour.index !== index || offset >= action.value.length) {
              clearInterval(judgeTour.typingTimer);
              judgeTour.typingTimer = null;
              if (offset >= action.value.length) {
                field.dispatchEvent(new Event("change", { bubbles: true }));
                action.after ? performJudgeTourFollowup(index, action.after, pointer) : completeJudgeTourAction(index);
              }
              return;
            }
            field.value += action.value[offset++];
            field.dispatchEvent(new Event("input", { bubbles: true }));
          }, 55);
        }, 900);
      }, 900);
    };
    scanPage();
  }, 400);
}

function performJudgeTourFollowup(index, followup, pointer) {
  if (!judgeTour.active || judgeTour.paused || judgeTour.index !== index) return;
  const field = visibleJudgeTourTarget(followup.fieldTarget);
  const select = visibleJudgeTourTarget(followup.selectTarget);
  const submit = visibleJudgeTourTarget(followup.submitTarget);
  const finish = () => waitForJudgeTourResult(index, followup.resultTarget, 0, followup.sequence?.length
    ? () => performJudgeTourSequence(index, followup.sequence, pointer)
    : null);
  const submitForm = () => {
    if (select && followup.selectValue !== undefined) {
      select.value = followup.selectValue;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (!submit) return finish();
    document.querySelectorAll("[data-judge-tour-target]").forEach((element) => element.removeAttribute("data-judge-tour-target"));
    submit.setAttribute("data-judge-tour-target", "");
    submit.scrollIntoView({ behavior: "smooth", block: "center" });
    const rect = submit.getBoundingClientRect();
    pointer.querySelector("span").textContent = "提交并确认结果";
    pointer.style.left = `${Math.min(window.innerWidth - 28, Math.max(12, rect.left + rect.width * .55))}px`;
    pointer.style.top = `${Math.min(window.innerHeight - 80, Math.max(12, rect.top + rect.height * .55))}px`;
    pointer.classList.add("is-clicking");
    judgeTour.actionTimer = setTimeout(() => {
      pointer.classList.remove("is-clicking");
      submit.click();
      finish();
    }, 520);
  };
  if (!field || !followup.value) return submitForm();
  field.focus();
  field.value = "";
  let offset = 0;
  setJudgeTourActionPhase("acting", "正在填写演示表单");
  judgeTour.typingTimer = setInterval(() => {
    if (!judgeTour.active || judgeTour.index !== index || offset >= followup.value.length) {
      clearInterval(judgeTour.typingTimer);
      judgeTour.typingTimer = null;
      if (offset >= followup.value.length) {
        field.dispatchEvent(new Event("change", { bubbles: true }));
        submitForm();
      }
      return;
    }
    field.value += followup.value[offset++];
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }, 45);
}

function performJudgeTourSequence(index, sequence, pointer, offset = 0) {
  if (!judgeTour.active || judgeTour.paused || judgeTour.index !== index) return;
  if (offset >= sequence.length) return completeJudgeTourAction(index);
  const item = sequence[offset];
  const continueSequence = () => {
    if (item.role) {
      setActiveRole(item.role);
      renderRoute();
      renderJudgeTourController();
    }
    judgeTour.actionTimer = setTimeout(() => {
    const target = visibleJudgeTourTarget(item.target);
    if (!target) return setJudgeTourActionPhase("blocked", "后续闭环控件未出现，请手动检查");
    document.querySelectorAll("[data-judge-tour-target]").forEach((element) => element.removeAttribute("data-judge-tour-target"));
    target.setAttribute("data-judge-tour-target", "");
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    const rect = target.getBoundingClientRect();
    pointer.querySelector("span").textContent = item.label || "继续完成闭环";
    pointer.style.left = `${Math.min(window.innerWidth - 28, Math.max(12, rect.left + rect.width * .55))}px`;
    pointer.style.top = `${Math.min(window.innerHeight - 80, Math.max(12, rect.top + rect.height * .55))}px`;
    setJudgeTourActionPhase("acting", `正在执行：${item.label || "继续完成闭环"}`);
    pointer.classList.add("is-clicking");
    judgeTour.actionTimer = setTimeout(() => {
      pointer.classList.remove("is-clicking");
      const currentTarget = visibleJudgeTourTarget(item.target);
      if (!currentTarget) return setJudgeTourActionPhase("blocked", "后续闭环控件已更新，请手动检查");
      currentTarget.click();
      waitForJudgeTourResult(index, item.resultTarget, 0, () => performJudgeTourSequence(index, sequence, pointer, offset + 1));
    }, 520);
    }, item.role ? 320 : 160);
  };
  if (item.role && item.role !== activeRoleId) return showJudgeTourRoleSwitch(index, item.role, continueSequence);
  continueSequence();
}

function waitForJudgeTourResult(index, selector, attempts = 0, onReady = null) {
  if (!judgeTour.active || judgeTour.paused || judgeTour.index !== index) return;
  if (!selector || visibleJudgeTourTarget(selector)) return onReady ? onReady() : completeJudgeTourAction(index);
  if (attempts >= 40) return setJudgeTourActionPhase("blocked", "操作已执行，但结果区域未出现，请手动检查");
  judgeTour.actionTimer = setTimeout(() => waitForJudgeTourResult(index, selector, attempts + 1, onReady), 100);
}

function completeJudgeTourAction(index) {
  if (!judgeTour.active || judgeTour.paused || judgeTour.index !== index) return;
  setJudgeTourActionPhase("complete", "动作完成，停留讲解后进入下一步");
  scheduleJudgeTourStep();
}

function scheduleJudgeTourStep() {
  clearTimeout(judgeTour.timer);
  if (!judgeTour.active || judgeTour.paused) return;
  judgeTour.timer = setTimeout(() => judgeTour.index >= JUDGE_TOUR_STEPS.length - 1 ? showJudgeTourSummary() : setJudgeTourStep(judgeTour.index + 1), JUDGE_TOUR_RESULT_HOLD);
}

function showJudgeTourSummary() {
  if (!judgeTour.active) return;
  document.querySelector("#judge-tour-summary")?.showModal();
}

function showJudgeTourRoleSwitch(index, roleId, onComplete) {
  const actor = document.querySelector("#demo-actor");
  const pointer = document.querySelector("#judge-tour-pointer");
  if (!actor || !pointer || roleId === activeRoleId) {
    setActiveRole(roleId);
    onComplete();
    return;
  }
  const label = roleDefinition(roleId)?.label || roleId;
  const rect = actor.getBoundingClientRect();
  actor.setAttribute("data-judge-tour-target", "");
  pointer.hidden = false;
  pointer.dataset.pointerStage = "role-switch";
  pointer.querySelector("span").textContent = `切换为${label}`;
  pointer.style.left = `${Math.max(12, rect.left + rect.width * .62)}px`;
  pointer.style.top = `${Math.max(12, rect.top + rect.height * .62)}px`;
  setJudgeTourActionPhase("role", `现在切换到${label}`);
  judgeTour.actionTimer = setTimeout(() => {
    if (!judgeTour.active || judgeTour.index !== index) return;
    pointer.classList.add("is-clicking");
    judgeTour.actionTimer = setTimeout(() => {
      pointer.classList.remove("is-clicking");
      actor.removeAttribute("data-judge-tour-target");
      setActiveRole(roleId);
      onComplete();
    }, 360);
  }, 900);
}

function setJudgeTourStep(index) {
  if (!judgeTour.active || index < 0 || index >= JUDGE_TOUR_STEPS.length) return;
  clearTimeout(judgeTour.timer);
  clearJudgeTourActor();
  judgeTour.index = index;
  judgeTour.stepStartedAt = Date.now();
  judgeTour.actionPhase = "准备演示动作";
  const controller = document.querySelector("#judge-tour");
  if (controller) controller.dataset.actionPhase = "ready";
  const step = JUDGE_TOUR_STEPS[index];
  renderJudgeTourController();
  const enterStep = () => {
    setActiveRole(step.role);
    if (judgeScenarioRuntime) judgeScenarioRuntime.jumpTo(step.source[1]);
    prepareJudgeTourStep(index);
    if (location.hash !== step.route) history.replaceState(null, "", step.route);
    judgeTour.actionPhase = judgeTour.paused ? "演示已暂停" : "准备演示动作";
    const controller = document.querySelector("#judge-tour");
    if (controller) controller.dataset.actionPhase = "ready";
    renderRoute();
    renderJudgeTourController();
    if (!judgeTour.paused) judgeTour.actionTimer = setTimeout(() => performJudgeTourAction(index), JUDGE_TOUR_NAV_HOLD);
  };
  showJudgeTourRoleSwitch(index, step.role, enterStep);
}

function startJudgeTour() {
  if (judgeTour.active) return;
  judgeTour = {
    active: true, paused: false, index: 0, stepStartedAt: Date.now(), actionPhase: "准备演示动作", timer: null, actionTimer: null, typingTimer: null,
    restore: {
      role: activeRoleId, hash: location.hash || "#/home",
      incident: structuredClone(incidentBackend), copilot: structuredClone(copilotState), monitoring: structuredClone(monitoringState), radioCommand: structuredClone(radioCommandState),
      selectedCompanyId, selectedIssueId, selectedSignalEventId, selectedIncidentId, selectedInboxId, terminalStationId, terminalOwnerName, rectificationEvidence,
    },
  };
  stopIncidentBackend();
  stopMonitoringBackend();
  document.body.classList.add("judge-tour-active");
  setJudgeTourStep(0);
}

function stopJudgeTour() {
  if (!judgeTour.active) return;
  clearTimeout(judgeTour.timer);
  clearJudgeTourActor();
  const restore = judgeTour.restore;
  judgeTour = { active: false, paused: false, index: 0, stepStartedAt: 0, actionPhase: "准备演示", timer: null, actionTimer: null, typingTimer: null, restore: null };
  document.body.classList.remove("judge-tour-active");
  incidentBackend = restore.incident;
  copilotState = restore.copilot;
  monitoringState = restore.monitoring;
  radioCommandState = restore.radioCommand;
  ({ selectedCompanyId, selectedIssueId, selectedSignalEventId, selectedIncidentId, selectedInboxId, terminalStationId, terminalOwnerName, rectificationEvidence } = restore);
  setActiveRole(restore.role);
  renderJudgeTourController();
  if (location.hash !== restore.hash) history.replaceState(null, "", restore.hash);
  renderRoute();
}

function bindJudgeTourControls() {
  document.querySelector("#judge-tour")?.addEventListener("click", (event) => {
    const chapterStart = event.target.closest("[data-judge-tour-chapter]")?.dataset.judgeTourChapter;
    if (chapterStart !== undefined) return setJudgeTourStep(Number(chapterStart));
    const action = event.target.closest("[data-judge-tour-action]")?.dataset.judgeTourAction;
    if (!action) return;
    if (action === "exit") return stopJudgeTour();
    if (action === "previous") return setJudgeTourStep(judgeTour.index - 1);
    if (action === "next") return setJudgeTourStep(judgeTour.index + 1);
    judgeTour.paused = !judgeTour.paused;
    if (judgeTour.paused) {
      clearJudgeTourActor();
      judgeTour.actionPhase = "演示已暂停";
    }
    else performJudgeTourAction(judgeTour.index);
    renderJudgeTourController();
  });
  document.querySelector("#judge-tour-summary")?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-judge-summary-action]")?.dataset.judgeSummaryAction;
    if (!action) return;
    document.querySelector("#judge-tour-summary").close();
    if (action === "restart") return setJudgeTourStep(0);
    if (action === "exit") stopJudgeTour();
  });
}

window.addEventListener("fireguard:enterprise-selected", (event) => {
  if (!companies.some((company) => company.id === event.detail?.id)) return;
  selectedCompanyId = event.detail.id;
  monitoringState.spatialLevel = "floor";
  monitoringState.selectedId = monitoringState.events.find((item) => item.enterpriseId === selectedCompanyId)?.id || monitoringState.selectedId;
  const selectedEvent = monitoringState.events.find((item) => item.id === monitoringState.selectedId);
  const building = buildingForEnterprise(selectedCompanyId);
  if (building && selectedEvent) monitoringState.floor = workshopFloor(building, selectedEvent);
  if (document.body.dataset.route === "home") {
    location.hash = "#/monitoring";
    return;
  }
  renderRoute();
});

function buildOfflineCopilotRun(stage = "verification") {
  const evidence = [
    { ref: "monitoring_events/OFFLINE-001", kind: "signal", note: "合成 Modbus 报警帧" },
    { ref: "pt-02-01-005", kind: "point", note: "电池车间 PACK 缓存区烟感" },
    { ref: "demo/manual/fire-alarm-01", kind: "knowledge", note: "火警核实与先期处置流程" },
    { ref: "crew-wx-01", kind: "crew", note: "微型消防站·西区站（虚拟）" },
  ];
  const trace = [
    { name: "get_signal_context", ok: true, data: { verification_status: stage === "verification" ? "pending" : "confirmed" }, evidence_refs: [evidence[0].ref, evidence[1].ref] },
    { name: "get_site_packet", ok: true, data: {}, evidence_refs: ["ent-001"] },
    { name: "get_maintenance_context", ok: true, data: {}, evidence_refs: ["demo/maintenance/pack-01"] },
    { name: "find_missing_fields", ok: true, data: { missing_fields: ["未撤出人员最后位置"] }, evidence_refs: [] },
  ];
  if (stage === "verification") {
    trace.push({ name: "create_verification_draft", ok: true, data: { note: "两点报警并有人工见明火报告，建议立即现场核实。", status: "awaiting_human_verification" }, evidence_refs: [evidence[0].ref] });
  } else {
    trace.push(
      { name: "recommend_crew", ok: true, data: { recommended: [{ id: "crew-wx-01" }] }, evidence_refs: ["crew-wx-01"] },
      { name: "create_workorder_draft", ok: true, data: { crew_id: "crew-wx-01", summary: "确认火警先期处置：核查人员撤离、控制火势并回传首报" }, evidence_refs: [evidence[0].ref, "crew-wx-01"] },
      ...["duty_officer", "responder", "area_owner"].map((role) => ({
        name: "build_role_brief", ok: true, data: { role, incident: { response_brief: { address: "电池车间 PACK 半成品缓存区", items: [{ text: "按岗位核对事件、人员与处置状态" }], disclaimer: "合成演示，不控制真实设备" } } }, evidence_refs: ["OFFLINE-INC-001"],
      })),
    );
  }
  return {
    run_id: "OFFLINE-001", mode: "scenario", model_name: "deterministic-template",
    fallback_reason: "公开静态演示：未连接后端", incident_id: stage === "dispatch" ? "OFFLINE-INC-001" : null,
    plan: {
      intent: "incident_response_support", abstained: false,
      plan: ["解析报警帧并定位点位", "汇总现场、设备与制度证据", "生成待人工确认的处置草稿"],
      missing_fields: ["未撤出人员最后位置"], risks: ["锂电池模组半成品存在复燃风险", "严禁 AI 自动启动灭火或对外报警"], evidence,
    },
    rejected_evidence: [], trace,
  };
}

function selectedCopilotScenario() {
  return copilotState.scenarios?.find((item) => item.scenario_id === copilotState.selectedId) || copilotState.scenarios?.[0] || null;
}

function copilotPhaseForRun(run) {
  if (run.plan.abstained) return "abstained";
  const verificationStatus = run.trace.find((entry) => entry.name === "get_signal_context" && entry.ok)?.data?.verification_status;
  const workorder = run.trace.find((entry) => entry.name === "create_workorder_draft");
  if (workorder) return workorder.ok ? "dispatch" : "blocked";
  if (verificationStatus === "confirmed" && run.incident_id) return "handoff";
  if (verificationStatus === "dismissed") return "closed";
  if (run.trace.some((entry) => entry.name === "create_verification_draft" && entry.ok)) return "verification";
  return "advisory";
}

async function loadCopilotScenarios() {
  if (copilotState.scenarios) return;
  if (!MONITORING_API_BASE) {
    copilotState.offline = true;
    copilotState.scenarios = [OFFLINE_JUDGE_SCENARIO];
    copilotState.selectedId = OFFLINE_JUDGE_SCENARIO.scenario_id;
    if ((location.hash || "").startsWith("#/copilot")) renderRoute();
    return;
  }
  try {
    const response = await fetch(`${MONITORING_API_BASE}/copilot/scenarios`);
    if (!response.ok) throw new Error("scenarios_unavailable");
    const payload = await response.json();
    copilotState.offline = false;
    copilotState.scenarios = payload.scenarios || [];
    copilotState.selectedId ||= copilotState.scenarios[0]?.scenario_id || null;
  } catch {
    copilotState.offline = true;
    copilotState.scenarios = [OFFLINE_JUDGE_SCENARIO];
    copilotState.selectedId = OFFLINE_JUDGE_SCENARIO.scenario_id;
  }
  if ((location.hash || "").startsWith("#/copilot")) renderRoute();
}

async function copilotPost(path, body, actorId = demoActorId) {
  const response = await fetch(`${MONITORING_API_BASE}${path}`, {
    method: "POST", headers: actorHeaders(actorId), body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "copilot_action_failed");
  return payload;
}

function bindHubSignal(eventId, enterpriseId, preferredScenarioId) {
  if (!eventId) return showToast("缺少可绑定的中枢信号");
  copilotState.bindSource = "hub";
  copilotState.hubEventId = Number(eventId);
  copilotState.hubEnterpriseId = enterpriseId || null;
  if (preferredScenarioId) copilotState.selectedId = preferredScenarioId;
  copilotState.phase = "select";
  copilotState.run = null;
  location.hash = "#/copilot";
  loadCopilotScenarios().then(() => renderRoute());
  showToast(`已绑定中枢信号 #${eventId}，可直接开始辅助研判`);
}

async function runCopilotScenario() {
  const scenario = selectedCopilotScenario();
  if (!scenario || copilotState.busy) return;
  setDemoActor("duty-demo");
  if (copilotState.offline) {
    copilotState.busy = true;
    renderRoute();
    await new Promise((resolve) => setTimeout(resolve, 300));
    copilotState.eventId = "OFFLINE-001";
    copilotState.run = buildOfflineCopilotRun("verification");
    copilotState.verification = null;
    copilotState.dispatch = null;
    copilotState.phase = "verification";
    copilotState.busy = false;
    renderRoute();
    return;
  }
  copilotState.busy = true;
  renderRoute();
  try {
    let eventId = copilotState.hubEventId;
    let enterpriseId = copilotState.hubEnterpriseId || scenario.enterprise_id;
    if (copilotState.bindSource !== "hub" || !eventId) {
      const event = await copilotPost("/monitoring/events", {
        enterprise_id: scenario.enterprise_id,
        event_type: scenario.input.signal.event_type,
        severity: scenario.input.signal.severity,
        source: "copilot_demo",
        payload: scenario.input.signal.payload,
      });
      eventId = event.id;
      enterpriseId = scenario.enterprise_id;
      copilotState.bindSource = "scenario";
    }
    const run = await copilotPost("/copilot/runs", {
      enterprise_id: enterpriseId,
      event_id: eventId,
      reporter_text: scenario.input.reporter_text,
      image_assets: (scenario.input.images || []).map((image) => image.asset),
      scenario_id: scenario.scenario_id,
      mode: copilotState.mode,
    });
    copilotState.eventId = eventId;
    copilotState.run = run;
    copilotState.verification = null;
    copilotState.dispatch = null;
    copilotState.verificationActor = null;
    copilotState.dispatchActor = null;
    copilotState.phase = copilotPhaseForRun(run);
  } catch (error) {
    showToast(`辅助研判运行失败：${error.message}`);
    copilotState.phase = "select";
  } finally {
    copilotState.busy = false;
    renderRoute();
  }
}

async function startJudgeDemo() {
  if (copilotState.busy) return;
  const scenario = copilotState.scenarios?.find((item) => item.scenario_id === "B-confirmed-fire-battery-workorder");
  if (!scenario) return showToast("研判样例尚未加载");
  const station = copilotState.offline ? null : incidentBackend.stations.find((item) => item.id === "crew-wx-01");
  if (station && station.status !== "available") return showToast("西区班组正在执行其他任务，请先到处置进度完成该任务");
  resetCopilot();
  copilotState.judgeMode = true;
  copilotState.selectedId = scenario.scenario_id;
  copilotState.mode = "scenario";
  copilotState.bindSource = "scenario";
  copilotState.judgeProgress = ["Agent 正在解析报警并补齐证据"];
  await runCopilotScenario();
}

async function confirmCopilotVerification(result) {
  const scenario = selectedCopilotScenario();
  if (!scenario || !copilotState.run || copilotState.busy) return;
  if (copilotState.offline) {
    copilotState.verification = result;
    copilotState.verificationActor = demoActorId;
    copilotState.run = result === "confirmed" ? buildOfflineCopilotRun("dispatch") : copilotState.run;
    copilotState.phase = result === "confirmed" ? "dispatch" : "closed";
    renderRoute();
    return;
  }
  copilotState.busy = true;
  try {
    await copilotPost(`/signals/${copilotState.eventId}/verification`, { result, note: "Copilot 演示中的人工确认" });
    await copilotPost(`/copilot/runs/${copilotState.run.run_id}/approve`, { action: "verification_result" });
    copilotState.verification = result;
    copilotState.verificationActor = demoActorId;
    if (result === "confirmed") {
      const run = await copilotPost("/copilot/runs", {
        enterprise_id: scenario.enterprise_id,
        event_id: copilotState.eventId,
        reporter_text: scenario.input.reporter_text,
        image_assets: (scenario.input.images || []).map((image) => image.asset),
        scenario_id: scenario.scenario_id,
        mode: copilotState.mode,
      });
      copilotState.run = run;
      copilotState.phase = copilotPhaseForRun(run);
    } else {
      copilotState.phase = "closed";
    }
  } catch (error) {
    if (error.message === "verification_conflict") {
      try {
        const run = await copilotPost("/copilot/runs", {
          enterprise_id: scenario.enterprise_id, event_id: copilotState.eventId,
          reporter_text: scenario.input.reporter_text,
          image_assets: (scenario.input.images || []).map((image) => image.asset),
          scenario_id: scenario.scenario_id, mode: copilotState.mode,
        });
        copilotState.run = run;
        copilotState.phase = copilotPhaseForRun(run);
        showToast("该信号已核实，已恢复到数据库中的当前步骤");
      } catch (refreshError) {
        showToast(`状态恢复失败：${refreshError.message}`);
      }
    } else {
      showToast(`核实登记失败：${incidentErrorMessage(error.message)}`);
    }
  } finally {
    copilotState.busy = false;
    renderRoute();
  }
}

async function confirmCopilotDispatch() {
  const run = copilotState.run;
  const draft = run?.trace.find((entry) => entry.name === "create_workorder_draft" && entry.ok);
  if (!draft || copilotState.busy) return;
  if (copilotState.offline) {
    copilotState.dispatch = draft.data.crew_id;
    copilotState.dispatchActor = demoActorId;
    copilotState.phase = copilotState.judgeMode ? "crew_simulation" : "done";
    renderRoute();
    if (copilotState.judgeMode && !judgeTour.active) await runJudgeCrewSimulation();
    return;
  }
  copilotState.busy = true;
  let autoSimulate = false;
  try {
    // 火警处置单走 incident_dispatches；维修/故障工单写入 ops_workorders 中枢。
    if (run.incident_id) {
      await copilotPost(`/incidents/${run.incident_id}/dispatch`, { station_id: draft.data.crew_id });
    } else {
      const existing = await fetch(`${MONITORING_API_BASE}/workorders?status=draft`).then((r) => r.json()).catch(() => ({ items: [] }));
      const matched = (existing.items || []).find((item) => item.event_id === (draft.data.event_id || copilotState.eventId) && item.kind === "repair");
      if (matched) {
        await copilotPost(`/workorders/${matched.id}/approve`, { note: "Copilot 故障诊断工单人工确认" }, "facility-demo");
        selectedInboxId = `workorder-${matched.id}`;
      } else {
        const created = await copilotPost("/workorders", {
          enterprise_id: selectedCopilotScenario()?.enterprise_id || "ent-001",
          kind: "repair",
          summary: draft.data.summary || "Copilot 维修工单",
          crew_id: draft.data.crew_id || "crew-wb-01",
          event_id: draft.data.event_id || copilotState.eventId,
          status: "approved",
          evidence_refs: [`monitoring_events/${draft.data.event_id || copilotState.eventId}`],
        }, "facility-demo");
        selectedInboxId = `workorder-${created.workorder.id}`;
      }
    }
    await copilotPost(`/copilot/runs/${copilotState.run.run_id}/approve`, { action: "workorder_dispatch" });
    copilotState.dispatch = draft.data.crew_id;
    copilotState.dispatchActor = demoActorId;
    copilotState.phase = "done";
    terminalStationId = draft.data.crew_id || (run.incident_id ? "crew-wx-01" : "crew-wb-01");
    autoSimulate = copilotState.judgeMode && Boolean(run.incident_id);
    showToast("工单已派发，下一步由班组签收");
    scheduleIncidentRefresh();
  } catch (error) {
    showToast(`工单派发失败：${incidentErrorMessage(error.message)}`);
  } finally {
    copilotState.busy = false;
    renderRoute();
  }
  if (autoSimulate) await runJudgeCrewSimulation();
}

async function runJudgeCrewSimulation() {
  if (copilotState.offline) {
    copilotState.phase = "crew_simulation";
    copilotState.busy = true;
    copilotState.judgeProgress = [];
    setDemoActor("brigade-demo");
    renderRoute();
    for (const label of ["班组已签收", "班组已出动", "班组已到场", "现场反馈已回传"]) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      copilotState.judgeProgress.push(label);
      renderRoute();
    }
    setDemoActor("duty-demo");
    copilotState.phase = "archive";
    copilotState.busy = false;
    renderRoute();
    return;
  }
  const incidentId = copilotState.run?.incident_id;
  if (!incidentId || copilotState.busy) return;
  copilotState.phase = "crew_simulation";
  copilotState.busy = true;
  copilotState.judgeProgress = [];
  setDemoActor("brigade-demo");
  renderRoute();
  try {
    await refreshIncidentBackend();
    const incident = incidentBackend.incidents.find((item) => item.id === incidentId);
    const dispatchId = incident?.dispatch?.id;
    if (!dispatchId) throw new Error("dispatch_not_ready");
    for (const [action, label] of [["acknowledge", "班组已签收"], ["depart", "班组已出动"], ["arrive", "班组已到场"]]) {
      await copilotPost(`/dispatches/${dispatchId}/transition`, { action, note: `评委引导演示：${label}（模拟）` });
      copilotState.judgeProgress.push(label);
      renderRoute();
      await new Promise((resolve) => setTimeout(resolve, 450));
    }
    await copilotPost(`/dispatches/${dispatchId}/report`, {
      situation: "评委演示：现场明火已扑灭，人员全部撤离（合成）",
      people_status: "no_risk",
    });
    copilotState.judgeProgress.push("现场反馈已回传");
    await refreshIncidentBackend();
    setDemoActor("duty-demo");
    selectedIncidentId = incidentId;
    location.hash = `#/incidents?incident_id=${incidentId}`;
    showToast("班组模拟处置完成，请值班员核验归档");
  } catch (error) {
    copilotState.phase = "done";
    showToast(`自动演示中断：${incidentErrorMessage(error.message)}`);
  } finally {
    copilotState.busy = false;
    if ((location.hash || "").startsWith("#/copilot")) renderRoute();
  }
}

function archiveOfflineJudgeDemo() {
  copilotState.phase = "archived";
  copilotState.judgeProgress.push("值班员已核验归档");
  renderRoute();
  showToast("离线研判样例已完成，事件记录可导出");
}

function resetCopilot() {
  setDemoActor("duty-demo");
  copilotState.phase = "select";
  copilotState.run = null;
  copilotState.eventId = null;
  copilotState.verification = null;
  copilotState.dispatch = null;
  copilotState.verificationActor = null;
  copilotState.dispatchActor = null;
  copilotState.judgeMode = false;
  copilotState.judgeProgress = [];
  renderRoute();
}

function exportCopilotAuditPack() {
  const scenario = selectedCopilotScenario();
  const run = copilotState.run;
  if (!scenario || !run) return;
  const pack = {
    schema_version: "fireops-audit-pack/v1",
    exported_at: new Date().toISOString(),
    simulation: true,
    boundaries: ["不控制真实设备", "不自动启动灭火装置", "AI不替代现场处置决策", "对外报警(119)由人工执行"],
    run: {
      run_id: run.run_id,
      event_id: copilotState.eventId,
      scenario_id: scenario.scenario_id,
      mode: run.mode,
      model_name: run.model_name,
      fallback_reason: run.fallback_reason,
      intent: run.plan.intent,
      abstained: run.plan.abstained,
    },
    input: { reporter_text: scenario.input.reporter_text, images: scenario.input.images || [] },
    evidence: run.plan.evidence,
    rejected_evidence: run.rejected_evidence,
    tool_trace: run.trace,
    human_decisions: [
      copilotState.verification && {
        action: "verification_result", value: copilotState.verification, actor_id: copilotState.verificationActor,
      },
      copilotState.dispatch && {
        action: "workorder_dispatch", value: copilotState.dispatch, actor_id: copilotState.dispatchActor,
      },
    ].filter(Boolean),
    role_briefs: run.trace.filter((entry) => entry.name === "build_role_brief" && entry.ok).map((entry) => entry.data),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `fireops-audit-run-${run.run_id}.json` });
  link.click();
  URL.revokeObjectURL(url);
  showToast("原始 JSON 已下载");
}

function openCopilotRunRecord() {
  const run = copilotState.run;
  const scenario = selectedCopilotScenario();
  if (!run || !scenario) return;
  const toolLabels = {
    get_signal_context: "读取报警与核实状态", get_site_packet: "读取车间与首战资料",
    get_maintenance_context: "核对设备维保记录", find_missing_fields: "检查缺失信息",
    create_verification_draft: "生成待人工核实草稿", recommend_crew: "匹配可用处置班组",
    create_workorder_draft: "生成待人工批准工单", build_role_brief: "生成岗位任务卡",
  };
  document.querySelector("#run-record-content").innerHTML = `
    <section data-copilot-run-section="input"><h3>输入</h3><p>${escapeHtml(scenario.input.reporter_text)}</p><small>事件 ${escapeHtml(copilotState.eventId || run.run_id)} · 固定合成数据</small></section>
    <section data-copilot-run-section="evidence"><h3>证据</h3><ul>${run.plan.evidence.map((item) => `<li><strong>${escapeHtml(item.note || item.kind)}</strong><span>${escapeHtml(item.ref)}</span></li>`).join("")}</ul></section>
    <section data-copilot-run-section="tools"><h3>工具调用</h3><ol>${run.trace.map((item) => `<li><strong>${escapeHtml(toolLabels[item.name] || item.name)}</strong><span>${item.ok ? "完成" : "未完成"}</span></li>`).join("")}</ol></section>
    <section data-copilot-run-section="human"><h3>人工确认</h3><ul><li>火警核实：${copilotState.verification ? (copilotState.verification === "confirmed" ? "已确认" : "已排除") : "等待值班员确认"}</li><li>工单派发：${copilotState.dispatch ? "已由授权人员批准" : "等待授权人员批准"}</li></ul></section>
    <section data-copilot-run-section="result"><h3>结果</h3><p>${copilotState.phase === "archived" ? "事件已完成人工核验并归档。" : copilotState.phase === "dispatch" ? "处置草稿已生成，等待人工派单。" : "核实草稿已生成，等待人工确认。"}</p><small>AI 只整理证据和生成草稿，不控制真实设备，不替代现场决策。</small></section>`;
  document.querySelector("#run-record-dialog").showModal();
  refreshIcons();
}

function copilotTemplate() {
  const scenario = selectedCopilotScenario();
  return `
    <section class="copilot-page" aria-labelledby="copilot-title">
      <header class="copilot-header">
        <div>
          <span>FIREOPS / FACTORY COPILOT</span>
          <h1 id="copilot-title">FireOps AI 辅助研判</h1>
          <p>整理报警信号、现场记录和处置依据，生成可核对的建议；核实、派单和归档仍由责任岗位确认。</p>
        </div>
        <div class="copilot-badges">
          <span class="copilot-badge"><i data-lucide="flask-conical"></i>合成数据</span>
          <span class="copilot-badge"><i data-lucide="plug-zap"></i>不控制真实设备</span>
          <span class="copilot-badge"><i data-lucide="shield-check"></i>AI 不替代现场处置决策</span>
        </div>
      </header>
      ${copilotState.offline ? `
        <div class="copilot-offline-banner" role="status">
          <span><i data-lucide="wifi-off"></i>离线可运行</span>
          <strong>当前使用浏览器内演示数据，功能入口和岗位权限与正常模式一致。</strong>
          <small>评委模式只是自动导览，不会切换成另一套产品；接入后端后仍沿用同一业务流程。</small>
        </div>
      ` : `<a class="copilot-workflow-jump" href="#/incidents?view=progress"><span><i data-lucide="route"></i>处置进度</span><strong>${incidentBackend.incidents.filter((incident) => incident.status !== "closed").length} 个进行中事件</strong><small>查看当前步骤、责任角色和下一动作</small><i data-lucide="arrow-right"></i></a>`}
      ${copilotState.scenarios === null ? `<div class="copilot-empty">正在加载演示场景…</div>` : ""}
      ${scenario ? copilotSelectTemplate(scenario) : ""}
      ${copilotState.run ? copilotRunTemplate() : ""}
    </section>
  `;
}

function copilotSelectTemplate(scenario) {
  const pendingSignals = (incidentBackend.signals || []).filter((item) => item.verification_status === "pending");
  const repairDrafts = incidentBackend.repairDrafts || [];
  if (copilotState.phase !== "select") {
    return `
      <div class="copilot-context">
        <strong>${escapeHtml(scenario.title)}</strong>
        <span>${copilotState.bindSource === "hub" ? "中枢信号绑定" : copilotState.mode === "live" ? "Live 模型模式" : "场景回放模式"} · 信号事件 #${copilotState.eventId}</span>
        <button type="button" class="secondary-action" data-copilot-action="reset"><i data-lucide="rotate-ccw"></i>重新开始</button>
      </div>
    `;
  }
  return `
    <section class="judge-demo-entry" aria-labelledby="judge-demo-title">
      <div><span>GUIDED CASE / 90 SEC</span><h2 id="judge-demo-title">运行一次报警研判样例</h2><p>依次查看报警解析、证据检索和班组模拟；火警核实、派单和归档仍由人确认。</p></div>
      <ol><li>AI 研判</li><li>人工核实</li><li>人工派单</li><li>模拟处置</li><li>人工归档</li></ol>
      <button type="button" class="primary-action" data-copilot-action="judge-run"><i data-lucide="play"></i>运行研判样例</button>
    </section>
    <section class="rag-eval-card" aria-labelledby="rag-eval-title">
      <div class="rag-eval-intro"><span>RAG EVALUATION / FIXED TEST SET</span><h2 id="rag-eval-title">知识检索离线评测</h2><p>基于 15 条设备说明书、通讯规约和管理制度知识，执行型号过滤、同义词归一化和关键词重排。</p></div>
      <dl class="rag-eval-metrics">
        <div><dt>评测问题</dt><dd>30</dd><small>固定可重复</small></div>
        <div><dt>Top-3 命中</dt><dd>28 / 28</dd><small>可回答问题</small></div>
        <div><dt>正确拒答</dt><dd>2 / 2</dd><small>无相关证据</small></div>
      </dl>
      <p class="rag-eval-boundary"><i data-lucide="shield-check"></i><span>检索结果必须带文档、章节、页码和匹配理由；工具未返回的证据不会进入处置建议。</span></p>
    </section>
    <div class="copilot-setup">
      <div class="copilot-scenarios">
        ${copilotState.scenarios.map((item) => `
          <button type="button" class="copilot-scenario ${item.scenario_id === scenario.scenario_id ? "selected" : ""}" data-copilot-scenario="${item.scenario_id}">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.safe_failure)}</span>
          </button>
        `).join("")}
      </div>
      <div class="copilot-input">
        <div class="copilot-mode" role="group" aria-label="信号来源">
          <button type="button" class="${copilotState.bindSource !== "hub" ? "active" : ""}" data-copilot-bind="scenario">独立场景<small>新建演示信号</small></button>
          <button type="button" class="${copilotState.bindSource === "hub" ? "active" : ""}" data-copilot-bind="hub" ${copilotState.offline ? "disabled" : ""}>中枢信号<small>${copilotState.offline ? "需连接后端" : "接监测/核实台"}</small></button>
        </div>
        <div class="copilot-mode" role="group" aria-label="运行模式">
          <button type="button" class="${copilotState.mode === "scenario" ? "active" : ""}" data-copilot-mode="scenario">场景回放<small>离线可复现</small></button>
          <button type="button" class="${copilotState.mode === "live" ? "active" : ""}" data-copilot-mode="live" ${copilotState.offline ? "disabled" : ""}>Live 模型<small>${copilotState.offline ? "需连接后端" : "失败自动回退"}</small></button>
        </div>
        ${copilotState.bindSource === "hub" ? `
          <div class="copilot-report">
            <h2>绑定中枢待处理信号</h2>
            ${pendingSignals.length ? pendingSignals.map((item) => `
              <button type="button" class="copilot-hub-signal ${copilotState.hubEventId === item.monitoring_event_id ? "selected" : ""}" data-hub-signal="${item.monitoring_event_id}" data-hub-enterprise="${item.enterprise_id}">
                火警待核实 #${item.monitoring_event_id} · ${escapeHtml(item.enterprise_name)}
              </button>
            `).join("") : `<p>暂无待核实火警。可先到报警与空间注入火警帧。</p>`}
            ${repairDrafts.length ? repairDrafts.map((item) => `
              <button type="button" class="copilot-hub-signal ${copilotState.hubEventId === item.event_id ? "selected" : ""}" data-hub-signal="${item.event_id || ""}" data-hub-enterprise="${item.enterprise_id}">
                故障草稿 #${item.workorder_id} · ${escapeHtml(item.enterprise_name)}
              </button>
            `).join("") : ""}
            ${copilotState.hubEventId ? `<p>已绑定事件 <strong>#${copilotState.hubEventId}</strong>，运行时不再新建信号。</p>` : `<p>请选择一条中枢信号后再运行。</p>`}
          </div>
        ` : `
          <div class="copilot-report">
            <h2>上报内容</h2>
            <p>${escapeHtml(scenario.input.reporter_text)}</p>
            ${(scenario.input.images || []).map((image) => `
              <figure><img src="${escapeHtml(image.asset)}" alt="${escapeHtml(image.note)}" /><figcaption>${escapeHtml(image.note)}</figcaption></figure>
            `).join("")}
          </div>
        `}
        <button type="button" class="primary-action copilot-run-button" data-copilot-action="run" ${copilotState.busy || (copilotState.bindSource === "hub" && !copilotState.hubEventId) ? "disabled" : ""}>
          <i data-lucide="play"></i>${copilotState.busy ? "正在运行…" : copilotState.bindSource === "hub" ? "研判当前中枢信号" : "开始辅助研判"}
        </button>
      </div>
    </div>
  `;
}

function copilotRunTemplate() {
  const run = copilotState.run;
  const plan = run.plan;
  return `
    <div class="copilot-result">
      <div class="copilot-status-strip">
        ${copilotState.offline ? `<span class="copilot-badge copilot-offline-badge"><i data-lucide="wifi-off"></i>离线合成回放</span>` : ""}
        <span class="copilot-badge">${run.mode === "live" ? "Live 模式" : "场景回放"}</span>
        <span class="copilot-badge">模型：${escapeHtml(run.model_name)}</span>
        ${run.fallback_reason ? `<span class="copilot-badge copilot-badge-warn">模型不可用，已回退模板（${escapeHtml(run.fallback_reason)}）</span>` : ""}
        <span class="copilot-badge">运行 #${run.run_id} · 模拟</span>
        <button type="button" class="primary-action copilot-record-action" data-copilot-action="view-record"><i data-lucide="list-tree"></i>查看运行记录</button>
        <button type="button" class="secondary-action copilot-audit-action" data-copilot-action="export-audit"><i data-lucide="download"></i>下载原始 JSON</button>
      </div>
      <div class="copilot-grid">
        <section class="copilot-panel">
          <h2>任务理解与计划</h2>
          <p class="copilot-intent">${escapeHtml(plan.intent)}</p>
          <ol class="copilot-plan">${plan.plan.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
          ${plan.missing_fields.length ? `<div class="copilot-missing"><h3>缺失信息</h3>${plan.missing_fields.map((field) => `<span>${escapeHtml(field)}</span>`).join("")}</div>` : ""}
          ${plan.risks.length ? `<div class="copilot-risks"><h3>风险提示</h3>${plan.risks.map((risk) => `<span>${escapeHtml(risk)}</span>`).join("")}</div>` : ""}
        </section>
        <section class="copilot-panel">
          <h2>系统处理过程</h2>
          <ol class="copilot-trace">${run.trace.map(copilotTraceTemplate).join("")}</ol>
        </section>
        <section class="copilot-panel">
          <h2>采用的信息</h2>
          ${plan.evidence.length ? `<ul class="copilot-evidence">${plan.evidence.map((ref) => `<li><i data-lucide="link"></i><span><strong>${escapeHtml(ref.note || "业务记录")}</strong><small>${escapeHtml({ signal: "报警信号", point: "设备点位", knowledge: "处置规程", crew: "处置力量" }[ref.kind] || "业务资料")}</small><details><summary>技术引用</summary><code>${escapeHtml(ref.ref)}</code></details></span></li>`).join("")}</ul>` : `<p class="copilot-empty">本次运行没有可引用的信息。</p>`}
          ${run.rejected_evidence.length ? `<p class="copilot-rejected">已拦截虚构证据：${run.rejected_evidence.map(escapeHtml).join("、")}</p>` : ""}
        </section>
      </div>
      ${copilotPhaseTemplate()}
    </div>
  `;
}

function copilotTraceTemplate(entry) {
  const labels = {
    get_signal_context: "读取报警信息并核对点位",
    get_site_packet: "读取车间危险源与入口",
    get_maintenance_context: "核对设备维保记录",
    find_missing_fields: "检查仍需人工补充的信息",
    create_verification_draft: "生成待人工确认的核实建议",
    recommend_crew: "匹配有权限的处置班组",
    create_workorder_draft: "生成待人工确认的处置单",
    build_role_brief: "整理各岗位处置简报",
  };
  return `
    <li class="${entry.ok ? "" : "failed"}">
      <i data-lucide="${entry.ok ? "check-circle-2" : "x-circle"}"></i>
      <div>
        <strong>${escapeHtml(labels[entry.name] || entry.name)}</strong>
        ${entry.error ? `<small>${escapeHtml(entry.error)}</small>` : ""}
        ${entry.evidence_refs.length ? `<small>已核对 ${entry.evidence_refs.length} 项关联信息</small><details><summary>技术详情</summary><code>${entry.evidence_refs.map(escapeHtml).join("、")}</code></details>` : ""}
      </div>
    </li>
  `;
}

function copilotBriefsTemplate(briefs) {
  if (!briefs.length) return "";
  const labels = { duty_officer: "消控室值班简报", responder: "处置班组任务卡", area_owner: "车间问题对接人待办" };
  return `
    <section class="copilot-panel">
      <h2>一次事件 · 三端交付</h2>
      <div class="copilot-briefs">
        ${briefs.map((entry) => {
          const brief = entry.data.incident?.response_brief || {};
          return `
            <article class="copilot-brief">
              <h3>${labels[entry.data.role] || escapeHtml(entry.data.role)}</h3>
              <p>${escapeHtml(brief.address || "地址未知")}</p>
              <ul>${(brief.items || []).map((item) => `<li>${escapeHtml(item.text)}</li>`).join("")}</ul>
              <small>${escapeHtml(entry.data.disclaimer || brief.disclaimer || "")}</small>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function copilotPhaseTemplate() {
  const run = copilotState.run;
  if (copilotState.phase === "archive") {
    return `
      <section class="copilot-panel copilot-approval">
        <div class="judge-gate"><b>人工闸门 3/3</b><span>班组已回传现场结果，最终归档仍由消控室值班员确认。</span></div>
        <h2><i data-lucide="archive"></i>人工确认 · 核验反馈并归档</h2>
        <p>现场反馈：明火已扑灭，人员已全部撤离；事件、工单、班组反馈和时间戳已汇总。</p>
        <small>离线演示只记录在当前浏览器，不写入真实数据库。</small>
        <div class="copilot-actions"><button type="button" class="primary-action" data-copilot-action="offline-archive"><i data-lucide="check-check"></i>核验反馈并归档</button></div>
      </section>`;
  }
  if (copilotState.phase === "archived") {
    return `
      <section class="copilot-panel copilot-done offline-demo-complete">
        <span>CASE COMPLETE</span><h2><i data-lucide="badge-check"></i>离线研判样例已闭环</h2>
        <p>同一事件已完成：AI 研判 → 人工核实 → 人工派单 → 班组反馈 → 人工归档。</p>
        <ol>${copilotState.judgeProgress.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
        <div class="copilot-actions"><button type="button" class="primary-action" data-copilot-action="view-record"><i data-lucide="list-tree"></i>查看运行记录</button><button type="button" class="secondary-action" data-copilot-action="export-audit"><i data-lucide="download"></i>下载原始 JSON</button><button type="button" class="secondary-action" data-copilot-action="reset"><i data-lucide="rotate-ccw"></i>重新演示</button></div>
      </section>`;
  }
  if (copilotState.phase === "abstained") {
    return `
      <section class="copilot-panel copilot-abstain">
        <h2><i data-lucide="pause-circle"></i>安全拒答</h2>
        <p>证据不足，Agent 不生成处置建议、不起草工单。缺失字段全部标注为未知，需人工补充信息后重新上报。</p>
      </section>
    `;
  }
  if (copilotState.phase === "blocked") {
    const failure = run.trace.find((entry) => entry.name === "create_workorder_draft" && !entry.ok);
    return `
      <section class="copilot-panel copilot-blocked">
        <h2><i data-lucide="circle-alert"></i>派单暂时受阻</h2>
        <p>${failure?.error === "crew_unavailable" ? "对应片区的处置班组正在执行其他任务，系统没有生成一张无法履行的工单。" : `工单草稿未通过校验：${escapeHtml(failure?.error || "未知原因")}`}</p>
        <small>先到处置进度完成占用班组的签收、到场、反馈与归档，班组释放后再派发本事件。</small>
        <div class="copilot-actions"><a class="primary-action" href="#/incidents?view=progress"><i data-lucide="route"></i>查看处置进度</a><a class="secondary-action" href="#/incidents"><i data-lucide="radio-tower"></i>返回值班台</a></div>
      </section>`;
  }
  if (copilotState.phase === "advisory") {
    return `<section class="copilot-panel copilot-done"><h2><i data-lucide="badge-info"></i>咨询卡已生成</h2><p>本场景只提供证据与人工操作指引，不生成工单，也不控制现场设备。</p><div class="copilot-actions"><a class="secondary-action" href="#/incidents?view=progress"><i data-lucide="route"></i>查看其他事件流程</a></div></section>`;
  }
  if (copilotState.phase === "handoff") {
    const incident = incidentBackend.incidents.find((item) => item.id === run.incident_id);
    const state = incident ? incidentWorkflowState(incident) : { actor: "duty-demo", action: "进入处置进度", route: "#/incidents?view=progress" };
    return `<section class="copilot-panel copilot-done"><h2><i data-lucide="check-circle-2"></i>该信号已经完成核实</h2><p>处置事件 #${run.incident_id} 已建立。${state.actor === "brigade-demo" ? "本片区班组正在执行其他事件，请先完成该任务并释放班组。" : "下一步由值班员选择可用班组并派单。"}</p><div class="copilot-actions"><button type="button" class="primary-action" data-workflow-continue data-actor="${state.actor}" data-incident-id="${run.incident_id}" data-crew-id="${state.crewId || ""}" data-route="${state.route}"><i data-lucide="send"></i>${state.action}</button><a class="secondary-action" href="#/incidents?view=progress"><i data-lucide="route"></i>查看处置进度</a></div></section>`;
  }
  const verificationDraft = run.trace.find((entry) => entry.name === "create_verification_draft" && entry.ok);
  if (copilotState.phase === "verification" && verificationDraft) {
    return `
      <section class="copilot-panel copilot-approval">
        ${copilotState.judgeMode ? `<div class="judge-gate"><b>人工闸门 1/3</b><span>Agent 只生成核实草稿，火警结论由值班员确认。</span></div>` : ""}
        <h2><i data-lucide="stamp"></i>人工确认 · 报警核实</h2>
        <p>${escapeHtml(verificationDraft.data.note || "")}</p>
        <small>草稿状态：${escapeHtml(verificationDraft.data.status || "")}。Agent 只生成草稿，核实结果由消控室值班员登记。</small>
        <div class="copilot-actions">
          <button type="button" class="primary-action" data-copilot-verify="confirmed" ${copilotState.busy ? "disabled" : ""}><i data-lucide="check"></i>确认火警，建立处置事件</button>
          <button type="button" class="secondary-action" data-copilot-verify="dismissed" ${copilotState.busy ? "disabled" : ""}><i data-lucide="x"></i>确认误报，不建事件</button>
        </div>
      </section>
    `;
  }
  if (copilotState.phase === "dispatch") {
    const draft = run.trace.find((entry) => entry.name === "create_workorder_draft" && entry.ok);
    const recommend = run.trace.find((entry) => entry.name === "recommend_crew" && entry.ok);
    const briefs = run.trace.filter((entry) => entry.name === "build_role_brief" && entry.ok);
    const isRepairOrder = !run.incident_id;
    return `
      <section class="copilot-panel copilot-approval">
        ${copilotState.judgeMode ? `<div class="judge-gate"><b>人工闸门 2/3</b><span>确认后自动演示班组签收、出动、到场和反馈。</span></div>` : ""}
        <h2><i data-lucide="stamp"></i>人工确认 · ${isRepairOrder ? "维修工单派发" : "处置单派发"}</h2>
        <p>建议班组：<strong>${escapeHtml(draft?.data.crew_id || "未知")}</strong>${recommend ? `（当班可用：${recommend.data.recommended.map((crew) => escapeHtml(crew.id)).join("、")}）` : ""}</p>
        ${draft?.data.summary ? `<p class="copilot-workorder-summary">${escapeHtml(draft.data.summary)}</p>` : ""}
        <small>草稿不会自动生效。${isRepairOrder ? "维修工单经人工确认后派发，故障超过 24 小时未消除须上报消防安全责任人。" : "派发后写入事件时间线，任务终端实时接收。"}</small>
        <div class="copilot-actions">
          <button type="button" class="primary-action" data-copilot-action="dispatch" ${copilotState.busy ? "disabled" : ""}><i data-lucide="send"></i>派发工单（人工确认）</button>
        </div>
      </section>
      ${copilotBriefsTemplate(briefs)}
    `;
  }
  if (copilotState.phase === "crew_simulation") {
    const steps = ["班组已签收", "班组已出动", "班组已到场", "现场反馈已回传"];
    return `<section class="copilot-panel judge-simulation"><span>CREW SIMULATION</span><h2>正在模拟班组处置</h2><p>以下动作均为合成演示，不控制真实设备。</p><ol>${steps.map((step) => `<li class="${copilotState.judgeProgress.includes(step) ? "done" : "pending"}">${step}</li>`).join("")}</ol></section>`;
  }
  if (copilotState.phase === "done") {
    return `
      <section class="copilot-panel copilot-done">
        <h2><i data-lucide="check-circle-2"></i>工单已派发：${escapeHtml(copilotState.dispatch || "")}</h2>
        <p>值班员的工作到这里结束。下一步由处置/维保班组签收，状态会继续回传到处置进度。</p>
        <div class="copilot-actions">
          <button type="button" class="primary-action" data-workflow-continue data-actor="brigade-demo" data-incident-id="${run.incident_id || ""}" data-crew-id="${escapeHtml(copilotState.dispatch || "")}" data-route="#/station?crew_id=${encodeURIComponent(copilotState.dispatch || "")}"><i data-lucide="siren"></i>交接给班组并继续</button>
          <a class="secondary-action" href="#/incidents?view=progress"><i data-lucide="route"></i>查看完整流程</a>
        </div>
      </section>
    `;
  }
  if (copilotState.phase === "closed") {
    return `
      <section class="copilot-panel copilot-done">
        <h2><i data-lucide="check-circle-2"></i>已登记为误报</h2>
        <p>信号未转为处置事件，核实结果与操作时间已留痕；可按说明书误报处理流程安排探测器清洁保养。</p>
      </section>
    `;
  }
  return "";
}

window.addEventListener("hashchange", () => {
  renderRoute();
  if (!judgeTour.active && ["incidents", "station", "owner", "inspections", "copilot"].includes(document.body.dataset.route)) scheduleIncidentRefresh();
});
window.addEventListener("DOMContentLoaded", () => {
  runSelfCheck();
  bindHeaderActions();
  bindDialogs();
  bindJudgeTourControls();
  loadSemifinalSpatial();
  renderRoute();
});
