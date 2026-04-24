import type { ComponentProps } from 'react';
import { UsersSection } from '../../../components/users/UsersSection';
import { withSafeCallbacks } from '../../../utils/safeCallbacks';

export function UsersDomain(props: ComponentProps<typeof UsersSection>) {
  const safeProps = withSafeCallbacks(props as Record<string, unknown>, 'UsersDomain') as ComponentProps<typeof UsersSection>;
  return <UsersSection {...safeProps} />;
}
