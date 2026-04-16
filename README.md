# GhostOpsAI — Backend

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-Cognito_|_S3_|_EventBridge-FF9900?style=flat-square&logo=amazonaws&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-AI-F55036?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

REST API for the GhostOpsAI platform. Manages operators, teams, vehicles, missions, and infirmary data — protected by AWS Cognito JWT authentication and backed by MongoDB.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Vehicle Wear System](#vehicle-wear-system)
- [Authentication](#authentication)
- [Getting Started](#getting-started)
- [CORS](#cors)

---

## Architecture

![GhostOpsAI AWS Architecture](docs/GhostopsAI_Diagram.png)

The backend runs on **AWS LightSail** (Node/Express) behind CloudFront and AWS WAF. Cognito JWTs protect every endpoint. MongoDB persists all data. Two **Serverless Recovery Engines** handle async workflows — one for operator injury recovery, one for vehicle repair — each driven by EventBridge, Step Functions, and Lambda. Operator images are stored in **S3**. AI mission generation is powered by **Groq**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Express.js |
| Database | MongoDB + Mongoose |
| Authentication | AWS Cognito (JWT verify) |
| File Storage | AWS S3 + Multer |
| Event Bus | AWS EventBridge (vehicle repair workflow) |
| Image Processing | Sharp |
| AI | Groq API |
| Runtime | Node.js 18+ |

---

## Project Structure

```
├── controllers/
│   ├── OperatorController.js
│   ├── TeamController.js
│   ├── SquadController.js
│   ├── InfirmaryController.js
│   ├── MemorialController.js
│   ├── VehicleController.js
│   ├── MissionController.js
│   └── AiController.js
├── models/
│   ├── Operator.js
│   ├── Team.js
│   ├── Squad.js
│   ├── Infirmary.js
│   ├── Memorial.js
│   ├── Vehicle.js
│   └── Mission.js
├── routes/
│   ├── operatorRoutes.js
│   ├── teamRoutes.js
│   ├── squadRoutes.js
│   ├── infirmaryRoutes.js
│   ├── memorialRoutes.js
│   ├── vehicleRoutes.js
│   ├── missionRoutes.js
│   └── aiRoutes.js
├── middleware/
│   └── uploadMiddleware.js    # Multer + S3 upload config
├── utils/
│   └── S3utils.js             # Presigned URL helpers
└── server.js                  # Entry point
```

---

## API Reference

All endpoints require `Authorization: Bearer <token>` (Cognito JWT) unless noted otherwise.

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | None | Server health check |

### Operators

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/operators` | List all operators for the authenticated user |
| `POST` | `/api/operators` | Create a new operator |
| `PUT` | `/api/operators/:id` | Update an operator |
| `DELETE` | `/api/operators/:id` | Delete an operator |

### Teams

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/teams` | List all teams |
| `POST` | `/api/teams` | Create a team |
| `PUT` | `/api/teams/:id` | Update a team |
| `DELETE` | `/api/teams/:id` | Delete a team |

### Squads

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/squads` | List all squads |
| `POST` | `/api/squads` | Create a squad |
| `PUT` | `/api/squads/:id` | Update a squad |
| `DELETE` | `/api/squads/:id` | Delete a squad |

### Vehicles

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/vehicles` | List all vehicles |
| `POST` | `/api/vehicles` | Add a vehicle (starting fuel is randomized 2–100%) |
| `PUT` | `/api/vehicles/:id` | Update a vehicle |
| `DELETE` | `/api/vehicles/:id` | Delete a vehicle |
| `POST` | `/api/vehicles/:id/trip` | Log a ground deployment — applies wear and fuel burn |
| `POST` | `/api/vehicles/:id/sortie` | Log an aircraft sortie — applies wear and fuel burn |
| `POST` | `/api/vehicles/:id/repair` | Initiate repair via AWS EventBridge |
| `PUT` | `/api/vehicles/:id/condition` | Lambda callback — resets `wearPercent` to 0 on repair complete |
| `POST` | `/api/vehicles/:id/refuel` | Refuel a vehicle |
| `GET` | `/api/vehicles/:id/availability` | Check if a vehicle can be deployed |

### Infirmary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/infirmary` | List injured operators |
| `POST` | `/api/infirmary` | Log an injury |
| `PUT` | `/api/infirmary/:id` | Update an injury record |
| `DELETE` | `/api/infirmary/:id` | Discharge an operator |

### Memorial

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/memorial` | List KIA entries |
| `POST` | `/api/memorial` | Add a memorial entry |
| `DELETE` | `/api/memorial/:id` | Remove an entry |

### Missions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/missions` | List missions |
| `POST` | `/api/missions` | Create a mission |
| `PUT` | `/api/missions/:id` | Update a mission |
| `DELETE` | `/api/missions/:id` | Delete a mission |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/generate` | Generate a mission using Groq AI |

---

## Vehicle Wear System

Wear is **time-based**. The frontend calculates `wearAdded = minutesUsed × wearRate` and sends it to the backend. The backend applies it directly — no server-side wear formula.

**Request body for `/trip` and `/sortie`:**

```json
{
  "minutesUsed": 5,
  "wearAdded": 25,
  "fuelBurned": 40
}
```

**Condition thresholds (`wearPercent`):**

| Wear % | Condition | Deployable |
|--------|-----------|-----------|
| 0–24% | Optimal | Yes |
| 25–49% | Operational | Yes |
| 50–74% | Compromised | Yes |
| 75%+ | Critical | No |

**Repair workflow:**

```
Frontend → POST /repair
  → EventBridge event fired
    → Step Function waits repair duration
      → Lambda calls PUT /:id/condition
        → wearPercent reset to 0, isRepairing cleared
```

> `PUT /:id/condition` is an internal Lambda callback. It looks up vehicles by ID only — not by `createdBy` — since the Lambda does not carry a user token.

---

## Authentication

Every request is verified against the Cognito User Pool JWKS endpoint:

1. Middleware extracts `Authorization: Bearer <token>`
2. Verifies the JWT signature and expiry
3. Sets `req.userId` from the token's `sub` claim
4. All database queries are scoped to `{ createdBy: req.userId }` to enforce data isolation between users

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas (or local MongoDB)
- AWS account with:
  - Cognito User Pool
  - S3 bucket for operator images
  - EventBridge + Step Function for the vehicle repair workflow

### Installation

```bash
git clone https://github.com/your-org/backend-ghostops.git
cd backend-ghostops
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/ghostops

# AWS Cognito
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=your_client_id
AWS_REGION=us-east-1

# AWS S3
S3_BUCKET_NAME=your-bucket-name

# Groq AI
GROQ_API_KEY=your_groq_api_key
```

### Running Locally

```bash
# Development with auto-reload
npx nodemon server.js

# Production
node server.js
```

---

## CORS

Requests are accepted from the following origins:

- `http://localhost:5173`
- `https://ghostopsai.com`
- `https://www.ghostopsai.com`
