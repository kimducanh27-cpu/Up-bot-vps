/**
 * Discord Bot Player Sync Addon
 * Gửi danh sách người chơi realtime đến Discord Bot
 * 
 * CẤU HÌNH: Thay đổi BOT_URL bên dưới để trỏ đến bot của bạn
 */

import { world, system } from "@minecraft/server";
import { http, HttpRequest, HttpRequestMethod, HttpHeader } from "@minecraft/server-net";

// ==================== CẤU HÌNH ====================

const SECRET_KEY = "minecraft-discord-sync-2024";
const BOT_URL = "http://stardust.pikamc.vn:25328/player-update";
const CHAT_URL = "http://stardust.pikamc.vn:25328/chat";
const UPDATE_INTERVAL_TICKS = 100; // 5 giây (20 ticks = 1 giây)
// ==================== HỆ THỐNG ====================
let lastPlayerList = [];
const worldStartTime = Date.now();
let tps = 20;
let tickCount = 0;
const pendingTerrainScans = new Set(); // Players needing terrain scan (lowercase names)

// Thống kê người chơi
const playerStats = new Map();
const playerHealthState = new Map(); // Track previous health for low health detection

function getPlayerStats(playerName) {
    if (!playerStats.has(playerName)) {
        playerStats.set(playerName, {
            blocksBroken: 0,
            blocksPlaced: 0,
            mobsKilled: 0,
            blocksBrokenDetails: {},
            blocksPlacedDetails: {},
            mobsKilledDetails: {},
            // New stats
            distanceTraveled: 0,      // meters
            jumpCount: 0,
            playTimeSeconds: 0,
            lastPosition: null        // for distance calculation
        });
    }
    return playerStats.get(playerName);
}

// Track distance traveled
system.runInterval(() => {
    for (const player of world.getPlayers()) {
        try {
            const stats = getPlayerStats(player.name);
            const pos = player.location;

            if (stats.lastPosition) {
                const dx = pos.x - stats.lastPosition.x;
                const dy = pos.y - stats.lastPosition.y;
                const dz = pos.z - stats.lastPosition.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (distance < 50) { // Ignore teleports
                    stats.distanceTraveled += distance;
                }
            }
            stats.lastPosition = { x: pos.x, y: pos.y, z: pos.z };
            stats.playTimeSeconds += 1;
        } catch { }
    }
}, 20); // Every 1 second

// Tính TPS mỗi giây
system.runInterval(() => {
    tickCount++;
}, 1);

system.runInterval(() => {
    const BOT_URL = "http://stardust.pikamc.vn:25328/player-update";
    tps = tickCount;
    tickCount = 0;
}, 20);

/**
 * Lấy thú cưng của player (chó, mèo, ngựa đã thuần hóa gần đó)
 */
function getPlayerPets(player) {
    const pets = [];
    try {
        const dim = player.dimension;
        const pos = player.location;

        // Query tamed entities near player
        const tamedTypes = ["minecraft:wolf", "minecraft:cat", "minecraft:horse", "minecraft:donkey", "minecraft:mule", "minecraft:parrot", "minecraft:llama"];

        for (const entityType of tamedTypes) {
            try {
                const entities = dim.getEntities({
                    location: pos,
                    maxDistance: 50,
                    type: entityType
                });

                for (const entity of entities) {
                    // Check if tamed and belongs to this player
                    const isTamed = entity.getComponent("is_tamed")?.value ?? false;
                    if (isTamed) {
                        const health = entity.getComponent("health");
                        pets.push({
                            type: entityType.replace("minecraft:", ""),
                            name: entity.nameTag || entityType.replace("minecraft:", "").replace("_", " "),
                            health: Math.round(health?.currentValue || 0),
                            maxHealth: Math.round(health?.effectiveMax || 20),
                            position: {
                                x: Math.round(entity.location.x),
                                y: Math.round(entity.location.y),
                                z: Math.round(entity.location.z)
                            }
                        });
                    }
                }
            } catch { }
        }
    } catch (e) {
        console.warn("[PlayerSync] Error getting pets:", e);
    }
    return pets;
}

/**
 * Lấy thông tin biome, thời gian, thời tiết
 */
