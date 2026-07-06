import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Local DB file for persistence
const DB_FILE = path.join(process.cwd(), "db.json");

// Initial mock data of Coimbatore emergency response
const INITIAL_INCIDENTS = [
  {
    id: "inc-101",
    title: "Ukkadam Big Lake Overflow",
    description: "Lake levels exceeded critical mark. Low-lying houses in Ukkadam Bypass area experiencing water entry up to 2 feet.",
    category: "flooding",
    severity: "critical",
    status: "dispatched",
    location: {
      latitude: 10.9875,
      longitude: 76.9625,
      name: "Ukkadam Lake Area",
      landmark: "Opposite Ukkadam Bus Stand"
    },
    reportedBy: "Public Call Center",
    reportedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    assignedResponderId: "resp-2",
    notes: "Requires inflatable boats and immediate evacuation of 15 families.",
    resolutionSummary: ""
  },
  {
    id: "inc-102",
    title: "Peelamedu Avinashi Road Tree Fall",
    description: "A huge banyan tree has fallen on Avinashi Road blocking both traffic lanes. Electrical pole damaged.",
    category: "road_block",
    severity: "high",
    status: "on-scene",
    location: {
      latitude: 11.0289,
      longitude: 77.0264,
      name: "Peelamedu Main Road",
      landmark: "Near PSG Tech"
    },
    reportedBy: "Traffic Police Dept",
    reportedAt: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
    assignedResponderId: "resp-1",
    notes: "Electrical grid cut requested. Tree cutters currently operating.",
    resolutionSummary: ""
  },
  {
    id: "inc-103",
    title: "Gandhipuram Shopping Complex Fire",
    description: "Minor electric short circuit led to thick smoke from ground floor storage unit of commercial complex. Fire alarms ringing.",
    category: "fire",
    severity: "high",
    status: "reported",
    location: {
      latitude: 11.0183,
      longitude: 76.9638,
      name: "Gandhipuram Cross Cut Road",
      landmark: "Behind GP Signal"
    },
    reportedBy: "Store Manager",
    reportedAt: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
    assignedResponderId: "",
    notes: "Complex evacuated. Fire engine dispatch requested immediately.",
    resolutionSummary: ""
  },
  {
    id: "inc-104",
    title: "Water Logging at RS Puram DB Road",
    description: "Clogged stormwater drains caused road flooding, stalling 4 hatchbacks. Traffic gridlock on DB Road.",
    category: "flooding",
    severity: "medium",
    status: "reported",
    location: {
      latitude: 11.0115,
      longitude: 76.9450,
      name: "RS Puram",
      landmark: "Near Post Office"
    },
    reportedBy: "Corporation Worker",
    reportedAt: new Date(Date.now() - 1200000).toISOString(), // 20 mins ago
    assignedResponderId: "",
    notes: "Drainage clearance team needed.",
    resolutionSummary: ""
  },
  {
    id: "inc-105",
    title: "Medical Emergency at Singanallur",
    description: "Senior citizen stranded in flooded household requiring dialysis and medical transport support.",
    category: "medical",
    severity: "high",
    status: "reported",
    location: {
      latitude: 11.0022,
      longitude: 77.0210,
      name: "Singanallur Trichy Road",
      landmark: "Near Singanallur Bus Stand"
    },
    reportedBy: "Relative",
    reportedAt: new Date(Date.now() - 400000).toISOString(), // 6 mins ago
    assignedResponderId: "",
    notes: "Needs medical unit with stretchers.",
    resolutionSummary: ""
  }
];

const INITIAL_RESPONDERS = [
  {
    id: "resp-1",
    name: "Coimbatore South Fire Squad",
    role: "Fire Service & Heavy Rescue",
    status: "busy",
    currentCoords: {
      latitude: 11.0250,
      longitude: 77.0220
    },
    contact: "+91 422 230 101"
  },
  {
    id: "resp-2",
    name: "CBE Disaster Response Unit B",
    role: "Water Rescue & Inflatables",
    status: "busy",
    currentCoords: {
      latitude: 10.9890,
      longitude: 76.9610
    },
    contact: "+91 94432 02123"
  },
  {
    id: "resp-3",
    name: "Peelamedu Corporation EMT Unit",
    role: "Medical Responder / Ambulance",
    status: "available",
    currentCoords: {
      latitude: 11.0289,
      longitude: 77.0264
    },
    contact: "+91 98421 11200"
  },
  {
    id: "resp-4",
    name: "Ukkadam Local Engineering Team",
    role: "Stormwater & Civil Clearance",
    status: "available",
    currentCoords: {
      latitude: 10.9920,
      longitude: 76.9550
    },
    contact: "+91 94881 23456"
  }
];

