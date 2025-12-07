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

let socket;
let localStream;
let peers = {}; // socketId -> RTCPeerConnection
let localVideoTile;
let audioEnabled = true;
let videoEnabled = true;
let currentRoomId;
let currentName;
let currentUser = null;

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
  }

  currentRoomId = roomId;
  currentName = name;
  meetingTitle.textContent = `Meeting with ${roomId}`;
  roomLabel.textContent = `Room ID: ${roomId}`;
  meetingPanel.classList.remove('hidden');

  socket.emit('join-room', { roomId, name });
  setStatus('Joined room. Share the Room ID with others to invite them.');
}

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

createRoomBtn.addEventListener('click', async () => {
  const name = displayNameInput.value.trim() || currentUser?.name || '';
  const roomId = randomRoomId();
  roomIdInput.value = roomId;
  await joinRoom(roomId, name);
});

joinRoomBtn.addEventListener('click', async () => {
  const name = displayNameInput.value.trim() || currentUser?.name || '';
  const roomId = roomIdInput.value.trim();
  await joinRoom(roomId, name);
});

function updateMediaStates() {
  if (!localStream) return;
  localStream.getAudioTracks().forEach((t) => (t.enabled = audioEnabled));
  localStream.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));
}

toggleMicBtn.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  updateMediaStates();
  toggleMicBtn.textContent = audioEnabled ? 'Mute' : 'Unmute';
});

toggleCameraBtn.addEventListener('click', () => {
  videoEnabled = !videoEnabled;
  updateMediaStates();
  toggleCameraBtn.textContent = videoEnabled ? 'Stop Video' : 'Start Video';
});

// leaveCallBtn event listener is handled in meeting.html inline script
// leaveCallBtn.addEventListener('click', () => {
//   leaveCall();
// });

window.addEventListener('beforeunload', () => {
  cleanupPeers();
  if (socket) {
    socket.disconnect();
  }
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
  }
});
