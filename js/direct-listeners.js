/**
 * 直接的なイベントリスナーを設定するヘルパーファイル
 * 特定のボタンやUIコンポーネントにイベントリスナーを確実に登録します
 */

// DOMが完全に読み込まれた後に実行
document.addEventListener('DOMContentLoaded', () => {
    console.log('direct-listeners.js が読み込まれました');
    
    // 特定のボタンに直接イベントリスナーを設定
    setupDirectListeners();
    
    // 1秒後にもう一度リスナーを設定（遅延ロードされる要素のため）
    setTimeout(setupDirectListeners, 1000);
});

// ページの読み込み完了時にもリスナーを設定（画像などの読み込み後）
window.addEventListener('load', () => {
    console.log('ページが完全に読み込まれました - 直接リスナーを設定');
    setupDirectListeners();
});

// 直接的なリスナーをセットアップ
function setupDirectListeners() {
    // 設定保存ボタン
    setupButtonListener('save-settings', (e) => {
        console.log('設定保存ボタンがクリックされました (direct)');
        e.preventDefault();
        e.stopPropagation();
        
        try {
            // settings.js から関数を取得
            const getSettingsFunc = window.getSettingsFromForm || 
                                   (typeof getSettingsFromForm === 'function' ? getSettingsFromForm : null);
            const saveSettingsFunc = window.saveSettings || 
                                   (typeof saveSettings === 'function' ? saveSettings : null);
            const applySettingsFunc = window.applySettings || 
                                     (typeof applySettings === 'function' ? applySettings : null);
            
            if (getSettingsFunc && saveSettingsFunc && applySettingsFunc) {
                const settings = getSettingsFunc();
                saveSettingsFunc(settings);
                
                const modal = document.getElementById('settings-modal');
                if (modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
                
                applySettingsFunc();
                alert('設定が正常に保存されました');
            } else {
                throw new Error('必要な関数が見つかりません');
            }
        } catch (error) {
            console.error('設定保存エラー (direct):', error);
            alert('設定保存中にエラーが発生しました。リロードして再試行してください。');
        }
    });
    
    // テスト通知ボタン
    setupButtonListener('test-notification', (e) => {
        console.log('テスト通知ボタンがクリックされました (direct)');
        e.preventDefault();
        e.stopPropagation();
        
        // 通知テスト関数を呼び出し
        try {
            // NotificationManagerのインスタンスを取得または作成
            if (typeof notificationManager !== 'undefined') {
                notificationManager.testNotification();
            } else {
                new NotificationManager().testNotification();
            }
        } catch (error) {
            console.error('通知テストエラー:', error);
            alert('通知テストに失敗しました: ' + error.message);
        }
    });
    
    // Discordテスト通知ボタン
    setupButtonListener('test-discord-notification', (e) => {
        console.log('Discordテスト通知ボタンがクリックされました (direct)');
        e.preventDefault();
        e.stopPropagation();
        
        // Discord通知テスト関数を呼び出し
        try {
            if (typeof notificationManager !== 'undefined') {
                notificationManager.testDiscordNotification();
            } else {
                new NotificationManager().testDiscordNotification();
            }
        } catch (error) {
            console.error('Discord通知テストエラー:', error);
            alert('Discord通知テストに失敗しました: ' + error.message);
        }
    });
    
    // 設定タブ
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = tab.getAttribute('data-tab');
            console.log(`設定タブがクリックされました (direct): ${tabName}`);
            
            // アクティブなタブを変更
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
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

// ボタンに直接リスナーをセットアップする関数
function setupButtonListener(buttonId, callback) {
    const button = document.getElementById(buttonId);
    if (button) {
        // イベントリスナーを追加（既存のものが残っていても上書き）
        button.setAttribute('data-has-listener', 'true');
        
        // クリックしたときに視覚的なフィードバックを提供
        button.addEventListener('click', (e) => {
            // ボタンのスタイルを一時的に変更して押されたことを示す
            const originalBg = button.style.backgroundColor;
            const originalColor = button.style.color;
            
            button.style.backgroundColor = '#004d40';
            button.style.color = 'white';
            
            // 少し遅延してから元に戻す
            setTimeout(() => {
                button.style.backgroundColor = originalBg;
                button.style.color = originalColor;
            }, 200);
            
            // コールバック関数を実行
            callback(e);
        });
        
        console.log(`${buttonId} に直接リスナーを設定しました`);
    } else {
        console.warn(`${buttonId} が見つかりません`);
    }
}
