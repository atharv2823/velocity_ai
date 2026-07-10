"use client";

import React, { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  assistantMode: string;
  createdAt: string;
}

const TRAVEL_MODES = [
  {
    id: "destination",
    name: "Destination Specialist",
    tagline: "Explore Tokyo, Paris & Bali details",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    welcome: "Welcome to Velocity Travels! I'm your Destination Specialist. Ask me about things to do, hotels, or the best time to visit Tokyo, Paris, and Bali.",
    color: "from-sky-500 to-blue-600",
    suggestedPrompts: [
      "What are the top sights to see in Tokyo?",
      "Recommend hotels in Paris with ratings and prices.",
      "When is the best time of year to visit Bali?"
    ]
  },
  {
    id: "booking",
    name: "Booking & Policies Advisor",
    tagline: "FAQs, pricing, and cancellations",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    welcome: "Hello! I can help you with bookings, refunds, cancellation policies, and details about our travel packages.",
    color: "from-emerald-500 to-teal-600",
    suggestedPrompts: [
      "What is your cancellation and refund policy?",
      "Are flights included in the packages?",
      "How do I book a tour package or hotel?"
    ]
  },
  {
    id: "itinerary",
    name: "Itinerary Planner",
    tagline: "Explore daily travel package schedules",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    welcome: "Ready to plan your day-by-day vacation? Ask me for the itinerary details of our Tokyo, Paris, or Bali packages.",
    color: "from-amber-500 to-orange-600",
    suggestedPrompts: [
      "Show me the daily itinerary for the Tokyo Explorer package.",
      "What does the Paris Romance & Art package include?",
      "Tell me about the Nusa Penida day trip in the Bali package."
    ]
  }
];

