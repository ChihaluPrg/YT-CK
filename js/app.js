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

    // チャンネルのライブ配信と配信予定、配信終了をチェック
    async function checkChannel(channel) {
        if (!youtubeAPI.apiKey) {
            alert('YouTube API キーを設定してください');
            return;
        }
        
        try {
            // 前回のライブ配信IDを保存（終了検出用）
            const previousLiveIds = new Set(allStreams.live.map(stream => stream.id));
            console.log('前回のライブ配信数:', previousLiveIds.size);
            
            // ライブ配信をチェック
            const liveStreams = await youtubeAPI.fetchLiveStreams(channel.channelId);
            const filteredLiveStreams = youtubeAPI.filterStreamsByKeywords(liveStreams, channel.keywords);
            console.log('新しいライブ配信を取得:', filteredLiveStreams.length, '件');
            
            // 配信予定をチェック
            const upcomingStreams = await youtubeAPI.fetchUpcomingLivestreams(channel.channelId);
            const filteredUpcomingStreams = youtubeAPI.filterStreamsByKeywords(upcomingStreams, channel.keywords);
            
            // 過去の配信をチェック
            const completedStreams = await youtubeAPI.fetchCompletedLivestreams(channel.channelId);
            const filteredCompletedStreams = youtubeAPI.filterStreamsByKeywords(completedStreams, channel.keywords);
            
            // 現在のライブIDリスト
            const currentLiveIds = new Set(filteredLiveStreams.map(stream => stream.id));
            console.log('現在のライブ配信数:', currentLiveIds.size);
            
            // 終了した配信を検出（前回はライブだったが今回はライブリストにない）
            const endedStreamIds = [...previousLiveIds].filter(id => !currentLiveIds.has(id));
            
            if (endedStreamIds.length > 0) {
                console.log('終了した可能性のある配信を検出:', endedStreamIds.length, '件');
            }
            
            // 終了した配信の詳細を完了リストから探して、完了時間があるものだけを対象とする
            const endedStreams = filteredCompletedStreams.filter(stream => 
                endedStreamIds.includes(stream.id) && 
                stream.liveStreamingDetails && 
                stream.liveStreamingDetails.actualEndTime &&
                // 終了時間が現在から24時間以内のものだけを対象にする（古い配信の誤検出を防止）
                (Date.now() - new Date(stream.liveStreamingDetails.actualEndTime).getTime() < 24 * 60 * 60 * 1000)
            );
            
            if (endedStreams.length > 0) {
                console.log('通知対象の終了配信:', endedStreams.length, '件',
                           endedStreams.map(s => s.snippet.title));
            }
            
            // 全配信データを更新
            allStreams.live = [...allStreams.live.filter(s => currentLiveIds.has(s.id)), ...filteredLiveStreams];
            allStreams.upcoming = [...allStreams.upcoming, ...filteredUpcomingStreams];
            allStreams.completed = [...allStreams.completed, ...filteredCompletedStreams];
            
            // 重複を削除
            allStreams.live = removeDuplicateStreams(allStreams.live);
            allStreams.upcoming = removeDuplicateStreams(allStreams.upcoming);
            allStreams.completed = removeDuplicateStreams(allStreams.completed);
            
            // 新しい配信を通知
            notificationManager.notifyNewStreams(filteredLiveStreams, 'live');
            notificationManager.notifyNewStreams(filteredUpcomingStreams, 'upcoming');
            
            // 新しく終了した配信を通知
            if (endedStreams.length > 0) {
                notificationManager.notifyNewStreams(endedStreams, 'completed');
            }
            
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
            // 配信データのバックアップを作成（終了検出用）
            const previousLiveStreams = [...allStreams.live];
            
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

    // チェック間隔を保存
    checkIntervalInput.addEventListener('change', () => {
        const interval = parseInt(checkIntervalInput.value, 10);
        if (interval >= 5) {
            localStorage.setItem('checkInterval', interval);
            setupPeriodicCheck();
        } else {
            alert('チェック間隔は5分以上に設定してください');
            checkIntervalInput.value = 5;
        }
    });

    // 定期的なチェックを設定
    let checkIntervalId = null;
    function setupPeriodicCheck() {
        // 既存のタイマーをクリア
        if (checkIntervalId) {
            clearInterval(checkIntervalId);
        }
        
        const interval = parseInt(localStorage.getItem('checkInterval') || '30', 10);
        checkIntervalInput.value = interval;
        
        // 新しいタイマーを設定（分をミリ秒に変換）
        checkIntervalId = setInterval(checkAllChannels, interval * 60 * 1000);
    }

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
});
