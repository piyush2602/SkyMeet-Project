// Basic SkyMeet front-end logic using WebRTC (mesh) + Socket.IO

// Auth elements
const authNameInput = document.getElementById('authName');
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const authStatusEl = document.getElementById('authStatus');
const currentUserEl = document.getElementById('currentUser');

// Meeting elements
const displayNameInput = document.getElementById('displayName');
const roomIdInput = document.getElementById('roomId');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const statusEl = document.getElementById('status');
const meetingPanel = document.getElementById('meetingPanel');
const meetingTitle = document.getElementById('meetingTitle');
const roomLabel = document.getElementById('roomLabel');
const videoGrid = document.getElementById('videoGrid');
const toggleMicBtn = document.getElementById('toggleMicBtn');
const toggleCameraBtn = document.getElementById('toggleCameraBtn');
const leaveCallBtn = document.getElementById('leaveCallBtn');

const shareScreenBtn = document.getElementById('shareScreenBtn');

// Chat elements
const chatBtn = document.getElementById('chatBtn');
const chatPanel = document.getElementById('chatPanel');
const closeChatBtn = document.getElementById('closeChatBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const attachFileBtn = document.getElementById('attachFileBtn');
const fileInput = document.getElementById('fileInput');

let socket;
let localStream;
let peers = {}; // socketId -> RTCPeerConnection
let localVideoTile;
let audioEnabled = true;
let videoEnabled = true;
let currentRoomId;
let currentName;
let currentUser = null;

let screenStream = null;
let isScreenSharing = false;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function setAuthStatus(message, isError = false) {
  authStatusEl.textContent = message;
  authStatusEl.classList.toggle('error', isError);
}

function updateCurrentUser(user) {
  currentUser = user;
  if (currentUser) {
    currentUserEl.textContent = `Logged in as ${currentUser.name} (${currentUser.email})`;
    displayNameInput.value = currentUser.name;
    // Enable meeting controls once authenticated
    displayNameInput.disabled = false;
    roomIdInput.disabled = false;
    createRoomBtn.disabled = false;
    joinRoomBtn.disabled = false;
  } else {
    currentUserEl.textContent = '';
    // Disable meeting controls when logged out
    displayNameInput.disabled = true;
    roomIdInput.disabled = true;
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
  }
}

function randomRoomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID().slice(0, 8);
  return 'room-' + Math.random().toString(36).slice(2, 10);
}


async function ensureMedia() {
  if (localStream) return localStream;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    addLocalVideo(localStream);
    return localStream;
  } catch (err) {
    console.error('Error getting user media', err);
    setStatus('Could not access camera/microphone. Check permissions.', true);
    throw err;
  }
}

function attachTileActions(tile, video) {
  const actions = document.createElement('div');
  actions.className = 'video-actions';

  const fsBtn = document.createElement('button');
  fsBtn.className = 'btn-icon fullscreen-btn';
  fsBtn.title = 'Toggle fullscreen';
  fsBtn.textContent = '⛶';
  fsBtn.addEventListener('click', () => {
    const target = tile;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (target.requestFullscreen) {
      target.requestFullscreen();
    }
  });

  actions.appendChild(fsBtn);
  tile.appendChild(actions);
}

function addLocalVideo(stream) {
  if (localVideoTile) return;
  const tile = document.createElement('div');
  tile.className = 'video-tile';

  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;

  const label = document.createElement('div');
  label.className = 'video-label';
  label.textContent = currentName || 'You';

  tile.appendChild(video);
  tile.appendChild(label);
  attachTileActions(tile, video);
  videoGrid.appendChild(tile);

  localVideoTile = tile;
}
// get local video element
function getLocalVideoElement() {
  if (!localVideoTile) return null;
  return localVideoTile.querySelector('video');
}

function addRemoteVideo(stream, peerId, name) {
  let tile = document.querySelector(`[data-peer-id="${peerId}"]`);
  if (!tile) {
    tile = document.createElement('div');
    tile.className = 'video-tile';
    tile.dataset.peerId = peerId;

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;

    const label = document.createElement('div');
    label.className = 'video-label';
    label.textContent = name || 'Guest';

    tile.appendChild(video);
    tile.appendChild(label);
    attachTileActions(tile, video);
    videoGrid.appendChild(tile);
  }

  const video = tile.querySelector('video');
  video.srcObject = stream;
}

