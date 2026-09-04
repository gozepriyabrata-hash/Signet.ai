import type {
  CommunicationPackage,
  EmailDraft,
  Preset,
  Project,
  Recipient,
  Report,
  Usage,
  VideoAsset,
} from "@/types";

/**
 * Seeded fixtures. Deterministic so screenshots and demos are stable across
 * reloads (docs/data-model.md). Seven projects spanning every `ProjectStatus`,
 * three of which carry a `CommunicationPackage` so `/campaigns` has a history
 * to show — two sent and one that failed at the send.
 *
 * Dates are fixed strings rather than computed from `Date.now()`: a relative
 * date would drift every reload and would be baked at build time in anything
 * prerendered.
 */

/**
 * A sent (or failed-to-send) package, for the campaigns history.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TWO CONSTRAINTS ON THIS DATA, both easy to break by adding "realistic" values.
 *
 * 1. **No external URLs.** `posterUrl` and `playbackUrl` are left undefined on
 *    purpose. specs/005 §3.10 forbids any third-party request from the campaign
 *    screens, and those two fields are the only ones a component would plausibly
 *    put straight into a `src`. A CDN poster here would fire exactly the request
 *    the rule bans, from the one screen holding a list of client identities.
 * 2. **A recipient's name never appears inside a subject line.** The PII tests
 *    assert that no recipient string reaches a list row or an href, and a
 *    subject containing "Fairweather" would let those assertions pass on a
 *    coincidental substring rather than on the behaviour they are checking.
 * ────────────────────────────────────────────────────────────────────────────
 */
function sentPackage(input: {
  id: string;
  projectId: string;
  status: "sent" | "failed";
  recipient: Recipient;
  subject: string;
  body: string;
  reportFileName: string;
  reportSizeBytes: number;
  approvedAt: string;
  sentAt: string;
  durationSec: number;
}): CommunicationPackage {
  const report: Report = {
    id: `rpt_${input.projectId.slice(4)}`,
    fileName: input.reportFileName,
    fileType: "pdf",
    sizeBytes: input.reportSizeBytes,
    uploadedAt: input.approvedAt,
    status: "parsed",
  };

  const video: VideoAsset = {
    id: `vid_${input.projectId.slice(4)}`,
    projectId: input.projectId,
    jobId: `job_${input.projectId.slice(4)}`,
    avatarId: "avt_default",
    voiceId: "voi_default",
    format: "landscape",
    captions: true,
    durationSec: input.durationSec,
  };

  const email: EmailDraft = {
    id: `eml_${input.projectId.slice(4)}`,
    projectId: input.projectId,
    subject: input.subject,
    greeting: `Hello ${input.recipient.name.split(" ")[0]},`,
    body: input.body,
    ctaId: "cta_book_meeting",
    signatureId: "sig_default",
    editedByUser: true,
  };

  return {
    id: input.id,
    projectId: input.projectId,
    recipient: input.recipient,
    email,
    video,
    reportAttachment: report,
    approvedAt: input.approvedAt,
    approvedBy: "Alex Warrender",
    sentAt: input.sentAt,
    status: input.status,
  };
}

const HALLOWAY_CONTACT: Recipient = {
  id: "rcp_halloway",
  name: "Eleanor Vance",
  role: "Trustee",
  company: "Halloway Trust",
  email: "e.vance@hallowaytrust.example",
  industry: "Charitable trusts",
  businessPriorities: ["capital preservation"],
  personalisation: "high",
};

const ARDENT_CONTACT: Recipient = {
  id: "rcp_ardent",
  name: "Tobias Renn",
  role: "Scheme Secretary",
  company: "Ardent",
  email: "t.renn@ardent.example",
  industry: "Pensions",
  businessPriorities: ["governance", "member outcomes"],
  personalisation: "medium",
};

const BRIGHTMERE_CONTACT: Recipient = {
  id: "rcp_brightmere",
  name: "Saoirse Mullan",
  role: "Finance Director",
  company: "Brightmere",
  email: "s.mullan@brightmere.example",
  industry: "Professional services",
  businessPriorities: ["cash flow"],
  personalisation: "low",
};

const NORTHGATE_CONTACT: Recipient = {
  id: "rcp_northgate",
  name: "Priya Raghunathan",
  role: "Head of Reward",
  company: "Northgate",
  email: "p.raghunathan@northgate.example",
  industry: "Manufacturing",
  businessPriorities: ["cost control", "retention"],
  personalisation: "high",
};

const ORRIN_CONTACT: Recipient = {
  id: "rcp_orrin",
  name: "Daniel Okonjo",
  role: "Portfolio Director",
  company: "Orrin Wealth",
  email: "d.okonjo@orrinwealth.example",
  industry: "Wealth management",
  businessPriorities: ["income stability"],
  personalisation: "medium",
};

