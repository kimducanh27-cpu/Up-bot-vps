const { EmbedBuilder } = require('discord.js');

// Custom Emojis & Assets
const ASSETS = {
    ICONS: {
        HEART_REGEN: "<:98437regenheart:1448901017637879848>",
        CLOCK_ANIM: "<:animated_clock:1448905091968008242>",
        PICKAXE: "<:1405diamondpickaxe:1448900542255464499>",
        SWORD: "<:1405diamondsword:1448900946749952112>",
        WORLD: "<:Minecraft_World_Cube:1448905048284201000>",
        PETS: "<:9648trashyaxolotl:1448907520855769128>"
    },
    IMAGES: {
        THUMB_CLOCK: "https://cdn3.emoji.gg/emojis/1201-animated-clock.png",
        THUMB_WORLD: "https://cdn3.emoji.gg/emojis/6410-minecraft-mundo.png",
        THUMB_PETS: "https://cdn3.emoji.gg/emojis/8660-minecraft-bucketaxolotl.png"
    },
    COLORS: {
        ONLINE: 0x14FE00,   // Green
        OFFLINE: 0x808080,  // Gray
        STATS: 0xFF6B35,    // Orange
        WORLD: 0x3498DB,    // Blue
        PETS: 0xE91E63      // Pink
    }
};

// Hàm pad text để căn giữa
function padCenter(text, width) {
    const padding = Math.max(0, width - text.length);
    const left = Math.floor(padding / 2);
    return ' '.repeat(left) + text;
}

/**
 * Render Player Dashboard Embeds
 * @param {Object} player - Player data từ addon
 * @param {Object} options - { discordTag, lastOnlineTime, isOnline }
 * @returns {Array} Array of embed objects
 */
