# Xterm.js Add-on 集成设计

## 概述

为 worktree-manager 内置终端集成三个 xterm.js add-on，提升渲染性能、CJK 字符显示和终端内搜索能力。

## 目标

1. **WebGL Renderer** — GPU 加速渲染，大幅提升终端吞吐和帧率
2. **Unicode11** — 修正 CJK 宽字符的宽度计算，解决中日韩字符对齐问题
3. **Search** — 终端内容搜索，支持快捷键和工具栏按钮触发

## 架构决策

采用**分层方案**：

- **渲染层 add-on**（WebGL、Unicode11）封装在 `XtermAdapter` 内部，对 `TerminalAdapter` 接口透明，外部无感知
- **交互层 add-on**（Search）的底层实例在 `XtermAdapter` 中管理，搜索方法通过 `TerminalAdapter` 接口暴露，UI 作为独立的 `TerminalSearchBar` React 组件

这样做的理由：WebGL 和 Unicode11 是"安装即忘"的优化，不需要 UI 交互；Search 有独立的 UI 生命周期（展开/收起/输入/导航），天然适合独立组件。分离也避免 Terminal.tsx（已 980+ 行）继续膨胀。

## 依赖

新增 npm 包：

| 包名 | 版本 | 用途 |
|------|------|------|
| `@xterm/addon-webgl` | ^0.19.0 | GPU 加速渲染 |
| `@xterm/addon-unicode11` | ^0.9.0 | CJK 字符宽度修正 |
| `@xterm/addon-search` | ^0.16.0 | 终端内容搜索 |

**版本兼容性**：三个 add-on 均来自 xterm.js monorepo，与 `@xterm/xterm@6.0.0` 同属 6.x 发布周期，无 peerDependencies 声明，兼容性已确认。

## 详细设计

### 1. WebGL Renderer

#### 加载时机

在 `XtermAdapter.mount()` 中，`term.open(container)` 之后加载：

```
term.open(container)
→ loadAddon(Unicode11Addon)
→ term.unicode.activeVersion = '11'
→ loadAddon(WebglAddon)         // 需要 open 后才能获取 GL 上下文
→ loadAddon(OscParser)          // 现有 shell integration
→ ...
```

#### Context Loss 处理

WebGL 上下文可能丢失（GPU 压力、系统休眠等）。处理策略：

1. 监听 `webglAddon.onContextLoss()`
2. dispose WebglAddon 实例（自动回退到默认 canvas 渲染器）
3. 通过 `TerminalOptions.onRendererFallback` 回调通知上层
4. 上层（TerminalPanel）显示黄色 toast 提示用户，3 秒自动消失

#### Fallback 策略

如果 WebGL 初始化失败（例如浏览器不支持 WebGL2），catch 异常后静默使用默认 canvas 渲染器，同时触发 `onRendererFallback` 回调显示 toast。

#### XtermAdapter 内部变更

```typescript
private webglAddon: WebglAddon | null = null

// mount() 中：
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

// dispose() 中：
this.webglAddon?.dispose()
this.webglAddon = null
```

### 2. Unicode11

#### 加载方式

在 `mount()` 中，WebGL 之前加载：

```typescript
import { Unicode11Addon } from '@xterm/addon-unicode11'

const unicode11 = new Unicode11Addon()
term.loadAddon(unicode11)
term.unicode.activeVersion = '11'
```

无配置项，无需 dispose 处理（随 Terminal 一起销毁）。

#### 效果

- `fullwidth` 字符（中文、日文汉字等）正确占用 2 列宽度
- 修正 emoji 和特殊 Unicode 字符的光标定位

### 3. Search

#### Adapter 接口扩展

`TerminalAdapter` 接口新增三个可选方法：

```typescript
interface SearchOptions {
  caseSensitive?: boolean
  regex?: boolean
}

interface TerminalAdapter {
  // ... 现有方法

  findNext?(query: string, options?: SearchOptions): boolean
  findPrevious?(query: string, options?: SearchOptions): boolean
  clearSearch?(): void
}
```

返回值 `boolean` 表示是否找到匹配项。

#### XtermAdapter 实现

