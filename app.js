// Import Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Initialize Supabase (Move the key to an environment variable in a real-world scenario)
const supabaseUrl = 'https://ykhxhzywxkepdghtypoj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlraHhoenl3eGtlcGRnaHR5cG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2ODQ1NDIsImV4cCI6MjA1OTI2MDU0Mn0.aUWKPmnovFI2uanO1SBDLaGfB9DHEwKr_xun5_UOWpc';  // Replace with a secure method to retrieve it
const supabase = createClient(supabaseUrl, supabaseKey);

// DOM elements
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const usernameInput = document.getElementById('username');
const roomNameInput = document.getElementById('room-name');
const roomIdInput = document.getElementById('room-id');
const createRoomBtn = document.getElementById('create-room');
const joinRoomBtn = document.getElementById('join-room');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message');
const leaveRoomBtn = document.getElementById('leave-room');
const displayRoomName = document.getElementById('display-room-name');
const displayRoomId = document.getElementById('display-room-id');
const membersList = document.getElementById('members-list');

// Warning elements
const usernameWarning = document.getElementById('username-warning');
const roomNameWarning = document.getElementById('room-name-warning');
const roomIdWarning = document.getElementById('room-id-warning');
const messageWarning = document.getElementById('message-warning');

// Global variables
let currentUser = null;
let currentRoom = null;
let currentRoomId = null;
let members = [];

// Event listeners
createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', joinRoom);
sendMessageBtn.addEventListener('click', sendMessage);
leaveRoomBtn.addEventListener('click', leaveRoom);

// Allow sending messages with Enter key
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Create a new room
async function createRoom() {
    const username = usernameInput.value.trim();
    const roomName = roomNameInput.value.trim();

    if (!username) {
        usernameWarning.style.display = 'block';
        return;
    }
    usernameWarning.style.display = 'none';

    if (!roomName) {
        roomNameWarning.style.display = 'block';
        return;
    }
    roomNameWarning.style.display = 'none';

    currentUser = username;
    currentRoomId = generateRoomId(6);
    currentRoom = roomName;

    const { error } = await supabase
        .from('rooms')
        .insert([{ id: currentRoomId, name: roomName, created_at: new Date().toISOString() }]);

    if (error) {
        console.error('Error creating room:', error);
        return;
    }

    await joinRoomInternal();
}

// Join an existing room
async function joinRoom() {
    const username = usernameInput.value.trim();
    const roomId = roomIdInput.value.trim();

    if (!username) {
        usernameWarning.style.display = 'block';
        return;
    }
    usernameWarning.style.display = 'none';

    if (!roomId) {
        roomIdWarning.style.display = 'block';
        return;
    }
    roomIdWarning.style.display = 'none';

    currentUser = username;
    currentRoomId = roomId;

    const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single();

    if (error || !data) {
        roomIdWarning.textContent = 'Room not found';
        roomIdWarning.style.display = 'block';
        return;
    }

    currentRoom = data.name;
    await joinRoomInternal();
}

// Internal join room function
async function joinRoomInternal() {
    const { error: memberError } = await supabase
        .from('room_members')
        .insert([{ room_id: currentRoomId, username: currentUser, joined_at: new Date().toISOString() }]);

    if (memberError) {
        console.error('Error joining room:', memberError);
        return;
    }

    loginContainer.style.display = 'none';
    chatContainer.style.display = 'block';
    displayRoomName.textContent = `Room: ${currentRoom}`;
    displayRoomId.textContent = `ID: ${currentRoomId}`;

    await loadMessages();
    setupMessageSubscription(); // ✅ FIXED HERE
    setupMemberSubscription();
    messageInput.focus();
}

// Load previous messages
async function loadMessages() {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', currentRoomId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error loading messages:', error);
        return;
    }

    messagesContainer.innerHTML = '';
    data.forEach(addMessageToUI);
}

// ✅ FIXED Supabase real-time messages subscription
function setupMessageSubscription() {
    supabase
        .channel('messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            addMessageToUI(payload.new);
        })
        .subscribe();
}

// Subscribe to member changes
function setupMemberSubscription() {
    supabase
        .channel('room_members')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_members' }, (payload) => {
            members.push(payload.new.username);
            updateMembersList();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'room_members' }, (payload) => {
            members = members.filter(m => m !== payload.old.username);
            updateMembersList();
        })
        .subscribe();
}

// Add message to UI
function addMessageToUI(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.innerHTML = `<strong>${message.sender}:</strong> ${message.content}`;
    
    if (message.sender === currentUser) {
        messageDiv.classList.add('sender');
    } else {
        messageDiv.classList.add('receiver');
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send a message
async function sendMessage() {
    const message = messageInput.value.trim();

    if (!message) {
        messageWarning.style.display = 'block';
        return;
    }
    messageWarning.style.display = 'none';

    const { error } = await supabase
        .from('messages')
        .insert([{ room_id: currentRoomId, sender: currentUser, content: message, created_at: new Date().toISOString() }]);

    if (error) {
        console.error('Error sending message:', error);
        return;
    }

    messageInput.value = '';
}

// Update members list display
function updateMembersList() {
    membersList.innerHTML = `Members (${members.length}): ${members.join(', ')}`;
}

// Generate random room ID
function generateRoomId(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

// Leave the room
async function leaveRoom() {
    if (!currentRoomId || !currentUser) return;

    await supabase.from('room_members').delete().eq('room_id', currentRoomId).eq('username', currentUser);

    currentRoom = null;
    currentRoomId = null;
    currentUser = null;
    members = [];

    chatContainer.style.display = 'none';
    loginContainer.style.display = 'block';
    messagesContainer.innerHTML = '';
    membersList.innerHTML = '';
}
