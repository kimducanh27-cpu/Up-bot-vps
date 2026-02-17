/**
 * MinecraftMapRenderer.js - CLEAN FLAT STYLE
 * 
 * Style: Dynmap/Xaero-like flat pixel art
 * Rule: All solid blocks = full 4x4 pixel. NO GAPS.
 * 
 * Fixes:
 * 1. Slab/Path: Full 4x4 but 15% darker
 * 2. Fence: Thick 2px connections reaching edges (0→4)
 * 3. Torch: 2x2 center yellow
 * 4. Crops: Farmland base + scattered dots
 * 5. Shadow: Soft max 15% alpha
 */

const { createCanvas } = require('canvas');

const SCALE = 4;
const DEBUG = true;
const LOGGED = new Set();

// ============================================================================
// HARDCODED PALETTE - Comprehensive
// ============================================================================
const PALETTE = {
    // === AIR (transparent) ===
    'air': null, 'cave_air': null, 'void_air': null,

    // === GRASS & DIRT ===
    'grass_block': '#7CFC00', 'dirt': '#866043', 'coarse_dirt': '#77553B',
    'rooted_dirt': '#8B6B4A', 'podzol': '#6B5344', 'mycelium': '#6F6265',
    'mud': '#3C3837', 'farmland': '#593D29', 'dirt_path': '#947C4C',
    'grass_path': '#947C4C',

    // === STONE FAMILY ===
    'stone': '#7D7D7D', 'cobblestone': '#7A7A7A', 'mossy_cobblestone': '#6A7A5A',
    'stone_bricks': '#7B7B7B', 'mossy_stone_bricks': '#6B7B5B', 'cracked_stone_bricks': '#757575',
    'smooth_stone': '#9E9E9E', 'bedrock': '#555555',
    'granite': '#956755', 'polished_granite': '#9A6C5B',
    'diorite': '#BFBFBF', 'polished_diorite': '#C5C5C5',
    'andesite': '#888888', 'polished_andesite': '#8E8E8E',
    'deepslate': '#505050', 'cobbled_deepslate': '#4A4A4A', 'polished_deepslate': '#555555',
    'deepslate_bricks': '#4C4C4C', 'deepslate_tiles': '#484848',
    'tuff': '#6D6B63', 'calcite': '#E0DFD5',
    'blackstone': '#2C2A31', 'polished_blackstone': '#3C3A41',
    'basalt': '#4B4B4B', 'polished_basalt': '#5B5B5B',
    'bricks': '#966457', 'brick': '#966457', 'brick_block': '#966457',

    // === SAND & GRAVEL ===
    'sand': '#DBD3A0', 'red_sand': '#BE6621', 'gravel': '#837F7E',
    'clay': '#9CA4AD', 'soul_sand': '#4B3E32', 'soul_soil': '#4B382B',

    // === ORES ===
    'coal_ore': '#696969', 'iron_ore': '#87735E', 'copper_ore': '#7C5E47',
    'gold_ore': '#8B7355', 'redstone_ore': '#8B4545', 'emerald_ore': '#5B8B5B',
    'lapis_ore': '#3B5B8B', 'diamond_ore': '#5BAFAF', 'ancient_debris': '#5B4B3B',
    'nether_gold_ore': '#8B6B2B', 'nether_quartz_ore': '#7B5555',
    'deepslate_coal_ore': '#4A4A4A', 'deepslate_iron_ore': '#5A4A3A',
    'deepslate_copper_ore': '#5A4A3A', 'deepslate_gold_ore': '#5A5A4A',
    'deepslate_redstone_ore': '#5A3A3A', 'deepslate_emerald_ore': '#3A5A3A',
    'deepslate_lapis_ore': '#3A3A5A', 'deepslate_diamond_ore': '#3A6A6A',

    // === MINERAL BLOCKS ===
    'coal_block': '#1A1A1A', 'iron_block': '#DCDCDC', 'copper_block': '#C17F58',
    'gold_block': '#F9D849', 'redstone_block': '#A81919', 'emerald_block': '#17DD62',
    'lapis_block': '#1F48A7', 'diamond_block': '#6EEEED', 'netherite_block': '#433E3C',
    'amethyst_block': '#8B5CF6', 'quartz_block': '#EAE5DE', 'smooth_quartz': '#EAE5DE',

    // === WOOD LOGS ===
    'oak_log': '#8F6B4E', 'spruce_log': '#3B2B1B', 'birch_log': '#D5C9A4',
    'jungle_log': '#544A2B', 'acacia_log': '#6B5540', 'dark_oak_log': '#3B2B15',
    'mangrove_log': '#6B3B3B', 'cherry_log': '#3B2B25', 'crimson_stem': '#6B2B4B',
    'warped_stem': '#2B5B5B', 'bamboo_block': '#7B9B3B',
    'stripped_oak_log': '#B8945F', 'stripped_spruce_log': '#73553D',
    'stripped_birch_log': '#C5B87B', 'stripped_jungle_log': '#A87B4B',
    'stripped_acacia_log': '#AD5D32', 'stripped_dark_oak_log': '#4C3218',
    'stripped_mangrove_log': '#6B3030', 'stripped_cherry_log': '#E4B8B8',
    'oak_wood': '#8F6B4E', 'spruce_wood': '#3B2B1B', 'birch_wood': '#D5C9A4',
    'jungle_wood': '#544A2B', 'acacia_wood': '#6B5540', 'dark_oak_wood': '#3B2B15',

    // === PLANKS ===
    'oak_planks': '#B8945F', 'spruce_planks': '#73553D', 'birch_planks': '#D7CB8D',
    'jungle_planks': '#B88953', 'acacia_planks': '#AD5D32', 'dark_oak_planks': '#4C3218',
    'mangrove_planks': '#773B3B', 'cherry_planks': '#E4B8B8', 'bamboo_planks': '#BBA73B',
    'crimson_planks': '#7B3B5B', 'warped_planks': '#2B7B7B',

    // === SLABS (same color as base) ===
    'oak_slab': '#B8945F', 'spruce_slab': '#73553D', 'birch_slab': '#D7CB8D',
    'jungle_slab': '#B88953', 'acacia_slab': '#AD5D32', 'dark_oak_slab': '#4C3218',
    'stone_slab': '#7D7D7D', 'cobblestone_slab': '#7A7A7A', 'smooth_stone_slab': '#9E9E9E',
    'stone_brick_slab': '#7B7B7B', 'brick_slab': '#966457', 'sandstone_slab': '#D8CA8D',
    'quartz_slab': '#EAE5DE', 'nether_brick_slab': '#2C151A', 'prismarine_slab': '#63A5A0',
    'deepslate_tile_slab': '#484848', 'deepslate_brick_slab': '#4C4C4C',
    'blackstone_slab': '#2C2A31', 'andesite_slab': '#888888',
    'diorite_slab': '#BFBFBF', 'granite_slab': '#956755',

    // === STAIRS ===
    'oak_stairs': '#B8945F', 'spruce_stairs': '#73553D', 'birch_stairs': '#D7CB8D',
    'stone_stairs': '#7D7D7D', 'cobblestone_stairs': '#7A7A7A', 'brick_stairs': '#966457',

    // === LEAVES ===
    'oak_leaves': '#4A7A29', 'spruce_leaves': '#3B5B2B', 'birch_leaves': '#5B8B3B',
    'jungle_leaves': '#3B7B2B', 'acacia_leaves': '#5B8B3B', 'dark_oak_leaves': '#3B6B2B',
    'mangrove_leaves': '#4B7B3B', 'cherry_leaves': '#E8B4C8', 'azalea_leaves': '#5B8B3B',

    // === WOOL ===
    'white_wool': '#E9E9E9', 'orange_wool': '#F07613', 'magenta_wool': '#BD44B3',
    'light_blue_wool': '#3AB3DA', 'yellow_wool': '#FED83E', 'lime_wool': '#80C71F',
    'pink_wool': '#F38BAA', 'gray_wool': '#474F52', 'light_gray_wool': '#9D9D97',
    'cyan_wool': '#169C9D', 'purple_wool': '#8932B8', 'blue_wool': '#3C44AA',
    'brown_wool': '#835432', 'green_wool': '#5E7C16', 'red_wool': '#B02E26',
    'black_wool': '#1D1D21',

    // === CONCRETE ===
    'white_concrete': '#CFD5D6', 'orange_concrete': '#E06100', 'magenta_concrete': '#A9309F',
    'light_blue_concrete': '#2389C6', 'yellow_concrete': '#F1AF15', 'lime_concrete': '#5EA818',
    'pink_concrete': '#D5658E', 'gray_concrete': '#36393D', 'light_gray_concrete': '#7D7D73',
    'cyan_concrete': '#157788', 'purple_concrete': '#64209C', 'blue_concrete': '#2C2E8F',
    'brown_concrete': '#60331A', 'green_concrete': '#495B24', 'red_concrete': '#8E2020',
    'black_concrete': '#080A0F',

    // === TERRACOTTA ===
    'terracotta': '#985F45', 'white_terracotta': '#D1B2A1', 'orange_terracotta': '#A15325',
    'yellow_terracotta': '#BA8523', 'brown_terracotta': '#4D3223', 'red_terracotta': '#8F3D2E',

    // === NETHER ===
    'netherrack': '#722323', 'nether_bricks': '#2C151A', 'red_nether_bricks': '#450A0A',
    'glowstone': '#FFBC5E', 'magma_block': '#9B3B0B', 'obsidian': '#0F0A17',
    'crying_obsidian': '#2B0B3B', 'crimson_nylium': '#8B2B3B', 'warped_nylium': '#2B7B6B',
    'shroomlight': '#F09D38', 'nether_wart_block': '#720B0B', 'warped_wart_block': '#1B7B7B',

    // === END ===
    'end_stone': '#DDDFA5', 'end_stone_bricks': '#D5D798', 'purpur_block': '#A577A5',

    // === LIQUIDS ===
    'water': '#3F76E4', 'flowing_water': '#3F76E4', 'lava': '#CF4F0B', 'flowing_lava': '#CF4F0B',

    // === ICE & SNOW ===
    'snow_block': '#FAFAFA', 'snow': '#FAFAFA', 'powder_snow': '#F5FCFC',
    'ice': '#91B5F4', 'packed_ice': '#8DB4FC', 'blue_ice': '#75A8FA',

    // === PLANTS ===
    'grass': '#7CBD7B', 'short_grass': '#7CBD7B', 'tall_grass': '#7CBD7B',
    'fern': '#5B8B3B', 'large_fern': '#5B8B3B', 'vine': '#4B8B2B',
    'sugar_cane': '#8BC34A', 'cactus': '#5B8B2B', 'bamboo': '#6B9B3B',
    'lily_pad': '#208030', 'dead_bush': '#7B5B3B', 'seagrass': '#3B8B4B',
    'kelp': '#3B7B3B', 'moss_block': '#5B8B3B', 'moss_carpet': '#5B8B3B',

    // === FLOWERS ===
    'dandelion': '#FFEC4F', 'poppy': '#ED302C', 'blue_orchid': '#2ABFFD',
    'allium': '#B878ED', 'azure_bluet': '#F7F7F7', 'red_tulip': '#EC3B36',
    'orange_tulip': '#ED8022', 'white_tulip': '#D6E8E8', 'pink_tulip': '#EBB1C8',
    'oxeye_daisy': '#D6E8E8', 'cornflower': '#466AEB', 'wither_rose': '#2C2416',
    'sunflower': '#FFCC00', 'lilac': '#B878ED', 'rose_bush': '#ED302C', 'peony': '#EBB1C8',
    'torchflower': '#FF8844',

    // === CROPS ===
    'wheat': '#D5BC45', 'carrots': '#E3901E', 'potatoes': '#E8C356',
    'beetroots': '#7A3C2A', 'melon': '#7BBB3B', 'pumpkin': '#CF7B1B',
    'jack_o_lantern': '#E89B23', 'sweet_berry_bush': '#4B1B1B', 'nether_wart': '#720B0B',

    // === SAPLINGS ===
    'oak_sapling': '#5B8B3B', 'spruce_sapling': '#2B4B2B', 'birch_sapling': '#7BAB5B',
    'jungle_sapling': '#3B6B2B', 'acacia_sapling': '#6B8B3B', 'dark_oak_sapling': '#3B5B2B',
    'cherry_sapling': '#E8B4C8', 'azalea': '#5B8B3B', 'flowering_azalea': '#6B8B4B',

    // === MUSHROOMS ===
    'red_mushroom': '#D02020', 'brown_mushroom': '#907050',
    'red_mushroom_block': '#C02020', 'brown_mushroom_block': '#8B7355',
    'crimson_fungus': '#8B2B3B', 'warped_fungus': '#2B7B6B',

    // === FUNCTIONAL ===
    'crafting_table': '#B8945F', 'furnace': '#7D7D7D', 'blast_furnace': '#5D5D5D',
    'smoker': '#6D5D4D', 'chest': '#9D7A4B', 'trapped_chest': '#9D7A4B',
    'ender_chest': '#0F1821', 'barrel': '#8B6B3B', 'shulker_box': '#8B5B8B',
    'bookshelf': '#9D7A4B', 'chiseled_bookshelf': '#9D7A4B', 'lectern': '#A5855B',
    'anvil': '#444444', 'enchanting_table': '#3B2B1B', 'brewing_stand': '#7D7D7D',
    'cauldron': '#3B3B3B', 'beacon': '#7BFBFB', 'conduit': '#ABCBDB',
    'spawner': '#1B3B4B', 'jukebox': '#6B4B3B', 'note_block': '#6B4B3B',
    'composter': '#6B5B3B', 'grindstone': '#8B8B8B', 'stonecutter': '#7B7B7B',
    'loom': '#A58565', 'cartography_table': '#7B6B5B', 'fletching_table': '#B5A575',
    'smithing_table': '#3B3B4B', 'bell': '#DBA534', 'respawn_anchor': '#2B1B3B',

    // === REDSTONE ===
    'redstone_wire': '#A81919', 'redstone_torch': '#FD5F30', 'redstone_wall_torch': '#FD5F30',
    'redstone_lamp': '#8B6B2B', 'tnt': '#C93838', 'piston': '#9D9373',
    'sticky_piston': '#7B9D4B', 'observer': '#6B6B6B', 'dispenser': '#7D7D7D',
    'dropper': '#7D7D7D', 'hopper': '#444444', 'lever': '#6B5B4B',
    'tripwire_hook': '#7B6B5B', 'daylight_detector': '#A5956B', 'target': '#E8BDAB',

    // === RAILS ===
    'rail': '#8B7355', 'powered_rail': '#D4A84B', 'detector_rail': '#8B5F55', 'activator_rail': '#8B3B3B',

    // === TORCHES ===
    'torch': '#FFFF00', 'wall_torch': '#FFFF00', 'soul_torch': '#5BFBFB',
    'soul_wall_torch': '#5BFBFB', 'lantern': '#E8A844', 'soul_lantern': '#5BFBFB',
    'sea_lantern': '#C5E8E3', 'end_rod': '#F0E8D8', 'campfire': '#E85800',
    'soul_campfire': '#5BDBDB', 'candle': '#D8C878',

    // === GLASS ===
    'glass': '#C0D8E8', 'tinted_glass': '#2C2C36', 'glass_pane': '#C0D8E8',
    'white_stained_glass': '#F0F0F0', 'orange_stained_glass': '#D87F33',
    'magenta_stained_glass': '#B24CD8', 'light_blue_stained_glass': '#6699D8',
    'yellow_stained_glass': '#E5E533', 'lime_stained_glass': '#7FCC19',
    'pink_stained_glass': '#F27FA5', 'gray_stained_glass': '#4C4C4C',
    'cyan_stained_glass': '#4C7F99', 'purple_stained_glass': '#7F3FB2',
    'blue_stained_glass': '#334CB2', 'brown_stained_glass': '#664C33',
    'green_stained_glass': '#667F33', 'red_stained_glass': '#993333',
    'black_stained_glass': '#191919',

    // === FENCES ===
    'oak_fence': '#B8945F', 'spruce_fence': '#73553D', 'birch_fence': '#D7CB8D',
    'jungle_fence': '#B88953', 'acacia_fence': '#AD5D32', 'dark_oak_fence': '#4C3218',
    'mangrove_fence': '#773B3B', 'cherry_fence': '#E4B8B8', 'bamboo_fence': '#BBA73B',
    'crimson_fence': '#7B3B5B', 'warped_fence': '#2B7B7B', 'nether_brick_fence': '#2C151A',
    'oak_fence_gate': '#B8945F', 'spruce_fence_gate': '#73553D', 'birch_fence_gate': '#D7CB8D',

    // === WALLS ===
    'cobblestone_wall': '#7A7A7A', 'mossy_cobblestone_wall': '#6A7A5A',
    'stone_brick_wall': '#7B7B7B', 'mossy_stone_brick_wall': '#6B7B5B',
    'brick_wall': '#966457', 'sandstone_wall': '#D8CA8D', 'red_sandstone_wall': '#BA6621',
    'nether_brick_wall': '#2C151A', 'blackstone_wall': '#2C2A31',
    'deepslate_wall': '#505050', 'cobbled_deepslate_wall': '#4A4A4A',
    'deepslate_brick_wall': '#4C4C4C', 'deepslate_tile_wall': '#484848',
    'prismarine_wall': '#63A5A0', 'end_stone_brick_wall': '#D5D798',
    'andesite_wall': '#888888', 'diorite_wall': '#BFBFBF', 'granite_wall': '#956755',

    // === IRON BARS ===
    'iron_bars': '#8B8B8B', 'chain': '#3B4B5B',

    // === DOORS & TRAPDOORS ===
    'oak_door': '#B8945F', 'spruce_door': '#73553D', 'birch_door': '#D7CB8D',
    'jungle_door': '#B88953', 'acacia_door': '#AD5D32', 'dark_oak_door': '#4C3218',
    'iron_door': '#C5C5C5', 'crimson_door': '#7B3B5B', 'warped_door': '#2B7B7B',
    'oak_trapdoor': '#B8945F', 'spruce_trapdoor': '#73553D', 'birch_trapdoor': '#D7CB8D',
    'iron_trapdoor': '#C5C5C5',

    // === MISC ===
    'cobweb': '#E5E5E5', 'ladder': '#9D7A4B', 'scaffolding': '#B89B5B',
    'hay_block': '#B89B23', 'sponge': '#C9C23B', 'wet_sponge': '#A5A23B',
    'slime_block': '#7BCD7B', 'honey_block': '#E89B23', 'honeycomb_block': '#E87B13',
    'bee_nest': '#D5A53B', 'beehive': '#B5953B',
    'prismarine': '#63A5A0', 'prismarine_bricks': '#5B9B96', 'dark_prismarine': '#3B5B58',
    'sculk': '#0D3B3B', 'sculk_catalyst': '#0D3B3B', 'sculk_sensor': '#0D3B4B',
    'mud_bricks': '#8B7355', 'packed_mud': '#8B7355',

    // === CARPETS ===
    'white_carpet': '#E9E9E9', 'orange_carpet': '#F07613', 'magenta_carpet': '#BD44B3',
    'light_blue_carpet': '#3AB3DA', 'yellow_carpet': '#FED83E', 'lime_carpet': '#80C71F',
    'pink_carpet': '#F38BAA', 'gray_carpet': '#474F52', 'light_gray_carpet': '#9D9D97',
    'cyan_carpet': '#169C9D', 'purple_carpet': '#8932B8', 'blue_carpet': '#3C44AA',
    'brown_carpet': '#835432', 'green_carpet': '#5E7C16', 'red_carpet': '#B02E26',
    'black_carpet': '#1D1D21',

    // === BEDS ===
    'white_bed': '#E9E9E9', 'red_bed': '#B02E26', 'blue_bed': '#3C44AA',
    'green_bed': '#5E7C16', 'yellow_bed': '#FED83E', 'black_bed': '#1D1D21',

    // === PRESSURE PLATES ===
    'oak_pressure_plate': '#B8945F', 'stone_pressure_plate': '#7D7D7D',
    'light_weighted_pressure_plate': '#F9D849', 'heavy_weighted_pressure_plate': '#DCDCDC',

    // === BUTTONS ===
    'oak_button': '#B8945F', 'stone_button': '#7D7D7D',

    // === SIGNS ===
    'oak_sign': '#B8945F', 'oak_wall_sign': '#B8945F', 'oak_hanging_sign': '#B8945F',
};

