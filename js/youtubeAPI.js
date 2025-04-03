class YouTubeAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://www.googleapis.com/youtube/v3/';
    }

    setApiKey(key) {
        this.apiKey = key;
    }

    async fetchUpcomingLivestreams(channelId) {
        try {
            // チャンネルのアップロード用プレイリストIDを取得
            const channelResponse = await fetch(
                `${this.baseUrl}channels?part=contentDetails&id=${channelId}&key=${this.apiKey}`
            );
            const channelData = await channelResponse.json();
            
            if (!channelData.items || channelData.items.length === 0) {
                throw new Error('チャンネルが見つかりません');
            }

            const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

            // 最近のアップロードを取得
            const playlistResponse = await fetch(
                `${this.baseUrl}playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${this.apiKey}`
            );
            const playlistData = await playlistResponse.json();

            if (!playlistData.items) {
                return [];
            }

            // 取得したビデオIDのリスト
            const videoIds = playlistData.items.map(item => item.contentDetails.videoId).join(',');

            // ビデオの詳細を取得（ライブステータスを含む）
            const videosResponse = await fetch(
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
            console.error('Error fetching upcoming livestreams:', error);
            throw error;
        }
    }

    async fetchCompletedLivestreams(channelId) {
        try {
            // チャンネルのアップロード用プレイリストIDを取得
            const channelResponse = await fetch(
                `${this.baseUrl}channels?part=contentDetails&id=${channelId}&key=${this.apiKey}`
            );
            const channelData = await channelResponse.json();
            
            if (!channelData.items || channelData.items.length === 0) {
                throw new Error('チャンネルが見つかりません');
            }

            const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

            // 最近のアップロードを取得（より多くを取得するため最大値を設定）
            const playlistResponse = await fetch(
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

            // ビデオの詳細を取得
            const videosResponse = await fetch(
                `${this.baseUrl}videos?part=snippet,liveStreamingDetails,contentDetails&id=${videoIds}&key=${this.apiKey}`
            );
            const videosData = await videosResponse.json();

            // 一ヶ月前の日時を計算
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            // 完了したライブストリームのみをフィルタリング
            const completedLivestreams = videosData.items.filter(video => 
                video.snippet && 
                video.liveStreamingDetails && 
                video.liveStreamingDetails.actualEndTime &&
                new Date(video.snippet.publishedAt) >= oneMonthAgo
            );

            return completedLivestreams;
        } catch (error) {
            console.error('Error fetching completed livestreams:', error);
            throw error;
        }
    }

    async fetchLiveStreams(channelId) {
        try {
            // チャンネルの現在のライブストリームを取得
            const searchResponse = await fetch(
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
            const videosResponse = await fetch(
                `${this.baseUrl}videos?part=snippet,liveStreamingDetails&id=${videoIds}&key=${this.apiKey}`
            );
            const videosData = await videosResponse.json();

            return videosData.items || [];
        } catch (error) {
            console.error('Error fetching live streams:', error);
            throw error;
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