function getWorldInfo(player) {
    try {
        const dim = player.dimension;
        const time = world.getTimeOfDay();
        const pos = player.location;

        // Time of day: 0-24000 ticks
        // 0-12000 = day, 12000-24000 = night
        let timeOfDay = "day";
        let timeDisplay = "Ngày";
        if (time >= 12000 && time < 13000) { timeOfDay = "sunset"; timeDisplay = "Hoàng hôn"; }
        else if (time >= 13000 && time < 23000) { timeOfDay = "night"; timeDisplay = "Đêm"; }
        else if (time >= 23000) { timeOfDay = "sunrise"; timeDisplay = "Bình minh"; }

        // Weather detection
        let weather = "clear";
        try {
            // Check if it's raining/thundering in the dimension
            if (world.gameRules && world.gameRules.doWeatherCycle !== false) {
                // Try to detect weather from rain level or other methods
                const rainLevel = dim.getWeather ? dim.getWeather() : null;
                if (rainLevel === "thunder") weather = "thunder";
                else if (rainLevel === "rain") weather = "rain";
            }
        } catch { }

        // Get biome at player location (Bedrock API may not support this directly)
        let biome = "unknown";
        let structure = "";
        try {
            // Try to get block info which might hint at biome
            const block = dim.getBlock({ x: Math.floor(pos.x), y: Math.floor(pos.y) - 1, z: Math.floor(pos.z) });
            const blockType = block?.typeId?.replace("minecraft:", "") || "";

            // Infer biome from surface block
            if (blockType.includes("sand") && !blockType.includes("soul")) biome = "desert";
            else if (blockType.includes("terracotta")) biome = "badlands";
            else if (blockType.includes("mycelium")) biome = "mushroom_island";
            else if (blockType.includes("podzol")) biome = "taiga";
            else if (blockType.includes("snow")) biome = "snowy_plains";
            else if (blockType.includes("sculk")) { biome = "deep_dark"; structure = "Ancient City"; }
            else if (blockType.includes("end_stone")) biome = "the_end";
            else if (blockType.includes("netherrack") || blockType.includes("soul_sand")) biome = "nether";
            else if (pos.y < 0) biome = "deep_cave";
            else if (pos.y < 40) biome = "cave";
            else biome = "overworld";

            // Detect structures
            if (pos.y < -30) structure = "Deep Cave";
            else if (pos.y > 200) structure = "Sky";
        } catch { }

        return {
            timeOfDay: timeOfDay,
            timeDisplay: timeDisplay,
            timeTicks: time,
            dimension: dim.id.replace("minecraft:", ""),
            weather: weather,
            biome: biome,
            structure: structure
        };
    } catch {
        return { timeOfDay: "day", timeTicks: 0, dimension: "unknown", weather: "clear", biome: "unknown", structure: "" };
    }
}

/**
 * Quét terrain xung quanh player để tạo mini-map
 * Scan 64x64 block area (mỗi pixel = 1 block)
 */
function scanEntities(player, mapSize) {
    const entities = [];
    try {
        const dim = player.dimension;
        const pos = player.location;
        const halfSize = mapSize / 2;

        const foundEntities = dim.getEntities({
            location: pos,
            maxDistance: halfSize,
        });

        for (const entity of foundEntities) {
            if (entity.typeId === "minecraft:player") continue; // Skip players (handled separately)
            if (entity.typeId === "minecraft:item") continue; // Skip dropped items

            entities.push({
                type: entity.typeId.replace("minecraft:", ""),
                x: Math.round(entity.location.x),
                y: Math.round(entity.location.y),
                z: Math.round(entity.location.z),
                color: getEntityColor(entity.typeId)
            });
        }
    } catch (e) {
        console.warn("[PlayerSync] Error scanning entities:", e);
    }
    return entities;
}

function getEntityColor(typeId) {
    if (typeId.includes("cow")) return "#443626";
    if (typeId.includes("pig")) return "#F0A5A2";
    if (typeId.includes("sheep")) return "#FFFFFF";
    if (typeId.includes("chicken")) return "#D1B1CB";
    if (typeId.includes("zombie")) return "#00AF00";
    if (typeId.includes("skeleton")) return "#BCBCBC";
    if (typeId.includes("creeper")) return "#0DA702";
    if (typeId.includes("spider")) return "#303030";
    if (typeId.includes("villager")) return "#BD8B72";
    return "#FF0000"; // Default red for unknown
}

