# Backend – Setup Guide

Express.js REST API for the PeakPlay e-commerce app.

## Quick Start

```bash
npm install
cp .env.example .env   # then fill in values (see below)
npm start
```

## Required Environment Variables

Create a `.env` file in this folder (never commit it). Use `.env.example` as a template.

| Key | Required | Description |
|---|---|---|
| `CONNECTION_STRING` | YES | MongoDB Atlas connection URI |
| `JWT_SECRET` | YES | Any long random secret string for signing JWTs |
| `FCM_SERVICE_ACCOUNT_PATH` | For push notifications | Filename of Firebase Admin SDK service account JSON (place the file in this folder) |
| `PORT` | No (default: 4000) | Port the server listens on |
| `DB_NAME` | No (default: ITCP_database) | MongoDB database name |
| `JWT_EXPIRES_IN` | No (default: 7d) | Token expiry |
| `CORS_ORIGIN` | No (default: *) | Allowed CORS origins |

## API Endpoints

Base path: `/api/v1`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Health check |
| POST | `/users/register` | No | Register new user |
| POST | `/users/login` | No | Login, returns JWT |
| GET | `/users/:id` | JWT | Get user profile |
| PUT | `/users/profile` | JWT | Update delivery address + profile |
| POST | `/users/push-token` | JWT | Register push token |
| GET | `/products` | No | List all products |
| GET | `/products/:id` | No | Single product |
| POST | `/products` | Admin JWT | Create product |
| PUT | `/products/:id` | Admin JWT | Update product |
| DELETE | `/products/:id` | Admin JWT | Delete product |
| GET | `/categories` | No | List all categories |
| POST | `/categories` | Admin JWT | Create category |
| GET | `/orders` | JWT | List orders (user sees own; admin sees all) |
| POST | `/orders` | JWT | Place order (requires complete delivery profile) |
| PUT | `/orders/:id` | Admin JWT | Update order status |
| GET | `/stock-alerts` | Admin JWT | List low-stock alerts |

## Files NOT in Git (exclude these)

- `.env` — your secrets
- `*firebase-adminsdk*.json` / `firebase-service-account*.json` — Firebase private key
- `uploads/` — runtime image uploads
- `node_modules/`
