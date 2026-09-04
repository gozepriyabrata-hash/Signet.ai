# Design System

**Direction: dark, engineering-confident developer-platform software.** A
near-black canvas, bone-white as the action colour, thin display type at large
scale, pill-shaped CTAs, and colour that comes from product chrome rather than
from brand paint.

The single sin that would ruin this product is looking like a generic admin
dashboard. The second is looking loud. Brand voltage here comes from
**typographic scale and restraint** — a hairline-weight headline on a dark field
— not from saturated accents.

---

## 1. Colour tokens

Source-of-truth hexes, expressed in OKLCH for Tailwind v4. Dark is the
designed-for and default page mode.

### Surfaces

| Token | Role | Dark | Light |
|---|---|---|---|
| `--background` | the universal page floor | `#151515` | `#F7F8F4` |
| `--surface` | feature cards, badge pills | `#242424` | `#FFFFFF` |
| `--surface-raised` | nested panels, popovers | `#2E2F2D` | `#FFFFFF` |
| `--surface-invert` | the scarce light inversion | `#F7F8F4` | `#151515` |
| `--border` | hairlines, dividers | `#333331` | `#E2E3DD` |

### Text

| Token | Role | Dark | Light |
|---|---|---|---|
| `--foreground` | headlines, bright text | `#E9EBDF` | `#151515` |
| `--body-foreground` | running body copy | `#CBCCC4` | `#3A3B38` |
| `--muted-foreground` | captions, logo walls, fine print | `#8B867F` | `#6B6760` |
| `--on-invert` | text on the light inversion | `#151515` | `#E9EBDF` |

`--foreground` is a warm **bone-white**, never pure `#FFFFFF`. Pure white is
reserved for icons sitting on a filled accent.

### Action

| Token | Role | Dark | Light |
|---|---|---|---|
| `--primary` | the main forward action | `#E9EBDF` | `#151515` |
| `--primary-foreground` | text on primary | `#151515` | `#E9EBDF` |
| `--accent` | **AI actions only** | `#518DD2` | `#3F72AD` |
| `--accent-foreground` | text on accent | `#151515` | `#FFFFFF` |

### Job state

| Token | Role | Dark | Light |
|---|---|---|---|
| `--success` | job succeeded | `#6FBF9B` | `#2F7D5C` |
| `--warning` | needs attention | `#D9A441` | `#96650F` |
| `--danger` | job failed, destructive | `#E2566F` | `#B31F38` |

### Artwork-only pastels

`#B0CCEA` blue · `#D0C1EA` violet · `#F6D6A0` amber · `#F5C2B2` coral ·
`#AFD1C6` green · `#E8BAE8` pink.

These live **inside illustration and rendered product chrome only** — never on a
button, never on type, never as a surface. They are exported as tokens so
artwork containers can reference them, and for no other reason.

### Paste-ready `app/globals.css`

