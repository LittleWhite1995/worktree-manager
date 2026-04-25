const PTY_COMPATIBLE_TERMINAL_IDS = new Set([
  'cmd',
  'powershell',
  'pwsh',
  'gitbash',
  'bash',
  'nu',
]);

type ToolPaths = {
  terminal?: string;
  terminal_custom?: string;
  shell?: string;
};

type ConsoleLogger = Pick<Console, 'info'>;

function normalizePreference(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === 'auto') return undefined;
  return trimmed;
}

function readToolPaths(storage: Storage): ToolPaths {
  try {
    return JSON.parse(storage.getItem('tool_paths') || '{}') as ToolPaths;
  } catch {
    return {};
  }
}

function displayValue(value: string | null | undefined): string {
  return normalizePreference(value) ?? 'not set';
}

function summarizeDetectedTools(storage: Storage, key: string): string {
  try {
    const tools = JSON.parse(storage.getItem(key) || '[]') as Array<{ id?: string; name?: string; path?: string }>;
    if (!Array.isArray(tools) || tools.length === 0) return 'none';
    return tools
      .map((tool) => [tool.id, tool.name, tool.path].filter(Boolean).join(':'))
      .join(', ');
  } catch {
    return 'invalid JSON';
  }
}

export function getPreferredExternalTerminal(storage: Storage = window.localStorage): string {
  const toolPaths = readToolPaths(storage);
  return normalizePreference(toolPaths.terminal_custom)
    ?? normalizePreference(toolPaths.terminal)
    ?? normalizePreference(storage.getItem('preferred_terminal'))
    ?? 'auto';
}

export function getPreferredPtyShell(storage: Storage = window.localStorage): string | undefined {
  const toolPaths = readToolPaths(storage);
  const preferredShell = normalizePreference(storage.getItem('preferred_shell'))
    ?? normalizePreference(toolPaths.shell);
  if (preferredShell) return preferredShell;

  const preferredTerminal = normalizePreference(getPreferredExternalTerminal(storage));
  if (preferredTerminal && PTY_COMPATIBLE_TERMINAL_IDS.has(preferredTerminal)) {
    return preferredTerminal;
  }

  return undefined;
}

export function getShellForTerminalLaunch(
  terminalOverride?: string,
  storage: Storage = window.localStorage,
): string | undefined {
  const normalizedOverride = normalizePreference(terminalOverride);
  if (normalizedOverride && PTY_COMPATIBLE_TERMINAL_IDS.has(normalizedOverride)) {
    return normalizedOverride;
  }

  return getPreferredPtyShell(storage);
}

export function getTerminalPreferenceDebugInfo(
  storage: Storage = window.localStorage,
  terminalOverride?: string,
): Record<string, string> {
  const toolPaths = readToolPaths(storage);
  const resolvedExternalTerminal = getPreferredExternalTerminal(storage);
  const resolvedPtyShell = getPreferredPtyShell(storage);
  const resolvedLaunchShell = getShellForTerminalLaunch(terminalOverride ?? resolvedExternalTerminal, storage);

  return {
    'Preferred Terminal': displayValue(storage.getItem('preferred_terminal')),
    'Preferred Shell': displayValue(storage.getItem('preferred_shell')),
    'Tool Paths Terminal': displayValue(toolPaths.terminal),
    'Tool Paths Terminal Custom': displayValue(toolPaths.terminal_custom),
    'Tool Paths Shell': displayValue(toolPaths.shell),
    'Resolved External Terminal': resolvedExternalTerminal,
    'Resolved PTY Shell': resolvedPtyShell ?? 'auto',
    'Resolved Launch Shell': resolvedLaunchShell ?? 'auto',
    'Detected Terminals': summarizeDetectedTools(storage, 'detected_terminals'),
    'Detected Shells': summarizeDetectedTools(storage, 'detected_shells'),
  };
}

export function logTerminalPreferenceDebugInfo(
  event: string,
  details: Record<string, unknown> = {},
  storage: Storage = window.localStorage,
  terminalOverride?: string,
  logger: ConsoleLogger = console,
): void {
  logger.info('[terminal-preferences]', {
    event,
    ...details,
    preferences: getTerminalPreferenceDebugInfo(storage, terminalOverride),
  });
}
