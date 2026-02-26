// bot.js
// Yêu cầu: node 18+, discord.js v14, bedrock-protocol
// npm i discord.js bedrock-protocol

const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, ButtonBuilder, ActionRowBuilder, ButtonStyle, AttachmentBuilder, REST, Routes, SlashCommandBuilder, Partials } = require('discord.js');
require('dotenv').config(); // Load biến môi trường từ .env
// GROQ API Wrapper (thay thế Google Generative AI)
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const bedrock = require('bedrock-protocol');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { createCanvas, loadImage } = require('canvas');
const SftpClient = require('ssh2-sftp-client');
const archiver = require('archiver');
// const { getMemoryContext, addMemory } = require('./mem0_manager');

// -------------------- MEMORY MANAGER (OPTIONAL) --------------------
let getMemoryContext = async () => '';
let addMemory = async () => { };

try {
    const mem0 = require('./mem0_manager');
    getMemoryContext = mem0.getMemoryContext;
    addMemory = mem0.addMemory;
} catch (e) {
    console.warn('[Warning] Failed to load mem0_manager (Memory features disabled):', e.message);
}
const DashboardRenderer = require('./DashboardRenderer');
// -------------------- DISCORD ACTIVITY GAMES (20+) --------------------
const DISCORD_GAMES = {
    // 🃏 Card Games
    'poker': { id: '755827207812677713', name: 'Poker Night 2.0', emoji: '🃏' },
    'blazing8s': { id: '832025144389533716', name: 'Blazing 8s', emoji: '🎴' },
    'uno': { id: '832025144389533716', name: 'Blazing 8s (UNO Style)', emoji: '🔴' },

    // ♟️ Board Games
    'chess': { id: '832012774040141894', name: 'Chess in the Park', emoji: '♟️' },
    'checkers': { id: '832013003968348200', name: 'Checkers in the Park', emoji: '🏁' },
    'chessdev': { id: '832012586023256104', name: 'Chess Dev', emoji: '♔' },

    // 🎯 Party Games
    'puttparty': { id: '945737671223947305', name: 'Putt Party', emoji: '⛳' },
    'golf': { id: '945737671223947305', name: 'Putt Party', emoji: '🏌️' },
    'sketchheads': { id: '902271654783242291', name: 'Sketch Heads', emoji: '🎨' },
    'draw': { id: '902271654783242291', name: 'Sketch Heads', emoji: '✏️' },
    'gartic': { id: '1007373802981822582', name: 'Gartic Phone', emoji: '📞' },

    // 🔤 Word Games  
    'wordle': { id: '879863686565621790', name: 'Letter League', emoji: '🔤' },
    'letterleague': { id: '879863686565621790', name: 'Letter League', emoji: '📝' },
    'spellcast': { id: '852509694341283871', name: 'SpellCast', emoji: '🔮' },

    // 🎮 Action Games
    'landio': { id: '903769130790969345', name: 'Land-io', emoji: '🗺️' },
    'bobbleleague': { id: '947957217959759964', name: 'Bobble League', emoji: '⚽' },
    'bobblebash': { id: '1107600149148246066', name: 'Bobble Bash', emoji: '🏀' },

    // 🎬 Media
    'youtube': { id: '880218394199220334', name: 'Watch Together', emoji: '📺' },
    'watchtogether': { id: '880218394199220334', name: 'Watch Together', emoji: '🎬' },

    // 🧩 Puzzle Games
    'wordsnacks': { id: '879863976006127627', name: 'Word Snacks', emoji: '🍪' },
    'knowmeme': { id: '950505761862189096', name: 'Know What I Meme', emoji: '😂' },
    'meme': { id: '950505761862189096', name: 'Know What I Meme', emoji: '🖼️' },

    // 🎨 Creative
    'colortogether': { id: '1039835161136746497', name: 'Color Together', emoji: '🎨' },
    'whiteboard': { id: '1070087967294631976', name: 'Jamspace Whiteboard', emoji: '📋' },

    // 👨‍🍳 Other Games
    'chefshowdown': { id: '1037680572660727838', name: 'Chef Showdown', emoji: '👨‍🍳' },
    'chef': { id: '1037680572660727838', name: 'Chef Showdown', emoji: '🍳' },
    'colonist': { id: '1017770040758489108', name: 'Colonist', emoji: '🏠' },
    'catan': { id: '1017770040758489108', name: 'Colonist (Catan)', emoji: '🎲' },

    // 🎭 Misc
    'awkword': { id: '879863881349087252', name: 'Awkword', emoji: '🤪' },
    'fishington': { id: '814288819477020702', name: 'Fishington.io', emoji: '🐟' },
    'betrayal': { id: '773336526917861400', name: 'Betrayal.io', emoji: '🔪' }
};


// -------------------- ITEM IMAGE HELPER --------------------
const ITEMS_IMAGE_PATH = path.join(__dirname, 'items_1.21.8');

const getItemImagePath = (itemName) => {
    // Normalize item name: remove minecraft: prefix, convert to lowercase
    const normalizedName = itemName.replace('minecraft:', '').toLowerCase();

    // Try different file patterns
    const patterns = [
        `minecraft_${normalizedName}.png`,
        `${normalizedName}.png`
    ];

    for (const pattern of patterns) {
        const fullPath = path.join(ITEMS_IMAGE_PATH, pattern);
        if (fs.existsSync(fullPath)) {
            return fullPath;
        }
    }

    // Fallback to unknown item
    const unknownPath = path.join(ITEMS_IMAGE_PATH, 'canUse_unknown.png');
    return fs.existsSync(unknownPath) ? unknownPath : null;
};

