import { Component } from 'react';
import { Button } from '@/components/ui/button';

export function ErrorFallback({ onRetry, title = 'This page could not be displayed' }) {
  return <section role="alert" className="page-card mx-auto my-10 max-w-xl space-y-4">
    <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
    <p className="text-sm text-slate-600">Your view encountered an unexpected error. Try opening it again. If you submitted a payment or trade, check its status before submitting it again.</p>
    <div className="flex flex-wrap gap-3"><Button onClick={onRetry}>Try again</Button><Button variant="outline" asChild><a href="/">Go to dashboard</a></Button></div>
  </section>;
}

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <ErrorFallback onRetry={() => this.setState({ failed: false })} />;
    return this.props.children;
  }
}
