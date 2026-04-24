import { describe, expect, it, beforeEach } from 'vitest';
import {
  getPreferredExternalTerminal,
  getPreferredPtyShell,
  getShellForTerminalLaunch,
  getTerminalPreferenceDebugInfo,
} from './terminalPreferences';

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

  it('uses persisted tool path terminal settings when legacy preferred_terminal is missing', () => {
    localStorage.setItem('tool_paths', JSON.stringify({ terminal: 'gitbash' }));

    expect(getPreferredExternalTerminal()).toBe('gitbash');
  });

  it('prefers custom terminal path from tool_paths over selected terminal id', () => {
    localStorage.setItem('tool_paths', JSON.stringify({
      terminal: 'windowsterminal',
      terminal_custom: 'C:\\Tools\\WezTerm\\wezterm-gui.exe',
    }));

    expect(getPreferredExternalTerminal()).toBe('C:\\Tools\\WezTerm\\wezterm-gui.exe');
  });

  it('uses persisted tool path shell settings for Windows Terminal launches', () => {
    localStorage.setItem('tool_paths', JSON.stringify({
      terminal: 'windowsterminal',
      shell: 'gitbash',
    }));

    expect(getShellForTerminalLaunch('windowsterminal')).toBe('gitbash');
  });

  it('includes resolved terminal settings in debug info', () => {
    localStorage.setItem('tool_paths', JSON.stringify({
      terminal: 'windowsterminal',
      shell: 'cmd',
    }));

    expect(getTerminalPreferenceDebugInfo()).toMatchObject({
      'Preferred Terminal': 'not set',
      'Tool Paths Terminal': 'windowsterminal',
      'Tool Paths Shell': 'cmd',
      'Resolved External Terminal': 'windowsterminal',
      'Resolved PTY Shell': 'cmd',
      'Resolved Launch Shell': 'cmd',
    });
  });

  it('does not pass Windows Terminal itself as a PTY shell', () => {
    localStorage.setItem('preferred_terminal', 'windowsterminal');

    expect(getPreferredPtyShell()).toBeUndefined();
  });
});
