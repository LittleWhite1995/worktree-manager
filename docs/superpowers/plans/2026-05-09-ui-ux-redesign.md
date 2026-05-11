# UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the UI from generic slate-themed to a polished Linear/Raycast-style minimalist tool aesthetic with clear visual hierarchy.

**Architecture:** Create a design token system (`src/design-tokens.ts`), update global CSS (`src/index.css`), then systematically restyle all UI primitives and domain components to use the new token system. All slate-* colors replaced with semantic tokens. Inter font for UI, Maple Mono stays for terminal/code only.

**Tech Stack:** Tailwind CSS v4, shadcn/ui (Radix), class-variance-authority, React 19

---

## File Map

### Create
- `src/design-tokens.ts` — centralized color/spacing/typography/shadow tokens as Tailwind-compatible values

### Modify (UI Primitives — 10 files)
- `src/components/ui/button.tsx` — new variant colors, Inter font, refined hover/active states
- `src/components/ui/badge.tsx` — semantic color variants, pill shape
- `src/components/ui/card.tsx` — new surface colors, refined borders
- `src/components/ui/dialog.tsx` — new overlay/content colors, Inter font
- `src/components/ui/dropdown-menu.tsx` — new surface/hover colors
- `src/components/ui/input.tsx` — new border/bg colors, focus ring
- `src/components/ui/popover.tsx` — new surface colors
- `src/components/ui/select.tsx` — new surface/hover/focus colors
- `src/components/ui/tooltip.tsx` — new tooltip surface color
- `src/components/ui/checkbox.tsx` — accent color checkbox

### Modify (Global — 2 files)
- `src/index.css` — Inter font import, new CSS custom properties, scrollbar/animation updates
- `tailwind.config.ts` or `src/index.css` — extend theme with design tokens

### Modify (Domain Components — ~15 files)
- `src/components/WelcomeView.tsx`
- `src/components/worktree-sidebar/ExpandedSidebar.tsx`
- `src/components/worktree-sidebar/CollapsedSidebar.tsx`
- `src/components/worktree-sidebar/SortableWorktreeItem.tsx`
- `src/components/worktree-sidebar/ShareBar.tsx`
- `src/components/WorktreeDetail.tsx`
- `src/components/GitOperations.tsx`
- `src/components/TerminalPanel.tsx`
- `src/components/Toast.tsx`
- `src/components/ContextMenus.tsx`
- `src/components/SettingsView.tsx`
- `src/components/GlobalDialogs.tsx`
- `src/components/CreateWorktreeModal.tsx`
- `src/components/ArchiveConfirmationModal.tsx`
- `src/components/WorkspaceCell.tsx`
- `src/components/WorkspaceGrid.tsx`
- `src/components/Icons.tsx` (if icon colors need updating)

---

## Task 1: Design Tokens + Global CSS Foundation

**Files:**
- Create: `src/design-tokens.ts`
- Modify: `src/index.css`

### Step 1: Create design tokens file

```typescript
// src/design-tokens.ts
// Centralized design tokens for the UI redesign.
// Import these in components or reference the CSS custom properties.

export const colors = {
  // Backgrounds
  bgBase: '#0A0A0F',
  bgSurface: '#141419',
  bgElevated: '#1A1A22',

  // Borders
  border: '#1E1E26',

  // Text
  textPrimary: '#E8E8ED',
  textSecondary: '#8B8B9E',
  textMuted: '#55556A',

  // Accent (Indigo)
  accent: '#6366F1',
  accentHover: '#818CF8',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

export const typography = {
  uiFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  monoFont: "'Maple Mono NF CN', 'JetBrains Mono', 'Fira Code', monospace",
} as const;

export const shadows = {
  cardHover: '0 4px 24px rgba(0,0,0,0.4)',
  modal: '0 8px 32px rgba(0,0,0,0.6)',
  subtle: '0 1px 3px rgba(0,0,0,0.3)',
} as const;

export const animation = {
  duration: '150ms',
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;
```

### Step 2: Update index.css with Inter font and CSS custom properties

