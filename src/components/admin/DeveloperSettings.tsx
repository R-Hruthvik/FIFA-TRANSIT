"use client";

import { useState, useEffect } from 'react';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok) throw new Error('Failed to fetch settings');
        const data = await res.json();
        setFeatureFlags(data.featureFlags || featureFlags);
        setMatchApi(data.matchApi || matchApi);
      } catch (err) {
        console.error('Failed to fetch admin settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureFlags, matchApi }),
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

  if (loading) {
    return <div className="text-center py-12">Loading settings...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Feature Flags</h2>
        <div className="space-y-4">
          {Object.entries(featureFlags).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {key}
              </label>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setFeatureFlags({ ...featureFlags, [key]: e.target.checked })}
                className="h-4 w-4 text-emerald-500 focus:ring-emerald-500 border-gray-300 rounded"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Match API Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Provider</label>
            <select
              value={matchApi.provider}
              onChange={(e) => setMatchApi({ ...matchApi, provider: e.target.value as MatchApi["provider"] })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md"
            >
              <option value="football-data">football-data.org</option>
              <option value="api-football">api-football</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
            <input
              type="password"
              value={matchApi.apiKey || ''}
              onChange={(e) => setMatchApi({ ...matchApi, apiKey: e.target.value || null })}
              className="mt-1 focus:ring-emerald-500 focus:border-emerald-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter API key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cache TTL (seconds)</label>
            <input
              type="number"
              value={matchApi.cacheTTL}
              onChange={(e) => setMatchApi({ ...matchApi, cacheTTL: parseInt(e.target.value) || 300 })}
              className="mt-1 focus:ring-emerald-500 focus:border-emerald-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            />
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

      {message && (
        <div className={`text-center text-sm ${message.includes('success') ? 'text-emerald-500' : 'text-red-500'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
