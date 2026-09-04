"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { isNotFoundError } from "@/lib/api/errors";
import { qk } from "@/lib/query-keys";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { CommunicationPackage } from "@/types";

/**
 * One sent package — the record of what left the building.
 *
 * ── Read-only, and structurally so ──────────────────────────────────────────
 * This component calls `getPackage` and nothing else. It never calls
 * `sendPackage` or `buildPackage`, never mutates, and runs nothing on mount.
 *
 * There is no Resend button, and that absence is a decision rather than a gap
 * (specs/005 §3.5). Rule 2 says `sendPackage` is reachable ONLY from Review;
 * one send button outside Review makes that sentence false, and the second is
 * easier to add than the first. "Resend" is also a control whose own name
 * argues that the review already happened. The follow-on for a sent package is
 * to duplicate it for another recipient — a new project through the whole
 * workflow, ending at Review — which lands with the workflow spec.
 *
 * eslint.config.mjs enforces this with `no-restricted-syntax` rather than
 * trusting the comment.
 *
 * ── Why the lookup is client-side ───────────────────────────────────────────
 * The mock adapter's store is in `sessionStorage`, invisible to the server
 * (specs/003 §3.3). That rules out the idiomatic shape — a Server Component
 * that awaits the package and calls `notFound()` — and it rules out
 * `notFound()` altogether: Next documents it for Server Components, Server
 * Functions and Route Handlers, and Client Components are not on that list
 * (specs/005 §2.2). So a missing package renders its own empty state, the way
 * `/projects/[id]` already does.
 */
export function CampaignDetail({ packageId }: { packageId: string }) {
  const {
    data: pkg,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: qk.package(packageId),
    queryFn: () => api.getPackage(packageId),
    // A missing package stays missing; retrying only makes the user wait
    // through another round of latency for the same answer.
    retry: (failureCount, cause) => !isNotFoundError(cause) && failureCount < 1,
  });

  if (error) {
    return isNotFoundError(error) ? (
      <Shell>
        <EmptyState
          title="That campaign no longer exists"
          description="It may have been removed, or the link may be out of date. Everything that has been sent is on the campaigns list."
          action={
            <Button asChild variant="outline">
              <Link href="/campaigns">Back to campaigns</Link>
            </Button>
          }
        />
      </Shell>
    ) : (
      <Shell>
        <div
          role="alert"
          className="rounded-xs border border-danger bg-surface p-6"
        >
          <p className="text-base font-normal text-foreground">
            Could not load this campaign.
          </p>
          <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? "Retrying…" : "Retry"}
          </Button>
        </div>
      </Shell>
    );
  }

  if (!pkg) return <DetailSkeleton />;

  return (
    <Shell>
      <Header pkg={pkg} />
      <SentTo pkg={pkg} />
      <WhatWasSent pkg={pkg} />
      <ApprovalTrail pkg={pkg} />

      <div className="pt-2">
        <Button asChild variant="outline">
          <Link href="/campaigns">Back to campaigns</Link>
        </Button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-10 lg:px-8">
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xs border border-border bg-surface p-6">
      <h2 className="text-sm font-normal tracking-[0.01em] text-body-foreground">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-light tracking-[0.01em] text-body-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-normal text-foreground">{value}</dd>
    </div>
  );
}

