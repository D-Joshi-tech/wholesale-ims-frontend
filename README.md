# Wholesale Desk — Frontend

Modern, fast wholesale inventory & billing web application built with **Next.js 15 (App Router)**, **TypeScript**, and **Tailwind CSS**.

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env.local` file in the root of `frontend`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying on Vercel

### Step 1: Push this folder to GitHub
Push this `frontend` directory as its own GitHub repository (e.g. `wholesale-ims-frontend`).

### Step 2: Import into Vercel
1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your `wholesale-ims-frontend` GitHub repository.
3. Vercel automatically detects **Next.js**.

### Step 3: Add Environment Variable
Under **Environment Variables**, add:
* **Key**: `NEXT_PUBLIC_API_URL`
* **Value**: Your deployed backend URL (e.g. `https://wholesale-ims-backend.onrender.com`)

### Step 4: Deploy
Click **Deploy**. Your frontend is now live on Vercel!

---

## 🛠 Tech Stack
* **Framework**: Next.js 15 (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS
* **Icons**: Lucide React
