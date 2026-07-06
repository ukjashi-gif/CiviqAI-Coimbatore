import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  ShieldAlert, Navigation, Clock, CheckCircle, MapPin, Truck, Waves, CloudRain, 
  Shield, RefreshCw, AlertTriangle, Heart, Activity, TrendingUp, Send, Plus, 
  Languages, Download, Wifi, WifiOff, User, UserCheck, Settings, X, Info, HelpCircle,
  FileText, CheckCircle2, ChevronRight, MessageSquare, Sparkles, Filter
} from "lucide-react";

import { Incident, Responder, ChatMessage, PushNotification, CustomWidget, IncidentStatus, UserRole } from "./types";
import { TRANSLATIONS, DEFAULT_WIDGETS, COIMBATORE_LANDMARKS } from "./data";
import CoimbatoreMap from "./components/CoimbatoreMap";
import WorkflowBoard from "./components/WorkflowBoard";
import PerformanceAnalytics from "./components/PerformanceAnalytics";

export default function App() {
  // Localization & Security Role State
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [role, setRole] = useState<UserRole>('dispatcher');
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [syncQueue, setSyncQueue] = useState<Incident[]>([]);

  // Core Data State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  
  // Responder Live GPS Tracking State
  const [trackedResponders, setTrackedResponders] = useState<Record<string, boolean>>({
    "resp-1": true // Enable live tracking for CBE South Fire Squad by default as a pilot
  });
  const [simulatedCoords, setSimulatedCoords] = useState<Record<string, { latitude: number; longitude: number }>>({});

  // Memoize displayed responders merged with simulated movement coordinates
  const displayResponders = useMemo(() => {
    return responders.map(resp => ({
      ...resp,
      currentCoords: simulatedCoords[resp.id] || resp.currentCoords
    }));
  }, [responders, simulatedCoords]);

  // Periodic movement simulation loop for tracked field units
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedCoords(prev => {
        const next = { ...prev };
        let movedAny = false;

        responders.forEach(resp => {
          if (trackedResponders[resp.id]) {
            movedAny = true;
            const current = next[resp.id] || resp.currentCoords;
            let { latitude: lat, longitude: lng } = current;

            // Check if there is an active incident assigned to this responder
            const assignedIncident = incidents.find(
              i => i.assignedResponderId === resp.id && i.status !== "resolved"
            );

            if (assignedIncident) {
              // Move towards assigned incident location
              const targetLat = assignedIncident.location.latitude;
              const targetLng = assignedIncident.location.longitude;

              const dLat = targetLat - lat;
              const dLng = targetLng - lng;
              const dist = Math.sqrt(dLat * dLat + dLng * dLng);

              if (dist > 0.0004) {
                // Tactical approach step
                const step = 0.0006;
                lat += (dLat / dist) * Math.min(step, dist);
                lng += (dLng / dist) * Math.min(step, dist);
              } else {
                // Arrived at scene, tiny standing jitter
                lat += (Math.random() - 0.5) * 0.0001;
                lng += (Math.random() - 0.5) * 0.0001;
              }
            } else {
              // Idle patrol loop - circular path around original headquarters coords
              const angle = ((Date.now() / 8000) % (2 * Math.PI)) + (resp.id === "resp-1" ? 0 : resp.id === "resp-2" ? Math.PI/2 : Math.PI);
              const radius = 0.003; // patrol sweep radius
              
              const centerLat = resp.currentCoords.latitude;
              const centerLng = resp.currentCoords.longitude;
              
              const targetLat = centerLat + Math.sin(angle) * radius;
              const targetLng = centerLng + Math.cos(angle) * radius;

              const dLat = targetLat - lat;
              const dLng = targetLng - lng;
              const dist = Math.sqrt(dLat * dLat + dLng * dLng);

              if (dist > 0.0003) {
                const step = 0.0004;
                lat += (dLat / dist) * Math.min(step, dist);
                lng += (dLng / dist) * Math.min(step, dist);
              } else {
                lat = targetLat;
                lng = targetLng;
              }
            }

            // Keep within map boundaries
            lat = Math.max(10.965, Math.min(11.085, lat));
            lng = Math.max(76.925, Math.min(77.055, lng));

            next[resp.id] = { latitude: lat, longitude: lng };
          }
        });

        return movedAny ? next : prev;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [responders, trackedResponders, incidents]);

  // Handle toggling of live tracking status
  const handleToggleTracking = (id: string) => {
    setTrackedResponders(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (!next[id]) {
        // Remove simulated coordinates so responder icon snaps back to base/actual coords
        setSimulatedCoords(curr => {
          const updated = { ...curr };
          delete updated[id];
          return updated;
        });
      }
      return next;
    });
  };
  
  // App UI State
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showNewIncidentModal, setShowNewIncidentModal] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [showWidgetConfig, setShowWidgetConfig] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'map' | 'board' | 'analytics'>('map');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState<boolean>(false);

  // Custom Widgets State
  const [widgets, setWidgets] = useState<CustomWidget[]>(DEFAULT_WIDGETS);

  // New Incident Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<'flooding' | 'fire' | 'road_block' | 'medical' | 'power_outage' | 'other'>('flooding');
  const [newSeverity, setNewSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [selectedLandmark, setSelectedLandmark] = useState("");
  const [gpsLatitude, setGpsLatitude] = useState<number>(11.0168);
  const [gpsLongitude, setGpsLongitude] = useState<number>(76.9558);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  // AI Decision Core State
  const [aiQuery, setAiQuery] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiSimulated, setAiSimulated] = useState<boolean>(false);

  // New Chat Message State
  const [chatInput, setChatInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevChatCountRef = useRef<number>(0);

  // Timer reference for live clock
  const [currentTime, setCurrentTime] = useState<string>("");

  // Get current translations dictionary
  const t = TRANSLATIONS[lang];

  // Auto-updating live Coimbatore Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      // Format to Coimbatore Indian Standard Time (IST) or system UTC representation
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync / Fetch effect loop
  useEffect(() => {
    if (offlineMode) return; // Halt fetches during offline mode simulation

    const fetchData = async () => {
      try {
        const [incRes, respRes, chatRes, notifRes] = await Promise.all([
          fetch("/api/incidents"),
          fetch("/api/responders"),
          fetch("/api/chat"),
          fetch("/api/notifications")
        ]);

        if (incRes.ok) setIncidents(await incRes.json());
        if (respRes.ok) setResponders(await respRes.json());
        if (chatRes.ok) setChatMessages(await chatRes.json());
        if (notifRes.ok) setNotifications(await notifRes.json());
      } catch (err) {
        console.warn("API Server fetching bypassed or waiting for dev server startup:", err);
      }
    };

    fetchData();
    const fetchInterval = setInterval(fetchData, 4500); // Poll every 4.5 seconds for true real-time coordination simulation
    return () => clearInterval(fetchInterval);
  }, [offlineMode]);

  // Scroll tactical chat to bottom ONLY when a brand-new message is appended
  useEffect(() => {
    if (chatMessages.length > prevChatCountRef.current) {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      }
    }
    prevChatCountRef.current = chatMessages.length;
  }, [chatMessages]);

  // Handle local storage fallback initialization for offline mode
  useEffect(() => {
    const cachedIncidents = localStorage.getItem("civiqai_incidents");
    if (cachedIncidents) {
      try {
        const parsed = JSON.parse(cachedIncidents);
        if (parsed.length > 0 && incidents.length === 0) {
          setIncidents(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Update local storage cache whenever incidents change
  useEffect(() => {
    if (incidents.length > 0) {
      localStorage.setItem("civiqai_incidents", JSON.stringify(incidents));
    }
  }, [incidents]);

  // Trigger Toast helper
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // 📡 Handle Offline mode switching & synchronization
  const handleOfflineToggle = async () => {
    const nextMode = !offlineMode;
    setOfflineMode(nextMode);

    if (nextMode) {
      triggerToast(t.offlineMode + " Active. Data will queue locally.");
    } else {
      // Transitioning to online mode -> flush the local sync queue to the server
      if (syncQueue.length > 0) {
        triggerToast("Synchronizing " + syncQueue.length + " cached emergencies to cloud...");
        try {
          const res = await fetch("/api/incidents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(incidents) // Send entire updated state for reconciliation
          });

          if (res.ok) {
            setSyncQueue([]);
            triggerToast(t.syncSuccess);
            // Refresh
            const fresh = await fetch("/api/incidents");
            if (fresh.ok) setIncidents(await fresh.json());
          }
        } catch (e) {
          console.error("Online Sync failed:", e);
          triggerToast("Sync Failed. Offline state restored.");
          setOfflineMode(true);
        }
      } else {
        triggerToast("Connected Online. Database fully synchronized.");
      }
    }
  };

  // 📝 Create a new incident (supports offline queueing!)
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;

    // Resolve lat/lng from selected landmark if manual coords not adjusted
    let lat = gpsLatitude;
    let lng = gpsLongitude;
    let landmarkLabel = selectedLandmark || "Coimbatore";

    if (selectedLandmark) {
      const match = COIMBATORE_LANDMARKS.find(l => l.name === selectedLandmark);
      if (match) {
        lat = match.lat;
        lng = match.lng;
        landmarkLabel = match.name;
      }
    }

    const newInc: Incident = {
      id: `inc-${offlineMode ? "off-" : ""}${Date.now().toString().slice(-4)}`,
      title: newTitle,
      description: newDesc,
      category: newCategory,
      severity: newSeverity,
      status: "reported",
      location: {
        latitude: lat,
        longitude: lng,
        name: landmarkLabel,
        landmark: selectedLandmark
      },
      reportedBy: role === "dispatcher" ? "Command Dispatcher" : "Field Responder Unit",
      reportedAt: new Date().toISOString(),
      notes: "",
      synced: !offlineMode
    };

    // Update local state first
    const updatedIncidents = [newInc, ...incidents];
    setIncidents(updatedIncidents);

    // Save locally
    localStorage.setItem("civiqai_incidents", JSON.stringify(updatedIncidents));

    if (offlineMode) {
      setSyncQueue([...syncQueue, newInc]);
      triggerToast("Incident queued locally in offline sync queue.");
    } else {
      try {
        const res = await fetch("/api/incidents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newInc)
        });

        if (res.ok) {
          triggerToast("Incident dispatched successfully to Coimbatore server.");
          // Trigger push alert
          await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: `NEW REPORT: ${newInc.title}`,
              message: `${newInc.description.substring(0, 60)}... reported at ${newInc.location.name}.`,
              type: newInc.severity === "critical" ? "critical" : "warning"
            })
          });
        }
      } catch (err) {
        console.error("Failed to post incident online, adding to sync queue:", err);
        setSyncQueue([...syncQueue, newInc]);
        setOfflineMode(true);
        triggerToast("Server offline. Switched to offline queue mode.");
      }
    }

    // Reset Form & Close
    setNewTitle("");
    setNewDesc("");
    setShowNewIncidentModal(false);
  };

  // 🚜 Move Incident Status (Kanban Interaction)
  const handleMoveIncident = async (id: string, newStatus: IncidentStatus) => {
    const updated = incidents.map(inc => {
      if (inc.id === id) {
        // If resolved, prompt resolution notes simulation
        return { 
          ...inc, 
          status: newStatus,
          resolutionSummary: newStatus === "resolved" ? "Cleared by responding squads. Water drained / Roads opened." : inc.resolutionSummary 
        };
      }
      return inc;
    });

    setIncidents(updated);
    const updatedItem = updated.find(i => i.id === id);

    if (offlineMode) {
      if (updatedItem) setSyncQueue([...syncQueue, updatedItem]);
      triggerToast("Status updated locally.");
    } else {
      try {
        const res = await fetch("/api/incidents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedItem)
        });

        if (res.ok) {
          triggerToast(`Emergency ${id.toUpperCase()} shifted to ${newStatus.toUpperCase()}`);
        }
      } catch (err) {
        console.error(err);
        if (updatedItem) setSyncQueue([...syncQueue, updatedItem]);
        setOfflineMode(true);
        triggerToast("Status updated locally (Offline).");
      }
    }
  };

  // 🚒 Assign Responder Squad to Incident
  const handleAssignSquad = async (incidentId: string, responderId: string) => {
    const updated = incidents.map(inc => {
      if (inc.id === incidentId) {
        return { ...inc, assignedResponderId: responderId, status: "dispatched" as IncidentStatus };
      }
      return inc;
    });

    setIncidents(updated);
    const updatedItem = updated.find(i => i.id === incidentId);

    // Also update responder state to busy
    setResponders(prev => prev.map(r => r.id === responderId ? { ...r, status: "busy" } : r));

    if (offlineMode) {
      if (updatedItem) setSyncQueue([...syncQueue, updatedItem]);
      triggerToast("Squad assignment queued locally.");
    } else {
      try {
        await fetch("/api/incidents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedItem)
        });

        await fetch("/api/responders/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: responderId, status: "busy" })
        });

        triggerToast(`Squad dispatched successfully.`);
      } catch (err) {
        console.error(err);
        setOfflineMode(true);
        triggerToast("Squad assigned locally (Offline).");
      }
    }
  };

  // 💬 Send Operational Chat Message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const chatMsg = {
      senderName: role === "dispatcher" ? "Command Dispatcher" : "Noyyal Squad Leader",
      senderRole: role,
      message: chatInput
    };

    setChatInput("");

    if (offlineMode) {
      // Append locally for rendering immediately
      const mockChat: ChatMessage = {
        id: `chat-${Date.now()}`,
        senderName: chatMsg.senderName,
        senderRole: chatMsg.senderRole,
        message: chatMsg.message,
        timestamp: new Date().toISOString()
      };
      setChatMessages([...chatMessages, mockChat]);
    } else {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chatMsg)
        });

        if (res.ok) {
          const data = await res.json();
          setChatMessages([...chatMessages, data.message]);
        }
      } catch (err) {
        console.error(err);
        triggerToast("Chat offline. Buffered locally.");
      }
    }
  };

  // 🧠 Consult CiviqAI Decision Core (Gemini API Server-Side)
  const handleAskAI = async (customPrompt?: string) => {
    const queryToUse = customPrompt || aiQuery;
    if (!queryToUse.trim()) return;

    setAiLoading(true);
    setAiResult(null);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: queryToUse })
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data.text);
        setAiSimulated(!!data.simulated);
      } else {
        setAiResult("⚠️ AI Core failed to load recommendation. Please verify Server logs.");
      }
    } catch (err) {
      console.error(err);
      setAiResult("⚠️ Connection timeout. AI Decision Core is inaccessible in complete offline status.");
    } finally {
      setAiLoading(false);
    }
  };

  // 🛰️ Geolocation HTML5 API integration for precise GPS location logging
  const handleFetchGPS = () => {
    if (!navigator.geolocation) {
      triggerToast("GPS Geolocation not supported by your browser");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Clamp close to Coimbatore region coordinates for demo realism if browser is elsewhere
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setGpsLatitude(lat);
        setGpsLongitude(lng);
        setSelectedLandmark(""); // Custom coords
        setGpsLoading(false);
        triggerToast(`Precise device location acquired: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      },
      (error) => {
        console.warn("Geolocation permission blocked or unavailable. Falling back to RS Puram.", error);
        setGpsLatitude(11.0115);
        setGpsLongitude(76.9450);
        setGpsLoading(false);
        triggerToast("Geolocation blocked. Defaulted to Coimbatore RS Puram Hub.");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Clear notifications
  const clearNotifications = async () => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "all" })
      });
      setNotifications([]);
      setNotifOpen(false);
    } catch (err) {
      setNotifications([]);
    }
  };

  // Toggle widget visibility
  const toggleWidget = (id: string) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* SUCCESS TOAST MESSAGE BANNER */}
      {successToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white border border-emerald-500 text-emerald-600 px-6 py-3 rounded-xl shadow-lg flex items-center space-x-3 z-50 transition-all font-mono text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>{successToast}</span>
        </div>
      )}

      {/* EMERGENCY NOTIFICATION BANNER - Noyyal Critical Alerts */}
      {incidents.some(i => i.severity === "critical" && i.status !== "resolved") && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center justify-between text-xs text-rose-800 font-mono no-print shadow-sm">
          <div className="flex items-center space-x-2 animate-pulse">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span className="font-bold uppercase tracking-wider">
              [CRITICAL EMERGENCY DETECTED]
            </span>
            <span>-</span>
            <span className="font-medium">
              {incidents.find(i => i.severity === "critical" && i.status !== "resolved")?.title} is active. Evacuation alert deployed.
            </span>
          </div>
          <button 
            onClick={() => {
              const crit = incidents.find(i => i.severity === "critical" && i.status !== "resolved");
              if (crit) setSelectedIncident(crit);
            }}
            className="underline hover:text-rose-950 text-[10px] uppercase font-bold cursor-pointer"
          >
            FOCUS INCIDENT →
          </button>
        </div>
      )}

      {/* HEADER CONTROL BAR */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20 no-print shadow-xs">
        {/* Branding Title */}
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-600 text-white shadow-md shadow-indigo-100">
            <Shield className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-extrabold tracking-tight font-sans text-slate-900">
                {t.title}
              </h1>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                v2.5 PILOT
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Coimbatore Dynamic Clock */}
          <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center space-x-2 font-mono text-xs text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>COIMBATORE: {currentTime || "20:35:05"}</span>
          </div>

          {/* Bilingual Toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
            className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg px-3 py-1.5 text-xs text-slate-700 flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs font-medium"
            title="Switch Language / மொழி மாற்றுக"
          >
            <Languages className="w-4 h-4 text-indigo-500" />
            <span>{lang === 'en' ? "தமிழ்" : "English"}</span>
          </button>

          {/* Offline/Online Toggle with queue state */}
          <button
            onClick={handleOfflineToggle}
            className={`rounded-lg px-3 py-1.5 text-xs font-mono font-bold flex items-center space-x-1.5 cursor-pointer border transition-all active:scale-95 shadow-2xs ${
              offlineMode
                ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/50"
                : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/50"
            }`}
          >
            {offlineMode ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            <span>
              {offlineMode 
                ? `${t.offline} (${syncQueue.length})` 
                : t.online}
            </span>
          </button>

          {/* Security Role Selector */}
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-0.5 flex items-center text-xs font-medium shadow-2xs">
            <button
              onClick={() => { setRole('dispatcher'); triggerToast("Command Mode: Dispatcher authorized"); }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer text-[11px] ${
                role === 'dispatcher' ? "bg-indigo-600 text-white font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === 'en' ? "Dispatcher" : "அதிகாரி"}
            </button>
            <button
              onClick={() => { setRole('responder'); triggerToast("Field Mode: Responder authorized"); }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer text-[11px] ${
                role === 'responder' ? "bg-indigo-600 text-white font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === 'en' ? "Field Patrol" : "ரோந்து"}
            </button>
            <button
              onClick={() => { setRole('admin'); triggerToast("Admin Mode authorized"); }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer text-[11px] ${
                role === 'admin' ? "bg-indigo-600 text-white font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Admin
            </button>
          </div>

          {/* Emergency Alert Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 relative text-slate-700 cursor-pointer transition-all active:scale-95 shadow-2xs"
            >
              <AlertTriangle className={`w-4.5 h-4.5 ${notifications.length > 0 ? "text-amber-500 animate-bounce" : "text-slate-500"}`} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between font-mono text-xs font-bold text-slate-700">
                  <span>{t.notifications}</span>
                  {notifications.length > 0 && (
                    <button onClick={clearNotifications} className="text-red-600 text-[10px] hover:underline cursor-pointer font-bold">
                      Dismiss All
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1.5 bg-white">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      No active alert warnings.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-2.5 rounded bg-slate-50/55 border border-slate-100 text-xs text-slate-700">
                        <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                          <span className="flex items-center space-x-1">
                            <span className={n.type === "critical" ? "text-red-500" : "text-amber-500"}>●</span>
                            <span>{n.title}</span>
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-snug">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE PANELS */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 no-print">
        
        {/* LEFT COLUMN: TELEMETRY AND TACTICAL CHAT (3 cols / 12) */}
        <section className="xl:col-span-3 space-y-6 flex flex-col justify-between">
          
          {/* Quick Stats Panel */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold font-mono tracking-wider text-slate-700 uppercase flex items-center space-x-1.5">
                <Activity className="w-4.5 h-4.5 text-emerald-600" />
                <span>{lang === 'en' ? "OPERATIONS TELEMETRY" : "அவசர புள்ளிவிவரங்கள்"}</span>
              </h2>
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                LIVE
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <p className="text-xl font-extrabold font-mono text-slate-800">
                  {incidents.length}
                </p>
                <p className="text-[9px] text-slate-400 uppercase font-bold">{lang === 'en' ? "Total" : "மொத்தம்"}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <p className="text-xl font-extrabold font-mono text-rose-600">
                  {incidents.filter(i => i.status !== "resolved").length}
                </p>
                <p className="text-[9px] text-slate-400 uppercase font-bold">{lang === 'en' ? "Active" : "செயலில்"}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <p className="text-xl font-extrabold font-mono text-emerald-600">
                  {incidents.filter(i => i.status === "resolved").length}
                </p>
                <p className="text-[9px] text-slate-400 uppercase font-bold">{lang === 'en' ? "Resolved" : "தீர்க்கப்பட்டது"}</p>
              </div>
            </div>

            {/* Custom Widget Config Toggle */}
            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>{t.widgets}</span>
                <button 
                  onClick={() => setShowWidgetConfig(!showWidgetConfig)} 
                  className="text-indigo-600 hover:underline flex items-center space-x-1 cursor-pointer font-bold"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure</span>
                </button>
              </div>

              {/* Quick interactive widget checkbox togglers */}
              {showWidgetConfig && (
                <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs text-slate-700 font-medium">
                  {widgets.map(w => (
                    <label key={w.id} className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={w.visible} 
                        onChange={() => toggleWidget(w.id)}
                        className="rounded bg-white border-slate-350 text-indigo-600 focus:ring-0" 
                      />
                      <span>{lang === 'en' ? w.title : (w.title.includes("Map") ? "வரைபடம்" : w.title.includes("Weather") ? "நொய்யல் நீர்நிலை" : "கட்டளை பதிவுகள்")}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conditional Monitoring Widgets */}
          {widgets.find(w => w.id === "wid-weather")?.visible && (
            <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-3 shadow-sm">
              <h3 className="text-[11px] font-bold font-mono text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Waves className="w-4 h-4 text-blue-600" />
                <span>{lang === 'en' ? "NOYYAL WATERSHED HYDROLOGY" : "நொய்யல் நீர்நிலை நிலை"}</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Ukkadam Gate Spillway:</span>
                  <span className="text-amber-700 font-mono font-bold">1.4m over safety</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Noyyal Catchment Flow:</span>
                  <span className="text-emerald-700 font-mono font-bold">Stable (840 cusecs)</span>
                </div>
                <div className="text-[10px] text-slate-400 italic text-center">
                  Hydrometric data refreshes automatically.
                </div>
              </div>
            </div>
          )}

          {/* Field Patrol Units & GPS Tracking Control */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold font-mono tracking-wider text-slate-700 uppercase flex items-center space-x-1.5">
                <Truck className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                <span>{lang === 'en' ? "FIELD PATROL UNITS" : "கள ரோந்து பிரிவுகள்"}</span>
              </h2>
              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded animate-pulse">
                {Object.values(trackedResponders).filter(Boolean).length} {lang === 'en' ? "ACTIVE" : "செயலில்"}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              {lang === 'en' 
                ? "Toggle 'Live Tracking' to enable real-time GPS telemetry overlays on the Coimbatore Map." 
                : "வரைபடத்தில் நேரடி ஜிபிஎஸ் தரவைப் பெற 'நேரடி கண்காணிப்பு' என்பதை மாற்றவும்."}
            </p>

            <div className="space-y-3">
              {displayResponders.map((resp) => {
                const isTracked = !!trackedResponders[resp.id];
                const isAvailable = resp.status === "available";
                
                // Find assigned active incident
                const assignedIncident = incidents.find(
                  i => i.assignedResponderId === resp.id && i.status !== "resolved"
                );

                // Calculate ETA if assigned
                let etaInfo = null;
                if (assignedIncident) {
                  const lat1 = resp.currentCoords.latitude;
                  const lng1 = resp.currentCoords.longitude;
                  const lat2 = assignedIncident.location.latitude;
                  const lng2 = assignedIncident.location.longitude;

                  const dLat = lat2 - lat1;
                  const dLng = lng2 - lng1;
                  const dist = Math.sqrt(dLat * dLat + dLng * dLng);

                  // 1 degree is roughly 111 km
                  const distanceInKm = dist * 111.0;

                  if (dist <= 0.0005) {
                    etaInfo = {
                      text: lang === 'en' ? "On Scene" : "சம்பவ இடத்தில்",
                      subtext: lang === 'en' ? "Arrived" : "வந்துசேர்ந்தார்",
                      distance: distanceInKm,
                      arrived: true
                    };
                  } else {
                    // Average response vehicle speed in city is ~30 km/h
                    const minutes = Math.max(1, Math.round(distanceInKm * 2 + 1));
                    etaInfo = {
                      text: lang === 'en' ? `~${minutes} mins` : `~${minutes} நிமி`,
                      subtext: lang === 'en' ? `${distanceInKm.toFixed(2)} km` : `${distanceInKm.toFixed(2)} கிமீ`,
                      distance: distanceInKm,
                      arrived: false
                    };
                  }
                }
                
                // Choose icon based on role
                let IconComponent = Truck;
                if (resp.role.includes("Medical") || resp.role.includes("EMT")) {
                  IconComponent = Activity;
                } else if (resp.role.includes("Engineering") || resp.role.includes("Stormwater")) {
                  IconComponent = Settings;
                } else if (resp.role.includes("Fire")) {
                  IconComponent = Shield;
                }

                return (
                  <div 
                    key={resp.id} 
                    className={`p-3 rounded-lg border transition-all flex items-center justify-between ${
                      isTracked 
                        ? "bg-indigo-50/40 border-indigo-200 shadow-2xs" 
                        : "bg-slate-50/50 border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                      <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                        isTracked 
                          ? "bg-indigo-600 text-white" 
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">
                          {resp.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 leading-normal mt-0.5 font-medium truncate">
                          {resp.role}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1">
                          {/* Status Badge */}
                          <div className="flex items-center space-x-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                            }`}></span>
                            <span className="text-[9px] font-mono uppercase tracking-wider font-bold text-slate-500">
                              {isAvailable 
                                ? (lang === 'en' ? "Available" : "தயார்") 
                                : (lang === 'en' ? "Busy" : "பணியில்")}
                            </span>
                          </div>

                          {/* ETA Badge */}
                          {etaInfo && (
                            <div className="flex items-center space-x-1.5 border-l border-slate-200 pl-2.5">
                              <Clock className="w-3 h-3 text-indigo-500" />
                              <span className={`text-[9px] font-mono font-bold ${
                                etaInfo.arrived ? "text-emerald-600" : "text-indigo-600 animate-pulse"
                              }`}>
                                {etaInfo.text}
                              </span>
                              <span className="text-[8px] text-slate-400 font-medium">
                                ({etaInfo.subtext})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Custom Toggle Switch */}
                    <div className="flex flex-col items-end space-y-1 ml-2 shrink-0">
                      <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                        {lang === 'en' ? "Live Track" : "நேரடி"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleTracking(resp.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isTracked ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                        aria-label={`Toggle live tracking for ${resp.name}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            isTracked ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Integrated Tactical Team Chat */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex-1 flex flex-col min-h-[280px] max-h-[380px] shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>{t.chatTitle}</span>
              </h3>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
                SECURE
              </span>
            </div>

            {/* Chat message stream */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[220px] scrollbar-thin">
              {chatMessages.map((msg) => {
                const isDispatcher = msg.senderRole === "dispatcher" || msg.senderRole === "admin";
                return (
                  <div key={msg.id} className={`flex flex-col ${isDispatcher ? "items-start" : "items-end"}`}>
                    <div className="flex items-center space-x-1 text-[9px] text-slate-400 font-mono mb-0.5">
                      <span className="font-bold text-slate-600">{msg.senderName}</span>
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className={`p-2.5 rounded-xl text-xs max-w-[85%] leading-snug font-medium shadow-2xs border ${
                      isDispatcher 
                        ? "bg-slate-100 border-slate-200 text-slate-800 rounded-tl-none" 
                        : "bg-indigo-50 border-indigo-100 text-indigo-950 rounded-tr-none"
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="mt-3 flex items-center space-x-2 border-t border-slate-100 pt-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t.chatPlaceholder}
                className="flex-1 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-0 text-xs rounded-lg px-3 py-2 text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer flex items-center justify-center shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </section>

        {/* MIDDLE COLUMN: MAP OVERLAY & KANBAN DISPATCH WORKBOARD (6 cols / 12) */}
        <section className="xl:col-span-6 space-y-6 flex flex-col">
          
          {/* Main Display Navigation tabs */}
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center justify-between shadow-xs">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('map')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'map' ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                📍 {lang === 'en' ? "GPS INCIDENT MAP" : "அவசர நிலவர வரைபடம்"}
              </button>
              <button
                onClick={() => setActiveTab('board')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'board' ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                📋 {lang === 'en' ? "DISPATCH WORKBOARD" : "அனுப்பீட்டுப் பலகை"}
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'analytics' ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                📊 {lang === 'en' ? "PERFORMANCE ANALYTICS" : "செயல்திறன் பகுப்பாய்வு"}
              </button>
            </div>

            <div className="flex items-center space-x-2 pr-2">
              <button
                onClick={() => setShowPdfModal(true)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>{t.exportPDF}</span>
              </button>
            </div>
          </div>

          {/* Tab Renderers */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              <CoimbatoreMap
                incidents={incidents}
                responders={displayResponders}
                selectedIncident={selectedIncident}
                onSelectIncident={(inc) => setSelectedIncident(inc)}
                lang={lang}
                trackedResponders={trackedResponders}
              />
              
              {/* Selected Incident Quick Inspection Drawer / Footer */}
              {selectedIncident ? (
                <div className="bg-white border border-emerald-500/40 p-5 rounded-xl space-y-4 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">SELECTED EMERGENCE LOG</span>
                      <h3 className="text-sm font-extrabold text-slate-900">{selectedIncident.title}</h3>
                    </div>
                    <button onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{selectedIncident.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">Location</span>
                      <span className="text-slate-700 font-semibold">📍 {selectedIncident.location.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">Severity Badge</span>
                      <span className="font-bold text-rose-600 uppercase">{selectedIncident.severity}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">Current Status</span>
                      <span className="font-bold text-indigo-600 uppercase">{selectedIncident.status}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">Assigned Unit</span>
                      <span className="text-slate-700 font-mono font-bold">
                        {selectedIncident.assignedResponderId ? `🚒 ${selectedIncident.assignedResponderId}` : "UNASSIGNED"}
                      </span>
                    </div>
                  </div>

                  {/* Dispatcher Actions */}
                  {role === "dispatcher" && !selectedIncident.assignedResponderId && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
                      <span className="text-xs text-slate-500 font-mono font-bold">Quick Deploy Squad:</span>
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        {responders.filter(r => r.status === "available").map(resp => (
                          <button
                            key={resp.id}
                            onClick={() => handleAssignSquad(selectedIncident.id, resp.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 shadow-xs"
                          >
                            Deploy {resp.name.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Responder Action Mode: Advance status */}
                  {role === "responder" && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                      {selectedIncident.status === "reported" && (
                        <button
                          onClick={() => handleMoveIncident(selectedIncident.id, "dispatched")}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                        >
                          Mark Dispatched
                        </button>
                      )}
                      {selectedIncident.status === "dispatched" && (
                        <button
                          onClick={() => handleMoveIncident(selectedIncident.id, "on-scene")}
                          className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                        >
                          Mark On-Scene
                        </button>
                      )}
                      {selectedIncident.status === "on-scene" && (
                        <button
                          onClick={() => handleMoveIncident(selectedIncident.id, "resolved")}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                        >
                          Mark Resolved (Clear)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-100/50 border border-slate-200 p-4.5 rounded-xl text-center text-xs text-slate-400 italic font-medium">
                  Select any active emergency marker on the map or board to inspect live dispatcher status & deploy squads.
                </div>
              )}
            </div>
          )}

          {activeTab === 'board' && (
            <WorkflowBoard
              incidents={incidents}
              onMoveIncident={handleMoveIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              selectedIncident={selectedIncident}
              role={role}
              lang={lang}
            />
          )}

          {activeTab === 'analytics' && (
            <PerformanceAnalytics
              incidents={incidents}
              responders={displayResponders}
              lang={lang}
            />
          )}
        </section>

        {/* RIGHT COLUMN: AI DECISION SUPPORT & NEW DISPATCH LAUNCHER (3 cols / 12) */}
        <section className="xl:col-span-3 space-y-6">
          
          {/* CiviqAI Decision Core Chat Integration */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm relative overflow-hidden">
            {/* Ambient Background Glow effect for AI */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xs font-bold font-mono tracking-wider text-indigo-700 uppercase">
                  {t.aiCore}
                </h2>
              </div>
              <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span>GEMINI 3.5</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Coimbatore Corporation RAG decision engine. Queries live Noyyal dams status, road blockages, and responder proximity.
            </p>

            {/* AI Result Box */}
            {aiLoading ? (
              <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-center space-y-2.5 shadow-2xs">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
                <p className="text-[10px] font-mono text-slate-500">Querying Coimbatore Live Situation Room...</p>
              </div>
            ) : aiResult ? (
              <div className="bg-slate-50/80 p-3.5 rounded-lg border border-indigo-100 text-xs text-slate-700 space-y-2 max-h-[190px] overflow-y-auto scrollbar-thin">
                <div className="flex items-center justify-between font-mono text-[9px] text-indigo-600 mb-1 border-b border-indigo-100 pb-1.5">
                  <span>DECISION RESPONSE</span>
                  <span>{aiSimulated ? "LOCAL INTELLIGENCE" : "CLOUD VERIFIED"}</span>
                </div>
                <div className="prose prose-xs text-[11px] leading-relaxed font-sans space-y-1 text-slate-700">
                  {aiResult.split("\n").map((line, i) => {
                    if (line.startsWith("### ")) {
                      return <h4 key={i} className="text-xs font-bold text-slate-800 mt-2">{line.replace("### ", "")}</h4>;
                    }
                    if (line.startsWith("#### ")) {
                      return <h5 key={i} className="text-xs font-bold text-slate-700 mt-2">{line.replace("#### ", "")}</h5>;
                    }
                    if (line.startsWith("* ")) {
                      return <li key={i} className="ml-3 list-disc font-medium">{line.replace("* ", "")}</li>;
                    }
                    return <p key={i}>{line}</p>;
                  })}
                </div>

                {/* Intelligent Auto Dispatch Apply button */}
                {aiResult.includes("resp-3") && (
                  <div className="pt-2 mt-2 border-t border-slate-200 text-center">
                    <button
                      onClick={() => handleAssignSquad("inc-103", "resp-3")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] px-2.5 py-1.5 rounded-md font-bold tracking-wider cursor-pointer shadow-xs transition-all active:scale-95"
                    >
                      ✓ APPLY AI SQUAD PAIRING
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* AI Queries Launcher input */}
            <div className="space-y-2">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder={t.aiPlaceholder}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-0 text-xs rounded-lg p-2.5 text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                onClick={() => handleAskAI()}
                disabled={aiLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 text-white font-mono text-[11px] font-bold py-2.5 rounded-lg cursor-pointer tracking-wider flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t.askAI}</span>
              </button>
            </div>

            {/* Preset Advisor Queries */}
            <div className="pt-2 border-t border-slate-200 space-y-1 text-[10px]">
              <span className="text-slate-400 font-mono block mb-1">RECOMMENDED COMMAND PATTERNS:</span>
              <button 
                onClick={() => { setAiQuery("Recommend dispatch for Gandhipuram complex fire"); handleAskAI("Recommend dispatch for Gandhipuram complex fire"); }}
                className="w-full text-left p-1.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 font-mono transition-colors cursor-pointer"
              >
                ➔ "Recommend dispatch pairings"
              </button>
              <button 
                onClick={() => { setAiQuery("Noyyal River flood catchment warning plan"); handleAskAI("Noyyal River flood catchment warning plan"); }}
                className="w-full text-left p-1.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 font-mono transition-colors cursor-pointer"
              >
                ➔ "Analyze Noyyal watershed risk"
              </button>
            </div>
          </div>

          {/* New Incident File Form (Command Room Dispatcher) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold font-mono tracking-wider text-slate-700 uppercase flex items-center space-x-1.5">
                <Plus className="w-4.5 h-4.5 text-emerald-600" />
                <span>{t.addIncident}</span>
              </h2>
              <span className="bg-emerald-50 border border-emerald-150 text-emerald-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                NEW
              </span>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-3.5 text-xs">
              
              {/* Title */}
              <div>
                <label className="text-slate-500 block mb-1 font-bold">{t.incidentTitle}</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Noyyal Canal block, Tree fall"
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-0 text-xs rounded-lg p-2.5 text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-slate-500 block mb-1 font-bold">{t.description}</label>
                <textarea
                  required
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Provide precise damage / blockage info..."
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-0 text-xs rounded-lg p-2.5 text-slate-800 outline-none placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* Grid Category & Severity */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-500 block mb-1 font-bold">{t.category}</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 text-xs rounded-lg p-2.5 text-slate-800 outline-none font-medium"
                  >
                    <option value="flooding">{lang === 'en' ? "Flooding" : "வெள்ளம்"}</option>
                    <option value="fire">{lang === 'en' ? "Fire" : "தீ விபத்து"}</option>
                    <option value="road_block">{lang === 'en' ? "Road Block" : "சாலை அடைப்பு"}</option>
                    <option value="medical">{lang === 'en' ? "Medical" : "மருத்துவம்"}</option>
                    <option value="power_outage">{lang === 'en' ? "Power Outage" : "மின் தடை"}</option>
                    <option value="other">{lang === 'en' ? "Other" : "இதர"}</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-bold">{t.severity}</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 text-xs rounded-lg p-2.5 text-slate-800 outline-none font-bold"
                  >
                    <option value="low" className="text-blue-600">{lang === 'en' ? "Low" : "குறைவு"}</option>
                    <option value="medium" className="text-yellow-600">{lang === 'en' ? "Medium" : "நடுத்தர"}</option>
                    <option value="high" className="text-orange-600">{lang === 'en' ? "High" : "அதிகம்"}</option>
                    <option value="critical" className="text-red-600">{lang === 'en' ? "Critical" : "ஆபத்தானது"}</option>
                  </select>
                </div>
              </div>

              {/* Landmark Dropdown Selector */}
              <div>
                <label className="text-slate-500 block mb-1 font-bold">{t.location}</label>
                <select
                  value={selectedLandmark}
                  onChange={(e) => {
                    setSelectedLandmark(e.target.value);
                    const match = COIMBATORE_LANDMARKS.find(l => l.name === e.target.value);
                    if (match) {
                      setGpsLatitude(match.lat);
                      setGpsLongitude(match.lng);
                    }
                  }}
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 text-xs rounded-lg p-2.5 text-slate-800 outline-none font-medium"
                >
                  <option value="">-- Choose Coimbatore Zone --</option>
                  {COIMBATORE_LANDMARKS.map((landmark) => (
                    <option key={landmark.name} value={landmark.name}>
                      {landmark.name} ({landmark.desc.split(" ")[0]} Zone)
                    </option>
                  ))}
                </select>
              </div>

              {/* Exact GPS Coordinate simulator and browser sensor */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-bold">
                  <span>GPS COORDINATES</span>
                  <button
                    type="button"
                    onClick={handleFetchGPS}
                    disabled={gpsLoading}
                    className="text-emerald-600 hover:underline flex items-center space-x-1 cursor-pointer font-bold"
                  >
                    <MapPin className="w-3 h-3 animate-pulse text-emerald-600" />
                    <span>{gpsLoading ? "Acquiring..." : t.useGPS}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600">
                  <div className="flex items-center space-x-1">
                    <span>Lat:</span>
                    <input 
                      type="number" 
                      step="0.0001" 
                      value={gpsLatitude} 
                      onChange={(e) => setGpsLatitude(parseFloat(e.target.value))}
                      className="bg-white border border-slate-200 text-[10px] text-slate-800 w-20 p-1 rounded font-bold font-mono focus:border-indigo-500 outline-none" 
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>Lng:</span>
                    <input 
                      type="number" 
                      step="0.0001" 
                      value={gpsLongitude} 
                      onChange={(e) => setGpsLongitude(parseFloat(e.target.value))}
                      className="bg-white border border-slate-200 text-[10px] text-slate-800 w-20 p-1 rounded font-bold font-mono focus:border-indigo-500 outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-bold py-2.5 rounded-lg cursor-pointer tracking-wider flex items-center justify-center space-x-1 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t.reportNow}</span>
              </button>

            </form>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 font-mono no-print">
        <p>© 2026 Coimbatore City Corporation Disaster Management Cell. All rights reserved. Cross-Platform Responsive. Persistent local caches verified.</p>
      </footer>

      {/* PDF SITUATION REPORT (SITREP) PREVIEW & PRINT MODAL */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between no-print">
              <h3 className="text-sm font-bold font-mono tracking-wider text-slate-700 uppercase flex items-center space-x-1.5">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>COIMBATORE DISPATCH SITREP EXPORTER</span>
              </h3>
              <button 
                onClick={() => setShowPdfModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print Area Contents */}
            <div className="p-8 overflow-y-auto bg-white text-slate-950 flex-1 space-y-6 border border-slate-200/50 m-4 rounded-lg shadow-inner" id="printable-sitrep">
              {/* Government Official Logo/Header */}
              <div className="border-b-4 border-slate-900 pb-4 text-center">
                <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900 font-mono">
                  Coimbatore City Corporation — தமிழ்நாடு அரசு
                </h1>
                <p className="text-xs uppercase font-semibold text-slate-700 tracking-widest font-mono mt-1">
                  Central Emergency Operations & Incident Command Cell
                </p>
                <div className="mt-2.5 text-xs font-mono text-slate-600 flex justify-between px-2">
                  <span>SITREP NO: CBE-{Date.now().toString().slice(-5)}</span>
                  <span>DATE: {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span>TIME: {currentTime || "20:35"} (IST)</span>
                </div>
              </div>

              {/* Status Section */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="border border-slate-900 p-3 rounded">
                  <span className="text-[10px] uppercase font-mono block text-slate-600 font-bold">Total Emergencies</span>
                  <span className="text-xl font-bold font-mono">{incidents.length}</span>
                </div>
                <div className="border border-slate-900 p-3 rounded bg-red-50/50">
                  <span className="text-[10px] uppercase font-mono block text-slate-600 font-bold">Active Emergencies</span>
                  <span className="text-xl font-bold font-mono text-red-600">
                    {incidents.filter(i => i.status !== "resolved").length}
                  </span>
                </div>
                <div className="border border-slate-900 p-3 rounded bg-emerald-50/50">
                  <span className="text-[10px] uppercase font-mono block text-slate-600 font-bold">Resolved Cases</span>
                  <span className="text-xl font-bold font-mono text-emerald-600">
                    {incidents.filter(i => i.status === "resolved").length}
                  </span>
                </div>
              </div>

              {/* Active Incident Details Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 border-b border-slate-900 pb-1">
                  ACTIVE EMERGENCIES IN COIMBATORE CORRIDOR
                </h3>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-50 font-mono font-bold">
                      <th className="py-2 px-1">ID</th>
                      <th className="py-2">TITLE / LOCATION</th>
                      <th className="py-2 text-center">SEVERITY</th>
                      <th className="py-2 text-center">STATUS</th>
                      <th className="py-2 text-right">ASSIGNED UNIT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.filter(i => i.status !== "resolved").map((inc) => (
                      <tr key={inc.id} className="border-b border-slate-200">
                        <td className="py-2.5 px-1 font-mono font-bold">{inc.id.toUpperCase()}</td>
                        <td className="py-2.5">
                          <p className="font-bold">{inc.title}</p>
                          <p className="text-[10px] text-slate-600">📍 {inc.location.name}</p>
                        </td>
                        <td className="py-2.5 text-center font-bold">
                          <span className={inc.severity === "critical" ? "text-red-600 font-extrabold" : "text-orange-600 font-extrabold"}>
                            {inc.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 text-center uppercase font-mono text-[10px] font-bold">
                          {inc.status}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-800 font-bold">
                          {inc.assignedResponderId || "PENDING DISPATCH"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Hydrology & Water Catchment Note */}
              <div className="border border-slate-900 p-4 rounded text-xs space-y-1 bg-slate-50 font-mono">
                <p className="font-bold">🌊 NOYYAL WATERSHED HYDROLOGICAL FORECAST REPORT:</p>
                <p className="text-slate-700">Ukkadam Bypass check dam overflow active. Noyyal River water volume is stable at 840 cusecs, with light rain continuing in the Western Ghats catchment. Evacuation patrols on active alert in South Ukkadam and Singanallur.</p>
              </div>

              {/* Sign Off */}
              <div className="pt-8 flex justify-between text-xs font-mono">
                <div>
                  <p className="font-bold">Prepared by: CiviqAI Intelligent System</p>
                  <p className="text-slate-500">Auto Generated Dispatch Report</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">Authorized Signature</p>
                  <p className="mt-4 border-t border-slate-900 pt-1">Commanding Officer, Coimbatore Cell</p>
                </div>
              </div>
            </div>

            {/* Print/Download Button row */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex justify-end space-x-3.5 no-print">
              <button
                onClick={() => setShowPdfModal(false)}
                className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-mono font-bold hover:bg-slate-50 cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={() => window.print()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all active:scale-95 shadow-xs"
              >
                🖨️ Print / Save to PDF
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON (FAB) */}
      <div className="fixed bottom-6 right-6 z-40 no-print">
        <button
          onClick={() => setShowNewIncidentModal(true)}
          className="flex items-center justify-center w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 cursor-pointer"
          title={lang === 'en' ? "Report Emergency" : "அவசரநிலையை புகாரளிக்கவும்"}
          id="fab-report-emergency"
        >
          <Plus className="w-8 h-8 animate-pulse" />
        </button>
      </div>

      {/* NEW INCIDENT REPORTING MODAL */}
      {showNewIncidentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono tracking-wider text-slate-700 uppercase flex items-center space-x-2">
                <Plus className="w-5 h-5 text-emerald-600 animate-pulse" />
                <span>{lang === 'en' ? "QUICK EMERGENCY DISPATCH REPORT" : "அவசரநிலை விரைவு அறிக்கை"}</span>
              </h3>
              <button 
                onClick={() => setShowNewIncidentModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
                id="close-incident-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Form */}
            <div className="p-6 overflow-y-auto bg-white flex-1">
              <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
                
                {/* Title */}
                <div>
                  <label className="text-slate-600 block mb-1 font-bold">{t.incidentTitle}</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Noyyal Canal block, Tree fall"
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-0 text-xs rounded-lg p-2.5 text-slate-800 outline-none placeholder:text-slate-400 font-medium"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-slate-600 block mb-1 font-bold">{t.description}</label>
                  <textarea
                    required
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Provide precise damage / blockage info..."
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-0 text-xs rounded-lg p-2.5 text-slate-800 outline-none placeholder:text-slate-400 resize-none font-medium"
                  />
                </div>

                {/* Grid Category & Severity */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1 font-bold">{t.category}</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 text-xs rounded-lg p-2.5 text-slate-800 outline-none font-semibold"
                    >
                      <option value="flooding">{lang === 'en' ? "Flooding" : "வெள்ளம்"}</option>
                      <option value="fire">{lang === 'en' ? "Fire" : "தீ விபத்து"}</option>
                      <option value="road_block">{lang === 'en' ? "Road Block" : "சாலை அடைப்பு"}</option>
                      <option value="medical">{lang === 'en' ? "Medical" : "மருத்துவம்"}</option>
                      <option value="power_outage">{lang === 'en' ? "Power Outage" : "மின் தடை"}</option>
                      <option value="other">{lang === 'en' ? "Other" : "இதர"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1 font-bold">{t.severity}</label>
                    <select
                      value={newSeverity}
                      onChange={(e) => setNewSeverity(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 text-xs rounded-lg p-2.5 text-slate-800 outline-none font-bold"
                    >
                      <option value="low" className="text-blue-600 font-semibold">{lang === 'en' ? "Low" : "குறைவு"}</option>
                      <option value="medium" className="text-yellow-600 font-semibold">{lang === 'en' ? "Medium" : "நடுத்தர"}</option>
                      <option value="high" className="text-orange-600 font-semibold">{lang === 'en' ? "High" : "அதிகம்"}</option>
                      <option value="critical" className="text-red-600 font-bold">{lang === 'en' ? "Critical" : "ஆபத்தானது"}</option>
                    </select>
                  </div>
                </div>

                {/* Landmark Dropdown Selector */}
                <div>
                  <label className="text-slate-600 block mb-1 font-bold">{t.location}</label>
                  <select
                    value={selectedLandmark}
                    onChange={(e) => {
                      setSelectedLandmark(e.target.value);
                      const match = COIMBATORE_LANDMARKS.find(l => l.name === e.target.value);
                      if (match) {
                        setGpsLatitude(match.lat);
                        setGpsLongitude(match.lng);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 text-xs rounded-lg p-2.5 text-slate-800 outline-none font-medium"
                  >
                    <option value="">-- Choose Coimbatore Zone --</option>
                    {COIMBATORE_LANDMARKS.map((landmark) => (
                      <option key={landmark.name} value={landmark.name}>
                        {landmark.name} ({landmark.desc.split(" ")[0]} Zone)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exact GPS Coordinate simulator and browser sensor */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono font-bold">
                    <span>GPS TELEMETRY TARGET</span>
                    <button
                      type="button"
                      onClick={handleFetchGPS}
                      disabled={gpsLoading}
                      className="text-emerald-600 hover:underline flex items-center space-x-1 cursor-pointer font-bold"
                    >
                      <MapPin className="w-3 h-3 animate-pulse text-emerald-600" />
                      <span>{gpsLoading ? "Acquiring..." : t.useGPS}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-slate-400">Lat:</span>
                      <input 
                        type="number" 
                        step="0.0001" 
                        value={gpsLatitude} 
                        onChange={(e) => setGpsLatitude(parseFloat(e.target.value))}
                        className="bg-white border border-slate-200 text-[10px] text-slate-800 w-full p-2 rounded-lg font-bold font-mono focus:border-indigo-500 outline-none" 
                      />
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-slate-400">Lng:</span>
                      <input 
                        type="number" 
                        step="0.0001" 
                        value={gpsLongitude} 
                        onChange={(e) => setGpsLongitude(parseFloat(e.target.value))}
                        className="bg-white border border-slate-200 text-[10px] text-slate-800 w-full p-2 rounded-lg font-bold font-mono focus:border-indigo-500 outline-none" 
                      />
                    </div>
                  </div>
                </div>

                {/* Submit / Action Buttons */}
                <div className="pt-2 flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowNewIncidentModal(false)}
                    className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] font-bold py-3 rounded-lg cursor-pointer tracking-wider text-center"
                  >
                    {lang === 'en' ? "CANCEL" : "ரத்துசெய்"}
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-bold py-3 rounded-lg cursor-pointer tracking-wider flex items-center justify-center space-x-1.5 shadow-sm transition-all active:scale-[0.98]"
                  >
                    <Send className="w-4 h-4" />
                    <span>{t.reportNow}</span>
                  </button>
                </div>

              </form>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
