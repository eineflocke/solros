export const settings = {

  /**
   * settings.initial
   * UI のパラメータの初期設定を定義します。
   */

  initial: {
    // コンテンツ
    content: 'slideshow', // コンテンツ識別子

    // 説明・注釈
    descType: 'center', // 説明文の位置 none | center | topright | bottomright
    descSize: 0.45,     // 説明文サイズ 0.2 ~ 1.0
    descPosX: 0,        // 説明文左右変位（右が正） -40 ~ 40
    descPosY: 60,       // 説明文上下変位（下が大） 5 ~ 85

    // 投影幾何
    geometry: 'geo', // 投影幾何プリセット識別子

    // チェックボックスのうちチェックを付けておくもの
    checked: [
      'dragRot', // ドラッグで回転
      'outline', 'equator', 'svg', // 補助線・注釈
      //'lonlats',
      //'coast',
    ],
  },

  /**
   * settings.common
   * ここに記載された項目は各コンテンツ（settings.contents の各要素）に複製されます。
   * settings.contents の各要素と重複する項目がある場合、そちらが優先されます。
   */

  common: {
    // image/video/slideshow 共通
    ignored: false,  // コンテンツ自体を無視するかどうか
    hidden: false,   // コンテンツをプルダウンメニューで非表示にするかどうか
    disabled: false, // コンテンツをプルダウンメニューで選択不可にするかどうか

    // image/video 共通
    //descSize: 0.6,
    //descPosX: 0,
    descPosY: 60,
    resetRotation: true,             // コンテンツ切り替え時にデフォルト緯度経度へ強制回転させるかどうか
    lockRotation: false,             // 回転を禁止するかどうか
    timeZone: 'JST',                 // 日時タイムゾーン UTC | JST
    timeFormat: '%Y/%m/%d %H:%M %z', // 日時フォーマット %Y 年、%m 月、%d 日、%H 時、%M 分、%S 秒、%z タイムゾーン
    svgStyle:                        // SVG 注釈のスタイルシート
    `
      path {
        fill: none;
        stroke: rgba(255, 0, 0, 0.8);
        stroke-width: 0.3px;
      }
      text {
        dominant-baseline: central;
        fill: #c00;
        font-family: 'Segoe UI', 'BIZ UDGothic', 'Noto Sans JP', 'Hiragino Kaku Gothic Pro', Meiryo, sans-serif;
        font-size: 4px;
        paint-order: stroke;
        stroke: #fff;
        stroke-width: 0.3px;
        text-anchor: middle;
      }
    `,

    // スライドショーの image のみに作用
    imagePause: 10000, // 表示時間 [msec]

    // video のみに作用
    videoPauseBefore: 2000, // 再生前の停止時間 [msec]
    videoPauseAfter: 1000,  // 再生後の停止時間 [msec]
  },

  /**
   * settings.contents
   * 各コンテンツのメタデータを定義します。
   * settings.common と重複する項目がある場合、こちらが優先されます。
   */

  contents: {
    none: {
      text: 'なし',
      lonW: -180,
      lonE: 180,
      latS: -90,
      latN: 90,
      lonD: 0,
      latD: 0,
    },
    dummy1: {
      text: '---',
      disabled: true,
    },
    slideshow: {
      text: '基本セット',
      type: 'slideshow',
      slideshowContents: [
        'earth',
        'moon',
      ],
      default: true,
    },
    /*
    tsunami: {
      // https://sos.noaa.gov/catalog/datasets/tsunami-historical-series-japan-2011/ より引用・加工
      text: '3.11津波',
      type: 'video',
      path: 'contents/tsunami.mp4',
      lonW: -180,
      lonE: 180,
      latS: -90,
      latN: 90,
      lonD: 180,
      latD: 0,
      videoFpsDisp: 10,
      videoFps: 10,
      videoTimeList: [...Array(1201)]
        .map((_, i) => Math.min(960, Math.max(0, i - 131)) * 3 * 60 * 1000)
        .map(i => new Date('2011-03-11T05:46Z').getTime() + i),
      descSub: 'アメリカ海洋大気庁 NOAA より引用・加工',
    },
    eqhistory: {
      // https://sos.noaa.gov/catalog/datasets/120-years-earthquakes-tsunamis/ より引用・加工
      text: '地震1901-2020',
      type: 'video',
      path: 'contents/eqhistory.mp4',
      lonW: -180,
      lonE: 180,
      latS: -90,
      latN: 90,
      lonD: 0,
      latD: 0,
      videoFpsDisp: 30,
      videoFps: 30,
      videoTimeList: [...Array(5010)]
        .map((_, i) => String(1901 + Math.min(119, Math.max(0, Math.floor((i - 211) / 30)))) + '年'),
      descTitle: '1901～2020 年の世界の大地震',
      descMain: `
        <img src="contents/Earthquake_Legend.png" style="width: 70dvh;">
      `,
      descSub: 'アメリカ海洋大気庁 NOAA より引用・加工',
      descNoRange: true,
    },
    ir: {
      text: 'IR',
      type: 'video',
      path: 'contents/202609ir.mp4',
      lonW: -180,
      lonE: 180,
      latS: -70,
      latN: 70,
      lonD: 140.7,
      latD: 0,
      videoFpsDisp: 4,
      videoFps: 8,
      videoTimeList: [...Array(240)]
        .map((_, i) => new Date(new Date('2026-09-01T00:00Z').getTime() + i * 10800 * 1000)),
      descTitle: 'IR',
    },
    */
    earth: {
      text: '地球',
      type: 'image',
      path: 'https://threejs-earth.s3.ap-northeast-1.amazonaws.com/earth.jpeg',
      lonW: -180,
      lonE: 180,
      latS: -90,
      latN: 90,
      lonD: 140,
      latD: 0,
      descTitle: `地球`,
      resetRotation: true,
    },
    moon: {
      text: '月',
      type: 'image',
      path: 'https://threejs-earth.s3.ap-northeast-1.amazonaws.com/2k_moon.jpeg',
      lonW: -180,
      lonE: 180,
      latS: -90,
      latN: 90,
      lonD: 0,
      latD: 0,
      descTitle: `月`,
      resetRotation: true,
    },
  },

  /**
   * settings.geometry
   * 投影幾何プリセットを定義します。
   */

  geometry: {
    wxl4960: { // 投影幾何プリセット識別子
      text: 'RICOH WXL4960', // プルダウンメニュー上のテキスト
      r: 39.2,               // 半球型スクリーンの半径 [cm]
      xp: -90,               // プロジェクタの座標、奥行き方向 [cm] 半球凸側が正
      yp: -30,               // プロジェクタの座標、上下方向 [cm] 上が正
      pp: -13,               // プロジェクタの仰角 [deg] 上向きが正
    },
    eb1795f: {
      text: 'EPSON EB-1795F',
      r: 39.2,
      xp: -148,
      yp: -22,
      pp: -4.5,
    },
    geo: {
      text: 'GEO-equivalent',
      r: 6.4,
      xp: 42.2,
      yp: 0,
      pp: 0,
    },
    l1: {
      text: 'L1-equivalent',
      r: 6.4,
      xp: 1500,
      yp: 0,
      pp: 0,
    },
  },
};
