#!/bin/zsh
# OSC 633 shell integration for zsh

# Guard: only load once
[ -n "$_WM_SHELL_INTEGRATION_LOADED" ] && return
_WM_SHELL_INTEGRATION_LOADED=1

_wm_preexec() {
    printf '\e]633;C\a'
    # Send command text
    printf '\e]633;E;%s\a' "${1}"
}

_wm_precmd() {
    local exit_code=$?
    printf '\e]633;D;%s\a' "$exit_code"
    printf '\e]633;P;Cwd=%s\a' "$PWD"
    printf '\e]7;file://%s%s\a' "$(hostname)" "$PWD"
    # Emit prompt-start (A). PS1 wrapping only adds prompt-end (B).
    printf '\e]633;A\a'
}

# Install hooks via add-zsh-hook (safe, does not clobber user hooks)
autoload -Uz add-zsh-hook
add-zsh-hook precmd _wm_precmd
add-zsh-hook preexec _wm_preexec

# Wrap PS1 with prompt-end marker only.
# precmd emits A (prompt-start), so PS1 only needs B (prompt-end) at the end.
_wm_set_prompt() {
    PS1="${PS1}%{$(printf '\e]633;B\a')%}"
}
_wm_set_prompt
