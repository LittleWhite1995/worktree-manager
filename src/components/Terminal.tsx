import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { callBackend, isTauri, openLink, getPlatform } from '../lib/backend';
import { getWebSocketManager } from '../lib/websocket';
import { TERMINAL } from '../constants';
import { TerminalRegistry } from '../terminal';
import type { TerminalAdapter, Disposable, SearchOptions } from '../terminal';

function writeToPty(sessionId: string, data: string) {
  if (!isTauri()) {
    getWebSocketManager().writePty(sessionId, data);
  } else {
    callBackend('pty_write', { sessionId, data }).catch(() => {});
  }
}

const TOOLBAR_BUTTONS = (() => {
  const isMac = getPlatform() === 'mac';
  const buttons: { label: string; data: string; confirm: boolean }[] = [
    { label: 'Esc', data: '\x1b', confirm: true },
    { label: isMac ? '⌃C' : 'Ctrl+C', data: '\x03', confirm: true },
    ...(!isMac ? [{ label: 'Ctrl+D', data: '\x04', confirm: true }] : []),
    { label: isMac ? '⌃Z' : 'Ctrl+Z', data: '\x1a', confirm: true },
    { label: 'Tab', data: '\t', confirm: false },
    { label: '←', data: '\x1b[D', confirm: false },
    { label: '→', data: '\x1b[C', confirm: false },
    { label: '↑', data: '\x1b[A', confirm: false },
    { label: '↓', data: '\x1b[B', confirm: false },
    { label: 'Home', data: '\x1b[H', confirm: false },
    { label: 'End', data: '\x1b[F', confirm: false },
  ];
  return buttons;
})();