function Header({ pkg }: { pkg: CommunicationPackage }) {
  const failed = pkg.status === "failed";

  return (
    <div>
      <h1 className="text-4xl font-light tracking-tight text-foreground">
        {pkg.email.subject}
      </h1>

      <p className="mt-3 text-sm font-light leading-relaxed tracking-[0.01em]">
        {/* A send is a job outcome, which is what semantic colour is reserved
            for (docs/design-system.md §1). */}
        <span className={failed ? "text-danger" : "text-success"}>
          {failed ? "Send failed" : "Sent"}
        </span>
        {pkg.sentAt ? (
          <>
            <span className="text-body-foreground"> · </span>
            <time dateTime={pkg.sentAt} className="text-body-foreground">
              {formatDateTime(pkg.sentAt)}
            </time>
          </>
        ) : null}
      </p>

      {failed ? (
        <div
          role="alert"
          className="mt-6 rounded-xs border border-danger bg-surface p-6"
        >
          <p className="text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            This package did not reach its recipient. It can be reviewed and
            sent again from the project&rsquo;s Review step — the only screen
            from which anything is sent.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-5">
            <Link href={`/projects/${pkg.projectId}/review`}>
              Open in Review
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The full recipient record, email address included.
 *
 * This page's job is to let a human verify what actually left the building, and
 * an email history that will not show the address it used is not evidence of
 * anything. The list deliberately stops at name and company; here the whole
 * record is the point (specs/005 §3.4).
 */
function SentTo({ pkg }: { pkg: CommunicationPackage }) {
  const { recipient } = pkg;

  return (
    <Section title="Sent to">
      <dl className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" value={recipient.name} />
        <Field label="Email" value={recipient.email} />
        <Field label="Role" value={recipient.role} />
        <Field label="Company" value={recipient.company} />
      </dl>
    </Section>
  );
}

/** "2m 48s", from a duration the record actually carries. */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}m ${rest}s`;
}

function WhatWasSent({ pkg }: { pkg: CommunicationPackage }) {
  const { video, email, reportAttachment } = pkg;

  return (
    <Section title="What was sent">
      <div className="space-y-6">
        {/* A placeholder frame, NOT an <img src={video.posterUrl}>. Nothing on
            this route may make an external request (specs/005 §3.10), and a
            poster URL is the one field a component would put straight into a
            src. The metadata below is what the record needs to show anyway. */}
        <div>
          <div
            aria-hidden="true"
            className="flex h-40 items-center justify-center rounded-xs border border-border bg-surface-raised"
          >
            <span className="text-sm font-light text-body-foreground">
              Personalised video
            </span>
          </div>
          <p className="mt-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {video.durationSec
              ? formatDuration(video.durationSec)
              : "Duration unknown"}
            {" · "}
            {video.format === "landscape" ? "Landscape" : "Portrait"}
            {video.captions ? " · Captions on" : " · No captions"}
          </p>
        </div>

        <div>
          <p className="text-sm font-light tracking-[0.01em] text-body-foreground">
            Email
          </p>
          <div className="mt-2 rounded-xs border border-border bg-surface-raised p-5">
            <p className="text-sm font-normal text-foreground">
              {email.greeting}
            </p>
            <p className="mt-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
              {email.body}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-light tracking-[0.01em] text-body-foreground">
            Attachment
          </p>
          <p className="mt-1 text-sm font-normal text-foreground">
            {reportAttachment.fileName}
            <span className="font-light text-body-foreground">
              {" · "}
              {Math.round(reportAttachment.sizeBytes / 1000).toLocaleString(
                "en-GB",
              )}
              {" kB"}
            </span>
          </p>
        </div>
      </div>
    </Section>
  );
}

/**
 * Rule 2's audit evidence, made visible.
 *
 * Every package here passed through a human approval on Review. Showing who
 * approved it and when is what turns "nothing sends itself" from a claim into
 * a record.
 */
function ApprovalTrail({ pkg }: { pkg: CommunicationPackage }) {
  if (!pkg.approvedAt && !pkg.approvedBy) return null;

  return (
    <Section title="Approval">
      <dl className="grid gap-5 sm:grid-cols-2">
        {pkg.approvedBy ? (
          <Field label="Approved by" value={pkg.approvedBy} />
        ) : null}
        {pkg.approvedAt ? (
          <Field label="Approved on" value={formatDate(pkg.approvedAt)} />
        ) : null}
      </dl>
    </Section>
  );
}

function DetailSkeleton() {
  return (
    <Shell>
      <p role="status" className="sr-only">
        Loading campaign
      </p>
      <div aria-hidden="true" className="space-y-8">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </Shell>
  );
}
