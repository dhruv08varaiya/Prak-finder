// Admin Dashboard Management

// Declare necessary variables and functions
const getParkingSlots = () => JSON.parse(localStorage.getItem("parkfinder_slots") || "[]")
const getBookings = () => JSON.parse(localStorage.getItem("parkfinder_bookings") || "[]")
const getUsers = () => JSON.parse(localStorage.getItem("parkfinder_users") || "[]")
const formatCurrency = (amount) => `₹${amount.toFixed(2)}`
const formatTime = (date) => date.toLocaleTimeString()
const formatDuration = (duration) => `${Math.floor(duration / 60)}h ${duration % 60}m`
const endParkingSession = (bookingId, userId) => {
  const bookings = getBookings()
  const bookingIndex = bookings.findIndex((b) => b.id === bookingId)
  if (bookingIndex !== -1) {
    bookings[bookingIndex].status = "completed"
    bookings[bookingIndex].endTime = new Date().toISOString()
    localStorage.setItem("parkfinder_bookings", JSON.stringify(bookings))
    return { success: true, message: "Booking ended successfully" }
  }
  return { success: false, message: "Booking not found" }
}
const openModal = (modalId) => (document.getElementById(modalId).style.display = "block")
const updateUserRole = (userId, newRole) => {
  const users = getUsers()
  const userIndex = users.findIndex((u) => u.id === userId)
  if (userIndex !== -1) {
    users[userIndex].role = newRole
    localStorage.setItem("parkfinder_users", JSON.stringify(users))
    return { success: true, message: "User role updated successfully" }
  }
  return { success: false, message: "User not found" }
}
const closeModal = (modalId) => (document.getElementById(modalId).style.display = "none")
const showNotification = (message, type) => {
  const notification = document.createElement("div")
  notification.className = `notification ${type}`
  notification.textContent = message
  document.body.appendChild(notification)
  setTimeout(() => document.body.removeChild(notification), 3000)
}
const saveParkingSlots = (slots) => localStorage.setItem("parkfinder_slots", JSON.stringify(slots))

// Initialize admin dashboard
function initializeAdminDashboard() {
  updateOverviewStats()
  loadRecentActivity()
  renderAdminSlots()
  loadAllBookings()
  loadUsersTable()
  loadPaymentsTable()
  updateCashCollection()
}

// Update overview statistics
function updateOverviewStats() {
  const slots = getParkingSlots()
  const bookings = getBookings()
  const users = getUsers()
  const payments = JSON.parse(localStorage.getItem("parkfinder_payments") || "[]")

  // Calculate stats
  const totalSlots = slots.length
  const availableSlots = slots.filter((slot) => slot.status === "available").length
  const activeBookings = bookings.filter((booking) => booking.status === "active").length

  // Calculate today's revenue
  const today = new Date().toDateString()
  const todayPayments = payments.filter((payment) => new Date(payment.createdAt).toDateString() === today)
  const todayRevenue = todayPayments.reduce((sum, payment) => sum + payment.amount, 0)

  // Update UI
  document.getElementById("totalSlots").textContent = totalSlots
  document.getElementById("availableSlots").textContent = `${availableSlots} Available`
  document.getElementById("activeBookings").textContent = activeBookings
  document.getElementById("totalRevenue").textContent = formatCurrency(todayRevenue)
  document.getElementById("totalUsers").textContent = users.length
}

