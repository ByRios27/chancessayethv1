import type { ComponentProps } from 'react';
import { ArchiveSection } from '../../../components/archive/ArchiveSection';
import { withSafeCallbacks } from '../../../utils/safeCallbacks';

export function ArchiveDomain(props: ComponentProps<typeof ArchiveSection>) {
  const safeProps = withSafeCallbacks(props as Record<string, unknown>, 'ArchiveDomain') as ComponentProps<typeof ArchiveSection>;
  return <ArchiveSection {...safeProps} />;
}
