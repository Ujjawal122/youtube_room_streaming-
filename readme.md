# WatchParty

WatchParty is a real-time synchronized YouTube watch room application. It lets you create a room, invite friends, and watch videos together perfectly in sync. If the host pauses the video, it pauses for everyone. If they skip ahead, everyone skips ahead.

## Features

- **Real-time Video Sync:** Play, pause, and seek actions are instantly broadcasted to everyone in the room.
- **YouTube IFrame API:** Paste any YouTube video link and watch it together.
- **Role-Based Controls:** Includes Host, Moderator, Participant, and Viewer roles so you can control who is allowed to change or seek the video.
- **Live Chat & Reactions:** Built-in chat and floating emoji reactions for the watch room.
- **Persistent Rooms:** Room states and chats are saved so you can jump back in whenever.

## Tech Stack

**Frontend:** React (Vite), Tailwind CSS, Framer Motion
**Backend:** Node.js, Express, Socket.IO
**Database & Caching:** MongoDB, Redis
**Auth:** JWT via HTTP-only cookies

## Running Locally

### Prerequisites
Make sure you have Node.js, MongoDB, and Redis installed and running on your machine.

### 1. Clone & Install
Install the dependencies for both the frontend and backend:
```bash
# In the backend directory
cd backend
npm install

# In the frontend directory
cd frontend
npm install
```

### 2. Environment Variables
Create a `.env` file in the **backend** directory with the following (adjust ports and URIs as needed):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/watchparty
JWT_SECRET=your_super_secret_key
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:5173
```

### 3. Start the Servers
You'll need to run both the frontend and backend servers.

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The app should now be running at `http://localhost:5173`. Create an account, start a room, and share the code with friends!