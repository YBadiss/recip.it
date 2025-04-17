export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Log info level message
   */
  public info(message: string, data?: Record<string, unknown>): void {
    console.log(`[INFO] [${this.context}] ${message}`, data ? data : '');
  }

  /**
   * Log error level message
   */
  public error(message: string, data?: Record<string, unknown>): void {
    console.error(`[ERROR] [${this.context}] ${message}`, data ? data : '');
  }

  /**
   * Log warning level message
   */
  public warn(message: string, data?: Record<string, unknown>): void {
    console.warn(`[WARN] [${this.context}] ${message}`, data ? data : '');
  }

  /**
   * Log debug level message
   */
  public debug(message: string, data?: Record<string, unknown>): void {
    console.debug(`[DEBUG] [${this.context}] ${message}`, data ? data : '');
  }
}
