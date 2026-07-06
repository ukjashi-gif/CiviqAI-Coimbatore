import React, { useState } from "react";
import { ArrowLeft, ArrowRight, ShieldAlert, CheckCircle, Clock, Navigation, CheckCircle2, ChevronRight, Check } from "lucide-react";
import { Incident, IncidentStatus, UserRole } from "../types";

interface WorkflowBoardProps {
  incidents: Incident[];
  onMoveIncident: (id: string, newStatus: IncidentStatus) => void;
  onSelectIncident: (incident: Incident) => void;
  selectedIncident: Incident | null;
  role: UserRole;
  lang: 'en' | 'ta';
}

export default function WorkflowBoard({
  incidents,
  onMoveIncident,
  onSelectIncident,
  selectedIncident,
  role,
  lang
}: WorkflowBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const columns: { id: IncidentStatus; label: string; color: string; bg: string }[] = [
    {
      id: "reported",
      label: lang === 'en' ? "Reported" : "பதிவானது",
      color: "border-rose-100 text-rose-700 bg-rose-50/80",
      bg: "bg-white"
    },
    {
      id: "dispatched",
      label: lang === 'en' ? "Dispatched" : "அனுப்பப்பட்டது",
      color: "border-indigo-100 text-indigo-700 bg-indigo-50/80",
      bg: "bg-white"
    },
    {
      id: "on-scene",
      label: lang === 'en' ? "On-Scene" : "களத்தில்",
      color: "border-amber-100 text-amber-700 bg-amber-50/80",
      bg: "bg-white"
    },
    {
      id: "resolved",
      label: lang === 'en' ? "Resolved" : "தீர்க்கப்பட்டது",
      color: "border-emerald-100 text-emerald-700 bg-emerald-50/80",
      bg: "bg-white"
    }
  ];

  // Drag-and-drop event handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: IncidentStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) {
      onMoveIncident(id, targetStatus);
    }
    setDraggedId(null);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">CRITICAL</span>;
      case "high":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">HIGH</span>;
      case "medium":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">LOW</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Board Instructions / Meta */}
      <div className="flex items-center justify-between text-xs text-slate-600 bg-white px-4 py-2.5 border border-slate-200 rounded-lg shadow-sm">
        <span className="flex items-center space-x-1.5 font-mono font-medium">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>
            {lang === 'en' 
              ? `FLOWBOARD: Drag-and-drop or use quick arrows below to shift status. Role: ${role.toUpperCase()}`
              : `செயல்முறை பலகை: இழுத்துப் போடவும் அல்லது அம்புக்குறிகளைப் பயன்படுத்தவும்.`}
          </span>
        </span>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-mono font-bold text-emerald-600">BOARD SYNC: AUTOMATIC</span>
        </div>
      </div>

      {/* Grid of Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colIncidents = incidents.filter((inc) => inc.status === col.id);

          return (
            <div
              key={col.id}
              className={`flex flex-col border border-slate-200 rounded-xl min-h-[380px] ${col.bg} transition-all duration-200 overflow-hidden shadow-sm`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className={`px-4 py-3 border-b border-slate-200/80 flex items-center justify-between font-mono ${col.color}`}>
                <span className="text-xs font-bold tracking-wider flex items-center space-x-1.5 uppercase">
                  {col.id === "reported" && <ShieldAlert className="w-4 h-4" />}
                  {col.id === "dispatched" && <Navigation className="w-4 h-4" />}
                  {col.id === "on-scene" && <Clock className="w-4 h-4" />}
                  {col.id === "resolved" && <CheckCircle className="w-4 h-4" />}
                  <span>{col.label}</span>
                </span>
                <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-full font-bold text-slate-700">
                  {colIncidents.length}
                </span>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[420px] scrollbar-thin bg-slate-50/40">
                {colIncidents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-10 text-center text-slate-400">
                    <p className="text-[11px] font-mono italic">
                      {lang === 'en' ? "Empty. Drag incident here." : "காலியாக உள்ளது."}
                    </p>
                  </div>
                ) : (
                  colIncidents.map((inc) => {
                    const isSelected = selectedIncident?.id === inc.id;

                    return (
                      <div
                        key={inc.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, inc.id)}
                        onClick={() => onSelectIncident(inc)}
                        className={`group relative p-3.5 rounded-lg border text-left cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "bg-emerald-50/55 border-emerald-500 shadow-md text-slate-900"
                            : "bg-white border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50 text-slate-700 shadow-sm"
                        }`}
                      >
                        {/* Offline unsynced indicator */}
                        {inc.id.startsWith("off-") && (
                          <div className="absolute top-1.5 right-1.5 flex items-center space-x-1 bg-amber-50 border border-amber-300 text-amber-700 text-[8px] font-mono px-1 py-0.5 rounded font-bold">
                            <span>OFFLINE</span>
                          </div>
                        )}

                        <div className="space-y-2">
                          {/* Incident Header */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                              {inc.id}
                            </span>
                            {getSeverityBadge(inc.severity)}
                          </div>

                          {/* Incident Title */}
                          <h4 className="text-xs font-bold leading-tight tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {inc.title}
                          </h4>

                          {/* Location */}
                          <p className="text-[11px] text-slate-500 font-mono truncate flex items-center space-x-1 font-semibold">
                            <span className="text-emerald-600">📍</span>
                            <span>{inc.location.name}</span>
                          </p>

                          {/* Description snippet */}
                          <p className="text-[10px] text-slate-500 line-clamp-2">
                            {inc.description}
                          </p>

                          {/* Assigned responder indicator */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-mono text-slate-400">
                            <span>
                              {inc.assignedResponderId ? (
                                <span className="text-emerald-600 flex items-center space-x-1 font-bold">
                                  <span>🚒</span>
                                  <span className="truncate max-w-[90px]">{inc.assignedResponderId}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">
                                  {lang === 'en' ? "Unassigned" : "குழு ஒதுக்கப்படவில்லை"}
                                </span>
                              )}
                            </span>
                            
                            {/* Mobile/Touch workflow arrows */}
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {col.id !== "reported" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const statuses: IncidentStatus[] = ["reported", "dispatched", "on-scene", "resolved"];
                                    const idx = statuses.indexOf(col.id);
                                    if (idx > 0) onMoveIncident(inc.id, statuses[idx - 1]);
                                  }}
                                  className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer shadow-xs"
                                  title="Move Left"
                                >
                                  <ArrowLeft className="w-2.5 h-2.5" />
                                </button>
                              )}
                              {col.id !== "resolved" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const statuses: IncidentStatus[] = ["reported", "dispatched", "on-scene", "resolved"];
                                    const idx = statuses.indexOf(col.id);
                                    if (idx < 3) onMoveIncident(inc.id, statuses[idx + 1]);
                                  }}
                                  className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer shadow-xs"
                                  title="Move Right"
                                >
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
