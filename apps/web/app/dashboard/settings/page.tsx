"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";
import { Eye, EyeOff, Save, CheckCircle, XCircle } from "lucide-react";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await settingsApi.get();
      return res.data.settings;
    },
  });

  const [formData, setFormData] = useState({
    openaiApiKey: "",
    anthropicApiKey: "",
    geminiApiKey: "",
    githubToken: "",
    gitlabToken: "",
    bitbucketToken: "",
    defaultModel: "gemini-2.5-flash",
    defaultStrategy: "single-pass",
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<typeof formData>) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const testKeyMutation = useMutation({
    mutationFn: (provider: string) => settingsApi.testKey(provider),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== "")
    );
    updateMutation.mutate(updates);
  };

  const handleTestKey = (provider: string) => {
    testKeyMutation.mutate(provider);
  };

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your API keys and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* LLM API Keys */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">LLM API Keys</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your API keys to enable AI-powered reviews. Keys are encrypted and
            stored securely.
          </p>

          <div className="mt-4 space-y-4">
            <ApiKeyInput
              label="OpenAI API Key"
              placeholder="sk-..."
              value={formData.openaiApiKey}
              onChange={(value) => setFormData({ ...formData, openaiApiKey: value })}
              show={showKeys.openai}
              onToggleShow={() => toggleShowKey("openai")}
              hasKey={!!settings?.openaiApiKey}
              onTest={() => handleTestKey("openai")}
              testing={testKeyMutation.isPending}
            />

            <ApiKeyInput
              label="Anthropic API Key"
              placeholder="sk-ant-..."
              value={formData.anthropicApiKey}
              onChange={(value) =>
                setFormData({ ...formData, anthropicApiKey: value })
              }
              show={showKeys.anthropic}
              onToggleShow={() => toggleShowKey("anthropic")}
              hasKey={!!settings?.anthropicApiKey}
              onTest={() => handleTestKey("anthropic")}
              testing={testKeyMutation.isPending}
            />

            <ApiKeyInput
              label="Google AI API Key"
              placeholder="AIza..."
              value={formData.geminiApiKey}
              onChange={(value) => setFormData({ ...formData, geminiApiKey: value })}
              show={showKeys.gemini}
              onToggleShow={() => toggleShowKey("gemini")}
              hasKey={!!settings?.geminiApiKey}
              onTest={() => handleTestKey("gemini")}
              testing={testKeyMutation.isPending}
            />
          </div>
        </div>

        {/* Git Platform Tokens */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Git Platform Tokens</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add personal access tokens for your Git platforms. Required for posting
            review comments.
          </p>

          <div className="mt-4 space-y-4">
            <ApiKeyInput
              label="GitHub Token"
              placeholder="ghp_..."
              value={formData.githubToken}
              onChange={(value) =>
                setFormData({ ...formData, githubToken: value })
              }
              show={showKeys.github}
              onToggleShow={() => toggleShowKey("github")}
              hasKey={!!settings?.githubToken}
              onTest={() => handleTestKey("github")}
              testing={testKeyMutation.isPending}
            />

            <ApiKeyInput
              label="GitLab Token"
              placeholder="glpat-..."
              value={formData.gitlabToken}
              onChange={(value) =>
                setFormData({ ...formData, gitlabToken: value })
              }
              show={showKeys.gitlab}
              onToggleShow={() => toggleShowKey("gitlab")}
              hasKey={!!settings?.gitlabToken}
              onTest={() => handleTestKey("gitlab")}
              testing={testKeyMutation.isPending}
            />

            <ApiKeyInput
              label="Bitbucket Token"
              placeholder="..."
              value={formData.bitbucketToken}
              onChange={(value) =>
                setFormData({ ...formData, bitbucketToken: value })
              }
              show={showKeys.bitbucket}
              onToggleShow={() => toggleShowKey("bitbucket")}
              hasKey={!!settings?.bitbucketToken}
              onTest={() => handleTestKey("bitbucket")}
              testing={testKeyMutation.isPending}
            />
          </div>
        </div>

        {/* Review Preferences */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Review Preferences</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set your default review preferences for new repositories
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Default Model
              </label>
              <select
                value={formData.defaultModel}
                onChange={(e) =>
                  setFormData({ ...formData, defaultModel: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none"
              >
                <option value="gemini-2.5-flash">
                  Gemini 2.5 Flash (Fast & Cheap)
                </option>
                <option value="gemini-2.5-flash-lite">
                  Gemini 2.5 Flash Lite (Cheapest & Fastest)
                </option>
                <option value="gemini-2.5-pro">
                  Gemini 2.5 Pro (Most Powerful)
                </option>
                <option value="gpt-4o">GPT-4o (Balanced)</option>
                <option value="claude-3-5-sonnet-20241022">
                  Claude 3.5 Sonnet (Best Quality)
                </option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Model used for single-pass reviews
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Default Review Strategy
              </label>
              <select
                value={formData.defaultStrategy}
                onChange={(e) =>
                  setFormData({ ...formData, defaultStrategy: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none"
              >
                <option value="single-pass">Single Pass (Fast)</option>
                <option value="multi-pass">Multi Pass (Thorough)</option>
                <option value="security-audit">Security Audit (Security-Focused)</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Review strategy applied to new repositories
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
          {saveSuccess && (
            <span className="flex items-center gap-1 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              Settings saved successfully
            </span>
          )}
          {updateMutation.isError && (
            <span className="flex items-center gap-1 text-sm text-red-400">
              <XCircle className="h-4 w-4" />
              Failed to save settings
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function ApiKeyInput({
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggleShow,
  hasKey,
  onTest,
  testing,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  hasKey: boolean;
  onTest: () => void;
  testing: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground">
        {label}
        {hasKey && (
          <span className="ml-2 text-xs text-emerald-400">(configured)</span>
        )}
      </label>
      <div className="mt-1 flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={hasKey ? "••••••••••••••••" : placeholder}
            className="block w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {hasKey && (
          <button
            type="button"
            onClick={onTest}
            disabled={testing}
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-muted-foreground hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testing ? "Testing..." : "Test"}
          </button>
        )}
      </div>
    </div>
  );
}
