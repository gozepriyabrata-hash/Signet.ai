"use client";

import { useState } from "react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRecipients } from "@/hooks/use-recipients";
import type { Recipient } from "@/types";

/**
 * `/settings/recipients` — the largest concentration of client identity in the
 * product: a list whose every row is a person, with their address.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * THIS SCREEN DELIBERATELY DOES NOT USE `PresetList`.
 *
 * Six sections share that component and this one cannot, which specs/008 §10
 * named as the thing to watch. §3.6 gives it four constraints no preset section
 * has, and each is structural rather than advisory:
 *
 *  1. **The filter never enters the URL.** It is component state. specs/004 §4
 *     kept project names out of a query string because they *describe* client
 *     work; here the value *is* a client. A `?q=` would put a person's name in
 *     browser history and in any pasted link.
 *  2. **No recipient field appears in any `href`.** There are no row links at
 *     all — editing opens a dialog.
 *  3. **No bulk export.** specs/005 §3.4 refused a column of email addresses
 *     because a list is one selection away from leaving the UI; a CSV button is
 *     that with a filename. Export belongs with the retention questions in
 *     `/settings/security`, not beside a table.
 *  4. **Deleting is confirmed, names the person, and says what survives.**
 *     There is no "delete all".
 *
 * A preset section has none of these. Sharing the component would mean giving
 * `PresetList` four props that are meaningless for presets, which is exactly
 * how one shape becomes nine bespoke ones.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function RecipientsSettings() {
  const { recipients, isPending, isError, error, refetch, save, remove } =
    useRecipients();

  const [filter, setFilter] = useState("");
  const debounced = useDebouncedValue(filter, 200);
  const [editing, setEditing] = useState<Recipient | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Recipient | null>(null);

  const needle = debounced.trim().toLowerCase();
  const visible = (recipients ?? []).filter(
    (person) =>
      !needle ||
      person.name.toLowerCase().includes(needle) ||
      person.company.toLowerCase().includes(needle),
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-normal tracking-tight text-foreground">
            Saved recipients
          </h2>
          <p className="mt-2 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            People you send to often. The Recipient step can load from this list
            instead of retyping. It stays in this workspace and is never sent
            anywhere you did not configure.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>New recipient</Button>
      </div>

      {/* Component state, never the URL. See constraint 1 in the header. */}
      <div className="max-w-sm space-y-2">
        <Label htmlFor="recipient-filter">Filter</Label>
        <Input
          id="recipient-filter"
          type="search"
          value={filter}
          placeholder="Name or company"
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>

      {isPending ? (
        <div aria-busy="true" aria-label="Loading recipients" className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-xs border border-danger bg-surface p-6">
          <p className="text-base font-normal text-foreground">
            Could not load your recipients.
          </p>
          <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : visible.length === 0 ? (
        // Two empties, as every list in this product has: nothing saved yet
        // needs a way forward, nothing matching needs a way back.
        needle ? (
          <div className="rounded-xs border border-border bg-surface px-6 py-16 text-center">
            <p className="text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
              Nobody matches that.
            </p>
            <Button variant="ghost" size="sm" className="mt-4" onClick={() => setFilter("")}>
              Clear the filter
            </Button>
          </div>
        ) : (
          <EmptyState
            title="No saved recipients"
            description="Save someone here and the Recipient step can load their details instead of you retyping them."
            action={<Button onClick={() => setCreating(true)}>New recipient</Button>}
          />
        )
      ) : (
        <ul className="space-y-2">
          {visible.map((person) => (
            <li
              key={person.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-xs border border-border bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-normal text-foreground">{person.name}</p>
                <p className="mt-1 text-sm font-light tracking-[0.01em] text-body-foreground">
                  {person.role} · {person.company}
                </p>
                <p className="mt-1 text-sm font-light tracking-[0.01em] text-muted-foreground">
                  {person.email}
                </p>
              </div>
              {/* Buttons, not links. No row target means no href, which means
                  no recipient field can reach a URL. */}
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(person)}>
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleting(person)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RecipientDialog
        key={editing?.id ?? (creating ? "new" : "closed")}
        open={creating || editing !== null}
        recipient={editing ?? undefined}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={(person) =>
          save.mutate(person, {
            onSuccess: () => {
              setCreating(false);
              setEditing(null);
            },
          })
        }
        isSubmitting={save.isPending}
      />

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Remove this recipient?"
        description={
          deleting
            ? `${deleting.name} at ${deleting.email} will be removed from this list. Packages already sent to them keep their own copy of these details, so nothing you have sent changes.`
            : ""
        }
      >
        <div className="flex justify-end gap-3">
          {/* autoFocus on the way out. This is a real delete — the one place
              specs/008 does not archive — so Enter on an open dialog must not
              perform it. */}
          <Button variant="outline" autoFocus onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() => {
              if (!deleting) return;
              remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
            }}
          >
            {remove.isPending ? "Removing…" : "Remove"}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}

function RecipientDialog({
  open,
  recipient,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  recipient?: Recipient;
  onClose: () => void;
  onSubmit: (person: Recipient) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(recipient?.name ?? "");
  const [role, setRole] = useState(recipient?.role ?? "");
  const [company, setCompany] = useState(recipient?.company ?? "");
  const [email, setEmail] = useState(recipient?.email ?? "");

  const valid =
    name.trim() !== "" && company.trim() !== "" && email.includes("@");

  if (!open) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={recipient ? "Edit recipient" : "New recipient"}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;
          onSubmit({
            id: recipient?.id ?? `rcp_${Math.random().toString(16).slice(2, 8)}`,
            name: name.trim(),
            role: role.trim(),
            company: company.trim(),
            email: email.trim(),
            industry: recipient?.industry,
            businessPriorities: recipient?.businessPriorities ?? [],
            personalisation: recipient?.personalisation ?? "medium",
          });
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="r-name">Name</Label>
            <Input id="r-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-role">Role</Label>
            <Input id="r-role" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-company">Company</Label>
            <Input id="r-company" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-email">Email</Label>
            <Input id="r-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
