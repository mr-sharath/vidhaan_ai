'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PWAInstallBanner from './components/PWAInstallBanner';
import {
  Scale,
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
  AlertCircle,
  Check,
  Copy,
  Info,
  ArrowRight,
  User,
  LogOut,
  Building,
  Briefcase,
  FileText,
  Settings,
  Sun,
  Moon,
  Pin,
  Notebook,
  ArrowLeft,
  Download,
  UploadCloud,
  Folder,
  FolderOpen,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';

interface Source {
  act_title: string;
  section_title: string;
  pdf_name?: string;
  pdf_relative_path?: string;
  metadata: {
    source_file?: string;
    [key: string]: unknown;
  };
  snippets: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  model?: string;
  searchMeta?: {
    count?: number;
    time_ms?: number;
    type?: string;
  };
  kbUtilization?: {
    utilized: boolean;
    explanation: string;
  };
}

interface Thread {
  id: string;
  title: string;
  is_pinned?: boolean;
  created_at: string;
}

interface UserSession {
  id: string;
  email: string;
  created_at: string;
  access_token?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function VidhaanAIWorkspace() {
  // --- User Auth & State ---
  const [user, setUser] = useState<UserSession | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // --- Profile & Welcome Modal States ---
  const [workspaceView, setWorkspaceView] = useState<'chat' | 'profile' | 'vault' | 'notebook'>('chat');
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);
  const [welcomeCheckbox, setWelcomeCheckbox] = useState<boolean>(false);
  const [profileActionLoading, setProfileActionLoading] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string>('');


  // --- Workspace State ---
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [augmentedMode, setAugmentedMode] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [showModeDropdown, setShowModeDropdown] = useState<boolean>(false);
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
  


  // Clipboard Copied State
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // --- Custom Knowledge Base Vault States ---
  const [kbs, setKbs] = useState<any[]>([]);
  const [selectedKbId, setSelectedKbId] = useState<string>('none');
  const [activeKbId, setActiveKbId] = useState<string | null>(null);
  const [newKbName, setNewKbName] = useState('');
  const [newKbDesc, setNewKbDesc] = useState('');
  const [isCreatingKb, setIsCreatingKb] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [pinnedCitationIds, setPinnedCitationIds] = useState<Set<string>>(new Set());

  // --- Inline Notebook States ---
  const [notebookCitations, setNotebookCitations] = useState<any[]>([]);
  const [notebookDraftContent, setNotebookDraftContent] = useState<string>('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState<string>('');
  const [notebookSidebarOpen, setNotebookSidebarOpen] = useState<boolean>(true);
  const [notebookCopySuccess, setNotebookCopySuccess] = useState<boolean>(false);
  const notebookTextareaRef = useRef<HTMLTextAreaElement>(null);


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
            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">&quot;A contract by which one party promises to save the other from loss caused to him...&quot;</p>
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
    },
    {
      title: "Containerized Knowledge Vaults",
      subtitle: "pgvector Isolated Retrieval",
      description: "Vidhaan AI supports isolated vector vaults with pgvector cosine similarity matching, combined with mediator RAG to match private cases with public acts.",
      bullets: [
        "Up to 5 files in parallel ingestion (.pdf, .docx, .txt)",
        "Secure tokenized ticket-based file streaming",
        "Mediator LLM matches vault facts to public indices"
      ],
      graphic: (
        <div className="space-y-2.5 text-left w-full">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-1.5 border-b border-slate-200">
            <span>VAULT ACTIONS</span>
            <span>STATUS</span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-[#0f2942] dark:text-slate-200">
            <span>Cosine Similarity Ingest</span>
            <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded font-mono">pgvector</span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-[#0f2942] dark:text-slate-200">
            <span>Secure Ticket preview</span>
            <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded font-mono">15s Ticket</span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-[#0f2942] dark:text-slate-200">
            <span>Multi-hop Mediator RAG</span>
            <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded font-mono">Mediator</span>
          </div>
        </div>
      )
    }
  ];


  const checkBackendHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (res.ok) {
        console.log("Database connectivity verified.");
      }
    } catch {
      console.warn("Database nodes offline.");
    }
  };

  const fetchThreads = async (userId: string) => {
    if (!user?.access_token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/threads?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
        const isFreshLogin = sessionStorage.getItem('vidhaan_fresh_login') === 'true';
        if (isFreshLogin) {
          sessionStorage.removeItem('vidhaan_fresh_login');
          // Start a fresh empty chat when user logs in freshly
          createThread(userId, "New Legal Analysis");
          // Keep sidebar closed on login to lead user directly to chat page
          setSidebarOpen(false);
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          const urlThreadId = urlParams.get('thread');
          const threadExists = data.some((t: any) => t.id === urlThreadId);
          
          if (urlThreadId && threadExists) {
            setActiveThreadId(urlThreadId);
          } else if (data.length > 0) {
            setActiveThreadId(data[0].id);
          } else {
            createThread(userId, "Statutory Investigation");
          }
        }
      }
    } catch (err) {
      console.error("Error loading threads:", err);
    }
  };

  const fetchThreadMessages = async (threadId: string) => {
    if (!user?.access_token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/threads/${threadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Error fetching message history:", err);
    }
  };

  const createThread = async (userId: string, title: string) => {
    if (!user?.access_token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({ user_id: userId, title: title })
      });
      if (res.ok) {
        const data = await res.json();
        setThreads((prev) => [data, ...prev]);
        setActiveThreadId(data.id);
        setMessages([]);
        setWorkspaceView('chat');
      }
    } catch (err) {
      console.error("Error creating new thread:", err);
    }
  };

  const togglePinThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.access_token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/threads/${threadId}/pin`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });
      if (res.ok) {
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, is_pinned: !t.is_pinned } : t))
        );
      }
    } catch (err) {
      console.error("Failed to pin/unpin thread:", err);
    }
  };

  const fetchPinnedCitations = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notebook`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        interface NotebookItem {
          act_title: string;
          section_title: string | null;
          snippet: string;
          id: string;
        }
        const data = await res.json();
        const keys = data.map((c: NotebookItem) => `${c.act_title}-${c.section_title}-${c.snippet}`);
        setPinnedCitationIds(new Set(keys));
      }
    } catch (err) {
      console.error("Failed to fetch pinned citations:", err);
    }
  };

  const handlePinCitation = async (src: Source) => {
    if (!user?.access_token) return;
    
    const snippet = src.snippets && src.snippets.length > 0 ? src.snippets[0] : "";
    const payload = {
      act_title: src.act_title,
      section_title: src.section_title || null,
      pdf_name: src.pdf_name || null,
      snippet: snippet,
      custom_notes: ""
    };
    
    const citationKey = `${src.act_title}-${src.section_title}-${snippet}`;
    const isAlreadyPinned = pinnedCitationIds.has(citationKey);
    
    if (isAlreadyPinned) {
      try {
        const getRes = await fetch(`${API_BASE_URL}/api/notebook`, {
          headers: { 'Authorization': `Bearer ${user.access_token}` }
        });
        if (getRes.ok) {
          interface NotebookItem {
            act_title: string;
            section_title: string | null;
            snippet: string;
            id: string;
          }
          const list = await getRes.json();
          const match = list.find((c: NotebookItem) => c.act_title === src.act_title && c.section_title === src.section_title && c.snippet === snippet);
          if (match) {
            const delRes = await fetch(`${API_BASE_URL}/api/notebook/pin/${match.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${user.access_token}` }
            });
            if (delRes.ok) {
              setPinnedCitationIds((prev) => {
                const next = new Set(prev);
                next.delete(citationKey);
                return next;
              });
              return;
            }
          }
        }
      } catch (err) {
        console.error("Failed to unpin citation:", err);
      }
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/notebook/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setPinnedCitationIds((prev) => {
          const next = new Set(prev);
          next.add(citationKey);
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to pin citation:", err);
    }
  };

  const deleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.access_token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/threads/${threadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
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
        sessionStorage.setItem('vidhaan_fresh_login', 'true');
        setShowAuthModal(false);
        setAuthPassword('');
        setAuthError('');
      } else {
        const errData = await res.json();
        setAuthError(errData.detail || 'Authentication server rejected details. Check credentials.');
      }
    } catch {
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

  const handleClearHistory = async () => {
    if (!user?.access_token) return;
    if (!confirm("Are you sure you want to clear your entire chat history? This will delete all threads and messages permanently.")) return;

    setProfileActionLoading(true);
    setProfileError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/threads`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });
      if (res.ok) {
        setThreads([]);
        setActiveThreadId('');
        setMessages([]);
        setWorkspaceView('chat');
        alert("Chat history cleared successfully.");
      } else {
        const data = await res.json();
        setProfileError(data.detail || "Failed to clear chat history from server.");
      }
    } catch {
      setProfileError("Cannot reach backend server. Verify connection.");
    } finally {
      setProfileActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.access_token) return;
    const confirm1 = confirm("⚠️ WARNING: This will permanently delete your account and all associated legal briefs, citations, and threads. This action is IRREVERSIBLE. Are you sure you want to proceed?");
    if (!confirm1) return;
    
    const confirm2 = confirm("Please confirm a second time: Do you want to permanently delete your account now?");
    if (!confirm2) return;

    setProfileActionLoading(true);
    setProfileError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });
      if (res.ok) {
        handleSignOut();
        alert("Account and data successfully deleted.");
      } else {
        const data = await res.json();
        setProfileError(data.detail || "Failed to delete account from server.");
      }
    } catch {
      setProfileError("Cannot reach backend. Account deletion incomplete.");
    } finally {
      setProfileActionLoading(false);
    }
  };

  const handleRenameThread = async (threadId: string, newTitle: string) => {
    if (!newTitle.trim() || !user?.access_token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
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

  // --- Initial Mount & Load user from localStorage ---
  useEffect(() => {
    const cachedUser = localStorage.getItem('vidhaan_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setTimeout(() => {
          setUser(parsed);
        }, 0);
      } catch (err) {
        console.error('Failed to parse cached user data', err);
      }
    }

    const cachedTheme = localStorage.getItem('vidhaan_theme');
    if (cachedTheme === 'dark') {
      setTimeout(() => {
        setDarkMode(true);
      }, 0);
    }
    
    // Automatically close sidebar on narrow mobile screens initially
    if (window.innerWidth < 768) {
      setTimeout(() => {
        setSidebarOpen(false);
      }, 0);
    }
    
    // Check Backend Connection Health
    checkBackendHealth();
  }, []);

  // Theme LocalStorage Sync Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vidhaan_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vidhaan_theme', 'light');
    }
  }, [darkMode]);

  // --- Load and sync threads when user changes ---
  useEffect(() => {
    if (user) {
      // Check if user accepted welcome disclaimer
      const accepted = localStorage.getItem(`vidhaan_accepted_disclaimer_${user.id}`);
      if (accepted !== 'true') {
        setWelcomeCheckbox(false);
        setShowWelcomeModal(true);
      } else {
        setShowWelcomeModal(false);
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchThreads(user.id);
      if (user.access_token) {
        fetchPinnedCitations(user.access_token);
      }
    } else {
      setShowWelcomeModal(false);
      setWorkspaceView('chat');
      setTimeout(() => {
        setThreads((prev) => prev.length > 0 ? [] : prev);
        setActiveThreadId((prev) => prev ? '' : prev);
        setMessages((prev) => prev.length > 0 ? [] : prev);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // --- Fetch Messages when activeThreadId changes ---
  useEffect(() => {
    if (activeThreadId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchThreadMessages(activeThreadId);
    } else {
      setTimeout(() => {
        setMessages((prev) => prev.length > 0 ? [] : prev);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThreadId]);

  // --- Scroll to bottom of chat log ---
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const isUser = lastMessage?.role === 'user';
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({
          behavior: isUser ? 'auto' : 'smooth',
          block: 'end'
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages, isStreaming]);

  // --- Custom Knowledge Base Vault Handlers ---
  const fetchKbs = async () => {
    if (!user?.access_token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/kb`, {
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKbs(data);
      }
    } catch (err) {
      console.error("Error fetching custom KBs:", err);
    }
  };

  useEffect(() => {
    if (user?.access_token) {
      fetchKbs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user?.access_token) return;
    const hasProcessing = kbs.some(kb => kb.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchKbs();
    }, 4000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kbs, user]);

  // Load initial view, thread, and vault states from URL parameters on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const threadParam = params.get('thread');
    const vaultParam = params.get('vault');
    
    if (viewParam === 'vault' || viewParam === 'profile' || viewParam === 'chat' || viewParam === 'notebook') {
      setWorkspaceView(viewParam as any);
    }
    if (threadParam) {
      setActiveThreadId(threadParam);
    }
    if (vaultParam) {
      setActiveKbId(vaultParam);
    }
  }, []);

  // Synchronize state changes to URL search parameters reactively
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (workspaceView && workspaceView !== 'chat') {
      params.set('view', workspaceView);
    }
    if (activeThreadId) {
      params.set('thread', activeThreadId);
    }
    if (activeKbId) {
      params.set('vault', activeKbId);
    }
    const newUrl = params.toString() ? `/?${params.toString()}` : '/';
    window.history.replaceState(null, '', newUrl);
  }, [workspaceView, activeThreadId, activeKbId]);

  const handleCreateKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.access_token || !newKbName.trim()) return;
    setIsCreatingKb(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/kb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({ name: newKbName, description: newKbDesc })
      });
      if (res.ok) {
        const data = await res.json();
        setKbs(prev => [data, ...prev]);
        setActiveKbId(data.id);
        setNewKbName('');
        setNewKbDesc('');
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to create custom vault.");
      }
    } catch (err) {
      console.error("Error creating custom KB:", err);
    } finally {
      setIsCreatingKb(false);
    }
  };

  const handleDeleteKb = async (kbId: string) => {
    if (!user?.access_token || !confirm("Are you sure you want to delete this custom vault and all its files?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/kb/${kbId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      });
      if (res.ok) {
        setKbs(prev => prev.filter(k => k.id !== kbId));
        if (activeKbId === kbId) setActiveKbId(null);
        if (selectedKbId === kbId) setSelectedKbId('none');
      }
    } catch (err) {
      console.error("Error deleting custom KB:", err);
    }
  };

  const handleUploadFile = async (kbId: string, file: File) => {
    if (!user?.access_token || !file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds the maximum limit of 5MB.");
      return;
    }
    setIsUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/kb/${kbId}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.access_token}` },
        body: formData
      });
      if (res.ok) {
        fetchKbs();
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to upload file to custom vault.");
      }
    } catch (err) {
      console.error("Error uploading file:", err);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteFile = async (kbId: string, docId: string) => {
    if (!user?.access_token || !confirm("Are you sure you want to delete this file from the custom vault?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/kb/${kbId}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      });
      if (res.ok) {
        fetchKbs();
      }
    } catch (err) {
      console.error("Error deleting custom vault file:", err);
    }
  };

  const handlePreviewFile = async (kbId: string, docId: string) => {
    if (!user?.access_token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/kb/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({ kb_id: kbId, doc_id: docId })
      });
      if (res.ok) {
        const data = await res.json();
        window.open(`${API_BASE_URL}/api/kb/view-file/${data.ticket}`, '_blank');
      } else {
        alert("Failed to generate secure preview ticket.");
      }
    } catch (err) {
      console.error("Error launching preview ticket:", err);
    }
  };

  // --- Inline Notebook Handlers ---
  const fetchNotebookCitations = async () => {
    if (!user?.access_token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notebook`, {
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotebookCitations(data);
      }
    } catch (err) {
      console.error("Error loading notebook citations:", err);
    }
  };

  const handleUnpinNotebookCitation = async (citationId: string) => {
    if (!user?.access_token || !confirm("Are you sure you want to remove this citation from your notebook?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notebook/pin/${citationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      });
      if (res.ok) {
        fetchNotebookCitations();
        fetchPinnedCitations(user.access_token);
      }
    } catch (err) {
      console.error("Error removing citation:", err);
    }
  };

  const handleSaveNotebookNotes = async (citationId: string) => {
    if (!user?.access_token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notebook/pin/${citationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({ custom_notes: editingNotesText })
      });
      if (res.ok) {
        setNotebookCitations((prev) =>
          prev.map((c) => (c.id === citationId ? { ...c, custom_notes: editingNotesText } : c))
        );
        setEditingNotesId(null);
      }
    } catch (err) {
      console.error("Failed to update notes:", err);
    }
  };

  const handleInsertNotebookReference = (c: any) => {
    if (!notebookTextareaRef.current) return;
    const citationText = `\n--- REFERENCE ---\nAct: ${c.act_title}\nSection: ${c.section_title || 'Unmarked'}\nSnippet: "${c.snippet}"\nNotes: ${c.custom_notes || 'None'}\n------------------\n\n`;
    const start = notebookTextareaRef.current.selectionStart;
    const end = notebookTextareaRef.current.selectionEnd;
    const currentText = notebookDraftContent;
    const updatedText = currentText.substring(0, start) + citationText + currentText.substring(end);
    
    setNotebookDraftContent(updatedText);
    localStorage.setItem('vidhaan_notebook_draft', updatedText);
    
    setTimeout(() => {
      if (notebookTextareaRef.current) {
        notebookTextareaRef.current.focus();
        notebookTextareaRef.current.selectionStart = notebookTextareaRef.current.selectionEnd = start + citationText.length;
      }
    }, 100);
  };

  const handleCopyNotebookDraft = () => {
    navigator.clipboard.writeText(notebookDraftContent);
    setNotebookCopySuccess(true);
    setTimeout(() => setNotebookCopySuccess(false), 2000);
  };

  const handleDownloadNotebookDraft = () => {
    const blob = new Blob([notebookDraftContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Vidhaan_Legal_Brief.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Draft Sync and citations trigger effects
  useEffect(() => {
    const savedDraft = localStorage.getItem('vidhaan_notebook_draft');
    if (savedDraft) {
      setNotebookDraftContent(savedDraft);
    } else {
      setNotebookDraftContent(
        `# LEGAL BRIEF OUTLINE\n\n## CASE ARGUMENTS & STATUTORY GROUNDS\n\nType your argument outline here. You can insert pinned statutory references from the left panel directly at the cursor using the "Insert Reference" option.\n\n`
      );
    }
  }, []);

  useEffect(() => {
    if (user && workspaceView === 'notebook') {
      fetchNotebookCitations();
    }
  }, [user, workspaceView]);

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
    let activeModel = '';
    let searchMeta: { count?: number; time_ms?: number; type?: string } | undefined = undefined;
    let streamedContent = '';

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.access_token) {
        headers['Authorization'] = `Bearer ${user.access_token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          augmented_mode: augmentedMode,
          user_id: user?.id,
          thread_id: activeThreadId,
          selected_kb_id: selectedKbId
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
              } else if (currentEvent === 'model') {
                activeModel = parsed;
                setMessages([
                  ...currentMessages,
                  {
                    role: 'assistant',
                    content: streamedContent,
                    sources: retrievedSources,
                    model: activeModel,
                    searchMeta
                  }
                ]);
              } else if (currentEvent === 'search_stats') {
                searchMeta = parsed;
                setMessages([
                  ...currentMessages,
                  {
                    role: 'assistant',
                    content: streamedContent,
                    sources: retrievedSources,
                    model: activeModel,
                    searchMeta
                  }
                ]);
              } else if (currentEvent === 'sources') {
                retrievedSources = parsed;
                setMessages([
                  ...currentMessages,
                  {
                    role: 'assistant',
                    content: streamedContent,
                    sources: retrievedSources,
                    model: activeModel,
                    searchMeta
                  }
                ]);
              } else if (currentEvent === 'token') {
                streamedContent += parsed;
                
                let cleanContent = streamedContent;
                let kbUtilization = undefined;
                const metaIdx = streamedContent.indexOf("__KB_UTILIZATION_METADATA__:");
                if (metaIdx !== -1) {
                  cleanContent = streamedContent.substring(0, metaIdx).trim();
                  const rawJson = streamedContent.substring(metaIdx + "__KB_UTILIZATION_METADATA__:".length).trim();
                  try {
                    kbUtilization = JSON.parse(rawJson);
                  } catch (e) {
                    const match = rawJson.match(/\{\s*"utilized"\s*:\s*(true|false)\s*,\s*"explanation"\s*:\s*"([\s\S]*?)"\s*\}/);
                    if (match) {
                      kbUtilization = {
                        utilized: match[1] === 'true',
                        explanation: match[2]
                      };
                    } else {
                      kbUtilization = {
                        utilized: rawJson.includes("true"),
                        explanation: "Analyzing custom document relevance..."
                      };
                    }
                  }
                }

                setMessages([
                  ...currentMessages,
                  {
                    role: 'assistant',
                    content: cleanContent,
                    sources: retrievedSources,
                    model: activeModel,
                    searchMeta,
                    kbUtilization
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
      if (user?.access_token) {
        const threadListRes = await fetch(`${API_BASE_URL}/api/threads?user_id=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${user.access_token}`
          }
        });
        if (threadListRes.ok) {
          const updatedThreads = await threadListRes.json();
          setThreads(updatedThreads);
        }
      }

    } catch (err) {
      console.error('API complete crash:', err);
      const errorObject = err as Error;
      const errMsg = errorObject.message || 'Verification of statutory DB failed.';
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
      .map((line) => {
        let clean = line;
        
        // Bold tags
        clean = clean.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-[#0f2942] dark:text-slate-100 font-bold font-sans">$1</strong>');
        
        // Italics
        clean = clean.replace(/\*([^*]+)\*/g, '<em class="text-slate-600 dark:text-slate-300 italic font-sans">$1</em>');
        
        // List styling
        if (clean.trim().startsWith('- ') || clean.trim().startsWith('* ')) {
          return `<li class="ml-6 list-disc text-slate-700 dark:text-slate-200 py-0.5 font-sans">${clean.replace(/^[-*]\s+/, '')}</li>`;
        }
        
        // Section headers
        if (clean.trim().startsWith('### ')) {
          return `<h3 class="text-sm font-bold text-[#0f2942] dark:text-[#dfc380] mt-4 mb-2 font-display flex items-center gap-1.5 uppercase tracking-wide border-t pt-2 border-slate-100 dark:border-[#2c2c2c]">${clean.replace(/^###\s+/, '')}</h3>`;
        }
        if (clean.trim().startsWith('## ')) {
          return `<h2 class="text-base font-bold text-[#0f2942] dark:text-[#dfc380] mt-6 mb-3 border-b border-slate-200 dark:border-[#2c2c2c] pb-1 font-display uppercase tracking-widest">${clean.replace(/^##\s+/, '')}</h2>`;
        }
        
        // Code markers / citations
        clean = clean.replace(/`([^`]+)`/g, '<code class="bg-[#f7f5f0] dark:bg-[#121212] text-[#0f2942] dark:text-[#dfc380] px-1.5 py-0.5 rounded font-mono text-xs border border-slate-200/60 dark:border-[#2c2c2c]">$1</code>');
        
        return `<p class="py-1 leading-relaxed text-slate-700 dark:text-slate-200 font-sans text-[13.5px]">${clean}</p>`;
      })
      .join('');
  };

  const renderThreadItem = (t: Thread) => {
    const isActive = t.id === activeThreadId;
    const isEditing = t.id === editingThreadId;
    return (
      <div
        key={t.id}
        onClick={() => {
          if (!isEditing) {
            setActiveThreadId(t.id);
            setWorkspaceView('chat');
          }
        }}
        className={`group flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
          isActive
            ? 'bg-[#0f2942]/10 dark:bg-[#dfc380]/10 border-l-[3px] border-[#f57c00] text-[#0f2942] dark:text-[#dfc380] font-bold'
            : 'hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-600 dark:text-slate-400'
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
              className="bg-white dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#2c2c2c] rounded-lg px-2 py-1 text-xs text-[#0f2942] dark:text-slate-100 font-sans font-medium focus:outline-none focus:border-[#f57c00] w-full min-w-0 shadow-inner"
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
              className="text-slate-400 hover:text-slate-650 p-1 bg-white hover:bg-slate-50 rounded border border-slate-200 cursor-pointer shrink-0"
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
            
            <div className="flex items-center gap-2 md:gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              {/* Pin Icon */}
              <button
                onClick={(e) => togglePinThread(t.id, e)}
                className={`p-1 rounded hover:bg-slate-200/50 cursor-pointer transition-colors ${
                  t.is_pinned 
                    ? 'text-amber-500 hover:text-amber-600' 
                    : 'text-slate-400 hover:text-slate-650'
                }`}
                title={t.is_pinned ? "Unpin thread from top" : "Pin thread to top"}
              >
                <Pin size={12} className={t.is_pinned ? 'fill-amber-500 stroke-[2]' : 'stroke-[2]'} />
              </button>

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
                className="text-slate-400 hover:text-red-650 p-1 rounded hover:bg-slate-200/50 cursor-pointer"
                title="Delete chat thread"
              >
                <Trash2 size={12} className="stroke-[2]" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // --- RENDER LANDING PAGE ---
  if (!user) {
    return (
      <div className={`min-h-screen bg-[#fdfbf7] dark:bg-[#121212] flex flex-col text-slate-800 dark:text-slate-200 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
        <PWAInstallBanner />
        {/* Premium Tricolor Light Header */}
        <header className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md text-slate-800 dark:text-slate-200 py-4 px-4 sm:px-6 border-b border-slate-200 dark:border-[#2c2c2c] shadow-xs sticky top-0 z-50 transition-colors">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="shrink-0 flex items-center justify-center">
                <img src="/icon-192.png" alt="Vidhaan AI" className="w-[36px] h-[36px] sm:w-[42px] sm:h-[42px] object-contain rounded-lg shadow-2xs border border-slate-100 dark:border-slate-800" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display font-extrabold text-lg sm:text-2xl tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                  VIDHAAN AI
                </h1>
                <p className="text-[7.5px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 font-sans font-bold tracking-widest -mt-0.5 uppercase truncate">
                  <span className="hidden sm:inline">Sovereign Legal Intelligence Platform of India</span>
                  <span className="inline sm:hidden">Legal AI Platform</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Theme Toggle Button */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="flex items-center justify-center p-2 rounded-lg border border-slate-350 dark:border-slate-700 hover:border-slate-800 dark:hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-[#252525] text-slate-700 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shrink-0"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-500" />}
              </button>

              {/* Install PWA Trigger Button */}
              <button
                onClick={() => (window as any).triggerPWAInstall?.()}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-350 dark:border-slate-700 hover:border-slate-800 dark:hover:border-slate-450 hover:bg-slate-50 dark:hover:bg-[#252525] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg font-bold transition-all text-xs sm:text-sm cursor-pointer shrink-0"
                title="Install PWA application"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Install App</span>
                <span className="inline sm:hidden">Install</span>
              </button>

              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-[#0f2942] dark:bg-slate-100 hover:bg-[#1a365d] dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg font-semibold shadow-sm hover:shadow transition-all text-xs sm:text-sm cursor-pointer shrink-0"
              >
                <User size={14} />
                <span className="hidden sm:inline">Sign In to Workbench</span>
                <span className="inline sm:hidden">Sign In</span>
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 animate-slide-in">
          <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-[#f57c00]/30 dark:border-[#dfc380]/40 rounded-full text-xs font-semibold text-[#f57c00] dark:text-[#dfc380]">
                <Sparkles size={12} />
                <span>Advanced Hybrid RAG Pipeline</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-extrabold text-[#0f2942] dark:text-white leading-tight">
                Empowering Indian Statutory & Constitutional Research
              </h2>
              <p className="text-base md:text-lg text-slate-600 dark:text-slate-350 leading-relaxed font-sans font-normal">
                An institutional-grade legal workbench mapping the entire codification landscape of Indian statutory law. Grounded directly in verified legislative drafts with zero disclaimers or AI preamble fluff.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-[#0f2942] hover:bg-[#1a365d] dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-bold transition-all text-sm shadow-md hover:shadow-lg cursor-pointer"
                >
                  <span>Access Legal Workbench</span>
                  <ArrowRight size={16} />
                </button>
                
                {/* Hero Install trigger button */}
                <button
                  onClick={() => (window as any).triggerPWAInstall?.()}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-350 hover:border-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-400 dark:hover:bg-[#252525] text-slate-700 hover:text-slate-900 dark:text-slate-350 dark:hover:text-white font-bold rounded-xl transition-all text-sm cursor-pointer"
                >
                  <Download size={15} />
                  <span>Install App</span>
                </button>

                <a
                  href="#scope"
                  className="flex items-center justify-center px-6 py-3 border border-slate-300 hover:border-slate-800 text-slate-700 dark:border-slate-700 dark:hover:border-slate-450 dark:text-slate-350 dark:hover:text-white font-bold rounded-xl transition-all text-sm cursor-pointer"
                >
                  View Database Ingestion Scope
                </a>
              </div>
            </div>

            {/* Ingestion Metric Display */}
            <div className="lg:col-span-5 bg-white dark:bg-[#1a1a1a] p-8 rounded-2xl border border-slate-200 dark:border-[#2c2c2c] shadow-sm relative overflow-hidden transition-colors">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
              <h3 className="text-lg font-bold text-[#0f2942] dark:text-white mb-6 flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-[#2c2c2c]">
                <Database className="text-[#f57c00] dark:text-[#dfc380]" size={20} />
                <span>Real-Time Index Status</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#fdfbf7] dark:bg-[#121212] border border-slate-100 dark:border-[#2c2c2c] rounded-xl hover:shadow-md hover:scale-[1.02] transition-all">
                  <span className="text-3xl font-extrabold text-[#0f2942] dark:text-white block">113</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-1">Acts Fully Ingested</span>
                </div>
                <div className="p-4 bg-[#fdfbf7] dark:bg-[#121212] border border-slate-100 dark:border-[#2c2c2c] rounded-xl hover:shadow-md hover:scale-[1.02] transition-all">
                  <span className="text-3xl font-extrabold text-[#0f2942] dark:text-white block">1,133</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-1">Legal Sections</span>
                </div>
                <div className="p-4 bg-[#fdfbf7] dark:bg-[#121212] border border-slate-100 dark:border-[#2c2c2c] rounded-xl hover:shadow-md hover:scale-[1.02] transition-all">
                  <span className="text-3xl font-extrabold text-[#0f2942] dark:text-white block">5,233</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-1">Vector Chunks</span>
                </div>
                <div className="p-4 bg-[#fdfbf7] dark:bg-[#121212] border border-slate-100 dark:border-[#2c2c2c] rounded-xl hover:shadow-md hover:scale-[1.02] transition-all">
                  <span className="text-3xl font-extrabold text-[#f57c00] dark:text-[#dfc380] block">4</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-1">Key Departments</span>
                </div>
              </div>
              
              {/* Technical Specifications Sub-Panel */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#2c2c2c]">
                <span className="text-[10px] font-bold text-[#f57c00] dark:text-[#dfc380] uppercase tracking-wider font-mono block mb-3">
                  Core AI Model & Engine Architecture
                </span>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 font-medium font-sans">
                  <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-[#2c2c2c]">
                    <span className="text-slate-400">LLM Inference Node</span>
                    <span className="text-[#0f2942] dark:text-slate-200 font-semibold text-right">llama-3.3-70b-versatile</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-[#2c2c2c]">
                    <span className="text-slate-400">Dense Embedding Model</span>
                    <span className="text-[#0f2942] dark:text-slate-200 font-semibold text-right">gemini-embedding-2</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Retrieval Pipeline</span>
                    <span className="text-[#0f2942] dark:text-slate-200 font-semibold text-right">Reciprocal Rank Fusion</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#2c2c2c] flex items-center justify-between text-xs text-slate-500">
                <span>Database Sync: <strong className="dark:text-slate-350">100% Complete</strong></span>
                <span className="flex items-center gap-1"><Check size={12} className="text-emerald-600 animate-pulse" /> Local Latency: &lt; 85ms</span>
              </div>
            </div>
          </div>

          {/* Features Grid Section */}
          <section className="bg-slate-100/50 dark:bg-[#0a0a0a] border-y border-slate-200/60 dark:border-[#2c2c2c] py-16 px-6 transition-colors">
            <div className="max-w-7xl mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h3 className="text-3xl font-display font-extrabold text-[#0f2942] dark:text-white mb-3">
                  Architected for Legal Professional Precision
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Explore key systems driving {"Vidhaan AI's"} search speed, grounded citations, and sovereign statutory safety.
                </p>
              </div>

              {/* Static 3-Column Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {carouselSlides.map((slide, idx) => (
                  <div key={idx} className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl shadow-sm overflow-hidden p-6 flex flex-col justify-between min-h-[380px] transition-colors">
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-[#0f2942]/10 dark:bg-slate-100/10 text-[#0f2942] dark:text-slate-300 rounded-full">
                        SYSTEM FEATURE {idx + 1}
                      </span>
                      <h4 className="text-xl font-bold text-[#0f2942] dark:text-white">
                        {slide.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans">
                        {slide.description}
                      </p>
                      <ul className="space-y-2 pt-2">
                        {slide.bullets.map((bullet, bulletIdx) => (
                          <li key={bulletIdx} className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                            <Check size={14} className="text-[#f57c00] dark:text-[#dfc380] shrink-0" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-[#fdfbf7] dark:bg-[#121212] p-4 rounded-xl border border-slate-200/80 dark:border-[#2c2c2c] flex flex-col justify-center items-center mt-6 min-h-[160px] max-h-[160px] overflow-hidden transition-colors">
                      {slide.graphic}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Scope Ingestion Section */}
          <section id="scope" className="max-w-7xl mx-auto px-6 py-16">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h3 className="text-3xl font-display font-extrabold text-[#0f2942] dark:text-[#dfc380] mb-3 transition-colors">
                Covered Departments & Legislative Scope
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                We actively ingest, tag, and structure statutory documents across key constitutional and judicial bodies in India.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Constitution */}
              <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl overflow-hidden hover:border-[#f57c00]/60 dark:hover:border-[#dfc380]/60 hover:shadow-md transition-all group flex flex-col">
                <div className="h-40 overflow-hidden relative shrink-0">
                  <img src="/constitution_of_india_card.jpg" alt="Constitution of India" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    <h4 className="font-bold text-base text-[#0f2942] dark:text-[#dfc380] font-display">
                      <a href="https://legislative.gov.in/constitution-of-india" target="_blank" rel="noopener noreferrer" className="hover:text-[#f57c00] dark:hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer">
                        <span>Constitution of India</span>
                        <span className="text-[10px] text-slate-400">↗</span>
                      </a>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans mt-1.5 text-left">
                      Complete articles covering parts, schedules, fundamental rights, directive principles, and critical constitutional amendments.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Department of Justice */}
              <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl overflow-hidden hover:border-[#f57c00]/60 dark:hover:border-[#dfc380]/60 hover:shadow-md transition-all group flex flex-col">
                <div className="h-40 overflow-hidden relative shrink-0">
                  <img src="/department_of_justice_card.jpg" alt="Department of Justice" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    <h4 className="font-bold text-base text-[#0f2942] dark:text-[#dfc380] font-display">
                      <a href="https://doj.gov.in/" target="_blank" rel="noopener noreferrer" className="hover:text-[#f57c00] dark:hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer">
                        <span>Department of Justice</span>
                        <span className="text-[10px] text-slate-400">↗</span>
                      </a>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans mt-1.5 text-left">
                      Rules, legal directives, organizational structures, judicial appointments, and legal administration statutes of India.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: Department of Legal Affairs */}
              <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl overflow-hidden hover:border-[#f57c00]/60 dark:hover:border-[#dfc380]/60 hover:shadow-md transition-all group flex flex-col">
                <div className="h-40 overflow-hidden relative shrink-0">
                  <img src="/dept_of_legal_affairs_card.jpg" alt="Department of Legal Affairs" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    <h4 className="font-bold text-base text-[#0f2942] dark:text-[#dfc380] font-display">
                      <a href="https://legalaffairs.gov.in/" target="_blank" rel="noopener noreferrer" className="hover:text-[#f57c00] dark:hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer">
                        <span>Dept of Legal Affairs</span>
                        <span className="text-[10px] text-slate-400">↗</span>
                      </a>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans mt-1.5 text-left">
                      Ingested treaties, litigation reports, contracts guidance, and statutory frameworks governing international & domestic arbitration.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 4: Legislative Department */}
              <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl overflow-hidden hover:border-[#f57c00]/60 dark:hover:border-[#dfc380]/60 hover:shadow-md transition-all group flex flex-col">
                <div className="h-40 overflow-hidden relative shrink-0">
                  <img src="/legislative_department_card.jpg" alt="Legislative Department" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    <h4 className="font-bold text-base text-[#0f2942] dark:text-[#dfc380] font-display">
                      <a href="https://legislative.gov.in/" target="_blank" rel="noopener noreferrer" className="hover:text-[#f57c00] dark:hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer">
                        <span>Legislative Department</span>
                        <span className="text-[10px] text-slate-400">↗</span>
                      </a>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans mt-1.5 text-left">
                      113 active acts, statutory rules, regulations, codifications, and state-wise gazette adjustments kept up-to-date.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Architecture Pipeline Map Section */}
          <section className="bg-slate-50 border-t border-slate-200/60 py-16 px-6">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="text-center max-w-2xl mx-auto mb-16">
                <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-[#0f2942]/10 text-[#0f2942] rounded-full uppercase tracking-wider">
                  Technical Architecture
                </span>
                <h3 className="text-3xl font-display font-extrabold text-[#0f2942] mt-3 mb-3">
                  Sovereign RAG Search & Notebook Pipeline
                </h3>
                <p className="text-slate-500 text-sm font-sans">
                  How statutory legal datasets flow from ingestion to dense-sparse retrieval, AI synthesis, and case briefing.
                </p>
              </div>

              {/* 3-Column Visual Map */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative max-w-5xl mx-auto">
                {/* SVG Connections (Visible on Desktop) */}
                <div className="hidden lg:block absolute inset-0 z-0 pointer-events-none">
                  {/* Connection from Col 1 to Col 2 */}
                  <svg className="absolute w-full h-full" style={{ left: 0, top: 0 }}>
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="#cbd5e1" />
                      </marker>
                    </defs>
                    {/* Line 1 */}
                    <line x1="31%" y1="20%" x2="65%" y2="20%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrow)" />
                    {/* Line 2 */}
                    <line x1="31%" y1="50%" x2="65%" y2="50%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrow)" />
                    {/* Line 3 */}
                    <line x1="31%" y1="80%" x2="65%" y2="80%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrow)" />
                    
                    {/* Connection from Col 2 to Col 3 */}
                    {/* Line 4 */}
                    <line x1="65%" y1="20%" x2="98%" y2="20%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrow)" />
                    {/* Line 5 */}
                    <line x1="65%" y1="50%" x2="98%" y2="50%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrow)" />
                    {/* Line 6 */}
                    <line x1="65%" y1="80%" x2="98%" y2="80%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrow)" />
                  </svg>
                </div>

                {/* COLUMN 1: Data Ingestion & Indexing (Storage Layer) */}
                <div className="space-y-6 z-10">
                  <div className="bg-[#0f2942]/10 dark:bg-[#0f2942]/5 p-3 rounded-lg flex items-center justify-center gap-2 max-w-[200px] mx-auto lg:mx-0">
                    <Database size={14} className="text-[#0f2942]" />
                    <span className="text-xs font-bold text-[#0f2942] uppercase tracking-wider">1. Ingest & Index</span>
                  </div>

                  {/* Card 1: Data Scraped & Saved */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all group min-h-[190px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#0f2942] mb-2">
                        <Scale size={16} className="text-[#f57c00]" />
                        <h4 className="font-bold text-sm font-display">Statutory Scraping & Extraction</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Authoritative Indian legislative acts and constitution articles are parsed, cleaned of OCR noise, and indexed.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md self-start uppercase">
                      Raw Statutory Acts
                    </span>
                  </div>

                  {/* Card 2: Chunking & Embeddings */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all group min-h-[190px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#0f2942] mb-2">
                        <Cpu size={16} className="text-[#f57c00]" />
                        <h4 className="font-bold text-sm font-display">Vector Space Embeddings</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Documents are split into semantic chunks and embedded into 768-dimensional space using gemini-embedding models.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md self-start uppercase">
                      768-Dim Dense Vectors
                    </span>
                  </div>

                  {/* Card 3: Storage Node */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all group min-h-[190px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#0f2942] mb-2">
                        <Database size={16} className="text-[#f57c00]" />
                        <h4 className="font-bold text-sm font-display">Sovereign Database Storage</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Saves text chunks, vector values, and user session profiles securely to the primary PostgreSQL (pgvector) database node.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md self-start uppercase">
                      PostgreSQL DB Node
                    </span>
                  </div>
                </div>

                {/* COLUMN 2: Query Processing & Retrieval (Logic Layer) */}
                <div className="space-y-6 z-10">
                  <div className="bg-amber-500/10 p-3 rounded-lg flex items-center justify-center gap-2 max-w-[200px] mx-auto">
                    <Settings size={14} className="text-[#f57c00]" />
                    <span className="text-xs font-bold text-[#f57c00] uppercase tracking-wider">2. Query & Retrieve</span>
                  </div>

                  {/* Card 4: Input Prompting & Routing */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all group min-h-[190px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#0f2942] mb-2">
                        <Sparkles size={16} className="text-[#f57c00]" />
                        <h4 className="font-bold text-sm font-display">System Prompting & Routing</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Directs inquiries through strict legal-focused system instructions, routing to RAG lookup or Direct LLM modes.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-amber-500/10 text-[#f57c00] rounded-md self-start uppercase">
                      Strict System Prompts
                    </span>
                  </div>

                  {/* Card 5: Dense-Sparse Search */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all group min-h-[190px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#0f2942] mb-2">
                        <Database size={16} className="text-[#f57c00]" />
                        <h4 className="font-bold text-sm font-display">Hybrid Dense-Sparse RAG</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Combines cosine vector similarity (dense) and BM25 text match (sparse) using Reciprocal Rank Fusion (RRF) algorithms.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-amber-500/10 text-[#f57c00] rounded-md self-start uppercase">
                      RRF Rank Merger
                    </span>
                  </div>

                  {/* Card 6: Validation Engine */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all group min-h-[190px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#0f2942] mb-2">
                        <Scale size={16} className="text-[#f57c00]" />
                        <h4 className="font-bold text-sm font-display">Statutory Verification</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Extracted statutory chunks are cross-referenced to verify relevance and ground truth before sending to LLM.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-amber-500/10 text-[#f57c00] rounded-md self-start uppercase">
                      Anti-Hallucination Guard
                    </span>
                  </div>
                </div>

                {/* COLUMN 3: Response Synthesis & Workspace (UI Layer) */}
                <div className="space-y-6 z-10">
                  <div className="bg-green-500/10 p-3 rounded-lg flex items-center justify-center gap-2 max-w-[200px] mx-auto lg:mx-0 lg:ml-auto">
                    <Notebook size={14} className="text-green-600" />
                    <span className="text-xs font-bold text-green-600 uppercase tracking-wider">3. Synthesize & Edit</span>
                  </div>

                  {/* Card 7: LLM Response Generation */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all group min-h-[190px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#0f2942] mb-2">
                        <Cpu size={16} className="text-[#f57c00]" />
                        <h4 className="font-bold text-sm font-display">Grounded LLM Synthesis</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Llama-3.3-70b-versatile processes the verified context, generating detailed legal insights containing exact footnoted acts.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-green-100 text-green-600 rounded-md self-start uppercase">
                      Llama 70B Engine
                    </span>
                  </div>

                  {/* Card 8: Stream Rendering */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all group min-h-[190px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#0f2942] mb-2">
                        <Sparkles size={16} className="text-[#f57c00]" />
                        <h4 className="font-bold text-sm font-display">Streaming Interface Response</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Token streams are rendered in real-time on the Next.js frontend chat workspace with clickable citation reference drawers.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-green-100 text-green-600 rounded-md self-start uppercase">
                      Next.js SSE Stream
                    </span>
                  </div>

                  {/* Card 9: Notebook Workspace */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all group min-h-[190px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#0f2942] mb-2">
                        <Notebook size={16} className="text-[#f57c00]" />
                        <h4 className="font-bold text-sm font-display">Case pad & My Notebook</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Researchers pin cited statutory references to &ldquo;My Notebook&rdquo; to write drafts, add custom notes, and export brief files.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-green-100 text-green-600 rounded-md self-start uppercase">
                      Brief Compiler PAD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Custom Knowledge Base Ingestion & Vector Pipeline Section */}
          <section className="bg-slate-50 dark:bg-[#121212]/30 border-t border-slate-200/60 dark:border-[#2c2c2c] py-16 px-6 transition-colors">
            <div className="max-w-6xl mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-[#0f2942]/10 dark:bg-[#dfc380]/10 text-[#0f2942] dark:text-[#dfc380] rounded-full uppercase tracking-wider">
                  Knowledge Vaults
                </span>
                <h3 className="text-3xl font-display font-extrabold text-[#0f2942] dark:text-[#dfc380] mt-3 mb-3">
                  Sovereign Custom Knowledge Base Pipeline
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-sans">
                  Securely parse, vectorize, and retrieve information from your private notices, warnings, and court proceedings in complete isolation.
                </p>
              </div>

              {/* 3-Column Visual Custom KB Pipeline */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative max-w-5xl mx-auto">
                {/* COLUMN 1: Custom Ingest & Parse */}
                <div className="space-y-6">
                  <div className="bg-[#0f2942]/10 dark:bg-[#dfc380]/10 p-3 rounded-lg flex items-center justify-center gap-2 max-w-[200px] mx-auto lg:mx-0">
                    <UploadCloud size={14} className="text-[#0f2942] dark:text-[#dfc380]" />
                    <span className="text-xs font-bold text-[#0f2942] dark:text-[#dfc380] uppercase tracking-wider">1. Secure Ingest</span>
                  </div>

                  <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl p-5 hover:shadow-md transition-all group min-h-[190px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#0f2942] dark:text-slate-200 mb-2">
                        <Folder size={16} className="text-[#f57c00] dark:text-[#dfc380]" />
                        <h4 className="font-bold text-sm font-display text-left">Containerized Custom Vaults</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans text-left">
                        Users create custom vault containers and upload files (.pdf, .docx, .txt) securely. Supports up to 5 concurrent documents.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-amber-100 dark:bg-amber-950/20 text-[#f57c00] dark:text-[#dfc380] rounded-md self-start uppercase">
                      Isolation Layer
                    </span>
                  </div>
                </div>

                {/* COLUMN 2: Vector Search & Chunking */}
                <div className="space-y-6">
                  <div className="bg-[#0f2942]/10 dark:bg-[#dfc380]/10 p-3 rounded-lg flex items-center justify-center gap-2 max-w-[200px] mx-auto lg:mx-0">
                    <Database size={14} className="text-[#0f2942] dark:text-[#dfc380]" />
                    <span className="text-xs font-bold text-[#0f2942] dark:text-[#dfc380] uppercase tracking-wider">2. Embed & Store</span>
                  </div>

                  <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl p-5 hover:shadow-md transition-all group min-h-[190px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#0f2942] dark:text-slate-200 mb-2">
                        <Cpu size={16} className="text-[#f57c00] dark:text-[#dfc380]" />
                        <h4 className="font-bold text-sm font-display text-left">pgvector Similarity Search</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans text-left">
                        Documents are chunked and converted into 768-dimensional embeddings using gemini-embedding-2. Stored using pgvector for cosine similarity.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-amber-100 dark:bg-amber-950/20 text-[#f57c00] dark:text-[#dfc380] rounded-md self-start uppercase">
                      pgvector DB
                    </span>
                  </div>
                </div>

                {/* COLUMN 3: Multi-hop retrieval */}
                <div className="space-y-6">
                  <div className="bg-[#0f2942]/10 dark:bg-[#dfc380]/10 p-3 rounded-lg flex items-center justify-center gap-2 max-w-[200px] mx-auto lg:mx-0">
                    <Sparkles size={14} className="text-[#0f2942] dark:text-[#dfc380]" />
                    <span className="text-xs font-bold text-[#0f2942] dark:text-[#dfc380] uppercase tracking-wider">3. Mediator RAG</span>
                  </div>

                  <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl p-5 hover:shadow-md transition-all group min-h-[190px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#0f2942] dark:text-slate-200 mb-2">
                        <Scale size={16} className="text-[#f57c00] dark:text-[#dfc380]" />
                        <h4 className="font-bold text-sm font-display text-left">Multi-Hop Synthesis</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans text-left">
                        A mediator LLM step analyzes your private document, extracts statutory names/sections, queries public indices, and synthesizes a combined output.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-amber-100 dark:bg-amber-950/20 text-[#f57c00] dark:text-[#dfc380] rounded-md self-start uppercase">
                      Mediator LLM Pipeline
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Session Memory Architecture Diagram Section */}
          <section className="bg-white dark:bg-[#121212] border-t border-slate-200/60 dark:border-[#2c2c2c] py-16 px-6 transition-colors">
            <div className="max-w-6xl mx-auto text-center">
              <div className="max-w-2xl mx-auto mb-10">
                <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-[#f57c00]/10 dark:bg-[#dfc380]/10 text-[#f57c00] dark:text-[#dfc380] rounded-full uppercase tracking-wider">
                  Sovereign Memory Architecture
                </span>
                <h3 className="text-3xl font-display font-extrabold text-[#0f2942] dark:text-[#dfc380] mt-3 mb-3">
                  Multi-Tiered Session Memory Engine
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-sans">
                  Trace how context tags, pinned references, and drafting whiteboards are persistent across user workbenches.
                </p>
              </div>
              
              <div className="max-w-4xl mx-auto border border-slate-200 dark:border-[#2c2c2c] rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#1a1a1a]/40 p-4 sm:p-6 shadow-sm">
                <img 
                  src="/memory-architecture.png" 
                  alt="Vidhaan AI Session Memory Architecture" 
                  className="w-full h-auto object-contain rounded-xl max-h-[500px]" 
                />
              </div>
            </div>
          </section>

          {/* Release History & Version Roadmap Section */}
          <section className="bg-white border-t border-slate-200/60 py-16 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-[#f57c00]/10 text-[#f57c00] rounded-full uppercase tracking-wider">
                  Evolutionary Roadmap
                </span>
                <h3 className="text-3xl font-display font-extrabold text-[#0f2942] mt-3 mb-3">
                  Release Status & Journey
                </h3>
                <p className="text-slate-500 text-sm font-sans">
                  Detailing the key technical milestones driving Vidhaan AI&apos;s legal intelligence evolution.
                </p>
              </div>

              {/* Symmetrical Dual Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {/* Version 0.1 Card */}
                <div className="bg-slate-50/50 dark:bg-[#1a1a1a]/40 border border-slate-200 dark:border-[#2c2c2c] rounded-2xl p-6 hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full uppercase">
                        v0.1 Release
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-bold font-mono">INITIAL MVP</span>
                    </div>
                    <h4 className="text-xl font-bold text-[#0f2942] dark:text-white font-display text-left">Core Retrieval & Search</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans text-left">
                      Established the foundational statutory RAG pipeline and vector structures.
                    </p>
                    <ul className="space-y-2 pt-2 text-left">
                      <li className="text-xs text-slate-750 dark:text-slate-300 flex items-center gap-2 font-medium">
                        <Check size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Indian Constitution & Acts Ingestion</span>
                      </li>
                      <li className="text-xs text-slate-750 dark:text-slate-300 flex items-center gap-2 font-medium">
                        <Check size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Dense-Sparse Hybrid Vector Indexing</span>
                      </li>
                      <li className="text-xs text-slate-750 dark:text-slate-300 flex items-center gap-2 font-medium">
                        <Check size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Dual Chat Interface (Direct LLM vs RAG)</span>
                      </li>
                      <li className="text-xs text-slate-750 dark:text-slate-300 flex items-center gap-2 font-medium">
                        <Check size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Interactive Dark-Mode Dashboard UI</span>
                      </li>
                    </ul>
                  </div>
                  <div className="border-t border-slate-200 dark:border-[#2c2c2c] pt-4 mt-6 text-[10px] text-slate-400 dark:text-slate-500 font-mono text-center">
                    Status: Deployed & Stable
                  </div>
                </div>

                {/* Version 0.2 Card */}
                <div className="bg-slate-50/50 dark:bg-[#1a1a1a]/40 border border-slate-200 dark:border-[#2c2c2c] rounded-2xl p-6 hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full uppercase">
                        v0.2 Release
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-bold font-mono">STABLE UPDATE</span>
                    </div>
                    <h4 className="text-xl font-bold text-[#0f2942] dark:text-white font-display text-left">Mobilization & Workspace</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans text-left">
                      Enhanced user collaboration, layout efficiency, and PWA packaging.
                    </p>
                    <ul className="space-y-2 pt-2 text-left">
                      <li className="text-xs text-slate-750 dark:text-slate-300 flex items-center gap-2 font-medium">
                        <Check size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Sovereign Fullscreen Mobile PWA</span>
                      </li>
                      <li className="text-xs text-slate-750 dark:text-slate-300 flex items-center gap-2 font-medium">
                        <Check size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>&ldquo;My Notebook&rdquo; Pinned Citations Panel</span>
                      </li>
                      <li className="text-xs text-slate-750 dark:text-slate-300 flex items-center gap-2 font-medium">
                        <Check size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Widescreen Layout Expansion (max-w-5xl)</span>
                      </li>
                      <li className="text-xs text-slate-750 dark:text-slate-300 flex items-center gap-2 font-medium">
                        <Check size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Refined 3D App Icon & UI Layout Cleanup</span>
                      </li>
                    </ul>
                  </div>
                  <div className="border-t border-slate-200 dark:border-[#2c2c2c] pt-4 mt-6 text-[10px] text-slate-400 dark:text-slate-500 font-mono text-center">
                    Status: Deployed & Stable
                  </div>
                </div>

                {/* Version 0.3 Card */}
                <div className="bg-white dark:bg-[#1a1a1a] border-2 border-[#f57c00]/60 dark:border-[#dfc380]/60 rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between transition-colors">
                  <div className="absolute top-0 right-0 bg-[#f57c00] dark:bg-[#dfc380] text-white dark:text-slate-950 text-[8px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-bl-lg font-mono">
                    ACTIVE RELEASE
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-[#f57c00]/10 dark:bg-[#dfc380]/10 text-[#f57c00] dark:text-[#dfc380] rounded-full uppercase">
                        v0.3 Release
                      </span>
                      <span className="text-xs text-[#f57c00] dark:text-[#dfc380] font-bold font-mono">ACTIVE</span>
                    </div>
                    <h4 className="text-xl font-bold text-[#0f2942] dark:text-white font-display text-left">Mediated Vaults & Citations</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans text-left">
                      Isolated custom knowledge vector storage combined with multi-hop mediator RAG pipelines.
                    </p>
                    <ul className="space-y-2 pt-2 text-left">
                      <li className="text-xs text-slate-750 dark:text-slate-300 flex items-center gap-2 font-medium">
                        <Check size={14} className="text-[#f57c00] dark:text-[#dfc380] shrink-0" />
                        <span>pgvector Vaults (Up to 5 files in parallel)</span>
                      </li>
                      <li className="text-xs text-slate-750 dark:text-slate-300 flex items-center gap-2 font-medium">
                        <Check size={14} className="text-[#f57c00] dark:text-[#dfc380] shrink-0" />
                        <span>Multi-hop Mediator RAG Search Engine</span>
                      </li>
                      <li className="text-xs text-slate-750 dark:text-slate-300 flex items-center gap-2 font-medium">
                        <Check size={14} className="text-[#f57c00] dark:text-[#dfc380] shrink-0" />
                        <span>Secure Token-Free 15-second Ticket Preview</span>
                      </li>
                      <li className="text-xs text-slate-750 dark:text-slate-300 flex items-center gap-2 font-medium">
                        <Check size={14} className="text-[#f57c00] dark:text-[#dfc380] shrink-0" />
                        <span>Inline Notebook Workspace with URL Query Sync</span>
                      </li>
                    </ul>
                  </div>
                  <div className="border-t border-slate-200 dark:border-[#2c2c2c] pt-4 mt-6 text-[10px] text-green-600 dark:text-green-500 font-mono text-center font-bold">
                    Status: Deployed & Active
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Sovereign Landing Page Footer */}
        <footer className="bg-slate-50 dark:bg-[#0a0a0a] text-slate-700 dark:text-slate-400 py-12 border-t border-slate-200 dark:border-[#2c2c2c] mt-12 transition-colors">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-slate-950 dark:text-white flex items-center gap-2">
                <img src="/icon-192.png" alt="Vidhaan AI" className="w-[24px] h-[24px] object-contain rounded-md shadow-3xs" /> VIDHAAN AI
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                {"India's"} premium legal-tech vector ground station. Processing local legal indexes under hybrid reciprocal rank fusion algorithms to yield un-hallucinated legislative analysis.
              </p>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-sans pt-1">
                <span>Contact & Support: </span>
                <a href="mailto:support@vidhaanai.online" className="text-[#f57c00] dark:text-[#dfc380] hover:text-[#dd6b20] dark:hover:text-amber-250 hover:underline font-semibold font-mono">
                  support@vidhaanai.online
                </a>
              </div>
            </div>
            <div className="space-y-3">
              <h5 className="font-semibold text-sm text-slate-800 dark:text-slate-200 font-display">Document Ingest Metrics</h5>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 font-sans font-medium">
                <li>• Ingested Sections: 1,133 pages</li>
                <li>• Total Vector Dimensions: 768 (gemini-embedding-2)</li>
                <li>• Active Models: llama-3.3-70b-versatile, gemini-2.5-flash</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h5 className="font-semibold text-sm text-slate-800 dark:text-slate-200 font-display">Institutional Disclaimer</h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans mb-3">
                Disclaimer: Developmental MVP. Not an official government website. Verify legal insights.
              </p>
              <div className="flex items-center gap-3 text-xs">
                <Link href="/terms" className="text-[#f57c00] dark:text-[#dfc380] hover:text-[#dd6b20] dark:hover:text-amber-250 hover:underline font-bold font-sans">
                  Terms & Conditions
                </Link>
                <span className="text-slate-300 dark:text-slate-650">|</span>
                <Link href="/privacy" className="text-[#f57c00] dark:text-[#dfc380] hover:text-[#dd6b20] dark:hover:text-amber-250 hover:underline font-bold font-sans">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 mt-8 pt-6 border-t border-slate-200 dark:border-[#2c2c2c] text-center text-[10px] text-slate-400 dark:text-slate-500 font-sans font-bold uppercase tracking-widest">
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
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#f57c00] focus:bg-white transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#dfc380] cursor-pointer transition-colors"
                      title={showPassword ? "Hide Password" : "Show Password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
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

                <div className="text-[11px] text-center text-slate-500 font-sans mt-2 leading-relaxed">
                  By signing in, you agree to our{' '}
                  <Link href="/terms" target="_blank" className="text-[#f57c00] hover:underline font-bold">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="text-[#f57c00] hover:underline font-bold">
                    Privacy Policy
                  </Link>.
                </div>

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

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const renderNotebookView = () => {
    const renderCitationsList = () => (
      <div className="h-full flex flex-col overflow-hidden bg-[#faf8f5] dark:bg-[#0d0d0d]">
        <div className="p-4 border-b border-slate-200 dark:border-[#2c2c2c] bg-white dark:bg-[#121212] shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#0f2942] dark:text-[#dfc380] flex items-center gap-1.5">
              <BookOpen size={13} className="text-[#f57c00]" />
              <span>Pinned Citations ({notebookCitations.length})</span>
            </h2>
            <button 
              onClick={() => setNotebookSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer text-xs font-bold p-1"
              title="Close panel"
            >
              ✕
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Select or copy statutory segments to draft legal briefings.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
          {notebookCitations.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-mono text-xs">
              No citations pinned yet.
              <br />
              <span className="text-[10px] block mt-1.5">
                Run statutory queries in the chat and bookmark primary sources.
              </span>
            </div>
          ) : (
            notebookCitations.map((c) => {
              const isEditing = editingNotesId === c.id;
              return (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2c2c2c] bg-white dark:bg-[#1a1a1a] hover:shadow-2xs transition-shadow text-left space-y-2.5 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0f2942] dark:text-[#dfc380] font-mono text-[11px] uppercase tracking-wide truncate max-w-[70%]">
                      {c.section_title || 'Statute Section'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {c.pdf_name && (() => {
                        const file = c.pdf_name;
                        let linkPath = "";
                        const filename = file.split('/').pop() || "";
                        if (file.toLowerCase().includes('constitution')) {
                          linkPath = `constitution/${filename}`;
                        } else if (file.toLowerCase().includes('legal_affairs') || file.toLowerCase().includes('mediation') || file.toLowerCase().includes('advocates') || file.toLowerCase().includes('notaries')) {
                          linkPath = `department_of_legal_affairs/${filename}`;
                        } else if (file.toLowerCase().includes('justice') || file.toLowerCase().includes('courts') || file.toLowerCase().includes('judges') || file.toLowerCase().includes('contempt')) {
                          linkPath = `department_of_justice/${filename}`;
                        } else {
                          linkPath = `legislative_department/${filename}`;
                        }
                        const linkUrl = `/data/${encodeURIComponent(linkPath).replace(/%2F/g, '/')}`;

                        return (
                          <a 
                            href={linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-[#dfc380]/10 text-slate-500 hover:text-[#f57c00] dark:text-slate-400 px-2 py-0.5 rounded font-mono font-bold truncate max-w-[80px] hover:underline transition-colors cursor-pointer"
                            title={`Open ${c.pdf_name}`}
                          >
                            {c.pdf_name}
                          </a>
                        );
                      })()}
                      <button
                        onClick={() => handleUnpinNotebookCitation(c.id)}
                        className="text-slate-400 hover:text-red-500 cursor-pointer p-0.5"
                        title="Remove citation"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 italic text-[11.5px] leading-relaxed pl-2 border-l-2 border-[#f57c00]/60 font-serif">
                    &quot;{c.snippet}&quot;
                  </p>

                  {/* Annotations / Notes */}
                  <div className="bg-[#fdfbf7] dark:bg-[#121212] rounded-lg p-2 border border-slate-100 dark:border-[#2c2c2c] text-[11px]">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                      My Research Notes:
                    </div>
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editingNotesText}
                          onChange={(e) => setEditingNotesText(e.target.value)}
                          className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#2c2c2c] rounded-md p-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none font-sans"
                          rows={3}
                          placeholder="Add brief details, court arguments, or notes..."
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditingNotesId(null)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 rounded text-[10px] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveNotebookNotes(c.id)}
                            className="px-2 py-1 bg-[#f57c00] hover:bg-[#dd6b20] text-white rounded text-[10px] cursor-pointer font-bold"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2 text-slate-600 dark:text-slate-300">
                        <span className="whitespace-pre-wrap leading-relaxed font-sans italic">
                          {c.custom_notes || 'No annotations added. Click edit to add notes.'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingNotesId(c.id);
                            setEditingNotesText(c.custom_notes || '');
                          }}
                          className="text-[#f57c00] hover:underline cursor-pointer font-bold shrink-0"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => handleInsertNotebookReference(c)}
                      className="flex-1 py-1.5 border border-dashed border-[#f57c00]/40 hover:border-[#f57c00] rounded-lg text-[10.5px] font-bold text-[#f57c00] bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus size={11} />
                      <span>Insert Reference</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );

    return (
      <div className="flex-1 flex flex-col h-full bg-[#fdfbf7] dark:bg-[#121212] overflow-hidden select-text">
        {/* Header toolbar */}
        <header className="h-16 border-b border-slate-200 dark:border-[#2c2c2c] px-6 flex items-center justify-between bg-white dark:bg-[#1a1a1a] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWorkspaceView('chat')}
              className="flex items-center justify-center p-2 rounded-xl bg-slate-150 dark:bg-[#2c2c2c] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#2c2c2c] cursor-pointer hover:bg-slate-200 dark:hover:bg-[#3c3c3c] transition-colors"
              title="Return to Chat Workspace"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h3 className="font-bold text-sm text-[#0f2942] dark:text-[#dfc380] text-left">
                My Legal Notebook
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-wide -mt-0.5 text-left">
                WHITEBOARD BRIEF EDITOR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyNotebookDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-[#2c2c2c] hover:border-slate-350 dark:hover:border-slate-400 rounded-lg text-[11px] font-bold text-slate-655 dark:text-slate-300 bg-white dark:bg-[#1a1a1a] cursor-pointer hover:shadow-xs transition-all"
            >
              {notebookCopySuccess ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
              <span>{notebookCopySuccess ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownloadNotebookDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-[#2c2c2c] hover:border-[#f57c00] dark:hover:border-[#dfc380] rounded-lg text-[11px] font-bold text-slate-655 dark:text-slate-300 hover:text-[#f57c00] dark:hover:text-[#dfc380] bg-white dark:bg-[#1a1a1a] cursor-pointer hover:shadow-xs transition-all"
            >
              <Download size={11} />
              <span>Export</span>
            </button>
          </div>
        </header>

        {/* Notebook Body layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Notebook citations panel */}
          <div className={`hidden md:flex flex-col bg-[#faf8f5] dark:bg-[#0d0d0d] border-r border-slate-200 dark:border-[#2c2c2c] overflow-hidden transition-all duration-300 shrink-0 ${
            notebookSidebarOpen ? 'w-80 lg:w-96' : 'w-0 border-r-0'
          }`}>
            {renderCitationsList()}
          </div>

          {/* Mobile notebook drawer citations */}
          {notebookSidebarOpen && (
            <div 
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-20 md:hidden animate-fade-in"
              onClick={() => setNotebookSidebarOpen(false)}
            />
          )}
          <div className={`fixed inset-y-0 left-0 top-16 w-[85%] max-w-[340px] bg-[#faf8f5] dark:bg-[#0d0d0d] border-r border-slate-200 dark:border-[#2c2c2c] z-30 flex flex-col overflow-hidden md:hidden transition-transform duration-300 shadow-2xl ${
            notebookSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            {renderCitationsList()}
          </div>

          {/* Text Editor Board */}
          <div className="flex-1 p-6 overflow-hidden flex flex-col bg-white dark:bg-[#121212]">
            <span className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 text-left">
              Notebook Editor Whiteboard
            </span>
            <textarea
              ref={notebookTextareaRef}
              value={notebookDraftContent}
              onChange={(e) => {
                setNotebookDraftContent(e.target.value);
                localStorage.setItem('vidhaan_notebook_draft', e.target.value);
              }}
              className="flex-1 w-full h-full bg-[#faf8f5] dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl p-6 text-sm text-slate-800 dark:text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#f57c00]/50 dark:focus:ring-[#dfc380]/50 shadow-inner overflow-y-auto resize-none"
              placeholder="Case Brief Outline..."
            />
          </div>
        </div>
      </div>
    );
  };

  const renderVaultView = () => {
    const activeKb = kbs.find(k => k.id === activeKbId);
    
    return (
      <div className="flex-1 flex flex-col h-full bg-[#fdfbf7] dark:bg-[#121212] select-text overflow-hidden">
        {/* Vault Header */}
        <header className="h-16 border-b border-slate-200 dark:border-[#2c2c2c] px-6 flex items-center justify-between bg-white dark:bg-[#1a1a1a] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWorkspaceView('chat')}
              className="flex items-center justify-center p-2 rounded-xl bg-slate-150 dark:bg-[#2c2c2c] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#2c2c2c] cursor-pointer hover:bg-slate-200 dark:hover:bg-[#3c3c3c] transition-colors"
              title="Return to Chat"
            >
              <ArrowLeft size={14} className="stroke-[2.5]" />
            </button>
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#dfc380] font-sans uppercase tracking-wider flex items-center gap-2">
              <FolderOpen size={16} className="text-[#f57c00] dark:text-[#dfc380]" />
              <span>Custom Knowledge Vaults</span>
            </h2>
          </div>
        </header>

        {/* Vault Dashboard Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT PANEL: Vaults List */}
          <div className="w-full md:w-80 border-r border-slate-200 dark:border-[#2c2c2c] bg-slate-50/50 dark:bg-[#0d0d0d]/40 flex flex-col overflow-y-auto p-4 space-y-4 shrink-0">
            {/* Create Vault Form */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl p-4 shadow-3xs space-y-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                Create New Vault
              </h3>
              <form onSubmit={handleCreateKb} className="space-y-2">
                <input
                  type="text"
                  placeholder="Vault Name (e.g. Eviction Notice)"
                  value={newKbName}
                  onChange={(e) => setNewKbName(e.target.value)}
                  maxLength={50}
                  required
                  className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#2c2c2c] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-sans font-medium focus:outline-none focus:border-[#f57c00] dark:focus:border-[#dfc380]"
                />
                <textarea
                  placeholder="Optional description..."
                  value={newKbDesc}
                  onChange={(e) => setNewKbDesc(e.target.value)}
                  maxLength={200}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#2c2c2c] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-sans font-medium focus:outline-none focus:border-[#f57c00] dark:focus:border-[#dfc380] resize-none"
                />
                <button
                  type="submit"
                  disabled={isCreatingKb}
                  className="w-full py-2 bg-[#0f2942] dark:bg-[#dfc380] hover:bg-[#1a365d] dark:hover:bg-[#d0b370] text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isCreatingKb ? "Creating..." : "Create Vault Container"}
                </button>
              </form>
            </div>

            {/* Vaults Grid List */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 font-mono">
                My Vault Containers ({kbs.length})
              </h3>
              
              {kbs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 font-sans">
                  No vaults created yet. Create one above to get started.
                </div>
              ) : (
                kbs.map((kb) => {
                  const isActive = kb.id === activeKbId;
                  const isProcessing = kb.status === 'processing';
                  const isFailed = kb.status === 'failed';
                  
                  return (
                    <div
                      key={kb.id}
                      onClick={() => setActiveKbId(kb.id)}
                      className={`p-3.5 border rounded-2xl transition-all cursor-pointer relative group flex flex-col gap-1.5 ${
                        isActive
                          ? 'border-[#f57c00] dark:border-[#dfc380] bg-[#f57c00]/5 dark:bg-[#dfc380]/5 shadow-3xs'
                          : 'border-slate-200 dark:border-[#2c2c2c] bg-white dark:bg-[#1a1a1a] hover:border-slate-350 dark:hover:border-slate-650'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate max-w-[150px]">
                          {kb.name}
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteKb(kb.id);
                          }}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer shrink-0"
                          title="Delete Vault"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {kb.description && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {kb.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/40 text-[9px] font-medium font-sans">
                        <span className="text-slate-400 dark:text-slate-500">
                          {kb.documents?.length || 0} / 5 files
                        </span>
                        
                        {/* Status badges */}
                        {isProcessing ? (
                          <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded-md font-bold animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                            Processing
                          </span>
                        ) : isFailed ? (
                          <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded-md font-bold">
                            Failed
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                            <Check size={9} className="stroke-[3]" /> Ready
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Ingested Files & Details */}
          <div className="flex-1 bg-white dark:bg-[#121212] overflow-y-auto p-6 space-y-6">
            {!activeKb ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-12 select-none">
                <Folder size={48} className="text-slate-300 dark:text-slate-700 stroke-[1.5]" />
                <div>
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                    No Active Vault Selected
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                    Select a vault container from the left panel to review uploaded files, upload new statutory notices, or check RAG processing status.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl space-y-6 animate-fade-in">
                {/* Vault Info Header Card */}
                <div className="bg-slate-50/50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-[#dfc380]">
                        {activeKb.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans font-medium">
                        Created: {new Date(activeKb.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="text-right shrink-0">
                      {activeKb.status === 'processing' ? (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-xl animate-pulse">
                          Ingesting Documents...
                        </span>
                      ) : activeKb.status === 'failed' ? (
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2.5 py-1 rounded-xl">
                          Pipeline Failed
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-xl flex items-center gap-1">
                          <Check size={11} className="stroke-[3]" /> Active Vault Ready
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {activeKb.description && (
                    <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-sans font-medium">
                      {activeKb.description}
                    </p>
                  )}
                </div>

                {/* File Upload zone */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Upload Documents (Limit: 5 files, 5MB max, PDF/DOCX/TXT)
                  </h4>
                  
                  <div className="border-2 border-dashed border-slate-200 dark:border-[#2c2c2c] hover:border-[#f57c00] dark:hover:border-[#dfc380] rounded-2xl p-6 transition-all bg-slate-50/20 dark:bg-[#1a1a1a]/10 flex flex-col items-center justify-center text-center cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      multiple
                      disabled={isUploadingFile || (activeKb.documents?.length || 0) >= 5}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        
                        const currentCount = activeKb.documents?.length || 0;
                        const slotsLeft = 5 - currentCount;
                        if (slotsLeft <= 0) {
                          alert("Vault is already full. (Limit: 5 files)");
                          return;
                        }
                        
                        const filesToUpload = files.slice(0, slotsLeft);
                        if (files.length > slotsLeft) {
                          alert(`You can only upload ${slotsLeft} more file(s) to this vault.`);
                        }
                        
                        filesToUpload.forEach(file => handleUploadFile(activeKb.id, file));
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <UploadCloud size={32} className="text-slate-400 dark:text-slate-600 mb-2 stroke-[1.5]" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isUploadingFile ? "Uploading and indexing document..." : "Drag & Drop or Click to Select File"}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Supports legal notices, hearing proceedings, warnings (.pdf, .docx, .txt)
                    </span>
                  </div>
                </div>

                {/* Uploaded Documents List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Ingested Files ({activeKb.documents?.length || 0} / 5)
                  </h4>
                  
                  {(!activeKb.documents || activeKb.documents.length === 0) ? (
                    <div className="text-center py-10 border border-slate-150 dark:border-[#2c2c2c] rounded-2xl text-xs text-slate-400 dark:text-slate-500 font-sans">
                      No documents uploaded in this vault container yet.
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-[#2c2c2c] rounded-2xl divide-y divide-slate-150 dark:divide-[#2c2c2c] overflow-hidden bg-slate-50/20 dark:bg-[#1a1a1a]/10">
                      {activeKb.documents.map((doc: any) => {
                        const isDocProcessing = doc.status === 'processing' || doc.status === 'uploaded';
                        const isDocFailed = doc.status === 'failed';
                        
                        return (
                          <div key={doc.id} className="p-4 flex items-center justify-between gap-4 bg-white dark:bg-[#1a1a1a]/60">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="bg-[#0f2942]/5 dark:bg-[#dfc380]/5 text-[#0f2942] dark:text-[#dfc380] p-2 rounded-xl shrink-0">
                                <FileText size={16} />
                              </div>
                              
                              <div className="min-w-0 flex flex-col text-left">
                                {!isDocFailed && !isDocProcessing ? (
                                  <button
                                    onClick={() => handlePreviewFile(activeKb.id, doc.id)}
                                    className="text-xs font-bold text-[#0f2942] dark:text-[#dfc380] hover:text-[#f57c00] dark:hover:text-amber-400 hover:underline truncate max-w-[280px] block text-left transition-colors cursor-pointer bg-transparent border-none p-0"
                                    title="Click to Preview Document"
                                  >
                                    {doc.filename}
                                  </button>
                                ) : (
                                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 truncate max-w-[280px] block text-left" title={doc.filename}>
                                    {doc.filename}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono mt-0.5">
                                  {formatBytes(doc.file_size)} • Ingested: {new Date(doc.created_at).toLocaleDateString()}
                                </span>
                                {doc.error_message && (
                                  <span className="text-[9px] text-red-500 font-medium font-sans mt-0.5 line-clamp-1">
                                    Error: {doc.error_message}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Document status text */}
                              {isDocProcessing ? (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-md animate-pulse flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping shrink-0" />
                                  Vectorizing
                                </span>
                              ) : isDocFailed ? (
                                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-md">
                                  Failed
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                                  <Check size={9} className="stroke-[3]" /> Vectorized
                                </span>
                              )}
                              
                              <button
                                onClick={() => handleDeleteFile(activeKb.id, doc.id)}
                                className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
                                title="Delete Document"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProfileView = () => {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#fdfbf7] dark:bg-[#121212] select-text overflow-y-auto">
        {/* Profile Header */}
        <header className="h-16 border-b border-slate-200 dark:border-[#2c2c2c] px-6 flex items-center justify-between bg-white dark:bg-[#1a1a1a] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWorkspaceView('chat')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-[#2c2c2c] hover:border-[#f57c00] text-slate-750 dark:text-slate-350 hover:text-[#f57c00] rounded-lg transition-colors cursor-pointer text-xs font-bold font-sans"
              title="Return to Chat Workspace"
            >
              <ArrowLeft size={14} />
              <span>Back to Chat</span>
            </button>
            <span className="text-slate-300 dark:text-[#2c2c2c]">|</span>
            <h2 className="text-sm font-bold text-[#0f2942] dark:text-[#dfc380] font-sans uppercase">
              User Profile & Settings
            </h2>
          </div>
        </header>

        {/* Profile Content */}
        <div className="max-w-2xl mx-auto px-6 py-10 w-full space-y-6 animate-slide-in">
          {profileError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          {/* Account Details Card */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-[#2c2c2c] pb-3">
              <div className="bg-[#0f2942]/10 dark:bg-[#dfc380]/10 text-[#0f2942] dark:text-[#dfc380] p-2.5 rounded-full flex items-center justify-center">
                <User size={20} className="stroke-[2]" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-[#0f2942] dark:text-slate-200 uppercase">
                  Account Credentials
                </h3>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-mono tracking-wider">
                  SECURE NATIONAL LEGAL WORKBENCH NODE
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div className="space-y-1">
                <span className="text-slate-450 dark:text-slate-500 font-medium block">Registered Email</span>
                <span className="font-bold text-[#0f2942] dark:text-slate-200 font-mono text-sm">{user?.email}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-450 dark:text-slate-500 font-medium block">Account Created At</span>
                <span className="font-bold text-[#0f2942] dark:text-slate-200 font-mono text-sm">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Legal Compliance Agreements Card */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-[#2c2c2c] pb-3">
              <div className="bg-amber-500/10 text-[#f57c00] p-2.5 rounded-full flex items-center justify-center">
                <Scale size={20} className="stroke-[2]" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-[#0f2942] dark:text-slate-200 uppercase">
                  Legal Compliance & Disclaimers
                </h3>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-mono tracking-wider">
                  REGULATORY STANDARDS & CONTRACTS
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Vidhaan AI operates as a research platform subject to regulatory Indian guidelines. You can access the terms and data policy agreements at any time:
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/terms"
                target="_blank"
                className="flex-1 p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#121212] dark:hover:bg-[#222222] border border-slate-200 dark:border-[#2c2c2c] rounded-xl text-center text-xs font-bold text-[#0f2942] dark:text-[#dfc380] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
              >
                <span>Read Terms of Service</span>
                <span className="text-[9px] text-[#f57c00]">↗</span>
              </Link>
              <Link
                href="/privacy"
                target="_blank"
                className="flex-1 p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#121212] dark:hover:bg-[#222222] border border-slate-200 dark:border-[#2c2c2c] rounded-xl text-center text-xs font-bold text-[#0f2942] dark:text-[#dfc380] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
              >
                <span>Read Privacy Policy</span>
                <span className="text-[9px] text-[#f57c00]">↗</span>
              </Link>
            </div>
          </div>

          {/* Privacy & Data Operations Card */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-2xl p-6 shadow-2xs space-y-4 border-l-4 border-red-500/80">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-[#2c2c2c] pb-3">
              <div className="bg-red-500/10 text-red-600 p-2.5 rounded-full flex items-center justify-center">
                <Trash2 size={20} className="stroke-[2] text-red-550" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-red-700 dark:text-red-400 uppercase">
                  Data Control Center
                </h3>
                <p className="text-[10px] text-red-500/85 font-mono tracking-wider">
                  DANGER ZONE • DESTRUCTION OPERATORS
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Perform administrative operations to clear databases of your personal inquiries, chat threads, or permanently remove your workbench credentials.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleClearHistory}
                disabled={profileActionLoading}
                className="flex-1 py-3 px-4 border border-slate-200 dark:border-[#2c2c2c] hover:border-red-500/50 text-slate-700 dark:text-slate-350 hover:text-red-650 dark:hover:text-red-450 rounded-xl text-xs font-bold bg-white dark:bg-[#1a1a1a] hover:bg-red-50/10 cursor-pointer transition-all disabled:opacity-50"
              >
                Clear Chat History
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={profileActionLoading}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-750 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
              >
                Delete Account & Data
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- RENDER DUAL PERSISTENT WORKSPACE ---
  const activeChat = threads.find((t) => t.id === activeThreadId);

  return (
    <div className={`flex flex-row h-screen w-screen overflow-hidden bg-[#fdfbf7] dark:bg-[#121212] text-slate-800 dark:text-slate-100 fixed inset-0 ${darkMode ? 'dark' : ''}`}>
      
      {/* ================================================================= */}
      {/* 1. LEFT SIDEBAR: ACTIVE DATABASE THREADS & AUTH                   */}
      {/* ================================================================= */}
      <div
        className={`${
          sidebarOpen 
            ? 'translate-x-0 w-[80vw] max-w-[300px] md:w-80 shadow-2xl md:shadow-none' 
            : '-translate-x-full w-[80vw] max-w-[300px] md:w-0 md:translate-x-0'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-[#2c2c2c] bg-[#f8fafc] dark:bg-[#0d0d0d] flex flex-col h-full z-30 md:z-20 overflow-hidden shrink-0`}
      >
        {/* Workspace Brand and Logo */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#2c2c2c] h-16 shrink-0 bg-white dark:bg-[#0a0a0a] text-slate-800 dark:text-white transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="shrink-0 flex items-center justify-center">
              <img src="/icon-192.png" alt="Vidhaan AI" className="w-[28px] h-[28px] object-contain rounded-md shadow-3xs border border-slate-100 dark:border-slate-850" />
            </div>
            <div>
              <span className="font-display font-bold text-sm tracking-wide text-slate-900 dark:text-white uppercase block">
                Vidhaan AI
              </span>
              <div className="text-[8px] text-slate-500 dark:text-slate-400 font-sans -mt-0.5 uppercase tracking-wider font-bold">
                version 0.2
              </div>
            </div>
          </div>
        </div>

        {/* Create Thread & Notebook Actions */}
        <div className="p-3 shrink-0 space-y-2">
          <button
            onClick={() => createThread(user.id, "New Legal Analysis")}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-[#2c2c2c] bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-slate-200 hover:border-[#f57c00] dark:hover:border-[#dfc380] shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Plus size={14} />
            <span>New Research Chat</span>
          </button>

          <button
            onClick={() => setWorkspaceView(workspaceView === 'notebook' ? 'chat' : 'notebook')}
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold border transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-xs ${
              workspaceView === 'notebook'
                ? 'bg-amber-50/60 dark:bg-[#dfc380]/10 border-[#f57c00] dark:border-[#dfc380] text-[#f57c00] dark:text-[#dfc380]'
                : 'border-slate-200 dark:border-[#2c2c2c] bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-slate-200 hover:border-[#f57c00] dark:hover:border-[#dfc380]'
            }`}
            title="Open Pinned Citations & Case Drafts"
          >
            <Notebook size={14} />
            <span>My Notebook</span>
          </button>

          <button
            onClick={() => setWorkspaceView(workspaceView === 'vault' ? 'chat' : 'vault')}
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold border transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-xs ${
              workspaceView === 'vault'
                ? 'bg-amber-50/60 dark:bg-[#dfc380]/10 border-[#f57c00] dark:border-[#dfc380] text-[#f57c00] dark:text-[#dfc380]'
                : 'border-slate-200 dark:border-[#2c2c2c] bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-slate-200 hover:border-[#f57c00] dark:hover:border-[#dfc380]'
            }`}
            title="Manage Custom Knowledge Bases"
          >
            {workspaceView === 'vault' ? <FolderOpen size={14} /> : <Folder size={14} />}
            <span>My Custom Vaults</span>
          </button>
        </div>

        {/* Scrollable Threads List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1">
          {/* Pinned Threads */}
          {threads.some((t) => t.is_pinned) && (
            <div className="mb-4">
              <div className="text-[9px] uppercase text-slate-400 font-bold tracking-widest pl-3 py-1.5 font-mono shrink-0 flex items-center gap-1.5 select-none">
                <Pin size={10} className="text-amber-500 fill-amber-500" />
                <span>Pinned Conversations</span>
              </div>
              <div className="space-y-1">
                {threads
                  .filter((t) => t.is_pinned)
                  .map((t) => renderThreadItem(t))}
              </div>
            </div>
          )}

          {/* Regular Threads */}
          <div>
            <div className="text-[9px] uppercase text-slate-400 font-bold tracking-widest pl-3 py-1.5 font-mono shrink-0 select-none">
              Recent Research Logs
            </div>
            <div className="space-y-1">
              {threads
                .filter((t) => !t.is_pinned)
                .map((t) => renderThreadItem(t))}
            </div>
          </div>
        </div>

        {/* Workspace Theme Toggle Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-[#2c2c2c] bg-white dark:bg-[#0d0d0d] flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Settings size={14} className="animate-spin-slow text-slate-400 dark:text-slate-500" />
            <span className="text-xs font-semibold font-sans">Workspace Theme</span>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1a1a1a] dark:hover:bg-[#2c2c2c] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2c2c2c] cursor-pointer transition-all shadow-2xs"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-slate-500" />}
          </button>
        </div>

        {/* User Profile & Logout section at bottom of sidebar */}
        {user && (
          <div className="p-3.5 border-t border-slate-200 dark:border-[#2c2c2c] bg-white dark:bg-[#0d0d0d] flex items-center justify-between select-none shrink-0">
            <div 
              onClick={() => setWorkspaceView(workspaceView === 'profile' ? 'chat' : 'profile')}
              className={`flex items-center gap-2.5 min-w-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1a1a1a] p-1.5 rounded-xl transition-all mr-1 flex-1 select-none ${
                workspaceView === 'profile' ? 'bg-[#0f2942]/10 dark:bg-[#dfc380]/10' : ''
              }`}
              title="View Profile & Account Settings"
            >
              <div className="bg-[#0f2942]/10 dark:bg-[#dfc380]/10 text-[#0f2942] dark:text-[#dfc380] p-1.5 rounded-full shrink-0 flex items-center justify-center">
                <User size={13} className="stroke-[2.5]" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono uppercase font-bold tracking-wider leading-none">
                  {workspaceView === 'profile' ? 'settings' : 'profile'}
                </span>
                <span className="text-xs font-bold text-[#0f2942] dark:text-slate-300 truncate font-mono mt-0.5 max-w-[90px]" title={user.email}>
                  {user.email}
                </span>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer shrink-0 ml-1.5 text-xs font-bold font-sans"
              title="Logout Session"
            >
              <LogOut size={13} className="stroke-[2.5]" />
              <span>Logout</span>
            </button>
          </div>
        )}


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
      {workspaceView === 'profile' ? (
        renderProfileView()
      ) : workspaceView === 'vault' ? (
        renderVaultView()
      ) : workspaceView === 'notebook' ? (
        renderNotebookView()
      ) : (
        <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden bg-[#fdfbf7] dark:bg-[#121212]">
        <PWAInstallBanner />
        
        {/* Navy Blue Controls Ribbon */}
        <header className="h-16 border-b border-slate-200 dark:border-[#2c2c2c] px-6 flex items-center justify-between bg-white dark:bg-[#1a1a1a] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-[#2c2c2c] rounded-lg text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#0f2942] dark:text-[#dfc380] truncate font-sans">
                {activeChat ? activeChat.title : 'Research Log'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Spacious Right Header */}
            <button
              onClick={() => (window as any).triggerPWAInstall?.()}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-[#2c2c2c] hover:border-slate-850 dark:hover:border-slate-400 text-slate-650 dark:text-slate-350 hover:text-slate-900 rounded-lg transition-colors cursor-pointer text-xs font-bold shrink-0"
              title="Install Vidhaan AI App"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Install App</span>
            </button>
          </div>
        </header>

        {/* Primary Research Bubble Log */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 scroll-smooth">
          {messages.length === 0 ? (
            <div className="max-w-5xl mx-auto text-center py-12 flex flex-col items-center justify-center animate-slide-in">
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
                  className="p-4 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] hover:border-slate-800 dark:hover:border-slate-400 text-left text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#222222] transition-all group shadow-xs"
                >
                  <span className="font-bold text-slate-850 dark:text-slate-200 block mb-1 group-hover:text-slate-950 dark:group-hover:text-white uppercase font-mono text-[10px] tracking-wider">Section 124 Indemnity</span>
                  Finds the statutory rules surrounding definitions and cases.
                </div>
                <div 
                  onClick={() => setInput("Does the Constitution of India secure Equality under Article 14?")}
                  className="p-4 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] hover:border-slate-800 dark:hover:border-slate-400 text-left text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#222222] transition-all group shadow-xs"
                >
                  <span className="font-bold text-slate-850 dark:text-slate-200 block mb-1 group-hover:text-slate-950 dark:group-hover:text-white uppercase font-mono text-[10px] tracking-wider">Article 14 Equality</span>
                  Queries constitutional values and scope from the vector database.
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-6">
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
                      className={`w-full max-w-[95%] sm:max-w-5xl p-4 sm:p-5 rounded-2xl ${
                        isUser
                          ? 'bg-[#eae6d8] dark:bg-[#252525] text-[#0f2942] dark:text-slate-100 rounded-tr-none border border-[#e0daca] dark:border-[#333333]'
                          : 'bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-[#2c2c2c] shadow-xs'
                      }`}
                    >
                      {/* Avatar header inside bubble */}
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-[#2c2c2c] select-none text-[9px] font-mono tracking-widest font-bold text-slate-400">
                        <div className="flex items-center gap-2">
                          {isUser ? (
                            <>
                              <span>RESEARCH QUERY COMMAND</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={11} className="text-[#f57c00]" />
                              <span className="text-[#0f2942] dark:text-[#dfc380]">VIDHAAN AI RESPONSE</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] tracking-normal font-sans uppercase font-bold shrink-0 ${
                                msg.sources && msg.sources.length > 0
                                  ? 'bg-[#f57c00]/15 text-[#f57c00]' 
                                  : 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-400'
                              }`}>
                                {msg.sources && msg.sources.length > 0 ? 'Statutory RAG' : 'Direct LLM'}
                              </span>
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
                                 <span className="hidden sm:inline">Thinking & RAG Retrieval Context</span><span className="inline sm:hidden">RAG Context</span>
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
                                              &quot;{snip}&quot;
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
                        <div>
                          <div 
                            className="text-[13.5px] font-sans space-y-1.5"
                            dangerouslySetInnerHTML={{
                              __html: renderFormattedMarkdown(msg.content)
                            }}
                          />
                          
                          {msg.kbUtilization && (
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-[#121212]/50 border border-slate-150 dark:border-[#2c2c2c] rounded-xl flex items-start gap-2.5 max-w-2xl text-[11px] animate-fade-in select-none">
                              {msg.kbUtilization.utilized ? (
                                <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg shrink-0 flex items-center justify-center">
                                  <ShieldCheck size={14} className="stroke-[2.5]" />
                                </div>
                              ) : (
                                <div className="bg-slate-105 dark:bg-slate-800 text-slate-500 dark:text-slate-400 p-1.5 rounded-lg shrink-0 flex items-center justify-center">
                                  <Info size={14} className="stroke-[2.5]" />
                                </div>
                              )}
                              <div className="flex flex-col text-left space-y-0.5 min-w-0">
                                <span className="text-[9px] uppercase font-bold tracking-widest font-mono text-slate-400">
                                  Custom Vault Ingest
                                </span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {msg.kbUtilization.utilized ? "Vault Documents Utilized" : "Vault Documents Evaluated"}
                                </span>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-sans font-medium">
                                  {msg.kbUtilization.explanation}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Model & Search Execution Metadata Footer */}
                          {(msg.model || msg.searchMeta) && (
                            <div className="mt-3.5 pt-2 border-t border-slate-100 dark:border-[#2c2c2c] flex flex-wrap items-center justify-between gap-3 text-[9px] text-slate-400 dark:text-slate-500 font-mono select-none">
                              {msg.model && (
                                <div className="flex items-center gap-1">
                                  <Cpu size={10} className="text-[#f57c00]" />
                                  <span>Model: <span className="font-bold text-[#0f2942] dark:text-[#dfc380]">{msg.model}</span></span>
                                </div>
                              )}
                              {msg.searchMeta && (
                                <div className="flex items-center gap-1">
                                  <Sparkles size={10} className="text-[#f57c00]" />
                                  <span>Search: <span className="font-bold text-slate-650 dark:text-slate-350">{msg.searchMeta.type}</span> ({msg.searchMeta.count} chunks in {msg.searchMeta.time_ms}ms)</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cited Sources Panel (Hypertexts mapping PDF name) */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-[#2c2c2c]">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 font-mono">
                            <BookOpen size={14} className="text-[#f57c00] shrink-0" />
                            <span>Primary Sources & Reference Citations</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((src, sIdx) => {
                              const filename = src.pdf_name || (src.metadata?.source_file ? src.metadata.source_file.split('/').pop() : "Statute.pdf") || "Statute.pdf";
                              const snippet = src.snippets && src.snippets.length > 0 ? src.snippets[0] : "";
                              const citationKey = `${src.act_title}-${src.section_title}-${snippet}`;
                              const isPinned = pinnedCitationIds.has(citationKey);
                              
                              return (
                                <div key={sIdx} className="flex items-center bg-[#fdfbf7] dark:bg-[#121212] border border-slate-200 dark:border-[#2c2c2c] rounded-lg shadow-2xs overflow-hidden">
                                  <button
                                    onClick={() => handleSourceClick(src)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#0f2942] dark:text-slate-200 hover:text-[#f57c00] font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1a1a1a] border-r border-slate-200 dark:border-[#2c2c2c] transition-all"
                                    title="View statute details"
                                  >
                                    <BookOpen size={11} className="text-[#f57c00] shrink-0" />
                                    <span className="font-bold text-slate-800 dark:text-slate-200 hover:text-[#f57c00] transition-colors">{filename.replace(/\.pdf$/i, '')}</span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium shrink-0">({src.section_title || 'Section'})</span>
                                    <ExternalLink size={9} className="opacity-65 shrink-0" />
                                  </button>
                                  <button
                                    onClick={() => handlePinCitation(src)}
                                    className={`px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-all flex items-center gap-1 text-[10px] font-bold ${
                                      isPinned ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-slate-650'
                                    }`}
                                    title={isPinned ? "Unpin citation from My Notebook" : "Pin citation to My Notebook"}
                                  >
                                    <Pin size={10} className={isPinned ? 'fill-amber-500 stroke-[2]' : 'stroke-[2]'} />
                                    <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Interactive suggested questions rendered ONLY at the bottom of the latest Assistant bubble */}
                      {!isUser && index === messages.length - 1 && !isStreaming && (
                        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-[#2c2c2c] flex flex-col gap-2">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            Suggested Follow-up Inquiries:
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {getSuggestedQuestions(msg.content).map((q, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => handleSuggestedQuestionClick(q)}
                                className="text-xs bg-[#fdfbf7] dark:bg-[#121212] hover:bg-amber-500/10 dark:hover:bg-amber-500/5 hover:text-[#f57c00] border border-slate-200 dark:border-[#2c2c2c] hover:border-[#f57c00]/30 px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-300 transition-all font-medium text-left cursor-pointer active:scale-[0.99] flex items-center justify-between group"
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
                <div className="flex items-center gap-3 p-4 bg-[#0f2942]/5 dark:bg-[#dfc380]/5 border border-[#0f2942]/10 dark:border-[#dfc380]/20 rounded-xl max-w-5xl select-none animate-pulse">
                  <div className="relative flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-[#f57c00] dark:bg-[#dfc380] rounded-full animate-pulse-ring shrink-0" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#0f2942] dark:text-[#dfc380] tracking-widest uppercase font-mono block">
                      Vidhaan Engine ({augmentedMode ? 'Augmented RAG' : 'Direct LLM'})
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
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
        <div className="border-t border-slate-200 dark:border-[#2c2c2c] p-4 sm:p-6 bg-white dark:bg-[#1a1a1a] shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto relative flex items-center bg-[#f7f5f0] dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 focus-within:border-[#f57c00] transition-all">
            <div className="relative shrink-0 mr-2 border-r border-slate-200 dark:border-[#2c2c2c] pr-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents focus theft, keeping mobile keyboard open!
                  if (!isStreaming) setShowModeDropdown(!showModeDropdown);
                }}
                className="flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-slate-100 dark:bg-[#121212] dark:hover:bg-[#252525] border border-slate-200 dark:border-[#2c2c2c] rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer transition-all shadow-3xs text-[10px] font-bold"
                title={augmentedMode ? "Statutory Search active (Augmented RAG)" : "Direct LLM active (No statutory context)"}
              >
                {augmentedMode ? (
                  <>
                    <Database size={11} className="text-[#f57c00]" />
                    <span>RAG</span>
                  </>
                ) : (
                  <>
                    <Cpu size={11} className="text-[#0f2942] dark:text-slate-400" />
                    <span>Direct</span>
                  </>
                )}
                <span className="text-[7px] text-slate-400">▼</span>
              </button>

              {/* Custom mode dropdown to prevent keypad collapse */}
              {showModeDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowModeDropdown(false);
                    }}
                  />
                  <div className="absolute bottom-full left-0 mb-1 w-28 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] rounded-lg shadow-lg z-20 py-1 overflow-hidden">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setAugmentedMode(true);
                        setShowModeDropdown(false);
                      }}
                      className={`flex items-center gap-1.5 w-full px-2.5 py-1.5 text-left text-[10px] font-bold transition-colors cursor-pointer ${
                        augmentedMode 
                          ? 'bg-amber-500/10 text-[#f57c00]' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Database size={11} className="text-[#f57c00]" />
                      <span>RAG Mode</span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setAugmentedMode(false);
                        setShowModeDropdown(false);
                      }}
                      className={`flex items-center gap-1.5 w-full px-2.5 py-1.5 text-left text-[10px] font-bold transition-colors cursor-pointer ${
                        !augmentedMode 
                          ? 'bg-slate-100 dark:bg-[#1a1a1a] text-[#0f2942] dark:text-[#dfc380]' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Cpu size={11} className="text-[#0f2942] dark:text-slate-400" />
                      <span>Direct LLM</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Custom Knowledge Base Selector Dropdown */}
            <div className="relative shrink-0 flex items-center mr-2 border-r border-slate-200 dark:border-[#2c2c2c] pr-2">
              <select
                value={selectedKbId}
                onChange={(e) => setSelectedKbId(e.target.value)}
                className="appearance-none bg-white dark:bg-[#121212] hover:bg-slate-100 dark:hover:bg-[#252525] border border-slate-200 dark:border-[#2c2c2c] rounded-lg pl-2 pr-6 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none focus:ring-0 leading-tight transition-colors shadow-3xs"
                title="Select Custom Knowledge Base Vault"
              >
                <option value="none">📁 Public Knowledge Only</option>
                {kbs
                  .filter(k => k.status === 'ready')
                  .map(k => (
                    <option key={k.id} value={k.id}>
                      📁 {k.name} ({k.documents?.length || 0})
                    </option>
                  ))
                }
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 dark:text-slate-500">
                <svg className="fill-current h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>

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
              className="flex-1 bg-transparent border-0 outline-none ring-0 placeholder-slate-400 text-base md:text-sm py-1.5 resize-none overflow-y-auto leading-relaxed max-h-24 font-sans text-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="p-2.5 bg-[#0f2942] dark:bg-[#dfc380] hover:bg-[#1a365d] dark:hover:bg-[#d0b370] disabled:bg-slate-200 dark:disabled:bg-[#252525] disabled:text-slate-400 text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 ml-2 cursor-pointer shadow-xs"
              title="Submit Query"
            >
              <Send size={14} />
            </button>
          </form>
          
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between mt-3 text-[10px] text-slate-400 dark:text-slate-500 gap-2 font-mono">
            <div className="flex items-center gap-1.5 leading-normal text-center sm:text-left">
              <Info size={10} className="text-[#f57c00] shrink-0 font-bold" />
              <span>Vidhaan AI can make mistakes and may generate inaccurate case laws. This is for research purposes only and does not constitute official legal advice. Verify important information.</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 text-center sm:text-right">
              <span className="text-[#f57c00] font-bold shrink-0">Engine:</span>
              <span>
                {augmentedMode 
                  ? "Augmented RAG (Grounded)" 
                  : "Direct LLM (Parametric)"}
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

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
        <div className="fixed md:static inset-y-0 right-0 w-[85vw] sm:w-96 border-l border-slate-200 dark:border-[#2c2c2c] bg-white dark:bg-[#1a1a1a] flex flex-col h-full shrink-0 z-30 md:z-20 shadow-2xl md:shadow-none animate-slide-in">
          
          {/* Header explorer tab */}
          <div className="h-16 border-b border-slate-200 dark:border-[#2c2c2c] px-4 flex items-center justify-between bg-slate-50 dark:bg-[#0d0d0d] shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen className="text-[#f57c00]" size={16} />
              <span className="font-display font-bold text-xs tracking-tight text-[#0f2942] dark:text-[#dfc380] uppercase">
                Statute Details
              </span>
            </div>
            <button
              onClick={() => {
                setSourcesPanelOpen(false);
                setSelectedSource(null);
              }}
              className="px-2.5 py-1 text-[11px] font-bold border border-slate-300 dark:border-[#2c2c2c] hover:border-slate-800 dark:hover:border-slate-400 rounded-lg transition-colors cursor-pointer text-slate-600 dark:text-slate-400"
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
              <h2 className="text-sm font-bold font-display text-[#0f2942] dark:text-slate-200 leading-snug">
                {selectedSource.act_title}
              </h2>
              {selectedSource.section_title && (
                <div className="mt-2 bg-amber-500/10 inline-block px-2.5 py-1 border border-[#f57c00]/20 rounded-lg font-bold text-xs text-[#c05621] dark:text-[#dfc380] font-mono">
                  {selectedSource.section_title}
                </div>
              )}
            </div>

            {/* exact source filename displayed cleanly as a card (Hyperlinked to hosted PDF) */}
            {(() => {
              const file = selectedSource.pdf_name || selectedSource.metadata?.source_file;
              if (!file) return null;
              
              let linkPath = "";
              if (selectedSource.pdf_relative_path) {
                linkPath = selectedSource.pdf_relative_path;
              } else {
                const filename = file.split('/').pop() || "";
                if (file.toLowerCase().includes('constitution')) {
                  linkPath = `constitution/${filename}`;
                } else if (file.toLowerCase().includes('legal_affairs') || file.toLowerCase().includes('mediation') || file.toLowerCase().includes('advocates') || file.toLowerCase().includes('notaries')) {
                  linkPath = `department_of_legal_affairs/${filename}`;
                } else if (file.toLowerCase().includes('justice') || file.toLowerCase().includes('courts') || file.toLowerCase().includes('judges') || file.toLowerCase().includes('contempt')) {
                  linkPath = `department_of_justice/${filename}`;
                } else {
                  linkPath = `legislative_department/${filename}`;
                }
              }
              const linkUrl = `/data/${encodeURIComponent(linkPath).replace(/%2F/g, '/')}`;

              return (
                <a 
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-[#fdfbf7] dark:bg-[#121212] p-3.5 rounded-lg border border-slate-200 dark:border-[#2c2c2c] hover:border-[#f57c00] dark:hover:border-[#dfc380] hover:shadow-xs transition-all group cursor-pointer"
                >
                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-[#f57c00] transition-colors uppercase tracking-widest font-mono block mb-1">
                    Primary statutory PDF document (Click to open)
                  </span>
                  <span className="text-xs break-all font-mono text-[#0f2942] dark:text-slate-300 font-bold flex items-center gap-1.5 group-hover:underline">
                    <FileText size={13} className="text-[#f57c00]" />
                    {selectedSource.pdf_name || file.split('/').pop()}
                  </span>
                </a>
              );
            })()}

            {/* semantic vector match details */}
            <div>
              <span className="text-[9px] font-bold text-[#f57c00] tracking-widest uppercase font-mono block mb-2">
                RAG Matches / semantic children chunks
              </span>
              <div className="space-y-3">
                {selectedSource.snippets.map((snip, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-3.5 border-l-[3px] border-[#f57c00] text-xs leading-relaxed text-slate-600 dark:text-slate-400 bg-[#fdfbf7] dark:bg-[#121212] rounded-r-lg border border-slate-200/80 dark:border-[#2c2c2c] shadow-2xs font-sans font-medium"
                  >
                    &quot;... {snip} ...&quot;
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Disclaimer Modal Pop-up */}
      {showWelcomeModal && user && (
        <div className="fixed inset-0 bg-[#0f2942]/70 backdrop-blur-md flex items-center justify-center p-4 z-55 select-text">
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-in">
            <div className="bg-[#0f2942] text-white p-6 border-b-4 border-[#f57c00] flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg text-amber-500 shrink-0">
                <Scale size={24} className="stroke-[2]" />
              </div>
              <div>
                <h3 className="font-bold text-lg font-display">
                  Welcome to Vidhaan AI
                </h3>
                <p className="text-[9px] text-slate-350 font-mono tracking-wider uppercase mt-0.5">
                  SOVEREIGN LEGAL INTELLIGENCE BENCH
                </p>
              </div>
            </div>
            
            <div className="p-6 space-y-4 text-slate-800 dark:text-slate-200">
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-sans">
                Vidhaan AI is an advanced research and statutory mapping platform for Indian legal texts. Before you begin using the workspace, you must acknowledge and accept our platform disclosures.
              </p>

              <div className="p-4 bg-amber-500/5 dark:bg-[#121212] border border-[#f57c00]/25 dark:border-[#2c2c2c] rounded-xl space-y-2.5">
                <div className="flex items-start gap-2.5 text-[11px] leading-relaxed">
                  <span className="text-[#f57c00] font-bold mt-0.5">•</span>
                  <span><strong>No Legal Advice:</strong> Vidhaan AI provides statutory retrieval and query summarization. It does not act as a legal advocate or practitioner. No attorney-client relationship is created.</span>
                </div>
                <div className="flex items-start gap-2.5 text-[11px] leading-relaxed">
                  <span className="text-[#f57c00] font-bold mt-0.5">•</span>
                  <span><strong>AI Verification Required:</strong> AI systems can make mistakes, hallucinate details, or query outdated provisions. Always cross-reference generated citations with official Gazettes of India.</span>
                </div>
              </div>

              <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#2c2c2c] rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1a2533] transition-colors">
                <input
                  type="checkbox"
                  checked={welcomeCheckbox}
                  onChange={(e) => setWelcomeCheckbox(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 dark:border-[#2c2c2c] text-[#f57c00] focus:ring-[#f57c00] cursor-pointer"
                />
                <span className="text-[11px] leading-normal text-slate-650 dark:text-slate-400 font-semibold select-none">
                  I understand that Vidhaan AI is an AI assistant, not a substitute for a licensed advocate.
                </span>
              </label>

              <button
                onClick={() => {
                  if (welcomeCheckbox) {
                    localStorage.setItem(`vidhaan_accepted_disclaimer_${user.id}`, 'true');
                    setShowWelcomeModal(false);
                  }
                }}
                disabled={!welcomeCheckbox}
                className="w-full py-3 bg-[#0f2942] hover:bg-[#1a365d] dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-[#121212] disabled:bg-slate-200 dark:disabled:bg-[#252525] disabled:text-slate-400 text-white font-bold rounded-xl text-sm shadow-sm transition-all cursor-pointer mt-2"
              >
                Accept & Start Chatting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
