class NotificationManager {
    constructor() {
        // 通知済みビデオのリストを永続化するよう変更
        this.notifiedVideos = this.loadNotifiedVideos();
        this.isNotificationSupported = 'Notification' in window;
        this.timeout = 10000; // 10秒タイムアウト
        this.retryCount = 2; // リトライ回数
        this.requestPermission();
        
        // 定期的に古い通知履歴を削除（24時間以上経過したもの）
        this.cleanupNotifiedVideos();
        setInterval(() => this.cleanupNotifiedVideos(), 3600000); // 1時間ごとにクリーンアップ
        
        console.log('NotificationManager: 初期化完了', 
                   '通知履歴数:', this.notifiedVideos.size);
    }

    // 通知済みビデオリストをロード
    loadNotifiedVideos() {
        const saved = localStorage.getItem('notifiedVideos');
        if (saved) {
            try {
                const notifiedVideosObj = JSON.parse(saved);
                const notifiedVideosWithTimestamp = new Map();
                
                Object.keys(notifiedVideosObj).forEach(key => {
                    notifiedVideosWithTimestamp.set(key, notifiedVideosObj[key]);
                });
                
                return notifiedVideosWithTimestamp;
            } catch (e) {
                console.error('通知履歴の読み込みに失敗しました:', e);
                return new Map();
            }
        }
        return new Map();
    }

    // 通知履歴を保存
    saveNotifiedVideos() {
        const notifiedVideosObj = {};
        this.notifiedVideos.forEach((timestamp, id) => {
            notifiedVideosObj[id] = timestamp;
        });
        
        localStorage.setItem('notifiedVideos', JSON.stringify(notifiedVideosObj));
    }

    // 古い通知履歴をクリーンアップ
    cleanupNotifiedVideos() {
        const now = Date.now();
        const expireTime = 24 * 60 * 60 * 1000; // 24時間
        
        let hasDeleted = false;
        this.notifiedVideos.forEach((timestamp, id) => {
            if (now - timestamp > expireTime) {
                this.notifiedVideos.delete(id);
                hasDeleted = true;
            }
        });
        
        if (hasDeleted) {
            this.saveNotifiedVideos();
        }
    }

    requestPermission() {
        if (this.isNotificationSupported && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    canNotify() {
        const appSettings = this.getSettings();
        const enabled = this.isNotificationSupported && 
               Notification.permission === 'granted' && 
               appSettings.notification.enableNotifications;
        
        if (!enabled) {
            console.log('ブラウザ通知が無効: ', 
                'サポート:', this.isNotificationSupported, 
                '権限:', Notification.permission, 
                '設定:', appSettings.notification.enableNotifications);
        }
        return enabled;
    }

    canNotifyDiscord() {
        const appSettings = this.getSettings();
        const enabled = appSettings.discord && 
               appSettings.discord.enableDiscord && 
               appSettings.discord.webhookUrl && 
               appSettings.discord.webhookUrl.trim() !== '';
        
        if (!enabled) {
            console.log('Discord通知が無効: ',
                'Discord設定あり:', !!appSettings.discord,
                'Discord有効:', appSettings.discord?.enableDiscord,
                'Webhook設定あり:', !!appSettings.discord?.webhookUrl);
        }
        return enabled;
    }

    notify(stream, type) {
        const notificationSent = {
            browser: false,
            discord: false
        };
        
        if (this.canNotify()) {
            notificationSent.browser = this.sendBrowserNotification(stream, type);
        }
        
        if (this.canNotifyDiscord()) {
            this.sendDiscordNotification(stream, type)
                .then(sent => { notificationSent.discord = sent; });
        }
    }

    sendBrowserNotification(stream, type) {
        const appSettings = this.getSettings();
        if (type === 'upcoming' && !appSettings.notification.notifyUpcoming) {
            console.log('配信予定通知は無効なのでスキップします');
            return false;
        }
        if (type === 'live' && !appSettings.notification.notifyLive) {
            console.log('ライブ配信通知は無効なのでスキップします');
            return false;
        }

        const notificationId = `${stream.id}_${type}`;
        if (this.notifiedVideos.has(notificationId)) {
            console.log('ブラウザ通知をスキップ:', type, stream.snippet.title);
            return false;
        }

        let title, icon;
        
        if (type === 'live') {
            title = `${stream.snippet.channelTitle} がライブ配信中`;
            icon = 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png';
        } else if (type === 'upcoming') {
            title = `${stream.snippet.channelTitle} が配信予定`;
            icon = 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png';
        }

        const options = {
            body: stream.snippet.title,
            icon: icon,
            badge: 'https://www.youtube.com/s/desktop/e4d15d2c/img/favicon_144x144.png',
            image: stream.snippet.thumbnails.high.url,
            tag: stream.id,
            data: {
                url: `https://www.youtube.com/watch?v=${stream.id}`
            },
            silent: !appSettings.notification.enableSound
        };

        try {
            const notification = new Notification(title, options);
            
            notification.onclick = function() {
                window.open(this.data.url, '_blank');
                this.close();
            };

            this.notifiedVideos.set(notificationId, Date.now());
            this.saveNotifiedVideos();
            return true;
        } catch (error) {
            console.error('ブラウザ通知の表示中にエラーが発生しました:', error);
            return false;
        }
    }

    async sendDiscordNotification(stream, type) {
        const appSettings = this.getSettings();
        if (type === 'upcoming' && !appSettings.notification.notifyUpcoming) {
            console.log('配信予定Discord通知は無効なのでスキップします');
            return false;
        }
        if (type === 'live' && !appSettings.notification.notifyLive) {
            console.log('ライブ配信Discord通知は無効なのでスキップします');
            return false;
        }

        const notificationId = `${stream.id}_discord_${type}`;
        if (this.notifiedVideos.has(notificationId)) {
            console.log('Discord通知をスキップ:', type, stream.snippet.title);
            return false;
        }

        try {
            const webhookUrl = appSettings.discord.webhookUrl;
            
            if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
                console.error('無効なDiscord Webhook URL:', webhookUrl);
                throw new Error('Discord Webhook URLが無効です。設定を確認してください。');
            }
            
            const username = appSettings.discord.username || 'YouTube配信通知';
            const color = type === 'live' ? 0xFF0000 : 0x3498DB;
            const title = type === 'live' 
                ? `🔴 ライブ配信中: ${stream.snippet.title}`
                : `🕒 配信予定: ${stream.snippet.title}`;
            
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
            }
            
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
            
            await this.sendWebhookWithRetry(webhookUrl, data);
            
            this.notifiedVideos.set(notificationId, Date.now());
            this.saveNotifiedVideos();
            
            console.log('Discord通知を送信しました:', title);
            return true;
        } catch (error) {
            console.error('Discord通知の送信中にエラーが発生しました:', error);
            return false;
        }
    }
    