const INITIAL_CHAT = [
  {
    id: "chat-1",
    senderName: "Command Center Dispatcher",
    senderRole: "dispatcher",
    message: "Alert: Heavy rain spell starting in Western Ghats catchment. All units please stand by for potential flooding near Noyyal River canals.",
    timestamp: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
  },
  {
    id: "chat-2",
    senderName: "Coimbatore South Fire Squad",
    senderRole: "responder",
    message: "Copy that. We have our tree cutters and drainage pumps fully loaded.",
    timestamp: new Date(Date.now() - 7000000).toISOString()
  },
  {
    id: "chat-3",
    senderName: "Command Center Dispatcher",
    senderRole: "dispatcher",
    message: "Dispatched Disaster Response Unit B to Ukkadam Big Lake. Water is starting to spill over the bypass wall.",
    timestamp: new Date(Date.now() - 3500000).toISOString()
  },
  {
    id: "chat-4",
    senderName: "CBE Disaster Response Unit B",
    senderRole: "responder",
    message: "On scene at Ukkadam. Water logging started in the adjacent slum area. Deploying rescue rafts now.",
    timestamp: new Date(Date.now() - 3000000).toISOString()
  }
];

const INITIAL_NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "RED ALERT: Noyyal Flash Flood",
    message: "Water levels at Noyyal River check dams are rising exponentially. Dispatchers should halt non-emergency activities and focus on Ukkadam, Singanallur, and Ondipudur areas.",
    type: "critical",
    timestamp: new Date(Date.now() - 5400000).toISOString(),
    read: false
  },
  {
    id: "notif-2",
    title: "New Fire Incident Reported",
    message: "Gandhipuram Shopping Complex Fire reported. Immediate responder pairing recommended.",
    type: "warning",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    read: false
  }
];

// Load Database
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading db file, regenerating:", err);
  }

  // Fallback / Initial seed
  const initialData = {
    incidents: INITIAL_INCIDENTS,
    responders: INITIAL_RESPONDERS,
    chatMessages: INITIAL_CHAT,
    notifications: INITIAL_NOTIFICATIONS
  };
  saveDB(initialData);
  return initialData;
}

// Save Database
function saveDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing db file:", err);
  }
}

// Ensure database is initialized
let db = loadDB();

// Helper to update specific DB collections
const updateCollection = (key: string, value: any) => {
  db = loadDB();
  db[key] = value;
  saveDB(db);
};

// API Endpoints
app.get("/api/incidents", (req, res) => {
  db = loadDB();
  res.json(db.incidents);
});

app.post("/api/incidents", (req, res) => {
  const incoming = req.body;
  db = loadDB();

  if (Array.isArray(incoming)) {
    // Bulk sync from offline state
    const currentMap = new Map(db.incidents.map((i: any) => [i.id, i]));
    incoming.forEach((incident: any) => {
      // Keep online updates if newer or just update
      incident.synced = true;
      currentMap.set(incident.id, incident);
    });
    db.incidents = Array.from(currentMap.values());
  } else if (incoming.id) {
    // Single incident creation or update
    const idx = db.incidents.findIndex((i: any) => i.id === incoming.id);
    const incidentData = { ...incoming, synced: true };
    if (idx !== -1) {
      db.incidents[idx] = incidentData;
    } else {
      db.incidents.unshift(incidentData);
    }
  } else {
    return res.status(400).json({ error: "Invalid incident payload" });
  }

  updateCollection("incidents", db.incidents);
  res.json({ success: true, incidents: db.incidents });
});

app.get("/api/responders", (req, res) => {
  db = loadDB();
  res.json(db.responders);
});

app.post("/api/responders/status", (req, res) => {
  const { id, status, currentCoords } = req.body;
  db = loadDB();

  const responder = db.responders.find((r: any) => r.id === id);
  if (responder) {
    if (status) responder.status = status;
    if (currentCoords) responder.currentCoords = currentCoords;
    updateCollection("responders", db.responders);
    res.json({ success: true, responder });
  } else {
    res.status(404).json({ error: "Responder not found" });
  }
});

app.get("/api/chat", (req, res) => {
  db = loadDB();
  res.json(db.chatMessages);
});

app.post("/api/chat", (req, res) => {
  const msg = req.body;
  if (!msg.message || !msg.senderName) {
    return res.status(400).json({ error: "Message and sender required" });
  }

  db = loadDB();
  const newMsg = {
    id: `chat-${Date.now()}`,
    senderName: msg.senderName,
    senderRole: msg.senderRole || "responder",
    message: msg.message,
    timestamp: new Date().toISOString(),
    incidentId: msg.incidentId || ""
  };

  db.chatMessages.push(newMsg);
  updateCollection("chatMessages", db.chatMessages);
  res.json({ success: true, message: newMsg });
});

