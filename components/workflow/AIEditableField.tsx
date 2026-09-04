"use client";

import { useId } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * CLAUDE.md rule 4, made concrete: **every** AI-produced string in this app is
 * rendered through this component.
 *
 * > All AI output is editable. Summary, key insights, talking points, script,
 * > subject, body, CTA — render every one into a real form field with a
 * > regenerate affordance. Never present AI output as read-only prose.
 *
 * The rule admits no exceptions, so neither does this component: there is no
 * `readOnly` variant and no "display mode". If a screen wants to show AI output
 * without letting a user change it, the screen is wrong.
 *
 * ── The badge is a truth claim, not a decoration ────────────────────────────
 * "AI generated" disappears on the first edit, and the disappearance is the
 * point: once a human has changed the words, describing them as AI output is
 * false. `Analysis`, `Script` and `EmailDraft` each carry `editedByUser` so the
 * claim survives a page load, and the caller owns that flag — this component
 * reports the edit and does not decide what it means.
 *
 * ── Regenerate confirms only when there is something to lose ────────────────
 * Regenerating replaces the field. When `aiGenerated` is still true nothing a
 * human wrote is at risk, so there is no dialog; once they have edited, there
 * is, so there is. A confirmation over untouched AI output is a dialog that
 * trains people to click through dialogs — and the one dialog in this product
 * that must never be clicked through is the send confirmation.
 */
export function AIEditableField({
  value,
  onChange,
  label,
  variant = "input",
  description,
  placeholder,
  onRegenerate,
  isRegenerating = false,
  aiGenerated = false,
  rows,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  variant?: "input" | "textarea";
  description?: string;
  placeholder?: string;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  /** False once the user has edited — the caller owns this. */
  aiGenerated?: boolean;
  rows?: number;
}) {
  const id = useId();
  const describedBy = description ? `${id}-description` : undefined;

  const handleRegenerate = () => {
    if (!onRegenerate) return;
    if (!aiGenerated) {
      const ok = window.confirm(
        `Regenerating replaces the ${label.toLowerCase()} you have edited. Your changes will be lost.`,
      );
      if (!ok) return;
    }
    onRegenerate();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={id}>{label}</Label>
          {aiGenerated ? <Badge variant="ai">AI generated</Badge> : null}
        </div>

        {onRegenerate ? (
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            // --accent is correct here: this button starts an AI job, which is
            // exactly what the token means (docs/design-system.md §1).
            className="rounded-full px-2 py-1 text-sm font-light text-accent transition-colors duration-150 ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-50"
          >
            {isRegenerating ? "Regenerating…" : "Regenerate"}
          </button>
        ) : null}
      </div>

      {description ? (
        <p
          id={describedBy}
          className="text-sm font-light leading-relaxed tracking-[0.01em] text-muted-foreground"
        >
          {description}
        </p>
      ) : null}

      {variant === "textarea" ? (
        <Textarea
          id={id}
          value={value}
          rows={rows}
          placeholder={placeholder}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

/**
 * The list variant, separated rather than folded into a `variant` prop.
 *
 * `docs/design-system.md` lists `input | textarea | list` as one prop, but a
 * list edits an array of objects with reorder and include/exclude, while the
 * other two edit a string. One component doing both means every caller passes
 * props that are meaningless for its variant. The contract that matters — every
 * AI string is editable, badged and regenerable — is what both share, and it is
 * the header comment above that carries it.
 */
export function AIEditableList<T extends { id: string }>({
  items,
  label,
  renderItem,
  onRegenerate,
  isRegenerating = false,
  aiGenerated = false,
}: {
  items: readonly T[];
  label: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  aiGenerated?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-light tracking-[0.01em] text-body-foreground">
            {label}
          </span>
          {aiGenerated ? <Badge variant="ai">AI generated</Badge> : null}
        </div>

        {onRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="rounded-full px-2 py-1 text-sm font-light text-accent transition-colors duration-150 ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-50"
          >
            {isRegenerating ? "Regenerating…" : "Regenerate"}
          </button>
        ) : null}
      </div>

      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={item.id}>{renderItem(item, index)}</li>
        ))}
      </ul>
    </div>
  );
}
