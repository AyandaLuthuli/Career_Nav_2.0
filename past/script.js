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
let currentUser = null;
let currentSessionId = null;

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
        .replace(/[^\sa-zA-ZÀ-ÿ-']/g, "")
        .trim()
        .split(" ")
        .map((word) => {
          if (word.length > 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          }
          return word;
        })
        .join(" ")
        .replace(/\s+/g, " ");

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
function appendMessage(sender, text, isHTML = false) {
  const msg = document.createElement("div");
  msg.classList.add(sender === "user" ? "user-message" : "bot-message");

  if (isHTML) {
    msg.innerHTML = text;
  } else {
    msg.textContent = text;
  }

  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addActionButton(text, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.classList.add("action-button");
  button.addEventListener("click", onClick);
  chatContainer.appendChild(button);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function clearChat() {
  chatContainer.innerHTML = "";
}

// === LOAD USER DATA AND PREVIOUS CONVERSATIONS ===
window.addEventListener("load", async () => {
  const savedUserId = localStorage.getItem("career_user_id");

  if (!savedUserId) {
    window.location.href = "index.html";
    return;
  }

  try {
    // Get user data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", savedUserId)
      .single();

    if (userError || !user) {
      window.location.href = "index.html";
      return;
    }

    currentUser = user;

    // Get previous recommendations
    const { data: previousRecs, error: recError } = await supabase
      .from("recommendations")
      .select("*")
      .eq("user_id", savedUserId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Show welcome with options
    landing.classList.remove("hidden");
    appendMessage("bot", `👋 Welcome back, ${user.full_name || "there"}!`);

    if (previousRecs && previousRecs.length > 0) {
      appendMessage(
        "bot",
        "I found your previous career conversations. What would you like to do?"
      );

      // Show last recommendation summary
      const lastRec = previousRecs[0];
      const preview = lastRec.reasoning.substring(0, 150) + "...";
      appendMessage("bot", `📚 Last session: ${preview}`);

      addActionButton("🔄 Continue Previous Conversation", () =>
        loadPreviousConversation(previousRecs[0])
      );
      addActionButton("➕ Start New Career Conversation", startNewConversation);
      addActionButton("📊 View All Previous Recommendations", () =>
        showAllRecommendations(previousRecs)
      );
    } else {
      appendMessage("bot", "Ready to discover your ideal career path!");
      addActionButton("🚀 Start Career Assessment", startNewConversation);
    }
  } catch (error) {
    console.error("Error loading user:", error);
    window.location.href = "index.html";
  }
});

function loadPreviousConversation(recommendation) {
  clearChat();
  landing.classList.add("hidden");
  chatbot.classList.remove("hidden");

  appendMessage("bot", `🔍 Loading your previous career conversation...`, true);
  appendMessage("bot", recommendation.reasoning, true);

  // Set up for follow-up questions
  step = 4;
  userData = {
    name: currentUser.full_name || "",
    education: currentUser.education_level || "",
    skills: currentUser.skills || "",
    interests: currentUser.interests || "",
  };

  appendMessage(
    "bot",
    "What would you like to explore next? You can ask about specific careers, skills development, or anything else!"
  );
}

function showAllRecommendations(recommendations) {
  clearChat();
  appendMessage("bot", "📊 Your Career Recommendation History:", true);

  recommendations.forEach((rec, index) => {
    const date = new Date(rec.created_at).toLocaleDateString();
    const preview = rec.reasoning.substring(0, 200) + "...";

    const recElement = document.createElement("div");
    recElement.classList.add("recommendation-item");
    recElement.innerHTML = `
      <strong>Session ${recommendations.length - index} (${date})</strong><br>
      ${preview}
    `;

    recElement.addEventListener("click", () => loadPreviousConversation(rec));
    chatContainer.appendChild(recElement);
  });

  addActionButton("🔄 Start New Conversation", startNewConversation);
}

function startNewConversation() {
  clearChat();
  landing.classList.add("hidden");
  chatbot.classList.remove("hidden");

  // Reset state for new conversation
  step = 0;
  userData = { name: "", education: "", skills: "", interests: "" };
  currentSessionId = Date.now().toString(); // Generate unique session ID

  appendMessage("bot", "🚀 Starting new career assessment...");
  appendMessage(
    "bot",
    "👋 Hi there! I'm your AI Career Guide. What's your name?"
  );
}

// === CHAT FLOW ===
startBtn.addEventListener("click", startNewConversation);

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
  // For follow-up questions after step 4, use Gemini directly
  if (step >= 4) {
    await handleFollowUpQuestion(input);
    return;
  }

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

      // Update user profile in database
      const { error: updateError } = await supabase
        .from("users")
        .update({
          full_name: userData.name,
          education_level: userData.education,
          skills: userData.skills,
          interests: userData.interests,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUser.id);

      if (updateError) {
        console.error("Error updating user:", updateError);
      }

      // === Call Gemini for career advice ===
      await showCareerSuggestions(currentUser.id);
      break;
  }
}

async function handleFollowUpQuestion(input) {
  appendMessage("bot", "🤔 Thinking...");

  const followUpPrompt = `
The user is asking a follow-up question about careers. Here is their profile:
- Name: ${userData.name}
- Education: ${userData.education}
- Skills: ${userData.skills}
- Interests: ${userData.interests}

User's question: "${input}"

Provide a helpful, concise response about careers, skills development, or their career path in South Africa.
Keep it practical and motivational.
`;

  const aiResponse = await askGemini(followUpPrompt);

  // Remove "Thinking..." message and show actual response
  chatContainer.removeChild(chatContainer.lastChild);
  appendMessage("bot", aiResponse, true);
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

  // Format Gemini's response for cleaner display
  const formattedResponse = aiResponse
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>")
    .replace(/\d\./g, "🔹");

  // Create message container with HTML
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
      session_id: currentSessionId,
    },
  ]);

  // Add action buttons after recommendations
  addActionButton("🔄 Start New Assessment", startNewConversation);
  addActionButton("📚 View Previous Sessions", () => window.location.reload());
}

// === INPUT VALIDATION ===
userInput.addEventListener("input", () => {
  const input = userInput.value.trim();
  sendBtn.disabled = !input;
});

// Initialize send button state
sendBtn.disabled = true;

console.log("AI Career Navigator initialized successfully!");
