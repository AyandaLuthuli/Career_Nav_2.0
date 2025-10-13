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
const anonymousModeToggle = document.getElementById("anonymousMode");

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
let anonymousMode = false;

// === PRIVACY ENHANCEMENTS ===
function initializePrivacyFeatures() {
  // Load privacy preference
  anonymousMode = localStorage.getItem("anonymous_mode") === "true";
  if (anonymousModeToggle) {
    anonymousModeToggle.checked = anonymousMode;

    // Add toggle event listener
    anonymousModeToggle.addEventListener("change", function (e) {
      anonymousMode = e.target.checked;
      localStorage.setItem("anonymous_mode", anonymousMode);

      if (anonymousMode) {
        showPrivacyNotification(
          "🔒 Anonymous mode enabled: Your personal details will not be stored"
        );
      } else {
        showPrivacyNotification(
          "🔓 Anonymous mode disabled: Your data will be saved for better recommendations"
        );
      }

      // Reload conversations to reflect privacy changes
      loadPreviousConversations();
    });
  }

  // Add privacy policy section to welcome
  addPrivacyInfo();
}

function showPrivacyNotification(message) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 255, 209, 0.9);
    color: #000;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    z-index: 1000;
    animation: slideInRight 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function addPrivacyInfo() {
  const privacyHTML = `
    <div class="privacy-info" style="margin-top: 2rem; padding: 1rem; background: rgba(255,255,255,0.1); border-radius: 10px;">
      <h4 style="color: #00ffd1; margin-bottom: 0.5rem;">🔒 Your Privacy Matters</h4>
      <p style="font-size: 0.9rem; margin-bottom: 1rem;">We respect your privacy. Enable "Anonymous Mode" to:</p>
      <ul style="text-align: left; font-size: 0.85rem; margin-left: 1rem; margin-bottom: 1rem;">
        <li>Use a random username instead of your real name</li>
        <li>Prevent conversation history storage</li>
        <li>Keep your career assessments private</li>
      </ul>
      <p style="font-size: 0.8rem; color: rgba(255,255,255,0.7)">Your data is never shared with third parties.</p>
    </div>
  `;

  if (welcomeSection && !document.querySelector(".privacy-info")) {
    welcomeSection.insertAdjacentHTML("beforeend", privacyHTML);
  }
}

function anonymizeUserData(userData) {
  return {
    name: `User_${Math.random().toString(36).substr(2, 9)}`,
    education: userData.education,
    skills: userData.skills,
    interests: userData.interests,
  };
}

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

    // Initialize privacy features
    initializePrivacyFeatures();

    // Load previous conversations from localStorage AND Supabase
    await loadPreviousConversations();
  } catch (error) {
    console.error("Error loading user:", error);
    window.location.href = "index.html";
  }
});

