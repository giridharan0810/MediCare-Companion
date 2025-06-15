# 💊 MediCare Companion

[🔗 **Live Demo**](https://medi-care-companion.vercel.app/)

A React + TypeScript medication management app with dual user roles (Patients and Caretakers), built using Supabase and React Query. This version completes **Phase 1** of the implementation, covering full authentication and medication tracking with real-time dashboard integration.

---

## ✅ Features Implemented (Phase 1)

- 🔐 **User Authentication**  
  Signup/Login using Supabase Auth with role-based account handling.

- 🧠 **Role-Based Dashboard UI**  
  Basic runtime switching between Patient and Caretaker views for simplicity.

- 💊 **Medication Management (CRUD)**  
  - Add medications (name, dosage, frequency)  
  - View medication list  
  - Mark medication as “taken today”

- 📊 **Dashboard with Real Data**  
  One user dashboard (Patient) is fully connected to live Supabase data using React Query.

- 🖼️ **Photo Upload UI (non-functional placeholder)**  
  UI built and integrated (back-end not connected yet)

- 📆 **Calendar UI for Medication Logs**  
  Shows daily logs and adherence data (currently mock data)

---

## 🛠 Tech Stack

- **Frontend**: React + TypeScript  
- **Auth & DB**: Supabase  
- **State & Data**: React Query  
- **Styles**: Tailwind CSS (via template)  
- **Testing**: Vitest (not implemented yet)

---

## 📂 Folder Structure (Simplified)

