export class ErrorInfo extends Error {
  text: string;
  code: number;
  payload?: unknown;

  constructor(message: string, text: string, code: number, payload?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.text = text;
    this.code = code;
    this.payload = payload;

    // Maintains proper stack trace for where our error was thrown (only available on V8 engines)
    const errorConstructor = Error as ErrorConstructor & {
      captureStackTrace?: (
        targetObject: object,
        constructorOpt?: (...args: unknown[]) => unknown,
      ) => void;
    };

    if (errorConstructor.captureStackTrace) {
      errorConstructor.captureStackTrace(
        this,
        this.constructor as (...args: unknown[]) => unknown,
      );
    }
  }
}
