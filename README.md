# FocusFlow - Pomodoro Collaboration Platform

A distraction-free Pomodoro web app enabling real-time collaboration using Next.js, MERN stack, Tailwind CSS, Socket.io, and WebRTC.

![FocusFlow](https://img.shields.io/badge/FocusFlow-Pomodoro%20Collaboration-6366f1)

## ✨ Features

- **🔐 Authentication** - JWT-based secure login and registration
- **🏠 Rooms** - Create and join collaboration rooms with unique IDs
- **⏱️ Synchronized Timer** - Pomodoro timer synced across all room participants
- **💬 Real-time Chat** - Instant messaging within rooms
- **📹 Video Calling** - Multi-user WebRTC video calls

## 🛠️ Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Socket.io Client
- WebRTC

### Backend
- Node.js + Express.js
- MongoDB (Atlas)
- Mongoose ODM
- Socket.io
- JWT Authentication

## 📁 Project Structure

```
pomodoro-collab/
├── frontend/                 # Next.js App
│   ├── src/
│   │   ├── app/             # Pages (App Router)
│   │   ├── components/      # React components
│   │   └── lib/             # Utilities
│   └── ...
│
└── backend/                  # Express.js Server
    ├── controllers/         # Route handlers
    ├── models/              # Mongoose schemas
    ├── routes/              # API routes
    ├── socket/              # Socket.io handlers
    ├── middleware/          # Auth middleware
    └── utils/               # Utilities
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- npm or yarn

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
```

Edit `.env` with your MongoDB Atlas connection string:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/pomodoro-collab
JWT_SECRET=your-super-secret-jwt-key-change-this
CLIENT_URL=http://localhost:3000
```

Start the backend:
```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file
cp .env.example .env.local
```

Start the frontend:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Testing

### Multi-user Testing
1. Open the app in two browser windows/tabs
2. Register two different accounts
3. Create a room in window 1
4. Copy the room ID and join from window 2
5. Test:
   - Chat messages appear in both windows
   - Timer controls (host only) sync across both
   - Video call connects both users

## 📝 API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Rooms
- `POST /api/rooms` - Create room (protected)
- `GET /api/rooms` - List all rooms (protected)
- `GET /api/rooms/:roomId` - Get room details (protected)
- `POST /api/rooms/:roomId/join` - Join room (protected)

## 🔌 Socket Events

### Chat
- `send-message` - Send chat message
- `receive-message` - Receive chat message

### Timer
- `timer-start/pause/reset` - Timer controls (host only)
- `timer-sync` - Timer state synchronization

### Video (WebRTC Signaling)
- `video-ready` - User ready for video
- `video-offer/answer` - WebRTC offer/answer
- `video-ice-candidate` - ICE candidate exchange

## 📄 License

MIT
