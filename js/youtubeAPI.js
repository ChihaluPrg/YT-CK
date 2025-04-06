class YouTubeAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://www.googleapis.com/youtube/v3/';
        this.retryCount = 3; // リトライ回数
        this.retryDelay = 1000; // リトライ間の遅延（ミリ秒）
        this.timeout = 10000; // タイムアウト（10秒）
    }

    setApiKey(key) {
        this.apiKey = key;
    }

    // 改良されたフェッチ関数（タイムアウトとリトライ機能付き）
    async fetchWithRetry(url, options = {}, retries = this.retryCount) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(id);
            
            if (!response.ok) {
                const errorBody = await response.text();
                let errorMessage;
                
                try {
                    const errorJson = JSON.parse(errorBody);
                    errorMessage = errorJson.error ? 
                        `${errorJson.error.code} ${errorJson.error.message}` : 
                        `ステータスコード: ${response.status}`;
                } catch (e) {
                    errorMessage = `ステータスコード: ${response.status}, 詳細: ${errorBody}`;
                }
                
                throw new Error(`YouTube API エラー: ${errorMessage}`);
            }
            
            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('リクエストがタイムアウトしました。ネットワーク接続を確認してください。');
            }
            
            if (retries > 0) {
                console.warn(`リクエスト失敗、リトライします (残り${retries}回): ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.fetchWithRetry(url, options, retries - 1);
            }
            
            if (error.message.includes('429')) {
                throw new Error('YouTube APIのクォータを超過しました。しばらく時間をおいてから再試行してください。');
            }
            
            throw error;
        }
    }

    async fetchUpcomingLivestreams(channelId) {
        try {
            // チャンネルのアップロード用プレイリストIDを取得
            const channelResponse = await this.fetchWithRetry(
                `${this.baseUrl}channels?part=contentDetails&id=${channelId}&key=${this.apiKey}`
            );
            const channelData = await channelResponse.json();
            
            if (!channelData.items || channelData.items.length === 0) {
                throw new Error(`チャンネルID "${channelId}" が見つかりません。IDが正しいか確認してください。`);
            }

            const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

            // 最近のアップロードを取得
            const playlistResponse = await this.fetchWithRetry(
                `${this.baseUrl}playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${this.apiKey}`
            );
            const playlistData = await playlistResponse.json();

            if (!playlistData.items) {
                return [];
            }

            // 取得したビデオIDのリスト
            const videoIds = playlistData.items.map(item => item.contentDetails.videoId).join(',');
            if (!videoIds) {
                return [];
            }

            // ビデオの詳細を取得（ライブステータスを含む）
            const videosResponse = await this.fetchWithRetry(
                `${this.baseUrl}videos?part=snippet,liveStreamingDetails&id=${videoIds}&key=${this.apiKey}`
            );
            const videosData = await videosResponse.json();

            // 配信予定のビデオのみフィルタリング
            const upcomingLivestreams = videosData.items.filter(video => 
                video.snippet && 
                video.liveStreamingDetails && 
                video.liveStreamingDetails.scheduledStartTime &&
                !video.liveStreamingDetails.actualEndTime
            );

            return upcomingLivestreams;
        } catch (error) {
            console.error('予定配信の取得エラー:', error);
            const errorMessage = error.message.includes('YouTube API') ? 
                error.message : 
                `予定配信の取得に失敗しました: ${error.message}`;
            throw new Error(errorMessage);
        }
    }

    async fetchCompletedLivestreams(channelId) {
        try {
            // チャンネルのアップロード用プレイリストIDを取得
            const channelResponse = await this.fetchWithRetry(
                `${this.baseUrl}channels?part=contentDetails&id=${channelId}&key=${this.apiKey}`
            );
            const channelData = await channelResponse.json();
            
            if (!channelData.items || channelData.items.length === 0) {
                throw new Error(`チャンネルID "${channelId}" が見つかりません。IDが正しいか確認してください。`);
            }

            const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

            // より多くの動画を取得（最大50件）
            const playlistResponse = await this.fetchWithRetry(
                `${this.baseUrl}playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${this.apiKey}`
            );
            const playlistData = await playlistResponse.json();

            if (!playlistData.items || playlistData.items.length === 0) {
                return [];
            }

            // 取得したビデオIDのリスト
            const videoIds = playlistData.items.map(item => item.contentDetails.videoId).join(',');

            if (!videoIds) {
                return [];
            }

            // ビデオの詳細を取得
            const videosResponse = await this.fetchWithRetry(
                `${this.baseUrl}videos?part=snippet,liveStreamingDetails,contentDetails&id=${videoIds}&key=${this.apiKey}`
            );
            const videosData = await videosResponse.json();

            // 完了したライブのみをフィルタリング（より正確な条件）
            const completedLivestreams = videosData.items.filter(video => 
                video.snippet && 
                video.liveStreamingDetails && 
                video.liveStreamingDetails.actualEndTime &&  // 終了時間がある
                (!video.liveStreamingDetails.actualStartTime || // 未開始でないことを確認
                 new Date(video.liveStreamingDetails.actualEndTime) > new Date(video.liveStreamingDetails.actualStartTime))
            );

            return completedLivestreams;
        } catch (error) {
            console.error('過去の配信の取得エラー:', error);
            const errorMessage = error.message.includes('YouTube API') ? 
                error.message : 
                `過去の配信の取得に失敗しました: ${error.message}`;
            throw new Error(errorMessage);
        }
    }

    async fetchLiveStreams(channelId) {
        try {
            // チャンネルの現在のライブストリームを取得
            const searchResponse = await this.fetchWithRetry(
                `${this.baseUrl}search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${this.apiKey}`
            );
            const searchData = await searchResponse.json();

            if (!searchData.items) {
                return [];
            }

            // ビデオIDのリスト
            const videoIds = searchData.items.map(item => item.id.videoId).join(',');

            if (!videoIds) {
                return [];
            }

            // ビデオの詳細情報を取得
            const videosResponse = await this.fetchWithRetry(
                `${this.baseUrl}videos?part=snippet,liveStreamingDetails&id=${videoIds}&key=${this.apiKey}`
            );
            const videosData = await videosResponse.json();

            return videosData.items || [];
        } catch (error) {
            console.error('ライブ配信の取得エラー:', error);
            const errorMessage = error.message.includes('YouTube API') ? 
                error.message : 
                `ライブ配信の取得に失敗しました: ${error.message}`;
            throw new Error(errorMessage);
        }
    }

    filterStreamsByKeywords(streams, keywords) {
        if (!keywords || keywords.length === 0) {
            return streams;
        }

        const keywordArray = keywords.split(',').map(keyword => keyword.trim().toLowerCase());
        
        return streams.filter(stream => {
            const title = stream.snippet.title.toLowerCase();
            const description = stream.snippet.description.toLowerCase();
            
            return keywordArray.some(keyword => 
                title.includes(keyword) || description.includes(keyword)
            );
        });
    }
}
