import type {
  ApiClient,
  ListPresetsOptions,
  ListProjectsOptions,
  PresetInput,
} from "@/lib/api/types";
import type {
  AnalyticsRange,
  AnalyticsSummary,
  Analysis,
  CommunicationPackage,
  DashboardStats,
  EmailDraft,
  Job,
  Preset,
  PresetKind,
  Project,
  Recipient,
  Report,
  Script,
  Usage,
  VideoAsset,
  VideoOptions,
  WorkspaceSettings,
} from "@/types";

const BASE =
  typeof window !== "undefined"
    ? ""
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (networkErr: any) {
    const err = new Error(
      `Network connection failed to ${url}: ${networkErr?.message || networkErr}`
    );
    throw err;
  }

  if (!res.ok) {
    let errorBody: any = null;
    try {
      errorBody = await res.json();
    } catch {
      const text = await res.text().catch(() => "");
      errorBody = {
        code: `HTTP_${res.status}`,
        message:
          text || res.statusText || `Request failed with status ${res.status}`,
        status: res.status,
      };
    }
    const err = new Error(
      errorBody?.message ||
        errorBody?.detail ||
        `Request failed with status ${res.status}`
    );
    Object.assign(err, errorBody);
    throw err;
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as unknown as T;
  }

  const text = await res.text();
  if (!text || text.trim() === "") {
    return undefined as unknown as T;
  }

  return JSON.parse(text) as T;
}