// Load recent activity
function loadRecentActivity() {
  const bookings = getBookings()
  const users = getUsers()
  const tableBody = document.getElementById("recentActivityTable")

  if (!tableBody) return

  // Get recent bookings (last 10)
  const recentBookings = bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10)

  if (recentBookings.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #6b7280; padding: 2rem;">
                    No recent activity
                </td>
            </tr>
        `
    return
  }

  tableBody.innerHTML = recentBookings
    .map((booking) => {
      const user = users.find((u) => u.id === booking.userId)
      const username = user ? user.username : "Unknown User"
      const action = booking.status === "active" ? "Started Parking" : "Ended Parking"
      const time = formatTime(new Date(booking.createdAt))

      return `
            <tr>
                <td>${time}</td>
                <td>${username}</td>
                <td>${action}</td>
                <td>Slot ${booking.slotNumber}</td>
                <td>${formatCurrency(booking.amount || 0)}</td>
            </tr>
        `
    })
    .join("")
}

// Render admin slots grid
function renderAdminSlots() {
  const slots = getParkingSlots()
  const slotsGrid = document.getElementById("adminSlotsGrid")

  if (!slotsGrid) return

  slotsGrid.innerHTML = ""

  slots.forEach((slot) => {
    const slotElement = document.createElement("div")
    slotElement.className = "admin-slot"

    // Determine slot class
    let slotClass = "available"
    if (slot.status === "booked") {
      slotClass = "booked"
    } else if (slot.type === "ev") {
      slotClass = "ev"
    }

    slotElement.classList.add(slotClass)
    slotElement.innerHTML = slot.number
    slotElement.title = `Slot ${slot.number} - ${slot.type === "ev" ? "EV Charging" : "Regular"} - ${
      slot.status === "booked" ? "Booked" : "Available"
    }`

    // Add click handler for admin actions
    slotElement.addEventListener("click", () => {
      toggleSlotStatus(slot.id)
    })

    slotsGrid.appendChild(slotElement)
  })
}

// Toggle slot status (admin function)
function toggleSlotStatus(slotId) {
  const slots = getParkingSlots()
  const slotIndex = slots.findIndex((slot) => slot.id === slotId)

  if (slotIndex === -1) return

  const slot = slots[slotIndex]

  // Only allow toggling if slot is available (don't interfere with active bookings)
  if (slot.status === "available") {
    // Mark as temporarily unavailable (maintenance, etc.)
    slots[slotIndex].status = "maintenance"
    slots[slotIndex].adminNote = "Marked unavailable by admin"
  } else if (slot.status === "maintenance") {
    // Mark as available again
    slots[slotIndex].status = "available"
    delete slots[slotIndex].adminNote
  } else {
    showNotification("Cannot modify slot with active booking", "warning")
    return
  }

  saveParkingSlots(slots)
  renderAdminSlots()
  updateOverviewStats()
  showNotification(`Slot ${slot.number} status updated`, "success")
}

// Mark all slots as available (emergency function)
function markAllAvailable() {
  if (!confirm("This will mark ALL slots as available. Are you sure?")) return

  const slots = getParkingSlots()
  slots.forEach((slot) => {
    slot.status = "available"
    slot.bookedBy = null
    slot.bookingStart = null
    delete slot.adminNote
  })

  saveParkingSlots(slots)
  renderAdminSlots()
  updateOverviewStats()
  showNotification("All slots marked as available", "success")
}

// Load all bookings
function loadAllBookings() {
  const bookings = getBookings()
  const users = getUsers()
  const tableBody = document.getElementById("allBookingsTable")

  if (!tableBody) return

  if (bookings.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #6b7280; padding: 2rem;">
                    No bookings found
                </td>
            </tr>
        `
    return
  }

  tableBody.innerHTML = bookings
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((booking) => {
      const user = users.find((u) => u.id === booking.userId)
      const username = user ? user.username : "Unknown User"
      const startTime = formatTime(new Date(booking.startTime))
      const endTime = booking.endTime ? formatTime(new Date(booking.endTime)) : "Active"
      const duration = formatDuration(booking.duration || 0)
      const statusClass = booking.status === "completed" ? "status-completed" : "status-active"

      return `
            <tr>
                <td>${booking.id.substring(0, 8)}...</td>
                <td>${username}</td>
                <td>Slot ${booking.slotNumber}</td>
                <td>${startTime}</td>
                <td>${endTime}</td>
                <td>${duration}</td>
                <td>${formatCurrency(booking.amount || 0)}</td>
                <td><span class="status-badge ${statusClass}">${booking.status}</span></td>
                <td>
                    ${
                      booking.status === "active"
                        ? `<button class="btn btn-danger btn-sm" onclick="forceEndBooking('${booking.id}')">End</button>`
                        : "-"
                    }
                </td>
            </tr>
        `
    })
    .join("")
}

// Force end booking (admin function)
function forceEndBooking(bookingId) {
  if (!confirm("Force end this booking?")) return

  const bookings = getBookings()
  const booking = bookings.find((b) => b.id === bookingId)

  if (!booking) {
    showNotification("Booking not found", "error")
    return
  }

  const result = endParkingSession(bookingId, booking.userId)
  if (result.success) {
    showNotification("Booking ended successfully", "success")
    loadAllBookings()
    renderAdminSlots()
    updateOverviewStats()
  } else {
    showNotification(result.message, "error")
  }
}

// Load users table
function loadUsersTable() {
  const users = getUsers()
  const tableBody = document.getElementById("usersTable")

  if (!tableBody) return

  if (users.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #6b7280; padding: 2rem;">
                    No users found
                </td>
            </tr>
        `
    return
  }

  tableBody.innerHTML = users
    .map((user) => {
      const roleClass = `role-${user.role}`
      const joinDate = formatTime(new Date(user.createdAt))
      const totalSpent = user.totalSpent || 0

      return `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td><span class="role-badge ${roleClass}">${user.role}</span></td>
                <td>${formatCurrency(totalSpent)}</td>
                <td>${joinDate}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="changeUserRole('${user.id}', '${user.username}', '${user.role}')">
                        Change Role
                    </button>
                </td>
            </tr>
        `
    })
    .join("")
}

// Change user role
function changeUserRole(userId, username, currentRole) {
  document.getElementById("modalUsername").value = username
  document.getElementById("modalRole").value = currentRole
  document.getElementById("roleChangeForm").dataset.userId = userId
  openModal("roleModal")
}

// Handle role change form submission
document.getElementById("roleChangeForm").addEventListener("submit", function (e) {
  e.preventDefault()

  const userId = this.dataset.userId
  const newRole = document.getElementById("modalRole").value

  const result = updateUserRole(userId, newRole)
  if (result.success) {
    showNotification(result.message, "success")
    loadUsersTable()
    closeModal("roleModal")
  } else {
    showNotification(result.message, "error")
  }
})

// Load payments table
function loadPaymentsTable() {
  const payments = JSON.parse(localStorage.getItem("parkfinder_payments") || "[]")
  const users = getUsers()
  const tableBody = document.getElementById("paymentsTable")

  if (!tableBody) return

  if (payments.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #6b7280; padding: 2rem;">
                    No payments found
                </td>
            </tr>
        `
    return
  }

  tableBody.innerHTML = payments
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((payment) => {
      const user = users.find((u) => u.id === payment.userId)
      const username = user ? user.username : "Unknown User"
      const paymentDate = formatTime(new Date(payment.createdAt))

      return `
            <tr>
                <td>${payment.id.substring(0, 8)}...</td>
                <td>${username}</td>
                <td>${payment.bookingId.substring(0, 8)}...</td>
                <td>${formatCurrency(payment.amount)}</td>
                <td>${payment.method}</td>
                <td>${paymentDate}</td>
                <td><span class="status-badge status-completed">${payment.status}</span></td>
            </tr>
        `
    })
    .join("")
}