// === LOAD PREVIOUS CONVERSATIONS ===
async function loadPreviousConversations() {
  // Only load from localStorage if not in anonymous mode
  const savedConvos = !anonymousMode
    ? localStorage.getItem(`career_conversations_${currentUser.id}`)
    : null;

  // Load from Supabase for career suggestions (always load these for demo purposes)
  const { data: recommendations, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(5);

  let convosHTML = "<h3>📚 Previous Career Sessions</h3>";

  if (anonymousMode) {
    convosHTML +=
      '<p style="color: rgba(255,255,255,0.7)">🔒 Conversation history disabled in anonymous mode</p>';
  } else if (recommendations && recommendations.length > 0) {
    recommendations.forEach((rec, index) => {
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

  return reasoning.length > 80 ? reasoning.substring(0, 80) + "..." : reasoning;
}

// === LOAD RECOMMENDATION FROM SUPABASE ===
async function loadRecommendation(recommendationId) {
  if (anonymousMode) {
    showPrivacyNotification("🔒 Cannot load conversations in anonymous mode");
    return;
  }

  const { data: recommendation, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("id", recommendationId)
    .single();

  if (recommendation) {
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    userData = {
      name: user?.full_name || "",
      education: user?.education_level || "",
      skills: user?.skills || "",
      interests: user?.interests || "",
      username: userData.username,
    };

    welcomeSection.classList.add("hidden");
    chatSection.classList.remove("hidden");

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

    addActionButton("🔄 Start New Assessment", () => window.location.reload());
    addActionButton("🏠 Back to Home", () => {
      welcomeSection.classList.remove("hidden");
      chatSection.classList.add("hidden");
    });
  }
}

// === LOAD CONVERSATION FROM LOCALSTORAGE ===
function loadConversation(index) {
  if (anonymousMode) {
    showPrivacyNotification("🔒 Cannot load conversations in anonymous mode");
    return;
  }

  const savedConvos = localStorage.getItem(
    `career_conversations_${currentUser.id}`
  );
  if (!savedConvos) return;

  const conversations = JSON.parse(savedConvos);
  const conversation = conversations[index];

  if (conversation) {
    userData = conversation.userData;
    step = conversation.step;

    welcomeSection.classList.add("hidden");
    chatSection.classList.remove("hidden");

    chatContainer.innerHTML = "";
    conversation.messages.forEach((msg) => {
      appendMessage(msg.sender, msg.text);
    });

    if (step < 4) {
      askNextQuestion();
    } else {
      addActionButton("🔄 Start New Assessment", () =>
        window.location.reload()
      );
    }
  }
}

// === SAVE CONVERSATION TO LOCALSTORAGE ===
function saveConversation() {
  if (anonymousMode) {
    return; // Don't save conversations in anonymous mode
  }

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

  const savedConvos = localStorage.getItem(
    `career_conversations_${currentUser.id}`
  );
  let conversations = savedConvos ? JSON.parse(savedConvos) : [];

  conversations.unshift(conversation);

  if (conversations.length > 5) {
    conversations = conversations.slice(0, 5);
  }

  localStorage.setItem(
    `career_conversations_${currentUser.id}`,
    JSON.stringify(conversations)
  );
}

// === CHAT FUNCTIONS ===
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add(sender === "user" ? "user-message" : "bot-message");

  if (text.includes("<") && text.includes(">")) {
    msg.innerHTML = text;
  } else {
    msg.textContent = text;
  }

  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;

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
  step = 0;
  userData = {
    name: "",
    education: "",
    skills: "",
    interests: "",
    username: userData.username,
  };

  chatContainer.innerHTML = "";

  welcomeSection.classList.add("hidden");
  chatSection.classList.remove("hidden");

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

      appendMessage(
        "bot",
        "🎯 Perfect! I have all your information. Saving your profile... 💾"
      );

      const saveSuccess = await saveUserDataToSupabase();

      if (saveSuccess) {
        appendMessage(
          "bot",
          "✅ Profile saved! Analyzing your profile using AI... 🤔"
        );
        await showCareerSuggestions();
      } else {
        appendMessage("bot", "⚠️ Failed to save profile. Please try again.");
        step--;
      }
      return;
  }

  setTimeout(() => askNextQuestion(), 800);
}

// === SAVE USER DATA TO SUPABASE ===
async function saveUserDataToSupabase() {
  try {
    const userDataToSave = anonymousMode
      ? anonymizeUserData(userData)
      : userData;

    const { error } = await supabase
      .from("users")
      .update({
        full_name: userDataToSave.name,
        education_level: userDataToSave.education,
        skills: userDataToSave.skills,
        interests: userDataToSave.interests,
        created_at: new Date().toISOString(),
      })
      .eq("id", currentUser.id);

    if (error) {
      console.error("Error saving user data:", error);
      return false;
    }

    console.log("✅ User data saved to Supabase:", userDataToSave);
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
    case 0:
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

    case 1:
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
You are an AI Career Advisor specifically focused on South African youth and the local job market.

Based on the following profile, suggest *exactly three* realistic and in-demand opportunities in South Africa.

CRITICAL: Focus on these high-growth sectors in South Africa:
• Digital Technology & IT - software development, data analysis, cybersecurity, digital marketing
• Green Economy - renewable energy, environmental management, sustainable agriculture
• Healthcare & Social Services - nursing, community health, mental health support
• Financial Services - fintech, banking, insurance, financial planning
• Creative Industries - digital content creation, graphic design, video production
• Business Process Outsourcing - call center management, customer service
• Tourism & Hospitality - eco-tourism, hotel management, event planning
• Manufacturing & Logistics - supply chain management, quality control

For each opportunity, include:
1️⃣ The career/job title (must be realistic for SA market)
2️⃣ A one-sentence explanation of why it's a good fit for THIS user
3️⃣ Mention key matching skills AND the specific SA industry sector

Format your answer clearly like this:

1. Career Title — short explanation focusing on SA opportunities  
   Skills Match: [specific skills from profile that match]  
   SA Industry: [specific SA sector from above list]

Profile:
Name: ${name}
Education: ${education}
Skills: ${skills}
Interests: ${interests}

Keep the response practical, motivational, and SPECIFIC to South Africa. Mention real SA companies or sectors where possible.
`;

  const aiResponse = await askGemini(prompt);

  const formattedResponse = aiResponse
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>")
    .replace(/\d\./g, "🔹");

  const msg = document.createElement("div");
  msg.classList.add("bot-message");
  msg.innerHTML = `
    <strong>🎉 South African Career Opportunities for ${name}:</strong><br><br>
    ${formattedResponse}
    <br><br>
    <div style="background: rgba(0, 255, 209, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid #00ffd1;">
      <strong>🇿🇦 Next Steps for You:</strong><br>
      • Explore learnerships on SAYouth.mobi<br>
      • Check SETA opportunities in your province<br>
      • Visit your local Youth Employment Service (YES) centre<br>
      • Research TVET colleges for practical skills
    </div>
    <br>
    <em>💡 These suggestions are based on current South African market trends. Always research each option thoroughly!</em>
  `;
  chatContainer.appendChild(msg);

  await saveRecommendationToSupabase(aiResponse);

  addActionButton("📱 Explore SA Youth ", () =>
    window.open("https://sayouth.co.za/", "_blank")
  );
  addActionButton("🎓 Find TVET Colleges", () =>
    window.open(
      "https://nationalgovernment.co.za/units/type/9/tvet-college",
      "_blank"
    )
  );
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
  localStorage.removeItem("anonymous_mode");
  window.location.href = "index.html";
});

// Initialize send button state
sendBtn.disabled = true;

console.log("Chats page initialized successfully!");
