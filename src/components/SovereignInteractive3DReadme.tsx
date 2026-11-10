import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Copy,
  Check,
  Download,
  ExternalLink,
  Layers,
  Terminal,
  Compass,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export type SpatialLatticeMode =
  | 'HAPPY_513_BULK'
  | 'BINIUS_CIRCLE_STARK'
  | 'FIBONACCI_BRAID_ZTAU'
  | 'CODEVALAI_ORBITAL_LIBRARIES';

interface SovereignInteractive3DReadmeProps {
  readmeSource?: string;
  onSelectLibrary?: (libId: string) => void;
}

const MAXED_OUT_GITHUB_DESCRIPTION =
  'Sovereign Rubicon-Core v28.0-HYPER-OMEGA by CodeVal AI (Founded by Nicholas Brian): The World’s First Zero-Floating-Point, Post-Quantum, Holographic GitVM & 10,240-Bit Hyperdimensional Compute Monorepo. Unifies an 8-Stage Deterministic Closed-Loop State Machine, Binius GF(2^128) Wiedemann Binary-Tower Prover, Mersenne-31 Circle STARKs (p=2^31-1), Ring-SIS LatticeFold (Z_3329[X]/(X^256+1)), AdS/CFT HaPPY [[5, 1, 3]] Nilpotent Bijection, Non-Abelian Fibonacci Anyon Z[τ] Braiding, BitNet 1.58-Bit Ternary zkML, Bare-Metal Git Packfile v2/MIDX/BITM Binary Synthesis, Interactive 3D WebGL/Three.js Topological Hypergrid, and 8 Standalone @codevalai/* OG GitHub Libraries.';

const GLOBAL_HASHTAGS = [
  '#CodeValAI',
  '#NicholasBrian',
  '#SovereignRubiconCore',
  '#GitVM',
  '#PostQuantumCryptography',
  '#FIPS203',
  '#MLKEM',
  '#FIPS204',
  '#MLDSA65',
  '#Binius',
  '#BinaryTowerFields',
  '#CircleSTARK',
  '#Mersenne31',
  '#LatticeFold',
  '#RingSIS',
  '#HaPPYCode',
  '#AdSCFT',
  '#HolographicQEC',
  '#FibonacciAnyons',
  '#DehornoyBraid',
  '#HyperdimensionalComputing',
  '#BitNet158',
  '#TernaryALU',
  '#ZeroKnowledgeML',
  '#zkML',
  '#WebGPU',
  '#ThreeJS',
  '#Lean4',
  '#TLAPlus',
  '#DeepTechStartup',
];

const OFFICIAL_LINKS = [
  {
    label: 'Primary Monorepo (codevalai/sovereign-rubicon-core)',
    url: 'https://github.com/codevalai/sovereign-rubicon-core',
    tag: 'MONOREPO',
  },
  {
    label: 'CodeVal AI Organization (@codevalai)',
    url: 'https://github.com/codevalai',
    tag: 'STARTUP',
  },
  {
    label: 'Founder: Nicholas Brian (nicholasbrianbn@gmail.com)',
    url: 'mailto:nicholasbrianbn@gmail.com',
    tag: 'FOUNDER',
  },
  {
    label: 'Live Production Deployment (AIS Shared App)',
    url: 'https://ais-pre-fljtbvcnvzczh4h37ndb5s-97208276971.us-east1.run.app',
    tag: 'LIVE_APP',
  },
  {
    label: '@codevalai/libgit2-zero-pack',
    url: 'https://github.com/codevalai/libgit2-zero-pack',
    tag: 'OG_LIB_01',
  },
  {
    label: '@codevalai/binius-tower-128',
    url: 'https://github.com/codevalai/binius-tower-128',
    tag: 'OG_LIB_02',
  },
  {
    label: '@codevalai/circle-stark-m31',
    url: 'https://github.com/codevalai/circle-stark-m31',
    tag: 'OG_LIB_03',
  },
  {
    label: '@codevalai/latticefold-ringsis',
    url: 'https://github.com/codevalai/latticefold-ringsis',
    tag: 'OG_LIB_04',
  },
  {
    label: '@codevalai/happy-holographic-513',
    url: 'https://github.com/codevalai/happy-holographic-513',
    tag: 'OG_LIB_05',
  },
  {
    label: '@codevalai/fibonacci-braid-ztau',
    url: 'https://github.com/codevalai/fibonacci-braid-ztau',
    tag: 'OG_LIB_06',
  },
  {
    label: '@codevalai/hdc-bitnet-158',
    url: 'https://github.com/codevalai/hdc-bitnet-158',
    tag: 'OG_LIB_07',
  },
  {
    label: '@codevalai/frontier-omni-suite',
    url: 'https://github.com/codevalai/frontier-omni-suite',
    tag: 'OG_LIB_08',
  },
];

