#!/bin/bash
# OSC 633 shell integration for bash

# Guard: only load once
[ -n "$_WM_SHELL_INTEGRATION_LOADED" ] && return
_WM_SHELL_INTEGRATION_LOADED=1

# Save original PROMPT_COMMAND
_wm_original_prompt_command="$PROMPT_COMMAND"

# Guard variable: prevents DEBUG trap from firing during PROMPT_COMMAND
_wm_in_prompt_command=0

_wm_prompt_start() {
    # Reset guard so next DEBUG trap fires for user commands
    _wm_in_prompt_command=0
    printf '\e]633;A\a'
}

_wm_prompt_end() {
    printf '\e]633;B\a'
}

_wm_pre_execution() {
    # Skip if we're inside PROMPT_COMMAND (DEBUG trap fires for every simple command)
    [ "$_wm_in_prompt_command" = "1" ] && return
    printf '\e]633;C\a'
}

_wm_command_finished() {
    local exit_code=$?
    # Set guard to prevent DEBUG trap from firing during prompt functions
    _wm_in_prompt_command=1
    printf '\e]633;D;%s\a' "$exit_code"
    printf '\e]633;P;Cwd=%s\a' "$PWD"
    printf '\e]7;file://%s%s\a' "$(hostname)" "$PWD"
    return $exit_code
}

# Install hooks
PROMPT_COMMAND="_wm_command_finished;${_wm_original_prompt_command:+$_wm_original_prompt_command;}_wm_prompt_start"

# Use literal escape sequences in PS1 to avoid subshell overhead on every prompt
PS1="\[\e]633;A\a\]${PS1}\[\e]633;B\a\]"

# Trap DEBUG for pre-execution (guarded by _wm_in_prompt_command)
trap '_wm_pre_execution' DEBUG
