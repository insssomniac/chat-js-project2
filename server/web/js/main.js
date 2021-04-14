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
    handlePhotoUpload();
} else {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (socket.readyState === 1) {
            nickname = sanitize(nicknameInput.value);
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
            handlePhotoUpload();
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
        case "photo:changed":
            applyPhoto(messageDecoded.payload.uid);
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
        sendMessage('message:add', sanitize(messageInput.value));
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

function handlePhotoUpload() {
    const avatarUploadArea = document.querySelector('[data-role=user-pic-upload-area]');

    console.log(avatarUploadArea);

    avatarUploadArea.addEventListener('dragover', (e) => {
        if (e.dataTransfer.items.length && e.dataTransfer.items[0].kind === 'file') e.preventDefault();
        console.log('dragover');
    });

    avatarUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();

        const file = e.dataTransfer.items[0].getAsFile();
        const reader = new FileReader();

        reader.readAsDataURL(file);
        reader.addEventListener('load', () => upload(reader.result, '/upload-photo'));
    });
}

function upload(data, url) {
    fetch(url, {
        method: 'post',
        body: JSON.stringify({
            uid: uid,
            data: data,
        }),
    });
}

function applyPhoto(uid) {
    const avatars = document.querySelectorAll(`[data-role=user-pic][data-user=${uid}]`)
    for (const avatar of avatars) {
        avatar.style = `background: no-repeat url(userpics/${uid}.png?t=${Date.now()}) top/cover`;
    }
}

function newUser(user) {
    const sourceTemplate = document.getElementById("user-info-left-panel").innerHTML;
    const template = Handlebars.compile(sourceTemplate);
    return template({uid:user.uid, nickname: user.nickname, lastmessage: user.lastmessage});
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
    let counter = 0;
    for (let user in users) {
        unit.innerHTML = newUser(users[user]);
        fragment.append(unit.children[0]);
        counter++;
    }
    usersSection.innerHTML = '';
    usersSection.append(fragment);
    countMembers(counter);
}

function countMembers(count) {
    const countMembers = document.querySelector('[data-role=count-members]');
    count = count % 10;
    let res;

    switch (count) {
        case 1:
            res = `${count} участник`;
            break;
        case 2:
        case 3:
        case 4:
            res = `${count} участника`;
            break;
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 0:
            res = `${count} участников`;
            break;
    }

    countMembers.innerHTML = res;
}

function sanitize(string) {
    const UNSAFE_CHARS_RE = /<|>\/|'|\u2028|\u2029/g;
    const ESCAPED_CHARS = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '\\u0027',
        '</': '<\\u002F',
        '\u2028': '\\u2028',
        '\u2029': '\\u2029',
    };
    const escapeUnsafeChars = (unsafeChar) => ESCAPED_CHARS[unsafeChar];
    return string.replace(UNSAFE_CHARS_RE, escapeUnsafeChars);
}