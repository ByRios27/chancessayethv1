import type { ComponentProps } from 'react';
import { ArchiveSection } from '../../../components/archive/ArchiveSection';

export function ArchiveDomain(props: ComponentProps<typeof ArchiveSection>) {
  return <ArchiveSection {...props} />;
}
