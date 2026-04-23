import type { ComponentProps } from 'react';
import { UsersSection } from '../../../components/users/UsersSection';

export function UsersDomain(props: ComponentProps<typeof UsersSection>) {
  return <UsersSection {...props} />;
}
