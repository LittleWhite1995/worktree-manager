import { describe, expect, it, beforeEach } from 'vitest';
import { getPreferredPtyShell } from './terminalPreferences';

describe('getPreferredPtyShell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses the explicit shell preference for built-in PTY sessions', () => {
    localStorage.setItem('preferred_shell', 'cmd');
    localStorage.setItem('preferred_terminal', 'gitbash');

    expect(getPreferredPtyShell()).toBe('cmd');
  });

  it('falls back to shell-compatible terminal preferences when no shell is set', () => {
    localStorage.setItem('preferred_terminal', 'gitbash');

    expect(getPreferredPtyShell()).toBe('gitbash');
  });

  it('does not pass Windows Terminal itself as a PTY shell', () => {
    localStorage.setItem('preferred_terminal', 'windowsterminal');

    expect(getPreferredPtyShell()).toBeUndefined();
  });
});
