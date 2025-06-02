// service-worker.js

let alarmTimeoutId = null;
const NOTIFICATION_TAG = 'umbrella-reminder-alarm'; // 通知を識別するためのタグ

// Service Worker インストール時
self.addEventListener('install', event => {
  console.log('Service Worker: インストール中...');
  // 新しいService Workerをすぐにアクティブにする
  event.waitUntil(self.skipWaiting());
});

// Service Worker アクティベート時
self.addEventListener('activate', event => {
  console.log('Service Worker: アクティベート中...');
  // このService Workerが制御するクライアント(ページ)をすぐに制御下に置く
  event.waitUntil(self.clients.claim());
});

// HTMLページからメッセージ受信時
self.addEventListener('message', event => {
  if (!event.data) {
    console.log('Service Worker: 空のメッセージを受信しました。');
    return;
  }

  const data = event.data;
  console.log(`Service Worker: メッセージ受信 - タイプ: ${data.type}, データ:`, data);

  if (data.type === 'SCHEDULE_ALARM') {
    const alarmTime = new Date(data.alarmTime).getTime(); // ISO文字列をミリ秒に変換
    const now = Date.now();
    const delay = alarmTime - now;

    console.log(`Service Worker: アラームスケジュール依頼受信 - 通知時刻: ${new Date(data.alarmTime).toLocaleString()}, 遅延: ${delay}ms`);

    // 既存のタイムアウトがあればクリア
    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId);
      console.log('Service Worker: 既存のアラームスケジュールをクリアしました。');
    }

    if (delay > 0) {
      alarmTimeoutId = setTimeout(() => {
        console.log('Service Worker: 通知を発行します...');
        self.registration.showNotification('傘リマインダー！', {
          body: '傘を忘れていませんか？玄関を確認してください！',
          icon: 'umbrella_icon.png', // アイコンファイル名 (任意)
          // badge: 'badge_icon.png', // バッジアイコン (Androidで有効)
          vibrate: [200, 100, 200, 100, 200, 100, 400], // 振動パターン (例)
          tag: NOTIFICATION_TAG, // このタグで通知を識別・上書き
          // renotify: true, // 同じタグの通知が来た場合に再度通知音を鳴らすか (一部環境)
          // requireInteraction: true, // ユーザーが操作するまで通知を閉じない (一部環境)
          // actions: [ // 通知にアクションボタンを追加 (今回はシンプルにするためコメントアウト)
          //   { action: 'confirm', title: '確認した', icon: 'confirm_icon.png' },
          //   { action: 'snooze', title: '5分後', icon: 'snooze_icon.png' },
          // ]
        })
        .then(() => {
          console.log('Service Worker: 通知が表示されました。');
        })
        .catch(err => {
          console.error('Service Worker: 通知表示エラー:', err);
        });
        alarmTimeoutId = null; // 発行後はクリア
      }, delay);
      console.log(`Service Worker: アラームが ${delay / 1000} 秒後にセットされました。Timeout ID: ${alarmTimeoutId}`);
    } else {
      console.log('Service Worker: 通知時刻が過去です。スケジュールしません。');
    }
  } else if (data.type === 'CANCEL_ALARM') {
    console.log('Service Worker: アラームキャンセル依頼受信。');
    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId);
      alarmTimeoutId = null;
      console.log('Service Worker: スケジュールされていたアラームをキャンセルしました。');
    }
    // 表示されている可能性のある通知も閉じる
    self.registration.getNotifications({ tag: NOTIFICATION_TAG })
      .then(notifications => {
        notifications.forEach(notification => notification.close());
        console.log(`Service Worker: タグ '${NOTIFICATION_TAG}' の既存通知を閉じました。`);
      })
      .catch(err => {
        console.error('Service Worker: 既存通知のクローズエラー:', err);
      });
  }
});

// (任意) 通知クリック時の処理
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: 通知がクリックされました。', event.notification);
  event.notification.close(); // 通知を閉じる

  // アプリのウィンドウを開くか、既存のウィンドウにフォーカスする
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // 既に開いているウィンドウがあれば、それにフォーカスする
      for (const client of clientList) {
        // reminder.html を開いているクライアントを探す (URLで判断)
        // ローカルファイルの場合、URLが複雑になるため、より汎用的な方法が必要な場合がある
        // ここでは、単純に開いているクライアントがあればそれにフォーカスする
        if (client.url.includes('reminder.html') && 'focus' in client) { // 'reminder.html' は実際のファイル名に合わせてください
          return client.focus();
        }
      }
      // 開いているウィンドウがなければ、新しいウィンドウで開く
      if (self.clients.openWindow) {
        // openWindowの引数は、アプリのURLにしてください。
        // ローカルファイルの場合、これは機能しないか、期待通りに動作しない可能性があります。
        // HTTPサーバー経由でアクセスしている場合は、そのURLを指定します。
        // 例: return self.clients.openWindow('reminder.html');
        //     return self.clients.openWindow('/'); // ルートを開く場合
        console.log('Service Worker: アプリのウィンドウを開こうと試みます。');
        return self.clients.openWindow('.'); // 現在のService Workerのスコープのルートを開く (通常は reminder.html がある場所)
      }
    })
  );

  // (任意) アクションボタンがクリックされた場合の処理
  // if (event.action === 'confirm') {
  //   console.log('Service Worker: 確認アクションがクリックされました。');
  //   // 確認処理...
  // } else if (event.action === 'snooze') {
  //   console.log('Service Worker: スヌーズアクションがクリックされました。');
  //   // スヌーズ処理 (例: 5分後に再度SCHEDULE_ALARMを自身に送るなど)
  // }
});
```

**ご利用方法のまとめ：**

1.  上記の2つのコードを、それぞれ `reminder.html` (既存のものを上書き) と `service-worker.js` (新規作成) というファイル名で、PC上の同じフォルダに保存します。
2.  (任意) 通知に表示したい傘のアイコンがあれば、`umbrella_icon.png` という名前で同じフォルダに保存します。
3.  **スマートフォンでのテスト方法 (推奨):**
    * PCで、これらのファイルがあるフォルダをルートとしてローカルHTTPサーバーを起動します。(例: Pythonがインストールされていれば、コマンドプロンプト/ターミナルでそのフォルダに移動し `python -m http.server` を実行。VS CodeのLive Server拡張機能などでも可。)
    * PCのローカルIPアドレス (例: `192.168.1.100`) とサーバーのポート番号 (例: `8000`) を確認します。
    * スマートフォンをPCと同じWi-Fiネットワークに接続します。
    * スマートフォンのブラウザで `http://<PCのIPアドレス>:<ポート番号>/reminder.html` (例: `http://192.168.1.100:8000/reminder.html`) にアクセスします。
4.  アプリを開くと、通知の許可を求めるメッセージが表示される場合がありますので、「許可」してください。
5.  リマインダーを設定すると、ページが開いていればページ内アラームが、ページを閉じていたり他のアプリを操作していてもOSの通知が表示されるはずです。

この更新により、アプリの利便性が向上することを願っています。もし動作しない場合やご不明な点があれば、試された環境（スマートフォンのOS、ブラウザの種類、どのようにファイルを開いたかなど）を詳しく教えていただけると、さらなるサポートが可能
