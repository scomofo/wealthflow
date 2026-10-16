class BackgroundSyncCoordinator {
  constructor({ syncOnce, debounceMs = 5000, onState = () => {} }) {
    if (typeof syncOnce !== 'function') throw new Error('syncOnce is required.');
    this.syncOnce = syncOnce;
    this.debounceMs = debounceMs;
    this.onState = onState;
    this.timer = null;
    this.running = null;
    this.stopped = false;
    this.blocked = false;
  }

  async run(reason = 'manual') {
    if (this.stopped || this.blocked) return null;
    if (this.running) return this.running;
    this.running = (async () => {
      try {
        const result = await this.syncOnce();
        this.onState({ ...result, reason, at: new Date().toISOString() });
        if (result?.state === 'conflict' || result?.state === 'remote-newer') this.blocked = true;
        return result;
      } catch (error) {
        this.onState({ state: 'error', reason, message: error.message, at: new Date().toISOString() });
        throw error;
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  start() {
    this.stopped = false;
    return this.run('startup');
  }

  markDirty() {
    if (this.stopped || this.blocked) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.run('save').catch(() => {});
    }, this.debounceMs);
  }

  unblockAfterReview() {
    this.blocked = false;
  }

  async stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.timer = null;
    if (this.running) {
      try { await this.running; } catch { /* already surfaced */ }
      return;
    }
    this.stopped = false;
    try { await this.run('shutdown'); } finally { this.stopped = true; }
  }
}

module.exports = { BackgroundSyncCoordinator };