function removeRemoteVideo(peerId) {
  const tile = document.querySelector(`[data-peer-id="${peerId}"]`);
  if (tile && tile.parentNode) {
    tile.parentNode.removeChild(tile);
  }
}

function createPeerConnection(peerId, isInitiator, remoteName) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  });

  peers[peerId] = pc;

  // Add local tracks
  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', {
        to: peerId,
        data: { type: 'ice-candidate', candidate: event.candidate }
      });
    }
  };

  const remoteStream = new MediaStream();

  pc.ontrack = (event) => {
    remoteStream.addTrack(event.track);
    addRemoteVideo(remoteStream, peerId, remoteName);
  };

  // The actual offer for initiators is created explicitly via startNegotiation(peerId)

  return pc;
}

async function startNegotiation(peerId) {
  const pc = peers[peerId];
  if (!pc) return;

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('signal', {
      to: peerId,
      data: { type: 'offer', sdp: pc.localDescription }
    });
  } catch (err) {
    console.error('Error creating offer', err);
  }
}

function cleanupPeers() {
  Object.values(peers).forEach((pc) => pc.close());
  peers = {};
  Array.from(videoGrid.querySelectorAll('[data-peer-id]')).forEach((el) =>
    el.remove()
  );
}

function leaveCall() {
  // Hide meeting UI
  meetingPanel.classList.add('hidden');
  setStatus('');

  // Close all peer connections and remove remote tiles
  cleanupPeers();

  // Remove local video tile
  if (localVideoTile && localVideoTile.parentNode) {
    localVideoTile.parentNode.removeChild(localVideoTile);
  }
  localVideoTile = null;

  // Stop screen sharing//
  if (screenStream) {
    screenStream.getTracks().forEach((t) => t.stop());
    screenStream = null;
  }

  isScreenSharing = false;
  if (shareScreenBtn) {
    shareScreenBtn.classList.remove('active');
  }

  // Stop local media tracks
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }

  // Disconnect signaling
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // Clear and close chat
  if (chatMessages) {
    chatMessages.innerHTML = '';
  }
  if (chatPanel) {
    chatPanel.classList.add('hidden');
  }
  if (chatBtn) {
    chatBtn.classList.remove('active');
  }

  currentRoomId = null;
  currentName = null;
}

async function joinRoom(roomId, name) {
  if (!roomId || !name) {
    setStatus('Please enter a display name and room ID.', true);
    return;
  }

  await ensureMedia();

  if (!socket) {
    socket = io(); // same origin as server

    socket.on('connect', () => {
      console.log('Connected to signaling server', socket.id);
    });

    socket.on('existing-users', async (users) => {
      console.log('Existing users in room:', users);
      for (const user of users) {
        const { socketId, name: remoteName } = user;
        createPeerConnection(socketId, true, remoteName);
        await startNegotiation(socketId);
      }
    });

    socket.on('user-joined', ({ socketId, name: remoteName }) => {
      console.log('User joined:', socketId, remoteName);
      // For new user joining after us, they will initiate connection to us.
    });

    socket.on('user-left', ({ socketId }) => {
      console.log('User left:', socketId);
      if (peers[socketId]) {
        peers[socketId].close();
        delete peers[socketId];
      }
      removeRemoteVideo(socketId);
    });

    socket.on('signal', async ({ from, name: remoteName, data }) => {
      let pc = peers[from];
      if (!pc && data.type === 'offer') {
        // New incoming call
        pc = createPeerConnection(from, false, remoteName);
      }
      if (!pc) return;

      try {
        if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', {
            to: from,
            data: { type: 'answer', sdp: pc.localDescription }
          });
        } else if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else if (data.type === 'ice-candidate' && data.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            console.error('Error adding received ICE candidate', err);
          }
        }
      } catch (err) {
        console.error('Error handling signal', err);
      }
    });

    // Listen for chat messages
    socket.on('chat-message', ({ senderId, name, text, time }) => {
      const isOwn = senderId === socket.id;
      appendChatMessage(name, text, time, isOwn);
    });

    // Listen for file messages
    socket.on('chat-file', ({ senderId, name, fileName, fileData, fileType, fileSize, time }) => {
      const isOwn = senderId === socket.id;
      appendFileMessage(name, fileName, fileData, fileType, fileSize, time, isOwn);
    });
  }

  currentRoomId = roomId;
  currentName = name;
  meetingTitle.textContent = `Meeting with ${roomId}`;
  roomLabel.textContent = `Room ID: ${roomId}`;
  meetingPanel.classList.remove('hidden');

  // Set initial active state for buttons
  if (toggleMicBtn) toggleMicBtn.classList.toggle('active', audioEnabled);
  if (toggleCameraBtn) toggleCameraBtn.classList.toggle('active', videoEnabled);

  socket.emit('join-room', { roomId, name });
  setStatus('Joined room. Share the Room ID with others to invite them.');
}