// === CATEGORY FALLBACK (Intelligent Mapping) ===
const CATEGORIES = {
    // Wood family -> Brown
    'log': '#8F6B4E', 'wood': '#8F6B4E', 'planks': '#B8945F', 'stripped': '#9C6834',
    'fence': '#B8945F', 'stairs': '#7D7D7D',
    // Stone family -> Gray
    'stone': '#7D7D7D', 'cobble': '#7A7A7A', 'brick': '#966457',
    'andesite': '#888888', 'diorite': '#BFBFBF', 'granite': '#956755',
    'deepslate': '#505050', 'blackstone': '#2C2A31',
    // Dirt family -> Brown
    'dirt': '#866043', 'podzol': '#6B5344', 'farmland': '#593D29', 'path': '#947C4C',
    // Nature -> Green
    'grass': '#7CBD7B', 'leaves': '#4A7A29', 'sapling': '#5B8B3B', 'fern': '#5B8B3B',
    'slime': '#7BCD7B',
    // Water/Ice -> Blue
    'water': '#3F76E4', 'ice': '#91B5F4',
    // Other
    'wall': '#7A7A7A', 'bars': '#8B8B8B', 'pane': '#C0D8E8',
    'door': '#B8945F', 'trapdoor': '#B8945F',
    'torch': '#FFFF00', 'lantern': '#E8A844', 'lamp': '#FFBC5E',
    'ore': '#7D7D7D', 'flower': '#ED302C', 'tulip': '#EBB1C8',
    'glass': '#C0D8E8', 'wool': '#E9E9E9', 'concrete': '#7D7D73', 'terracotta': '#985F45',
    'carpet': '#E9E9E9', 'bed': '#B02E26', 'mushroom': '#907050',
    'quartz': '#EAE5DE', 'sandstone': '#D8CA8D', 'prismarine': '#63A5A0',
    'nether': '#722323', 'end': '#DDDFA5', 'copper': '#C17F58',
    'iron': '#DCDCDC', 'gold': '#F9D849', 'diamond': '#6EEEED',
    'emerald': '#17DD62', 'amethyst': '#8B5CF6', 'sculk': '#0D3B3B',
    'slab': '#7D7D7D',
};

