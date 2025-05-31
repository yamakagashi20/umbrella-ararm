// service-worker.js

let alarmTimeoutId = null;

self.addEventListener('install', event => {
  console.log('Service Worker installing.');
  // Skip waiting to ensure the new service worker activates quickly,
  // especially for local development.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating.');
  // Force the SW to take control of open clients immediately.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'SCHEDULE_ALARM') {
    const alarmTime = event.data.alarmTime;
    const now = Date.now();
    const delay = new Date(alarmTime).getTime() - now;

    console.log(`SW: Received SCHEDULE_ALARM for ${alarmTime}. Delay: ${delay}ms`);

    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId);
      console.log('SW: Cleared previous alarm timeout.');
    }

    if (delay > 0) {
      alarmTimeoutId = setTimeout(() => {
        console.log('SW: Triggering notification.');
        self.registration.showNotification('傘リマインダー！', {
          body: '傘を忘れていませんか？玄関を確認してください！',
          icon: 'umbrella_icon.png', // 同じフォルダに umbrella_icon.png を置くと表示されます (任意)
          vibrate: [200, 100, 200, 100, 200, 100, 400], // 振動パターン
          tag: 'umbrella-alarm', // 同じタグの通知は置き換えられる
          actions: [ // 通知にアクションボタンを追加 (任意)
            // { action: 'dismiss', title: '閉じる' }, // アクションの処理は別途実装が必要
          ]
        })
        .then(() => console.log('SW: Notification shown.'))
        .catch(err => console.error('SW: Error showing notification:', err));
        alarmTimeoutId = null; // Reset timeoutId after firing
      }, delay);
      console.log(`SW: Alarm timeout set with ID: ${alarmTimeoutId}`);
    } else {
      console.log('SW: Alarm time is in the past. Not scheduling.');
    }
  } else if (event.data.type === 'CANCEL_ALARM') {
    console.log('SW: Received CANCEL_ALARM.');
    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId);
      alarmTimeoutId = null;
      console.log('SW: Cleared scheduled alarm timeout.');
    }
    // 既に表示されている通知があれば消す (タグを指定)
    self.registration.getNotifications({ tag: 'umbrella-alarm' })
      .then(notifications => {
        notifications.forEach(notification => notification.close());
        console.log('SW: Closed active notifications with tag "umbrella-alarm".');
      })
      .catch(err => console.error('SW: Error clearing notifications:', err));
  }
});
