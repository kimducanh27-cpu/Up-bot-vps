# 📦 LƯU TRỮ DỰ ÁN - Discord Minecraft Bot

> **Cập nhật lần cuối:** 2025-12-12 08:15 (GMT+7)

---

## 📁 Cấu Trúc Thư Mục

```
c:\Users\BotMinecraft\
├── index.js                 # Bot chính (3373 lines)
├── mem0_manager.js          # [NEW] Mem0 memory manager
├── ai_config.js             # Cấu hình AI system instruction
├── ai_prompts.js            # 500+ AI prompts & scenarios
├── sftp_upload.js           # Upload addon lên server
├── test_http.js             # Test HTTP endpoint
├── start.bat                # Launcher với UI đẹp
├── package.json
├── memory.db                # [NEW] Mem0 SQLite database
├── player_addon/
│   ├── manifest.json        # API version 2.4.0-beta
│   └── scripts/
│       └── main.js          # Scripting API addon (662 lines)
├── player_stats_web/
│   └── index.html           # Web dashboard
└── items_1.21.8/            # Item images for inventory
```

---

## 🔧 Logic Cốt Lõi

### 1. `index.js` - Bot Chính
```javascript
// AI Chat Handler (line ~2507-2700)
// - Inject Mem0 memory context trước khi gọi AI
// - Lưu conversation vào Mem0 sau khi nhận response
// - Session timeout 30 phút (sliding window)

// Addon HTTP Server (line ~1505-1755)
// - POST /player-update: Nhận data từ Minecraft addon
// - GET /get-messages: Trả về queue tin nhắn Discord -> Minecraft
// - Listen on 0.0.0.0:8080 (for ngrok)
```

### 2. `mem0_manager.js` - Memory Layer
```javascript
// Mem0 OSS với OpenAI embeddings
const { Memory } = require('mem0ai/oss');

// Key functions:
// - getMemoryContext(query, userId) -> string
// - addMemory(messages, userId) -> void
// - searchMemory(query, userId, limit) -> array
// - deleteAllMemories(userId) -> bool
```

### 3. `player_addon/scripts/main.js` - Minecraft Addon
```javascript
// API version: @minecraft/server 2.4.0-beta
// Key features:
// - sendPlayerUpdate(): Player list + stats
// - sendChatToDiscord(): Game -> Discord chat
// - pollDiscordMessages(): Discord -> Game chat
// - Tracking: blocks broken/placed, mobs killed, distance
```

---

## 📏 Quy Tắc Code

1. **Syntax check bắt buộc** trước khi commit
2. **SFTP auto-upload** cho addon files
3. **Console logging** có prefix `[Module]` để debug
4. **Try-catch** cho tất cả async operations
5. **Vietnamese comments** cho code quan trọng

---

## ✅ Công Việc Đã Hoàn Thành

- [x] **2-Way Chat Sync** (Game ⇔ Discord)
- [x] **Mem0 Memory Layer** - AI nhớ lịch sử hội thoại
- [x] **Player Stats Embed** - Hiển thị thông tin player
- [x] **In-Chat Games** - Tic-Tac-Toe với AI
- [x] **Video Download** - YouTube/TikTok/Facebook

---

## 📋 Công Việc Tiếp Theo

- [ ] Test Mem0 memory persistence thực tế
- [ ] Thêm lệnh `!forget` để xóa memory
- [ ] Cải thiện UI walkthrough với screenshots

---

## 🔑 Environment Variables

```env
# Required
DISCORD_TOKEN=...
GEMINI_API_KEY=...

# Optional (for better Mem0)
OPENAI_API_KEY=...
```

---

## 🚀 Cách Chạy

```bash
# Chạy bot
npm start
# hoặc
node index.js

# Upload addon
node sftp_upload.js
```
