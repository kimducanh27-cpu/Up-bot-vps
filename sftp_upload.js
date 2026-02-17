const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');

const sftp = new SftpClient();

async function upload() {
    console.log('🔌 Connecting to SFTP...');

    try {
        await sftp.connect({
            host: 'gamma.pikamc.vn',
            port: 2022,
            username: 'user0auq3d9s.fc65569d',
            password: 'ducanh124',
            readyTimeout: 30000
        });

        console.log('✅ Connected!');

        // Upload main.js to behavior_packs/player_addon/scripts/
        const localFile = path.join(__dirname, 'player_addon', 'scripts', 'main.js');
        const remotePath = '/behavior_packs/player_addon/scripts/main.js';

        console.log('📤 Uploading:', localFile);
        console.log('📁 To:', remotePath);

        // Check if local file exists
        if (!fs.existsSync(localFile)) {
            console.log('❌ Local file not found:', localFile);
            await sftp.end();
            return;
        }

        // Check if remote scripts folder exists
        const scriptsExists = await sftp.exists('/behavior_packs/player_addon/scripts');
        if (!scriptsExists) {
            console.log('📁 Creating scripts folder...');
            await sftp.mkdir('/behavior_packs/player_addon/scripts', true);
        }

        // Upload main.js
        await sftp.put(localFile, remotePath);
        console.log('✅ Uploaded main.js');

        // Upload manifest.json
        const localManifest = path.join(__dirname, 'player_addon', 'manifest.json');
        const remoteManifest = '/behavior_packs/player_addon/manifest.json';
        console.log('📤 Uploading:', localManifest);
        if (fs.existsSync(localManifest)) {
            await sftp.put(localManifest, remoteManifest);
            console.log('✅ Uploaded manifest.json');
        } else {
            console.log('⚠️ manifest.json not found!');
        }

        // Upload world_behavior_packs.json to world folder
        const localWorldPacks = path.join(__dirname, 'world_behavior_packs.json');
        const remoteWorldPacks = '/worlds/Bedrock level/world_behavior_packs.json';
        console.log('📤 Uploading:', localWorldPacks);
        if (fs.existsSync(localWorldPacks)) {
            await sftp.put(localWorldPacks, remoteWorldPacks);
            console.log('✅ Uploaded world_behavior_packs.json');
        } else {
            console.log('⚠️ world_behavior_packs.json not found!');
        }

        // Upload permissions.json to server root (enable server-net module)
        const localPermissions = path.join(__dirname, 'permissions.json');
        const remotePermissions = '/config/default/permissions.json';
        console.log('📤 Uploading:', localPermissions);
        if (fs.existsSync(localPermissions)) {
            await sftp.put(localPermissions, remotePermissions);
            console.log('✅ Uploaded permissions.json');
        }

        console.log('✅ All uploads complete!');

        // Verify
        const info = await sftp.stat(remotePath);
        console.log('📊 Remote file size:', info.size, 'bytes');

        await sftp.end();
        console.log('🔌 Disconnected');
        console.log('');
        console.log('🎉 DONE! Restart Minecraft server để áp dụng addon mới!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        try { await sftp.end(); } catch { }
    }
}

upload();
