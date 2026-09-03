import * as THREE from "three";
import { OrbitControls } from "three/addons/OrbitControls.js";
import { GLTFLoader } from "three/addons/GLTFLoader.js";

const enterprisePoints = [
  { node: "workshop_01", id: "ent-001", x: -8.36, z: -4.84 },
  { node: "workshop_02", id: "ent-002", x: 5.72, z: -5.28 },
  { node: "workshop_03", id: "ent-003", x: 13.64, z: 3.3 },
  { node: "workshop_04", id: "ent-004", x: -9.24, z: 6.16 },
  { node: "workshop_05", id: "ent-005", x: 2.2, z: 5.94 },
];
const workshopNodeToEnterprise = Object.fromEntries(enterprisePoints.map((point) => [point.node, point.id]));

const colors = { high: 0xf04444, medium: 0xf4a62a, low: 0x2bbd86, unrated: 0x6f8391 };
let disposeScene = () => {};
const workshopScenesPromise = fetch(new URL("./demo-data/semifinal/workshop_scenes.json", import.meta.url))
  .then((response) => response.json())
  .catch(() => null);

async function buildWorkshopScene(host) {
  disposeScene();
  host.setAttribute("data-3d-state", "loading");
  const payload = await workshopScenesPromise;
  if (!document.contains(host)) return;
  const data = payload?.scenes?.find((item) => item.building_id === host.dataset.buildingId);
  if (!data) return window.renderThreeDFallback?.(host);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch {
    window.renderThreeDFallback?.(host);
    return;
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07141c);
  scene.fog = new THREE.FogExp2(0x07141c, 0.025);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  camera.position.set(16, 10, 20);
  camera.lookAt(0, 0, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "twin-canvas";
  host.prepend(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xb9ddff, 0x10232e, 1.8));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-8, 16, 10);
  key.castShadow = true;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8db8d6, 0.55);
  fill.position.set(10, 8, -10);
  scene.add(fill);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 14),
    new THREE.MeshStandardMaterial({ color: 0x10242e, roughness: 0.94, metalness: 0.08 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(22, 44, 0x315263, 0x1a3440);
  grid.position.y = 0.01;
  scene.add(grid);

  const width = 18;
  const depth = Math.max(7, Math.min(11, width * data.dimensions.width / data.dimensions.length));
  const mapX = (value) => (value / 100 - 0.5) * width;
  const mapZ = (value) => (value / 100 - 0.5) * depth;
  const mapW = (value) => value / 100 * width;
  const mapD = (value) => value / 100 * depth;
  const interactives = [];
  const riskMeshes = [];
  const zonePalette = { fire_compartment: 0x255c75, explosion_proof_enclosure: 0x7a3550, thermal_insulation: 0x765e2a, heavy_foundation: 0x46535f, rack_integrated_structure: 0x355b4a };
  const equipmentPalette = [0x6db6d7, 0x9cb6c4, 0xf0b45b, 0x67c4a1, 0xc08acb];

  data.floors.forEach((floor, floorIndex) => {
    const elevation = floorIndex * 1.35;
    floor.structural_zones.forEach((zone) => {
      const zoneMesh = new THREE.Mesh(
        new THREE.BoxGeometry(mapW(zone.coords.w), 0.1, mapD(zone.coords.h)),
        new THREE.MeshStandardMaterial({ color: zonePalette[zone.kind] || 0x315263, transparent: true, opacity: 0.38, roughness: 0.8 }),
      );
      zoneMesh.position.set(mapX(zone.coords.x + zone.coords.w / 2), elevation + 0.05, mapZ(zone.coords.y + zone.coords.h / 2));
      scene.add(zoneMesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(zoneMesh.geometry), new THREE.LineBasicMaterial({ color: 0x6fb9d5, transparent: true, opacity: 0.7 }));
      edges.position.copy(zoneMesh.position);
      scene.add(edges);
    });
    floor.equipment.forEach((equipment, index) => {
      const height = 0.45 + (index % 3) * 0.16;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(0.45, mapW(equipment.footprint.w)), height, Math.max(0.35, mapD(equipment.footprint.h))),
        new THREE.MeshStandardMaterial({ color: equipmentPalette[index % equipmentPalette.length], roughness: 0.45, metalness: 0.42 }),
      );
      mesh.position.set(mapX(equipment.coords.x), elevation + height / 2 + 0.11, mapZ(equipment.coords.y));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { name: equipment.name, type: equipment.type, floor: floor.floor_id.toUpperCase() };
      scene.add(mesh);
      interactives.push(mesh);
    });
  });

  data.risk_points.forEach((risk, index) => {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.8, 16),
      new THREE.MeshBasicMaterial({ color: colors[risk.level] || colors.unrated, transparent: true, opacity: 0.9 }),
    );
    const floorIndex = Math.max(0, data.floors.findIndex((floor) => floor.floor_id === risk.floor_id));
    mesh.position.set(mapX(risk.coords.x), floorIndex * 1.35 + 0.65, mapZ(risk.coords.y));
    mesh.userData.phase = index * 0.7;
    scene.add(mesh);
    riskMeshes.push(mesh);
  });
  data.entrances.forEach((entrance) => {
    const source = payload?.node_index?.[entrance.node_id];
    if (!source?.coords) return;
    const gate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.18), new THREE.MeshBasicMaterial({ color: 0x52d49b }));
    gate.position.set(mapX(source.coords.x), 0.15, mapZ(source.coords.y));
    scene.add(gate);
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.6, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.48;

  controls.minDistance = 8;
  controls.maxDistance = 34;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const selectEquipment = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(interactives, false)[0]?.object;
    const detail = host.querySelector("#workshop-scene-detail");
    if (hit && detail) detail.innerHTML = `<strong>${hit.userData.name}</strong><span>${hit.userData.floor} · ${hit.userData.type}</span>`;
  };
  renderer.domElement.addEventListener("click", selectEquipment);
  const resize = () => {
    if (!host.clientWidth || !host.clientHeight) return;
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  controls.update();
  renderer.render(scene, camera);
  host.querySelector(".twin-loading")?.remove();
  host.dataset.sceneId = data.id;
  host.dataset.equipmentCount = String(interactives.length);
  host.setAttribute("data-3d-state", "ready");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  renderer.setAnimationLoop((time) => {
    if (!reduceMotion) riskMeshes.forEach((mesh) => { mesh.position.y += Math.sin(time * 0.003 + mesh.userData.phase) * 0.0008; });
    controls.update();
    renderer.render(scene, camera);
  });
  disposeScene = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    renderer.domElement.removeEventListener("click", selectEquipment);
    controls.dispose();
    renderer.dispose();
  };
}

