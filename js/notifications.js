class NotificationManager {
    constructor() {
        this.notifiedVideos = new Set();
        this.isNotificationSupported = 'Notification' in window;
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
            }
        };

        const notification = new Notification(title, options);
        
        notification.onclick = function() {
            window.open(this.data.url, '_blank');
            this.close();
        };

        // 通知済みとしてマーク
        this.notifiedVideos.add(stream.id);
        
        // 24時間後に通知済みリストから削除（メモリ節約のため）
        setTimeout(() => {
            this.notifiedVideos.delete(stream.id);
        }, 24 * 60 * 60 * 1000);
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
                notifyLive: true
            }
        };

        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
        return defaultSettings;
    }
}