```typescript
private searchAddon: SearchAddon | null = null

// mount() 中：
const searchAddon = new SearchAddon()
term.loadAddon(searchAddon)
this.searchAddon = searchAddon

// 方法实现：
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

#### TerminalHandle 扩展

Terminal.tsx 的 `useImperativeHandle` 暴露搜索方法：

```typescript
export interface TerminalHandle {
  copyContent: () => Promise<void>
  scrollToCommand: (direction: 'prev' | 'next') => void
  findNext: (query: string, options?: SearchOptions) => boolean
  findPrevious: (query: string, options?: SearchOptions) => boolean
  clearSearch: () => void
}
```

#### 快捷键拦截

**关键约束**：xterm.js 只支持一个 `attachCustomKeyEventHandler`（即 adapter 的 `onKeyEvent`）。Ctrl/Cmd+F 拦截必须**合并到现有的 key handler 中**，而非注册第二个 handler（否则会覆盖掉 Alt+V 语音输入拦截）。

在 Terminal.tsx 现有的 `onKeyEvent` 回调中增加 Ctrl/Cmd+F 分支：

```typescript
// Terminal.tsx initPty() 中，替换现有的 onKeyEvent 调用（约 L518）
const keyDisposable = adapter.onKeyEvent((e) => {
  // 拦截 Cmd+F / Ctrl+F，触发搜索
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
    onSearchRequestedRef.current?.()
    return false
  }
  // 现有的 Alt+V 拦截（语音输入）
  if (e.altKey && e.code === 'KeyV') return false
  return true
})
```

**Stale closure 防护**：`onSearchRequested` 回调必须使用 `useRef` 模式（与现有的 `onShellIntDetectedRef`、`onCwdChangedRef` 一致），避免 mount 时闭包捕获 stale 引用：

```typescript
// Terminal.tsx 中新增：
const onSearchRequestedRef = useRef(onSearchRequested)
onSearchRequestedRef.current = onSearchRequested
```

Terminal.tsx 新增 prop: `onSearchRequested?: () => void`

#### TerminalSearchBar 组件

新建 `src/components/TerminalSearchBar.tsx`，VSCode 风格浮动搜索栏。

**Props：**

```typescript
interface TerminalSearchBarProps {
  onFindNext: (query: string, options: SearchOptions) => boolean
  onFindPrevious: (query: string, options: SearchOptions) => boolean
  onClose: () => void
}
```

**功能：**

- 位置：终端区域右上角浮动，`absolute top-2 right-2 z-30`（高于终端内容和现有 toast 的 z-20）
- 输入框 + 5 个按钮：大小写 `Aa`、正则 `.*`、上一个 `↑`、下一个 `↓`、关闭 `×`
- 快捷键：`Enter` → findNext，`Shift+Enter` → findPrevious，`Escape` → 关闭
- **Escape 处理**：必须调用 `e.stopPropagation()` 阻止冒泡，否则 Escape 会传递到 xterm 并发送 `\x1b` 到 PTY
- 输入时 debounce 150ms 自动搜索（调用 findNext）；正则模式下 debounce 增至 300ms（避免不完整的正则语法导致频繁报错）
- 关闭时调用 `clearSearch()` 清除高亮，焦点返回终端

**样式：**

与现有 UI 风格一致：`bg-slate-800 border border-slate-600 rounded-lg shadow-lg`，按钮使用 `hover:bg-slate-700`。

#### 数据流

```
触发（Ctrl/Cmd+F 或点击搜索按钮）
  → Terminal.tsx: onSearchRequested 回调
  → TerminalPanel: searchOpen = true
  → 渲染 <TerminalSearchBar /> 在当前 active 终端的容器内
  → 用户输入 query
  → TerminalSearchBar 通过 terminalRefsMap.get(activeTab).findNext(query) 搜索
  → Escape / 点击关闭
  → TerminalPanel: searchOpen = false
  → 调用 terminalRefsMap.get(activeTab).clearSearch()
  → 焦点返回终端
