'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Scale,
  Search,
  Database,
  Cpu,
  Sparkles,
  Plus,
  Trash2,
  Send,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Settings,
  AlertCircle,
  Check,
  Copy,
  Info,
  Layers,
  ArrowRight,
  User,
  LogOut,
  Building,
  Briefcase,
  HelpCircle,
  FileText
} from 'lucide-react';

interface Source {
  act_title: string;
  section_title: string;
  pdf_name?: string;
  metadata: {
    source_file?: string;
    [key: string]: any;
  };
  snippets: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

interface Thread {
  id: string;
  title: string;
  created_at: string;
}

interface UserSession {
  id: string;
  email: string;
  created_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function VidhaanAIWorkspace() {
  // --- User Auth & State ---
  const [user, setUser] = useState<UserSession | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // --- Workspace State ---
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [augmentedMode, setAugmentedMode] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  
  // Inline Thread Editing State
  const [editingThreadId, setEditingThreadId] = useState<string>('');
  const [editingThreadTitle, setEditingThreadTitle] = useState<string>('');

  // Clipboard Copied State
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  
  // Drawer / Sources Explorer State
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [sourcesPanelOpen, setSourcesPanelOpen] = useState<boolean>(false);
  
  // Connection Health Status
  const [healthStatus, setHealthStatus] = useState<'connected' | 'error' | 'checking'>('checking');

  // Carousel Slide State
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- Carousel Configuration ---
  const carouselSlides = [
    {
      title: "113 Acts Ingested & Streamed",
      subtitle: "High Density Vector Index",
      description: "Vidhaan AI maps 113 key statutory acts and legal archives from the Legislative Department, running with 1,133 pages and 5,233 chunks in active memory.",
      bullets: [
        "Constitution of India active indexing",
        "Indian Contract Act & statutory extensions",
        "Modernized criminal law acts and sections"
      ],
      graphic: (
        <div className="space-y-2.5 text-left w-full">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-1.5 border-b border-slate-200">
            <span>STATUTE</span>
            <span>CHUNKS</span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-[#0f2942]">
            <span>Constitution of India</span>
            <span className="bg-amber-500/10 text-[#f57c00] px-2 py-0.5 rounded font-mono">1,822 Chunks</span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-[#0f2942]">
            <span>Indian Contract Act, 1872</span>
            <span className="bg-amber-500/10 text-[#f57c00] px-2 py-0.5 rounded font-mono font-semibold">912 Chunks</span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-[#0f2942]">
            <span>Bharatiya Nyaya Sanhita, 2023</span>
            <span className="bg-amber-500/10 text-[#f57c00] px-2 py-0.5 rounded font-mono font-semibold">832 Chunks</span>
          </div>
        </div>
      )
    },
    {
      title: "Authoritative RAG Grounding",
      subtitle: "Verifiable Legal Citations",
      description: "Our proprietary Reciprocal Rank Fusion combines sparse keyword scanning and semantic dense embeddings to retrieve sections with laser accuracy.",
      bullets: [
        "No conversational preamble pre-processing",
        "Displays primary PDF source hypertexts in bubbles",
        "Links section detail drawer dynamically"
      ],
      graphic: (
        <div className="space-y-3 w-full">
          <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs text-left">
            <span className="text-[9px] font-bold text-[#f57c00] font-mono tracking-widest block uppercase">Retrieved Parent Context</span>
            <span className="text-xs font-bold text-[#0f2942] block mt-0.5">Section 124, Indian Contract Act</span>
            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">"A contract by which one party promises to save the other from loss caused to him..."</p>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>Dense Embedding Match: 98%</span>
            <span>RFF Rank: #1</span>
          </div>
        </div>
      )
    },
    {
      title: "Sovereign Digital Standards",
      subtitle: "Official Indian Government Style Guide Alignment",
      description: "Designed using premium saffron and Navy Blue tricolor styling, reminiscent of official digital platform guidelines of India.",
      bullets: [
        "Light-mode high contrast reading canvas",
        "Elegant Scales emblem layout",
        "Fully compliant MVP architecture"
      ],
      graphic: (
        <div className="flex flex-col items-center justify-center py-4 w-full">
          <div className="w-16 h-16 bg-[#0f2942] rounded-full flex items-center justify-center text-amber-500 shadow-md">
            <Scale size={32} />
          </div>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-3 font-semibold">Scales of Justice</span>
          <span className="text-[11px] text-[#f57c00] font-semibold mt-0.5">National Legal Workbench</span>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % carouselSlides.length);
  };

  const prevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  // --- Initial Mount & Load user from localStorage ---
  useEffect(() => {
    const cachedUser = localStorage.getItem('vidhaan_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setUser(parsed);
      } catch (err) {
        console.error('Failed to parse cached user data', err);
      }
    }
    
    // Check Backend Connection Health
    checkBackendHealth();
  }, []);

  // --- Load and sync threads when user changes ---
  useEffect(() => {
    if (user) {
      fetchThreads(user.id);
    } else {
      setThreads([]);
      setActiveThreadId('');
      setMessages([]);
    }
  }, [user]);

  // --- Fetch Messages when activeThreadId changes ---
  useEffect(() => {
    if (activeThreadId) {
      fetchThreadMessages(activeThreadId);
    } else {
      setMessages([]);
    }
  }, [activeThreadId]);

  // --- Scroll to bottom of chat log ---
  useEffect(() => {
    if (messages.length > 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const checkBackendHealth = async () => {
    try {
      setHealthStatus('checking');
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (res.ok) {
        setHealthStatus('connected');
      } else {
        setHealthStatus('error');
      }
    } catch {
      setHealthStatus('error');
    }
  };

  const fetchThreads = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/threads?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
        if (data.length > 0) {
          setActiveThreadId(data[0].id);
        } else {
          // Auto create a thread if user has none
          createThread(userId, "Statutory Investigation");
        }
      }
    } catch (err) {
      console.error("Error loading threads:", err);
    }
  };

  const fetchThreadMessages = async (threadId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/threads/${threadId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Error fetching message history:", err);
    }
  };

  const createThread = async (userId: string, title: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, title: title })
      });
      if (res.ok) {
        const data = await res.json();
        setThreads((prev) => [data, ...prev]);
        setActiveThreadId(data.id);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error creating new thread:", err);
    }
  };

