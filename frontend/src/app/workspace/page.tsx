'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PWAInstallBanner from '../components/PWAInstallBanner';
import {
  Scale,
  ArrowLeft,
  Trash2,
  BookOpen,
  Download,
  Printer,
  Copy,
  Check,
  FileText,
  Plus
} from 'lucide-react';

interface NotebookCitation {
  id: string;
  act_title: string;
  section_title: string | null;
  pdf_name: string | null;
  snippet: string;
  custom_notes: string | null;
  created_at: string;
}

interface UserSession {
  id: string;
  email: string;
  access_token: string;
}

export default function WorkspaceNotebook() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [citations, setCitations] = useState<NotebookCitation[]>([]);
  const [draftContent, setDraftContent] = useState<string>('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Fetch Notebook Citations
  const fetchNotebook = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notebook`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCitations(data);
      }
    } catch (e) {
      console.error("Failed to load notebook database:", e);
    }
  };

  // Load Session and Draft on mount
  useEffect(() => {
    // 1. Theme Configuration
    const cachedTheme = localStorage.getItem('vidhaan_theme');
    if (cachedTheme === 'dark') {
      setTimeout(() => {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      }, 0);
    }

    // 2. Auth Session Check
    const cachedUser = localStorage.getItem('vidhaan_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setTimeout(() => {
          setUser(parsed);
          fetchNotebook(parsed.access_token);
        }, 0);
      } catch (e) {
        console.error("Auth session parse error:", e);
        window.location.href = '/';
      }
    } else {
      // Redirect to home if not signed in
      window.location.href = '/';
    }

    // 3. Draft Restore
    const savedDraft = localStorage.getItem('vidhaan_notebook_draft');
    setTimeout(() => {
      if (savedDraft) {
        setDraftContent(savedDraft);
      } else {
        setDraftContent(
          `# LEGAL BRIEF OUTLINE\n\n## CASE ARGUMENTS & STATUTORY GROUNDS\n\nType your argument outline here. You can insert pinned statutory references from the left panel directly at the cursor using the "Insert Reference" option.\n\n`
        );
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save draft content to localStorage
  const handleDraftChange = (text: string) => {
    setDraftContent(text);
    localStorage.setItem('vidhaan_notebook_draft', text);
  };

  // Unpin / Remove Citation
  const handleUnpin = async (citationId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to remove this citation from your notebook?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/notebook/pin/${citationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });
      if (res.ok) {
        setCitations((prev) => prev.filter((c) => c.id !== citationId));
      }
    } catch (e) {
      console.error("Unpin error:", e);
    }
  };

  // Save Notes for Citation
  const handleSaveNotes = async (citationId: string) => {
    if (!user) return;
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
        setCitations((prev) =>
          prev.map((c) => (c.id === citationId ? { ...c, custom_notes: editingNotesText } : c))
        );
        setEditingNotesId(null);
      }
    } catch (e) {
      console.error("Failed to update notes:", e);
    }
  };

  // Insert citation snippet at cursor position
  const handleInsertReference = (c: NotebookCitation) => {
    if (!textareaRef.current) return;

    const citationText = `\n--- REFERENCE ---\nAct: ${c.act_title}\nSection: ${c.section_title || 'Unmarked'}\nSnippet: "${c.snippet}"\nNotes: ${c.custom_notes || 'None'}\n------------------\n\n`;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentText = draftContent;

    const updatedText = currentText.substring(0, start) + citationText + currentText.substring(end);
    handleDraftChange(updatedText);

    // Reset cursor focus
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + citationText.length;
      }
    }, 100);
  };

  // Copy Draft to Clipboard
  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Download Brief as Text
  const handleDownload = () => {
    const blob = new Blob([draftContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Vidhaan_Legal_Brief.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print outline
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans select-none bg-[#fdfbf7] dark:bg-[#0d131a] text-slate-800 dark:text-slate-100 ${darkMode ? 'dark' : ''}`}>
      <PWAInstallBanner />
      
      {/* 1. Header ribbon */}
      <header className="h-16 border-b border-slate-200 dark:border-[#243242] bg-white dark:bg-[#151e29] px-6 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-[#243242] text-slate-600 dark:text-slate-300 hover:text-[#f57c00] rounded-lg transition-colors cursor-pointer text-xs font-bold"
          >
            <ArrowLeft size={14} />
            <span>Return to Chat</span>
          </Link>
          <span className="text-slate-300 dark:text-[#243242]">|</span>
          <div className="flex items-center gap-2 text-[#0f2942] dark:text-amber-500">
            <Scale size={18} className="stroke-[1.5]" />
            <h1 className="text-sm font-bold tracking-tight">My Notebook</h1>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 font-mono">
          <span>USER: {user?.email}</span>
        </div>
      </header>

      {/* 2. Three Column Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-[calc(100vh-64px)]">
        
        {/* COLUMN A: Notebook Pinned Citations (Width: 1/3) */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-[#243242] bg-[#fcfaf5] dark:bg-[#0a0e14] flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-[#243242] bg-white dark:bg-[#0d131a] shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#0f2942] dark:text-amber-500 flex items-center gap-1.5">
              <BookOpen size={13} className="text-[#f57c00]" />
              <span>Pinned Citations ({citations.length})</span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-1">
              Select or copy statutory segments to draft legal briefings.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {citations.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-mono text-xs">
                No citations pinned yet.
                <br />
                <span className="text-[10px] block mt-1.5">
                  Run statutory queries in the chat and bookmark primary sources.
                </span>
              </div>
            ) : (
              citations.map((c) => {
                const isEditing = editingNotesId === c.id;
                return (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-[#243242] bg-white dark:bg-[#151e29] hover:shadow-2xs transition-shadow text-left space-y-2.5 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0f2942] dark:text-amber-500 font-mono text-[11px] uppercase tracking-wide truncate max-w-[70%]">
                        {c.section_title || 'Statute Section'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.pdf_name && (
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-mono font-bold truncate max-w-[80px]">
                            {c.pdf_name}
                          </span>
                        )}
                        <button
                          onClick={() => handleUnpin(c.id)}
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
                    <div className="bg-[#fdfbf7] dark:bg-[#0d131a] rounded-lg p-2 border border-slate-100 dark:border-[#243242] text-[11px]">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                        My Research Notes:
                      </div>
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <textarea
                            value={editingNotesText}
                            onChange={(e) => setEditingNotesText(e.target.value)}
                            className="w-full bg-white dark:bg-[#151e29] border border-slate-300 dark:border-[#243242] rounded-md p-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                            rows={3}
                            placeholder="Add brief details, court arguments, or notes..."
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveNotes(c.id)}
                              className="px-2 py-1 bg-[#0f2942] dark:bg-amber-500 hover:bg-amber-600 dark:hover:bg-amber-600 text-white dark:text-[#0a0e14] rounded text-[10px] font-bold cursor-pointer"
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
                        onClick={() => handleInsertReference(c)}
                        className="flex-1 py-1.5 border border-dashed border-[#f57c00]/40 hover:border-[#f57c00] rounded-lg text-[10.5px] font-bold text-[#f57c00] bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Plus size={11} />
                        <span>Insert Reference</span>
                      </button>
                      <button
                        onClick={() => handleUnpin(c.id)}
                        className="px-2.5 py-1.5 border border-slate-200 dark:border-[#243242] hover:border-red-500 dark:hover:border-red-500/30 rounded-lg text-[10.5px] font-bold text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 bg-white dark:bg-[#151e29] cursor-pointer transition-all"
                        title="Unpin citation"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN B: Rich Text Editor Area (Width: 2/3) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0d131a] relative">
          <div className="p-4 border-b border-slate-200 dark:border-[#243242] flex items-center justify-between shrink-0 bg-slate-50 dark:bg-[#151e29]">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-[#0f2942] dark:text-amber-500" />
              <span className="text-xs font-bold text-[#0f2942] dark:text-slate-200">Notebook Editor</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyDraft}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-[#243242] hover:border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#151e29] cursor-pointer hover:shadow-xs transition-all"
              >
                {copySuccess ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                <span>{copySuccess ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-[#243242] hover:border-[#f57c00] rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#f57c00] bg-white dark:bg-[#151e29] cursor-pointer hover:shadow-xs transition-all"
              >
                <Download size={11} />
                <span>Export Brief</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f2942] dark:bg-amber-500 hover:bg-amber-600 dark:hover:bg-amber-600 rounded-lg text-[11px] font-bold text-white dark:text-[#0a0e14] cursor-pointer shadow-xs transition-all"
              >
                <Printer size={11} />
                <span>Print brief</span>
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-hidden flex flex-col">
            <textarea
              ref={textareaRef}
              value={draftContent}
              onChange={(e) => handleDraftChange(e.target.value)}
              className="flex-1 w-full h-full bg-[#faf8f5] dark:bg-[#111720] border border-slate-200 dark:border-[#243242] rounded-2xl p-6 text-sm text-slate-800 dark:text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#f57c00]/50 shadow-inner overflow-y-auto resize-none"
              placeholder="Case Brief Outline..."
            />
          </div>
        </div>

      </div>

      {/* Embedded Printing Styles */}
      <style jsx global>{`
        @media print {
          header, 
          .md\\:w-80, 
          .lg\\:w-96, 
          .shrink-0 {
            display: none !important;
          }
          .flex-1 {
            width: 100% !important;
            padding: 0 !important;
          }
          textarea {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            height: auto !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
