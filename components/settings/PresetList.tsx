"use client";

import { useState } from "react";

import { PresetDialog } from "@/components/settings/PresetDialog";
import { PresetRow } from "@/components/settings/PresetRow";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePresets } from "@/hooks/use-presets";
import type { Preset, PresetKind } from "@/types";

/**
 * The shape six settings sections share.
 *
 * ── Why this component is the whole defence ─────────────────────────────────
 * Rule 1 keeps the workflow clean by sending every configurable item here, and
 * says nothing about what here becomes. specs/008 §3.9 supplies the missing
 * half: a new configurable item is either a preset of an existing kind — a row,
 * needing no new UI at all — or a new `PresetKind`, which is one more route
 * rendering *this* component.
 *
 * Nine screens that are variations of one screen stay navigable at thirty-nine
 * items. Nine bespoke forms do not. So the reuse here is not a tidiness
 * preference; it is the thing standing between this tree and the settings form
 * rule 1 exists to prevent.
 *
 * ── Archive, not delete ─────────────────────────────────────────────────────
 * There is no delete control anywhere in this component, and adding one would
 * break `/campaigns/[id]`: a sent package references preset ids, and that page
 * exists to say what was sent (specs/008 §3.3).
 */
export function PresetList({
  kind,
  title,
  description,
  createLabel,
  emptyDescription,
  children,
}: {
  kind: PresetKind;
  title: string;
  description: string;
  createLabel: string;
  emptyDescription: string;
  /** Section-specific extras — an upload panel, a guardrail note. Rendered
   *  above the list so the list stays the last thing on the page. */
  children?: React.ReactNode;
}) {
  const {
    presets,
    isPending,
    isError,
    error,
    refetch,
    create,
    update,
    archive,
    restore,
    setDefault,
  } = usePresets(kind);

  const [editing, setEditing] = useState<Preset | null>(null);
  const [creating, setCreating] = useState(false);

  const live = presets?.filter((preset) => !preset.archivedAt) ?? [];
  const archived = presets?.filter((preset) => preset.archivedAt) ?? [];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-normal tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-2 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {description}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>{createLabel}</Button>
      </div>

      {children}

      {isPending ? (
        <div aria-busy="true" aria-label={`Loading ${title}`} className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-xs border border-danger bg-surface p-6">
          <p className="text-base font-normal text-foreground">
            Could not load these presets.
          </p>
          <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : live.length === 0 ? (
        // Rule 9's empty state, and the one most likely to be skipped: a
        // section with nothing in it yet is the COMMON case here, not the
        // exceptional one, so it needs a way forward rather than an apology.
        <EmptyState
          title="Nothing here yet"
          description={emptyDescription}
          action={<Button onClick={() => setCreating(true)}>{createLabel}</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {live.map((preset) => (
            <li key={preset.id}>
              <PresetRow
                preset={preset}
                onEdit={() => setEditing(preset)}
                onArchive={() => archive.mutate(preset.id)}
                onSetDefault={() => setDefault.mutate(preset.id)}
                busy={archive.isPending || setDefault.isPending}
              />
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 ? (
        <details className="rounded-xs border border-border bg-surface p-4">
          <summary className="cursor-pointer list-none text-sm font-light tracking-[0.01em] text-body-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
            {archived.length} archived
          </summary>
          {/* Archived rows are kept, not hidden away for tidiness: a sent
              package may still reference one, and this is where a user finds
              the thing they archived by mistake. */}
          <ul className="mt-4 space-y-2">
            {archived.map((preset) => (
              <li key={preset.id}>
                <PresetRow
                  preset={preset}
                  archived
                  onRestore={() => restore.mutate(preset.id)}
                  busy={restore.isPending}
                />
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <PresetDialog
        open={creating}
        title={createLabel}
        onClose={() => setCreating(false)}
        onSubmit={(input) => {
          create.mutate(input, { onSuccess: () => setCreating(false) });
        }}
        isSubmitting={create.isPending}
      />

      <PresetDialog
        open={editing !== null}
        title="Edit preset"
        preset={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSubmit={(input) => {
          if (!editing) return;
          update.mutate(
            { id: editing.id, input },
            { onSuccess: () => setEditing(null) },
          );
        }}
        isSubmitting={update.isPending}
      />
    </section>
  );
}