// ============================================================================
// PaletteManager
// ============================================================================
class PaletteManager {
    static getColor(blockId) {
        if (!blockId) return null;

        // Normalize: minecraft:oak_log -> oak_log
        const id = String(blockId).toLowerCase().replace('minecraft:', '').trim();

        // Air = transparent
        if (id === 'air' || id === 'cave_air' || id === 'void_air') return null;

        // 1. Exact match
        if (PALETTE[id]) return PALETTE[id];

        // 2. Partial match in PALETTE
        for (const [key, color] of Object.entries(PALETTE)) {
            if (id.includes(key) || key.includes(id)) return color;
        }

        // 3. Category match
        for (const [cat, color] of Object.entries(CATEGORIES)) {
            if (id.includes(cat)) return color;
        }

        // 4. Hash fallback (lightened to 40%)
        if (DEBUG && !LOGGED.has(id)) {
            console.warn(`MISSING COLOR FOR: ${blockId} (normalized: ${id})`);
            LOGGED.add(id);
        }
        return this.hashColor(id);
    }

    static hashColor(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        let r = (h & 0xFF0000) >>> 16;
        let g = (h & 0x00FF00) >>> 8;
        let b = h & 0x0000FF;

        // Lighten to at least 40% brightness
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        if (lum < 100) {
            r = Math.min(255, r + 100);
            g = Math.min(255, g + 100);
            b = Math.min(255, b + 100);
        }
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    }

