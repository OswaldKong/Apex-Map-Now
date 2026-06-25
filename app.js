const API_URL =
  "https://api.apexlegendsstatus.com/maprotation?auth=6e8dee0518ae2812e0995a4e9f6a4200&version=2";

const REFRESH_INTERVAL_MS = 60_000;

/** @type {{ end: number, timerEl: HTMLElement }[]} */
const activeTimers = [];

function formatRemaining(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function setMapCard(prefix, slot, data, withTimer) {
  const bg = document.getElementById(`${prefix}-${slot}-bg`);
  const name = document.getElementById(`${prefix}-${slot}-name`);

  if (data.asset) {
    bg.style.backgroundImage = `url("${data.asset}")`;
  }

  name.textContent = data.map ?? "—";

  if (withTimer) {
    const timerEl = document.getElementById(`${prefix}-${slot}-timer`);
    if (data.remainingSecs != null && data.end) {
      activeTimers.push({ end: data.end, timerEl });
      timerEl.textContent = formatRemaining(data.remainingSecs);
    } else if (data.remainingTimer) {
      timerEl.textContent = data.remainingTimer;
    }
  }
}

function renderModule(prefix, modeData) {
  if (!modeData) return;

  setMapCard(prefix, "current", modeData.current, true);
  setMapCard(prefix, "next", modeData.next, false);
}

function tickTimers() {
  const now = Math.floor(Date.now() / 1000);

  for (const { end, timerEl } of activeTimers) {
    const remaining = Math.max(0, end - now);
    timerEl.textContent = formatRemaining(remaining);
  }
}

function showError(message) {
  const banner = document.getElementById("error-banner");
  banner.textContent = message;
  banner.classList.remove("hidden");
}

async function fetchAndRender() {
  activeTimers.length = 0;

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    renderModule("br", data.battle_royale);
    renderModule("ranked", data.ranked);

    document.getElementById("last-updated").textContent =
      `最后更新：${new Date().toLocaleString("zh-CN")}`;

    document.getElementById("error-banner").classList.add("hidden");
  } catch (err) {
    showError(`加载失败：${err.message}。请稍后刷新页面重试。`);
  }
}

fetchAndRender();
setInterval(fetchAndRender, REFRESH_INTERVAL_MS);
setInterval(tickTimers, 1000);
