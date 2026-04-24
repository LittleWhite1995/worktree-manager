const PTY_COMPATIBLE_TERMINAL_IDS = new Set([
  'cmd',
  'powershell',
  'pwsh',
  'gitbash',
  'bash',
  'nu',
]);

function normalizePreference(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === 'auto') return undefined;
  return trimmed;
}

export function getPreferredExternalTerminal(storage: Storage = window.localStorage): string {
  return normalizePreference(storage.getItem('preferred_terminal')) ?? 'auto';
}

export function getPreferredPtyShell(storage: Storage = window.localStorage): string | undefined {
  const preferredShell = normalizePreference(storage.getItem('preferred_shell'));
  if (preferredShell) return preferredShell;

  const preferredTerminal = normalizePreference(storage.getItem('preferred_terminal'));
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
