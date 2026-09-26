# ExamCraft AI 📝✨

> AI-Powered Exam Generator with Real-Time Speech Dictation, Textbook/Notebook Uploads, A4 Print-Ready Layout, and Export to Microsoft Word (`.docx`) & PDF.

---

## 🌟 Features

- 🎙️ **Real-Time Speech-to-Text Dictation**: Speak exam questions aloud, and ExamCraft automatically transcribes, structures, and formats them.
- 📸 **Textbook & Notebook Scan**: Upload images or PDFs of handwritten class notes or textbooks to generate multiple-choice, short-answer, and essay questions.
- 📄 **A4 Print-Ready Preview**: Dual-column or single-column layout strictly formatted for standard A4 printing with school crest logo and candidate details.
- 📑 **Export to Word (`.docx`)**: Generates an editable Microsoft Word document with headers, rubrics, and the official answer key at the end.
- 🖨️ **Direct PDF Export**: Download crisp PDFs directly from the browser.
- 📱 **Progressive Web App (PWA)**: Works offline and can be installed on iOS, Android, and Desktop.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ or 20+ recommended)
- [Git](https://git-scm.com/)
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### 2. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/examcraft-ai.git
cd examcraft-ai
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Open `.env` and add your Gemini API key:
```env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
PORT=3000
```

### 5. Run the Application
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 🌐 How to Host on GitHub & Deploy Live (Free Options)

Because ExamCraft has both a React frontend and an Express backend (for secure Gemini API calls and textbook uploads):

### Option A: Render.com (Recommended - 100% Free & Simplest)
1. Push your repository to **GitHub**.
2. Go to [render.com](https://render.com) and sign up with GitHub.
3. Click **New +** -> **Web Service**.
4. Select your GitHub repository.
5. Set:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
6. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Your key from Google AI Studio)*
   - `NODE_ENV`: `production`
7. Click **Create Web Service**. Render gives you a free permanent HTTPS URL (e.g., `https://examcraft.onrender.com`) that anyone can open.

### Option B: Railway.app
1. Go to [railway.app](https://railway.app) and link your GitHub account.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Add `GEMINI_API_KEY` under Variables.
4. Railway will automatically detect the build and start scripts and launch it with a public URL.

### Option C: Vercel (Serverless)
If deploying to Vercel, convert the Express endpoints in `server.ts` into Vercel Serverless Functions under an `/api` folder.

---

## 🛠️ Scripts

- `npm run dev`: Runs the local development server with Express + Vite on port 3000.
- `npm run build`: Compiles production assets into `dist/`.
- `npm start`: Runs the production Express server serving the compiled frontend.
- `npm run lint`: Checks TypeScript compilation for errors.

---

## 📄 License
MIT License. Created with Google AI Studio.
