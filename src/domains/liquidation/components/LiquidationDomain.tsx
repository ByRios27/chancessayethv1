import type { ComponentProps } from 'react';
import { LiquidationSection } from '../../../components/liquidation/LiquidationSection';
import { withSafeCallbacks } from '../../../utils/safeCallbacks';

export function LiquidationDomain(props: ComponentProps<typeof LiquidationSection>) {
  const safeProps = withSafeCallbacks(props as Record<string, unknown>, 'LiquidationDomain') as ComponentProps<typeof LiquidationSection>;
  return <LiquidationSection {...safeProps} />;
}
