'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Scale, ArrowLeft, Sun, Moon, ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const cachedTheme = localStorage.getItem('vidhaan_theme');
    if (cachedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vidhaan_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vidhaan_theme', 'light');
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0d131a] text-slate-800 dark:text-slate-200 transition-colors duration-250">
      {/* Top Header Controls */}
      <header className="bg-[#0f2942] text-white py-4 px-6 border-b-4 border-[#f57c00] shadow-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-all text-xs font-bold"
            >
              <ArrowLeft size={14} />
              <span>Back to App</span>
            </Link>
            <span className="text-slate-500">|</span>
            <div className="flex items-center gap-2">
              <Scale size={20} className="text-amber-500" />
              <span className="font-display font-bold text-sm tracking-tight text-white uppercase">
                Privacy Policy
              </span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-all"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16 space-y-8 animate-slide-in">
        <div className="text-center space-y-3 pb-6 border-b border-slate-200 dark:border-[#243242]">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-[#0f2942] dark:text-amber-500 tracking-tight uppercase">
            Privacy Policy
          </h1>
          <p className="text-xs font-mono text-slate-405 dark:text-slate-400">
            Last Updated: June 30, 2026 • Version 1.0 (India)
          </p>
        </div>

        {/* Highlight Callout */}
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
          <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-350">
            <strong className="text-[#0f2942] dark:text-emerald-500 block mb-1">
              DATA SECURITY SUMMARY
            </strong>
            Your privacy is our utmost priority. We compile statutory insights locally. We do not sell your research queries, nor do we train private or commercial LLM models on your personal legal queries.
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6 text-sm leading-relaxed font-sans text-slate-700 dark:text-slate-300">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              1. Information We Collect
            </h2>
            <p>
              To provide a functional chat interface and preserve your workspace notebooks, we collect the following elements:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-xs">
              <li><strong>Account Credentials:</strong> Email addresses and passwords (securely hashed via salted bcrypt protocols).</li>
              <li><strong>Workspace History:</strong> Prompt queries, chatbot response outputs, and citation indexes bookmarked in your Research Notebook.</li>
              <li><strong>Theme and UI State:</strong> Local settings (light/dark layout state) preserved to sustain design selections.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              2. Third-Party Data Processing
            </h2>
            <p>
              Vidhaan AI utilizes state-of-the-art Large Language Models provided by external entities to generate analytical responses. 
            </p>
            <p className="bg-[#0f2942]/5 dark:bg-[#151e29] p-3 rounded-lg border border-slate-200 dark:border-[#243242] text-xs leading-normal">
              <strong>IMPORTANT:</strong> When you send a prompt, the conversational context and any matching statutory documents retrieved from our database are transmitted via secure APIs to third-party endpoints (specifically Google Gemini and Meta/Groq). This data is subject to the privacy policies of those API providers. No sensitive account passwords or identifying emails are ever transmitted to these model providers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              3. Data Usage & AI Training Policy
            </h2>
            <p>
              We use your email address solely to authenticate your workspace login session. We store chat history to allow you to review and rename your past legal queries.
            </p>
            <p>
              <strong>No Model Training:</strong> We explicitly state that Vidhaan AI does NOT use your private prompt logs, legal questions, or brief annotations to train, fine-tune, or validate our own custom dense-sparse models. Your workspace remains entirely your own.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              4. Data Control & Deletion Rights
            </h2>
            <p>
              We believe in complete user sovereignty over legal workspace data. You have the right to clear, retrieve, or delete your information at any time:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-xs">
              <li><strong>Clear Chat History:</strong> You can wipe all chat threads, messages, and indexes from our databases by navigating to your <strong>Profile & Settings</strong> tab and selecting &quot;Clear Chat History&quot;.</li>
              <li><strong>Delete Account:</strong> You can completely and permanently delete your user record and all associated history, notebook annotations, and session data by selecting &quot;Delete Account&quot;. This action is irreversible and wipes your credentials instantly.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              5. Data Security Standards
            </h2>
            <p>
              We maintain industry-standard security protocols to guard your credentials and workspace logs against unauthorized access, leakage, or loss. However, no database transmission or internet storage is 100% secure. Please protect your account credentials and sign out of public terminals.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              6. Contact Us
            </h2>
            <p>
              If you have any questions, concerns, or feedback regarding your privacy or the platform's data policies, please reach out to us at:
            </p>
            <p className="font-mono text-[#f57c00] font-bold">
              support@vidhaanai.online
            </p>
          </section>
        </div>

        {/* Page Footer */}
        <div className="border-t border-slate-200 dark:border-[#243242] pt-6 flex justify-between items-center text-xs text-slate-500 font-mono">
          <span>© {new Date().getFullYear()} Vidhaan AI</span>
          <Link href="/terms" className="text-[#f57c00] hover:underline font-semibold">
            View Terms of Service
          </Link>
        </div>
      </main>
    </div>
  );
}
