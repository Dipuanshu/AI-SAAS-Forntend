export type ToastTone = 'success' | 'error' | 'info';
type Listener = (message: string, tone: ToastTone) => void;

let listener: Listener | null = null;

export const setToastListener = (l: Listener | null) => {
  listener = l;
};

export const toast = (message: string, tone: ToastTone = 'success') => listener?.(message, tone);
export const toastError = (e: unknown) => toast(e instanceof Error ? e.message : 'Something went wrong', 'error');
