type BrowserProcess = {
  env: Record<string, string | undefined>;
  noDeprecation: boolean;
  pid: number;
  throwDeprecation: boolean;
  traceDeprecation: boolean;
  nextTick: (
    callback: (...args: unknown[]) => void,
    ...args: unknown[]
  ) => void;
};

const globalWithProcess = globalThis as unknown as {
  process?: BrowserProcess;
};

globalWithProcess.process ??= {
  env: {},
  noDeprecation: false,
  pid: 0,
  throwDeprecation: false,
  traceDeprecation: false,
  nextTick: (callback, ...args) => {
    queueMicrotask(() => callback(...args));
  },
};