Add to the top of `src/index.css`, after the existing `@import "tailwindcss"`:

```css
/* Inter font for UI */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* Design token CSS custom properties */
:root {
  --bg-base: #0A0A0F;
  --bg-surface: #141419;
  --bg-elevated: #1A1A22;
  --border: #1E1E26;
  --text-primary: #E8E8ED;
  --text-secondary: #8B8B9E;
  --text-muted: #55556A;
  --accent: #6366F1;
  --accent-hover: #818CF8;
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
}
```

Replace the existing font-face block (keep Maple Mono for terminal only). Update the global body styles:

```css
/* Set Inter as default UI font */
html {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  scroll-behavior: smooth;
}
```

Update scrollbar colors to use new tokens:

```css
::-webkit-scrollbar-thumb {
  background: rgb(30 30 38 / 0.5);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgb(30 30 38 / 0.8);
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: transparent;
}

.overflow-y-auto:hover::-webkit-scrollbar-thumb {
  background: rgb(30 30 38 / 0.5);
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: rgb(30 30 38 / 0.3);
}

.overflow-x-auto:hover::-webkit-scrollbar-thumb {
  background: rgb(30 30 38 / 0.6);
}
```

Update button active effect:

```css
button:active:not(:disabled) {
  scale: 0.98;
}
```

### Step 3: Verify build passes

Run: `npm run build`
Expected: Build succeeds with no errors.

### Step 4: Commit

```bash
git add src/design-tokens.ts src/index.css
git commit -m "feat: add design tokens and update global CSS foundation"
```

---

## Task 2: UI Primitives — Button + Badge + Card

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/card.tsx`

### Step 1: Update button.tsx

Replace the entire `buttonVariants` definition:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#6366F1] text-white shadow-sm hover:bg-[#818CF8] active:scale-[0.98]",
        destructive:
          "bg-[#EF4444] text-white shadow-sm hover:bg-[#F87171] active:scale-[0.98]",
        warning:
          "bg-[#F59E0B] text-white shadow-sm hover:bg-[#FBBF24] active:scale-[0.98]",
        outline:
          "border border-[#1E1E26] bg-transparent text-[#E8E8ED] shadow-sm hover:bg-[#1A1A22] hover:text-[#E8E8ED]",
        secondary:
          "bg-[#141419] text-[#E8E8ED] shadow-sm hover:bg-[#1A1A22] border border-[#1E1E26]",
        ghost:
          "text-[#E8E8ED] hover:bg-[#141419]",
        link:
          "text-[#6366F1] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### Step 2: Update badge.tsx

Replace the variants object:

```typescript
const variants = {
  default: "border-transparent bg-[#6366F1]/15 text-[#818CF8]",
  secondary: "border-transparent bg-[#1A1A22] text-[#8B8B9E]",
  success: "border-transparent bg-[#10B981]/15 text-[#34D399]",
  warning: "border-transparent bg-[#F59E0B]/15 text-[#FBBF24]",
  destructive: "border-transparent bg-[#EF4444]/15 text-[#F87171]",
  outline: "border-[#1E1E26] text-[#8B8B9E]",
};
```

Update the base classes to use pill shape:

```typescript
"inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors"
```

### Step 3: Update card.tsx

Replace Card base classes:

```typescript
"rounded-lg border border-[#1E1E26] bg-[#141419] text-[#E8E8ED] shadow-sm"
```

Update CardDescription:

```typescript
"text-sm text-[#8B8B9E]"
```

### Step 4: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 5: Commit

```bash
git add src/components/ui/button.tsx src/components/ui/badge.tsx src/components/ui/card.tsx
git commit -m "feat: restyle button, badge, card primitives with new design tokens"
```

---

## Task 3: UI Primitives — Dialog + Input + Checkbox

**Files:**
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/checkbox.tsx`

### Step 1: Update dialog.tsx

DialogOverlay:

```typescript
"fixed inset-0 z-50 bg-black/60 backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
```

DialogContent:

```typescript
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-[#1E1E26] bg-[#141419] backdrop-blur-xl p-6 shadow-2xl duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg"
```

