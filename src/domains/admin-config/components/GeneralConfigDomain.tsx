import type { ComponentProps } from 'react';
import { AdminSection } from '../../../components/admin/AdminSection';

export function GeneralConfigDomain(props: ComponentProps<typeof AdminSection>) {
  return <AdminSection {...props} />;
}
