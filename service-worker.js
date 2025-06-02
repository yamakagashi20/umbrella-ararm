// service-worker.js

let alarmTimeoutId = null;
const NOTIFICATION_TAG = 'umbrella-reminder-alarm-v2'; // タグを少し変更してキャッシュ競合を避ける

self.addEventListener('install', event => {
  console.log('Service Worker (v2): インストール中...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  console.log('Service Worker (v2): アクティベート中...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  if (!event.data) {
    console.log('Service Worker (v2): 空のメッセージを受信。');
    return;
  }

  const data = event.data;
  console.log(`Service Worker (v2): メッセージ受信 - タイプ: ${data.type}, データ:`, data);

  if (data.type === 'SCHEDULE_ALARM') {
    const alarmTime = new Date(data.alarmTime).getTime();
    const now = Date.now();
    const delay = alarmTime - now;

    console.log(`Service Worker (v2): アラームスケジュール依頼 - 通知時刻: ${new Date(data.alarmTime).toLocaleString()}, 遅延: ${delay}ms`);

    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId);
      console.log('Service Worker (v2): 既存のアラームスケジュールをクリア。');
    }

    if (delay > 0) {
      alarmTimeoutId = setTimeout(() => {
        console.log('Service Worker (v2): 通知を発行します...');
        const notificationTitle = '傘リマインダー！';
        const notificationOptions = {
          body: '傘を忘れていませんか？玄関を確認してください！',
          icon: 'umbrella_icon.png', // 同じフォルダに umbrella_icon.png を配置 (任意)
          badge: 'umbrella_badge_icon.png', // Android用バッジアイコン (任意、通常はアプリアイコンのモノクロ版)
          vibrate: [200, 100, 200, 100, 200, 100, 400], // 振動パターン
          tag: NOTIFICATION_TAG,        // 通知を識別・上書き
          renotify: true,               // 同じタグの通知が更新された場合に再度ユーザーに通知 (音や振動)
          requireInteraction: true,     // ユーザーが操作するまで通知を閉じない (一部環境で有効)
          timestamp: Date.now(),        // 通知のタイムスタンプ (通常OSが表示)
          // silent: false,             // デフォルトでfalse (音を出す)。trueにするとサイレント通知。
                                        // OSのサイレントモードやDND設定が優先される場合あり。
        };

        self.registration.showNotification(notificationTitle, notificationOptions)
        .then(() => {
          console.log('Service Worker (v2): 通知が表示されました。');
        })
        .catch(err => {
          console.error('Service Worker (v2): 通知表示エラー:', err);
        });
        alarmTimeoutId = null;
      }, delay);
      console.log(`Service Worker (v2): アラームが ${delay / 1000} 秒後にセットされました。Timeout ID: ${alarmTimeoutId}`);
    } else {
      console.log(`Service Worker (v2): 通知時刻が過去 (${delay}ms)。スケジュールしません。`);
      // テスト通知などで即時発行したい場合は、ここで直接 showNotification を呼ぶことも可能
      if (delay <= 0 && delay > -5000) { // 5秒以内の過去ならテスト通知として即時発行を試みる (例)
        console.log('Service Worker (v2): 遅延がほぼ0かマイナスなので、即時通知を試みます (テスト用)。');
        // (上記と同じ notificationOptions を使用)
        self.registration.showNotification('テスト即時通知！', { body: 'これは即時テスト通知です。', icon: 'umbrella_icon.png', tag: NOTIFICATION_TAG, renotify: true, requireInteraction: true });
      }
    }
  } else if (data.type === 'CANCEL_ALARM') {
    console.log('Service Worker (v2): アラームキャンセル依頼受信。');
    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId);
      alarmTimeoutId = null;
      console.log('Service Worker (v2): スケジュールされていたアラームをキャンセル。');
    }
    self.registration.getNotifications({ tag: NOTIFICATION_TAG })
      .then(notifications => {
        notifications.forEach(notification => notification.close());
        console.log(`Service Worker (v2): タグ '${NOTIFICATION_TAG}' の既存通知を閉じました。`);
      })
      .catch(err => {
        console.error('Service Worker (v2): 既存通知のクローズエラー:', err);
      });
  }
});

self.addEventListener('notificationclick', event => {
  console.log('Service Worker (v2): 通知がクリックされました。', event.notification);
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const targetUrl = '.'; // Service Workerのスコープのルート (例: reminder.html がある場所)
      for (const client of clientList) {
        // URLの一致を確認 (より堅牢なチェックが必要な場合あり)
        // HTTPサーバー経由の場合、client.url は http://.../reminder.html のようになる
        if (client.url.endsWith('reminder.html') && 'focus' in client) {
          console.log('Service Worker (v2): 既存のクライアントにフォーカスします:', client.url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        console.log('Service Worker (v2): 新しいウィンドウを開きます:', targetUrl);
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
```

**主な変更点と確認ポイント：**

* **`service-worker.js` の `showNotification` オプション:**
    * `renotify: true`: 同じタグの通知が更新された場合に、再度ユーザーに知らせるよう試みます。
    * `requireInteraction: true`: 通知がユーザーによって操作されるまで表示され続けるよう試みます（すべての環境でサポートされているわけではありません）。
    * `timestamp`: 通知にタイムスタンプを追加しました。
* **`reminder.html` のテストボタン:**
    * 「テスト通知を今すぐ表示」ボタンを追加しました。これを押すと、1秒後にOS通知が表示されるはずです。
    * **このテスト通知が表示されない場合、問題はコードのロジックではなく、OSの通知設定、ブラウザの通知許可、バッテリーセーバー、またはアプリのテスト方法（`file:///` で開いているなど）に起因する可能性が非常に高いです。**
* **通知許可の状態表示:** `reminder.html` に現在の通知許可状態（許可/拒否/不明）を表示する欄を追加しました。

**それでも通知が表示されない場合のトラブルシューティング：**

1.  **テスト方法の再確認:** 必ずHTTPサーバー経由でアクセスしてください。
2.  **ブラウザの通知設定:**
    * スマートフォンのブラウザ（Chromeなど）で、このサイト（例: `http://<PCのIPアドレス>:8000`）の通知が「許可」されているか確認してください。
    * ブラウザ自体の通知がOSレベルで許可されているか確認してください。（スマートフォンの設定 → アプリ → [お使いのブラウザ] → 通知）
3.  **OSの通知設定:**
    * スマートフォン全体の「サイレントモード」や「おやすみモード（集中モードなど）」が有効になっていないか確認してください。
    * 特定のアプリ（この場合はお使いのブラウザ）からの通知がOSレベルでブロックされていないか確認してください。
4.  **バッテリーセーバー/最適化:**
    * スマートフォンのバッテリーセーバー機能が、バックグラウンドでのブラウザの動作や通知を制限していないか確認してください。可能であれば、お使いのブラウザアプリをバッテリー最適化の対象外に設定してみてください。
5.  **コンソールログの確認 (PCでのデバッグ):**
    * 可能であれば、スマートフォンをUSBでPCに接続し、PCのChromeブラウザで `chrome://inspect` を開いてリモートデバッグを行ってください。Service Workerのコンソールログにエラーが出ていないか確認できます。

これらの手順と修正で、OS通知がより確実に表示されるようになることを願っています。
特に「テスト通知」ボタンの結果と、試されたテスト方法（HTTPサーバー経由かどうか）について教えていただけると、さらに絞り込んだアドバイスが可能