```

#### 搜索栏工具按钮

TerminalPanel 标题栏新增搜索按钮：

- 图标：`lucide-react` 的 `Search` 图标
- 位置：shell integration ↑↓ 按钮之后、语音按钮之前
- 搜索栏展开时按钮高亮（`text-blue-400`）
- 点击 toggle 搜索栏展开/收起
- 按钮始终显示（不需要 shell integration 前提条件）

### 4. WebGL Fallback Toast

复用现有的 toast 模式（与 voice warning/error toast 一致）：

- TerminalPanel 中新增 `showGpuFallback` state
- Terminal.tsx 通过 `onRendererFallback` prop 向上传递
- 黄色 toast，3 秒自动消失
- 文案通过 i18n key：`terminal.gpuFallback`

**完整 prop 传递链路：**

```
TerminalPanel (showGpuFallback state + toast 渲染)
  → Terminal (新增 prop: onRendererFallback)
    → adapter.mount(container, { ..., onRendererFallback })
      → WebglAddon onContextLoss / catch → 调用回调
```

TerminalProps 接口需要新增：

```typescript
interface TerminalProps {
  cwd: string
  visible: boolean
  clientId?: string
  onShellIntegrationDetected?: () => void
  onCwdChanged?: (cwd: string) => void
  onSearchRequested?: () => void         // 新增
  onRendererFallback?: () => void        // 新增
}
```

## TerminalOptions 变更

```typescript
export interface TerminalOptions {
  fontSize: number
  fontFamily: string
  theme?: TerminalTheme
  scrollback: number
  cursorStyle: 'block' | 'bar' | 'underline'
  cursorBlink: boolean
  linkHandler?: (uri: string) => void
  onRendererFallback?: () => void  // 新增
}
```

## i18n

新增 key（zh-CN / en-US）：

| Key | zh-CN | en-US |
|-----|-------|-------|
| `terminal.search` | 搜索 | Search |
| `terminal.searchPlaceholder` | 搜索终端内容... | Search terminal... |
| `terminal.caseSensitive` | 区分大小写 | Case sensitive |
| `terminal.useRegex` | 正则表达式 | Use regex |
| `terminal.noResults` | 无匹配结果 | No results |
| `terminal.closeSearch` | 关闭搜索 | Close search |
| `terminal.gpuFallback` | GPU 渲染不可用，已切换到软件渲染 | GPU rendering unavailable, switched to software rendering |

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `package.json` | 修改 | 新增 3 个 @xterm add-on 依赖 |
| `src/terminal/types.ts` | 修改 | TerminalAdapter 增加搜索方法，TerminalOptions 增加 onRendererFallback |
| `src/terminal/adapters/xterm.ts` | 修改 | 加载 WebGL、Unicode11、Search add-on，实现搜索方法 |
| `src/components/TerminalSearchBar.tsx` | 新建 | 浮动搜索栏组件 |
| `src/components/Terminal.tsx` | 修改 | 拦截 Ctrl/Cmd+F，暴露搜索方法，传递 onRendererFallback/onSearchRequested |
| `src/components/TerminalPanel.tsx` | 修改 | 搜索按钮、搜索栏渲染位置、fallback toast、searchOpen 状态 |
| `src/locales/zh-CN.json` | 修改 | 新增 7 个 i18n key |
| `src/locales/en-US.json` | 修改 | 新增 7 个 i18n key |

## 边界行为

- **切换 terminal tab 时**：TerminalPanel 在 `activeTerminalTab` 变化时（通过 useEffect），将 `searchOpen` 设为 false，并对前一个 tab 调用 `clearSearch()`
- **终端不可见时**（worktree 切换、面板收起）：不影响搜索状态，重新可见时保持原样
- **WebGL context loss 后再次打开新终端**：新终端仍尝试加载 WebGL，不记忆上次失败
- **WebGL dispose 时序**：`onContextLoss` 回调中先 dispose WebglAddon 再触发 `onRendererFallback`，确保回调执行时渲染已回退到 canvas

## 不在范围内

- 搜索结果计数显示（如 "3/15"）— SearchAddon API 不直接提供总匹配数，实现成本高，后续按需添加
- WebGL 渲染器用户可配置开关 — 默认启用，仅在失败时自动降级
- 终端主题中的搜索高亮颜色自定义 — 使用 SearchAddon 默认高亮色