// -------------------- INVENTORY IMAGE GENERATOR --------------------
async function createInventoryImage(inventory, playerName) {
    const SCALE = 2;
    const SLOT_SIZE = 64 * SCALE;
    const PADDING = 3 * SCALE;
    const COLS = 5;
    const rows = Math.ceil(Math.min(inventory.length, 30) / COLS);

    const TITLE_HEIGHT = 40 * SCALE;
    const width = COLS * (SLOT_SIZE + PADDING) + PADDING;
    const height = rows * (SLOT_SIZE + PADDING) + PADDING + TITLE_HEIGHT;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#3d3d3d';
    ctx.fillRect(0, 0, width, TITLE_HEIGHT - 5 * SCALE);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${24 * SCALE}px Arial`;
    ctx.fillText(`📦 ${playerName}`, PADDING, 28 * SCALE);

    const items = inventory.slice(0, 30);
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const col = i % COLS;
        const row = Math.floor(i / COLS);

        const x = PADDING + col * (SLOT_SIZE + PADDING);
        const y = TITLE_HEIGHT + PADDING + row * (SLOT_SIZE + PADDING);

        ctx.fillStyle = '#8B8B8B';
        ctx.fillRect(x, y, SLOT_SIZE, SLOT_SIZE);
        ctx.fillStyle = '#555555';
        ctx.fillRect(x, y + SLOT_SIZE - 4 * SCALE, SLOT_SIZE, 4 * SCALE);
        ctx.fillRect(x + SLOT_SIZE - 4 * SCALE, y, 4 * SCALE, SLOT_SIZE);
        ctx.fillStyle = '#373737';
        ctx.fillRect(x + 4 * SCALE, y + 4 * SCALE, SLOT_SIZE - 8 * SCALE, SLOT_SIZE - 8 * SCALE);

        try {
            const imagePath = getItemImagePath(item.name);
            if (imagePath) {
                const img = await loadImage(imagePath);
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, x + 8 * SCALE, y + 8 * SCALE, SLOT_SIZE - 16 * SCALE, SLOT_SIZE - 16 * SCALE);
                ctx.imageSmoothingEnabled = true;
            }
        } catch (e) {
            ctx.fillStyle = '#666666';
            ctx.fillRect(x + 20 * SCALE, y + 20 * SCALE, SLOT_SIZE - 40 * SCALE, SLOT_SIZE - 40 * SCALE);
        }

        if (item.amount > 1) {
            ctx.font = `bold ${22 * SCALE}px Arial`;
            const text = item.amount.toString();
            const textX = x + SLOT_SIZE - 12 * SCALE - ctx.measureText(text).width;
            const textY = y + SLOT_SIZE - 12 * SCALE;
            ctx.fillStyle = '#000000';
            ctx.fillText(text, textX + 2 * SCALE, textY + 2 * SCALE);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(text, textX, textY);
        }

        if (item.enchantments && item.enchantments.length > 0) {
            ctx.strokeStyle = '#AA00FF';
            ctx.lineWidth = 4 * SCALE;
            ctx.strokeRect(x + 4 * SCALE, y + 4 * SCALE, SLOT_SIZE - 8 * SCALE, SLOT_SIZE - 8 * SCALE);
            ctx.fillStyle = 'rgba(170, 0, 255, 0.15)';
            ctx.fillRect(x + 4 * SCALE, y + 4 * SCALE, SLOT_SIZE - 8 * SCALE, SLOT_SIZE - 8 * SCALE);
        }
    }

    return canvas.toBuffer('image/png');
}

// -------------------- MAP IMAGE GENERATOR --------------------
// Block type to color mapping for map
const BLOCK_COLORS = {
    // Terrain - VANILLA COLORS
    'grass_block': '#7CBD7B', 'grass': '#7CBD7B', 'tall_grass': '#7CBD7B',
    'dirt': '#8B6951', 'coarse_dirt': '#78573D', 'podzol': '#5A4938', 'mycelium': '#6F6178',
    'stone': '#828282', 'cobblestone': '#7F7F7F', 'deepslate': '#4A4A4A', 'bedrock': '#333333',
    'andesite': '#848484', 'polished_andesite': '#888888',
    'diorite': '#C3C3C3', 'polished_diorite': '#CACACA',
    'granite': '#9A6D5C', 'polished_granite': '#9F735E',
    'tuff': '#6B6D6B', 'calcite': '#E3E4DC', 'dripstone_block': '#7D6659',
    'sand': '#DBD3A0', 'sandstone': '#D9C89E', 'red_sand': '#C07537', 'red_sandstone': '#B45720',
    'gravel': '#838287', 'clay': '#A0A7B8', 'mud': '#3D3A32',
    'snow': '#FFFEFF', 'snow_block': '#FFFEFF', 'ice': '#A1C6FA', 'packed_ice': '#7FB7FD', 'blue_ice': '#75A7FA',
    // Water & Lava - VANILLA
    'water': '#3F76E4', 'flowing_water': '#3F76E4',
    'lava': '#EA7E21', 'flowing_lava': '#EA7E21',
    // Trees & Plants - VANILLA
    'oak_log': '#6F5835', 'spruce_log': '#3A2F1C', 'birch_log': '#D7D2C6',
    'jungle_log': '#5C4130', 'acacia_log': '#67573D', 'dark_oak_log': '#3E301A', 'mangrove_log': '#6D3F39', 'cherry_log': '#2E1A1A',
    'stripped_oak_log': '#B0936B', 'stripped_spruce_log': '#73603E', 'stripped_birch_log': '#C8BC88',
    'stripped_jungle_log': '#A98559', 'stripped_acacia_log': '#AB6134', 'stripped_dark_oak_log': '#59482F',
    'oak_wood': '#6F5835', 'spruce_wood': '#3A2F1C', 'birch_wood': '#D7D2C6', 'jungle_wood': '#5C4130',
    'oak_leaves': '#59AE30', 'spruce_leaves': '#4F6F37', 'birch_leaves': '#7FA84F',
    'jungle_leaves': '#55AC27', 'acacia_leaves': '#73AF34', 'dark_oak_leaves': '#3E7426', 'mangrove_leaves': '#6FB93C', 'cherry_leaves': '#F8C7D8',
    'azalea_leaves': '#5C9638', 'flowering_azalea_leaves': '#D279DA',
    'cactus': '#587E3B', 'bamboo': '#7CFC00', 'sugar_cane': '#9ACD32',
    // Ores - VANILLA
    'diamond_ore': '#5CDBD5', 'deepslate_diamond_ore': '#5CDBD5', 'diamond_block': '#5CDBD5',
    'iron_ore': '#888888', 'deepslate_iron_ore': '#888888', 'iron_block': '#D8D8D8',
    'gold_ore': '#FCEE4B', 'deepslate_gold_ore': '#FCEE4B', 'gold_block': '#FCEE4B',
    'coal_ore': '#525252', 'deepslate_coal_ore': '#525252', 'coal_block': '#1A1A1A',
    'redstone_ore': '#CE3830', 'deepslate_redstone_ore': '#CE3830', 'redstone_block': '#CE3830',
    'lapis_ore': '#2D59AB', 'deepslate_lapis_ore': '#2D59AB', 'lapis_block': '#2D59AB',
    'emerald_ore': '#35DD71', 'deepslate_emerald_ore': '#35DD71', 'emerald_block': '#35DD71',
    'copper_ore': '#7C5238', 'deepslate_copper_ore': '#7C5238', 'copper_block': '#C36544',
    // Structures - VANILLA
    'oak_planks': '#9C7F4E', 'spruce_planks': '#6F553C', 'birch_planks': '#D7CB8D',
    'jungle_planks': '#A0724F', 'acacia_planks': '#BD6A3E', 'dark_oak_planks': '#4E3B27',
    'stone_bricks': '#7A7A7A', 'mossy_stone_bricks': '#6C7B67', 'cracked_stone_bricks': '#777777',
    'bricks': '#905950', 'nether_bricks': '#2E1A1F',
    'cobblestone_wall': '#7F7F7F', 'mossy_cobblestone': '#6E7B69',
    'glass': '#E0F4FC', 'glass_pane': '#E0F4FC',
    // Crops - VANILLA
    'wheat': '#B5A342', 'carrots': '#ED942D', 'potatoes': '#F4CE6B', 'beetroots': '#9E2C36',
    'melon_stem': '#7EA240', 'pumpkin_stem': '#7EA240', 'cocoa': '#BD7838',
    'sweet_berry_bush': '#4C7247', 'cave_vines': '#7EA240',
    // Fences & Gates - VANILLA
    'oak_fence': '#9C7F4E', 'spruce_fence': '#6F553C', 'birch_fence': '#D7CB8D',
    'jungle_fence': '#A0724F', 'acacia_fence': '#BD6A3E', 'dark_oak_fence': '#4E3B27',
    'mangrove_fence': '#6D3F39', 'cherry_fence': '#2E1A1A', 'bamboo_fence': '#B59A4C',
    'crimson_fence': '#7E3A51', 'warped_fence': '#327A7B',
    'oak_fence_gate': '#9C7F4E', 'spruce_fence_gate': '#6F553C', 'birch_fence_gate': '#D7CB8D',
    'jungle_fence_gate': '#A0724F', 'acacia_fence_gate': '#BD6A3E', 'dark_oak_fence_gate': '#4E3B27',
    'mangrove_fence_gate': '#6D3F39', 'cherry_fence_gate': '#2E1A1A', 'bamboo_fence_gate': '#B59A4C',
    'crimson_fence_gate': '#7E3A51', 'warped_fence_gate': '#327A7B',
    // Lights - VANILLA
    'torch': '#FCEE4B', 'soul_torch': '#4BDEF4', 'redstone_torch': '#CE3830',
    'lantern': '#F8BE3F', 'soul_lantern': '#4EC0D1', 'campfire': '#FF6B1F', 'soul_campfire': '#4EC0D1',
    'glow_lichen': '#778466', 'sea_lantern': '#B2DADA', 'shroomlight': '#F8A05F', 'froglight': '#E4F5D1',
    // Stones & Dirt - VANILLA (duplicates for compatibility)
    'andesite': '#848484', 'diorite': '#C3C3C3', 'granite': '#9A6D5C',
    'polished_andesite': '#888888', 'polished_diorite': '#CACACA', 'polished_granite': '#9F735E',
    'tuff': '#6B6D6B', 'calcite': '#E3E4DC', 'dripstone_block': '#7D6659', 'pointed_dripstone': '#7D6659',
    'deepslate': '#4A4A4A', 'cobbled_deepslate': '#5C5C5C', 'polished_deepslate': '#4E4E4E',
    'dirt': '#8B6951', 'coarse_dirt': '#78573D', 'rooted_dirt': '#8B6951', 'mud': '#3D3A32',
    'clay': '#A0A7B8', 'sand': '#DBD3A0', 'red_sand': '#C07537', 'gravel': '#838287',
    // Nether - VANILLA
    'netherrack': '#6C3435', 'soul_sand': '#50433B', 'soul_soil': '#4C3B35',
    'basalt': '#4C4C52', 'blackstone': '#322F35', 'glowstone': '#F1D77C',
    'crimson_nylium': '#963A43', 'warped_nylium': '#346563',
    'magma_block': '#8B3616',
    // End - VANILLA
    'end_stone': '#DDEAB7', 'purpur_block': '#A57EAA', 'end_stone_bricks': '#DDEAB7',
    // Wool/Concrete/Terracotta (Generic) - VANILLA
    'white_wool': '#EBEBEB', 'orange_wool': '#F38235', 'magenta_wool': '#C64FC9', 'light_blue_wool': '#51B5DA',
    'yellow_wool': '#FED83E', 'lime_wool': '#83C73A', 'pink_wool': '#F09AB5', 'gray_wool': '#494949',
    'light_gray_wool': '#8E8E86', 'cyan_wool': '#169A9C', 'purple_wool': '#823EB7', 'blue_wool': '#3A52A4',
}
// -------------------- TEXTURE CONFIG --------------------
const TEXTURES_DIR = path.join(__dirname, 'minecraft-assets-master', 'minecraft-assets-master', 'data', '1.21.8', 'blocks');
const TEXTURE_CACHE = new Map();

// Comprehensive block-to-texture mappings
const BLOCK_TEXTURE_MAP = {
    // === TERRAIN ===
    'grass_block': 'grass_block_top.png', 'dirt': 'dirt.png', 'coarse_dirt': 'coarse_dirt.png',
    'rooted_dirt': 'rooted_dirt.png', 'podzol': 'podzol_top.png', 'mycelium': 'mycelium_top.png',
    'dirt_path': 'dirt_path_top.png', 'farmland': 'farmland.png', 'mud': 'mud.png', 'clay': 'clay.png',
    // === STONE ===
    'stone': 'stone.png', 'cobblestone': 'cobblestone.png', 'mossy_cobblestone': 'mossy_cobblestone.png',
    'stone_bricks': 'stone_bricks.png', 'mossy_stone_bricks': 'mossy_stone_bricks.png',
    'cracked_stone_bricks': 'cracked_stone_bricks.png', 'chiseled_stone_bricks': 'chiseled_stone_bricks.png',
    'smooth_stone': 'smooth_stone.png', 'bedrock': 'bedrock.png', 'gravel': 'gravel.png',
    'sand': 'sand.png', 'red_sand': 'red_sand.png', 'sandstone': 'sandstone_top.png',
    'red_sandstone': 'red_sandstone_top.png', 'granite': 'granite.png', 'polished_granite': 'polished_granite.png',
    'diorite': 'diorite.png', 'polished_diorite': 'polished_diorite.png', 'andesite': 'andesite.png',
    'polished_andesite': 'polished_andesite.png', 'tuff': 'tuff.png', 'calcite': 'calcite.png',
    'dripstone_block': 'dripstone_block.png',
    // === DEEPSLATE ===
    'deepslate': 'deepslate_top.png', 'cobbled_deepslate': 'cobbled_deepslate.png',
    'polished_deepslate': 'polished_deepslate.png', 'deepslate_bricks': 'deepslate_bricks.png',
    'deepslate_tiles': 'deepslate_tiles.png', 'chiseled_deepslate': 'chiseled_deepslate.png',
    // === ORES ===
    'coal_ore': 'coal_ore.png', 'deepslate_coal_ore': 'deepslate_coal_ore.png',
    'iron_ore': 'iron_ore.png', 'deepslate_iron_ore': 'deepslate_iron_ore.png',
    'copper_ore': 'copper_ore.png', 'deepslate_copper_ore': 'deepslate_copper_ore.png',
    'gold_ore': 'gold_ore.png', 'deepslate_gold_ore': 'deepslate_gold_ore.png',
    'redstone_ore': 'redstone_ore.png', 'deepslate_redstone_ore': 'deepslate_redstone_ore.png',
    'emerald_ore': 'emerald_ore.png', 'deepslate_emerald_ore': 'deepslate_emerald_ore.png',
    'lapis_ore': 'lapis_ore.png', 'deepslate_lapis_ore': 'deepslate_lapis_ore.png',
    'diamond_ore': 'diamond_ore.png', 'deepslate_diamond_ore': 'deepslate_diamond_ore.png',
    'nether_gold_ore': 'nether_gold_ore.png', 'nether_quartz_ore': 'nether_quartz_ore.png',
    'ancient_debris': 'ancient_debris_top.png',
    // === MINERAL BLOCKS ===
    'coal_block': 'coal_block.png', 'iron_block': 'iron_block.png', 'copper_block': 'copper_block.png',
    'exposed_copper': 'exposed_copper.png', 'weathered_copper': 'weathered_copper.png',
    'oxidized_copper': 'oxidized_copper.png', 'gold_block': 'gold_block.png',
    'redstone_block': 'redstone_block.png', 'emerald_block': 'emerald_block.png',
    'lapis_block': 'lapis_block.png', 'diamond_block': 'diamond_block.png',
    'netherite_block': 'netherite_block.png', 'raw_iron_block': 'raw_iron_block.png',
    'raw_copper_block': 'raw_copper_block.png', 'raw_gold_block': 'raw_gold_block.png',
    'amethyst_block': 'amethyst_block.png',
    // === WOOD LOGS ===
    'oak_log': 'oak_log_top.png', 'spruce_log': 'spruce_log_top.png', 'birch_log': 'birch_log_top.png',
    'jungle_log': 'jungle_log_top.png', 'acacia_log': 'acacia_log_top.png', 'dark_oak_log': 'dark_oak_log_top.png',
    'mangrove_log': 'mangrove_log_top.png', 'cherry_log': 'cherry_log_top.png', 'pale_oak_log': 'pale_oak_log_top.png',
    'crimson_stem': 'crimson_stem_top.png', 'warped_stem': 'warped_stem_top.png', 'bamboo_block': 'bamboo_block_top.png',
    // === STRIPPED LOGS ===
    'stripped_oak_log': 'stripped_oak_log_top.png', 'stripped_spruce_log': 'stripped_spruce_log_top.png',
    'stripped_birch_log': 'stripped_birch_log_top.png', 'stripped_jungle_log': 'stripped_jungle_log_top.png',
    'stripped_acacia_log': 'stripped_acacia_log_top.png', 'stripped_dark_oak_log': 'stripped_dark_oak_log_top.png',
    'stripped_mangrove_log': 'stripped_mangrove_log_top.png', 'stripped_cherry_log': 'stripped_cherry_log_top.png',
    'stripped_crimson_stem': 'stripped_crimson_stem_top.png', 'stripped_warped_stem': 'stripped_warped_stem_top.png',
    // === PLANKS ===
    'oak_planks': 'oak_planks.png', 'spruce_planks': 'spruce_planks.png', 'birch_planks': 'birch_planks.png',
    'jungle_planks': 'jungle_planks.png', 'acacia_planks': 'acacia_planks.png', 'dark_oak_planks': 'dark_oak_planks.png',
    'mangrove_planks': 'mangrove_planks.png', 'cherry_planks': 'cherry_planks.png', 'bamboo_planks': 'bamboo_planks.png',
    'bamboo_mosaic': 'bamboo_mosaic.png', 'crimson_planks': 'crimson_planks.png', 'warped_planks': 'warped_planks.png',
    // === LEAVES ===
    'oak_leaves': 'oak_leaves.png', 'spruce_leaves': 'spruce_leaves.png', 'birch_leaves': 'birch_leaves.png',
    'jungle_leaves': 'jungle_leaves.png', 'acacia_leaves': 'acacia_leaves.png', 'dark_oak_leaves': 'dark_oak_leaves.png',
    'mangrove_leaves': 'mangrove_leaves.png', 'cherry_leaves': 'cherry_leaves.png', 'azalea_leaves': 'azalea_leaves.png',
    // === WOOL ===
    'white_wool': 'white_wool.png', 'orange_wool': 'orange_wool.png', 'magenta_wool': 'magenta_wool.png',
    'light_blue_wool': 'light_blue_wool.png', 'yellow_wool': 'yellow_wool.png', 'lime_wool': 'lime_wool.png',
    'pink_wool': 'pink_wool.png', 'gray_wool': 'gray_wool.png', 'light_gray_wool': 'light_gray_wool.png',
    'cyan_wool': 'cyan_wool.png', 'purple_wool': 'purple_wool.png', 'blue_wool': 'blue_wool.png',
    'brown_wool': 'brown_wool.png', 'green_wool': 'green_wool.png', 'red_wool': 'red_wool.png', 'black_wool': 'black_wool.png',
    // === CONCRETE ===
    'white_concrete': 'white_concrete.png', 'orange_concrete': 'orange_concrete.png', 'magenta_concrete': 'magenta_concrete.png',
    'light_blue_concrete': 'light_blue_concrete.png', 'yellow_concrete': 'yellow_concrete.png', 'lime_concrete': 'lime_concrete.png',
    'pink_concrete': 'pink_concrete.png', 'gray_concrete': 'gray_concrete.png', 'light_gray_concrete': 'light_gray_concrete.png',
    'cyan_concrete': 'cyan_concrete.png', 'purple_concrete': 'purple_concrete.png', 'blue_concrete': 'blue_concrete.png',
    'brown_concrete': 'brown_concrete.png', 'green_concrete': 'green_concrete.png', 'red_concrete': 'red_concrete.png', 'black_concrete': 'black_concrete.png',
    // === TERRACOTTA ===
    'terracotta': 'terracotta.png', 'white_terracotta': 'white_terracotta.png', 'orange_terracotta': 'orange_terracotta.png',
    'magenta_terracotta': 'magenta_terracotta.png', 'light_blue_terracotta': 'light_blue_terracotta.png',
    'yellow_terracotta': 'yellow_terracotta.png', 'lime_terracotta': 'lime_terracotta.png', 'pink_terracotta': 'pink_terracotta.png',
    'gray_terracotta': 'gray_terracotta.png', 'light_gray_terracotta': 'light_gray_terracotta.png',
    'cyan_terracotta': 'cyan_terracotta.png', 'purple_terracotta': 'purple_terracotta.png', 'blue_terracotta': 'blue_terracotta.png',
    'brown_terracotta': 'brown_terracotta.png', 'green_terracotta': 'green_terracotta.png', 'red_terracotta': 'red_terracotta.png', 'black_terracotta': 'black_terracotta.png',
    // === GLASS ===
    'glass': 'glass.png', 'tinted_glass': 'tinted_glass.png',
    'white_stained_glass': 'white_stained_glass.png', 'orange_stained_glass': 'orange_stained_glass.png',
    'magenta_stained_glass': 'magenta_stained_glass.png', 'light_blue_stained_glass': 'light_blue_stained_glass.png',
    'yellow_stained_glass': 'yellow_stained_glass.png', 'lime_stained_glass': 'lime_stained_glass.png',
    'pink_stained_glass': 'pink_stained_glass.png', 'gray_stained_glass': 'gray_stained_glass.png',
    'cyan_stained_glass': 'cyan_stained_glass.png', 'purple_stained_glass': 'purple_stained_glass.png',
    'blue_stained_glass': 'blue_stained_glass.png', 'brown_stained_glass': 'brown_stained_glass.png',
    'green_stained_glass': 'green_stained_glass.png', 'red_stained_glass': 'red_stained_glass.png', 'black_stained_glass': 'black_stained_glass.png',
    // === NETHER ===
    'netherrack': 'netherrack.png', 'nether_bricks': 'nether_bricks.png', 'red_nether_bricks': 'red_nether_bricks.png',
    'soul_sand': 'soul_sand.png', 'soul_soil': 'soul_soil.png', 'basalt': 'basalt_top.png',
    'polished_basalt': 'polished_basalt_top.png', 'smooth_basalt': 'smooth_basalt.png',
    'blackstone': 'blackstone_top.png', 'polished_blackstone': 'polished_blackstone.png',
    'polished_blackstone_bricks': 'polished_blackstone_bricks.png', 'glowstone': 'glowstone.png',
    'shroomlight': 'shroomlight.png', 'magma_block': 'magma.png', 'crying_obsidian': 'crying_obsidian.png',
    'obsidian': 'obsidian.png', 'crimson_nylium': 'crimson_nylium.png', 'warped_nylium': 'warped_nylium.png',
    'nether_wart_block': 'nether_wart_block.png', 'warped_wart_block': 'warped_wart_block.png',
    // === END ===
    'end_stone': 'end_stone.png', 'end_stone_bricks': 'end_stone_bricks.png', 'purpur_block': 'purpur_block.png',
    // === PRISMARINE ===
    'prismarine': 'prismarine.png', 'prismarine_bricks': 'prismarine_bricks.png', 'dark_prismarine': 'dark_prismarine.png', 'sea_lantern': 'sea_lantern.png',
    // === SNOW & ICE ===
    'snow_block': 'snow.png', 'snow': 'snow.png', 'ice': 'ice.png', 'packed_ice': 'packed_ice.png', 'blue_ice': 'blue_ice.png', 'powder_snow': 'powder_snow.png',
    // === LIQUIDS ===
    'water': 'water_still.png', 'flowing_water': 'water_flow.png', 'lava': 'lava_still.png', 'flowing_lava': 'lava_flow.png',
    // === BRICKS ===
    'bricks': 'bricks.png', 'mud_bricks': 'mud_bricks.png', 'packed_mud': 'packed_mud.png',
    // === MISC ===
    'bookshelf': 'bookshelf.png', 'hay_block': 'hay_block_top.png', 'melon': 'melon_top.png',
    'pumpkin': 'pumpkin_top.png', 'carved_pumpkin': 'carved_pumpkin.png', 'jack_o_lantern': 'jack_o_lantern.png',
    'tnt': 'tnt_top.png', 'honeycomb_block': 'honeycomb_block.png', 'honey_block': 'honey_block_top.png',
    'slime_block': 'slime_block.png', 'moss_block': 'moss_block.png', 'sculk': 'sculk.png',
    'sponge': 'sponge.png', 'wet_sponge': 'wet_sponge.png', 'bone_block': 'bone_block_top.png',
    // === FUNCTIONAL ===
    'crafting_table': 'crafting_table_top.png', 'furnace': 'furnace_top.png', 'blast_furnace': 'blast_furnace_top.png',
    'smoker': 'smoker_top.png', 'loom': 'loom_top.png', 'cartography_table': 'cartography_table_top.png',
    'fletching_table': 'fletching_table_top.png', 'smithing_table': 'smithing_table_top.png',
    'stonecutter': 'stonecutter_top.png', 'anvil': 'anvil_top.png', 'enchanting_table': 'enchanting_table_top.png',
    'brewing_stand': 'brewing_stand.png', 'cauldron': 'cauldron_top.png', 'composter': 'composter_top.png',
    'barrel': 'barrel_top.png', 'lectern': 'lectern_top.png', 'jukebox': 'jukebox_top.png',
    'note_block': 'note_block.png', 'observer': 'observer_top.png', 'dispenser': 'dispenser_front.png',
    'dropper': 'dropper_front.png', 'hopper': 'hopper_top.png', 'beacon': 'beacon.png',
    'respawn_anchor': 'respawn_anchor_top_off.png', 'spawner': 'spawner.png',
    // === REDSTONE ===
    'redstone_lamp': 'redstone_lamp.png', 'piston': 'piston_top.png', 'sticky_piston': 'piston_top_sticky.png',
    // === PLANTS ===
    'grass': 'short_grass.png', 'tall_grass': 'tall_grass_top.png', 'fern': 'fern.png', 'dead_bush': 'dead_bush.png',
    'seagrass': 'seagrass.png', 'kelp': 'kelp.png', 'sugar_cane': 'sugar_cane.png', 'bamboo': 'bamboo_stalk.png',
    'cactus': 'cactus_top.png', 'vine': 'vine.png', 'lily_pad': 'lily_pad.png',
    // === FLOWERS ===
    'dandelion': 'dandelion.png', 'poppy': 'poppy.png', 'blue_orchid': 'blue_orchid.png', 'allium': 'allium.png',
    'azure_bluet': 'azure_bluet.png', 'red_tulip': 'red_tulip.png', 'orange_tulip': 'orange_tulip.png',
    'white_tulip': 'white_tulip.png', 'pink_tulip': 'pink_tulip.png', 'oxeye_daisy': 'oxeye_daisy.png',
    'cornflower': 'cornflower.png', 'lily_of_the_valley': 'lily_of_the_valley.png', 'wither_rose': 'wither_rose.png',
    'torchflower': 'torchflower.png', 'sunflower': 'sunflower_top.png', 'lilac': 'lilac_top.png',
    'rose_bush': 'rose_bush_top.png', 'peony': 'peony_top.png',
    // === MUSHROOMS ===
    'brown_mushroom': 'brown_mushroom.png', 'red_mushroom': 'red_mushroom.png',
    'brown_mushroom_block': 'brown_mushroom_block.png', 'red_mushroom_block': 'red_mushroom_block.png',
    'mushroom_stem': 'mushroom_stem.png', 'crimson_fungus': 'crimson_fungus.png', 'warped_fungus': 'warped_fungus.png',
    // === CROPS ===
    'wheat': 'wheat_stage7.png', 'carrots': 'carrots_stage3.png', 'potatoes': 'potatoes_stage3.png',
    'beetroots': 'beetroots_stage3.png', 'sweet_berry_bush': 'sweet_berry_bush_stage3.png', 'nether_wart': 'nether_wart_stage2.png',
    // === SAPLINGS ===
    'oak_sapling': 'oak_sapling.png', 'spruce_sapling': 'spruce_sapling.png', 'birch_sapling': 'birch_sapling.png',
    'jungle_sapling': 'jungle_sapling.png', 'acacia_sapling': 'acacia_sapling.png', 'dark_oak_sapling': 'dark_oak_sapling.png',
    'cherry_sapling': 'cherry_sapling.png', 'mangrove_propagule': 'mangrove_propagule.png',
    // === RAILS ===
    'rail': 'rail.png', 'powered_rail': 'powered_rail.png', 'detector_rail': 'detector_rail.png', 'activator_rail': 'activator_rail.png',
    // === LIGHTS ===
    'torch': 'torch.png', 'soul_torch': 'soul_torch.png', 'redstone_torch': 'redstone_torch.png',
    'lantern': 'lantern.png', 'soul_lantern': 'soul_lantern.png', 'end_rod': 'end_rod.png', 'candle': 'candle.png',
    // === CORAL ===
    'tube_coral_block': 'tube_coral_block.png', 'brain_coral_block': 'brain_coral_block.png',
    'bubble_coral_block': 'bubble_coral_block.png', 'fire_coral_block': 'fire_coral_block.png', 'horn_coral_block': 'horn_coral_block.png',
    // === QUARTZ ===
    'quartz_block': 'quartz_block_top.png', 'quartz_bricks': 'quartz_bricks.png', 'quartz_pillar': 'quartz_pillar_top.png',
    'chiseled_quartz_block': 'chiseled_quartz_block.png', 'smooth_quartz': 'quartz_block_bottom.png',
    // === SHULKER BOXES ===
    'shulker_box': 'shulker_box.png', 'white_shulker_box': 'white_shulker_box.png', 'orange_shulker_box': 'orange_shulker_box.png',
    'magenta_shulker_box': 'magenta_shulker_box.png', 'light_blue_shulker_box': 'light_blue_shulker_box.png',
    'yellow_shulker_box': 'yellow_shulker_box.png', 'lime_shulker_box': 'lime_shulker_box.png',
    'pink_shulker_box': 'pink_shulker_box.png', 'gray_shulker_box': 'gray_shulker_box.png',
    'light_gray_shulker_box': 'light_gray_shulker_box.png', 'cyan_shulker_box': 'cyan_shulker_box.png',
    'purple_shulker_box': 'purple_shulker_box.png', 'blue_shulker_box': 'blue_shulker_box.png',
    'brown_shulker_box': 'brown_shulker_box.png', 'green_shulker_box': 'green_shulker_box.png',
    'red_shulker_box': 'red_shulker_box.png', 'black_shulker_box': 'black_shulker_box.png',
    // === FROGLIGHTS ===
    'ochre_froglight': 'ochre_froglight_top.png', 'verdant_froglight': 'verdant_froglight_top.png', 'pearlescent_froglight': 'pearlescent_froglight_top.png',
    // === DOORS ===
    'oak_door': 'oak_door_bottom.png', 'spruce_door': 'spruce_door_bottom.png', 'birch_door': 'birch_door_bottom.png',
    'jungle_door': 'jungle_door_bottom.png', 'acacia_door': 'acacia_door_bottom.png', 'dark_oak_door': 'dark_oak_door_bottom.png',
    'mangrove_door': 'mangrove_door_bottom.png', 'cherry_door': 'cherry_door_bottom.png', 'bamboo_door': 'bamboo_door_bottom.png',
    'crimson_door': 'crimson_door_bottom.png', 'warped_door': 'warped_door_bottom.png', 'iron_door': 'iron_door_bottom.png',
    // === TRAPDOORS ===
    'oak_trapdoor': 'oak_trapdoor.png', 'spruce_trapdoor': 'spruce_trapdoor.png', 'birch_trapdoor': 'birch_trapdoor.png',
    'jungle_trapdoor': 'jungle_trapdoor.png', 'acacia_trapdoor': 'acacia_trapdoor.png', 'dark_oak_trapdoor': 'dark_oak_trapdoor.png',
    'mangrove_trapdoor': 'mangrove_trapdoor.png', 'cherry_trapdoor': 'cherry_trapdoor.png', 'bamboo_trapdoor': 'bamboo_trapdoor.png',
    'crimson_trapdoor': 'crimson_trapdoor.png', 'warped_trapdoor': 'warped_trapdoor.png', 'iron_trapdoor': 'iron_trapdoor.png',
};

// Helper: Get texture path for block ID
function getTexturePath(blockId) {
    const normalizedId = blockId.replace('minecraft:', '').toLowerCase();

    // 1. Check direct mapping
    if (BLOCK_TEXTURE_MAP[normalizedId]) {
        const texPath = path.join(TEXTURES_DIR, BLOCK_TEXTURE_MAP[normalizedId]);
        if (fs.existsSync(texPath)) return texPath;
    }

    // 2. Try exact file match
    let tryPath = path.join(TEXTURES_DIR, `${normalizedId}.png`);
    if (fs.existsSync(tryPath)) return tryPath;

    // 3. Try common suffixes
    for (const suffix of ['_top.png', '_side.png', '_front.png']) {
        tryPath = path.join(TEXTURES_DIR, `${normalizedId}${suffix}`);
        if (fs.existsSync(tryPath)) return tryPath;
    }

    // 4. Handle derived blocks
    if (normalizedId.includes('_slab')) {
        const base = normalizedId.replace('_slab', '');
        if (BLOCK_TEXTURE_MAP[base]) return path.join(TEXTURES_DIR, BLOCK_TEXTURE_MAP[base]);
        tryPath = path.join(TEXTURES_DIR, `${base}.png`);
        if (fs.existsSync(tryPath)) return tryPath;
        tryPath = path.join(TEXTURES_DIR, `${base}_planks.png`);
        if (fs.existsSync(tryPath)) return tryPath;
    }

    if (normalizedId.includes('_stairs')) {
        const base = normalizedId.replace('_stairs', '');
        if (BLOCK_TEXTURE_MAP[base]) return path.join(TEXTURES_DIR, BLOCK_TEXTURE_MAP[base]);
        tryPath = path.join(TEXTURES_DIR, `${base}.png`);
        if (fs.existsSync(tryPath)) return tryPath;
        tryPath = path.join(TEXTURES_DIR, `${base}_planks.png`);
        if (fs.existsSync(tryPath)) return tryPath;
    }

    if (normalizedId.includes('_wall')) {
        const base = normalizedId.replace('_wall', '');
        if (BLOCK_TEXTURE_MAP[base]) return path.join(TEXTURES_DIR, BLOCK_TEXTURE_MAP[base]);
        tryPath = path.join(TEXTURES_DIR, `${base}.png`);
        if (fs.existsSync(tryPath)) return tryPath;
    }

    if (normalizedId.includes('_fence') && !normalizedId.includes('gate')) {
        const woodType = normalizedId.replace('_fence', '');
        tryPath = path.join(TEXTURES_DIR, `${woodType}_planks.png`);
        if (fs.existsSync(tryPath)) return tryPath;
    }

    if (normalizedId.includes('_fence_gate')) {
        const woodType = normalizedId.replace('_fence_gate', '');
        tryPath = path.join(TEXTURES_DIR, `${woodType}_planks.png`);
        if (fs.existsSync(tryPath)) return tryPath;
    }

    return null;
}

// Helper: Load texture with caching
async function loadBlockTexture(blockId) {
    if (TEXTURE_CACHE.has(blockId)) return TEXTURE_CACHE.get(blockId);

    const texturePath = getTexturePath(blockId);
    if (texturePath) {
        try {
            const img = await loadImage(texturePath);
            TEXTURE_CACHE.set(blockId, img);
            return img;
        } catch (e) {
            console.error(`Failed to load texture for ${blockId}:`, e);
        }
    }

    // Cache null to avoid repeated FS checks
    TEXTURE_CACHE.set(blockId, null);
    return null;
}

function adjustBrightness(hex, factor) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, r * factor));
    g = Math.min(255, Math.max(0, g * factor));
    b = Math.min(255, Math.max(0, b * factor));
    return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
}

// -------------------- MAP IMAGE GENERATOR (PROCEDURAL) --------------------
const { MapRenderer } = require('./MinecraftMapRenderer');
const mapRenderer = new MapRenderer({ scale: 4 }); // 1 block = 4px

async function createMapImage(terrain, playerName, worldInfo, position) {
    try {
        return await mapRenderer.render(terrain, position, worldInfo);
    } catch (e) {
        console.error('[MapRenderer] Error:', e.message);
        // Fallback: return simple error image
        const { createCanvas } = require('canvas');
        const canvas = createCanvas(256, 336);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(0, 0, 256, 336);
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Map Render Error', 50, 150);
        ctx.font = '12px Arial';
        ctx.fillText(e.message.slice(0, 30), 50, 175);
        return canvas.toBuffer('image/png');
    }
}

// -------------------- PLAYER STATS PERSISTENCE --------------------
const PLAYER_STATS_FILE = path.join(__dirname, 'player_stats.json');
const BACKUP_STATS_DIR = path.join(__dirname, 'BACKUPS', 'stats');
const STATS_BACKUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
let lastStatsBackupTime = 0;

function loadPlayerStats() {
    try {
        if (fs.existsSync(PLAYER_STATS_FILE)) {
            const data = fs.readFileSync(PLAYER_STATS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('[PlayerStats] Error loading stats:', e.message);
    }
    return {};
}

function backupPlayerStats(stats) {
    try {
        const now = Date.now();
        if (now - lastStatsBackupTime < STATS_BACKUP_INTERVAL) return;

        if (!fs.existsSync(BACKUP_STATS_DIR)) {
            fs.mkdirSync(BACKUP_STATS_DIR, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupFile = path.join(BACKUP_STATS_DIR, `player_stats_${timestamp}.json`);

        fs.writeFileSync(backupFile, JSON.stringify(stats, null, 2), 'utf-8');
        console.log(`[PlayerStats] Auto-backup created: ${path.basename(backupFile)}`);
        lastStatsBackupTime = now;

        // Cleanup old backups (keep last 50)
        const files = fs.readdirSync(BACKUP_STATS_DIR)
            .filter(f => f.startsWith('player_stats_') && f.endsWith('.json'))
            .sort(); // Oldest first

        if (files.length > 50) {
            const toDelete = files.slice(0, files.length - 50);
            for (const file of toDelete) {
                fs.unlinkSync(path.join(BACKUP_STATS_DIR, file));
            }
            console.log(`[PlayerStats] Cleaned up ${toDelete.length} old backups`);
        }

    } catch (e) {
        console.error('[PlayerStats] Error creating backup:', e.message);
    }
}

function savePlayerStats(stats) {
    try {
        fs.writeFileSync(PLAYER_STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
        backupPlayerStats(stats);
    } catch (e) {
        console.error('[PlayerStats] Error saving stats:', e.message);
    }
}

let playerStatsData = loadPlayerStats();
console.log(`[PlayerStats] Loaded stats for ${Object.keys(playerStatsData).length} players`);

function getOrCreatePlayerStats(playerName) {
    if (!playerStatsData[playerName]) {
        playerStatsData[playerName] = {
            totalBlocksBroken: 0,
            totalBlocksPlaced: 0,
            totalMobsKilled: 0,
            totalDeaths: 0,
            blocksBroken: {},
            blocksPlaced: {},
            mobsKilled: {},
            playTime: 0,
            distanceTraveled: 0,
            lastSeen: Date.now(),
            firstJoin: Date.now()
        };
    }
    // Migration: thêm totalDeaths nếu chưa có (cho player cũ)
    if (playerStatsData[playerName].totalDeaths === undefined) {
        playerStatsData[playerName].totalDeaths = 0;
    }
    return playerStatsData[playerName];
}

// Clear session stats khi player rời server (tránh delta bị cộng sai khi vào lại)
function clearPlayerSession(playerName) {
    lastSessionStats.delete(playerName);
    console.log(`[PlayerStats] Cleared session for ${playerName}`);
}

// -------------------- LINKED ACCOUNTS (Discord <-> Minecraft) --------------------
const LINKED_ACCOUNTS_FILE = path.join(__dirname, 'linked_accounts.json');

function loadLinkedAccounts() {
    try {
        if (fs.existsSync(LINKED_ACCOUNTS_FILE)) {
            const data = fs.readFileSync(LINKED_ACCOUNTS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('[LinkedAccounts] Error loading:', e.message);
    }
    return {};
}

function saveLinkedAccounts(accounts) {
    try {
        fs.writeFileSync(LINKED_ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
    } catch (e) {
        console.error('[LinkedAccounts] Error saving:', e.message);
    }
}

let linkedAccounts = loadLinkedAccounts();
console.log(`[LinkedAccounts] Loaded ${Object.keys(linkedAccounts).length} linked accounts`);

function getLinkedMinecraftName(discordId) {
    return linkedAccounts[discordId] || null;
}

function setLinkedAccount(discordId, minecraftName) {
    linkedAccounts[discordId] = minecraftName;
    saveLinkedAccounts(linkedAccounts);
}

// Track last known session stats per player (delta tracking)
const lastSessionStats = new Map();

// Helper to calculate delta and update lifetime stats
function updateStatDelta(currentVal, lastTypeStats, key, lifetimeStats, lifetimeKey) {
    const current = currentVal || 0;
    const last = lastTypeStats[key] || 0;

    // Calculate delta
    let delta = current - last;

    // If delta < 0, it means session reset (server restart or rejoin)
    // So delta is just the current value
    if (delta < 0) {
        delta = current;
    }

    if (delta > 0) {
        lifetimeStats[lifetimeKey] = (lifetimeStats[lifetimeKey] || 0) + delta;
    }

    // Update last known value
    lastTypeStats[key] = current;
}

// Helper to calculate delta for object maps (details)
function updateDetailsDelta(currentDetails, lastTypeStats, key, lifetimeStats, lifetimeKey) {
    const currentMap = currentDetails || {};
    const lastMap = lastTypeStats[key] || {};
    const lifetimeMap = lifetimeStats[lifetimeKey] || {};

    // Iterate over all keys in the current session map
    for (const [item, count] of Object.entries(currentMap)) {
        const lastCount = lastMap[item] || 0;
        let delta = count - lastCount;

        // Session reset detection
        if (delta < 0) {
            delta = count;
        }

        if (delta > 0) {
            lifetimeMap[item] = (lifetimeMap[item] || 0) + delta;
        }
    }

    // Save current map as last known state for this session
    lastTypeStats[key] = { ...currentMap }; // Clone to avoid ref issues
    lifetimeStats[lifetimeKey] = lifetimeMap;
}

function updatePlayerStats(playerName, stats) {
    const ps = getOrCreatePlayerStats(playerName);
    ps.lastSeen = Date.now();

    // Get last session state or initialize
    let lastStats = lastSessionStats.get(playerName);

    if (!lastStats) {
        // First time seeing this player since bot start
        // To avoid double counting (if bot restarted but server didn't), 
        // we initialize 'last' with 'current' so delta is 0 for this first packet.
        // UNLESS it's a fresh server start (current starts at 0 or small), but we can't distinguish easily.
        // Safe bet: Assume existing session stats are already in DB, so ignore initial backlog.
        lastStats = {
            blocksBroken: stats.blocksBroken || 0,
            blocksPlaced: stats.blocksPlaced || 0,
            mobsKilled: stats.mobsKilled || 0,
            playTimeSeconds: stats.playTimeSeconds || 0,
            distanceTraveled: stats.distanceTraveled || 0,
            blocksBrokenDetails: { ...(stats.blocksBrokenDetails || {}) },
            blocksPlacedDetails: { ...(stats.blocksPlacedDetails || {}) },
            mobsKilledDetails: { ...(stats.mobsKilledDetails || {}) }
        };
        lastSessionStats.set(playerName, lastStats);

        // We do NOT update ps (lifetime) here because we assume they are already saved.
        // We only start counting *changes* from now on.
        return;
    }

    // --- SCALAR STATS ---
    updateStatDelta(stats.blocksBroken, lastStats, 'blocksBroken', ps, 'totalBlocksBroken');
    updateStatDelta(stats.blocksPlaced, lastStats, 'blocksPlaced', ps, 'totalBlocksPlaced');
    updateStatDelta(stats.mobsKilled, lastStats, 'mobsKilled', ps, 'totalMobsKilled');
    updateStatDelta(stats.deaths, lastStats, 'deaths', ps, 'totalDeaths');

    // --- SPECIAL STATS (PlayTime & Distance) ---
    updateStatDelta(stats.playTimeSeconds, lastStats, 'playTimeSeconds', ps, 'playTime');
    updateStatDelta(stats.distanceTraveled, lastStats, 'distanceTraveled', ps, 'distanceTraveled');

    // --- DETAILED OBJECT STATS ---
    updateDetailsDelta(stats.blocksBrokenDetails, lastStats, 'blocksBrokenDetails', ps, 'blocksBroken');
    updateDetailsDelta(stats.blocksPlacedDetails, lastStats, 'blocksPlacedDetails', ps, 'blocksPlaced');
    updateDetailsDelta(stats.mobsKilledDetails, lastStats, 'mobsKilledDetails', ps, 'mobsKilled');

    savePlayerStats(playerStatsData);
}


function getTopItems(obj, limit = 5) {
    return Object.entries(obj || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name: name.replace(/_/g, ' '), count }));
}

// -------------------- CẤU HÌNH (THAY TOKEN TẠI ĐÂY) --------------------
const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    AI_API_KEY: process.env.GROQ_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SERVER_IP: "gamma.pikamc.vn",
    SERVER_PORT: 25825,
    CHANNEL_ID: "1444295473010708634",
    STATS_CHANNEL_ID: "1444295473010708634",   // Channel để gửi bảng online
    ADMIN_ID: "1236913437737750538",
    VIDEO_DOWNLOAD_CHANNEL_ID: "1447928180307656724", // Channel để tải video (YouTube, TikTok, Facebook)
    ROLE_TO_TAG: "",
    UPDATE_INTERVAL: 1, // seconds
    FUNNY_MOTDS: [
        "Vào chơi đi đừng ngại!",
        "Cẩn thận Creeper sau lưng!",
        "Đập cây lấy gỗ nào!",
        "Admin đang theo dõi bạn đấy...",
        "Chúc bạn chơi game vui vẻ!",
        "Đừng quên vote cho server nhé!",
        "Kim cương đang chờ bạn!"
    ],
    CHANNEL_NAME_COOLDOWN_MS: 30_000, // giới hạn update tên kênh
    MAX_EMBED_UPDATE_AGE_MS: 60_000, // hạn chế edit cache
    MAX_BACKUP_SIZE_MB: 10,          // Giới hạn file backup (Discord thường: 10MB, Nitro: 50-100MB)
    // Telegram Backup Config
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_BACKUP_CHAT_ID: "7155481287",     // Điền Chat ID nhận file vào đây
    // Addon HTTP Server
    ADDON_HTTP_PORT: 8080,
    ADDON_SECRET_KEY: "minecraft-discord-sync-2024",
    // Pterodactyl Panel API
    PTERODACTYL_URL: "https://cp.pikamc.vn",
    PTERODACTYL_API_KEY: process.env.PTERODACTYL_API_KEY,
    PTERODACTYL_SERVER_ID: "fc65569d",  // First 8 chars of full UUID
    // SFTP Config
    SFTP_HOST: "gamma.pikamc.vn",
    SFTP_PORT: 2022,
    SFTP_USER: "user0auq3d9s.fc65569d",
    SFTP_PASSWORD: process.env.SFTP_PASSWORD,
    SFTP_WORLD_PATH: "/worlds/Bedrock level",
    // Backup Channel
    BACKUP_CHANNEL_ID: "1448259773081452634",
    // Player Stats Channel
    PLAYER_STATS_CHANNEL_ID: "1447929275247497218",
    // Chat In-Game Channel (2-way: Discord <-> Minecraft)
    CHAT_INGAME_CHANNEL_ID: "1447929348223930429",
    // Info Channel (Link Discord <-> Minecraft name)
    INFO_CHANNEL_ID: "1470253579070869596",
    // Leaderboard Forum Channel
    LEADERBOARD_CHANNEL_ID: "1472612447532613763",
    // Welcome & Goodbye Channels
    WELCOME_CHANNEL_ID: "1468460316559020102",
    GOODBYE_CHANNEL_ID: "1468460878931296568"
};

// -------------------- CLIENT --------------------
const client = new Client({
    intents: 3276799, // ALL INTENTS
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    restTimeOffset: 0
});

// -------------------- AI SETUP WITH GROQ --------------------
// Groq API - LLaMA 3.3 70B
const AI_MODELS = [
    'llama-3.3-70b-versatile',        // Model chính - 70B
    'llama-3.1-8b-instant',           // Model phụ (nhanh)
    'mixtral-8x7b-32768',             // Model backup
];

let currentModelIndex = 0;
let modelErrorCounts = {};
let lastModelSwitch = 0;

function getCurrentModelName() {
    return AI_MODELS[currentModelIndex] || AI_MODELS[0];
}

function switchToNextModel() {
    const oldModel = getCurrentModelName();
    currentModelIndex = (currentModelIndex + 1) % AI_MODELS.length;
    lastModelSwitch = Date.now();
    console.log(`[AI] Switching from ${oldModel} to ${getCurrentModelName()} due to rate limit`);
    return getCurrentModelName();
}

function resetToMainModel() {
    if (currentModelIndex !== 0 && Date.now() - lastModelSwitch > 60000) {
        console.log(`[AI] Resetting to main model: ${AI_MODELS[0]}`);
        currentModelIndex = 0;
        modelErrorCounts = {};
    }
}

setInterval(resetToMainModel, 120000);

// System instruction cho AI
const AI_SYSTEM_INSTRUCTION = `Bạn là trợ lý ảo của server Minecraft "One Block Bedrock" (IP: ${CONFIG.SERVER_IP}, Port: ${CONFIG.SERVER_PORT}).
Phong cách: Vui vẻ, ngắn gọn, dùng emoji .
Luật server:
1. Không Hack/Cheat.
2. Không Spam/Chửi tục.
3. Không Phá hoại.
4. Không Quảng cáo.

HƯỚNG DẪN HÀNH ĐỘNG (Quan trọng):
1. **AUTO-MOD:** Nếu phát hiện tin nhắn có nội dung xấu (chửi thề, xúc phạm, 18+, quảng cáo server khác), hãy trả về: [ACTION: DELETE_BAD_WORD] kèm một câu nhắc nhở nhẹ nhàng.
2. **VISION:** Nếu người dùng gửi ảnh:
   - Ảnh công trình: Khen ngợi, nhận xét chi tiết.
   - Ảnh Skin: Chấm điểm trên thang 10, nhận xét phối màu.
   - Ảnh Log lỗi: Phân tích nguyên nhân.
3. **LỆNH KHÁC:**
   - Xóa tin nhắn: [ACTION: CLEAR <số lượng>]
   - Xem trạng thái: [ACTION: STATUS]
   - Xem luật: [ACTION: RULES]

4. **KIẾN THỨC (WIKI & REDSTONE):**
   - Nếu hỏi về công thức chế tạo (Wiki): Hãy trả lời dựa trên kiến thức Minecraft Bedrock mới nhất.
   - Nếu hỏi về Redstone: Giải thích nguyên lý đơn giản, dễ hiểu.

5. **TIỆN ÍCH:**
   - **Thông Dịch:** Nếu user chat ngôn ngữ khác tiếng Việt (Anh, Trung, Nhật...), hãy tự động dịch sang tiếng Việt và trả lời song ngữ.
   - **Phân Tích Log:** Nếu user gửi đoạn text giống log server (có timestamp, [INFO], [ERROR]...), hãy phân tích lỗi và gợi ý cách sửa.
   - **Gợi Ý Event:** Nếu hỏi về ý tưởng event, hãy gợi ý các trò chơi vui nhộn trong Minecraft (Đua thuyền, Spleef, PvP, Xây dựng...).

Ví dụ:
User: "Server như hạch, đm admin"
Bot: "Bạn vui lòng ăn nói lịch sự nha! 😡 [ACTION: DELETE_BAD_WORD]"
`;

// Hàm gọi Groq AI API trực tiếp
async function callGroqAI(userMessage, systemPrompt = AI_SYSTEM_INSTRUCTION, conversationHistory = []) {
    const maxRetries = Math.min(AI_MODELS.length, 2);
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const modelName = getCurrentModelName();

            // Build messages array
            const messages = [
                { role: 'system', content: systemPrompt }
            ];

            // Add conversation history if any
            if (conversationHistory.length > 0) {
                messages.push(...conversationHistory);
            }

            // Add current user message
            messages.push({ role: 'user', content: userMessage });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CONFIG.AI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 2048,
                    top_p: 1
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Groq API Error ${response.status}: ${errorData}`);
            }

            const data = await response.json();
            const aiResponse = data.choices?.[0]?.message?.content || '';

            // Success - reset error count
            modelErrorCounts[getCurrentModelName()] = 0;

            return {
                text: () => aiResponse,
                response: data
            };

        } catch (error) {
            lastError = error;
            console.error(`[AI] Error with ${getCurrentModelName()}:`, error.message);

            if (error.message?.includes('429') ||
                error.message?.includes('rate') ||
                error.message?.includes('Too Many') ||
                error.name === 'AbortError') {

                modelErrorCounts[getCurrentModelName()] = (modelErrorCounts[getCurrentModelName()] || 0) + 1;
                switchToNextModel();
                console.log(`[AI] Retrying with model: ${getCurrentModelName()}`);
            } else {
                throw error;
            }
        }
    }

    throw lastError || new Error('All AI models exhausted');
}

// Hàm gọi Gemini Vision API (cho xử lý ảnh - dùng Gemini 2.5 Flash Lite)
async function callGeminiVision(prompt, imageBase64, mimeType) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: imageBase64
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 1024
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Gemini Vision Error ${response.status}: ${errorData}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    } catch (error) {
        console.error('[Gemini Vision] Error:', error.message);
        throw error;
    }
}

// Wrapper để tương thích với code cũ (callAIWithFallback)
async function callAIWithFallback(generateFn, timeoutMs = 30000) {
    // Wrapper này không còn cần thiết nhưng giữ lại để tương thích
    // Sẽ gọi trực tiếp callGroqAI trong các hàm khác
    return { text: () => "Deprecated - use callGroqAI directly" };
}

// Model placeholder (không còn dùng genAI)
let model = null;

// -------------------- STATE --------------------
const chatSessions = new Map(); // Lưu lịch sử chat: userId -> ChatSession
let lastPlayerCount = -1;
let isFirstRun = true;
let serverStartTime = null;
let lastClearDay = -1;
let lastOnlineState = null;
let maintenanceMode = false;
let lastChannelNameUpdate = 0;
let lastDashboardMessageId = null;
let lastStatus = { online: false };
let lastKnownPlayerList = []; // lưu tên người chơi nếu server trả về
let consecutiveHighPingCount = 0;

