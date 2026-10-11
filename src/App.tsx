/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { StaffUser, CustomerSession, CustomerLocation } from './types';
import { getOrCreateDeviceMac, getClientIp, getGpsLocation } from './services/fingerprint';
import { globalAudioEngine } from './services/audioEngine';
import { Navbar } from './components/Navbar';
import { CustomerView } from './components/CustomerView';
import { AgentConsole } from './components/AgentConsole';
import { AdminManagement } from './components/AdminManagement';
import { CallLogsView } from './components/CallLogsView';
import { LoginModal } from './components/LoginModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'customer' | 'agent' | 'admin' | 'logs'>('customer');
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Customer local state
  const [customerId] = useState<string>(() => `cust-${Math.random().toString(36).substring(2, 9)}`);
  const [customerIp, setCustomerIp] = useState<string>('103.145.24.12');
  const [customerMac, setCustomerMac] = useState<string>('5A:4B:C8:92:D1:0E');
  const [customerLocation, setCustomerLocation] = useState<CustomerLocation>({
    lat: 23.8103,
    lng: 90.4125,
    city: 'Dhaka',
    country: 'Bangladesh',
    address: 'Gulshan, Dhaka, Bangladesh',
    accuracy: 18,
  });
  const [isCustomerMicActive, setIsCustomerMicActive] = useState<boolean>(false);
  const [incomingAudioPlaying, setIncomingAudioPlaying] = useState<boolean>(false);
  const [activeAnnouncementAgent, setActiveAnnouncementAgent] = useState<string | null>(null);

  // Agent console state
  const [onlineCustomers, setOnlineCustomers] = useState<CustomerSession[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSession | null>(null);
  const [isPttActive, setIsPttActive] = useState<boolean>(false);
  const [isCustomerAudioIncoming, setIsCustomerAudioIncoming] = useState<boolean>(false);
  const [incomingCustomerVolume, setIncomingCustomerVolume] = useState<number>(0);
  const [notificationAlert, setNotificationAlert] = useState<string | null>(null);

  // Shared chat messages
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: string; text: string; isAgent: boolean; timestamp: number; customerId?: string }>
  >([]);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  const customerAudioIntervalRef = useRef<number | null>(null);

  // Initialize customer identity (IP, MAC, GPS) on startup
  useEffect(() => {
    const initDevice = async () => {
      const mac = getOrCreateDeviceMac();
      setCustomerMac(mac);

      const ipData = await getClientIp();
      setCustomerIp(ipData.ip);

      const loc = await getGpsLocation();
      setCustomerLocation(loc);
    };

    initDevice();
  }, []);

  // Connect WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established');

      // If viewing customer view or not logged in, register customer session
      ws.send(
        JSON.stringify({
          type: 'REGISTER_CUSTOMER',
          payload: {
            id: customerId,
            ip: customerIp,
            mac: customerMac,
            location: customerLocation,
            deviceType: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
          },
        })
      );

      // If user was already logged in as staff, register as agent
      if (currentUser) {
        ws.send(
          JSON.stringify({
            type: 'REGISTER_AGENT',
            payload: currentUser,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, payload } = data;

        switch (type) {
          case 'CUSTOMER_REGISTERED': {
            // Customer registered confirmation
            break;
          }

          case 'CUSTOMER_ONLINE_ALERT': {
            // New customer online notification for agents!
            const newCust: CustomerSession = payload.customer;
            setOnlineCustomers((prev) => {
              if (prev.some((c) => c.id === newCust.id)) return prev;
              return [newCust, ...prev];
            });

            // Play audio chime
            globalAudioEngine.playCustomerOnlineChime();

            // Display toast
            setNotificationAlert(payload.message || `🚨 নতুন কাস্টমার অনলাইনে এসেছে! IP: ${newCust.ip}`);
            break;
          }

          case 'AGENT_INIT_DATA': {
            setOnlineCustomers(payload.customers || []);
            break;
          }

          case 'CUSTOMER_LOCATION_UPDATED': {
            setOnlineCustomers((prev) =>
              prev.map((c) => (c.id === payload.customerId ? { ...c, location: payload.location } : c))
            );
            if (selectedCustomer?.id === payload.customerId) {
              setSelectedCustomer((prev) => (prev ? { ...prev, location: payload.location } : null));
            }
            break;
          }

          case 'CUSTOMER_MIC_STATUS_CHANGED': {
            setOnlineCustomers((prev) =>
              prev.map((c) => (c.id === payload.customerId ? { ...c, isMicActive: payload.isMicActive } : c))
            );
            if (selectedCustomer?.id === payload.customerId) {
              setSelectedCustomer((prev) => (prev ? { ...prev, isMicActive: payload.isMicActive } : null));
            }
            break;
          }

          case 'CUSTOMER_OFFLINE': {
            setOnlineCustomers((prev) => prev.filter((c) => c.id !== payload.customerId));
            if (selectedCustomer?.id === payload.customerId) {
              setSelectedCustomer(null);
            }
            break;
          }

          // Customer receives announcement start from Agent
          case 'LIVE_ANNOUNCEMENT_START': {
            setIncomingAudioPlaying(true);
            setActiveAnnouncementAgent(payload.agentName || 'Customer Care Agent');
            globalAudioEngine.playPttBeep(true);
            break;
          }

          // Customer receives announcement end from Agent
          case 'LIVE_ANNOUNCEMENT_END': {
            setIncomingAudioPlaying(false);
            setActiveAnnouncementAgent(null);
            globalAudioEngine.playPttBeep(false);
            break;
          }

          // Customer receives voice chunks from Agent PTT
          case 'INCOMING_AGENT_AUDIO': {
            setIncomingAudioPlaying(true);
            if (payload.agentName) {
              setActiveAnnouncementAgent(payload.agentName);
            }
            globalAudioEngine.playAudioChunk(payload.audioData);
            break;
          }

          // Agent receives voice chunks from Customer mic
          case 'INCOMING_CUSTOMER_AUDIO': {
            setIsCustomerAudioIncoming(true);
            globalAudioEngine.playAudioChunk(payload.audioData);

            // Turn off indicator after a brief period of silence
            if (customerAudioIntervalRef.current) {
              window.clearTimeout(customerAudioIntervalRef.current);
            }
            customerAudioIntervalRef.current = window.setTimeout(() => {
              setIsCustomerAudioIncoming(false);
            }, 600);
            break;
          }

          case 'NEW_CHAT_MESSAGE': {
            setChatMessages((prev) => [...prev, payload]);
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('WS client message error:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, [customerId, currentUser]);

  // Keep WebSocket informed when customer location or credentials update
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'UPDATE_CUSTOMER_LOCATION',
          payload: { location: customerLocation },
        })
      );
    }
  }, [customerLocation]);

  // Refresh GPS location
  const handleRefreshGps = async () => {
    const loc = await getGpsLocation();
    setCustomerLocation(loc);
  };

  // Toggle Customer Microphone (Natural speaking mode for customer)
  const handleToggleCustomerMic = async () => {
    if (!isCustomerMicActive) {
      try {
        await globalAudioEngine.startRecording((base64Audio) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'CUSTOMER_AUDIO_CHUNK',
                payload: { audioData: base64Audio },
              })
            );
          }
        });
        setIsCustomerMicActive(true);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'CUSTOMER_MIC_STATUS',
              payload: { isActive: true },
            })
          );
        }
      } catch (err) {
        console.warn('Microphone permission request failed:', err);
      }
    } else {
      globalAudioEngine.stopRecording();
      setIsCustomerMicActive(false);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'CUSTOMER_MIC_STATUS',
            payload: { isActive: false },
          })
        );
      }
    }
  };

  // Agent PTT Start (Hold PTT to talk to customer)
  const handleAgentPttStart = async (targetCustomerId?: string, isBroadcast?: boolean) => {
    if (isPttActive) return;
    setIsPttActive(true);
    globalAudioEngine.playPttBeep(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'PTT_START',
          payload: {
            targetCustomerId: targetCustomerId || selectedCustomer?.id,
            agentName: currentUser?.name || 'Customer Care Agent',
            isBroadcast: Boolean(isBroadcast),
          },
        })
      );
    }

    try {
      await globalAudioEngine.startRecording((base64Audio) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'AGENT_AUDIO_CHUNK',
              payload: {
                targetCustomerId: targetCustomerId || selectedCustomer?.id,
                audioData: base64Audio,
                agentName: currentUser?.name || 'Customer Care Agent',
                isBroadcast: Boolean(isBroadcast),
              },
            })
          );
        }
      });
    } catch (err) {
      console.warn('Mic error during PTT:', err);
    }
  };

  // Agent PTT End (Release PTT)
  const handleAgentPttEnd = (targetCustomerId?: string, isBroadcast?: boolean) => {
    if (!isPttActive) return;
    setIsPttActive(false);
    globalAudioEngine.stopRecording();
    globalAudioEngine.playPttBeep(false);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'PTT_END',
          payload: {
            targetCustomerId: targetCustomerId || selectedCustomer?.id,
            isBroadcast: Boolean(isBroadcast),
          },
        })
      );
    }
  };

  // Customer or Agent sends chat message
  const handleSendChatMessage = (text: string, recipientId?: string, isAgent: boolean = false) => {
    const newMsg = {
      sender: isAgent ? currentUser?.name || 'Care Agent' : 'Customer',
      text,
      timestamp: Date.now(),
      isAgent,
      customerId: recipientId || customerId,
    };

    setChatMessages((prev) => [...prev, newMsg]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          payload: {
            sender: newMsg.sender,
            text: newMsg.text,
            recipientId: recipientId || customerId,
            isAgent,
          },
        })
      );
    }
  };

  // Switch navigation tabs with authentication check
  const handleSelectTab = (tab: 'customer' | 'agent' | 'admin' | 'logs') => {
    if (tab === 'agent' || tab === 'admin') {
      if (!currentUser) {
        setIsLoginModalOpen(true);
        return;
      }
    }
    setCurrentTab(tab);
  };

  const handleLoginSuccess = (user: StaffUser) => {
    setCurrentUser(user);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'REGISTER_AGENT',
          payload: user,
        })
      );
    }
    setCurrentTab('agent');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTab('customer');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar adhering to Top Bar Contract */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onlineCustomersCount={onlineCustomers.length}
      />

      {/* Main View Router */}
      <div className="flex-1 flex flex-col">
        {currentTab === 'customer' && (
          <CustomerView
            customerId={customerId}
            ip={customerIp}
            mac={customerMac}
            location={customerLocation}
            isMicActive={isCustomerMicActive}
            onToggleMic={handleToggleCustomerMic}
            incomingAudioPlaying={incomingAudioPlaying}
            activeAnnouncementAgent={activeAnnouncementAgent}
            onSendMessage={(txt) => handleSendChatMessage(txt, customerId, false)}
            chatMessages={chatMessages.filter((m) => !m.customerId || m.customerId === customerId)}
            onRequestGpsRefresh={handleRefreshGps}
          />
        )}

        {currentTab === 'agent' && currentUser && (
          <AgentConsole
            currentUser={currentUser}
            customers={onlineCustomers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={(cust) => {
              setSelectedCustomer(cust);
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                  JSON.stringify({
                    type: 'AGENT_SELECT_CUSTOMER',
                    payload: { customerId: cust.id },
                  })
                );
              }
            }}
            isPttActive={isPttActive}
            onPttStart={handleAgentPttStart}
            onPttEnd={handleAgentPttEnd}
            isCustomerAudioIncoming={isCustomerAudioIncoming}
            incomingCustomerVolume={incomingCustomerVolume}
            onSendChatMessage={(recipientId, txt) => handleSendChatMessage(txt, recipientId, true)}
            chatMessages={chatMessages.filter((m) => !selectedCustomer || m.customerId === selectedCustomer.id)}
            notificationAlert={notificationAlert}
            onDismissAlert={() => setNotificationAlert(null)}
          />
        )}

        {currentTab === 'admin' && currentUser && (
          <AdminManagement currentUser={currentUser} customers={onlineCustomers} />
        )}

        {currentTab === 'logs' && <CallLogsView />}
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
