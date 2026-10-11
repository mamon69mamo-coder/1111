import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const httpServer = http.createServer(app);

app.use(express.json({ limit: '10mb' }));

interface CustomerLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  city?: string;
  region?: string;
  country?: string;
  address?: string;
}

interface CustomerSession {
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
  ws?: WebSocket;
}

interface AgentSession {
  id: string;
  username: string;
  name: string;
  role: 'superadmin' | 'admin' | 'agent';
  joinedAt: number;
  activeCustomerId?: string;
  ws?: WebSocket;
}

// In-memory staff list (pre-populated with super admin, admin, and agent)
const staffDatabase = [
  {
    id: 'user-super-1',
    username: 'superadmin',
    password: 'admin123',
    name: 'Super Admin HQ (হেডকোয়ার্টার)',
    role: 'superadmin' as const,
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'user-admin-1',
    username: 'admin1',
    password: 'admin123',
    name: 'Shakil Ahmed (টিম লিডার)',
    role: 'admin' as const,
    createdAt: Date.now() - 86400000 * 14,
  },
  {
    id: 'user-agent-1',
    username: 'agent1',
    password: 'admin123',
    name: 'Fatima Begum (কেয়ার অফিসার ১)',
    role: 'agent' as const,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'user-agent-2',
    username: 'agent2',
    password: 'admin123',
    name: 'Tanvir Hossain (কেয়ার অফিসার ২)',
    role: 'agent' as const,
    createdAt: Date.now() - 86400000 * 3,
  },
];

const activeCustomers = new Map<string, CustomerSession>();
const activeAgents = new Map<string, AgentSession>();
const callLogs: Array<{
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
}> = [];

// Helper to sanitize customer payload for broadcast (omit WebSocket)
function sanitizeCustomer(c: CustomerSession) {
  return {
    id: c.id,
    ip: c.ip,
    mac: c.mac,
    userAgent: c.userAgent,
    deviceType: c.deviceType,
    location: c.location,
    joinedAt: c.joinedAt,
    lastActive: c.lastActive,
    assignedAgentId: c.assignedAgentId,
    isMicActive: c.isMicActive,
  };
}

// Helper to broadcast to all connected agents
function broadcastToAgents(payload: any) {
  const data = JSON.stringify(payload);
  activeAgents.forEach((agent) => {
    if (agent.ws && agent.ws.readyState === WebSocket.OPEN) {
      agent.ws.send(data);
    }
  });
}

