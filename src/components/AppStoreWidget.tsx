import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  X,
  Puzzle,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  LayoutGrid,
  Calendar,
  MapPin,
  Target,
  Workflow,
  Globe,
  Terminal,
  Video,
  Mail,
  Share2,
  BarChart3,
  Cloud,
  Radar,
  Users,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Language } from "../utils/translations";
import { playSuccessFanfare, playValidationBeep } from "../utils/audioSynth";

export interface PluginItem {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  installed: boolean;
  modelInfo?: string;
  contextWindow?: string;
}

interface AppStoreWidgetProps {
  isEditMode?: boolean;
  onClose?: () => void;
  lang?: Language;
  installedPluginIds?: string[];
  onToggleInstall?: (pluginId: string) => void;
  onOpenPlugin?: (pluginId: string) => void;
}

// Our authentic, high-fidelity Google Gemini multi-color gradient star
const GeminiIconSvg: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: "drop-shadow(0 0 6px rgba(155, 114, 203, 0.45))" }}
  >
    <defs>
      <linearGradient
        id="user-gemini-gradient"
        x1="2"
        y1="22"
        x2="22"
        y2="2"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#4285f4" />
        <stop offset="30%" stopColor="#709af0" />
        <stop offset="55%" stopColor="#9b72cb" />
        <stop offset="80%" stopColor="#d96570" />
        <stop offset="100%" stopColor="#ff8a3d" />
      </linearGradient>
    </defs>
    <path
      d="M12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24Z"
      fill="url(#user-gemini-gradient)"
    />
  </svg>
);