DialogClose button:

```typescript
"absolute right-4 top-4 rounded-sm opacity-70 ring-offset-[#0A0A0F] transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2 disabled:pointer-events-none text-[#8B8B9E] data-[state=open]:bg-transparent data-[state=open]:text-[#8B8B9E]"
```

DialogTitle:

```typescript
"text-base font-medium leading-none tracking-tight text-[#E8E8ED]"
```

DialogDescription:

```typescript
"text-sm text-[#8B8B9E]"
```

### Step 2: Update input.tsx

```typescript
"flex h-9 w-full rounded-md border border-[#1E1E26] bg-[#141419] px-3 py-1 text-sm text-[#E8E8ED] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#E8E8ED] placeholder:text-[#55556A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/40 disabled:cursor-not-allowed disabled:opacity-50"
```

### Step 3: Update checkbox.tsx

```typescript
"h-4 w-4 shrink-0 rounded border border-[#1E1E26] bg-[#141419] text-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
```

### Step 4: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 5: Commit

```bash
git add src/components/ui/dialog.tsx src/components/ui/input.tsx src/components/ui/checkbox.tsx
git commit -m "feat: restyle dialog, input, checkbox primitives with new design tokens"
```

---

## Task 4: UI Primitives — Select + Dropdown + Popover + Tooltip

**Files:**
- Modify: `src/components/ui/select.tsx`
- Modify: `src/components/ui/dropdown-menu.tsx`
- Modify: `src/components/ui/popover.tsx`
- Modify: `src/components/ui/tooltip.tsx`

### Step 1: Update select.tsx

SelectTrigger:

```typescript
"flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-[#1E1E26] bg-[#141419] px-3 py-2 text-sm text-[#E8E8ED] shadow-sm ring-offset-[#0A0A0F] placeholder:text-[#55556A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/40 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
```

SelectContent:

```typescript
"relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-[#1E1E26] bg-[#141419] text-[#E8E8ED] shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
```

SelectItem:

```typescript
"relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-[#1A1A22] focus:text-[#E8E8ED] data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
```

SelectLabel:

```typescript
"px-2 py-1.5 text-sm font-medium text-[#8B8B9E]"
```

SelectSeparator:

```typescript
"-mx-1 my-1 h-px bg-[#1E1E26]"
```

### Step 2: Update dropdown-menu.tsx

DropdownMenuSubTrigger:

```typescript
"flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-[#1A1A22] data-[state=open]:bg-[#1A1A22] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
```

DropdownMenuSubContent:

```typescript
"z-50 min-w-[8rem] overflow-hidden rounded-md border border-[#1E1E26] bg-[#141419] p-1 text-[#E8E8ED] shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
```

DropdownMenuContent:

```typescript
"z-50 min-w-[8rem] overflow-hidden rounded-md border border-[#1E1E26] bg-[#141419] p-1 text-[#E8E8ED] shadow-lg"
```

DropdownMenuItem:

```typescript
"relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-[#1A1A22] focus:text-[#E8E8ED] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0"
```

DropdownMenuCheckboxItem / DropdownMenuRadioItem: same focus style `focus:bg-[#1A1A22] focus:text-[#E8E8ED]`

DropdownMenuLabel:

```typescript
"px-2 py-1.5 text-sm font-medium text-[#8B8B9E]"
```

DropdownMenuSeparator:

```typescript
"-mx-1 my-1 h-px bg-[#1E1E26]"
```

### Step 3: Update popover.tsx

PopoverContent:

