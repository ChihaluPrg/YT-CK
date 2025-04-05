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

    canNotifyDiscord() {
        // Discordの通知設定を確認
        const appSettings = this.getSettings();
        return appSettings.discord && 
               appSettings.discord.enableDiscord && 
               appSettings.discord.webhookUrl && 
               appSettings.discord.webhookUrl.trim() !== '';
    }

    // 通知を表示
    notify(stream, type) {
        // ブラウザ通知
        if (this.canNotify()) {
            this.sendBrowserNotification(stream, type);
        }
        
        // Discord通知
        if (this.canNotifyDiscord()) {
            this.sendDiscordNotification(stream, type);
        }
    }

    // ブラウザ通知
    sendBrowserNotification(stream, type) {
        // 設定に基づいて通知するかを判断
        const appSettings = this.getSettings();
        if (type === 'upcoming' && !appSettings.notification.notifyUpcoming) {
            return;
        }
        if (type === 'live' && !appSettings.notification.notifyLive) {
            return;
        }
        if (type === 'completed' && !appSettings.notification.notifyCompleted) {
            return;
        }

        // すでに通知したビデオであれば通知しない
        if (this.notifiedVideos.has(stream.id)) {
            return;
        }

        // タイトルとアイコン設定（YouTube風）
        let title, icon;
        
        if (type === 'live') {
            title = `${stream.snippet.channelTitle} がライブ配信中`;
            icon = 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png';
        } else if (type === 'upcoming') {
            title = `${stream.snippet.channelTitle} が配信予定`;
            icon = 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png';
        } else if (type === 'completed') {
            title = `${stream.snippet.channelTitle} の配信が終了しました`;
            icon = 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png';
        }

        // ブラウザ通知オプション（YouTube風）
        const options = {
            body: stream.snippet.title,
            icon: icon,
            badge: 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png',
            image: stream.snippet.thumbnails.high.url,
            tag: stream.id,
            data: {
                url: `https://www.youtube.com/watch?v=${stream.id}`
            },
            // サウンドの設定（設定に基づく）
            silent: !appSettings.notification.enableSound
        };

        try {
            // ブラウザ通知を表示
            const notification = new Notification(title, options);
            
            // 通知クリック時の動作
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
        } catch (error) {
            console.error('ブラウザ通知の表示中にエラーが発生しました:', error);
        }
    }

    // Discord通知を送信
    async sendDiscordNotification(stream, type) {
        // 設定に基づいて通知するかを判断
        const appSettings = this.getSettings();
        if (type === 'upcoming' && !appSettings.notification.notifyUpcoming) {
            return;
        }
        if (type === 'live' && !appSettings.notification.notifyLive) {
            return;
        }
        if (type === 'completed' && !appSettings.notification.notifyCompleted) {
            return;
        }

        // すでに通知したビデオであれば通知しない
        if (this.notifiedVideos.has(stream.id + '_discord')) {
            return;
        }

        try {
            const webhookUrl = appSettings.discord.webhookUrl;
            const username = appSettings.discord.username || 'YouTube配信通知';
            
            // Embedの色（ライブ中は赤、予定は青、終了はグレー）
            const color = type === 'live' ? 0xFF0000 : 
                         type === 'upcoming' ? 0x3498DB : 0x708090;
            
            // Embedのタイトル
            const title = type === 'live' 
                ? `🔴 ライブ配信中: ${stream.snippet.title}`
                : type === 'upcoming'
                ? `🕒 配信予定: ${stream.snippet.title}`
                : `✓ 配信終了: ${stream.snippet.title}`;
            
            // 日時フォーマット
            let timeField = {};
            if (type === 'upcoming' && stream.liveStreamingDetails.scheduledStartTime) {
                const startTime = new Date(stream.liveStreamingDetails.scheduledStartTime);
                timeField = {
                    name: '配信開始予定時刻',
                    value: `<t:${Math.floor(startTime.getTime() / 1000)}:F>`,
                    inline: true
                };
            } else if (type === 'live' && stream.liveStreamingDetails.actualStartTime) {
                const startTime = new Date(stream.liveStreamingDetails.actualStartTime);
                timeField = {
                    name: '配信開始時刻',
                    value: `<t:${Math.floor(startTime.getTime() / 1000)}:F>`,
                    inline: true
                };
            } else if (type === 'completed') {
                const endTime = new Date(stream.liveStreamingDetails.actualEndTime);
                const startTime = new Date(stream.liveStreamingDetails.actualStartTime);
                
                const durationMs = endTime.getTime() - startTime.getTime();
                const hours = Math.floor(durationMs / 3600000);
                const minutes = Math.floor((durationMs % 3600000) / 60000);
                const durationText = hours > 0 
                    ? `${hours}時間${minutes}分` 
                    : `${minutes}分`;
                
                timeField = {
                    name: '配信終了時刻',
                    value: `<t:${Math.floor(endTime.getTime() / 1000)}:F> (配信時間: ${durationText})`,
                    inline: true
                };
            }
            
            // Discordに送信するデータ
            const data = {
                username: username,
                embeds: [{
                    title: title,
                    url: `https://www.youtube.com/watch?v=${stream.id}`,
                    color: color,
                    author: {
                        name: stream.snippet.channelTitle,
                        url: `https://www.youtube.com/channel/${stream.snippet.channelId}`,
                        icon_url: 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png'
                    },
                    description: stream.snippet.description.substring(0, 300) + (stream.snippet.description.length > 300 ? '...' : ''),
                    thumbnail: {
                        url: stream.snippet.thumbnails.high.url
                    },
                    fields: [
                        timeField,
                        {
                            name: 'チャンネル',
                            value: `[${stream.snippet.channelTitle}](https://www.youtube.com/channel/${stream.snippet.channelId})`,
                            inline: true
                        }
                    ],
                    footer: {
                        text: 'YouTube配信検索ツール',
                        icon_url: 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png'
                    },
                    timestamp: new Date().toISOString()
                }]
            };
            
            // Discord Webhookに送信
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`Discord通知の送信に失敗しました: ${response.status}`);
            }
            
            // 通知済みとしてマーク（Discordは別にID管理）
            this.notifiedVideos.add(stream.id + '_discord');
            
            // 24時間後に通知済みリストから削除（メモリ節約のため）
            setTimeout(() => {
                this.notifiedVideos.delete(stream.id + '_discord');
            }, 24 * 60 * 60 * 1000);
            
            console.log('Discord通知を送信しました:', title);
            
        } catch (error) {
            console.error('Discord通知の送信中にエラーが発生しました:', error);
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
                notifyCompleted: false,
                enableSound: true
            },
            discord: {
                enableDiscord: false,
                webhookUrl: '',
                username: 'YouTube配信通知'
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
                alert('ブラウザ通知がブロックされています。ブラウザの設定で許可してください。');
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
        
        // テスト用のダミーデータ
        const testStream = {
            id: 'test-' + Date.now(),
            snippet: {
                title: 'これはテスト通知です',
                channelTitle: 'YouTube ライブ配信ツール',
                channelId: 'TestChannelID',
                description: 'テスト通知の説明文です。この通知はテスト用に送信されています。',
                thumbnails: {
                    default: {
                        url: 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png'
                    },
                    high: {
                        url: 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png'
                    }
                }
            },
            liveStreamingDetails: {
                scheduledStartTime: new Date(Date.now() - 7200000).toISOString(), // 2時間前に開始
                actualStartTime: new Date(Date.now() - 7200000).toISOString(),
                actualEndTime: new Date(Date.now() - 300000).toISOString(), // 5分前に終了
            }
        };
        
        // テスト用に全タイプの通知を生成
        const notificationTypes = ['upcoming', 'live', 'completed'];
        const testType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
        this.sendBrowserNotification(testStream, testType);
        
        // 確認メッセージ
        setTimeout(() => {
            alert(`${testType}タイプのテスト通知を送信しました。通知が表示されない場合は、ブラウザの設定を確認してください。`);
        }, 500);
    }

    // Discord通知テスト
    async testDiscordNotification() {
        if (!this.canNotifyDiscord()) {
            alert('Discord通知が設定されていないか、無効になっています。設定を確認してください。');
            return;
        }
        
        try {
            // テスト用のダミーデータ
            const testStream = {
                id: 'test-discord-' + Date.now(),
                snippet: {
                    title: 'これはDiscordテスト通知です',
                    channelTitle: 'YouTube ライブ配信ツール',
                    channelId: 'TestChannelID',
                    description: 'テスト通知の説明文です。この通知はテスト用に送信されています。\nDiscord通知が正常に機能していることを確認するためのテストです。',
                    thumbnails: {
                        default: {
                            url: 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png'
                        },
                        high: {
                            url: 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png'
                        }
                    }
                },
                liveStreamingDetails: {
                    scheduledStartTime: new Date(Date.now() + 3600000).toISOString(),
                    actualStartTime: new Date().toISOString()
                }
            };
            
            // Discord通知を送信
            await this.sendDiscordNotification(testStream, 'live');
            
            alert('Discordにテスト通知を送信しました。Discordサーバーで確認してください。');
            
        } catch (error) {
            console.error('Discord通知テスト中にエラーが発生しました:', error);
            alert(`Discord通知テストに失敗しました: ${error.message}`);
        }
    }
}
