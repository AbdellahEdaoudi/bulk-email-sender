# 📨 Bulk Email Sender

A modern, full-stack web application designed for sending individual and bulk email campaigns seamlessly. Built with **Next.js 16**, **TailwindCSS**, and **Nodemailer**.

![Bulk Email Sender App](app/image.png)

---

## ✨ Key Features

- ✉️ **Single & Bulk Email Dispatching**: Support for sending to a single recipient or multiple formatted email addresses.
- ⏹️ **Pause & Resume Functionality**: Pause active bulk sending tasks at any time and resume when ready.
- 🚫 **Cancel Operation**: Stop sending immediately with a single click.
- 🎯 **Mock Email Generator**: Quick one-click generation of dummy email lists for testing.
- 🎨 **Modern & Responsive UI/UX**: Sleek dark mode interface featuring smooth animations and dynamic progress indicators.
- 🔔 **Toast Notifications**: Instant visual feedback for success, pause, and error states.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS, Lucide Icons
- **Backend**: Next.js API Routes, Nodemailer
- **Styling**: Vanilla CSS, Glassmorphism design tokens

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/AbdellahEdaoudi/bulk-email-sender.git
cd bulk-email-sender
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables Setup
Create a `.env` or `.env.local` file in the root directory and add your email provider credentials (e.g., Gmail App Password):

```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

> 💡 **Note**: For Gmail, make sure 2-Step Verification is enabled and generate an **App Password** from your Google Account settings.

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.
