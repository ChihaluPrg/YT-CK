document.addEventListener('DOMContentLoaded', () => {
    // クラスのインスタンス化
    const notificationManager = new NotificationManager();
    let youtubeAPI = new YouTubeAPI('');
    
    // DOM要素
    const apiKeyInput = document.getElementById('api-key');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const channelIdInput = document.getElementById('channel-id');
    const keywordsInput = document.getElementById('keywords');
    const checkIntervalInput = document.getElementById('check-interval');
    const addChannelBtn = document.getElementById('add-channel');
    const checkNowBtn = document.getElementById('check-now');
    const channelsList = document.getElementById('channels-list');
    const upcomingStreamsContainer = document.getElementById('upcoming-streams');
    const liveStreamsContainer = document.getElementById('live-streams');
    const completedStreamsContainer = document.getElementById('completed-streams');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const viewButtons = document.querySelectorAll('.view-btn');
    const calendarView = document.getElementById('calendar-view');
    const listView = document.getElementById('list-view');
    const prevDateBtn = document.getElementById('prev-date');
    const nextDateBtn = document.getElementById('next-date');
    const currentDateElement = document.getElementById('current-date');
    const timelineHours = document.querySelector('.timeline-hours');
    const timelineSchedule = document.querySelector('.timeline-schedule');
    const collapsibleSections = document.querySelectorAll('.collapsible');
    
    // 折りたたみセクションの初期化
    initCollapsibleSections();
    
    // 折りたたみセクションの初期化関数
    function initCollapsibleSections() {
        collapsibleSections.forEach(section => {
            const header = section.querySelector('.section-header');
            const toggleBtn = section.querySelector('.toggle-btn');
            const sectionId = section.classList[0]; // 最初のクラス名をIDとして使用
            
            // ローカルストレージから状態を読み込み
            const isCollapsed = localStorage.getItem(`${sectionId}-collapsed`) === 'true';
            if (isCollapsed) {
                section.classList.add('collapsed');
            }
            
            // ヘッダーまたはトグルボタンのクリックで折りたたみを切り替える
            header.addEventListener('click', (e) => {
                // ボタン以外の部分をクリックした場合のみ切り替え
                if (!e.target.closest('.toggle-btn')) {
                    toggleSection(section, sectionId);
                }
            });
            
            toggleBtn.addEventListener('click', () => {
                toggleSection(section, sectionId);
            });
        });
    }
    
    // セクションの折りたたみを切り替える
    function toggleSection(section, sectionId) {
        section.classList.toggle('collapsed');
        
        // 状態をローカルストレージに保存
        const isCollapsed = section.classList.contains('collapsed');
        localStorage.setItem(`${sectionId}-collapsed`, isCollapsed);
    }
    
    // 表示する日付
    let currentDate = new Date();
    
    // 全配信データを保持
    let allStreams = {
        upcoming: [],
        live: [],
        completed: []
    };
    
    // ビュー切り替え機能
    viewButtons.forEach(button => {
        button.addEventListener('click', () => {
            const viewName = button.getAttribute('data-view');
            
            // アクティブなビューボタンを変更
            viewButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // アクティブなビューを変更
            document.querySelectorAll('.schedule-view').forEach(view => {
                view.classList.remove('active');
            });
            
            if (viewName === 'calendar') {
                calendarView.classList.add('active');
                updateCalendarView();
            } else {
                listView.classList.add('active');
            }
        });
    });
    
    // タブ切り替え機能
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // アクティブなタブボタンを変更
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // アクティブなコンテンツを変更
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-streams`).classList.add('active');
            
            if (calendarView.classList.contains('active')) {
                updateCalendarView();
            }
        });
    });
    
    // 日付ナビゲーション
    prevDateBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateDateDisplay();
        updateCalendarView();
    });
    
    nextDateBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        updateDateDisplay();
        updateCalendarView();
    });
    
    // 日付表示を更新
    function updateDateDisplay() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateElement.textContent = currentDate.toLocaleDateString('ja-JP', options);
    }
    
    // タイムラインの時間表示を生成
    function generateTimelineHours() {
        let hoursHTML = '';
        for (let i = 0; i < 24; i++) {
            hoursHTML += `<div class="hour-marker">${i}:00</div>`;
        }
        timelineHours.innerHTML = hoursHTML;
    }
    
    // 現在時刻のインジケーターを表示
    function showCurrentTimeIndicator() {
        const now = new Date();
        if (now.toDateString() !== currentDate.toDateString()) {
            return; // 表示日が今日でない場合は表示しない
        }
        
        const minutes = now.getHours() * 60 + now.getMinutes();
        const position = (minutes / 1440) * 1440; // 1日の分数に対する位置
        
        const indicator = document.createElement('div');
        indicator.className = 'time-indicator';
        indicator.style.top = `${position}px`;
        
        // 既存のインジケーターを削除
        const existingIndicator = timelineSchedule.querySelector('.time-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        timelineSchedule.appendChild(indicator);
    }
    
    // カレンダービュー更新
    function updateCalendarView() {
        // 時間マーカーを生成
        generateTimelineHours();
        
        // 現在表示中のタブを取得
        const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
        const streams = allStreams[activeTab];
        
        // タイムラインをクリア
        timelineSchedule.innerHTML = '';
        
        // 選択された日付のデータをフィルタリング
        const dateStreams = streams.filter(stream => {
            let streamDate;
            if (activeTab === 'upcoming') {
                streamDate = new Date(stream.liveStreamingDetails.scheduledStartTime);
            } else if (activeTab === 'live') {
                streamDate = new Date(); // ライブは現在の日付を使用
            } else if (activeTab === 'completed') {
                streamDate = new Date(stream.liveStreamingDetails.actualEndTime);
            }
            return streamDate.toDateString() === currentDate.toDateString();
        });
        
        // スケジュールアイテムを生成
        dateStreams.forEach(stream => {
            let startTime, endTime, status, statusIcon;
            
            if (activeTab === 'upcoming') {
                startTime = new Date(stream.liveStreamingDetails.scheduledStartTime);
                // 配信予定は1時間と仮定
                endTime = new Date(startTime);
                endTime.setHours(endTime.getHours() + 1);
                status = 'upcoming';
                statusIcon = '🕒';
            } else if (activeTab === 'live') {
                startTime = new Date(stream.liveStreamingDetails.actualStartTime || new Date());
                endTime = new Date();
                endTime.setHours(endTime.getHours() + 1); // 進行中なので1時間と仮定
                status = 'live';
                statusIcon = '🔴';
            } else if (activeTab === 'completed') {
                startTime = new Date(stream.liveStreamingDetails.actualStartTime);
                endTime = new Date(stream.liveStreamingDetails.actualEndTime);
                status = 'completed';
                statusIcon = '✓';
            }
            
            // 同じ日の場合のみ表示
            if (startTime.toDateString() === currentDate.toDateString()) {
                const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
                const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
                const duration = endMinutes - startMinutes;
                
                const scheduleItem = document.createElement('div');
                scheduleItem.className = `schedule-item ${status}`;
                scheduleItem.style.top = `${startMinutes}px`;
                scheduleItem.style.height = `${Math.max(duration, 80)}px`; // 最小高さを確保
                
                // フォーマットされた時間
                const timeFormat = { hour: '2-digit', minute: '2-digit' };
                const formattedStart = startTime.toLocaleTimeString('ja-JP', timeFormat);
                const formattedEnd = endTime.toLocaleTimeString('ja-JP', timeFormat);
                
                // サムネイル画像のURL
                const thumbnailUrl = stream.snippet.thumbnails.high.url;
                
                scheduleItem.innerHTML = `
                    <div class="schedule-thumbnail" style="background-image: url('${thumbnailUrl}')">
                        <div class="schedule-status-icon">${statusIcon}</div>
                    </div>
                    <div class="schedule-content">
                        <div class="schedule-time">${formattedStart} - ${formattedEnd}</div>
                        <div class="schedule-title">${stream.snippet.title}</div>
                        <div class="schedule-channel">${stream.snippet.channelTitle}</div>
                    </div>
                `;
                
                scheduleItem.dataset.id = stream.id;
                scheduleItem.addEventListener('click', () => {
                    window.open(`https://www.youtube.com/watch?v=${stream.id}`, '_blank');
                });
                
                timelineSchedule.appendChild(scheduleItem);
            }
        });
        
        // 現在時刻のインジケーターを表示
        showCurrentTimeIndicator();
    }
    
    // ローカルストレージから設定を読み込み
    function loadFromLocalStorage() {
        const apiKey = localStorage.getItem('youtubeApiKey');
        if (apiKey) {
            apiKeyInput.value = apiKey;
            youtubeAPI.setApiKey(apiKey);
        }
        
        const channels = JSON.parse(localStorage.getItem('channels') || '[]');
        channels.forEach(channel => addChannelToUI(channel));
        
        const checkInterval = localStorage.getItem('checkInterval');
        if (checkInterval) {
            checkIntervalInput.value = checkInterval;
        }
    }

    // API キーを保存
    saveApiKeyBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('youtubeApiKey', apiKey);
            youtubeAPI.setApiKey(apiKey);
            alert('API キーが保存されました');
        } else {
            alert('有効なAPI キーを入力してください');
        }
    });

    // チャンネルを追加
    addChannelBtn.addEventListener('click', () => {
        const channelId = channelIdInput.value.trim();
        const keywords = keywordsInput.value.trim();
        
        if (!channelId) {
            alert('チャンネルIDを入力してください');
            return;
        }
        
        const channel = { channelId, keywords };
        addChannelToStorage(channel);
        addChannelToUI(channel);
        
        // 入力フィールドをクリア
        channelIdInput.value = '';
        keywordsInput.value = '';
    });

    // チャンネルをストレージに追加
    function addChannelToStorage(channel) {
        const channels = JSON.parse(localStorage.getItem('channels') || '[]');
        
        // 既に同じチャンネルが登録されていないか確認
        const exists = channels.some(c => c.channelId === channel.channelId);
        if (!exists) {
            channels.push(channel);
            localStorage.setItem('channels', JSON.stringify(channels));
        }
    }

    // チャンネルをUIに追加
    function addChannelToUI(channel) {
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
            checkChannel(channel);
        });
        
        // 削除ボタンのイベントリスナー
        channelItem.querySelector('.remove-channel').addEventListener('click', () => {
            removeChannel(channel, channelItem);
        });
    }

    // チャンネルを削除
    function removeChannel(channel, channelItem) {
        const channels = JSON.parse(localStorage.getItem('channels') || '[]');
        const updatedChannels = channels.filter(c => c.channelId !== channel.channelId);
        localStorage.setItem('channels', JSON.stringify(updatedChannels));
        
        channelItem.remove();
    }

    // チャンネルのライブ配信と配信予定をチェック（配信終了チェックを削除）
    async function checkChannel(channel) {
        if (!youtubeAPI.apiKey) {
            alert('YouTube API キーを設定してください');
            return;
        }
        
        try {
            // ライブ配信をチェック
            const liveStreams = await youtubeAPI.fetchLiveStreams(channel.channelId);
            const filteredLiveStreams = youtubeAPI.filterStreamsByKeywords(liveStreams, channel.keywords);
            console.log('新しいライブ配信を取得:', filteredLiveStreams.length, '件');
            
            // 配信予定をチェック
            const upcomingStreams = await youtubeAPI.fetchUpcomingLivestreams(channel.channelId);
            const filteredUpcomingStreams = youtubeAPI.filterStreamsByKeywords(upcomingStreams, channel.keywords);
            
            // 過去の配信はUIのために取得するが、通知には使用しない
            const completedStreams = await youtubeAPI.fetchCompletedLivestreams(channel.channelId);
            const filteredCompletedStreams = youtubeAPI.filterStreamsByKeywords(completedStreams, channel.keywords);
            
            // 全配信データを更新
            allStreams.live = [...allStreams.live, ...filteredLiveStreams];
            allStreams.upcoming = [...allStreams.upcoming, ...filteredUpcomingStreams];
            allStreams.completed = [...allStreams.completed, ...filteredCompletedStreams];
            
            // 重複を削除
            allStreams.live = removeDuplicateStreams(allStreams.live);
            allStreams.upcoming = removeDuplicateStreams(allStreams.upcoming);
            allStreams.completed = removeDuplicateStreams(allStreams.completed);
            
            // 新しい配信を通知
            notificationManager.notifyNewStreams(filteredLiveStreams, 'live');
            notificationManager.notifyNewStreams(filteredUpcomingStreams, 'upcoming');
            
            // UI更新
            updateStreamsList(allStreams.live, liveStreamsContainer, false, false);
            updateStreamsList(allStreams.upcoming, upcomingStreamsContainer, true, false);
            updateStreamsList(allStreams.completed, completedStreamsContainer, false, true);
            
            // カレンダーを更新
            if (calendarView.classList.contains('active')) {
                updateCalendarView();
            }
            
        } catch (error) {
            console.error('チャンネルのチェック中にエラーが発生しました:', error);
            
            // よりユーザーフレンドリーなエラーメッセージを表示
            let userMessage = `エラーが発生しました: ${error.message}`;
            
            if (error.message.includes('クォータを超過')) {
                userMessage = 'YouTube APIのクォータ（利用制限）を超過しました。しばらく時間をおいてから再試行してください。';
            } else if (error.message.includes('API key')) {
                userMessage = 'YouTube APIキーが無効です。キーを確認して再度設定してください。';
            } else if (error.message.includes('チャンネルID') && error.message.includes('見つかりません')) {
                userMessage = `チャンネルが見つかりません: ${channel.channelId}\nチャンネルIDが正しいか確認してください。`;
            } else if (error.message.includes('タイムアウト') || error.name === 'AbortError') {
                userMessage = 'リクエストがタイムアウトしました。ネットワーク接続を確認してください。';
            } else if (error.message.includes('NetworkError') || error.message.includes('network')) {
                userMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
            }
            
            alert(userMessage);
        }
    }

    // 重複したストリームを削除する
    function removeDuplicateStreams(streams) {
        const uniqueIds = {};
        return streams.filter(stream => {
            if (uniqueIds[stream.id]) {
                return false;
            }
            uniqueIds[stream.id] = true;
            return true;
        });
    }

    // LocalStorageの容量を考慮して配信リストを管理
    function limitStreamListSize(streams, maxSize = 100) {
        if (streams.length <= maxSize) {
            return streams;
        }
        
        // 日付でソート（古い順）して古いものから削除
        streams.sort((a, b) => {
            const timeA = a.liveStreamingDetails.actualEndTime || 
                          a.liveStreamingDetails.scheduledStartTime || 
                          a.liveStreamingDetails.actualStartTime;
            const timeB = b.liveStreamingDetails.actualEndTime || 
                          b.liveStreamingDetails.scheduledStartTime || 
                          b.liveStreamingDetails.actualStartTime;
            return new Date(timeA) - new Date(timeB);
        });
        
        // 最大サイズになるまで削除
        return streams.slice(streams.length - maxSize);
    }

    // 全チャンネルをチェック
    async function checkAllChannels() {
        try {
            // 配信データをリセット
            allStreams = {
                upcoming: [],
                live: [],
                completed: []
            };
            
            const channels = JSON.parse(localStorage.getItem('channels') || '[]');
            
            if (channels.length === 0) {
                // チャンネルリストが空の場合はUIを更新
                updateStreamsList([], upcomingStreamsContainer, true, false);
                updateStreamsList([], liveStreamsContainer, false, false);
                updateStreamsList([], completedStreamsContainer, false, true);
                
                // カレンダーも更新
                if (calendarView.classList.contains('active')) {
                    updateCalendarView();
                }
                return;
            }
            
            // チャンネルを順番にチェック
            for (const channel of channels) {
                await checkChannel(channel);
            }
            
            // リストサイズを制限してLocalStorageの容量を節約
            allStreams.completed = limitStreamListSize(allStreams.completed, 100);
            allStreams.upcoming = limitStreamListSize(allStreams.upcoming, 50);
            allStreams.live = limitStreamListSize(allStreams.live, 30);
            
        } catch (error) {
            console.error('全チャンネルチェック中にエラーが発生しました:', error);
            alert(`チェック中にエラーが発生しました: ${error.message}`);
        }
    }

    // 検索結果をUIに表示
    function updateStreamsList(streams, container, isUpcoming = false, isCompleted = false) {
        if (streams.length === 0) {
            container.innerHTML = '<div class="no-results">該当する配信はありません</div>';
            return;
        }
        
        // 日付でソート
        streams.sort((a, b) => {
            let dateA, dateB;
            
            if (isUpcoming) {
                dateA = new Date(a.liveStreamingDetails.scheduledStartTime);
                dateB = new Date(b.liveStreamingDetails.scheduledStartTime);
            } else if (isCompleted) {
                dateA = new Date(a.liveStreamingDetails.actualEndTime);
                dateB = new Date(b.liveStreamingDetails.actualEndTime);
            } else {
                dateA = new Date(a.liveStreamingDetails.actualStartTime || Date.now());
                dateB = new Date(a.liveStreamingDetails.actualStartTime || Date.now());
            }
            
            return isCompleted ? dateB - dateA : dateA - dateB; // 完了した配信は新しい順、それ以外は古い順
        });
        
        // 日付ごとにグループ化
        const streamsByDate = {};
        streams.forEach(stream => {
            let streamDate;
            
            if (isUpcoming) {
                streamDate = new Date(stream.liveStreamingDetails.scheduledStartTime);
            } else if (isCompleted) {
                streamDate = new Date(stream.liveStreamingDetails.actualEndTime);
            } else {
                streamDate = new Date(stream.liveStreamingDetails.actualStartTime || Date.now());
            }
            
            const dateKey = streamDate.toDateString();
            
            if (!streamsByDate[dateKey]) {
                streamsByDate[dateKey] = [];
            }
            
            streamsByDate[dateKey].push(stream);
        });
        
        // 日付ごとのHTMLを生成
        let html = '';
        Object.keys(streamsByDate).forEach(dateKey => {
            const dateStreams = streamsByDate[dateKey];
            const date = new Date(dateKey);
            const formattedDate = date.toLocaleDateString('ja-JP', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                weekday: 'long' 
            });
            
            html += `<div class="date-separator">${formattedDate}</div>`;
            
            dateStreams.forEach(stream => {
                const videoId = stream.id;
                const title = stream.snippet.title;
                const channelTitle = stream.snippet.channelTitle;
                const thumbnail = stream.snippet.thumbnails.high.url;
                const description = stream.snippet.description.substring(0, 150) + (stream.snippet.description.length > 150 ? '...' : '');
                
                let timeInfo = '';
                let timeClass = '';
                let statusIcon = '';
                
                if (isUpcoming && stream.liveStreamingDetails && stream.liveStreamingDetails.scheduledStartTime) {
                    const startTime = new Date(stream.liveStreamingDetails.scheduledStartTime);
                    timeInfo = `配信予定: ${startTime.toLocaleTimeString('ja-JP')}`;
                    timeClass = 'upcoming';
                    statusIcon = '🕒';
                } else if (isCompleted && stream.liveStreamingDetails) {
                    const endTime = new Date(stream.liveStreamingDetails.actualEndTime);
                    timeInfo = `配信終了: ${endTime.toLocaleTimeString('ja-JP')}`;
                    timeClass = 'completed';
                    statusIcon = '✓';
                } else {
                    timeInfo = '🔴 ライブ配信中';
                    timeClass = 'live';
                    statusIcon = '🔴';
                }
                
                html += `
                    <div class="stream-card" data-id="${videoId}">
                        <div class="thumbnail-container">
                            <img src="${thumbnail}" alt="${title}" class="stream-thumbnail">
                            <div class="status-badge">${statusIcon}</div>
                        </div>
                        <div class="stream-details">
                            <h3 class="stream-title">${title}</h3>
                            <div class="stream-time ${timeClass}">${timeInfo}</div>
                            <div class="stream-channel">${channelTitle}</div>
                            <p class="stream-description">${description}</p>
                            <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="watch-button">視聴する</a>
                        </div>
                    </div>
                `;
            });
        });
        
        container.innerHTML = html;
        
        // カード内のリンクをクリックした時の処理
        container.querySelectorAll('.stream-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // すでにリンクをクリックした場合は通常の動作を許可
                if (e.target.tagName === 'A' || e.target.closest('a')) {
                    return;
                }
                
                const videoId = card.getAttribute('data-id');
                window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
            });
        });
    }

    // 定期的なチェックを設定
    let checkIntervalId = null;
    function setupPeriodicCheck() {
        // 既存のタイマーをクリア
        if (checkIntervalId) {
            clearInterval(checkIntervalId);
        }
        
        // 設定から間隔を取得（アプリ設定を優先）
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        let interval = 30; // デフォルト値
        
        // appSettingsから値を取得（最優先）
        if (settings && settings.general && settings.general.checkInterval) {
            interval = parseInt(settings.general.checkInterval, 10);
            console.log('appSettings から間隔を取得しました:', interval);
        } 
        // 下位互換性のためにlegacyの設定も確認
        else {
            const legacyInterval = localStorage.getItem('checkInterval');
            if (legacyInterval) {
                interval = parseInt(legacyInterval, 10);
                console.log('legacy設定から間隔を取得しました:', interval);
                
                // 古い設定を新しい形式に移行
                if (!settings.general) settings.general = {};
                settings.general.checkInterval = interval;
                localStorage.setItem('appSettings', JSON.stringify(settings));
                console.log('設定を新しい形式に移行しました');
            }
        }
        
        // 範囲チェック
        if (interval < 5) interval = 5;
        
        // 入力フィールドに反映
        const checkIntervalInput = document.getElementById('check-interval');
        if (checkIntervalInput) {
            checkIntervalInput.value = interval;
        }
        
        // 新しいタイマーを設定（分をミリ秒に変換）
        const intervalMs = interval * 60 * 1000;
        checkIntervalId = setInterval(checkAllChannels, intervalMs);
        
        console.log(`チェック間隔を${interval}分(${intervalMs}ms)に設定しました`);
    }

    // チェック間隔を更新する関数（外部から呼び出し可能）
    function updateCheckInterval(interval) {
        if (!interval || isNaN(interval)) {
            console.error('無効な間隔値です:', interval);
            return;
        }
        
        // 最小値を確保
        interval = Math.max(5, parseInt(interval, 10));
        
        console.log('チェック間隔を更新します:', interval);
        
        try {
            // appSettingsを更新
            const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            if (!settings.general) settings.general = {};
            settings.general.checkInterval = interval;
            localStorage.setItem('appSettings', JSON.stringify(settings));
            
            // 下位互換性のために古い設定も更新
            localStorage.setItem('checkInterval', interval.toString());
            
            // UI更新
            const checkIntervalInput = document.getElementById('check-interval');
            if (checkIntervalInput) {
                checkIntervalInput.value = interval;
            }
            
            // タイマー再設定
            setupPeriodicCheck();
            
            console.log(`チェック間隔が${interval}分に更新されました`);
        } catch (error) {
            console.error('チェック間隔の更新中にエラーが発生しました:', error);
        }
    }

    // チェック間隔の変更を監視
    checkIntervalInput.addEventListener('change', () => {
        const interval = parseInt(checkIntervalInput.value, 10);
        
        if (interval < 5) {
            alert('チェック間隔は5分以上で設定してください');
            checkIntervalInput.value = 5;
            return;
        }
        
        // appSettingsとlocalStorageの両方を更新
        updateCheckInterval(interval);
    });

    // 今すぐチェックボタンのイベントリスナー
    checkNowBtn.addEventListener('click', checkAllChannels);

    // 初期設定
    loadFromLocalStorage();
    setupPeriodicCheck();
    updateDateDisplay();
    generateTimelineHours();
    
    // 1分ごとに現在時刻インジケーターを更新
    setInterval(showCurrentTimeIndicator, 60000);
    showCurrentTimeIndicator();
    
    // アプリ起動時に自動チェックするかを設定から取得
    const autoCheck = getSettingValue('general.autoCheck', true);
    if (youtubeAPI.apiKey && autoCheck) {
        checkAllChannels();
    }
    
    // 設定値を取得する関数
    function getSettingValue(path, defaultValue) {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        const keys = path.split('.');
        let current = settings;
        
        for (const key of keys) {
            if (current && current[key] !== undefined) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    }
    
    // 外部からアクセスできるようにグローバルに公開
    window.checkChannel = checkChannel;
    window.removeChannel = removeChannel;
    window.updateCheckInterval = updateCheckInterval; // チェック間隔更新関数を公開
});
