/* 诺亚下载链接加载器 —— 由后台「域名池 → 发布」自动生成并推送，请勿手动编辑。
 * 落地页无需重新部署即可获得本文件的逻辑更新：脚本缓存过期（约几分钟到12小时）后自动生效。 */
(function () {
  var DISCOVERY = ["https://noah-pages.3906534200.workers.dev","https://raw.githubusercontent.com/tocleanme104/relays/main/noah-pages-relays.json","https://cdn.jsdelivr.net/gh/tocleanme104/relays@main/noah-pages-relays.json"];
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

  // 依次尝试发现地址：第一个成功即用，只发 1 个请求；只有它挂了/超时/内容异常，
  // 才会退到下一个。cache: 'no-store' 确保绕过浏览器本地缓存，每次都是真实网络请求。
  function discover(i, onDone) {
    if (i >= DISCOVERY.length) { onDone(null); return; }
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 3000);
    fetch(DISCOVERY[i] + (DISCOVERY[i].indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now(), { signal: ctrl.signal, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (pkg) {
        clearTimeout(timer);
        var data = pkg && pkg.data ? pkg.data : pkg;
        if (data && data.relays && data.relays.length) {
          try { localStorage.setItem(POOL_KEY, JSON.stringify(data)); } catch (e) {}
          onDone(data);
        } else { discover(i + 1, onDone); }
      })
      .catch(function () { clearTimeout(timer); discover(i + 1, onDone); });
  }

  discover(0, function (fresh) {
    // 所有发现地址都失败（比如离线）才退回本地缓存兜底，正常情况下永远走的是实时数据
    var pool = fresh || getCachedPool();
    if (pool) fetchLink(pool.relays, 0);
  });
})();