// -------------------- ADDON DATA --------------------
let addonPlayerData = {          // Dữ liệu realtime từ addon
    players: [],
    lastUpdate: null,
    connected: false
};
let addonChatLog = [];           // Log chat từ addon (giữ 50 tin gần nhất)
let addonMessageQueue = [];      // Queue tin nhắn/lệnh gửi xuống addon
let pendingMapRequests = new Map(); // Map<playerName, { channelId, messageId, startTime }>
let lastBackupTime = Date.now();    // Thời điểm backup cuối cùng
let backupDebounceTimeout = null;   // Timeout để chờ gom sự kiện backup

// -------------------- PENDING LINK CODES (ID 4 SỐ) --------------------
let pendingLinkCodes = new Map();  // Map<code4digit, { discordId, discordTag, createdAt }>

// Tạo ID 4 số ngẫu nhiên không trùng
function generateLinkCode(discordId, discordTag) {
    // Xóa code cũ của discordId nếu có
    for (const [code, data] of pendingLinkCodes) {
        if (data.discordId === discordId) {
            pendingLinkCodes.delete(code);
            break;
        }
    }

    // Tạo code 4 số mới không trùng
    let code;
    do {
        code = String(Math.floor(1000 + Math.random() * 9000)); // 1000-9999
    } while (pendingLinkCodes.has(code));

    pendingLinkCodes.set(code, {
        discordId: discordId,
        discordTag: discordTag,
        createdAt: Date.now()
    });

    // Tự động xóa sau 10 phút
    setTimeout(() => pendingLinkCodes.delete(code), 10 * 60 * 1000);

    console.log(`[Link] Created code ${code} for Discord ${discordTag} (${discordId})`);
    return code;
}

// Xử lý lệnh !lienket từ game
function handleLinkCommand(playerName, codeStr) {
    const code = codeStr.trim();
    const pending = pendingLinkCodes.get(code);

    if (!pending) {
        return { success: false, message: `❌ ID "${code}" không tồn tại hoặc đã hết hạn!` };
    }

    // Liên kết tài khoản
    setLinkedAccount(pending.discordId, playerName);
    pendingLinkCodes.delete(code);

    console.log(`[Link] Linked ${playerName} <-> Discord ${pending.discordTag} (${pending.discordId})`);
    return {
        success: true,
        message: `✅ Đã liên kết ${playerName} với @${pending.discordTag}!`,
        discordId: pending.discordId,
        discordTag: pending.discordTag
    };
}

// -------------------- LINK BUTTON MESSAGE TRACKING --------------------
const LINK_CHANNEL_ID = '1470253579070869596'; // Channel cho nút liên kết
const LINK_BUTTON_FILE = path.join(__dirname, 'link_button_data.json');

// Load persistent linkButtonMessageId
function loadLinkButtonId() {
    try {
        if (fs.existsSync(LINK_BUTTON_FILE)) {
            const data = JSON.parse(fs.readFileSync(LINK_BUTTON_FILE, 'utf-8'));
            return data.messageId || null;
        }
    } catch (e) { }
    return null;
}
function saveLinkButtonId(id) {
    try {
        fs.writeFileSync(LINK_BUTTON_FILE, JSON.stringify({ messageId: id }, null, 2), 'utf-8');
    } catch (e) { }
}
let linkButtonMessageId = loadLinkButtonId();

// -------------------- PLAYER DASHBOARD (CHANNEL DIỄN ĐÀN) --------------------
const PLAYER_INFO_CHANNEL_ID = '1470262465471189034'; // Channel diễn đàn - hiển thị thông tin player
let dashboardMessages = new Map(); // Map<playerName, { messageId, threadId, lastUpdate }>
let lastDashboardUpdate = 0; // Debounce
const DASHBOARD_UPDATE_INTERVAL = 60000; // Cập nhật tối đa mỗi 60 giây (1 phút)

// -------------------- PLAYER LIST MESSAGE --------------------
let playerListMessageId = null; // Message ID của tin nhắn danh sách player
const PLAYER_LIST_CHANNEL_ID = '1470262465471189034'; // Cùng channel forum hoặc channel khác

// Function cập nhật danh sách player với link đến thread
async function updatePlayerListMessage() {
    try {
        const listChannel = await client.channels.fetch(PLAYER_INFO_CHANNEL_ID).catch(() => null);
        if (!listChannel) return;

        // Build danh sách với link
        let playerList = '';
        let count = 0;
        console.log(`[PlayerList] dashboardMessages size: ${dashboardMessages.size}`);
        for (const [playerName, data] of dashboardMessages) {
            console.log(`[PlayerList] Player: ${playerName}, threadId: ${data.threadId}`);
            if (data.threadId) {
                // Tạo hyperlink: [tên](link_thread)
                playerList += `• [${playerName}](https://discord.com/channels/${listChannel.guildId}/${data.threadId})\n`;
                count++;
            }
        }

        if (count === 0) {
            playerList = '*Chưa có người chơi*';
        }

        const listEmbed = new EmbedBuilder()
            .setTitle('📋 DANH SÁCH NGƯỜI CHƠI')
            .setDescription(playerList)
            .setColor(0x3498DB)
            .setFooter({ text: `Tổng: ${count} người chơi` })
            .setTimestamp();

        // Tìm channel text để gửi danh sách (dùng channel liên kết)
        const linkChannel = await client.channels.fetch(LINK_CHANNEL_ID).catch(() => null);
        if (!linkChannel || !linkChannel.send) return;

        if (playerListMessageId) {
            // Edit tin nhắn cũ
            try {
                const oldMsg = await linkChannel.messages.fetch(playerListMessageId);
                await oldMsg.edit({ embeds: [listEmbed] });
            } catch (e) {
                // Tin nhắn bị xóa, tạo mới
                const newMsg = await linkChannel.send({ embeds: [listEmbed] });
                playerListMessageId = newMsg.id;
            }
        } else {
            // Tạo tin nhắn mới
            const newMsg = await linkChannel.send({ embeds: [listEmbed] });
            playerListMessageId = newMsg.id;
        }
        console.log('[PlayerList] Updated player list message');
    } catch (err) {
        console.error('[PlayerList] Error:', err.message);
    }
}


// Function cập nhật dashboard cho tất cả players online
// forceUpdate = true để bỏ qua debounce (dùng khi player join/leave)
async function updatePlayerDashboards(players, forceUpdate = false) {
    try {
        const now = Date.now();
        // Debounce - không cập nhật quá nhanh (trừ khi force)
        if (!forceUpdate && now - lastDashboardUpdate < DASHBOARD_UPDATE_INTERVAL) return;
        lastDashboardUpdate = now;

        let infoChannel = null;
        try {
            infoChannel = await client.channels.fetch(PLAYER_INFO_CHANNEL_ID).catch(() => null);
            console.log(`[Dashboard] Found channel: ${infoChannel?.name || 'unknown'}, type: ${infoChannel?.type}`);
        } catch (fetchErr) {
            console.log(`[Dashboard] Fetch error: ${fetchErr.message}`);
            return;
        }

        if (!infoChannel) {
            console.log(`[Dashboard] Channel not found: ${PLAYER_INFO_CHANNEL_ID}`);
            return;
        }

        // Kiểm tra xem channel có phải Forum (type 15) không
        const isForumChannel = infoChannel.type === 15;

        if (!isForumChannel && typeof infoChannel.send !== 'function') {
            console.log(`[Dashboard] Text channel invalid. ID: ${PLAYER_INFO_CHANNEL_ID}`);
            return;
        }

        console.log(`[Dashboard] Using ${isForumChannel ? 'Forum' : 'Text'} channel`);

        // Cập nhật/tạo dashboard cho từng player
        for (const player of players) {
            try {
                // Tìm Discord tag nếu đã liên kết
                let discordTag = null;
                for (const [discordId, mcName] of Object.entries(linkedAccounts)) {
                    if (mcName.toLowerCase() === player.name.toLowerCase()) {
                        try {
                            const user = await client.users.fetch(discordId);
                            discordTag = user.username;
                        } catch (e) { /* ignore */ }
                        break;
                    }
                }

                // Render embeds
                const embeds = DashboardRenderer.render(player, {
                    discordTag: discordTag,
                    isOnline: true
                });

                const existingDashboard = dashboardMessages.get(player.name);

                if (isForumChannel) {
                    // === FORUM CHANNEL: Tạo/tìm thread cho player ===
                    let thread = null;

                    if (existingDashboard && existingDashboard.threadId) {
                        // Tìm thread cũ
                        try {
                            thread = await infoChannel.threads.fetch(existingDashboard.threadId);
                        } catch (e) {
                            thread = null;
                        }
                    }

                    if (!thread) {
                        // Tìm thread theo tên player trong active threads
                        const activeThreads = await infoChannel.threads.fetchActive();
                        thread = activeThreads.threads.find(t => t.name.toLowerCase().includes(player.name.toLowerCase()));
                    }

                    if (!thread) {
                        // Tạo thread mới trong forum
                        thread = await infoChannel.threads.create({
                            name: `${player.name}`,
                            message: { embeds },
                            autoArchiveDuration: 10080 // 7 days
                        });
                        dashboardMessages.set(player.name, {
                            threadId: thread.id,
                            messageId: thread.id, // First message ID = thread ID
                            lastUpdate: now,
                            lastKnownData: player
                        });
                        console.log(`[Dashboard] Created forum thread for ${player.name}`);
                    } else {
                        // Cập nhật tin nhắn đầu tiên trong thread
                        try {
                            const starterMessage = await thread.fetchStarterMessage();
                            if (starterMessage) {
                                await starterMessage.edit({ embeds });
                                dashboardMessages.set(player.name, {
                                    threadId: thread.id,
                                    messageId: starterMessage.id,
                                    lastUpdate: now,
                                    lastKnownData: player
                                });
                                console.log(`[Dashboard] Updated forum thread for ${player.name}`);
                            }
                        } catch (e) {
                            console.log(`[Dashboard] Could not update starter message for ${player.name}: ${e.message}`);
                        }
                    }
                } else {
                    // === TEXT CHANNEL: Logic cũ ===
                    if (existingDashboard && existingDashboard.messageId) {
                        try {
                            const msg = await infoChannel.messages.fetch(existingDashboard.messageId);
                            await msg.edit({ embeds });
                            dashboardMessages.set(player.name, { messageId: existingDashboard.messageId, lastUpdate: now, lastKnownData: player });
                            console.log(`[Dashboard] Updated ${player.name}`);
                        } catch (e) {
                            const newMsg = await infoChannel.send({ embeds });
                            dashboardMessages.set(player.name, { messageId: newMsg.id, lastUpdate: now, lastKnownData: player });
                            console.log(`[Dashboard] Recreated ${player.name}`);
                        }
                    } else {
                        const newMsg = await infoChannel.send({ embeds });
                        dashboardMessages.set(player.name, { messageId: newMsg.id, lastUpdate: now, lastKnownData: player });
                        console.log(`[Dashboard] Created ${player.name}`);
                    }
                }
            } catch (playerErr) {
                console.error(`[Dashboard] Error for ${player.name}:`, playerErr.message);
            }
        }

        // Đánh dấu offline cho players không còn online (chỉ cho text channel)
        if (!isForumChannel) {
            const onlineNames = new Set(players.map(p => p.name.toLowerCase()));
            for (const [playerName, data] of dashboardMessages) {
                if (!onlineNames.has(playerName.toLowerCase())) {
                    try {
                        const msg = await infoChannel.messages.fetch(data.messageId);
                        const offlineEmbeds = DashboardRenderer.render(
                            data.lastKnownData || { name: playerName, health: 20, position: { x: 0, y: 0, z: 0 } },
                            { isOnline: false, lastOnlineTime: data.lastUpdate }
                        );
                        await msg.edit({ embeds: offlineEmbeds });
                    } catch (e) { /* ignore */ }
                }
            }
        }

        // Không gửi danh sách vào channel liên kết - đã có link trong List online rồi
        // await updatePlayerListMessage();

    } catch (err) {
        console.error('[Dashboard] Update error:', err.message);
    }
}

// Function đánh dấu player offline trong forum thread
async function markPlayerOffline(playerName) {
    try {
        const existingDashboard = dashboardMessages.get(playerName);
        if (!existingDashboard || !existingDashboard.threadId) {
            console.log(`[Dashboard] No thread found for ${playerName} to mark offline`);
            return;
        }

        const infoChannel = await client.channels.fetch(PLAYER_INFO_CHANNEL_ID).catch(() => null);
        if (!infoChannel || infoChannel.type !== 15) return;

        // Lưu thời gian offline nếu chưa có
        if (!existingDashboard.lastOnlineTime) {
            existingDashboard.lastOnlineTime = Date.now();
            dashboardMessages.set(playerName, existingDashboard);
        }

        // Tìm thread
        let thread = null;
        try {
            thread = await infoChannel.threads.fetch(existingDashboard.threadId);
        } catch (e) {
            console.log(`[Dashboard] Thread not found for ${playerName}`);
            return;
        }

        if (!thread) return;

        // Tìm Discord tag
        let discordTag = null;
        for (const [discordId, mcName] of Object.entries(linkedAccounts)) {
            if (mcName.toLowerCase() === playerName.toLowerCase()) {
                try {
                    const user = await client.users.fetch(discordId);
                    discordTag = user.username;
                } catch (e) { }
                break;
            }
        }

        // Render embeds với isOnline: false và thời gian offline
        const playerState = existingDashboard.lastKnownData || { name: playerName, health: 20, position: { x: 0, y: 0, z: 0 }, stats: {}, worldInfo: {} };
        const embeds = DashboardRenderer.render(
            playerState,
            {
                discordTag,
                isOnline: false,
                lastOnlineTime: existingDashboard.lastOnlineTime
            }
        );

        // Cập nhật starter message
        try {
            const starterMessage = await thread.fetchStarterMessage();
            if (starterMessage) {
                await starterMessage.edit({ embeds });
                console.log(`[Dashboard] Marked ${playerName} as OFFLINE (since ${new Date(existingDashboard.lastOnlineTime).toLocaleTimeString()})`);
            }
        } catch (e) {
            console.log(`[Dashboard] Could not update offline status for ${playerName}: ${e.message}`);
        }
    } catch (err) {
        console.error('[Dashboard] Mark offline error:', err.message);
    }
}

// Function cập nhật trạng thái offline định kỳ
async function updateOfflineDashboards() {
    try {
        const now = Date.now();
        const onlineNames = new Set(addonPlayerData.players.map(p => p.name.toLowerCase()));

        for (const [playerName, data] of dashboardMessages) {
            // Chỉ cập nhật nếu player đang offline (có lastOnlineTime) và KHÔNG có trong danh sách online hiện tại
            if (data.lastOnlineTime && !onlineNames.has(playerName.toLowerCase())) {
                // Cập nhật lại dashboard offline để refresh thời gian "Online X phút trước"
                await markPlayerOffline(playerName);
            }
        }
    } catch (err) {
        console.error('[Dashboard] Update offline error:', err.message);
    }
}

// -------------------- LEADERBOARD FORUM --------------------
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard_data.json');

// Leaderboard images (Minecraft themed)
const LEADERBOARD_IMAGES = {
    playTime: 'https://cdn3.emoji.gg/emojis/1201-animated-clock.png',
    distance: 'https://cdn3.emoji.gg/emojis/5690-minecraft-spyglass-steve.png',
    blocks: 'https://cdn3.emoji.gg/emojis/1405-diamond-pickaxe.png',
    kills: 'https://cdn3.emoji.gg/emojis/1405-diamond-sword.png',
    deaths: 'https://cdn3.emoji.gg/emojis/1405-diamond-sword.png',
    blocksPlaced: 'https://cdn3.emoji.gg/emojis/1405-diamond-pickaxe.png'
};

function loadLeaderboardData() {
    try {
        if (fs.existsSync(LEADERBOARD_FILE)) {
            return JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('[Leaderboard] Error loading data:', e.message);
    }
    return { threads: {} };
}

function saveLeaderboardData(data) {
    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('[Leaderboard] Error saving data:', e.message);
    }
}

let leaderboardData = loadLeaderboardData();

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins} phút`;
}

function formatNumber(num) {
    return Math.round(num).toLocaleString('vi-VN');
}

function getMedalEmoji(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `\`${String(rank).padStart(2, '0')}\``;
}

function getPlayerThreadLink(playerName, guildId) {
    const data = dashboardMessages.get(playerName);
    if (data && data.threadId) {
        return `[${playerName}](https://discord.com/channels/${guildId}/${data.threadId})`;
    }
    return `\`${playerName}\``;
}

async function updateLeaderboard() {
    try {
        const channel = await client.channels.fetch(CONFIG.LEADERBOARD_CHANNEL_ID).catch(() => null);
        if (!channel) {
            console.error('[Leaderboard] Channel not found:', CONFIG.LEADERBOARD_CHANNEL_ID);
            return;
        }

        const guildId = channel.guildId;
        const allPlayers = Object.entries(playerStatsData);
        if (allPlayers.length === 0) return;

        // Define leaderboard categories
        const categories = [
            {
                key: 'playTime',
                title: 'TOP GIỜ CHƠI',
                color: 0x3498DB,
                image: LEADERBOARD_IMAGES.playTime,
                getValue: (stats) => stats.playTime || 0,
                formatValue: (val) => `đã chơi **${formatTime(val)}**`,
                sortDesc: true
            },
            {
                key: 'distance',
                title: 'TOP DI CHUYỂN',
                color: 0x2ECC71,
                image: LEADERBOARD_IMAGES.distance,
                getValue: (stats) => stats.distanceTraveled || 0,
                formatValue: (val) => `đã di chuyển **${formatNumber(val)} block**`,
                sortDesc: true
            },
            {
                key: 'blocks',
                title: 'TOP ĐÀO BLOCK',
                color: 0xE67E22,
                image: LEADERBOARD_IMAGES.blocks,
                getValue: (stats) => stats.totalBlocksBroken || 0,
                formatValue: (val) => `đã đào **${formatNumber(val)} block**`,
                sortDesc: true
            },
            {
                key: 'kills',
                title: 'TOP KILL',
                color: 0xE74C3C,
                image: LEADERBOARD_IMAGES.kills,
                getValue: (stats) => stats.totalMobsKilled || 0,
                formatValue: (val) => `đã kill **${formatNumber(val)} xác**`,
                sortDesc: true
            },
            {
                key: 'deaths',
                title: 'TOP CHẾT',
                color: 0x95A5A6,
                image: LEADERBOARD_IMAGES.deaths,
                getValue: (stats) => stats.totalDeaths || 0,
                formatValue: (val) => `đã chết **${formatNumber(val)} lần**`,
                sortDesc: true
            },
            {
                key: 'blocksPlaced',
                title: 'TOP ĐẶT BLOCK',
                color: 0x9B59B6,
                image: LEADERBOARD_IMAGES.blocksPlaced,
                getValue: (stats) => stats.totalBlocksPlaced || 0,
                formatValue: (val) => `đã đặt **${formatNumber(val)} block**`,
                sortDesc: true
            }
        ];

        for (const cat of categories) {
            try {
                // Sort players by category value
                const sorted = allPlayers
                    .map(([name, stats]) => ({ name, value: cat.getValue(stats) }))
                    .filter(p => p.value > 0)
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10);

                if (sorted.length === 0) continue;

                // Build leaderboard text
                let description = '';
                sorted.forEach((player, index) => {
                    const medal = getMedalEmoji(index + 1);
                    const playerLink = getPlayerThreadLink(player.name, guildId);
                    description += `${medal} │ ${playerLink}: ${cat.formatValue(player.value)}\n`;
                });

                description += `\n*Cập nhật lúc <t:${Math.floor(Date.now() / 1000)}:R>*`;

                const embed = new EmbedBuilder()
                    .setTitle(cat.title)
                    .setDescription(description)
                    .setColor(cat.color)
                    .setTimestamp();

                const embeds = [embed];

                // Thêm Button xem chi tiết cho categories kills và blocks
                let components = [];
                if (cat.key === 'kills') {
                    const detailBtn = new ButtonBuilder()
                        .setCustomId('view_kill_details')
                        .setLabel('🔍 Xem chi tiết Kill')
                        .setStyle(ButtonStyle.Primary);
                    components = [new ActionRowBuilder().addComponents(detailBtn)];
                } else if (cat.key === 'blocks') {
                    const detailBtn = new ButtonBuilder()
                        .setCustomId('view_block_details')
                        .setLabel('🔍 Xem chi tiết Block đào')
                        .setStyle(ButtonStyle.Primary);
                    components = [new ActionRowBuilder().addComponents(detailBtn)];
                }

                // Create or update forum thread
                const threadId = leaderboardData.threads[cat.key];

                if (threadId) {
                    try {
                        const thread = await channel.threads.fetch(threadId);
                        if (thread) {
                            const starterMessage = await thread.fetchStarterMessage();
                            if (starterMessage) {
                                const editPayload = { embeds };
                                if (components.length > 0) editPayload.components = components;
                                await starterMessage.edit(editPayload);
                                console.log(`[Leaderboard] Updated: ${cat.title}`);
                                continue;
                            }
                        }
                    } catch (e) {
                        console.log(`[Leaderboard] Thread ${cat.key} not found, creating new...`);
                    }
                }

                // Create new thread
                const threadPayload = { embeds };
                if (components.length > 0) threadPayload.components = components;
                const thread = await channel.threads.create({
                    name: cat.title,
                    message: threadPayload,
                    autoArchiveDuration: 10080
                });

                leaderboardData.threads[cat.key] = thread.id;
                saveLeaderboardData(leaderboardData);
                console.log(`[Leaderboard] Created thread: ${cat.title} (${thread.id})`);

            } catch (catErr) {
                console.error(`[Leaderboard] Error updating ${cat.key}:`, catErr.message);
            }
        }

        console.log('[Leaderboard] Update complete');
    } catch (err) {
        console.error('[Leaderboard] Error:', err.message);
    }
}

// Cập nhật leaderboard mỗi 5 phút
setInterval(updateLeaderboard, 5 * 60 * 1000); // 5 phút


// Function gửi lại nút liên kết xuống dưới cùng
async function resendLinkButtons(linkSuccess = null) {
    try {
        const linkChannel = await fetchChannelSafe(LINK_CHANNEL_ID);
        if (!linkChannel) return;

        // Xóa tin nhắn nút cũ nếu có
        if (linkButtonMessageId) {
            try {
                const oldMsg = await linkChannel.messages.fetch(linkButtonMessageId);
                if (oldMsg) await oldMsg.delete().catch(() => { });
            } catch (e) { /* Message already deleted */ }
        }

        // Gửi lại tin nhắn nút mới (sẽ ở dưới cùng)
        const linkEmbed = new EmbedBuilder()
            .setColor(0xEF5B)
            .setImage('https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmY0cWVobzlqOGFyaGw5N284eDhqdG55Z2o2b2o2YmM4Z2Zvcnk3aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/v63B5WpbX0a03HAVRV/giphy.gif');

        const infoEmbed = new EmbedBuilder()
            .setTitle('Tạo ID để liên kết tài khoản')
            .setDescription('Sau khi liên kết tên game với Discord thì thông tin player sẽ hiện thị ở đây')
            .setColor(0xEF5B);

        const button = new ButtonBuilder()
            .setCustomId('create_link_id')
            .setLabel('Tạo ID')
            .setStyle(ButtonStyle.Success);

        const unlinkButton = new ButtonBuilder()
            .setCustomId('unlink_account')
            .setLabel('Hủy liên kết')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(button, unlinkButton);

        // Gửi thông báo liên kết thành công riêng (nếu có)
        if (linkSuccess) {
            const messageContent = `<:4366minecraftaccept:1448944878812794950> **LIÊN KẾT THÀNH CÔNG!**\n` +
                `Đã liên kết **${linkSuccess.playerName}** với <@${linkSuccess.discordId}>\n` +
                `Thông tin sẽ được hiển thị tại <#${PLAYER_INFO_CHANNEL_ID}>`;

            await linkChannel.send({
                content: messageContent
            });
        }

        // Gửi lại Panel nút bấm (luôn ở dưới cùng và sạch sẽ)
        const embeds = [linkEmbed, infoEmbed];

        const newMsg = await linkChannel.send({
            embeds,
            components: [row]
        });

        linkButtonMessageId = newMsg.id;
        saveLinkButtonId(linkButtonMessageId);
        console.log(`[Link] Resent link buttons, new message ID: ${linkButtonMessageId}`);
    } catch (err) {
        console.error('[Link] Error resending buttons:', err.message);
    }
}

