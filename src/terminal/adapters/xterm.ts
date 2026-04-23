// src/terminal/adapters/xterm.ts

import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

import type {
  TerminalAdapter,
  TerminalOptions,
  TerminalDimensions,
  Disposable,
} from '../types'
import { OscParser } from '../shell-integration/osc-parser'
import { CommandDetection } from '../shell-integration/command-detection'
import { CommandDecorationAddon } from '../shell-integration/command-decoration'
import type { CommandInfo, Unsubscribe } from '../shell-integration/types'

const XTERM_THEME = {
  background: '#0f172a',
  foreground: '#cbd5e1',
  cursor: '#cbd5e1',
  cursorAccent: '#0f172a',
  selectionBackground: '#334155',
  black: '#1e293b',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#f1f5f9',
  brightBlack: '#475569',
  brightRed: '#fca5a5',
  brightGreen: '#86efac',
  brightYellow: '#fde047',
  brightBlue: '#93c5fd',
  brightMagenta: '#d8b4fe',
  brightCyan: '#67e8f9',
  brightWhite: '#ffffff',
} as const

export class XtermAdapter implements TerminalAdapter {
  private term: Terminal | null = null
  private fitAddon: FitAddon | null = null
  private container: HTMLElement | null = null
  private mobileKeyboardInitialized = false
  private dblclickHandler: (() => void) | null = null
  private oscParser: OscParser | null = null
  private commandDetection: CommandDetection | null = null
  private commandDecoration: CommandDecorationAddon | null = null

  get cols(): number {
    return this.term?.cols ?? 80
  }

  get rows(): number {
    return this.term?.rows ?? 24
  }

  async mount(container: HTMLElement, options: TerminalOptions): Promise<void> {
    const term = new Terminal({
      theme: options.theme ? { ...XTERM_THEME, ...options.theme } : XTERM_THEME,
      fontSize: options.fontSize,
      fontFamily: options.fontFamily,
      cursorBlink: options.cursorBlink,
      cursorStyle: options.cursorStyle,
      scrollback: options.scrollback,
      convertEol: true,
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    if (options.linkHandler) {
      const handler = options.linkHandler
      const webLinksAddon = new WebLinksAddon((_event, uri) => handler(uri))
      term.loadAddon(webLinksAddon)
    }

    term.open(container)

    this.term = term
    this.fitAddon = fitAddon
    this.container = container

    // Shell integration: passive OSC 633 parsing
    this.oscParser = new OscParser()
    term.loadAddon(this.oscParser)
    this.commandDetection = new CommandDetection(this.oscParser, term)
    this.commandDecoration = new CommandDecorationAddon(this.commandDetection)
    term.loadAddon(this.commandDecoration)
  }

  dispose(): void {
    if (this.dblclickHandler && this.container) {
      this.container.removeEventListener('dblclick', this.dblclickHandler)
      this.dblclickHandler = null
    }
    this.commandDecoration?.dispose()
    this.commandDecoration = null
    this.commandDetection?.dispose()
    this.commandDetection = null
    this.oscParser?.dispose()
    this.oscParser = null
    this.term?.dispose()
    this.term = null
    this.fitAddon = null
    this.container = null
  }

  write(data: string): void {
    this.term?.write(data)
  }

  onInput(callback: (data: string) => void): Disposable {
    const disposable = this.term?.onData(callback)
    return { dispose: () => disposable?.dispose() }
  }

  onKeyEvent(callback: (event: KeyboardEvent) => boolean): Disposable {
    this.term?.attachCustomKeyEventHandler(callback)
    return {
      dispose: () => {
        // xterm.js does not support removing a custom key handler,
        // so replace with a pass-through on dispose.
        this.term?.attachCustomKeyEventHandler(() => true)
      },
    }
  }

  fit(): TerminalDimensions {
    try {
      this.fitAddon?.fit()
    } catch {
      // fit() can throw if container has zero dimensions
    }
    return { cols: this.cols, rows: this.rows }
  }

  resize(cols: number, rows: number): void {
    this.term?.resize(cols, rows)
  }

  focus(): void {
    this.term?.focus()
  }

  blur(): void {
    this.term?.blur()
  }

  clear(): void {
    this.term?.clear()
  }

  selectAll(): void {
    this.term?.selectAll()
  }

  refresh(start: number, end: number): void {
    this.term?.refresh(start, end)
  }

  getSelection(): string {
    return this.term?.getSelection() ?? ''
  }

  hasSelection(): boolean {
    return this.term?.hasSelection() ?? false
  }

  clearSelection(): void {
    this.term?.clearSelection()
  }

  scrollLines(lines: number): void {
    this.term?.scrollLines(lines)
  }

  scrollToBottom(): void {
    this.term?.scrollToBottom()
  }

  setMobileKeyboardPolicy(mode: 'none' | 'text'): void {
    if (!this.container) return
    const textarea = this.container.querySelector(
      '.xterm-helper-textarea',
    ) as HTMLTextAreaElement | null
    if (!textarea) return

    textarea.inputMode = mode

    if (mode === 'none' && !this.mobileKeyboardInitialized) {
      this.mobileKeyboardInitialized = true
      this.dblclickHandler = () => {
        textarea.inputMode = 'text'
        textarea.focus()
        textarea.addEventListener('blur', () => {
          textarea.inputMode = 'none'
        }, { once: true })
      }
      this.container.addEventListener('dblclick', this.dblclickHandler)
    }
  }

  /** Get detected commands (shell integration feature, not part of TerminalAdapter interface) */
  getCommands(): readonly CommandInfo[] {
    return this.commandDetection?.commands ?? []
  }

  /** Subscribe to command finished events */
  onCommandFinished(callback: (cmd: CommandInfo) => void): Unsubscribe | undefined {
    return this.commandDetection?.onCommandFinished.on(callback)
  }

  /** Get the current working directory reported by the shell via OSC 7/633 */
  getShellCwd(): string | undefined {
    return this.commandDetection?.currentCwd
  }
}
