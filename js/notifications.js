class NotificationManager {
    constructor() {
        this.notifiedVideos = new Set();
        this.isNotificationSupported = 'Notification' in window;
        this.timeout = 10000; // 10秒タイムアウト
        this.retryCount = 2; // リトライ回数
        this.requestPermission();
    }

    requestPermission() {
        if (this.isNotificationSupported && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    canNotify() {
        const appSettings = this.getSettings();
        return this.isNotificationSupported && 
               Notification.permission === 'granted' && 
               appSettings.notification.enableNotifications;
    }

    canNotifyDiscord() {
        const appSettings = this.getSettings();
        return appSettings.discord && 
               appSettings.discord.enableDiscord && 
               appSettings.discord.webhookUrl && 
               appSettings.discord.webhookUrl.trim() !== '';
    }

    notify(stream, type) {
        if (this.canNotify()) {
            this.sendBrowserNotification(stream, type);
        }
        
        if (this.canNotifyDiscord()) {
            this.sendDiscordNotification(stream, type);
        }
    }

    sendBrowserNotification(stream, type) {
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

        if (this.notifiedVideos.has(stream.id)) {
            return;
        }

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

            this.notifiedVideos.add(stream.id);
            
            setTimeout(() => {
                this.notifiedVideos.delete(stream.id);
            }, 24 * 60 * 60 * 1000);
        } catch (error) {
            console.error('ブラウザ通知の表示中にエラーが発生しました:', error);
        }
    }

    async sendDiscordNotification(stream, type) {
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

        if (this.notifiedVideos.has(stream.id + '_discord')) {
            return;
        }

        try {
            const webhookUrl = appSettings.discord.webhookUrl;
            
            if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
                console.error('無効なDiscord Webhook URL:', webhookUrl);
                throw new Error('Discord Webhook URLが無効です。設定を確認してください。');
            }
            
            const username = appSettings.discord.username || 'YouTube配信通知';
            const color = type === 'live' ? 0xFF0000 : 
                         type === 'upcoming' ? 0x3498DB : 0x708090;
            const title = type === 'live' 
                ? `🔴 ライブ配信中: ${stream.snippet.title}`
                : type === 'upcoming'
                ? `🕒 配信予定: ${stream.snippet.title}`
                : `✓ 配信終了: ${stream.snippet.title}`;
            
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
            
            this.notifiedVideos.add(stream.id + '_discord');
            
            setTimeout(() => {
                this.notifiedVideos.delete(stream.id + '_discord');
            }, 24 * 60 * 60 * 1000);
            
            console.log('Discord通知を送信しました:', title);
            
        } catch (error) {
            console.error('Discord通知の送信中にエラーが発生しました:', error);
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
                actualEndTime: new Date(Date.now() - 300000).toISOString(),
            }
        };
        
        const notificationTypes = ['upcoming', 'live', 'completed'];
        const testType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
        this.sendBrowserNotification(testStream, testType);
        
        setTimeout(() => {
            alert(`${testType}タイプのテスト通知を送信しました。通知が表示されない場合は、ブラウザの設定を確認してください。`);
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