// -------------------- ADDON HTTP SERVER --------------------
const addonServer = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Secret-Key, X-Addon-Secret');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Health Check
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            connected: addonPlayerData.connected,
            players: addonPlayerData.players.length,
            uptime: process.uptime()
        }));
        return;
    }

    // Get Messages (Polling fallback)
    if (req.method === 'GET' && req.url === '/get-messages') {
        // [DEBUG] Log polling activity (reduce noise by logging only every 10th poll or just log all for now)
        // console.log('[API] POLL received'); 

        if (addonMessageQueue.length > 0) {
            console.log(`[API] Serving ${addonMessageQueue.length} messages to Addon:`, JSON.stringify(addonMessageQueue));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ messages: addonMessageQueue }));
        addonMessageQueue = []; // Clear queue after poling
        return;
    }

    // Video Download Endpoint
    if (req.method === 'GET' && req.url.startsWith('/download/')) {
        const fileName = req.url.replace('/download/', '');
        const videoPath = path.join(__dirname, 'TAIVIDEO', fileName);

        if (fs.existsSync(videoPath)) {
            const stat = fs.statSync(videoPath);
            res.writeHead(200, {
                'Content-Type': 'video/mp4',
                'Content-Length': stat.size,
                'Content-Disposition': `attachment; filename="${fileName}"`
            });
            const readStream = fs.createReadStream(videoPath);
            readStream.pipe(res);
            console.log(`[HTTP] Serving video: ${fileName}`);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Video not found');
        }
        return;
    }

    // POST: Player Update
    if (req.method === 'POST' && req.url === '/player-update') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                // DEBUG LOG
                if (body.includes('player_event')) console.log('[Addon Event Raw]', body);

                const data = JSON.parse(body);

                // Verify secret key (addon sends 'secret', accept both formats)
                const providedSecret = data.secret || data.secretKey;
                if (providedSecret !== CONFIG.ADDON_SECRET_KEY) {
                    console.log('[Addon] Invalid secret key received');
                    res.writeHead(401);
                    res.end(JSON.stringify({ error: 'Invalid secret key' }));
                    return;
                }

                // Handle Update Types


                if (data.type === 'player_update' || !data.type) { // Default to player_update
                    addonPlayerData.players = data.players || [];
                    addonPlayerData.lastUpdate = Date.now();
                    addonPlayerData.connected = true;
                    if (data.performance) addonPlayerData.tps = data.performance.tps;

                    // Update lastKnownPlayerList
                    lastKnownPlayerList = addonPlayerData.players.map(p => p.name);

                    // Save stats
                    for (const player of data.players) {
                        if (player.stats) updatePlayerStats(player.name, player.stats);
                    }

                    // Log update
                    // console.log(`[Addon] Update: ${addonPlayerData.players.length} players`);

                    // Dashboard Logic
                    if (addonPlayerData.players.length > 0) {
                        // Reset lastOnlineTime for online players
                        addonPlayerData.players.forEach(p => {
                            const existing = dashboardMessages.get(p.name);
                            if (existing && existing.lastOnlineTime) {
                                existing.lastOnlineTime = null;
                                dashboardMessages.set(p.name, existing);
                            }
                        });
                        updatePlayerDashboards(addonPlayerData.players);
                    }
                    updateOfflineDashboards();

                    // Pending Map Requests Logic
                    for (const player of addonPlayerData.players) {
                        if (player.terrain && pendingMapRequests.has(player.name.toLowerCase())) {
                            const request = pendingMapRequests.get(player.name.toLowerCase());
                            pendingMapRequests.delete(player.name.toLowerCase()); // Clear request

                            (async () => {
                                try {
                                    const channel = await client.channels.fetch(request.channelId).catch(() => null);
                                    if (!channel) return;

                                    const mapImageBuffer = await createMapImage(
                                        player.terrain,
                                        player.name,
                                        player.worldInfo || {},
                                        player.position
                                    );

                                    const attachment = new AttachmentBuilder(mapImageBuffer, { name: 'map.png' });
                                    const embed = new EmbedBuilder()
                                        .setTitle(`🗺️ Bản đồ thế giới`)
                                        .setColor(0x2E8B57)
                                        .setImage('attachment://map.png')
                                        .addFields(
                                            { name: "📍 Tọa độ", value: `X: ${player.position.x}, Y: ${player.position.y}, Z: ${player.position.z}`, inline: true },
                                            { name: "🌍 Dimension", value: player.dimension || 'overworld', inline: true },
                                            { name: "⏰ Thời gian", value: player.worldInfo?.timeOfDay || 'N/A', inline: true }
                                        )
                                        .setFooter({ text: `Bản đồ 64x64 (High-Res) • ${player.name}` })
                                        .setTimestamp();

                                    if (request.messageId) {
                                        const msg = await channel.messages.fetch(request.messageId).catch(() => null);
                                        if (msg) await msg.edit({ content: null, embeds: [embed], files: [attachment] }).catch(() => { });
                                        else await channel.send({ embeds: [embed], files: [attachment] }).catch(() => { });
                                    } else {
                                        await channel.send({ embeds: [embed], files: [attachment] }).catch(() => { });
                                    }
                                } catch (e) {
                                    console.error(`[Map] Error fulfilling request for ${player.name}:`, e);
                                }
                            })();
                        }
                    }

                } else if (data.type === 'player_event') {
                    // Handle Events (Join/Leave/Death/LowHealth)
                    const { event, playerName } = data;
                    console.log(`[Addon Event] ${event}: ${playerName}`, JSON.stringify(data.data || {}));

                    const channel = await fetchChannelSafe(CONFIG.CHANNEL_ID);

                    if (event === 'join') {
                        if (channel) {
                            // Gửi thẳng @everyone không cần ghost ping
                            await channel.send({
                                content: `🟢 **${playerName}** đã vào server @everyone`
                            }).catch(() => { });
                        }

                        // Chèn player tạm vào mảng nếu addon chưa kịp gửi data chi tiết
                        const alreadyInList = addonPlayerData.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
                        if (!alreadyInList) {
                            const tempPlayer = data.data || { name: playerName, health: 20, position: { x: 0, y: 64, z: 0 } };
                            if (!tempPlayer.name) tempPlayer.name = playerName;
                            addonPlayerData.players.push(tempPlayer);
                        }
                        updatePlayerDashboards(addonPlayerData.players, true);

                        // SMART BACKUP LOGIC (Trigger on first join)
                        const playerCount = data.currentPlayers ? data.currentPlayers.length : addonPlayerData.players.length;
                        if (playerCount <= 1) {
                            console.log('[Smart Backup] First player joined! Starting backup...');
                            runBackup(null).then(() => { global.smartBackupLastTime = Date.now(); });

                            // Start 15m interval
                            if (global.smartBackupTimer) clearInterval(global.smartBackupTimer);
                            global.smartBackupTimer = setInterval(async () => {
                                const currentP = addonPlayerData.players?.length || 0;
                                if (currentP > 0) {
                                    await runBackup(null);
                                    global.smartBackupLastTime = Date.now();
                                } else {
                                    console.log('[Smart Backup] No players online. Stopping timer.');
                                    clearInterval(global.smartBackupTimer);
                                    global.smartBackupTimer = null;
                                }
                            }, 15 * 60 * 1000);
                        }

                    } else if (event === 'leave') {
                        if (channel) {
                            // Gửi thẳng @everyone không cần ghost ping
                            await channel.send({
                                content: `🔴 **${playerName}** đã thoát server @everyone`
                            }).catch(() => { });
                        }

                        // Clear session stats (tránh delta bị cộng sai khi vào lại)
                        clearPlayerSession(playerName);

                        // Lập tức xóa player khỏi cache để vòng lặp sau không ghi đè thành Online
                        addonPlayerData.players = addonPlayerData.players.filter(
                            p => p.name.toLowerCase() !== playerName.toLowerCase()
                        );

                        markPlayerOffline(playerName);

                        // Final backup nếu là người cuối cùng rời
                        const remainingPlayers = addonPlayerData.players.length;
                        if (remainingPlayers === 0 && global.smartBackupTimer) {
                            console.log('[Smart Backup] Last player left! Final backup...');
                            runBackup(null).then(() => {
                                global.smartBackupLastTime = Date.now();
                            });
                            clearInterval(global.smartBackupTimer);
                            global.smartBackupTimer = null;
                        }

                    } else if (event === 'death') {
                        // DEATH NOTIFICATION -> Send to CHAT_INGAME_CHANNEL
                        const { cause, position } = data.data || {};

                        // Flavor Text Selection
                        let deathMsg = "hẹo tại";
                        const funMessages = [
                            "đáp đất lỗi kỹ thuật tại",
                            "tắm lava tại",
                            "bị đấm tại",
                            "ngủ quên dưới nước tại",
                            "thử độ bền giáp tại"
                        ];

                        if (cause === 'fall') deathMsg = "đáp đất lỗi kỹ thuật tại";
                        else if (cause === 'lava') deathMsg = "tắm lava tại";
                        else if (cause === 'entity_attack' || cause === 'projectile') deathMsg = "bị đấm tại";
                        else if (cause === 'drowning') deathMsg = "ngủ quên dưới nước tại";
                        else deathMsg = funMessages[Math.floor(Math.random() * funMessages.length)];

                        const coords = position ? `${Math.round(position.x)}, ${Math.round(position.y)}, ${Math.round(position.z)}` : "Unknown";
                        const fullMsg = `${playerName} ${deathMsg} ${coords}`; // Plain text for game

                        // 1. Send to Discord CHAT_INGAME_CHANNEL (Formatted with backticks)
                        const chatChannel = await client.channels.fetch(CONFIG.CHAT_INGAME_CHANNEL_ID).catch(() => null);
                        if (chatChannel) {
                            await chatChannel.send(`\`${playerName}\`: ${deathMsg} ${coords}`).catch(() => { });
                        }

                        // 2. Send to Game Chat (DIRECTLY push to queue)
                        console.log(`[Death] Pushing to game: ${fullMsg}`);
                        addonMessageQueue.push({
                            type: 'chat',
                            sender: 'Bot', // Special sender name handled by addon
                            message: `§c${fullMsg}`, // Red color for death
                            timestamp: Date.now()
                        });

                    } else if (event === 'low_health') {
                        // LOW HEALTH NOTIFICATION -> Send to CHAT_INGAME_CHANNEL
                        const { health, position } = data.data || {};
                        const coords = position ? `${Math.round(position.x)}, ${Math.round(position.y)}, ${Math.round(position.z)}` : "";
                        const msg = `${playerName}: đang yếu máu (${health} HP) SOS ${coords}`;

                        // 1. Send to Discord CHAT_INGAME_CHANNEL
                        const chatChannel = await client.channels.fetch(CONFIG.CHAT_INGAME_CHANNEL_ID).catch(() => null);
                        if (chatChannel) {
                            await chatChannel.send(`\`${playerName}\`: đang yếu máu (${health} HP) SOS ${coords}`).catch(() => { });
                        }

                        // 2. Send to Game Chat (DIRECTLY push to queue)
                        console.log(`[LowHealth] Pushing to game: ${msg}`);
                        addonMessageQueue.push({
                            type: 'chat',
                            sender: 'Bot',
                            message: `§e${msg}`, // Yellow color for warning
                            timestamp: Date.now()
                        });

                    }
                } else if (data.type === 'chat') {
                    // Compatibility for 'chat' type in player-update endpoint
                    // (Typically chat is sent to /chat endpoint, but handling here for safety)
                    if (data.message && data.playerName) {
                        const chatChannel = await fetchChannelSafe(CONFIG.CHAT_INGAME_CHANNEL_ID);
                        if (chatChannel) {
                            // Format: `player`: *message*
                            await chatChannel.send(`\`${data.playerName}\`: *${data.message}*`).catch(() => { });
                        }
                    }
                }

                // Return Response (piggyback commands)
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));

            } catch (err) {
                console.error('[Addon] Error processing request:', err);
                res.writeHead(400);
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // POST: Game Chat (Dedicated Endpoint)
    if (req.method === 'POST' && req.url === '/chat') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const providedSecret = data.secret || data.secretKey;

                if (providedSecret !== CONFIG.ADDON_SECRET_KEY) {
                    res.writeHead(401);
                    res.end(JSON.stringify({ error: 'Invalid secret' }));
                    return;
                }

                const message = (data.message || '').trim();
                const playerName = data.playerName;

                // Handle !lienket
                if (message.toLowerCase().startsWith('!lienket ')) {
                    const codeStr = message.slice(9).trim();
                    const result = handleLinkCommand(playerName, codeStr);

                    // Gửi thông báo in-game (Màu xanh nếu thành công, đỏ nếu thất bại)
                    addonMessageQueue.push({
                        type: 'chat',
                        sender: 'Bot', // Quan trọng: Addon check msg.sender mới hiển thị
                        target: playerName,
                        message: result.success ? `§a${result.message}` : `§c${result.message}`
                    });

                    if (result.success) {
                        try {
                            // Lấy avatar user
                            const user = await client.users.fetch(result.discordId).catch(() => null);
                            const avatarURL = user ? user.displayAvatarURL({ extension: 'png' }) : null;

                            await resendLinkButtons({
                                playerName,
                                discordTag: result.discordTag,
                                discordId: result.discordId,
                                avatarURL
                            });
                        } catch (e) {
                            console.error('[Link] Error updating Discord UI:', e);
                        }
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                    return;
                }

                // Handle !nether - Tính tọa độ Nether từ Overworld (chia 8)
                if (message.toLowerCase() === '!nether') {
                    const player = addonPlayerData.players.find(
                        p => p.name.toLowerCase() === playerName.toLowerCase()
                    );

                    let replyMsg;
                    if (!player || !player.position) {
                        replyMsg = `§c[Bot] §fKhông tìm thấy tọa độ của bạn! Hãy đợi addon cập nhật.`;
                    } else if (player.dimension && player.dimension !== 'overworld') {
                        replyMsg = `§c[Bot] §fBạn phải đứng ở Overworld để dùng lệnh này! (Đang ở: ${player.dimension})`;
                    } else {
                        const netherX = Math.floor(player.position.x / 8);
                        const netherZ = Math.floor(player.position.z / 8);
                        const currentY = Math.floor(player.position.y);
                        replyMsg = `§b[Bot] §aTọa độ Nether tương ứng: §eX: ${netherX}§a, §eY: ${currentY}§a, §eZ: ${netherZ}`;
                    }

                    addonMessageQueue.push({
                        type: 'chat',
                        sender: 'Bot',
                        target: playerName,
                        message: replyMsg
                    });

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                    return;
                }

                // Normal Chat
                const chatChannel = await fetchChannelSafe(CONFIG.CHAT_INGAME_CHANNEL_ID);
                if (chatChannel && playerName && message) {
                    // Format: `player`: *message*
                    await chatChannel.send(`\`${playerName}\`: *${message}*`).catch(() => { });
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));

            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

// Bắt đầu server
const PORT = process.env.SERVER_PORT || process.env.PORT || 8080;
addonServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Addon Server] Running on port ${PORT}`);

    // Chạy job update offline status mỗi 60s
    setInterval(() => {
        updateOfflineDashboards();
    }, 60000);
});

// -------------------- HỖ TRỢ --------------------
function nowVN() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
}

function getUptime(startTime) {
    if (!startTime) return "0m";
    const diff = Date.now() - startTime;
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(" ");
}

function getDynamicColor() {
    const hour = nowVN().getHours();
    return (hour >= 6 && hour < 18) ? 0x00BFFF : 0x2F3136;
}

function getRandomFooter() {
    const idx = Math.floor(Math.random() * CONFIG.FUNNY_MOTDS.length);
    return `${CONFIG.FUNNY_MOTDS[idx]} | Cập nhật mỗi ${CONFIG.UPDATE_INTERVAL}s`;
}

// Tries to pick a readable players list from BEDROCK ping response
function extractPlayerNames(pingResponse) {
    // bedrock-protocol may return players in various fields; try common ones
    if (!pingResponse) return [];
    // Example structures: pingResponse.sample (array of { name }), pingResponse.players (array)
    if (Array.isArray(pingResponse.sample) && pingResponse.sample.length) {
        return pingResponse.sample.map(p => typeof p === 'string' ? p : p.name).filter(Boolean);
    }
    if (Array.isArray(pingResponse.players) && pingResponse.players.length) {
        return pingResponse.players.map(p => typeof p === 'string' ? p : p.name).filter(Boolean);
    }
    // Some responses include 'playerList' or 'playersList'
    if (Array.isArray(pingResponse.playerList)) return pingResponse.playerList.map(p => p.name || p).filter(Boolean);
    if (Array.isArray(pingResponse.playersSample)) return pingResponse.playersSample.map(p => p.name || p).filter(Boolean);
    return [];
}

// ==================== PLAYER STATS EMBED ====================
const playerStatsMessages = new Map(); // Map<playerName, messageId>

async function sendPlayerStatsEmbed(player) {
    try {
        const channel = await client.channels.fetch(CONFIG.PLAYER_STATS_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        // Get player data
        const worldInfo = player.worldInfo || {};
        const pos = player.position || {};
        const stats = player.stats || {};
        const pets = player.pets || [];

        // Build exact Discohook embeds (1:1 ratio)
        const embeds = [
            // Embed 1: Banner image
            new EmbedBuilder()
                .setColor(0x14FF00)
                .setImage('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3b2NzajB2M2x2bXVneTJlNG55c3BzZWM0OHp2bjl2MjFucXA3aXp3cyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/r8GMmlV8qGrfZ3txfX/giphy.gif'),

            // Embed 2: Player name
            new EmbedBuilder()
                .setTitle(`╰➤       **@kim_div**      ║     ** ${player.name} **               \n          ──────────✦ <:minecraft:1448897654531821739> ✦──────────`)
                .setColor(0x14FF00),

            // Embed 3: Health & Tools
            new EmbedBuilder()
                .setTitle(`>>> <:98437regenheart:1448901017637879848>  **${Math.round(player.health || 20)}/20**ㅤ            <:animated_clock:1448905091968008242>  **${worldInfo.timeOfDay === 'day' ? 'Sun' : 'Moon'}**     \n──────────────────✦\n <:1405diamondpickaxe:1448900542255464499> **${stats.blocksBroken || 0}**              <:1405diamondsword:1448900946749952112> **${stats.mobsKilled || 0}**`)
                .setColor(0xFF1F00)
                .setThumbnail('https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMndjbzc3bTRqYXg2cWZ5ejJ1b29yODVhd2F4YWRueHA0aWY3cDdzNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/11oo4VfpO2pBtzc4j9/giphy.gif'),

            // Embed 4: Position & Biome
            new EmbedBuilder()
                .setTitle(`> <:Minecraft_World_Cube:1448905048284201000> **${Math.round(pos.x || 0)}/${Math.round(pos.y || 0)}/${Math.round(pos.z || 0)}**ㅤㅤ                 \n  >     ⊢ *${(worldInfo.biome || 'Overworld').replace(/_/g, ' ')}*\n  >       ⊢ *${worldInfo.structure || 'Exploring'}*`)
                .setColor(0x0A60CC)
                .setThumbnail('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZHgyeXB2ZXk5YWZvd2E4MTZpZ2txb216YXZvbHpmOXc5MXEyNnA1dyZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/BJn3eWFtXt6sXUxGBJ/giphy.gif'),

            // Embed 5: Pets
            new EmbedBuilder()
                .setTitle(`> <:9648trashyaxolotl:1448907520855769128> **Pets**                                         \n  >     ⊢ *${pets[0]?.name || 'No pets'}*\n  >       ⊢ *${pets[1]?.name || '-'}*`)
                .setColor(0xDFFF7F)
                .setThumbnail('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OGRzOTUxN3E3bDBmb3hqdXB5ZnV6MGV4eGNmZ2pqZ3NnNDJhMjllbiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ZDektocmsUkLn8h6AE/giphy.gif')
        ];

        // Check if we have existing message for this player
        const existingMsgId = playerStatsMessages.get(player.name.toLowerCase());

        if (existingMsgId) {
            try {
                const msg = await channel.messages.fetch(existingMsgId).catch(() => null);
                if (msg) {
                    await msg.edit({ embeds: embeds });
                    return;
                }
            } catch { }
        }

        // Send new message
        const newMsg = await channel.send({ embeds: embeds });
        playerStatsMessages.set(player.name.toLowerCase(), newMsg.id);

    } catch (error) {
        console.error('[PlayerStats] Error:', error.message);
    }
}

// ==================== PLAYER STATS CARD (Screenshot API) ====================
// Configuration - Set your hosted HTML page URL here
const PLAYER_STATS_PAGE_URL = 'https://kimducanh27-cpu.github.io/player-stats-card';

async function createPlayerStatsCard(player) {
    try {
        // Prepare player data
        const worldInfo = player.worldInfo || {};
        const pos = player.position || {};
        const stats = player.stats || {};

        const playerData = {
            name: player.name,
            health: player.health || 20,
            x: Math.round(pos.x || 0),
            y: Math.round(pos.y || 0),
            z: Math.round(pos.z || 0),
            biome: (worldInfo.biome || 'overworld').replace(/_/g, ' '),
            weather: worldInfo.weather || 'Clear',
            timeOfDay: worldInfo.timeOfDay === 'day' ? 'Day' : worldInfo.timeOfDay === 'night' ? 'Night' : 'Day',
            structure: worldInfo.structure || '',
            inventory: player.inventory || [],
            blocksBroken: stats.blocksBroken || 0,
            mobsKilled: stats.mobsKilled || 0,
            pets: player.pets || [],
            timestamp: new Date().toLocaleTimeString('vi-VN')
        };

        // Encode data as base64
        const jsonStr = JSON.stringify(playerData);
        const base64Data = Buffer.from(jsonStr).toString('base64');

        // Build URL with data (use query param instead of hash for thum.io compatibility)
        const pageUrl = `${PLAYER_STATS_PAGE_URL}?data=${encodeURIComponent(base64Data)}`;
        // Screenshot APIs are unreliable with complex URLs
        // Use canvas directly for better reliability
        console.log('[PlayerStats] Using canvas renderer for player:', playerData.name);
        return await createDetailedStatsCard(playerData);

    } catch (error) {
        console.error('[PlayerStats] Error:', error.message);
        // Fallback to simple canvas
        return await createSimpleStatsCard(player);
    }
}

// Detailed canvas card with all features
async function createDetailedStatsCard(data) {
    const canvas = createCanvas(420, 340);
    const ctx = canvas.getContext('2d');

    // Background gradient effect
    const gradient = ctx.createLinearGradient(0, 0, 420, 340);
    gradient.addColorStop(0, '#36393F');
    gradient.addColorStop(0.5, '#2F3136');
    gradient.addColorStop(1, '#202225');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 420, 340);

    // Left accent border
    ctx.fillStyle = '#57F287';
    ctx.fillRect(0, 0, 4, 340);

    // Load player skin
    try {
        const skinUrl = `https://mc-heads.net/avatar/${encodeURIComponent(data.name)}/50`;
        const skinImg = await loadImage(skinUrl);
        ctx.drawImage(skinImg, 355, 12, 50, 50);
    } catch {
        ctx.fillStyle = '#5865F2';
        ctx.fillRect(355, 12, 50, 50);
    }

    // Player name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(data.name, 15, 35);

    // Subtitle
    ctx.fillStyle = '#B9BBBE';
    ctx.font = '13px Arial';
    ctx.fillText(`${data.biome} • ${data.timeOfDay}`, 15, 55);

    // Divider
    ctx.strokeStyle = '#40444B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, 72);
    ctx.lineTo(405, 72);
    ctx.stroke();

    // Row 1: Status & Position
    ctx.fillStyle = '#B9BBBE';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('TRẠNG THÁI', 15, 95);
    ctx.fillText('VỊ TRÍ', 220, 95);

    ctx.fillStyle = '#DCDDDE';
    ctx.font = '13px Arial';

    // HP with bar
    const hpPercent = (data.health / 20) * 100;
    ctx.fillText(`HP: ${data.health}/20`, 15, 115);
    ctx.fillStyle = '#4F545C';
    ctx.fillRect(90, 105, 80, 10);
    ctx.fillStyle = data.health <= 5 ? '#ED4245' : data.health <= 10 ? '#FEE75C' : '#57F287';
    ctx.fillRect(90, 105, (hpPercent / 100) * 80, 10);

    ctx.fillStyle = '#DCDDDE';
    ctx.fillText(`Weather: ${data.weather}`, 15, 135);

    ctx.fillText(`X: ${data.x}  Y: ${data.y}  Z: ${data.z}`, 220, 115);
    ctx.fillText(`Biome: ${data.biome}`, 220, 135);

    // Divider
    ctx.beginPath();
    ctx.moveTo(15, 155);
    ctx.lineTo(405, 155);
    ctx.stroke();

    // Inventory section
    ctx.fillStyle = '#B9BBBE';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('TÚI ĐỒ', 15, 175);
    ctx.fillStyle = '#72767D';
    ctx.font = '11px Arial';
    ctx.fillText(`${data.inventory.length} slots`, 360, 175);

    // Draw inventory slots
    const inv = data.inventory || [];
    for (let i = 0; i < 8; i++) {
        const slotX = 15 + i * 48;
        const slotY = 185;

        // Slot background
        ctx.fillStyle = '#202225';
        ctx.fillRect(slotX, slotY, 42, 42);
        ctx.strokeStyle = '#40444B';
        ctx.strokeRect(slotX, slotY, 42, 42);

        if (inv[i]) {
            // Try load item icon
            const itemName = (inv[i].name || inv[i].id || '').replace('minecraft:', '');
            try {
                const iconUrl = `https://minecraft-api.vercel.app/images/items/${itemName}.png`;
                const icon = await loadImage(iconUrl).catch(() => null);
                if (icon) {
                    ctx.drawImage(icon, slotX + 5, slotY + 5, 32, 32);
                } else {
                    ctx.fillStyle = getItemColor(itemName);
                    ctx.fillRect(slotX + 8, slotY + 8, 26, 26);
                }
            } catch {
                ctx.fillStyle = getItemColor(itemName);
                ctx.fillRect(slotX + 8, slotY + 8, 26, 26);
            }

            // Item count
            const count = inv[i].amount || inv[i].count || 1;
            if (count > 1) {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 11px Arial';
                ctx.fillText(count.toString(), slotX + 28, slotY + 38);
            }
        }
    }

    // Divider
    ctx.beginPath();
    ctx.moveTo(15, 240);
    ctx.lineTo(405, 240);
    ctx.stroke();

    // Stats & Pets
    ctx.fillStyle = '#B9BBBE';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('THỐNG KÊ', 15, 260);
    ctx.fillText('THÚ CƯNG', 220, 260);

    ctx.fillStyle = '#DCDDDE';
    ctx.font = '13px Arial';
    ctx.fillText(`${data.blocksBroken.toLocaleString()} Blocks`, 15, 285);
    ctx.fillText(`${data.mobsKilled.toLocaleString()} Mobs`, 15, 305);

    const pets = data.pets || [];
    if (pets.length > 0) {
        let petX = 220;
        pets.slice(0, 4).forEach(async pet => {
            // Try load pet mob texture
            const petType = pet.type || 'wolf';
            try {
                const petIcon = await loadImage(`https://minecraft-api.vercel.app/images/entities/${petType}.png`).catch(() => null);
                if (petIcon) {
                    ctx.drawImage(petIcon, petX, 270, 36, 36);
                } else {
                    ctx.fillStyle = '#3BA55C';
                    ctx.fillRect(petX, 270, 36, 36);
                    ctx.fillStyle = '#FFF';
                    ctx.font = '10px Arial';
                    ctx.fillText(petType.charAt(0).toUpperCase(), petX + 13, 293);
                }
            } catch {
                ctx.fillStyle = '#3BA55C';
                ctx.fillRect(petX, 270, 36, 36);
            }
            petX += 42;
        });
        ctx.fillStyle = '#72767D';
        ctx.font = '11px Arial';
        ctx.fillText(`${pets.length} pets`, 220, 320);
    } else {
        ctx.fillStyle = '#72767D';
        ctx.fillText('Không có', 220, 285);
    }

    // Footer
    ctx.fillStyle = '#5D6269';
    ctx.font = '10px Arial';
    ctx.fillText(`Updated: ${data.timestamp}`, 300, 330);

    return canvas.toBuffer('image/png');
}

// Simple fallback card
async function createSimpleStatsCard(player) {
    const canvas = createCanvas(420, 280);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#2F3136';
    ctx.fillRect(0, 0, 420, 280);

    // Left border
    ctx.fillStyle = '#57F287';
    ctx.fillRect(0, 0, 4, 280);

    // Player name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(player.name, 15, 35);

    // Subtitle
    const worldInfo = player.worldInfo || {};
    ctx.fillStyle = '#B9BBBE';
    ctx.font = '13px Arial';
    ctx.fillText(`${(worldInfo.biome || 'overworld').replace(/_/g, ' ')} • ${worldInfo.timeOfDay === 'night' ? 'Night' : 'Day'}`, 15, 55);

    // Divider
    ctx.fillStyle = '#40444B';
    ctx.fillRect(15, 70, 390, 1);

    // Stats
    ctx.fillStyle = '#DCDDDE';
    ctx.font = '14px Arial';
    ctx.fillText(`💚 HP: ${player.health || 20}/20`, 15, 100);
    ctx.fillText(`🌤️ Weather: ${worldInfo.weather || 'Clear'}`, 15, 125);

    const pos = player.position || {};
    ctx.fillText(`📍 X: ${Math.round(pos.x || 0)}  Y: ${Math.round(pos.y || 0)}  Z: ${Math.round(pos.z || 0)}`, 210, 100);
    ctx.fillText(`🌍 Biome: ${(worldInfo.biome || 'overworld').replace(/_/g, ' ')}`, 210, 125);

    // Divider
    ctx.fillStyle = '#40444B';
    ctx.fillRect(15, 145, 390, 1);

    // Inventory slots
    ctx.fillStyle = '#B9BBBE';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('🎒 Túi Đồ', 15, 170);

    const inventory = player.inventory || [];
    for (let i = 0; i < 8; i++) {
        ctx.fillStyle = '#202225';
        ctx.fillRect(15 + i * 42, 180, 36, 36);
        if (inventory[i]) {
            const count = inventory[i].amount || inventory[i].count || 1;
            if (count > 1) {
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 10px Arial';
                ctx.fillText(count.toString(), 15 + i * 42 + 22, 180 + 32);
            }
        }
    }

    ctx.fillStyle = '#72767D';
    ctx.font = '11px Arial';
    ctx.fillText(`${inventory.length} slots`, 360, 202);

    // Stats section
    ctx.fillStyle = '#40444B';
    ctx.fillRect(15, 225, 390, 1);

    const stats = player.stats || {};
    ctx.fillStyle = '#DCDDDE';
    ctx.font = '13px Arial';
    ctx.fillText(`⛏️ ${(stats.blocksBroken || 0).toLocaleString()} Blocks`, 15, 250);
    ctx.fillText(`⚔️ ${(stats.mobsKilled || 0).toLocaleString()} Mobs`, 15, 270);

    ctx.fillText(`🐾 ${(player.pets || []).length} pets`, 210, 250);

    // Footer
    ctx.fillStyle = '#72767D';
    ctx.font = '10px Arial';
    ctx.fillText(`Updated: ${new Date().toLocaleTimeString('vi-VN')}`, 310, 270);

    return canvas.toBuffer('image/png');
}

// Helper function for item colors
function getItemColor(itemName) {
    if (itemName.includes('diamond')) return '#5DE0E6';
    if (itemName.includes('gold')) return '#FFD700';
    if (itemName.includes('iron')) return '#C0C0C0';
    if (itemName.includes('netherite')) return '#4A4A4A';
    if (itemName.includes('emerald')) return '#50C878';
    if (itemName.includes('ender')) return '#9B59B6';
    if (itemName.includes('apple')) return '#FF6B6B';
    if (itemName.includes('sword')) return '#87CEEB';
    if (itemName.includes('pickaxe')) return '#A0522D';
    return '#808080';
}

function getItemEmoji(itemId) {
    const emojis = {
        'diamond_sword': '🗡️', 'iron_sword': '🗡️', 'golden_sword': '🗡️', 'netherite_sword': '🗡️',
        'diamond_pickaxe': '⛏️', 'iron_pickaxe': '⛏️', 'golden_pickaxe': '⛏️', 'netherite_pickaxe': '⛏️',
        'bow': '🏹', 'crossbow': '🏹', 'shield': '🛡️', 'trident': '🔱',
        'golden_apple': '🍎', 'enchanted_golden_apple': '✨', 'apple': '🍎',
        'diamond': '💎', 'emerald': '💚', 'gold_ingot': '🥇', 'iron_ingot': '🥈',
        'ender_pearl': '🟣', 'ender_eye': '👁️', 'totem_of_undying': '🛡️',
        'netherite_ingot': '⬛', 'coal': '⬛', 'torch': '🔦'
    };
    return emojis[itemId] || '📦';
}

function getPetEmoji(type) {
    const emojis = {
        'wolf': '🐺', 'cat': '🐱', 'parrot': '🦜', 'horse': '🐴',
        'donkey': '🫏', 'mule': '🫏', 'llama': '🦙', 'fox': '🦊',
        'axolotl': '🦎', 'bee': '🐝', 'strider': '🔥', 'allay': '💙'
    };
    return emojis[type] || '🐾';
}

function formatBiome(biome) {
    const names = {
        'deep_dark': '🌑 Deep Dark', 'plains': '🌾 Plains', 'forest': '🌲 Forest',
        'desert': '🏜️ Desert', 'ocean': '🌊 Ocean', 'jungle': '🌴 Jungle',
        'mountains': '🏔️ Mountains', 'swamp': '🐸 Swamp', 'taiga': '🌲 Taiga',
        'nether_wastes': '🔥 Nether', 'the_end': '🟣 The End', 'cave': '🕳️ Cave'
    };
    return names[biome] || biome.replace(/_/g, ' ');
}

// -------------------- KIỂM TRA SERVER --------------------
async function checkServer() {
    if (maintenanceMode) return { maintenance: true, method: "Maintenance" };
    const start = Date.now();
    try {
        const res = await bedrock.ping({
            host: CONFIG.SERVER_IP,
            port: CONFIG.SERVER_PORT,
            timeout: 3000
        });
        const latency = Date.now() - start;

        // players count best-effort
        const players = (typeof res.playersOnline === 'number') ? res.playersOnline
            : (typeof res.currentPlayers === 'number') ? res.currentPlayers
                : (res.players && typeof res.players.length === 'number') ? res.players.length
                    : 0;

        // try to pick player names if provided
        const names = extractPlayerNames(res);
        if (names.length) lastKnownPlayerList = names;

        return {
            online: true,
            players,
            max: res.playersMax ?? res.maxPlayers ?? (res.max ?? 0),
            motd: res.motd || res.serverName || "Minecraft Bedrock Server",
            version: res.version || res.protocolVersion || "Unknown",
            latency,
            raw: res,
            method: "Ping",
            playerList: names
        };
    } catch (err) {
        return { online: false, method: "Ping", error: err?.message ?? String(err) };
    }
}

// -------------------- CHECK XBOX LIVE --------------------
function checkXboxStatus() {
    return new Promise((resolve) => {
        https.get('https://support.xbox.com/en-US/xbox-live-status', (res) => {
            resolve(res.statusCode === 200);
        }).on('error', () => resolve(false));
    });
}