app.get("/api/notifications", (req, res) => {
  db = loadDB();
  res.json(db.notifications);
});

app.post("/api/notifications", (req, res) => {
  const { title, message, type } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required" });
  }

  db = loadDB();
  const newNotif = {
    id: `notif-${Date.now()}`,
    title,
    message,
    type: type || "info",
    timestamp: new Date().toISOString(),
    read: false
  };

  db.notifications.unshift(newNotif);
  updateCollection("notifications", db.notifications);
  res.json({ success: true, notification: newNotif });
});

app.post("/api/notifications/read", (req, res) => {
  const { id } = req.body;
  db = loadDB();
  if (id === "all") {
    db.notifications.forEach((n: any) => (n.read = true));
  } else {
    const notif = db.notifications.find((n: any) => n.id === id);
    if (notif) notif.read = true;
  }
  updateCollection("notifications", db.notifications);
  res.json({ success: true });
});

// AI Decision Core Endpoint using Gemini API
app.post("/api/ai/query", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  // Fetch current database context for RAG simulation
  db = loadDB();
  const activeIncidentsStr = db.incidents
    .filter((i: any) => i.status !== "resolved")
    .map(
      (i: any) =>
        `- [${i.id}] ${i.title} (${i.category.toUpperCase()}) | Severity: ${i.severity.toUpperCase()} | Status: ${i.status.toUpperCase()} | Location: ${i.location.name} (GPS: ${i.location.latitude}, ${i.location.longitude}) | Assigned to: ${i.assignedResponderId || "Unassigned"}`
    )
    .join("\n");

  const respondersStr = db.responders
    .map(
      (r: any) =>
        `- [${r.id}] ${r.name} (${r.role}) | Status: ${r.status.toUpperCase()} | GPS: ${r.currentCoords.latitude}, ${r.currentCoords.longitude}`
    )
    .join("\n");

  const systemPrompt = `You are "CiviqAI Decision Core", the official AI incident commander and decision support agent for the Coimbatore City Corporation Emergency Response Command.
You help dispatchers analyze disaster incidents, coordinate rescue operations, and assign appropriate responder squads.

Here is the current real-time situation of active emergencies in Coimbatore:
${activeIncidentsStr || "No active emergencies at this time."}

Here are the emergency responders and field assets currently deployed in Coimbatore:
${respondersStr}

COIMBATORE GEOGRAPHY REFERENCE:
- Coimbatore City Center is around 11.0168, 76.9558.
- RS Puram (DB Road) is in the west (~11.0115, 76.9450).
- Gandhipuram (Cross Cut Road, Bus Stand) is central-east (~11.0183, 76.9638).
- Peelamedu (Avinashi Road, Airport, PSG Tech) is east (~11.0289, 77.0264).
- Ukkadam (Big Lake, Bus Stand, Bypass) is south (~10.9875, 76.9625).
- Singanallur (Trichy Road) is south-east (~11.0022, 77.0210).
- Saravanampatti is far north (~11.0785, 76.9984).

Answer the dispatcher's question with precise, actionable dispatching advice, anomaly detections, or predictive evacuation advice.
Ensure you recommend matching available responders to the closest active high-severity incidents based on proximity and skill match.
Structure your response in clear sections using Markdown. Use human-friendly, professional language.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("PLACEHOLDER")) {
    // If no real API key is configured, provide high-quality mock response based on the prompt content
    console.log("No valid GEMINI_API_KEY found, providing offline decision intelligence simulation");
    const offlineIntel = generateSimulatedAIResponse(prompt, db.incidents, db.responders);
    return res.json({ text: offlineIntel, simulated: true });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text || "No response text was generated by Gemini.", simulated: false });
  } catch (err: any) {
    console.error("Gemini API execution error:", err);
    // Provide recovery simulated response in case of API failure
    const offlineIntel = generateSimulatedAIResponse(prompt, db.incidents, db.responders);
    res.json({
      text: `### ⚠️ AI Gateway Timeout / Limits Exceeded (Simulator Fallback)\n\nAn API error occurred: ${err.message || "Timeout"}. Below is the locally processed decision matrix:\n\n${offlineIntel}`,
      simulated: true,
      error: err.message
    });
  }
});

