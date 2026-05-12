import { Component, type ReactNode } from 'react';
import i18next from 'i18next';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
  copied: boolean;
}

const ISSUE_URL = 'https://github.com/guoyongchang/worktree-manager/issues/new';

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: '', copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const errorInfo = [
      `Error: ${error.message}`,
      '',
      `Stack:`,
      error.stack || '(no stack)',
      '',
      `Component Stack:`,
      info.componentStack || '(no component stack)',
      '',
      `UserAgent: ${navigator.userAgent}`,
      `URL: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`,
    ].join('\n');
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  handleCopy = () => {
    navigator.clipboard.writeText(this.state.errorInfo).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch(() => {
      // Fallback: select textarea content
      const el = document.querySelector<HTMLTextAreaElement>('#error-boundary-details');
      if (el) { el.select(); document.execCommand('copy'); }
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const t = (key: string, fallback: string) => {
      const val = i18next.t(key);
      return val === key ? fallback : val;
    };

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', padding: '32px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: '#0f0f0f', color: '#e0e0e0',
      }}>
        <div style={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
          {/* Icon */}
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>
            {t('error.crashTitle', 'Something went wrong')}
          </h1>
          <p style={{ fontSize: 14, color: '#999', margin: '0 0 24px' }}>
            {t('error.crashDesc', 'The application encountered an unexpected error. You can try reloading, or report this issue to help us fix it.')}
          </p>

          {/* Error message */}
          <div style={{
            background: '#1a1a1a', border: '1px solid #333', borderRadius: 8,
            padding: 16, marginBottom: 16, textAlign: 'left',
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#ef4444', marginBottom: 8 }}>
              {this.state.error?.message || 'Unknown error'}
            </div>
            <textarea
              id="error-boundary-details"
              readOnly
              value={this.state.errorInfo}
              style={{
                width: '100%', height: 160, resize: 'vertical',
                background: '#111', color: '#aaa', border: '1px solid #2a2a2a', borderRadius: 4,
                padding: 8, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.4,
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={this.handleCopy} style={{
              padding: '8px 20px', borderRadius: 6, border: '1px solid #333',
              background: '#1a1a1a', color: '#e0e0e0', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              transition: 'background 0.2s',
            }}>
              {this.state.copied
                ? t('error.copied', 'Copied!')
                : t('error.copyError', 'Copy Error Info')}
            </button>
            <button onClick={this.handleReload} style={{
              padding: '8px 20px', borderRadius: 6, border: 'none',
              background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              transition: 'background 0.2s',
            }}>
              {t('error.reload', 'Reload App')}
            </button>
            <a href={ISSUE_URL} target="_blank" rel="noopener noreferrer" style={{
              padding: '8px 20px', borderRadius: 6, border: '1px solid #333',
              background: '#1a1a1a', color: '#e0e0e0', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'background 0.2s',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              {t('error.reportIssue', 'Report Issue')}
            </a>
          </div>

          <p style={{ fontSize: 12, color: '#666', marginTop: 24 }}>
            {t('error.hint', 'Tip: Copy the error info above and paste it into your issue report to help us diagnose the problem.')}
          </p>
        </div>
      </div>
    );
  }
}
