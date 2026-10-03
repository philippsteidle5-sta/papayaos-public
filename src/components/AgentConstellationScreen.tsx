import React, { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import {
  Sparkles,
  Search,
  FileText,
  ArrowRight,
  Lock,
  Brain,
  Mic,
} from "lucide-react";
import { AgentConfig } from "../types";
import { UserRole, isAgentAllowed, getMinRequiredRoleForAgent } from "../rbac";
import { AgentCinematicShowcaseModal } from "./AgentCinematicShowcaseModal";
import { SyntaxSpatialGenesisAnimation } from "./SyntaxSpatialGenesisAnimation";
import { useTheme } from "../utils/themeStore";

interface AgentConstellationScreenProps {
  agents: AgentConfig[];
  currentAgentId: string;
  onSelectAgentAndStart: (agentId: string) => void;
  onCloseConstellation?: () => void;
  onOpenMultiAgentChat?: () => void;
  onOpenLandingPage?: () => void;
  onOpenMobileVoice?: () => void;
  userRole?: UserRole;
  onSelectRole?: (role: UserRole) => void;
  onOpenRoleManager?: () => void;
  onOpenTutorial?: () => void;
  onOpenAgentInspector?: (agentId?: string) => void;
}

interface ConstellationNode {
  id: string;
  name: string;
  sub: string;
  short: string;
  color: number;
  hexColor: string;
  x: number;
  y: number;
  z?: number;
  isCenter?: boolean;
  pos: THREE.Vector3;
}

const MODERN_NODE_LAYOUT: Record<string, { x: number; y: number; delay: number }> = {
  neo: { x: 18, y: 24, delay: 0 }, globe: { x: 50, y: 15, delay: 80 }, vega: { x: 82, y: 24, delay: 160 },
  oracle: { x: 12, y: 55, delay: 240 }, odin: { x: 88, y: 55, delay: 320 }, chronos: { x: 29, y: 83, delay: 400 }, pulse: { x: 71, y: 83, delay: 480 },
};

function ModernAgentWorkspace({ nodes, agents, currentAgent, onStart }: {
  nodes: ConstellationNode[];
  agents: AgentConfig[];
  currentAgent: AgentConfig;
  onStart: (agentId: string) => void;
}) {
  const agentFor = (node: ConstellationNode) => agents.find(agent => agent.id === (node.id === "maze" ? "syntax" : node.id));
  const satellites = nodes.filter(node => !node.isCenter);
  return (
    <main className="papaya-network-stage" aria-label="PapayaOS agent network">
      <div className="papaya-network-heading"><span>DEIN KI-TEAM</span><strong>Dein Team. Dein nächster Schritt.</strong><small>Wähle einen Core. Dein Workspace bleibt verbunden.</small></div>
      <svg className="papaya-network-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {satellites.map(node => {
            const p = MODERN_NODE_LAYOUT[node.id];
            if (!p) return null;
            const route = `M 50 51 Q ${(50 + p.x) / 2} ${(51 + p.y) / 2 - 3} ${p.x} ${p.y}`;
            return <g key={node.id} style={{ "--network-color": node.hexColor, "--line-delay": `${p.delay}ms` } as React.CSSProperties}>
              <path id={`papaya-route-${node.id}`} pathLength={1} d={route} />
              <circle cx={p.x} cy={p.y} r=".42" />
              <circle className="papaya-network-packet" r=".58">
                <animateMotion path={route} begin={`${720 + p.delay}ms`} dur="1.15s" fill="freeze" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.12;.78;1" begin={`${720 + p.delay}ms`} dur="1.15s" fill="freeze" />
              </circle>
            </g>;
          })}
      </svg>
      {satellites.map(node => {
        const p = MODERN_NODE_LAYOUT[node.id];
        const agent = agentFor(node);
        if (!p || !agent) return null;
        return <button key={node.id} className="papaya-network-agent" style={{ left: `${p.x}%`, top: `${p.y}%`, "--node-color": node.hexColor, "--node-delay": `${p.delay}ms`, "--from-x": `${(50 - p.x) * 7}px`, "--from-y": `${(51 - p.y) * 5}px` } as React.CSSProperties} onClick={() => onStart(agent.id)} aria-label={`Start ${agent.name}`}>
          <span className="papaya-network-agent-mark">{agent.railLetter || agent.short?.[0]}</span><span className="papaya-network-agent-copy"><strong>{node.name}</strong><small>{node.sub}</small></span><ArrowRight className="papaya-network-agent-arrow" size={14}/>
        </button>;
      })}
      <div className="papaya-network-hub" style={{ "--hub-color": currentAgent.color || "#ff7544" } as React.CSSProperties}>
        <span className="papaya-network-hub-eyebrow"><i/>PAPAYA OS <b/> CORE</span>
        <span className="papaya-network-hub-mark">P</span>
        <strong>{currentAgent.name}</strong>
        <small>{currentAgent.tag}</small>
        <button onClick={() => onStart(currentAgent.id)}>Workspace öffnen <ArrowRight size={14}/></button>
      </div>
      <div className="papaya-network-footnote"><span><i/>8 CORES BEREIT</span><span>EIN GEMEINSAMER WORKSPACE</span></div>
    </main>
  );
}

