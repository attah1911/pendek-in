# Design System
## URL Shortener + Analytics Dashboard

---

## Visual Direction

**Concept: "Precision Tool"**

This is a developer-adjacent utility — not a marketing site, not a social app. The visual language borrows from high-end developer tooling and data terminals: monospace accents, tight information density, and a palette that reads like a calibrated instrument rather than a startup landing page. The signature element is a monospace short-code display that treats the output URL like a piece of data worth seeing clearly — not a styled pill or button, but a readable artifact.

The design avoids: rounded cards with drop shadows, gradient hero backgrounds, emoji-as-decoration, and the warm-cream-plus-serif look common in AI-generated UIs.

---

## Color Tokens

```css
/* Base */
--color-bg:           #0C0C0E;   /* near-black, slightly warm */
--color-surface:      #141416;   /* card backgrounds */
--color-surface-2:    #1C1C1F;   /* input backgrounds, table rows */
--color-border:       #2A2A2F;   /* subtle borders */
--color-border-focus: #4A4A55;   /* focused inputs */

/* Text */
--color-text-primary:   #EAEAEC;  /* headings, labels */
--color-text-secondary: #8A8A96;  /* meta info, placeholders */
--color-text-muted:     #55555F;  /* timestamps, disabled */

/* Accent — single, used with restraint */
--color-accent:         #6E6BF0;  /* indigo-violet: active states, CTAs */
--color-accent-dim:     #6E6BF014;/* accent with low opacity for backgrounds */
--color-accent-hover:   #8A87F5;

/* Semantic */
--color-success:        #2ECC71;
--color-warning:        #F0A500;
--color-danger:         #E05252;
--color-danger-dim:     #E0525214;
```

**Why this palette:** Near-black base avoids the harsh pure-black of "dark mode template" UIs. Indigo-violet accent reads as technical/precise without defaulting to acid-green or vermilion (the two AI default dark-mode accents). Single accent discipline means every colored element earns its emphasis.

---

## Typography

```css
/* Display / Headings */
--font-display: 'DM Sans', system-ui, sans-serif;

/* Body / UI */
--font-body: 'Inter', system-ui, sans-serif;

/* Data / Code (signature element) */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

**Scale (rem, base 16px):**

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-xs` | 0.75rem | 400 | Timestamps, captions |
| `text-sm` | 0.875rem | 400 | Table cells, secondary info |
| `text-base` | 1rem | 400 | Body, labels |
| `text-lg` | 1.125rem | 500 | Section headings |
| `text-xl` | 1.25rem | 600 | Card titles |
| `text-2xl` | 1.5rem | 600 | Page headings |
| `text-3xl` | 1.875rem | 700 | Hero stat numbers |

Monospace font used exclusively for: short codes, URL display, code snippets. This is the signature — when a shortened URL appears, it looks like data, not decoration.

---

## Spacing & Layout

```
Base unit: 4px

--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

**Border radius:**
```
--radius-sm:   4px   (inputs, badges)
--radius-md:   6px   (cards, buttons)
--radius-lg:   8px   (modals)
--radius-none: 0     (table rows, full-width elements)
```

Minimal radius — deliberately not "rounded-xl pill" style that reads as generic SaaS.

---

## Component Specs

### Short Code Display (Signature Element)

The output after shortening. This is the primary "moment" of the product.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   shrtn.io/abc123                        [Copy]     │
│   ─────────────────                                 │
│   monospace, text-lg, accent color                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Font: `--font-mono`, `--color-accent`
- Background: `--color-accent-dim`
- Border-left: 2px solid `--color-accent`
- Copy button: icon only (Lucide `Copy`), transitions to `Check` on success
- No border-radius on the container — left-border accent only

### Button

```
Primary:   bg accent, text white, hover accent-hover
Secondary: bg surface-2, text primary, border border, hover border-focus
Danger:    bg danger-dim, text danger, hover danger with 20% opacity bg
Ghost:     transparent, text secondary, hover text primary
```

All buttons: `--radius-md`, `text-sm`, `font-weight: 500`, `height: 36px`

### Input / Textarea

```
bg: --color-surface-2
border: 1px solid --color-border
border-radius: --radius-sm
padding: 8px 12px
font-size: text-sm
color: --color-text-primary
placeholder: --color-text-muted

focus:
  border-color: --color-accent
  outline: none
  box-shadow: 0 0 0 3px var(--color-accent-dim)
```

### Table

```
thead:
  bg: --color-surface
  text: --color-text-secondary
  text-transform: uppercase
  letter-spacing: 0.06em
  font-size: text-xs
  border-bottom: 1px solid --color-border

