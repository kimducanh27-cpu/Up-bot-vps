/**
 * Fake Player Bot - Tự động join server để test
 * Dùng bedrock-protocol để tạo bot client
 */

const bedrock = require('bedrock-protocol');

// ============== CẤU HÌNH ==============
const CONFIG = {
    // Server info
    host: 'tornado.pikamc.vn',      // Địa chỉ server
    port: 25115,            // Port (mặc định 19132)

    // Bot info
    username: 'TestBot',    // Tên bot
    offline: true,          // true = không cần Xbox Live

    // Behavior
    autoReconnect: true,    // Tự động kết nối lại khi mất kết nối
    reconnectDelay: 5000,   // Delay 5 giây trước khi reconnect
};

let client = null;
let isConnected = false;

// ============== MAIN ==============
function connectBot() {
    console.log(`[FakePlayer] 🤖 Đang kết nối tới ${CONFIG.host}:${CONFIG.port}...`);

    client = bedrock.createClient({
        host: CONFIG.host,
        port: CONFIG.port,
        username: CONFIG.username,
        offline: CONFIG.offline,
        skipPing: true,
    });

    // Khi spawn vào world
    client.on('spawn', () => {
        isConnected = true;
        console.log(`[FakePlayer] ✅ Bot "${CONFIG.username}" đã join server!`);
        console.log(`[FakePlayer] 📍 Bot sẽ đứng yên tại spawn`);

        // Gửi chat hello
        setTimeout(() => {
            // client.queue('text', {
            //     type: 'chat',
            //     needs_translation: false,
            //     source_name: CONFIG.username,
            //     xuid: '',
            //     platform_chat_id: '',
            //     message: 'Xin chào! Tôi là bot test 🤖',
            // });
        }, 2000);
    });

    // Nhận chat
    client.on('text', (packet) => {
        if (packet.type === 'chat' && packet.source_name !== CONFIG.username) {
            console.log(`[FakePlayer] 💬 ${packet.source_name}: ${packet.message}`);
        }
    });

    // Khi bị disconnect
    client.on('close', () => {
        isConnected = false;
        console.log(`[FakePlayer] ❌ Bot đã ngắt kết nối`);

        if (CONFIG.autoReconnect) {
            console.log(`[FakePlayer] 🔄 Sẽ kết nối lại sau ${CONFIG.reconnectDelay / 1000}s...`);
            setTimeout(connectBot, CONFIG.reconnectDelay);
        }
    });

    // Xử lý lỗi
    client.on('error', (err) => {
        console.error(`[FakePlayer] ⚠️ Lỗi:`, err.message);
    });

    // Heartbeat - giữ kết nối
    client.on('tick', () => {
        // Bot vẫn sống
    });
}

// ============== START ==============
console.log('╔══════════════════════════════════════════╗');
console.log('║       FAKE PLAYER BOT v1.0               ║');
console.log('║       Bot ảo để test server              ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');

connectBot();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[FakePlayer] 👋 Đang ngắt kết nối...');
    if (client) {
        client.close();
    }
    process.exit(0);
});
