// === SUPABASE SETUP ===
const SUPABASE_URL = "https://oybbsrrmggexrvkzzayf.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95YmJzcnJtZ2dleHJ2a3p6YXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTEyMjQsImV4cCI6MjA3NTQ4NzIyNH0.5whFAXrEFtFICWC6SZ0pBU6-WxmLMHidBfHFKcaTlc8";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === ELEMENTS ===
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");

// === TOGGLE FORMS ===
showSignup.addEventListener("click", () => {
  loginForm.style.display = "none";
  signupForm.style.display = "block";
});

showLogin.addEventListener("click", () => {
  signupForm.style.display = "none";
  loginForm.style.display = "block";
});

// === LOGIN ===
loginBtn.addEventListener("click", async () => {
  const username = document.getElementById("loginUsername").value.trim();
  if (!username) {
    alert("Please enter your username.");
    return;
  }

  const { data, error } = await supabase
    .from("logins")
    .select("*, users(*)")
    .eq("username", username)
    .single();

  if (error || !data) {
    alert("User not found. Please sign up first.");
    return;
  }

  // Save session and redirect
  localStorage.setItem("career_user_id", data.user_id);
  window.location.href = "chats.html";
});

// === SIGNUP ===
signupBtn.addEventListener("click", async () => {
  const username = document.getElementById("signupUsername").value.trim();
  if (!username) {
    alert("Please enter a username.");
    return;
  }

  // Create user first
  const { data: newUser, error: userError } = await supabase
    .from("users")
    .insert([{ full_name: username }])
    .select()
    .single();

  if (userError) {
    alert("Error creating user.");
    console.error(userError);
    return;
  }

  // Then create login linked to user
  const { error: loginError } = await supabase
    .from("logins")
    .insert([{ user_id: newUser.id, username }]);

  if (loginError) {
    alert("Username already exists. Try a different one.");
    console.error(loginError);
    return;
  }

  localStorage.setItem("career_user_id", newUser.id);
  // alert(`Welcome, ${username}!`);
  window.location.href = "chats.html";
});
