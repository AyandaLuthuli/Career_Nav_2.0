// === SUPABASE SETUP ===
const SUPABASE_URL = "https://oybbsrrmggexrvkzzayf.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95YmJzcnJtZ2dleHJ2a3p6YXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTEyMjQsImV4cCI6MjA3NTQ4NzIyNH0.5whFAXrEFtFICWC6SZ0pBU6-WxmLMHidBfHFKcaTlc8";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === GEMINI SETUP ===
const GEMINI_API_KEY = "AIzaSyCMCVB5mQa6L30GymKpmqzKJ1N4M8ambNI";

async function askGemini(promptText) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API Error:", data.error);
      return `⚠️ Gemini API error: ${data.error.message}`;
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate a response.";
    return text;
  } catch (err) {
    console.error("Gemini connection error:", err);
    return "⚠️ Connection issue with Gemini. Please try again.";
  }
}

// === ELEMENTS ===
const startBtn = document.getElementById("startBtn");
const landing = document.getElementById("landing");
const chatbot = document.getElementById("chatbot");
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chat-container");

// === CHAT STATE ===
let step = 0;
let userData = { name: "", education: "", skills: "", interests: "" };

// === INPUT CLEANING FUNCTION ===
function cleanUserInput(input, step) {
  const clean = input.trim();

  switch (step) {
    case 0: // Name - extract just the name
      return clean
        .replace(
          /^(my name is|i'm|i am|you can call me|it's|this is|name's|i go by)/gi,
          ""
        )
        .replace(/[^\sa-zA-ZÀ-ÿ-']/g, "") // Keep letters, spaces, hyphens, apostrophes
        .trim()
        .split(" ")
        .map((word) => {
          if (word.length > 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          }
          return word;
        })
        .join(" ")
        .replace(/\s+/g, " "); // Clean extra spaces

    case 1: // Education - clean but preserve educational terms
      return clean
        .replace(/\s+/g, " ")
        .replace(
          /^(i have|i've completed|i completed|i finished|i have a|i hold a)/gi,
          ""
        )
        .trim();

    case 2: // Skills - clean but preserve skill descriptions
      return clean.replace(/\s+/g, " ").trim();

    case 3: // Interests - clean but preserve interest descriptions
      return clean.replace(/\s+/g, " ").trim();

    default:
      return clean;
  }
}

// === FUNCTIONS ===
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add(sender === "user" ? "user-message" : "bot-message");
  msg.textContent = text;
  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// === Check for saved user on load ===
// window.addEventListener("load", async () => {
//   const savedUserId = localStorage.getItem("career_user_id");
//   if (savedUserId) {
//     const { data } = await supabase
//       .from("users")
//       .select("*")
//       .eq("id", savedUserId)
//       .single();

//     if (data) {
//       landing.classList.add("hidden");
//       chatbot.classList.remove("hidden");
//       appendMessage(
//         "bot",
//         `👋 Welcome back, ${data.full_name}! Would you like to explore new careers or view your past suggestions?`
//       );
//       // Pre-fill user data for returning users
//       userData = {
//         name: data.full_name,
//         education: data.education_level,
//         skills: data.skills,
//         interests: data.interests,
//       };
//       step = 4; // Move to completed state
//     }
//   }
// });

// === CHAT FLOW ===
startBtn.addEventListener("click", () => {
  landing.classList.add("hidden");
  chatbot.classList.remove("hidden");
  appendMessage(
    "bot",
    "👋 Hi there! I'm your AI Career Guide. What's your name?"
  );
});

sendBtn.addEventListener("click", handleSend);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSend();
});

async function handleSend() {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage("user", text);
  userInput.value = "";
  await handleConversation(text);
}

async function handleConversation(input) {
  // Clean the input based on current step
  const cleanedInput = cleanUserInput(input, step);
  console.log(
    `Step ${step}: Raw input: "${input}" → Cleaned: "${cleanedInput}"`
  );

  switch (step) {
    case 0:
      userData.name = cleanedInput;
      appendMessage("bot", `Nice to meet you, ${userData.name}! 🎉`);
      setTimeout(
        () =>
          appendMessage(
            "bot",
            "What's your highest education level? (e.g., High School, Diploma, Degree)"
          ),
        800
      );
      step++;
      break;

    case 1:
      userData.education = cleanedInput;
      appendMessage("bot", "Great! What are your top skills or talents? 💪");
      step++;
      break;

    case 2:
      userData.skills = cleanedInput;
      appendMessage(
        "bot",
        "Awesome! What kind of work or industries interest you most? 💼"
      );
      step++;
      break;

    case 3:
      userData.interests = cleanedInput;
      appendMessage(
        "bot",
        "🎯 Perfect! I have all your information. Analyzing your profile using AI... 🤔"
      );
      step++;

      // === Save user data to Supabase ===
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            full_name: userData.name,
            education_level: userData.education,
            skills: userData.skills,
            interests: userData.interests,
          },
        ])
        .select();

      if (error) {
        console.error("Error saving user:", error);
        appendMessage(
          "bot",
          "⚠️ Could not save your info. Please try again later."
        );
        return;
      }

      const newUser = data[0];
      localStorage.setItem("career_user_id", newUser.id);

      // === Call Gemini for career advice ===
      await showCareerSuggestions(newUser.id);
      break;

    default:
      // Handle additional conversation after recommendations
      appendMessage(
        "bot",
        "If you'd like to restart with a new profile, refresh the page. Or ask me anything else about careers!"
      );

      // Optional: Handle follow-up questions with Gemini
      if (input.length > 5) {
        const followUpPrompt = `
The user is asking a follow-up question after receiving career recommendations. 
Their profile:
- Name: ${userData.name}
- Education: ${userData.education}
- Skills: ${userData.skills}
- Interests: ${userData.interests}

User's question: "${input}"

Provide a helpful, concise response about careers or their career path.
`;
        appendMessage("bot", "🤔 Thinking about your question...");
        const aiResponse = await askGemini(followUpPrompt);
        appendMessage("bot", aiResponse);
      }
  }
}

