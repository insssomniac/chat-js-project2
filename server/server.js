const WebSocketServer = new require('ws');
const http = require('http');

let clients = {};
let users = {};
let messages = [];
let currentId = 1;

const webSocketServer = new WebSocketServer.Server({port: 8080});

webSocketServer.on('connection', function(ws) {
    const id = currentId++;
    clients[id] = ws;

    ws.on('message', function(receivedMessage) {
        const messageDecoded = JSON.parse(receivedMessage);
        const uid = messageDecoded.payload.uid;
        const userId = getUserId(uid);
        let answer;

        if (messageDecoded.event === 'message:add' || messageDecoded.event ===  'user:in') {
            for(const key in clients) clients[key].send(receivedMessage);
            messages.push(messageDecoded);

            let lastmessage = messageDecoded.payload.message ? messageDecoded.payload.message : `${messageDecoded.payload.nickname} вошел в чат`
            users[id] = {
                uid: messageDecoded.payload.uid,
                nickname: messageDecoded.payload.nickname,
                lastmessage: lastmessage,
                lastmessageTime: messageDecoded.payload.time,
                lastMessageTimestamp: messageDecoded.payload.timestamp
            };
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

    ws.on('close', function() {
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
            for(const key in clients) clients[key].send(JSON.stringify(message));
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


console.log("Server is running on port 8080");