```typescript
`z-50 rounded-md border border-[#1E1E26] bg-[#141419] p-4 text-[#E8E8ED] shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className || ''}`
```

### Step 4: Update tooltip.tsx

TooltipContent:

```typescript
"z-50 overflow-hidden rounded-md bg-[#1A1A22] border border-[#1E1E26] px-3 py-1.5 text-xs text-[#E8E8ED] shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
```

### Step 5: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 6: Commit

```bash
git add src/components/ui/select.tsx src/components/ui/dropdown-menu.tsx src/components/ui/popover.tsx src/components/ui/tooltip.tsx
git commit -m "feat: restyle select, dropdown, popover, tooltip primitives"
```

---

## Task 5: Toast System

**Files:**
- Modify: `src/components/Toast.tsx`

### Step 1: Update Toast typeConfig colors

Replace the `typeConfig` object:

```typescript
const typeConfig: Record<ToastType, { bg: string; icon: FC<{ className?: string }>; barColor: string; iconColor: string }> = {
  success: {
    bg: 'bg-[#141419] border-[#1E1E26]',
    icon: CheckCircle,
    barColor: 'bg-[#10B981]',
    iconColor: 'text-[#10B981]',
  },
  error: {
    bg: 'bg-[#141419] border-[#1E1E26]',
    icon: XCircle,
    barColor: 'bg-[#EF4444]',
    iconColor: 'text-[#EF4444]',
  },
  info: {
    bg: 'bg-[#141419] border-[#1E1E26]',
    icon: Info,
    barColor: 'bg-[#6366F1]',
    iconColor: 'text-[#6366F1]',
  },
  warning: {
    bg: 'bg-[#141419] border-[#1E1E26]',
    icon: AlertTriangle,
    barColor: 'bg-[#F59E0B]',
    iconColor: 'text-[#F59E0B]',
  },
};
```

### Step 2: Update Toast render JSX

Replace the toast item rendering to use left color bar + clean layout:

```tsx
<div
  key={t.id}
  className={`relative flex items-start gap-3 border rounded-lg overflow-hidden shadow-lg max-w-sm ${config.bg} ${
    t.exiting ? 'slide-out-to-right' : 'slide-in-from-bottom-4'
  }`}
>
  {/* Left color bar */}
  <div className={`w-0.5 self-stretch ${config.barColor} shrink-0`} />
  <div className="flex items-start gap-2.5 p-3 flex-1">
    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.iconColor}`} />
    <p className="text-sm text-[#E8E8ED] flex-1 break-words">{t.message}</p>
    <button
      onClick={() => dismiss(t.id)}
      className="shrink-0 text-[#55556A] hover:text-[#E8E8ED] transition-colors"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
  {/* Countdown bar */}
  {!t.exiting && TYPE_DURATION[t.type] > 0 && (
    <div className="absolute bottom-0 left-0 right-0 h-0.5">
      <div
        className={`h-full ${config.barColor} opacity-40`}
        style={{ animation: `toast-countdown ${TYPE_DURATION[t.type]}ms linear forwards` }}
      />
    </div>
  )}
</div>
```

### Step 3: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 4: Commit

```bash
git add src/components/Toast.tsx
git commit -m "feat: restyle toast with left color bar and new design tokens"
```

---

## Task 6: Context Menus

**Files:**
- Modify: `src/components/ContextMenus.tsx`

### Step 1: Update WorktreeContextMenu styles

Replace the menu container:

```tsx
<div
  className="absolute bg-[#141419] border border-[#1E1E26] rounded-lg shadow-lg py-1 min-w-[140px]"
  style={{ left: x, top: y }}
  onClick={(e) => e.stopPropagation()}
>
```

Replace menu item button classes:

```tsx
className="w-full px-3 py-1.5 text-left text-sm text-[#E8E8ED] hover:bg-[#1A1A22] flex items-center gap-2 transition-colors"
```

### Step 2: Update TerminalTabContextMenu styles

Same pattern — replace container and item classes:

Container:
```tsx
className="absolute bg-[#141419] border border-[#1E1E26] rounded-lg shadow-lg py-1 min-w-[140px]"
```

Items:
```tsx
className="w-full px-3 py-1.5 text-left text-sm text-[#E8E8ED] hover:bg-[#1A1A22] flex items-center gap-2 transition-colors"
```

Separator:
```tsx
className="border-t border-[#1E1E26] my-1"
```

### Step 3: Update AppPickerPopover styles

