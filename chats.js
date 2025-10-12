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
const usernameDisplay = document.getElementById("usernameDisplay");
const logoutBtn = document.getElementById("logoutBtn");
const welcomeSection = document.getElementById("welcomeSection");
const chatSection = document.getElementById("chatSection");
const startChatBtn = document.getElementById("startChatBtn");
const chatContainer = document.getElementById("chatContainer");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const previousConversations = document.getElementById("previousConversations");

// === CHAT STATE ===
let step = 0;
let userData = {
  name: "",
  education: "",
  skills: "",
  interests: "",
  username: "",
};
let currentUser = null;

// === LOAD USER AND CHECK AUTH ===
window.addEventListener("load", async () => {
  const savedUserId = localStorage.getItem("career_user_id");

  if (!savedUserId) {
    window.location.href = "index.html";
    return;
  }

  try {
    // Get user data from Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("*, logins(username)")
      .eq("id", savedUserId)
      .single();

    if (error || !user) {
      window.location.href = "index.html";
      return;
    }

    currentUser = user;
    userData.username = user.logins?.username || user.full_name || "User";
    usernameDisplay.textContent = userData.username;

    // Load previous conversations from localStorage AND Supabase
    await loadPreviousConversations();
  } catch (error) {
    console.error("Error loading user:", error);
    window.location.href = "index.html";
  }
});

// === LOAD PREVIOUS CONVERSATIONS ===
async function loadPreviousConversations() {
  // Load from localStorage for conversation flow
  const savedConvos = localStorage.getItem(
    `career_conversations_${currentUser.id}`
  );

  // Load from Supabase for career suggestions
  const { data: recommendations, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(5);

  let convosHTML = "<h3>📚 Previous Career Sessions</h3>";

  if (recommendations && recommendations.length > 0) {
    recommendations.forEach((rec, index) => {
      // Extract first career suggestion for preview
      const suggestionPreview = extractCareerSuggestion(rec.reasoning);
      const date = new Date(rec.created_at).toLocaleDateString();

      convosHTML += `
        <div class="conversation-item" onclick="loadRecommendation(${rec.id})">
          <strong>Career Session ${index + 1}</strong> 
          <span class="convo-date">${date}</span>
          <div class="suggestion-preview">${suggestionPreview}</div>
        </div>
      `;
    });
  } else if (savedConvos) {
    const conversations = JSON.parse(savedConvos);
    conversations.forEach((conv, index) => {
      const lastBotMessage =
        conv.messages.reverse().find((msg) => msg.sender === "bot")?.text ||
        "Career assessment in progress...";
      const preview =
        lastBotMessage.length > 80
          ? lastBotMessage.substring(0, 80) + "..."
          : lastBotMessage;

      convosHTML += `
        <div class="conversation-item" onclick="loadConversation(${index})">
          <strong>Session ${index + 1}</strong> 
          <span class="convo-date">${new Date(
            conv.timestamp
          ).toLocaleDateString()}</span>
          <div class="convo-preview">${preview}</div>
        </div>
      `;
    });
  } else {
    convosHTML +=
      "<p>No previous sessions found. Start your first career assessment!</p>";
  }

  previousConversations.innerHTML = convosHTML;
}

// === EXTRACT CAREER SUGGESTION FOR PREVIEW ===
function extractCareerSuggestion(reasoning) {
  if (!reasoning) return "Career recommendations";

  // Try to extract the first career suggestion
  const lines = reasoning.split("\n");
  const firstCareerLine = lines.find(
    (line) =>
      line.match(/^\d+\./) ||
      line.match(/^🔹/) ||
      line.includes("—") ||
      line.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*—/)
  );

  if (firstCareerLine) {
    const cleanSuggestion = firstCareerLine
      .replace(/^\d+\.\s*/, "")
      .replace(/^🔹\s*/, "")
      .split("—")[0]
      .trim();

    return cleanSuggestion.length > 60
      ? cleanSuggestion.substring(0, 60) + "..."
      : cleanSuggestion;
  }

  // Fallback: return first 80 characters
  return reasoning.length > 80 ? reasoning.substring(0, 80) + "..." : reasoning;
}

