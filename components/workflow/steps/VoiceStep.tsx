"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Wand2,
  Check,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useProject } from "@/hooks/use-project";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { Preset } from "@/types";

const WAVEFORM_INITIAL_HEIGHTS = [
  35, 60, 45, 80, 55, 95, 70, 40, 85, 100, 65, 45, 75, 90, 50, 30, 70, 85, 40,
  60, 95, 75, 50, 35, 65, 80, 45, 70, 55, 30,
];

export function VoiceStep({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const patchDraft = useWorkflowStore((state) => state.patchDraft);
  const chosenVoiceId = useWorkflowStore(
    (state) => state.drafts[projectId]?.voiceId
  );
  const draftScript = useWorkflowStore(
    (state) => state.drafts[projectId]?.script
  );
  const draftSubject = useWorkflowStore(
    (state) => state.drafts[projectId]?.subject
  );

  // Queries
  const { data: project } = useProject(projectId);
  const { data: presets = [] } = useQuery({
    queryKey: qk.presets("voice"),
    queryFn: () => api.listPresets("voice"),
  });

  // Effective Script from Report Page
  const reportScript =
    draftScript ||
    project?.script?.body ||
    "Hello, I am Priyabrata Goze. Today I am pleased to walk you through our executive briefing and key findings.";
  const reportSubject =
    draftSubject ||
    project?.analysis?.executiveSummary ||
    "Executive Briefing & Report Overview";

  // Local states
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScriptPreviewOpen, setIsScriptPreviewOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Audio Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState<number>(30);
  const [waveformBars, setWaveformBars] = useState<number[]>(
    WAVEFORM_INITIAL_HEIGHTS
  );

  // Select initial voice
  useEffect(() => {
    if (presets.length > 0 && !selectedVoiceId) {
      const match =
        presets.find((p) => p.id === chosenVoiceId) ||
        presets.find((p) => p.isDefault) ||
        presets.find((p) => p.name.toUpperCase().includes("PRIYABRATA")) ||
        presets[0];
      if (match) {
        setSelectedVoiceId(match.id);
        patchDraft(projectId, { voiceId: match.id });
      }
    }
  }, [presets, chosenVoiceId, selectedVoiceId, patchDraft, projectId]);

  const selectedVoice: Preset | undefined =
    presets.find((p) => p.id === selectedVoiceId) ||
    presets.find((p) => p.isDefault) ||
    presets[0];

  const rawAudioUrl = selectedVoice?.config?.audio_url;
  const audioUrl: string | null =
    typeof rawAudioUrl === "string" && rawAudioUrl
      ? rawAudioUrl.startsWith("http") || rawAudioUrl.startsWith("/")
        ? rawAudioUrl
        : `/${rawAudioUrl}`
      : null;

  useEffect(() => {
    if (selectedVoice?.config?.duration) {
      setTotalDuration(Number(selectedVoice.config.duration) || 30);
    }
  }, [selectedVoice]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  // Upload Voice Mutation (Scans sample with Gemini & Synthesizes Report Script)
  const uploadVoiceMutation = useMutation({
    mutationFn: ({
      file,
      name,
    }: {
      file: File;
      name?: string;
    }) =>
      api.uploadVoice(file, name, {
        projectId,
        scriptText: reportScript,
      }),
    onSuccess: (newPreset) => {
      queryClient.setQueryData<Preset[]>(qk.presets("voice"), (old = []) => [
        newPreset,
        ...old.filter((p) => p.id !== newPreset.id),
      ]);
      setSelectedVoiceId(newPreset.id);
      patchDraft(projectId, { voiceId: newPreset.id });
      if (newPreset.config?.duration) {
        setTotalDuration(Number(newPreset.config.duration));
      }
      stopAudio();
      if (audioRef.current) {
        audioRef.current.load();
      }
      setStatusMessage(
        `Voice cloned successfully with Gemini AI! Now reading your Report script.`
      );
      setTimeout(() => setStatusMessage(null), 5000);
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === "object" && err !== null && "detail" in err
          ? String((err as { detail: string }).detail)
          : "Failed to upload and synthesize voice.";
      setStatusMessage(msg);
      setTimeout(() => setStatusMessage(null), 5000);
    },
  });

  // Re-synthesize Mutation
  const resynthesizeMutation = useMutation({
    mutationFn: () => {
      if (!selectedVoice) throw new Error("No voice selected");
      return api.resynthesizeVoice(selectedVoice.id, {
        projectId,
        scriptText: reportScript,
      });
    },
    onSuccess: (updatedPreset) => {
      queryClient.setQueryData<Preset[]>(qk.presets("voice"), (old = []) =>
        old.map((p) => (p.id === updatedPreset.id ? updatedPreset : p))
      );
      if (updatedPreset.config?.duration) {
        setTotalDuration(Number(updatedPreset.config.duration));
      }
      stopAudio();
      if (audioRef.current) {
        audioRef.current.load();
      }
      setStatusMessage("Voice re-synthesized for the updated report script!");
      setTimeout(() => setStatusMessage(null), 4000);
    },
    onError: () => {
      setStatusMessage("Re-synthesis failed. Please try again.");
      setTimeout(() => setStatusMessage(null), 4000);
    },
  });

  // Archive / Delete Mutation
  const deleteVoiceMutation = useMutation({
    mutationFn: (id: string) => api.archivePreset(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.presets("voice") });
      const remaining = presets.filter((p) => p.id !== selectedVoiceId);
      if (remaining.length > 0) {
        setSelectedVoiceId(remaining[0].id);
        patchDraft(projectId, { voiceId: remaining[0].id });
      } else {
        setSelectedVoiceId("");
      }
      stopAudio();
      setStatusMessage("Voice deleted successfully.");
      setTimeout(() => setStatusMessage(null), 3000);
    },
    onError: () => {
      setStatusMessage("Failed to delete voice.");
      setTimeout(() => setStatusMessage(null), 3000);
    },
  });

  // Handle Audio File Selection
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = selectedVoice?.name || "PRIYABRATA GOZE";
    uploadVoiceMutation.mutate({ file, name });
    e.target.value = "";
  };

  // Playback Control
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setWaveformBars(WAVEFORM_INITIAL_HEIGHTS);
  };

  const togglePlayAudio = () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    if (audioRef.current && audioUrl) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // If browser audio playback has issue, fallback to Web Speech
          playWithSpeechSynthesis();
        });
    } else {
      playWithSpeechSynthesis();
    }
  };

  const playWithSpeechSynthesis = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(reportScript);
      utterance.rate = 1.0;
      utterance.onend = () => stopAudio();
      utterance.onerror = () => stopAudio();
      window.speechSynthesis.speak(utterance);
    }
    setIsPlaying(true);
    setCurrentTime(0);
  };

  useEffect(() => {
    let animInterval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      animInterval = setInterval(() => {
        setWaveformBars(
          WAVEFORM_INITIAL_HEIGHTS.map((base) =>
            Math.min(100, Math.max(15, Math.floor(base * (0.3 + Math.random() * 0.9))))
          )
        );
      }, 200);
    } else {
      setWaveformBars(WAVEFORM_INITIAL_HEIGHTS);
    }
    return () => {
      if (animInterval) clearInterval(animInterval);
    };
  }, [isPlaying]);

  const handleContinue = () => {
    stopAudio();
    if (selectedVoiceId) {
      patchDraft(projectId, { voiceId: selectedVoiceId });
    }
    router.push(`/projects/${projectId}/video`);
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const voiceDisplayName = selectedVoice?.name
    ? selectedVoice.name.toUpperCase()
    : "PRIYABRATA GOZE";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hidden Audio File Input */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/wav,audio/mpeg,audio/mp3,audio/m4a,audio/x-m4a,audio/ogg"
        className="hidden"
        onChange={handleAudioUpload}
      />

      {/* Real Audio Player Element */}
      {audioUrl ? (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(Math.floor(audioRef.current.currentTime));
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current && audioRef.current.duration) {
              setTotalDuration(Math.round(audioRef.current.duration));
            }
          }}
          onEnded={stopAudio}
          onError={stopAudio}
        />
      ) : null}

      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Choose the voice
        </h1>
        <p className="mt-2 text-sm font-light text-muted-foreground">
          How the avatar sounds in this video.
        </p>
      </div>

      {/* Status Notification */}
      {statusMessage && (
        <div className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-4 text-xs font-light text-cyan-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Check className="size-4 text-cyan-400" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-cyan-400 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Voice Dropdown Selector */}
      <div className="space-y-2">
        <label className="text-xs font-normal text-muted-foreground">Voice</label>
        <div className="relative max-w-md">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#0d1322]/90 px-4 py-2.5 text-xs font-medium text-white shadow-inner backdrop-blur-md transition-colors hover:border-white/20 focus:outline-none focus:border-cyan-500"
          >
            <div className="flex items-center gap-2.5">
              <UserRound className="size-4 text-cyan-400" />
              <span className="tracking-wide font-semibold">
                {voiceDisplayName}
              </span>
            </div>
            <ChevronDown
              className={`size-4 text-white/60 transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Options */}
          {isDropdownOpen && (
            <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#0d1322] p-1.5 shadow-2xl backdrop-blur-xl">
              {presets.map((preset) => {
                const isSelected = preset.id === selectedVoiceId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedVoiceId(preset.id);
                      patchDraft(projectId, { voiceId: preset.id });
                      setIsDropdownOpen(false);
                      stopAudio();
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "text-white/80 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserRound className="size-3.5 text-white/60" />
                      <span>{preset.name.toUpperCase()}</span>
                      {preset.isDefault && (
                        <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[9px] text-white/60">
                          Default
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="size-3.5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Connected Report Script Preview Card */}
      <div className="rounded-2xl border border-white/10 bg-[#0f1523]/80 p-5 shadow-lg backdrop-blur-sm transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/30">
              <FileText className="size-4 text-indigo-400" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white">
                Report Script to be Voiced:
              </span>
              <span className="ml-2 text-xs font-medium text-cyan-300">
                {reportSubject}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsScriptPreviewOpen(!isScriptPreviewOpen)}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-white transition-colors"
          >
            <span>{isScriptPreviewOpen ? "Hide script" : "View script"}</span>
            {isScriptPreviewOpen ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        </div>

        {isScriptPreviewOpen && (
          <div className="mt-3.5 rounded-xl border border-white/5 bg-[#090d16] p-4 text-xs font-light text-slate-300 leading-relaxed max-h-48 overflow-y-auto shadow-inner">
            <p className="whitespace-pre-line">{reportScript}</p>
          </div>
        )}
      </div>

      {/* Voices Section Heading */}
      <div className="pt-2">
        <h2 className="text-xl font-semibold text-white tracking-tight">Voices</h2>
        <p className="mt-1 text-xs font-light text-muted-foreground">
          How the avatar sounds. The Video step chooses between these; it cannot create one.
        </p>
      </div>

      {/* Main Studio Card Box */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0c111e]/90 p-6 sm:p-7 shadow-[0_0_40px_rgba(6,182,212,0.12)] backdrop-blur-md transition-all">
        {/* Top Part: Clone a voice */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Clone a voice</h3>
            <p className="mt-1 text-xs font-light text-muted-foreground max-w-lg leading-relaxed">
              Upload a clear sample of at least thirty seconds. WAV, MP3 or M4A, up to 25MB.
            </p>
          </div>

          <button
            type="button"
            disabled={uploadVoiceMutation.isPending}
            onClick={() => audioInputRef.current?.click()}
            className="flex shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white px-5 py-2 text-xs font-semibold text-black shadow-md hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {uploadVoiceMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Scanning & Synthesizing...</span>
              </>
            ) : (
              <>
                <Upload className="size-3.5" />
                <span>Upload the voice</span>
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-white/10" />

        {/* Bottom Part: AI Generated Voice */}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">AI Generated Voice</h3>
            <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
              <Sparkles className="size-2.5 text-cyan-400" />
              AI
            </span>
          </div>
          <p className="mt-1 text-xs font-light text-muted-foreground">
            Listen to the generated cloned voice reading your report script.
          </p>

          {/* Audio Player Row */}
          <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#070b14]/80 p-4 sm:p-5 shadow-inner backdrop-blur-sm">
            {/* Left Column: Play button, Soundwave visualizer, Voice metadata */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Play / Pause Circular Button */}
              <button
                type="button"
                onClick={togglePlayAudio}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform hover:scale-105 active:scale-95"
                title={isPlaying ? "Pause voice preview" : "Play voice preview"}
              >
                {isPlaying ? (
                  <Pause className="size-5 fill-black text-black" />
                ) : (
                  <Play className="size-5 fill-black text-black ml-0.5" />
                )}
              </button>

              {/* Soundwave Visualizer Graphic */}
              <div className="flex items-center gap-1 h-9 px-2 shrink-0">
                {waveformBars.map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-200 ${
                      isPlaying
                        ? "bg-gradient-to-t from-cyan-400 via-sky-400 to-indigo-400"
                        : "bg-white/30"
                    }`}
                    style={{
                      height: `${h}%`,
                    }}
                  />
                ))}
              </div>

              {/* Voice Info: Only show user name and time tracking */}
              <div className="min-w-0 flex-1 pl-1">
                <div className="truncate text-sm font-semibold text-white tracking-wide">
                  {voiceDisplayName}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Ready
                  </span>
                  <span className="text-[11px] font-light text-muted-foreground/70">
                    • {formatAudioTime(currentTime)} • {formatAudioTime(totalDuration)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Generate button and Delete sign button */}
            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
              {/* Generate Button */}
              <button
                type="button"
                disabled={resynthesizeMutation.isPending || uploadVoiceMutation.isPending}
                onClick={() => {
                  if (selectedVoice?.id) {
                    resynthesizeMutation.mutate();
                  } else {
                    audioInputRef.current?.click();
                  }
                }}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-5 py-2 text-xs font-semibold text-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:opacity-95 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {resynthesizeMutation.isPending || uploadVoiceMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="size-3.5" />
                    <span>Generate</span>
                  </>
                )}
              </button>

              {/* Delete Sign Button */}
              <button
                type="button"
                disabled={deleteVoiceMutation.isPending}
                onClick={() => {
                  if (selectedVoice?.id) {
                    deleteVoiceMutation.mutate(selectedVoice.id);
                  }
                }}
                title="Delete voice"
                className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {deleteVoiceMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin text-red-400" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Row */}
      <div className="flex items-center justify-between pt-6">
        <button
          type="button"
          onClick={() => {
            stopAudio();
            router.push(`/projects/${projectId}/report`);
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleContinue}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 px-7 py-2.5 text-xs font-semibold text-white shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all hover:opacity-95"
        >
          <span>Continue</span>
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