const PEMBERTON_CONTACT: Recipient = {
  id: "rcp_pemberton",
  name: "Marguerite Dallow",
  role: "Operations Lead",
  company: "Pemberton",
  email: "m.dallow@pemberton.example",
  industry: "Private banking",
  businessPriorities: ["continuity of service"],
  personalisation: "low",
};

/**
 * A shipped project, condensed.
 *
 * The three hand-written entries below in SEED_PROJECTS carry full copy because
 * they are what `/campaigns` and its detail page are read against. These are
 * the send HISTORY — they exist so `/analytics` has a throughput curve, a
 * spread of times-to-send and a believable success rate, and writing twelve of
 * them longhand would bury the fixtures that matter.
 *
 * `createdAt` is derived from `sentAt` minus `hoursToSend`, so the median this
 * file produces is a real computation over varied inputs rather than one
 * literal repeated (specs/006 §7 called that out).
 */
function shipped(input: {
  n: number;
  name: string;
  contact: Recipient;
  subject: string;
  sentAt: string;
  hoursToSend: number;
  failed?: boolean;
}): Project {
  const id = `prj_h${String(input.n).padStart(2, "0")}`;
  const sent = new Date(input.sentAt);
  const createdAt = new Date(
    sent.getTime() - input.hoursToSend * 3_600_000,
  ).toISOString();
  const approvedAt = new Date(sent.getTime() - 8 * 60_000).toISOString();

  return {
    id,
    name: input.name,
    status: input.failed ? "failed" : "sent",
    createdAt,
    updatedAt: input.sentAt,
    package: sentPackage({
      id: `pkg_h${String(input.n).padStart(2, "0")}`,
      projectId: id,
      status: input.failed ? "failed" : "sent",
      recipient: input.contact,
      subject: input.subject,
      body: "A short walkthrough of what changed, and what it means for you. The full report is attached.",
      reportFileName: `${id}-report.pdf`,
      reportSizeBytes: 600_000 + input.n * 37_000,
      approvedAt,
      sentAt: input.sentAt,
      durationSec: 110 + input.n * 7,
    }),
  };
}

/**
 * Twelve weeks of sends, so every `AnalyticsRange` shows something real: a few
 * inside 7 days, more across 30, the rest out to 90.
 *
 * All ten succeeded. The only failed send in the whole fixture set is the
 * Pemberton project below, which gives 12 of 13 — a 92% success rate that reads
 * as a healthy product. That is deliberate: `MetricTiles` tints anything under
 * 90% with `--danger`, because a send failure rate above one in ten genuinely
 * is alarming for this product, and a seed set that trips the alarm teaches a
 * reviewer to ignore it.
 *
 * Subject lines never contain a recipient's personal name — the PII assertions
 * must not be able to pass on a coincidental substring.
 */
const SEND_HISTORY: readonly Project[] = [
  shipped({ n: 1, name: "Interim Valuation — Halloway Trust", contact: HALLOWAY_CONTACT, subject: "Your interim valuation, walked through", sentAt: "2026-06-12T10:05:00.000Z", hoursToSend: 26 }),
  shipped({ n: 2, name: "Scheme Governance Update — Ardent", contact: ARDENT_CONTACT, subject: "Three governance changes worth two minutes", sentAt: "2026-06-25T14:40:00.000Z", hoursToSend: 51 }),
  shipped({ n: 3, name: "Portfolio Drift Review — Halloway Trust", contact: HALLOWAY_CONTACT, subject: "Where the portfolio drifted this quarter", sentAt: "2026-07-08T09:15:00.000Z", hoursToSend: 19 }),
  shipped({ n: 4, name: "Contribution Analysis — Brightmere", contact: BRIGHTMERE_CONTACT, subject: "What drove returns this period", sentAt: "2026-07-21T16:02:00.000Z", hoursToSend: 73 }),
  shipped({ n: 5, name: "Annual Statement Walkthrough — Ardent", contact: ARDENT_CONTACT, subject: "Your annual statement, in plain terms", sentAt: "2026-07-30T11:28:00.000Z", hoursToSend: 34 }),
  shipped({ n: 6, name: "Liquidity Position — Brightmere", contact: BRIGHTMERE_CONTACT, subject: "A short note on liquidity", sentAt: "2026-08-06T13:55:00.000Z", hoursToSend: 12 }),
  shipped({ n: 7, name: "Fee Schedule Change — Halloway Trust", contact: HALLOWAY_CONTACT, subject: "What is changing on your fee schedule", sentAt: "2026-08-14T08:47:00.000Z", hoursToSend: 44 }),
  shipped({ n: 8, name: "Rebalancing Summary — Ardent", contact: ARDENT_CONTACT, subject: "This month's rebalancing, explained", sentAt: "2026-08-27T15:10:00.000Z", hoursToSend: 22 }),
  shipped({ n: 9, name: "Mandate Review — Brightmere", contact: BRIGHTMERE_CONTACT, subject: "Your mandate review is ready", sentAt: "2026-08-31T10:33:00.000Z", hoursToSend: 61 }),
  shipped({ n: 10, name: "Quarterly Commentary — Halloway Trust", contact: HALLOWAY_CONTACT, subject: "Quarterly commentary, recorded for you", sentAt: "2026-09-01T09:20:00.000Z", hoursToSend: 17 }),
];