function scanTerrain(player) {
    const MAP_SIZE = 64; // 64x64 map
    const terrain = [];
    let entities = [];

    try {
        const dim = player.dimension;
        const pos = player.location;
        const startX = Math.floor(pos.x) - Math.floor(MAP_SIZE / 2);
        const startZ = Math.floor(pos.z) - Math.floor(MAP_SIZE / 2);

        // Scan entities
        entities = scanEntities(player, MAP_SIZE);

        for (let z = 0; z < MAP_SIZE; z++) {
            const row = [];
            for (let x = 0; x < MAP_SIZE; x++) {
                const worldX = startX + x;
                const worldZ = startZ + z;

                // Find surface block
                let blockData = { id: "air", y: -64 };
                // Scan range: PlayerY + 30 down to PlayerY - 64
                const startY = Math.floor(pos.y) + 30;
                const endY = Math.floor(pos.y) - 64;

                for (let y = startY; y > endY; y--) {
                    try {
                        const block = dim.getBlock({ x: worldX, y: y, z: worldZ });
                        if (block && block.typeId && block.typeId !== "minecraft:air" && !block.typeId.includes("void")) {
                            blockData = {
                                id: block.typeId.replace("minecraft:", ""),
                                y: y
                            };
                            break;
                        }
                    } catch { }
                }

                row.push(blockData);
            }
            terrain.push(row);
        }

        return {
            size: MAP_SIZE,
            data: terrain,
            entities: entities, // Return scanned entities
            playerPos: { x: Math.floor(MAP_SIZE / 2), z: Math.floor(MAP_SIZE / 2) },
            playerY: Math.floor(pos.y)
        };
    } catch (e) {
        console.warn("[PlayerSync] Error scanning terrain:", e);
        return { size: 64, data: [], entities: [], playerPos: { x: 32, z: 32 } };
    }
}

/**
 * Lấy danh sách tất cả người chơi đang online
 */
function getPlayerList() {
    const players = [];
    try {
        for (const player of world.getAllPlayers()) {
            const pos = player.location;
            const dim = player.dimension.id.replace("minecraft:", "");
            const stats = getPlayerStats(player.name);
            const worldInfo = getWorldInfo(player);
            const pets = getPlayerPets(player);

            players.push({
                name: player.name,
                nameTag: player.nameTag || player.name,
                position: {
                    x: Math.round(pos.x),
                    y: Math.round(pos.y),
                    z: Math.round(pos.z)
                },
                dimension: dim,
                level: player.level || 0,
                health: Math.round(player.getComponent("health")?.currentValue || 20),
                gameMode: getGameMode(player),
                inventory: getPlayerInventory(player),
                stats: stats,
                pets: pets,
                worldInfo: worldInfo,
                // Terrain only included when requested (on-demand)
                terrain: pendingTerrainScans.has(player.name.toLowerCase()) ? scanTerrain(player) : null
            });
            // Clear terrain request after scanning
            pendingTerrainScans.delete(player.name.toLowerCase());

            // -----------------------------
        }
    } catch (e) {
        console.warn("[PlayerSync] Error getting players:", e);
    }
    return players;
}

/**
 * Lấy game mode của player
 */
function getGameMode(player) {
    try {
        const modes = ["survival", "creative", "adventure", "spectator"];
        for (const mode of modes) {
            if (player.matches({ gameMode: mode })) return mode;
        }
    } catch { }
    return "unknown";
}

/**
 * Lấy inventory của player
 */
function getPlayerInventory(player) {
    try {
        const container = player.getComponent("inventory")?.container;
        if (!container) return [];

        const items = [];
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (item) {
                items.push({
                    slot: i,
                    name: item.typeId.replace("minecraft:", ""),
                    amount: item.amount,
                    // Enchantments nếu có
                    enchantments: getItemEnchantments(item)
                });
            }
        }
        return items;
    } catch (e) {
        console.warn("[PlayerSync] Error getting inventory:", e);
        return [];
    }
}

/**
 * Lấy enchantments của item
 */
function getItemEnchantments(item) {
    try {
        const enchComp = item.getComponent("enchantable");
        if (!enchComp) return [];

        const enchants = [];
        for (const ench of enchComp.getEnchantments()) {
            enchants.push({
                type: ench.type.id,
                level: ench.level
            });
        }
        return enchants;
    } catch {
        return [];
    }
}

/**
 * Gửi dữ liệu đến Discord Bot
 */
