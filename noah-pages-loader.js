/* 诺亚下载链接加载器 —— 由后台「域名池 → 发布」自动生成并推送，请勿手动编辑。
 * 落地页无需重新部署即可获得本文件的逻辑更新：脚本缓存过期（约几分钟到12小时）后自动生效。 */
(function () {
  var DISCOVERY = ["https://raw.githubusercontent.com/tocleanme104/relays/main/noah-pages-relays.json","https://cdn.jsdelivr.net/gh/tocleanme104/relays@main/noah-pages-relays.json","https://noah-pages.3906534200.workers.dev"];
  var POOL_KEY  = 'noah_relay_pool';

  function apply(link) {
    if (!link) return;
    document.querySelectorAll('[data-download]').forEach(function (el) { el.href = link; });
  }

  function getCachedPool() {
    try {
      var o = JSON.parse(localStorage.getItem(POOL_KEY) || 'null');
      if (o && o.relays && o.relays.length) return o;
    } catch (e) {}
    return null;
  }

  function fetchLink(relays, i) {
    if (!relays || i >= relays.length) return;
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 2500);
    fetch(relays[i].replace(/\/+$/, '') + '/api.php?t=' + Date.now(), { signal: ctrl.signal, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (data) {
        clearTimeout(timer);
        if (data && data.download_link) apply(data.download_link);
        else fetchLink(relays, i + 1);
      })
      .catch(function () { clearTimeout(timer); fetchLink(relays, i + 1); });
  }

  // 并行请求所有发现地址，取 updated_at/v 最新的一份。
  // 不能「谁先响应算谁」：jsDelivr 对分支链接边缘缓存长达 12 小时且不支持可靠刷新，
  // 会返回 200 + 非空 relays（看起来正常、实际是旧数据），必须靠时间戳比新旧兜底。
  function loadDiscovery(onDone) {
    if (!DISCOVERY.length) { onDone(null); return; }
    var best = null, done = 0;
    function finish() {
      done++;
      if (done < DISCOVERY.length) return;
      if (best) { try { localStorage.setItem(POOL_KEY, JSON.stringify(best)); } catch (e) {} }
      onDone(best);
    }
    DISCOVERY.forEach(function (url) {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 4000);
      fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 'noah_ts=' + Date.now(), { signal: ctrl.signal, cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (pkg) {
          clearTimeout(timer);
          var data = pkg && pkg.data ? pkg.data : pkg;
          if (data && data.relays && data.relays.length) {
            var ts = Number(data.updated_at || data.v || 0);
            if (!best || ts > Number(best.updated_at || best.v || 0)) best = data;
          }
          finish();
        })
        .catch(function () { clearTimeout(timer); finish(); });
    });
  }

  var cached = getCachedPool();
  if (cached) fetchLink(cached.relays, 0);
  loadDiscovery(function (fresh) {
    if (fresh) fetchLink(fresh.relays, 0);
    else if (!cached) { /* 发现层与缓存都不可用：保持按钮初始状态 */ }
  });
})();