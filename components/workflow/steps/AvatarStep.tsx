"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronDown,
  Maximize2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { Preset } from "@/types";

interface StylePresetConfig {
  id: string;
  label: string;
  thumbnail: string;
  filter: string;
  naturalness: number;
  brightness: number;
  detail: number;
  blend: number;
}

const STYLE_PRESETS: StylePresetConfig[] = [
  {
    id: "cinematic",
    label: "Cinematic",
    thumbnail: "/uploads/avatars/priyabrata_avatar_flux_working.jpg",
    filter: "brightness(0.9) contrast(1.2) saturate(1.15)",
    naturalness: 75,
    brightness: 60,
    detail: 95,
    blend: 80,
  },
  {
    id: "natural",
    label: "Natural",
    thumbnail: "/uploads/avatars/priyabrata_avatar_flux_working.jpg",
    filter: "brightness(1.0) contrast(1.0) saturate(1.0)",
    naturalness: 85,
    brightness: 70,
    detail: 92,
    blend: 65,
  },
  {
    id: "formal",
    label: "Formal",
    thumbnail: "/uploads/avatars/priyabrata_avatar_flux_working.jpg",
    filter: "brightness(0.95) contrast(1.1) saturate(0.9)",
    naturalness: 90,
    brightness: 80,
    detail: 95,
    blend: 50,
  },
  {
    id: "corporate",
    label: "Corporate",
    thumbnail: "/uploads/avatars/priyabrata_avatar_flux_working.jpg",
    filter: "brightness(1.05) contrast(1.05) saturate(1.05)",
    naturalness: 80,
    brightness: 85,
    detail: 90,
    blend: 75,
  },
  {
    id: "custom",
    label: "Custom",
    thumbnail: "/uploads/avatars/priyabrata_avatar_flux_working.jpg",
    filter: "brightness(1.0) contrast(1.15) saturate(1.2)",
    naturalness: 85,
    brightness: 70,
    detail: 90,
    blend: 65,
  },
];

