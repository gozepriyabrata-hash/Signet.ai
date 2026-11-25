"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Mail,
  Maximize2,

  Pause,
  Pencil,
  Play,
  Plus,
  Shield,
  Sparkles,
  Star,
  Tag,
  Target,
  UserRound,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useProject } from "@/hooks/use-project";
import { usePresets } from "@/hooks/use-presets";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { PersonalisationLevel } from "@/types";

const ROLE_OPTIONS = [
  "Select role",
  "CEO / Founder",
  "Chief Financial Officer (CFO)",
  "Chief Operating Officer (COO)",
  "VP of Operations",
  "Product Lead",
  "Director of Marketing",
  "Head of Engineering",
  "Finance Director",
  "General Counsel",
  "Other",
];

const INDUSTRY_OPTIONS = [
  "Select industry",
  "Technology & Software",
  "Financial Services & Banking",
  "Healthcare & Life Sciences",
  "E-Commerce & Retail",
  "Manufacturing & Logistics",
  "Education & Research",
  "Media & Entertainment",
  "Energy & Sustainability",
  "Other",
];

const PRIORITY_PILLS = [
  { id: "Growth", label: "Growth", icon: Star },
  { id: "AI Automation", label: "AI Automation", icon: Sparkles },
  { id: "Team Efficiency", label: "Team Efficiency", icon: Users },
  { id: "Cost Control", label: "Cost Control", icon: Shield },
];

