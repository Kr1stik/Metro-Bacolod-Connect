# Metro Bacolod Connect (MBC)

A SaaS-enabled Real Estate Marketplace for the Metro Negros region, connecting property seekers with verified professionals.

## 📂 Project Structure
This is a **Monorepo** containing two main folders:
* **`metro-bacolod-api`**: The Backend (NestJS + Firebase Admin)
* **`metro-bacolod-web`**: The Frontend (React + Vite + Firebase Client)

---

## 🚀 Getting Started

### 1. Clone the Repository
Open your terminal and run:
```bash
git clone [https://github.com/Kr1stik/Metro-Bacolod-Connect.git](https://github.com/Kr1stik/Metro-Bacolod-Connect.git)
cd Metro-Bacolod-Connect

cd metro-bacolod-api

npm install

Create a new file named .env inside the metro-bacolod-api folder.

Paste them into the file like this:
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

npm run start:dev
The server should be running at http://localhost:3000

Setup the Frontend (Web)
Open a new terminal (keep the backend running) and go back to the root folder.

cd metro-bacolod-web

npm install

npm run dev
The app should be running at http://localhost:5173