export const SEED_PROJECTS: readonly Project[] = [
  {
    id: "prj_8f2a1c",
    name: "Q3 Portfolio Review — Meridian Capital",
    status: "ready_for_review",
    createdAt: "2026-08-28T09:12:00.000Z",
    updatedAt: "2026-08-29T14:03:00.000Z",
  },
  {
    id: "prj_3d7b90",
    name: "Annual Performance Report — Halden Group",
    status: "video_pending",
    createdAt: "2026-08-29T11:40:00.000Z",
    updatedAt: "2026-08-29T11:58:00.000Z",
  },
  {
    id: "prj_c14e6b",
    name: "Benefits Renewal Summary — Northgate",
    status: "sent",
    createdAt: "2026-08-21T08:05:00.000Z",
    updatedAt: "2026-08-22T16:20:00.000Z",
    package: sentPackage({
      id: "pkg_4c81de",
      projectId: "prj_c14e6b",
      status: "sent",
      recipient: NORTHGATE_CONTACT,
      subject: "Your benefits renewal, in three minutes",
      body: "I have pulled the renewal summary apart and recorded a short walkthrough of the three numbers that moved. The full report is attached if you would rather read it.",
      reportFileName: "northgate-benefits-renewal-2026.pdf",
      reportSizeBytes: 1_248_000,
      approvedAt: "2026-08-22T16:12:00.000Z",
      sentAt: "2026-08-22T16:20:00.000Z",
      durationSec: 168,
    }),
  },
  {
    id: "prj_5a90f2",
    name: "Risk Exposure Briefing — Calder & Vale",
    status: "analysing",
    createdAt: "2026-08-30T07:22:00.000Z",
    updatedAt: "2026-08-30T07:24:00.000Z",
  },
  {
    id: "prj_71bd48",
    name: "Fund Factsheet Commentary — Orrin Wealth",
    // Promoted from `email_pending` to `sent` so the campaigns history has more
    // than one success row to scan. The project statuses left mid-flight —
    // draft, analysing, video_pending — still cover the projects list.
    status: "sent",
    createdAt: "2026-08-27T13:10:00.000Z",
    updatedAt: "2026-08-28T09:47:00.000Z",
    package: sentPackage({
      id: "pkg_9f30ab",
      projectId: "prj_71bd48",
      status: "sent",
      recipient: ORRIN_CONTACT,
      subject: "What changed in the fund this quarter",
      body: "The factsheet reads the same as last quarter until you reach the allocation table. I have recorded a walkthrough of what moved and why it should not worry you.",
      reportFileName: "orrin-fund-factsheet-q3.pdf",
      reportSizeBytes: 862_000,
      approvedAt: "2026-08-28T09:41:00.000Z",
      sentAt: "2026-08-28T09:47:00.000Z",
      durationSec: 132,
    }),
  },
  {
    id: "prj_e2c507",
    name: "Client Onboarding Pack — Trellis Partners",
    status: "draft",
    createdAt: "2026-08-31T15:31:00.000Z",
    updatedAt: "2026-08-31T15:31:00.000Z",
  },
  {
    id: "prj_9ab3d1",
    name: "Custody Migration Notice — Pemberton",
    status: "failed",
    createdAt: "2026-08-26T10:02:00.000Z",
    updatedAt: "2026-08-26T10:19:00.000Z",
    // Failed at the SEND, not earlier: every step before it produced its
    // output. That is what makes `/projects/prj_9ab3d1` resume to Review rather
    // than to Report (lib/workflow.ts), and it is what the campaigns history's
    // failed row links back to — Review being the only place a send may be
    // retried from (CLAUDE.md rule 2, specs/005 §3.6).
    package: sentPackage({
      id: "pkg_2b57c9",
      projectId: "prj_9ab3d1",
      status: "failed",
      recipient: PEMBERTON_CONTACT,
      subject: "Your custody migration — what happens next",
      body: "Nothing needs doing at your end. I have recorded a two-minute explanation of the migration dates and what you will see change.",
      reportFileName: "pemberton-custody-migration.pdf",
      reportSizeBytes: 604_000,
      approvedAt: "2026-08-26T10:14:00.000Z",
      sentAt: "2026-08-26T10:19:00.000Z",
      durationSec: 121,
    }),
  },

  // Twelve weeks of finished work, so `/analytics` has a curve to draw and
  // `/campaigns` a history worth scrolling. Defined above rather than longhand.
  ...SEND_HISTORY,
];