// === LOAD RECOMMENDATION FROM SUPABASE ===
async function loadRecommendation(recommendationId) {
  const { data: recommendation, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("id", recommendationId)
    .single();

  if (recommendation) {
    // Get user data for this recommendation
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    // Set user data
    userData = {
      name: user?.full_name || "",
      education: user?.education_level || "",
      skills: user?.skills || "",
      interests: user?.interests || "",
      username: userData.username,
    };

    // Show chat section
    welcomeSection.classList.add("hidden");
    chatSection.classList.remove("hidden");

    // Clear and display the recommendation
    chatContainer.innerHTML = "";
    appendMessage(
      "bot",
      `🔍 Loading your previous career recommendations from ${new Date(
        recommendation.created_at
      ).toLocaleDateString()}...`
    );

    const msg = document.createElement("div");
    msg.classList.add("bot-message");
    msg.innerHTML = `
      <strong>🎉 Your Career Recommendations:</strong><br><br>
      ${recommendation.reasoning.replace(/\n/g, "<br>").replace(/\d\./g, "🔹")}
      <br><br>
      <em>💡 These were your recommendations based on your profile at that time.</em>
    `;
    chatContainer.appendChild(msg);

    // Add action buttons
    addActionButton("🔄 Start New Assessment", () => window.location.reload());
    addActionButton("🏠 Back to Home", () => {
      welcomeSection.classList.remove("hidden");
      chatSection.classList.add("hidden");
    });
  }
}

// === LOAD CONVERSATION FROM LOCALSTORAGE ===
function loadConversation(index) {
  const savedConvos = localStorage.getItem(
    `career_conversations_${currentUser.id}`
  );
  if (!savedConvos) return;

  const conversations = JSON.parse(savedConvos);
  const conversation = conversations[index];

  if (conversation) {
    // Set user data
    userData = conversation.userData;
    step = conversation.step;

    // Show chat section
    welcomeSection.classList.add("hidden");
    chatSection.classList.remove("hidden");

    // Load messages
    chatContainer.innerHTML = "";
    conversation.messages.forEach((msg) => {
      appendMessage(msg.sender, msg.text);
    });

    // If conversation was incomplete, continue from where it left off
    if (step < 4) {
      askNextQuestion();
    } else {
      // If completed, add option to start new
      addActionButton("🔄 Start New Assessment", () =>
        window.location.reload()
      );
    }
  }
}

// === SAVE CONVERSATION TO LOCALSTORAGE ===
function saveConversation() {
  const messages = Array.from(chatContainer.children)
    .filter(
      (element) =>
        element.classList.contains("user-message") ||
        element.classList.contains("bot-message")
    )
    .map((msgElement) => ({
      sender: msgElement.classList.contains("user-message") ? "user" : "bot",
      text: msgElement.textContent || msgElement.innerText,
    }));

  const conversation = {
    timestamp: new Date().toISOString(),
    userData: userData,
    step: step,
    messages: messages,
  };

  // Get existing conversations or create new array
  const savedConvos = localStorage.getItem(
    `career_conversations_${currentUser.id}`
  );
  let conversations = savedConvos ? JSON.parse(savedConvos) : [];

  // Add new conversation
  conversations.unshift(conversation);

  // Keep only last 5 conversations
  if (conversations.length > 5) {
    conversations = conversations.slice(0, 5);
  }

  // Save back to localStorage
  localStorage.setItem(
    `career_conversations_${currentUser.id}`,
    JSON.stringify(conversations)
  );
}

// === CHAT FUNCTIONS ===
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add(sender === "user" ? "user-message" : "bot-message");

  // Check if text contains HTML tags
  if (text.includes("<") && text.includes(">")) {
    msg.innerHTML = text;
  } else {
    msg.textContent = text;
  }

  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // Auto-save conversation after each message
  saveConversation();
}

function askNextQuestion() {
  switch (step) {
    case 0:
      appendMessage(
        "bot",
        `👋 Hi ${userData.username}! I'm your AI Career Guide. What's your full name?`
      );
      break;
    case 1:
      appendMessage(
        "bot",
        `Nice to meet you, ${userData.name}! 🎉 What's your highest education level? (e.g., High School, Diploma, Degree)`
      );
      break;
    case 2:
      appendMessage("bot", "Great! What are your top skills or talents? 💪");
      break;
    case 3:
      appendMessage(
        "bot",
        "Awesome! What kind of work or industries interest you most? 💼"
      );
      break;
  }
}

// === START NEW CHAT ===
startChatBtn.addEventListener("click", () => {
  // Reset state for new conversation
  step = 0;
  userData = {
    name: "",
    education: "",
    skills: "",
    interests: "",
    username: userData.username,
  };

  // Clear chat container
  chatContainer.innerHTML = "";

  // Show chat section
  welcomeSection.classList.add("hidden");
  chatSection.classList.remove("hidden");

  // Start conversation
  askNextQuestion();
});