async function sendPlayerUpdate() {
    const players = getPlayerList();
    const sendTime = Date.now();

    // Chỉ gửi nếu có thay đổi hoặc theo interval
    const payload = JSON.stringify({
        type: "player_update",
        secret: SECRET_KEY,
        serverTime: sendTime,
        playerCount: players.length,
        players: players,
        // Thông tin hiệu năng server
        performance: {
            tps: tps,
            requestStartTime: sendTime // Để tính ping
        }
    });

    try {
        const request = new HttpRequest(BOT_URL);
        request.method = HttpRequestMethod.Post;
        request.body = payload;
        request.headers = [
            new HttpHeader("Content-Type", "application/json"),
            new HttpHeader("X-Addon-Secret", SECRET_KEY)
        ];
        request.timeout = 5; // 5 giây timeout

        const response = await http.request(request);

        if (response.status === 200) {
            const data = JSON.parse(response.body);
            if (data.commands && data.commands.length > 0) {
                for (const cmd of data.commands) {
                    if (cmd.type === 'chat') {
                        // Show Discord chat in game
                        const chatText = `§9[Discord] §f${cmd.sender}: §7${cmd.message}`;
                        world.sendMessage(chatText);
                    } else if (cmd.type === 'command') {
                        // Execute command securely? (Be careful)
                    }
                }
            }
        } else {
            console.warn("[PlayerSync] HTTP Error:", response.status);
        }
    } catch (e) {
        // Không log lỗi liên tục để tránh spam console
        // console.warn("[PlayerSync] Connection error:", e.message || e);
    }

    lastPlayerList = players;
}

/**
 * Gửi thông báo khi có player join/leave
 */
function sendPlayerEvent(eventType, playerName, extraData = {}, skipPlayerList = false) {
    const payload = JSON.stringify({
        type: "player_event",
        secret: SECRET_KEY,
        event: eventType,
        playerName: playerName,
        serverTime: Date.now(),
        currentPlayers: skipPlayerList ? [] : getPlayerList(),
        data: extraData
    });

    try {
        const request = new HttpRequest(BOT_URL);
        request.method = HttpRequestMethod.Post;
        request.body = payload;
        request.headers = [
            new HttpHeader("Content-Type", "application/json"),
            new HttpHeader("X-Addon-Secret", SECRET_KEY)
        ];
        request.timeout = 5;

        http.request(request).catch(() => { });
    } catch { }
}

// ==================== EVENT HANDLERS ====================

// Player Join
world.afterEvents.playerSpawn.subscribe((event) => {
    if (event.initialSpawn) {
        console.log(`[PlayerSync] Player joined: ${event.player.name}`);
        // Delay một chút để đảm bảo player đã load hoàn toàn
        system.runTimeout(() => {
            sendPlayerEvent("join", event.player.name);
        }, 20); // 1 giây
    }
});

// Player Leave
world.afterEvents.playerLeave.subscribe((event) => {
    console.log(`[PlayerSync] Player left: ${event.playerName}`);
    sendPlayerEvent("leave", event.playerName);
});

// Block Break - theo dõi block đã đào
try {
    if (world.afterEvents.playerBreakBlock) {
        world.afterEvents.playerBreakBlock.subscribe((event) => {
            const stats = getPlayerStats(event.player.name);
            stats.blocksBroken++;
            // Lưu chi tiết loại block
            const blockType = event.brokenBlockPermutation?.type?.id?.replace("minecraft:", "") || "unknown";
            stats.blocksBrokenDetails[blockType] = (stats.blocksBrokenDetails[blockType] || 0) + 1;
        });
        console.log("[PlayerSync] ✅ Block break tracking enabled (with details)");
    }
} catch (e) {
    console.warn("[PlayerSync] Block break tracking not available");
}

// Block Place - theo dõi block đã đặt
try {
    if (world.afterEvents.playerPlaceBlock) {
        world.afterEvents.playerPlaceBlock.subscribe((event) => {
            const stats = getPlayerStats(event.player.name);
            stats.blocksPlaced++;
            // Lưu chi tiết loại block
            const blockType = event.block?.typeId?.replace("minecraft:", "") || "unknown";
            stats.blocksPlacedDetails[blockType] = (stats.blocksPlacedDetails[blockType] || 0) + 1;
        });
        console.log("[PlayerSync] ✅ Block place tracking enabled (with details)");
    }
} catch (e) {
    console.warn("[PlayerSync] Block place tracking not available");
}

