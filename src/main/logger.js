const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;

class Logger {
  constructor() {
    this.logDir = null;
    this.currentFile = null;
    this.level = LEVELS.info;
    this._initialized = false;
  }

  init(minLevel = 'info') {
    this.level = LEVELS[minLevel] ?? LEVELS.info;
    this.logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    this.currentFile = path.join(this.logDir, 'wealthflow.log');
    this._initialized = true;
    this.info('Logger initialized', { logDir: this.logDir, level: minLevel });
  }

  _rotate() {
    if (!this._initialized || !fs.existsSync(this.currentFile)) return;
    const stats = fs.statSync(this.currentFile);
    if (stats.size < MAX_FILE_SIZE) return;

    // Shift existing rotated files
    for (let i = MAX_FILES - 1; i >= 1; i--) {
      const older = path.join(this.logDir, `wealthflow.${i}.log`);
      const newer = path.join(this.logDir, `wealthflow.${i - 1}.log`);
      if (i === 1) {
        // Rename current -> .1
        if (fs.existsSync(this.currentFile)) {
          const dest = path.join(this.logDir, 'wealthflow.1.log');
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          fs.renameSync(this.currentFile, dest);
        }
      } else {
        if (fs.existsSync(newer)) {
          if (fs.existsSync(older)) fs.unlinkSync(older);
          fs.renameSync(newer, older);
        }
      }
    }
  }

  _write(level, message, data) {
    if (LEVELS[level] < this.level) return;
    const timestamp = new Date().toISOString();
    const entry = { timestamp, level, message };
    if (data !== undefined) entry.data = this._redact(data);
    const line = JSON.stringify(entry) + '\n';

    // Always log to console
    const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleFn(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data !== undefined ? data : '');

    // Write to file if initialized
    if (this._initialized) {
      try {
        this._rotate();
        fs.appendFileSync(this.currentFile, line);
      } catch (err) {
        console.error('Logger file write failed:', err.message);
      }
    }
  }

  _redact(data) {
    if (data === undefined || data === null) return data;
    if (typeof data === 'string') return data;
    try {
      const clone = JSON.parse(JSON.stringify(data));
      const redactKeys = /key|token|secret|password|api_key|apiKey/i;
      const walk = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        for (const k of Object.keys(obj)) {
          if (redactKeys.test(k) && typeof obj[k] === 'string') {
            obj[k] = '***REDACTED***';
          } else if (typeof obj[k] === 'object') {
            walk(obj[k]);
          }
        }
      };
      walk(clone);
      return clone;
    } catch {
      return data;
    }
  }

  debug(message, data) { this._write('debug', message, data); }
  info(message, data) { this._write('info', message, data); }
  warn(message, data) { this._write('warn', message, data); }
  error(message, data) { this._write('error', message, data); }
}

const logger = new Logger();

module.exports = { Logger, logger };
