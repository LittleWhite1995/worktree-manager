/// <reference types="vite/client" />

// Stub declarations for ghostty-web — package not yet installed (Task 5).
// These prevent tsc errors until `npm install ghostty-web` is run.
declare module 'ghostty-web' {
  export function init(): Promise<void>
  export class Terminal {
    cols: number
    rows: number
    constructor(options?: Record<string, unknown>)
    open(container: HTMLElement): void
    dispose(): void
    write(data: string): void
    resize(cols: number, rows: number): void
    focus(): void
    blur(): void
    clear(): void
    selectAll(): void
    refresh?(start: number, end: number): void
    getSelection(): string
    hasSelection(): boolean
    clearSelection(): void
    scrollLines(lines: number): void
    scrollToBottom(): void
    onData(callback: (data: string) => void): { dispose(): void }
    attachCustomKeyEventHandler?(handler: (event: KeyboardEvent) => boolean): void
    loadAddon(addon: unknown): void
  }
  export class FitAddon {
    fit(): void
    dispose(): void
  }
  export class WebLinksAddon {
    constructor(handler: (event: MouseEvent, uri: string) => void)
  }
}
declare module 'ghostty-web/lib/addons/fit' {
  export class FitAddon {
    fit(): void
    dispose(): void
  }
}
declare module 'ghostty-web/lib/addons/web-links' {
  export class WebLinksAddon {
    constructor(handler: (event: MouseEvent, uri: string) => void)
  }
}