/**
 * The dashboard's headline numbers. `activeProjects` is derived from the store
 * so it stays truthful as projects are created; the other two are seeded
 * counters the workflow will increment when it can actually generate and send.
 */
export const SEED_COUNTERS = {
  videosGenerated: 186,
  emailsSent: 142,
} as const;

/**
 * The presets every workflow dropdown reads from.
 *
 * They live here rather than in the workflow because `CLAUDE.md` rule 1 puts
 * configuration in Settings: a step *reads* these and can never write one. The
 * settings screens that will manage them do not exist yet (specs/008), so until
 * then this is the whole catalogue.
 *
 * No preset carries an external URL. `thumbnailUrl`, `previewUrl` and
 * `sampleUrl` are left unset rather than pointed at a CDN — nothing in this app
 * may make a third-party request.
 */
export const SEED_PRESETS: readonly Preset[] = [
  { id: "avt_default", kind: "avatar", name: "Priya — Executive", description: "Neutral studio background, seated.", isDefault: true, config: {} },
  { id: "avt_warm", kind: "avatar", name: "Daniel — Approachable", description: "Softer framing, standing.", isDefault: false, config: {} },

  { id: "voi_default", kind: "voice", name: "Priya Voice", description: "Measured, mid-register.", isDefault: true, config: {} },
  { id: "voi_warm", kind: "voice", name: "Daniel Voice", description: "Warmer, slightly faster.", isDefault: false, config: {} },

  { id: "sty_executive", kind: "scriptStyle", name: "Executive", description: "Short sentences, no preamble.", isDefault: true, config: {} },
  { id: "sty_explanatory", kind: "scriptStyle", name: "Explanatory", description: "Defines terms as it goes.", isDefault: false, config: {} },

  { id: "vt_standard", kind: "videoTemplate", name: "Standard", description: "Avatar left, captions bottom.", isDefault: true, config: {} },

  { id: "brand_default", kind: "branding", name: "House brand", description: "Applied automatically; not chosen per video.", isDefault: true, config: {} },

  { id: "cta_book_meeting", kind: "cta", name: "Book a Meeting", description: "Opens the scheduling page.", isDefault: true, config: {} },
  { id: "cta_reply", kind: "cta", name: "Reply to this email", description: "No link; invites a direct reply.", isDefault: false, config: {} },

  { id: "sig_default", kind: "signature", name: "Standard signature", isDefault: true, config: {} },

  { id: "seg_all", kind: "segment", name: "All clients", isDefault: true, config: {} },
];


/**
 * The saved-recipient store `/settings/recipients` manages, and the one
 * `docs/screens.md`'s Recipient step has promised a "Load from saved recipient"
 * control against since before the store existed.
 *
 * These are the same people the seeded packages went to, which is the point:
 * a saved recipient and a sent package's recipient are the same person seen
 * from two places. The package holds a COPY (`CommunicationPackage.recipient`
 * is a value, not a reference), so deleting one of these does not rewrite
 * history — specs/008 §3.4.
 */
export const SEED_RECIPIENTS: readonly Recipient[] = [
  NORTHGATE_CONTACT,
  ORRIN_CONTACT,
  PEMBERTON_CONTACT,
  HALLOWAY_CONTACT,
  ARDENT_CONTACT,
  BRIGHTMERE_CONTACT,
];

/**
 * What `/settings/usage` reports.
 *
 * Fixed rather than derived, and honestly so: quota and spend imply a billing
 * relationship and metered generation, neither of which exists (specs/008 §7).
 * The screen describes a system rather than configuring one, and these numbers
 * are what it describes until there is a system to read.
 */
export const SEED_USAGE: Usage = {
  periodStart: "2026-09-01T00:00:00.000Z",
  periodEnd: "2026-09-30T23:59:59.000Z",
  videosGenerated: 186,
  videoQuota: 250,
  emailsSent: 142,
  emailQuota: 500,
  // Minor units, so no floating-point money.
  spendMinorUnits: 24_180,
  currency: "GBP",
};
