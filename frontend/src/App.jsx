import AppProviders from './app/providers';
import AppRoutes from './app/routes';
import ErrorBoundary from './app/ErrorBoundary';

export default function App() {
  return (
    <AppProviders>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </AppProviders>
  );
}
