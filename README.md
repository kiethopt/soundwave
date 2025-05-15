
# 🎓 Soundwave  
**Vietnamese Music Streaming Platform**  

*A seamless solution empowering artists and listeners with AI-driven personalization.*

---

## 1. Project Overview  

### 🎯 Objectives  
Develop a music streaming platform that supports Vietnamese artists in publishing their work quickly and enhances the listening experience with intelligent recommendations powered by AI.

### ❗ Real-World Problem  
- **Artists** face delays in content approval and struggle with visibility on existing platforms like ZingMP3 and NhacCuaTui.  
- **Listeners** spend time manually creating playlists and often receive generic, irrelevant recommendations.  

### 👥 Target Users  
- **Artists**: Independent musicians seeking accessible tools and better exposure.  
- **Listeners**: Music lovers who want truly personalized playlists.  
- **Admins**: Platform managers who moderate and organize the system.  

---

## 2. Key Features  

### 👨‍🎤 For Artists  
- 🎵 **Quick Uploads**: Publish tracks instantly without long approval queues.  
- 🔍 **Copyright Check**: Automated originality scan before release.  

### 🎧 For Listeners  
- 🤖 **AI-Powered Playlists**: Use Gemini AI to generate playlists based on user preferences or text prompts.  
- 🔁 **Smart Recommendations**: Discover music tailored to your mood and taste.  
- 📂 **Playlist Management**: Create, edit, and organize personal playlists.  

### 🛠️ For Admins  
- 👥 **User Management**: Monitor and manage artist/user accounts.  
- 🔐 **Secure Access**: Dedicated authentication for admin-level operations.  

---

## 3. Tech Stack  

| Layer       | Technologies                        |
|-------------|-------------------------------------|
| Frontend    | React + Next.js, TailwindCSS        |
| Backend     | Node.js (Express), TypeScript       |
| Database    | PostgreSQL + Prisma ORM             |
| AI Service  | Gemini API (Google)                 |
| Cloud Media | Cloudinary (audio upload & storage) |
| Auth        | JWT (JSON Web Token)                |

---

## 4. Architecture & Design  

### 📐 Architecture Model  
- **Client–Server Model** with RESTful APIs  
- **MVC Pattern**: Modular separation between data, UI, and control  

### 🔧 Design Patterns & Principles  
- **Facade Pattern**: Simplified API wrapper for frontend use  
- **Attribute-Driven Design (ADD)**: Design decisions driven by quality attributes (e.g., performance)  

---

## 5. Functional Workflows  

### Flow: Artist Upload → Scan → Publish  
1. Artist uploads audio via dashboard.  
2. System checks copyright instantly.  
3. Admin reviews if flagged, otherwise content is published directly.
4. 
![Group03_Defense (1)](https://github.com/user-attachments/assets/d9b6267b-30ef-4deb-be1a-9c9d98a67b5d)
![Group03_Defense (2)](https://github.com/user-attachments/assets/a8327603-0ad5-4d60-851e-73ebb562c72d)
![Group03_Defense (3)](https://github.com/user-attachments/assets/69d1e8db-6568-4fff-8ba1-4d93c409e7c1)

---

## 6. Installation Guide  

### 🧰 Prerequisites  
- Node.js, npm  
- PostgreSQL  
- Git  

### 🔧 Setup  

#### Backend
```bash
git clone https://github.com/kiethopt/soundwave.git
cd soundwave/backend
npm install
npm run dev
```

#### Frontend
```bash
cd soundwave/frontend
npm install
npm run dev
```

👉 Access the platform at `http://localhost:3000`

---

## 7. Project Management  

### 🧱 Methodology  
- **Incremental Plan-Driven** approach  
- 4 major development phases aligned with Capstone milestones  

### 👨‍💻 Team Structure  

| Role               | Member               |
|--------------------|----------------------|
| Project Manager    | Ho Pham Tuan Kiet    |
| Backend Developer  | Vong Thien Long      |
| Backend Developer  | Nguyen Bao Kim       |
| Backend Developer  | Lam Xuan Hoang       |
| Frontend Developer | Lim Duc Hung         |
| Tester             | Vo Ngoc My Duyen     |

Mentor: **Mrs. Nguyen Thi Thanh**

### 📆 Timeline  
- Month 1: Requirement Analysis & Design  
- Month 2-3: Implementation & Integration  
- Month 4: Testing & Finalization  

---

## 8. Achievements  

✅ Delivered all planned features on time  
🤖 Integrated Gemini AI for playlist generation  
🚀 Reached system response time of **24.18ms** on average  
🧠 Empowered artists with self-upload and copyright scan features  
🤝 Maintained smooth team collaboration through structured workflows  

---

## 9. Future Development  

- 📱 **Mobile App**: Native or cross-platform support  
- 🎙️ **Rich Media**: Add music videos, podcasts, and live clips  
- 💬 **Community Features**: Commenting, messaging, and song interaction  
- 💸 **Monetization**: Subscription plans and payment integration  

---

## 10. Screenshots / Demo  
![Group03_Defense](https://github.com/user-attachments/assets/aa0dd67b-d22d-4ddb-9069-79daf676cdbb)
![z6595328132989_d8e3360dbda917ec161c7e8114922a10](https://github.com/user-attachments/assets/d4c35f44-6b83-4a31-bf43-97df5c6f90a4)
![z6595331920246_35435786bbc802fd204070e83abd26c0](https://github.com/user-attachments/assets/c21a1e74-2873-419b-a337-d835cc28aa4f)


---

## 11. License  

© 2025 Soundwave Team – For academic purposes only.  
Not intended for commercial use.

---
