# Xterm.js Add-on Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate WebGL Renderer, Unicode11, and Search add-ons into the built-in terminal for GPU-accelerated rendering, correct CJK character widths, and in-terminal search.

**Architecture:** Rendering add-ons (WebGL, Unicode11) are encapsulated inside `XtermAdapter` with no external API changes. Search add-on exposes methods through `TerminalAdapter` interface, with a standalone `TerminalSearchBar` React component for the UI. Props chain through Terminal.tsx → TerminalPanel.tsx for state coordination.

**Tech Stack:** @xterm/addon-webgl ^0.19.0, @xterm/addon-unicode11 ^0.9.0, @xterm/addon-search ^0.16.0, React 19, TypeScript, Tailwind CSS

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Add 3 new @xterm add-on dependencies |
| `src/terminal/types.ts` | Modify | Add `SearchOptions` type, search methods to `TerminalAdapter`, `onRendererFallback` to `TerminalOptions` |
| `src/terminal/adapters/xterm.ts` | Modify | Load WebGL/Unicode11/Search add-ons, implement search methods |
| `src/components/TerminalSearchBar.tsx` | Create | Floating search bar component (VSCode-style) |
| `src/components/Terminal.tsx` | Modify | Add `onSearchRequested`/`onRendererFallback` props, merge Ctrl/Cmd+F into key handler, expose search in TerminalHandle |
| `src/components/TerminalPanel.tsx` | Modify | Search button in toolbar, search bar rendering, GPU fallback toast, tab-switch cleanup |
| `src/locales/zh-CN.json` | Modify | Add 7 i18n keys |
| `src/locales/en-US.json` | Modify | Add 7 i18n keys |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json:33-35`

- [ ] **Step 1: Install the three xterm add-on packages**

```bash
cd /Users/guo/Work/worktree-manager-workspace/worktrees/built-in-terminal-decoupling/projects/worktree-manager
pnpm add @xterm/addon-webgl@^0.19.0 @xterm/addon-unicode11@^0.9.0 @xterm/addon-search@^0.16.0
```

- [ ] **Step 2: Verify installation**

Run: `grep -A2 addon-webgl package.json`
Expected: Lines showing `@xterm/addon-webgl`, `@xterm/addon-unicode11`, `@xterm/addon-search` with versions.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add xterm WebGL, Unicode11, and Search add-on dependencies"
```

---

### Task 2: Extend TerminalAdapter Interface with Search Types

**Files:**
- Modify: `src/terminal/types.ts`

- [ ] **Step 1: Add SearchOptions type and search methods to TerminalAdapter**

Add `SearchOptions` export and three optional search methods to `TerminalAdapter`, and `onRendererFallback` to `TerminalOptions`. In `src/terminal/types.ts`, add the `SearchOptions` type after the `Disposable` interface (after line 44), add search methods to `TerminalAdapter` (after `clearSelection`), and add `onRendererFallback` to `TerminalOptions`:

```typescript
// After the Disposable interface (line 44):
export interface SearchOptions {
  caseSensitive?: boolean
  regex?: boolean
}
```

Add to `TerminalOptions` interface, after `linkHandler`:

```typescript
  onRendererFallback?: () => void
```

Add to `TerminalAdapter` interface, after `clearSelection():void` and before the shell integration comment block:

```typescript
  findNext?(query: string, options?: SearchOptions): boolean
  findPrevious?(query: string, options?: SearchOptions): boolean
  clearSearch?(): void
```

- [ ] **Step 2: Re-export SearchOptions from index.ts**

In `src/terminal/index.ts`, add `SearchOptions` to the type exports:

```typescript
export type {
  TerminalAdapter,
  TerminalAdapterFactory,
  TerminalOptions,
  TerminalTheme,
  TerminalDimensions,
  Disposable,
  SearchOptions,
} from './types'
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/guo/Work/worktree-manager-workspace/worktrees/built-in-terminal-decoupling/projects/worktree-manager && npx tsc --noEmit`
Expected: No errors (new optional fields don't break existing code).

- [ ] **Step 4: Commit**

```bash
git add src/terminal/types.ts src/terminal/index.ts
git commit -m "feat(terminal): add SearchOptions type and search methods to TerminalAdapter interface"
```

---

### Task 3: Load Unicode11 + WebGL Add-ons in XtermAdapter

**Files:**
- Modify: `src/terminal/adapters/xterm.ts`

- [ ] **Step 1: Add imports for Unicode11 and WebGL add-ons**

At the top of `src/terminal/adapters/xterm.ts`, after the existing `WebLinksAddon` import (line 5), add:

```typescript
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { WebglAddon } from '@xterm/addon-webgl'
```

- [ ] **Step 2: Add private field for webglAddon**

In the `XtermAdapter` class, after the existing `private commandDecoration` field (line 51), add:

```typescript
  private webglAddon: WebglAddon | null = null
```

- [ ] **Step 3: Load Unicode11 and WebGL in mount()**

In the `mount()` method, after `term.open(container)` (line 82) and **before** the shell integration block (line 88), insert:

```typescript
    // Unicode11: correct CJK character widths
    const unicode11 = new Unicode11Addon()
    term.loadAddon(unicode11)
    term.unicode.activeVersion = '11'

    // WebGL: GPU-accelerated rendering with fallback
    try {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => {
        webglAddon.dispose()
        this.webglAddon = null
        options.onRendererFallback?.()
      })
      term.loadAddon(webglAddon)
      this.webglAddon = webglAddon
    } catch {
      options.onRendererFallback?.()
    }
```

- [ ] **Step 4: Add WebGL cleanup to dispose()**

In the `dispose()` method, before `this.term?.dispose()` (line 107), add:

```typescript
    this.webglAddon?.dispose()
    this.webglAddon = null
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/terminal/adapters/xterm.ts
git commit -m "feat(terminal): load Unicode11 and WebGL add-ons in XtermAdapter"
```

---

### Task 4: Add Search Add-on to XtermAdapter

**Files:**
- Modify: `src/terminal/adapters/xterm.ts`

- [ ] **Step 1: Add SearchAddon import**

After the WebGL import added in Task 3, add:

```typescript
import { SearchAddon } from '@xterm/addon-search'
```

Also add `SearchOptions` to the type imports:

```typescript
import type {
  TerminalAdapter,
  TerminalOptions,
  TerminalDimensions,
  Disposable,
  SearchOptions,
} from '../types'
```

- [ ] **Step 2: Add private field and load in mount()**

Add private field after `webglAddon`:

```typescript
  private searchAddon: SearchAddon | null = null
```

In `mount()`, after the WebGL block and before shell integration, add:

```typescript
    // Search: terminal content search
    const searchAddon = new SearchAddon()
    term.loadAddon(searchAddon)
    this.searchAddon = searchAddon
```

- [ ] **Step 3: Implement search methods**

Add after the existing `scrollToBottom()` method and before the `setMobileKeyboardPolicy()` method:

```typescript
  findNext(query: string, options?: SearchOptions): boolean {
    return this.searchAddon?.findNext(query, {
      caseSensitive: options?.caseSensitive,
      regex: options?.regex,
    }) ?? false
  }

  findPrevious(query: string, options?: SearchOptions): boolean {
    return this.searchAddon?.findPrevious(query, {
      caseSensitive: options?.caseSensitive,
      regex: options?.regex,
    }) ?? false
  }

  clearSearch(): void {
    this.searchAddon?.clearSearch()
  }
```

- [ ] **Step 4: Add cleanup to dispose()**

In `dispose()`, before `this.webglAddon?.dispose()`, add:

```typescript
    this.searchAddon?.dispose()
    this.searchAddon = null
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/terminal/adapters/xterm.ts
git commit -m "feat(terminal): add SearchAddon to XtermAdapter with findNext/findPrevious/clearSearch"
```

---

### Task 5: Wire Terminal.tsx — Props, Key Handler, and TerminalHandle

**Files:**
- Modify: `src/components/Terminal.tsx`

- [ ] **Step 1: Add SearchOptions import**

At line 8 in Terminal.tsx, update the import to include `SearchOptions`:

```typescript
import type { TerminalAdapter, Disposable, SearchOptions } from '../terminal';
```

- [ ] **Step 2: Add new props to TerminalProps interface**

In the `TerminalProps` interface (line 139-145), add two new optional props:

```typescript
interface TerminalProps {
  cwd: string;
  visible: boolean;
  clientId?: string;
  onShellIntegrationDetected?: () => void;
  onCwdChanged?: (cwd: string) => void;
  onSearchRequested?: () => void;
  onRendererFallback?: () => void;
}
```

- [ ] **Step 3: Update TerminalHandle interface**

Update the `TerminalHandle` interface (line 152-155) to include search methods:

```typescript
export interface TerminalHandle {
  copyContent: () => Promise<void>;
  scrollToCommand: (direction: 'prev' | 'next') => void;
  findNext: (query: string, options?: SearchOptions) => boolean;
  findPrevious: (query: string, options?: SearchOptions) => boolean;
  clearSearch: () => void;
}
```

- [ ] **Step 4: Destructure new props and add refs**

Update the `forwardRef` destructuring (line 157) to include new props:

```typescript
const TerminalInner = forwardRef<TerminalHandle, TerminalProps>(({ cwd, visible, clientId, onShellIntegrationDetected, onCwdChanged, onSearchRequested, onRendererFallback }, ref) => {
```

After the existing `onCwdChangedRef` (line 197-198), add refs for the new callbacks:

```typescript
  const onSearchRequestedRef = useRef(onSearchRequested);
  onSearchRequestedRef.current = onSearchRequested;
  const onRendererFallbackRef = useRef(onRendererFallback);
  onRendererFallbackRef.current = onRendererFallback;
```

- [ ] **Step 5: Merge Ctrl/Cmd+F into the existing key handler**

Replace the existing key handler (line 517-518):

```typescript
        // Let Alt+V pass through for voice input
        const keyDisposable = adapter.onKeyEvent((e) => !(e.altKey && e.code === 'KeyV'));
```

With the merged version:

```typescript
        // Key handler: Ctrl/Cmd+F for search, Alt+V passthrough for voice
        const keyDisposable = adapter.onKeyEvent((e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
            onSearchRequestedRef.current?.();
            return false;
          }
          if (e.altKey && e.code === 'KeyV') return false;
          return true;
        });
```

- [ ] **Step 6: Pass onRendererFallback to adapter.mount()**

In the `adapter.mount()` call (around line 498-505), add `onRendererFallback`:

```typescript
        await adapter.mount(terminalRef.current, {
          fontSize: isMobileDevice ? 12 : 13,
          fontFamily: '"Maple Mono NF CN", Menlo, Monaco, "Courier New", monospace',
          cursorBlink: true,
          cursorStyle: 'bar' as const,
          scrollback: TERMINAL.SCROLLBACK_LINES,
          linkHandler: (uri) => openLink(uri),
          onRendererFallback: () => onRendererFallbackRef.current?.(),
        });
```

- [ ] **Step 7: Extend useImperativeHandle with search methods**

Update `useImperativeHandle` (line 320-334) to add search methods:

```typescript
  useImperativeHandle(ref, () => ({
    copyContent: async () => {
      const adapter = adapterRef.current;
      if (!adapter) return;
      adapter.selectAll();
      const selection = adapter.getSelection();
      if (selection) {
        try { await navigator.clipboard.writeText(selection); } catch { /* noop */ }
      }
      adapter.clearSelection();
    },
    scrollToCommand: (direction: 'prev' | 'next') => {
      adapterRef.current?.scrollToCommand?.(direction);
    },
    findNext: (query: string, options?: SearchOptions) => {
      return adapterRef.current?.findNext?.(query, options) ?? false;
    },
    findPrevious: (query: string, options?: SearchOptions) => {
      return adapterRef.current?.findPrevious?.(query, options) ?? false;
    },
    clearSearch: () => {
      adapterRef.current?.clearSearch?.();
    },
  }), []);
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/Terminal.tsx
git commit -m "feat(terminal): wire search and renderer fallback props through Terminal component"
```

---

### Task 6: Add i18n Keys

**Files:**
- Modify: `src/locales/en-US.json`
- Modify: `src/locales/zh-CN.json`

- [ ] **Step 1: Add English i18n keys**

In `src/locales/en-US.json`, after `"terminal.terminalCount"` (the last terminal key), add:

```json
  "terminal.search": "Search",
  "terminal.searchPlaceholder": "Search terminal...",
  "terminal.caseSensitive": "Case sensitive",
  "terminal.useRegex": "Use regex",
  "terminal.noResults": "No results",
  "terminal.closeSearch": "Close search",
  "terminal.gpuFallback": "GPU rendering unavailable, switched to software rendering",
```

- [ ] **Step 2: Add Chinese i18n keys**

In `src/locales/zh-CN.json`, after `"terminal.terminalCount"` (the last terminal key), add:

```json
  "terminal.search": "搜索",
  "terminal.searchPlaceholder": "搜索终端内容...",
  "terminal.caseSensitive": "区分大小写",
  "terminal.useRegex": "正则表达式",
  "terminal.noResults": "无匹配结果",
  "terminal.closeSearch": "关闭搜索",
  "terminal.gpuFallback": "GPU 渲染不可用，已切换到软件渲染",
```

- [ ] **Step 3: Verify both files have the same number of terminal keys**

Run: `grep -c '"terminal\.' src/locales/en-US.json && grep -c '"terminal\.' src/locales/zh-CN.json`
Expected: Both numbers should be equal (current 41 + 7 = 48 each).

- [ ] **Step 4: Commit**

```bash
git add src/locales/en-US.json src/locales/zh-CN.json
git commit -m "feat(i18n): add terminal search and GPU fallback translation keys"
```

---

### Task 7: Create TerminalSearchBar Component

**Files:**
- Create: `src/components/TerminalSearchBar.tsx`

- [ ] **Step 1: Create the TerminalSearchBar component**

Create `src/components/TerminalSearchBar.tsx` with the following content:

```tsx
import { useState, useRef, useEffect, useCallback, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown, X, CaseSensitive, Regex } from 'lucide-react';
import type { SearchOptions } from '../terminal';

interface TerminalSearchBarProps {
  onFindNext: (query: string, options: SearchOptions) => boolean;
  onFindPrevious: (query: string, options: SearchOptions) => boolean;
  onClose: () => void;
}

export const TerminalSearchBar: FC<TerminalSearchBarProps> = ({
  onFindNext,
  onFindPrevious,
  onClose,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [hasResults, setHasResults] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const options: SearchOptions = { caseSensitive, regex: useRegex };

  const doFindNext = useCallback((q: string, opts: SearchOptions) => {
    if (!q) {
      setHasResults(true);
      return;
    }
    const found = onFindNext(q, opts);
    setHasResults(found);
  }, [onFindNext]);

  const doFindPrevious = useCallback((q: string, opts: SearchOptions) => {
    if (!q) {
      setHasResults(true);
      return;
    }
    const found = onFindPrevious(q, opts);
    setHasResults(found);
  }, [onFindPrevious]);

  // Debounced search on query/options change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = useRegex ? 300 : 150;
    debounceRef.current = setTimeout(() => {
      doFindNext(query, options);
    }, delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, caseSensitive, useRegex, doFindNext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        doFindPrevious(query, options);
      } else {
        doFindNext(query, options);
      }
    }
  };

  return (
    <div
      className="absolute top-2 right-2 z-30 flex items-center gap-1 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg shadow-lg"
      onKeyDown={handleKeyDown}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('terminal.searchPlaceholder')}
        className={`w-48 px-2 py-1 text-xs bg-slate-900 border rounded text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors ${
          query && !hasResults ? 'border-red-500' : 'border-slate-600'
        }`}
        aria-label={t('terminal.search')}
      />
      {query && !hasResults && (
        <span className="text-[10px] text-red-400 whitespace-nowrap">{t('terminal.noResults')}</span>
      )}
      <button
        onClick={() => setCaseSensitive(!caseSensitive)}
        className={`p-1 rounded transition-colors ${
          caseSensitive ? 'text-blue-400 bg-blue-900/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700'
        }`}
        title={t('terminal.caseSensitive')}
        aria-label={t('terminal.caseSensitive')}
        aria-pressed={caseSensitive}
      >
        <CaseSensitive className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setUseRegex(!useRegex)}
        className={`p-1 rounded transition-colors ${
          useRegex ? 'text-blue-400 bg-blue-900/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700'
        }`}
        title={t('terminal.useRegex')}
        aria-label={t('terminal.useRegex')}
        aria-pressed={useRegex}
      >
        <Regex className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-4 bg-slate-600 mx-0.5" />
      <button
        onClick={() => doFindPrevious(query, options)}
        className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
        title={t('terminal.prevCommand')}
        aria-label={t('terminal.prevCommand')}
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => doFindNext(query, options)}
        className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
        title={t('terminal.nextCommand')}
        aria-label={t('terminal.nextCommand')}
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-4 bg-slate-600 mx-0.5" />
      <button
        onClick={onClose}
        className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
        title={t('terminal.closeSearch')}
        aria-label={t('terminal.closeSearch')}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TerminalSearchBar.tsx
git commit -m "feat(terminal): create TerminalSearchBar floating search component"
```

---

### Task 8: Integrate Search and Fallback Toast into TerminalPanel

**Files:**
- Modify: `src/components/TerminalPanel.tsx`

- [ ] **Step 1: Add imports**

At the top of `src/components/TerminalPanel.tsx`, add the Search icon import to the lucide import (line 3):

```typescript
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
```

Add the TerminalSearchBar import after the Terminal import (line 4):

```typescript
import { TerminalSearchBar } from './TerminalSearchBar';
```

Add the SearchOptions type import:

```typescript
import type { SearchOptions } from '../terminal';
```

- [ ] **Step 2: Add searchOpen and gpuFallback state**

Inside the `TerminalPanel` component, after the existing `terminalRefsMap` ref (line 302), add:

```typescript
  const [searchOpen, setSearchOpen] = useState(false);
  const [showGpuFallback, setShowGpuFallback] = useState(false);
  const gpuFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

- [ ] **Step 3: Add tab-switch cleanup effect**

After the existing `showAltVHint` effect (around line 365), add:

```typescript
  // Close search bar when switching terminal tabs
  const prevTabRef = useRef(activeTerminalTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTerminalTab) {
      if (searchOpen) {
        // Clear search highlights on previous tab
        const prevHandle = terminalRefsMap.current.get(prevTabRef.current ?? '');
        prevHandle?.clearSearch();
        setSearchOpen(false);
      }
      prevTabRef.current = activeTerminalTab;
    }
  }, [activeTerminalTab, searchOpen]);
