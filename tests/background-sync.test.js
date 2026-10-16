const { BackgroundSyncCoordinator } = require('../src/main/background-sync');
describe('background sync coordinator',()=>{
  beforeEach(()=>jest.useFakeTimers());
  afterEach(()=>jest.useRealTimers());
  test('runs at startup and debounces repeated saves',async()=>{
    const syncOnce=jest.fn().mockResolvedValue({state:'same'});
    const c=new BackgroundSyncCoordinator({syncOnce,debounceMs:100});
    await c.start(); expect(syncOnce).toHaveBeenCalledTimes(1);
    c.markDirty(); c.markDirty(); jest.advanceTimersByTime(100); await Promise.resolve(); await Promise.resolve();
    expect(syncOnce).toHaveBeenCalledTimes(2);
  });
  test('blocks automatic work when remote review is required',async()=>{
    const syncOnce=jest.fn().mockResolvedValueOnce({state:'remote-newer'}).mockResolvedValue({state:'same'});
    const c=new BackgroundSyncCoordinator({syncOnce,debounceMs:10});
    await c.start(); c.markDirty(); jest.advanceTimersByTime(20); await Promise.resolve();
    expect(syncOnce).toHaveBeenCalledTimes(1);
    c.unblockAfterReview(); c.markDirty(); jest.advanceTimersByTime(10); await Promise.resolve(); await Promise.resolve();
    expect(syncOnce).toHaveBeenCalledTimes(2);
  });
  test('coalesces concurrent runs',async()=>{
    let resolve; const pending=new Promise(r=>{resolve=r});
    const syncOnce=jest.fn(()=>pending);
    const c=new BackgroundSyncCoordinator({syncOnce});
    const a=c.run('a'), b=c.run('b'); resolve({state:'same'}); await Promise.all([a,b]);
    expect(syncOnce).toHaveBeenCalledTimes(1);
  });
});
