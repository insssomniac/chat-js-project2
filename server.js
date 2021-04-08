const WebSocketServer = new require('ws');

let clients = {};
let currentId = 1;

const webSocketServer = new WebSocketServer.Server({port: 8080});

webSocketServer.on('connection', function(ws) {
    const id = currentId++;
    clients[id] = ws;

    ws.on('message', function(message) {
        const messageDecoded = JSON.parse(message);

        if (messageDecoded.event === ('message:add' || 'user:in' || 'user:out')) {
            for(const key in clients) {
                clients[key].send(message);
            }
        }

    });

    ws.on('close', function() {
        delete clients[id];
    });
});
console.log("Сервер запущен на порту 8080");