    static isVoid(id) {
        if (!id) return true;
        const s = String(id).toLowerCase();
        return s.includes('air');
    }

    static darken(hex, factor) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `#${((1 << 24) + (Math.floor(r * factor) << 16) + (Math.floor(g * factor) << 8) + Math.floor(b * factor)).toString(16).slice(1)}`;
    }
}

// ============================================================================
// ShapeRenderer
// ============================================================================
class ShapeRenderer {

    static getType(id) {
        if (!id) return 'solid';
        const s = String(id).toLowerCase();

        // Low blocks (render full 4x4 but darker)
        if (s.includes('slab') || s.includes('path') || s.includes('farmland')) return 'low';

        // Torches
        if (s.includes('torch') || s.includes('candle')) return 'torch';

        // Fences/Walls/Bars
        if (s.includes('fence') || s.includes('wall') || s.includes('bars') || s.includes('chain')) return 'fence';
        if (s.includes('pane')) return 'pane';

        // Rails
        if (s.includes('rail')) return 'rail';

        // Crops (need base layer)
        if (s.includes('wheat') || s.includes('carrot') || s.includes('potato') ||
            s.includes('beetroot') || s.includes('wart') || s.includes('sweet_berry')) return 'crop';

        // Saplings/Flowers
        if (s.includes('sapling') || s.includes('mushroom') || s.includes('fungus')) return 'sapling';
        if (s.includes('flower') || s.includes('dandelion') || s.includes('poppy') ||
            s.includes('tulip') || s.includes('orchid') || s.includes('allium') ||
            s.includes('daisy') || s.includes('cornflower') || s.includes('rose') ||
            s.includes('lilac') || s.includes('peony') || s.includes('sunflower')) return 'flower';

        // Transparent
        if (s.includes('glass') || s.includes('ice')) return 'transparent';
        if (s.includes('water')) return 'water';
        if (s.includes('lava')) return 'lava';

        // Flat
        if (s.includes('carpet') || s.includes('pressure_plate') || s.includes('lily_pad') ||
            s.includes('moss_carpet') || s.includes('snow')) return 'flat';

        return 'solid';
    }

