# ♔ Master Chess

A full-stack, real-time multiplayer chess application with **Stockfish AI integration**, **ELO matchmaking**, and **live WebSocket gameplay**. Built with **React + TypeScript** on the frontend and **Go (Gin)** on the backend.

![Chess Game](https://img.shields.io/badge/Status-Active-brightgreen) ![Go](https://img.shields.io/badge/Go-1.25-00ADD8?logo=go) ![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)

---

## ✨ Features

### 🎮 Gameplay
- **Real-time multiplayer** chess via WebSocket connections
- **Play against Stockfish AI** (configurable depth levels)
- **Full chess rule enforcement** with checkmate, stalemate, and draw detection
- **Move validation** and legal move highlighting
- **Live chess clocks** with synchronized timing between players
- **Move history** tracking with SAN (Standard Algebraic Notation)

### 👥 Multiplayer & Matchmaking
- **Automated matchmaking system** with rating-based pairing
- **Join/leave queue** functionality
- **Active match polling** for seamless game discovery
- **Private game rooms** via shareable URLs

### 🔐 Authentication & Security
- **JWT-based authentication** for secure sessions
- **User registration and login** system
- **Server-side turn validation** to prevent cheating
- **Protected API routes** with middleware

### 💬 Social
- **In-game chat** between players
- **Real-time message broadcasting** via WebSocket

---

## 🏗️ Architecture

```
chesss/
├── client/                 # React + TypeScript Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── Chat.tsx
│   │   │   ├── Clock.tsx
│   │   │   ├── MoveList.tsx
│   │   │   └── PlayerCard.tsx
│   │   ├── context/        # React Context providers
│   │   │   └── AuthContext.tsx
│   │   ├── pages/          # Page components
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── api/            # API client
│   │   │   └── client.ts
│   │   ├── App.tsx         # Main app with routing
│   │   ├── Game.tsx        # Chess game component
│   │   └── Home.tsx        # Landing page
│   ├── Dockerfile
│   └── package.json
│
├── server/                 # Go Backend (Gin Framework)
│   ├── cmd/                # Entry point
│   ├── internal/
│   │   ├── api/            # Router setup
│   │   │   └── router.go
│   │   ├── config/         # Configuration management
│   │   ├── database/       # Database connection
│   │   ├── handlers/       # HTTP & WebSocket handlers
│   │   │   ├── game/       # Game WebSocket handler
│   │   │   ├── matchmaking/# Matchmaking endpoints
│   │   │   └── user/       # Auth endpoints
│   │   ├── middleware/     # CORS & Auth middleware
│   │   ├── models/         # GORM models
│   │   │   ├── game.go
│   │   │   ├── user.go
│   │   │   ├── move.go
│   │   │   ├── rating.go
│   │   │   └── matchmaking.go
│   │   ├── services/       # Business logic
│   │   │   ├── engine/     # Stockfish UCI integration
│   │   │   ├── game/       # Game state management
│   │   │   ├── matchmaking/# Matchmaking service
│   │   │   └── user/       # User service
│   │   └── utils/          # Utility functions
│   ├── migrations/         # Database migrations
│   ├── Dockerfile
│   └── go.mod
│
├── docker-compose.yml      # Container orchestration
└── Makefile                # Development commands
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **chess.js** | Chess logic & validation |
| **react-chessboard** | Interactive board component |
| **React Router v7** | Client-side routing |
| **TailwindCSS 4** | Styling |
| **Axios** | HTTP client |
| **Lucide React** | Icons |

### Backend
| Technology | Purpose |
|------------|---------|
| **Go 1.25** | Server runtime |
| **Gin** | HTTP framework |
| **GORM** | ORM for PostgreSQL |
| **Gorilla WebSocket** | Real-time communication |
| **golang-jwt** | JWT authentication |
| **Stockfish** | Chess AI engine (UCI) |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **PostgreSQL 15** | Database |
| **Docker Compose** | Container orchestration |

---

## 🚀 Getting Started

### Prerequisites

- **Docker** & **Docker Compose** (recommended)
- OR **Node.js 20+** & **Go 1.25+** for local development
- **Stockfish** (for AI games - installed in container)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/datmedevil17/chesss.git
cd chesss

# Start all services
make up

# View logs
make logs
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080

### Local Development

#### 1. Start the Database
```bash
make db
```

#### 2. Run the Server
```bash
cd server
cp .env.example .env  # Configure environment variables
go run ./cmd/main.go
```

#### 3. Run the Client
```bash
cd client
npm install
npm run dev
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register new user |
| `POST` | `/api/v1/auth/login` | Login and get JWT |
| `GET` | `/api/v1/auth/me` | Get current user (requires auth) |

### Matchmaking (requires authentication)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/matchmaking/join` | Join matchmaking queue |
| `POST` | `/api/v1/matchmaking/leave` | Leave matchmaking queue |
| `GET` | `/api/v1/matchmaking/active` | Check for active match |

### Game
| Method | Endpoint | Description |
|--------|----------|-------------|
| `WS` | `/api/v1/game/ws/:gameId` | WebSocket game connection |

#### WebSocket Message Types

**Client → Server:**
```json
{ "type": "move", "payload": "e2e4" }
{ "type": "chat", "payload": { "text": "Good luck!" } }
{ "type": "game_over", "payload": { "result": "1-0", "reason": "checkmate", "winner": "white" } }
```

**Server → Client:**
```json
{ "type": "init", "payload": { "fen": "...", "color": "white", "status": "active", "white_time": 600, "black_time": 600 } }
{ "type": "move", "payload": { "move": "e2e4", "white_time": 595, "black_time": 600, "current_turn": "black" } }
{ "type": "chat", "payload": { "sender": "white", "text": "Hello!" } }
```

---

## 🗄️ Database Models

### User
| Field | Type | Description |
|-------|------|-------------|
| `ID` | `uint` | Primary key |
| `Email` | `string` | Unique email |
| `Username` | `string` | Display name |
| `Password` | `string` | Hashed password |
| `IsBanned` | `bool` | Ban status |

### Game
| Field | Type | Description |
|-------|------|-------------|
| `ID` | `string` | UUID primary key |
| `WhiteID` / `BlackID` | `uint` | Player foreign keys |
| `Status` | `string` | `waiting` / `active` / `finished` |
| `Result` | `string` | `1-0` / `0-1` / `1/2-1/2` / `*` |
| `Reason` | `string` | `checkmate` / `resign` / `timeout` / `draw` |
| `Mode` | `string` | `bullet` / `blitz` / `rapid` / `ai` |
| `FEN` | `string` | Current board position |
| `WhiteTimeRemaining` / `BlackTimeRemaining` | `int` | Seconds |

---

## ♟️ Game Modes

| Mode | Time Control | Description |
|------|--------------|-------------|
| **Rapid** | 10+0 | 10 minutes per player |
| **AI** | 10+0 | Play against Stockfish |

---

## 🤖 Stockfish Integration

The server integrates with Stockfish using the **UCI protocol**:

1. Engine spawns as a subprocess
2. Communicates via stdin/stdout
3. Supports position analysis from FEN or move history
4. Returns best move for AI games

```go
// Example: Get best move from current position
engine.GetBestMove("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", 15)
```

---

## 🧪 Development Commands

```bash
make up        # Start all containers
make down      # Stop all containers
make build     # Build containers
make logs      # View container logs
make db        # Start only database
make db-shell  # Connect to PostgreSQL
```

---

## 🔒 Environment Variables

### Server (`server/.env`)
```env
PORT=8080
DATABASE_URL=postgres://user:password@db:5432/chess_db
JWT_SECRET=your-secret-key
STOCKFISH_PATH=/usr/games/stockfish  # Optional: path to Stockfish binary
```

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [chess.js](https://github.com/jhlywa/chess.js) - Chess logic library
- [react-chessboard](https://github.com/Clariity/react-chessboard) - React chessboard component
- [Stockfish](https://stockfishchess.org/) - Open source chess engine
- [Gin](https://gin-gonic.com/) - Go HTTP framework

---

**Built with ♥ for chess enthusiasts**