Container:
```tsx
className="fixed z-[9999] grid grid-cols-3 gap-1 p-1 bg-[#141419] border border-[#1E1E26] rounded-lg shadow-lg"
```

Item buttons:
```tsx
className="p-1.5 rounded text-[#8B8B9E] hover:text-[#E8E8ED] hover:bg-[#1A1A22] transition-colors"
```

### Step 4: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 5: Commit

```bash
git add src/components/ContextMenus.tsx
git commit -m "feat: restyle context menus with new design tokens"
```

---

## Task 7: WelcomeView

**Files:**
- Modify: `src/components/WelcomeView.tsx`

### Step 1: Update WelcomeView styles

Background:
```tsx
className="min-h-screen bg-[#0A0A0F] text-[#E8E8ED] flex items-center justify-center relative"
```

Language selector trigger:
```tsx
className="w-auto gap-1.5 h-8 px-2.5 text-xs text-[#8B8B9E] border-[#1E1E26] bg-[#141419] hover:bg-[#1A1A22] hover:text-[#E8E8ED]"
```

Icon container — change gradient to solid accent:
```tsx
className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#6366F1] flex items-center justify-center shadow-lg animate-subtle-pulse"
```

Title:
```tsx
className="text-2xl font-semibold mb-3"
```

Subtitle:
```tsx
className="text-[#8B8B9E] text-sm leading-relaxed"
```

Info card:
```tsx
className="p-4 rounded-lg bg-[#141419] border border-[#1E1E26] text-left hover:border-[#6366F1]/30 hover:bg-[#1A1A22] transition-all duration-150"
```

Card heading:
```tsx
className="text-sm font-medium mb-2 flex items-center gap-2"
```

Card description:
```tsx
className="text-xs text-[#8B8B9E] leading-relaxed"
```

Code block:
```tsx
className="mt-2 text-xs text-[#55556A] bg-[#0A0A0F] rounded p-2 overflow-x-auto font-mono"
```

Button styles — use the new button variants (default and secondary already updated).

Hint text:
```tsx
className="text-xs text-[#55556A]"
```

### Step 2: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 3: Commit

```bash
git add src/components/WelcomeView.tsx
git commit -m "feat: restyle WelcomeView with new design tokens"
```

---

## Task 8: Sidebar — ExpandedSidebar + CollapsedSidebar + SortableWorktreeItem

**Files:**
- Modify: `src/components/worktree-sidebar/ExpandedSidebar.tsx`
- Modify: `src/components/worktree-sidebar/CollapsedSidebar.tsx`
- Modify: `src/components/worktree-sidebar/SortableWorktreeItem.tsx`
- Modify: `src/components/worktree-sidebar/ShareBar.tsx`
- Modify: `src/components/WorktreeSidebar.tsx`

### Step 1: Update ExpandedSidebar

Read the full file first to identify all slate-* color usages, then replace systematically:

- Sidebar container background: `bg-[#0A0A0F]`
- Remove any `border-r` or replace with `border-r border-[#1E1E26]` if needed for visual separation
- Search input: use updated Input component (inherits new styles)
- Worktree item hover: `hover:bg-[#141419]`
- Selected worktree: `bg-[#141419]` with left indicator `border-l-2 border-l-[#6366F1]`
- Worktree name: `text-sm font-medium text-[#E8E8ED]`
- Branch name: `text-xs font-mono text-[#8B8B9E]`
- Project count badge: `text-[10px] bg-[#6366F1]/10 text-[#818CF8]`
- Archived indicator: `text-[#55556A]`
- Bottom action bar: `bg-[#0A0A0F] border-t border-[#1E1E26]`
- Action buttons: use ghost variant (already updated)
- Version text: `text-[10px] text-[#55556A]`

### Step 2: Update CollapsedSidebar

- Container: `bg-[#0A0A0F]`
- Selected indicator: left bar `border-l-2 border-l-[#6366F1]`
- Hover: `hover:bg-[#141419]`
- Icons: `text-[#8B8B9E]`, selected `text-[#E8E8ED]`

### Step 3: Update SortableWorktreeItem

