export type StaffRole = 'superadmin' | 'admin' | 'agent';

export interface StaffUser {
  id: string;
  username: string;
  name: string;
  role: StaffRole;
  createdAt?: number;
}

export interface CustomerLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  city?: string;
  region?: string;
  country?: string;
  address?: string;
}

export interface CustomerSession {
  id: string;
  ip: string;
  mac: string;
  userAgent: string;
  deviceType: string;
  location: CustomerLocation;
  joinedAt: number;
  lastActive: number;
  assignedAgentId?: string;
  isMicActive: boolean;
}

export interface CallLog {
  id: string;
  customerId: string;
  customerIp: string;
  customerMac: string;
  agentId: string;
  agentName: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds?: number;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  customerId?: string;
  sender: string;
  text: string;
  timestamp: number;
  isAgent: boolean;
}
