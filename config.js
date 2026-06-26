(function () {
  'use strict';

  const _k = [65, 112, 101, 120, 77, 97, 112, 82, 111, 116, 50, 48, 50, 54];
  const _e = [119, 21, 93, 28, 40, 4, 64, 103, 94, 76, 83, 85, 0, 14, 112, 66, 0, 72, 116, 88, 69, 51, 91, 17, 11, 86, 4, 87, 117, 66, 85, 72];

  function _d() {
    return _e.map(function (c, i) {
      return String.fromCharCode(c ^ _k[i % _k.length]);
    }).join('');
  }

  window.__APEX_CFG__ = Object.freeze({
    apiBase: 'https://api.apexlegendsstatus.com/maprotation',
    apiVersion: '2',
    getAuth: _d,
    refreshIntervalMs: 30000,
    countdownIntervalMs: 1000,
  });
})();
