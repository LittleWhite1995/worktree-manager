# UI/UX Redesign Design Spec

**Date:** 2026-05-09
**Branch:** ui-ux-redesign
**Scope:** Full UI/UX redesign for worktree-manager desktop + browser app

## Goals

- Professional, minimalist tool aesthetic (Linear/Raycast style)
- Clear visual hierarchy for information-dense developer tool
- Consistent design system with single accent color
- Mixed typography: sans-serif UI + monospace terminal/code
- Polished micro-interactions and state transitions

## Design System

### Color Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-base` | `#0A0A0F` | App background, sidebar |
| `bg-surface` | `#141419` | Cards, panels, modals |
| `bg-elevated` | `#1A1A22` | Hover states, dropdowns |
| `border` | `#1E1E26` | All borders |
| `text-primary` | `#E8E8ED` | Headings, body text |
| `text-secondary` | `#8B8B9E` | Descriptions, metadata |
| `text-muted` | `#55556A` | Hints, disabled text |
| `accent` | `#6366F1` | Primary actions, selected states |
| `accent-hover` | `#818CF8` | Accent hover state |
| `success` | `#10B981` | Clean/merged/connected |
| `warning` | `#F59E0B` | Uncommitted/unpushed |
| `error` | `#EF4444` | Destructive, errors |

### Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| UI body | Inter, -apple-system, sans-serif | 13px (text-sm) | 400 |
| UI headings | Inter | 14-16px (text-base/lg) | 500-600 |
| Monospace/code | Maple Mono NF CN | 13px (text-sm) | 400 |
| Badges/micro | Inter | 10-11px (text-[10px]/text-xs) | 500 |

### Spacing

- 4px grid system
- Card padding: 12px / 16px
- Section gap: 16px / 24px
- Card radius: 8px
- Button radius: 6px
- Badge radius: full (pill)

### Shadows

- Card hover: `0 4px 24px rgba(0,0,0,0.4)`
- Modal/dropdown: `0 8px 32px rgba(0,0,0,0.6)`
- Subtle: `0 1px 3px rgba(0,0,0,0.3)`

### Animation

- Duration: 150ms ease-out
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for spring-like feel
- Scale press: `scale(0.98)`
- Hover lift: `translateY(-1px)`

---

## Component Designs

### Sidebar

- Background: `bg-base` (#0A0A0F), no border-right
- Selected item: left 2px `accent` indicator bar + `bg-surface` background
- Hover: `bg-surface` background
- Worktree name: `text-sm font-medium text-primary`
- Branch name: `text-xs font-mono text-secondary`
- Project count badge: `text-[10px] bg-accent/10 text-accent`
- Bottom action bar: fixed, `bg-base` + top border `border`
- Scrollbar: hidden by default, show on hover

### Project Cards

- Background: `bg-surface` (#141419), `rounded-lg` (8px)
- Left border: 2px (success=emerald, warning=amber, syncing=accent)
- Project name: `text-sm font-medium text-primary`
- Branch info: `text-xs font-mono text-secondary`
- Status badges: pill shape, `text-[10px]`, 10% background of corresponding color
- Hover: `bg-elevated` + `translateY(-1px)` + shadow
- Grid: `grid grid-cols-1 sm:grid-cols-2 gap-3`

### Git Operations

- Buttons: unified ghost style with icon + text
- Primary actions (push/pull/fetch): `bg-accent text-white`
- Destructive actions (reset): `text-error`
- Button group: compact, `gap-1`
- Status line: `text-xs text-secondary`
- Progress bar: `bg-accent` gradient animation

### Terminal Panel

- Header: `bg-base`, seamless with main area
- Tabs: `text-xs`, selected = `text-primary` + bottom accent underline, unselected = `text-muted`
- Close button: show on hover only, `text-xs`
- Resize handle: 1px `border`, cursor `col-resize`, show accent on hover
- Collapsed state: 32px header bar only

### Modals/Dialogs

- Overlay: `bg-black/60 backdrop-blur-xl`
- Content: `bg-surface` + 1px `border` + `rounded-lg`
- Title: `text-base font-medium text-primary`
- Body: `text-sm text-secondary`
- Primary button: `bg-accent text-white`
- Secondary button: ghost style
- Animation: `scale(0.96) → scale(1)` + fade, 150ms

### Toasts

- Position: bottom-right
- Background: `bg-surface` + 1px `border`
- Left color bar: 3px (success/warning/error corresponding color)
- Text: `text-sm text-primary`
- Auto-dismiss: success 5s, error 8s
- Animation: slide-in-from-bottom

### Context Menus

- Background: `bg-surface` + `backdrop-blur`
- Border: 1px `border`
- Items: `text-sm`, hover = `bg-elevated`
- Separators: 1px `border`
- Icons: `text-muted`, hover = `text-primary`

### Welcome View

- Centered layout
- App icon: subtle gradient or single accent color
- Title: `text-2xl font-semibold text-primary`
- Subtitle: `text-sm text-secondary`
- CTA buttons: primary accent + ghost secondary

### Settings View

- Section headers: `text-sm font-medium text-primary` + bottom border
- Form labels: `text-sm text-secondary`
- Inputs: `bg-surface` + `border` + `rounded-md`
- Toggles: accent color when active
- Selects: match input style

---

## Interaction Patterns

### Animations

| Element | Animation | Duration |
|---------|-----------|----------|
| Modal open | scale(0.96→1) + fade | 150ms |
| Toast enter | slide-in-from-bottom | 150ms |
| Sidebar select | indicator bar slide-in | 150ms |
| Card hover | translateY(-1px) + shadow | 150ms |
| Button press | scale(0.98) | 100ms |
| Expand/collapse | height transition | 200ms |

### State Feedback

- **Loading:** Skeleton screens or indigo spinner
- **Success:** Toast + green checkmark icon
- **Error:** Toast + red warning icon
- **Warning:** Toast + amber icon
- **Empty state:** Minimal icon + description text

### Keyboard

- Shortcut hints: `text-[10px] text-muted` pill
- Key press visual: background brightens
- Focus ring: `2px accent/40` outline

### Micro-interactions

- Copy success: checkmark icon + green flash
- Expand/collapse: smooth height transition
- Drag divider: real-time preview + cursor change
- Button hover: subtle background shift

---

## File Changes Estimate

| Category | Files | Scope |
|----------|-------|-------|
| Design tokens | 1 new | `src/design-tokens.ts` |
| Global CSS | 1 | `src/index.css` |
| UI primitives | 11 | `src/components/ui/*` |
| Domain components | ~10 | Sidebar, Detail, GitOps, Terminal, Modals, etc. |
| Welcome/Settings | 2 | WelcomeView, SettingsView |
| Icons | 1 | Icons.tsx (if needed) |
| **Total** | **~25 files** | |

---

## Implementation Order

1. Create `design-tokens.ts` with all color/spacing/typography tokens
2. Update `index.css` with new global styles, font imports, scrollbar, animations
3. Update all `ui/*` primitives to use new tokens
4. Update Sidebar component
5. Update Project cards / WorktreeDetail
6. Update GitOperations panel
7. Update Terminal panel
8. Update all Modals (Create, Archive, Add, etc.)
9. Update Toast system
10. Update Context menus
11. Update WelcomeView
12. Update SettingsView
13. Final pass: consistency check across all components

---

## Success Criteria

- All slate-* colors replaced with new token system
- Inter font used for all UI text, Maple Mono only for terminal/code
- Consistent 4px grid spacing throughout
- All hover/active/focus states use new animation system
- No visual regressions in functionality
- Build passes without errors
