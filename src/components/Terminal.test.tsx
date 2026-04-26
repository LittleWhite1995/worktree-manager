import { render, waitFor, act } from '@testing-library/react';
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

  it('blocks Alt+V from reaching xterm when voice is active', async () => {
    const { rerender } = render(<Terminal cwd="F:/repo" visible voiceStatus="idle" />);

    await waitFor(() => {
      expect(keyHandler).not.toBeNull();
    });

    const altV = new KeyboardEvent('keydown', {
      code: 'KeyV',
      key: 'v',
      altKey: true,
    });

    // idle → key reaches xterm (voice shortcut not active)
    expect(keyHandler?.(altV)).toBe(true);

    rerender(<Terminal cwd="F:/repo" visible voiceStatus="ready" />);
    // ready → key is consumed so the voice shortcut can fire
    expect(keyHandler?.(altV)).toBe(false);

    rerender(<Terminal cwd="F:/repo" visible voiceStatus="recording" />);
    // recording → still blocked
    expect(keyHandler?.(altV)).toBe(false);

    rerender(<Terminal cwd="F:/repo" visible voiceStatus="error" />);
    // error → key reaches xterm again
    expect(keyHandler?.(altV)).toBe(true);
  });

  it('fallback clipboard read fires after 40ms when no native paste event arrives', async () => {
    const clipboardText = 'hello world';
    // jsdom does not implement navigator.clipboard — define a minimal mock.
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: vi.fn().mockResolvedValue(clipboardText) },
    });

    render(<Terminal cwd="F:/repo" visible />);

    // Wait for the component to finish initialising (real timers).
    await waitFor(() => {
      expect(keyHandler).not.toBeNull();
    });

    // Switch to fake timers now that the component is fully ready.
    vi.useFakeTimers({ shouldAdvanceTime: false });

    const ctrlV = new KeyboardEvent('keydown', {
      code: 'KeyV',
      key: 'v',
      ctrlKey: true,
    });

    // Ctrl+V allows the native paste event to fire first (returns true).
    expect(keyHandler?.(ctrlV)).toBe(true);

    // No native paste arrives — after 40ms the fallback clipboard read fires.
    await act(async () => {
      vi.advanceTimersByTime(40);
      // Flush the clipboard.readText() promise chain.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockAdapter.paste).toHaveBeenCalledTimes(1);
    expect(mockAdapter.paste).toHaveBeenCalledWith(clipboardText, expect.anything());

    vi.useRealTimers();
  });
});
