'use strict';

import * as THREE from 'three';

const $ = id => document.getElementById(id);
const $v = id => $(id).value || $(id).textContent;
const $n = id => Number($v(id));
const $$ = sel => Array.from(document.querySelectorAll(sel));

/**
 * 値が Number でないかどうか確認します。
 * @function isnan2
 * @param {any} val - 検査する値
 */
const isnan2 = val => val === null || isNaN(val);

let setUrlWait = null;

/**
 * 現在のパラメータに合わせて URL を生成しアドレスバーを変更します。
 * @function setUrl
 */
const setUrl = async () => {

  if (setUrlWait) return;
  setUrlWait = true;
  await new Promise(resolve => setTimeout(resolve, 500));
  setUrlWait = false;

  const currentState = location.href.split('?')[1];

  const params = [];

  for (const q of Array.from($$('*'))) {

    if (q.disabled || !q.id) continue;
    const id = q.id;
    if (id === 'seekbar') continue;

    if (
      (q.tagName === 'INPUT' && ~['text', 'range'].indexOf(q.getAttribute('type')))
      || q.tagName === 'SELECT'
    ) {

      params.push(`${id}=${q.value}`);

    } else if (q.tagName === 'INPUT' && q.getAttribute('type') === 'checkbox') {

      params.push(`${id}=${q.checked ? 't' : 'f'}`);

    }

  }

  const newState = params.join('&');
  if (newState === currentState) return;
  history.replaceState(null, null, `${location.href.split('?')[0]}?${newState}`);

}; // setUrl

/**
 * 与えられたメッセージに日時を付与してコンソールに表示します。
 * @function log
 * @param {String} str - メッセージ
 * @param {String} cat - カテゴリ log | warn | error
 */
const log = (str, cat = 'log') => {

  str = `${new Date().toISOString()} [${cat}] ${str}`;

  if (cat === 'log') {

    console.log(str);

  } else if (cat === 'warn') {

    console.warn(str);
    //$('log').innerHTML += `<span class="log-warn" data-time="${new Date().getTime()}">${str}<br></span>`;

  } else if (cat === 'error') {

    str += ' reloading in 3 seconds...';
    console.error(str);
    document.body.innerHTML = str;
    setTimeout(() => window.location.reload(), 3000);

  }

}; // log

/**
 * Date 型を指定されたフォーマットの文字列に変形して返します。
 * Number 型はパースを試みます。
 * String 型は dt をそのまま返します。
 * @function date2str
 * @param {Date | String | Number} dt
 * @param {String} timezone - タイムゾーンを示す文字列。UTC | JST
 * @param {String} format - Date 型を文字列に変形する際のフォーマット。
 */
const date2str = (dt, timezone = null, format = '%Y/%m/%d %H:%M %z') => {

  if (typeof dt === 'string') return dt;

  if (typeof dt === 'number') {

    const dt2 = new Date(dt);
    if (dt2 == 'Invalid Date') return dt;
    dt = dt2;

  }

  if (!timezone) timezone = 'UTC';
  let tzOffset = 0;

  if (timezone === 'UTC') {
    tzOffset = 0;
  } else if (timezone === 'JST') {
    tzOffset = 9;
  } else {
    return '???';
  }

  const iso = new Date(dt.getTime() + tzOffset * 3600000).toISOString();
  return format
    .replace('%Y', iso.slice(0, 4))
    .replace('%m', iso.slice(5, 7))
    .replace('%d', iso.slice(8, 10))
    .replace('%H', iso.slice(11, 13))
    .replace('%M', iso.slice(14, 16))
    .replace('%S', iso.slice(17, 19))
    .replace('%z', timezone)
    .replace('%s', (dt.getTime() / 1000).toFixed())
    .replace('%J', (40587.0 + dt.getTime() / 86400000).toFixed(5));

}; // date2str

/**
 * 緯度の値を [-89.9, 89.9] に収めて返します。
 * @function modlat
 * @param {Number} lat - 緯度
 */
const modlat = lat => Math.min(89.9, Math.max(-89.9, Number(lat) || 0));

/**
 * 経度の値を [-180, 180) に収めて返します。
 * @function modlon
 * @param {Number} lon - 経度
 */
const modlon = lon => {

  const l = 0.5 + (Number(lon) || 0) / 360;
  return 360 * (l - Math.floor(l)) - 180;

}; // modlon

/**
 * 緯度・経度（方向の回転量）を与えると 0N0E を基準とした球体回転の Quaternion を返します。
 * @function latlon2qt
 * @param {Number} lat - 緯度
 * @param {Number} lon - 経度
 */
const latlon2qt = (lat, lon) => {

  const ct = Math.cos(lat * Math.PI / 360);
  const st = Math.sin(lat * Math.PI / 360);
  const cp = Math.cos(lon * Math.PI / 360);
  const sp = Math.sin(lon * Math.PI / 360);
  return new THREE.Quaternion(-1 * st * sp, -1 * ct * sp, -1 * st * cp, ct * cp);

}; // latlon2qt

