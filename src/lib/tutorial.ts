// 使い方（チュートリアル）のスライドの内容。サーバー・クライアントどちらからも読み込めるように別ファイルにしている。
// 画像は実際のアプリ画面のスクリーンショット（public/tutorial/）。オレンジの枠が操作する場所。

export type Slide = { image: string; imageAlt: string; title: string; body: string };

export const MEMBER_SLIDES: Slide[] = [
  {
    image: "/tutorial/1-home.webp",
    imageAlt: "ホームの予定カードと、参加・未定・不参加のボタン",
    title: "ホームで、ボタンを押すだけ",
    body: "回答が必要な練習やイベントがホームの一番上に並びます。「参加」「未定」「不参加」を押せば回答完了。カードを押すと詳細が開きます。",
  },
  {
    image: "/tutorial/2-memo.webp",
    imageAlt: "予定の詳細画面の、メモ欄と回答ボタン",
    title: "遅刻・早退はメモで",
    body: "予定の詳細では「30分遅れます」などのメモを付けて回答できます。メモはほかのメンバーの参加状況の一覧にも表示されます。",
  },
  {
    image: "/tutorial/3-guest.webp",
    imageAlt: "体験者を追加するフォーム",
    title: "体験に来る人を追加",
    body: "体験に来る友だちがいたら、予定の詳細の「体験者を追加」から名前だけで登録できます（体験者のログインは不要です）。",
  },
  {
    image: "/tutorial/4-badges.webp",
    imageAlt: "画面下のタブと、赤い数字のバッジ",
    title: "赤い数字は「未対応」のしるし",
    body: "画面下のタブに赤い数字が付いたら、未回答の予定・未読のお知らせ・未回答のアンケートがあります。",
  },
  {
    image: "/tutorial/5-a2hs.webp",
    imageAlt: "ブラウザの共有ボタンから「ホーム画面に追加」を選ぶ手順",
    title: "ホーム画面に追加しよう",
    body: "ブラウザの共有ボタン（Androidはメニュー）から「ホーム画面に追加」を選ぶと、アプリのようにすぐ開けます。",
  },
];

export const ADMIN_SLIDE: Slide = {
  image: "/tutorial/6-admin.webp",
  imageAlt: "管理画面のメニュー",
  title: "管理者のみなさんへ",
  body: "「管理」タブから、予定の作成（毎週の練習の一括作成も）・お知らせ・アンケート・メンバーの管理ができます。予定やアンケートの画面には、LINEに貼る文章を作るボタンもあります。",
};
