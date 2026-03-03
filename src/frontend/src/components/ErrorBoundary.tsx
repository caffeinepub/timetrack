import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { logDebug } from "../utils/debugLogging";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRemoveChildError: boolean;
  isAndroidChrome: boolean;
}

function detectAndroidChrome(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua) && /Chrome/i.test(ua);
}

function isRemoveChildError(error: Error): boolean {
  const msg = (error?.message ?? "") + (error?.name ?? "");
  return (
    msg.toLowerCase().includes("removechild") ||
    msg.toLowerCase().includes("not a child") ||
    msg.toLowerCase().includes("n'est pas un enfant")
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRemoveChildError: false,
      isAndroidChrome: detectAndroidChrome(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      isRemoveChildError: isRemoveChildError(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const isAndroid = detectAndroidChrome();
    const isRCE = isRemoveChildError(error);

    if (isRCE && isAndroid) {
      console.error(
        "[ErrorBoundary] Android Chrome removeChild DOMException detected",
      );
      console.error("[ErrorBoundary] Error:", error.message);
      console.error("[ErrorBoundary] Component stack:", info.componentStack);
    } else {
      console.error("[ErrorBoundary] Caught error:", error, info);
    }

    logDebug("ErrorBoundary", `Error caught: ${error.message}`);
  }

  handleReload = () => {
    logDebug("ErrorBoundary", "User triggered reload");
    setTimeout(() => {
      try {
        window.location.reload();
      } catch {
        window.location.href = "/";
      }
    }, 50);
  };

  handleGoBack = () => {
    logDebug("ErrorBoundary", "User triggered go back");
    setTimeout(() => {
      try {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = "/";
        }
      } catch {
        window.location.href = "/";
      }
    }, 50);
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, isRemoveChildError: isRCE, isAndroidChrome } = this.state;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-6 space-y-5 text-center">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                role="img"
                aria-label="Erreur"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground">
              The application encountered an unexpected problem. You can try
              reloading or going back.
            </p>
          </div>

          {/* Android Chrome removeChild hint */}
          {isRCE && isAndroidChrome && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 text-left space-y-1">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                Android Chrome DOM issue detected
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                A rapid tap may have caused a DOM conflict. Please reload the
                app. If this keeps happening, try tapping buttons more slowly.
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <pre className="text-left text-xs bg-muted rounded-lg p-3 overflow-auto max-h-28 text-muted-foreground whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm transition-opacity active:opacity-80 touch-action-manipulation"
            >
              <svg
                className="w-4 h-4 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                role="img"
                aria-label="Recharger"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="pointer-events-none">Reload app</span>
            </button>
            <button
              type="button"
              onClick={this.handleGoBack}
              className="w-full flex items-center justify-center gap-2 bg-muted text-muted-foreground rounded-xl py-3 font-semibold text-sm transition-opacity active:opacity-80 touch-action-manipulation"
            >
              <svg
                className="w-4 h-4 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                role="img"
                aria-label="Retour"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span className="pointer-events-none">Go back</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
