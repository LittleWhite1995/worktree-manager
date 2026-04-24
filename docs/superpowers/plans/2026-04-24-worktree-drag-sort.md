# Worktree Drag-Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-and-drop sorting to the active worktree list in the expanded sidebar, persisted per-workspace in localStorage.

**Architecture:** Sort logic is lifted to `WorktreeSidebar.tsx` so both expanded and collapsed sidebars share the same order. dnd-kit wraps only the `WorktreeList` component. A `SortableWorktreeItem` component encapsulates per-item drag behavior with a grip handle. Order persists via localStorage keyed by workspace path.

**Tech Stack:** @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, lucide-react (GripVertical)

---

### Task 1: Install dnd-kit dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Verify installation**

```bash
pnpm list @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: All three packages listed with versions.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add dnd-kit dependencies for worktree drag-sort"
```

---

### Task 2: Lift sort logic to WorktreeSidebar with localStorage persistence

**Files:**
- Modify: `src/components/WorktreeSidebar.tsx:54-58`
- Modify: `src/components/worktree-sidebar/ExpandedSidebar.tsx:611-618`
- Modify: `src/components/worktree-sidebar/CollapsedSidebar.tsx:97`

This task moves the sort logic out of `WorktreeList` (inside ExpandedSidebar) and into `WorktreeSidebar.tsx`, adds localStorage persistence, and passes sorted arrays to both child components.

- [ ] **Step 1: Add sort logic with localStorage in WorktreeSidebar.tsx**

In `src/components/WorktreeSidebar.tsx`, after the existing `activeWorktrees` and `archivedWorktrees` filtering (lines 55-59), add the sorting logic:

```typescript
import { useState, useEffect, useCallback, useMemo, type FC } from 'react';

// ... existing imports ...

export const WorktreeSidebar: FC<WorktreeSidebarProps> = ({ /* existing props */ }) => {
  // ... existing code through line 59 ...

  // --- Drag-sort order persistence ---
  const workspacePath = currentWorkspace?.path || '';
  const storageKey = workspacePath ? `worktree-sort-order:${workspacePath}` : '';

  const [savedOrder, setSavedOrder] = useState<string[]>(() => {
    if (!storageKey) return [];
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Re-read localStorage when workspace changes
  useEffect(() => {
    if (!storageKey) { setSavedOrder([]); return; }
    try {
      const stored = localStorage.getItem(storageKey);
      setSavedOrder(stored ? JSON.parse(stored) : []);
    } catch {
      setSavedOrder([]);
    }
  }, [storageKey]);

  const updateSortOrder = useCallback((newOrder: string[]) => {
    setSavedOrder(newOrder);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newOrder));
    }
  }, [storageKey]);

  // Sort activeWorktrees by savedOrder, unknowns appended alphabetically
  const sortedActiveWorktrees = useMemo(() => {
    const orderMap = new Map(savedOrder.map((name, i) => [name, i]));
    return [...activeWorktrees].sort((a, b) => {
      const idxA = orderMap.get(a.name);
      const idxB = orderMap.get(b.name);
      if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
      if (idxA !== undefined) return -1;
      if (idxB !== undefined) return 1;
      const nameA = a.display_name || a.name;
      const nameB = b.display_name || b.name;
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });
  }, [activeWorktrees, savedOrder]);
```

- [ ] **Step 2: Pass sorted array and update callback to ExpandedSidebar**

In the `<ExpandedSidebar>` JSX in `WorktreeSidebar.tsx`, replace `activeWorktrees={activeWorktrees}` with sorted version and add the callback:

```typescript
  return (
    <ExpandedSidebar
      activeWorktrees={sortedActiveWorktrees}
      onSortOrderChange={updateSortOrder}
      // ... all other existing props unchanged ...
    />
  );
```

Do the same for `<CollapsedSidebar>`:

```typescript
    return (
      <CollapsedSidebar
        activeWorktrees={sortedActiveWorktrees}
        // ... all other existing props unchanged ...
      />
    );
```