export function RecipientStep({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: project, isLoading, isError, refetch } = useProject(projectId);
  const avatars = usePresets("avatar");

  const patchDraft = useWorkflowStore((state) => state.patchDraft);
  const setActiveJob = useWorkflowStore((state) => state.setActiveJob);
  const draft = useWorkflowStore((state) => state.drafts[projectId]?.recipient);
  const workflowDraft = useWorkflowStore((state) => state.drafts[projectId]);

  const committed = project?.recipient;

  // Form states
  const [fullName, setFullName] = useState<string>(
    draft?.name ?? committed?.name ?? ""
  );
  const [email, setEmail] = useState<string>(
    draft?.email ?? committed?.email ?? ""
  );
  const [role, setRole] = useState<string>(
    draft?.role ?? committed?.role ?? ""
  );

  const [company, setCompany] = useState<string>(
    draft?.company ?? committed?.company ?? ""
  );
  const [industry, setIndustry] = useState<string>(
    draft?.industry ?? committed?.industry ?? ""
  );
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(() => {
    if (draft?.businessPriorities && draft.businessPriorities.length > 0) {
      return draft.businessPriorities;
    }
    if (committed?.businessPriorities && committed.businessPriorities.length > 0) {
      return committed.businessPriorities;
    }
    return ["AI Automation"]; // Default selected per design screenshot
  });
  const [customPriority, setCustomPriority] = useState<string>("");
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const [note, setNote] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Video Player states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(20);
  const [isMuted, setIsMuted] = useState(false);

  // Video source: prioritize generated project video, then workflow video, then sample fallback
  const rawVideoUrl = project?.video?.playbackUrl;
  const videoSrc = rawVideoUrl && !rawVideoUrl.includes("SIGNET_MOCK_VIDEO")
    ? rawVideoUrl.startsWith("http") || rawVideoUrl.startsWith("/")
      ? rawVideoUrl
      : `/${rawVideoUrl}`
    : "/videos/sample_briefing.mp4";

  // Poster source
  const selectedAvatar =
    avatars.presets?.find((a) => a.id === workflowDraft?.avatarId) ||
    avatars.presets?.find((a) => a.id === project?.video?.avatarId) ||
    avatars.presets?.[0];
  const posterSrc =
    project?.video?.posterUrl ||
    selectedAvatar?.thumbnailUrl ||
    (selectedAvatar?.config?.image_url as string | undefined) ||
    "/videos/presenter_poster.jpg";

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [videoSrc]);

  // Video controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(true));
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(Math.floor(videoRef.current.currentTime));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      setDuration(Math.round(videoRef.current.duration));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.round(pos * (duration || 20));
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const togglePriority = (p: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const addCustomPriority = () => {
    const trimmed = customPriority.trim();
    if (trimmed && !selectedPriorities.includes(trimmed)) {
      setSelectedPriorities((prev) => [...prev, trimmed]);
      setCustomPriority("");
      setIsPriorityDropdownOpen(false);
    }
  };

  // Submit & Navigate Mutation
  const analyseMutation = useMutation({
    mutationFn: () => {
      const cleanEmail = email.trim();
      const recipientData = {
        id: committed?.id ?? `rcp_${projectId.slice(4)}`,
        name: fullName.trim() || "Valued Client",
        role: role.trim() || "Executive",
        company: company.trim() || "Partner",
        email: cleanEmail,
        industry: industry !== "Select industry" && industry ? industry : undefined,
        businessPriorities: selectedPriorities,
        personalisation: "medium" as PersonalisationLevel,
      };

      patchDraft(projectId, {
        recipient: {
          name: fullName.trim(),
          role: role.trim(),
          company: company.trim(),
          email: cleanEmail,
          industry: industry !== "Select industry" ? industry : "",
          businessPriorities: selectedPriorities,
          personalisation: "medium",
        },
        notes: note.trim(),
      });

      if (typeof api.generateEmailFromRecipient === "function") {
        void api.generateEmailFromRecipient(projectId, {
          recipientName: fullName.trim(),
          recipientRole: role.trim(),
          recipientCompany: company.trim(),
          recipientEmail: cleanEmail,
          recipientIndustry: industry !== "Select industry" ? industry : undefined,
          businessPriorities: selectedPriorities,
          notes: note.trim(),
        });
      }

      return api.analyzeReport(projectId, recipientData);
    },
    onSuccess: (started) => {
      setActiveJob(projectId, "analysis", started.id);
      void queryClient.invalidateQueries({ queryKey: qk.project(projectId) });
      router.push(`/projects/${projectId}/email`);
    },
    onError: (err: unknown) => {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to analyze recipient preferences."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg("Please enter the recipient's Full Name.");
      return;
    }
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg("Please enter the recipient's Email Address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg("Please enter a valid email address (e.g. example@gmail.com).");
      return;
    }
    setErrorMsg(null);
    analyseMutation.mutate();
  };


  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-white">
        <p className="text-sm font-medium">Could not load project information.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header Block */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Add{" "}
          <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent">
            Your Recipient
          </span>
        </h1>
        <p className="mt-2 text-sm font-light text-muted-foreground">
          Tell us who you&apos;re personalizing the video and email for.
        </p>
      </div>

      {/* Error alert */}
      {errorMsg ? (
        <div
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-200"
        >
          {errorMsg}
        </div>
      ) : null}

      {/* Main 2-Column Content Grid */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Form Card */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-blue-500/40 bg-[#070b18]/85 p-6 sm:p-7 shadow-[0_0_35px_rgba(37,99,235,0.18)] backdrop-blur-xl">
            <div className="space-y-5">
              {/* Row 1: Full Name & Email Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">
                    Full Name <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/10 bg-[#0b1021]/90 px-3.5 py-2.5 text-sm transition-all focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/40">
                    <UserRound className="size-4 text-white/40 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground/45 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">
                    Email Address <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/10 bg-[#0b1021]/90 px-3.5 py-2.5 text-sm transition-all focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/40">
                    <Mail className="size-4 text-white/40 mr-2.5 shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. example@gmail.com"
                      className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground/45 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Role & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">
                    Role <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/10 bg-[#0b1021]/90 px-3.5 py-2.5 text-sm transition-all focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/40">
                    <Briefcase className="size-4 text-white/40 mr-2.5 shrink-0" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full appearance-none bg-transparent text-sm text-white focus:outline-none cursor-pointer pr-6"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt === "Select role" ? "" : opt} className="bg-[#0b1021] text-white">
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 size-3.5 text-white/40" />
                  </div>
                </div>

                {/* Company */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">
                    Company <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/10 bg-[#0b1021]/90 px-3.5 py-2.5 text-sm transition-all focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/40">
                    <Building2 className="size-4 text-white/40 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground/45 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Industry */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">
                    Industry <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-white/10 bg-[#0b1021]/90 px-3.5 py-2.5 text-sm transition-all focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/40">
                    <Tag className="size-4 text-white/40 mr-2.5 shrink-0" />
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full appearance-none bg-transparent text-sm text-white focus:outline-none cursor-pointer pr-6"
                    >
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt === "Select industry" ? "" : opt} className="bg-[#0b1021] text-white">
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 size-3.5 text-white/40" />
                  </div>
                </div>
              </div>


              {/* Row 3: Business Priorities */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/90">
                  Business Priorities <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>

                {/* Custom priority entry box */}
                <div className="relative">
                  <div
                    onClick={() => setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b1021]/90 px-3.5 py-2.5 text-sm cursor-pointer hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Target className="size-4 text-white/40 shrink-0" />
                      <span className="text-sm text-muted-foreground/60 truncate">
                        {selectedPriorities.length > 0
                          ? selectedPriorities.join(", ")
                          : "Choose what they care about most..."}
                      </span>
                    </div>
                    <ChevronDown
                      className={`size-3.5 text-white/40 transition-transform ${
                        isPriorityDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {isPriorityDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-white/15 bg-[#070b14]/95 p-3 shadow-2xl backdrop-blur-xl z-30 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customPriority}
                          onChange={(e) => setCustomPriority(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomPriority();
                            }
                          }}
                          placeholder="Type custom priority and press Enter..."
                          className="flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          type="button"
                          onClick={addCustomPriority}
                          className="rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Priority Selection Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {PRIORITY_PILLS.map((pill) => {
                    const isSelected = selectedPriorities.includes(pill.id);
                    const Icon = pill.icon;
                    return (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => togglePriority(pill.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/50"
                            : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <Icon className={`size-3.5 ${isSelected ? "text-cyan-300" : "text-white/50"}`} />
                        <span>{pill.label}</span>
                      </button>
                    );
                  })}

                  {/* + More Button */}
                  <button
                    type="button"
                    onClick={() => setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
                    className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-white/20 hover:text-white transition-all"
                  >
                    <Plus className="size-3 text-white/50" />
                    <span>More</span>
                  </button>
                </div>
              </div>

              {/* Row 4: Add a Note */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-white/90">
                  Add a Note <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <div className="relative rounded-xl border border-white/10 bg-[#0b1021]/90 p-3 transition-all focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/40 shadow-inner">
                  <div className="flex items-start gap-2.5">
                    <Pencil className="size-3.5 text-white/40 mt-1 shrink-0" />
                    <textarea
                      rows={3}
                      value={note}
                      maxLength={500}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Any additional details about this recipient..."
                      className="w-full resize-none bg-transparent text-sm text-white placeholder:text-muted-foreground/45 focus:outline-none leading-relaxed"
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <span className="text-[10px] text-muted-foreground/60 font-mono">
                      {note.length}/500
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Video Preview Holder Card */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-indigo-500/40 bg-[#070b18]/85 p-5 sm:p-6 shadow-[0_0_35px_rgba(99,102,241,0.2)] backdrop-blur-xl">
            {/* Upper: Video Player Container */}
            <div className="flex-1 flex flex-col justify-center">
              <div
                ref={videoContainerRef}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-black aspect-video w-full shadow-2xl flex items-center justify-center group"
              >
                {/* HTML5 Video Element */}
                <video
                  ref={videoRef}
                  src={videoSrc}
                  poster={posterSrc}
                  playsInline
                  className="h-full w-full object-cover"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                />

                {/* Big Center Play Button (when paused) */}
                {!isPlaying && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto size-14 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 border border-white/30 backdrop-blur-md shadow-2xl transition-all hover:scale-110 active:scale-95 group/btn z-10"
                    title="Play Video"
                  >
                    <Play className="size-6 fill-white text-white ml-0.5 group-hover/btn:scale-105 transition-transform" />
                  </button>
                )}

                {/* Custom Video Controls Bar */}
                <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-5 flex items-center gap-3 text-white">
                  {/* Play / Pause Toggle */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="text-white hover:text-cyan-400 transition-colors"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="size-3.5" />
                    ) : (
                      <Play className="size-3.5 fill-white" />
                    )}
                  </button>

                  {/* Scrubber Progress Bar */}
                  <div
                    className="relative flex-1 h-1 bg-white/20 rounded-full cursor-pointer group/bar"
                    onClick={handleSeek}
                  >
                    <div
                      className="h-full bg-white rounded-full transition-all group-hover/bar:bg-cyan-400"
                      style={{ width: `${progressPercent}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 size-2.5 bg-white rounded-full shadow-md group-hover/bar:scale-125 transition-transform"
                      style={{ left: `calc(${progressPercent}% - 5px)` }}
                    />
                  </div>

                  {/* Time Indicator */}
                  <span className="text-[11px] font-mono text-white/80 shrink-0">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  {/* Volume Toggle */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="text-white/80 hover:text-white transition-colors"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <VolumeX className="size-3.5 text-red-400" />
                    ) : (
                      <Volume2 className="size-3.5" />
                    )}
                  </button>

                  {/* Fullscreen Toggle */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="text-white/80 hover:text-white transition-colors"
                    title="Fullscreen"
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Lower: Video Preview Status Box */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1021]/90 p-4 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-4.5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">
                    Video Preview
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Looks great! Your personalized video is ready.
                  </p>
                </div>
              </div>

              {/* Decorative sparkle burst */}
              <div className="flex items-center text-fuchsia-400 pr-1 animate-pulse">
                <Sparkles className="size-4.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="mt-8 flex items-center justify-between pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => router.push(`/projects/${projectId}/video`)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </button>

          <button
            type="submit"
            disabled={analyseMutation.isPending || !fullName.trim()}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-600 to-indigo-700 px-7 py-3 text-xs sm:text-sm font-semibold text-white shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {analyseMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin text-white" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Continue to Email</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