- Item container: match ExpandedSidebar item styles
- Drag overlay: `bg-[#141419] border border-[#6366F1]/30 shadow-lg`
- Drag handle: `text-[#55556A] hover:text-[#8B8B9E]`

### Step 4: Update ShareBar

- Background: `bg-[#141419]`
- Text: `text-[#8B8B9E]`
- Buttons: use updated button variants

### Step 5: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 6: Commit

```bash
git add src/components/worktree-sidebar/ src/components/WorktreeSidebar.tsx
git commit -m "feat: restyle sidebar components with new design tokens"
```

---

## Task 9: WorktreeDetail + Project Cards

**Files:**
- Modify: `src/components/WorktreeDetail.tsx`

### Step 1: Update WorktreeDetail

Read the full file first. Key areas to update:

- Detail container background: `bg-[#0A0A0F]`
- Header area: `text-[#E8E8ED]`
- Project card: `bg-[#141419] border border-[#1E1E26] rounded-lg`
- Left status border: keep existing pattern but use new colors:
  - Success: `border-l-[#10B981]`
  - Warning: `border-l-[#F59E0B]`
  - Info/syncing: `border-l-[#6366F1]`
- Project name: `text-sm font-medium text-[#E8E8ED]`
- Branch info: `text-xs font-mono text-[#8B8B9E]`
- Status badges: use updated Badge component (inherits new styles)
- "Clean" badge: use Badge success variant
- Action buttons: use updated Button variants
- Editor/terminal picker buttons: `text-[#8B8B9E] hover:text-[#E8E8ED] hover:bg-[#1A1A22]`
- Section headers: `text-sm font-medium text-[#E8E8ED]`
- Empty state: `text-[#55556A]`
- Error display: `text-[#EF4444] bg-[#EF4444]/10`
- Deploy/occupation banner: use accent colors

### Step 2: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 3: Commit

```bash
git add src/components/WorktreeDetail.tsx
git commit -m "feat: restyle WorktreeDetail and project cards"
```

---

## Task 10: GitOperations Panel

**Files:**
- Modify: `src/components/GitOperations.tsx`

### Step 1: Update GitOperations

Read the full file first. Key areas:

- Panel container: `bg-[#141419] border border-[#1E1E26] rounded-lg`
- Section labels: `text-xs font-medium text-[#8B8B9E]`
- Status text: `text-sm text-[#E8E8ED]`
- Branch info: `text-xs font-mono text-[#8B8B9E]`
- Primary action buttons (push/pull/fetch/sync): use default button variant (indigo)
- Secondary actions: use ghost or outline variant
- Destructive actions (reset): use destructive variant or `text-[#EF4444]`
- Merge-to-base (orange/warning): use warning variant
- Button group layout: `gap-1.5`
- Progress bar: `bg-[#6366F1]` gradient
- Loading spinner: `text-[#6366F1]`
- Error messages: `text-[#EF4444]`
- Success messages: `text-[#10B981]`
- Diff stats: `text-xs text-[#8B8B9E]`
- Commit prefix selector: use updated Select component

### Step 2: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 3: Commit

```bash
git add src/components/GitOperations.tsx
git commit -m "feat: restyle GitOperations panel with new design tokens"
```

---

## Task 11: Terminal Panel

**Files:**
- Modify: `src/components/TerminalPanel.tsx`

### Step 1: Update TerminalPanel

- Panel header: `bg-[#0A0A0F]`
- Tab bar: `bg-[#0A0A0F] border-b border-[#1E1E26]`
- Active tab: `text-[#E8E8ED] border-b-2 border-b-[#6366F1]`
- Inactive tab: `text-[#55556A] hover:text-[#8B8B9E]`
- Tab close button: `text-[#55556A] hover:text-[#E8E8ED]`
- Resize handle: `bg-[#1E1E26] hover:bg-[#6366F1]`
- Collapse/expand button: `text-[#8B8B9E] hover:text-[#E8E8ED]`
- Terminal area: keep dark background (terminal handles its own colors)
- Voice recording indicator: keep red but use `text-[#EF4444]`
- Waveform: use accent color `#6366F1` or keep red for recording

