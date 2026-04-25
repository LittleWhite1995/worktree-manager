import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Terminal } from './Terminal';

const callBackend = vi.hoisted(() => vi.fn());
const mockWsManager = vi.hoisted(() => ({
  isConnected: vi.fn(() => true),
  subscribePty: vi.fn(),
  unsubscribePty: vi.fn(),
  writePty: vi.fn(),
  onConnectionStateChange: vi.fn(() => () => {}),
}));

let keyHandler: ((event: KeyboardEvent) => boolean) | null = null;

const mockAdapter = {
  cols: 80,
  rows: 24,
  mount: vi.fn(async () => {}),
  dispose: vi.fn(),
  write: vi.fn(),
  paste: vi.fn(),
  onInput: vi.fn(() => ({ dispose: vi.fn() })),
  onKeyEvent: vi.fn((callback: (event: KeyboardEvent) => boolean) => {
    keyHandler = callback;
    return { dispose: vi.fn() };
  }),
  fit: vi.fn(() => ({ cols: 80, rows: 24 })),
  resize: vi.fn(),
  focus: vi.fn(),
  blur: vi.fn(),
  clear: vi.fn(),
  selectAll: vi.fn(),
  refresh: vi.fn(),
  getSelection: vi.fn(() => ''),
  hasSelection: vi.fn(() => false),
  clearSelection: vi.fn(),
  scrollLines: vi.fn(),
  scrollToBottom: vi.fn(),
  setMobileKeyboardPolicy: vi.fn(),
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../lib/backend', () => ({
  callBackend,
  isTauri: () => false,
  openLink: vi.fn(),
  getPlatform: () => 'windows',
}));

vi.mock('../lib/websocket', () => ({
  getWebSocketManager: () => mockWsManager,
}));

vi.mock('../terminal', () => ({
  TerminalRegistry: {
    create: () => mockAdapter,
  },
}));

describe('Terminal', () => {
  beforeEach(() => {
    keyHandler = null;
    vi.clearAllMocks();
    callBackend.mockImplementation(async (command: string) => {
      if (command === 'pty_exists') return false;
      return undefined;
    });

    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve() },
    });

    // Minimal browser polyfills used by the component during init.
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    } as typeof ResizeObserver;

    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      return window.setTimeout(() => cb(performance.now()), 0);
    }) as typeof requestAnimationFrame;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows native paste shortcuts so the paste event can fire', async () => {
    render(<Terminal cwd="F:/repo" visible />);

    await waitFor(() => {
      expect(mockAdapter.onKeyEvent).toHaveBeenCalled();
      expect(keyHandler).not.toBeNull();
    });

    const ctrlV = new KeyboardEvent('keydown', {
      code: 'KeyV',
      key: 'v',
      ctrlKey: true,
    });

    expect(keyHandler?.(ctrlV)).toBe(true);

    const shiftInsert = new KeyboardEvent('keydown', {
      code: 'Insert',
      key: 'Insert',
      shiftKey: true,
    });

    expect(keyHandler?.(shiftInsert)).toBe(true);
  });
});
