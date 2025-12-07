<div align="center">

# 🎥 SkyMeet - Video Conferencing Platform

[![Live Demo](https://img.shields.io/badge/Live-Demo-success?style=for-the-badge&logo=render)](https://skymeet-project.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org/)

### *A modern, full-stack video conferencing application with real-time communication*

[🚀 Live Demo](https://skymeet-6prd.onrender.com/) • [📝 Report Bug](https://github.com/piyush2602/SkyMeet-Project/issues) • [✨ Request Feature](https://github.com/piyush2602/SkyMeet-Project/issues)

</div>

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

---

## 🌟 About the Project

**SkyMeet** is a real-time video conferencing web application built with a sleek, Zoom-inspired interface. It enables seamless video and audio communication between multiple participants using WebRTC technology. Perfect for remote teams, online meetings, virtual classrooms, and social gatherings.

### ✨ Why SkyMeet?

- 🎯 **Simple & Intuitive** - Clean, user-friendly interface inspired by Zoom
- 🔒 **Secure** - End-to-end WebRTC peer-to-peer connections
- ⚡ **Fast** - Real-time communication with minimal latency
- 🌐 **Accessible** - Works on any modern browser, no downloads required
- 💡 **Lightweight** - Built with vanilla JavaScript for optimal performance

---

## 🚀 Features

### Core Functionality
- ✅ **User Authentication** - Secure login and signup system
- 🎥 **Create/Join Rooms** - Instantly create or join meeting rooms with unique IDs
- 📹 **Video Streaming** - High-quality peer-to-peer video communication
- 🎤 **Audio Controls** - Mute/unmute microphone with visual feedback
- 📷 **Camera Controls** - Turn camera on/off seamlessly
- 👥 **Multiple Participants** - Support for multi-user video conferences

### User Experience
- 🎨 **Modern UI** - Clean, light-themed interface with blue accents
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- 🔄 **Real-time Updates** - Instant notification when users join/leave
- 🎯 **Room Management** - Easy room creation and sharing

---

## 🛠️ Tech Stack

### Frontend
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)

- **WebRTC** - Real-time peer-to-peer communication
- **Socket.IO Client** - Real-time bidirectional event-based communication
- **Vanilla JS** - Pure JavaScript for optimal performance

### Backend
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socketdotio&logoColor=white)

- **Node.js** - JavaScript runtime environment
- **Express.js** - Fast, minimalist web framework
- **Socket.IO** - WebSocket library for real-time communication
- **CORS** - Cross-origin resource sharing

### Infrastructure
- **STUN Server** - Google STUN server for NAT traversal (`stun:stun.l.google.com:19302`)
- **Render** - Cloud hosting platform for deployment

---

## 🎬 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1️⃣ **Clone the repository**
```bash
git clone https://github.com/piyush2602/SkyMeet-Project.git
cd SkyMeet-Project
```

2️⃣ **Navigate to server directory**
```bash
cd server
```

3️⃣ **Install dependencies**
```bash
npm install
```

### Running Locally

#### Development Mode (with auto-reload)
```bash
cd server
npm run dev
```

#### Production Mode
```bash
cd server
npm start
```

The server will start on **`http://localhost:3000`** 🎉

---

## 💻 Usage

### Starting a Meeting

1. **Access the Application**
   - Open your browser and navigate to `http://localhost:3000` (local) or [https://skymeet-project.onrender.com](https://skymeet-project.onrender.com) (live)

2. **Enter Your Details**
   - Provide your display name
   - Choose to either create a new room or enter an existing room ID

3. **Create or Join**
   - **Create New Room**: Click the button to generate a unique room ID automatically
   - **Join Room**: Enter a room ID shared by someone else and click join

4. **Share the Room**
   - Copy the room ID and share it with participants
   - They can use the same room ID to join your meeting

5. **Control Your Media**
   - Use the microphone button to mute/unmute
   - Use the camera button to turn video on/off

### Tips
- 📋 **Share Room ID** quickly by copying it from the meeting interface
- 🔊 **Test Audio/Video** before joining important meetings
- 🌐 **Use a stable internet connection** for best experience

---

## 📁 Project Structure

```
skymeet/
├── client/                     # Frontend files
│   ├── auth.html              # Authentication page
│   ├── meeting-home.html      # Meeting lobby
│   ├── meeting.html           # Main meeting interface
│   ├── app.js                 # Client-side WebRTC & Socket.IO logic
│   └── style.css              # Styling
│
├── server/                     # Backend files
│   ├── index.js               # Express server & Socket.IO signaling
│   ├── package.json           # Server dependencies
│   ├── data/                  # User data storage
│   │   └── users.json         # User authentication data
│   └── Procfile               # Deployment configuration
│
└── README.md                   # You are here!

```

## 🌐 Deployment

SkyMeet is deployed on **Render** for production use.

### 🔗 Live Application
**[https://skymeet-project.onrender.com](https://skymeet-project.onrender.com)**

### Deploy Your Own Instance

1. **Fork this repository**
2. **Create a Render account** at [render.com](https://render.com)
3. **Create a new Web Service**
   - Connect your GitHub repository
   - Set build command: `cd server && npm install`
   - Set start command: `cd server && npm start`
   - Set environment: `Node`
4. **Deploy** and your app will be live! 🚀

---

## 📸 Screenshots

> *Coming soon! Add screenshots of your application in action*

---

## 🗺️ Roadmap

- [x] Basic video/audio calling
- [x] Room creation and joining
- [x] Mute/unmute controls
- [x] Camera on/off controls
- [x] User authentication
- [ ] Screen sharing capability
- [ ] In-meeting text chat
- [ ] Recording functionality
- [ ] Virtual backgrounds
- [ ] Breakout rooms
- [ ] Meeting scheduling
- [ ] Mobile app (React Native)

See the [open issues](https://github.com/piyush2602/SkyMeet-Project/issues) for a full list of proposed features and known issues.

---

## 📧 Author

**Piyush** - [@piyush2602](https://github.com/piyush2602)

**Project Link:** [https://github.com/piyush2602/SkyMeet-Project](https://github.com/piyush2602/SkyMeet-Project)

**Live Demo:** [https://skymeet-6prd.onrender.com/).

---

<div align="center">

### ⭐ Star this repository if you found it helpful!

Made with ❤️ by [Piyush](https://github.com/piyush2602)

</div>