/**
 * 0N0E を基準とした球体回転の Quaternion を与えると緯度・経度（方向の回転量）を返します。
 * @function qt2latlon
 * @param {THREE.Quaternion} qt - Quaternion
 */
const qt2latlon = qt => {

  const x = qt._x;
  const y = qt._y;
  const z = qt._z;
  const w = qt._w;
  const lat = modlat((x ** 2 + y ** 2 > 0.5 ? Math.atan2(y, -x) : Math.atan2(w, z)) * 360 / Math.PI);
  const lon = modlon((x ** 2 + z ** 2 > 0.5 ? Math.atan2(z, -x) : Math.atan2(w, y)) * 360 / Math.PI);
  return [lat, lon];

}; // qt2latlon

window.onload = async () => {

  let isNeu = true;
  // web アプリとして実行すると Neutralino.init() が必ず失敗することを利用している
  try { Neutralino.init(); } catch { isNeu = false; }

  let settingsPath = './settings.js';

  if (isNeu) {

    Neutralino.events.on('windowClose', () => Neutralino.app.exit());

    // リロードで表示状態再現、再起動で表示状態リセットを実現するため
    // Neutralino の場合 URL 自動生成は常に有効にしておく
    $('toggleUrl').checked = true;
    $('toggleUrlWrapper').style.display = 'none';

    const listData = await Neutralino.filesystem.readFile(settingsPath);
    settingsPath = `data:text/javascript,${encodeURIComponent(listData)}`;

  }

  const { settings } = await import(settingsPath);

  let w = window.innerWidth;
  let h = window.innerHeight;

  const camera = new THREE.PerspectiveCamera(60, w / h);

  const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    canvas: $('canvas'),
    depth: false,
  });

  renderer.clippingPlanes = [plane];
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(w, h);

  const scene = new THREE.Scene();

  const rotatable = new THREE.Group();

  scene.add(rotatable);

  const annotations = {};

  const coastTexture = new THREE.TextureLoader().load('coastlines.png');

  coastTexture.minFilter = THREE.LinearFilter;
  coastTexture.magFilter = THREE.LinearFilter;

  annotations.coast = new THREE.Mesh(
    new THREE.SphereGeometry(
      1, 64, 32,
    ),
    new THREE.MeshBasicMaterial({
      map: coastTexture,
      transparent: true,
      opacity: 0.5,
    })
  );

  annotations.equator = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(
      [...Array(361)]
        .map((_, i) => i * Math.PI / 180)
        .map(lonr => new THREE.Vector3(
          Math.cos(lonr),
          0,
          Math.sin(lonr)
        ))
    ),
    new THREE.LineBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
    })
  );

  annotations.lonlats = new THREE.Group();

  for (let lon = 0; lon < 360; lon += 10) {

    const lonr = lon * Math.PI / 180;
    annotations.lonlats.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          [...Array(181)]
            .map((_, i) => (i - 90) * Math.PI / 180)
            .map(latr => new THREE.Vector3(
              Math.cos(latr) * Math.cos(lonr),
              Math.sin(latr),
              Math.cos(latr) * Math.sin(lonr)
            ))
        ),
        new THREE.LineBasicMaterial({
          color: 0xcc3333,
          transparent: true,
          opacity: lon % 30 === 0 ? 0.6 : 0.4,
        })
      )
    );

  }

  for (let lat = -80; lat <= 80; lat += 10) {
    const latr = lat * Math.PI / 180;
    annotations.lonlats.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          [...Array(361)]
            .map((_, i) => i * Math.PI / 180)
            .map(lonr => new THREE.Vector3(
              Math.cos(latr) * Math.cos(lonr),
              Math.sin(latr),
              Math.cos(latr) * Math.sin(lonr)
            ))
        ),
        new THREE.LineBasicMaterial({
          color: 0xcc3333,
          transparent: true,
          opacity: lat % 30 === 0 ? 0.6 : 0.4,
        })
      )
    );
  }

  annotations.svg = new THREE.Mesh(
    new THREE.SphereGeometry(
      1, 64, 32,
      Math.PI,
      2 * Math.PI,
      0,
      Math.PI
    )
  );

  rotatable.add(...['equator', 'lonlats', 'coast', 'svg'].map(a => annotations[a]));

  annotations.outline = new THREE.Line();
  scene.add(annotations.outline);

  annotations.svg.renderOrder = 900;
  annotations.outline.renderOrder = 800;
  annotations.equator.renderOrder = 700;
  annotations.lonlats.renderOrder = 600;
  annotations.coast.renderOrder = 500;

  /**
   * 球体回転の設定を行います。
   * @function setRotation
   * @param {String} mode
   *   - 'form'  フォームから値を取得して設定します。
   *   - 'reset' settings.js の latD, lonD に設定します。
   */
  const setRotation = (mode = 'form') => {

    if (mode === 'reset') {

      $('rotSpeed').textContent = 0;
      changeAutoRotate(0);

    }

    $('lat').value = modlat(mode === 'reset' ? contentProp.latD : $n('lat')).toFixed(1);
    $('lon').value = modlon(mode === 'reset' ? contentProp.lonD : $n('lon')).toFixed(1);

    const lat = $n('lat');
    const lon = $n('lon');

    const qt = latlon2qt(lat, lon);
    rotatable.setRotationFromQuaternion(qt);

  }; // setRotation

  let dragPrevX = 0;
  let dragPrevY = 0;
  let isTapped = false;

  /**
   * タッチ開始座標を取得して保存＆ダブルタップを検出します。
   * @function touchStartHandler
   * @param {EventTarget} e
   */
  const touchStartHandler = e => {

    dragPrevX = e.touches[0].pageX;
    dragPrevY = e.touches[0].pageY;

    if (isTapped) {

      e.preventDefault();
      setRotation('reset');
      isTapped = false;

    } else {

      isTapped = true;
      setTimeout(() => isTapped = false, 200);

    }

  }; // touchStartHandler

  /**
   * ドラッグもしくはスワイプによる球体回転を制御します。
   * @function dragRotation
   * @param {EventTarget} e
   */
  const dragRotation = e => {

    let dragX = e.clientX;
    let dragY = e.clientY;

    if (e.touches) {

      dragX = e.touches[0].pageX;
      dragY = e.touches[0].pageY;

    }

    const dragDeltaX = dragX - dragPrevX;
    const dragDeltaY = dragY - dragPrevY;
    dragPrevX = dragX;
    dragPrevY = dragY;

    // 左クリックかタッチがない場合は終了
    if (e.buttons % 2 !== 1 && !e.touches) return;

    // 動かしていない場合は終了
    if (dragDeltaX === 0 && dragDeltaY === 0) return;

    // 移動量が大きすぎる場合は変なので終了
    if (Math.abs(dragDeltaX) > 1000) return;
    if (Math.abs(dragDeltaY) > 1000) return;

    let lat = $n('lat');
    let lon = $n('lon');

    if (!$('dragRot').disabled && $('dragRot').checked) {

      if (dragDeltaX !== 0) {

        const lonsign = $n('xp') > 0 ? -1 : 1;
        lon = modlon(lon + lonsign * 0.15 * dragDeltaX);

      }

      if (dragDeltaY !== 0) lat = modlat(lat + 0.15 * dragDeltaY);

    }

    $('lat').value = lat.toFixed(1);
    $('lon').value = lon.toFixed(1);

    setRotation('form');

  }; // dragRotation

  /**
   * 説明文と SVG 注釈を生成します。
   * @function setDesc
   */
  const setDesc = () => {

    if (contentProp.videoTimeList) {

      const dtf = date2str(
        contentProp.videoTimeList[0],
        contentProp.timeZone,
        contentProp.timeFormat.replace(/ +%z/, ''),
      );
      const dtt = date2str(
        contentProp.videoTimeList.at(-1),
        contentProp.timeZone,
        contentProp.timeFormat,
      );

      $('descRange').innerHTML = `${dtf} ~ ${dtt}`;

    }

    $('descTime').style.display = contentProp.videoTimeList || contentProp.imageTime ? 'block' : 'none';
    $('descRange').style.display = contentProp.videoTimeList ? 'block' : 'none';
    $('progress').style.display = (contentProp.type === 'video' || iContent !== null) ? 'block' : 'none';

    for (const d of ['descTitle', 'descMain', 'descSub']) {

      $(d).innerHTML = contentProp[d] || '';
      $(d).style.display = contentProp[d] ? 'block' : 'none';

    }

    changeDescPos();

    const svgTexture = new THREE.TextureLoader().load(
      'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="3600" height="1800" viewBox="0 -90 360 180">
          <style>${contentProp.svgStyle || ''}</style>
          ${contentProp.svg || ''}
        </svg>
      `)
    );

    svgTexture.minFilter = THREE.LinearFilter;
    svgTexture.magFilter = THREE.LinearFilter;

    annotations.svg.material.dispose();
    annotations.svg.material = new THREE.MeshBasicMaterial({
      map: svgTexture,
      side: THREE.DoubleSide,
      transparent: true,
    });

  }; // setDesc

  const content = new THREE.Mesh();
  rotatable.add(content);

  let contentProp = {};
  let slideshowContents = [];
  let iContent = null;
  let isChangeSeekbar = false;
  let timeImage = null;

  const video = document.createElement('video');

  /**
   * コンテンツを球体上に表示します。
   * @function changeContent
   * @param {String} contentValue - settings.contents 上での value
   */
  const changeContent = async (contentValue = null) => {

    // お掃除
    if (video.src) video.removeAttribute('src');
    video.load();

    content.geometry.dispose();
    content.material.dispose();
    content.visible = false;
    annotations.svg.visible = false;

    // セットアップ開始
    contentProp = {...settings.contents[contentValue || $v('content')]};

    // type が slideshow のときコンテンツリストのループに入って終了
    if (contentProp.type === 'slideshow') {

      slideshowContents = contentProp.slideshowContents;
      iContent = 0;
      moveContent(0);
      return;

    }

    // 引数なし実行かつ type が slideshow でないときはスライドショーモードではない
    if (contentValue === null) {

      slideshowContents = [];
      iContent = null;

    }

    $$('.slideshowControl').forEach(q => q.style.display = iContent !== null ? 'revert' : 'none');
    $$('.videoControl').forEach(q => q.style.display = contentProp.type === 'video' ? 'revert' : 'none');

    $('setRot').disabled = contentProp.lockRotation;
    $('resetRot').disabled = contentProp.lockRotation;
    $('dragRot').disabled = contentProp.lockRotation;
    dragRotCheck();

    isChangeSeekbar = false;
    timeImage = null;
    setDesc();
    $('descTime').textContent = 'loading...';

    if (contentProp.resetRotation || contentProp.lockRotation) setRotation('reset');

    if (!contentProp.path) {

      content.visible = false;
      return;

    }

    for (const xy of ['descPosX', 'descPosY']) {

      if (xy in contentProp) $(xy).value = contentProp[xy];

    }

    changeDescPos();

    let url = contentProp.path;

    /* deleteme */
    if (isNeu && !/https?:/.test(contentProp.path)) {

      const contentExt = contentProp.path.split('.').at(-1).toLowerCase();
      const mimePre = ~['avi', 'mov', 'mpeg', 'mp4', 'webm'].indexOf(contentExt) ? 'video' : 'image';
      const mimeSuf = contentExt === 'jpg' ? 'jpeg' : contentExt;
      const mime = `${mimePre}/${mimeSuf}`;
      const data = await Neutralino.filesystem.readBinaryFile(contentProp.path);
      const blob = new Blob([data], { type: mime });
      url = URL.createObjectURL(blob);

    }
    /* deleteme */

    let texture;

    if (contentProp.type === 'image') {

      texture = new THREE.TextureLoader().load(url);

      if (iContent !== null) timeImage = new Date().getTime();

      if (contentProp.imageTime) $('descTime').textContent = date2str(
        contentProp.imageTime,
        contentProp.timeZone,
        contentProp.timeFormat,
      );

    } else if (contentProp.type === 'video') {

      video.src = url;
      video.loop = false;
      video.muted = true;
      video.setAttribute('crossorigin', 'anonymous');

      video.onended = async () => {

        await new Promise(resolve => setTimeout(resolve, contentProp.videoPauseAfter));
        if (isChangeSeekbar || video.currentTime < video.duration) return; // シークバーをいじった場合

        if (iContent !== null) {

          // スライドショーの次のコンテンツへ
          moveContent(1);

        } else {

          // ループ再生
          video.currentTime = 0;
          const src = video.src;
          await new Promise(resolve => setTimeout(resolve, contentProp.videoPauseBefore));
          if (video.src !== src) return; // コンテンツを変えた場合
          if (video.currentTime > 0) return; // シークバーをいじった場合
          toggleVideoPlay('play');

        }

      };

      video.onloadeddata = () => {

        if (contentProp.videoTimeList) {

          const nFrame1 = contentProp.videoTimeList.length;
          const nFrame2 = Math.round(video.duration * contentProp.videoFps);
          $('nFrame').textContent = nFrame2;
          if (nFrame1 !== nFrame2) log(`コンテンツ ${contentProp.value} で videoTimeList の長さ ${nFrame1} と videoFps から推測されるフレーム数 ${nFrame2} が異なります`, 'warn');

        }

      };

      video.load();

      texture = new THREE.VideoTexture(video);

      // video.load() の後にやる必要あり
      video.playbackRate = contentProp.videoFpsDisp / contentProp.videoFps || 1;
      $('videoFps').textContent = contentProp.videoFpsDisp;
      changeVideoFps(0);

      toggleVideoPlay('pause');

      (async () => {

        const src = video.src;
        await new Promise(resolve => setTimeout(resolve, contentProp.videoPauseBefore));
        if (video.src !== src) return; // コンテンツを変えた場合
        if (video.currentTime > 0) return; // シークバーをいじった場合
        toggleVideoPlay('play');

      })();

    }

    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    content.geometry = new THREE.SphereGeometry(
      1, 64, 32,
      (180 + contentProp.lonW) * Math.PI / 180,
      (contentProp.lonE - contentProp.lonW) * Math.PI / 180,
      (90 - contentProp.latN) * Math.PI / 180,
      (contentProp.latN - contentProp.latS) * Math.PI / 180
    );

    content.material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: texture,
    });

    content.visible = true;
    toggleAnnotation('svg');

  }; // changeContent

  /**
   * 投影幾何パラメータを反映させます。
   * @function setGeometry
   * @param {String} preset - 投影幾何プリセットの value
   */
  const setGeometry = (preset = null) => {

    if (preset === 'preset') preset = $v('geometry');
    if (preset === 'free' && !$v('xp')) preset = Object.keys(settings.geometry)[0];

    if (preset in settings.geometry) {

      const p = settings.geometry[preset];

      for (const elem of ['r', 'xp', 'yp', 'pp']) {

        if (isnan2(p[elem])) continue;
        $(elem).value = p[elem].toFixed(1);

      }

    } else {

      $('geometry').value = 'free';

    }

    $('r').value = $n('r').toFixed(1);
    $('xp').value = $n('xp').toFixed(1);
    $('yp').value = $n('yp').toFixed(1);
    $('pp').value = $n('pp').toFixed(1);
    const r = $n('r');
    const xp = $n('xp');
    const yp = $n('yp');
    const pp = $n('pp');

    // 範囲チェック
    $$('.invalid').forEach(q => q.classList.remove('invalid'));

    if (isnan2(r) || r < 1 || 1000 < r) $('r').classList.add('invalid');
    if (isnan2(xp) || 1000 * r < Math.abs(xp) || (-0.1 * r < xp && xp < 1.1 * r)) $('xp').classList.add('invalid');
    if (isnan2(yp) || r <= Math.abs(yp)) $('yp').classList.add('invalid');
    if (isnan2(pp) || 90 < Math.abs(pp)) $('pp').classList.add('invalid');

    if (document.querySelector('.invalid')) return;

    // 左右反転処理
    const signxp = xp > 0 ? 1 : -1;
    const scaleX = signxp;

    $('centerWrapper').style.transform = `scaleX(${scaleX})`;
    $('canvas').style.transform = `scaleX(${signxp * scaleX})`;

    // カメラ調整
    camera.setViewOffset(w, h, 0, 0, w, h);
    camera.position.set(xp / r, yp / r, 0);
    camera.setRotationFromQuaternion(latlon2qt(signxp * pp, signxp * -90));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    // 投影幾何補助値計算
    const vp = camera.position;

    let vn = new THREE.Vector3(0, 1, 0);
    let vs = new THREE.Vector3(0, -1, 0);
    let vp2vn = vn.clone().sub(vp);
    let vp2vs = vs.clone().sub(vp);

    if (0 < xp) {

      const t = Math.asin(1 / vp.length());
      const vlen = vp.length() * Math.cos(t);
      const t0 = Math.atan2(vp.y, vp.x);
      const tn = t - t0;
      const ts = -1 * t - t0;
      vp2vn = new THREE.Vector3(-1 * Math.cos(tn), Math.sin(tn), 0).multiplyScalar(vlen);
      vp2vs = new THREE.Vector3(-1 * Math.cos(ts), Math.sin(ts), 0).multiplyScalar(vlen);
      vn = vp2vn.clone().add(vp);
      vs = vp2vs.clone().add(vp);

    }

    const xnorm = new THREE.Vector3((xp < 0 ? 1 : -1), 0, 0);
    const pn = (vp2vn.y > 0 ? 1 : -1) * vp2vn.angleTo(xnorm) * 180 / Math.PI - pp;
    const ps = (vp2vs.y > 0 ? 1 : -1) * vp2vs.angleTo(xnorm) * 180 / Math.PI - pp;

    $('pn').textContent = pn.toFixed(1);
    $('ps').textContent = ps.toFixed(1);

    // clippingPlanes 再設定
    let planeNorm = new THREE.Vector3(1, 0, 0);
    let planeOfs = 0;
    const vc = vs.clone().add(vn).multiplyScalar(0.5);

    if (vc.length() > 10 ** -5) {

      planeNorm = vc.clone().normalize();
      planeOfs = -1 * vc.length();

    }

    plane.set(planeNorm, planeOfs);

    // 輪郭再設定
    const vr = vn.clone().sub(vc);

    annotations.outline.geometry = new THREE.BufferGeometry().setFromPoints(
      [...Array(361)]
        .map((_, i) => i * Math.PI / 180)
        .map(i => new THREE.Vector3(
          vc.x + vr.x * Math.cos(i) + 0.0001,
          vc.y + vr.y * Math.cos(i),
          vc.z + vr.length() * Math.sin(i)
        ))
    );

    // fov 設定
    let vnp = vn.clone().project(camera);
    let vsp = vs.clone().project(camera);

    const ynp = (1 - vnp.y) * h / 2;
    const ysp = (1 - vsp.y) * h / 2;
    camera.fov = 1.005 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * (ysp - ynp) / h) * 360 / Math.PI;
    camera.updateProjectionMatrix();

    $('fov').textContent = camera.fov.toFixed(1);

    vnp = vn.clone().project(camera);
    vsp = vs.clone().project(camera);
    const vcp = vnp.clone().add(vsp).multiplyScalar(0.5);
    const dh = -0.5 * h * vcp.y;
    camera.setViewOffset(w, h, 0, dh, w, h);

  }; // setGeometry

  /**
   * 動画の再生・一時停止を切り替えます。
   * @function toggleVideoPlay
   * @param {String} state - 切り替え先の状態 play | pause
   */
  const toggleVideoPlay = (state = null) => {

    if (!video.src) return;
    if (state === null) state = video.paused ? 'play' : 'pause';
    state === 'play' ? video.play() : video.pause();
    $('videoPlay').innerHTML = video.paused ? '&#x25b6;&#xfe0f;' : '&#x23f8;&#xfe0f;';
    if (state === 'play') isChangeSeekbar = false;

  }; // toggleVideoPlay

  /**
   * 動画の FPS を変更します。
   * @function changeVideoFps
   * @param {Number} dFps - FPS 変化量
   */
  const changeVideoFps = (dFps = 0) => {

    if (!video.src) return;

    const targetFps = $n('videoFps') + dFps;
    const fpsMin = Math.max(1, 0.0625 * contentProp.videoFps);
    const fpsMax = Math.min(100, 16 * contentProp.videoFps);
    $('videoSlower').disabled = targetFps - 1 < fpsMin;
    $('videoFaster').disabled = targetFps + 1 > fpsMax;
    if (targetFps < fpsMin || fpsMax < targetFps) return;

    const targetSpeed = targetFps / contentProp.videoFps;
    video.playbackRate = targetSpeed;
    $('videoFps').textContent = targetFps;

  }; // changeVideoFps

  /**
   * 動画のフレームを移動します。
   * @function moveFrame
   * @param {Number} dFrame - フレーム移動量
   */
  const moveFrame = (dFrame = 1) => {

    if (!video.src) return;
    toggleVideoPlay('pause');
    if (video.currentTime === video.duration && dFrame < 0) dFrame--;
    video.currentTime = Math.floor(video.currentTime * contentProp.videoFps + dFrame) / contentProp.videoFps + 0.0001;

  }; // moveFrame

  /**
   * スライドショーのコンテンツを移動します。
   * @function moveContent
   * @param {Number} dContent - コンテンツ移動量
   */
  const moveContent = (dContent = 1) => {

    if (iContent === null) return;
    const nContent = slideshowContents.length;
    iContent = (iContent + dContent + nContent) % nContent;
    $('iContent').textContent = iContent + 1;
    $('nContent').textContent = nContent;
    changeContent(slideshowContents[iContent]);

  }; // moveContent

  /**
   * 補助線・注釈の表示・非表示を切り替えます。
   * @function toggleAnnotation
   * @param {String} id - 要素名
   */
  const toggleAnnotation = id => {

    if (!annotations[id]) return;
    const q = document.getElementById(id);
    if (!q) return;
    annotations[id].visible = q.checked;

  }; // toggleAnnotation

  /**
   * 説明文の表示位置を変更します。
   * @function changeDescPos
   */
  const changeDescPos = () => {

    const type = $v('descType');
    const size = $n('descSize');
    const posx = $n('descPosX');
    const posy = $n('descPosY');

    for (const type2 of ['center', 'topright', 'bottomright']) {

      // translateX も dvh で
      $(type2).style.transform = (type2 === 'center' ? `translateX(${posx}dvh) translateY(${posy}dvh) ` : '') + `scale(${size})`;
      $(type2).style.display = 'none';

    }

    const descTarget = $(type);
    descTarget.appendChild($('desc'));
    descTarget.style.display = $$('#desc > *').every(d => d.style.display === 'none') ? 'none' : 'inline-block';

    $('descPosX').disabled = type !== 'center';
    $('descPosY').disabled = type !== 'center';

  }; // changeDescPos

  /**
   * 操作パネルの表示・非表示を切り替えます。
   * @function togglePanel
   * @param {Boolean} state - 切り替え先の表示状態
   */
  const togglePanel = (state = null) => {

    if (state === null) state = $('panelWrapper').style.display === 'none';
    $('panelWrapper').style.display = state ? 'block' : 'none';
    $('togglePanel').textContent = state ? 'パネル非表示' : 'パネル表示';

  }; // togglePanel

  /**
   * 自動回転速度を変更します。
   * @function changeAutoRotate
   * @param {Number} dSpeed - 自動回転速度の差分
   */
  const changeAutoRotate = (dSpeed = 0) => {

    let rotSpeed = ($n('rotSpeed') || 0) + dSpeed;
    let rotSpeedMin = -10;
    let rotSpeedMax = 10;

    if (contentProp.lockRotation) {

      rotSpeed = 0;
      rotSpeedMin = 0;
      rotSpeedMax = 0;

    }

    $('rotSpeed').textContent = rotSpeed;
    $('rotSlower').disabled = rotSpeed <= rotSpeedMin;
    $('rotFaster').disabled = rotSpeed >= rotSpeedMax;

  }; // changeAutoRotate

  /**
   * シークバーを操作したとき動画を一時停止し再生位置をシークバーの位置と同期させます。
   * @function seekbarHandler
   */
  const seekbarHandler = () => {

    isChangeSeekbar = true;
    toggleVideoPlay('pause');
    video.currentTime = $n('seekbar') * video.duration;

  }; // seekbarHandler

  /**
   * ボタン長押しで値を高速で増減させます。
   * @function longPressHandler
   * @param {Function} func - 長押し時に実行する関数
   */
  const longPressHandler = func => {

    let ii = 0;

    const id = setInterval(() => {

      ii++;
      if (ii >= 2 && ii <= 10) return;
      func();

    }, 50);

    document.addEventListener('pointerup', () => clearInterval(id), { once: true });

  }; // longPressHandler

  /**
   * ドラッグ回転がチェックされているときだけ #canvas 上のカーソルを grab にします。
   * @function dragRotCheck
   */
  const dragRotCheck = () => {

    (!$('dragRot').disabled && $('dragRot').checked) ? $('canvas').classList.add('grabbable') : $('canvas').classList.remove('grabbable');

  }; // dragRotCheck

  let timePrevRotation = null;

  /**
   * Three.js のレンダリングを毎フレーム行います。
   * ついでに球体自動回転の制御、プログレスバー再描画、動画日時の再描画を行います。
   * @function animate
   */
  const animate = () => {

    requestAnimationFrame(animate);

    const time = new Date().getTime();

    // 自動回転の制御
    const rotSpeed = $n('rotSpeed');

    if (rotSpeed === 0) {

      timePrevRotation = null;

    } else {

      if (timePrevRotation === null) timePrevRotation = time;
      const dLon = 5 * rotSpeed * (time - timePrevRotation) / 1000;

      if (Math.abs(dLon) >= 0.1) {

        const lon = $n('lon') + dLon;
        $('lon').value = lon.toFixed(1);
        setRotation('form');
        timePrevRotation = time;

      }

    }

    // プログレスバーと日時表記の更新
    if (video.src) {

      const progress = video.currentTime / video.duration || 0;
      $('seekbar').value = progress;
      $('progress').value = progress;

      const nFrame = $n('nFrame');
      const iFrame = Math.min(
        Math.floor(video.currentTime * contentProp.videoFps) + 1,
        nFrame || 1
      );

      $('iFrame').textContent = iFrame;

      $('framePrev').disabled = iFrame <= 1;
      $('frameNext').disabled = iFrame >= nFrame;

      if (contentProp.videoTimeList) $('descTime').textContent = date2str(
        contentProp.videoTimeList[iFrame - 1],
        contentProp.timeZone,
        contentProp.timeFormat,
      );

    } else if (timeImage) {

      const progress = (time - timeImage) / contentProp.imagePause;
      $('progress').value = progress;
      // スライドショーの次のコンテンツへ
      if (progress >= 1) moveContent(1);

    }

    // Three.js のレンダリング
    renderer.render(scene, camera);

  }; // animate

  // ウインドウサイズが変わったとき camera と renderer の設定を変更する
  window.onresize = () => {

    w = window.innerWidth;
    h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);

  }; // window.onresize

  window.onkeydown = async e => {

    // Neutralinojs の場合 F11 キーによるフルスクリーントグルを設定する
    if (isNeu && e.key === 'F11') {

      const isFullScreen = await Neutralino.window.isFullScreen();
      await (isFullScreen ? Neutralino.window.exitFullScreen() : Neutralino.window.setFullScreen());

    }

    // 以下はテキスト入力中は対象外
    if (e.target.tagName === 'INPUT' && e.target.getAttribute('type') === 'text') return;

    if (e.key === ' ' || e.key === '0') {

      // スペースキー押下によるスクロールを抑制
      if (e.key === ' ' && e.target === document.body) e.preventDefault();

      toggleVideoPlay();

    }

    if (e.key === 'r' || e.key === '7') moveContent((contentProp.type === 'video' && video.currentTime > 0) ? 0 : -1);
    if (e.key === 't' || e.key === '8') moveContent(1);

    if (e.key === 'f' || e.key === '4') changeVideoFps(-1);
    if (e.key === 'g' || e.key === '5') changeVideoFps(1);

    if (e.key === 'v' || e.key === '1') moveFrame(-1);
    if (e.key === 'b' || e.key === '2') moveFrame(1);

  }; // window.onkeydown

  window.addEventListener('touchstart', e => {

    // タッチデバイスでピンチインズームを禁止
    if (e.touches.length >= 2) e.preventDefault();

  }, { passive: false }); // touchstart

  window.onclick = e => {

    // クリック操作が必要な要素は丁寧に除外する必要がある
    if (e.target.tagName === 'INPUT' && e.target.getAttribute('type') === 'checkbox') return;
    if (e.target.tagName === 'LABEL') return;

    // タッチデバイスでダブルタップズームを禁止
    e.preventDefault();

  }; // window.onclick

  window.oncontextmenu = e => {

    // コンテキストメニューはすべて無効化
    e.preventDefault();

  }; // window.oncontextmenu

  // GUI のイベントハンドラ登録
  //$('toggleUrl').onclick = () => setUrl();
  $('togglePanel').onclick = () => togglePanel();

  $('content').onchange = () => changeContent();
  $('videoPlay').onclick = () => toggleVideoPlay();

  $('seekbar').onmousedown = () => seekbarHandler();
  $('seekbar').oninput = () => seekbarHandler();

  $('ssPrev').onclick = () => moveContent(-1);
  $('ssNext').onclick = () => moveContent(1);

  $('videoSlower').onpointerdown = () => longPressHandler(() => changeVideoFps(-1));
  $('videoFaster').onpointerdown = () => longPressHandler(() => changeVideoFps(1));

  $('framePrev').onpointerdown = () => longPressHandler(() => moveFrame(-1));
  $('frameNext').onpointerdown = () => longPressHandler(() => moveFrame(1));

  $('setRot').onclick = () => setRotation('form');
  $('resetRot').onclick = () => setRotation('reset');

  $('dragRot').onchange = () => dragRotCheck();

  $('rotSlower').onclick = () => changeAutoRotate(-1);
  $('rotFaster').onclick = () => changeAutoRotate(1);

  $('descType').onchange = () => changeDescPos();
  $('descSize').oninput = () => changeDescPos();
  $('descPosX').oninput = () => changeDescPos();
  $('descPosY').oninput = () => changeDescPos();

  Object.keys(annotations).forEach(a => $(a).onchange = () => toggleAnnotation(a));

  $('geometry').onchange = () => setGeometry('preset');
  $('setPos').onclick = () => setGeometry();

  $('canvas').onmousemove = e => dragRotation(e);
  $('canvas').ondblclick = () => setRotation('reset');
  $('canvas').ontouchstart = e => touchStartHandler(e);
  $('canvas').ontouchmove = e => dragRotation(e);

  // メモ: onwebglcontextlost ではうまく動かなかった
  $('canvas').addEventListener('webglcontextlost', e => {

    e.preventDefault();
    const msg = log('webglcontextlost detected.', 'error');
    // 以下でシミュレーションできる
    // $('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();

  }); // webglcontextlost

  // オートコンプリートはすべて無効化
  $$('input[type="text"]').forEach(q => q.setAttribute('autocomplete', 'off'));

  // コンテンツ設定
  for (const [k, v] of Object.entries(settings.contents)) {

    if (v.ignored) {

      delete settings.contents[k];
      continue;

    }

    v.value = k;

    // settings.common の値を複製する
    for (const [kc, vc] of Object.entries(settings.common)) {

      const kcType = kc.match(/^(image|video|slideshow)/);
      if (kcType && v.type !== kcType[0]) continue;
      if (!(kc in v)) v[kc] = vc;

    }

    // path と緯度経度の検査
    if (v.type === 'image' || v.type === 'video') {

      for (const e of ['path', 'lonW', 'lonE', 'latS', 'latN', 'lonD', 'latD']) {

        if (!(e in v)) log(`コンテンツ ${k} の ${e} が設定されていません`, 'warn');

      }

      if (isnan2(v.lonW) || isnan2(v.lonE) || v.lonW >= v.lonE) log(`コンテンツ ${k} が lonW ${v.lonW} < lonE ${v.lonE} の関係を満たしていません`, 'warn');
      if (isnan2(v.latS) || isnan2(v.latN) || v.latS >= v.latN) log(`コンテンツ ${k} が latS ${v.latS} < latN ${v.latN} の関係を満たしていません`, 'warn');

    }

    // videoFps の検査
    if (v.type === 'video') {

      if (!v.videoFps) log(`コンテンツ ${k} の videoFps が設定されていません`, 'warn');
      if (!v.videoFpsDisp) v.videoFpsDisp = v.videoFps;

    }

    settings.contents[k] = v;

    if (v.hidden) continue;

    const opt = document.createElement('option');
    opt.value = k;
    opt.text = (
      v.type === 'slideshow' ? '🎞️'
      : v.type === 'video' ? '🎥'
      : v.type === 'image' ? '📷'
      : ''
    ) + v.text;
    if (v.disabled) opt.disabled = true;
    $('content').appendChild(opt);

  }

  $('content').value = null;

  // 投影幾何プリセット設定
  for (const [k, v] of Object.entries(settings.geometry)) {

    const opt = document.createElement('option');
    opt.value = k;
    opt.text = v.text;
    if (v.disabled) opt.disabled = true;
    $('geometry').appendChild(opt);

  }

  // settings.initial 設定
  for (const [k, v] of Object.entries(settings.initial)) {

    if (k === 'checked') v.forEach(c => $(c).checked = true);
    if (!$(k)) continue;
    $(k).value = v;

  }

  // URL パラメータ取得・反映
  for (const l of (location.href.split('?').at(-1) || '').split('&')) {

    const [id, v] = l.split('=');
    const q = $(id);
    if (!q) continue;

    if (
      (q.tagName === 'INPUT' && ~['text', 'range'].indexOf(q.getAttribute('type')))
      || q.tagName === 'SELECT'
    ) {

      q.value = v;

    } else if (q.tagName === 'INPUT' && q.getAttribute('type') === 'checkbox') {

      q.checked = v === 't';

    }

  }

  // メモ: onclick, onchange だと上記を上書きしてしまう
  $$('input[type=checkbox], input[type=range], select').forEach(q => q.addEventListener('change', () => q.blur()));
  $$('button').forEach(q => q.addEventListener('click', () => q.blur()));

  // 変数と UI のセットアップ
  togglePanel(true);
  Object.keys(annotations).forEach(a => toggleAnnotation(a));

  changeContent($v('content') ? null : Object.keys(settings.contents)[0]);
  setRotation($v('lon') ? 'form' : 'reset');
  changeAutoRotate(0);
  dragRotCheck();
  setGeometry('preset');

  animate();

  log(`${document.title} loaded successfully.`);

}; // window.onload
