"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The shell the two document sections share — Analytics and Security.
 *
 * `PresetList` is the shape for the six list sections; this is the shape for
 * the two that edit one `WorkspaceSettings` record. Two shapes across nine
 * screens, which is what specs/008 §3.9 means by a tree that stays navigable:
 * a new section is one of these two, or it is evidence the thing being
 * configured is not configuration.
 *
 * Rule 9's four states, on a document rather than a list. There is no empty
 * state: a settings record always exists, and its fields having their defaults
 * is a value rather than an absence.
 */
export function SettingsSection({
  title,
  description,
  isPending,
  isError,
  error,
  onRetry,
  children,
}: {
  title: string;
  description: string;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => unknown;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-normal tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-2 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          {description}
        </p>
      </div>

      {isPending ? (
        <div aria-busy="true" aria-label={`Loading ${title}`} className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-xs border border-danger bg-surface p-6">
          <p className="text-base font-normal text-foreground">
            Could not load these settings.
          </p>
          <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => void onRetry()}>
            Try again
          </Button>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/**
 * One switch, with the room to say what it does.
 *
 * The description is not optional and that is deliberate: every toggle on these
 * two screens changes what happens to a client's data or a client's record, and
 * a switch whose consequence is not written down is one a user flips without
 * knowing what they agreed to.
 *
 * A native checkbox rather than a styled div with a role. It is
 * keyboard-operable, announces its state, and pairs with its label for free —
 * the same reasoning that put native `<select>` and native `<dialog>` in this
 * codebase.
 */
export function SettingToggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-4 rounded-xs border border-border bg-surface p-5 transition-colors duration-150 ease-out focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-foreground hover:bg-surface-raised"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 shrink-0 accent-foreground"
      />
      <span className="min-w-0">
        <span className="block text-sm font-normal text-foreground">{label}</span>
        <span className="mt-1 block max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

/** A bounded number, for retention periods. Days rather than a date picker:
 *  retention is a policy, and a policy is a duration. */
export function SettingNumber({
  id,
  label,
  description,
  value,
  onChange,
  disabled = false,
  zeroLabel,
}: {
  id: string;
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** What 0 means here — usually "keep indefinitely". */
  zeroLabel?: string;
}) {
  return (
    <div className="rounded-xs border border-border bg-surface p-5">
      <label htmlFor={id} className="block text-sm font-normal text-foreground">
        {label}
      </label>
      <p className="mt-1 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
        {description}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <input
          id={id}
          type="number"
          min={0}
          max={3650}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-28 rounded-xs border border-border bg-surface px-3 py-2 text-sm font-light tabular-nums text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        />
        <span className="text-sm font-light tracking-[0.01em] text-body-foreground">
          {value === 0 && zeroLabel ? zeroLabel : "days"}
        </span>
      </div>
    </div>
  );
}
