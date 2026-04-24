import type { ComponentProps } from 'react';
import { ResultsSection } from '../../../components/results/ResultsSection';
import { withSafeCallbacks } from '../../../utils/safeCallbacks';

export function ResultsDomain(props: ComponentProps<typeof ResultsSection>) {
  const safeProps = withSafeCallbacks(props as Record<string, unknown>, 'ResultsDomain') as ComponentProps<typeof ResultsSection>;
  return <ResultsSection {...safeProps} />;
}
