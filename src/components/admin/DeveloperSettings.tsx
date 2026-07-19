"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ScenarioSimulator from './ScenarioSimulator';

interface FeatureFlags {
  enableRealMatchData: boolean;
  enableOneTap: boolean;
  enableHeatmapAnimation: boolean;
}

interface MatchApi {
  provider: "football-data" | "api-football";
  apiKey: string | null;
  cacheTTL: number;
}

interface AiProvider {
  provider: "gemini" | "openai-compat" | "vertex";
  model: string;
  apiKey?: string;
  baseUrl?: string;
  vertexProjectId?: string;
  vertexLocation?: string;
}

export default function DeveloperSettings() {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
    enableRealMatchData: false,
    enableOneTap: false,
    enableHeatmapAnimation: true,
  });
  const [matchApi, setMatchApi] = useState<MatchApi>({
    provider: "football-data",
    apiKey: null,
    cacheTTL: 300,
  });
  const [aiProvider, setAiProvider] = useState<AiProvider>({
    provider: "gemini",
    model: "gemini-2.0-flash",
  });
  const [gateOverrides, setGateOverrides] = useState<Record<string, string>>({});
  const [clearingGate, setClearingGate] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'admin') {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.status === 403 || res.status === 401) {
          setError('Administrative clearance required to view this panel.');
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch settings');
        const data = await res.json();
        setFeatureFlags(data.featureFlags || featureFlags);
        setMatchApi(data.matchApi || matchApi);
        setAiProvider(data.aiProvider || aiProvider);
        setGateOverrides(data.gateOverrides || {});
      } catch (err) {
        console.error('Failed to fetch admin settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [status, session?.user?.role]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureFlags, matchApi, aiProvider }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setMessage('Settings saved successfully');
    } catch (err) {
      setMessage('Failed to save settings');
      console.error('Failed to save admin settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClearOverride = async (gateId: string) => {
    setClearingGate(gateId);
    setMessage(null);
    try {
      // Surgical $unset of just this gate — server strips the single key.
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearGateId: gateId }),
      });
      if (!res.ok) throw new Error('Failed to clear override');
      const next = { ...gateOverrides };
      delete next[gateId];
      setGateOverrides(next);
      setMessage(`Override cleared for ${gateId} — returned to manual operation`);
    } catch (err) {
      setMessage('Failed to clear gate override');
      console.error('Failed to clear gate override:', err);
    } finally {
      setClearingGate(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading settings...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-zinc-400">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl p-6 shadow-xl text-zinc-100">
        <h2 className="text-xl text-white font-bold mb-4">Feature Flags</h2>
        <div className="space-y-4">
          {Object.entries(featureFlags).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-100">
                {key}
              </label>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setFeatureFlags({ ...featureFlags, [key]: e.target.checked })}
                className="h-4 w-4 text-emerald-500 focus:ring-emerald-500 border-zinc-800 rounded bg-zinc-950"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-amber-800/30 backdrop-blur-md rounded-2xl p-6 shadow-xl text-zinc-100">
        <h2 className="text-xl text-white font-bold mb-4">Active AI Gate Overrides</h2>
        {Object.keys(gateOverrides).length === 0 ? (
          <p className="text-sm text-zinc-400 font-mono">
            No active AI overrides. All gates are under standard manual operation.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(gateOverrides).map(([gateId, statusValue]) => (
              <div
                key={gateId}
                className="flex items-center justify-between rounded-xl border border-amber-800/30 bg-amber-950/20 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-zinc-100">{gateId}</span>
                  {statusValue === 'limited' && (
                    <span className="inline-flex items-center rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-400 ring-1 ring-amber-500/40">
                      AI RESTRICTED
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleClearOverride(gateId)}
                  disabled={clearingGate === gateId}
                  className="text-xs font-medium rounded-md border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {clearingGate === gateId ? 'Clearing...' : 'Clear Override'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl p-6 shadow-xl text-zinc-100">
        <h2 className="text-xl text-white font-bold mb-4">Match API Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-100">Provider</label>
            <select
              value={matchApi.provider}
              onChange={(e) => setMatchApi({ ...matchApi, provider: e.target.value as MatchApi["provider"] })}
              className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-2.5 text-sm placeholder-zinc-650 focus:border-emerald-500/40 focus:ring-0 focus:outline-none transition-all"
            >
              <option value="football-data">football-data.org</option>
              <option value="api-football">api-football</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-100">API Key</label>
            <input
              type="password"
              value={matchApi.apiKey || ''}
              onChange={(e) => setMatchApi({ ...matchApi, apiKey: e.target.value || null })}
              className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-2.5 text-sm placeholder-zinc-650 focus:border-emerald-500/40 focus:ring-0 focus:outline-none transition-all"
              placeholder="Enter API key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-100">Cache TTL (seconds)</label>
            <input
              type="number"
              value={matchApi.cacheTTL}
              onChange={(e) => setMatchApi({ ...matchApi, cacheTTL: parseInt(e.target.value) || 300 })}
              className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-2.5 text-sm placeholder-zinc-650 focus:border-emerald-500/40 focus:ring-0 focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl p-6 shadow-xl text-zinc-100">
        <h2 className="text-xl text-white font-bold mb-4">AI Provider Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-100">Provider</label>
            <select
              value={aiProvider.provider}
              onChange={(e) => {
                const p = e.target.value as AiProvider["provider"];
                const defaults: Record<string, string> = {
                  gemini: "gemini-2.0-flash",
                  "openai-compat": "meta/llama-3.1-70b-instruct",
                  vertex: "gemini-2.0-flash",
                };
                setAiProvider({ ...aiProvider, provider: p, model: defaults[p] || aiProvider.model });
              }}
              className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-2.5 text-sm placeholder-zinc-650 focus:border-emerald-500/40 focus:ring-0 focus:outline-none transition-all"
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai-compat">OpenAI-Compatible (NVIDIA NIM, vLLM, etc.)</option>
              <option value="vertex">Google Vertex AI</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-100">Model</label>
            <input
              type="text"
              value={aiProvider.model}
              onChange={(e) => setAiProvider({ ...aiProvider, model: e.target.value })}
              className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-2.5 text-sm placeholder-zinc-650 focus:border-emerald-500/40 focus:ring-0 focus:outline-none transition-all"
              placeholder="e.g. gemini-2.0-flash"
            />
          </div>
          {aiProvider.provider === "openai-compat" && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-100">API Key (NVIDIA_NIM_API_KEY or OPENAI_API_KEY)</label>
                <input
                  type="password"
                  value={aiProvider.apiKey || ""}
                  onChange={(e) => setAiProvider({ ...aiProvider, apiKey: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-2.5 text-sm placeholder-zinc-650 focus:border-emerald-500/40 focus:ring-0 focus:outline-none transition-all"
                  placeholder="Leave empty to use env var"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-100">Base URL (optional)</label>
                <input
                  type="text"
                  value={aiProvider.baseUrl || ""}
                  onChange={(e) => setAiProvider({ ...aiProvider, baseUrl: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-2.5 text-sm placeholder-zinc-650 focus:border-emerald-500/40 focus:ring-0 focus:outline-none transition-all"
                  placeholder="https://integrate.api.nvidia.com/v1"
                />
              </div>
            </>
          )}
          {aiProvider.provider === "vertex" && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-100">Project ID (VERTEX_PROJECT_ID)</label>
                <input
                  type="text"
                  value={aiProvider.vertexProjectId || ""}
                  onChange={(e) => setAiProvider({ ...aiProvider, vertexProjectId: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-2.5 text-sm placeholder-zinc-650 focus:border-emerald-500/40 focus:ring-0 focus:outline-none transition-all"
                  placeholder="Leave empty to use env var"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-100">Location</label>
                <input
                  type="text"
                  value={aiProvider.vertexLocation || "us-central1"}
                  onChange={(e) => setAiProvider({ ...aiProvider, vertexLocation: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-2.5 text-sm placeholder-zinc-650 focus:border-emerald-500/40 focus:ring-0 focus:outline-none transition-all"
                />
              </div>
            </>
          )}
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="inline-flex items-center rounded-md bg-zinc-800/50 px-2 py-0.5 font-mono text-zinc-400">
              {aiProvider.provider === "gemini" && "GEMINI_API_KEY"}
              {aiProvider.provider === "openai-compat" && "NVIDIA_NIM_API_KEY / OPENAI_API_KEY"}
              {aiProvider.provider === "vertex" && "VERTEX_PROJECT_ID + credentials"}
            </span>
            <span>env vars are used when API key field is empty</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <ScenarioSimulator />

      {message && (
        <div className={`text-center text-sm ${message.includes('success') ? 'text-emerald-500' : 'text-red-500'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