```

- [ ] **Step 4: Add GPU fallback handler**

After the tab-switch effect, add:

```typescript
  const handleGpuFallback = useCallback(() => {
    setShowGpuFallback(true);
    if (gpuFallbackTimerRef.current) clearTimeout(gpuFallbackTimerRef.current);
    gpuFallbackTimerRef.current = setTimeout(() => setShowGpuFallback(false), 3000);
  }, []);

  useEffect(() => {
    return () => { if (gpuFallbackTimerRef.current) clearTimeout(gpuFallbackTimerRef.current); };
  }, []);
```

- [ ] **Step 5: Add search toggle handler**

After the GPU fallback handler, add:

```typescript
  const handleSearchToggle = useCallback(() => {
    setSearchOpen(prev => {
      if (prev) {
        // Closing: clear search highlights
        const handle = terminalRefsMap.current.get(activeTerminalTab ?? '');
        handle?.clearSearch();
      }
      return !prev;
    });
  }, [activeTerminalTab]);

  const handleSearchClose = useCallback(() => {
    const handle = terminalRefsMap.current.get(activeTerminalTab ?? '');
    handle?.clearSearch();
    setSearchOpen(false);
  }, [activeTerminalTab]);
```

- [ ] **Step 6: Add search button to toolbar**

In the toolbar buttons section (after the shell integration ↑↓ buttons block ending at line 492, before `{onToggleVoice && (`), add:

```tsx
            <button
              onClick={(e) => { e.stopPropagation(); handleSearchToggle(); }}
              className={`p-1.5 rounded transition-colors ${
                searchOpen ? 'text-blue-400 bg-blue-900/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700'
              }`}
              title={t('terminal.search')}
              aria-label={t('terminal.search')}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
```

- [ ] **Step 7: Pass new props to Terminal component**

In the `<Terminal>` rendering (around line 559-569), add the new props:

```tsx
                <Terminal
                  ref={(handle: TerminalHandle | null) => {
                    if (handle) terminalRefsMap.current.set(path, handle);
                    else terminalRefsMap.current.delete(path);
                  }}
                  cwd={path}
                  visible={visible && path === activeTerminalTab}
                  clientId={clientId}
                  onShellIntegrationDetected={() => onShellIntegrationDetected?.(path)}
                  onCwdChanged={(newCwd) => onCwdChanged?.(path, newCwd)}
                  onSearchRequested={() => setSearchOpen(true)}
                  onRendererFallback={handleGpuFallback}
                />
```

- [ ] **Step 8: Render TerminalSearchBar**

Inside the terminal content area (the `<div className="flex-1 min-h-0 overflow-hidden relative">` around line 547), after the mounted terminals rendering and before the voice error toast (`{showError && (`), add:

```tsx
        {/* Terminal search bar */}
        {searchOpen && activeTerminalTab && (
          <TerminalSearchBar
            onFindNext={(query: string, opts: SearchOptions) =>
              terminalRefsMap.current.get(activeTerminalTab)?.findNext(query, opts) ?? false
            }
            onFindPrevious={(query: string, opts: SearchOptions) =>
              terminalRefsMap.current.get(activeTerminalTab)?.findPrevious(query, opts) ?? false
            }
            onClose={handleSearchClose}
          />
        )}
```

- [ ] **Step 9: Render GPU fallback toast**

After the existing voice warning toast (`{showWarning && !showError && (...)}`), add:

```tsx
        {/* GPU renderer fallback toast */}
        {showGpuFallback && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-yellow-900/90 border border-yellow-700/50 rounded-lg text-sm text-yellow-200 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            {t('terminal.gpuFallback')}
          </div>
        )}
```

- [ ] **Step 10: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 11: Commit**

```bash
git add src/components/TerminalPanel.tsx
git commit -m "feat(terminal): integrate search bar, search button, and GPU fallback toast in TerminalPanel"
```

---

### Task 9: Build Verification and Manual Testing

**Files:** None (verification only)

- [ ] **Step 1: Run full TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run Vite build**

Run: `pnpm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Start dev server and verify**

Run: `pnpm run build && pnpm run tauri dev`

Manual test checklist:
1. Open a terminal tab — verify it renders (WebGL active, no visual difference)
2. Type Chinese characters (e.g., `echo "你好世界"`) — verify correct alignment (Unicode11)
3. Press `Ctrl+F` (or `Cmd+F` on Mac) — verify floating search bar appears at top-right
4. Type a search query — verify matches are highlighted in the terminal
5. Press `Enter` — verify it jumps to next match
6. Press `Shift+Enter` — verify it jumps to previous match
7. Toggle case-sensitive button — verify behavior changes
8. Press `Escape` — verify search bar closes, highlights cleared, focus returns to terminal
9. Click the search icon in toolbar — verify search bar toggles
10. Switch terminal tabs while search is open — verify search bar closes
11. Verify `Alt+V` still works for voice input (not broken by key handler merge)

- [ ] **Step 4: Commit any fixes if needed**

If manual testing reveals issues, fix them and commit with a descriptive message.