// -------------------- BUILD EMBED --------------------
function buildEmbed(status) {
    const embeds = [];

    // Embed 1: GIF Banner (xanh biển như Discohook)
    const bannerEmbed = new EmbedBuilder()
        .setColor(0x10EB4B)
        .setImage('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cng4M3ppZm14NWY4cDlzdnh6eWJucDBqMjFjeDVlbXp2aDA2dTRlcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/gFuzIvzAiBuLjJcGZY/giphy.gif');
    embeds.push(bannerEmbed);

    // Embed 2: Server Info (xanh biển như Discohook)
    if (status.online) {
        const pingStatus = status.latency > 300 ? "🔴" : (status.latency > 150 ? "🟡" : "🟢");
        const serverInfoEmbed = new EmbedBuilder()
            .setTitle(`<:minecraft:1448897654531821739> **SURVIVAL BEDROCK**\n\nIP      : ${CONFIG.SERVER_IP}\nPort    : ${CONFIG.SERVER_PORT}\nVer     : ${status.version}\n──────────────✦\nOnline  : ${status.players} / ${status.max}`)
            .setColor(0x10EB4B)
            .setThumbnail('https://cdn3.emoji.gg/emojis/9477-minecraft.gif');
        embeds.push(serverInfoEmbed);
    } else if (status.maintenance) {
        const serverInfoEmbed = new EmbedBuilder()
            .setTitle(`<:minecraft:1448897654531821739> **SURVIVAL BEDROCK**\n\nIP      : ${CONFIG.SERVER_IP}\nPort    : ${CONFIG.SERVER_PORT}\n──────────────✦\n⚠️ ĐANG BẢO TRÌ`)
            .setColor(0xFFA500)
            .setThumbnail('https://cdn3.emoji.gg/emojis/9477-minecraft.gif');
        embeds.push(serverInfoEmbed);
    } else {
        const serverInfoEmbed = new EmbedBuilder()
            .setTitle(`<:minecraft:1448897654531821739> **SURVIVAL BEDROCK**\n\nIP      : ${CONFIG.SERVER_IP}\nPort    : ${CONFIG.SERVER_PORT}\n──────────────✦\n🔴 OFFLINE`)
            .setColor(0xFF0000)
            .setThumbnail('https://cdn3.emoji.gg/emojis/9477-minecraft.gif');
        embeds.push(serverInfoEmbed);
    }

    // Embed 3: Player List (xanh lá nhạt như Discohook - 1109707 = 0x10EB4B)
    let playerListText = '<:Minecraft_World_Cube:1448905048284201000> **List online**\n⊢';
    // Use status.playerList first, fallback to lastKnownPlayerList (from addon)
    const playerList = (status.playerList && status.playerList.length > 0)
        ? status.playerList
        : lastKnownPlayerList;

    if (status.online && playerList && playerList.length > 0) {
        for (const player of playerList) {
            // Kiểm tra xem player có thread không để gán link
            const playerData = dashboardMessages.get(player);
            if (playerData && playerData.threadId) {
                // Có thread - dùng channel mention để link đến thread
                playerListText += `\n<#${playerData.threadId}>\n⊢`;
            } else {
                // Không có thread - hiển thị tên thường
                playerListText += `\n${player}\n⊢`;
            }
        }
    } else if (status.online) {
        playerListText += '\n*Không có ai online*\n⊢';
    } else {
        playerListText += '\n*Server offline*\n⊢';
    }
    const playerListEmbed = new EmbedBuilder()
        .setDescription(playerListText)
        .setColor(0x00CED1)
        .setThumbnail('https://cdn3.emoji.gg/emojis/4192-pepeminecraft.png');
    embeds.push(playerListEmbed);

    // Embed 4: Join Link
    const joinEmbed = new EmbedBuilder()
        .setTitle('Tham gia server')
        .setURL('https://minecraftautolog.netlify.app/')
        .setColor(0xE0F52C);
    embeds.push(joinEmbed);

    return embeds;
}

function buildButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Mở Minecraft')
                .setStyle(ButtonStyle.Link)
                .setURL('https://692afb67cea590c35c2cbebf--minecraftautolog.netlify.app/')
                .setEmoji('🎮')
        );
    return row;
}


// -------------------- RUN UPDATE (CORE) --------------------
async function runUpdate() {
    try {
        console.log("Running update..."); // DEBUG
        const status = await checkServer();
        console.log("Status:", status.online ? "Online" : "Offline"); // DEBUG
        const channel = await fetchChannelSafe(CONFIG.CHANNEL_ID);
        if (!channel) {
            console.log("Channel not found!"); // DEBUG
            return;
        }

        // ACTIVITY
        if (status.online) {
            if (!serverStartTime) serverStartTime = Date.now();
            client.user.setActivity(`Online: ${status.players}/${status.max}`, { type: ActivityType.Playing });
        } else if (status.maintenance) {
            client.user.setActivity(`Đang Bảo Trì`, { type: ActivityType.Playing });
        } else {
            serverStartTime = null;
            client.user.setActivity(`Server Offline`, { type: ActivityType.Watching });
        }

        // NOTIFICATIONS (embed format)
        const notificationEmbeds = [];
        if (!isFirstRun && lastOnlineState !== null) {
            if (maintenanceMode && lastOnlineState !== 'maintenance') {
                // Embed: Server bảo trì
                notificationEmbeds.push(new EmbedBuilder()
                    .setTitle('Server đang bảo trì')
                    .setDescription('vui lòng chờ nha')
                    .setColor(0xF73200)
                    .setThumbnail('https://cdn3.emoji.gg/emojis/20756-irongolem.gif'));
                lastOnlineState = 'maintenance';
            } else if (!maintenanceMode) {
                // Bỏ thông báo server offline theo yêu cầu
                if (lastOnlineState !== true && status.online === true) {
                    // Embed: Server Online
                    const tag = CONFIG.ROLE_TO_TAG ? `<@&${CONFIG.ROLE_TO_TAG}>` : "@everyone";
                    notificationEmbeds.push(new EmbedBuilder()
                        .setTitle('Server Online')
                        .setDescription(`server đã mở lại ${tag}`)
                        .setColor(0x3BF700)
                        .setThumbnail('https://cdn3.emoji.gg/emojis/864281-ralsei-mining.gif'));
                }
            }
        }
        if (!maintenanceMode) lastOnlineState = status.online;

        // daily reset guard
        const vnTime = nowVN();
        if (vnTime.getHours() === 12 && vnTime.getMinutes() === 0 && lastClearDay !== vnTime.getDate()) {
            lastClearDay = vnTime.getDate();
        }

        // player change notification (with playerList names from addon)
        // Only run if addon is NOT connected (fallback). If connected, we use realtime events.
        if (status.online && !isFirstRun && !addonPlayerData.connected) {
            // Use lastKnownPlayerList (updated by addon) instead of status.playerList (from ping)
            const oldList = lastStatus.playerList || lastStatus.addonPlayerList || [];
            const newList = lastKnownPlayerList || [];

            // Store current addon list for next comparison
            status.addonPlayerList = [...newList];

            // Find joined players
            for (const player of newList) {
                if (!oldList.includes(player)) {
                    notificationEmbeds.push(new EmbedBuilder()
                        .setTitle(`<:Minecraft_World_Cube:1448905048284201000>${player} đã vào server`)
                        .setColor(0x18CB56));
                }
            }

            // Find left players
            for (const player of oldList) {
                if (!newList.includes(player)) {
                    notificationEmbeds.push(new EmbedBuilder()
                        .setTitle(`${player} đã thoát server<:Minecraft_World_Cube:1448905048284201000>`)
                        .setColor(0xD6049F));
                }
            }

            lastPlayerCount = status.players;
        }

        // ping health
        if (status.online && typeof status.latency === 'number') {
            if (status.latency > 300) consecutiveHighPingCount++;
            else consecutiveHighPingCount = 0;
        } else {
            consecutiveHighPingCount = 0;
        }

        // AUTO BACKUP ADVANCED: Join/Leave & Interval
        if (status.online) {
            const currentPlayers = status.players;
            const previousPlayers = lastStatus.players || 0;
            const playerChanged = currentPlayers !== previousPlayers;

            // 1. EVENT BASED: Join/Leave -> Debounce Backup
            if (playerChanged) {
                if (backupDebounceTimeout) clearTimeout(backupDebounceTimeout);
                console.log(`[Auto Backup] Player count changed (${previousPlayers} -> ${currentPlayers}). Scheduling backup in 60s...`);

                backupDebounceTimeout = setTimeout(async () => {
                    try {
                        const channel = await fetchChannelSafe(CONFIG.BACKUP_CHANNEL_ID);
                        await runBackup(null);
                        backupDebounceTimeout = null;
                    } catch (e) {
                        console.error("[Auto Backup] Event Error:", e);
                        backupDebounceTimeout = null;
                    }
                }, 60 * 1000); // 60s debounce
            }

            // 2. INTERVAL BASED: Every 30 mins from last backup
            if (!backupDebounceTimeout && (Date.now() - lastBackupTime >= 30 * 60 * 1000)) {
                console.log("[Auto Backup] Interval trigger (30 mins). Starting backup...");
                lastBackupTime = Date.now(); // Reset timer immediately to prevent duplicate triggers

                // Run async
                (async () => {
                    try {
                        await runBackup(null);
                    } catch (e) {
                        console.error("[Auto Backup] Interval Error:", e);
                    }
                })();
            }
        }

        // BUILD EMBED
        const embed = buildEmbed(status);

        // Check if status actually changed (to prevent GIF reload)
        const statusChanged =
            lastStatus.online !== status.online ||
            lastStatus.players !== status.players ||
            lastStatus.latency !== status.latency ||
            lastStatus.maintenance !== status.maintenance ||
            JSON.stringify(lastStatus.playerList || []) !== JSON.stringify(status.playerList || []);

        // SEND or EDIT dashboard safely (only if changed or has notifications)
        if (statusChanged || notificationEmbeds.length > 0 || !lastDashboardMessageId) {
            await safeSendOrEditDashboard(channel, embed, notificationEmbeds);
        }
        // store last status
        lastStatus = status;
    } catch (err) {
        console.error("runUpdate error:", err);
    }
}


// -------------------- SAFE HELPERS --------------------
async function fetchChannelSafe(id) {
    try {
        let ch = client.channels.cache.get(id);
        if (!ch) ch = await client.channels.fetch(id).catch(() => null);
        return ch || null;
    } catch {
        return null;
    }
}

async function safeSendOrEditDashboard(channel, embed, notificationEmbeds) {
    try {
        // 1. Send Notification Embeds first (if any)
        if (notificationEmbeds && notificationEmbeds.length > 0) {
            for (const notifEmbed of notificationEmbeds) {
                await channel.send({ embeds: [notifEmbed] }).catch(() => { });
                await sleep(250);
            }
        }

        // 2. Find existing dashboard
        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        let dashboardMsg = null;

        if (messages) {
            dashboardMsg = messages.find(m =>
                m.author.id === client.user.id &&
                m.embeds.length > 1 &&
                m.embeds[1]?.title &&
                m.embeds[1].title.includes("SURVIVAL BEDROCK")
            );
        }

        // 3. Logic: Edit if last, Re-send if not
        // Note: embed is now an array of embeds
        if (dashboardMsg) {
            const lastMsg = messages.first();
            // If dashboard is the very last message -> EDIT
            if (lastMsg && lastMsg.id === dashboardMsg.id) {
                await dashboardMsg.edit({ embeds: embed, components: [] }).catch(() => { });
                lastDashboardMessageId = dashboardMsg.id;
            } else {
                // If not last -> Delete & Send New (to keep at bottom)
                await dashboardMsg.delete().catch(() => { });
                const sent = await channel.send({ embeds: embed, components: [] }).catch(() => { });
                if (sent) lastDashboardMessageId = sent.id;
            }
        } else {
            // Not found -> Send New
            const sent = await channel.send({ embeds: embed, components: [] }).catch(() => { });
            if (sent) lastDashboardMessageId = sent.id;
        }

    } catch (err) {
        console.error("safeSendOrEditDashboard:", err?.message ?? err);
    }
}

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

// -------------------- ADDON HTTP SERVER --------------------
// [REMOVED] startAddonHttpServer - Functionality merged into main addonServer

// -------------------- EVENT: READY --------------------
client.once('clientReady', async () => {
    console.log(`
    ===================================================
    ✅ BOT CONNECTED: ${client.user.tag}
    ✅ CLIENT ID: ${client.user.id}
    ✅ READY AT: ${new Date().toISOString()}
    ===================================================
    `);

    // Check Channels
    const chatChannel = await client.channels.fetch(CONFIG.CHAT_INGAME_CHANNEL_ID).catch(() => null);
    if (chatChannel) {
        console.log(`[Startup] Chat Channel Found: ${chatChannel.name} (${chatChannel.id})`);
        console.log(`[Startup] Bot Permissions in Chat Channel:`, chatChannel.permissionsFor(client.user.id).toArray());
    } else {
        console.error(`[Startup] ❌ Chat Channel NOT FOUND! ID: ${CONFIG.CHAT_INGAME_CHANNEL_ID}`);
    }

    // Register slash commands
    try {
        const commands = [
            new SlashCommandBuilder()
                .setName('link')
                .setDescription('Liên kết tài khoản Discord với tên Minecraft')
                .addStringOption(option =>
                    option.setName('ten_game')
                        .setDescription('Tên Minecraft của bạn (3-16 ký tự)')
                        .setRequired(false))
        ].map(cmd => cmd.toJSON());

        const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);

        // Get all guilds bot is in
        for (const guild of client.guilds.cache.values()) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guild.id),
                { body: commands }
            );
        }
        console.log('[SlashCommand] ✅ Registered /link command');
    } catch (e) {
        console.error('[SlashCommand] ❌ Failed to register:', e.message);
    }

    // Start the update loop
    const loop = async () => {
        await runUpdate();
        setTimeout(loop, Math.max(1, CONFIG.UPDATE_INTERVAL) * 1000);
    };

    loop();

    // Leaderboard: cập nhật lần đầu sau 10s (chờ data load)
    setTimeout(() => updateLeaderboard(), 10000);
});

// -------------------- NEW MEMBER WELCOME (LINK INSTRUCTIONS) --------------------


// -------------------- SLASH COMMAND HANDLER (/link) --------------------
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'link') {
        const discordId = interaction.user.id;
        const existingLink = getLinkedMinecraftName(discordId);
        const tenGame = interaction.options.getString('ten_game');

        // If user provided a name, link it
        if (tenGame) {
            // Validate name
            if (/^[a-zA-Z0-9_]{3,16}$/.test(tenGame)) {
                setLinkedAccount(discordId, tenGame);

                const successEmbed = new EmbedBuilder()
                    .setTitle('<:4366minecraftaccept:1448944878812794950> **Discord của bạn đã liên kết với tên game**')
                    .setDescription(`Đã liên kết với **${tenGame}**!\nThông tin player sẽ được hiện thị ở đây`)
                    .setColor(0x12C81A)
                    .setThumbnail('https://cdn3.emoji.gg/emojis/8246-alex-yes.png');

                const inviteEmbed = new EmbedBuilder()
                    .setTitle('⋌  ━━━━━━━━━━━━━━━ ⋋\n┃ Mời bạn vào server┃\n    ━━━━━━━━━━━━━━━━')
                    .setDescription('*Thông tin sẽ được cập nhật khi vào server*')
                    .setColor(0x12C81A)
                    .setThumbnail('https://cdn3.emoji.gg/emojis/4192-pepeminecraft.png');

                const mcButton = new ButtonBuilder()
                    .setLabel('Mở Minecraft')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://minecraftautolog.netlify.app/');

                const row = new ActionRowBuilder().addComponents(mcButton);

                await interaction.reply({
                    embeds: [successEmbed, inviteEmbed],
                    components: [row],
                    ephemeral: true // Only visible to the user
                });

                console.log(`[LinkAccount] Linked ${discordId} -> ${tenGame} (slash command)`);
            } else {
                await interaction.reply({
                    content: '❌ Tên không hợp lệ! Tên phải có 3-16 ký tự (a-z, 0-9, _)',
                    ephemeral: true
                });
            }
            return;
        }

        // Check if already linked
        if (existingLink) {
            const infoEmbed = new EmbedBuilder()
                .setTitle('<:4366minecraftaccept:1448944878812794950> **Bạn đã liên kết rồi!**')
                .setDescription(`Tên Minecraft: **${existingLink}**\n\nĐể đổi tên, dùng: \`/link ten_game:<tên mới>\``)
                .setColor(0x12C81A)
                .setThumbnail('https://cdn3.emoji.gg/emojis/8246-alex-yes.png');

            await interaction.reply({
                embeds: [infoEmbed],
                ephemeral: true
            });
            return;
        }

        // Not linked - show instructions
        const instructEmbeds = [
            new EmbedBuilder()
                .setColor(0x0B0000)
                .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHNsM3dvanQzanQxMGdxdGpmc3J4eWxucHppem1lbW1vaGI0YXBlZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/v63B5WpbX0a03HAVRV/giphy.gif'),
            new EmbedBuilder()
                .setTitle('**Nhập tên game╎ hoặc╎ Up ảnh màn hình chờ ╎ minecraft**')
                .setDescription('Dùng lệnh: `/link ten_game:<tên minecraft của bạn>`\n\nHoặc up ảnh màn hình chờ vào channel này')
                .setColor(0x08BF25)
        ];

        await interaction.reply({
            embeds: instructEmbeds,
            ephemeral: true // Only visible to the user
        });
    }
});

// -------------------- INTERACTION HANDLER (BUTTONS) --------------------
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    try {
        // Prevent "Interaction has already been acknowledged"
        if (interaction.replied || interaction.deferred) return;

        const responseMap = {
            'btn_ip': `**IP:** \`${CONFIG.SERVER_IP}\`\n**Port:** \`${CONFIG.SERVER_PORT}\``,
            'btn_rules': "📜 **Luật:** Không Hack, Không Spam, Văn minh lịch sự!",
            'btn_help': "🤖 Gõ `!help` hoặc tag mình để chat nhé!"
        };

        if (responseMap[interaction.customId]) {
            await interaction.reply({ content: responseMap[interaction.customId], ephemeral: true });
        }

        // ==================== TIC-TAC-TOE HANDLER ====================
        if (interaction.customId.startsWith('ttt_')) {
            await handleTicTacToe(interaction);
        }

    } catch (e) {
        console.error("Interaction Error:", e.message);
    }
});

// ==================== TIC-TAC-TOE GAME LOGIC ====================
const tttGames = new Map();

async function handleTicTacToe(interaction) {
    const userId = interaction.user.id;
    const [prefix, action, ...args] = interaction.customId.split('_');

    // Get game state (stored by Message ID to allow multiple games)
    const gameId = interaction.message.id;
    let game = tttGames.get(gameId);

    if (!game && action !== 'new') {
        return interaction.reply({ content: '❌ Game này đã kết thúc hoặc không tồn tại!', ephemeral: true });
    }

    if (action === 'move') {
        const index = parseInt(args[0]);

        if (game.turn !== userId) {
            return interaction.reply({ content: '🚫 Chưa đến lượt bạn!', ephemeral: true });
        }

        if (game.board[index] !== null) {
            return interaction.reply({ content: '🚫 Ô này đã đánh rồi!', ephemeral: true });
        }

        // Player Move
        game.board[index] = 'X';
        game.turn = 'BOT';

        // Check Win/Draw
        let winner = checkWinner(game.board);
        if (winner || !game.board.includes(null)) {
            await updateTTTBoard(interaction, game, winner);
            tttGames.delete(gameId);
            return;
        }

        // Bot Move (Simple AI)
        // 1. Try to win
        // 2. Block player
        // 3. Pick center
        // 4. Pick random
        let botMove = getBestMove(game.board, 'O');
        game.board[botMove] = 'O';
        game.turn = userId;

        // Check Win/Draw again
        winner = checkWinner(game.board);
        if (winner || !game.board.includes(null)) {
            await updateTTTBoard(interaction, game, winner);
            tttGames.delete(gameId);
        } else {
            await updateTTTBoard(interaction, game, null);
        }
    }
}

function checkWinner(board) {
    const wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    for (let c of wins) {
        if (board[c[0]] && board[c[0]] === board[c[1]] && board[c[0]] === board[c[2]]) return board[c[0]];
    }
    return null;
}

function getBestMove(board, player) {
    const opponent = player === 'O' ? 'X' : 'O';

    // 1. Win?
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = player;
            if (checkWinner(board) === player) { board[i] = null; return i; }
            board[i] = null;
        }
    }
    // 2. Block?
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = opponent;
            if (checkWinner(board) === opponent) { board[i] = null; return i; }
            board[i] = null;
        }
    }
    // 3. Center?
    if (board[4] === null) return 4;
    // 4. Random
    const available = board.map((v, i) => v === null ? i : null).filter(v => v !== null);
    return available[Math.floor(Math.random() * available.length)];
}

async function updateTTTBoard(interaction, game, winner) {
    const rows = [];
    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
            const idx = i * 3 + j;
            const btn = new ButtonBuilder()
                .setCustomId(`ttt_move_${idx}`)
                .setStyle(game.board[idx] === 'X' ? ButtonStyle.Primary : (game.board[idx] === 'O' ? ButtonStyle.Danger : ButtonStyle.Secondary))
                .setLabel(game.board[idx] || ' ')
                .setDisabled(!!winner || !game.board.includes(null) || game.board[idx] !== null);
            row.addComponents(btn);
        }
        rows.push(row);
    }

    let status = `🎮 **Tic-Tac-Toe**\nBạn (X) vs Bot (O)`;
    if (winner === 'X') status = `🎉 **BẠN THẮNG!** Hay quá! 🏆`;
    else if (winner === 'O') status = `🤖 **BOT THẮNG!** Non quá! 😜`;
    else if (!game.board.includes(null)) status = `🤝 **HÒA!** Ngang tài ngang sức!`;

    await interaction.update({ content: status, components: rows });
}

// Hàm download thư mục đệ quy an toàn (bỏ qua file bị lỗi/bị xóa)
async function safeDownloadDir(sftp, src, dst) {
    try {
        if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });

        const list = await sftp.list(src);
        for (const item of list) {
            const srcPath = `${src}/${item.name}`; // Remote path uses forward slashes
            const dstPath = path.join(dst, item.name);

            if (item.type === 'd') {
                await safeDownloadDir(sftp, srcPath, dstPath);
            } else {
                try {
                    await sftp.fastGet(srcPath, dstPath);
                } catch (err) {
                    // Bỏ qua lỗi "no such file" khi file bị xóa trong lúc download
                    console.warn(`[Backup] Skipped: ${srcPath} (${err.code || err.message})`);
                }
            }
        }
    } catch (err) {
        console.warn(`[Backup] Error processing ${src}: ${err.message}`);
    }
}

// ==================== BACKUP FUNCTION ====================
async function runBackup(message) {
    const sftp = new SftpClient();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const localDir = path.join(__dirname, 'BACKUPS');
    const zipPath = path.join(localDir, `world_${timestamp}.zip`);

    const updateStatus = async (text) => {
        if (message) {
            try { await message.edit(text); } catch { }
        } else {
            console.log(`[Auto Backup] ${text}`);
        }
    };

    const loadingMsg = message ? await message.reply('⏳ Đang backup world...') : null;
    const tempDir = path.join(localDir, `temp_${timestamp}`);

    try {
        if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

        await updateStatus('📡 Đang kết nối SFTP...');
        console.log(`[Backup] Connecting to ${CONFIG.SFTP_HOST}...`);

        await sftp.connect({
            host: CONFIG.SFTP_HOST,
            port: CONFIG.SFTP_PORT,
            username: CONFIG.SFTP_USER,
            password: CONFIG.SFTP_PASSWORD
        });
        console.log('[Backup] Connected to SFTP');

        await updateStatus('📥 Đang tải world...');
        const remotePath = CONFIG.SFTP_WORLD_PATH;
        console.log(`[Backup] Downloading from: ${remotePath} to ${tempDir}`);

        // Verify remote path exists first
        const exists = await sftp.exists(remotePath);
        if (!exists) {
            throw new Error(`Remote path does not exist: ${remotePath}`);
        }

        // Sử dụng hàm custom để download an toàn (bỏ qua file bị lỗi/bị xóa trong lúc download)
        await safeDownloadDir(sftp, remotePath, tempDir);

        // await sftp.downloadDir(remotePath, tempDir); 
        await sftp.end();
        console.log('[Backup] Download complete');

        await updateStatus('📦 Đang nén thành ZIP...');
        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            archive.directory(tempDir, 'world');
            archive.finalize();
        });
        console.log('[Backup] Zip complete');

        const stats = fs.statSync(zipPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        fs.rmSync(tempDir, { recursive: true, force: true });

        const backupChannel = await client.channels.fetch(CONFIG.BACKUP_CHANNEL_ID).catch(() => null);
        const limitSize = CONFIG.MAX_BACKUP_SIZE_MB || 10;

        // GENERATE HISTORY TREE
        const backupFiles = fs.readdirSync(localDir).filter(f => f.endsWith('.zip'));
        const backupsByDay = {}; // Map<DD-MM-YYYY, filename>

        // Add current file to list virtually (it might not be in readdirSync yet if async write)
        // But we just wrote it synchronously `fs.createWriteStream`.
        // Let's re-read or just assume it's there. 

        backupFiles.forEach(f => {
            // Format: world_2026-02-10T05-38-50.zip
            const match = f.match(/world_(\d{4})-(\d{2})-(\d{2})T/);
            if (match) {
                const dayKey = `${match[3]}-${match[2]}-${match[1]}`; // DD-MM-YYYY
                // Keep the LATEST file of the day (lexicographically larger timestamp)
                if (!backupsByDay[dayKey] || f > backupsByDay[dayKey]) {
                    backupsByDay[dayKey] = f;
                }
            }
        });

        // Ensure current backup is in the list
        const now = new Date();
        const todayKey = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        // If the current file is newer than what's on disk (it should be), update it
        // actually `zipPath` is the current file.
        // We can just rely on `backupsByDay` having the latest if readdirSync picked it up.

        const sortedDays = Object.keys(backupsByDay).sort((a, b) => {
            const [d1, m1, y1] = a.split('-').map(Number);
            const [d2, m2, y2] = b.split('-').map(Number);
            return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
        });

        // Take last 3 days
        const recentDays = sortedDays.slice(-3);

        let treeDescription = "● Danh sách \n";
        recentDays.forEach((day, index) => {
            treeDescription += `╰─world_${day}.zip\n`;
        });

        // Add dots line if needed
        treeDescription += "ㅤ    ....\n";

        // Add footer time logic
        treeDescription += `● **TIME** ⸺ <t:${Math.floor(Date.now() / 1000)}:R>`;

        // ALWAYS SEND TO TELEGRAM (SECURITY)
        let statusText = `✅ Backup thành công!\n📊 Size: ${sizeMB} MB`;
        // Instead of editing with status text, just delete the "Loading..." message if it exists
        if (loadingMsg) {
            await loadingMsg.delete().catch(() => { });
        }

        try {
            if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_BACKUP_CHAT_ID) {
                const dateStr = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
                const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
                const caption = `Backup: ${dateStr}, ${timeStr} (${sizeMB} MB)`;

                await sendToTelegram(zipPath, caption);
                statusText += `\n🚀 **Đã gửi sang Telegram (Bảo Mật)!**`;

                if (backupChannel) {
                    // Embed 1: Header
                    const headerEmbed = new EmbedBuilder()
                        .setTitle('● **Back-Up-World**')
                        .setDescription(`**Map:** Sinh tồn\n**Size:** ${sizeMB} MB\n**Auto Backup**`)
                        .setColor(0x5DE680)
                        .setThumbnail('https://i.giphy.com/szaTML0LZFAQa3do7Y.webp');

                    // Embed 2: History Tree (Title)
                    const listEmbed = new EmbedBuilder()
                        .setTitle(treeDescription)
                        .setColor(0xF7F400);

                    // PERSISTENT MESSAGE LOGIC
                    try {
                        let dashboardMsg = null;
                        const messages = await backupChannel.messages.fetch({ limit: 10 }).catch(() => null);
                        if (messages) {
                            dashboardMsg = messages.find(m =>
                                m.author.id === client.user.id &&
                                m.embeds.length > 0 &&
                                m.embeds[0].title &&
                                m.embeds[0].title.includes('Back-Up-World')
                            );
                        }

                        if (dashboardMsg) {
                            // Edit existing
                            // If dashboard is the very last message -> EDIT
                            const lastMsg = messages.first();
                            if (lastMsg && lastMsg.id === dashboardMsg.id) {
                                await dashboardMsg.edit({ embeds: [headerEmbed, listEmbed] });
                            } else {
                                // If not last -> Delete & Send New (to keep at bottom)
                                await dashboardMsg.delete().catch(() => { });
                                await backupChannel.send({ embeds: [headerEmbed, listEmbed] });
                            }
                        } else {
                            // Send new
                            await backupChannel.send({ embeds: [headerEmbed, listEmbed] });
                        }
                    } catch (err) {
                        console.error("[Backup] Error updating dashboard message:", err);
                        // Fallback send
                        await backupChannel.send({ embeds: [headerEmbed, listEmbed] });
                    }
                }
            } else {
                statusText += `\n❌ Chưa cấu hình Telegram! Đang thử gửi Discord...`;
                if (sizeMB < limitSize && backupChannel) {
                    await backupChannel.send({
                        content: "⚠️ Telegram chưa cấu hình, gửi tạm vào đây:",
                        files: [{ attachment: zipPath, name: `world_${timestamp}.zip` }]
                    });
                } else {
                    statusText += `\n⚠️ File quá lớn (${sizeMB} MB) để gửi Discord fallback.`;
                }
            }
        } catch (tgErr) {
            console.error("[Telegram Backup Error]", tgErr);
            statusText += `\n❌ Lỗi gửi Telegram: ${tgErr.message}`;
            // Fallback on error
            if (backupChannel) await backupChannel.send(`❌ **Lỗi gửi Telegram:** ${tgErr.message}`);
        }

        // if (loadingMsg) await loadingMsg.edit(statusText); // Removed as we use Embeds now

        console.log(`[Backup] Created: ${zipPath} (${sizeMB} MB)`);

        // Update last backup time
        lastBackupTime = Date.now();

        // === DỌN DẸP FILE CŨ: Giữ lại 3 bản mới nhất ===
        try {
            const MAX_BACKUPS = 3;
            const allZips = fs.readdirSync(localDir)
                .filter(f => f.startsWith('world_') && f.endsWith('.zip'))
                .sort(); // Sắp xếp theo tên (timestamp) -> cũ nhất trước

            if (allZips.length > MAX_BACKUPS) {
                const toDelete = allZips.slice(0, allZips.length - MAX_BACKUPS);
                for (const oldFile of toDelete) {
                    const oldPath = path.join(localDir, oldFile);
                    fs.unlinkSync(oldPath);
                    console.log(`[Backup] Deleted old backup: ${oldFile}`);
                }
                console.log(`[Backup] Cleanup: Kept ${MAX_BACKUPS}, deleted ${toDelete.length} old backups`);
            }
        } catch (cleanupErr) {
            console.error('[Backup] Cleanup error:', cleanupErr.message);
        }

    } catch (error) {
        console.error('[Backup] Error:', error);
        let errorMsg = error.message;
        if (error.code === 40005 || error.status === 413) errorMsg = "File quá lớn để gửi lên Discord API (413 Payload Too Large)";
        if (loadingMsg) await loadingMsg.edit(`❌ Lỗi backup: ${errorMsg}`);
    } finally {
        try {
            if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        } catch { }
        try { await sftp.end(); } catch { }
    }
}