// Fallback responses if backend/Gemini is offline
const OFFLINE_FALLBACKS: Record<string, string[]> = {
  destination: [
    "We offer incredible stays at **The Shinjuku Grand** ($250/night) in Tokyo, **Hotel Lumière Montmartre** ($190/night) in Paris, and **Ubud Rainforest Resort** ($120/night) in Bali.",
    "For **Tokyo**, don't miss Shibuya Crossing and Senso-ji Temple. The best time to visit is during Cherry Blossom season (March to May).",
    "For **Paris**, top attractions are the Eiffel Tower and Louvre Museum. Best visited in Spring or Autumn.",
    "For **Bali**, visit the Ubud Monkey Forest and Tanah Lot. Dry season (April to October) is the ideal time."
  ],
  booking: [
    "Our cancellation policy:\n- 7+ days prior: **100% refund**.\n- 2 to 6 days prior: **50% refund**.\n- Less than 48 hours: **No refund**.",
    "To book, email us at **bookings@velocitytravels.com** or call us at **+1-800-VELOCITY** with your preferred packages and travel dates.",
    "Please note: International flights to the destinations are **not included** in our package prices. Land tours, hotels, and local guides are included."
  ],
  itinerary: [
    "The **Tokyo Explorer** is a 5-day tour package priced at $1,200, including trips to Mount Fuji, Harajuku, and Shibuya.",
    "The **Paris Romance & Art Getaway** is a 6-day package for $1,500, featuring a champagne Seine River cruise, Louvre skip-the-line access, and a French cooking class.",
    "The **Tropical Bliss & Bali Wonders** is a 7-day package for $950, which includes a sunrise trek to Mount Batur, Nusa Penida island tour, and a spa day."
  ]
};

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [activeModeId, setActiveModeId] = useState("destination");
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize first chat session
  useEffect(() => {
    const defaultSessionId = "session-1";
    const initialSession: ChatSession = {
      id: defaultSessionId,
      title: "Velocity Travels Welcome",
      messages: [
        {
          id: "welcome-msg",
          sender: "bot",
          text: TRAVEL_MODES[0].welcome,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      assistantMode: "destination",
      createdAt: new Date().toLocaleDateString()
    };
    setSessions([initialSession]);
    setActiveSessionId(defaultSessionId);

    // Test backend connection on startup
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/`)
      .then((res) => {
        if (!res.ok) throw new Error();
        setIsOfflineMode(false);
      })
      .catch(() => {
        setIsOfflineMode(true);
      });
  }, []);

  // Sync scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, isTyping, activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const activeMode = TRAVEL_MODES.find((m) => m.id === (activeSession?.assistantMode || activeModeId)) || TRAVEL_MODES[0];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !activeSession) return;

    const userMessageId = `user-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newUserMsg: Message = {
      id: userMessageId,
      sender: "user",
      text: textToSend,
      timestamp
    };

    // Update session title on first real message
    let updatedTitle = activeSession.title;
    if (activeSession.title === "Velocity Travels Welcome" || activeSession.title.startsWith("New Session")) {
      updatedTitle = textToSend.slice(0, 30) + (textToSend.length > 30 ? "..." : "");
    }

    // Add user message to state immediately
    const previousMessages = [...activeSession.messages];
    const updatedSessions = sessions.map((s) => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          title: updatedTitle,
          messages: [...s.messages, newUserMsg]
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    setInputText("");
    setIsTyping(true);

    // Focus input
    inputRef.current?.focus();

    let botResponseText = "";
    let usedOfflineFallback = false;

    try {
      // Map previous chat messages to the format the backend expects
      const formattedHistory = previousMessages.map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }]
      }));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          message: textToSend,
          history: formattedHistory
        })
      });

      if (!res.ok) {
        throw new Error("Backend error status: " + res.status);
      }

      const data = await res.json();
      if (data.success && data.response) {
        botResponseText = data.response;
        setIsOfflineMode(false);
      } else {
        throw new Error(data.error || "Invalid response format");
      }
    } catch (err) {
      console.warn("Backend API call failed. Using offline fallback response.", err);
      usedOfflineFallback = true;
      setIsOfflineMode(true);
      
      // Determine local fallback response
      const modeFallbacks = OFFLINE_FALLBACKS[activeSession.assistantMode] || OFFLINE_FALLBACKS.destination;
      botResponseText = modeFallbacks[Math.floor(Math.random() * modeFallbacks.length)] + 
        "\n\n*(Note: Currently operating in local offline backup mode. Start backend API server to use live Gemini queries)*";
    }

    // Setup streaming message placeholder
    const botMessageId = `bot-${Date.now()}`;
    const botTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const streamingBotMsg: Message = {
      id: botMessageId,
      sender: "bot",
      text: "",
      timestamp: botTimestamp,
      isStreaming: true
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            messages: [...s.messages, streamingBotMsg]
          };
        }
        return s;
      })
    );

    setIsTyping(false);

    // Simulate word-by-word streaming effect on screen
    let currentText = "";
    const words = botResponseText.split(" ");
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      currentText += (i === 0 ? "" : " ") + words[i];
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === botMessageId ? { ...m, text: currentText } : m
              )
            };
          }
          return s;
        })
      );
    }

    // Mark streaming finished
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            messages: s.messages.map((m) =>
              m.id === botMessageId ? { ...m, isStreaming: false } : m
            )
          };
        }
        return s;
      })
    );
  };

  const createNewChat = (modeId = "destination") => {
    const newId = `session-${Date.now()}`;
    const mode = TRAVEL_MODES.find((m) => m.id === modeId) || TRAVEL_MODES[0];
    const newSession: ChatSession = {
      id: newId,
      title: `New Session (${mode.name})`,
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: "bot",
          text: mode.welcome,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      assistantMode: modeId,
      createdAt: new Date().toLocaleDateString()
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setActiveModeId(modeId);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id && filtered.length > 0) {
      setActiveSessionId(filtered[0].id);
    } else if (filtered.length === 0) {
      const fallbackId = "session-fallback";
      setSessions([
        {
          id: fallbackId,
          title: "Velocity Travels Welcome",
          messages: [
            {
              id: "welcome-msg",
              sender: "bot",
              text: TRAVEL_MODES[0].welcome,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ],
          assistantMode: "destination",
          createdAt: new Date().toLocaleDateString()
        }
      ]);
      setActiveSessionId(fallbackId);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputText);
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans ${theme === "dark" ? "bg-zinc-950 text-zinc-100 dark" : "bg-zinc-50 text-zinc-900"}`}>
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md transition-all duration-300 ${isSidebarOpen ? "w-80" : "w-0 -translate-x-full md:w-0"} overflow-hidden shrink-0`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2m-4-3h9M3 13h18M5 17h14M7 21h10" />
              </svg>
            </div>
            <div>
              <span className="font-bold tracking-tight text-lg bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">Velocity Travels</span>
              <p className="text-[10px] text-zinc-500 font-medium">AI Trip Planner</p>
            </div>
          </div>
          
          <button onClick={toggleTheme} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Toggle Theme">
            {theme === "dark" ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        {/* Action Selectors for New Chat */}
        <div className="p-3">
          <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 px-1">Start Travel Consultation</div>
          <div className="grid grid-cols-3 gap-1">
            {TRAVEL_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => createNewChat(mode.id)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl text-center border border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-all hover:scale-[1.02]"
              >
                <span className="text-zinc-600 dark:text-zinc-400">{mode.icon}</span>
                <span className="text-[9px] font-semibold truncate w-full">{mode.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 mb-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-zinc-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-100/60 dark:bg-zinc-800/40 border-0 focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 placeholder-zinc-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {filteredSessions.map((session) => {
            const isSelected = session.id === activeSessionId;
            const mode = TRAVEL_MODES.find((m) => m.id === session.assistantMode) || TRAVEL_MODES[0];
            return (
              <div
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  setActiveModeId(session.assistantMode);
                }}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-950 dark:text-zinc-50 border border-zinc-200/50 dark:border-zinc-700/30"
                    : "hover:bg-zinc-100/50 dark:hover:bg-zinc-800/20 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className={`p-1.5 rounded-lg bg-zinc-200/40 dark:bg-zinc-800/80 ${isSelected ? "text-blue-500" : ""}`}>
                    {mode.icon}
                  </span>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold truncate leading-normal">{session.title}</p>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500">{mode.name}</span>
                  </div>
                </div>
                
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-red-500 transition-all"
                  title="Delete Chat"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              TR
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold truncate">Traveler Profile</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">Velocity Explorer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main chat window */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-950">
        {/* Navigation/Header bar */}
        <header className="h-16 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle Sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h12M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2 overflow-hidden">
              <span className={`p-2 rounded-xl bg-gradient-to-tr ${activeMode.color} text-white shadow-md`}>
                {activeMode.icon}
              </span>
              <div className="overflow-hidden">
                <h2 className="text-sm font-bold truncate">{activeSession?.title || "Velocity Chat"}</h2>
                <p className="text-[10px] text-zinc-500 truncate">{activeMode.tagline}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOfflineMode ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Offline Mode (Local Backups)
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Agent Online
              </div>
            )}
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6 space-y-6">
          {activeSession?.messages.map((message) => {
            const isUser = message.sender === "user";
            return (
              <div
                key={message.id}
                className={`flex gap-4 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"} items-start`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold shadow-sm ${
                  isUser
                    ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                    : `bg-gradient-to-tr ${activeMode.color} text-white`
                }`}>
                  {isUser ? "ME" : "VA"}
                </div>

                {/* Message Bubble Container */}
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <div className={`px-4 py-3 rounded-2xl shadow-sm border ${
                    isUser
                      ? "bg-blue-600 border-blue-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-zinc-900 border-zinc-200/50 dark:border-zinc-800/60 rounded-tl-none"
                  }`}>
                    {/* Render helper to output formatted travel text */}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap select-text">
                      {message.text}
                    </div>
                  </div>
                  {/* Timestamp & utility actions */}
                  <div className={`flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 ${isUser ? "justify-end" : "justify-start"}`}>
                    <span>{message.timestamp}</span>
                    {!isUser && !message.isStreaming && (
                      <>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(message.text)}
                          className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                          title="Copy message"
                        >
                          Copy
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-4 max-w-3xl mr-auto items-start">
              <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold shadow-sm bg-gradient-to-tr ${activeMode.color} text-white`}>
                VA
              </div>
              <div className="flex flex-col gap-1">
                <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/60 rounded-tl-none flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input prompt / suggestion starters */}
        <div className="p-4 md:p-6 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-md shrink-0">
          <div className="max-w-3xl mx-auto space-y-4">
            
            {/* Quick Suggestions (Shown if current chat session has only the welcome message) */}
            {activeSession?.messages.length === 1 && !isTyping && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {activeMode.suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3 text-left text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-blue-500/50 dark:hover:border-blue-400/50 hover:bg-blue-500/5 dark:hover:bg-blue-400/5 transition-all text-zinc-600 dark:text-zinc-300 hover:scale-[1.01]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Main Input Form */}
            <div className="relative flex items-end gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 focus-within:ring-1 focus-within:ring-blue-500/40 dark:focus-within:ring-blue-400/40 focus-within:border-blue-500/40 dark:focus-within:border-blue-400/40 transition-all shadow-md">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${activeMode.name}...`}
                className="flex-1 max-h-32 min-h-[40px] pl-3 pr-10 py-2.5 resize-none bg-transparent outline-none border-0 ring-0 focus:ring-0 text-sm placeholder-zinc-400 focus:outline-none"
              />
              
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => alert("Simulating upload: Travel voucher or booking confirmation attached.")}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Attach voucher / details"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                
                <button
                  onClick={() => handleSendMessage(inputText)}
                  disabled={!inputText.trim() || isTyping}
                  className={`p-2.5 rounded-xl transition-all shadow-md ${
                    inputText.trim() && !isTyping
                      ? "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer hover:scale-105"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                  }`}
                  title="Send Message"
                >
                  <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
            
            <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-500">
              Velocity Travels AI provides support based on active packages. Contact customer care for flight updates.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