// REST API Endpoints
app.get('/api/ip-info', (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || '103.145.24.12';
  
  res.json({
    ip: ip.replace(/^.*:/, '') || '103.145.24.12',
    userAgent: req.headers['user-agent'] || 'Unknown Device',
    timestamp: Date.now()
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const staff = staffDatabase.find(
    (u) => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
  );

  if (!staff) {
    return res.status(401).json({ error: 'Invalid login credentials (ভুল আইডি বা পাসওয়ার্ড)' });
  }

  const token = `token-${staff.id}-${Date.now()}`;
  return res.json({
    success: true,
    token,
    user: {
      id: staff.id,
      username: staff.username,
      name: staff.name,
      role: staff.role,
    },
  });
});

app.get('/api/staff', (_req, res) => {
  res.json({
    staff: staffDatabase.map((s) => ({
      id: s.id,
      username: s.username,
      name: s.name,
      role: s.role,
      createdAt: s.createdAt,
    })),
  });
});

app.post('/api/staff', (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (staffDatabase.some((s) => s.username.toLowerCase() === username.toLowerCase().trim())) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const newStaff = {
    id: `user-${Date.now()}`,
    username: username.toLowerCase().trim(),
    password,
    name,
    role: role as 'admin' | 'agent',
    createdAt: Date.now(),
  };
  staffDatabase.push(newStaff);

  res.json({ success: true, staff: newStaff });
});

app.get('/api/stats', (_req, res) => {
  const customersArray = Array.from(activeCustomers.values()).map(sanitizeCustomer);
  const agentsArray = Array.from(activeAgents.values()).map((a) => ({
    id: a.id,
    name: a.name,
    username: a.username,
    role: a.role,
    activeCustomerId: a.activeCustomerId,
  }));

  res.json({
    onlineCustomersCount: activeCustomers.size,
    onlineAgentsCount: activeAgents.size,
    customers: customersArray,
    agents: agentsArray,
    totalCallLogs: callLogs.length,
    callLogs: callLogs.slice(-20).reverse(),
  });
});

// WebSocket Server
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws: WebSocket, req) => {
  let clientType: 'customer' | 'agent' | null = null;
  let clientId: string | null = null;

  const clientIp = typeof req.headers['x-forwarded-for'] === 'string'
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : req.socket.remoteAddress?.replace(/^.*:/, '') || '103.145.24.12';

  ws.on('message', (message: string | Buffer) => {
    try {
      const parsed = JSON.parse(message.toString());
      const { type, payload } = parsed;

      switch (type) {
        // Customer registers upon entering website
        case 'REGISTER_CUSTOMER': {
          clientType = 'customer';
          clientId = payload.id;

          const customer: CustomerSession = {
            id: payload.id,
            ip: clientIp || payload.ip || '103.145.24.12',
            mac: payload.mac || '5A:4B:C8:92:D1:0E',
            userAgent: req.headers['user-agent'] || payload.userAgent || 'Web Client',
            deviceType: payload.deviceType || 'Desktop Browser',
            location: payload.location || {
              lat: 23.8103,
              lng: 90.4125,
              city: 'Dhaka',
              country: 'Bangladesh',
              address: 'Dhaka, Bangladesh',
            },
            joinedAt: Date.now(),
            lastActive: Date.now(),
            isMicActive: false,
            ws,
          };

          activeCustomers.set(customer.id, customer);

          // Confirm back to customer
          ws.send(JSON.stringify({
            type: 'CUSTOMER_REGISTERED',
            payload: sanitizeCustomer(customer),
          }));

          // Notify all agents immediately!
          broadcastToAgents({
            type: 'CUSTOMER_ONLINE_ALERT',
            payload: {
              customer: sanitizeCustomer(customer),
              message: `🚨 নতুন কাস্টমার অনলাইনে এসেছে! IP: ${customer.ip} | MAC: ${customer.mac} | লোকেশন: ${customer.location.city || 'চিহ্নিত এলাকা'}`,
              timestamp: Date.now(),
            },
          });
          break;
        }

        // Customer updates GPS location
        case 'UPDATE_CUSTOMER_LOCATION': {
          if (clientId && activeCustomers.has(clientId)) {
            const customer = activeCustomers.get(clientId)!;
            customer.location = payload.location;
            customer.lastActive = Date.now();
            activeCustomers.set(clientId, customer);

            broadcastToAgents({
              type: 'CUSTOMER_LOCATION_UPDATED',
              payload: {
                customerId: clientId,
                location: payload.location,
              },
            });
          }
          break;
        }

        // Customer toggle mic active status
        case 'CUSTOMER_MIC_STATUS': {
          if (clientId && activeCustomers.has(clientId)) {
            const customer = activeCustomers.get(clientId)!;
            customer.isMicActive = Boolean(payload.isActive);
            customer.lastActive = Date.now();

            broadcastToAgents({
              type: 'CUSTOMER_MIC_STATUS_CHANGED',
              payload: {
                customerId: clientId,
                isMicActive: customer.isMicActive,
              },
            });
          }
          break;
        }

        // Customer sends live audio chunk
        case 'CUSTOMER_AUDIO_CHUNK': {
          if (clientId && activeCustomers.has(clientId)) {
            const customer = activeCustomers.get(clientId)!;
            customer.lastActive = Date.now();

            // Forward to assigned agent, or all active agents monitoring this customer
            const targetAgentId = customer.assignedAgentId;
            let delivered = false;

            if (targetAgentId && activeAgents.has(targetAgentId)) {
              const agent = activeAgents.get(targetAgentId)!;
              if (agent.ws && agent.ws.readyState === WebSocket.OPEN) {
                agent.ws.send(JSON.stringify({
                  type: 'INCOMING_CUSTOMER_AUDIO',
                  payload: {
                    customerId: clientId,
                    audioData: payload.audioData,
                    timestamp: Date.now(),
                  },
                }));
                delivered = true;
              }
            }

            // Also forward to any agent currently listening/viewing this customer
            activeAgents.forEach((agent) => {
              if (agent.id !== targetAgentId && agent.activeCustomerId === clientId && agent.ws?.readyState === WebSocket.OPEN) {
                agent.ws.send(JSON.stringify({
                  type: 'INCOMING_CUSTOMER_AUDIO',
                  payload: {
                    customerId: clientId,
                    audioData: payload.audioData,
                    timestamp: Date.now(),
                  },
                }));
                delivered = true;
              }
            });

            // If no agent specifically locked, broadcast to all agents so they can hear customer speaking
            if (!delivered) {
              broadcastToAgents({
                type: 'INCOMING_CUSTOMER_AUDIO',
                payload: {
                  customerId: clientId,
                  audioData: payload.audioData,
                  timestamp: Date.now(),
                },
              });
            }
          }
          break;
        }

        // Agent registers
        case 'REGISTER_AGENT': {
          clientType = 'agent';
          clientId = payload.id;

          const agent: AgentSession = {
            id: payload.id,
            username: payload.username,
            name: payload.name,
            role: payload.role || 'agent',
            joinedAt: Date.now(),
            ws,
          };

          activeAgents.set(agent.id, agent);

          // Send current active customers list
          const currentCustomers = Array.from(activeCustomers.values()).map(sanitizeCustomer);
          ws.send(JSON.stringify({
            type: 'AGENT_INIT_DATA',
            payload: {
              customers: currentCustomers,
              agents: Array.from(activeAgents.values()).map((a) => ({
                id: a.id,
                name: a.name,
                username: a.username,
                role: a.role,
              })),
            },
          }));
          break;
        }

        // Agent selects/locks a customer
        case 'AGENT_SELECT_CUSTOMER': {
          if (clientId && activeAgents.has(clientId)) {
            const agent = activeAgents.get(clientId)!;
            agent.activeCustomerId = payload.customerId;
            activeAgents.set(clientId, agent);

            if (payload.customerId && activeCustomers.has(payload.customerId)) {
              const customer = activeCustomers.get(payload.customerId)!;
              customer.assignedAgentId = agent.id;
              activeCustomers.set(payload.customerId, customer);

              broadcastToAgents({
                type: 'CUSTOMER_ASSIGNED',
                payload: {
                  customerId: payload.customerId,
                  agentId: agent.id,
                  agentName: agent.name,
                },
              });
            }
          }
          break;
        }

        // Agent presses PTT (Push-To-Talk)
        case 'PTT_START': {
          const { targetCustomerId, agentName, isBroadcast } = payload;
          if (isBroadcast) {
            // Broadcast announcement to ALL online customers
            activeCustomers.forEach((c) => {
              if (c.ws && c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(JSON.stringify({
                  type: 'LIVE_ANNOUNCEMENT_START',
                  payload: {
                    agentName: agentName || 'Customer Care Team',
                    isBroadcast: true,
                  },
                }));
              }
            });
          } else if (targetCustomerId && activeCustomers.has(targetCustomerId)) {
            const customer = activeCustomers.get(targetCustomerId)!;
            if (customer.ws && customer.ws.readyState === WebSocket.OPEN) {
              customer.ws.send(JSON.stringify({
                type: 'LIVE_ANNOUNCEMENT_START',
                payload: {
                  agentName: agentName || 'Customer Care Team',
                  isBroadcast: false,
                },
              }));
            }
          }

          // Record call log start
          if (targetCustomerId) {
            const targetCustomer = activeCustomers.get(targetCustomerId);
            callLogs.push({
              id: `call-${Date.now()}`,
              customerId: targetCustomerId,
              customerIp: targetCustomer?.ip || 'Unknown',
              customerMac: targetCustomer?.mac || 'Unknown',
              agentId: clientId || 'agent',
              agentName: payload.agentName || 'Agent',
              startedAt: Date.now(),
            });
          }
          break;
        }

        // Agent audio chunk during PTT
        case 'AGENT_AUDIO_CHUNK': {
          const { targetCustomerId, audioData, isBroadcast } = payload;
          if (isBroadcast) {
            // Send audio to all active customers
            const outMessage = JSON.stringify({
              type: 'INCOMING_AGENT_AUDIO',
              payload: {
                audioData,
                agentName: payload.agentName || 'Customer Care Team',
                isBroadcast: true,
              },
            });
            activeCustomers.forEach((c) => {
              if (c.ws && c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(outMessage);
              }
            });
          } else if (targetCustomerId && activeCustomers.has(targetCustomerId)) {
            const customer = activeCustomers.get(targetCustomerId)!;
            if (customer.ws && customer.ws.readyState === WebSocket.OPEN) {
              customer.ws.send(JSON.stringify({
                type: 'INCOMING_AGENT_AUDIO',
                payload: {
                  audioData,
                  agentName: payload.agentName || 'Customer Care Agent',
                  isBroadcast: false,
                },
              }));
            }
          }
          break;
        }

        // Agent releases PTT
        case 'PTT_END': {
          const { targetCustomerId, isBroadcast } = payload;
          if (isBroadcast) {
            activeCustomers.forEach((c) => {
              if (c.ws && c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(JSON.stringify({
                  type: 'LIVE_ANNOUNCEMENT_END',
                  payload: {},
                }));
              }
            });
          } else if (targetCustomerId && activeCustomers.has(targetCustomerId)) {
            const customer = activeCustomers.get(targetCustomerId)!;
            if (customer.ws && customer.ws.readyState === WebSocket.OPEN) {
              customer.ws.send(JSON.stringify({
                type: 'LIVE_ANNOUNCEMENT_END',
                payload: {},
              }));
            }
          }

          // Update last call log
          if (targetCustomerId) {
            const lastLog = callLogs.slice().reverse().find((l) => l.customerId === targetCustomerId && !l.endedAt);
            if (lastLog) {
              lastLog.endedAt = Date.now();
              lastLog.durationSeconds = Math.max(1, Math.round((lastLog.endedAt - lastLog.startedAt) / 1000));
            }
          }
          break;
        }

        // Text chat message between agent and customer
        case 'CHAT_MESSAGE': {
          const { sender, recipientId, text, isAgent } = payload;
          if (isAgent && recipientId && activeCustomers.has(recipientId)) {
            const cust = activeCustomers.get(recipientId)!;
            cust.ws?.send(JSON.stringify({
              type: 'NEW_CHAT_MESSAGE',
              payload: { sender, text, timestamp: Date.now(), isAgent: true },
            }));
          } else if (!isAgent && clientId) {
            // Forward customer message to agents
            broadcastToAgents({
              type: 'NEW_CHAT_MESSAGE',
              payload: {
                customerId: clientId,
                sender: sender || 'Customer',
                text,
                timestamp: Date.now(),
                isAgent: false,
              },
            });
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('WS Message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (clientType === 'customer' && clientId) {
      activeCustomers.delete(clientId);
      broadcastToAgents({
        type: 'CUSTOMER_OFFLINE',
        payload: { customerId: clientId, timestamp: Date.now() },
      });
    } else if (clientType === 'agent' && clientId) {
      activeAgents.delete(clientId);
      broadcastToAgents({
        type: 'AGENT_OFFLINE',
        payload: { agentId: clientId },
      });
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error on client:', err);
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`LiveVoice Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
