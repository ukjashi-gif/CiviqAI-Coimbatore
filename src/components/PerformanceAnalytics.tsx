import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Activity, ShieldCheck, Heart, AlertTriangle, TrendingUp, Clock, UserCheck } from "lucide-react";
import { Incident, Responder } from "../types";

interface PerformanceAnalyticsProps {
  incidents: Incident[];
  responders: Responder[];
  lang: 'en' | 'ta';
}

export default function PerformanceAnalytics({ incidents, responders, lang }: PerformanceAnalyticsProps) {
  // Aggregate severity data
  const severityData = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    incidents.forEach((inc) => {
      if (counts[inc.severity] !== undefined) {
        counts[inc.severity]++;
      }
    });

    return [
      { name: lang === 'en' ? "Critical" : "மிக ஆபத்தானது", value: counts.critical, color: "#EF4444" },
      { name: lang === 'en' ? "High" : "அதிக ஆபத்து", value: counts.high, color: "#F97316" },
      { name: lang === 'en' ? "Medium" : "நடுத்தர அவசரம்", value: counts.medium, color: "#EAB308" },
      { name: lang === 'en' ? "Low" : "குறைந்த அவசரம்", value: counts.low, color: "#3B82F6" }
    ].filter(item => item.value > 0);
  }, [incidents, lang]);

  // Aggregate category data
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {
      flooding: 0,
      fire: 0,
      road_block: 0,
      medical: 0,
      power_outage: 0,
      other: 0
    };

    incidents.forEach((inc) => {
      if (categories[inc.category] !== undefined) {
        categories[inc.category]++;
      } else {
        categories.other = (categories.other || 0) + 1;
      }
    });

    return [
      { category: lang === 'en' ? "Flooding" : "வெள்ளம்", count: categories.flooding, fill: "#3B82F6" },
      { category: lang === 'en' ? "Fire" : "தீ விபத்து", count: categories.fire, fill: "#EF4444" },
      { category: lang === 'en' ? "Road Block" : "சாலை அடைப்பு", count: categories.road_block, fill: "#A855F7" },
      { category: lang === 'en' ? "Medical" : "மருத்துவ உதவி", count: categories.medical, fill: "#10B981" },
      { category: lang === 'en' ? "Power Outage" : "மின் தடை", count: categories.power_outage, fill: "#EAB308" }
    ];
  }, [incidents, lang]);

  // Sector response speed index (Simulated data linked to locations)
  const sectorResponseTimes = useMemo(() => {
    return [
      { sector: "RS Puram", avgTimeMins: 11, targetTime: 8 },
      { sector: "Gandhipuram", avgTimeMins: 14, targetTime: 8 },
      { sector: "Ukkadam", avgTimeMins: 7, targetTime: 8 },
      { sector: "Peelamedu", avgTimeMins: 12, targetTime: 8 },
      { sector: "Singanallur", avgTimeMins: 9, targetTime: 8 },
      { sector: "Saravanampatti", avgTimeMins: 16, targetTime: 12 }
    ];
  }, []);

  // Aggregate responder status data
  const responderStatusData = useMemo(() => {
    const busy = responders.filter((r) => r.status === "busy").length;
    const available = responders.filter((r) => r.status === "available").length;

    return [
      { name: lang === 'en' ? "Available" : "தயார்", value: available, color: "#10B981" },
      { name: lang === 'en' ? "Busy" : "பணியில்", value: busy, color: "#F59E0B" }
    ];
  }, [responders, lang]);

  // Compute stats
  const totalIncidents = incidents.length;
  const resolvedCount = incidents.filter((i) => i.status === "resolved").length;
  const activeCount = totalIncidents - resolvedCount;
  const criticalCount = incidents.filter((i) => i.severity === "critical").length;
  const busyResponders = responders.filter((r) => r.status === "busy").length;
  const availableResponders = responders.length - busyResponders;

  const resolutionRate = totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl flex items-center space-x-4 shadow-sm">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
              {lang === 'en' ? "Resolution Rate" : "தீர்வு விகிதம்"}
            </p>
            <p className="text-2xl font-bold font-mono text-emerald-600">
              {resolutionRate}%
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              {resolvedCount} of {totalIncidents} resolved
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl flex items-center space-x-4 shadow-sm">
          <div className="p-3 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
              {lang === 'en' ? "Active Queue" : "செயலில் உள்ளவை"}
            </p>
            <p className="text-2xl font-bold font-mono text-rose-600">
              {activeCount}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              {criticalCount} categorized CRITICAL
            </p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl flex items-center space-x-4 shadow-sm">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
              {lang === 'en' ? "Squad Capacity" : "குழு திறன்"}
            </p>
            <p className="text-2xl font-bold font-mono text-blue-600">
              {availableResponders}/{responders.length}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              {availableResponders} active and available
            </p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl flex items-center space-x-4 shadow-sm">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
              {lang === 'en' ? "Avg Response Time" : "சராசரி எதிர்வினை நேரம்"}
            </p>
            <p className="text-2xl font-bold font-mono text-amber-600">
              11.5m
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              Target Limit: 8.0m
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Category breakdown bar chart */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="mb-4">
            <h4 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'en' ? "EMERGENCY INCIDENT DISTRIBUTION" : "சம்பவ வகை விநியோகம்"}</span>
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">Live category telemetry for Coimbatore districts</p>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }} 
                  labelStyle={{ color: "#0f172a", fontSize: "11px", fontWeight: "bold" }}
                  itemStyle={{ fontSize: "11px", color: "#334155" }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Response times line chart */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="mb-4">
            <h4 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>{lang === 'en' ? "AVERAGE RESPONSE TIME BY SECTOR (MINS)" : "மண்டல வாரியாக சராசரி எதிர்வினை நேரம்"}</span>
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">Comparing real-world dispatch speed to targets</p>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sectorResponseTimes} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="sector" stroke="#64748b" fontSize={8} />
                <YAxis stroke="#64748b" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }} 
                  labelStyle={{ color: "#0f172a", fontSize: "11px", fontWeight: "bold" }}
                  itemStyle={{ fontSize: "11px", color: "#334155" }}
                />
                <Legend wrapperStyle={{ fontSize: "9px", color: "#475569" }} />
                <Line type="monotone" dataKey="avgTimeMins" stroke="#d97706" activeDot={{ r: 6 }} strokeWidth={2.5} name="Actual (mins)" />
                <Line type="monotone" dataKey="targetTime" stroke="#059669" strokeDasharray="4 4" strokeWidth={1.5} name="Target Limit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity pie chart */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="mb-4">
            <h4 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>{lang === 'en' ? "INCIDENT SEVERITY RATIO" : "அவசர தீவிரம் விகிதம்"}</span>
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">Proportion of active cases requiring attention</p>
          </div>
          <div className="h-[160px] w-full flex items-center justify-center">
            {severityData.length === 0 ? (
              <div className="text-[11px] font-mono italic text-slate-400">No active incidents to graph.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }} 
                    itemStyle={{ fontSize: "11px", color: "#334155" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "9px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Responder status doughnut chart */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="mb-4">
            <h4 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'en' ? "RESPONDER STATUS RATIO" : "பணியாளர்கள் நிலை விகிதம்"}</span>
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">Duty status of field deployment units</p>
          </div>
          <div className="h-[160px] w-full flex items-center justify-center">
            {responders.length === 0 ? (
              <div className="text-[11px] font-mono italic text-slate-400">No responders to graph.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={responderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {responderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }} 
                    itemStyle={{ fontSize: "11px", color: "#334155" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "9px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
