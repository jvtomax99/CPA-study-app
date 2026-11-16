import {getInputProps} from 'remotion';

// Which video this render makes: English (default) or Japanese, from `--props='{"lang":"ja"}'` (npm run render:ja).
// Japanese swaps the narration (script-ja.json, timing-ja.json, public/voice-ja/), the app screenshots
// (public/shots-ja/, layout-ja.json) and the words drawn over the video (W below). The big outlined
// background words stay English: they're decoration.
export const JA = (getInputProps() as {lang?: string}).lang === 'ja';
export const SHOTS = JA ? 'shots-ja' : 'shots';

const W: Record<string, string> = {
  // headlines
  'On iPhone,': 'iPhoneでは、', 'Add to Home Screen.': 'ホーム画面に追加。',
  'On Android,': 'Androidでは、', 'Install the App.': 'アプリをインストール。',
  'Then Always': 'これからは', 'Open It From Here.': 'いつもここから開く。',
  'Ride the El': '高架鉄道に乗って', 'Into Town.': '街へ。',
  'EA or CPA.': 'EAかCPAか。', 'Pick Your Exam.': '試験を選ぶ。',
  'Today Is': '「今日」が', 'Home Base.': 'ホーム。',
  'Every Tower': 'タワー1棟が', 'Is an Exam Area.': '試験の1分野。',
  'Times Square.': 'タイムズスクエア。', 'The Whole City in 3D.': '街全体を3Dで。',
  'Map Shows': 'マップで', 'Your Next Stop.': '次の駅が分かる。',
  'Tap Play.': 'プレイをタップ。', 'Learn Why.': '理由が分かる。',
  'Miss It? 5 Minutes.': 'まちがえたら5分後。', 'Nail It? Weeks.': '正解なら数週間後。',
  'Looks Wrong?': 'おかしい？', 'Flag It.': '報告しよう。',
  'Set the Date.': '試験日を入れて、', 'Run the Sim.': '模擬試験。',
  'Your Score,': 'スコアを', 'Area by Area.': '分野ごとに。',
  'Goal. Reminder.': '目標、リマインダー、', 'Backup.': 'バックアップ。',
  // opening, hook and close
  'How to use it': '使い方',
  'The most important step': 'いちばん大事なステップ', 'Home': 'ホーム', 'Screen.': '画面。',
  'Your progress lives': '進み具合の保存先は', 'On This Phone.': 'このスマホ。', 'No account. No cloud.': 'アカウントもクラウドもなし。',
  'Safari can erase it in': 'Safariが消すまで', 'Day': '日', 'Days': '日', 'Progress Erased.': '進み具合が消えた。',
  "Unless it's on your": 'ただし、', 'Home Screen.': 'ホーム画面なら大丈夫。',
  'Add It to Your Home Screen.': 'ホーム画面に追加して、', 'Always Open It There.': 'いつもそこから開く。',
  // callouts
  'Safari': 'Safari', 'Home Screen app': 'ホーム画面のアプリ', '≠ separate progress': '≠ 進み具合は別々',
  'Study in one place': '勉強は1か所で', 'In Safari: Menu › Save backup file': 'Safari：メニュー › バックアップを保存',
  'In the app: Menu › Load backup file': 'アプリ：メニュー › バックアップを読み込む',
  'Wrong: back in 5 minutes': '不正解：5分後にまた出る', 'Right: it waits longer each time': '正解：間隔がどんどん延びる',
  '1 day': '1日', '3 days': '3日', '1 week': '1週間', '16 days': '16日', '35 days': '35日',
  // the Safari and Chrome drawings (as the Japanese iOS and Chrome menus read)
  'Bookmarks': 'ブックマーク', 'New Tab': '新規タブ', 'Share': '共有', 'Copy': 'コピー',
  'Add to Reading List': 'リーディングリストに追加', 'Add Bookmark': 'ブックマークを追加', 'Cancel': 'キャンセル', 'Add': '追加',
  'Open as Web App': 'Webアプリとして開く', 'Keep this on, so it opens as its own app with its own storage.': 'オンのままにすると、専用の保存場所を持つアプリとして開きます。',
  'New tab': '新しいタブ', 'History': '履歴', 'Downloads': 'ダウンロード', 'Install app': 'アプリをインストール',
  'Add to Home screen': 'ホーム画面に追加', 'Install': 'インストール',
};
/** The video's on-screen words in the render's language. */
export const T = (s: string) => (JA && W[s]) || s;
