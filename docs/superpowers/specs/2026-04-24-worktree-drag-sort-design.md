# Worktree Drag-Sort Design Spec

## 概述

为左侧活动工作区列表添加拖拽排序功能。当前列表按名字字母排序，改为用户可自定义拖拽排序，新添加的工作区默认排在末尾。排序顺序按 workspace 隔离存储在 localStorage 中。

## 依赖

- `@dnd-kit/core` — 拖拽引擎
- `@dnd-kit/sortable` — 列表排序预设
- `@dnd-kit/utilities` — CSS transform 工具

## 数据流

```
backend list_worktrees → activeWorktrees[]
                              ↓
                    localStorage 读取 savedOrder (worktree name 数组)
                              ↓
                    排序逻辑：按 savedOrder 排列，未在 savedOrder 中的追加到末尾（按名字字母排序）
                              ↓
                    渲染（dnd-kit 包裹）
                              ↓
                    用户拖拽 → 实时视觉更新 → onDragEnd 持久化到 localStorage
```

## 持久化

- **localStorage key**: `worktree-sort-order:${workspacePath}`
- **value**: `string[]`，worktree `name` 列表（有序）
- `workspacePath` 使用 backend 返回的规范化路径，不做额外处理

### 为什么用 `name` 而非 `path` 或 `display_name`

- `name` 是 worktree 的目录名，在整个 codebase 中作为唯一标识使用（`key={worktree.name}`、`lockedWorktrees[worktree.name]` 等）
- `display_name` 是可选别名，可独立变更
- `path` 是绝对路径，冗余且不稳定
- 如果用户在 app 外重命名 worktree 目录，该 worktree 会丢失排序位置，以新工作区身份追加到末尾。这是可接受的行为。

## 新增/删除工作区处理

- **新增**：不在 savedOrder 中 → 追加到末尾（多个新增之间按名字字母排序）
- **删除**：savedOrder 中的孤立条目在渲染时自然被忽略，无需主动清理

## 组件改造

### 排序逻辑位置

排序逻辑提升到 `WorktreeSidebar.tsx`，使 `ExpandedSidebar` 和 `CollapsedSidebar` 共享同一排序结果。WorktreeSidebar 已持有 `currentWorkspace` prop，可构造 localStorage key。

### ExpandedSidebar — WorktreeList

- `DndContext` + `SortableContext` 包裹工作区列表，**作用域仅在 WorktreeList 内**，不包裹整个 sidebar（避免与 sidebar resize 拖拽冲突）
- 提取 `SortableWorktreeItem` 组件封装单个可拖拽项
- 每项左侧添加 **grip 拖拽手柄**（GripVertical icon），仅手柄区域触发拖拽
  - 解决拖拽与现有 long-press 右键菜单（500ms）的冲突
  - 点击行其他区域正常触发 worktree 选择
- 组件维护本地 `sortedIds` 状态数组
  - 拖拽过程中实时更新视觉顺序（`onDragOver` + `arrayMove`）
  - `onDragEnd` 时持久化到 localStorage
  - 无 savedOrder 时，回退到字母排序作为初始值

### DragOverlay

- 渲染简化版 worktree 行：folder icon + worktree 名称 + 关键状态 badge
- 样式与原行一致，添加 `opacity-70` 半透明效果
- 原位置显示占位指示线

### CollapsedSidebar

- 不加 dnd-kit，不支持拖拽操作
- 从 WorktreeSidebar 接收已排序的 `activeWorktrees`，按序渲染

### 归档工作区

- 保持现有字母排序，不支持拖拽

### 搜索

- 搜索只高亮不过滤列表，拖拽不受影响，无需特殊处理

## 触摸设备

- 拖拽仅通过 grip 手柄触发，与行上的 touch/click/long-press 完全隔离
- dnd-kit 的 `PointerSensor` 作用于手柄，`activationConstraint: { distance: 5 }` 防止意外触发

## 未来增强（不在本次范围）

- 重置为字母排序的快捷操作（context menu 或 heading 按钮）
- 折叠模式下的拖拽支持
