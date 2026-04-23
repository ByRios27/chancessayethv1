import type { ComponentProps } from 'react';
import { LiquidationSection } from '../../../components/liquidation/LiquidationSection';

export function LiquidationDomain(props: ComponentProps<typeof LiquidationSection>) {
  return <LiquidationSection {...props} />;
}