// Entity Kill - theo dõi mob đã giết
try {
    if (world.afterEvents.entityDie) {
        world.afterEvents.entityDie.subscribe((event) => {
            // 1. Player Killed Mob check
            if (event.damageSource && event.damageSource.damagingEntity) {
                const killer = event.damageSource.damagingEntity;
                if (killer.typeId === "minecraft:player") {
                    const stats = getPlayerStats(killer.name);
                    stats.mobsKilled++;
                    // Lưu chi tiết loại mob
                    const mobType = event.deadEntity?.typeId?.replace("minecraft:", "") || "unknown";
                    stats.mobsKilledDetails[mobType] = (stats.mobsKilledDetails[mobType] || 0) + 1;
                }
            }

            // 2. Player Died check
            if (event.deadEntity.typeId === "minecraft:player") {
                const player = event.deadEntity;
                const cause = event.damageSource.cause;
                const killer = event.damageSource.damagingEntity ? event.damageSource.damagingEntity.typeId.replace("minecraft:", "") : null;

                console.log(`[PlayerSync] Player died: ${player.name} (Cause: ${cause})`);

                sendPlayerEvent("death", player.name, {
                    cause: cause,
                    killer: killer,
                    position: {
                        x: Math.round(player.location.x),
                        y: Math.round(player.location.y),
                        z: Math.round(player.location.z)
                    }
                });
            }
        });
        console.log("[PlayerSync] ✅ Mob kill tracking enabled (with details)");
    }
} catch (e) {
    console.warn("[PlayerSync] Mob kill tracking not available");
}

// Chat message - Gửi chat đến Discord
try {
    let chatSubscribed = false;

    // Try afterEvents.chatSend
    if (world.afterEvents && world.afterEvents.chatSend) {
        world.afterEvents.chatSend.subscribe((event) => {
            const msg = event.message;
            const playerName = event.sender.name;
            if (msg.startsWith("/")) return;
            console.log(`[PlayerSync] Chat detected: <${playerName}> ${msg}`);
            sendChatToDiscord(playerName, msg);
        });
        console.log("[PlayerSync] ✅ Auto chat sync enabled (afterEvents.chatSend)");
        chatSubscribed = true;
    }

    // Try beforeEvents.chatSend
    if (!chatSubscribed && world.beforeEvents && world.beforeEvents.chatSend) {
        world.beforeEvents.chatSend.subscribe((event) => {
            const msg = event.message;
            const playerName = event.sender.name;
            if (msg.startsWith("/")) return;
            console.log(`[PlayerSync] Chat detected (before): <${playerName}> ${msg}`);
            sendChatToDiscord(playerName, msg);
        });
        console.log("[PlayerSync] ✅ Auto chat sync enabled (beforeEvents.chatSend)");
        chatSubscribed = true;
    }

    // Debug: Log all available events if chat not found
    if (!chatSubscribed) {
        console.warn("[PlayerSync] ❌ chatSend API NOT available!");
        if (world.afterEvents) {
            const afterKeys = Object.keys(world.afterEvents);
            console.warn("[PlayerSync] afterEvents (" + afterKeys.length + "): " + afterKeys.slice(0, 20).join(", "));
        }
        if (world.beforeEvents) {
            const beforeKeys = Object.keys(world.beforeEvents);
            console.warn("[PlayerSync] beforeEvents (" + beforeKeys.length + "): " + beforeKeys.slice(0, 20).join(", "));
        }
    }
} catch (e) {
    console.warn("[PlayerSync] ❌ Error subscribing to chatSend:", e);
}

/**
 * Gửi tin nhắn chat đến Discord
 */
function sendChatToDiscord(playerName, message) {
    const payload = JSON.stringify({
        type: "chat",
        secret: SECRET_KEY,
        playerName: playerName,
        message: message,
        serverTime: Date.now()
    });

    try {
        const request = new HttpRequest(CHAT_URL);
        request.method = HttpRequestMethod.Post;
        request.body = payload;
        request.headers = [
            new HttpHeader("Content-Type", "application/json"),
            new HttpHeader("X-Addon-Secret", SECRET_KEY)
        ];
        request.timeout = 3;

        http.request(request).catch(() => { });
        console.log(`[PlayerSync] Chat to Discord: <${playerName}> ${message}`);
    } catch { }
}

