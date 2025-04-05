class NotificationManager {
    constructor() {
        this.notifiedVideos = new Set();
        this.isNotificationSupported = 'Notification' in window;
        this.notificationSound = new Audio('audio/notification.mp3');
        this.requestPermission();
    }

    requestPermission() {
        if (this.isNotificationSupported && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    canNotify() {
        // 設定から通知の有効・無効を確認
        const appSettings = this.getSettings();
        return this.isNotificationSupported && 
               Notification.permission === 'granted' && 
               appSettings.notification.enableNotifications;
    }

    notify(stream, type) {
        if (!this.canNotify()) {
            return;
        }

        // 設定に基づいて通知するかを判断
        const appSettings = this.getSettings();
        if (type === 'upcoming' && !appSettings.notification.notifyUpcoming) {
            return;
        }
        if (type === 'live' && !appSettings.notification.notifyLive) {
            return;
        }

        // すでに通知したビデオであれば通知しない
        if (this.notifiedVideos.has(stream.id)) {
            return;
        }

        const title = type === 'live' 
            ? `🔴 ライブ配信中: ${stream.snippet.channelTitle}`
            : `🕒 配信予定: ${stream.snippet.channelTitle}`;

        const options = {
            body: stream.snippet.title,
            icon: stream.snippet.thumbnails.high.url,
            tag: stream.id,
            data: {
                url: `https://www.youtube.com/watch?v=${stream.id}`
            },
            silent: !appSettings.notification.enableSound // サウンドを設定に基づき制御
        };

        const notification = new Notification(title, options);
        
        notification.onclick = function() {
            window.open(this.data.url, '_blank');
            this.close();
        };

        // 音声通知が有効な場合は音を鳴らす
        if (appSettings.notification.enableSound) {
            this.playNotificationSound();
        }

        // 通知済みとしてマーク
        this.notifiedVideos.add(stream.id);
        
        // 24時間後に通知済みリストから削除（メモリ節約のため）
        setTimeout(() => {
            this.notifiedVideos.delete(stream.id);
        }, 24 * 60 * 60 * 1000);
    }

    // 通知音を再生
    playNotificationSound() {
        try {
            // 再生中の場合は停止してから再生
            this.notificationSound.pause();
            this.notificationSound.currentTime = 0;
            
            // ユーザーのインタラクションがあった場合のみ再生可能
            const playPromise = this.notificationSound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('通知音の再生に失敗しました:', error);
                });
            }
        } catch (error) {
            console.error('通知音の再生中にエラーが発生しました:', error);
        }
    }

    // 新しい配信が見つかった場合に通知
    notifyNewStreams(newStreams, type) {
        newStreams.forEach(stream => {
            this.notify(stream, type);
        });
    }

    // アプリケーション設定を取得
    getSettings() {
        const defaultSettings = {
            notification: {
                enableNotifications: true,
                notifyUpcoming: true,
                notifyLive: true,
                enableSound: true
            }
        };

        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
        return defaultSettings;
    }

    // テスト通知を送信（テスト用）
    testNotification() {
        if (!this.canNotify()) {
            if (Notification.permission === 'denied') {
                alert('通知がブロックされています。ブラウザの設定で許可してください。');
            } else if (Notification.permission !== 'granted') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        this.testNotification();
                    } else {
                        alert('通知の許可が得られませんでした。');
                    }
                });
            } else {
                alert('通知が無効になっています。設定から有効にしてください。');
            }
            return;
        }

        const options = {
            body: 'YouTube ライブ配信検索ツールからのテスト通知です',
            icon: 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png',
            silent: !this.getSettings().notification.enableSound
        };

        const notification = new Notification('テスト通知', options);
        
        notification.onclick = function() {
            window.focus();
            this.close();
        };

        // 音声通知が有効な場合は音を鳴らす
        if (this.getSettings().notification.enableSound) {
            this.playNotificationSound();
        }

        alert('テスト通知を送信しました。通知が表示されない場合は、ブラウザの設定で通知が許可されているか確認してください。');
    }
}
