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
    
    // 要素のデバッグ出力 (より詳細に)
    console.log('設定関連のDOM要素:', {
        'settingsButton': settingsButton,
        'settingsModal': settingsModal,
        'closeModalButtons': closeModalButtons.length,
        'saveSettingsButton': saveSettingsButton,
        'testNotificationButton': testNotificationButton,
        'testDiscordButton': testDiscordButton,
        'settingsTabs': settingsTabs.length,
        'settingsPanels': settingsPanels.length
    });
    
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
        try {
            localStorage.setItem('appSettings', JSON.stringify(settings));
            console.log('設定を保存しました:', settings);
            
            // チェック間隔の値を下位互換性のために別途保存
            if (settings.general && settings.general.checkInterval) {
                localStorage.setItem('checkInterval', settings.general.checkInterval.toString());
                console.log('チェック間隔の値を別途保存しました:', settings.general.checkInterval);
            }
        } catch (error) {
            console.error('設定の保存中にエラーが発生しました:', error);
            alert('設定の保存中にエラーが発生しました。ブラウザのストレージに問題がある可能性があります。');
        }
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
        const checkIntervalValue = parseInt(document.getElementById('check-interval-setting').value, 10);
        // チェック間隔のバリデーション
        const validCheckInterval = isNaN(checkIntervalValue) || checkIntervalValue < 5 ? 30 : checkIntervalValue;
        
        return {
            general: {
                defaultView: document.getElementById('default-view').value,
                autoCheck: document.getElementById('auto-check').checked,
                checkInterval: validCheckInterval
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
        try {
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
            if (currentSettings.general && currentSettings.general.checkInterval !== undefined) {
                const interval = parseInt(currentSettings.general.checkInterval, 10);
                console.log('チェック間隔を設定から適用します:', interval);
                
                if (window.updateCheckInterval) {
                    window.updateCheckInterval(interval);
                } else {
                    console.warn('updateCheckInterval関数が見つかりません。app.jsが正しく読み込まれているか確認してください。');
                }
            }
        } catch (error) {
            console.error('設定の適用中にエラーが発生しました:', error);
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
    
    // 設定ボタンクリック - グローバルリスナーに変更
    function setupSettingsButtonListener() {
        const settingsBtn = document.getElementById('settings-button');
        if (settingsBtn) {
            console.log('設定ボタンにリスナーを設定します');
            
            // 既存のリスナーをすべて削除
            const newButton = settingsBtn.cloneNode(true);
            settingsBtn.parentNode.replaceChild(newButton, settingsBtn);
            
            // 新しいリスナーを追加
            newButton.addEventListener('click', () => {
                console.log('設定ボタンがクリックされました');
                const modal = document.getElementById('settings-modal');
                if (modal) {
                    populateSettingsForm();
                    modal.style.display = 'block';
                    document.body.style.overflow = 'hidden'; // スクロール防止
                } else {
                    console.error('モーダルが見つかりません');
                }
            });
        } else {
            console.error('設定ボタンが見つかりません');
        }
    }
    
    // 初期リスナーを設定
    setupSettingsButtonListener();
    
    // モーダル要素をセットアップ (モーダルは動的に読み込まれることがあるため)
    function setupModalListeners() {
        console.log('モーダルリスナーを設定します');
        
        // クローズボタン
        document.querySelectorAll('.close-modal').forEach(button => {
            // 既存のリスナーを削除して新しいリスナーを設定
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', (e) => {
                console.log('閉じるボタンがクリックされました');
                e.preventDefault();
                e.stopPropagation();
                const modal = document.getElementById('settings-modal');
                if (modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            });
        });
        
        // 保存ボタン
        const saveButton = document.getElementById('save-settings');
        if (saveButton) {
            // 既存のリスナーを削除して新しいリスナーを設定
            const newSaveButton = saveButton.cloneNode(true);
            saveButton.parentNode.replaceChild(newSaveButton, saveButton);
            
            newSaveButton.addEventListener('click', (e) => {
                console.log('保存ボタンがクリックされました');
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    currentSettings = getSettingsFromForm();
                    
                    // 設定値のバリデーション
                    if (currentSettings.general.checkInterval < 5) {
                        currentSettings.general.checkInterval = 5;
                        alert('チェック間隔は5分以上で設定されました。');
                    }
                    
                    saveSettings(currentSettings);
                    const modal = document.getElementById('settings-modal');
                    if (modal) {
                        modal.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                    
                    applySettings();
                    alert('設定が保存されました');
                } catch (error) {
                    console.error('設定の保存・適用中にエラーが発生しました:', error);
                    alert('設定の保存中にエラーが発生しました');
                }
            });
        } else {
            console.error('保存ボタンが見つかりません');
        }
        
        // テスト通知ボタン
        const testButton = document.getElementById('test-notification');
        if (testButton) {
            // 既存のリスナーを削除して新しいリスナーを設定
            const newTestButton = testButton.cloneNode(true);
            testButton.parentNode.replaceChild(newTestButton, testButton);
            
            newTestButton.addEventListener('click', (e) => {
                console.log('テスト通知ボタンがクリックされました');
                e.preventDefault();
                e.stopPropagation();
                sendTestNotification();
            });
        } else {
            console.error('テスト通知ボタンが見つかりません');
        }
        
        // Discordテスト通知ボタン
        const discordTestButton = document.getElementById('test-discord-notification');
        if (discordTestButton) {
            // 既存のリスナーを削除して新しいリスナーを設定
            const newDiscordTestButton = discordTestButton.cloneNode(true);
            discordTestButton.parentNode.replaceChild(newDiscordTestButton, discordTestButton);
            
            newDiscordTestButton.addEventListener('click', (e) => {
                console.log('Discordテスト通知ボタンがクリックされました');
                e.preventDefault();
                e.stopPropagation();
                sendTestDiscordNotification();
            });
        } else {
            console.error('Discordテスト通知ボタンが見つかりません');
        }
        
        // 設定タブの切り替え
        document.querySelectorAll('.settings-tab').forEach(tab => {
            // 既存のリスナーを削除して新しいリスナーを設定
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            newTab.addEventListener('click', (e) => {
                console.log('設定タブがクリックされました:', newTab.getAttribute('data-tab'));
                e.preventDefault();
                e.stopPropagation();
                
                const tabName = newTab.getAttribute('data-tab');
                
                // アクティブなタブを変更
                document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                newTab.classList.add('active');
                
                // 対応するパネルを表示
                document.querySelectorAll('.settings-panel').forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.id === `${tabName}-settings`) {
                        panel.classList.add('active');
                    }
                });
            });
        });
    }
    
    // モーダルイベントリスナー設定関数を呼び出す
    setupModalListeners();
    
    // モーダル外クリックで閉じる
    if (settingsModal) {
        const newModal = settingsModal.cloneNode(true);
        settingsModal.parentNode.replaceChild(newModal, settingsModal);
        
        newModal.addEventListener('click', (e) => {
            if (e.target === newModal) {
                console.log('モーダル外がクリックされました');
                newModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }
    
    // 設定ボタンがクリックされたときにもリスナーを再設定
    document.addEventListener('click', (e) => {
        if (e.target.id === 'settings-button' || e.target.closest('#settings-button')) {
            console.log('設定ボタン関連要素がクリックされました - リスナーを再設定');
            setTimeout(() => {
                setupModalListeners();
            }, 100); // モーダルが表示された後に実行
        }
    });
    
    // 定期的にモーダルリスナーを確認・再設定
    setInterval(() => {
        const modal = document.getElementById('settings-modal');
        if (modal && modal.style.display === 'block') {
            setupModalListeners();
        }
    }, 1000);
    
    // ドキュメント全体にクリックリスナーを追加 (特定のボタンを確実に捕捉するため)
    document.addEventListener('click', (e) => {
        // 設定モーダル内のボタンクリックを監視
        if (e.target.id === 'save-settings' || e.target.id === 'test-notification' || 
            e.target.id === 'test-discord-notification') {
            console.log('モーダル内のボタンが直接クリックされました:', e.target.id);
            
            e.preventDefault();
            e.stopPropagation();
            
            if (e.target.id === 'save-settings') {
                try {
                    const currentSettings = window.getSettingsFromForm ? 
                        window.getSettingsFromForm() : 
                        getSettingsFromForm();
                    
                    window.saveSettings ? 
                        window.saveSettings(currentSettings) : 
                        saveSettings(currentSettings);
                    
                    document.getElementById('settings-modal').style.display = 'none';
                    document.body.style.overflow = '';
                    
                    window.applySettings ? 
                        window.applySettings() : 
                        applySettings();
                    
                    alert('設定が保存されました');
                } catch (error) {
                    console.error('設定保存時のエラー:', error);
                    alert('設定の保存中にエラーが発生しました');
                }
            } else if (e.target.id === 'test-notification') {
                window.sendTestNotification ? 
                    window.sendTestNotification() : 
                    sendTestNotification();
            } else if (e.target.id === 'test-discord-notification') {
                window.sendTestDiscordNotification ? 
                    window.sendTestDiscordNotification() : 
                    sendTestDiscordNotification();
            }
        }
    });
    
    // 初期設定の適用
    applySettings();
});