```css
@import "tailwindcss";
@custom-variant light (&:is(.light *));

:root {
  --background:         oklch(0.196 0.000 90);
  --surface:            oklch(0.260 0.000 90);
  --surface-raised:     oklch(0.303 0.004 129);
  --surface-invert:     oklch(0.977 0.005 118);
  --border:             oklch(0.320 0.003 107);

  --foreground:         oklch(0.935 0.016 114);
  --body-foreground:    oklch(0.842 0.011 112);
  --muted-foreground:   oklch(0.622 0.012 77);
  --on-invert:          oklch(0.196 0.000 90);

  --primary:            oklch(0.935 0.016 114);
  --primary-foreground: oklch(0.196 0.000 90);
  --accent:             oklch(0.634 0.122 253);
  --accent-foreground:  oklch(0.196 0.000 90);

  --success:            oklch(0.743 0.096 164);
  --warning:            oklch(0.751 0.130 80);
  --danger:             oklch(0.643 0.174 13);

  --pastel-blue:        oklch(0.834 0.052 250);
  --pastel-violet:      oklch(0.836 0.059 302);
  --pastel-amber:       oklch(0.890 0.078 81);
  --pastel-coral:       oklch(0.855 0.063 38);
  --pastel-green:       oklch(0.833 0.039 174);
  --pastel-pink:        oklch(0.844 0.080 326);

  --radius: 0.25rem;
}

.light {
  --background:         oklch(0.977 0.005 118);
  --surface:            oklch(1 0 0);
  --surface-raised:     oklch(1 0 0);
  --surface-invert:     oklch(0.196 0.000 90);
  --border:             oklch(0.913 0.008 114);

  --foreground:         oklch(0.196 0.000 90);
  --body-foreground:    oklch(0.350 0.005 122);
  --muted-foreground:   oklch(0.515 0.012 82);
  --on-invert:          oklch(0.935 0.016 114);

  --primary:            oklch(0.196 0.000 90);
  --primary-foreground: oklch(0.935 0.016 114);
  --accent:             oklch(0.544 0.108 253);
  --accent-foreground:  oklch(1 0 0);

  --success:            oklch(0.532 0.093 162);
  --warning:            oklch(0.546 0.111 74);
  --danger:             oklch(0.500 0.181 19);
}

@theme inline {
  --color-background:         var(--background);
  --color-surface:            var(--surface);
  --color-surface-raised:     var(--surface-raised);
  --color-surface-invert:     var(--surface-invert);
  --color-border:             var(--border);
  --color-foreground:         var(--foreground);
  --color-body-foreground:    var(--body-foreground);
  --color-muted-foreground:   var(--muted-foreground);
  --color-on-invert:          var(--on-invert);
  --color-primary:            var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-accent:             var(--accent);
  --color-accent-foreground:  var(--accent-foreground);
  --color-success:            var(--success);
  --color-warning:            var(--warning);
  --color-danger:             var(--danger);

  --radius-xs:   4px;
  --radius-sm:   6px;
  --radius-md:   8px;
  --radius-lg:   20px;
  --radius-xl:   24px;
  --radius-2xl:  36px;
  --radius-3xl:  40px;
  --radius-full: 9999px;

  --font-display: "Saans", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-sans:    "Saans", "Inter", ui-sans-serif, system-ui, sans-serif;

  --shadow-hairline: 0 1px 2px oklch(0 0 0 / 0.12);
  --shadow-float:    0 68px 116px oklch(0 0 0 / 0.35);
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-body-foreground antialiased; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

> Tailwind v4 has **no** `tailwind.config.js`. If you find yourself creating one,
> stop — the token lives in `@theme` above instead.

### Action discipline — the most important rule here

There are **two** action colours and they mean different things. Confusing them
is the fastest way to make this look like every other AI product.

**`--primary` (bone-white) means "move forward."** The main CTA on a screen —
Next, Start, Save, Approve & Send. It works by inverting the page: a bone-white
pill on a near-black field is the loudest thing available without using colour
at all. One per screen.

**`--accent` (blue) means "AI is doing something, or is about to."** Generate
and Regenerate, the job progress fill, the active stepper node, "AI suggested"
badges. Never on navigation, tabs, links or decoration.

Everything else is neutral: `--surface` with a `--border` hairline.

Semantic colours are reserved for job outcomes. A green tick means a job
succeeded — not "this thing is good".

**Never tint the primary CTA.** The action layer is monochrome bone-on-dark.
A blue Next button is off-brand here in a way that is hard to un-see.

### Contrast — two measured traps

Rule 10 sets a 4.5:1 floor. Two combinations from the source palette fail it:

- **`--muted-foreground` on `--surface` is 4.30:1.** Muted text is legible on
  `--background` (5.06:1) but **not** on an elevated card. Inside a `--surface`
  card, secondary text steps up to `--body-foreground`.
- **White on `--accent` is 3.45:1.** This is why `--accent-foreground` is
  near-black, not white. White is fine for an *icon* on accent (icons need 3:1),
  which is exactly the circular send-button case — and nothing else.

---

## 2. Typography

**Saans** is the brand face. It is a commercial typeface and is not
redistributable, so the stack degrades to **Inter**, then the system sans.
One family throughout, including buttons — never mix.

The character of the system is **thin and large**. Display type is weight 300,
not the conventional 600–700. This is the whole identity: precise and calm
rather than loud.

| Use | Size | Weight | Tracking | Classes |
|---|---|---|---|---|
| Hero / section display | 72px | 300 | -0.022em | `text-[4.5rem] font-light tracking-[-0.022em] leading-[1.05]` |
| Page title | 40px | 300 | -0.02em | `text-4xl font-light tracking-tight` |
| Section heading | 24px | 380 → 400 | -0.01em | `text-2xl font-normal tracking-tight` |
| Card title | 16px | 400 | normal | `text-base font-normal` |
| Body | 14px | 300 | +0.01em | `text-sm font-light leading-relaxed tracking-[0.01em]` |
| Secondary / helper | 14px | 300 | +0.01em | `text-sm font-light text-muted-foreground` |
| Metric numerals | 48px | 300 | -0.02em | `text-5xl font-light tabular-nums tracking-tight` |

**Principles**

- **Never thicken a display headline to bold.** Thin-at-scale is the brand; a
  bold hero reads as a different company. When something needs more emphasis,
  make it **bigger and thinner**, not heavier.
- **The two-tone headline** is a recurring device: first line in `--foreground`,
  second line in `--body-foreground`. Use it to split a two-clause message. It
  is the one piece of typographic decoration allowed.
- Body copy is small (14px) and light (300) with slight positive tracking — that
  combination is what keeps dense copy open on a dark field. Do not compensate
  by going heavier.
- The source measures an intermediate **weight 380** on sub-headings. Preserve
  it on a variable instance; round to 400 on Inter.
- Never go below 14px. Body copy caps at roughly 72 characters per line.

---

## 3. Spacing, radius, elevation

**Spacing** — 4px base. `4 · 8 · 12 · 16 · 24 · 40 · 64`. Page gutter
`px-6 lg:px-8`, card padding `p-6` (24px), `space-y-10` (40px) between sections,
`space-y-2` inside a field group.

Macro-scale calm, micro-scale efficiency: generous vertical air around display
type — the thinness needs surrounding space to read as deliberate rather than
sparse — and tight 16–24px padding inside dense content.

**Radius is bimodal, and mixing the two modes is the giveaway of a bad build.**

| Scale | Value | Use |
|---|---|---|
| `rounded-xs` → `rounded-md` | 4–8px | **Dense content.** Cards, panels, inputs, tables, dropdown items. |
| `rounded-lg` → `rounded-3xl` | 20–40px | **Floated and artwork containers only.** The inverted prompt surface, illustration frames. |
| `rounded-full` | 9999px | **Every pill button and circular control.** The signature interactive shape. |

A workspace card is 4px. It is never 20px. Large radii on dense content is the
single most common way this system gets diluted.

**Elevation is mostly nothing.**

| Level | Treatment | Use |
|---|---|---|
| Flat | no shadow, no border, on `--background` | Body sections, nav, logo walls, most of the app |
| Hairline | `border border-border` | Cards that need separation from the canvas |
| Ring | `ring-1 ring-accent/25` | The focused or active card |
| Float | `--shadow-float` (`0 68px 116px / 0.35`) | **The inverted light surface only.** One per screen, at most. |

The signature depth moment is a single enormous soft drop under the one light
surface, making it hover well above the near-black page. Everywhere else,
shadows read as dirt on a dark canvas — use a border, or nothing. No
glassmorphism and no neumorphism in the chrome; the illustration may render
literal glass, but that is imagery, not a token.

---

## 4. Motion

Framer Motion. Short, consistent, purposeful.

| Interaction | Duration | Easing |
|---|---|---|
| Hover / press feedback | 150ms | `easeOut` |
| Panel or field reveal | 200ms | `easeOut` |
| Workflow step transition | 250ms | `easeOut` in, `easeIn` out |
| Dialog | 200ms | `easeOut` |

- **Step transitions** move horizontally only — outgoing fades and shifts `-8px`,
  incoming fades in from `+8px`. Vertical motion reads as a page load, not as
  forward progress through a workflow.
- **The generation pulse** is the one shared signature animation: scale
  `[1, 1.03, 1]` with an accent glow at `opacity [0.4, 0.8, 0.4]`, 2s,
  `repeat: Infinity`, `easeInOut`. Used on `JobProgressCard` and the video
  preview placeholder while `status === "running"`. Nowhere else.
- Animate `transform` and `opacity` only — never `width`, `height`, `top`, `left`.
- Under `prefers-reduced-motion`, drop every transform and keep opacity only.

---

## 5. Component contracts

Build these once in `components/workflow/` and `components/shared/`, then reuse.
The props listed are the required surface.

### `WorkflowStepper`
`steps`, `current`, `completed`, `onNavigate(id)`.

Horizontal, pinned to the top of the workflow shell. Completed nodes are filled
neutral with a tick; the current node carries an **accent** ring; future nodes
are hollow outlines. **Only completed steps are clickable** — never let a user
jump past an unmet dependency. Renders as `<nav aria-label="Workflow progress">`
wrapping an ordered list; the current node carries `aria-current="step"`.

### `StepShell`
`title`, `description?`, `children`, `onBack?`, `onNext?`, `nextLabel?`,
`nextDisabled?`, `isSubmitting?`.

The outer frame every workflow step renders inside. Guarantees an identical
title block, max-width and sticky footer. Back is a ghost pill on the left;
Next is a **bone-white `--primary` pill** on the right — both `rounded-full`.
Individual steps never render their own footer buttons.

### `JobProgressCard`
`job`, `label`, `onRetry?`, `onCancel?`.

The canonical long-running-AI surface. `rounded-xs`, `bg-surface`, hairline
border. Shows a stage label, a determinate bar driven by `job.progress`, and
elapsed time.

- `running` — accent bar plus the generation pulse.
- `succeeded` — success tick, collapses to a one-line summary.
- `failed` — danger border, the error message, and a **Retry button inside the
  card**. A failed generation must never become a dead end or a full-page error.

Status text is wrapped in `aria-live="polite"` so screen readers hear progress.

### `AIEditableField`
`value`, `onChange`, `label`, `variant` (`input` | `textarea` | `list`),
`onRegenerate?`, `isRegenerating?`, `aiGenerated?`.

Rule 4 of `CLAUDE.md` made concrete. Renders a real editable control, an
"AI generated" badge (`rounded-full`, `bg-surface`) that disappears the moment
the user edits — they own it now — and a small accent Regenerate action in the
label row. **Every** AI-produced string in the app goes through this component.

### `PreviewPane`
`children`, `device?` (`desktop` | `mobile`), `title?`.

The right-hand live preview used by Email Composer and Review. This is the
system's one sanctioned **light inversion**: `bg-surface-invert`,
`text-on-invert`, `rounded-xl`, lifted with `--shadow-float`. It is
non-interactive and unmistakably a preview rather than a second editor — and
because an email preview is genuinely a light document, the inversion is honest
rather than decorative.

### `EmptyState`
`icon`, `title`, `description`, `action?`.

Centred, muted, exactly one primary action as a bone-white pill. Used for the
zero-project dashboard, no recipients, and no analytics data.

### `StatCard`
`label`, `value`, `delta?`, `href?`.

Dashboard metric tile. Large thin tabular numeral with a muted label above.
`rounded-xs`, flat or hairline. No sparkline unless the data is real, and no
gradients.

---

## 6. Anti-patterns

- **A bold display headline.** Thin at scale is the identity.
- **A tinted primary CTA.** The action layer is bone-on-dark, monochrome.
- **Pastels on type, buttons or surfaces.** They belong inside artwork only.
- **Large radii on dense content cards.** 4px, not 20px.
- **Light surfaces beyond the one sanctioned inversion.** Scarcity is what makes
  it land.
- **Colour customer logos.** Logo walls stay uniformly `--muted-foreground`.
- Gradient hero cards, glassmorphism, neon borders. This is a work tool.
- Indeterminate spinners for anything slower than a second — use `JobProgressCard`.
- Stacked modals. A dialog never opens another dialog.
- Toasts for anything the user must act on. Toasts confirm; they do not ask.
- Read-only rendering of AI output.
- Icon-only buttons without an accessible label.
- Layout shift when async content lands — skeletons match final dimensions.

---

## 7. Departures from the source, and known gaps

This system is derived from a capture of Retool's marketing surface. Four
deliberate departures were needed to keep it usable as a product system:

1. **Light mode is retained.** The source has no light page mode. It is kept
   here because `docs/screens.md` specifies a theme switch in the app shell, and
   because a dark-only workspace is an accessibility position we have not
   decided to take. Dark remains the designed-for default; the light palette is
   derived, and every value in it was contrast-checked.
2. **A second action colour exists.** The source's action layer is monochrome
   bone-white, with blue appearing only on the AI send control. Rule 6 of
   `CLAUDE.md` requires an accent that means "AI is acting", so blue is promoted
   to `--accent` and given that single job. Bone-white keeps the forward action.
3. **Buttons use the brand face.** The source sets button labels in a separate
   `ui-sans-serif` stack. Mixing families for one role is not worth the cost;
   one family throughout.
4. **Hover states are documented.** The source explicitly scopes them out. A web
   workspace needs hover and focus affordances, and rule 10 requires visible
   focus rings regardless.

**Known gaps — measure these against the live design before trusting them:**

- **Pill geometry.** The source measured `padding: 0` on the primary button, so
  height and horizontal padding are estimates (~12px × 24px). Confirm before
  building the button primitive.
- **`--border` is derived, not measured.** The source documents flat and
  hairline-ring elevation but no border token.
- **Job-state colours are derived.** The source palette has no success or
  warning semantics, and its red (`#C72844`) is only 3.32:1 on the canvas —
  usable as a border, not as error text. `--danger` is lifted to `#E2566F`
  (5.04:1) so failure messages meet the floor.
- **Disabled and pressed states are unmeasured.** Only the default primary fill
  is confirmed.
- **Focus-ring colour is unspecified** by the source. Until decided, use
  `ring-2 ring-accent ring-offset-2 ring-offset-background`.
- Announcement-bar and hero gradients are imagery, not tokens; their stops are
  out of scope.