// ==================== MAIN LOOP ====================

const HEALTH_CHECK_INTERVAL = 10; // 0.5s check for health

// Gửi cập nhật định kỳ (5s)
system.runInterval(() => {
    sendPlayerUpdate();
}, UPDATE_INTERVAL_TICKS);

// Check Low Health (0.5s) nhanh hơn để báo kịp
system.runInterval(() => {
    // Check low health separately to avoid recursion in getPlayerList
    for (const player of world.getAllPlayers()) {
        try {
            const currentHealth = Math.round(player.getComponent("health")?.currentValue || 20);
            const lastState = playerHealthState.get(player.name) || { lastHealth: 20, lowHealthCoodown: 0 };

            if (currentHealth <= 8 && currentHealth > 0) {
                const now = Date.now();
                // Trigger only if health WAS > 8 (strict transition)
                // Removed time-based check to prevent spamming while low
                if (lastState.lastHealth > 8) {
                    const pos = player.location;
                    sendPlayerEvent("low_health", player.name, {
                        health: currentHealth,
                        position: {
                            x: Math.round(pos.x),
                            y: Math.round(pos.y),
                            z: Math.round(pos.z)
                        }
                    }, true);
                    lastState.lowHealthCoodown = now;
                }
            }
            lastState.lastHealth = currentHealth;
            playerHealthState.set(player.name, lastState);
        } catch { }
    }
}, HEALTH_CHECK_INTERVAL);

// Poll tin nhắn từ Discord mỗi 2 giây
system.runInterval(async () => {
    await pollDiscordMessages();
}, 10); // 0.5 giây

/**
 * Lấy tin nhắn từ Discord và hiển thị trong game
 */
async function pollDiscordMessages() {
    try {
        const messagesUrl = BOT_URL.replace('/player-update', '/get-messages');
        const request = new HttpRequest(messagesUrl);
        request.method = HttpRequestMethod.Get;
        request.timeout = 5;

        const response = await http.request(request);

        if (response.status === 200) {
            const data = JSON.parse(response.body);
            // Debug: Log received data count
            if (data.messages && data.messages.length > 0) {
                console.warn(`[PlayerSync] Received ${data.messages.length} messages from Bot`);
            }

            if (data.messages && data.messages.length > 0) {
                for (const msg of data.messages) {
                    // Handle commands
                    if (msg.type === 'command') {
                        if (msg.command === 'terrain_request' && msg.playerName) {
                            pendingTerrainScans.add(msg.playerName.toLowerCase());
                            console.log(`[PlayerSync] Received terrain request for ${msg.playerName}`);
                        }
                    }
                    // Handle chat
                    else if (msg.sender && msg.message) {
                        let chatText;
                        if (msg.sender === 'Bot') {
                            // System messages (Death, Low Health) - Display raw colored text
                            chatText = msg.message;
                        } else {
                            // User Discord messages - Display with [Discord] prefix
                            chatText = `§b[Discord]§r §e${msg.sender}§r: ${msg.message}`;
                        }
                        world.sendMessage(chatText);
                        console.warn(`[PlayerSync] Sent to game: ${chatText}`);
                    }
                }
            }
        } else {
            console.warn(`[PlayerSync] Poll Failed: Status ${response.status}`);
        }
    } catch (e) {
        console.warn("[PlayerSync] Poll Error:", e);
    }
}

// Log khi addon load
console.log("[PlayerSync] ✅ Discord Bot Player Sync Addon loaded!");
console.log(`[PlayerSync] 📡 Sending updates to: ${BOT_URL}`);
console.log("[PlayerSync] 💬 Two-way chat enabled!");

// Tắt thông báo chết mặc định của game (thay bằng thông báo custom từ bot)
system.runTimeout(() => {
    try {
        world.gameRules.showDeathMessages = false;
        console.log("[PlayerSync] 🔇 Default death messages disabled (using bot custom messages)");
    } catch {
        // Fallback nếu gameRules API không khả dụng
        try {
            world.getDimension("overworld").runCommand("gamerule showDeathMessages false");
            console.log("[PlayerSync] 🔇 Default death messages disabled (via command)");
        } catch (e) {
            console.warn("[PlayerSync] ⚠️ Could not disable death messages:", e);
        }
    }
}, 40); // Delay 2s để đảm bảo world đã load