// -------------------- COMMAND HANDLER (SINGLE FILE) --------------------

client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;
        const content = (message.content || "").trim();



        // QUICK LOWER (but keep original for args)
        const contentLower = content.toLowerCase();

        // DEBUG: Check bot path
        if (contentLower === '!checkpath') {
            await message.reply(`📂 Bot đang chạy tại: \`${process.cwd()}\`\n📜 File: \`${__filename}\`\n🚀 Version: NO_REACT_UPDATE_CONFIRMED`);
            return;
        }

        // AI CHAT
        // Trigger if:
        // 1. Mentioned (@Bot)
        // 2. Starts with !ask
        // 3. OR: In the specific CHANNEL_ID and NOT a command (doesn't start with !)
        const isChatChannel = message.channelId === CONFIG.CHANNEL_ID;
        const isCommand = content.startsWith('!');


        // ==================== INFO CHANNEL - LINK DISCORD <-> MINECRAFT ====================
        if (message.channelId === CONFIG.INFO_CHANNEL_ID && !isCommand) {
            const discordId = message.author.id;
            const existingLink = getLinkedMinecraftName(discordId);

            // If already linked, check if they want to update
            if (existingLink && !content && message.attachments.size === 0) {
                return; // Ignore empty messages if already linked
            }

            // CASE 1: User uploaded an image (screenshot scanning with Groq Vision)
            if (message.attachments.size > 0) {
                const attachment = message.attachments.first();
                if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                    try {
                        // Show scanning embed
                        const scanningEmbed = new EmbedBuilder()
                            .setTitle('**Ảnh đang được scan...**')
                            .setDescription('*Vui lòng đợi*')
                            .setColor(0xFFD700)
                            .setThumbnail('https://cdn3.emoji.gg/emojis/864281-ralsei-mining.gif');

                        const scanningMsg = await message.channel.send({ embeds: [scanningEmbed] });

                        // Download image
                        const imageResp = await fetch(attachment.url);
                        const imageBuffer = await imageResp.arrayBuffer();
                        const base64Image = Buffer.from(imageBuffer).toString('base64');

                        // Call Groq Vision
                        const scanPrompt = `Phân tích ảnh này. Nếu đây là màn hình chờ Minecraft Bedrock Edition (loading screen có gamertag/tên người chơi), hãy trích xuất tên người chơi.

Trở về JSON:
{
  "isMCScreen": true/false,
  "playerName": "tên người chơi nếu tìm thấy"
}

Chỉ trả về JSON, không giải thích.`;

                        const responseText = await callGeminiVision(scanPrompt, base64Image, attachment.contentType);
                        console.log('[LinkAccount] Vision response:', responseText);

                        // Parse JSON
                        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const scanResult = JSON.parse(jsonMatch[0]);

                            if (scanResult.isMCScreen && scanResult.playerName) {
                                setLinkedAccount(discordId, scanResult.playerName);
                                await scanningMsg.delete().catch(() => { });

                                const messages = await message.channel.messages.fetch({ limit: 20 });
                                const userMessages = messages.filter(m => m.author.id === discordId);
                                for (const msg of userMessages.values()) {
                                    await msg.delete().catch(() => { });
                                }

                                const successEmbed = new EmbedBuilder()
                                    .setTitle('<:4366minecraftaccept:1448944878812794950> **Discord của bạn đã liên kết với tên game**')
                                    .setDescription(`Đã liên kết <@${discordId}> với **${scanResult.playerName}**!`)
                                    .setColor(0x12C81A)
                                    .setThumbnail('https://cdn3.emoji.gg/emojis/8246-alex-yes.png');

                                const mcButton = new ButtonBuilder()
                                    .setLabel('Mở Minecraft')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL('https://minecraftautolog.netlify.app/');
                                const row = new ActionRowBuilder().addComponents(mcButton);

                                const successMsg = await message.channel.send({ embeds: [successEmbed], components: [row] });
                                setTimeout(() => successMsg.delete().catch(() => { }), 60000);
                                console.log(`[LinkAccount] Linked ${discordId} -> ${scanResult.playerName}`);
                                return;
                            } else {
                                await scanningMsg.delete().catch(() => { });
                                const errorEmbed = new EmbedBuilder()
                                    .setTitle('<:5189minecraftdeny:1448944850253906102> **Đây không phải ảnh màn hình chờ minecraft**')
                                    .setDescription('Vui lòng gửi lại đúng ảnh hoặc nhập tên thủ công nha')
                                    .setColor(0xCA0A12);
                                const errorMsg = await message.channel.send({ embeds: [errorEmbed] });
                                setTimeout(() => { message.delete().catch(() => { }); errorMsg.delete().catch(() => { }); }, 2000);
                                return;
                            }
                        }
                    } catch (e) {
                        console.error('[LinkAccount] Error scanning image:', e.message);
                        const errorEmbed = new EmbedBuilder()
                            .setTitle('**Lỗi scan ảnh**')
                            .setDescription('Vui lòng nhập tên Minecraft thủ công.')
                            .setColor(0xCA0A12);
                        const errMsg = await message.channel.send({ embeds: [errorEmbed] });
                        setTimeout(() => { message.delete().catch(() => { }); errMsg.delete().catch(() => { }); }, 5000);
                        return;
                    }
                }
            }

            // CASE 2: User typed a name manually
            if (content && !content.startsWith('!')) {
                const minecraftName = content.trim();

                // Basic validation (alphanumeric, 3-16 chars)
                if (/^[a-zA-Z0-9_]{3,16}$/.test(minecraftName)) {
                    setLinkedAccount(discordId, minecraftName);

                    // Delete the message
                    await message.delete().catch(() => { });

                    // Send success embed (Discohook design)
                    const successEmbed = new EmbedBuilder()
                        .setTitle('<:4366minecraftaccept:1448944878812794950> **Discord của bạn đã liên kết với tên game**')
                        .setDescription(`Đã liên kết <@${discordId}> với **${minecraftName}**!\nThông tin player sẽ được hiện thị ở đây`)
                        .setColor(0x12C81A)
                        .setThumbnail('https://cdn3.emoji.gg/emojis/8246-alex-yes.png');

                    // Invite embed
                    const inviteEmbed = new EmbedBuilder()
                        .setTitle('⋌  ━━━━━━━━━━━━━━━ ⋋\n┃ Mời bạn vào server┃\n    ━━━━━━━━━━━━━━━━')
                        .setDescription('*Thông tin sẽ được cập nhật khi vào game*')
                        .setColor(0x2B2D31)
                        .setImage('https://media.discordapp.net/attachments/1241151603512217684/1337449232931520624/standard_2.gif?ex=67a780e0&is=67a62f60&hm=6a8b79b5c3e590400b407b469e38f6540c49275ba2846cbaf2ea98782a93361e&=&width=622&height=41')
                        .setFooter({ text: 'IP: gamma.pikamc.vn:25825', iconURL: 'https://cdn.discordapp.com/emojis/1063426742511018045.webp?size=96&quality=lossless' });

                    const mcButton = new ButtonBuilder()
                        .setLabel('Mở Minecraft')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://minecraftautolog.netlify.app/');

                    const row = new ActionRowBuilder().addComponents(mcButton);

                    const successMsg = await message.channel.send({
                        embeds: [successEmbed, inviteEmbed],
                        components: [row]
                    });
                    setTimeout(() => successMsg.delete().catch(() => { }), 60000);

                    console.log(`[LinkAccount] Linked ${discordId} -> ${minecraftName} (manual)`);
                    return;
                } else {
                    // Invalid name - delete and show error
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('<:5189minecraftdeny:1448944850253906102> **Tên không hợp lệ**')
                        .setDescription(`Tên Minecraft chỉ chứa chữ cái, số và dấu gạch dưới (_), dài 3-16 ký tự.`)
                        .setColor(0xCA0A12)
                        .setThumbnail('https://cdn3.emoji.gg/emojis/2175-steve-nope.png');

                    const errorMsg = await message.channel.send({ embeds: [errorEmbed] });
                    setTimeout(() => {
                        message.delete().catch(() => { });
                        errorMsg.delete().catch(() => { });
                    }, 3000);
                    return;
                }
            }

            // CASE 3: Not linked yet - show instructions (Discohook design)
            if (!existingLink && !content && message.attachments.size === 0) {
                const instructEmbeds = [
                    new EmbedBuilder()
                        .setColor(0x0B0000)
                        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHNsM3doanQzanQxMGdxdGpmc3J4eWxucHppem1lbW1vaGI0YXBlZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/v63B5WpbX0a03HAVRV/giphy.gif'),
                    new EmbedBuilder()
                        .setTitle('**Nhập tên game╎ hoặc╎ Up ảnh màn hình chờ ╎ minecraft**')
                        .setDescription('Sau khi liên kết tên game với Discord thì thông tin player sẽ hiện thị ở đây')
                        .setColor(0x08BF25)
                ];

                const instructMsg = await message.channel.send({ embeds: instructEmbeds });
                setTimeout(() => instructMsg.delete().catch(() => { }), 10000);
                await message.delete().catch(() => { });

                return;
            }
        }

        // ==================== !GAME COMMAND (BYPASS AI) ====================
        if (contentLower.startsWith('!game ')) {
            const gameInput = content.substring(6).trim().toLowerCase().replace(/\s+/g, '');
            const game = DISCORD_GAMES[gameInput];

            if (!game) {
                const availableGames = Object.keys(DISCORD_GAMES).slice(0, 10).join(', ');
                return message.reply(`❌ Game "${gameInput}" không tồn tại!\n\n**Danh sách game:** ${availableGames}...`);
            }

            try {
                // Find a voice channel the user is in, or use current channel
                let targetChannel = message.member?.voice?.channel || message.channel;

                // Create activity invite
                const invite = await targetChannel.createInvite({
                    maxAge: 86400, // 24 hours
                    maxUses: 0,
                    targetType: 2, // Embedded Application
                    targetApplication: game.id
                }).catch(async () => {
                    // Fallback: Try with main channel if voice fails
                    return await message.channel.createInvite({
                        maxAge: 86400,
                        maxUses: 0,
                        targetType: 2,
                        targetApplication: game.id
                    });
                });

                if (invite) {
                    const gameEmbed = new EmbedBuilder()
                        .setTitle(`${game.emoji} ${game.name}`)
                        .setDescription(`Click để chơi ngay!`)
                        .setColor(0x5865F2)
                        .setURL(`https://discord.gg/${invite.code}`)
                        .setFooter({ text: `Hết hạn sau 24 giờ • Yêu cầu bởi ${message.author.username}` });

                    const button = new ButtonBuilder()
                        .setLabel('🎮 Chơi ngay!')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://discord.gg/${invite.code}`);

                    const row = new ActionRowBuilder().addComponents(button);

                    await message.channel.send({ embeds: [gameEmbed], components: [row] });
                    console.log(`[!game] Created ${game.name} for ${message.author.username}`);
                } else {
                    await message.reply('❌ Không thể tạo invite link cho game này!');
                }
            } catch (error) {
                console.error(`[!game] Error:`, error);
                await message.reply(`❌ Lỗi khi tạo game: ${error.message}`);
            }
            return; // Don't process as AI chat
        }

        // ==================== !TICTACTOE COMMAND ====================
        if (contentLower === '!tictactoe' || contentLower === '!ttt' || contentLower === '!caro') {
            const board = Array(9).fill(null);
            const rows = [];
            for (let i = 0; i < 3; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    const idx = i * 3 + j;
                    const btn = new ButtonBuilder()
                        .setCustomId(`ttt_move_${idx}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel(' ');
                    row.addComponents(btn);
                }
                rows.push(row);
            }

            const msg = await message.channel.send({
                content: '🎮 **Tic-Tac-Toe**\nBạn (X) đi trước! Đánh bại Bot (O) đi nào! 🤖',
                components: rows
            });

            // Init Game State
            tttGames.set(msg.id, {
                board: board,
                turn: message.author.id,
                players: { X: message.author.id, O: 'BOT' }
            });
            return;
        }

        // ==================== !SERVER COMMAND (PTERODACTYL) ====================
        if (contentLower.startsWith('!server ') || contentLower === '!server') {
            // Admin only
            if (message.author.id !== CONFIG.ADMIN_ID) {
                return message.reply('❌ Chỉ Admin mới có quyền dùng lệnh này!');
            }

            const action = content.substring(8).trim().toLowerCase();
            const validActions = ['start', 'stop', 'restart', 'kill'];

            if (!action || !validActions.includes(action)) {
                return message.reply(`⚙️ **Server Control**\nCách dùng: \`!server <action>\`\n\n**Actions:** start, stop, restart, kill`);
            }

            try {
                const loadingMsg = await message.reply(`⏳ Đang ${action} server...`);

                const response = await fetch(`${CONFIG.PTERODACTYL_URL}/api/client/servers/${CONFIG.PTERODACTYL_SERVER_ID}/power`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${CONFIG.PTERODACTYL_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ signal: action })
                });

                if (response.ok) {
                    await loadingMsg.edit(`✅ Server đã được **${action}** thành công!`);
                    console.log(`[Pterodactyl] ${action} server by ${message.author.username}`);
                } else {
                    const error = await response.text();
                    await loadingMsg.edit(`❌ Lỗi: ${response.status} - ${error.slice(0, 100)}`);
                    console.error('[Pterodactyl] Error:', error);
                }
            } catch (error) {
                await message.reply(`❌ Lỗi kết nối API: ${error.message}`);
            }
            return;
        }

        // ==================== !CONSOLE COMMAND (PTERODACTYL) ====================
        if (contentLower.startsWith('!console ')) {
            // Admin only
            if (message.author.id !== CONFIG.ADMIN_ID) {
                return message.reply('❌ Chỉ Admin mới có quyền dùng lệnh này!');
            }

            const command = content.substring(9).trim();
            if (!command) {
                return message.reply('⚙️ **Console Command**\nCách dùng: `!console <lệnh>`\n\nVí dụ: `!console say Hello World`');
            }

            try {
                const response = await fetch(`${CONFIG.PTERODACTYL_URL}/api/client/servers/${CONFIG.PTERODACTYL_SERVER_ID}/command`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${CONFIG.PTERODACTYL_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ command: command })
                });

                if (response.ok || response.status === 204) {
                    await message.reply(`✅ Đã gửi lệnh: \`${command}\``);
                    console.log(`[Pterodactyl] Console: ${command} by ${message.author.username}`);
                } else {
                    const error = await response.text();
                    await message.reply(`❌ Lỗi: ${response.status} - ${error.slice(0, 100)}`);
                }
            } catch (error) {
                await message.reply(`❌ Lỗi kết nối API: ${error.message}`);
            }
            return;
        }

        // ==================== !SETUP COMMAND (LINK INSTRUCTIONS EMBED) ====================
        if (contentLower === '!setup') {
            // Admin only
            if (message.author.id !== CONFIG.ADMIN_ID) {
                return message.reply('❌ Chỉ Admin mới có quyền dùng lệnh này!');
            }

            // Delete command message
            await message.delete().catch(() => { });

            // Create permanent instructions embed
            const instructEmbeds = [
                new EmbedBuilder()
                    .setColor(0x0B0000)
                    .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHNsM3doanQzanQxMGdxdGpmc3J4eWxucHppem1lbW1vaGI0YXBlZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/v63B5WpbX0a03HAVRV/giphy.gif'),
                new EmbedBuilder()
                    .setTitle('**Nhập tên game╎ hoặc╎ Up ảnh màn hình chờ ╎ minecraft**')
                    .setDescription('Sau khi liên kết tên game với Discord thì thông tin player sẽ hiện thị ở đây')
                    .setColor(0x08BF25)
            ];

            await message.channel.send({ embeds: instructEmbeds });
            console.log('[Setup] Created link instructions embed');
            return;
        }

        if (contentLower.startsWith('!backup')) {
            // Admin only
            if (message.author.id !== CONFIG.ADMIN_ID) {
                return message.reply('❌ Chỉ Admin mới có quyền dùng lệnh này!');
            }

            const args = content.substring(7).trim().toLowerCase().split(/\s+/);

            // !backup auto <hours> - Setup auto backup
            if (args[0] === 'auto') {
                if (args[1] === 'off' || args[1] === 'stop') {
                    if (global.autoBackupInterval) {
                        clearInterval(global.autoBackupInterval);
                        global.autoBackupInterval = null;
                        return message.reply('✅ Đã tắt Auto Backup!');
                    } else {
                        return message.reply('⚠️ Auto Backup chưa được bật!');
                    }
                }

                const hours = parseFloat(args[1]);
                if (isNaN(hours) || hours < 0.5 || hours > 24) {
                    return message.reply('⚙️ **Auto Backup Setup**\nCách dùng: `!backup auto <hours>`\n\n**Ví dụ:**\n• `!backup auto 1` - Backup mỗi 1 giờ\n• `!backup auto 6` - Backup mỗi 6 giờ\n• `!backup auto off` - Tắt auto backup\n\n**Giới hạn:** 0.5 - 24 giờ');
                }

                // Clear existing interval
                if (global.autoBackupInterval) clearInterval(global.autoBackupInterval);

                // Set new interval
                const intervalMs = hours * 60 * 60 * 1000;
                global.autoBackupInterval = setInterval(async () => {
                    console.log('[Auto Backup] Starting scheduled backup...');
                    await runBackup(null); // null = no message to reply to
                }, intervalMs);

                // Store settings
                global.autoBackupHours = hours;

                return message.reply(`✅ **Auto Backup đã bật!**\n⏰ Backup tự động mỗi **${hours} giờ**\n\nDùng \`!backup auto off\` để tắt.`);
            }

            // !backup status - Check status
            if (args[0] === 'status') {
                if (global.autoBackupInterval) {
                    return message.reply(`📊 **Auto Backup Status**\n✅ Đang bật - Mỗi ${global.autoBackupHours} giờ`);
                } else {
                    return message.reply(`📊 **Auto Backup Status**\n❌ Đang tắt`);
                }
            }

            // !backup (manual) - no args
            if (!args[0] || args[0] === '') {
                await runBackup(message);
            }
            return;
        }

        // !telegram_check - Lấy Telegram Chat ID
        if (contentLower === '!telegram_check') {
            if (message.author.id !== CONFIG.ADMIN_ID) return;

            await message.reply("⏳ Đang check tin nhắn Telegram...");
            try {
                const response = await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/getUpdates`);
                const data = await response.json();

                if (data.ok && data.result.length > 0) {
                    const lastMsg = data.result[data.result.length - 1];
                    const chat = lastMsg.message?.chat || lastMsg.my_chat_member?.chat || lastMsg.channel_post?.chat;

                    if (chat) {
                        await message.reply(`✅ **Tìm thấy Chat ID!**\n\n🆔 ID: \`${chat.id}\`\n👤 Name: ${chat.first_name || chat.title} (${chat.type})\n\n👉 Copy ID trên và điền vào dòng \`TELEGRAM_BACKUP_CHAT_ID\` trong file index.js`);
                    } else {
                        await message.reply("❌ Không tìm thấy thông tin Chat ID trong tin nhắn mới nhất.");
                    }
                } else {
                    await message.reply("❌ Chưa thấy tin nhắn nào gửi cho Bot Telegram.\n👉 Hãy vào Telegram, tìm bot và gửi 1 tin nhắn bất kỳ, sau đó gõ lại lệnh này!");
                }
            } catch (e) {
                await message.reply(`❌ Lỗi API Telegram: ${e.message}`);
            }
            return;
        }

        // ==================== CHAT IN-GAME (Discord -> Minecraft) ====================
        if (message.channelId === CONFIG.CHAT_INGAME_CHANNEL_ID && !content.startsWith('!') && !message.author.bot) {
            // Don't forward bot messages or commands
            const playerName = message.member?.displayName || message.author.username;
            const chatMessage = content;

            if (chatMessage && chatMessage.trim().length > 0) {
                // Push to queue for Addon to poll
                const msgObj = {
                    type: 'chat',
                    sender: playerName,
                    message: `§l${chatMessage.substring(0, 200)}`, // Bold message
                    timestamp: Date.now()
                };
                addonMessageQueue.push(msgObj);

                console.log(`[Chat] Discord -> Minecraft: <${playerName}> ${chatMessage}`);

            }
            return;
        }

        // ==================== VIDEO DOWNLOAD HANDLER ====================
        // Handle video downloads in VIDEO_DOWNLOAD_CHANNEL_ID
        if (message.channelId === CONFIG.VIDEO_DOWNLOAD_CHANNEL_ID) {

            // Nếu user gửi ảnh (không có link), dùng AI phân tích
            if (message.attachments.size > 0 && !content.match(/(https?:\/\/[^\s]+)/i)) {
                const attachment = message.attachments.first();

                // Check if it's an image
                if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                    let loadingMsg = null; // Khai báo ngoài try để access trong catch
                    try {
                        // ⚠️ QUAN TRỌNG: Download ảnh TRƯỚC khi xóa message!
                        // Vì khi message bị xóa, URL attachment cũng hết hiệu lực

                        // Download image với headers (Discord CDN cần User-Agent)
                        const imageResp = await fetch(attachment.url, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Accept': 'image/*'
                            }
                        });

                        if (!imageResp.ok) {
                            throw new Error(`Failed to download image: ${imageResp.status}`);
                        }

                        const imageBuffer = await imageResp.arrayBuffer();
                        let mimeType = (imageResp.headers.get('content-type') || attachment.contentType || 'image/jpeg').split(';')[0].trim();

                        // Kiểm tra ảnh rỗng
                        if (imageBuffer.byteLength < 100) {
                            throw new Error('Image download failed - empty image');
                        }

                        const base64Image = Buffer.from(imageBuffer).toString('base64');
                        console.log('[AI Image Search] Image size:', imageBuffer.byteLength, 'bytes, mimeType:', mimeType);

                        // Giờ mới xóa tin nhắn gốc (sau khi đã download xong)
                        await message.delete().catch(() => { });

                        // Gửi loading message
                        const loadingEmbed = new EmbedBuilder()
                            .setTitle('🤖 AI đang phân tích ảnh...')
                            .setDescription('⏳ Vui lòng đợi...')
                            .setColor(0xFFAA00)
                            .setTimestamp();
                        loadingMsg = await message.channel.send({ embeds: [loadingEmbed] }).catch(() => null);

                        // Prompt cho Gemini
                        const aiPrompt = `Phân tích ảnh screenshot video từ YouTube Shorts, TikTok, hoặc Facebook Reels.

NHIỆM VỤ: Tìm và trích xuất CHÍNH XÁC:
1. TÊN KÊNH/TÊN NGƯỜI ĐĂNG (có thể có @ hoặc không có @)
   - YouTube: thường có @username
   - TikTok: thường có @username  
   - Facebook: CHỈ CÓ TÊN, KHÔNG CÓ @ (ví dụ: "Khánh Trần Ati")
   
2. TIÊU ĐỀ VIDEO (dòng text mô tả video, thường ở dưới cùng)

Trả về JSON (CHỈ JSON, không có text khác):
{
  "username": "tên kênh chính xác như trong ảnh",
  "videoTitle": "tiêu đề video chính xác như trong ảnh",
  "keywords": ["tên kênh", "từ khóa từ tiêu đề"]
}`;

                        // Call Gemini Vision API với fallback
                        const result = await callAIWithFallback(async (currentModel) => {
                            return await currentModel.generateContent([
                                aiPrompt,
                                {
                                    inlineData: {
                                        mimeType: attachment.contentType,
                                        data: base64Image
                                    }
                                }
                            ]);
                        });

                        const responseText = result.response.text();
                        console.log('[AI Image Search] Response:', responseText);

                        // Parse JSON from response
                        let aiData = { keywords: ['video'] };
                        try {
                            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                aiData = JSON.parse(jsonMatch[0]);
                            }
                        } catch (e) {
                            console.log('[AI Image Search] JSON parse error:', e.message);
                        }

                        // Build search URLs
                        const searchQuery = aiData.keywords?.join(' ') || 'video';
                        const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
                        const tiktokSearchUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(searchQuery)}`;
                        const facebookSearchUrl = `https://www.facebook.com/search/videos?q=${encodeURIComponent(searchQuery)}`;

                        // Send result embed
                        const resultEmbed = new EmbedBuilder()
                            .setTitle('🔍 AI đã tìm thấy video!')
                            .setDescription(
                                `👤 **Kênh:** ${aiData.username || 'Không xác định'}\n` +
                                `📝 **Tiêu đề:** ${aiData.videoTitle || 'Không xác định'}\n` +
                                `🔑 **Từ khóa:** ${searchQuery}\n\n` +
                                `🔍 **Click để tìm kiếm:**\n` +
                                `[▶️ Tìm trên YouTube](${youtubeSearchUrl})\n` +
                                `[🎵 Tìm trên TikTok](${tiktokSearchUrl})\n` +
                                `[📘 Tìm trên Facebook](${facebookSearchUrl})`
                            )
                            .setColor(0x00BFFF)
                            .setThumbnail(attachment.url)
                            .setFooter({ text: 'AI Image Search • Powered by Gemini' })
                            .setTimestamp();

                        if (loadingMsg) {
                            await loadingMsg.edit({ embeds: [resultEmbed] }).catch(() => { });
                        } else {
                            await message.channel.send({ embeds: [resultEmbed] }).catch(() => { });
                        }

                        console.log(`[AI Image Search] Found: ${searchQuery}`);
                        return;

                    } catch (error) {
                        console.error('[AI Image Search] Error:', error);

                        // Xóa loading message nếu có
                        if (loadingMsg) await loadingMsg.delete().catch(() => { });

                        // Check if rate limit error
                        let errorTitle = '❌ AI không thể phân tích ảnh!';
                        let errorDesc = `**Lỗi:** ${error.message}\n\n**Gợi ý:** Thử upload ảnh screenshot rõ ràng hơn`;

                        if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Too Many')) {
                            errorTitle = '⏳ AI đang bận!';
                            errorDesc = '**Lý do:** Đã dùng hết quota API trong thời gian ngắn.\n\n**Gợi ý:** Đợi 30 giây rồi thử lại nhé!';
                        }

                        const errorEmbed = new EmbedBuilder()
                            .setTitle(errorTitle)
                            .setDescription(errorDesc)
                            .setColor(0xFF0000)
                            .setTimestamp();

                        const errMsg = await message.channel.send({ embeds: [errorEmbed] }).catch(() => null);

                        // Tự xóa sau 15 giây để giữ channel sạch
                        if (errMsg) {
                            setTimeout(() => errMsg.delete().catch(() => { }), 15000);
                        }
                        return;
                    }
                }
            }
            // ========== END AI IMAGE SEARCH ==========

            if (content.length === 0) return; // No text, no URL, already handled image above
            // Detect video URLs
            const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;
            const tiktokVideoRegex = /(https?:\/\/)?(www\.|vm\.)?tiktok\.com\/@[^\/]+\/video\/.+/i;
            const tiktokPhotoRegex = /(https?:\/\/)?(www\.|vm\.)?tiktok\.com\/@[^\/]+\/photo\/.+/i;
            const tiktokGenericRegex = /(https?:\/\/)?(www\.|vm\.)?tiktok\.com\/.+/i;
            const facebookRegex = /(https?:\/\/)?(www\.|m\.)?(facebook\.com|fb\.watch|fb\.com)\/.+/i;
            const instagramRegex = /(https?:\/\/)?(www\.)?(instagram\.com)\/(reel|p)\/.+/i;

            let videoUrl = null;
            let platform = null;

            // Extract URL from message
            const urlMatch = content.match(/(https?:\/\/[^\s]+)/i);
            if (urlMatch) {
                videoUrl = urlMatch[0];

                // Check TikTok photo first (not supported)
                if (tiktokPhotoRegex.test(videoUrl)) {
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('❌ Không hỗ trợ TikTok Photo!')
                        .setDescription('Link này là **ảnh TikTok**, không phải video.\n\n**Gợi ý:** Chỉ hỗ trợ link video dạng:\n`tiktok.com/@user/video/...`')
                        .setColor(0xFF0000)
                        .setTimestamp();
                    await message.reply({ embeds: [errorEmbed] }).catch(() => { });
                    return;
                }

                if (youtubeRegex.test(videoUrl)) platform = 'youtube';
                else if (tiktokVideoRegex.test(videoUrl) || tiktokGenericRegex.test(videoUrl)) platform = 'tiktok';
                else if (facebookRegex.test(videoUrl)) platform = 'facebook';
                else if (instagramRegex.test(videoUrl)) platform = 'instagram';
            }

            if (videoUrl && platform) {
                // Delete user message để giữ channel sạch đẹp
                await message.delete().catch(() => { });

                // Tạo link download từ web app Render
                const RENDER_WEB_APP = 'https://video-downloader-pro-1.onrender.com';
                let downloadEndpoint = '';

                if (platform === 'youtube') {
                    downloadEndpoint = `/download/youtube?url=${encodeURIComponent(videoUrl)}&quality=best`;
                } else if (platform === 'tiktok') {
                    downloadEndpoint = `/download/tiktok?url=${encodeURIComponent(videoUrl)}`;
                } else if (platform === 'facebook') {
                    downloadEndpoint = `/download/facebook?url=${encodeURIComponent(videoUrl)}`;
                } else if (platform === 'instagram') {
                    // Instagram cũng có thể dùng endpoint tiktok (yt-dlp hỗ trợ)
                    downloadEndpoint = `/download/tiktok?url=${encodeURIComponent(videoUrl)}`;
                }

                const downloadLink = RENDER_WEB_APP + downloadEndpoint;

                // Platform-specific colors (from Discohook)
                const platformColors = {
                    youtube: 0xE71C06, // Red
                    facebook: 0x064667, // Blue
                    tiktok: 0x000000, // Black
                    instagram: 0xE71C06 // Same as YouTube
                };

                // Gửi embed với link download (exact Discohook design)
                const successEmbed = new EmbedBuilder()
                    .setTitle(`Link tải video ${platform.toUpperCase()}`)
                    .setDescription(
                        `Nền tảng: ${platform.toUpperCase()}\n` +
                        `Chất lượng: Cao nhất\n\n` +
                        `📥 [Click để tải video](${downloadLink})`
                    )
                    .setColor(platformColors[platform] || 0x000000)
                    .setThumbnail('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2Q1Z2lxOG1wN3pzZ3UxcGtmbGpyZ3NuaGFlMjVxc3Q4NjFnajA4NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/WQ3REUQR418t6sdCX8/giphy.gif');

                await message.channel.send({ embeds: [successEmbed] }).catch(() => null);

                console.log(`[VideoDownload] Sent download link for ${platform}: ${downloadLink}`);

                return; // Don't process as AI chat
            }
        }
        // ==================== END VIDEO DOWNLOAD HANDLER ====================

        // ==================== AI CHAT HANDLER ====================
        // Allow AI chat in both CHANNEL_ID and VIDEO_DOWNLOAD_CHANNEL_ID
        const isVideoChannel = message.channelId === CONFIG.VIDEO_DOWNLOAD_CHANNEL_ID;

        if (message.mentions.has(client.user) || contentLower.startsWith('!ask') || (isChatChannel && !isCommand) || (isVideoChannel && !isCommand)) {
            const prompt = content.replace(/<@!?[0-9]+>/, '').replace('!ask', '').trim();
            if (prompt) {
                message.channel.sendTyping();
                try {
                    // Get or create chat session (using Groq - conversation history)
                    const userId = message.author.id;
                    let chatSessionData = chatSessions.get(userId);
                    let conversationHistory = [];

                    // SESSION TIMEOUT CONFIG (30 Minutes)
                    const SESSION_TIMEOUT = 30 * 60 * 1000;

                    if (!chatSessionData) {
                        // Tạo session mới với history rỗng
                        conversationHistory = [
                            { role: "user", content: "Chào bạn!" },
                            { role: "assistant", content: "Chào bạn! Mình là trợ lý ảo của server One Block đây. 🐕" }
                        ];

                        // Save session with timeout
                        const timeoutId = setTimeout(() => {
                            chatSessions.delete(userId);
                            console.log(`[Session] Cleared session for ${userId} due to inactivity.`);
                        }, SESSION_TIMEOUT);

                        chatSessions.set(userId, { history: conversationHistory, timeoutId: timeoutId });
                    } else {
                        // Lấy session cũ
                        conversationHistory = chatSessionData.history || [];

                        // RESET TIMEOUT (Sliding Window)
                        if (chatSessionData.timeoutId) clearTimeout(chatSessionData.timeoutId);

                        const newTimeoutId = setTimeout(() => {
                            chatSessions.delete(userId);
                            console.log(`[Session] Cleared session for ${userId} due to inactivity.`);
                        }, SESSION_TIMEOUT);

                        // Update timeoutId
                        chatSessionData.timeoutId = newTimeoutId;
                        chatSessions.set(userId, chatSessionData);
                    }

                    // PREPARE MESSAGE (TEXT only - Groq doesn't support images)
                    // Inject Mem0 memory context
                    let memoryContext = '';
                    try {
                        memoryContext = await getMemoryContext(prompt, userId);
                        if (memoryContext) {
                            console.log(`[Mem0] Found memory for user ${userId}`);
                        }
                    } catch (e) {
                        console.log('[Mem0] Memory search error:', e.message);
                    }

                    const promptWithMemory = memoryContext ? `${memoryContext}\n\n${prompt}` : prompt;

                    // Note: Groq không hỗ trợ vision, nếu có ảnh thì thông báo
                    let imageNote = '';
                    if (message.attachments.size > 0) {
                        const attachment = message.attachments.first();
                        if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                            imageNote = '\n[Người dùng gửi kèm hình ảnh nhưng mình chưa hỗ trợ xem ảnh. Hãy mô tả nội dung ảnh nhé!]';
                        }
                    }

                    // Call Groq AI
                    const result = await callGroqAI(promptWithMemory + imageNote, AI_SYSTEM_INSTRUCTION, conversationHistory);
                    let response = result.text();
                    console.log("AI Raw Response:", response); // DEBUG LOG

                    // Save to conversation history (keep last 20 messages)
                    conversationHistory.push({ role: 'user', content: promptWithMemory });
                    conversationHistory.push({ role: 'assistant', content: response });
                    if (conversationHistory.length > 20) {
                        conversationHistory = conversationHistory.slice(-20);
                    }
                    chatSessions.set(userId, { ...chatSessions.get(userId), history: conversationHistory });

                    // Save conversation to Mem0 (async, don't wait)
                    addMemory([
                        { role: 'user', content: prompt },
                        { role: 'assistant', content: response }
                    ], userId).catch(e => console.log('[Mem0] Save error:', e.message));

                    // REMOVE [THINK] BLOCKS (CoT internal reasoning)
                    response = response.replace(/\[THINK\][\s\S]*?\[\/THINK\]/gi, '').trim();

                    // PARSE ALL ACTIONS
                    let finalResponse = response;
                    const allActionsRegex = /\[ACTION: ([^\]]+)\]/g;
                    const actionMatches = [...response.matchAll(allActionsRegex)];
                    let replyToMessage = true;
                    let skipReply = false; // For IGNORE action
                    let commandToExecute = null; // For EXEC_CMD

                    // Remove all action tags from display
                    for (const m of actionMatches) {
                        finalResponse = finalResponse.replace(m[0], '').trim();
                    }

                    // Process each action
                    for (const match of actionMatches) {
                        const fullAction = match[1];
                        const parts = fullAction.split(/\s+/);
                        const action = parts[0].toUpperCase();
                        const value = parts.slice(1).join(' ');

                        // Execute Action
                        if (action === 'CLEAR') {
                            if (message.member?.permissions?.has('ManageMessages') || message.author.id === CONFIG.ADMIN_ID) {
                                const amount = parseInt(value) || 5;
                                await message.channel.bulkDelete(amount, true).catch(() => { });
                                finalResponse += `\n * (Đã dọn dẹp ${amount} tin nhắn) * `;
                                replyToMessage = false;
                            } else {
                                finalResponse += `\n * (Bạn không có quyền dọn chat! 😅)* `;
                            }
                        } else if (action === 'STATUS') {
                            finalResponse += `\n ** IP:** ${CONFIG.SERVER_IP} | ** Online:** ${lastStatus.players}/${lastStatus.max}`;
                        } else if (action === 'RULES') {
                            finalResponse += `\n**Luật:** Không Hack, Không Spam, Văn minh!`;
                        } else if (action === 'DELETE_BAD_WORD') {
                            if (message.deletable) {
                                await message.delete().catch(() => { });
                                finalResponse = `⚠️ ${message.author}, ` + finalResponse;
                                replyToMessage = false;
                            }
                        } else if (action === 'IGNORE') {
                            // AI decides to stay silent
                            skipReply = true;
                            console.log(`[AI] IGNORE action triggered for message: ${content.slice(0, 50)}...`);
                        } else if (action === 'EXEC_CMD') {
                            // AUTO-EXECUTE COMMAND
                            commandToExecute = value;
                            console.log(`[AI] EXEC_CMD: ${commandToExecute}`);
                        } else if (action === 'SUGGEST_CHOICE') {
                            // Parse choices and add buttons (future enhancement)
                            // For now just show as text
                            const choicesMatch = fullAction.match(/'([^']+)'/g);
                            if (choicesMatch && choicesMatch.length > 1) {
                                const question = choicesMatch[0].replace(/'/g, '');
                                const options = choicesMatch.slice(1).map(o => o.replace(/'/g, ''));
                                finalResponse += `\n**${question}**\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`;
                            }
                        } else if (action === 'CMD') {
                            // Legacy CMD action - forward to command handler
                            commandToExecute = value;
                        } else if (action === 'START_ACTIVITY' || action === 'GAME') {
                            // DISCORD ACTIVITY GAMES
                            const gameKey = value.toLowerCase().replace(/\s+/g, '');
                            console.log(`[AI] Game Request: ${value} -> Key: ${gameKey}`);
                            const game = DISCORD_GAMES[gameKey];
                            console.log(`[AI] Game Found:`, game ? game.name : "NULL");

                            if (game) {
                                try {
                                    // Find a voice channel the user is in, or use current channel
                                    let targetChannel = message.member?.voice?.channel || message.channel;

                                    // Create activity invite
                                    const invite = await targetChannel.createInvite({
                                        maxAge: 86400, // 24 hours
                                        maxUses: 0,
                                        targetType: 2, // Embedded Application
                                        targetApplication: game.id
                                    }).catch(async () => {
                                        // Fallback: Try with main channel if voice fails
                                        return await message.channel.createInvite({
                                            maxAge: 86400,
                                            maxUses: 0,
                                            targetType: 2,
                                            targetApplication: game.id
                                        });
                                    });

                                    if (invite) {
                                        const gameEmbed = new EmbedBuilder()
                                            .setTitle(`${game.emoji} ${game.name}`)
                                            .setDescription(`Click để chơi ngay!`)
                                            .setColor(0x5865F2)
                                            .setURL(`https://discord.gg/${invite.code}`)
                                            .setFooter({ text: `Hết hạn sau 24 giờ • Yêu cầu bởi ${message.author.username}` });

                                        const row = new ActionRowBuilder().addComponents(
                                            new ButtonBuilder()
                                                .setLabel(`Chơi ${game.name}`)
                                                .setStyle(ButtonStyle.Link)
                                                .setURL(`https://discord.gg/${invite.code}`)
                                                .setEmoji(game.emoji)
                                        );

                                        await message.channel.send({ embeds: [gameEmbed], components: [row] });
                                        finalResponse = `${game.emoji} Đã tạo phòng **${game.name}**! Click link để chơi!`;
                                    }
                                } catch (e) {
                                    console.error('[GAME] Error:', e);
                                    finalResponse += `\n❌ Không thể tạo phòng game: ${e.message}`;
                                }
                            } else {
                                // List available games
                                const gameList = Object.entries(DISCORD_GAMES)
                                    .filter((v, i, a) => a.findIndex(t => t[1].id === v[1].id) === i) // Unique
                                    .slice(0, 15)
                                    .map(([key, g]) => `${g.emoji} \`${key}\``)
                                    .join(' | ');
                                finalResponse += `\n🎮 **Games có sẵn:** ${gameList}\n*Nói "chơi poker", "chơi wordle", etc.*`;
                            }
                        }
                    }

                    // Handle IGNORE - completely skip response
                    if (skipReply) {
                        return; // Exit without replying
                    }

                    // Send response first
                    if (finalResponse.trim().length > 0) {
                        if (replyToMessage) {
                            await message.reply(finalResponse).catch(() => message.channel.send(finalResponse));
                        } else {
                            await message.channel.send(finalResponse).catch(() => { });
                        }
                    }

                    // Execute command AFTER sending response
                    if (commandToExecute) {
                        // Create a pseudo-message to trigger command handler
                        const cmdContent = commandToExecute.trim();
                        const cmdLower = cmdContent.toLowerCase();

                        // Route to appropriate command handler
                        if (cmdLower.startsWith('!inv ')) {
                            const targetName = cmdContent.split(/\s+/)[1];
                            if (targetName && addonPlayerData.connected && addonPlayerData.players.length) {
                                const targetPlayer = addonPlayerData.players.find(p =>
                                    p.name.toLowerCase() === targetName.toLowerCase()
                                );
                                if (targetPlayer) {
                                    const inv = targetPlayer.inventory || [];
                                    if (inv.length > 0) {
                                        try {
                                            const inventoryImageBuffer = await createInventoryImage(inv, targetPlayer.name);
                                            const attachment = new AttachmentBuilder(inventoryImageBuffer, { name: 'inventory.png' });
                                            const embed = new EmbedBuilder()
                                                .setTitle(`📦 Túi đồ của ${targetPlayer.name}`)
                                                .setColor(0x8B4513)
                                                .setImage('attachment://inventory.png')
                                                .setFooter({ text: `Tổng: ${inv.length} loại vật phẩm` })
                                                .setTimestamp();
                                            await message.channel.send({ embeds: [embed], files: [attachment] });
                                        } catch (e) {
                                            await message.channel.send(`❌ Lỗi tạo ảnh inventory: ${e.message}`);
                                        }
                                    } else {
                                        await message.channel.send(`📦 **${targetPlayer.name}** không có đồ trong túi!`);
                                    }
                                } else {
                                    await message.channel.send(`❌ Không tìm thấy người chơi **${targetName}**`);
                                }
                            } else {
                                await message.channel.send(`❌ Addon chưa kết nối hoặc không có ai online.`);
                            }
                        } else if (cmdLower.startsWith('!map ')) {
                            const targetName = cmdContent.split(/\s+/)[1];
                            if (targetName && addonPlayerData.connected && addonPlayerData.players.length) {
                                const targetPlayer = addonPlayerData.players.find(p =>
                                    p.name.toLowerCase() === targetName.toLowerCase()
                                );
                                if (targetPlayer) {
                                    const loadingMsg = await message.channel.send(`⏳ Đang tải bản đồ của **${targetPlayer.name}**...`);
                                    addonMessageQueue.push({
                                        type: 'command',
                                        command: 'terrain_request',
                                        playerName: targetPlayer.name
                                    });
                                    pendingMapRequests.set(targetPlayer.name.toLowerCase(), {
                                        channelId: message.channel.id,
                                        messageId: loadingMsg?.id,
                                        startTime: Date.now()
                                    });
                                } else {
                                    await message.channel.send(`❌ Không tìm thấy người chơi **${targetName}**`);
                                }
                            }
                        } else if (cmdLower.startsWith('!stats ')) {
                            const targetName = cmdContent.split(/\s+/)[1];
                            if (targetName && addonPlayerData.connected && addonPlayerData.players.length) {
                                const targetPlayer = addonPlayerData.players.find(p =>
                                    p.name.toLowerCase() === targetName.toLowerCase()
                                );
                                if (targetPlayer) {
                                    const stats = targetPlayer.stats || {};
                                    const embed = new EmbedBuilder()
                                        .setTitle(`📊 Thống kê của ${targetPlayer.name}`)
                                        .setColor(0x00CED1)
                                        .addFields(
                                            { name: "⛏️ Block đã đào", value: `${stats.blocksBroken || 0}`, inline: true },
                                            { name: "💀 Mob đã giết", value: `${stats.mobsKilled || 0}`, inline: true },
                                            { name: "⭐ Level", value: `${targetPlayer.level || 0}`, inline: true }
                                        )
                                        .setFooter({ text: `HP: ${targetPlayer.health}/20 | Mode: ${targetPlayer.gameMode}` })
                                        .setTimestamp();
                                    await message.channel.send({ embeds: [embed] });
                                } else {
                                    await message.channel.send(`❌ Không tìm thấy người chơi **${targetName}**`);
                                }
                            }
                        } else if (cmdLower === '!playerlist') {
                            if (addonPlayerData.connected && addonPlayerData.players.length) {
                                const players = addonPlayerData.players;
                                const embed = new EmbedBuilder()
                                    .setTitle(`🎮 Người chơi online (${players.length})`)
                                    .setColor(0x00FF00)
                                    .setDescription(players.map(p => `• **${p.name}** ${p.dimension ? `(${p.dimension})` : ''}`).join('\n'))
                                    .setTimestamp();
                                await message.channel.send({ embeds: [embed] });
                            } else {
                                await message.channel.send(`🎮 Không có ai online hoặc addon chưa kết nối.`);
                            }
                        } else if (cmdLower === '!reset') {
                            // Admin only - reset bảng xếp hạng
                            if (message.author.id !== CONFIG.ADMIN_ID) {
                                return message.reply('❌ Chỉ Admin mới có quyền dùng lệnh này!');
                            }
                            try {
                                // Backup trước khi reset
                                const backupPath = path.join(__dirname, 'player_stats_backup_admin.json');
                                fs.writeFileSync(backupPath, JSON.stringify(playerStatsData, null, 2), 'utf-8');
                                console.log(`[Admin] Stats backed up to ${backupPath}`);

                                // Reset data
                                playerStatsData = {};
                                savePlayerStats(playerStatsData);
                                lastSessionStats.clear();

                                // Reset leaderboard threads
                                leaderboardData = { threads: {} };
                                saveLeaderboardData(leaderboardData);

                                await message.reply('✅ **Đã reset toàn bộ bảng xếp hạng!**\n📦 Dữ liệu cũ đã được backup vào `player_stats_backup_admin.json`\n🔄 Leaderboard sẽ tự tạo thread mới lần cập nhật tiếp theo.');
                            } catch (err) {
                                console.error('[Admin Reset] Error:', err);
                                await message.reply(`❌ Lỗi khi reset: ${err.message}`);
                            }
                            return;
                        } else if (cmdLower === '!khoiphuc') {
                            // Admin only - khôi phục bảng xếp hạng
                            if (message.author.id !== CONFIG.ADMIN_ID) {
                                return message.reply('❌ Chỉ Admin mới có quyền dùng lệnh này!');
                            }
                            try {
                                const backupPath = path.join(__dirname, 'player_stats_backup_admin.json');
                                if (!fs.existsSync(backupPath)) {
                                    return message.reply('❌ Không tìm thấy file backup! Chưa có bản sao lưu nào.');
                                }

                                const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
                                playerStatsData = backupData;
                                savePlayerStats(playerStatsData);
                                lastSessionStats.clear();

                                // Reset leaderboard threads để vẽ mới
                                leaderboardData = { threads: {} };
                                saveLeaderboardData(leaderboardData);

                                const playerCount = Object.keys(playerStatsData).length;
                                await message.reply(`✅ **Đã khôi phục thành công dữ liệu!**\n📊 Đã tải lại stats cho **${playerCount}** người chơi.\n🔄 Leaderboard sẽ tự vẽ mới lần cập nhật tiếp theo.`);
                            } catch (err) {
                                console.error('[Admin Restore] Error:', err);
                                await message.reply(`❌ Lỗi khi khôi phục: ${err.message}`);
                            }
                            return;
                        } else if (cmdLower === '!rules') {
                            const rulesEmbed = new EmbedBuilder()
                                .setTitle("📜 LUẬT SERVER ONE BLOCK")
                                .setColor(0xFFFF00)
                                .setDescription("1. **Không Cheat/Hack:** Ban vĩnh viễn.\n2. **Không Spam/Chửi tục.**\n3. **Không Phá hoại.**\n4. **Không Quảng cáo.**");
                            await message.channel.send({ embeds: [rulesEmbed] });
                        } else if (cmdLower === '!ip') {
                            await message.channel.send(`**IP:** \`${CONFIG.SERVER_IP}\`\n**Port:** \`${CONFIG.SERVER_PORT}\``);
                        }
                    }
                } catch (e) {
                    console.error("AI Error Full:", e); // Log full error for debugging
                    console.error("AI Error Message:", e.message);
                    chatSessions.delete(message.author.id); // Reset session on error

                    // Luôn switch model khi có lỗi để thử model khác
                    const oldModel = getCurrentModelName();
                    switchToNextModel();
                    model = createAIModel(getCurrentModelName());

                    // AUTO-RETRY với model mới (chỉ retry 1 lần)
                    if (!message._aiRetried) {
                        message._aiRetried = true;
                        console.log(`[AI] Auto-retrying with ${getCurrentModelName()}...`);
                        await message.channel.send(`🔄 Đổi sang ${getCurrentModelName()}, đang xử lý lại...`).catch(() => { });

                        // Re-emit message event để xử lý lại
                        client.emit('messageCreate', message);
                        return;
                    } else {
                        // Đã retry rồi, báo lỗi thật
                        await message.reply(`⚠️ AI gặp lỗi, vui lòng thử lại sau!`).catch(() => { });
                    }
                }
                return;
            }
        }

        // ADMIN COMMANDS (only by ADMIN_ID)
        if (message.author.id === CONFIG.ADMIN_ID) {
            if (contentLower.startsWith('!setip ')) {
                const args = content.split(/\s+/);
                if (args[1]) {
                    CONFIG.SERVER_IP = args[1];
                    if (args[2]) CONFIG.SERVER_PORT = parseInt(args[2]) || CONFIG.SERVER_PORT;
                    isFirstRun = true;
                    await message.reply(`✅ Đã đổi IP sang: **${CONFIG.SERVER_IP}:${CONFIG.SERVER_PORT}**`).catch(() => { });
                    return;
                }
            }
            if (contentLower === '!baotri') {
                maintenanceMode = !maintenanceMode;
                await message.reply(maintenanceMode ? "🚧 Đã bật chế độ **BẢO TRÌ**." : "✅ Đã tắt chế độ bảo trì.").catch(() => { });
                return;
            }
            if (contentLower === '!shutdown') {
                await message.reply("🔌 Đang tắt Bot... Hẹn gặp lại!").catch(() => { });
                console.log("Admin đã tắt Bot.");
                process.exit(0);
            }
            // COMMAND: !clear <amount> - CHỈ ADMIN VÀ CHANNEL CỤ THỂ
            if (contentLower.startsWith('!clear')) {
                // Whitelist channels cho lệnh clear
                const CLEAR_ALLOWED_CHANNELS = [
                    '1448259773081452634',
                    '1448588744792997930',
                    '1468107582261690378',
                    '1447929348223930429',
                    '1468108120000561380',
                    '1444295473010708634',
                    '1447929275247497218'
                ];
                const CLEAR_ADMIN_ID = '1236913437737750538';

                // Kiểm tra quyền
                if (message.author.id !== CLEAR_ADMIN_ID) {
                    return message.reply("⛔ Chỉ Admin mới được dùng lệnh này!").catch(() => { });
                }

                // Kiểm tra channel
                if (!CLEAR_ALLOWED_CHANNELS.includes(message.channelId)) {
                    return message.reply("⛔ Lệnh này không được phép trong kênh này!").catch(() => { });
                }

                const args = content.split(/\s+/);
                const amount = parseInt(args[1]) || 10; // default 10
                if (amount > 10000 || amount < 1) return message.reply("⚠️ Số lượng xóa phải từ 1 đến 10000.").catch(() => { });

                // Delete in batches of 100 (Discord limit)
                let deleted = 0;
                let remaining = amount;
                const statusMsg = await message.channel.send(`🧹 Đang xóa ${amount} tin nhắn...`).catch(() => { });

                while (remaining > 0) {
                    const toDelete = Math.min(remaining, 100);
                    try {
                        const deletedMsgs = await message.channel.bulkDelete(toDelete, true);
                        deleted += deletedMsgs.size;
                        remaining -= toDelete;
                        if (deletedMsgs.size < toDelete) break; // No more messages to delete
                    } catch (err) {
                        console.error("Clear error:", err);
                        break;
                    }
                }

                if (statusMsg) {
                    await statusMsg.edit(`🧹 Đã dọn dẹp **${deleted}** tin nhắn!`).catch(() => { });
                    setTimeout(() => statusMsg.delete().catch(() => { }), 3000);
                }
                return;
            }

            // COMMAND: !setuplink - Tạo tin nhắn với button tạo ID liên kết
            if (contentLower === '!setuplink') {
                await message.delete().catch(() => { });

                // Xóa message button cũ nếu có
                if (linkButtonMessageId) {
                    try {
                        const linkChannel = await fetchChannelSafe(LINK_CHANNEL_ID);
                        if (linkChannel) {
                            const oldMsg = await linkChannel.messages.fetch(linkButtonMessageId);
                            if (oldMsg) await oldMsg.delete().catch(() => { });
                        }
                    } catch (e) { /* Ignore */ }
                }

                const linkEmbed = new EmbedBuilder()
                    .setColor(0xEF5B)
                    .setImage('https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmY0cWVobzlqOGFyaGw5N284eDhqdG55Z2o2b2o2YmM4Z2Zvcnk3aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/v63B5WpbX0a03HAVRV/giphy.gif');

                const infoEmbed = new EmbedBuilder()
                    .setTitle('Tạo ID để liên kết tài khoản')
                    .setDescription('Sau khi liên kết tên game với Discord thì thông tin player sẽ hiện thị ở đây')
                    .setColor(0xEF5B);

                const button = new ButtonBuilder()
                    .setCustomId('create_link_id')
                    .setLabel('Tạo ID')
                    .setStyle(ButtonStyle.Success);

                const unlinkButton = new ButtonBuilder()
                    .setCustomId('unlink_account')
                    .setLabel('Hủy liên kết')
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(button, unlinkButton);

                // Gửi vào LINK_CHANNEL_ID và lưu message ID
                const linkChannel = await fetchChannelSafe(LINK_CHANNEL_ID);
                if (linkChannel) {
                    const newMsg = await linkChannel.send({
                        embeds: [linkEmbed, infoEmbed],
                        components: [row]
                    });
                    linkButtonMessageId = newMsg.id;
                    saveLinkButtonId(linkButtonMessageId);
                    console.log(`[Setup] Created link button in channel ${LINK_CHANNEL_ID}, message ID: ${linkButtonMessageId}`);
                } else {
                    await message.channel.send('❌ Không tìm thấy channel liên kết!').catch(() => { });
                }
                return;
            }
        }

        // ===== LỆNH TẠO ID LIÊN KẾT (AI SỐ 4 CHỮ SỐ) =====
        if (contentLower === '!taoid' || contentLower === '!link' || contentLower === '!lienket') {
            await message.delete().catch(() => { });

            // Kiểm tra nếu đã liên kết
            const existingLink = getLinkedMinecraftName(message.author.id);
            if (existingLink) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setTitle('<:4366minecraftaccept:1448944878812794950> Đã liên kết!')
                        .setDescription(`Discord của bạn đã liên kết với **${existingLink}**!\n*Liên hệ admin để hủy liên kết.*`)
                        .setColor(0x50C878)
                        .setThumbnail('https://cdn3.emoji.gg/emojis/8246-alex-yes.png')]
                }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 15000)).catch(() => { });
            }

            // Tạo ID mới
            const code = generateLinkCode(message.author.id, message.author.username);

            const linkEmbed = new EmbedBuilder()
                .setColor(0x50C878)
                .setTitle('🎮 Liên kết tài khoản Minecraft')
                .setDescription(
                    `**ID của bạn:** \`${code}\`\n\n` +
                    `📋 **Hướng dẫn:**\n` +
                    `1. Vào game Minecraft\n` +
                    `2. Gõ trong chat: \`!lienket ${code}\`\n\n` +
                    `⏰ ID hết hạn sau **10 phút**`
                )
                .setThumbnail('https://cdn3.emoji.gg/emojis/4192-pepeminecraft.png')
                .setFooter({ text: `Yêu cầu bởi ${message.author.username}` })
                .setTimestamp();

            return message.channel.send({ embeds: [linkEmbed] })
                .then(msg => setTimeout(() => msg.delete().catch(() => { }), 60000)) // Xóa sau 1 phút
                .catch(() => { });
        }

        // BASIC HELP / IP
        if (contentLower === '!ip' || contentLower === 'ip server là gì' || contentLower === 'xin ip') {
            await message.delete().catch(() => { }); // Auto delete user command
            return message.channel.send(`**IP:** \`${CONFIG.SERVER_IP}\`\n**Port:** \`${CONFIG.SERVER_PORT}\`\n**Phiên bản:** 1.20.x - 1.21.x`).catch(() => { });
        }
        if (contentLower.includes('bot ơi') || contentLower.includes('bot oi')) {
            return message.reply(`Gâu gâu! 🐕 (Gõ **!help** để xem tui làm được gì nha)`).catch(() => { });
        }

        // RULES
        if (contentLower === '!rules' || contentLower === '!luat') {
            await message.delete().catch(() => { }); // Auto delete user command
            const rulesEmbed = new EmbedBuilder()
                .setTitle("📜 LUẬT SERVER ONE BLOCK")
                .setColor(0xFFFF00)
                .setDescription(
                    "1. **Không Cheat/Hack:** Ban vĩnh viễn không ân xá.\n" +
                    "2. **Không Spam/Chửi tục:** Hãy văn minh.\n" +
                    "3. **Không Phá hoại:** Tôn trọng công sức người khác.\n" +
                    "4. **Không Quảng cáo:** Server khác sẽ bị mute.\n\n*Vi phạm sẽ bị xử lý tùy mức độ!*"
                )
                .setFooter({ text: "Chúc bạn chơi game vui vẻ!" });
            return message.channel.send({ embeds: [rulesEmbed] }).catch(() => { });
        }

        // COMMAND: !xbox -> check xbox status
        if (contentLower === '!xbox') {
            await message.delete().catch(() => { }); // Auto delete
            const msg = await message.channel.send("🔍 Đang kiểm tra máy chủ Microsoft...").catch(() => null);
            const isUp = await checkXboxStatus();
            if (isUp) {
                if (msg) await msg.edit("✅ **Xbox Live** đang hoạt động bình thường! (Lỗi do mạng bạn rồi)").catch(() => { });
            } else {
                if (msg) await msg.edit("⚠️ **Xbox Live** đang gặp sự cố! (Không vào được game là do Microsoft)").catch(() => { });
            }
            return;
        }

        // COMMAND: !inv <player> -> Show player inventory with image
        if (contentLower.startsWith('!inv')) {
            await message.delete().catch(() => { });

            const args = content.split(/\s+/).slice(1);
            const targetName = args[0];

            if (!targetName) {
                return message.channel.send("❓ Sử dụng: `!inv <tên người chơi>`").catch(() => { });
            }

            if (!addonPlayerData.connected || !addonPlayerData.players.length) {
                return message.channel.send("❌ Addon chưa kết nối hoặc không có ai online.").catch(() => { });
            }

            const targetPlayer = addonPlayerData.players.find(p =>
                p.name.toLowerCase() === targetName.toLowerCase()
            );

            if (!targetPlayer) {
                return message.channel.send(`❌ Không tìm thấy người chơi **${targetName}**`).catch(() => { });
            }

            const inv = targetPlayer.inventory || [];
            if (inv.length === 0) {
                return message.channel.send(`📦 **${targetPlayer.name}** không có đồ trong túi!`).catch(() => { });
            }

            // Get stats from addon and persistent storage
            const addonStats = targetPlayer.stats || { blocksBroken: 0, blocksPlaced: 0, mobsKilled: 0 };
            const persistentStats = playerStatsData[targetPlayer.name] || {};

            // Get top blocks/mobs from persistent stats
            const topBlocksMined = getTopItems(persistentStats.blocksBroken || {}, 5);
            const topMobsKilled = getTopItems(persistentStats.mobsKilled || {}, 5);

            const topBlocksText = topBlocksMined.length > 0
                ? topBlocksMined.map(b => `• ${b.name}: ${b.count}`).join('\n')
                : 'Chưa có dữ liệu';
            const topMobsText = topMobsKilled.length > 0
                ? topMobsKilled.map(m => `• ${m.name}: ${m.count}`).join('\n')
                : 'Chưa có dữ liệu';

            // Generate inventory grid image
            try {
                const inventoryImageBuffer = await createInventoryImage(inv, targetPlayer.name);
                const attachment = new AttachmentBuilder(inventoryImageBuffer, { name: 'inventory.png' });

                const embed = new EmbedBuilder()
                    .setTitle(`📦 Túi đồ của ${targetPlayer.name}`)
                    .setColor(0x8B4513)
                    .setImage('attachment://inventory.png')
                    .addFields(
                        { name: "❤️ HP", value: `${targetPlayer.health}/20`, inline: true },
                        { name: "⭐ Level", value: `${targetPlayer.level || 0}`, inline: true },
                        { name: "🎮 Mode", value: targetPlayer.gameMode || 'unknown', inline: true },
                        { name: "⛏️ Đã đào", value: `${addonStats.blocksBroken || persistentStats.totalBlocksBroken || 0} block`, inline: true },
                        { name: "🧱 Đã đặt", value: `${addonStats.blocksPlaced || persistentStats.totalBlocksPlaced || 0} block`, inline: true },
                        { name: "💀 Đã giết", value: `${addonStats.mobsKilled || persistentStats.totalMobsKilled || 0} mob`, inline: true },
                        { name: "⛏️ Top Block Đã Đào", value: topBlocksText, inline: true },
                        { name: "💀 Top Mob Đã Giết", value: topMobsText, inline: true }
                    )
                    .setFooter({ text: `Tổng: ${inv.length} loại vật phẩm` })
                    .setTimestamp();

                return message.channel.send({ embeds: [embed], files: [attachment] }).catch(() => { });
            } catch (e) {
                console.error('[Inventory] Error creating image:', e);
                return message.channel.send(`❌ Lỗi tạo ảnh inventory: ${e.message}`).catch(() => { });
            }
        }

        // COMMAND: !pet <player> -> Show player's pets
        if (contentLower.startsWith('!pet')) {
            await message.delete().catch(() => { });

            const args = content.split(/\s+/).slice(1);
            const targetName = args[0];

            if (!targetName) {
                return message.channel.send("❓ Sử dụng: `!pet <tên người chơi>`").catch(() => { });
            }

            if (!addonPlayerData.connected || !addonPlayerData.players.length) {
                return message.channel.send("❌ Addon chưa kết nối hoặc không có ai online.").catch(() => { });
            }

            const targetPlayer = addonPlayerData.players.find(p =>
                p.name.toLowerCase() === targetName.toLowerCase()
            );

            if (!targetPlayer) {
                return message.channel.send(`❌ Không tìm thấy người chơi **${targetName}**`).catch(() => { });
            }

            const pets = targetPlayer.pets || [];

            if (pets.length === 0) {
                return message.channel.send(`🐾 **${targetPlayer.name}** chưa có thú cưng nào gần đây!`).catch(() => { });
            }

            // Create embed for pets
            const petEmojis = {
                'wolf': '🐕', 'cat': '🐱', 'horse': '🐴',
                'donkey': '🫏', 'mule': '🫏', 'parrot': '🦜', 'llama': '🦙'
            };

            const embed = new EmbedBuilder()
                .setTitle(`🐾 Thú cưng của ${targetPlayer.name}`)
                .setColor(0xFFB6C1)
                .setDescription(pets.map(pet => {
                    const emoji = petEmojis[pet.type] || '🐾';
                    const hpBar = '█'.repeat(Math.round(pet.health / pet.maxHealth * 10)) +
                        '░'.repeat(10 - Math.round(pet.health / pet.maxHealth * 10));
                    return `${emoji} **${pet.name}**\n` +
                        `   ❤️ HP: ${pet.health}/${pet.maxHealth} [${hpBar}]\n` +
                        `   📍 Vị trí: [${pet.position.x}, ${pet.position.y}, ${pet.position.z}]`;
                }).join('\n\n'))
                .setFooter({ text: `Tổng: ${pets.length} thú cưng` })
                .setTimestamp();

            return message.channel.send({ embeds: [embed] }).catch(() => { });
        }

        // COMMAND: !map <player> -> Show world map around player
        if (contentLower.startsWith('!map')) {
            await message.delete().catch(() => { });

            const args = content.split(/\s+/).slice(1);
            const targetName = args[0];

            if (!targetName) {
                return message.channel.send("❓ Sử dụng: `!map <tên người chơi>`").catch(() => { });
            }

            if (!addonPlayerData.connected || !addonPlayerData.players.length) {
                return message.channel.send("❌ Addon chưa kết nối hoặc không có ai online.").catch(() => { });
            }

            const targetPlayer = addonPlayerData.players.find(p =>
                p.name.toLowerCase() === targetName.toLowerCase()
            );

            if (!targetPlayer) {
                return message.channel.send(`❌ Không tìm thấy người chơi **${targetName}**`).catch(() => { });
            }

            // Check if we already have terrain data (from recent update)
            const terrain = targetPlayer.terrain;
            if (terrain && terrain.data && terrain.data.length > 0) {
                // ... existing generation logic ...
                // But since we clear it, this might be rare.
                // Let's just proceed to request if not found.
            }

            // Send loading message
            const loadingMsg = await message.channel.send(`⏳ Đang tải bản đồ của **${targetPlayer.name}**... (Vui lòng đợi)`).catch(() => null);

            // Add request to queue for addon
            addonMessageQueue.push({
                type: 'command',
                command: 'terrain_request',
                playerName: targetPlayer.name
            });

            // Track pending request
            pendingMapRequests.set(targetPlayer.name.toLowerCase(), {
                channelId: message.channel.id,
                messageId: loadingMsg?.id,
                startTime: Date.now()
            });

            return;

            /* 
            // OLD LOGIC - Moved to HTTP handler
            if (!terrain || !terrain.data || terrain.data.length === 0) {
                return message.channel.send(`❌ Không thể lấy dữ liệu terrain cho **${targetPlayer.name}**`).catch(() => { });
            }
            */

            try {
                const mapImageBuffer = await createMapImage(
                    terrain,
                    targetPlayer.name,
                    targetPlayer.worldInfo || {},
                    targetPlayer.position
                );

                const attachment = new AttachmentBuilder(mapImageBuffer, { name: 'map.png' });

                const embed = new EmbedBuilder()
                    .setTitle(`🗺️ Bản đồ thế giới`)
                    .setColor(0x2E8B57)
                    .setImage('attachment://map.png')
                    .addFields(
                        { name: "📍 Tọa độ", value: `X: ${targetPlayer.position.x}, Y: ${targetPlayer.position.y}, Z: ${targetPlayer.position.z}`, inline: true },
                        { name: "🌍 Dimension", value: targetPlayer.dimension || 'overworld', inline: true },
                        { name: "⏰ Thời gian", value: targetPlayer.worldInfo?.timeOfDay || 'N/A', inline: true }
                    )
                    .setFooter({ text: `Bản đồ 32x32 blocks xung quanh ${targetPlayer.name}` })
                    .setTimestamp();

                return message.channel.send({ embeds: [embed], files: [attachment] }).catch(() => { });
            } catch (e) {
                console.error('[Map] Error creating map:', e);
                return message.channel.send(`❌ Lỗi tạo bản đồ: ${e.message}`).catch(() => { });
            }
        }

        // COMMAND: !stats <player> -> Show detailed player stats
        if (contentLower.startsWith('!stats')) {
            await message.delete().catch(() => { });

            const args = content.split(/\s+/).slice(1);
            const targetName = args[0];

            if (!targetName) {
                return message.channel.send("❓ Sử dụng: `!stats <tên người chơi>`").catch(() => { });
            }

            if (!addonPlayerData.connected || !addonPlayerData.players.length) {
                return message.channel.send("❌ Addon chưa kết nối hoặc không có ai online.").catch(() => { });
            }

            const targetPlayer = addonPlayerData.players.find(p =>
                p.name.toLowerCase() === targetName.toLowerCase()
            );

            if (!targetPlayer) {
                return message.channel.send(`❌ Không tìm thấy người chơi **${targetName}**`).catch(() => { });
            }

            const stats = targetPlayer.stats || {};
            const persistentStats = playerStatsData[targetPlayer.name] || {};
            const worldInfo = targetPlayer.worldInfo || {};

            // Format distance
            const distanceKm = ((stats.distanceTraveled || 0) / 1000).toFixed(2);

            // Format playtime
            const playSecs = stats.playTimeSeconds || 0;
            const playHours = Math.floor(playSecs / 3600);
            const playMins = Math.floor((playSecs % 3600) / 60);
            const playTimeStr = playHours > 0 ? `${playHours}h ${playMins}m` : `${playMins} phút`;

            // Get top mobs killed
            const topMobs = getTopItems(persistentStats.mobsKilled || stats.mobsKilledDetails || {}, 5);
            const mobsText = topMobs.length > 0
                ? topMobs.map(m => `• ${m.name}: ${m.count}`).join('\n')
                : 'Chưa có dữ liệu';

            // Get top blocks mined
            const topBlocks = getTopItems(persistentStats.blocksBroken || stats.blocksBrokenDetails || {}, 5);
            const blocksText = topBlocks.length > 0
                ? topBlocks.map(b => `• ${b.name}: ${b.count}`).join('\n')
                : 'Chưa có dữ liệu';

            const embed = new EmbedBuilder()
                .setTitle(`📊 Thống kê của ${targetPlayer.name}`)
                .setColor(0x00CED1)
                .addFields(
                    { name: "🗺️ Bản đồ", value: `📍 Tọa độ: [${targetPlayer.position.x}, ${targetPlayer.position.y}, ${targetPlayer.position.z}]\n🌍 Dimension: ${targetPlayer.dimension}\n⏰ Thời gian: ${worldInfo.timeOfDay || 'N/A'}`, inline: false },
                    { name: "🚶 Quãng đường đã đi", value: `${distanceKm} km`, inline: true },
                    { name: "⏱️ Thời gian chơi", value: playTimeStr, inline: true },
                    { name: "⛏️ Block đã đào", value: `${stats.blocksBroken || persistentStats.totalBlocksBroken || 0}`, inline: true },
                    { name: "🧱 Block đã đặt", value: `${stats.blocksPlaced || persistentStats.totalBlocksPlaced || 0}`, inline: true },
                    { name: "💀 Mob đã giết", value: `${stats.mobsKilled || persistentStats.totalMobsKilled || 0}`, inline: true },
                    { name: "⭐ Level", value: `${targetPlayer.level || 0}`, inline: true },
                    { name: "⛏️ Top Block Đã Đào", value: blocksText, inline: true },
                    { name: "💀 Chi tiết Mob Đã Giết", value: mobsText, inline: true }
                )
                .setFooter({ text: `HP: ${targetPlayer.health}/20 | Mode: ${targetPlayer.gameMode}` })
                .setTimestamp();

            return message.channel.send({ embeds: [embed] }).catch(() => { });
        }

        // COMMAND: !playerlist -> Show players from addon
        if (contentLower === '!playerlist') {
            await message.delete().catch(() => { }); // Auto delete

            // Get player count from ping (lastStatus is always updated)
            const pingPlayerCount = lastStatus?.players ?? lastPlayerCount;

            // Case 1: 0 players (use ping data - addon can't run without players)
            if (pingPlayerCount === 0) {
                return message.channel.send(`🎮 **Không có ai online!** Server đang trống.`).catch(() => { });
            }

            // Case 2: Has players - try addon data first (more detailed)
            if (addonPlayerData.connected && addonPlayerData.lastUpdate &&
                (Date.now() - addonPlayerData.lastUpdate) < 30000 &&
                addonPlayerData.players.length > 0) {

                const players = addonPlayerData.players;
                const embed = new EmbedBuilder()
                    .setTitle(`🎮 Người chơi online (${players.length})`)
                    .setColor(0x00FF00)
                    .setDescription(players.map(p => {
                        const pos = p.position ? `[${p.position.x}, ${p.position.y}, ${p.position.z}]` : '';
                        const dim = p.dimension ? `(${p.dimension})` : '';
                        const hp = p.health ? `❤️${p.health}` : '';
                        return `• **${p.name}** ${dim} ${pos} ${hp}`;
                    }).join('\n'))
                    .setFooter({ text: `Cập nhật từ addon | ${new Date(addonPlayerData.lastUpdate).toLocaleTimeString('vi-VN')}` })
                    .setTimestamp();

                return message.channel.send({ embeds: [embed] }).catch(() => { });
            }

            // Case 3: Use lastKnownPlayerList (cached names from addon)
            if (lastKnownPlayerList && lastKnownPlayerList.length > 0) {
                const names = lastKnownPlayerList.slice(0, 50);
                return message.channel.send(`🧾 Người chơi online (${names.length}):\n\`${names.join('\`, \`')}\``).catch(() => { });
            }

            // Case 4: Fallback - just show count from ping
            if (pingPlayerCount > 0) {
                return message.channel.send(`🔎 Số người online: **${pingPlayerCount}**\n*Vào game để addon gửi danh sách chi tiết*`).catch(() => { });
            }

            return message.channel.send("🔎 Không thể lấy thông tin. Server có thể offline.").catch(() => { });
        }

        // COMMAND: !dashboard -> Force update
        if (contentLower === '!dashboard') {
            await message.delete().catch(() => { });
            await message.channel.send("🔄 Đang làm mới Dashboard...").then(msg => setTimeout(() => msg.delete().catch(() => { }), 3000));
            await runUpdate();
            return;
        }

        // TEST STATS - test player stats card
        if (contentLower === '!teststats' || contentLower === '!testcard') {
            if (!message.member.permissions.has('ADMINISTRATOR') && message.author.id !== '584321000000000000') {
                return message.reply('❌ Chỉ admin mới dùng được lệnh này!').catch(() => { });
            }

            const testPlayer = {
                name: message.author.username,
                health: Math.floor(Math.random() * 10) + 10, // 10-20
                position: { x: Math.floor(Math.random() * 1000) - 500, y: 64, z: Math.floor(Math.random() * 1000) - 500 },
                worldInfo: {
                    biome: ['plains', 'forest', 'desert', 'mountains', 'ocean'][Math.floor(Math.random() * 5)],
                    weather: ['Clear', 'Rain', 'Thunder'][Math.floor(Math.random() * 3)],
                    timeOfDay: Math.random() > 0.5 ? 'day' : 'night',
                },
                inventory: [
                    { name: 'diamond_sword', count: 1 },
                    { name: 'diamond_pickaxe', count: 1 },
                    { name: 'golden_apple', count: 5 },
                    { name: 'ender_pearl', count: 16 },
                    { name: 'cobblestone', count: 64 },
                    { name: 'oak_log', count: 32 },
                ],
                stats: {
                    blocksBroken: Math.floor(Math.random() * 10000),
                    mobsKilled: Math.floor(Math.random() * 500),
                },
                pets: Math.random() > 0.5 ? [{ type: 'wolf' }, { type: 'cat' }] : [],
            };

            await message.reply('🔄 Đang tạo test card...').catch(() => { });
            await sendPlayerStatsEmbed(testPlayer);
            return message.channel.send('✅ Đã gửi test card vào channel stats!').catch(() => { });
        }

        // SIMPLE FUN / help
        if (contentLower === '!help') {
            await message.delete().catch(() => { }); // Auto delete
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🤖 Hướng dẫn Bot MineBot")
                        .setDescription("**📋 LỆNH CƠ BẢN:**\n" +
                            "`!ip` - IP server\n" +
                            "`!rules` - Luật server\n" +
                            "`!xbox` - Kiểm tra Xbox Live\n" +
                            "`!playerlist` - Danh sách người chơi online\n\n" +

                            "**🎮 LỆNH MINECRAFT:**\n" +
                            "`!stats [tên]` - Xem stats người chơi\n" +
                            "`!inv [tên]` - Xem inventory\n" +
                            "`!pet [tên]` - Xem thú cưng\n" +
                            "`!map` - Xem bản đồ server\n\n" +

                            "**🎲 MINI GAMES:**\n" +
                            "`!game [tên game]` - Chơi game Discord\n" +
                            "`!tictactoe` / `!ttt` - Chơi cờ caro\n\n" +

                            "**🤖 CHAT AI:**\n" +
                            "Tag bot hoặc gõ trong chat channel\n\n" +

                            "**📥 TẢI VIDEO:**\n" +
                            "Gửi link YouTube/TikTok/Facebook vào <#" + CONFIG.VIDEO_DOWNLOAD_CHANNEL_ID + ">\n\n" +

                            "**🔧 ADMIN:**\n" +
                            "`!setip [ip]` - Đặt IP server\n" +
                            "`!baotri` - Bật/tắt bảo trì\n" +
                            "`!shutdown` - Tắt bot\n" +
                            "`!clear [số]` - Xóa tin nhắn\n" +
                            "`!backup` - Backup server\n" +
                            "`!console [lệnh]` - Chạy lệnh console\n" +
                            "`!teststats` - Test player card\n" +
                            "`!dashboard` - Xem dashboard")
                        .setColor(0x00BFFF)
                        .setFooter({ text: "MineBot v2.0 | Gõ lệnh để sử dụng" })
                ]
            }).catch(() => { });
        }

    } catch (err) {
        console.error("messageCreate handler error:", err);
    }
});



