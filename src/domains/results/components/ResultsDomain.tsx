import type { ComponentProps } from 'react';
import { ResultsSection } from '../../../components/results/ResultsSection';

export function ResultsDomain(props: ComponentProps<typeof ResultsSection>) {
  return <ResultsSection {...props} />;
}