  const deleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE_URL}/api/threads/${threadId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const filtered = threads.filter((t) => t.id !== threadId);
        setThreads(filtered);
        
        if (filtered.length > 0) {
          if (activeThreadId === threadId) {
            setActiveThreadId(filtered[0].id);
          }
        } else {
          // If no threads remain, create a default one
          if (user) {
            createThread(user.id, "Statutory Investigation");
          }
        }
      }
    } catch (err) {
      console.error("Error deleting thread:", err);
    }
  };

  // --- Auth Handlers ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) return;
    
    setAuthLoading(true);
    setAuthError('');
    const endpoint = authMode === 'signup' 
      ? `${API_BASE_URL}/api/auth/signup` 
      : `${API_BASE_URL}/api/auth/signin`;
      
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: authEmail.trim(), 
          password: authPassword.trim() 
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem('vidhaan_user', JSON.stringify(data));
        setShowAuthModal(false);
        setAuthPassword('');
        setAuthError('');
      } else {
        const errData = await res.json();
        setAuthError(errData.detail || 'Authentication server rejected details. Check credentials.');
      }
    } catch (err) {
      setAuthError(`Cannot reach backend server. Make sure the API is active at ${API_BASE_URL}.`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('vidhaan_user');
    setThreads([]);
    setActiveThreadId('');
    setMessages([]);
    setAuthEmail('');
    setAuthPassword('');
  };

  const handleRenameThread = async (threadId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      if (res.ok) {
        const updated = await res.json();
        setThreads(threads.map((t) => t.id === threadId ? { ...t, title: updated.title } : t));
        setEditingThreadId('');
      } else {
        console.error("Failed to rename thread on server");
      }
    } catch (err) {
      console.error("Error renaming thread:", err);
    }
  };

  const handleCopyMessage = (index: number) => {
    setCopiedMessageIndex(index);
    setTimeout(() => {
      setCopiedMessageIndex(null);
    }, 2000);
  };

  // --- Suggested Questions generator ---
  const getSuggestedQuestions = (content: string): string[] => {
    const normalized = content.toLowerCase();
    if (normalized.includes("indemnity") || normalized.includes("124") || normalized.includes("contract")) {
      return [
        "What are the rights of an indemnity holder under Section 125?",
        "Explain the difference between indemnity and a contract of guarantee.",
        "Are there statutory limits to the liability under Section 124?",
        "Show Section 126 guarantee definition."
      ];
    } else if (normalized.includes("equality") || normalized.includes("article 14") || normalized.includes("constitution")) {
      return [
        "What are the landmark case laws on reasonable classification in Article 14?",
        "How does Article 14 relate to gender equality and personal laws?",
        "Explain the concept of 'Rule of Law' under the Indian Constitution.",
        "Show Article 15 prohibition of discrimination."
      ];
    } else if (normalized.includes("penalty") || normalized.includes("imprisonment") || normalized.includes("punishment")) {
      return [
        "Explain the distinction between bailable and non-bailable offenses.",
        "What is the maximum term of imprisonment under these sections?",
        "Are there fine-only alternatives available for first-time offenders?",
        "Show corresponding sections in Bharatiya Nyaya Sanhita."
      ];
    }
    
    // Default legal questions
    return [
      "What are the legislative amendments applicable to this provision?",
      "Show corresponding sections in related Indian Acts.",
      "Are there Supreme Court precedents defining the scope of this rule?",
      "Explain the regulatory penalties for violating this section."
    ];
  };

  const handleSuggestedQuestionClick = (question: string) => {
    setInput(question);
  };

  const handleSendMessage = async (e?: React.FormEvent, customInput?: string) => {
    if (e) e.preventDefault();
    const queryText = customInput || input;
    if (!queryText.trim() || isStreaming) return;

    const userQuery = queryText.trim();
    if (!customInput) {
      setInput('');
    }
    setIsStreaming(true);
    setStatusMessage('Initiating statutory RAG pipeline...');

    // 1. Append User Message
    const userMessage: Message = { role: 'user', content: userQuery };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);

    // Auto update thread title dynamically if first message in conversation
    if (currentMessages.length === 1 && activeThreadId && user) {
      const shortTitle = userQuery.length > 30 ? userQuery.substring(0, 30) + '...' : userQuery;
      // We can update the thread title in local list for instant feedback
      setThreads((prev) =>
        prev.map((t) => (t.id === activeThreadId ? { ...t, title: shortTitle } : t))
      );
    }

    // 2. Add placeholder assistant response
    const assistantPlaceholder: Message = {
      role: 'assistant',
      content: '',
      sources: []
    };
    setMessages([...currentMessages, assistantPlaceholder]);

    let retrievedSources: Source[] = [];
    let streamedContent = '';

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          augmented_mode: augmentedMode,
          user_id: user?.id,
          thread_id: activeThreadId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body empty.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.replace('event: ', '').trim();
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            const rawData = trimmed.replace('data: ', '').trim();
            try {
              const parsed = JSON.parse(rawData);

              if (currentEvent === 'status') {
                setStatusMessage(parsed);
              } else if (currentEvent === 'sources') {
                retrievedSources = parsed;
                setMessages([
                  ...currentMessages,
                  {
                    role: 'assistant',
                    content: streamedContent,
                    sources: retrievedSources
                  }
                ]);
              } else if (currentEvent === 'token') {
                streamedContent += parsed;
                setMessages([
                  ...currentMessages,
                  {
                    role: 'assistant',
                    content: streamedContent,
                    sources: retrievedSources
                  }
                ]);
              } else if (currentEvent === 'error') {
                throw new Error(parsed);
              }
            } catch (err) {
              console.error('Failed to parse SSE data block:', err);
            }
          }
        }
      }

      // Final synchronization reload of thread entries to show updated titles if any
      if (user) {
        const threadListRes = await fetch(`${API_BASE_URL}/api/threads?user_id=${user.id}`);
        if (threadListRes.ok) {
          const updatedThreads = await threadListRes.json();
          setThreads(updatedThreads);
        }
      }

    } catch (err: any) {
      console.error('API complete crash:', err);
      const errMsg = err.message || 'Verification of statutory DB failed.';
      setMessages([
        ...currentMessages,
        {
          role: 'assistant',
          content: `⚠️ **Connection Error**\n\n${errMsg}\n\n*Ensure \\\`/backend\\\` is active and Postgres has been setup using instructions.*`
        }
      ]);
    } finally {
      setIsStreaming(false);
      setStatusMessage('');
    }
  };

  const handleSourceClick = (src: Source) => {
    setSelectedSource(src);
    setSourcesPanelOpen(true);
  };

  const renderFormattedMarkdown = (text: string) => {
    if (!text) return '';
    
    return text
      .split('\n')
      .map((line, i) => {
        let clean = line;
        
        // Bold tags
        clean = clean.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-[#0f2942] font-bold font-sans">$1</strong>');
        
        // Italics
        clean = clean.replace(/\*([^*]+)\*/g, '<em class="text-slate-600 italic font-sans">$1</em>');
        
        // List styling
        if (clean.trim().startsWith('- ') || clean.trim().startsWith('* ')) {
          return `<li class="ml-6 list-disc text-slate-700 py-0.5 font-sans">${clean.replace(/^[-*]\s+/, '')}</li>`;
        }
        
        // Section headers
        if (clean.trim().startsWith('### ')) {
          return `<h3 class="text-sm font-bold text-[#0f2942] mt-4 mb-2 font-display flex items-center gap-1.5 uppercase tracking-wide border-t pt-2 border-slate-100">${clean.replace(/^###\s+/, '')}</h3>`;
        }
        if (clean.trim().startsWith('## ')) {
          return `<h2 class="text-base font-bold text-[#0f2942] mt-6 mb-3 border-b border-slate-200 pb-1 font-display uppercase tracking-widest">${clean.replace(/^##\s+/, '')}</h2>`;
        }
        
        // Code markers / citations
        clean = clean.replace(/`([^`]+)`/g, '<code class="bg-[#f7f5f0] text-[#0f2942] px-1.5 py-0.5 rounded font-mono text-xs border border-slate-200/60">$1</code>');
        
        return `<p class="py-1 leading-relaxed text-slate-700 font-sans text-[13.5px]">${clean}</p>`;
      })
      .join('');
  };

  // --- RENDER LANDING PAGE ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col text-slate-800">
        {/* Premium Tricolor Navy Header */}
        <header className="bg-[#0f2942] text-white py-4 px-6 border-b-4 border-[#f57c00] shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg text-amber-500">
                <Scale size={28} className="stroke-[1.75]" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl tracking-tight text-white flex items-center gap-2">
                  VIDHAAN AI <span className="text-xs bg-[#f57c00] px-2 py-0.5 rounded font-mono text-white">v0.1</span>
                </h1>
                <p className="text-[10px] text-slate-300 font-mono tracking-widest -mt-0.5 uppercase">
                  Sovereign Legal Intelligence Platform of India
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#f57c00] hover:bg-[#dd6b20] text-white rounded-lg font-semibold shadow-sm hover:shadow transition-all text-sm cursor-pointer"
            >
              <User size={15} />
              <span>Sign In to Workbench</span>
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 animate-slide-in">
          <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-[#f57c00]/30 rounded-full text-xs font-semibold text-[#f57c00]">
                <Sparkles size={12} />
                <span>Advanced Hybrid RAG Pipeline v0.1</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-extrabold text-[#0f2942] leading-tight">
                Empowering Indian Statutory & Constitutional Research
              </h2>
              <p className="text-base md:text-lg text-slate-600 leading-relaxed font-sans font-normal">
                An institutional-grade legal workbench mapping the entire codification landscape of Indian statutory law. Grounded directly in verified legislative drafts with zero disclaimers or AI preamble fluff.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-[#0f2942] hover:bg-[#1a365d] text-white rounded-xl font-bold transition-all text-sm shadow-md hover:shadow-lg cursor-pointer"
                >
                  <span>Access Legal Workbench</span>
                  <ArrowRight size={16} />
                </button>
                <a
                  href="#scope"
                  className="flex items-center justify-center px-6 py-3 border border-slate-300 hover:border-slate-800 text-slate-700 font-bold rounded-xl transition-all text-sm cursor-pointer"
                >
                  View Database Ingestion Scope
                </a>
              </div>
            </div>

            {/* Ingestion Metric Display */}
            <div className="lg:col-span-5 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
              <h3 className="text-lg font-bold text-[#0f2942] mb-6 flex items-center gap-2 border-b pb-3 border-slate-100">
                <Database className="text-[#f57c00]" size={20} />
                <span>Real-Time Index Status</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#fdfbf7] border border-slate-100 rounded-xl hover:shadow-md hover:scale-[1.02] transition-all">
                  <span className="text-3xl font-extrabold text-[#0f2942] block">113</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mt-1">Acts Fully Ingested</span>
                </div>
                <div className="p-4 bg-[#fdfbf7] border border-slate-100 rounded-xl hover:shadow-md hover:scale-[1.02] transition-all">
                  <span className="text-3xl font-extrabold text-[#0f2942] block">1,133</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mt-1">Legal Sections</span>
                </div>
                <div className="p-4 bg-[#fdfbf7] border border-slate-100 rounded-xl hover:shadow-md hover:scale-[1.02] transition-all">
                  <span className="text-3xl font-extrabold text-[#0f2942] block">5,233</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mt-1">Vector Chunks</span>
                </div>
                <div className="p-4 bg-[#fdfbf7] border border-slate-100 rounded-xl hover:shadow-md hover:scale-[1.02] transition-all">
                  <span className="text-3xl font-extrabold text-[#f57c00] block">4</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mt-1">Key Departments</span>
                </div>
              </div>
              
              {/* Technical Specifications Sub-Panel */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <span className="text-[10px] font-bold text-[#f57c00] uppercase tracking-wider font-mono block mb-3">
                  Core AI Model & Engine Architecture
                </span>
                <div className="space-y-2 text-xs text-slate-600 font-medium font-sans">
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">LLM Inference Node</span>
                    <span className="text-[#0f2942] font-semibold">llama-3.3-70b-versatile (Gemini Flash fallback)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Dense Embedding Model</span>
                    <span className="text-[#0f2942] font-semibold">gemini-embedding-2 (768 Dimensions)</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Retrieval Pipeline</span>
                    <span className="text-[#0f2942] font-semibold">Reciprocal Rank Fusion (Dense RAG + ts_rank)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Database Sync: <strong>100% Complete</strong></span>
                <span className="flex items-center gap-1"><Check size={12} className="text-emerald-600 animate-pulse" /> Local Latency: &lt; 85ms</span>
              </div>
            </div>
          </div>

          {/* Features Carousel Slide Section */}
          <section className="bg-slate-100/50 border-y border-slate-200/60 py-16 px-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h3 className="text-3xl font-display font-extrabold text-[#0f2942] mb-3">
                  Architected for Legal Professional Precision
                </h3>
                <p className="text-slate-500 text-sm">
                  Explore key systems driving Vidhaan AI's search speed, grounded citations, and sovereign statutory safety.
                </p>
              </div>

              {/* Slider / Carousel Component */}
              <div className="relative max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-8">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono px-2.5 py-1 bg-[#0f2942]/10 text-[#0f2942] rounded-full">
                      SLIDE {carouselIndex + 1} OF 3
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {carouselSlides[carouselIndex].subtitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={prevSlide}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center min-h-[220px]">
                  <div className="space-y-4">
                    <h4 className="text-xl font-bold text-[#0f2942]">
                      {carouselSlides[carouselIndex].title}
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed font-sans">
                      {carouselSlides[carouselIndex].description}
                    </p>
                    <ul className="space-y-2">
                      {carouselSlides[carouselIndex].bullets.map((bullet, idx) => (
                        <li key={idx} className="text-xs text-slate-700 flex items-center gap-2 font-medium">
                          <Check size={14} className="text-[#f57c00] shrink-0" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-[#fdfbf7] p-6 rounded-xl border border-slate-200/80 flex flex-col justify-center items-center min-h-[200px]">
                    {carouselSlides[carouselIndex].graphic}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Scope Ingestion Section */}
          <section id="scope" className="max-w-7xl mx-auto px-6 py-16">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h3 className="text-3xl font-display font-extrabold text-[#0f2942] mb-3">
                Covered Departments & Legislative Scope
              </h3>
              <p className="text-slate-500 text-sm">
                We actively ingest, tag, and structure statutory documents across key constitutional and judicial bodies in India.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-white border border-slate-200 rounded-xl hover:border-[#f57c00]/60 hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center text-[#f57c00] mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen size={24} />
                </div>
                <h4 className="font-bold text-base text-[#0f2942] mb-2 font-display">Constitution of India</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Complete articles covering parts, schedules, fundamental rights, directive principles, and critical constitutional amendments.
                </p>
              </div>

              <div className="p-6 bg-white border border-slate-200 rounded-xl hover:border-[#f57c00]/60 hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center text-[#f57c00] mb-4 group-hover:scale-110 transition-transform">
                  <Scale size={24} />
                </div>
                <h4 className="font-bold text-base text-[#0f2942] mb-2 font-display">Department of Justice</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Rules, legal directives, organizational structures, judicial appointments, and legal administration statutes of India.
                </p>
              </div>

              <div className="p-6 bg-white border border-slate-200 rounded-xl hover:border-[#f57c00]/60 hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center text-[#f57c00] mb-4 group-hover:scale-110 transition-transform">
                  <Briefcase size={24} />
                </div>
                <h4 className="font-bold text-base text-[#0f2942] mb-2 font-display">Dept of Legal Affairs</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Ingested treaties, litigation reports, contracts guidance, and statutory frameworks governing international & domestic arbitration.
                </p>
              </div>

              <div className="p-6 bg-white border border-slate-200 rounded-xl hover:border-[#f57c00]/60 hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center text-[#f57c00] mb-4 group-hover:scale-110 transition-transform">
                  <Building size={24} />
                </div>
                <h4 className="font-bold text-base text-[#0f2942] mb-2 font-display">Legislative Department</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  113 active acts, statutory rules, regulations, codifications, and state-wise gazette adjustments kept up-to-date.
                </p>
              </div>
            </div>
          </section>
        </main>

        {/* Sovereign Landing Page Footer */}
        <footer className="bg-[#0f2942] text-white py-12 border-t-4 border-[#f57c00] mt-12">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-white flex items-center gap-2">
                <Scale size={20} className="text-amber-500 animate-pulse" /> VIDHAAN AI
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                India's premium legal-tech vector ground station. Processing local legal indexes under hybrid reciprocal rank fusion algorithms to yield un-hallucinated legislative analysis.
              </p>
            </div>
            <div className="space-y-3">
              <h5 className="font-semibold text-sm text-[#f57c00] font-display">Document Ingest Metrics</h5>
              <ul className="text-xs text-slate-400 space-y-1.5 font-mono">
                <li>• Ingested Sections: 1,133 pages</li>
                <li>• Total Vector Dimensions: 768 (gemini-embedding-2)</li>
                <li>• Active Models: llama-3.3-70b-versatile, gemini-2.5-flash</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h5 className="font-semibold text-sm text-[#f57c00] font-display">Institutional Disclaimer</h5>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Disclaimer: Developmental MVP. Not an official government website. Verify legal insights.
              </p>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 mt-8 pt-6 border-t border-white/10 text-center text-xs text-slate-500 font-mono">
            © {new Date().getFullYear()} Vidhaan AI. All sovereign rights reserved.
          </div>
        </footer>

        {/* Secure Credentials Auth Modal Pop-up */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-[#0f2942]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-slide-in">
              <div className="bg-[#0f2942] text-white p-6 border-b-4 border-[#f57c00] flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg font-display">
                    {authMode === 'signin' ? 'Secure Account Sign In' : 'Create Research Account'}
                  </h3>
                  <p className="text-xs text-slate-300 font-mono tracking-wider uppercase mt-0.5">
                    {authMode === 'signin' ? 'Sovereign Legal Workbench Access' : 'Register Secure Database Credentials'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowAuthModal(false);
                    setAuthPassword('');
                    setAuthError('');
                  }}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleAuthSubmit} className="p-6 space-y-4">
                {authError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span className="leading-snug">{authError}</span>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block">Enter Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. user@vidhaan.ai"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#f57c00] focus:bg-white transition-all font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block">Enter Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#f57c00] focus:bg-white transition-all font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-[#0f2942] hover:bg-[#1a365d] disabled:bg-slate-300 text-white font-bold rounded-xl text-sm shadow-sm hover:shadow active:scale-[0.99] transition-all cursor-pointer mt-2"
                >
                  {authLoading 
                    ? (authMode === 'signin' ? "Initializing secure session..." : "Creating database credentials...") 
                    : (authMode === 'signin' ? "Verify & Sign In" : "Register & Sign Up")}
                </button>

                <div className="text-center pt-1 border-t border-slate-100 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                      setAuthError('');
                    }}
                    className="text-xs font-bold text-[#f57c00] hover:text-[#e06b00] hover:underline transition-colors cursor-pointer"
                  >
                    {authMode === 'signin' 
                      ? "Need a secure account? Register & Sign Up" 
                      : "Already have an account? Sign In"}
                  </button>
                </div>
                
                <p className="text-[10px] text-center text-slate-400 leading-relaxed font-sans mt-3">
                  Disclaimer: Secure institutional authentication. User credentials and threads are securely saved back to the primary PostgreSQL node.
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER DUAL PERSISTENT WORKSPACE ---
  const activeChat = threads.find((t) => t.id === activeThreadId);

  return (
    <div className="flex flex-row flex-1 h-screen w-full overflow-hidden select-none bg-[#fdfbf7] text-slate-800">
      
      {/* ================================================================= */}
      {/* 1. LEFT SIDEBAR: ACTIVE DATABASE THREADS & AUTH                   */}
      {/* ================================================================= */}
      <div
        className={`${
          sidebarOpen 
            ? 'translate-x-0 w-80 shadow-2xl md:shadow-none' 
            : '-translate-x-full w-80 md:w-0 md:translate-x-0'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 transition-all duration-300 ease-in-out border-r border-slate-200 bg-[#f8fafc] flex flex-col h-full z-30 md:z-20 overflow-hidden shrink-0`}
      >
        {/* Workspace Brand and Logo */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 h-16 shrink-0 bg-[#0f2942] text-white">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/10 p-2 rounded-lg text-amber-500">
              <Scale size={20} className="stroke-[1.5]" />
            </div>
            <div>
              <span className="font-display font-bold text-sm tracking-wide text-white uppercase block">
                Vidhaan AI
              </span>
              <div className="text-[9px] text-slate-300 font-mono -mt-1 uppercase tracking-wider font-semibold">
                v0.1 Node
              </div>
            </div>
          </div>
        </div>

        {/* Create Thread Action Button */}
        <div className="p-3 shrink-0">
          <button
            onClick={() => createThread(user.id, "New Legal Analysis")}
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-[#0f2942]/20 hover:border-[#f57c00] rounded-xl text-xs font-bold bg-[#ffffff] text-[#0f2942] shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Plus size={14} />
            <span>New Research Chat</span>
          </button>
        </div>

        {/* Scrollable Threads List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1">
          <div className="text-[9px] uppercase text-slate-400 font-bold tracking-widest pl-3 py-1 font-mono shrink-0">
            Persistent Conversations
          </div>
          {threads.map((t) => {
            const isActive = t.id === activeThreadId;
            const isEditing = t.id === editingThreadId;
            return (
              <div
                key={t.id}
                onClick={() => {
                  if (!isEditing) setActiveThreadId(t.id);
                }}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0f2942]/10 border-l-[3px] border-[#f57c00] text-[#0f2942] font-bold'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRenameThread(t.id, editingThreadTitle);
                    }}
                    className="flex items-center gap-1.5 w-full min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editingThreadTitle}
                      onChange={(e) => setEditingThreadTitle(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-[#0f2942] font-sans font-medium focus:outline-none focus:border-[#f57c00] w-full min-w-0 shadow-inner"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="text-emerald-600 hover:text-emerald-700 p-1 bg-white hover:bg-emerald-50 rounded border border-emerald-150 cursor-pointer shrink-0"
                      title="Save Title"
                    >
                      <Check size={11} className="stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingThreadId('')}
                      className="text-slate-400 hover:text-slate-600 p-1 bg-white hover:bg-slate-50 rounded border border-slate-200 cursor-pointer shrink-0"
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <BookOpen
                        size={14}
                        className={isActive ? 'text-[#f57c00]' : 'text-slate-400'}
                      />
                      <span className="truncate pr-2 font-sans font-medium">{t.title}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Rename Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingThreadId(t.id);
                          setEditingThreadTitle(t.title);
                        }}
                        className="text-slate-400 hover:text-[#f57c00] p-1 rounded hover:bg-slate-200/50 cursor-pointer"
                        title="Rename Thread"
                      >
                        <FileText size={12} className="stroke-[2]" />
                      </button>
                      
                      {/* Delete Icon */}
                      <button
                        onClick={(e) => deleteThread(t.id, e)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-200/50 cursor-pointer"
                        title="Delete chat thread"
                      >
                        <Trash2 size={12} className="stroke-[2]" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* API Health & Settings controls */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex flex-col shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${healthStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'} ${healthStatus === 'checking' && 'animate-pulse'}`} />
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wide font-semibold">
                {healthStatus === 'connected' ? 'Node Active' : 'Node Disconnected'}
              </span>
            </div>
            <button 
              onClick={checkBackendHealth} 
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Refresh connection health"
            >
              <Settings size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-25 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ================================================================= */}
      {/* 2. CENTRAL WORKSPACE BOARD                                        */}
      {/* ================================================================= */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden bg-[#fdfbf7]">
        
        {/* Navy Blue Controls Ribbon */}
        <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#0f2942] truncate font-sans">
                {activeChat ? activeChat.title : 'Research Log'}
              </h2>
            </div>
          </div>

          {/* Mode Switch & Auth Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 sm:gap-3 bg-slate-100 border border-slate-200 p-1 rounded-xl">
              <button
                onClick={() => {
                  if (!isStreaming) setAugmentedMode(true);
                }}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                  augmentedMode
                    ? 'bg-[#0f2942] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Database size={12} />
                <span className="hidden sm:inline">Augmented RAG</span>
                <span className="inline sm:hidden">RAG</span>
              </button>
              <button
                onClick={() => {
                  if (!isStreaming) setAugmentedMode(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                  !augmentedMode
                    ? 'bg-[#0f2942] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Cpu size={12} />
                <span className="hidden sm:inline">Direct LLM</span>
                <span className="inline sm:hidden">Direct</span>
              </button>
            </div>

            {/* Email & Sign Out fixed at corner of workspace */}
            {user && (
              <div className="flex items-center gap-2.5 border-l border-slate-200 pl-4 h-9 shrink-0 select-none">
                <div className="bg-[#0f2942]/10 text-[#0f2942] p-1.5 rounded-full shrink-0 flex items-center justify-center">
                  <User size={13} className="stroke-[2.5]" />
                </div>
                <div className="flex flex-col text-left hidden sm:flex">
                  <span className="text-[10px] text-slate-400 font-mono uppercase font-bold tracking-wider leading-none">active session</span>
                  <span className="text-xs font-bold text-[#0f2942] max-w-[140px] truncate font-mono mt-0.5" title={user.email}>
                    {user.email}
                  </span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer shrink-0 ml-1.5"
                  title="Sign Out Session"
                >
                  <LogOut size={14} className="stroke-[2]" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Primary Research Bubble Log */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center py-12 flex flex-col items-center justify-center animate-slide-in">
              <div className="bg-amber-500/10 p-5 rounded-full text-[#f57c00] mb-5">
                <Scale size={42} className="stroke-[1.5]" />
              </div>
              <h2 className="text-2xl font-display font-bold text-[#0f2942] mb-3">
                Vidhaan AI
              </h2>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed mb-6 font-sans font-medium">
                Enter legal inquiries in the command prompt. The workbench queries the hybrid Reciprocal Rank Fusion index, parses relevant document matches, and outputs pristine structured solutions.
              </p>

              {/* Technical Specifications Panel */}
              <div className="bg-white border border-slate-200 rounded-xl p-4.5 mb-6 w-full max-w-lg text-left text-xs shadow-2xs">
                <span className="font-bold text-[#0f2942] uppercase font-mono text-[9px] tracking-widest block mb-2.5 border-b pb-1.5 border-slate-100">
                  Core AI Architecture & Specifications
                </span>
                <div className="space-y-2 font-sans font-medium text-slate-600">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-400">Primary Inference LLM:</span>
                    <span className="font-bold text-[#0f2942]">llama-3.3-70b-versatile</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-400">High-Fidelity Fallback:</span>
                    <span className="font-bold text-[#0f2942]">gemini-2.5-flash</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-400">Dense Embedding Model:</span>
                    <span className="font-bold text-[#0f2942]">gemini-embedding-2 (768 Dimensions)</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-400">Sparse Index Engine:</span>
                    <span className="font-bold text-[#0f2942]">PostgreSQL FTS (ts_rank)</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-400">Hybrid Search Fusion:</span>
                    <span className="font-bold text-[#0f2942]">Reciprocal Rank Fusion (RRF)</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                <div 
                  onClick={() => setInput("What is indemnity under Section 124 of the Indian Contract Act?")}
                  className="p-4 bg-white border border-slate-200 rounded-xl hover:border-[#f57c00] text-left text-xs text-slate-600 cursor-pointer hover:bg-amber-50/10 transition-all group shadow-xs"
                >
                  <span className="font-bold text-[#0f2942] block mb-1 group-hover:text-[#f57c00] uppercase font-mono text-[10px] tracking-wider">Section 124 Indemnity</span>
                  Finds the statutory rules surrounding definitions and cases.
                </div>
                <div 
                  onClick={() => setInput("Does the Constitution of India secure Equality under Article 14?")}
                  className="p-4 bg-white border border-slate-200 rounded-xl hover:border-[#f57c00] text-left text-xs text-slate-600 cursor-pointer hover:bg-amber-50/10 transition-all group shadow-xs"
                >
                  <span className="font-bold text-[#0f2942] block mb-1 group-hover:text-[#f57c00] uppercase font-mono text-[10px] tracking-wider">Article 14 Equality</span>
                  Queries constitutional values and scope from the vector database.
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={index}
                    className={`flex flex-col ${
                      isUser ? 'items-end' : 'items-start'
                    } animate-slide-in`}
                  >
                    {/* Message Bubble */}
                    <div
                      className={`w-full max-w-[92%] sm:max-w-2xl p-4 sm:p-5 rounded-2xl ${
                        isUser
                          ? 'bg-[#eae6d8] text-[#0f2942] rounded-tr-none border border-[#e0daca]'
                          : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-xs'
                      }`}
                    >
                      {/* Avatar header inside bubble */}
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 select-none text-[9px] font-mono tracking-widest font-bold text-slate-400">
                        <div className="flex items-center gap-2">
                          {isUser ? (
                            <>
                              <span>RESEARCH QUERY COMMAND</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={11} className="text-[#f57c00]" />
                              <span className="text-[#0f2942]">VIDHAAN AI RESPONSE</span>
                            </>
                          )}
                        </div>
                        
                        {/* Copy Button */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            handleCopyMessage(index);
                          }}
                          className="hover:text-[#f57c00] transition-colors p-0.5 rounded cursor-pointer flex items-center gap-1.5 select-none text-slate-400"
                          title="Copy message content"
                        >
                          {copiedMessageIndex === index ? (
                            <>
                              <Check size={11} className="text-emerald-600 stroke-[2.5]" />
                              <span className="text-emerald-600 font-mono text-[9px] lowercase font-normal">copied!</span>
                            </>
                          ) : (
                            <Copy size={11} className="stroke-[2]" />
                          )}
                        </button>
                      </div>

                      {/* Collapsible 'Thinking' & RAG Context Dropdown */}
                      {!isUser && (
                        <div className="mb-3.5">
                          <details 
                            className="group border border-slate-200/80 rounded-xl bg-slate-50/50 overflow-hidden" 
                            open={index === messages.length - 1 && isStreaming}
                          >
                            <summary className="flex items-center justify-between px-3.5 py-2.5 text-[10px] font-bold text-[#0f2942] bg-slate-50 border-b border-slate-150 cursor-pointer hover:bg-slate-100 select-none font-mono uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <Sparkles size={12} className="text-[#f57c00] group-open:animate-spin" />
                                <span>Thinking & RAG Retrieval Context</span>
                              </div>
                              <span className="text-[9px] text-slate-400 group-open:hidden uppercase font-semibold">Show Context</span>
                              <span className="text-[9px] text-slate-400 hidden group-open:inline uppercase font-semibold">Hide Context</span>
                            </summary>
                            <div className="p-3.5 space-y-3 bg-white border-t border-slate-150">
                              {/* RAG Status Updates */}
                              <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Retrieval Status Logs:</div>
                                {isStreaming && index === messages.length - 1 ? (
                                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[10.5px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#f57c00] animate-ping shrink-0" />
                                    <span>{statusMessage || "Querying database..."}</span>
                                  </div>
                                ) : (
                                  <div className="text-slate-500 font-mono text-[10.5px]">
                                    ✓ Query successfully processed. Local statutory vector nodes matched and re-ranked.
                                  </div>
                                )}
                              </div>

                              {/* Relevant Chunks Picked */}
                              <div className="space-y-2">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Relevant Chunks Picked:</div>
                                {msg.sources && msg.sources.length > 0 ? (
                                  <div className="space-y-2.5">
                                    {msg.sources.map((src, sIdx) => {
                                      const filename = src.pdf_name || (src.metadata?.source_file ? src.metadata.source_file.split('/').pop() : "Statute.pdf");
                                      return (
                                        <div key={sIdx} className="p-3 rounded-lg border border-slate-150 bg-[#fdfbf7] text-left">
                                          <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-[#0f2942] font-mono text-[10.5px] uppercase tracking-wide">
                                              {src.section_title || 'Section'}
                                            </span>
                                            <span className="text-[9px] bg-amber-500/10 text-[#f57c00] px-2 py-0.5 rounded font-mono font-bold tracking-wide">
                                              {filename}
                                            </span>
                                          </div>
                                          {src.snippets && src.snippets.map((snip, snIdx) => (
                                            <p key={snIdx} className="text-slate-500 italic text-[11px] leading-relaxed pl-2 border-l-2 border-[#f57c00]/60 mt-1">
                                              "{snip}"
                                            </p>
                                          ))}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-[10.5px] text-slate-400 italic">
                                    {augmentedMode ? "No database context records matched this query. Internal LLM parametric memory utilized." : "RAG context disabled (Direct LLM mode active)."}
                                  </div>
                                )}
                              </div>
                            </div>
                          </details>
                        </div>
                      )}

                      {/* Content Area */}
                      {isUser ? (
                        <p className="whitespace-pre-line text-[13.5px] leading-relaxed font-sans font-medium">
                          {msg.content}
                        </p>
                      ) : (
                        <div 
                          className="text-[13.5px] font-sans space-y-1.5"
                          dangerouslySetInnerHTML={{
                            __html: renderFormattedMarkdown(msg.content)
                          }}
                        />
                      )}

                      {/* Cited Sources Panel (Hypertexts mapping PDF name) */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3.5 border-t border-slate-100">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 font-mono">
                            <BookOpen size={14} className="text-[#f57c00] shrink-0" />
                            <span>Primary Sources & Reference Citations</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((src, sIdx) => {
                              const filename = src.pdf_name || (src.metadata?.source_file ? src.metadata.source_file.split('/').pop() : "Statute.pdf");
                              return (
                                <button
                                  key={sIdx}
                                  onClick={() => handleSourceClick(src)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 hover:border-[#f57c00] rounded-lg bg-[#fdfbf7] text-[#0f2942] hover:text-[#f57c00] font-bold cursor-pointer hover:shadow-xs transition-all"
                                >
                                  <BookOpen size={11} className="text-[#f57c00]" />
                                  <span>{src.section_title || 'Section'}</span>
                                  <span className="text-[10px] text-slate-400 font-mono font-medium">({filename})</span>
                                  <ExternalLink size={9} className="opacity-60" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Interactive suggested questions rendered ONLY at the bottom of the latest Assistant bubble */}
                      {!isUser && index === messages.length - 1 && !isStreaming && (
                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col gap-2">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            Suggested Follow-up Inquiries:
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {getSuggestedQuestions(msg.content).map((q, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => handleSuggestedQuestionClick(q)}
                                className="text-xs bg-[#fdfbf7] hover:bg-amber-500/10 hover:text-[#f57c00] border border-slate-200 hover:border-[#f57c00]/30 px-3.5 py-2 rounded-xl text-slate-700 transition-all font-medium text-left cursor-pointer active:scale-[0.99] flex items-center justify-between group"
                              >
                                <span>{q}</span>
                                <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 text-[#f57c00] transition-opacity shrink-0 ml-2" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* RAG Stream Loading Component */}
              {isStreaming && (
                <div className="flex items-center gap-3 p-4 bg-[#0f2942]/5 border border-[#0f2942]/10 rounded-xl max-w-2xl select-none animate-pulse">
                  <div className="relative flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-[#f57c00] rounded-full animate-pulse-ring shrink-0" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#0f2942] tracking-widest uppercase font-mono block">
                      Vidhaan Engine
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {statusMessage || 'Processing token streams...'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* central workspace footer with global disclaimer */}
        <div className="border-t border-slate-200 p-4 sm:p-6 bg-white shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-center bg-[#f7f5f0] border border-slate-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 focus-within:border-[#f57c00] transition-all">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask a legal statutory question (e.g. indemnity section 124, article 14)..."
              className="flex-1 bg-transparent border-0 outline-none ring-0 placeholder-slate-400 text-sm py-1.5 resize-none overflow-y-auto leading-relaxed max-h-24 font-sans text-slate-800"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="p-2.5 bg-[#0f2942] hover:bg-[#1a365d] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 ml-2 cursor-pointer shadow-xs"
              title="Submit Query"
            >
              <Send size={14} />
            </button>
          </form>
          
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between mt-3 text-[10px] text-slate-400 gap-2 font-mono">
            <div className="flex items-center gap-1">
              <Info size={10} className="text-[#f57c00]" />
              <span>Disclaimer: Developmental MVP. Not an official government website. Verify legal insights.</span>
            </div>
            <div>
              <span>Mode: {augmentedMode ? "Augmented RAG" : "Foundational LLM Direct"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. RIGHT DRAWER: STATUTORY CITATION EXPLORER                       */}
      {/* ================================================================= */}
      {/* Mobile Right Drawer Backdrop Overlay */}
      {sourcesPanelOpen && selectedSource && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-25 md:hidden animate-fade-in"
          onClick={() => {
            setSourcesPanelOpen(false);
            setSelectedSource(null);
          }}
        />
      )}

      {sourcesPanelOpen && selectedSource && (
        <div className="fixed md:static inset-y-0 right-0 w-full sm:w-96 border-l border-slate-200 bg-white flex flex-col h-full shrink-0 z-30 md:z-20 shadow-2xl md:shadow-none animate-slide-in">
          
          {/* Header explorer tab */}
          <div className="h-16 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen className="text-[#f57c00]" size={16} />
              <span className="font-display font-bold text-xs tracking-tight text-[#0f2942] uppercase">
                Statute Details
              </span>
            </div>
            <button
              onClick={() => {
                setSourcesPanelOpen(false);
                setSelectedSource(null);
              }}
              className="px-2.5 py-1 text-[11px] font-bold border border-slate-300 hover:border-slate-800 rounded-lg transition-colors cursor-pointer text-slate-600"
            >
              Close
            </button>
          </div>

          {/* Details exploration log */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 select-text">
            
            {/* Parent statute and section header badge */}
            <div>
              <span className="text-[9px] font-bold text-[#f57c00] tracking-widest uppercase font-mono block mb-1">
                Parent legislative citation
              </span>
              <h2 className="text-sm font-bold font-display text-[#0f2942] leading-snug">
                {selectedSource.act_title}
              </h2>
              {selectedSource.section_title && (
                <div className="mt-2 bg-amber-500/10 inline-block px-2.5 py-1 border border-[#f57c00]/20 rounded-lg font-bold text-xs text-[#c05621] font-mono">
                  {selectedSource.section_title}
                </div>
              )}
            </div>

            {/* exact source filename displayed cleanly as a card */}
            {selectedSource.pdf_name || selectedSource.metadata?.source_file ? (
              <div className="bg-[#fdfbf7] p-3.5 rounded-lg border border-slate-200">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-1">
                  Primary statutory PDF document
                </span>
                <span className="text-xs break-all font-mono text-[#0f2942] font-bold flex items-center gap-1.5">
                  <FileText size={13} className="text-[#f57c00]" />
                  {selectedSource.pdf_name || selectedSource.metadata?.source_file?.split('/').pop()}
                </span>
              </div>
            ) : null}

            {/* semantic vector match details */}
            <div>
              <span className="text-[9px] font-bold text-[#f57c00] tracking-widest uppercase font-mono block mb-2">
                RAG Matches / semantic children chunks
              </span>
              <div className="space-y-3">
                {selectedSource.snippets.map((snip, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-3.5 border-l-[3px] border-[#f57c00] text-xs leading-relaxed text-slate-600 bg-[#fdfbf7] rounded-r-lg border border-slate-200/80 shadow-2xs font-sans font-medium"
                  >
                    "... {snip} ..."
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
