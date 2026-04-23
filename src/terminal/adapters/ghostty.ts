// src/terminal/adapters/ghostty.ts

import type { Terminal as GhosttyTerminal, FitAddon as GhosttyFitAddon } from 'ghostty-web'
import type {
  TerminalAdapter,
  TerminalOptions,
  TerminalDimensions,
  Disposable,
} from '../types'

export class GhosttyAdapter implements TerminalAdapter {
  // Shared WASM init promise — prevents race condition when multiple terminals mount concurrently.
  // First caller creates the promise, subsequent callers await the same one.
  private static wasmInitPromise: Promise<void> | null = null
  private term: GhosttyTerminal | null = null
  private fitAddon: GhosttyFitAddon | null = null
  private container: HTMLElement | null = null

  get cols(): number { return this.term?.cols ?? 80 }
  get rows(): number { return this.term?.rows ?? 24 }

  async mount(container: HTMLElement, options: TerminalOptions): Promise<void> {
    // One-time WASM initialization (race-safe via shared promise)
    if (!GhosttyAdapter.wasmInitPromise) {
      GhosttyAdapter.wasmInitPromise = import('ghostty-web').then(m => m.init())
    }
    await GhosttyAdapter.wasmInitPromise

    const { Terminal } = await import('ghostty-web')
    const term = new Terminal({
      fontSize: options.fontSize,
      fontFamily: options.fontFamily,
      cursorBlink: options.cursorBlink,
      cursorStyle: options.cursorStyle,
      scrollback: options.scrollback,
      convertEol: true,
      ...(options.theme ? { theme: options.theme } : {}),
    })

    // FitAddon — directly exported from ghostty-web
    const { FitAddon } = await import('ghostty-web')
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    this.fitAddon = fitAddon

    // NOTE: options.linkHandler is not wired here. ghostty-web has built-in link detection
    // (UrlRegexProvider + OSC8LinkProvider) via registerLinkProvider — no xterm.js-style
    // WebLinksAddon. Links are clickable natively; the caller's linkHandler callback is unused.

    term.open(container)

    this.term = term
    this.container = container
  }

  dispose(): void {
    this.term?.dispose()
    this.term = null
    this.fitAddon = null
    this.container = null
  }

  write(data: string): void { this.term?.write(data) }

  onInput(callback: (data: string) => void): Disposable {
    const disposable = this.term?.onData(callback)
    return { dispose: () => disposable?.dispose() }
  }

  onKeyEvent(callback: (event: KeyboardEvent) => boolean): Disposable {
    if (this.term?.attachCustomKeyEventHandler) {
      this.term.attachCustomKeyEventHandler(callback)
      return {
        dispose: () => this.term?.attachCustomKeyEventHandler(() => true),
      }
    }
    return { dispose: () => {} }
  }

  fit(): TerminalDimensions {
    try { this.fitAddon?.fit() } catch { /* zero-dimension container */ }
    return { cols: this.cols, rows: this.rows }
  }

  resize(cols: number, rows: number): void { this.term?.resize(cols, rows) }
  focus(): void { this.term?.focus() }
  blur(): void { this.term?.blur() }
  clear(): void { this.term?.clear() }
  selectAll(): void { this.term?.selectAll() }
  refresh(_start: number, _end: number): void {
    // ghostty-web Terminal does not expose refresh() — rendering is handled
    // internally by its Canvas render loop with dirty-row tracking.
  }

  getSelection(): string { return this.term?.getSelection() ?? '' }
  hasSelection(): boolean { return this.term?.hasSelection() ?? false }
  clearSelection(): void { this.term?.clearSelection() }

  scrollLines(lines: number): void { this.term?.scrollLines(lines) }
  scrollToBottom(): void { this.term?.scrollToBottom() }

  // ghostty-web uses Canvas rendering — may not have a textarea element.
  // Unlike XtermAdapter, double-tap-to-open-keyboard is not implemented here
  // because there is no persistent textarea to attach the dblclick/blur cycle to.
  setMobileKeyboardPolicy(mode: 'none' | 'text'): void {
    if (!this.container) return
    const textarea = this.container.querySelector('textarea') as HTMLTextAreaElement | null
    if (textarea) {
      textarea.inputMode = mode
    }
  }
}
