import { AppRoot } from './components/app/AppRoot';
import ErrorBoundary from './components/shared/ErrorBoundary';

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <AppRoot />
    </ErrorBoundary>
  );
}