// -------------------- INTERACTION HANDLER (BUTTON EPHEMERAL) --------------------
client.on('interactionCreate', async (interaction) => {
    // Chỉ xử lý button
    if (!interaction.isButton()) return;

    // Button tạo ID liên kết
    if (interaction.customId === 'create_link_id') {
        try {
            // Kiểm tra nếu đã liên kết rồi
            const existingLink = getLinkedMinecraftName(interaction.user.id);
            if (existingLink) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('<:4366minecraftaccept:1448944878812794950> Đã liên kết!')
                        .setDescription(`Discord của bạn đã liên kết với **${existingLink}**!\n*Liên hệ admin để hủy liên kết.*`)
                        .setColor(0x50C878)
                        .setThumbnail('https://cdn3.emoji.gg/emojis/8246-alex-yes.png')],
                    ephemeral: true // Chỉ người nhấn thấy
                });
            }

            // Tạo ID mới
            const code = generateLinkCode(interaction.user.id, interaction.user.username);

            const openMcButton = new ButtonBuilder()
                .setLabel('🎮Mở Minecraft')
                .setStyle(ButtonStyle.Link)
                .setURL('https://minecraftautolog.netlify.app/');

            const buttonRow = new ActionRowBuilder().addComponents(openMcButton);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xEF5B)
                        .setTitle(`**Tạo thành công ID liên kết!**\n> ID : ${code}\n\nHướng dẫn:\n-Vào server Minecraft \n-Gõ trong chat: \`!lienket ${code}\`\n\n`)
                        .setDescription('*⏰ ID hết hạn sau 10 phút*')
                ],
                components: [buttonRow],
                ephemeral: true // Chỉ người nhấn thấy
            });

            console.log(`[Link Button] Created code ${code} for ${interaction.user.username}`);

        } catch (err) {
            console.error('[Link Button] Error:', err);
            await interaction.reply({
                content: '❌ Có lỗi xảy ra, vui lòng thử lại!',
                ephemeral: true
            }).catch(() => { });
        }
    }

    // Button hủy liên kết
    if (interaction.customId === 'unlink_account') {
        try {
            const existingLink = getLinkedMinecraftName(interaction.user.id);

            if (!existingLink) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('❓ Chưa liên kết!')
                        .setDescription('Discord của bạn chưa liên kết với Minecraft.\nNhấn **Tạo ID** để bắt đầu liên kết!')
                        .setColor(0xFFAA00)],
                    ephemeral: true
                });
            }

            // Xóa liên kết
            delete linkedAccounts[interaction.user.id];
            saveLinkedAccounts(linkedAccounts);

            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('✅ Đã hủy liên kết!')
                    .setDescription(`Đã hủy liên kết với **${existingLink}**!\nBạn có thể tạo ID mới để liên kết lại.`)
                    .setColor(0xFF6B6B)
                    .setThumbnail('https://cdn3.emoji.gg/emojis/8246-alex-yes.png')],
                ephemeral: true
            });

            console.log(`[Unlink] ${interaction.user.username} unlinked from ${existingLink}`);

        } catch (err) {
            console.error('[Unlink Button] Error:', err);
            await interaction.reply({
                content: '❌ Có lỗi xảy ra, vui lòng thử lại!',
                ephemeral: true
            }).catch(() => { });
        }
    }
});