tbody tr:
  border-bottom: 1px solid --color-border
  hover: bg --color-surface-2

td:
  padding: 12px 16px
  font-size: text-sm
```

No outer card border on tables — the rows carry the structure.

### Badge / Status

```
Active:      text success, bg #2ECC7114, border 1px success with 30% opacity
Inactive:    text muted, bg surface-2, border border
Expired:     text warning, bg #F0A50014, border warning
Banned:      text danger, bg danger-dim, border danger
```

Font: `text-xs`, `font-mono`, `letter-spacing: 0.05em`, `--radius-sm`

### Stat Card

```
┌──────────────────────┐
│  TOTAL CLICKS        │  ← text-xs, uppercase, text-secondary
│                      │
│  128,432             │  ← text-3xl, font-display, text-primary
│  +12% this week      │  ← text-xs, text success or danger
└──────────────────────┘
```

Background: `--color-surface`, border: `1px solid --color-border`, `--radius-md`

---

## Page Layouts

### Landing (Guest)

```
┌────────────────────────────────────────────────────────┐
│  NAVBAR: logo left, Login / Register right             │
├────────────────────────────────────────────────────────┤
│                                                        │
│  [HERO — centered, max-width 640px, vertically middle] │
│                                                        │
│    Shorten anything.                                   │
│    ──────────────────                                  │
│    One clean link. Real analytics.                     │
│                                                        │
│    ┌─────────────────────────────────┐ [Shorten]       │
│    │  https://your-long-url.com/...  │                 │
│    └─────────────────────────────────┘                 │
│                                                        │
│    [result appears below on success]                   │
│    shrtn.io/abc123          [Copy]                     │
│                                                        │
│    5 free shortens per day · Sign up for more          │
│                                                        │
├────────────────────────────────────────────────────────┤
│  FOOTER: minimal, just links + copyright               │
└────────────────────────────────────────────────────────┘
```

### Dashboard (User)

```
┌──────────────┬─────────────────────────────────────────┐
│              │  TOPBAR: breadcrumb + user menu          │
│  SIDEBAR     ├─────────────────────────────────────────┤
│              │                                         │
│  Dashboard   │  [Stat Cards Row]                       │
│  My Links    │  Total URLs | Total Clicks | Best Link  │
│  Settings    │                                         │
│              │  [Shorten Form — inline, compact]        │
│              │                                         │
│              │  [URL Table]                            │
│              │  short code | original | clicks | date  │
│              │  [→ row action: Analytics / Delete]     │
│              │                                         │
└──────────────┴─────────────────────────────────────────┘
```

### Analytics Detail

```
┌──────────────┬─────────────────────────────────────────┐
│  SIDEBAR     │  ← back to Dashboard                    │
│              ├─────────────────────────────────────────┤
│              │  shrtn.io/abc123                         │
│              │  → https://original-url.com/...          │
│              │                                         │
│              │  [Click Trend Chart — full width]        │
│              │  Line chart, last 30 days                │
│              │                                         │
│              │  [Referrers]        [Device Split]       │
│              │  Horizontal bars    Donut/pie minimal    │
│              │                                         │
└──────────────┴─────────────────────────────────────────┘
```

---

## Motion

- Page transitions: none (instant, clean — motion is not the point here)
- Copy button: icon swap (Copy → Check), 1.5s then revert, no animation
- Chart: Recharts default enter animation, kept subtle
- Table row hover: `transition: background 120ms ease`
- Input focus ring: `transition: box-shadow 100ms ease`

Less is more. This is a tool, not a landing page.

---

## Icon Usage

Library: **Lucide React**

| Context | Icon |
|---------|------|
| Copy short URL | `Copy` → `Check` |
| Delete URL | `Trash2` |
| View analytics | `BarChart2` |
| External link | `ExternalLink` |
| Dashboard | `LayoutDashboard` |
| Links list | `Link2` |
| Admin users | `Users` |
| Admin links | `Database` |
| Settings | `Settings` |
| Logout | `LogOut` |
| Warning/ban | `ShieldOff` |

No emoji anywhere. Icons are 16px in table actions, 18px in sidebar nav, 20px in empty states.

---

## Empty States

Minimal, directive. No illustration, no emoji.

```
No links yet.
─────────────
Shorten your first URL above.
```

Text: `text-sm`, `--color-text-secondary`, centered in the table body area.

---

## Responsive

- Sidebar collapses to bottom tab bar on mobile (max-width: 768px)
- Stat cards: 3-col grid → 1-col stack on mobile
- Tables: horizontal scroll on mobile (no data truncation)
- Landing hero: full-width input on mobile