    static render(ctx, id, px, pz, color, neighbors) {
        const type = this.getType(id);

        switch (type) {
            case 'low':
                // FULL 4x4 but 15% darker (NO GAPS)
                ctx.fillStyle = PaletteManager.darken(color, 0.85);
                ctx.fillRect(px, pz, SCALE, SCALE);
                break;

            case 'torch':
                // 2x2 center yellow, no shadow
                this.renderTorch(ctx, id, px, pz);
                break;

            case 'fence':
                // Center + thick edge connections
                this.renderFence(ctx, color, px, pz, neighbors);
                break;

            case 'pane':
                // Thin cross
                ctx.fillStyle = color;
                ctx.fillRect(px + 1, pz, 2, SCALE);
                ctx.fillRect(px, pz + 1, SCALE, 2);
                break;

            case 'rail':
                // Horizontal line
                ctx.fillStyle = color;
                ctx.fillRect(px, pz + 1, SCALE, 2);
                break;

            case 'crop':
                // Base farmland + scattered dots
                ctx.fillStyle = '#593D29'; // farmland
                ctx.fillRect(px, pz, SCALE, SCALE);
                ctx.fillStyle = color;
                ctx.fillRect(px + 0, pz + 1, 1, 1);
                ctx.fillRect(px + 2, pz + 0, 1, 2);
                ctx.fillRect(px + 1, pz + 3, 2, 1);
                ctx.fillRect(px + 3, pz + 2, 1, 1);
                break;

            case 'sapling':
                // Scattered dots on transparent bg
                ctx.fillStyle = color;
                ctx.fillRect(px + 1, pz + 0, 2, 1);
                ctx.fillRect(px + 0, pz + 2, 1, 2);
                ctx.fillRect(px + 2, pz + 1, 2, 2);
                break;

            case 'flower':
                // Center dot
                ctx.fillStyle = color;
                ctx.fillRect(px + 1, pz + 1, 2, 2);
                break;

            case 'transparent':
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = color;
                ctx.fillRect(px, pz, SCALE, SCALE);
                ctx.globalAlpha = 1.0;
                break;

            case 'water':
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#3F76E4';
                ctx.fillRect(px, pz, SCALE, SCALE);
                ctx.globalAlpha = 1.0;
                break;

            case 'lava':
                ctx.fillStyle = '#CF4F0B';
                ctx.fillRect(px, pz, SCALE, SCALE);
                break;

            case 'flat':
                ctx.fillStyle = color;
                ctx.fillRect(px, pz + 3, SCALE, 1);
                break;

            default:
                // SOLID: Full 4x4
                ctx.fillStyle = color;
                ctx.fillRect(px, pz, SCALE, SCALE);
        }
    }