if (signupBtn) {
  signupBtn.addEventListener('click', async () => {
    const name = authNameInput.value.trim();
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    if (!name || !email || !password) {
      setAuthStatus('Please fill name, email, and password to sign up.', true);
      return;
    }

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthStatus(data.error || 'Signup failed', true);
        return;
      }
      updateCurrentUser(data.user);
      setAuthStatus('Signup successful.', false);
    } catch (err) {
      console.error('Signup error', err);
      setAuthStatus('Signup failed due to network error.', true);
    }
  });
}

if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    if (!email || !password) {
      setAuthStatus('Please enter email and password to log in.', true);
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthStatus(data.error || 'Login failed', true);
        return;
      }
      updateCurrentUser(data.user);
      setAuthStatus('Login successful.', false);
    } catch (err) {
      console.error('Login error', err);
      setAuthStatus('Login failed due to network error.', true);
    }
  });
}

if (createRoomBtn) {
  createRoomBtn.addEventListener('click', async () => {
    const name = displayNameInput.value.trim() || currentUser?.name || '';
    const roomId = randomRoomId();
    roomIdInput.value = roomId;
    await joinRoom(roomId, name);
  });
}

if (joinRoomBtn) {
  joinRoomBtn.addEventListener('click', async () => {
    const name = displayNameInput.value.trim() || currentUser?.name || '';
    const roomId = roomIdInput.value.trim();
    await joinRoom(roomId, name);
  });
}

function updateMediaStates() {
  if (!localStream) return;
  localStream.getAudioTracks().forEach((t) => (t.enabled = audioEnabled));
  localStream.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));
}

if (toggleMicBtn) {
  toggleMicBtn.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    updateMediaStates();
    toggleMicBtn.classList.toggle('active', audioEnabled);
  });
}

if (toggleCameraBtn) {
  toggleCameraBtn.addEventListener('click', () => {
    videoEnabled = !videoEnabled;
    updateMediaStates();
    toggleCameraBtn.classList.toggle('active', videoEnabled);
  });
}

// leaveCallBtn event listener is handled in meeting.html inline script
// leaveCallBtn.addEventListener('click', () => {
//   leaveCall();
// });

// ---------- Screen sharing ----------

if (shareScreenBtn) {
  shareScreenBtn.addEventListener('click', async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  });
}

async function startScreenShare() {
  try {
    // Ask browser to share screen
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: false
    });

    const screenTrack = screenStream.getVideoTracks()[0];

    // Replace video track in ALL peer connections
    Object.values(peers).forEach((pc) => {
      const sender = pc.getSenders().find(
        (s) => s.track && s.track.kind === 'video'
      );
      if (sender) {
        sender.replaceTrack(screenTrack);
      }
    });

    // Show screen in local tile
    const localVideoEl = getLocalVideoElement();
    if (localVideoEl) {
      localVideoEl.srcObject = screenStream;
    }

    isScreenSharing = true;
    if (shareScreenBtn) {
      shareScreenBtn.classList.add('active');
    }

    // If user stops sharing from browser popup
    screenTrack.onended = () => {
      stopScreenShare();
    };
  } catch (err) {
    console.error('Error starting screen share', err);
    // if user cancelled, do nothing
  }
}

