// Authentication and User Management System

// Initialize localStorage if not exists
function initializeStorage() {
  if (!localStorage.getItem("parkfinder_users")) {
    localStorage.setItem("parkfinder_users", JSON.stringify([]))
  }
  if (!localStorage.getItem("parkfinder_current_user")) {
    localStorage.setItem("parkfinder_current_user", null)
  }
}

// User roles
const USER_ROLES = {
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  USER: "user",
}

// Get all users
function getUsers() {
  return JSON.parse(localStorage.getItem("parkfinder_users") || "[]")
}

// Save users
function saveUsers(users) {
  localStorage.setItem("parkfinder_users", JSON.stringify(users))
}

// Get current user
function getCurrentUser() {
  const currentUserId = localStorage.getItem("parkfinder_current_user")
  if (!currentUserId) return null

  const users = getUsers()
  return users.find((user) => user.id === currentUserId) || null
}

// Set current user
function setCurrentUser(userId) {
  localStorage.setItem("parkfinder_current_user", userId)
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Signup function
function signup(username, email, password) {
  initializeStorage()

  const users = getUsers()

  // Check if username or email already exists
  if (users.find((user) => user.username === username)) {
    return { success: false, message: "Username already exists" }
  }

  if (users.find((user) => user.email === email)) {
    return { success: false, message: "Email already registered" }
  }

  // Create new user
  const newUser = {
    id: generateId(),
    username: username,
    email: email,
    password: password, // In real app, this should be hashed
    role: USER_ROLES.USER,
    createdAt: new Date().toISOString(),
    parkingHistory: [],
    totalSpent: 0,
  }

  users.push(newUser)
  saveUsers(users)

  return { success: true, message: "Account created successfully!" }
}

// Login function
function login(username, password) {
  initializeStorage()

  // Check for admin login
  if (username === "admin" && password === "admin") {
    const adminUser = {
      id: "admin",
      username: "admin",
      email: "admin@parkfinder.com",
      role: USER_ROLES.ADMIN,
      isAdmin: true,
    }
    setCurrentUser("admin")
    localStorage.setItem("parkfinder_admin_user", JSON.stringify(adminUser))
    return {
      success: true,
      message: "Admin login successful!",
      redirect: "admin-dashboard.html",
      user: adminUser,
    }
  }

  const users = getUsers()
  const user = users.find((u) => (u.username === username || u.email === username) && u.password === password)

  if (!user) {
    return { success: false, message: "Invalid username/email or password" }
  }

  setCurrentUser(user.id)

  // Redirect based on role
  let redirect = "user-dashboard.html"
  if (user.role === USER_ROLES.SUPERVISOR) {
    redirect = "supervisor-dashboard.html"
  }

  return {
    success: true,
    message: "Login successful!",
    redirect: redirect,
    user: user,
  }
}

// Logout function
function logout() {
  localStorage.removeItem("parkfinder_current_user")
  localStorage.removeItem("parkfinder_admin_user")
  window.location.href = "index.html"
}

// Check authentication
function checkAuth() {
  const currentUser = getCurrentUser()
  const adminUser = JSON.parse(localStorage.getItem("parkfinder_admin_user") || "null")

  if (!currentUser && !adminUser) {
    window.location.href = "login.html"
    return null
  }

  return adminUser || currentUser
}

// Update user role (Admin only)
function updateUserRole(userId, newRole) {
  const currentUser = getCurrentUser()
  const adminUser = JSON.parse(localStorage.getItem("parkfinder_admin_user") || "null")

  if (!adminUser || adminUser.role !== USER_ROLES.ADMIN) {
    return { success: false, message: "Unauthorized: Admin access required" }
  }

  const users = getUsers()
  const userIndex = users.findIndex((user) => user.id === userId)

  if (userIndex === -1) {
    return { success: false, message: "User not found" }
  }

  users[userIndex].role = newRole
  saveUsers(users)

  return { success: true, message: "User role updated successfully" }
}

// Get users by role
function getUsersByRole(role) {
  const users = getUsers()
  return users.filter((user) => user.role === role)
}

// Initialize storage on page load
initializeStorage()
