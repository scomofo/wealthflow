export function progress(val, max, color, height = 8) {
  const p = Math.min((val / (max || 1)) * 100, 100);
  return `<div class="progress-bg" style="height:${height}px">
    <div class="progress-fill" style="width:${p}%;height:100%;background:linear-gradient(90deg,${color},${color}bb)"></div>
  </div>`;
}