    static renderTorch(ctx, id, px, pz) {
        const isSoul = String(id).includes('soul');
        const isRedstone = String(id).includes('redstone');
        const coreColor = isRedstone ? '#FF6666' : (isSoul ? '#8BFBFB' : '#FFFF00');

        // 2x2 center
        ctx.fillStyle = coreColor;
        ctx.fillRect(px + 1, pz + 1, 2, 2);
    }

    static renderFence(ctx, color, px, pz, neighbors) {
        const dark = PaletteManager.darken(color, 0.7);

        // Center post 2x2 at (1,1)
        ctx.fillStyle = color;
        ctx.fillRect(px + 1, pz + 1, 2, 2);

        // Thick 2px connections reaching edges (0→4)
        ctx.fillStyle = dark;

        // Check: Connect if neighbor is NOT air/void
        if (!PaletteManager.isVoid(neighbors?.north)) {
            ctx.fillRect(px + 1, pz, 2, 2); // North: 0→2
        }
        if (!PaletteManager.isVoid(neighbors?.south)) {
            ctx.fillRect(px + 1, pz + 2, 2, 2); // South: 2→4
        }
        if (!PaletteManager.isVoid(neighbors?.west)) {
            ctx.fillRect(px, pz + 1, 2, 2); // West: 0→2
        }
        if (!PaletteManager.isVoid(neighbors?.east)) {
            ctx.fillRect(px + 2, pz + 1, 2, 2); // East: 2→4
        }
    }
}