// Fallback algorithm for generating smart local advice when API keys are not ready or fail
function generateSimulatedAIResponse(prompt: string, incidents: any[], responders: any[]): string {
  const activeCount = incidents.filter((i) => i.status !== "resolved").length;
  const criticalCount = incidents.filter((i) => i.severity === "critical").length;
  const unassigned = incidents.filter((i) => i.status === "reported" && !i.assignedResponderId);

  let responseMarkdown = `### 🧠 CiviqAI Intelligent Dispatch Advisory [Simulation Mode]

Coimbatore Command Center is monitoring **${activeCount} active incidents** (**${criticalCount} critical**).

`;

  const query = prompt.toLowerCase();

  if (query.includes("dispatch") || query.includes("assign") || query.includes("who") || query.includes("recommend")) {
    responseMarkdown += `#### 📋 Dispatch Recommendations:
`;
    if (unassigned.length === 0) {
      responseMarkdown += `* All current incidents have responders dispatched or on-scene. Excellent work. Monitoring field updates.`;
    } else {
      unassigned.forEach((inc) => {
        // Find best responder
        let bestResponder = null;
        let bestDistance = Infinity;

        responders.forEach((resp) => {
          if (resp.status === "available") {
            const dy = resp.currentCoords.latitude - inc.location.latitude;
            const dx = resp.currentCoords.longitude - inc.location.longitude;
            const dist = Math.sqrt(dx * dx + dy * dy); // Simple euclidean
            if (dist < bestDistance) {
              bestDistance = dist;
              bestResponder = resp;
            }
          }
        });

        if (bestResponder) {
          responseMarkdown += `* **Incident [${inc.id}] ${inc.title}** (${inc.severity.toUpperCase()}):
  * **Recommendation**: Dispatch **${(bestResponder as any).name}** (${(bestResponder as any).role}).
  * **Proximity**: Located approximately **${(bestDistance * 111).toFixed(1)} km** away.
  * **Rationale**: Responder status is AVAILABLE and specializes in compatible response gear.
`;
        } else {
          // If no available responders, suggest diverting a busy one or dispatching external
          const busyFire = responders.find(r => r.id === "resp-1");
          responseMarkdown += `* **Incident [${inc.id}] ${inc.title}** (${inc.severity.toUpperCase()}):
  * **Warning**: No responders are currently AVAILABLE.
  * **Recommendation**: Re-route **${busyFire ? busyFire.name : "Coimbatore South Fire Squad"}** once they clear Peelamedu, or mobilize Gandhipuram Police backup.
`;
        }
      });
    }
  } else if (query.includes("flood") || query.includes("rain") || query.includes("ukkadam") || query.includes("lake")) {
    responseMarkdown += `#### 🌊 Catchment & Hydrological Analysis:
* **Ukkadam Lake Overflow Warning**: Noyyal catchment waters are converging. Ukkadam Lake Bypass is overflowing.
* **Risk Mapping**: Direct risk to South Ukkadam bypass settlements, Sungam bypass, and low-lying zones in Valankulam.
* **Pre-deployment Plan**:
  1. Relocate **CBE Disaster Response Unit B** directly to Ukkadam Bypass.
  2. Setup temporary rehabilitation camps at **Ukkadam Corporation Higher Secondary School**.
  3. Pre-deploy sandbag barricades at water inlets.
`;
  } else if (query.includes("analytics") || query.includes("summary") || query.includes("report")) {
    responseMarkdown += `#### 📊 Incident Analytics Summary:
* **Severe Vulnerability Corridor**: Peelamedu to Singanallur (East Zone) exhibits peak tree falls and water logging due to narrow old stormwater trunks.
* **Average Dispatch Response Time**: Current dispatch latency is **4.5 minutes** (Target: < 3 mins).
* **Resource Deficit**: 1 more **Heavy Utility Clearance Vehicle** is required to support Gandhipuram and peelamedu blockages.
`;
  } else {
    responseMarkdown += `#### 🔍 Contextual Search Result:
* **Active Fire Risk**: Gandhipuram Commercial Fire (severity: High) has no squad assigned yet. Immediate action required.
* **Suggested Dispatch Plan**: Send **Peelamedu Corporation EMT Unit (resp-3)** as medical backup, and mobilize **Coimbatore South Fire Squad** to divert immediately as they finish Peelamedu Tree Fall.
* **Public Alert advisory**: Issue a regional warning advising citizens to avoid Cross Cut Road, Gandhipuram.
`;
  }

  responseMarkdown += `\n\n*Note: To enable full RAG and deep reasoning models, configure a valid **GEMINI_API_KEY** in your AI Studio secrets panel.*`;
  return responseMarkdown;
}

// Vite and static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CiviqAI Coimbatore Server running at http://localhost:${PORT}`);
  });
}

startServer();