export function AvatarStep({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patchDraft = useWorkflowStore((state) => state.patchDraft);
  const chosenAvatarId = useWorkflowStore((state) => state.drafts[projectId]?.avatarId);

  // Queries
  const { data: presets = [], isLoading } = useQuery({
    queryKey: qk.presets("avatar"),
    queryFn: () => api.listPresets("avatar"),
  });

  // Local state
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("");
  const [activePresetOverride, setActivePresetOverride] = useState<Preset | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textPrompt, setTextPrompt] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Studio customization state
  const [activeStyle, setActiveStyle] = useState<string>("natural");
  const [naturalness, setNaturalness] = useState<number>(85);
  const [brightness, setBrightness] = useState<number>(70);
  const [faceDetail, setFaceDetail] = useState<number>(92);
  const [environmentBlend, setEnvironmentBlend] = useState<number>(65);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  // Synchronize chosen avatar on initial load
  useEffect(() => {
    if (presets.length > 0 && !selectedAvatarId) {
      if (chosenAvatarId && presets.some((p) => p.id === chosenAvatarId)) {
        setSelectedAvatarId(chosenAvatarId);
      } else {
        const defaultPreset = presets.find((p) => p.isDefault) || presets[0];
        if (defaultPreset) {
          setSelectedAvatarId(defaultPreset.id);
          patchDraft(projectId, { avatarId: defaultPreset.id });
        }
      }
    }
  }, [presets, chosenAvatarId, projectId, patchDraft, selectedAvatarId]);

  const activeAvatar =
    (activePresetOverride && activePresetOverride.id === selectedAvatarId ? activePresetOverride : null) ||
    presets.find((p) => p.id === selectedAvatarId) ||
    presets[0];

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadAvatar(file),
    onSuccess: (newPreset: Preset) => {
      queryClient.setQueryData<Preset[]>(qk.presets("avatar"), (old = []) => [
        newPreset,
        ...old.filter((p) => p.id !== newPreset.id),
      ]);
      setActivePresetOverride(newPreset);
      setSelectedAvatarId(newPreset.id);
      patchDraft(projectId, { avatarId: newPreset.id });
      setSelectedFile(null);
      setStatusMessage(`Custom avatar "${newPreset.name}" created and selected!`);
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === "object" && err !== null && "detail" in err
          ? String((err as { detail: string }).detail)
          : err instanceof Error
            ? err.message
            : "Upload failed";
      setStatusMessage(`Upload failed: ${msg}`);
    },
  });

  // Text-to-Avatar Mutation
  const generateMutation = useMutation({
    mutationFn: (promptText: string) => api.generateAvatar(promptText),
    onSuccess: (newPreset: Preset) => {
      queryClient.setQueryData<Preset[]>(qk.presets("avatar"), (old = []) => [
        newPreset,
        ...old.filter((p) => p.id !== newPreset.id),
      ]);
      setActivePresetOverride(newPreset);
      setSelectedAvatarId(newPreset.id);
      patchDraft(projectId, { avatarId: newPreset.id });
      setTextPrompt("");
      setStatusMessage(`Avatar "${newPreset.name}" generated with Gemini AI!`);
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === "object" && err !== null && "detail" in err
          ? String((err as { detail: string }).detail)
          : err instanceof Error
            ? err.message
            : "Generation failed";
      setStatusMessage(`Generation failed: ${msg}`);
    },
  });

  const handleSelectAvatar = (id: string) => {
    setSelectedAvatarId(id);
    const chosen = presets.find((p) => p.id === id);
    if (chosen) setActivePresetOverride(chosen);
    patchDraft(projectId, { avatarId: id });
  };

  const handleApplyStylePreset = (preset: StylePresetConfig) => {
    setActiveStyle(preset.id);
    setNaturalness(preset.naturalness);
    setBrightness(preset.brightness);
    setFaceDetail(preset.detail);
    setEnvironmentBlend(preset.blend);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleContinue = () => {
    if (selectedAvatarId) {
      patchDraft(projectId, { avatarId: selectedAvatarId });
    }
    router.push(`/projects/${projectId}/report`);
  };

  // Resolve image source URL
  const getAvatarImageUrl = (preset?: Preset) => {
    if (!preset) return "/uploads/avatars/priyabrata_avatar_flux_working.jpg";
    const conf = preset.config as { image_url?: string; thumbnail_url?: string } | undefined;
    const url = preset.thumbnailUrl || conf?.image_url || conf?.thumbnail_url;
    if (url) {
      if (url.startsWith("http")) return url;
      if (url.startsWith("/")) return url;
      return `/${url}`;
    }
    return "/uploads/avatars/priyabrata_avatar_flux_working.jpg";
  };

  const previewImageUrl = getAvatarImageUrl(activeAvatar);

  // Interactive dynamic image CSS filter based on active preset & sliders
  const previewFilterStyle = {
    filter: `brightness(${0.7 + (brightness / 100) * 0.6}) contrast(${0.85 + (naturalness / 100) * 0.3}) saturate(${0.9 + (environmentBlend / 100) * 0.3})`,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {statusMessage ? (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-xs text-indigo-200">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-indigo-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-14">
        {/* ── LEFT COLUMN ──────────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Choose the avatar
            </h1>
            <p className="mt-1 text-sm font-light text-muted-foreground">
              Who appears in this video.
            </p>
          </div>

          {/* Avatar Dropdown Picker */}
          <div>
            <label
              htmlFor="avatar-select"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Avatar
            </label>
            <div className="relative">
              <select
                id="avatar-select"
                value={selectedAvatarId}
                onChange={(e) => handleSelectAvatar(e.target.value)}
                disabled={isLoading}
                className="w-full appearance-none rounded-xl border border-white/10 bg-[#121622] px-4 py-3 pr-10 text-sm font-light text-foreground transition-colors hover:border-white/20 focus:border-indigo-500 focus:outline-none"
              >
                {presets.map((preset) => (
                  <option
                    key={preset.id}
                    value={preset.id}
                    className="bg-[#121622] text-foreground"
                  >
                    {preset.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </div>

          {/* Avatars Section Title */}
          <div>
            <h2 className="text-xl font-semibold text-foreground">Avatars</h2>
            <p className="mt-1 text-sm font-light text-muted-foreground">
              Choose one for this project or add a custom avatar below.
            </p>
          </div>

          {/* 1. Upload portrait (Image-to-Avatar) */}
          <div className="rounded-2xl border border-white/10 bg-[#121622]/80 p-5 space-y-4 backdrop-blur-sm transition-all hover:border-white/20">
            <div className="flex items-center gap-2.5 text-base font-medium text-foreground">
              <Upload className="size-4 text-muted-foreground" />
              <span>Upload portrait (Image-to-Avatar)</span>
            </div>
            <p className="text-xs font-light leading-relaxed text-muted-foreground">
              Upload a portrait photo to build a custom avatar with{" "}
              <span className="font-mono text-[11px] text-foreground">
                Google Gemini & Flux AI
              </span>
              . PNG, JPEG, or WebP, up to 8MB.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-white/10"
              >
                {selectedFile ? selectedFile.name : "Choose an image"}
              </button>
              <button
                type="button"
                onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
                disabled={uploadMutation.isPending || !selectedFile}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:opacity-95 disabled:opacity-40"
              >
                {uploadMutation.isPending ? "Generating..." : "Generate avatar"}
              </button>
            </div>
          </div>

          {/* 2. Generate avatar (Text-to-Avatar) */}
          <div className="rounded-2xl border border-white/10 bg-[#121622]/80 p-5 space-y-4 backdrop-blur-sm transition-all hover:border-white/20">
            <div className="flex items-center gap-2.5 text-base font-medium text-foreground">
              <Sparkles className="size-4 text-purple-400" />
              <span>Generate avatar (Text-to-Avatar)</span>
            </div>
            <p className="text-xs font-light leading-relaxed text-muted-foreground">
              Describe the presenter persona you want to create using{" "}
              <span className="font-mono text-[11px] text-foreground">
                Google Gemini & Flux AI
              </span>
              .
            </p>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="text"
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder="e.g. Priyabrata Goze, sharp modern executive with studio lighting"
                disabled={generateMutation.isPending}
                className="flex-1 rounded-lg border border-white/15 bg-[#0c101a] px-3.5 py-2 text-xs font-light text-foreground placeholder:text-muted-foreground/60 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => textPrompt.trim() && generateMutation.mutate(textPrompt)}
                disabled={generateMutation.isPending || !textPrompt.trim()}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:opacity-95 disabled:opacity-40"
              >
                {generateMutation.isPending ? "Generating..." : "Generate avatar"}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: AVATAR PREVIEW & STUDIO ────────────────────────────── */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Avatar Preview
          </h2>

          {/* Viewfinder Camera Frame */}
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e17] shadow-2xl">
            {/* Generating Overlay */}
            {uploadMutation.isPending || generateMutation.isPending ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 p-6 text-center backdrop-blur-sm">
                <div className="relative mb-4 flex size-14 items-center justify-center">
                  <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/30" />
                  <div className="relative flex size-12 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/50">
                    <Sparkles className="size-6 text-white" />
                  </div>
                </div>
                <p className="text-sm font-medium text-white">
                  {uploadMutation.isPending
                    ? "AI is scanning your photo and generating your video avatar..."
                    : "AI is creating your presenter avatar..."}
                </p>
                <p className="mt-1.5 text-xs font-light text-muted-foreground">
                  Scanning features with Google Gemini & rendering studio portrait
                </p>
              </div>
            ) : null}

            {/* Background Avatar Image with Filter */}
            <div className="relative h-full w-full overflow-hidden">
              <Image
                src={previewImageUrl}
                alt={activeAvatar?.name || "Avatar Preview"}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-all duration-300"
                style={previewFilterStyle}
                priority
                unoptimized
              />
            </div>

            {/* Viewfinder Camera Bracket Markers */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-4 h-6 w-6 rounded-tl-sm border-l-2 border-t-2 border-white/40"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-4 h-6 w-6 rounded-tr-sm border-r-2 border-t-2 border-white/40"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-4 left-4 h-6 w-6 rounded-bl-sm border-b-2 border-l-2 border-white/40"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-4 right-4 h-6 w-6 rounded-br-sm border-b-2 border-r-2 border-white/40"
            />

            {/* Top Right Badges */}
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md shadow-sm">
                Generated Avatar (Image)
              </span>
              <button
                type="button"
                onClick={() => setIsZoomed(true)}
                className="rounded-md bg-black/40 p-1.5 text-white/70 backdrop-blur-sm transition-colors hover:text-white"
                title="Fullscreen Preview"
              >
                <Maximize2 size={15} />
              </button>
            </div>
          </div>

          {/* Style Presets Gallery */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-foreground">Style Presets</h3>
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {STYLE_PRESETS.map((preset) => {
                const isSelected = activeStyle === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyStylePreset(preset)}
                    className="group flex flex-col items-center gap-1.5 focus:outline-none"
                  >
                    <div
                      className={`relative h-16 w-24 overflow-hidden rounded-xl border transition-all ${
                        isSelected
                          ? "border-indigo-500 ring-2 ring-indigo-500/80 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                          : "border-white/10 hover:border-white/30 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={previewImageUrl}
                        alt={preset.label}
                        fill
                        sizes="96px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        style={{ filter: preset.filter }}
                        unoptimized
                      />
                    </div>
                    <span
                      className={`text-xs transition-colors ${
                        isSelected
                          ? "font-medium text-indigo-400"
                          : "font-light text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders Grid (2x2) */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-2">
            {/* Naturalness */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-light text-body-foreground">
                <span>Naturalness</span>
                <span className="text-foreground">{naturalness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={naturalness}
                onChange={(e) => {
                  setNaturalness(Number(e.target.value));
                  setActiveStyle("custom");
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-indigo-500"
              />
            </div>

            {/* Lighting Brightness */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-light text-body-foreground">
                <span>Lighting Brightness</span>
                <span className="text-foreground">{brightness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={brightness}
                onChange={(e) => {
                  setBrightness(Number(e.target.value));
                  setActiveStyle("custom");
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-indigo-500"
              />
            </div>

            {/* Face Detail */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-light text-body-foreground">
                <span>Face Detail</span>
                <span className="text-foreground">{faceDetail}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={faceDetail}
                onChange={(e) => {
                  setFaceDetail(Number(e.target.value));
                  setActiveStyle("custom");
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-indigo-500"
              />
            </div>

            {/* Environment Blend */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-light text-body-foreground">
                <span>Environment Blend</span>
                <span className="text-foreground">{environmentBlend}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={environmentBlend}
                onChange={(e) => {
                  setEnvironmentBlend(Number(e.target.value));
                  setActiveStyle("custom");
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-indigo-500"
              />
            </div>
          </div>

          {/* Action Row with Continue Button */}
          <div className="flex items-center justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={handleContinue}
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 px-8 py-3 text-sm font-medium text-white shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all hover:scale-[1.02] hover:opacity-95 active:scale-[0.98]"
            >
              <span>Continue</span>
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Modal for Zoomed Viewfinder */}
      {isZoomed ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/10] w-[80vw] max-w-3xl">
              <Image
                src={previewImageUrl}
                alt="Avatar Full Preview"
                fill
                className="object-contain"
                style={previewFilterStyle}
                unoptimized
              />
            </div>
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white/80 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