// Pre-allocated math helpers at module scope (zero GC in render loop)
const _dummyObj = new THREE.Object3D();
const _targetCamPos = new THREE.Vector3(0, 6.5, 14.5);

export const SovereignInteractive3DReadme: React.FC<SovereignInteractive3DReadmeProps> = ({
  readmeSource,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [spatialMode, setSpatialMode] = useState<SpatialLatticeMode>('HAPPY_513_BULK');
  const [explodedSeparation, setExplodedSeparation] = useState<number>(0.25);
  const [cameraPreset, setCameraPreset] = useState<'ORBIT' | 'TOP_POINCARE' | 'SIDE_HORIZON'>('ORBIT');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [copiedDesc, setCopiedDesc] = useState<boolean>(false);
  const [copiedReadme, setCopiedReadme] = useState<boolean>(false);
  const [fetchedReadme, setFetchedReadme] = useState<string>('');

  // Mutable ref bridge so React UI controls never recreate the WebGL context
  const stateRef = useRef({
    mode: 'HAPPY_513_BULK' as SpatialLatticeMode,
    targetExplode: 0.25,
    currentExplode: 0.25,
    cameraPreset: 'ORBIT' as 'ORBIT' | 'TOP_POINCARE' | 'SIDE_HORIZON',
    userInteracting: false,
  });

  useEffect(() => {
    stateRef.current.mode = spatialMode;
  }, [spatialMode]);

  useEffect(() => {
    stateRef.current.targetExplode = explodedSeparation;
  }, [explodedSeparation]);

  useEffect(() => {
    stateRef.current.cameraPreset = cameraPreset;
    stateRef.current.userInteracting = false;
  }, [cameraPreset]);

  useEffect(() => {
    if (!readmeSource) {
      fetch('/api/rubicon/inspect-file?path=README.md')
        .then((r) => r.json())
        .then((d) => {
          if (d?.sourceCode) setFetchedReadme(d.sourceCode);
        })
        .catch(() => {});
    }
  }, [readmeSource]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software-WebGL Guard per Three.js Skill Directive
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a12);
    scene.fog = new THREE.FogExp2(0x070a12, 0.028);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(0, 6.5, 14.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Studio Environment Map via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Balanced 3-Point Studio Rig + Warm/Cool Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(10, 16, 12);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -12;
      keyLight.shadow.camera.right = 12;
      keyLight.shadow.camera.top = 12;
      keyLight.shadow.camera.bottom = -12;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x10b981, 1.4);
    rimLight.position.set(-12, 8, -10);
    scene.add(rimLight);

    // Ground Reference Grid & Contact Shadow Plane (polygonOffset to prevent Z-fighting)
    const groundGeo = new THREE.CircleGeometry(14, 64);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0b1120,
      roughness: 0.85,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = -3.2;
    groundMesh.receiveShadow = !isSoftwareGl;
    scene.add(groundMesh);

    const polarGrid = new THREE.PolarGridHelper(13.5, 16, 8, 64, 0x1e293b, 0x0f172a);
    polarGrid.position.y = -3.18;
    scene.add(polarGrid);

    // =========================================================================
    // COMPOSITE MULTI-PART 3D GROUPS FOR THE 4 TOPOLOGICAL LATTICE MODES
    // =========================================================================

    // Shared PBR Materials with varied roughness (>= 0.25 delta) and metalness
    const matGoldCore = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      metalness: 0.92,
      roughness: 0.16,
      clearcoat: 0.8,
    });
    const matCyanMetal = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      metalness: 0.85,
      roughness: 0.22,
      clearcoat: 0.5,
    });
    const matEmeraldBulk = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.55,
      roughness: 0.48,
    });
    const matSlateFrame = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.75,
      roughness: 0.52,
    });
    const matCrystalShell = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      metalness: 0.1,
      roughness: 0.12,
      transmission: isSoftwareGl ? 0 : 0.88,
      transparent: true,
      opacity: isSoftwareGl ? 0.32 : 1.0,
      ior: 1.6,
      thickness: 1.2,
      depthWrite: false,
    });

    // MODE 1: HaPPY [[5, 1, 3]] Holographic Pentagon Tensor Network (21 Pentagons)
    const happyGroup = new THREE.Group();
    scene.add(happyGroup);

    // Central AdS Bulk Core (Composite 5-part assembly)
    const centralCoreGroup = new THREE.Group();
    const coreDodeca = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 0), matGoldCore);
    const coreShell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 1), matCrystalShell);
    coreShell.renderOrder = 2;
    const coreBezelRing = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.08, 16, 64), matCyanMetal);
    coreBezelRing.rotation.x = Math.PI / 2;
    centralCoreGroup.add(coreDodeca, coreShell, coreBezelRing);
    happyGroup.add(centralCoreGroup);

    // 5 Radial Layer-1 Pentagons + 15 UV Boundary Pentagons via InstancedMesh
    const pentagonPrismGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.28, 5);
    const radialPentagons = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5;
      const nodeGrp = new THREE.Group();
      const baseMesh = new THREE.Mesh(pentagonPrismGeo, matCyanMetal);
      const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.42, 5), matGoldCore);
      nodeGrp.add(baseMesh, capMesh);
      nodeGrp.userData = { baseRadius: 3.8, angle, layer: 1 };
      nodeGrp.position.set(Math.cos(angle) * 3.8, 0, Math.sin(angle) * 3.8);
      radialPentagons.add(nodeGrp);
    }
    happyGroup.add(radialPentagons);

    const uvInstancedMesh = new THREE.InstancedMesh(pentagonPrismGeo, matEmeraldBulk, 15);
    for (let i = 0; i < 15; i++) {
      const angle = (i * 2 * Math.PI) / 15;
      _dummyObj.position.set(Math.cos(angle) * 7.2, -0.4, Math.sin(angle) * 7.2);
      _dummyObj.rotation.set(0, -angle, 0);
      _dummyObj.scale.setScalar(0.85 + (i % 3) * 0.1);
      _dummyObj.updateMatrix();
      uvInstancedMesh.setMatrixAt(i, _dummyObj.matrix);
    }
    uvInstancedMesh.instanceMatrix.needsUpdate = true;
    uvInstancedMesh.computeBoundingSphere();
    happyGroup.add(uvInstancedMesh);

    // Ryu-Takayanagi Geodesic Wedge Struts
    const geodesicLinesMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
    const geodesicPts: THREE.Vector3[] = [];
    for (let i = 0; i < 5; i++) {
      const a1 = (i * 2 * Math.PI) / 5;
      const p1 = new THREE.Vector3(Math.cos(a1) * 3.8, 0, Math.sin(a1) * 3.8);
      geodesicPts.push(new THREE.Vector3(0, 0, 0), p1);
      for (let k = -1; k <= 1; k++) {
        const uvIdx = (i * 3 + k + 15) % 15;
        const a2 = (uvIdx * 2 * Math.PI) / 15;
        geodesicPts.push(p1, new THREE.Vector3(Math.cos(a2) * 7.2, -0.4, Math.sin(a2) * 7.2));
      }
    }
    const geodesicGeo = new THREE.BufferGeometry().setFromPoints(geodesicPts);
    const geodesicSegments = new THREE.LineSegments(geodesicGeo, geodesicLinesMat);
    happyGroup.add(geodesicSegments);

    // MODE 2: Binius GF(2^128) 7-Level Wiedemann Binary-Tower & Mersenne-31 Circle STARK Torus
    const biniusStarkGroup = new THREE.Group();
    biniusStarkGroup.visible = false;
    scene.add(biniusStarkGroup);

    const towerRingsGroup = new THREE.Group();
    for (let k = 0; k < 7; k++) {
      const r = 1.6 + k * 0.85;
      const ringGeo = new THREE.TorusGeometry(r, 0.09, 20, 96);
      const ringMat = k % 2 === 0 ? matCyanMetal : matGoldCore;
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.userData = { level: k };
      towerRingsGroup.add(ringMesh);
    }
    const m31TorusKnot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.1, 0.24, 128, 24, 2, 3),
      matEmeraldBulk
    );
    biniusStarkGroup.add(towerRingsGroup, m31TorusKnot);

    // MODE 3: Non-Abelian Fibonacci Anyon Z[τ] Braid Worldlines ([2, 2, 1, 2, 2])
    const braidGroup = new THREE.Group();
    braidGroup.visible = false;
    scene.add(braidGroup);

    const strandMaterials = [matGoldCore, matCyanMetal, matEmeraldBulk];
    for (let s = 0; s < 3; s++) {
      const curvePts: THREE.Vector3[] = [];
      const phase = (s * 2 * Math.PI) / 3;
      for (let step = 0; step <= 40; step++) {
        const t = (step / 40) * Math.PI * 4;
        const x = (step / 40 - 0.5) * 12;
        const y = Math.sin(t + phase) * 2.1;
        const z = Math.cos(t * 1.6180339887 + phase) * 2.1;
        curvePts.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(curvePts);
      const tubeGeo = new THREE.TubeGeometry(curve, 96, 0.22, 16, false);
      const strandMesh = new THREE.Mesh(tubeGeo, strandMaterials[s]);
      braidGroup.add(strandMesh);
    }

    // Golden-ratio Z[τ] fusion ring pedestals at braid ends
    const leftPedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.35, 32), matSlateFrame);
    leftPedestal.rotation.z = Math.PI / 2;
    leftPedestal.position.x = -6.2;
    const rightPedestal = leftPedestal.clone();
    rightPedestal.position.x = 6.2;
    braidGroup.add(leftPedestal, rightPedestal);

    // MODE 4: 8 @codevalai/* OG GitHub Libraries Symplectic Orbital Hypergrid
    const orbitalGroup = new THREE.Group();
    orbitalGroup.visible = false;
    scene.add(orbitalGroup);

    const gitPackCore = new THREE.Mesh(new THREE.OctahedronGeometry(1.45, 1), matGoldCore);
    const gitPackFrame = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.08, 16, 64), matCyanMetal);
    orbitalGroup.add(gitPackCore, gitPackFrame);

    const libraryNodesGroup = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const orbitRadius = 3.6 + (i % 3) * 1.65;
      const incl = ((i - 3.5) * 0.14);
      const nodeHub = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.48, 0.75), i % 2 === 0 ? matCyanMetal : matEmeraldBulk);
      const solarWing = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.06, 0.32), matGoldCore);
      nodeHub.add(body, solarWing);
      nodeHub.userData = { orbitRadius, incl, speed: 0.45 + i * 0.08, phase: (i * Math.PI) / 4 };
      libraryNodesGroup.add(nodeHub);

      const orbitRing = new THREE.Mesh(
        new THREE.TorusGeometry(orbitRadius, 0.025, 12, 96),
        matSlateFrame
      );
      orbitRing.rotation.x = Math.PI / 2 + incl;
      orbitalGroup.add(orbitRing);
    }
    orbitalGroup.add(libraryNodesGroup);

    // =========================================================================
    // ORBIT CONTROLS & SOFTWARE-WEBGL PACED ANIMATION LOOP
    // =========================================================================
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 32;
    controls.minDistance = 4;

    const onControlStart = () => {
      stateRef.current.userInteracting = true;
    };
    controls.addEventListener('start', onControlStart);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const st = stateRef.current;

      // Smooth exponential damping on Exploded View Separation
      st.currentExplode = THREE.MathUtils.damp(
        st.currentExplode,
        st.targetExplode,
        6.0,
        delta
      );

      // Toggle active 3D mode group visibility
      happyGroup.visible = st.mode === 'HAPPY_513_BULK';
      biniusStarkGroup.visible = st.mode === 'BINIUS_CIRCLE_STARK';
      braidGroup.visible = st.mode === 'FIBONACCI_BRAID_ZTAU';
      orbitalGroup.visible = st.mode === 'CODEVALAI_ORBITAL_LIBRARIES';

      // Animate active group with exploded-view offset
      const exp = st.currentExplode;

      if (happyGroup.visible) {
        centralCoreGroup.rotation.y = elapsed * 0.45;
        centralCoreGroup.position.y = exp * 1.6;
        radialPentagons.children.forEach((child, idx) => {
          const r = 3.8 + exp * 2.2;
          const a = (idx * 2 * Math.PI) / 5 + elapsed * 0.18;
          child.position.set(Math.cos(a) * r, exp * 0.5, Math.sin(a) * r);
          child.rotation.y = -a;
        });
        uvInstancedMesh.position.y = -exp * 1.1;
        uvInstancedMesh.rotation.y = -elapsed * 0.08;
      } else if (biniusStarkGroup.visible) {
        m31TorusKnot.rotation.x = elapsed * 0.5;
        m31TorusKnot.rotation.y = elapsed * 0.35;
        towerRingsGroup.children.forEach((ring, k) => {
          ring.rotation.x = elapsed * (0.2 + k * 0.05) + k * 0.4;
          ring.rotation.y = elapsed * (0.15 + k * 0.04);
          ring.position.y = (k - 3) * exp * 0.65;
        });
      } else if (braidGroup.visible) {
        braidGroup.rotation.x = elapsed * 0.32;
        braidGroup.children.forEach((c, idx) => {
          if (idx < 3) {
            c.position.y = (idx - 1) * exp * 1.25;
          }
        });
      } else if (orbitalGroup.visible) {
        gitPackCore.rotation.y = elapsed * 0.6;
        gitPackFrame.rotation.z = elapsed * 0.4;
        libraryNodesGroup.children.forEach((node) => {
          const { orbitRadius, incl, speed, phase } = node.userData;
          const r = orbitRadius + exp * 1.5;
          const theta = elapsed * speed + phase;
          node.position.set(
            Math.cos(theta) * r,
            Math.sin(theta) * Math.sin(incl) * r + (phase - 1.2) * exp * 0.4,
            Math.sin(theta) * Math.cos(incl) * r
          );
          node.rotation.y = -theta;
        });
      }

      // Smooth damped camera preset transitions when user is not manually dragging
      if (!st.userInteracting) {
        if (st.cameraPreset === 'TOP_POINCARE') {
          _targetCamPos.set(0, 17.5, 0.01);
        } else if (st.cameraPreset === 'SIDE_HORIZON') {
          _targetCamPos.set(16.0, 2.2, 0);
        } else {
          _targetCamPos.set(0, 6.5, 14.5);
        }
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 4.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 4.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 4.5, delta);
        camera.lookAt(0, 0, 0);
      }

      if (!isSoftwareGl) {
        controls.update();
      }
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', onControlStart);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const activeReadmeText = readmeSource || fetchedReadme;

  const handleCopyDescription = () => {
    navigator.clipboard.writeText(MAXED_OUT_GITHUB_DESCRIPTION);
    setCopiedDesc(true);
    setTimeout(() => setCopiedDesc(false), 2000);
  };

  const handleCopyReadme = () => {
    if (!activeReadmeText) return;
    navigator.clipboard.writeText(activeReadmeText);
    setCopiedReadme(true);
    setTimeout(() => setCopiedReadme(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* PART 1: INTERACTIVE 3D WEBGL / THREE.JS TOPOLOGICAL HYPERGRID VIEWPORT */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-500" />
              Interactive 3D Topological Lattice &amp; Spatial Hypergrid (Three.js PBR · ACES Filmic · 4 Modes)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Orbit, zoom, or use the collapsible bottom dock to switch between the 3D AdS/CFT HaPPY <code className="font-mono">[[5, 1, 3]]</code> Pentagon Bulk, Binius <code className="font-mono">GF(2^128)</code> Tower + Circle STARK Torus, Fibonacci Anyon <code className="font-mono">Z[τ]</code> Braid Worldlines, and the 8 <code className="font-mono">@codevalai/*</code> Orbital Libraries.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
            <span>Founder: Nicholas Brian</span>
            <span aria-hidden="true">·</span>
            <span>Startup: CodeVal AI (@codevalai)</span>
          </div>
        </div>

        {/* 3D Canvas Viewport + Unobstructed Collapsible Bottom Control Dock */}
        <div className="relative w-full h-[460px] bg-[#070a12] overflow-hidden">
          {/* Isolated WebGL Mount Container */}
          <div ref={canvasMountRef} className="w-full h-full" />

          {/* Minimal Top-Left Spec Overlay (No backdrop-filter over WebGL per Three.js skill) */}
          <div className="absolute top-3 left-4 pointer-events-none font-mono text-xs text-slate-200 bg-[#0b1120]/90 border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="text-cyan-400 font-bold">MODE:</span> {spatialMode} ·{' '}
            <span className="text-emerald-400">EXPLODE:</span> {(explodedSeparation * 100).toFixed(0)}% ·{' '}
            <span className="text-amber-400">CAMERA:</span> {cameraPreset}
          </div>

          {/* Unified Collapsible Bottom Control Dock (Centered at bottom, zero side-panel clutter) */}
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-3 z-10 w-[min(920px,94vw)] transition-transform duration-200"
            style={{
              transform: dockCollapsed
                ? 'translate(-50%, calc(100% - 32px))'
                : 'translate(-50%, 0)',
            }}
          >
            <div className="flex justify-center mb-1">
              <button
                onClick={() => setDockCollapsed(!dockCollapsed)}
                className="px-3 py-1 text-[11px] font-mono font-semibold text-slate-200 bg-[#0f172a] border border-slate-700 rounded-t-md hover:text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                {dockCollapsed ? (
                  <>
                    <Maximize2 className="w-3 h-3 text-cyan-400" />▴ Show 3D Controls Dock
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3 h-3 text-cyan-400" />▾ Hide 3D Controls (Cinema Mode)
                  </>
                )}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#0f172a] border border-slate-700 text-xs font-mono text-slate-200 flex flex-wrap items-center justify-between gap-3">
              {/* 4 Spatial Mode Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'HAPPY_513_BULK', label: '1. HaPPY [[5,1,3]] Bulk' },
                    { id: 'BINIUS_CIRCLE_STARK', label: '2. Binius + Circle STARK' },
                    { id: 'FIBONACCI_BRAID_ZTAU', label: '3. Fibonacci Z[τ] Braid' },
                    { id: 'CODEVALAI_ORBITAL_LIBRARIES', label: '4. 8 @codevalai/* Orbits' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSpatialMode(m.id)}
                    className={`px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      spatialMode === m.id
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                        : 'bg-[#1e293b] text-slate-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Exploded-View Tensor Separation Slider */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 whitespace-nowrap">Explode:</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={explodedSeparation}
                  onChange={(e) => setExplodedSeparation(parseFloat(e.target.value))}
                  className="w-24 accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Smooth Damped Camera Presets */}
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'ORBIT', label: 'Perspective' },
                    { id: 'TOP_POINCARE', label: 'Poincaré Disk' },
                    { id: 'SIDE_HORIZON', label: 'Event Horizon' },
                  ] as const
                ).map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => setCameraPreset(cam.id)}
                    className={`px-2.5 py-1 rounded border text-[11px] cursor-pointer whitespace-nowrap shrink-0 ${
                      cameraPreset === cam.id
                        ? 'border-emerald-400 text-emerald-300 bg-emerald-950/60 font-semibold'
                        : 'border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PART 2: FOUNDER, STARTUP, MAXED-OUT DESCRIPTION, LINKS & HASHTAGS MATRIX */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              Founder, Startup &amp; Maxed-Out GitHub Repository Identity (CodeVal AI · Nicholas Brian)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Official GitHub repository description, founder credentials, clickable ecosystem links, and 30-tag research indexing matrix.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono text-xs">
            <button
              onClick={handleCopyDescription}
              className="px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              {copiedDesc ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedDesc ? 'Copied Description' : 'Copy Maxed-Out Description'}
            </button>
            <button
              onClick={handleCopyReadme}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 dark:bg-emerald-400 text-white dark:text-slate-950 font-semibold hover:bg-emerald-500 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              {copiedReadme ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedReadme ? 'Copied Full README.md!' : 'Copy Full README.md'}
            </button>
          </div>
        </div>

        {/* Maxed-Out GitHub Repository About Description Box */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-900 dark:text-white">
              MAXED-OUT GITHUB REPOSITORY ABOUT DESCRIPTION (codevalai/sovereign-rubicon-core)
            </span>
            <span className="text-cyan-600 dark:text-cyan-400">
              Founder: Nicholas Brian · Startup: CodeVal AI
            </span>
          </div>
          <p className="text-xs font-mono text-slate-700 dark:text-slate-200 leading-relaxed select-all">
            {MAXED_OUT_GITHUB_DESCRIPTION}
          </p>
        </div>

        {/* Clickable Official Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
          {OFFICIAL_LINKS.map((lnk) => (
            <a
              key={lnk.label}
              href={lnk.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-colors flex items-center justify-between gap-2 group"
            >
              <div className="truncate">
                <div className="text-[10px] text-cyan-600 dark:text-cyan-400">{lnk.tag}</div>
                <div className="text-slate-800 dark:text-slate-200 font-semibold truncate group-hover:text-cyan-500">
                  {lnk.label}
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 shrink-0" />
            </a>
          ))}
        </div>

        {/* 30-Tag Indexing Hashtag Matrix (Unboxed clean metadata with middot separators per Zero-Pill rule) */}
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">
            GLOBAL INDEXING HASHTAGS &amp; RESEARCH TAXONOMY (30 TAGS)
          </div>
          <div className="text-xs font-mono text-cyan-700 dark:text-cyan-300 leading-relaxed select-all">
            {GLOBAL_HASHTAGS.join(' · ')}
          </div>
        </div>

        {/* Live Full README.md Markdown Source Preview */}
        {activeReadmeText && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                ROOT README.md (VERIFIED ON DISK · BUNDLED IN MONOREPO .ZIP)
              </span>
              <a
                href="/api/rubicon/export-zip"
                download="codevalai-sovereign-rubicon-core-v28.0.zip"
                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download Monorepo with README.md (.zip)
              </a>
            </div>
            <pre className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-800 dark:text-slate-200 overflow-auto max-h-[380px] leading-relaxed select-all">
              {activeReadmeText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
