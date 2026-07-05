'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Scale, ArrowLeft, Sun, Moon, ShieldAlert } from 'lucide-react';

export default function TermsOfService() {
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
                Terms of Service
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
            Terms & Conditions
          </h1>
          <p className="text-xs font-mono text-slate-405 dark:text-slate-400">
            Last Updated: June 30, 2026 • Version 1.0 (India)
          </p>
        </div>

        {/* Warning Callout */}
        <div className="p-4 bg-amber-500/10 border border-[#f57c00]/30 rounded-xl flex items-start gap-3">
          <ShieldAlert size={18} className="text-[#f57c00] shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-350">
            <strong className="text-[#0f2942] dark:text-amber-500 block mb-1">
              IMPORTANT LEGAL NOTICE: NO ATTORNEY-CLIENT RELATIONSHIP
            </strong>
            Vidhaan AI is a digital research and statutory analysis engine. Using this application does not create an attorney-client relationship. The information, summaries, and generated summaries are for informational and legal research purposes only and must not be used as official legal advice.
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6 text-sm leading-relaxed font-sans text-slate-700 dark:text-slate-300">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              1. Acceptance of Terms
            </h2>
            <p>
              By signing into, registering for, or otherwise using the Vidhaan AI platform (the &quot;Service&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms, you are prohibited from accessing the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              2. Description of Service & AI Fallibility Warning
            </h2>
            <p>
              Vidhaan AI provides tools for researching Indian statutory laws, legal sections, constitutional articles, and related documents using artificial intelligence, natural language processing, and retrieval-augmented generation (RAG).
            </p>
            <p className="bg-red-500/5 p-3 rounded-lg border border-red-500/10 text-xs">
              <strong>WARNING:</strong> Artificial Intelligence can hallucinate, generate outdated legal statutory references, or make interpretational errors. Vidhaan AI does not guarantee the currency, correctness, or completeness of the statutes mapped. You are strictly advised to cross-reference all materials with official gazettes and consult a qualified, licensed legal practitioner before acting on any output.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              3. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, Vidhaan AI, its developers, operators, and affiliates shall not be liable for any direct, indirect, incidental, special, exemplary, or consequential damages. This includes, but is not limited to, legal malpractice claims, lost cases, financial losses, regulatory fines, or damages resulting from your reliance on the AI-generated responses or statutory details.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              4. Acceptable Use Policy
            </h2>
            <p>
              You agree to use the Service in compliance with all local, state, national, and international laws. Specifically, you agree NOT to:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-xs">
              <li>Reverse-engineer, decompile, or extract the underlying model parameters, vector database indexing setups, or system prompt configurations.</li>
              <li>Deploy bots, scrapers, or automated request engines that exceed standard user rates or attempt to bypass security measures.</li>
              <li>Input or process unlawful, abusive, defamatory, or highly sensitive confidential state material in the prompt fields.</li>
              <li>Generate fraudulent or illegal legal contract outlines intended to deceive court entities or private parties.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              5. API Dependencies & Third-Party LLM Policy
            </h2>
            <p>
              The Service relies on third-party foundational Large Language Models (including Google Gemini and Meta Llama). Services are subject to the availability, uptime, policies, and rate limits of these third-party providers. We assume no responsibility for service disruptions, outages, or modifications to the terms of these third-party APIs.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              6. Future Monetization & Billing
            </h2>
            <p>
              Vidhaan AI is currently offered in a developmental phase. We reserve the right to modify access tiers, apply usage limits, or introduce paid subscription layers at any time. Any changes to pricing structures will be communicated with reasonable notice.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              7. Governing Law & Jurisdiction
            </h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of New Delhi, India.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0f2942] dark:text-slate-105 border-b border-slate-200 dark:border-[#243242] pb-1 font-display">
              8. Contact Details
            </h2>
            <p>
              For any questions, legal concerns, or general inquiries regarding these terms, please contact us at:
            </p>
            <p className="font-mono text-[#f57c00] font-bold">
              support@vidhaanai.online
            </p>
          </section>
        </div>

        {/* Page Footer */}
        <div className="border-t border-slate-200 dark:border-[#243242] pt-6 flex justify-between items-center text-xs text-slate-500 font-mono">
          <span>© {new Date().getFullYear()} Vidhaan AI</span>
          <Link href="/privacy" className="text-[#f57c00] hover:underline font-semibold">
            View Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  );
}
