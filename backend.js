// Initialize Supabase (ensure this is before using it)
const SUPABASE_URL = "https://uqyoewvfgmhgbnbfmzfv.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxeW9ld3ZmZ21oZ2JuYmZtemZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0Mzc2MTIsImV4cCI6MjA1OTAxMzYxMn0.U7dPlNP35wTiu1Dd9M9RtVRjOHf2rPvKDJNBI-jS9IA"; 

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Select elements
const usernameInput = document.querySelector("input[type='text']");
const passwordInput = document.querySelector("input[type='password']");
const loginBtn = document.querySelector(".login-btn");
const signupBtn = document.querySelector(".signup-btn");
const messageBox = document.createElement("p");
document.querySelector(".content").appendChild(messageBox);

// Function to display messages
function showMessage(msg, color = "red") {
    messageBox.textContent = msg;
    messageBox.style.color = color;
}

// Signup Function
signupBtn.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        showMessage("⚠️ Please enter both username and password!");
        return;
    }

    // Check if the user already exists
    const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("username")
        .eq("username", username)
        .single();

    if (fetchError && fetchError.code !== "PGRST116") {
        showMessage("⚠️ Error checking user: " + fetchError.message);
        return;
    }

    if (existingUser) {
        showMessage("⚠️ Username already taken! Try a different one.");
        return;
    }

    // Insert user data into Supabase
    const { error: insertError } = await supabase
        .from("users")
        .insert([{ username, password }]);

    if (insertError) {
        showMessage("⚠️ Error signing up: " + insertError.message);
        return;
    }

    showMessage("✅ Account created! Please login.", "green");
});

// Login Function
loginBtn.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        showMessage("⚠️ Please enter both username and password!");
        return;
    }

    // Check user credentials
    const { data: user, error } = await supabase
        .from("users")
        .select("username, password")
        .eq("username", username)
        .eq("password", password)
        .single();

    if (error || !user) {
        showMessage("⚠️ Invalid username or password!");
        return;
    }

    showMessage("✅ Login successful! Redirecting...", "green");

    // Redirect after successful login
    setTimeout(() => {
        window.location.href = "chat.html";
    }, 1500);
});
