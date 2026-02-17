const http = require('http');

const payload = JSON.stringify({
    type: "chat",
    secret: "minecraft-discord-sync-2024",
    playerName: "TestBot",
    message: "Hello from test script!",
    serverTime: Date.now()
});

const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/player-update',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(payload);
req.end();
