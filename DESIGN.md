---
name: Prohori Industrial Sentinel
colors:
  surface: '#f9f9f8'
  surface-dim: '#dadad9'
  surface-bright: '#f9f9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f3'
  surface-container: '#eeeeed'
  surface-container-high: '#e8e8e7'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#434654'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1f0'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#1b55d0'
  primary: '#003594'
  on-primary: '#ffffff'
  primary-container: '#004ac6'
  on-primary-container: '#b8c8ff'
  inverse-primary: '#b4c5ff'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfdf'
  on-secondary-container: '#636262'
  tertiary: '#353d52'
  on-tertiary: '#ffffff'
  tertiary-container: '#4c546a'
  on-tertiary-container: '#c1c9e3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c6'
  on-secondary-fixed: '#1c1b1c'
  on-secondary-fixed-variant: '#474647'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f9f9f8'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
  status-online: '#16A34A'
  status-warning: '#D97706'
  status-danger: '#DC2626'
  status-offline: '#9CA3AF'
  sidebar-bg: '#0F172A'
  chart-grid: '#F0F0EE'
  border-subtle: '#E5E7EB'
  surface-white: '#FFFFFF'
typography:
  display-data:
    fontFamily: JetBrains Mono
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  display-data-mobile:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  unit-label:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 80px
  container-padding: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  header-height: 72px
---

## Brand & Style
Prohori is a precision-oriented industrial monitoring platform designed for high-stakes environmental oversight. The brand personality is vigilant, authoritative, and technical, prioritizing data clarity and immediate situational awareness. 

The design style is **Corporate Modern with a Technical Edge**. It utilizes a systematic "Dashboard" aesthetic that balances professional reliability with developer-centric details (monospaced data, status indicators). The interface uses a deep-space sidebar contrast against a surgical light-mode canvas to create a clear "navigation vs. observation" mental model. Micro-interactions like pulse animations for active statuses and subtle hover-lifts on cards reinforce a sense of "live" system health.

## Colors
The palette is rooted in a high-contrast functional logic. The **Primary Blue (#004ac6)** is used for brand presence and interactive focal points. **Tertiary Navy (#0F172A)** provides a grounding "command center" feel for structural navigation elements.

Semantic colors are strictly reserved for environmental safety states:
- **Success/Online (#16A34A):** Optimal conditions and active connectivity.
- **Warning (#D97706):** Rising thresholds requiring attention; paired with a subtle pulse.
- **Danger (#DC2626):** Critical levels requiring immediate intervention.
- **Neutral/Offline (#9CA3AF):** Inactive or historical secondary data.

The background system utilizes a "Warm Grey" scale to reduce eye strain during prolonged monitoring, moving from `#f9f9f8` for the canvas to `#FFFFFF` for elevated data containers.

## Typography
The system uses a dual-font approach to separate narrative content from raw telemetry. 
- **Inter** is the primary typeface, chosen for its industrial neutrality and readability in UI controls and labels. It handles the hierarchy from bold headlines to high-density labels.
- **JetBrains Mono** is utilized exclusively for numerical readings and timestamped logs. This ensures that values align predictably in tables and provide a distinct "instrumentation" feel that separates data from interface.

Scale is used aggressively to emphasize critical metrics. "Display Data" roles should be large and bold, ensuring they are visible from a distance in a facility setting.

## Layout & Spacing
The layout follows a **Hybrid Sidebar-Canvas** model. 
- **Desktop:** A fixed 80px narrow sidebar anchors the left, with a 72px sticky header providing context. The main content uses a 12-column fluid grid within a 1600px max-width container. 
- **Mobile:** The sidebar reflows into a bottom navigation bar, while the header remains sticky at a reduced 64px height.

Spacing follows an 8px base rhythm. "Gutter" units (16px) separate grid items, while "Stack" units (8px/16px/32px) define vertical relationships within containers. Data density is medium-high, allowing for significant information visibility without clutter.

## Elevation & Depth
Depth is primarily conveyed through **Low-Contrast Outlines** and **Tonal Layering** rather than heavy shadows.
- **Base Level:** Background canvas (`#f9f9f8`).
- **Elevated Level:** Cards and containers use a white background (`#FFFFFF`) with a 1px solid border (`#D1D5DB`).
- **Interactive State:** On hover, cards lift slightly (`translate-y-[-4px]`) and gain a soft, neutral shadow to indicate clickability.
- **Indicator Layer:** High-priority cards use a 4px left-border accent to denote status, creating a clear vertical visual scan line.

## Shapes
The shape language is "Soft-Industrial." 
- **Standard Cards/Buttons:** Use a 0.5rem (8px) radius to maintain a modern, approachable feel without appearing overly consumer-oriented.
- **Status Pills:** Utilize a "full" (9999px) roundedness for high-visibility badges to distinguish them from structural data cards.
- **Inner Elements:** Small inputs and nested tags use a 0.25rem (4px) radius.

## Components
- **Metric Cards:** Features a semantic color bar on the left, a capitalized label, a large monospaced value, and a bottom-aligned trend indicator or status message.
- **Navigation Sidebar:** High-contrast dark background with icon-only links. Active states should use a low-opacity primary tint (`primary/20`).
- **Status Badges:** Small, pill-shaped containers with a leading "Live" pulse dot. Background should be a desaturated version of the status color.
- **Data Tables:** Clean, alternate-row striping using the background color. Headers use the `label-caps` style for clear categorization.
- **Charts:** Use a 2px stroke width for primary trend lines. Gridlines should be minimal and low-contrast (`#F0F0EE`).
- **Navigation Tabs:** Simple text with a 2px primary-colored underline for the active state; hover states should animate the underline from 0% to 100% width.