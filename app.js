(function () {
  'use strict';

  var cfg = window.__APEX_CFG__;
  var MODULES = [
    { key: 'battle_royale', title: '匹配', showEventOnNext: false },
    { key: 'ranked', title: '排位', showEventOnNext: false },
    { key: 'ltm', title: '团队竞技', showEventOnNext: true },
    { key: 'wildcard', title: '外卡', showEventOnNext: false },
  ];

  var appEl = document.getElementById('app');
  var lastUpdatedEl = document.getElementById('last-updated');
  var refreshIndicatorEl = document.getElementById('refresh-indicator');
  var endTimestamps = {};
  var fetchInFlight = false;
  var refreshTimerId = null;
  var countdownTimerId = null;

  function buildApiUrl() {
    return cfg.apiBase + '?auth=' + encodeURIComponent(cfg.getAuth()) + '&version=' + cfg.apiVersion;
  }

  function formatTimer(totalSeconds) {
    var secs = Math.max(0, totalSeconds);
    var h = Math.floor(secs / 3600);
    var m = Math.floor((secs % 3600) / 60);
    var s = secs % 60;
    return pad(h) + ':' + pad(m) + ':' + pad(s);
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function createMapCard(type, mapData, options) {
    options = options || {};
    var isCurrent = type === 'current';
    var label = isCurrent ? '当前地图' : '下张地图';
    var mapName = mapData && mapData.map ? mapData.map : '—';
    var asset = mapData && mapData.asset ? mapData.asset : '';
    var timerId = options.timerId || '';
    var eventName = mapData && mapData.eventName ? mapData.eventName : '';

    var card = document.createElement('article');
    card.className = 'map-card' + (isCurrent ? ' map-card--current' : ' map-card--next');

    var bg = document.createElement('div');
    bg.className = 'map-card__bg';
    if (asset) {
      bg.style.backgroundImage = 'url("' + asset.replace(/"/g, '\\"') + '")';
    }

    var overlay = document.createElement('div');
    overlay.className = 'map-card__overlay';

    var badge = document.createElement('span');
    badge.className = 'map-card__badge';
    badge.textContent = label;

    var title = document.createElement('h3');
    title.className = 'map-card__title';
    title.textContent = mapName;

    overlay.appendChild(badge);
    overlay.appendChild(title);

    if (isCurrent && timerId) {
      var timer = document.createElement('p');
      timer.className = 'map-card__timer';
      timer.id = timerId;
      timer.textContent = mapData && mapData.remainingTimer ? mapData.remainingTimer : '--:--:--';
      overlay.appendChild(timer);
    }

    if (!isCurrent && options.showEvent && eventName) {
      var event = document.createElement('p');
      event.className = 'map-card__event';
      event.textContent = eventName;
      overlay.appendChild(event);
    }

    card.appendChild(bg);
    card.appendChild(overlay);
    return card;
  }

  function renderModule(moduleConfig, data) {
    var section = document.createElement('section');
    section.className = 'module';
    section.dataset.mode = moduleConfig.key;

    var heading = document.createElement('h2');
    heading.className = 'module__title';
    heading.textContent = moduleConfig.title;
    section.appendChild(heading);

    var grid = document.createElement('div');
    grid.className = 'module__grid';

    var current = data && data.current ? data.current : {};
    var next = data && data.next ? data.next : {};

    if (current.end) {
      endTimestamps[moduleConfig.key] = current.end;
    }

    grid.appendChild(createMapCard('current', current, {
      timerId: 'timer-' + moduleConfig.key,
    }));

    grid.appendChild(createMapCard('next', next, {
      showEvent: moduleConfig.showEventOnNext,
    }));

    section.appendChild(grid);
    return section;
  }

  function renderAll(payload) {
    appEl.innerHTML = '';
    endTimestamps = {};

    MODULES.forEach(function (mod) {
      appEl.appendChild(renderModule(mod, payload[mod.key]));
    });

    updateCountdowns();
  }

  function renderError(message) {
    appEl.innerHTML =
      '<div class="error-state">' +
      '<p>' + escapeHtml(message) + '</p>' +
      '<button type="button" class="retry-btn" id="retry-btn">重试</button>' +
      '</div>';

    var retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        fetchRotationData(true);
      });
    }
  }

  function updateCountdowns() {
    var now = Math.floor(Date.now() / 1000);
    var shouldRefresh = false;

    MODULES.forEach(function (mod) {
      var end = endTimestamps[mod.key];
      var timerEl = document.getElementById('timer-' + mod.key);
      if (!timerEl || !end) return;

      var remaining = end - now;
      timerEl.textContent = formatTimer(remaining);

      if (remaining <= 0) {
        shouldRefresh = true;
      }
    });

    if (shouldRefresh && !fetchInFlight) {
      fetchRotationData(true);
    }
  }

  function setLastUpdated(date) {
    var timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastUpdatedEl.textContent = '上次更新：' + timeStr;
  }

  function fetchRotationData(isManual) {
    if (fetchInFlight) return;
    fetchInFlight = true;
    refreshIndicatorEl.hidden = false;

    fetch(buildApiUrl())
      .then(function (res) {
        if (!res.ok) throw new Error('API 请求失败 (' + res.status + ')');
        return res.json();
      })
      .then(function (data) {
        renderAll(data);
        setLastUpdated(new Date());
      })
      .catch(function (err) {
        if (!appEl.querySelector('.map-card')) {
          renderError(err.message || '无法加载地图数据，请稍后重试。');
        }
        lastUpdatedEl.textContent = '更新失败 · ' + new Date().toLocaleTimeString('zh-CN');
      })
      .finally(function () {
        fetchInFlight = false;
        refreshIndicatorEl.hidden = true;
      });
  }

  function startTimers() {
    if (countdownTimerId) clearInterval(countdownTimerId);
    if (refreshTimerId) clearInterval(refreshTimerId);

    countdownTimerId = setInterval(updateCountdowns, cfg.countdownIntervalMs);
    refreshTimerId = setInterval(function () {
      fetchRotationData(false);
    }, cfg.refreshIntervalMs);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      fetchRotationData(false);
      updateCountdowns();
    }
  });

  fetchRotationData(false);
  startTimers();
})();