export const AppStoreWidget: React.FC<AppStoreWidgetProps> = ({
  onClose,
  lang = "de",
  installedPluginIds = ["gemini"],
  onToggleInstall,
  onOpenPlugin,
}) => {
  const isEn = lang === "en";

  // Official curated catalog
  const basePlugins: PluginItem[] = useMemo(() => {
    return [
      {
        id: "papayaFlow",
        name: isEn ? "Agent Workflow Editor" : "Agenten-Workflow-Editor",
        category: isEn ? "Agents & workflows" : "Agenten & Abläufe",
        description: isEn
          ? "Build agent flows with draggable nodes and connections. Choose functions, inspect the planned order and save a separate graph for each agent."
          : "Baue Abläufe mit verschiebbaren Nodes und Verbindungen. Wähle Funktionen, prüfe die geplante Reihenfolge und speichere einen Graphen pro Agent.",
        version: isEn ? "v1.1 Preview" : "v1.1 Vorschau",
        installed: installedPluginIds.includes("papayaFlow"),
        modelInfo: "PapayaOS Native",
        contextWindow: isEn ? "Saved in this browser" : "In diesem Browser gespeichert",
      },
      {
        id: "gemini",
        name: "Google Gemini AI",
        category: "KI & Recherche",
        description: isEn
          ? "Multimodal intelligence with direct access to text, image and code processing."
          : "Multimodale Intelligenz mit direktem Zugriff auf Text, Bild und Code.",
        version: "v2.5 Flash",
        installed: installedPluginIds.includes("gemini"),
        modelInfo: "Google DeepMind Gemini 2.5 Flash",
        contextWindow: "1.048.576 Tokens",
      },
      {
        id: "layout",
        name: isEn ? "Papaya Layout Studio" : "Layout App",
        category: "System & Workspace",
        description: isEn
          ? "Spatial layout editor: configure workspace widgets, dock presence, 3D core shapes & themes."
          : "Spatial Layout Editor: Konfiguriere Workspace-Widgets, Dock-Präsenz, 3D-Core-Formen & Themes.",
        version: "v1.2 Native",
        installed: installedPluginIds.includes("layout"),
        modelInfo: "Spatial Engine Core",
        contextWindow: "Workspace Native",
      },
      {
        id: "calendar",
        name: isEn ? "Chronos Calendar & Time" : "Chronos Kalender",
        category: isEn ? "Productivity & Time" : "Produktivität & Zeit",
        description: isEn
          ? "Spatial calendar app: schedule events, track subscriptions, sync Google Calendar and focus timer in dock."
          : "Spatial Kalender: Termine planen, Subscriptions verwalten, Google Kalender synchronisieren & Fokus-Timer.",
        version: "v2.1 Pro",
        installed: installedPluginIds.includes("calendar"),
        modelInfo: "Chronos Temporal Engine",
        contextWindow: "Local & Cloud Sync",
      },
      {
        id: "maps",
        name: "Google Maps",
        category: isEn ? "Navigation & Places" : "Navigation & Orte",
        description: isEn
          ? "Interactive 3D maps, place search, real-time routing and satellite exploration in dock."
          : "Interaktive 3D-Karten, Ortssuche, Echtzeit-Routing und Satelliten-Ansicht direkt im Dock.",
        version: "v3.0 Live",
        installed: installedPluginIds.includes("maps") || installedPluginIds.includes("googleMaps"),
        modelInfo: "Google Maps Platform Live",
        contextWindow: "Global Geospatial",
      },
      {
        id: "goals",
        name: isEn ? "Papaya Goals" : "Papaya Goals",
        category: isEn ? "Productivity & Focus" : "Produktivität & Fokus",
        description: isEn
          ? "All-in-one goals & habit tracker: 4-period rings, streak radar, 26-week heatmap, badges & XP leveling."
          : "Ziele- & Gewohnheiten-Tracker: 4-Zeitraum-Ringe, Streak-Radar, 26-Wochen-Heatmap, Abzeichen & XP-Level-System.",
        version: "v1.0 Pro",
        installed: installedPluginIds.includes("goals"),
        modelInfo: "PapayaOS Habit Engine",
        contextWindow: "Complete Goal Sync",
      },
      {
        id: "webBrowser",
        name: isEn ? "Quantum Web Browser" : "Quantum Webbrowser",
        category: isEn ? "Research & browsing" : "Recherche & Browser",
        description: isEn
          ? "Open the built-in browser, inspect pages and use the existing page-analysis tools."
          : "Öffnet den integrierten Browser für Recherche, Seitenansicht und die vorhandenen Analysefunktionen.",
        version: isEn ? "Native" : "Nativ",
        installed: installedPluginIds.includes("webBrowser"),
        modelInfo: "PapayaOS Browser",
        contextWindow: isEn ? "Workspace tool" : "Workspace-Funktion",
      },
      {
        id: "claudeCode",
        name: isEn ? "Claude Code Terminal" : "Claude-Code-Terminal",
        category: isEn ? "Development" : "Entwicklung",
        description: isEn
          ? "Launch the integrated code and terminal workspace."
          : "Öffnet den integrierten Code- und Terminal-Arbeitsbereich.",
        version: isEn ? "Native" : "Nativ",
        installed: installedPluginIds.includes("claudeCode"),
        modelInfo: "PapayaOS Development Tools",
        contextWindow: isEn ? "Workspace tool" : "Workspace-Funktion",
      },
      {
        id: "jarvisTerminal",
        name: isEn ? "Jarvis Terminal Console" : "Jarvis-Terminal-Konsole",
        category: isEn ? "System & diagnostics" : "System & Diagnose",
        description: isEn
          ? "Open the existing system terminal and diagnostics console."
          : "Öffnet die vorhandene System-Terminal- und Diagnosekonsole.",
        version: isEn ? "Native" : "Nativ",
        installed: installedPluginIds.includes("jarvisTerminal"),
        modelInfo: "PapayaOS System Tools",
        contextWindow: isEn ? "Workspace tool" : "Workspace-Funktion",
      },
      {
        id: "gmailInbox",
        name: isEn ? "Gmail Inbox & AI Mail" : "Gmail-Posteingang & KI-Mail",
        category: isEn ? "Communication" : "Kommunikation",
        description: isEn
          ? "Open the Gmail workspace already included in PapayaOS. Account connection may be required."
          : "Öffnet den vorhandenen Gmail-Arbeitsbereich. Eine Kontoverknüpfung kann erforderlich sein.",
        version: isEn ? "Native" : "Nativ",
        installed: installedPluginIds.includes("gmailInbox"),
        modelInfo: "Gmail Workspace",
        contextWindow: isEn ? "Account connection required" : "Kontoverknüpfung erforderlich",
      },
      {
        id: "socialUpload",
        name: isEn ? "Social Media Studio" : "Social-Media-Studio",
        category: isEn ? "Content & publishing" : "Inhalte & Veröffentlichung",
        description: isEn
          ? "Open the built-in social publishing workspace for its currently supported platforms."
          : "Öffnet den integrierten Social-Publishing-Arbeitsbereich für die aktuell unterstützten Plattformen.",
        version: isEn ? "Native" : "Nativ",
        installed: installedPluginIds.includes("socialUpload"),
        modelInfo: "PapayaOS Social Studio",
        contextWindow: isEn ? "Platform support varies" : "Plattform-Unterstützung variiert",
      },
      {
        id: "miniTrades",
        name: isEn ? "Mini Quant Market Radar" : "Mini-Quant-Markt-Radar",
        category: isEn ? "Markets" : "Märkte",
        description: isEn
          ? "Open the existing market overview. This does not place trades automatically."
          : "Öffnet die vorhandene Marktübersicht. Das Plugin führt keine Trades automatisch aus.",
        version: isEn ? "Native" : "Nativ",
        installed: installedPluginIds.includes("miniTrades"),
        modelInfo: "PapayaOS Market Tools",
        contextWindow: isEn ? "Market data availability varies" : "Marktdaten-Verfügbarkeit variiert",
      },
      {
        id: "veoStudio",
        name: isEn ? "Google Veo Video Studio" : "Google Veo Video-Studio",
        category: isEn ? "Creation & media" : "Kreation & Medien",
        description: isEn
          ? "Open the integrated video studio. Generation depends on configured provider access."
          : "Öffnet das integrierte Video-Studio. Generierung setzt einen konfigurierten Anbieterzugang voraus.",
        version: isEn ? "Native" : "Nativ",
        installed: installedPluginIds.includes("veoStudio"),
        modelInfo: "Veo Studio UI",
        contextWindow: isEn ? "Provider access may be required" : "Anbieterzugang kann erforderlich sein",
      },
      {
        id: "weatherWidget",
        name: isEn ? "Location Weather Radar" : "Standort-Wetterradar",
        category: isEn ? "Daily tools" : "Alltagsfunktionen",
        description: isEn
          ? "Show the existing local weather widget in the workspace."
          : "Zeigt das vorhandene lokale Wetter-Widget im Workspace an.",
        version: isEn ? "Native" : "Nativ",
        installed: installedPluginIds.includes("weatherWidget"),
        modelInfo: "PapayaOS Weather Widget",
        contextWindow: isEn ? "Weather provider dependent" : "Wetteranbieter abhängig",
      },
      {
        id: "osirisIntel",
        name: isEn ? "OSIRIS Intelligence Radar" : "OSIRIS-Intelligence-Radar",
        category: isEn ? "Research & security" : "Recherche & Sicherheit",
        description: isEn
          ? "Open the existing OSIRIS intelligence workspace and its radar view."
          : "Öffnet den vorhandenen OSIRIS-Intelligence-Arbeitsbereich mit Radar-Ansicht.",
        version: isEn ? "Native" : "Nativ",
        installed: installedPluginIds.includes("osirisIntel"),
        modelInfo: "OSIRIS Workspace",
        contextWindow: isEn ? "Workspace tool" : "Workspace-Funktion",
      },
      {
        id: "cctvSurveillance",
        name: isEn ? "OSIRIS Camera Monitor" : "OSIRIS-Kameramonitor",
        category: isEn ? "Research & security" : "Recherche & Sicherheit",
        description: isEn
          ? "Open the CCTV view in the existing OSIRIS workspace."
          : "Öffnet die Kamera-Ansicht im vorhandenen OSIRIS-Arbeitsbereich.",
        version: isEn ? "Native" : "Nativ",
        installed: installedPluginIds.includes("cctvSurveillance"),
        modelInfo: "OSIRIS Workspace",
        contextWindow: isEn ? "Workspace tool" : "Workspace-Funktion",
      },
      {
        id: "agentFunctions",
        name: isEn ? "Agent Function Assignment" : "Agenten-Funktionszuweisung",
        category: isEn ? "Agents & workflows" : "Agenten & Abläufe",
        description: isEn
          ? "Choose which installed apps and functions each agent can use. Assignments stay separate per agent."
          : "Lege fest, welche installierten Apps und Funktionen jeder Agent nutzen darf. Zuweisungen bleiben pro Agent getrennt.",
        version: isEn ? "Native" : "Nativ",
        installed: installedPluginIds.includes("agentFunctions"),
        modelInfo: "PapayaOS Agent Matrix",
        contextWindow: isEn ? "Per-agent settings" : "Agenten-spezifische Einstellungen",
      },
    ];
  }, [isEn, installedPluginIds]);

  const renderPluginIcon = (pluginId: string, size: "small" | "large" = "small") => {
    const className = size === "large" ? "w-6 h-6" : "w-5 h-5";
    switch (pluginId) {
      case "papayaFlow": return <Workflow className={`${className} text-orange-300`} />;
      case "gemini": return <GeminiIconSvg size={size === "large" ? 28 : 22} />;
      case "calendar": return <Calendar className={`${className} text-purple-400`} />;
      case "maps": return <MapPin className={`${className} text-emerald-400`} />;
      case "goals": return <Target className={`${className} text-[#ff7a59]`} />;
      case "webBrowser": return <Globe className={`${className} text-cyan-300`} />;
      case "claudeCode": return <Terminal className={`${className} text-violet-300`} />;
      case "jarvisTerminal": return <Terminal className={`${className} text-amber-300`} />;
      case "gmailInbox": return <Mail className={`${className} text-red-300`} />;
      case "socialUpload": return <Share2 className={`${className} text-pink-300`} />;
      case "miniTrades": return <BarChart3 className={`${className} text-emerald-300`} />;
      case "veoStudio": return <Video className={`${className} text-fuchsia-300`} />;
      case "weatherWidget": return <Cloud className={`${className} text-sky-300`} />;
      case "osirisIntel": return <Radar className={`${className} text-cyan-300`} />;
      case "cctvSurveillance": return <Radar className={`${className} text-rose-300`} />;
      case "agentFunctions": return <Users className={`${className} text-orange-300`} />;
      default: return <LayoutGrid className={`${className} text-[#ff8a3d]`} />;
    }
  };

  const [plugins, setPlugins] = useState<PluginItem[]>(basePlugins);

  // Sync with basePlugins when installedPluginIds prop updates
  React.useEffect(() => {
    setPlugins(basePlugins);
  }, [basePlugins]);

  const [selectedCategory, setSelectedCategory] = useState<string>("Alle");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showNote, setShowNote] = useState<boolean>(true);
  const [activePluginModal, setActivePluginModal] = useState<PluginItem | null>(null);

  const categories = useMemo(() => {
    return ["Alle", ...Array.from(new Set(plugins.map((p) => p.category)))];
  }, [plugins]);

  const filteredPlugins = useMemo(() => {
    return plugins.filter((p) => {
      const matchesCat =
        selectedCategory === "Alle" || p.category === selectedCategory;
      const matchesQuery =
        searchQuery.trim() === "" ||
        (p.name + p.description + p.category)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [plugins, selectedCategory, searchQuery]);

  const installedCount = plugins.filter((p) => p.installed).length;

  // Installing state per plugin: { [pluginId]: number 0-100 }
  const [installingProgress, setInstallingProgress] = useState<{ [id: string]: number }>({});
  const [justInstalledId, setJustInstalledId] = useState<string | null>(null);
  const activeIntervalsRef = useRef<{ [id: string]: ReturnType<typeof setInterval> }>({});

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.keys(activeIntervalsRef.current).forEach((key) => {
        const id = activeIntervalsRef.current[key];
        if (id) clearInterval(id as any);
      });
    };
  }, []);

  const triggerCelebrationConfetti = () => {
    try {
      playSuccessFanfare();
      // First burst - center
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ff8a3d", "#5fd68a", "#4285f4", "#9b72cb", "#ffffff", "#ffd700"],
        zIndex: 99999,
      });

      // Secondary bursts for rich effect
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0.2, y: 0.65 },
          colors: ["#ff8a3d", "#ffb366", "#5fd68a"],
          zIndex: 99999,
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 0.8, y: 0.65 },
          colors: ["#9b72cb", "#4285f4", "#ffd700"],
          zIndex: 99999,
        });
      }, 150);
    } catch (e) {
      console.warn("Confetti animation error:", e);
    }
  };

  const handleInstallClick = (pluginId: string) => {
    if (installingProgress[pluginId] !== undefined) return; // already in progress

    // Start progress animation 0% -> 100%
    playValidationBeep();
    setInstallingProgress((prev) => ({ ...prev, [pluginId]: 0 }));

    const duration = 1800; // 1.8 seconds total
    const intervalTime = 30; // 60 updates
    const totalSteps = duration / intervalTime;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      // Easing calculation so it starts fast, slows near 75-90% like real unpacking, then hits 100%
      const rawPercent = Math.min(100, Math.round((currentStep / totalSteps) * 100));
      
      setInstallingProgress((prev) => ({ ...prev, [pluginId]: rawPercent }));

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        delete activeIntervalsRef.current[pluginId];

        // Finalize installation
        try {
          if (onToggleInstall) {
            onToggleInstall(pluginId);
          }
          setPlugins((prev) =>
            prev.map((x) => (x.id === pluginId ? { ...x, installed: true } : x))
          );
          setActivePluginModal((curr) =>
            curr && curr.id === pluginId ? { ...curr, installed: true } : curr
          );
        } catch (err) {
          console.error("Error finalizing plugin installation:", err);
        }

        // Trigger confetti & victory sound
        triggerCelebrationConfetti();
        setJustInstalledId(pluginId);

        // Clear in-progress state and highlight
        setTimeout(() => {
          setInstallingProgress((prev) => {
            const next = { ...prev };
            delete next[pluginId];
            return next;
          });
        }, 600);

        setTimeout(() => {
          setJustInstalledId((curr) => (curr === pluginId ? null : curr));
        }, 3500);
      }
    }, intervalTime);

    activeIntervalsRef.current[pluginId] = interval;
  };

  const handleUninstallClick = (pluginId: string) => {
    try {
      if (onToggleInstall) {
        onToggleInstall(pluginId);
      }
      setPlugins((prev) =>
        prev.map((x) => (x.id === pluginId ? { ...x, installed: false } : x))
      );
      setJustInstalledId(null);
    } catch (err) {
      console.error("Error uninstalling plugin:", err);
    }
  };

  const handleOpenPluginClick = (plugin: PluginItem) => {
    if (onOpenPlugin) {
      onOpenPlugin(plugin.id);
    } else {
      setActivePluginModal(plugin);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Papaya Plugin Store"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
      style={{
        fontFamily:
          '"Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      {/* Exact Window Container matching User Design */}
      <div
        className="w-full max-w-[840px] max-h-[92vh] flex flex-col rounded-[18px] overflow-hidden border border-[#2a262e] bg-[#131115] text-[#f4f0ea] shadow-[0_30px_80px_rgba(0,0,0,0.65)] relative"
        style={{
          boxShadow: "0 30px 80px rgba(0,0,0,0.65), 0 0 40px rgba(255,138,61,0.06)",
        }}
      >
        {/* HEADER BAR */}
        <header className="flex items-center gap-3.5 px-5 py-4 border-b border-[#2a262e] flex-shrink-0 bg-[#131115]">
          {/* Logo */}
          <div className="w-[38px] h-[38px] rounded-[11px] bg-[#ff8a3d]/[0.14] text-[#ff8a3d] flex items-center justify-center flex-none">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a4 4 0 0 1 4 4v1h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v3a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4v-3H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4z" />
            </svg>
          </div>

          <div>
            <h1 className="text-[17px] font-bold m-0 leading-tight tracking-[-0.01em] text-[#f4f0ea]">
              {isEn ? "Papaya Plugin Store" : "Papaya Plugin Store"}
            </h1>
            <p className="m-0 mt-0.5 text-[13px] text-[#8e8894] leading-tight">
              {isEn ? "Official Catalog" : "Offizieller Katalog"}
            </p>
          </div>

          {/* Right actions: View Switcher & Close button */}
          <div className="ml-auto flex items-center gap-2.5">
            <div
              className="flex bg-[#0a090c] border border-[#2a262e] rounded-[10px] p-[3px]"
              role="group"
              aria-label={isEn ? "View mode" : "Ansicht"}
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
                className={`border-0 font-inherit text-[13px] px-3 py-1 rounded-[7px] cursor-pointer transition ${
                  viewMode === "grid"
                    ? "bg-[#19161c] text-[#f4f0ea] font-medium shadow-sm"
                    : "bg-transparent text-[#8e8894] hover:text-[#f4f0ea]"
                }`}
              >
                {isEn ? "Grid" : "Raster"}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                className={`border-0 font-inherit text-[13px] px-3 py-1 rounded-[7px] cursor-pointer transition ${
                  viewMode === "list"
                    ? "bg-[#19161c] text-[#f4f0ea] font-medium shadow-sm"
                    : "bg-transparent text-[#8e8894] hover:text-[#f4f0ea]"
                }`}
              >
                {isEn ? "List" : "Liste"}
              </button>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[#8e8894] hover:text-[#f4f0ea] hover:bg-white/[0.08] border border-transparent hover:border-[#2a262e] transition cursor-pointer"
                title={isEn ? "Close" : "Schließen"}
                aria-label={isEn ? "Close" : "Schließen"}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* SCROLLABLE BODY AREA */}
        <div className="flex-1 overflow-y-auto">
          {/* NOTE BANNER */}
          {showNote && (
            <div className="mx-5 mt-4 mb-3 flex items-center gap-2.5 bg-[#ff8a3d]/[0.14] rounded-[10px] px-3 py-2.5 text-[13px] border border-[#ff8a3d]/20 text-[#f4f0ea]">
              <span>
                <b className="text-[#ff8a3d] font-medium">Papaya Plugin Store</b>{" "}
                {isEn ? "· Installed apps are active in your dock." : "· Installierte Apps erscheinen sofort in deiner Steuerleiste."}
              </span>
              <button
                type="button"
                onClick={() => setShowNote(false)}
                className="ml-auto bg-transparent border-0 text-[#8e8894] hover:text-[#f4f0ea] cursor-pointer text-lg leading-none px-1"
                aria-label={isEn ? "Dismiss note" : "Hinweis schließen"}
              >
                ×
              </button>
            </div>
          )}

          {/* SEARCH & CATEGORY CHIPS */}
          <div className="px-5 pt-1 pb-3.5 grid gap-3">
            {/* Search Input */}
            <label className="flex items-center gap-2.5 bg-[#0a090c] border border-[#2a262e] rounded-[11px] px-3.5 focus-within:border-[#ff8a3d] transition">
              <Search className="w-4 h-4 text-[#8e8894] flex-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? "Search plugins" : "Plugins durchsuchen"}
                autoComplete="off"
                className="flex-1 bg-transparent border-0 outline-none text-[#f4f0ea] placeholder:text-[#8e8894] text-[14px] py-2.5 font-inherit"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-[#8e8894] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </label>

            {/* Chips */}
            <div
              className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5"
              role="group"
              aria-label={isEn ? "Categories" : "Kategorien"}
            >
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  aria-pressed={selectedCategory === c}
                  className={`flex-none text-[13px] px-3.5 py-1.5 rounded-full cursor-pointer transition border font-inherit ${
                    selectedCategory === c
                      ? "bg-[#ff8a3d] border-[#ff8a3d] text-[#1b1006] font-medium"
                      : "bg-transparent border-[#2a262e] text-[#8e8894] hover:text-[#f4f0ea]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN PLUGIN CONTENT */}
          <main className="px-5 pt-4 pb-6 border-t border-[#2a262e]">
            {/* Meta line */}
            <p className="text-[13px] text-[#8e8894] m-0 mb-3.5 font-normal">
              {filteredPlugins.length}{" "}
              {filteredPlugins.length === 1
                ? isEn
                  ? "Plugin"
                  : "Plugin"
                : isEn
                ? "Plugins"
                : "Plugins"}{" "}
              · {installedCount} {isEn ? "installed" : "installiert"}
            </p>

            {/* Grid / List: STRICTLY MAX 3 COLUMNS */}
            {filteredPlugins.length > 0 ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
                    : "grid grid-cols-1 gap-2.5"
                }
              >
                {filteredPlugins.map((plugin) => (
                  <article
                    key={plugin.id}
                    onClick={() => setActivePluginModal(plugin)}
                    className={`bg-[#17151a] border ${plugin.id === "papayaFlow" ? "border-[#ff8a3d]/55 bg-gradient-to-br from-[#241914] to-[#17151a]" : "border-[#2a262e]"} hover:border-[#ff8a3d]/40 rounded-[14px] p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.45)] group ${
                      viewMode === "list"
                        ? "sm:flex-row sm:items-center sm:gap-4"
                        : "min-h-[195px]"
                    }`}
                  >
                    <div>
                      {/* Top Row: Icon & Titles */}
                      <div
                        className={`flex items-center gap-3 ${
                          viewMode === "list" ? "sm:flex-none sm:w-[240px]" : "mb-2.5"
                        }`}
                      >
                        {/* 42x42 Icon Container */}
                        <div
                          className="w-10 h-10 rounded-[11px] bg-[#0c0a0e] border border-[#2a262e] flex items-center justify-center flex-none group-hover:border-[#ff8a3d]/30 transition"
                          aria-hidden="true"
                        >
                          {renderPluginIcon(plugin.id)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h2 className="text-[14.5px] font-bold text-[#f4f0ea] m-0 leading-tight truncate">
                            {plugin.name}
                          </h2>
                          <div className="text-[11.5px] text-[#8e8894] mt-0.5 truncate">
                            {plugin.category}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[12.5px] leading-[1.5] text-[#9a94a2] m-0 mb-3.5 flex-1 line-clamp-2">
                        {plugin.description}
                      </p>
                    </div>

                    {/* Footer: Version on left, Clean Button Group on right */}
                    <div
                      className={`flex items-center justify-between gap-2 pt-2 border-t border-[#232027] ${
                        viewMode === "list" ? "sm:border-t-0 sm:pt-0 sm:flex-none sm:ml-auto" : ""
                      }`}
                    >
                      <span className="text-[11px] font-mono text-[#787280]">
                        {plugin.version}
                      </span>

                      {plugin.installed ? (
                        <div className="flex items-center gap-1.5">
                          {/* Clean Status Pill with Subtle Green Glow */}
                          <div
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11.5px] font-medium transition-all ${
                              justInstalledId === plugin.id
                                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                : "bg-[#1f2d24] text-[#6ee7b7] border border-emerald-900/40"
                            }`}
                          >
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>{isEn ? "Installed" : "Installiert"}</span>
                          </div>

                          {/* Clean Action: Open Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPluginClick(plugin);
                            }}
                            className="bg-[#242029] hover:bg-[#ff8a3d] text-[#e5e1e8] hover:text-[#1b1006] text-[12px] font-semibold px-2.5 py-1 rounded-[8px] border border-[#383340] hover:border-[#ff8a3d] cursor-pointer transition-all duration-150 active:scale-95"
                          >
                            {isEn ? "Open" : "Öffnen"}
                          </button>

                          {/* Clean Action: Discreet Trash Button */}
                          <button
                            type="button"
                            title={isEn ? "Uninstall plugin" : "Plugin deinstallieren"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUninstallClick(plugin.id);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-[8px] text-[#787280] hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : installingProgress[plugin.id] !== undefined ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="relative overflow-hidden flex items-center justify-between gap-2 px-3 py-1 rounded-[8px] bg-[#221c17] border border-[#ff8a3d]/50 min-w-[125px] shadow-[0_0_12px_rgba(255,138,61,0.2)]"
                        >
                          {/* Animated Progress Fill Bar */}
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ff8a3d] to-[#ffa463] opacity-90 transition-all duration-75 ease-out"
                            style={{ width: `${installingProgress[plugin.id]}%` }}
                          />
                          <div className="relative z-10 flex items-center gap-1.5 text-[#1b1006] font-bold text-[11.5px]">
                            <Loader2 className="w-3 h-3 animate-spin text-[#1b1006]" />
                            <span>{isEn ? "Installing..." : "Installiere..."}</span>
                          </div>
                          <span className="relative z-10 font-mono font-black text-[11px] text-[#1b1006]">
                            {installingProgress[plugin.id]}%
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInstallClick(plugin.id);
                          }}
                          className="border border-[#ff8a3d]/80 bg-[#ff8a3d] hover:bg-[#ff9a54] text-[#1b1006] text-[12px] font-bold px-3 py-1 rounded-[8px] cursor-pointer transition-all duration-150 active:scale-95 shadow-[0_2px_10px_rgba(255,138,61,0.3)] hover:shadow-[0_2px_14px_rgba(255,138,61,0.5)] flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isEn ? "Install" : "Installieren"}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#8e8894] text-[14px]">
                {isEn ? "No plugins found." : "Keine Plugins gefunden."}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {activePluginModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setActivePluginModal(null)}
        >
          <div
            className="w-full max-w-[480px] bg-[#19161c] border border-[#2a262e] rounded-[18px] p-6 text-[#f4f0ea] shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily:
                '"Bricolage Grotesque", system-ui, -apple-system, sans-serif',
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#2a262e] mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[12px] bg-[#0a090c] border border-[#2a262e] flex items-center justify-center">
                  {renderPluginIcon(activePluginModal.id, "large")}
                </div>
                <div>
                  <h3 className="text-[16px] font-bold m-0 text-[#f4f0ea]">
                    {activePluginModal.name}
                  </h3>
                  <span className="text-[12px] text-[#8e8894]">
                    {activePluginModal.category} · {activePluginModal.version}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePluginModal(null)}
                className="text-[#8e8894] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[13.5px] leading-relaxed text-[#8e8894] mb-5">
              {activePluginModal.description}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6 text-[12px]">
              <div className="p-3 rounded-[10px] bg-[#0a090c] border border-[#2a262e]">
                <span className="text-[#8e8894] block mb-1">Architektur</span>
                <span className="font-bold text-[#f4f0ea]">
                  {activePluginModal.modelInfo}
                </span>
              </div>
              <div className="p-3 rounded-[10px] bg-[#0a090c] border border-[#2a262e]">
                <span className="text-[#8e8894] block mb-1">Kontextfenster / Typ</span>
                <span className="font-bold text-[#5fd68a]">
                  {activePluginModal.contextWindow}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-[#2a262e]">
              {/* Uninstall button for all installed plugins */}
              {activePluginModal.installed ? (
                <button
                  type="button"
                  onClick={() => {
                    handleUninstallClick(activePluginModal.id);
                    setActivePluginModal(null);
                  }}
                  className="px-3.5 py-2 rounded-[9px] border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-[12px] font-medium cursor-pointer transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Deinstallieren
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivePluginModal(null)}
                  className="px-4 py-2 rounded-[9px] border border-[#2a262e] bg-[#0a090c] text-[#f4f0ea] hover:bg-white/[0.08] text-[13px] font-medium cursor-pointer transition"
                >
                  Schließen
                </button>
                {activePluginModal.installed ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = activePluginModal;
                      setActivePluginModal(null);
                      handleOpenPluginClick(target);
                    }}
                    className="px-5 py-2 rounded-[9px] bg-[#ff8a3d] hover:bg-[#ff9a54] text-[#1b1006] text-[13px] font-medium cursor-pointer transition"
                  >
                    Öffnen
                  </button>
                ) : installingProgress[activePluginModal.id] !== undefined ? (
                  <div className="relative overflow-hidden flex items-center justify-between gap-3 px-4 py-2 rounded-[9px] bg-[#221c17] border border-[#ff8a3d]/40 min-w-[150px] shadow-[0_0_15px_rgba(255,138,61,0.25)]">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ff8a3d] to-[#ffa463] opacity-85 transition-all duration-75 ease-out rounded-[8px]"
                      style={{ width: `${installingProgress[activePluginModal.id]}%` }}
                    />
                    <div className="relative z-10 flex items-center gap-1.5 text-[#1b1006] font-bold text-[13px]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#1b1006]" />
                      <span>{isEn ? "Installing..." : "Installiere..."}</span>
                    </div>
                    <span className="relative z-10 font-mono font-black text-[13px] text-[#1b1006] bg-white/40 px-1.5 py-0.5 rounded shadow-xs">
                      {installingProgress[activePluginModal.id]}%
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleInstallClick(activePluginModal.id);
                    }}
                    className="px-5 py-2 rounded-[9px] bg-[#ff8a3d] hover:bg-[#ff9a54] text-[#1b1006] text-[13px] font-bold cursor-pointer transition flex items-center gap-1.5 hover:shadow-[0_0_16px_rgba(255,138,61,0.4)]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Installieren
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


