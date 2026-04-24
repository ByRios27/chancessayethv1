import type { ComponentProps } from 'react';
import { AdminSection } from '../../../components/admin/AdminSection';
import { withSafeCallbacks } from '../../../utils/safeCallbacks';

export function GeneralConfigDomain(props: ComponentProps<typeof AdminSection>) {
  const safeProps = withSafeCallbacks(props as Record<string, unknown>, 'GeneralConfigDomain') as ComponentProps<typeof AdminSection>;
  return <AdminSection {...safeProps} />;
}
