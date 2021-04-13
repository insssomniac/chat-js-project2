const WebSocketServer = new require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const publicDir = path.resolve('./server/web/');

http.createServer((req, res) => {
    console.log('Incoming request ', req.url);
    const filePath = path.join(publicDir, req.url);
    let content, contentType;

    const index = path.resolve('./server/web/index.html');
    console.log(index);

    switch (req.url) {
        case '/':
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(fs.readFileSync(filePath + '/index.html'));
            res.end();
            break;
        default:
            const strArr = req.url.split('.');
            const ext = strArr[strArr.length - 1];
            const type = getType(ext);

            if (fs.existsSync(filePath)) {
                content = fs.readFileSync(filePath);
            } else {
                content = '';
            }

            res.writeHead(200, {'Content-Type': type});
            res.write(content);
            res.end();
            break;
    }

}).listen(8000, () => console.log("Web server is running on port 8000"));

function getType(ext) {
    let type;
    switch (ext) {
        case 'css':
            type = 'text/css';
            break;
        case 'js':
            type = 'text/javascript';
            break;
        case 'svg':
            type = 'image/svg+xml';
            break;
        case 'png':
            type = 'image/png';
            break;
        case 'jpeg':
        case 'jpg':
            type = 'image/jpeg';
            break;
        default:
            type = '';
            break;
    }
    return type;
}

let clients = {};
let users = {};
let messages = [];
let currentId = 1;


const webSocketServer = new WebSocketServer.Server({port: 8080});

webSocketServer.on('connection', function (ws) {
    const id = currentId++;
    clients[id] = ws;

    ws.on('message', function (receivedMessage) {
        const messageDecoded = JSON.parse(receivedMessage);
        const uid = messageDecoded.payload.uid;
        const userId = getUserId(uid);
        let answer;

        if (messageDecoded.event === 'message:add' || messageDecoded.event === 'user:in') {
            for (const key in clients) clients[key].send(receivedMessage);
            messages.push(messageDecoded);
            updateUsersList(messageDecoded, id);
        }

        if (messageDecoded.event === 'users:get') {
            answer = JSON.stringify({event: "users:all", payload: users});
            clients[userId].send(answer);
        }

        if (messageDecoded.event === 'messages:get') {
            answer = JSON.stringify({event: "messages:all", payload: messages});
            clients[userId].send(answer);
        }
    });

    ws.on('close', function () {
        if (users[id]) {
            const time = new Date();
            const message = {
                event: "user:out",
                payload: {
                    uid: users[id].uid, nickname: users[id].nickname,
                    message: `${users[id].nickname} вышел`,
                    time: `${time.getHours()}:${time.getMinutes()}`
                }
            };

            for (const key in clients) clients[key].send(JSON.stringify(message));
            messages.push(message);
            delete users[id];
        }
        delete clients[id];
    });
});

function getUserId(uid) {
    for (let user in users) {
        if (users[user].uid === uid) return user;
    }
}

function updateUsersList(messageDecoded, userId) {
    let lastmessage = messageDecoded.payload.message ? messageDecoded.payload.message : `${messageDecoded.payload.nickname} вошел в чат`
    users[userId] = {
        uid: messageDecoded.payload.uid,
        nickname: messageDecoded.payload.nickname,
        lastmessage: lastmessage,
        lastmessageTime: messageDecoded.payload.time,
        lastMessageTimestamp: messageDecoded.payload.timestamp
    };
}

console.log("Socket server is running on port 8080");

