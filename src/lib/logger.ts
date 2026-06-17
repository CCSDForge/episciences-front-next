type Level = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVELS: Record<Level, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
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

    if (process.env.NODE_ENV === 'production') {
      const entry: Record<string, unknown> = {
        level,
        msg,
        time: new Date().toISOString(),
        ...this.ctx,
      };
      if (extra !== undefined) entry.data = extra;
      const line = JSON.stringify(entry);
      if (level === 'warn') console.warn(line);
      else if (level === 'error') console.error(line);
      else console.log(line);
    } else {
      const prefix = this.ctx.service ? `[${String(this.ctx.service)}] ` : '';
      if (extra !== undefined) {
        if (level === 'warn') console.warn('%s', prefix + msg, extra);
        else if (level === 'error') console.error('%s', prefix + msg, extra);
        else console.log('%s', prefix + msg, extra);
      } else {
        if (level === 'warn') console.warn('%s', prefix + msg);
        else if (level === 'error') console.error('%s', prefix + msg);
        else console.log('%s', prefix + msg);
      }
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
