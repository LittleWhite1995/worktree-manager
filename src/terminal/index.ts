import { TerminalRegistry } from './registry'
import { XtermAdapter } from './adapters/xterm'
import { GhosttyAdapter } from './adapters/ghostty'

export type {
  TerminalAdapter,
  TerminalAdapterFactory,
  TerminalOptions,
  TerminalTheme,
  TerminalDimensions,
  Disposable,
} from './types'

export { TerminalRegistry }
export { XtermAdapter }

TerminalRegistry.register('xterm', { create: () => new XtermAdapter() })
TerminalRegistry.register('ghostty', { create: () => new GhosttyAdapter() })
TerminalRegistry.setDefault('xterm')
