import { TerminalRegistry } from './registry'
import { XtermAdapter } from './adapters/xterm'

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
TerminalRegistry.setDefault('xterm')

export { CommandState } from './shell-integration'
export type { CommandInfo } from './shell-integration'