module.exports = {
    render: (player, options = {}) => {
        const embeds = [];
        const { discordTag = null, lastOnlineTime = null, isOnline = true } = options;

        // Tính thời gian online
        let statusText = "✦ Đang Online ✦";
        let statusColor = ASSETS.COLORS.ONLINE;
        if (!isOnline && lastOnlineTime) {
            const minutes = Math.floor((Date.now() - lastOnlineTime) / 60000);
            if (minutes < 60) {
                statusText = `✦ Online ${minutes} phút trước ✦`;
            } else {
                const hours = Math.floor(minutes / 60);
                statusText = `✦ Online ${hours} giờ trước ✦`;
            }
            statusColor = ASSETS.COLORS.OFFLINE;
        }

        // 1. Header với tên player
        const displayDiscord = discordTag ? `@${discordTag}` : 'NA';
        const displayMC = player.name;
        // Mobile: ngắt dòng nếu tên quá dài
        const headerText = `**╰➤ ${displayDiscord} ║ ${displayMC}**\u2002\u2002\u2002\u2002`;

        embeds.push({
            color: statusColor,
            description: headerText,
            footer: { text: `─── ${statusText} ───` } // Rút ngắn line footer
        });

        // Data
        const health = Math.round(player.health || 20);
        const maxHealth = 20;
        const timeOfDay = player.worldInfo?.timeOfDay === 'night' ? 'Moon' : 'Sun';
        const blocksBroken = player.stats?.blocksBroken || 0;
        const mobsKilled = player.stats?.mobsKilled || 0;

        // 2. Stats: HP, Time, Blocks, Kills (Mobile friendly layout - 2 columns)
        // Dùng \u2002 (En Space) khoảng 3-4 lần để tạo khoảng cách vừa đủ
        embeds.push({
            color: ASSETS.COLORS.STATS,
            description:
                `${ASSETS.ICONS.HEART_REGEN} **${health}/${maxHealth}**\u2002\u2002\u2002${ASSETS.ICONS.CLOCK_ANIM} **${timeOfDay}**\n` +
                `──────────────────\n` +
                `${ASSETS.ICONS.PICKAXE} **${blocksBroken}**\u2002\u2002\u2002\u2002\u2002${ASSETS.ICONS.SWORD} **${mobsKilled}**`,
            thumbnail: { url: ASSETS.IMAGES.THUMB_CLOCK }
        });


        // Dictionary Biome Tiếng Việt
        const BIOME_VI = {
            // Overworld
            'plains': 'Đồng bằng',
            'sunflower_plains': 'Đồng bằng hướng dương',
            'snowy_plains': 'Đồng bằng tuyết',
            'ice_spikes': 'Gai băng',
            'desert': 'Sa mạc',
            'swamp': 'Đầm lầy',
            'mangrove_swamp': 'Rừng ngập mặn',
            'forest': 'Rừng sồi',
            'flower_forest': 'Rừng hoa',
            'birch_forest': 'Rừng bạch dương',
            'dark_forest': 'Rừng sồi sẫm',
            'old_growth_birch_forest': 'Rừng bạch dương cổ thụ',
            'old_growth_pine_taiga': 'Rừng thông cổ thụ',
            'old_growth_spruce_taiga': 'Rừng vân sam cổ thụ',
            'taiga': 'Rừng taiga',
            'snowy_taiga': 'Taiga tuyết',
            'savanna': 'Thảo nguyên',
            'savanna_plateau': 'Cao nguyên thảo nguyên',
            'windswept_hills': 'Đồi lộng gió',
            'windswept_gravelly_hills': 'Đồi sỏi lộng gió',
            'windswept_forest': 'Rừng lộng gió',
            'windswept_savanna': 'Thảo nguyên lộng gió',
            'jungle': 'Rừng nhiệt đới',
            'sparse_jungle': 'Rừng thưa nhiệt đới',
            'bamboo_jungle': 'Rừng tre',
            'badlands': 'Đất cằn',
            'eroded_badlands': 'Đất cằn xói mòn',
            'wooded_badlands': 'Đất cằn có cây',
            'meadow': 'Đồng cỏ',
            'cherry_grove': 'Rừng anh đào',
            'grove': 'Rừng thưa',
            'snowy_slopes': 'Sườn tuyết',
            'frozen_peaks': 'Đỉnh băng',
            'jagged_peaks': 'Đỉnh lởm chởm',
            'stony_peaks': 'Đỉnh đá',
            'river': 'Sông',
            'frozen_river': 'Sông băng',
            'beach': 'Bãi biển',
            'snowy_beach': 'Bãi biển tuyết',
            'stony_shore': 'Bờ đá',
            'warm_ocean': 'Đại dương ấm',
            'lukewarm_ocean': 'Đại dương hơi ấm',
            'deep_lukewarm_ocean': 'Đại dương hơi ấm sâu',
            'ocean': 'Đại dương',
            'deep_ocean': 'Đại dương sâu',
            'cold_ocean': 'Đại dương lạnh',
            'deep_cold_ocean': 'Đại dương lạnh sâu',
            'frozen_ocean': 'Đại dương băng',
            'deep_frozen_ocean': 'Đại dương băng sâu',
            'mushroom_fields': 'Đảo nấm',
            'dripstone_caves': 'Hang thạch nhũ',
            'lush_caves': 'Hang xanh',
            'deep_dark': 'Deep Dark',
            // Nether
            'nether_wastes': 'Nether Wastes',
            'warped_forest': 'Rừng kì dị',
            'crimson_forest': 'Rừng đỏ thẫm',
            'soul_sand_valley': 'Thung lũng cát linh hồn',
            'basalt_deltas': 'Đồng bằng bazan',
            // The End
            'the_end': 'The End',
            'small_end_islands': 'Đảo End nhỏ',
            'end_midlands': 'Vùng giữa End',
            'end_highlands': 'Vùng cao End',
            'end_barrens': 'Vùng hoang vu End'
        };

        function getBiomeName(rawBiome) {
            if (!rawBiome) return 'Không rõ';
            // Clean key: "minecraft:plains" -> "plains"
            const key = rawBiome.replace('minecraft:', '').toLowerCase().trim();

            // Check map
            if (BIOME_VI[key]) return BIOME_VI[key];

            // Fallback: Format text (bushland -> Bushland)
            return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }

        function getEnvironmentName(dimension, y) {
            const dim = (dimension || 'overworld').toLowerCase();

            if (dim.includes('nether')) return 'Nether';
            if (dim.includes('end')) return 'The End';

            // Overworld check
            // Mặc định Y mặt đất khoảng 60-70. Y < 50 coi như xuống hang.
            if (y < 50) return 'Hang động';
            return 'Overworld';
        }

        // 3. World: Coords, Biome, Structure
        const pos = player.position || { x: 0, y: 0, z: 0 };
        // const biome = (player.worldInfo?.biome || 'Overworld').replace(/_/g, ' ');
        const biomeRaw = player.worldInfo?.biome || '';
        const biomeName = getBiomeName(biomeRaw);

        // Xác định môi trường (Dòng trên)
        const environment = getEnvironmentName(player.dimension, pos.y);

        // Structure (Dòng dưới cùng nếu có, hoặc để trống)
        const structure = player.worldInfo?.structure ? `\n╰─ ${player.worldInfo.structure}` : '';

        // Format:
        // 384, 77, -827
        // ╰─ Overworld (hoặc Cave/Nether)
        // ╰─ Đồng bằng (Biome)

        embeds.push({
            color: ASSETS.COLORS.WORLD,
            description:
                `${ASSETS.ICONS.WORLD} **${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)}**\u2002\u2002\u2002\u2002\u2002\n` +
                `╰─ ${environment}\n` +
                `╰─ ${biomeName}${structure}`,
            thumbnail: { url: ASSETS.IMAGES.THUMB_WORLD }
        });

        const pets = player.pets || [];
        let petContent = `${ASSETS.ICONS.PETS} **Pets**\u2002\u2002\u2002\u2002\u2002\n`;
        if (pets.length > 0) {
            pets.slice(0, 3).forEach((p, i) => {
                // Mobile: dùng bullet đơn giản
                petContent += `╰─ ${p.name || p.type || 'Pet'}\n`;
            });
        } else {
            petContent += `╰─ *Chưa có*`;
        }

        embeds.push({
            color: ASSETS.COLORS.PETS,
            description: petContent,
            thumbnail: { url: ASSETS.IMAGES.THUMB_PETS }
        });

        return embeds;
    },

    // Export assets để sử dụng từ ngoài
    ASSETS
};