    async sendWebhookWithRetry(webhookUrl, data, retries = this.retryCount) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Discord APIエラー (${response.status}): ${errorText}`);
            }
            
            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Discord webhook リクエストがタイムアウトしました');
                if (retries > 0) {
                    console.log(`リトライします... (残り${retries}回)`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return this.sendWebhookWithRetry(webhookUrl, data, retries - 1);
                }
                throw new Error('Discord通信がタイムアウトしました。ネットワーク接続を確認してください。');
            }
            
            if (error.message.includes('429')) {
                throw new Error('Discordのレート制限に達しました。しばらく時間をおいてから再試行してください。');
            }
            
            if (retries > 0) {
                console.warn(`Discord webhook リクエスト失敗: ${error.message}, リトライします (残り${retries}回)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.sendWebhookWithRetry(webhookUrl, data, retries - 1);
            }
            
            throw error;
        }
    }

    notifyNewStreams(newStreams, type) {
        newStreams.forEach(stream => {
            this.notify(stream, type);
        });
    }

    getSettings() {
        const defaultSettings = {
            notification: {
                enableNotifications: true,
                notifyUpcoming: true,
                notifyLive: true,
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
                scheduledStartTime: new Date(Date.now() - 7200000).toISOString(),
                actualStartTime: new Date(Date.now() - 7200000).toISOString(),
            }
        };
        
        const appSettings = this.getSettings();
        const availableTypes = [];
        
        if (appSettings.notification.notifyUpcoming) availableTypes.push('upcoming');
        if (appSettings.notification.notifyLive) availableTypes.push('live');
        
        if (availableTypes.length === 0) {
            alert('通知設定がすべて無効になっています。設定画面で通知を有効にしてください。');
            return;
        }
        
        const testType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        
        const sent = this.sendBrowserNotification(testStream, testType);
        
        setTimeout(() => {
            if (sent) {
                alert(`${testType}タイプのテスト通知を送信しました。通知が表示されない場合は、ブラウザの設定を確認してください。`);
            } else {
                alert(`通知の送信に失敗しました。通知設定を確認してください。
選択されたタイプ: ${testType}
有効な通知タイプ: ${availableTypes.join(', ')}`);
            }
        }, 500);
    }

    async testDiscordNotification() {
        if (!this.canNotifyDiscord()) {
            alert('Discord通知が設定されていないか、無効になっています。設定を確認してください。');
            return;
        }
        
        try {
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
            
            await this.sendDiscordNotification(testStream, 'live');
            
            alert('Discordにテスト通知を送信しました。Discordサーバーで確認してください。');
        } catch (error) {
            console.error('Discord通知テスト中にエラーが発生しました:', error);
            let errorMessage = 'Discord通知テストに失敗しました';
            
            if (error.message.includes('無効なDiscord Webhook URL')) {
                errorMessage = 'Discord Webhook URLが無効です。正しいURLを設定してください。';
            } else if (error.message.includes('429')) {
                errorMessage = 'Discordのレート制限に達しました。しばらく時間をおいてから再試行してください。';
            } else if (error.name === 'AbortError' || error.message.includes('タイムアウト')) {
                errorMessage = 'リクエストがタイムアウトしました。ネットワーク接続を確認してください。';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
            }
            
            alert(`${errorMessage}\nエラー詳細: ${error.message}`);
        }
    }
}
