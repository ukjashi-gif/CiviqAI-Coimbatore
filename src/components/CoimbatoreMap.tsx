import { useState, useMemo } from "react";
import { MapPin, Truck, Waves, CloudRain, Shield, RefreshCw } from "lucide-react";
import { Incident, Responder } from "../types";
import { COIMBATORE_LANDMARKS } from "../data";

interface CoimbatoreMapProps {
  incidents: Incident[];
  responders: Responder[];
  selectedIncident: Incident | null;
  onSelectIncident: (incident: Incident | null) => void;
  onQuickDispatch?: (incidentId: string, responderId: string) => void;
  lang: 'en' | 'ta';
  trackedResponders?: Record<string, boolean>;
}

export default function CoimbatoreMap({
  incidents,
  responders,
  selectedIncident,
  onSelectIncident,
  onQuickDispatch,
  lang,
  trackedResponders
}: CoimbatoreMapProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showNoyyalCheckpoints, setShowNoyyalCheckpoints] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);

  // Coimbatore Coordinates Bounding Box Projection
  const mapLatitude = (lat: number) => {
    const minLat = 10.96;
    const maxLat = 11.09;
    // Invert Y axis for SVG (Y=0 is top)
    return 550 - ((lat - minLat) / (maxLat - minLat)) * 500;
  };

  const mapLongitude = (lng: number) => {
    const minLng = 76.92;
    const maxLng = 77.06;
    return 50 + ((lng - minLng) / (maxLng - minLng)) * 700;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "#EF4444"; // Red
      case "high": return "#F97316"; // Orange
      case "medium": return "#EAB308"; // Yellow
      default: return "#3B82F6"; // Blue
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case "resolved": return "stroke-emerald-500 stroke-2";
      case "on-scene": return "stroke-amber-400 stroke-2 animate-pulse";
      case "dispatched": return "stroke-indigo-400 stroke-2";
      default: return "stroke-red-500 stroke-2 animate-ping";
    }
  };

  // Render main Noyyal River path crossing Coimbatore
  const noyyalPath = useMemo(() => {
    const coords = [
      { lat: 10.9950, lng: 76.9100 }, // Western Hills entry
      { lat: 10.9960, lng: 76.9350 },
      { lat: 10.9910, lng: 76.9550 }, // Near Ukkadam Lake
      { lat: 10.9980, lng: 76.9850 }, // Near Sungam
      { lat: 10.9950, lng: 77.0150 }, // Near Singanallur Lake
      { lat: 10.9920, lng: 77.0450 }, // Outflow east
      { lat: 10.9850, lng: 77.0700 }
    ];

    return coords.map((pt, i) => {
      const x = mapLongitude(pt.lng);
      const y = mapLatitude(pt.lat);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  }, []);

  return (
    <div className="relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-[460px] flex flex-col">
      {/* Top Bar Map Controls */}
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700 tracking-wider font-mono">
            COIMBATORE GPS INCIDENT MAP (LIVE OVERLAY)
          </span>
        </div>
        <div className="flex items-center space-x-4 text-xs font-medium">
          <label className="flex items-center space-x-1.5 text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
            <input 
              type="checkbox" 
              checked={showLandmarks} 
              onChange={() => setShowLandmarks(!showLandmarks)}
              className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-1 focus:ring-indigo-500 h-3.5 w-3.5" 
            />
            <span>{lang === 'en' ? "Landmarks" : "சின்னங்கள்"}</span>
          </label>
          <label className="flex items-center space-x-1.5 text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
            <input 
              type="checkbox" 
              checked={showNoyyalCheckpoints} 
              onChange={() => setShowNoyyalCheckpoints(!showNoyyalCheckpoints)}
              className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-1 focus:ring-indigo-500 h-3.5 w-3.5" 
            />
            <span>{lang === 'en' ? "Noyyal Check Dam" : "நொய்யல் தடுப்பணைகள்"}</span>
          </label>
          <label className="flex items-center space-x-1.5 text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
            <input 
              type="checkbox" 
              checked={showHeatmap} 
              onChange={() => setShowHeatmap(!showHeatmap)}
              className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-1 focus:ring-indigo-500 h-3.5 w-3.5" 
            />
            <span>{lang === 'en' ? "Density Heatmap" : "அடர்த்தி வரைபடம்"}</span>
          </label>
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center space-x-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>GPS: OK</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="flex-1 bg-slate-50 relative overflow-hidden select-none">
        <svg 
          viewBox="0 0 800 600" 
          className="w-full h-full transition-transform duration-300 origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Map Grid lines */}
          <defs>
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="heatmapSpot" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="35%" stopColor="#f97316" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#eab308" stopOpacity="0.14" />
              <stop offset="90%" stopColor="#10b981" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#mapGrid)" />

          {/* Density Heatmap Layer */}
          {showHeatmap && (
            <g id="heatmap-overlay" style={{ mixBlendMode: "multiply" }} opacity="0.9">
              {incidents.map((incident) => {
                const x = mapLongitude(incident.location.longitude);
                const y = mapLatitude(incident.location.latitude);
                
                // Establish larger soft circles representing regional impact zone
                let radius = 55;
                if (incident.severity === "critical") radius = 85;
                else if (incident.severity === "high") radius = 70;
                else if (incident.severity === "medium") radius = 50;
                else radius = 35;

                // Resolved incidents are dimmed to represent historical/secondary weight
                const isResolved = incident.status === "resolved";
                const spotOpacity = isResolved ? 0.35 : 1.0;

                return (
                  <circle
                    key={`heat-${incident.id}`}
                    cx={x}
                    cy={y}
                    r={radius}
                    fill="url(#heatmapSpot)"
                    opacity={spotOpacity}
                  />
                );
              })}
            </g>
          )}

          {/* Noyyal River Flow */}
          <path
            d={noyyalPath}
            fill="none"
            stroke="#93c5fd"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
          />
          <path
            d={noyyalPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
            className="animate-pulse"
          />

          {/* Ukkadam Big Lake Representation */}
          <ellipse
            cx={mapLongitude(76.9625)}
            cy={mapLatitude(10.9875)}
            rx="35"
            ry="20"
            fill="#bfdbfe"
            stroke="#3b82f6"
            strokeWidth="1.5"
            opacity="0.7"
          />
          <text
            x={mapLongitude(76.9625)}
            y={mapLatitude(10.9835)}
            fill="#1e40af"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
          >
            UKKADAM LAKE
          </text>

          {/* Singanallur Lake Representation */}
          <ellipse
            cx={mapLongitude(77.0210)}
            cy={mapLatitude(11.0022)}
            rx="30"
            ry="18"
            fill="#bfdbfe"
            stroke="#3b82f6"
            strokeWidth="1.5"
            opacity="0.6"
          />
          <text
            x={mapLongitude(77.0210)}
            y={mapLatitude(10.9980)}
            fill="#1e40af"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
          >
            SINGANALLUR LAKE
          </text>

          {/* Major Road Links */}
          {/* Avinashi Road (West-East connecting Town Hall to Peelamedu) */}
          <line
            x1={mapLongitude(76.9602)}
            y1={mapLatitude(10.9964)}
            x2={mapLongitude(77.0264)}
            y2={mapLatitude(11.0289)}
            stroke="#e2e8f0"
            strokeWidth="5"
            opacity="0.9"
          />
          <line
            x1={mapLongitude(76.9602)}
            y1={mapLatitude(10.9964)}
            x2={mapLongitude(77.0264)}
            y2={mapLatitude(11.0289)}
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.9"
          />
          <text
            x={mapLongitude(76.9930)}
            y={mapLatitude(11.0120)}
            fill="#64748b"
            fontSize="8"
            fontFamily="sans-serif"
            fontWeight="bold"
            transform={`rotate(18, ${mapLongitude(76.9930)}, ${mapLatitude(11.0120)})`}
            textAnchor="middle"
          >
            AVINASHI RD
          </text>

          {/* Trichy Road */}
          <line
            x1={mapLongitude(76.9602)}
            y1={mapLatitude(10.9964)}
            x2={mapLongitude(77.0210)}
            y2={mapLatitude(11.0022)}
            stroke="#e2e8f0"
            strokeWidth="4"
            opacity="0.9"
          />

          {/* Noyyal Dam Checkpoints */}
          {showNoyyalCheckpoints && (
            <>
              <circle cx={mapLongitude(76.9550)} cy={mapLatitude(10.9910)} r="5" fill="#e11d48" opacity="0.95" />
              <text x={mapLongitude(76.9550)} y={mapLatitude(10.9910) - 8} fill="#9f1239" fontSize="8" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                GATE 1 (UKKADAM)
              </text>

              <circle cx={mapLongitude(77.0150)} cy={mapLatitude(10.9950)} r="5" fill="#e11d48" opacity="0.95" />
              <text x={mapLongitude(77.0150)} y={mapLatitude(10.9950) - 8} fill="#9f1239" fontSize="8" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                GATE 2 (SINGANALLUR)
              </text>
            </>
          )}

          {/* Coimbatore Key Landmarks */}
          {showLandmarks && COIMBATORE_LANDMARKS.map((landmark, idx) => (
            <g key={idx} opacity="0.75">
              <circle
                cx={mapLongitude(landmark.lng)}
                cy={mapLatitude(landmark.lat)}
                r="3"
                fill="#94a3b8"
              />
              <text
                x={mapLongitude(landmark.lng)}
                y={mapLatitude(landmark.lat) + 12}
                fill="#475569"
                fontSize="9"
                fontFamily="sans-serif"
                fontWeight="medium"
                textAnchor="middle"
              >
                {lang === 'en' ? landmark.name : (landmark.name === "Ukkadam Lake" ? "உக்கடம் ஏரி" : landmark.name)}
              </text>
            </g>
          ))}

          {/* Active Incidents Markers */}
          {incidents.map((incident) => {
            const x = mapLongitude(incident.location.longitude);
            const y = mapLatitude(incident.location.latitude);
            const isSelected = selectedIncident?.id === incident.id;
            const severityColor = getSeverityColor(incident.severity);

            if (incident.status === "resolved") {
              // Draw small green shield marker for resolved
              return (
                <g 
                  key={incident.id} 
                  className="cursor-pointer"
                  onClick={() => onSelectIncident(incident)}
                >
                  <circle cx={x} cy={y} r="6" fill="#10B981" opacity="0.8" />
                  <circle cx={x} cy={y} r="10" fill="none" stroke="#10B981" strokeWidth="1" />
                </g>
              );
            }

            return (
              <g 
                key={incident.id} 
                className="cursor-pointer group"
                onClick={() => onSelectIncident(incident)}
              >
                {/* Ping circle */}
                <circle 
                  cx={x} 
                  cy={y} 
                  r={isSelected ? "18" : "12"} 
                  fill="none" 
                  stroke={severityColor} 
                  strokeWidth="2" 
                  className="animate-ping"
                  opacity="0.4"
                />
                
                {/* Glow base */}
                <circle 
                  cx={x} 
                  cy={y} 
                  r={isSelected ? "14" : "9"} 
                  fill={severityColor} 
                  opacity={isSelected ? "0.45" : "0.25"}
                  className="transition-all duration-200"
                />

                {/* Core dot */}
                <circle 
                  cx={x} 
                  cy={y} 
                  r={isSelected ? "8" : "5.5"} 
                  fill={severityColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Floating flag */}
                <g transform={`translate(${x + 10}, ${y - 12})`}>
                  <rect 
                    x="0" 
                    y="-1" 
                    width={incident.title.length * 5.2 + 16} 
                    height="16" 
                    rx="3" 
                    fill="#ffffff" 
                    stroke={isSelected ? "#10b981" : "#cbd5e1"} 
                    strokeWidth="1.5"
                    opacity="0.95"
                  />
                  <text 
                    x="6" 
                    y="11" 
                    fill={isSelected ? "#059669" : "#334155"} 
                    fontSize="8.5" 
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {incident.id.toUpperCase()}: {incident.title.substring(0, 15)}...
                  </text>
                </g>
              </g>
            );
          })}

          {/* Responder Units Live Tracking */}
          {responders.map((resp) => {
            const x = mapLongitude(resp.currentCoords.longitude);
            const y = mapLatitude(resp.currentCoords.latitude);
            const isAvailable = resp.status === "available";
            const isTracked = !!trackedResponders?.[resp.id];

            return (
              <g key={resp.id} className="transition-all duration-700 ease-in-out">
                {/* GPS Telemetry Dashed Outer Rings */}
                {isTracked && (
                  <>
                    <circle
                      cx={x}
                      cy={y}
                      r="22"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      className="animate-spin"
                      style={{ transformOrigin: `${x}px ${y}px`, animationDuration: "8s" }}
                      opacity="0.85"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="30"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1"
                      strokeDasharray="2 3"
                      className="animate-spin"
                      style={{ transformOrigin: `${x}px ${y}px`, animationDuration: "12s", animationDirection: "reverse" }}
                      opacity="0.6"
                    />
                  </>
                )}

                {/* Beacon ring */}
                <circle 
                  cx={x} 
                  cy={y} 
                  r={isTracked ? "18" : "16"} 
                  fill="none" 
                  stroke={isTracked ? "#6366f1" : (isAvailable ? "#10b981" : "#f59e0b")} 
                  strokeWidth={isTracked ? "1.5" : "1"} 
                  opacity={isTracked ? "0.8" : "0.4"} 
                  className="animate-pulse"
                />

                {/* Responder Square */}
                <rect 
                  x={x - 8} 
                  y={y - 8} 
                  width="16" 
                  height="16" 
                  rx="3" 
                  fill={isTracked ? "#4f46e5" : (isAvailable ? "#10b981" : "#f59e0b")} 
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Letter indicator (F/W/M/S) */}
                <text 
                  x={x} 
                  y={y + 3.5} 
                  fill="#ffffff" 
                  fontSize="9" 
                  fontWeight="bold" 
                  textAnchor="middle" 
                  fontFamily="sans-serif"
                >
                  {resp.role.includes("Fire") ? "F" : resp.role.includes("Water") ? "W" : resp.role.includes("Medical") ? "M" : "S"}
                </text>

                {/* Live tracking indicator label */}
                {isTracked && (
                  <g transform={`translate(${x - 22}, ${y - 18})`}>
                    <rect x="0" y="0" width="44" height="8" rx="1.5" fill="#10b981" />
                    <text x="22" y="6" fill="#ffffff" fontSize="5.5" fontWeight="black" textAnchor="middle" fontFamily="monospace" className="animate-pulse">
                      🛰️ GPS LIVE
                    </text>
                  </g>
                )}

                {/* Floating label */}
                <g transform={`translate(${x - 30}, ${y + 14})`}>
                  <rect x="0" y="0" width="60" height="12" rx="2" fill={isTracked ? "#312e81" : "#1e293b"} opacity="0.95" />
                  <text x="30" y="9" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                    {resp.name.split(" ")[0]}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Map UI overlays (Zoom Controls) */}
        <div className="absolute bottom-3 left-3 flex flex-col space-y-1.5 z-10">
          <button 
            onClick={() => setZoomLevel(Math.min(zoomLevel + 0.25, 2.5))}
            className="w-8 h-8 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-lg flex items-center justify-center shadow-sm cursor-pointer transition-colors"
          >
            +
          </button>
          <button 
            onClick={() => setZoomLevel(Math.max(zoomLevel - 0.25, 0.75))}
            className="w-8 h-8 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-lg flex items-center justify-center shadow-sm cursor-pointer transition-colors"
          >
            -
          </button>
          <button 
            onClick={() => setZoomLevel(1)}
            className="w-8 h-8 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-sm cursor-pointer transition-colors"
            title="Reset Zoom"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Quick Legend */}
        <div className="absolute bottom-3 right-3 bg-white/95 border border-slate-200 px-3.5 py-2.5 rounded-lg text-[10px] space-y-1.5 text-slate-600 z-10 font-mono shadow-md">
          {showHeatmap && (
            <div className="pb-1.5 mb-1.5 border-b border-slate-100 space-y-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === 'en' ? "INCIDENT DENSITY" : "சம்பவ அடர்த்தி"}
              </span>
              <div className="flex items-center space-x-1">
                <div className="h-2 w-16 bg-gradient-to-r from-emerald-500 via-yellow-400 via-orange-400 to-red-600 rounded"></div>
                <span className="text-[8px] text-slate-400">Low → High</span>
              </div>
            </div>
          )}
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>{lang === 'en' ? "Critical Risk" : "மிக ஆபத்தானது"}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span>{lang === 'en' ? "High Emergency" : "அதிக ஆபத்து"}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span>{lang === 'en' ? "Medium Priority" : "நடுத்தர அவசரம்"}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{lang === 'en' ? "Squad Available" : "தயாராக உள்ள குழு"}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded bg-amber-500"></span>
            <span>{lang === 'en' ? "Squad Busy (On Scene)" : "பணியில் உள்ள குழு"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
