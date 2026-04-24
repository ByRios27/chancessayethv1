const CALLBACK_NAME_PATTERN = /^(on[A-Z]|set[A-Z]|handle[A-Z]|add[A-Z]|remove[A-Z]|update[A-Z]|clear[A-Z]|open[A-Z]|close[A-Z]|toggle[A-Z]|save[A-Z]|delete[A-Z]|fetch[A-Z]|apply[A-Z]|cancel[A-Z]|share[A-Z]|download[A-Z])/;

const noop = () => undefined;

export const withSafeCallbacks = <T extends Record<string, unknown>>(props: T, componentName: string): T => {
  const patched = { ...props } as T;

  Object.entries(props).forEach(([key, value]) => {
    if (!CALLBACK_NAME_PATTERN.test(key)) return;
    if (value === undefined) return;
    if (typeof value === 'function') return;

    console.error(`[${componentName}] Callback invalido: ${key}`, value);
    (patched as Record<string, unknown>)[key] = noop;
  });

  return patched;
};