export const AgentConstellationScreen: React.FC<AgentConstellationScreenProps> = ({
  agents,
  currentAgentId,
  onSelectAgentAndStart,
  onCloseConstellation,
  userRole = "SOVEREIGN" as UserRole,
  onOpenRoleManager,
  onOpenTutorial,
  onOpenAgentInspector,
  onOpenMobileVoice,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const { isModern } = useTheme();
  const isModernRef = useRef(isModern);
  isModernRef.current = isModern;

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedAnimId, setSelectedAnimId] = useState<string | null>(null);
  const [showShowcaseModal, setShowShowcaseModal] = useState<boolean>(false);
  const [showGenesisAnimation, setShowGenesisAnimation] = useState<boolean>(false);

  // Direct DOM refs for 60fps label positioning without React re-render flooding
  const primaryLabelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Stable callback refs
  const onSelectAgentRef = useRef(onSelectAgentAndStart);
  onSelectAgentRef.current = onSelectAgentAndStart;
  const onOpenRoleManagerRef = useRef(onOpenRoleManager);
  onOpenRoleManagerRef.current = onOpenRoleManager;
  const onOpenAgentInspectorRef = useRef(onOpenAgentInspector);
  onOpenAgentInspectorRef.current = onOpenAgentInspector;


  // Sound generator helper for Sci-Fi HUD interactions
  const playHudSound = (freq = 440, type: OscillatorType = "sine", duration = 0.08) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio fallback
    }
  };

  // 1. Definition of Pure 8-Core Matrix (PAPAYA = Pure Luminous Warm Orange/Amber, VEGA = Pure Vivid Red)
  const CENTER_DEF: ConstellationNode = useMemo(
    () => ({
      id: "maze",
      name: "PAPAYA",
      sub: "SOVEREIGN CORE",
      short: "PAPAYA",
      color: 0xff6b35,
      hexColor: "#ff6b35",
      x: 0,
      y: 0,
      isCenter: true,
      pos: new THREE.Vector3(0, 0, 0),
    }),
    []
  );

  const SATELLITES_DEF: ConstellationNode[] = useMemo(
    () => [
      { id: "neo", name: "N.E.O.", sub: "VISION CORE", short: "NEO", color: 0xff2d95, hexColor: "#ff2d95", x: -6.4, y: 3.6, pos: new THREE.Vector3(-6.4, 3.6, 0.4) },
      { id: "globe", name: "G.L.O.B.E.", sub: "DEEP SEARCH", short: "GLOBE", color: 0x3b82f6, hexColor: "#3b82f6", x: 0.0, y: 4.8, pos: new THREE.Vector3(0.0, 4.8, -0.2) },
      { id: "vega", name: "V.E.G.A.", sub: "TACTICAL", short: "VEGA", color: 0xff2222, hexColor: "#ff2222", x: 6.4, y: 3.6, pos: new THREE.Vector3(6.4, 3.6, 0.3) },
      { id: "oracle", name: "O.R.A.C.L.E.", sub: "MARKET LATTICE", short: "ORACLE", color: 0x22c55e, hexColor: "#22c55e", x: -9.0, y: -0.2, pos: new THREE.Vector3(-9.0, -0.2, -0.1) },
      { id: "odin", name: "O.D.I.N.", sub: "EXECUTIVE", short: "ODIN", color: 0xe2f1ff, hexColor: "#e2f1ff", x: 9.0, y: -0.2, pos: new THREE.Vector3(9.0, -0.2, 0.2) },
      { id: "chronos", name: "C.H.R.O.N.O.S.", sub: "TEMPORAL", short: "CHRONOS", color: 0xeab308, hexColor: "#eab308", x: -5.8, y: -4.2, pos: new THREE.Vector3(-5.8, -4.2, 0.1) },
      { id: "pulse", name: "P.U.L.S.E.", sub: "VIRAL NETWORK", short: "PULSE", color: 0xa855f7, hexColor: "#a855f7", x: 5.8, y: -4.2, pos: new THREE.Vector3(5.8, -4.2, -0.3) },
    ],
    []
  );

  const allPrimaryNodes = useMemo(() => [CENTER_DEF, ...SATELLITES_DEF], [CENTER_DEF, SATELLITES_DEF]);

  // Main Three.js Engine Lifecycle
  useEffect(() => {
    if (isModern) return;
    const mount = canvasMountRef.current;
    if (!mount) return;

    let animFrameId: number;

    const W = () => mount.clientWidth || window.innerWidth;
    const H = () => mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = null; // Transparent to allow CSS canvas theme gradients

    const camera = new THREE.PerspectiveCamera(46, W() / H(), 0.1, 500);
    camera.position.set(0, 1.2, 33);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W(), H());
    mount.appendChild(renderer.domElement);

    // Helpers to create glowing radial gradient textures
    function makeGlowTexture(hexColor: number) {
      const size = 128;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      if (!ctx) return new THREE.CanvasTexture(c);
      const col = new THREE.Color(hexColor);
      const r = Math.floor(col.r * 255);
      const g = Math.floor(col.g * 255);
      const b = Math.floor(col.b * 255);
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, `rgba(${r},${g},${b},1.0)`);
      grad.addColorStop(0.25, `rgba(${r},${g},${b},0.65)`);
      grad.addColorStop(0.6, `rgba(${r},${g},${b},0.15)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(c);
    }

    function makeDotTexture(hexColor: number) {
      const size = 64;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      if (!ctx) return new THREE.CanvasTexture(c);
      const col = new THREE.Color(hexColor);
      const r = Math.floor(col.r * 255);
      const g = Math.floor(col.g * 255);
      const b = Math.floor(col.b * 255);
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.3, `rgba(${r},${g},${b},1)`);
      grad.addColorStop(0.7, `rgba(${r},${g},${b},0.2)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(c);
    }

    function makeCircularSpriteTexture(tint = "rgba(0, 240, 255, 0.7)") {
      const size = 64;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      if (!ctx) return undefined;
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
      grad.addColorStop(0.2, "rgba(255, 255, 255, 0.9)");
      grad.addColorStop(0.5, tint);
      grad.addColorStop(0.85, "rgba(0, 0, 0, 0.05)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    const cyanGlowTex = makeCircularSpriteTexture("rgba(0, 240, 255, 0.7)");
    const purpleGlowTex = makeCircularSpriteTexture("rgba(168, 85, 247, 0.7)");
    const whiteGlowTex = makeCircularSpriteTexture("rgba(230, 240, 255, 0.6)");

    // --- CYBERPUNK BACKGROUND ELEMENTS ---
    // 1. Cyberpunk Grid Texture
    function makeCyberGridTexture() {
      const size = 512;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      if (!ctx) return new THREE.CanvasTexture(c);
      ctx.strokeStyle = "rgba(0,240,255,0.28)";
      ctx.lineWidth = 1;
      const step = 32;
      for (let x = 0; x <= size; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
      }
      for (let y = 0; y <= size; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 6);
      return tex;
    }

    const cyberFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(130, 130),
      new THREE.MeshBasicMaterial({
        map: makeCyberGridTexture(),
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      })
    );
    cyberFloor.rotation.x = -Math.PI / 2.35;
    cyberFloor.position.y = -9.2;
    cyberFloor.position.z = -4;
    scene.add(cyberFloor);

    // 2. Cyberpunk Neon Embers Particle System (Multi-hued energetic sparks)
    const CYBER_DUST_COUNT = 700;
    const cyberDustGeo = new THREE.BufferGeometry();
    const cyberDustPos = new Float32Array(CYBER_DUST_COUNT * 3);
    const cyberDustCol = new Float32Array(CYBER_DUST_COUNT * 3);
    const cyberDustVel: { x: number; y: number; z: number; phase: number }[] = [];

    const cyberPalette = [
      new THREE.Color(0x00f0ff), // Cyan
      new THREE.Color(0xff2d95), // Magenta
      new THREE.Color(0x3b82f6), // Electric Blue
      new THREE.Color(0x22c55e), // Green
      new THREE.Color(0xeab308), // Gold
      new THREE.Color(0xa855f7), // Purple
      new THREE.Color(0xffffff), // Stardust
    ];

    for (let i = 0; i < CYBER_DUST_COUNT; i++) {
      cyberDustPos[i * 3] = (Math.random() - 0.5) * 58;
      cyberDustPos[i * 3 + 1] = (Math.random() - 0.5) * 38;
      cyberDustPos[i * 3 + 2] = (Math.random() - 0.5) * 42 - 5;
      const col = cyberPalette[i % cyberPalette.length];
      cyberDustCol[i * 3] = col.r;
      cyberDustCol[i * 3 + 1] = col.g;
      cyberDustCol[i * 3 + 2] = col.b;

      cyberDustVel.push({
        x: (Math.random() - 0.5) * 0.005,
        y: (Math.random() - 0.5) * 0.006 + 0.003,
        z: (Math.random() - 0.5) * 0.004,
        phase: Math.random() * Math.PI * 2,
      });
    }
    cyberDustGeo.setAttribute("position", new THREE.BufferAttribute(cyberDustPos, 3));
    cyberDustGeo.setAttribute("color", new THREE.BufferAttribute(cyberDustCol, 3));

    const cyberDustMat = new THREE.PointsMaterial({
      size: 0.16,
      map: cyanGlowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cyberDustPoints = new THREE.Points(cyberDustGeo, cyberDustMat);
    scene.add(cyberDustPoints);

    // 3. Cyberpunk Nebula Cosmic Atmospheric Sprites
    const cyberNebulaGroup = new THREE.Group();
    const cyberNebulaCyan = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(0x00f0ff),
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    cyberNebulaCyan.scale.set(42, 30, 1);
    cyberNebulaCyan.position.set(-8, 3, -12);
    cyberNebulaGroup.add(cyberNebulaCyan);

    const cyberNebulaMagenta = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(0xff2d95),
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    cyberNebulaMagenta.scale.set(38, 28, 1);
    cyberNebulaMagenta.position.set(9, -2, -14);
    cyberNebulaGroup.add(cyberNebulaMagenta);
    scene.add(cyberNebulaGroup);

    // --- MODERN BACKGROUND ELEMENTS ---
    // 1. Modern Concentric Studio Platform
    function makeModernPlatformTexture() {
      const size = 512;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      if (!ctx) return new THREE.CanvasTexture(c);

      const center = size / 2;
      ctx.clearRect(0, 0, size, size);

      // Concentric orbital rings
      const rings = [60, 120, 180, 230];
      rings.forEach((r, idx) => {
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.strokeStyle = idx === 1 ? "rgba(168, 85, 247, 0.4)" : "rgba(140, 150, 180, 0.18)";
        ctx.lineWidth = idx === 1 ? 1.5 : 1;
        if (idx % 2 === 0) {
          ctx.setLineDash([8, 8]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
      });

      // Axis cross markers
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = "rgba(168, 85, 247, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(center, 10);
      ctx.lineTo(center, size - 10);
      ctx.moveTo(10, center);
      ctx.lineTo(size - 10, center);
      ctx.stroke();

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    const modernFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.MeshBasicMaterial({
        map: makeModernPlatformTexture(),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      })
    );
    modernFloor.rotation.x = -Math.PI / 2.4;
    modernFloor.position.y = -8.5;
    modernFloor.position.z = -3;
    scene.add(modernFloor);

    // 2. Modern Studio Deep Purple Backdrop Ambient Halo
    const modernStudioAura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(0x7c3aed),
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    modernStudioAura.scale.set(48, 38, 1);
    modernStudioAura.position.set(0, 1, -12);
    scene.add(modernStudioAura);

    // 3. Modern Luxury Stardust (Sleek monochrome / lavender quartz particles)
    const MODERN_DUST_COUNT = 450;
    const modernDustGeo = new THREE.BufferGeometry();
    const modernDustPos = new Float32Array(MODERN_DUST_COUNT * 3);
    const modernDustVel: { x: number; y: number; z: number; phase: number }[] = [];

    for (let i = 0; i < MODERN_DUST_COUNT; i++) {
      modernDustPos[i * 3] = (Math.random() - 0.5) * 52;
      modernDustPos[i * 3 + 1] = (Math.random() - 0.5) * 34;
      modernDustPos[i * 3 + 2] = (Math.random() - 0.5) * 36 - 4;

      modernDustVel.push({
        x: (Math.random() - 0.5) * 0.002,
        y: (Math.random() - 0.5) * 0.003 + 0.0015,
        z: (Math.random() - 0.5) * 0.002,
        phase: Math.random() * Math.PI * 2,
      });
    }
    modernDustGeo.setAttribute("position", new THREE.BufferAttribute(modernDustPos, 3));
    const modernDustMat = new THREE.PointsMaterial({
      color: 0xc4b5fd,
      size: 0.09,
      map: whiteGlowTex,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const modernDustPoints = new THREE.Points(modernDustGeo, modernDustMat);
    scene.add(modernDustPoints);

    // 3. Build 8 Rich Multi-Layered Particle Orb Balls
    interface CoreBallInstance {
      node: ConstellationNode;
      group: THREE.Group;
      innerDenseBall: THREE.Points;
      outerAuraBall: THREE.Points;
      orbitalRings: THREE.Points[];
      energyGlow: THREE.Sprite;
      coronaGlow: THREE.Sprite;
      baseGlowScale: number;
      hover: number;
      targetHover: number;
      bootDelay: number;
      rotationSpeeds: { x: number; y: number; z: number };
    }

    const cores: CoreBallInstance[] = allPrimaryNodes.map((node, index) => {
      const scale = node.isCenter ? 2.1 : 1.15;
      const group = new THREE.Group();
      group.position.copy(node.pos);
      group.scale.setScalar(0.0001);
      scene.add(group);

      // A. Inner high-density particle orb sphere (Solid glowing core)
      const INNER_COUNT = node.isCenter ? 620 : 320;
      const innerGeo = new THREE.BufferGeometry();
      const innerPos = new Float32Array(INNER_COUNT * 3);
      for (let p = 0; p < INNER_COUNT; p++) {
        // Uniform sphere distribution with slight radial jitter
        const rr = (0.5 + (Math.random() - 0.5) * 0.12) * scale;
        const theta = Math.acos(2 * Math.random() - 1);
        const phi = Math.random() * Math.PI * 2;
        innerPos[p * 3] = rr * Math.sin(theta) * Math.cos(phi);
        innerPos[p * 3 + 1] = rr * Math.sin(theta) * Math.sin(phi);
        innerPos[p * 3 + 2] = rr * Math.cos(theta);
      }
      innerGeo.setAttribute("position", new THREE.BufferAttribute(innerPos, 3));
      const innerMat = new THREE.PointsMaterial({
        color: node.color,
        size: node.isCenter ? 0.065 : 0.05,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const innerDenseBall = new THREE.Points(innerGeo, innerMat);
      group.add(innerDenseBall);

      // B. Outer pulsating quantum aura shell
      const OUTER_COUNT = node.isCenter ? 360 : 180;
      const outerGeo = new THREE.BufferGeometry();
      const outerPos = new Float32Array(OUTER_COUNT * 3);
      for (let p = 0; p < OUTER_COUNT; p++) {
        const rr = (0.8 + (Math.random() - 0.5) * 0.18) * scale;
        const theta = Math.acos(2 * Math.random() - 1);
        const phi = Math.random() * Math.PI * 2;
        outerPos[p * 3] = rr * Math.sin(theta) * Math.cos(phi);
        outerPos[p * 3 + 1] = rr * Math.sin(theta) * Math.sin(phi);
        outerPos[p * 3 + 2] = rr * Math.cos(theta);
      }
      outerGeo.setAttribute("position", new THREE.BufferAttribute(outerPos, 3));
      const outerMat = new THREE.PointsMaterial({
        color: node.color,
        size: node.isCenter ? 0.045 : 0.038,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const outerAuraBall = new THREE.Points(outerGeo, outerMat);
      group.add(outerAuraBall);

      // C. Multi-axis glowing orbital particle rings
      const orbitalRings: THREE.Points[] = [];
      const ringConfigs = node.isCenter
        ? [
            { rx: 1.45 * scale, ry: 0.55 * scale, tiltX: 0.4, tiltZ: 0.2, speed: 0.012 },
            { rx: 1.25 * scale, ry: 0.95 * scale, tiltX: -0.5, tiltZ: -0.6, speed: -0.01 },
            { rx: 1.65 * scale, ry: 0.45 * scale, tiltX: 0.8, tiltZ: 0.9, speed: 0.016 },
          ]
        : [
            { rx: 1.25, ry: 0.45, tiltX: 0.4, tiltZ: (Math.random() - 0.5) * 0.8, speed: 0.014 },
            { rx: 1.1, ry: 0.85, tiltX: -0.6, tiltZ: (Math.random() - 0.5) * 0.6, speed: -0.011 },
          ];

      ringConfigs.forEach((rc) => {
        const PTS = 72;
        const rGeo = new THREE.BufferGeometry();
        const rPos = new Float32Array(PTS * 3);
        for (let p = 0; p < PTS; p++) {
          const a = (p / PTS) * Math.PI * 2;
          rPos[p * 3] = Math.cos(a) * rc.rx;
          rPos[p * 3 + 1] = Math.sin(a) * rc.ry;
          rPos[p * 3 + 2] = (Math.random() - 0.5) * 0.05;
        }
        rGeo.setAttribute("position", new THREE.BufferAttribute(rPos, 3));
        const rMat = new THREE.PointsMaterial({
          color: node.color,
          size: 0.038,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const ring = new THREE.Points(rGeo, rMat);
        ring.rotation.x = rc.tiltX;
        ring.rotation.z = rc.tiltZ;
        group.add(ring);
        orbitalRings.push(ring);
      });

      // D. Layer 1: Core Intense Radial Sprite Glow
      const energyGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: makeGlowTexture(node.color),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0,
        })
      );
      const glowScale = node.isCenter ? 4.8 : 2.7;
      energyGlow.scale.set(glowScale, glowScale, 1);
      group.add(energyGlow);

      // E. Layer 2: Wide Atmospheric Corona Glow
      const coronaGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: makeGlowTexture(node.color),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0,
        })
      );
      const coronaScale = glowScale * 1.8;
      coronaGlow.scale.set(coronaScale, coronaScale, 1);
      group.add(coronaGlow);

      return {
        node,
        group,
        innerDenseBall,
        outerAuraBall,
        orbitalRings,
        energyGlow,
        coronaGlow,
        baseGlowScale: glowScale,
        hover: 0,
        targetHover: 0,
        bootDelay: node.isCenter ? 0 : 0.12 + index * 0.08,
        rotationSpeeds: {
          x: (Math.random() - 0.5) * 0.006,
          y: (Math.random() * 0.008 + 0.006) * (node.isCenter ? 1.4 : 1.0),
          z: (Math.random() - 0.5) * 0.006,
        },
      };
    });

    // 4. Matrix Inter-Core Neural Beam Network
    const linkGroup = new THREE.Group();
    scene.add(linkGroup);
    interface LinkItem {
      line: THREE.Line;
      a: number;
      b: number;
      isSpoke: boolean;
      baseOpacity: number;
      delay: number;
    }
    const links: LinkItem[] = [];

    for (let i = 0; i < allPrimaryNodes.length; i++) {
      for (let j = i + 1; j < allPrimaryNodes.length; j++) {
        const a = allPrimaryNodes[i];
        const b = allPrimaryNodes[j];
        const isSpoke = a.isCenter || b.isCenter;
        const geo = new THREE.BufferGeometry().setFromPoints([a.pos, b.pos]);
        const spokeColor = a.isCenter ? b.color : a.color;
        const mat = new THREE.LineBasicMaterial({
          color: isSpoke ? spokeColor : 0x1a3348,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
        });
        const line = new THREE.Line(geo, mat);
        linkGroup.add(line);
        links.push({
          line,
          a: i,
          b: j,
          isSpoke,
          baseOpacity: isSpoke ? 0.65 : 0.15,
          delay: isSpoke ? 0.25 + Math.random() * 0.25 : 0.7 + Math.random() * 0.4,
        });
      }
    }

    // 5. Traveling Quantum Light Bullets along spoke vectors
    const spokes = links.filter((l) => l.isSpoke);
    const packets = spokes.map((l, idx) => {
      const destNode = allPrimaryNodes[l.a].isCenter ? allPrimaryNodes[l.b] : allPrimaryNodes[l.a];
      const mat = new THREE.SpriteMaterial({
        map: makeDotTexture(destNode.color),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.45, 0.45, 1);
      scene.add(sprite);
      return {
        sprite,
        link: l,
        dest: destNode,
        phase: idx * 0.3,
        speed: 0.4 + Math.random() * 0.2,
      };
    });

    // 6. Hit Meshes for accurate Raycasting (Generous hit radius for easy clicking)
    const hitMeshes = allPrimaryNodes.map((n) => {
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(n.isCenter ? 2.5 : 1.6, 12, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.copy(n.pos);
      scene.add(hit);
      return hit;
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredIndex = -1;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const hits = raycaster.intersectObjects(hitMeshes);
      const newHoveredIdx = hits.length ? hitMeshes.indexOf(hits[0].object as any) : -1;

      if (newHoveredIdx !== hoveredIndex) {
        hoveredIndex = newHoveredIdx;
        if (hoveredIndex !== -1) {
          const hovered = allPrimaryNodes[hoveredIndex];
          setHoveredNodeId(hovered.id);
          playHudSound(600, "sine", 0.04);
        } else {
          setHoveredNodeId(null);
        }
      }
    };

    const handleMouseLeave = () => {
      hoveredIndex = -1;
      setHoveredNodeId(null);
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const hits = raycaster.intersectObjects(hitMeshes);
      const clickedIdx = hits.length ? hitMeshes.indexOf(hits[0].object as any) : hoveredIndex;

      if (clickedIdx !== -1) {
        const targetNode = allPrimaryNodes[clickedIdx];
        setSelectedAnimId(targetNode.id);
        setHoveredNodeId(targetNode.id);
        playHudSound(880, "sawtooth", 0.15);
        if (onSelectAgentRef.current) {
          onSelectAgentRef.current(targetNode.id === "maze" ? "syntax" : targetNode.id);
        }
      }
    };

    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("mouseleave", handleMouseLeave);
    renderer.domElement.addEventListener("click", handleClick);

    // Animation Loop
    const startTime = performance.now();
    let t = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) * 0.001;
      t += 0.01;

      const modern = isModernRef.current;

      // Theme layer visibility
      cyberFloor.visible = !modern;
      cyberNebulaGroup.visible = !modern;
      cyberDustPoints.visible = !modern;

      modernFloor.visible = modern;
      modernStudioAura.visible = modern;
      modernDustPoints.visible = modern;

      scene.rotation.y = Math.sin(t * 0.05) * 0.04;
      if (!modern) {
        cyberFloor.rotation.z += 0.0006;
      } else {
        modernFloor.rotation.z += 0.0003;
      }

      // Animate particles
      if (!modern) {
        const cDustArr = cyberDustGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < CYBER_DUST_COUNT; i++) {
          const v = cyberDustVel[i];
          cDustArr[i * 3 + 1] += Math.sin(t + v.phase) * 0.004 + v.y;
          cDustArr[i * 3] += Math.cos(t * 0.5 + v.phase) * 0.003;
          if (cDustArr[i * 3 + 1] > 20) cDustArr[i * 3 + 1] = -20;
        }
        cyberDustGeo.attributes.position.needsUpdate = true;
      } else {
        const mDustArr = modernDustGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < MODERN_DUST_COUNT; i++) {
          const v = modernDustVel[i];
          mDustArr[i * 3 + 1] += Math.sin(t + v.phase) * 0.002 + v.y;
          mDustArr[i * 3] += Math.cos(t * 0.4 + v.phase) * 0.0015;
          if (mDustArr[i * 3 + 1] > 18) mDustArr[i * 3 + 1] = -18;
        }
        modernDustGeo.attributes.position.needsUpdate = true;
      }

      // Project Primary Core Coordinates directly to DOM elements & update balls
      cores.forEach((c, i) => {
        const bootT = Math.min(1, Math.max(0, (elapsed - c.bootDelay) / 0.6));
        const eased = 1 - Math.pow(1 - bootT, 3);

        c.targetHover = i === hoveredIndex ? 1 : 0;
        c.hover += (c.targetHover - c.hover) * 0.1;

        // Spherical rotation
        c.innerDenseBall.rotation.y += c.rotationSpeeds.y * (1 + c.hover * 2);
        c.innerDenseBall.rotation.x += c.rotationSpeeds.x;
        c.outerAuraBall.rotation.y -= c.rotationSpeeds.y * 0.7 * (1 + c.hover * 1.5);
        c.outerAuraBall.rotation.z += 0.004;

        // Orbital rings rotation
        c.orbitalRings.forEach((ring, ri) => {
          ring.rotation.y += (0.01 + ri * 0.006) * (1 + c.hover * 2.2);
          ring.rotation.x += 0.003 * (ri % 2 === 0 ? 1 : -1);
        });

        // Dynamic pulsing breathing energy
        const pulse = Math.sin(t * 1.8 + i * 1.2) * (c.node.isCenter ? 0.38 : 0.22);
        const curGlowScale = c.baseGlowScale + pulse + c.hover * (c.node.isCenter ? 1.4 : 0.9);
        c.energyGlow.scale.setScalar(curGlowScale);
        c.energyGlow.material.opacity = eased * (0.65 + c.hover * 0.35);

        c.coronaGlow.scale.setScalar(curGlowScale * 1.8 + Math.sin(t * 0.9 + i) * 0.3);
        c.coronaGlow.material.opacity = eased * (0.2 + c.hover * 0.25);

        c.group.scale.setScalar(eased * (1 + c.hover * 0.15));
        if (!c.node.isCenter) {
          c.group.position.z = c.node.pos.z + Math.sin(t * 0.6 + i * 1.5) * 0.25;
        }

        const yOff = c.node.isCenter ? 2.5 : 1.6;
        const lp = c.group.position.clone().add(new THREE.Vector3(0, -yOff, 0));
        lp.project(camera);
        const mountRect = mount.getBoundingClientRect();
        const scrX = mountRect.left + (lp.x * 0.5 + 0.5) * W();
        const scrY = mountRect.top + (-lp.y * 0.5 + 0.5) * H();
        const op = eased * (i === hoveredIndex ? 1 : 0.85);

        const el = primaryLabelRefs.current[c.node.id];
        if (el) {
          el.style.left = `${scrX}px`;
          el.style.top = `${scrY}px`;
          el.style.opacity = `${op}`;
        }
      });

      // Links update
      links.forEach((l) => {
        const bootT = Math.min(1, Math.max(0, (elapsed - l.delay) / 0.7));
        let target = l.baseOpacity * bootT;
        if (hoveredIndex !== -1 && (l.a === hoveredIndex || l.b === hoveredIndex)) {
          target = (l.isSpoke ? 0.95 : 0.55) * bootT;
        }
        const lineMat = l.line.material as THREE.LineBasicMaterial;
        lineMat.opacity += (target - lineMat.opacity) * 0.12;
      });

      // Animate data packets
      packets.forEach((p) => {
        const bootReady = elapsed > 1.2;
        const speedMult = hoveredIndex !== -1 && allPrimaryNodes.indexOf(p.dest) === hoveredIndex ? 2.4 : 1;
        const phase = (elapsed * p.speed * speedMult + p.phase) % 1;
        const from = allPrimaryNodes[0].pos;
        const to = p.dest.pos;
        p.sprite.position.lerpVectors(from, to, phase);
        const fade = Math.sin(phase * Math.PI);
        p.sprite.material.opacity = bootReady ? fade * 0.95 : 0;
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("mouseleave", handleMouseLeave);
      renderer.domElement.removeEventListener("click", handleClick);
      cancelAnimationFrame(animFrameId);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [allPrimaryNodes, isModern]);

  const activeNodeAgentId = hoveredNodeId === "maze" ? "syntax" : hoveredNodeId;
  const activeHoveredAgent = agents.find((a) => a.id === (activeNodeAgentId || currentAgentId)) || agents[0];

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 font-mono select-none overflow-hidden transition-colors duration-700 ${
        isModern
          ? "bg-[#090809] text-zinc-100"
          : "bg-black text-cyan-400"
      }`}
      style={{
        background: isModern
          ? "radial-gradient(ellipse at 54% 48%, #3b1d25 0%, #1f1019 42%, #090809 100%)"
          : undefined,
      }}
    >
      {/* 1. Cinematic Scanlines & Vignette Overlays (Cyberpunk Only) */}
      {!isModern && (
        <div
          className="fixed inset-0 pointer-events-none z-[4] mix-blend-screen opacity-35"
          style={{
            background:
              "repeating-linear-gradient(to bottom, rgba(0,240,255,0.035) 0px, rgba(0,240,255,0.035) 1px, transparent 1px, transparent 4px)",
          }}
        />
      )}
      <div
        className="fixed inset-0 pointer-events-none z-[4]"
        style={{
          background: isModern
            ? "radial-gradient(ellipse at center, transparent 48%, rgba(5,4,5,0.72) 100%)"
            : "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.95) 100%)",
        }}
      />

      {isModern && (
        <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-48 left-[12%] h-[34rem] w-[34rem] rounded-full bg-[#ff6b35]/[0.055] blur-[100px]" />
          <div className="absolute -bottom-64 right-[8%] h-[36rem] w-[36rem] rounded-full bg-[#ff3d8d]/[0.045] blur-[120px]" />
        </div>
      )}

      <button
        onClick={() => {
          playHudSound(950, "sawtooth", 0.2);
          setShowGenesisAnimation(true);
        }}
        className={`papaya-intro-button fixed right-5 top-5 z-20 flex items-center gap-2 rounded-full border px-4 py-2.5 font-mono text-[10px] font-bold tracking-[0.12em] backdrop-blur-xl transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${
          isModern
            ? "border-[#ff9b75]/35 bg-[#211517]/80 text-[#ffd1bd] shadow-[0_12px_40px_rgba(0,0,0,0.32),0_0_32px_rgba(255,117,68,0.1)] hover:border-[#ff9b75]/70 hover:bg-[#321c1b]/90 focus-visible:outline-[#ff9b75]"
            : "border-cyan-400/45 bg-slate-950/80 text-cyan-200 shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_24px_rgba(0,240,255,0.12)] hover:border-cyan-300 focus-visible:outline-cyan-300"
        }`}
        aria-label="1-Minuten-Einweisung starten"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>1-MIN EINWEISUNG</span>
      </button>

      {isModern && (
        <section className="fixed left-6 top-[48px] bottom-[112px] z-[6] hidden w-[min(330px,25vw)] flex-col pointer-events-auto lg:flex" aria-label="PapayaOS Agentenübersicht">
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-[#ff9b75]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff7544] shadow-[0_0_10px_#ff7544]" /> PAPAYAOS · YOUR AI TEAM
            </div>
            <h1 className="font-serif text-[clamp(38px,3.4vw,54px)] leading-[0.96] tracking-[-0.045em] text-white">
              Acht Cores.<br /><span className="bg-gradient-to-r from-[#ff7544] via-[#ff8a52] to-[#ff4389] bg-clip-text text-transparent">Ein System.</span>
            </h1>
            <p className="mt-4 max-w-[30ch] font-sans text-sm leading-6 text-zinc-300/75">Wähle den Spezialisten für deinen nächsten Schritt. Dein Kontext bleibt im gemeinsamen Workspace.</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-white/[0.09] bg-[#120e10]/55 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="px-3 pb-2 pt-2 text-[9px] font-bold tracking-[0.18em] text-zinc-500">DEINE SPEZIALISTEN <span className="ml-1 text-[#ff9b75]">08</span></div>
            <div className="space-y-0.5">
              {allPrimaryNodes.map((node) => {
                const agentId = node.id === "maze" ? "syntax" : node.id;
                const agent = agents.find((item) => item.id === agentId);
                const active = activeHoveredAgent.id === agentId;
                if (!agent) return null;
                return (
                  <button key={node.id} onMouseEnter={() => setHoveredNodeId(node.id)} onMouseLeave={() => setHoveredNodeId(null)} onClick={() => { setSelectedAnimId(node.id); setHoveredNodeId(node.id); playHudSound(720, "sine", 0.07); }} className={`group flex w-full items-center gap-2 rounded-[13px] border px-3 py-0.5 text-left transition-all ${active ? "border-white/[0.13] bg-white/[0.07]" : "border-transparent hover:border-white/[0.08] hover:bg-white/[0.045]"}`}>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border font-semibold" style={{ color: node.hexColor, borderColor: `${node.hexColor}55`, background: `${node.hexColor}12` }}>{agent.railLetter}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-sans text-[13px] font-semibold text-white">{node.isCenter ? "Papaya" : agent.name}</span><span className="mt-0.5 block truncate font-sans text-[10px] text-zinc-400">{node.sub}</span></span>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition ${active ? "scale-125" : "opacity-50"}`} style={{ background: node.hexColor, boxShadow: active ? `0 0 10px ${node.hexColor}` : undefined }} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/[0.09] bg-[#120e10]/70 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-2.5"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span><span className="font-sans text-[11px] text-zinc-300">Alle Cores bereit</span></div>
            <span className="font-sans text-[10px] text-zinc-500">8 / 8</span>
          </div>
        </section>
      )}

      {isModern ? (
        <ModernAgentWorkspace nodes={allPrimaryNodes} agents={agents} currentAgent={activeHoveredAgent} onStart={onSelectAgentAndStart} />
      ) : (
        <div ref={canvasMountRef} className="fixed inset-0 bottom-0 z-[1] cursor-crosshair" />
      )}

      {/* 4. Projected HTML Labels for Primary Cores */}
      {!isModern && allPrimaryNodes.map((node) => {
        const isHovered = hoveredNodeId === node.id;
        const isAllowed = isAgentAllowed(userRole, node.id);
        const reqRole = getMinRequiredRoleForAgent(node.id);

        return (
          <div
            key={node.id}
            ref={(el) => {
              primaryLabelRefs.current[node.id] = el;
            }}
            style={{
              left: "-9999px",
              top: "-9999px",
              opacity: 0,
              transform: "translate(-50%, -50%)",
              color: node.hexColor,
            }}
            onClick={() => {
              if (!isAllowed && onOpenRoleManagerRef.current) {
                onOpenRoleManagerRef.current();
              } else {
                setSelectedAnimId(node.id);
                playHudSound(880, "sawtooth", 0.15);
                setTimeout(() => onSelectAgentRef.current(node.id), 250);
              }
            }}
            className={`absolute z-10 text-center pointer-events-auto cursor-pointer transition-opacity duration-200 group ${
              isHovered ? "scale-105" : ""
            }`}
          >
            {/* HUD Corner Brackets */}
            <div
              className={`absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-3.5 transition-opacity duration-200 pointer-events-none ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
            >
              <span
                style={{ borderColor: node.hexColor }}
                className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2"
              />
              <span
                style={{ borderColor: node.hexColor }}
                className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2"
              />
            </div>

            <div
              className={`font-black tracking-[2.5px] uppercase transition-all duration-200 ${
                node.isCenter ? "text-sm sm:text-base tracking-[3.5px]" : "text-[11px] sm:text-xs"
              }`}
              style={{
                textShadow: isHovered
                  ? `0 0 16px ${node.hexColor}, 0 0 30px ${node.hexColor}`
                  : `0 0 8px ${node.hexColor}`,
              }}
            >
              {node.name}
            </div>

            <div className="text-[8px] tracking-[1.5px] text-white/60 mt-0.5 uppercase flex items-center justify-center gap-1">
              {!isAllowed && <Lock className="w-2.5 h-2.5 text-red-400 inline" />}
              <span>{isAllowed ? node.sub : `SPERRE (${reqRole})`}</span>
            </div>

            {/* Quick hover query inspector pill */}
            {isHovered && onOpenAgentInspectorRef.current && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenAgentInspectorRef.current) {
                    onOpenAgentInspectorRef.current(node.id);
                  }
                }}
                className={`mt-1 px-2 py-0.5 rounded-full font-mono text-[8px] font-bold tracking-wider uppercase transition flex items-center gap-1 mx-auto cursor-pointer ${
                  isModern
                    ? "bg-[#211211]/95 border border-[#ff7544]/60 text-[#ffd0bd] shadow-[0_0_10px_rgba(255,117,68,0.25)] hover:bg-[#a9412b] hover:text-white"
                    : "bg-cyan-950/95 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,240,255,0.5)] hover:bg-cyan-500 hover:text-slate-950"
                }`}
              >
                <Brain className={`w-2.5 h-2.5 ${isModern ? "text-[#ffad8d]" : "text-cyan-300"}`} />
                <span>MEMORY</span>
              </button>
            )}
          </div>
        );
      })}

      {/* 5. Bottom Active Core Detail Card */}
      {activeHoveredAgent && (
        <div
          className={`fixed bottom-4 right-4 sm:right-6 z-20 max-w-sm sm:max-w-md p-3.5 rounded-2xl backdrop-blur-xl border transition-all duration-300 shadow-2xl flex items-center justify-between gap-3 text-xs ${
            isModern
              ? "bg-[#151011]/90 border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.48)] text-zinc-200"
              : "bg-black/90 border-cyan-400/40 shadow-[0_0_35px_rgba(0,240,255,0.25)] text-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                borderColor: activeHoveredAgent.color,
                backgroundColor: `${activeHoveredAgent.color}20`,
                color: activeHoveredAgent.color,
              }}
                className="w-10 h-10 rounded-xl border flex items-center justify-center font-black text-lg shrink-0 shadow-[0_0_15px_rgba(255,117,68,0.22)]"
            >
              {activeHoveredAgent.railLetter}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  style={{ color: activeHoveredAgent.color }}
                  className="font-bold tracking-wider uppercase text-sm font-mono"
                >
                  {activeHoveredAgent.name}
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase ${
                  isModern ? "bg-white/[0.06] border-white/[0.12] text-zinc-300" : "bg-black/80 border-white/10 text-slate-300"
                }`}>
                  {activeHoveredAgent.short}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-1 font-sans mt-0.5">
                {activeHoveredAgent.tag}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenMobileVoice && (
              <button
                onClick={() => {
                  playHudSound(880, "triangle", 0.12);
                  onOpenMobileVoice();
                }}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#ff7544]/20 to-[#ff4389]/20 border border-[#ff7544]/50 hover:border-[#ff4389] text-[#ffd0bd] hover:text-white font-mono font-bold text-xs tracking-wider flex items-center gap-1.5 transition cursor-pointer hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,117,68,0.18)] shrink-0"
                title="Handy Sprach-Interface starten"
              >
                <Mic className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                <span>SPRACHE</span>
              </button>
            )}

            <button
              onClick={() => {
                setSelectedAnimId(activeHoveredAgent.id);
                playHudSound(880, "sawtooth", 0.15);
                setTimeout(() => onSelectAgentAndStart(activeHoveredAgent.id), 250);
              }}
              style={{
                background: isModern ? "linear-gradient(105deg, #ff7544, #ff4389)" : `${activeHoveredAgent.color}25`,
                borderColor: isModern ? "#ff7544" : activeHoveredAgent.color,
                color: "#ffffff",
              }}
              className="px-3.5 py-2 rounded-xl border font-bold text-xs tracking-wider flex items-center gap-1.5 transition cursor-pointer hover:scale-105 active:scale-95 shadow-md shrink-0"
            >
              <span>START</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Mobile Voice Quick Action (Prominent for thumb tapping on mobile screens) */}
      {onOpenMobileVoice && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto sm:hidden">
          <button
            onClick={() => {
              playHudSound(900, "sawtooth", 0.1);
              onOpenMobileVoice();
            }}
            className="px-4 py-2.5 rounded-full bg-gradient-to-r from-[#ff7544] to-[#ff4389] text-white font-mono text-xs font-black tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(255,117,68,0.3)] border border-white/30 active:scale-95 cursor-pointer animate-pulse"
          >
            <Mic className="w-4 h-4 text-white" />
            <span>🎤 HANDY SPRACH-INTERFACE</span>
          </button>
        </div>
      )}

      {/* 7. 3D Cinematic Showcase Modal */}
      <AgentCinematicShowcaseModal
        isOpen={showShowcaseModal}
        onClose={() => setShowShowcaseModal(false)}
        agents={agents}
        currentAgentId={activeHoveredAgent?.id || currentAgentId}
        onSelectAgentAndStart={(agentId) => {
          setShowShowcaseModal(false);
          onSelectAgentAndStart(agentId);
        }}
      />

      {/* 8. Spatial Genesis 1-Min Tutorial Animation */}
      <SyntaxSpatialGenesisAnimation
        isOpen={showGenesisAnimation}
        onComplete={() => {
          setShowGenesisAnimation(false);
          if (onOpenTutorial) onOpenTutorial();
        }}
        onSkip={() => {
          setShowGenesisAnimation(false);
        }}
      />
    </div>
  );
};