// === CAREER RECOMMENDATION (via Gemini) ===
async function showCareerSuggestions(userId) {
  const { education, skills, interests, name } = userData;

  const prompt = `
You are an AI Career Advisor helping South African youth discover their ideal career paths.

Based on the following profile, suggest *exactly three* realistic and in-demand careers in South Africa.
For each career, include:
1️⃣ The career title
2️⃣ A one-sentence explanation of why it's a good fit
3️⃣ Mention key matching skills or relevant industries

Format your answer clearly like this:

1. Career Title — short explanation  
   Skills/Industry: ...

Profile:
Name: ${name}
Education: ${education}
Skills: ${skills}
Interests: ${interests}

Keep the response short, friendly, and motivational. Focus on opportunities available in South Africa.
`;

  const aiResponse = await askGemini(prompt);

  // --- Format Gemini's response for cleaner display ---
  const formattedResponse = aiResponse
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // handle bold text
    .replace(/\n/g, "<br>") // handle line breaks
    .replace(/\d\./g, "🔹"); // replace "1.", "2.", "3." with bullets

  // --- Create message container with HTML ---
  const msg = document.createElement("div");
  msg.classList.add("bot-message");
  msg.innerHTML = `
    <strong>🎉 Career Recommendations for ${name}:</strong><br><br>
    ${formattedResponse}
    <br><br>
    <em>💡 Remember: These are suggestions based on your profile. Research each option to find your perfect fit!</em>
  `;
  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // === Save AI recommendations ===
  await supabase.from("recommendations").insert([
    {
      user_id: userId,
      suggested_career: "Gemini AI Career Recommendations",
      reasoning: aiResponse,
    },
  ]);
}

// === INPUT VALIDATION ===
userInput.addEventListener("input", () => {
  const input = userInput.value.trim();
  sendBtn.disabled = !input;
});

// Initialize send button state
sendBtn.disabled = true;

console.log("AI Career Navigator initialized successfully!");
