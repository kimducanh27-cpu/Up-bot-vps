const SftpClient = require('ssh2-sftp-client');

const config = {
    host: "gamma.pikamc.vn",
    port: 2022,
    username: "user0auq3d9s.fc65569d",
    password: "ducanh124"
};

async function main() {
    const sftp = new SftpClient();
    try {
        console.log("Connecting...");
        await sftp.connect(config);
        console.log("Connected! Listing /worlds...");
        const list = await sftp.list('/worlds');
        console.log("Files in /worlds:", list.map(i => i.name));
        await sftp.end();
    } catch (err) {
        console.error("SFTP Error:", err);
    }
}
main();
