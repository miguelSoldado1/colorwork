import { Component, type ReactNode } from "react";
import { AppErrorFallback } from "@/components/app/app-error-fallback";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

// biome-ignore lint/style/useReactFunctionComponents: React error boundaries must be class components.
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <AppErrorFallback />;
    }

    return this.props.children;
  }
}
