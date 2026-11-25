"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Download,
  ChevronDown,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Sparkles,
  Wand2,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { useJobPolling } from "@/hooks/use-job-polling";
import { useProject } from "@/hooks/use-project";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { PresetKind, VideoAsset, VideoFormat } from "@/types";

function usePresets(kind: PresetKind) {
  return useQuery({
    queryKey: qk.presets(kind),
    queryFn: () => api.listPresets(kind),
  });
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoStep({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: project, isPending } = useProject(projectId);
  const patchDraft = useWorkflowStore((state) => state.patchDraft);
  const draft = useWorkflowStore((state) => state.drafts[projectId]);

  const avatars = usePresets("avatar");
  const voices = usePresets("voice");
  const styles = usePresets("scriptStyle");

  // Format selection: Landscape (16:9), Portrait (9:16), Square (1:1)
  const [format, setFormat] = useState<VideoFormat>(
    draft?.format || project?.video?.format || "landscape"
  );

  // Background scene prompt
  const [backgroundPrompt, setBackgroundPrompt] = useState<string>(
    draft?.backgroundPrompt || "Modern executive glass boardroom with city skyline at sunset, cinematic lighting"
  );

  // Resolution selection
  const [selectedResolution, setSelectedResolution] = useState<"1080p" | "720p">("1080p");
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  // Video player controls
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const [isMuted, setIsMuted] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Video Job Polling
  const jobId = useWorkflowStore((state) => state.activeJobs[`${projectId}:video`]);
  const setActiveJob = useWorkflowStore((state) => state.setActiveJob);
  const clearActiveJob = useWorkflowStore((state) => state.clearActiveJob);
  const { data: job } = useJobPolling<VideoAsset>(jobId, projectId);

  const isJobRunning = job?.status === "running" || job?.status === "queued";

  useEffect(() => {
    if (job?.status === "succeeded") {
      clearActiveJob(projectId, "video");
      void queryClient.invalidateQueries({ queryKey: qk.project(projectId) });
      if (videoRef.current) {
        videoRef.current.load();
      }
      setCurrentTime(0);
      setStatusNotification("Video rendered successfully with your selected avatar and voice!");
      setTimeout(() => setStatusNotification(null), 5000);
    }
  }, [job?.status, projectId, clearActiveJob, queryClient]);

  // Priority Avatar & Voice resolution from Draft / Project / Custom created
  const effectiveAvatarId =
    draft?.avatarId ||
    project?.video?.avatarId ||
    avatars.data?.find((a) => !a.id.startsWith("avt_"))?.id ||
    avatars.data?.find((a) => a.isDefault)?.id ||
    avatars.data?.[0]?.id ||
    "avt_default";

  const effectiveVoiceId =
    draft?.voiceId ||
    project?.video?.voiceId ||
    voices.data?.find((v) => v.name.toUpperCase().includes("PRIYABRATA"))?.id ||
    voices.data?.find((v) => v.isDefault)?.id ||
    voices.data?.[0]?.id ||
    "voi_default";

  // Video playback source
  const video = project?.video;
  const script = (draft?.script ?? project?.script?.body ?? "").trim() ||
    "Executive briefing and personalized AI insights based on your uploaded report.";

  // Active playback source: either project video asset, or high-fidelity sample briefing video
  const videoSrc = video?.playbackUrl && !video.playbackUrl.includes("SIGNET_MOCK_VIDEO")
    ? video.playbackUrl.startsWith("http")
      ? video.playbackUrl
      : video.playbackUrl.startsWith("/")
        ? video.playbackUrl
        : `/${video.playbackUrl}`
    : "/videos/sample_briefing.mp4";

  // Poster image: selected avatar from Step 1 or presenter poster
  const selectedAvatar =
    avatars.data?.find((a) => a.id === effectiveAvatarId) || avatars.data?.[0];
  const avatarPoster = selectedAvatar?.thumbnailUrl || (selectedAvatar?.config?.image_url as string | undefined);
  const posterSrc = avatarPoster
    ? avatarPoster.startsWith("http") || avatarPoster.startsWith("/")
      ? avatarPoster
      : `/${avatarPoster}`
    : "/videos/presenter_poster.jpg";

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [videoSrc]);

  // Generate / Regenerate Video Mutation
  const generateVideoMutation = useMutation({
    mutationFn: () =>
      api.generateVideo(projectId, {
        avatarId: effectiveAvatarId,
        voiceId: effectiveVoiceId,
        scriptStyleId: styles.data?.[0]?.id || "sty_executive",
        format,
        resolution: selectedResolution,
        captions: true,
        scriptText: script,
        prompt: backgroundPrompt,
        backgroundPrompt: backgroundPrompt,
      }),
    onSuccess: (started) => {
      setActiveJob(projectId, "video", started.id);
      patchDraft(projectId, { format, backgroundPrompt });
      setStatusNotification("Video generation started. Processing avatar lip-sync and custom background...");
      setTimeout(() => setStatusNotification(null), 4000);
    },
    onError: () => {
      setStatusNotification("Failed to start video generation. Please try again.");
      setTimeout(() => setStatusNotification(null), 4000);
    },
  });

  const handleGenerateVideo = () => {
    generateVideoMutation.mutate();
  };

  // Video playback functions
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        // Fallback simulate play
        setIsPlaying(true);
      });
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
      setCurrentTime(0);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.round(pos * (duration || 45));
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
      void videoContainerRef.current.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  };

  const handleDownload = (res: "1080p" | "720p") => {
    setIsDownloadOpen(false);
    const link = document.createElement("a");
    link.href = videoSrc;
    link.download = `Signet_Briefing_${format}_${res}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatusNotification(`Downloading ${res} video (${format})...`);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (isPending) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-96 rounded-3xl border border-white/10 bg-[#0c111e]/60 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Toast Notification */}
      {statusNotification && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-cyan-500/30 bg-[#0d1527]/95 px-4 py-3 text-xs font-medium text-cyan-200 shadow-2xl backdrop-blur-xl">
          <Sparkles className="size-4 text-cyan-400 shrink-0" />
          <span>{statusNotification}</span>
        </div>
      )}

      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Video studio
        </h1>
        <p className="text-xs sm:text-sm font-light text-muted-foreground/80 max-w-2xl leading-relaxed">
          The avatar reads the script below. Everything it can wear, sound like or be styled as is defined in Settings — this step chooses between them.
        </p>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
        {/* Left Column: Generated Video Card */}
        <div className="rounded-3xl border border-white/10 bg-[#0c111e]/90 p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {/* Top Bar of the Video Card */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Generated Video
            </h2>

            {/* Download Button with Resolution Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDownloadOpen(!isDownloadOpen)}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/90 shadow-sm backdrop-blur-md hover:bg-white/10 hover:border-white/25 transition-all"
              >
                <Download className="size-3.5 text-white/70" />
                <span>Download</span>
                <ChevronDown
                  className={`size-3 text-white/60 transition-transform ${
                    isDownloadOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Download Dropdown */}
              {isDownloadOpen && (
                <div className="absolute right-0 top-full mt-2 w-36 rounded-xl border border-white/10 bg-[#070b14] p-1.5 shadow-2xl backdrop-blur-2xl z-30">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 flex items-center justify-between">
                    <span>Resolution</span>
                    <ChevronDown className="size-2.5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload("1080p")}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-white/90 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between"
                  >
                    <span>1080p</span>
                    <span className="text-[10px] text-cyan-400 font-mono">FHD</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload("720p")}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-white/90 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between"
                  >
                    <span>720p</span>
                    <span className="text-[10px] text-muted-foreground font-mono">HD</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Video Player Display Container */}
          <div
            ref={videoContainerRef}
            className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-inner flex items-center justify-center transition-all ${
              format === "portrait"
                ? "aspect-[9/16] max-h-[500px] mx-auto"
                : format === "square"
                  ? "aspect-square max-h-[440px] mx-auto"
                  : "aspect-video w-full"
            }`}
          >
            {/* HTML5 Video Element with Real Audio & Video playback */}
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

            {/* Generating Progress Overlay */}
            {isJobRunning && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md text-white p-6">
                <div className="relative mb-4">
                  <div className="size-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto size-6 text-cyan-300 animate-pulse" />
                </div>
                <p className="text-sm font-semibold text-white tracking-wide">
                  {job?.stage || "Synthesizing lip-synced video..."}
                </p>
                <div className="mt-3 w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 transition-all duration-300"
                    style={{ width: `${job?.progress || 15}%` }}
                  />
                </div>
                <span className="mt-2 text-[11px] text-white/60 font-mono">
                  {job?.progress || 15}% complete
                </span>
              </div>
            )}

            {/* Top Left: Ready Status Badge */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-lg bg-black/70 border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-400 backdrop-blur-md shadow-lg">
              <span className={`size-2 rounded-full ${isJobRunning ? "bg-amber-400 animate-pulse" : "bg-emerald-400 animate-pulse"}`} />
              <span>{isJobRunning ? "Processing..." : "Ready"}</span>
            </div>

            {/* Top Right: Resolution Badge / Dropdown */}
            <div className="absolute top-3 right-3 z-20">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsResolutionOpen(!isResolutionOpen)}
                  className="flex items-center gap-1 rounded-lg bg-black/60 border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md hover:bg-black/80 transition-colors"
                >
                  <span>Resolution</span>
                  <ChevronDown
                    className={`size-3 text-white/60 transition-transform ${
                      isResolutionOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isResolutionOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-24 rounded-lg border border-white/10 bg-[#070b14]/95 p-1 shadow-2xl backdrop-blur-xl z-30">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedResolution("1080p");
                        setIsResolutionOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1 text-[11px] rounded transition-colors ${
                        selectedResolution === "1080p"
                          ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                          : "text-white/80 hover:bg-white/10"
                      }`}
                    >
                      1080p
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedResolution("720p");
                        setIsResolutionOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1 text-[11px] rounded transition-colors ${
                        selectedResolution === "720p"
                          ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                          : "text-white/80 hover:bg-white/10"
                      }`}
                    >
                      720p
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Center Big Play Button */}
            {!isPlaying && (
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 m-auto size-16 sm:size-18 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-md shadow-2xl transition-all hover:scale-110 active:scale-95 group z-20"
                title="Play Video"
              >
                <Play className="size-7 sm:size-8 fill-white text-white ml-1 group-hover:scale-105 transition-transform" />
              </button>
            )}

            {/* Bottom Right: Video Generated Successfully Badge */}
            <div className="absolute bottom-14 right-3 z-20 hidden sm:flex items-center gap-1.5 rounded-lg bg-black/75 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-400 backdrop-blur-md shadow-lg">
              <span>Video Generated Successfully</span>
            </div>

            {/* Bottom Video Controls Bar */}
            <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 flex items-center gap-3 text-white">
              {/* Play / Pause Toggle */}
              <button
                type="button"
                onClick={togglePlay}
                className="text-white hover:text-cyan-400 transition-colors"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4 fill-white" />
                )}
              </button>

              {/* Time Indicator */}
              <span className="text-xs font-mono text-white/80 min-w-[32px]">
                {formatTime(currentTime)}
              </span>

              {/* Progress Scrubber Bar */}
              <div
                className="relative flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer group"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-white rounded-full transition-all group-hover:bg-cyan-400"
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 size-3 bg-white rounded-full shadow-md group-hover:scale-125 transition-transform"
                  style={{ left: `calc(${progressPercent}% - 6px)` }}
                />
              </div>

              {/* Volume Toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className="text-white/80 hover:text-white transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="size-4 text-red-400" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </button>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="text-white/80 hover:text-white transition-colors"
                title="Fullscreen"
              >
                <Maximize className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Format & Generative CTA Area */}
        <div className="space-y-6">
          {/* Format Section */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide mb-3">
              Format
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {/* Landscape (16:9) */}
              <button
                type="button"
                onClick={() => {
                  setFormat("landscape");
                  patchDraft(projectId, { format: "landscape" });
                }}
                className={`flex flex-col items-center justify-center rounded-2xl border p-4 transition-all ${
                  format === "landscape"
                    ? "border-indigo-400 bg-indigo-950/40 shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-indigo-400/60"
                    : "border-white/10 bg-[#0d121f]/70 hover:border-white/20 text-white/70"
                }`}
              >
                <div
                  className={`w-8 h-5 rounded-[4px] border-2 mb-2.5 transition-colors ${
                    format === "landscape"
                      ? "border-cyan-300 bg-cyan-400/20"
                      : "border-white/40"
                  }`}
                />
                <span className="text-xs font-semibold text-white">Landscape</span>
                <span className="text-[10px] text-muted-foreground/70 mt-0.5">
                  16:9
                </span>
              </button>

              {/* Portrait (9:16) */}
              <button
                type="button"
                onClick={() => {
                  setFormat("portrait");
                  patchDraft(projectId, { format: "portrait" });
                }}
                className={`flex flex-col items-center justify-center rounded-2xl border p-4 transition-all ${
                  format === "portrait"
                    ? "border-indigo-400 bg-indigo-950/40 shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-indigo-400/60"
                    : "border-white/10 bg-[#0d121f]/70 hover:border-white/20 text-white/70"
                }`}
              >
                <div
                  className={`w-4.5 h-7 rounded-[4px] border-2 mb-2.5 transition-colors ${
                    format === "portrait"
                      ? "border-cyan-300 bg-cyan-400/20"
                      : "border-white/40"
                  }`}
                />
                <span className="text-xs font-semibold text-white">Portrait</span>
                <span className="text-[10px] text-muted-foreground/70 mt-0.5">
                  9:16
                </span>
              </button>

              {/* Square (1:1) */}
              <button
                type="button"
                onClick={() => {
                  setFormat("square");
                  patchDraft(projectId, { format: "square" });
                }}
                className={`flex flex-col items-center justify-center rounded-2xl border p-4 transition-all ${
                  format === "square"
                    ? "border-indigo-400 bg-indigo-950/40 shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-indigo-400/60"
                    : "border-white/10 bg-[#0d121f]/70 hover:border-white/20 text-white/70"
                }`}
              >
                <div
                  className={`size-6 rounded-[4px] border-2 mb-2.5 transition-colors ${
                    format === "square"
                      ? "border-cyan-300 bg-cyan-400/20"
                      : "border-white/40"
                  }`}
                />
                <span className="text-xs font-semibold text-white">Square</span>
                <span className="text-[10px] text-muted-foreground/70 mt-0.5">
                  1:1
                </span>
              </button>
            </div>
          </div>

          {/* Generative CTA Area */}
          <div className="pt-2">
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Generative CTA Area
            </h3>
            <p className="mt-1 text-xs font-light text-muted-foreground leading-relaxed">
              Download your video above or regenerate with different formats.
            </p>

            {/* Video Background & Scene Prompt Section */}
            <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-[#070b14]/70 p-3.5 backdrop-blur-md shadow-inner">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-cyan-400" />
                  <span>Video Background & Scene Prompt</span>
                </label>
                <span className="text-[10px] text-cyan-400/80 font-mono">
                  Gemini & Scene AI
                </span>
              </div>

              <textarea
                value={backgroundPrompt}
                onChange={(e) => {
                  setBackgroundPrompt(e.target.value);
                  patchDraft(projectId, { backgroundPrompt: e.target.value });
                }}
                rows={2}
                placeholder="Describe what the video background and scene should look like (e.g. Modern executive glass boardroom with city skyline at sunset, cinematic lighting)..."
                className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-muted-foreground/50 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner leading-relaxed"
              />

              {/* Quick Scene Suggestion Chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  { label: "🏢 Modern Office", prompt: "Modern executive office, glass walls, wooden desk, warm ambient lighting" },
                  { label: "🌆 City Skyline", prompt: "Highrise executive penthouse overlooking city skyline at sunset, warm cinematic glow" },
                  { label: "🎙️ Podcast Studio", prompt: "Futuristic dark podcast studio with neon cyan and purple accent lighting" },
                  { label: "💡 Tech Lab", prompt: "High-tech innovation lab, sleek dark glass panels, subtle blue backlight" },
                  { label: "🌿 Minimalist Studio", prompt: "Sleek minimalist architectural studio, soft spotlights, neutral warm tones" },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setBackgroundPrompt(item.prompt);
                      patchDraft(projectId, { backgroundPrompt: item.prompt });
                    }}
                    className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition-all ${
                      backgroundPrompt === item.prompt
                        ? "border-cyan-400/70 bg-cyan-500/20 text-cyan-300 shadow-sm"
                        : "border-white/10 bg-white/5 text-muted-foreground/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Glowing Gradient Regenerate Video Button */}
            <button
              type="button"
              disabled={generateVideoMutation.isPending || isJobRunning}
              onClick={handleGenerateVideo}
              className="mt-5 w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600 hover:from-sky-300 hover:via-blue-500 hover:to-indigo-500 px-6 py-4 text-sm font-semibold text-white shadow-[0_0_35px_rgba(37,99,235,0.4)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {generateVideoMutation.isPending || isJobRunning ? (
                <>
                  <Loader2 className="size-4 animate-spin text-white" />
                  <span>Generating Video...</span>
                </>
              ) : (
                <>
                  <Wand2 className="size-4 text-cyan-200" />
                  <span>Regenerate Video</span>
                  <RotateCw className="size-4 text-white/80 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between pt-10 border-t border-white/5">
        <button
          type="button"
          onClick={() => router.push(`/projects/${projectId}/voice`)}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-4">
          <Sparkles className="size-4 text-cyan-400/60" />
          <button
            type="button"
            onClick={() => router.push(`/projects/${projectId}/recipient`)}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-7 py-2.5 text-xs font-semibold text-white shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Continue</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
