// src/terminal/types.ts

export interface TerminalTheme {
  background: string
  foreground: string
  cursor: string
  cursorAccent: string
  selectionBackground: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}

export interface TerminalOptions {
  fontSize: number
  fontFamily: string
  theme?: TerminalTheme
  scrollback: number
  cursorStyle: 'block' | 'bar' | 'underline'
  cursorBlink: boolean
  linkHandler?: (uri: string) => void
}

export interface TerminalDimensions {
  cols: number
  rows: number
}

export interface Disposable {
  dispose(): void
}

export interface TerminalAdapter {
  mount(container: HTMLElement, options: TerminalOptions): Promise<void>
  dispose(): void
  write(data: string): void
  onInput(callback: (data: string) => void): Disposable
  onKeyEvent(callback: (event: KeyboardEvent) => boolean): Disposable
  readonly cols: number
  readonly rows: number
  fit(): TerminalDimensions
  resize(cols: number, rows: number): void
  focus(): void
  blur(): void
  clear(): void
  selectAll(): void
  refresh(start: number, end: number): void
  getSelection(): string
  hasSelection(): boolean
  clearSelection(): void
  scrollLines(lines: number): void
  scrollToBottom(): void
  setMobileKeyboardPolicy(mode: 'none' | 'text'): void
}

export interface TerminalAdapterFactory {
  create(): TerminalAdapter
}
