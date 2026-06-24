type Level = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVELS: Record<Level, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

type ConsoleFn = (...args: unknown[]) => void;

const CONSOLE_FN: Record<Exclude<Level, 'silent'>, ConsoleFn> = {
  debug: (...args) => console.log(...args),
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

function getLevel(): Level {
  const configured = (process.env.LOG_LEVEL ?? '').toLowerCase() as Level;
  if (configured in LEVELS) return configured;
  if (process.env.NODE_ENV === 'test') return 'warn';
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

class Logger {
  private ctx: Record<string, unknown>;

  constructor(ctx: Record<string, unknown> = {}) {
    this.ctx = ctx;
  }

  private emit(level: Exclude<Level, 'silent'>, msg: string, extra?: unknown): void {
    if (LEVELS[level] < LEVELS[getLevel()]) return;
    const fn = CONSOLE_FN[level];

    if (process.env.NODE_ENV === 'production') {
      const entry: Record<string, unknown> = {
        level,
        msg,
        time: new Date().toISOString(),
        ...this.ctx,
      };
      if (extra !== undefined) entry.data = extra;
      fn(JSON.stringify(entry));
    } else {
      const prefix = this.ctx.service ? `[${String(this.ctx.service)}] ` : '';
      if (extra !== undefined) fn('%s', prefix + msg, extra);
      else fn('%s', prefix + msg);
    }
  }

  debug(msg: string, extra?: unknown): void {
    this.emit('debug', msg, extra);
  }
  info(msg: string, extra?: unknown): void {
    this.emit('info', msg, extra);
  }
  warn(msg: string, extra?: unknown): void {
    this.emit('warn', msg, extra);
  }
  error(msg: string, extra?: unknown): void {
    this.emit('error', msg, extra);
  }

  child(ctx: Record<string, unknown>): Logger {
    return new Logger({ ...this.ctx, ...ctx });
  }
}

export const logger = new Logger();
