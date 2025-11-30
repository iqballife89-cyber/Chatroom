// server.js (Node.js WebSocket WebRTC Sinyal Sunucusu)

const WebSocket = require('ws'); 
const wss = new WebSocket.Server({ port: 8080 }); 

console.log("🚀 WebSocket Sunucusu 8080 portunda dinliyor...");

let waitingUsers = []; 

wss.on('connection', function connection(ws) {
    
    ws.id = Date.now() + Math.floor(Math.random() * 1000); 
    ws.isPaired = false;
    ws.partner = null; 

    ws.on('message', function incoming(message) {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) { return; }

        const partner = ws.partner;

        if (data.type === 'find_partner') {
            if (!ws.isPaired && !waitingUsers.includes(ws)) {
                waitingUsers.push(ws);
                tryToPairUsers();
            }
            return;
        }

        if (partner) {
             if (data.type === 'offer' || data.type === 'answer' || data.type === 'ice-candidate' || data.type === 'chat_message') {
                partner.send(JSON.stringify(data));
            } else if (data.type === 'chat_end') {
                handleChatEnd(ws, partner);
            }
        }
    });

    ws.on('close', () => {
        if (ws.partner) {
            handleChatEnd(ws, ws.partner);
        }
        waitingUsers = waitingUsers.filter(user => user.id !== ws.id);
    });
});

function handleChatEnd(userA, userB) {
    userB.send(JSON.stringify({ type: 'chat_end', message: 'Yabancı sohbetten ayrıldı.' }));
    userB.isPaired = false;
    userB.partner = null;
    if (!waitingUsers.includes(userB)) {
        waitingUsers.push(userB);
    }
    userA.isPaired = false;
    userA.partner = null;
    tryToPairUsers();
}

function tryToPairUsers() {
    const unpairedUsers = waitingUsers.filter(u => !u.isPaired);
    
    if (unpairedUsers.length >= 2) {
        const user1 = unpairedUsers[0];
        const user2 = unpairedUsers[1];

        user1.partner = user2;
        user2.partner = user1;
        user1.isPaired = true;
        user2.isPaired = true;
        
        waitingUsers = waitingUsers.filter(u => u.id !== user1.id && u.id !== user2.id);

        user1.send(JSON.stringify({ type: 'match_found', is_initiator: true }));
        user2.send(JSON.stringify({ type: 'match_found', is_initiator: false }));
        tryToPairUsers();
    }
}