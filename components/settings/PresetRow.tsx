"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Preset } from "@/types";

/**
 * One preset.
 *
 * ── There is no Delete, and that is the decision ────────────────────────────
 * `docs/screens.md` specifies "create/edit/delete" for these sections; specs/008
 * §3.3 overrides that line. A sent `CommunicationPackage` stores preset ids and
 * `/campaigns/[id]` exists to say what was sent, so destroying a preset makes
 * that page quietly show less than the truth about a message that already
 * reached a client — it would not break, which is what makes it the worst shape
 * of data loss.
 *
 * "Archive" is a weaker word than the "Delete" a user expects, and that cost is
 * accepted deliberately.
 */
export function PresetRow({
  preset,
  archived = false,
  onEdit,
  onArchive,
  onRestore,
  onSetDefault,
  busy = false,
}: {
  preset: Preset;
  archived?: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onSetDefault?: () => void;
  busy?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-4 rounded-xs border border-border bg-surface p-4 ${
        archived ? "opacity-60" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-normal text-foreground">{preset.name}</p>
          {/* Neutral, not accent. A default is a state, not an AI action. */}
          {preset.isDefault ? <Badge>Default</Badge> : null}
        </div>
        {preset.description ? (
          <p className="mt-1 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {preset.description}
          </p>
        ) : null}
        {archived && preset.archivedAt ? (
          <p className="mt-1 text-sm font-light text-muted-foreground">
            Archived {formatDate(preset.archivedAt)} · still resolves for
            packages already sent
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {archived ? (
          <Button variant="outline" size="sm" onClick={onRestore} disabled={busy}>
            Restore
          </Button>
        ) : (
          <>
            {!preset.isDefault && onSetDefault ? (
              <Button variant="ghost" size="sm" onClick={onSetDefault} disabled={busy}>
                Set default
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onEdit} disabled={busy}>
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={onArchive} disabled={busy}>
              Archive
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