function buildScene() {
  const workshopHost = document.querySelector("#workshop-3d");
  if (workshopHost) return buildWorkshopScene(workshopHost);
  disposeScene();
  const host = document.querySelector("#monitoring-3d");
  if (!host) return;
  host.setAttribute("data-3d-state", "loading");
  const commandTheme = host.dataset.sceneTheme === "command";

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch {
    window.renderThreeDFallback?.(host);
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(commandTheme ? 0x07141c : 0xf2f5f7);
  scene.fog = new THREE.FogExp2(commandTheme ? 0x07141c : 0xf2f5f7, commandTheme ? 0.01 : 0.006);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const resetView = () => {
    camera.position.set(29, 19, 36);
    camera.lookAt(0, 1, 0);
  };
  resetView();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = commandTheme ? 1.08 : 0.96;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "twin-canvas";
  host.prepend(renderer.domElement);

  scene.add(new THREE.HemisphereLight(commandTheme ? 0xb9ddff : 0xffffff, commandTheme ? 0x10232e : 0x8f9da6, commandTheme ? 1.7 : 1.45));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
  keyLight.position.set(8, 14, 9);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -24;
  keyLight.shadow.camera.right = 24;
  keyLight.shadow.camera.top = 24;
  keyLight.shadow.camera.bottom = -24;
  keyLight.shadow.camera.far = 80;
  keyLight.shadow.bias = -0.0004;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(commandTheme ? 0x78a9c8 : 0xa9c5d6, commandTheme ? 0.6 : 0.38);
  fillLight.position.set(-12, 10, -10);
  scene.add(fillLight);

  const interactive = [];
  const placeFallbackCampus = () => {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 27),
      new THREE.MeshStandardMaterial({ color: commandTheme ? 0x12242e : 0xe5eaee, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    enterprisePoints.forEach((point, index) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(index === 2 ? 6.2 : 9.5, index === 2 ? 4.2 : 2.6, index === 2 ? 5.2 : 5.6),
        new THREE.MeshStandardMaterial({ color: index % 2 ? 0x8fa0a8 : 0xb0bec5, roughness: 0.76, metalness: 0.12 }),
      );
      mesh.position.set(point.x, mesh.geometry.parameters.height / 2, point.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.enterpriseId = point.id;
      scene.add(mesh);
      interactive.push(mesh);
    });
  };

  // 完全匿名的 Blender 园区模型；只有 workshop_01..05 的建筑子网格参与射线拾取。
  const loader = new GLTFLoader();
  loader.load("./assets/campus/fireops-campus.glb?v=2", (gltf) => {
    const campus = gltf.scene;
    campus.scale.setScalar(0.22);
    campus.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.material?.isMeshStandardMaterial) {
        if (node.material.name === "glass") {
          node.material.transparent = true;
          node.material.opacity = 0.58;
          node.material.depthWrite = false;
          node.material.roughness = 0.18;
          node.material.metalness = 0.12;
          node.material.emissiveIntensity = 0.08;
        } else {
          node.material.roughness = Math.min(0.94, Math.max(0.3, node.material.roughness ?? 0.7));
        }
      }
      let ancestor = node.parent;
      while (ancestor && !workshopNodeToEnterprise[ancestor.name]) ancestor = ancestor.parent;
      if (!ancestor) return;
      node.userData.enterpriseId = workshopNodeToEnterprise[ancestor.name];
      interactive.push(node);
    });
    scene.add(campus);
    host.dataset.modelState = "loaded";
  }, undefined, () => {
    placeFallbackCampus();
    host.dataset.modelState = "fallback";
  });

  const selectedId = host.dataset.selectedCompany;
  const riskLevels = Object.fromEntries((host.dataset.riskLevels || "").split(",").filter(Boolean).map((item) => item.split(":")));
  enterprisePoints.forEach((point) => {
    const level = colors[riskLevels[point.id]] ? riskLevels[point.id] : "unrated";
    const color = colors[level];
    const selected = point.id === selectedId;
    const height = selected ? 0.55 : 0.35;
    const beacon = new THREE.Group();
    beacon.position.set(point.x, 0, point.z);

    // 隐形点击代理（透明但可被 raycast 命中）
    const proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1.2, 10),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true }),
    );
    proxy.position.y = 0.6;
    proxy.userData.enterpriseId = point.id;
    beacon.add(proxy);
    interactive.push(proxy);

    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(selected ? 0.13 : 0.09, selected ? 0.17 : 0.12, height, 20),
      new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.28, emissive: color, emissiveIntensity: selected ? 0.24 : 0.08 }),
    );
    marker.position.y = height / 2;
    marker.castShadow = true;
    beacon.add(marker);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(selected ? 0.55 : 0.34, selected ? 0.045 : 0.025, 8, 40),
      new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.22, emissive: color, emissiveIntensity: selected ? 0.28 : 0.1 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    beacon.add(ring);

    scene.add(beacon);
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.7, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 7;
  controls.maxDistance = 42;
  controls.maxPolarAngle = Math.PI * 0.48;

  const labels = enterprisePoints.map((point) => ({
    element: host.querySelector(`.management-workshop-label[data-company="${point.id}"]`),
    position: new THREE.Vector3(point.x, 4.2, point.z),
  })).filter((item) => item.element);
  const positionLabels = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    labels.forEach(({ element, position }) => {
      const projected = position.clone().project(camera);
      const visible = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.05 && Math.abs(projected.y) < 1.05;
      element.hidden = !visible;
      if (!visible) return;
      element.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
      element.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
    });
  };

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerStart = null;
  const selectAt = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(interactive, false)[0];
    if (hit) window.dispatchEvent(new CustomEvent("fireguard:enterprise-selected", { detail: { id: hit.object.userData.enterpriseId } }));
  };
  const pointerDown = (event) => { pointerStart = [event.clientX, event.clientY]; };
  const pointerUp = (event) => {
    if (pointerStart && Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) < 5) selectAt(event);
    pointerStart = null;
  };
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  renderer.domElement.addEventListener("pointerup", pointerUp);

  const resize = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    positionLabels();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  const viewHandlers = [...document.querySelectorAll("[data-3d-view]")].map((button) => {
    const handler = () => {
      if (button.getAttribute("data-3d-view") === "top") camera.position.set(0, 30, 0.01);
      else resetView();
      controls.target.set(0, 0.7, 0);
      controls.update();
    };
    button.addEventListener("click", handler);
    return [button, handler];
  });

  host.querySelector(".twin-loading")?.remove();
  host.dataset.buildingTypes = "campus-glb";
  host.dataset.buildingCount = "13";
  host.dataset.interactiveBuildingCount = String(enterprisePoints.length);
  host.dataset.contextBuildingCount = "8";
  host.dataset.hydrantCount = "7";
  host.dataset.vehicleCount = "3";
  host.dataset.beaconCount = String(enterprisePoints.length);
  renderer.render(scene, camera);
  host.setAttribute("data-3d-state", "ready");
  renderer.setAnimationLoop(() => {
    controls.update();
    positionLabels();
    renderer.render(scene, camera);
  });

  disposeScene = () => {
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener("pointerdown", pointerDown);
    renderer.domElement.removeEventListener("pointerup", pointerUp);
    viewHandlers.forEach(([button, handler]) => button.removeEventListener("click", handler));
    controls.dispose();
    renderer.dispose();
  };
}

console.assert(enterprisePoints.length === 5, "3D monitoring scene must include five demo enterprises");
window.addEventListener("fireguard:route-rendered", buildScene);
buildScene();
