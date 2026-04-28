export interface AppAlert {
  id?: string;
  type: string;
  priority: number;
  title: string;
  message: string;
  createdAt?: any;
  createdByEmail?: string;
  createdByRole?: string;
  targetUserEmail?: string;
  targetRole?: 'ceo' | 'admin' | 'seller';
  global?: boolean;
  readBy?: string[];
  metadata?: Record<string, unknown>;
  actionRef?: string;
  expiresAt?: any;
}

export type CreateAppAlertPayload = Omit<AppAlert, 'id'>;
