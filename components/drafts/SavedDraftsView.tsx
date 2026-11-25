"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Mail,
  Search,
  Sparkles,
  Trash2,
  Users,
  Video,
} from "lucide-react";

import { useProjects } from "@/hooks/use-projects";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { resumeHref } from "@/lib/workflow";
import { useWorkflowStore, type WorkflowDraft } from "@/stores/workflow-store";
import type { Project } from "@/types";

type SortOption = "recent" | "oldest" | "alpha";

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 5) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recently";
  }
}

export function SavedDraftsView() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Load all projects and filter for drafts / active in-progress work
  const { data: allProjects = [], isLoading, isError } = useProjects();

  const [search, setSearch] = useState("");
  const [sortBy] = useState<SortOption>("recent");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  // Filter to drafts or active editing projects
  const drafts = useMemo(() => {
    return allProjects.filter((p) => {
      // Include explicitly draft status or in-progress projects that have not been sent
      const isDraftStatus =
        p.status === "draft" ||
        p.status === "analysing" ||
        p.status === "video_pending" ||
        p.status === "email_pending" ||
        p.status === "ready_for_review";
      return isDraftStatus;
    });
  }, [allProjects]);

  // Apply search query and sorting
  const filteredAndSortedDrafts = useMemo(() => {
    let result = drafts;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const recipientMatch = p.recipient?.name?.toLowerCase().includes(q);
        const reportMatch = p.report?.fileName?.toLowerCase().includes(q);
        return nameMatch || recipientMatch || reportMatch;
      });
    }

    return [...result].sort((a, b) => {
      if (sortBy === "recent") {
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
      if (sortBy === "oldest") {
        return (
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );
      }
      if (sortBy === "alpha") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  }, [drafts, search, sortBy]);

  // Delete mutation with optimistic UI removal and store cleanup
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.deleteProject(id);
      } catch (err) {
        console.warn("Delete project API error:", err);
      }
      useWorkflowStore.getState().clearDraft(id);
      return id;
    },
    onMutate: async (deletedId) => {
      // Optimistically remove from list immediately for instant UI feedback
      queryClient.setQueryData<Project[]>(qk.projects(), (prev = []) =>
        prev.filter((p) => p.id !== deletedId)
      );
      setDeleteTarget(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  // Create new project
  const handleCreateNew = async () => {
    try {
      setIsCreating(true);
      const newProject = await api.createProject();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/projects/${newProject.id}/avatar`);
    } catch (err) {
      console.error("Failed to create project:", err);
      setIsCreating(false);
    }
  };

  // Resume editing & hydrate store
  const handleResume = (project: Project) => {
    const existingDraft =
      useWorkflowStore.getState().getDraft(project.id) || {};
    const draftPatch: WorkflowDraft = {
      ...existingDraft,
      avatarId: project.video?.avatarId || existingDraft.avatarId,
      voiceId: project.video?.voiceId || existingDraft.voiceId,
      format: project.video?.format || existingDraft.format,
      recipient: project.recipient
        ? {
          name: project.recipient.name,
          role: project.recipient.role,
          company: project.recipient.company,
          email: project.recipient.email,
          industry: project.recipient.industry || "",
          businessPriorities: project.recipient.businessPriorities || [],
          personalisation: project.recipient.personalisation || "medium",
        }
        : existingDraft.recipient,
      script: project.script?.body || existingDraft.script,
      subject: project.email?.subject || existingDraft.subject,
      greeting: project.email?.greeting || existingDraft.greeting,
      body: project.email?.body || existingDraft.body,
      ctaId: project.email?.ctaId || existingDraft.ctaId,
      signatureId: project.email?.signatureId || existingDraft.signatureId,
      executiveSummary:
        project.analysis?.executiveSummary || existingDraft.executiveSummary,
    };

    useWorkflowStore.getState().patchDraft(project.id, draftPatch);
    const href = resumeHref(project, draftPatch);
    router.push(href);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans pb-20 selection:bg-blue-600/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Top Header / Breadcrumbs */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-8">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Link
              href="/dashboard"
              className="hover:text-slate-200 transition-colors"
            >
              Past Projects
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200">Drafts</span>
          </div>
        </div>

        {/* Main Title & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1.5">
              Saved Drafts
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-light">
              Manage, resume, or delete your unpublished work. Drafts are saved
              securely in your workspace.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drafts..."
                className="w-48 sm:w-60 rounded-full border border-white/10 bg-[#0c101d] pl-9 pr-3.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>

            {/* Create New Project Button */}
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={isCreating}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#131828] hover:bg-[#1b233a] hover:border-white/25 px-4 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isCreating ? (
                <Loader2 className="size-3.5 animate-spin text-blue-400" />
              ) : (
                <Sparkles className="size-3.5 text-blue-400" />
              )}
              <span>Create New Project</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between py-4 border-b border-white/5 mb-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium select-none shadow-[0_0_10px_rgba(245,158,11,0.15)]">
              <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Draft</span>
            </span>
          </div>
        </div>

        {/* Draft Cards List */}
        {isLoading ? (
          <div className="space-y-4 py-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <p>Could not load drafts from your workspace.</p>
          </div>
        ) : filteredAndSortedDrafts.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
            <FileText className="size-8 mx-auto text-slate-500 mb-3 opacity-60" />
            <h3 className="text-base font-medium text-slate-200 mb-1">
              No saved drafts found
            </h3>
            <p className="text-xs text-slate-400 mb-5 max-w-sm mx-auto">
              {search
                ? `No drafts match "${search}". Try clearing your search query.`
                : "You don't have any unfinished drafts. Create a new project to start an AI video brief."}
            </p>
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                Clear search
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-medium text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer"
              >
                <Sparkles className="size-3.5" />
                <span>Create New Project</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredAndSortedDrafts.map((project, index) => {
              const isFirst = index === 0;
              const hasReport = Boolean(project.report?.fileName);
              const hasVideo = Boolean(project.video?.playbackUrl);
              const isDraftVideo =
                !hasVideo &&
                (Boolean(project.video) ||
                  project.status === "video_pending" ||
                  project.status === "analysing");
              const hasRecipient = Boolean(project.recipient?.name);
              const hasEmail = Boolean(
                project.email?.body || project.email?.subject
              );

              return (
                <div
                  key={project.id}
                  className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0c101d]/90 border transition-all ${isFirst
                    ? "border-blue-500/35 shadow-[0_0_25px_rgba(59,130,246,0.12)] hover:border-blue-500/50"
                    : "border-white/10 hover:border-white/20 hover:bg-[#0f1424]"
                    }`}
                >
                  {/* Left Side: Icon, Title, Timestamp & Status Pills */}
                  <div className="flex items-start gap-4">
                    {/* Document Icon Badge */}
                    <div className="size-10 rounded-xl bg-[#141a2c] border border-white/10 flex flex-col items-center justify-center shrink-0 shadow-inner">
                      <FileText className="size-4 text-slate-300" />
                      <span className="text-[8px] font-semibold tracking-wider text-amber-400 mt-0.5">
                        Draft
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight group-hover:text-blue-200 transition-colors">
                          {project.name}
                        </h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Last edited: {formatRelativeTime(project.updatedAt)}
                        </p>
                      </div>

                      {/* Dynamic Status Pills */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {/* Report Pill */}
                        {hasReport && (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                            <FileText className="size-3 text-slate-400" />
                            <span>{project.report?.fileName}</span>
                          </span>
                        )}

                        {/* Video Pill */}
                        {hasVideo ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
                            <Video className="size-3 text-emerald-400" />
                            <span>Video ready</span>
                          </span>
                        ) : isDraftVideo ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                            <Video className="size-3 text-slate-400" />
                            <span>Draft video</span>
                          </span>
                        ) : null}

                        {/* Recipient Pill */}
                        {hasRecipient && (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                            <Users className="size-3 text-slate-400" />
                            <span>Recipients set</span>
                          </span>
                        )}

                        {/* Email Pill */}
                        {hasEmail && (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                            <Mail className="size-3 text-slate-400" />
                            <span>Email draft</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Action Buttons */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    {/* Resume Edition Button */}
                    <button
                      type="button"
                      onClick={() => handleResume(project)}
                      className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium px-4 sm:px-5 py-1.5 text-xs shadow-[0_0_20px_rgba(59,130,246,0.45)] hover:shadow-[0_0_25px_rgba(59,130,246,0.65)] transition-all cursor-pointer"
                    >
                      Resume Edition
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(project)}
                      title="Delete draft"
                      className="inline-flex items-center justify-center size-8 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-400/80 hover:text-rose-300 transition-all cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info & Return link */}
        <div className="mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            Showing {filteredAndSortedDrafts.length} saved{" "}
            {filteredAndSortedDrafts.length === 1 ? "draft" : "drafts"}.
          </p>

          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="size-3" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0e121e] border border-white/15 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2">
              Delete draft?
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-200 font-medium">
                &ldquo;{deleteTarget.name}&rdquo;
              </strong>
              ? This action will remove all progress and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white transition-all cursor-pointer shadow-[0_0_15px_rgba(225,29,72,0.4)] disabled:opacity-50"
              >
                {deleteMutation.isPending && (
                  <Loader2 className="size-3 animate-spin" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