async function stopScreenShare() {
  if (!screenStream) return;

  // stop the screen capture
  screenStream.getTracks().forEach((t) => t.stop());
  screenStream = null;

  // we must have original camera stream
  if (!localStream) {
    console.warn('No localStream to switch back to.');
    isScreenSharing = false;
    if (shareScreenBtn) {
      shareScreenBtn.classList.remove('active');
    }
    return;
  }

  const cameraTrack = localStream.getVideoTracks()[0];

  // Replace back in ALL peer connections
  Object.values(peers).forEach((pc) => {
    const sender = pc.getSenders().find(
      (s) => s.track && s.track.kind === 'video'
    );
    if (sender && cameraTrack) {
      sender.replaceTrack(cameraTrack);
    }
  });

  // Restore local tile to camera
  const localVideoEl = getLocalVideoElement();
  if (localVideoEl) {
    localVideoEl.srcObject = localStream;
  }

  isScreenSharing = false;
  if (shareScreenBtn) {
    shareScreenBtn.classList.remove('active');
  }
}

// ---------- Chat functionality ----------

function toggleChatPanel() {
  if (chatPanel) {
    chatPanel.classList.toggle('hidden');
    if (chatBtn) {
      chatBtn.classList.toggle('active', !chatPanel.classList.contains('hidden'));
    }
  }
}

function sendChatMessage() {
  if (!chatInput || !socket || !currentRoomId) return;
  
  const text = chatInput.value.trim();
  if (!text) return;
  
  socket.emit('chat-message', {
    roomId: currentRoomId,
    name: currentName || 'Guest',
    text: text
  });
  
  chatInput.value = '';
}

function appendChatMessage(name, text, time, isOwn) {
  if (!chatMessages) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${isOwn ? 'own' : 'other'}`;
  
  const timeStr = new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  msgDiv.innerHTML = `
    <span class="chat-sender">${isOwn ? 'You' : name}</span>
    <div class="chat-bubble">${escapeHtml(text)}</div>
    <span class="chat-time">${timeStr}</span>
  `;
  
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Chat event listeners
if (chatBtn) {
  chatBtn.addEventListener('click', toggleChatPanel);
}

if (closeChatBtn) {
  closeChatBtn.addEventListener('click', toggleChatPanel);
}

if (sendChatBtn) {
  sendChatBtn.addEventListener('click', sendChatMessage);
}

if (chatInput) {
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });
}

// ---------- File sharing ----------

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function getFileIcon(fileType) {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('word') || fileType.includes('document')) return '📄';
  if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.startsWith('video/')) return '🎬';
  return '📎';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function sendFile(file) {
  if (!socket || !currentRoomId) return;
  
  if (file.size > MAX_FILE_SIZE) {
    alert('File too large! Maximum size is 5MB.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = () => {
    socket.emit('chat-file', {
      roomId: currentRoomId,
      name: currentName || 'Guest',
      fileName: file.name,
      fileData: reader.result,
      fileType: file.type,
      fileSize: file.size
    });
  };
  reader.readAsDataURL(file);
}

function appendFileMessage(name, fileName, fileData, fileType, fileSize, time, isOwn) {
  if (!chatMessages) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${isOwn ? 'own' : 'other'}`;
  
  const timeStr = new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const icon = getFileIcon(fileType);
  const size = formatFileSize(fileSize);
  
  msgDiv.innerHTML = `
    <span class="chat-sender">${isOwn ? 'You' : name}</span>
    <div class="file-message">
      <span class="file-icon">${icon}</span>
      <div class="file-info">
        <div class="file-name">${escapeHtml(fileName)}</div>
        <div class="file-size">${size}</div>
      </div>
      <a href="${fileData}" download="${escapeHtml(fileName)}" class="download-btn">Download</a>
    </div>
    <span class="chat-time">${timeStr}</span>
  `;
  
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// File event listeners
if (attachFileBtn && fileInput) {
  attachFileBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      sendFile(file);
      fileInput.value = ''; // Reset input
    }
  });
}


window.addEventListener('beforeunload', () => {
  cleanupPeers();
  if (socket) {
    socket.disconnect();
  }
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
  }
});
