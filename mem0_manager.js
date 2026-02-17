/**
 * Mem0 Memory Manager
 * Quản lý bộ nhớ dài hạn cho Discord Bot AI
 */

const { Memory } = require('mem0ai/oss');

// Khởi tạo Memory với cấu hình local
let memory = null;

/**
 * Khởi tạo Mem0 Memory
 * @returns {Memory} Memory instance
 */
function initMemory() {
    if (memory) return memory;

    try {
        // Cấu hình với OpenAI embeddings (nếu có key)
        const config = {
            version: "v1.1",
            vectorStore: {
                provider: "memory",
                config: {
                    collectionName: "discord_bot_memories",
                    dimension: 1536
                }
            },
            historyDbPath: "memory.db"
        };

        // Thêm OpenAI config nếu có key
        if (process.env.OPENAI_API_KEY) {
            config.embedder = {
                provider: "openai",
                config: {
                    apiKey: process.env.OPENAI_API_KEY,
                    model: "text-embedding-3-small"
                }
            };
            config.llm = {
                provider: "openai",
                config: {
                    apiKey: process.env.OPENAI_API_KEY,
                    model: "gpt-4o-mini"
                }
            };
            console.log('[Mem0] ✅ Initialized with OpenAI embeddings');
        } else {
            console.log('[Mem0] ⚠️ No OPENAI_API_KEY found, using default embeddings');
        }

        memory = new Memory(config);
        return memory;
    } catch (error) {
        console.error('[Mem0] ❌ Failed to initialize:', error.message);
        return null;
    }
}

/**
 * Thêm tin nhắn vào bộ nhớ
 * @param {Array} messages - Mảng tin nhắn [{role, content}]
 * @param {string} userId - Discord User ID
 * @param {object} metadata - Metadata bổ sung
 */
async function addMemory(messages, userId, metadata = {}) {
    const mem = initMemory();
    if (!mem) return null;

    try {
        const result = await mem.add(messages, {
            userId: userId,
            metadata: {
                source: 'discord_bot',
                timestamp: Date.now(),
                ...metadata
            }
        });
        console.log(`[Mem0] Added memory for user ${userId}`);
        return result;
    } catch (error) {
        console.error('[Mem0] Error adding memory:', error.message);
        return null;
    }
}

/**
 * Tìm kiếm bộ nhớ liên quan
 * @param {string} query - Câu hỏi/tin nhắn
 * @param {string} userId - Discord User ID
 * @param {number} limit - Số lượng kết quả tối đa
 */
async function searchMemory(query, userId, limit = 5) {
    const mem = initMemory();
    if (!mem) return [];

    try {
        const results = await mem.search(query, { userId: userId });
        // Lấy top N kết quả
        const memories = results.results || [];
        return memories.slice(0, limit);
    } catch (error) {
        console.error('[Mem0] Error searching memory:', error.message);
        return [];
    }
}

/**
 * Lấy tất cả bộ nhớ của user
 * @param {string} userId - Discord User ID
 */
async function getAllMemories(userId) {
    const mem = initMemory();
    if (!mem) return [];

    try {
        const results = await mem.getAll({ userId: userId });
        return results.results || [];
    } catch (error) {
        console.error('[Mem0] Error getting all memories:', error.message);
        return [];
    }
}

/**
 * Xóa tất cả bộ nhớ của user
 * @param {string} userId - Discord User ID
 */
async function deleteAllMemories(userId) {
    const mem = initMemory();
    if (!mem) return false;

    try {
        await mem.deleteAll({ userId: userId });
        console.log(`[Mem0] Deleted all memories for user ${userId}`);
        return true;
    } catch (error) {
        console.error('[Mem0] Error deleting memories:', error.message);
        return false;
    }
}

/**
 * Lấy context từ bộ nhớ để thêm vào prompt
 * @param {string} query - Tin nhắn hiện tại
 * @param {string} userId - Discord User ID
 * @returns {string} Context string
 */
async function getMemoryContext(query, userId) {
    const memories = await searchMemory(query, userId, 3);

    if (memories.length === 0) {
        return '';
    }

    const memoryText = memories.map(m => `- ${m.memory}`).join('\n');
    return `\n[Thông tin tôi nhớ về bạn từ các cuộc trò chuyện trước]:\n${memoryText}\n`;
}

module.exports = {
    initMemory,
    addMemory,
    searchMemory,
    getAllMemories,
    deleteAllMemories,
    getMemoryContext
};