- [ ] **Step 3: Remove alphabetical sort from ExpandedSidebar's WorktreeList**

In `src/components/worktree-sidebar/ExpandedSidebar.tsx`, the `WorktreeList` component (lines 611-618) currently sorts alphabetically. Remove that sort since the parent now provides pre-sorted data.

Replace:
```typescript
  // Sort active worktrees by display_name (or name) alphabetically
  const sortedActiveWorktrees = useMemo(() => {
    return [...activeWorktrees].sort((a, b) => {
      const nameA = a.display_name || a.name;
      const nameB = b.display_name || b.name;
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });
  }, [activeWorktrees]);
```

With:
```typescript
  // activeWorktrees is pre-sorted by WorktreeSidebar (user drag-order or alphabetical fallback)
  const sortedActiveWorktrees = activeWorktrees;
```

- [ ] **Step 4: Add onSortOrderChange prop to WorktreeList and ExpandedSidebar**

Add the prop to the `WorktreeList` component's type definition (line 567-583 in ExpandedSidebar.tsx):

```typescript
const WorktreeList: FC<{
  activeWorktrees: WorktreeListItem[];
  archivedWorktrees: WorktreeListItem[];
  // ... existing props ...
  onSortOrderChange: (newOrder: string[]) => void;  // ADD THIS
  // ... rest of existing props ...
}>
```

Thread it through from `ExpandedSidebar` to `WorktreeList`. In the ExpandedSidebar component's props interface area (it uses `WorktreeSidebarProps` extended with extras), add `onSortOrderChange` and pass it to `<WorktreeList>`.

In `ExpandedSidebar` function signature, find where `WorktreeList` is rendered (search for `<WorktreeList`) and add:
```typescript
  <WorktreeList
    // ... existing props ...
    onSortOrderChange={onSortOrderChange}
  />
```

- [ ] **Step 5: Verify the app builds**

```bash
pnpm run build
```

Expected: Build succeeds. Active worktrees render in alphabetical order (same as before, since no savedOrder exists yet).

- [ ] **Step 6: Commit**

```bash
git add src/components/WorktreeSidebar.tsx src/components/worktree-sidebar/ExpandedSidebar.tsx
git commit -m "refactor: lift worktree sort logic to WorktreeSidebar with localStorage persistence"
```

---

### Task 3: Add SortableWorktreeItem component with dnd-kit integration

**Files:**
- Create: `src/components/worktree-sidebar/SortableWorktreeItem.tsx`

This component wraps a single worktree row with `useSortable` from dnd-kit and adds a grip drag handle.

- [ ] **Step 1: Create SortableWorktreeItem component**

Create file `src/components/worktree-sidebar/SortableWorktreeItem.tsx`:

```tsx
import { type FC, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableWorktreeItemProps {
  id: string;
  children: ReactNode;
}

export const SortableWorktreeItem: FC<SortableWorktreeItemProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-stretch">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex items-center px-1 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none"
          tabIndex={-1}
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-3 h-3" />
        </button>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
};
```

Key decisions:
- `setActivatorNodeRef` on the grip button — only the handle triggers drag
- `touch-none` CSS on handle — prevents browser scroll interference during drag
- `isDragging` → `opacity: 0.4` on the original position item
- Children receive the existing worktree row content untouched

- [ ] **Step 2: Verify the app builds**

```bash
pnpm run build
```

Expected: Build succeeds (component is created but not yet used).

- [ ] **Step 3: Commit**

```bash
git add src/components/worktree-sidebar/SortableWorktreeItem.tsx
git commit -m "feat(sidebar): create SortableWorktreeItem component with grip drag handle"
```

---

### Task 4: Integrate dnd-kit into WorktreeList

**Files:**
- Modify: `src/components/worktree-sidebar/ExpandedSidebar.tsx:637-724`

This task wraps the active worktree list with `DndContext` + `SortableContext` and uses `SortableWorktreeItem` for each row.

- [ ] **Step 1: Add dnd-kit imports to ExpandedSidebar.tsx**