export const realClient: ApiClient = {
  // Projects
  listProjects: (opts?: ListProjectsOptions) => {
    const params = new URLSearchParams();
    if (opts?.status) params.set("status", opts.status);
    if (opts?.query) params.set("query", opts.query);
    const qs = params.toString();
    return request<Project[]>(`/api/v1/projects${qs ? `?${qs}` : ""}`);
  },

  getProject: (id: string) => request<Project>(`/api/v1/projects/${id}`),

  createProject: (name?: string) =>
    request<Project>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  deleteProject: async (id: string) => {
    await request<void>(`/api/v1/projects/${id}`, {
      method: "DELETE",
    });
  },

  duplicateProject: (id: string) =>
    request<Project>(`/api/v1/projects/${id}/duplicate`, {
      method: "POST",
    }),

  saveDraft: (id: string, input: import("@/lib/api/types").SaveDraftInput) =>
    request<Project>(`/api/v1/projects/${id}/draft`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  getStats: () => request<DashboardStats>("/api/v1/stats"),

  // Report Upload (multipart)
  uploadReport: async (projectId: string, file: File): Promise<Job<Report>> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE}/api/v1/projects/${projectId}/report`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw errorBody;
    }

    return res.json() as Promise<Job<Report>>;
  },

  generateScriptFromReport: (projectId: string, presenterName?: string) => {
    const qs = presenterName
      ? `?presenter_name=${encodeURIComponent(presenterName)}`
      : "";
    return request<{ subject: string; insights: string[]; script: string }>(
      `/api/v1/projects/${projectId}/generate-script-from-report${qs}`,
      {
        method: "POST",
      }
    );
  },

  // Workflow steps
  analyzeReport: (projectId: string, recipient: Recipient) =>
    request<Job<Analysis>>(`/api/v1/projects/${projectId}/analyze`, {
      method: "POST",
      body: JSON.stringify(recipient),
    }),

  generateScript: (projectId: string, analysis: Analysis) =>
    request<Job<Script>>(`/api/v1/projects/${projectId}/script`, {
      method: "POST",
      body: JSON.stringify(analysis),
    }),

  updateScript: (projectId: string, body: string) =>
    request<Script>(`/api/v1/projects/${projectId}/script`, {
      method: "PUT",
      body: JSON.stringify({ body }),
    }),

  generateVideo: (projectId: string, opts: VideoOptions) =>
    request<Job<VideoAsset>>(`/api/v1/projects/${projectId}/video`, {
      method: "POST",
      body: JSON.stringify(opts),
    }),

  generateEmail: (projectId: string) =>
    request<Job<EmailDraft>>(`/api/v1/projects/${projectId}/email`, {
      method: "POST",
    }),

  generateEmailFromRecipient: (
    projectId: string,
    data?: {
      recipientName?: string;
      recipientRole?: string;
      recipientCompany?: string;
      recipientEmail?: string;
      recipientIndustry?: string;
      businessPriorities?: string[];
      notes?: string;
      target?: "all" | "subject" | "body";
    }
  ) =>
    request<{
      subject: string;
      greeting: string;
      body: string;
      ctaId?: string;
      signatureId?: string;
      videoPlaybackUrl?: string;
      videoPosterUrl?: string;
      videoFormat?: string;
    }>(`/api/v1/projects/${projectId}/generate-email-from-recipient`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),

  // Jobs
  getJob: <T>(jobId: string) => request<Job<T>>(`/api/v1/jobs/${jobId}`),

  cancelJob: (jobId: string) =>
    request<Job<unknown>>(`/api/v1/jobs/${jobId}/cancel`, {
      method: "POST",
    }),

  // Presets
  listPresets: (kind: PresetKind, options?: ListPresetsOptions) => {
    const params = new URLSearchParams();
    params.set("kind", kind);
    if (options?.includeArchived) params.set("include_archived", "true");
    return request<Preset[]>(`/api/v1/presets?${params.toString()}`);
  },

  createPreset: (kind: PresetKind, input: PresetInput) =>
    request<Preset>("/api/v1/presets", {
      method: "POST",
      body: JSON.stringify({ ...input, kind }),
    }),

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE}/api/v1/presets/avatar/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw errorBody;
    }
    return res.json() as Promise<Preset>;
  },

  uploadVoice: async (
    file: File,
    name?: string,
    options?: { projectId?: string; scriptText?: string }
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    if (name) formData.append("name", name);
    if (options?.projectId) formData.append("project_id", options.projectId);
    if (options?.scriptText) formData.append("script_text", options.scriptText);
    const res = await fetch(`${BASE}/api/v1/presets/voice/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw errorBody;
    }
    return res.json() as Promise<Preset>;
  },

  resynthesizeVoice: (
    id: string,
    options?: { projectId?: string; scriptText?: string }
  ) => {
    return request<Preset>(`/api/v1/presets/voice/${id}/resynthesize`, {
      method: "POST",
      body: JSON.stringify({
        projectId: options?.projectId,
        scriptText: options?.scriptText,
      }),
    });
  },

  generateAvatar: (prompt: string) =>
    request<Preset>("/api/v1/presets/avatar/generate", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),

  updatePreset: (id: string, input: Partial<PresetInput>) =>
    request<Preset>(`/api/v1/presets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  archivePreset: (id: string) =>
    request<Preset>(`/api/v1/presets/${id}/archive`, {
      method: "POST",
    }),

  restorePreset: (id: string) =>
    request<Preset>(`/api/v1/presets/${id}/restore`, {
      method: "POST",
    }),

  setDefaultPreset: (id: string) =>
    request<Preset>(`/api/v1/presets/${id}/default`, {
      method: "POST",
    }),

  // Recipients
  listRecipients: () => request<Recipient[]>("/api/v1/recipients"),

  saveRecipient: (input: Recipient) =>
    request<Recipient>("/api/v1/recipients", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  deleteRecipient: async (id: string): Promise<void> => {
    await request<void>(`/api/v1/recipients/${id}`, {
      method: "DELETE",
    });
  },

  // Usage & Settings
  getUsage: () => request<Usage>("/api/v1/usage"),

  getSettings: () => request<WorkspaceSettings>("/api/v1/settings"),

  updateSettings: (patch: Partial<WorkspaceSettings>) =>
    request<WorkspaceSettings>("/api/v1/settings", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  // Packages & Send
  buildPackage: (projectId: string) =>
    request<CommunicationPackage>(`/api/v1/projects/${projectId}/package`, {
      method: "POST",
    }),

  listPackages: () => request<CommunicationPackage[]>("/api/v1/packages"),

  getPackage: (id: string) => request<CommunicationPackage>(`/api/v1/packages/${id}`),

  getAnalytics: (range: AnalyticsRange) =>
    request<AnalyticsSummary>(`/api/v1/analytics?range=${range}`),

  sendPackage: (packageId: string) =>
    request<Job<CommunicationPackage>>(`/api/v1/packages/${packageId}/send`, {
      method: "POST",
    }),
};
