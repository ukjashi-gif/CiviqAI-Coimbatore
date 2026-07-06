export type UserRole = 'dispatcher' | 'responder' | 'admin';
export type AppLanguage = 'en' | 'ta';

export type IncidentStatus = 'reported' | 'dispatched' | 'on-scene' | 'resolved';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentCategory = 'flooding' | 'fire' | 'road_block' | 'medical' | 'power_outage' | 'other';

export interface Location {
  latitude: number;
  longitude: number;
  name: string;
  landmark?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: Location;
  reportedBy: string;
  reportedAt: string;
  assignedResponderId?: string;
  notes?: string;
  synced?: boolean; // For offline support tracking
  resolutionSummary?: string;
}

export interface Responder {
  id: string;
  name: string;
  role: string; // e.g. "Water Rescue", "Medical Squad", "Fire Service"
  status: 'available' | 'busy' | 'offline';
  currentCoords: {
    latitude: number;
    longitude: number;
  };
  contact: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: string; // dispatcher, responder id, etc.
  message: string;
  timestamp: string;
  incidentId?: string; // Optional contextual chat
}

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  timestamp: string;
  read: boolean;
}

export interface CustomWidget {
  id: string;
  type: 'stat' | 'map_legend' | 'weather' | 'activity_log';
  title: string;
  visible: boolean;
}
