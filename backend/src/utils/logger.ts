export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Create a logger instance for a specific context
   */
  public static forContext(context: string): Logger {
    return new Logger(context);
  }

  /**
   * Format log entry as JSON
   */
  private formatLogEntry(level: string, message: string, data?: Record<string, unknown>): string {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...(data ? { data } : {}),
    };

    return JSON.stringify(logEntry);
  }

  /**
   * Log info level message
   */
  public info(message: string, data?: Record<string, unknown>): void {
    console.log(this.formatLogEntry('INFO', message, data));
  }

  /**
   * Log error level message
   */
  public error(message: string, data?: Record<string, unknown>): void {
    console.error(this.formatLogEntry('ERROR', message, data));
  }

  /**
   * Log warning level message
   */
  public warn(message: string, data?: Record<string, unknown>): void {
    console.warn(this.formatLogEntry('WARN', message, data));
  }

  /**
   * Log debug level message
   */
  public debug(message: string, data?: Record<string, unknown>): void {
    console.debug(this.formatLogEntry('DEBUG', message, data));
  }
}