At the top of the file, add:

```typescript
import { useState as useDndState } from 'react'; // already imported, just noting
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { SortableWorktreeItem } from './SortableWorktreeItem';
```

- [ ] **Step 2: Add DndContext wrapping in WorktreeList component**

In the `WorktreeList` component, replace the rendering logic. The key changes are:

1. Add `sortedIds` local state for real-time drag reorder
2. Add sensor config with distance activation constraint
3. Wrap the list with `DndContext` + `SortableContext`
4. Wrap each worktree row with `SortableWorktreeItem`
5. Add `DragOverlay` for the dragged item preview

In the `WorktreeList` component body, after the existing `worktreesWithMatch` memo, add:

```typescript
  // Drag-sort state
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeWorktree = activeId ? activeWorktrees.find(w => w.name === activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const names = sortedActiveWorktrees.map(w => w.name);
    const oldIndex = names.indexOf(active.id as string);
    const newIndex = names.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(names, oldIndex, newIndex);
    onSortOrderChange(newOrder);
  };
```

Note: `sortedActiveWorktrees` here refers to the variable that was reassigned to `activeWorktrees` in Task 2 Step 3. For clarity in this dnd integration, it is the pre-sorted array from the parent.

Then update the JSX. Replace the existing list rendering block (lines 661-724, the `worktreesWithMatch.map(...)` block) to wrap it with dnd-kit:

```tsx
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedActiveWorktrees.map(w => w.name)}
            strategy={verticalListSortingStrategy}
          >
            {worktreesWithMatch.map(({ wt: worktree, matchResult }) => {
              const lockedBy = lockedWorktrees[worktree.name];
              const isLockedByOther = lockedBy && lockedBy !== currentWindowLabel;
              const isDeployed = worktree.name === occupation?.worktree_name;
              const canSelect = (!isLockedByOther || !isTauri) && !isDeployed;

              return (
                <SortableWorktreeItem key={worktree.name} id={worktree.name}>
                  <div
                    className={`py-2.5 pr-4 transition-all duration-150 border-l-2 ${isDeployed
                      ? 'border-transparent opacity-50 cursor-not-allowed'
                      : isLockedByOther && isTauri
                        ? 'border-transparent opacity-50 cursor-not-allowed'
                        : selectedWorktree?.name === worktree.name
                          ? 'bg-slate-700/30 border-blue-500 cursor-pointer'
                          : 'border-transparent hover:bg-slate-700/20 cursor-pointer'
                      }`}
                    onClick={() => {
                      if (longPressFiredRef.current) return;
                      if (canSelect) onSelectWorktree(worktree);
                    }}
                    onContextMenu={(e) => canSelect && onContextMenu(e, worktree)}
                    onTouchStart={(e) => canSelect && onTouchStart(e, worktree)}
                    onTouchEnd={onTouchEnd}
                    onTouchMove={onTouchMove}
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderIcon className={`w-4 h-4 ${isLockedByOther || isDeployed ? 'text-slate-500' : 'text-blue-400'}`} />
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-medium text-sm line-clamp-2 break-words flex-1">{highlightWorktreeName(worktree.display_name || worktree.name, matchResult)}</span>
                          </TooltipTrigger>
                          <TooltipContent side="right">{worktree.display_name ? `${worktree.display_name} (${worktree.name})` : worktree.name}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {isDeployed && (
                        <StatusBadge label={t('deploy.deployed')} tooltip={t('deploy.deployedTooltip')} tone="blue" />
                      )}
                      {isLockedByOther && !isDeployed && (
                        <StatusBadge label={t('sidebar.occupied')} tooltip={t('sidebar.occupiedTooltip')} tone="amber" />
                      )}
                      {worktree.projects.some(project => project.has_uncommitted) && !isLockedByOther && !isDeployed && (() => {
                        const tip = worktree.projects
                          .filter(project => project.has_uncommitted)
                          .map(project => t('sidebar.uncommittedTip', { name: project.name, count: project.uncommitted_count }))
                          .join('\n');
                        return (
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="shrink-0"><WarningIcon className="w-3.5 h-3.5 text-amber-500" /></span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="whitespace-pre">{tip}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5 pl-6">{t('sidebar.projects', { count: worktree.projects.length })}</div>
                  </div>
                </SortableWorktreeItem>
              );
            })}
          </SortableContext>

          <DragOverlay>
            {activeWorktree ? (
              <div className="bg-slate-800 border border-slate-600 rounded-md px-4 py-2.5 shadow-xl opacity-70">
                <div className="flex items-center gap-2.5">
                  <FolderIcon className="w-4 h-4 text-blue-400" />
                  <span className="font-medium text-sm">{activeWorktree.display_name || activeWorktree.name}</span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
```