function MobileTerminalToolbar({
  sessionId,
  onResize,
  onDebug,
}: {
  sessionId: string;
  onResize?: () => void;
  onDebug?: () => void;
}) {
  const [pendingBtn, setPendingBtn] = useState<string | null>(null);
  const [sentToast, setSentToast] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Click outside toolbar / timeout clears pending state
  useEffect(() => {
    if (!pendingBtn) return;
    const timer = setTimeout(() => setPendingBtn(null), 2000);
    const handleOutside = (e: PointerEvent) => {
      // Don't clear if the tap is inside the toolbar (let onClick handle it)
      if (toolbarRef.current?.contains(e.target as Node)) return;
      setPendingBtn(null);
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handleOutside);
    };
  }, [pendingBtn]);

  const showSentToast = (label: string) => {
    setSentToast(label);
    setTimeout(() => setSentToast(null), 800);
  };

  const handleBtn = (btn: typeof TOOLBAR_BUTTONS[0]) => {
    // Blur any focused element to prevent keyboard popup
    (document.activeElement as HTMLElement)?.blur();

    if (btn.confirm) {
      if (pendingBtn === btn.label) {
        // Second tap — execute
        writeToPty(sessionId, btn.data);
        setPendingBtn(null);
        showSentToast(btn.label);
      } else {
        // First tap — highlight
        setPendingBtn(btn.label);
      }
    } else {
      // No confirmation needed (arrows, tab, etc.)
      writeToPty(sessionId, btn.data);
      setPendingBtn(null);
    }
  };

  return (
    <div ref={toolbarRef} className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800/95 border-t border-slate-700/50 overflow-x-auto shrink-0 scrollbar-none"
      style={{ touchAction: 'pan-x' }}
    >
      {TOOLBAR_BUTTONS.map((btn) => (
        <button
          key={btn.label}
          onClick={() => handleBtn(btn)}
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium select-none touch-manipulation transition-colors ${
            pendingBtn === btn.label
              ? 'bg-yellow-600/90 text-yellow-100 ring-1 ring-yellow-400'
              : 'bg-slate-700/80 text-slate-300 active:bg-slate-600'
          }`}
        >
          {btn.label}
        </button>
      ))}
      {onResize && (
        <button
          onClick={() => {
            (document.activeElement as HTMLElement)?.blur();
            onResize();
          }}
          className="shrink-0 px-2.5 py-1 rounded-full bg-blue-700/80 text-blue-200 text-xs font-medium active:bg-blue-600 select-none touch-manipulation"
        >
          Resize
        </button>
      )}
      {onDebug && (
        <button
          onClick={() => {
            (document.activeElement as HTMLElement)?.blur();
            onDebug();
          }}
          className="shrink-0 px-2.5 py-1 rounded-full bg-amber-700/80 text-amber-200 text-xs font-medium active:bg-amber-600 select-none touch-manipulation"
        >
          Debug
        </button>
      )}
      {sentToast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] px-4 py-2 rounded-lg bg-green-600/95 text-green-100 text-sm font-medium shadow-lg pointer-events-none animate-pulse">
          {sentToast} sent
        </div>
      )}
    </div>
  );
}

interface TerminalProps {
  cwd: string;
  visible: boolean;
  clientId?: string;
  onShellIntegrationDetected?: () => void;
  onCwdChanged?: (cwd: string) => void;
  onSearchRequested?: () => void;
  onRendererFallback?: () => void;
}

interface PtyOutputEventPayload {
  sessionId: string;
  data: string;
}

export interface TerminalHandle {
  copyContent: () => Promise<void>;
  scrollToCommand: (direction: 'prev' | 'next') => void;
  findNext: (query: string, options?: SearchOptions) => boolean;
  findPrevious: (query: string, options?: SearchOptions) => boolean;
  clearSearch: () => void;
}

const TerminalInner = forwardRef<TerminalHandle, TerminalProps>(({ cwd, visible, clientId, onShellIntegrationDetected, onCwdChanged, onSearchRequested, onRendererFallback }, ref) => {
  // Keep desktop PTY on polling until the event-stream path can preserve replay semantics.
  const enableDesktopEventStreaming = false;
  useTranslation();
  const terminalRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<TerminalAdapter | null>(null);
  // Extract actual cwd (remove #timestamp suffix if present)
  const actualCwd = cwd.split('#')[0];
  // Session ID includes the full cwd (with #timestamp for duplicated terminals)
  // so each terminal tab gets its own PTY session
  const sessionIdRef = useRef<string>(`pty-${cwd.replace(/[/#]/g, '-')}`);
  const readerIntervalRef = useRef<number | null>(null);
  const wsSubscribedRef = useRef(false);
  const desktopUnlistenRef = useRef<UnlistenFn | null>(null);
  const desktopListenerStartingRef = useRef(false);
  const desktopListenerTokenRef = useRef(0);
  const desktopTransportRef = useRef<'event' | 'polling' | null>(null);
  const initializedRef = useRef(false);
  const cwdRef = useRef(actualCwd);
  const mouseSelectionRef = useRef({
    pressed: false,
    moved: false,
    startX: 0,
    startY: 0,
  });
  const [wsConnected, setWsConnected] = useState(!isTauri() ? getWebSocketManager().isConnected() : true);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [initStatus, setInitStatus] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const gotFirstDataRef = useRef(false);
  const mountedRef = useRef(false);
  const shellIntDetectedRef = useRef(false);
  const onShellIntDetectedRef = useRef(onShellIntegrationDetected);
  onShellIntDetectedRef.current = onShellIntegrationDetected;
  const onCwdChangedRef = useRef(onCwdChanged);
  onCwdChangedRef.current = onCwdChanged;
  const onSearchRequestedRef = useRef(onSearchRequested);
  onSearchRequestedRef.current = onSearchRequested;
  const onRendererFallbackRef = useRef(onRendererFallback);
  onRendererFallbackRef.current = onRendererFallback;
  const keyDisposableRef = useRef<Disposable | null>(null);
  const inputDisposableRef = useRef<Disposable | null>(null);
  const shellIntCmdSubRef = useRef<Disposable | null>(null);
  const shellIntCwdSubRef = useRef<Disposable | null>(null);
  const mouseHandlersRef = useRef<{
    handleMouseDown: (e: MouseEvent) => void;
    handleMouseMove: (e: MouseEvent) => void;
    handleMouseUp: (e: MouseEvent) => void;
    handleWindowBlur: () => void;
  } | null>(null);
  const touchHandlersRef = useRef<{
    el: HTMLElement;
    handleTouchStart: (e: TouchEvent) => void;
    handleTouchMove: (e: TouchEvent) => void;
    handleTouchEnd: () => void;
  } | null>(null);

  // Detect mobile device on mount
  useEffect(() => {
    const checkMobile = () => {
      // Check for touch support and small screen
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(hasTouch && isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  const handleCopy = useCallback(() => {
    if (adapterRef.current) {
      const selection = adapterRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection).catch(() => {});
      }
    }
    handleCloseContextMenu();
  }, [handleCloseContextMenu]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && adapterRef.current) {
        writeToPty(sessionIdRef.current, text);
      }
    } catch {
      // Ignore paste errors
    }
    handleCloseContextMenu();
  }, [handleCloseContextMenu]);

  const handleClear = useCallback(() => {
    adapterRef.current?.clear();
    handleCloseContextMenu();
  }, [handleCloseContextMenu]);

  const [debugInfo, setDebugInfo] = useState<{
    visible: boolean;
    data: Record<string, string>;
  }>({ visible: false, data: {} });

  const handleShowDebugInfo = useCallback(async () => {
    const windowLabel = isTauri()
      ? await import('@tauri-apps/api/window').then(m => m.getCurrentWindow().label).catch(() => 'unknown')
      : 'browser';
    const cols = adapterRef.current?.cols ?? 0;
    const rows = adapterRef.current?.rows ?? 0;
    const selection = adapterRef.current?.getSelection() ?? '';
    const adapterDebug = adapterRef.current?.getDebugInfo?.() ?? {};
    setDebugInfo({
      visible: true,
      data: {
        'Session ID': sessionIdRef.current,
        'Working Path': actualCwd,
        'Window Label': windowLabel,
        'Source': isTauri() ? 'Desktop (Tauri IPC)' : 'Browser (HTTP/WebSocket)',
        'Platform': getPlatform(),
        'Terminal Size': `${cols} cols x ${rows} rows`,
        'Viewport Size': `${window.innerWidth} x ${window.innerHeight}`,
        ...adapterDebug,
        'User Agent': navigator.userAgent,
        'WS Connected': isTauri() ? 'N/A (desktop)' : String(wsConnected),
        'Client ID': clientId || 'N/A',
        'Initialized': String(initializedRef.current),
        'Init Status': initStatus || 'none',
        'Init Error': initError || 'none',
        'Got First Data': String(gotFirstDataRef.current),
        'Is Mobile': String(isMobile),
        'Has Selection': selection ? `${selection.length} chars` : 'no',
        'Current Time': new Date().toISOString(),
      },
    });
    handleCloseContextMenu();
  }, [actualCwd, clientId, wsConnected, initStatus, initError, isMobile, handleCloseContextMenu]);

  const handleCloseDebugInfo = useCallback(() => {
    setDebugInfo(prev => ({ ...prev, visible: false }));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      setContextMenu({ visible: true, x: touch.clientX, y: touch.clientY });
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

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

  const handleIncomingData = useCallback((data: string) => {
    if (!data || !adapterRef.current) return;
    if (!gotFirstDataRef.current) {
      gotFirstDataRef.current = true;
      setInitStatus(null);
    }
    adapterRef.current.write(data);

    if (!window._terminalRefreshed) {
      window._terminalRefreshed = true;
      setTimeout(() => {
        if (adapterRef.current) adapterRef.current.refresh(0, adapterRef.current.rows - 1);
      }, 100);
      setTimeout(() => {
        if (adapterRef.current) adapterRef.current.refresh(0, adapterRef.current.rows - 1);
      }, 500);
    }
  }, []);

  useEffect(() => {
    if (!terminalRef.current || adapterRef.current) return;

    const adapter = TerminalRegistry.create();
    adapterRef.current = adapter;

    return () => {
      mountedRef.current = false;

      // Clean up mouse handlers
      const handlers = mouseHandlersRef.current;
      if (handlers) {
        terminalRef.current?.removeEventListener('mousedown', handlers.handleMouseDown, true);
        window.removeEventListener('mousemove', handlers.handleMouseMove, true);
        window.removeEventListener('mouseup', handlers.handleMouseUp, true);
        window.removeEventListener('blur', handlers.handleWindowBlur);
        mouseHandlersRef.current = null;
      }

      // Clean up touch handlers
      const touchH = touchHandlersRef.current;
      if (touchH) {
        touchH.el.removeEventListener('touchstart', touchH.handleTouchStart);
        touchH.el.removeEventListener('touchmove', touchH.handleTouchMove);
        touchH.el.removeEventListener('touchend', touchH.handleTouchEnd);
        touchHandlersRef.current = null;
      }

      // Clean up disposables
      inputDisposableRef.current?.dispose();
      inputDisposableRef.current = null;
      keyDisposableRef.current?.dispose();
      keyDisposableRef.current = null;

      // Clean up shell integration subscriptions
      shellIntCmdSubRef.current?.dispose();
      shellIntCmdSubRef.current = null;
      shellIntCwdSubRef.current?.dispose();
      shellIntCwdSubRef.current = null;

      adapter.dispose();
      adapterRef.current = null;
    };
  }, []);

  const startReading = useCallback(() => {
    const startDesktopPolling = () => {
      if (readerIntervalRef.current) return;
      desktopTransportRef.current = 'polling';

      const scheduleNext = () => {
        readerIntervalRef.current = window.setTimeout(readLoop, TERMINAL.POLL_INTERVAL_MS);
      };

      const readLoop = async () => {
        try {
          const data = await callBackend<string>('pty_read', {
            sessionId: sessionIdRef.current,
            ...(clientId ? { clientId } : {}),
          });
          handleIncomingData(data);
        } catch { /* noop */ }

        if (readerIntervalRef.current !== null) {
          scheduleNext();
        }
      };

      scheduleNext();
    };

    if (!isTauri()) {
      // Browser mode: WS subscribe is idempotent
      if (wsSubscribedRef.current) return;
      wsSubscribedRef.current = true;
      getWebSocketManager().subscribePty(sessionIdRef.current, (data) => {
        handleIncomingData(data);
      });
    } else {
      if (!enableDesktopEventStreaming) {
        startDesktopPolling();
        return;
      }

      if (desktopUnlistenRef.current || desktopListenerStartingRef.current) return;
      if (desktopTransportRef.current === 'polling') {
        startDesktopPolling();
        return;
      }

      desktopListenerStartingRef.current = true;
      const token = ++desktopListenerTokenRef.current;

      void import('@tauri-apps/api/event')
        .then(async ({ listen }) => {
          const unlisten = await listen<PtyOutputEventPayload>('pty-output', (event) => {
            if (event.payload?.sessionId !== sessionIdRef.current) return;
            handleIncomingData(event.payload.data);
          });

          if (desktopListenerTokenRef.current !== token) {
            unlisten();
            return;
          }

          desktopTransportRef.current = 'event';
          desktopUnlistenRef.current = () => {
            unlisten();
            desktopUnlistenRef.current = null;
            if (desktopTransportRef.current === 'event') {
              desktopTransportRef.current = null;
            }
          };
        })
        .catch(() => {
          if (desktopListenerTokenRef.current === token) {
            startDesktopPolling();
          }
        })
        .finally(() => {
          if (desktopListenerTokenRef.current === token) {
            desktopListenerStartingRef.current = false;
          }
        });
    }
  }, [enableDesktopEventStreaming, handleIncomingData]);

  // Initialize PTY session
  const initPty = useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter || !terminalRef.current) return;

    setInitStatus('Preparing terminal...');
    setInitError(null);
    gotFirstDataRef.current = false;

    try {
      // --- Mount adapter (async to support future WASM-based adapters) ---
      if (!mountedRef.current) {
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth < 768;
        const isMobileDevice = hasTouch && isSmallScreen;

        await adapter.mount(terminalRef.current, {
          fontSize: isMobileDevice ? 12 : 13,
          fontFamily: '"Maple Mono NF CN", Menlo, Monaco, "Courier New", monospace',
          cursorBlink: true,
          cursorStyle: 'bar' as const,
          scrollback: TERMINAL.SCROLLBACK_LINES,
          linkHandler: (uri) => openLink(uri),
          onRendererFallback: () => onRendererFallbackRef.current?.(),
        });

        // Check if component was unmounted during async mount
        if (!adapterRef.current) return;

        mountedRef.current = true;

        // On mobile, prevent soft keyboard from popping up on casual touch.
        if (isMobileDevice) {
          adapter.setMobileKeyboardPolicy('none');
        }

        // Key handler: Ctrl/Cmd+F for search, Alt+V passthrough for voice
        const keyDisposable = adapter.onKeyEvent((e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
            onSearchRequestedRef.current?.();
            return false;
          }
          if (e.altKey && e.code === 'KeyV') return false;
          return true;
        });
        keyDisposableRef.current = keyDisposable;

        // Mouse selection handling
        const resetStuckSelection = (forceClear = false) => {
          const selectionState = mouseSelectionRef.current;
          const shouldClear = forceClear || !selectionState.moved;
          selectionState.pressed = false;
          selectionState.moved = false;
          if (shouldClear) {
            adapter.clearSelection();
            adapter.focus();
          }
        };

        const handleMouseDown = (event: MouseEvent) => {
          if (event.button !== 0) return;
          mouseSelectionRef.current = {
            pressed: true,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
          };
        };

        const handleMouseMove = (event: MouseEvent) => {
          if (!mouseSelectionRef.current.pressed || mouseSelectionRef.current.moved) return;
          const dx = Math.abs(event.clientX - mouseSelectionRef.current.startX);
          const dy = Math.abs(event.clientY - mouseSelectionRef.current.startY);
          if (dx > 3 || dy > 3) {
            mouseSelectionRef.current.moved = true;
          }
        };

        const handleMouseUp = (event: MouseEvent) => {
          if (!mouseSelectionRef.current.pressed) return;
          const isMultiClickSelection = event.detail > 1;
          if (isMultiClickSelection) {
            mouseSelectionRef.current.pressed = false;
            mouseSelectionRef.current.moved = false;
            return;
          }
          resetStuckSelection(false);
        };

        const handleWindowBlur = () => {
          if (!mouseSelectionRef.current.pressed) return;
          resetStuckSelection(true);
        };

        terminalRef.current.addEventListener('mousedown', handleMouseDown, true);
        window.addEventListener('mousemove', handleMouseMove, true);
        window.addEventListener('mouseup', handleMouseUp, true);
        window.addEventListener('blur', handleWindowBlur);

        // Store cleanup references
        mouseHandlersRef.current = { handleMouseDown, handleMouseMove, handleMouseUp, handleWindowBlur };

        // Mobile: single-finger touch scroll (use isMobileDevice from inline check above)
        if (isMobileDevice && terminalRef.current) {
          let touchStartY = 0;
          let scrollAccum = 0;
          let isDragging = false;

          const el = terminalRef.current;

          const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
              touchStartY = e.touches[0].clientY;
              scrollAccum = 0;
              isDragging = false;
            }
          };

          const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1) {
              const nowY = e.touches[0].clientY;
              const dy = touchStartY - nowY;
              if (!isDragging && Math.abs(dy) > 8) {
                isDragging = true;
              }
              if (isDragging) {
                e.preventDefault();
                scrollAccum += dy;
                const lineHeight = 16;
                const lines = Math.trunc(scrollAccum / lineHeight);
                if (lines !== 0) {
                  adapter.scrollLines(lines);
                  scrollAccum -= lines * lineHeight;
                }
                touchStartY = nowY;
              }
            }
          };

          const handleTouchEnd = () => {
            isDragging = false;
            scrollAccum = 0;
          };

          el.addEventListener('touchstart', handleTouchStart, { passive: true });
          el.addEventListener('touchmove', handleTouchMove, { passive: false });
          el.addEventListener('touchend', handleTouchEnd, { passive: true });

          touchHandlersRef.current = { el, handleTouchStart, handleTouchMove, handleTouchEnd };
        }

        // Input handler
        const inputDisposable = adapter.onInput((data) => {
          const converted = data.replace(/[\uff01-\uff5e]/g, (ch) =>
            String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
          ).replace(/\u3000/g, ' ');
          writeToPty(sessionIdRef.current, converted);
        });
        inputDisposableRef.current = inputDisposable;

        // Shell integration subscriptions
        shellIntCmdSubRef.current = adapter.onCommandStarted?.(() => {
          if (!shellIntDetectedRef.current) {
            shellIntDetectedRef.current = true;
            onShellIntDetectedRef.current?.();
          }
        }) ?? null;
        shellIntCwdSubRef.current = adapter.onCwdChanged?.((newCwd: string) => {
          onCwdChangedRef.current?.(newCwd);
        }) ?? null;
      }

      // --- PTY initialization (same as before) ---
      try {
        await Promise.race([
          document.fonts.ready,
          new Promise(r => setTimeout(r, 100))
        ]);
      } catch (_e) { /* ignore */ }

      try {
        adapter.fit();
      } catch (_e) {
        console.warn('[terminal] adapter.fit() failed during init', _e);
      }

      const cols = Math.max(adapter.cols || 80, 2);
      const rows = Math.max(adapter.rows || 24, 2);

      setInitStatus('Checking session...');

      const exists = await callBackend<boolean>('pty_exists', {
        sessionId: sessionIdRef.current,
      });

      if (!exists) {
        setInitStatus('Creating PTY session...');
        const shell = localStorage.getItem('preferred_shell') || undefined;
        await callBackend('pty_create', {
          sessionId: sessionIdRef.current,
          cwd: cwdRef.current,
          cols,
          rows,
          shell: shell && shell !== 'auto' ? shell : undefined,
        });
      } else {
        setInitStatus('Restoring session...');
      }

      if (exists && isTauri()) {
        setInitStatus('Restoring buffered output...');
        try {
          const data = await callBackend<string>('pty_read', {
            sessionId: sessionIdRef.current,
            ...(clientId ? { clientId } : {}),
          });
          handleIncomingData(data);
        } catch {
          // Event stream will still resume live output even if restore failed.
        }
      }

      setInitStatus('Subscribing output...');
      initializedRef.current = true;
      startReading();

      // Deferred resize
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (adapterRef.current && mountedRef.current) {
            try { adapterRef.current.fit(); } catch (_e) { /* ignore */ }
            const newCols = Math.max(adapterRef.current.cols || 80, 2);
            const newRows = Math.max(adapterRef.current.rows || 24, 2);
            if (newCols !== cols || newRows !== rows || exists) {
              callBackend('pty_resize', {
                sessionId: sessionIdRef.current,
                cols: newCols,
                rows: newRows,
                ...(clientId ? { clientId } : {}),
              }).catch(() => { });
            }
          }
        }, 100);
      });

      setInitStatus('Waiting for output...');

      if (exists) {
        setTimeout(() => {
          if (!gotFirstDataRef.current) setInitStatus(null);
        }, 2000);
      }

    } catch (e) {
      setInitStatus(null);
      setInitError(String(e));
      console.error('[terminal] Failed to initialize PTY:', e);
    }
  }, [clientId, handleIncomingData, startReading]);

  // Create PTY session on first visibility
  useEffect(() => {
    if (!adapterRef.current || !visible || initializedRef.current) return;
    initPty();
  }, [visible, initPty]);


  const stopReading = useCallback(() => {
    if (!isTauri() && wsSubscribedRef.current) {
      wsSubscribedRef.current = false;
      getWebSocketManager().unsubscribePty(sessionIdRef.current);
    }
    desktopListenerTokenRef.current += 1;
    desktopListenerStartingRef.current = false;
    if (desktopUnlistenRef.current) {
      desktopUnlistenRef.current();
    }
    if (readerIntervalRef.current !== null) {
      clearTimeout(readerIntervalRef.current);
      readerIntervalRef.current = null;
    }
    if (desktopTransportRef.current === 'polling') {
      desktopTransportRef.current = null;
    }
  }, []);


  const handleResize = useCallback(() => {
    if (!adapterRef.current || !mountedRef.current || !visible || !initializedRef.current) return;

    try { adapterRef.current.fit(); } catch (_e) { /* ignore */ }
    const cols = Math.max(adapterRef.current.cols || 80, 2);
    const rows = Math.max(adapterRef.current.rows || 24, 2);

    callBackend('pty_resize', {
      sessionId: sessionIdRef.current,
      cols,
      rows,
      ...(clientId ? { clientId } : {}),
    }).catch(() => { /* noop */ });
  }, [visible, clientId]);

  const handleResizeToFit = useCallback(() => {
    handleResize();
    handleCloseContextMenu();
  }, [handleResize, handleCloseContextMenu]);


  useEffect(() => {
    if (!initializedRef.current) return;

    if (visible) {
      if (isTauri()) startReading();
      // Small delay ensures DOM is fully rendered before resize
      const resizeTimer = setTimeout(() => {
        handleResize();
      }, 50);
      return () => clearTimeout(resizeTimer);
    }
    // Desktop terminals stay mounted across worktree switches to preserve PTY state,
    // so keep draining output even while hidden. Stopping polling here can let large
    // bursts accumulate and eventually overflow any intermediate buffers.
  }, [visible, startReading, stopReading, handleResize]);

  // ResizeObserver for container size changes
  useEffect(() => {
    if (!terminalRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (visible) {
        handleResize();
      }
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [visible, handleResize]);

  // Cleanup on unmount — stop reading only (PTY sessions persist like tmux)
  useEffect(() => {
    return () => {
      stopReading();
    };
  }, [stopReading]);

  // Browser mode: track WS connection state and re-subscribe on reconnect
  useEffect(() => {
    if (isTauri()) return;
    const wsMgr = getWebSocketManager();
    const unsub = wsMgr.onConnectionStateChange((connected) => {
      setWsConnected(connected);
      // On reconnect, re-subscribe if we had an active session
      if (connected && initializedRef.current && wsSubscribedRef.current) {
        console.log('[terminal] WS reconnected, re-subscribing PTY:', sessionIdRef.current);
        wsMgr.subscribePty(sessionIdRef.current, (data) => {
          handleIncomingData(data);
        });
      }
    });
    return unsub;
  }, [handleIncomingData]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 relative" onContextMenu={handleContextMenu}>
        <div
          ref={terminalRef}
          className="h-full w-full overflow-hidden"
          style={{ padding: '4px 8px', background: '#0f172a' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />

        {/* Initializing overlay */}
        {(initStatus || initError) && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20">
            <div className="flex flex-col items-center gap-3">
              {initStatus ? (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-slate-300 text-sm font-medium">{initStatus}</span>
                </div>
              ) : initError ? (
                <>
                  <div className="flex items-center gap-2 text-red-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">Connection failed</span>
                  </div>
                  <p className="text-slate-400 text-xs max-w-xs text-center">{initError}</p>
                  <button
                    onClick={() => {
                      initializedRef.current = false;
                      initPty();
                    }}
                    className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* WS connection status overlay (browser mode only) */}
        {!isTauri() && !wsConnected && (
          <div className="absolute inset-0 flex items-end justify-center pointer-events-none z-10 pb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-900/80 backdrop-blur-sm border border-amber-700/50 text-amber-300 text-xs font-medium shadow-lg pointer-events-auto">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Reconnecting...
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu.visible && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={handleCloseContextMenu}
            />
            <div
              className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-lg py-1 min-w-[140px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                className="w-full px-3 py-1 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                onClick={handleCopy}
              >
                Copy
              </button>
              <button
                className="w-full px-3 py-1 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                onClick={handlePaste}
              >
                Paste
              </button>
              <div className="border-t border-slate-700 my-0.5" />
              <button
                className="w-full px-3 py-1 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                onClick={handleResizeToFit}
              >
                Resize to Fit
              </button>
              <div className="border-t border-slate-700 my-0.5" />
              <button
                className="w-full px-3 py-1 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                onClick={handleClear}
              >
                Clear
              </button>
              <div className="border-t border-slate-700 my-0.5" />
              <button
                className="w-full px-3 py-1 text-left text-sm text-amber-300 hover:bg-slate-700 transition-colors"
                onClick={handleShowDebugInfo}
              >
                Debug Info
              </button>
            </div>
          </>
        )}

        {/* Debug Info Panel */}
        {debugInfo.visible && (
          <>
            <div
              className="fixed inset-0 z-50"
              onClick={handleCloseDebugInfo}
            />
            <div className="absolute z-[60] top-2 left-2 bg-slate-900/95 border border-amber-600/50 rounded-lg shadow-xl p-3 min-w-[320px] max-w-[90vw] max-h-[80vh] overflow-auto select-text">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Terminal Debug Info</span>
                <button
                  onClick={handleCloseDebugInfo}
                  className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
              <div className="space-y-1">
                {Object.entries(debugInfo.data).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="text-slate-400 font-medium">{key}:</span>
                    <span className="text-slate-200 ml-1 break-all font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      {isMobile && <MobileTerminalToolbar sessionId={sessionIdRef.current} onResize={handleResize} onDebug={handleShowDebugInfo} />}
    </div>
  );
});
declare global {
  interface Window {
    _terminalRefreshed?: boolean;
  }
}

export const Terminal = memo(TerminalInner);