### Step 2: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 3: Commit

```bash
git add src/components/TerminalPanel.tsx
git commit -m "feat: restyle TerminalPanel with new design tokens"
```

---

## Task 12: SettingsView

**Files:**
- Modify: `src/components/SettingsView.tsx`

### Step 1: Update SettingsView

Read the full file first. Key areas:

- Page background: `bg-[#0A0A0F]`
- Section headers: `text-sm font-medium text-[#E8E8ED]` with `border-b border-[#1E1E26]`
- Form labels: `text-sm text-[#8B8B9E]`
- Description text: `text-xs text-[#55556A]`
- Input fields: use updated Input component (inherits new styles)
- Select fields: use updated Select component
- Toggle/switch: accent color when active
- Cards/sections: `bg-[#141419] border border-[#1E1E26] rounded-lg`
- Back button: use ghost variant
- Save button: use default variant (indigo)
- Danger zone: `border-[#EF4444]/20` with destructive button
- Links: `text-[#6366F1] hover:underline`
- Info icons: `text-[#8B8B9E]`

### Step 2: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 3: Commit

```bash
git add src/components/SettingsView.tsx
git commit -m "feat: restyle SettingsView with new design tokens"
```

---

## Task 13: Modals (Create, Archive, Add, GlobalDialogs)

**Files:**
- Modify: `src/components/CreateWorktreeModal.tsx`
- Modify: `src/components/ArchiveConfirmationModal.tsx`
- Modify: `src/components/AddProjectModal.tsx`
- Modify: `src/components/AddProjectToWorktreeModal.tsx`
- Modify: `src/components/AddWorkspaceModal.tsx`
- Modify: `src/components/GlobalDialogs.tsx`
- Modify: `src/components/CreatePRModal.tsx`
- Modify: `src/components/BatchArchiveModal.tsx`

### Step 1: Update all modal components

All modals use the Dialog primitive which is already updated. Focus on content-specific styling:

- All `text-slate-*` → new token equivalents
- All `bg-slate-*` → new token equivalents
- All `border-slate-*` → new token equivalents
- Warning text in archive modal: `text-[#F59E0B]`
- Error text: `text-[#EF4444]`
- Success text: `text-[#10B981]`
- Process list in archive modal: `bg-[#0A0A0F] rounded-lg border border-[#1E1E26]`
- Checkbox labels: `text-sm text-[#E8E8ED]`

### Step 2: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 3: Commit

```bash
git add src/components/CreateWorktreeModal.tsx src/components/ArchiveConfirmationModal.tsx src/components/AddProjectModal.tsx src/components/AddProjectToWorktreeModal.tsx src/components/AddWorkspaceModal.tsx src/components/GlobalDialogs.tsx src/components/CreatePRModal.tsx src/components/BatchArchiveModal.tsx
git commit -m "feat: restyle all modal components with new design tokens"
```

---

## Task 14: WorkspaceGrid + WorkspaceCell

**Files:**
- Modify: `src/components/WorkspaceGrid.tsx`
- Modify: `src/components/WorkspaceCell.tsx`

### Step 1: Update WorkspaceGrid

- Grid background: `bg-[#0A0A0F]`
- Resize handles: `bg-[#1E1E26] hover:bg-[#6366F1]`
- Grid lines: `border-[#1E1E26]`

### Step 2: Update WorkspaceCell

- Cell background: `bg-[#0A0A0F]`
- Cell header: `bg-[#0A0A0F] border-b border-[#1E1E26]`
- Close button: `text-[#55556A] hover:text-[#E8E8ED]`

### Step 3: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 4: Commit

```bash
git add src/components/WorkspaceGrid.tsx src/components/WorkspaceCell.tsx
git commit -m "feat: restyle WorkspaceGrid and WorkspaceCell"
```

---

## Task 15: Remaining Components + Final Pass

