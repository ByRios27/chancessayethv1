import { toast, type ExternalToast } from 'sonner';

export const toastSuccess = (message: string, options?: ExternalToast) =>
  toast.success(message, { duration: 180, ...options });

