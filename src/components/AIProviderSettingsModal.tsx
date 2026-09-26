import React, { useState } from 'react';
import { X, Cpu, Key, ShieldCheck, Zap, Globe, Check, AlertCircle, ExternalLink } from 'lucide-react';

interface AIProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AIProviderSettingsModal: React.FC<AIProviderSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [provider, setProvider] = useState<'gemini' | 'groq' | 'openrouter'>(() => {
    return (localStorage.getItem('examcraft_ai_provider') as any) || 'groq';
  });

  const [groqKey, setGroqKey] = useState(() => {
    return localStorage.getItem('examcraft_groq_key') || '';
  });

  const [openRouterKey, setOpenRouterKey] = useState(() => {
    return localStorage.getItem('examcraft_openrouter_key') || '';
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('examcraft_ai_provider', provider);
    if (groqKey.trim()) {
      localStorage.setItem('examcraft_groq_key', groqKey.trim());
    } else {
      localStorage.removeItem('examcraft_groq_key');
    }

    if (openRouterKey.trim()) {
      localStorage.setItem('examcraft_openrouter_key', openRouterKey.trim());
    } else {
      localStorage.removeItem('examcraft_openrouter_key');
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onSaved) onSaved();
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-md">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Free AI &amp; Provider Settings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose between Groq (Ultra-Fast Free), OpenRouter (Free), or Google Gemini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Provider Selection Cards */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select AI Engine
            </label>

            {/* Option 1: Groq (Recommended Free) */}
            <div
              onClick={() => setProvider('groq')}
              className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                provider === 'groq'
                  ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="ai-provider"
                checked={provider === 'groq'}
                onChange={() => setProvider('groq')}
                className="mt-1 text-amber-600 focus:ring-amber-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    Groq Cloud (LLaMA 3.3 &amp; DeepSeek R1)
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase">
                      Recommended • Free
                    </span>
                  </span>
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Near-instant question generation speeds. 100% free with no credit card required. Uses <code>llama-3.3-70b</code> &amp; <code>deepseek-r1-distill-llama-70b</code>.
                </p>
              </div>
            </div>

            {/* Option 2: OpenRouter (Free Models) */}
            <div
              onClick={() => setProvider('openrouter')}
              className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                provider === 'openrouter'
                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="ai-provider"
                checked={provider === 'openrouter'}
                onChange={() => setProvider('openrouter')}
                className="mt-1 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    OpenRouter Free Tier
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-[10px] font-extrabold uppercase">
                      Free Models
                    </span>
                  </span>
                  <Globe className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Access dozens of open-source models for free (Mistral, LLaMA 3, Gemma, DeepSeek Free).
                </p>
              </div>
            </div>

            {/* Option 3: Gemini */}
            <div
              onClick={() => setProvider('gemini')}
              className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                provider === 'gemini'
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="ai-provider"
                checked={provider === 'gemini'}
                onChange={() => setProvider('gemini')}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    Google Gemini (Default Server)
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] font-extrabold">
                      Gemini 3.8 Flash
                    </span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  The default server integration configured in your backend.
                </p>
              </div>
            </div>
          </div>

          {/* Provider Specific API Key inputs */}
          {provider === 'groq' && (
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  Groq API Key (Optional or Custom):
                </span>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-amber-700 dark:text-amber-400 hover:underline font-semibold"
                >
                  <span>Get 100% Free Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx (Leaves blank to use server environment key)"
                className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
              <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80">
                You can generate a free key in 10 seconds at <strong>console.groq.com</strong> without any payment details.
              </p>
            </div>
          )}

          {provider === 'openrouter' && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  OpenRouter API Key:
                </span>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400 hover:underline font-semibold"
                >
                  <span>Get Free Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxx"
                className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
              <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80">
                OpenRouter provides access to models tagged with <code>:free</code> at zero charge.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              Your custom keys are stored securely in your browser's private storage or sent via HTTPS headers. They are never shared publicly.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved &amp; Active!</span>
              </>
            ) : (
              <span>Save &amp; Use Provider</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