**Files:**
- Modify: `src/components/ChangedFilesPanel.tsx`
- Modify: `src/components/BranchCombobox.tsx`
- Modify: `src/components/TerminalSearchBar.tsx`
- Modify: `src/components/UpdateCheckerDialog.tsx`
- Modify: `src/components/UpdaterDialogs.tsx`
- Modify: `src/components/MobileWorktreeList.tsx`
- Modify: `src/components/MobileWorktreeDetail.tsx`
- Modify: `src/App.tsx` (loading overlay, login screen, kicked screen)

### Step 1: Update remaining components

Apply the same pattern to all remaining components:
- `text-slate-100` → `text-[#E8E8ED]`
- `text-slate-200` → `text-[#E8E8ED]`
- `text-slate-300` → `text-[#8B8B9E]`
- `text-slate-400` → `text-[#8B8B9E]`
- `text-slate-500` → `text-[#55556A]`
- `bg-slate-900` → `bg-[#0A0A0F]`
- `bg-slate-800` → `bg-[#141419]`
- `bg-slate-800/50` → `bg-[#141419]`
- `bg-slate-700` → `bg-[#1A1A22]`
- `border-slate-700` → `border-[#1E1E26]`
- `border-slate-600` → `border-[#1E1E26]`
- `ring-blue-500` → `ring-[#6366F1]`
- `text-blue-400` → `text-[#6366F1]`
- `bg-blue-600` → `bg-[#6366F1]`

### Step 2: Update App.tsx login/kicked screens

Login screen:
```tsx
className="min-h-screen bg-[#0A0A0F] text-[#E8E8ED] flex items-center justify-center"
```

Kicked screen:
```tsx
className="min-h-screen bg-[#0A0A0F] text-[#E8E8ED] flex items-center justify-center"
```

Loading overlay:
```tsx
className="fixed inset-0 z-50 bg-[#0A0A0F] flex items-center justify-center"
```

### Step 3: Verify build passes

Run: `npm run build`
Expected: Build succeeds.

### Step 4: Final grep for remaining slate-* colors

Run: `grep -rn "slate-" src/components/ src/App.tsx --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".test."`
Expected: No matches (or only acceptable matches in test files).

### Step 5: Commit

```bash
git add src/components/ChangedFilesPanel.tsx src/components/BranchCombobox.tsx src/components/TerminalSearchBar.tsx src/components/UpdateCheckerDialog.tsx src/components/UpdaterDialogs.tsx src/components/MobileWorktreeList.tsx src/components/MobileWorktreeDetail.tsx src/App.tsx
git commit -m "feat: complete UI redesign — replace all remaining slate-* colors with design tokens"
```

---

## Task 16: Visual Verification

### Step 1: Start dev server

Run: `npm run build && npm run tauri dev` (or `npm run dev` for browser-only check)

### Step 2: Verify each area visually

Check:
- [ ] Welcome screen — clean, accent icon, proper typography
- [ ] Sidebar — dark bg, selected indicator, proper text hierarchy
- [ ] Project cards — surface bg, colored left border, pill badges
- [ ] Git operations — indigo primary buttons, ghost secondary
- [ ] Terminal panel — seamless header, accent tab underline
- [ ] Modals — clean surface, proper backdrop blur
- [ ] Toasts — left color bar, clean layout
- [ ] Context menus — surface bg, proper hover states
- [ ] Settings — section headers, form elements consistent
- [ ] Overall — no slate-gray washed-out feeling, clear hierarchy

### Step 3: Fix any visual issues found

### Step 4: Final commit if fixes needed

```bash
git add -A
git commit -m "fix: visual polish pass after UI redesign"
```

---

## Self-Review Checklist

- [ ] All `slate-*` Tailwind classes replaced with new token values
- [ ] Inter font loads for UI, Maple Mono only for terminal/code
- [ ] All button variants use new color scheme
- [ ] All badges use pill shape with 10% opacity backgrounds
- [ ] All dialogs use new surface colors
- [ ] Toast uses left color bar pattern
- [ ] Context menus use new surface colors
- [ ] Build passes at every commit
- [ ] No visual regressions in functionality
