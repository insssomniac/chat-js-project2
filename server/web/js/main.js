const appContainer = document.querySelector('#app');
const socket = new WebSocket("ws://localhost:8080");
let nickname = sessionStorage.getItem('nickname');
let uid = sessionStorage.getItem('uid');

appContainer.innerHTML = appBody();

const loginForm = document.querySelector('#login-form');
const nicknameInput = document.querySelector('#nickname-input');

let chatContainer, messageForm, messageInput;

if (uid) {
    assignChatElements();
    handlePhotoWindow();
    sendMessage('user:in');
    sendMessage('users:get');
    sendMessage('messages:get');
    console.log('refresh page');
} else {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (socket.readyState === 1) {
            nickname = nicknameInput.value;
            uid = getUid(nickname);
            sessionStorage.setItem('nickname', nickname);
            sessionStorage.setItem('uid', uid);
            nicknameInput.value = '';
            appContainer.innerHTML = appBody();
            assignChatElements();
            handlePhotoWindow();
            sendMessage('user:in');
            sendMessage('users:get');
            sendMessage('messages:get');
        } else {
            return console.error('Connection error');
        }
    });
}

socket.addEventListener('message', (e) => {
    const messageDecoded = JSON.parse(e.data);
    switch (messageDecoded.event) {
        case "users:all":
            applyCurrentUsers(messageDecoded.payload);
            break;
        case "messages:all":
            applyCurrentMessages(messageDecoded.payload);
            break;
        default:
            addMessage(messageDecoded, chatContainer);
            sendMessage('users:get');
    }
});

socket.addEventListener('error', () => {
    console.error('Connection closed.');
});


function getUid(nickname) {
    return nickname + '_' + Date.now() + (Math.floor(Math.random() * (10000 - 99)) + 99);
}

function appBody() {
    const sourceTemplate = document.getElementById("chat-template").innerHTML;
    const template = Handlebars.compile(sourceTemplate);
    return template({nickname: nickname, uid: uid});
}

function assignChatElements() {
    chatContainer = document.querySelector('#conversation-section');
    messageForm = document.querySelector('#message-form');
    messageInput = document.querySelector('#message-input');

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage('message:add', messageInput.value);
        messageInput.value = '';
    });
}

function sendMessage(eventType, text = '') {
    const date = new Date();
    const time = `${date.getHours()}:${date.getMinutes()}`;
    const timestamp = date.getTime();

    if (eventType === 'user:in') text = `${nickname} вошел в чат`;

    const message = JSON.stringify(
        { event: eventType, payload: {uid: uid, nickname: nickname, message: text, time: time, timestamp: timestamp} }
    );
    send(message);
}

function send(message) {
    if (socket.readyState === 1) {
        socket.send(message);
    } else {
        setTimeout(() => send(message), 1000);
    }
}

function addMessage(message, chatContainer) {
    switch (message.event) {
        case 'message:add':
            addTextMessage(message, chatContainer);
            break;
        case 'user:in':
        case 'user:out':
            const unit = document.createElement('div');
            unit.innerHTML = newMessageUnit(message.payload, 'serviceMessage');
            chatContainer.append(unit.children[0]);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            break;
        default:
            console.error('unknown message type');
            break;
    }
}

function addTextMessage(messageData, chatContainer) {
    let lastMessageElem, lastMessageBlock, lastMessageAuthor;
    let unit = document.createElement('div');

    if (chatContainer.children.length > 0) {
        lastMessageElem = chatContainer.children[chatContainer.children.length - 1];
        lastMessageBlock = lastMessageElem.querySelector('.message__block');
        lastMessageAuthor = lastMessageElem.getAttribute('data-author');

        if (lastMessageAuthor === messageData.payload.uid) {
            unit.innerHTML = newMessageUnit(messageData.payload);
            lastMessageBlock.append(unit.children[0]);
        } else {
            unit.innerHTML = newMessageBody(messageData.payload);
            chatContainer.append(unit.children[0]);
        }
    } else {
        unit.innerHTML = newMessageBody(messageData.payload);
        chatContainer.append(unit.children[0]);
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function newMessageBody(messageData) {
    let sourceTemplate;
    let template;
    const time = new Date();

    if (messageData.nickname === nickname) {
        sourceTemplate = document.getElementById("message-own").innerHTML;
    } else {
        sourceTemplate = document.getElementById("message-someone").innerHTML;
    }

    template = Handlebars.compile(sourceTemplate);
    return template({nickname: messageData.nickname, uid: messageData.uid, text: messageData.message, time: messageData.time });
}

function newMessageUnit(messageData, messageType = 'userMessage') {
    let sourceTemplate;

    if (messageType === 'userMessage') {
        sourceTemplate = document.getElementById("message-unit").innerHTML;
    } else {
        sourceTemplate = document.getElementById("message-unit-service").innerHTML;
    }

    const template = Handlebars.compile(sourceTemplate);
    return template({ text: messageData.message, time: messageData.time });
}

function handlePhotoWindow() {
    const menuButton = document.querySelector("#hamburger");
    const fullscreenModal = document.querySelector("#fullscreen-modal");
    const closeFsModal = document.querySelector("#close-fs-modal");
    const toggleModal = () => fullscreenModal.classList.toggle('fullscreen-modal--active')

    menuButton.addEventListener('click', e => {
        e.preventDefault();
        toggleModal();
    });

    closeFsModal.addEventListener('click', toggleModal);
}

function newUser(user) {
    const sourceTemplate = document.getElementById("user-info-left-panel").innerHTML;
    const template = Handlebars.compile(sourceTemplate);
    return template({nickname: user.nickname, lastmessage: user.lastmessage});
}

function applyCurrentMessages(messages) {
    let fragment = document.createDocumentFragment();
    for (let message of messages) {
        addMessage(message, fragment);
    }
    chatContainer.append(fragment);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function applyCurrentUsers(users) {
    let unit = document.createElement('div');
    const usersSection = document.querySelector('#users');
    let fragment = document.createDocumentFragment();
    for (let user in users) {
        unit.innerHTML = newUser(users[user]);
        fragment.append(unit.children[0]);
    }
    usersSection.innerHTML = '';
    usersSection.append(fragment);
}