// ============================================================================
// MapRenderer
// ============================================================================
class MapRenderer {
    constructor(options = {}) {
        this.scale = options.scale || SCALE;
    }

    async render(terrain, position, worldInfo = {}) {
        const data = terrain.data || [];
        const mapSize = terrain.size || data.length || 64;
        const playerY = terrain.playerY || position.y || 64;

        const width = mapSize * this.scale;
        const height = width + 80;

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Clear
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(0, width, width, 80);

        // Render cells
        for (let z = 0; z < data.length; z++) {
            const row = data[z];
            if (!row) continue;
            for (let x = 0; x < row.length; x++) {
                try {
                    this.renderCell(ctx, data, row[x], x, z, playerY);
                } catch (e) {
                    if (DEBUG) console.error(`Error at ${x},${z}:`, e.message);
                }
            }
        }

        // Post-processing
        this.renderVignette(ctx, width);
        this.renderFrame(ctx, width);
        this.renderPlayerMarker(ctx, terrain, mapSize);
        this.renderInfoBar(ctx, position, worldInfo, width);

        return canvas.toBuffer('image/png');
    }

    renderCell(ctx, data, cell, x, z, playerY) {
        const px = x * this.scale;
        const pz = z * this.scale;

        let id, y;
        if (typeof cell === 'string') { id = cell; y = playerY; }
        else if (cell) { id = cell.surfaceBlockId || cell.id || ''; y = cell.surfaceY ?? cell.y ?? playerY; }
        else return;

        if (PaletteManager.isVoid(id)) return;

        const color = PaletteManager.getColor(id);
        if (!color) return;

        const neighbors = {
            north: this.getId(data, x, z - 1),
            south: this.getId(data, x, z + 1),
            west: this.getId(data, x - 1, z),
            east: this.getId(data, x + 1, z),
        };

        // Render shape
        ShapeRenderer.render(ctx, id, px, pz, color, neighbors);

        // Soft shadow for solid blocks only
        const type = ShapeRenderer.getType(id);
        if (type === 'solid' || type === 'low') {
            this.applyShadow(ctx, data, x, z, y, playerY, px, pz);
        }
    }