// -------------------- CANVAS STATS RENDERER --------------------
// Đã khai báo createCanvas ở đầu file

async function renderStatsImage(playerName, statsMap, title, color = '#3498DB') {
    const items = Object.entries(statsMap || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20); // Top 20 items

    const rowHeight = 28;
    const headerHeight = 80;
    const padding = 20;
    const width = 800;
    const height = headerHeight + padding * 2 + Math.max(items.length, 1) * rowHeight + 40;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Header bar
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, headerHeight);

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(title, padding, 35);

    // Player name
    ctx.font = '18px Arial';
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText(`Người chơi: ${playerName}`, padding, 60);

    // Column headers
    const startY = headerHeight + padding;
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, startY, width, rowHeight);
    ctx.fillStyle = '#AAAAAA';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('#', padding, startY + 19);
    ctx.fillText('Tên', 60, startY + 19);
    ctx.fillText('Số lượng', width - 150, startY + 19);

    if (items.length === 0) {
        ctx.fillStyle = '#888888';
        ctx.font = '16px Arial';
        ctx.fillText('Chưa có dữ liệu', padding, startY + rowHeight + 19);
    } else {
        items.forEach(([name, count], idx) => {
            const y = startY + (idx + 1) * rowHeight;
            // Alternate row bg
            ctx.fillStyle = idx % 2 === 0 ? '#1a1a2e' : '#16213e';
            ctx.fillRect(0, y, width, rowHeight);

            // Medal for top 3
            ctx.font = '14px Arial';
            ctx.fillStyle = idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#CCCCCC';
            ctx.fillText(`${idx + 1}`, padding, y + 19);

            // Item name (format minecraft id)
            ctx.fillStyle = '#FFFFFF';
            const displayName = name.replace(/minecraft:/gi, '').replace(/_/g, ' ');
            ctx.fillText(displayName.length > 40 ? displayName.slice(0, 37) + '...' : displayName, 60, y + 19);

            // Count
            ctx.fillStyle = '#4CAF50';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(count.toLocaleString('vi-VN'), width - 150, y + 19);
        });
    }

    // Footer
    const footerY = height - 20;
    ctx.fillStyle = '#555555';
    ctx.font = '12px Arial';
    ctx.fillText(`Cập nhật: ${new Date().toLocaleString('vi-VN')}`, padding, footerY);

    return canvas.toBuffer('image/png');
}

// -------------------- LEADERBOARD DETAIL BUTTON HANDLER --------------------
client.on('interactionCreate', async (interaction) => {
    try {
        // Handle button clicks for leaderboard detail
        if (interaction.isButton() && (interaction.customId === 'view_kill_details' || interaction.customId === 'view_block_details')) {
            const isKill = interaction.customId === 'view_kill_details';
            const statKey = isKill ? 'totalMobsKilled' : 'totalBlocksBroken';
            const label = isKill ? 'Kill' : 'Block đào';

            // Get top 25 players for select menu
            const allPlayers = Object.entries(playerStatsData)
                .map(([name, stats]) => ({ name, value: stats[statKey] || 0 }))
                .filter(p => p.value > 0)
                .sort((a, b) => b.value - a.value)
                .slice(0, 25);

            if (allPlayers.length === 0) {
                return interaction.reply({
                    content: '❌ Chưa có dữ liệu thống kê!',
                    ephemeral: true
                });
            }

            const { StringSelectMenuBuilder } = require('discord.js');
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(isKill ? 'select_kill_player' : 'select_block_player')
                .setPlaceholder(`Chọn người chơi để xem chi tiết ${label}...`)
                .addOptions(allPlayers.map(p => ({
                    label: p.name,
                    description: `${formatNumber(p.value)} ${isKill ? 'xác' : 'block'}`,
                    value: p.name
                })));

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.reply({
                content: `🔍 **Chọn người chơi để xem ${label} chi tiết:**`,
                components: [row],
                ephemeral: true
            });
            return;
        }

        // Handle select menu for killing details
        if (interaction.isStringSelectMenu() && (interaction.customId === 'select_kill_player' || interaction.customId === 'select_block_player')) {
            const isKill = interaction.customId === 'select_kill_player';
            const selectedPlayer = interaction.values[0];
            const stats = playerStatsData[selectedPlayer];

            if (!stats) {
                return interaction.update({
                    content: `❌ Không tìm thấy dữ liệu cho **${selectedPlayer}**!`,
                    components: [],
                    ephemeral: true
                });
            }

            await interaction.deferUpdate();

            const detailMap = isKill ? (stats.mobsKilled || {}) : (stats.blocksBroken || {});
            const title = isKill ? `⚔️ CHI TIẾT SINH VẬT ĐÃ GIẾT` : `⛏️ CHI TIẾT BLOCK ĐÃ ĐÀO`;
            const color = isKill ? '#E74C3C' : '#E67E22';

            const imageBuffer = await renderStatsImage(selectedPlayer, detailMap, title, color);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'stats_detail.png' });

            await interaction.editReply({
                content: null,
                embeds: [new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(`Người chơi: **${selectedPlayer}**`)
                    .setImage('attachment://stats_detail.png')
                    .setColor(isKill ? 0xE74C3C : 0xE67E22)
                    .setTimestamp()
                ],
                files: [attachment],
                components: []
            });
            return;
        }
    } catch (err) {
        console.error('[Leaderboard Detail] Error:', err);
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: '❌ Có lỗi xảy ra!', components: [] }).catch(() => { });
            } else {
                await interaction.reply({ content: '❌ Có lỗi xảy ra!', ephemeral: true }).catch(() => { });
            }
        } catch { }
    }
});

// -------------------- WELCOME & GOODBYE EVENTS --------------------
client.on('guildMemberAdd', async (member) => {
    try {
        if (!CONFIG.WELCOME_CHANNEL_ID) return;
        const channel = await member.guild.channels.fetch(CONFIG.WELCOME_CHANNEL_ID).catch(() => null);
        if (!channel) {
            console.error(`[Welcome] Channel not found: ${CONFIG.WELCOME_CHANNEL_ID}`);
            return;
        }

        if (typeof channel.send !== 'function') {
            console.error(`[Welcome] Channel ${channel.name} (${channel.id}) is not a text channel (type: ${channel.type}). Cannot send message.`);
            return;
        }

        // Custom Welcome Embed
        const welcomeEmbed = new EmbedBuilder()
            .setTitle("◢◤ MỘT USER MỚI ĐÃ THAM GIA ◢◤")
            .setDescription(`╭┈─────────────────────── ⚝\n╰──➤ ✎  Chào mừng ${member} \n\n╭──➤ ✎ Liên kết tài khoản tại: <#${CONFIG.INFO_CHANNEL_ID}>\n╰┈─────────────────────── ⚝`)
            .setColor(0x74D700) // 7659264 (Decimal) -> 0x74D700 (Hex)
            .setImage("https://i.pinimg.com/1200x/ba/49/49/ba49495c2ebc7097a83c1bbaf7b767b5.jpg")
            .setTimestamp();

        await channel.send({ embeds: [welcomeEmbed] });
        console.log(`[Welcome] Sent welcome message for ${member.user.tag}`);

    } catch (e) {
        console.error('[Welcome] Error sending message:', e);
    }
});

client.on('guildMemberRemove', async (member) => {
    try {
        if (!CONFIG.GOODBYE_CHANNEL_ID) return;
        const channel = member.guild.channels.cache.get(CONFIG.GOODBYE_CHANNEL_ID);
        if (!channel) return;

        // Goodbye Embed (Clean Style)
        const goodbyeEmbed = new EmbedBuilder()
            .setTitle("◢◤  USER ĐÃ RỜI NHÓM ◢◤")
            .setColor(0x74D700)
            .setDescription(`╭┈────────────────── ⚝\n╰──➤ ✎  Tạm biệt **${member.user.username}**`)
            .setImage("https://i.pinimg.com/1200x/71/27/ba/7127ba5463d6be06b40da627a0f9e900.jpg")
            .setTimestamp();

        await channel.send({ embeds: [goodbyeEmbed] });
        console.log(`[Goodbye] Sent goodbye message for ${member.user.tag}`);

    } catch (e) {
        console.error('[Goodbye] Error sending message:', e);
    }
});


// ==================== TELEGRAM HELPER ====================
async function sendToTelegram(filePath, caption) {
    if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_BACKUP_CHAT_ID) {
        console.warn("[Telegram] Missing token or chat ID");
        return null;
    }

    try {
        const fileContent = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const blob = new Blob([fileContent]); // Node 18+

        const formData = new FormData();
        formData.append('chat_id', CONFIG.TELEGRAM_BACKUP_CHAT_ID);
        formData.append('caption', caption || `Backup: ${fileName}`);
        formData.append('document', blob, fileName);

        console.log(`[Telegram] Sending ${fileName}...`);
        const response = await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendDocument`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!data.ok) {
            console.error("[Telegram] API Error:", data);
            throw new Error(`Telegram API Error: ${data.description}`);
        }

        console.log("[Telegram] Sent successfully!");
        return data;
    } catch (e) {
        console.error("[Telegram] Upload Failed:", e);
        throw e;
    }
}

client.login(CONFIG.TOKEN).catch(err => {
    console.error("Đăng nhập thất bại:", err?.message ?? err);
    process.exit(1);
});
