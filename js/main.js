const appContainer = document.querySelector('#app');
const socket = new WebSocket("ws://localhost:8080");
let nickname = sessionStorage.getItem('nickname');

appContainer.innerHTML = appBody(nickname);

const loginForm = document.querySelector('#login-form');
const nicknameInput = document.querySelector('#nickname-input');

let chatContainer;
let messageForm;
let messageInput;

if (nickname) {
    assignChatElements();
    handlePhotoWindow();
} else {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        nickname = nicknameInput.value;
        sessionStorage.setItem('nickname', nickname);
        nicknameInput.value = '';
        appContainer.innerHTML = appBody(nickname);
        assignChatElements();
        handlePhotoWindow();
        sendMessage('user:in');
    });
}

socket.addEventListener('message', (e) => {
    addMessage(e.data);
});

// socket.addEventListener('error', () => {
//     alert('Connection closed.');
// });

function appBody(nickname) {
    const sourceTemplate = document.getElementById("chat-template").innerHTML;
    const template = Handlebars.compile(sourceTemplate);
    return template({nickname});
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
    // chatContainer.innerHTML = '';
}

function sendMessage(eventType, text = '') {
    const message = JSON.stringify({ event: eventType, payload: {nickname: nickname, message: text} });
    socket.send(message);
}

function addMessage(message) {
    const messageDecoded = JSON.parse(message);

    switch (messageDecoded.event) {
        case 'message:add':
            const lastMessageElem = chatContainer.children[chatContainer.children.length - 1];
            const lastMessageBlock = lastMessageElem.querySelector('.message__block');
            const lastMessageAuthor = lastMessageElem.getAttribute('data-author');

            if (lastMessageAuthor === messageDecoded.payload.nickname) {
                const unit = document.createElement('div');
                unit.innerHTML = messageUnit(messageDecoded.payload);
                lastMessageBlock.append(unit.children[0]);
            } else {
                const newMessage = document.createElement('div');
                newMessage.innerHTML = newMessageBody(messageDecoded.payload);
                chatContainer.append(newMessage.children[0]);
            }
            break;
        case 'user:in':
            console.log(messageDecoded.payload);
            break;
        case 'user:out':
            console.log(messageDecoded.payload);
            break;
        default:
            console.error('unknown message type');
            break;
    }
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
    return template({nickname, text: messageData.message, time: `${time.getHours()}:${time.getMinutes()}` });
}

function messageUnit(messageData) {
    const sourceTemplate = document.getElementById("message-unit").innerHTML;
    const template = Handlebars.compile(sourceTemplate);
    const time = new Date();

    return template({ text: messageData.message, time: `${time.getHours()}:${time.getMinutes()}` });
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


