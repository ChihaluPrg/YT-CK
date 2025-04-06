// 設定管理とCSVのインポート・エクスポート機能を実装するファイル

document.addEventListener('DOMContentLoaded', () => {
    console.log('settings.js が読み込まれました');
    
    // DOM要素
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const saveSettingsButton = document.getElementById('save-settings');
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const settingsPanels = document.querySelectorAll('.settings-panel');
    const exportButton = document.getElementById('export-channels');
    const importButton = document.getElementById('import-channels');
    const csvFileInput = document.getElementById('csv-file-input');
    const testNotificationButton = document.getElementById('test-notification');
    const testDiscordButton = document.getElementById('test-discord-notification');
    
    // 要素のデバッグ出力
    console.log('設定ボタン:', settingsButton);
    console.log('設定モーダル:', settingsModal);
    
    // デフォルト設定
    const defaultSettings = {
        general: {
            defaultView: 'calendar',
            autoCheck: true,
            checkInterval: 30 // チェック間隔のデフォルト値
        },
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
        },
        display: {
            defaultTab: 'upcoming',
            collapseSettings: false,
            collapseChannels: false
        }
    };
    
    // 現在の設定を保持
    let currentSettings = loadSettings();
    
    // 設定を読み込む
    function loadSettings() {
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
        return {...defaultSettings};
    }
    
    // 設定を保存する
    function saveSettings(settings) {
        localStorage.setItem('appSettings', JSON.stringify(settings));
    }
    
    // 設定フォームに値を設定
    function populateSettingsForm() {
        // 一般設定
        document.getElementById('default-view').value = currentSettings.general.defaultView;
        document.getElementById('auto-check').checked = currentSettings.general.autoCheck;
        
        // チェック間隔の設定
        const checkInterval = currentSettings.general.checkInterval || 30;
        document.getElementById('check-interval-setting').value = checkInterval;
        
        // 通知設定
        document.getElementById('enable-notifications').checked = currentSettings.notification.enableNotifications;
        document.getElementById('notify-upcoming').checked = currentSettings.notification.notifyUpcoming;
        document.getElementById('notify-live').checked = currentSettings.notification.notifyLive;
        document.getElementById('enable-sound').checked = 
            currentSettings.notification.enableSound !== undefined ? 
            currentSettings.notification.enableSound : true;
        
        // Discord設定
        if (currentSettings.discord) {
            document.getElementById('enable-discord').checked = currentSettings.discord.enableDiscord || false;
            document.getElementById('discord-webhook-url').value = currentSettings.discord.webhookUrl || '';
            document.getElementById('discord-username').value = currentSettings.discord.username || 'YouTube配信通知';
        }
        
        // 表示設定
        document.getElementById('default-tab').value = currentSettings.display.defaultTab;
        document.getElementById('collapse-settings').checked = currentSettings.display.collapseSettings;
        document.getElementById('collapse-channels').checked = currentSettings.display.collapseChannels;
    }
    
    // フォームから設定を取得
    function getSettingsFromForm() {
        return {
            general: {
                defaultView: document.getElementById('default-view').value,
                autoCheck: document.getElementById('auto-check').checked,
                checkInterval: parseInt(document.getElementById('check-interval-setting').value, 10) || 30
            },
            notification: {
                enableNotifications: document.getElementById('enable-notifications').checked,
                notifyUpcoming: document.getElementById('notify-upcoming').checked,
                notifyLive: document.getElementById('notify-live').checked,
                enableSound: document.getElementById('enable-sound').checked
            },
            discord: {
                enableDiscord: document.getElementById('enable-discord').checked,
                webhookUrl: document.getElementById('discord-webhook-url').value.trim(),
                username: document.getElementById('discord-username').value.trim() || 'YouTube配信通知'
            },
            display: {
                defaultTab: document.getElementById('default-tab').value,
                collapseSettings: document.getElementById('collapse-settings').checked,
                collapseChannels: document.getElementById('collapse-channels').checked
            }
        };
    }
    
    // 設定を適用
    function applySettings() {
        // ビュー設定の適用
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            if (btn.getAttribute('data-view') === currentSettings.general.defaultView) {
                btn.click();
            }
        });
        
        // タブ設定の適用
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') === currentSettings.display.defaultTab) {
                btn.click();
            }
        });
        
        // 折りたたみ設定の適用
        const settingsSection = document.querySelector('.settings.collapsible');
        const channelsSection = document.querySelector('.saved-channels.collapsible');
        
        if (currentSettings.display.collapseSettings && !settingsSection.classList.contains('collapsed')) {
            // 設定を折りたたむ
            const sectionId = settingsSection.classList[0];
            toggleSection(settingsSection, sectionId);
        }
        
        if (currentSettings.display.collapseChannels && !channelsSection.classList.contains('collapsed')) {
            // チャンネルリストを折りたたむ
            const sectionId = channelsSection.classList[0];
            toggleSection(channelsSection, sectionId);
        }
        
        // チェック間隔の設定を反映
        const checkInterval = currentSettings.general.checkInterval || 30;
        if (window.updateCheckInterval) {
            window.updateCheckInterval(checkInterval);
        }
    }
    
    // チャンネルリストをCSVでエクスポート
    function exportChannelsToCSV() {
        const channels = JSON.parse(localStorage.getItem('channels') || '[]');
        if (channels.length === 0) {
            alert('エクスポートするチャンネルがありません');
            return;
        }
        
        // CSVヘッダー
        let csvContent = 'チャンネルID,キーワード\n';
        
        // チャンネルデータを追加
        channels.forEach(channel => {
            csvContent += `${channel.channelId},${channel.keywords || ''}\n`;
        });
        
        // CSVファイルとしてダウンロード
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `youtube_channels_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // CSVからチャンネルリストをインポート
    function importChannelsFromCSV(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            const lines = content.split('\n');
            
            // 現在のチャンネルリスト
            const currentChannels = JSON.parse(localStorage.getItem('channels') || '[]');
            const channelIds = new Set(currentChannels.map(c => c.channelId));
            
            // 新しいチャンネル
            const newChannels = [];
            
            // ヘッダー行をスキップして処理
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const [channelId, keywords] = line.split(',');
                if (channelId && !channelIds.has(channelId)) {
                    newChannels.push({
                        channelId: channelId.trim(),
                        keywords: keywords ? keywords.trim() : ''
                    });
                    channelIds.add(channelId);
                }
            }
            
            if (newChannels.length === 0) {
                alert('インポートする新しいチャンネルがありませんでした');
                return;
            }
            
            // チャンネルリストを更新
            const updatedChannels = [...currentChannels, ...newChannels];
            localStorage.setItem('channels', JSON.stringify(updatedChannels));
            
            // UIを更新
            newChannels.forEach(channel => addChannelToUI(channel));
            
            alert(`${newChannels.length}件のチャンネルをインポートしました`);
        };
        
        reader.readAsText(file);
    }
    
    // テスト通知を送信
    function sendTestNotification() {
        // NotificationManagerのインスタンスを取得
        if (typeof notificationManager !== 'undefined') {
            notificationManager.testNotification();
        } else {
            // グローバルなインスタンスがない場合は一時的に作成
            const testManager = new NotificationManager();
            testManager.testNotification();
        }
    }
    
    // Discordテスト通知を送信
    function sendTestDiscordNotification() {
        // NotificationManagerのインスタンスを取得
        if (typeof notificationManager !== 'undefined') {
            notificationManager.testDiscordNotification();
        } else {
            // グローバルなインスタンスがない場合は一時的に作成
            const testManager = new NotificationManager();
            testManager.testDiscordNotification();
        }
    }
    
    // 外部から呼び出せるように公開
    window.toggleSection = function(section, sectionId) {
        section.classList.toggle('collapsed');
        const isCollapsed = section.classList.contains('collapsed');
        localStorage.setItem(`${sectionId}-collapsed`, isCollapsed);
    };
    
    window.addChannelToUI = function(channel) {
        const channelsList = document.getElementById('channels-list');
        const channelItem = document.createElement('div');
        channelItem.className = 'channel-item';
        channelItem.innerHTML = `
            <div class="channel-info">
                <div><strong>チャンネルID:</strong> ${channel.channelId}</div>
                <div><strong>キーワード:</strong> ${channel.keywords || '指定なし'}</div>
            </div>
            <div class="channel-actions">
                <button class="check-channel">チェック</button>
                <button class="remove-channel">削除</button>
            </div>
        `;
        
        channelsList.appendChild(channelItem);
        
        // チェックボタンのイベントリスナー
        channelItem.querySelector('.check-channel').addEventListener('click', () => {
            if (typeof checkChannel === 'function') {
                checkChannel(channel);
            }
        });
        
        // 削除ボタンのイベントリスナー
        channelItem.querySelector('.remove-channel').addEventListener('click', () => {
            if (typeof removeChannel === 'function') {
                removeChannel(channel, channelItem);
            } else {
                // app.jsが読み込まれていない場合の代替処理
                const channels = JSON.parse(localStorage.getItem('channels') || '[]');
                const updatedChannels = channels.filter(c => c.channelId !== channel.channelId);
                localStorage.setItem('channels', JSON.stringify(updatedChannels));
                channelItem.remove();
            }
        });
    };
    
    // イベントリスナー
    
    // 設定ボタンクリック
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            console.log('設定ボタンがクリックされました');
            populateSettingsForm();
            settingsModal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // スクロール防止
        });
    } else {
        console.error('設定ボタンが見つかりません');
    }
    
    // モーダルを閉じる
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            settingsModal.style.display = 'none';
            document.body.style.overflow = '';
        });
    });
    
    // モーダル外クリックで閉じる
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
            document.body.style.overflow = '';
        });
    });
    
    // 設定タブの切り替え
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // アクティブなタブを変更
            settingsTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 対応するパネルを表示
            settingsPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === `${tabName}-settings`) {
                    panel.classList.add('active');
                }
            });
        });
    });
    
    // 設定保存
    saveSettingsButton.addEventListener('click', () => {
        currentSettings = getSettingsFromForm();
        saveSettings(currentSettings);
        settingsModal.style.display = 'none';
        document.body.style.overflow = '';
        
        applySettings();
        alert('設定が保存されました');
    });
    
    // CSVエクスポート
    exportButton.addEventListener('click', (e) => {
        e.stopPropagation(); // セクションヘッダーのクリックイベントを阻止
        exportChannelsToCSV();
    });
    
    // CSVインポート
    importButton.addEventListener('click', (e) => {
        e.stopPropagation(); // セクションヘッダーのクリックイベントを阻止
        csvFileInput.click();
    });
    
    // ファイル選択時の処理
    csvFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importChannelsFromCSV(e.target.files[0]);
            e.target.value = ''; // ファイル選択をリセット
        }
    });
    
    // テスト通知ボタン
    if (testNotificationButton) {
        testNotificationButton.addEventListener('click', sendTestNotification);
        console.log('テスト通知ボタンが登録されました');
    } else {
        console.error('テスト通知ボタンが見つかりません');
    }
    
    // Discordテスト通知ボタン
    if (testDiscordButton) {
        testDiscordButton.addEventListener('click', sendTestDiscordNotification);
        console.log('Discordテスト通知ボタンが登録されました');
    } else {
        console.error('Discordテスト通知ボタンが見つかりません');
    }
    
    // 初期設定の適用
    applySettings();
});
