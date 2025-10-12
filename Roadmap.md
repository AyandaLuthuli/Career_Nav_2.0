**AI-Powered Career Navigation web app in 4 days**, we’ll compress the roadmap into a **4-day sprint plan** that focuses on a **minimum viable product (MVP)**:
✅ Web-based chatbot using **HTML, CSS, JavaScript, and Supabase**
✅ Reads user inputs (skills, interests, education)
✅ Suggests personalized careers (rule-based or AI-assisted)

---

# ⚡ 4-Day Rapid Development Roadmap

**Project:** AI Powered Career Navigation for South African Youth
**Goal:** Build a functional web-based chatbot prototype that recommends personalized careers based on user input.

---

## 🗓️ Day 1 – Setup, Design, and Database

### 🎯 Goal:

Get your environment ready and design the foundation of your web app.

### ✅ Tasks:

**1. Project Setup**

- Create project folder and GitHub repo.
- Set up basic file structure:

  ```
  /career-nav
   ├── index.html
   ├── style.css
   ├── script.js
   ├── /assets
   ├── /js
   └── /images
  ```

**2. UI/UX Design**

- Simple **landing page** with a “Start Chat” button.
- Create chatbot layout (chat bubble area + input bar).
- Use light colors and clear typography (youth-friendly).

**3. Supabase Setup**

- Create a **Supabase project**.

- Add tables:

  | Table             | Columns                                     | Description           |
  | ----------------- | ------------------------------------------- | --------------------- |
  | `users`           | id, name, age, education, interests, skills | Store user info       |
  | `careers`         | id, title, description, skills_required     | Store career data     |
  | `recommendations` | id, user_id, suggestion_text                | Store chatbot outputs |

- Insert 10–15 sample careers manually (e.g., Software Developer, Teacher, Nurse, Graphic Designer, etc.).

**4. Connect Supabase**

- Initialize Supabase JS SDK in your project.
- Test read/write by saving a dummy user.

---

## 🗓️ Day 2 – Chatbot Interface & User Input Flow

### 🎯 Goal:

Build the interactive chatbot that collects user details and stores them.

### ✅ Tasks:

**1. Chatbot Logic (Frontend JS)**

- Create chat UI that displays messages from “User” and “Bot”.
- Allow user input through an input box.
- Simulate conversation steps:

  - “What is your name?”
  - “What is your highest qualification?”
  - “What are your top 3 skills?”
  - “What kind of work interests you?”

- Store responses in local variables.

**2. Supabase Integration**

- On final question, send all collected data to `users` table.

**3. Save Conversation**

- Store each exchange (question/answer) to `recommendations` for reference.

**4. UI Polish**

- Add “typing…” animation.
- Scrollable chat area.
- Mobile-friendly layout.

---

## 🗓️ Day 3 – Career Recommendation Logic + Data Connection

### 🎯 Goal:

Make the chatbot “smart” — generate personalized career recommendations.

### ✅ Tasks:

**1. Rule-Based Recommendation (Offline AI v1)**

- Use basic logic:

  ```js
  if (skills.includes("design")) suggest("Graphic Designer");
  else if (skills.includes("coding")) suggest("Software Developer");
  else if (skills.includes("communication")) suggest("Marketing Specialist");
  ```

- Match keywords from user input to `careers` table in Supabase.

**2. AI Enhancement (Optional)**

- If you have an OpenAI API key:

  ```js
  const prompt = `Suggest 3 career paths for someone with skills: ${skills} and interests: ${interests}.`;
  ```

  Use `fetch` to send this to the API and display formatted suggestions.

**3. Display Output**

- Chatbot replies with:

  ```
  Based on your skills, here are some career options:
  1. UX Designer
  2. Frontend Developer
  3. Digital Marketer
  ```

- Store these results in Supabase `recommendations` table.

---

## 🗓️ Day 4 – Testing, Polishing & Deployment

### 🎯 Goal:

Finalize the MVP, ensure it works end-to-end, and make it presentable.

### ✅ Tasks:

**1. Testing**

- Go through multiple conversation flows.
- Check that:

  - User data saves correctly to Supabase.
  - Chatbot suggestions appear smoothly.
  - Results display correctly.

**2. Add Dashboard / Results Section**

- Simple section to show the user’s last 3 recommended careers.
- Option to “Start Over” or “Save Path”.

**3. Data Privacy**

- Add a short note: “Your data is stored securely and anonymized.”

**4. Deploy**

- Host your project on:

  - **Vercel** (if you want one-click deployment), or
  - **Netlify**, or
  - Directly from Supabase Edge Hosting.

- Test mobile responsiveness.

**5. Final Touches**

- Add your project README (the one we made).
- Record a short demo video (1–2 minutes) showing the chatbot in action.

---

## 🧱 Deliverables by End of Day 4

✅ Responsive web app
✅ Chatbot interface (HTML, CSS, JS)
✅ Supabase database integration
✅ User input → personalized career suggestions
✅ Deployed link + working demo

---