Note the changes to the row styling:
- Removed `px-4` from the row div (left padding now comes from the grip handle in `SortableWorktreeItem`)
- Changed to `pr-4` for right padding only
- All existing click/touch/context-menu handlers remain unchanged on the inner div

- [ ] **Step 3: Verify the app builds**

```bash
pnpm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/worktree-sidebar/ExpandedSidebar.tsx
git commit -m "feat(sidebar): integrate dnd-kit drag-sort into WorktreeList"
```

---

### Task 5: Manual testing and visual polish

**Files:**
- Possibly modify: `src/components/worktree-sidebar/SortableWorktreeItem.tsx`
- Possibly modify: `src/components/worktree-sidebar/ExpandedSidebar.tsx`

- [ ] **Step 1: Start dev and test**

```bash
pnpm run build && npm run tauri dev
```

Test the following:
1. Drag a worktree by the grip handle — it should reorder and persist after refresh
2. Click a worktree row (not the handle) — it should select normally
3. Right-click / long-press a worktree — context menu should appear normally
4. Switch workspace — order should be independent per workspace
5. Create a new worktree — it should appear at the bottom
6. Collapse sidebar — worktrees should follow the same custom order
7. Search — drag should still work while search highlight is active

- [ ] **Step 2: Fix any visual alignment issues**

If the grip handle causes alignment issues with the existing left border-l-2 indicator, adjust padding/margin. The grip handle should align flush left, and the worktree content should maintain the same visual position as before.

Check that the `border-l-2` on the selected item still displays correctly — it's on the inner div inside `SortableWorktreeItem`. If it clips, move it to the outer div or adjust.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(sidebar): visual polish for drag-sort alignment"
```

---

## Self-Review Checklist

### Spec coverage:
- ✅ dnd-kit dependencies installed (Task 1)
- ✅ Sort logic lifted to WorktreeSidebar with localStorage (Task 2)
- ✅ savedOrder key format: `worktree-sort-order:${workspacePath}` (Task 2)
- ✅ New worktrees append to end alphabetically (Task 2 sort logic)
- ✅ Deleted worktrees filtered naturally (Task 2 sort logic)
- ✅ DndContext scoped inside WorktreeList only (Task 4)
- ✅ SortableWorktreeItem with grip handle (Task 3)
- ✅ DragOverlay with folder icon + name + opacity-70 (Task 4)
- ✅ CollapsedSidebar receives pre-sorted data (Task 2)
- ✅ Archived worktrees keep alphabetical sort (not touched)
- ✅ Search unaffected (no filter, drag works during highlight)
- ✅ PointerSensor with distance: 5 constraint (Task 4)
- ✅ Real-time visual update during drag + persist on drop (Task 4 — `onDragEnd` calls `onSortOrderChange` which updates state + localStorage)
- ✅ Sort identifier uses `name` (Task 2, Task 4)

### Placeholder scan: None found.

### Type consistency:
- `onSortOrderChange: (newOrder: string[]) => void` — consistent across Task 2 (defined in WorktreeSidebar) and Task 4 (used in WorktreeList)
- `SortableWorktreeItem` props: `id: string` + `children: ReactNode` — consistent between Task 3 (definition) and Task 4 (usage)
- `savedOrder: string[]` — consistent storage format throughout
