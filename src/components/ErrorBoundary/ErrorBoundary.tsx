'use client';

import { Component, type ReactNode } from 'react';

import type { IErrorBoundaryState } from '@interfaces';

import { event } from '@/lib/events';

interface IErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

export class ErrorBoundary extends Component<IErrorBoundaryProps, IErrorBoundaryState> {
  state: IErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): IErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    event.error(error, { toast: false, context: 'boundary.render' });
  }

  render() {
    if (this.state.hasError) return this.props.fallback;

    return this.props.children;
  }
}
