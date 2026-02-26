require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');

async function test() {
    const apiId = Number(process.env.TELEGRAM_API_ID);
    const apiHash = process.env.TELEGRAM_API_HASH;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    console.log("Checking API ID:", apiId);
    console.log("Checking API Hash:", apiHash ? "Loaded" : "Missing");
    console.log("Checking Bot Token:", botToken ? "Loaded" : "Missing");

    if (!apiId || !apiHash || !botToken) {
        return console.error("MISSING CREDENTIALS IN .ENV");
    }

    try {
        const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
            connectionRetries: 5,
        });

        await client.start({
            botAuthToken: botToken,
        });

        console.log("✅ Successfully connected to Telegram via MTProto!");

        // Test sending a small dummy file
        fs.writeFileSync("dummy.txt", "Hello World! This is a test file for MTProto.");

        await client.sendFile("7155481287", {
            file: "dummy.txt",
            caption: "Test Upload from script",
        });

        console.log("✅ Successfully sent file via MTProto!");

        fs.unlinkSync("dummy.txt");
        await client.disconnect();
    } catch (e) {
        console.error("❌ ERROR:", e);
    }
}

test();