// === SEND MESSAGE ===
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
  // Clean input based on current step
  const cleanedInput = cleanUserInput(input, step);
  console.log(`Step ${step}: "${input}" → "${cleanedInput}"`);

  switch (step) {
    case 0:
      userData.name = cleanedInput;
      step++;
      break;
    case 1:
      userData.education = cleanedInput;
      step++;
      break;
    case 2:
      userData.skills = cleanedInput;
      step++;
      break;
    case 3:
      userData.interests = cleanedInput;
      step++;

      // All data collected - SAVE TO SUPABASE FIRST
      appendMessage(
        "bot",
        "🎯 Perfect! I have all your information. Saving your profile... 💾"
      );

      // Save user data to Supabase BEFORE calling Gemini
      const saveSuccess = await saveUserDataToSupabase();

      if (saveSuccess) {
        appendMessage(
          "bot",
          "✅ Profile saved! Analyzing your profile using AI... 🤔"
        );
        await showCareerSuggestions();
      } else {
        appendMessage("bot", "⚠️ Failed to save profile. Please try again.");
        step--; // Go back to allow retry
      }
      return;
  }

  // Ask next question
  setTimeout(() => askNextQuestion(), 800);
}

// === SAVE USER DATA TO SUPABASE ===
async function saveUserDataToSupabase() {
  try {
    const { error } = await supabase
      .from("users")
      .update({
        full_name: userData.name,
        education_level: userData.education,
        skills: userData.skills,
        interests: userData.interests,
        created_at: new Date().toISOString(),
      })
      .eq("id", currentUser.id);

    if (error) {
      console.error("Error saving user data:", error);
      return false;
    }

    console.log("✅ User data saved to Supabase:", userData);
    return true;
  } catch (error) {
    console.error("Error saving to Supabase:", error);
    return false;
  }
}

// === INPUT CLEANING ===
function cleanUserInput(input, step) {
  const clean = input.trim();

  switch (step) {
    case 0: // Name
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

    case 1: // Education
      return clean
        .replace(/\s+/g, " ")
        .replace(
          /^(i have|i've completed|i completed|i finished|i have a|i hold a)/gi,
          ""
        )
        .trim();

    default:
      return clean.replace(/\s+/g, " ").trim();
  }
}

// === CAREER SUGGESTIONS ===
async function showCareerSuggestions() {
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

  // Format the response
  const formattedResponse = aiResponse
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>")
    .replace(/\d\./g, "🔹");

  // Display recommendations
  const msg = document.createElement("div");
  msg.classList.add("bot-message");
  msg.innerHTML = `
    <strong>🎉 Career Recommendations for ${name}:</strong><br><br>
    ${formattedResponse}
    <br><br>
    <em>💡 Remember: These are suggestions based on your profile. Research each option to find your perfect fit!</em>
  `;
  chatContainer.appendChild(msg);

  // Save recommendations to Supabase
  await saveRecommendationToSupabase(aiResponse);

  // Add action buttons
  addActionButton("🔄 Start New Assessment", () => window.location.reload());
  addActionButton("🏠 Back to Home", () => {
    welcomeSection.classList.remove("hidden");
    chatSection.classList.add("hidden");
  });
}

// === SAVE RECOMMENDATION TO SUPABASE ===
async function saveRecommendationToSupabase(aiResponse) {
  try {
    const { error } = await supabase.from("recommendations").insert([
      {
        user_id: currentUser.id,
        suggested_career: "Gemini AI Career Recommendations",
        reasoning: aiResponse,
      },
    ]);

    if (error) {
      console.error("Error saving recommendation:", error);
      return false;
    }

    console.log("✅ Recommendation saved to Supabase");
    return true;
  } catch (error) {
    console.error("Error saving recommendation:", error);
    return false;
  }
}

// === ACTION BUTTONS ===
function addActionButton(text, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.classList.add("action-button");
  button.addEventListener("click", onClick);
  chatContainer.appendChild(button);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// === INPUT VALIDATION ===
userInput.addEventListener("input", () => {
  const input = userInput.value.trim();
  sendBtn.disabled = !input;
});

// === LOGOUT ===
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("career_user_id");
  window.location.href = "index.html";
});

// Initialize send button state
sendBtn.disabled = true;

console.log("Chats page initialized successfully!");