    getId(data, x, z) {
        if (z < 0 || z >= data.length) return null;
        const row = data[z];
        if (!row || x < 0 || x >= row.length) return null;
        const cell = row[x];
        return typeof cell === 'string' ? cell : (cell?.surfaceBlockId || cell?.id);
    }

    getY(data, x, z, def) {
        if (z < 0 || z >= data.length) return def;
        const row = data[z];
        if (!row || x < 0 || x >= row.length) return def;
        const cell = row[x];
        return typeof cell === 'string' ? def : (cell?.surfaceY ?? cell?.y ?? def);
    }

    applyShadow(ctx, data, x, z, y, playerY, px, pz) {
        const northId = this.getId(data, x, z - 1);
        const northY = this.getY(data, x, z - 1, y);

        // Only shadow if north is NOT void and higher
        if (!PaletteManager.isVoid(northId) && northY > y) {
            const d = northY - y;
            // SOFT shadow: max 15%
            const a = Math.min(0.15, d * 0.08);
            ctx.fillStyle = `rgba(0,0,0,${a})`;
            ctx.fillRect(px, pz, this.scale, this.scale);
        }
    }

    renderVignette(ctx, w) {
        const g = ctx.createRadialGradient(w / 2, w / 2, w / 3, w / 2, w / 2, w / 1.3);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.15)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, w);
    }

    renderFrame(ctx, w) {
        ctx.strokeStyle = '#3A2616';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, w);
    }

    renderPlayerMarker(ctx, terrain, mapSize) {
        const px = (terrain.playerPos?.x ?? mapSize / 2) * this.scale;
        const pz = (terrain.playerPos?.z ?? mapSize / 2) * this.scale;
        const s = this.scale * 1.5;

        ctx.save();
        ctx.translate(px + this.scale / 2, pz + this.scale / 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(-s / 2 + 1, -s / 2 + 1, s, s);
        ctx.fillStyle = '#2F1F15';
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.fillStyle = '#E0AA86';
        ctx.fillRect(-s / 2, -s / 4, s, s * 0.6);
        ctx.fillStyle = '#483D8B';
        ctx.fillRect(-s / 2 + s * 0.2, s * 0.05, s * 0.15, s * 0.1);
        ctx.fillRect(s / 2 - s * 0.35, s * 0.05, s * 0.15, s * 0.1);
        ctx.restore();
    }

    renderInfoBar(ctx, pos, info, w) {
        const y = w + 6;
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('🗺️ Skyblock Map', 8, y + 10);
        ctx.font = '9px Arial';
        ctx.fillStyle = '#AAA';
        ctx.fillText(`X:${Math.round(pos.x)} Y:${Math.round(pos.y)} Z:${Math.round(pos.z)}`, 8, y + 24);
        if (info.dimension) ctx.fillText(`🌍 ${info.dimension}`, 8, y + 38);
    }
}

module.exports = { PaletteManager, ShapeRenderer, MapRenderer };