// Update cash collection stats
function updateCashCollection() {
  const payments = JSON.parse(localStorage.getItem("parkfinder_payments") || "[]")
  const now = new Date()

  // Calculate collections for different periods
  const todayCollection = payments
    .filter((p) => new Date(p.createdAt).toDateString() === now.toDateString())
    .reduce((sum, p) => sum + p.amount, 0)

  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
  const weekCollection = payments
    .filter((p) => new Date(p.createdAt) >= weekStart)
    .reduce((sum, p) => sum + p.amount, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthCollection = payments
    .filter((p) => new Date(p.createdAt) >= monthStart)
    .reduce((sum, p) => sum + p.amount, 0)

  const totalCollection = payments.reduce((sum, p) => sum + p.amount, 0)

  // Update UI
  document.getElementById("todayCollection").textContent = formatCurrency(todayCollection)
  document.getElementById("weekCollection").textContent = formatCurrency(weekCollection)
  document.getElementById("monthCollection").textContent = formatCurrency(monthCollection)
  document.getElementById("totalCollection").textContent = formatCurrency(totalCollection)
}

// Update hourly rate
function updateHourlyRate() {
  openModal("rateModal")
}

// Handle rate update form submission
document.getElementById("rateUpdateForm").addEventListener("submit", (e) => {
  e.preventDefault()

  const newRate = document.getElementById("newRate").value
  localStorage.setItem("parkfinder_hourly_rate", newRate)

  showNotification(`Hourly rate updated to ₹${newRate}/hour`, "success")
  closeModal("rateModal")
})

// Export bookings data
function exportBookings() {
  const bookings = getBookings()
  const users = getUsers()

  const csvData = bookings.map((booking) => {
    const user = users.find((u) => u.id === booking.userId)
    return {
      BookingID: booking.id,
      Username: user ? user.username : "Unknown",
      SlotNumber: booking.slotNumber,
      StartTime: booking.startTime,
      EndTime: booking.endTime || "Active",
      Duration: booking.duration || 0,
      Amount: booking.amount || 0,
      Status: booking.status,
    }
  })

  // Convert to CSV
  const csv = [Object.keys(csvData[0]).join(","), ...csvData.map((row) => Object.values(row).join(","))].join("\n")

  // Download CSV
  const blob = new Blob([csv], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `parkfinder-bookings-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)

  showNotification("Bookings data exported successfully", "success")
}

// Generate financial report
function generateReport() {
  const payments = JSON.parse(localStorage.getItem("parkfinder_payments") || "[]")

  const reportData = payments.map((payment) => ({
    PaymentID: payment.id,
    UserID: payment.userId,
    BookingID: payment.bookingId,
    Amount: payment.amount,
    Method: payment.method,
    Date: payment.createdAt,
    Status: payment.status,
  }))

  // Convert to CSV
  const csv = [Object.keys(reportData[0]).join(","), ...reportData.map((row) => Object.values(row).join(","))].join(
    "\n",
  )

  // Download CSV
  const blob = new Blob([csv], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `parkfinder-financial-report-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)

  showNotification("Financial report generated successfully", "success")
}

// Refresh all data
function refreshData() {
  updateOverviewStats()
  loadRecentActivity()
  renderAdminSlots()
  showNotification("Data refreshed successfully", "success")
}

// Load tab-specific data
function loadTabData(tabName) {
  switch (tabName) {
    case "overview":
      updateOverviewStats()
      loadRecentActivity()
      break
    case "slots":
      renderAdminSlots()
      break
    case "bookings":
      loadAllBookings()
      break
    case "users":
      loadUsersTable()
      break
    case "cash":
      updateCashCollection()
      loadPaymentsTable()
      break
    case "analytics":
      // Analytics data is static for demo
      break
  }
}

// Add new user (placeholder function)
function addNewUser() {
  showNotification("Add user functionality would integrate with user registration system", "info")
}
