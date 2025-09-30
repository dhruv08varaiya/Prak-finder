// Supervisor Dashboard Management

// Declare necessary variables and functions
const getParkingSlots = () => JSON.parse(localStorage.getItem("parkfinder_slots") || "[]")
const getBookings = () => JSON.parse(localStorage.getItem("parkfinder_bookings") || "[]")
const getUsers = () => JSON.parse(localStorage.getItem("parkfinder_users") || "[]")
const formatTime = (date) => date.toLocaleTimeString()
const formatDuration = (minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`
const calculateParkingFee = (duration) => duration * 0.5 // Example fee calculation
const formatCurrency = (amount) => `$${amount.toFixed(2)}`
const openModal = (modalId) => (document.getElementById(modalId).style.display = "block")
const showNotification = (message, type) => alert(`${type.toUpperCase()}: ${message}`)
const generateId = () => Math.random().toString(36).substr(2, 9)
const closeModal = (modalId) => (document.getElementById(modalId).style.display = "none")
const endParkingSession = (bookingId, userId) => {
  // Example implementation
  const bookings = getBookings()
  const bookingIndex = bookings.findIndex((b) => b.id === bookingId)
  if (bookingIndex !== -1) {
    bookings[bookingIndex].status = "cancelled"
    bookings[bookingIndex].endTime = new Date().toISOString()
    localStorage.setItem("parkfinder_bookings", JSON.stringify(bookings))
    return { success: true }
  }
  return { success: false, message: "Booking not found" }
}

// Initialize supervisor dashboard
function initializeSupervisorDashboard() {
  updateSupervisorStats()
  renderSupervisorSlots()
  loadActiveBookings()
  loadCompletedBookings()
  loadIssues()
  loadFeedback()
  populateSlotOptions()
  updateLastUpdated()

  // Auto-refresh every 30 seconds
  setInterval(() => {
    updateSupervisorStats()
    renderSupervisorSlots()
    updateLastUpdated()
  }, 30000)
}

// Update supervisor statistics
function updateSupervisorStats() {
  const slots = getParkingSlots()
  const bookings = getBookings()
  const issues = getIssues()

  // Calculate stats
  const availableSlots = slots.filter((slot) => slot.status === "available").length
  const occupiedSlots = slots.filter((slot) => slot.status === "booked").length
  const issueSlots = issues.filter((issue) => issue.status === "open").length
  const occupancyRate = Math.round((occupiedSlots / slots.length) * 100)

  // Update UI
  document.getElementById("availableSlots").textContent = availableSlots
  document.getElementById("occupiedSlots").textContent = occupiedSlots
  document.getElementById("issueSlots").textContent = issueSlots
  document.getElementById("occupancyRate").textContent = `${occupancyRate}%`
}

// Render supervisor slots grid
function renderSupervisorSlots() {
  const slots = getParkingSlots()
  const issues = getIssues()
  const slotsGrid = document.getElementById("supervisorSlotsGrid")

  if (!slotsGrid) return

  slotsGrid.innerHTML = ""

  slots.forEach((slot) => {
    const slotElement = document.createElement("div")
    slotElement.className = "supervisor-slot"

    // Check if slot has issues
    const hasIssue = issues.some((issue) => issue.slotId === slot.id && issue.status === "open")

    // Determine slot class
    let slotClass = "available"
    if (hasIssue) {
      slotClass = "issue"
    } else if (slot.status === "booked") {
      slotClass = "booked"
    } else if (slot.type === "ev") {
      slotClass = "ev"
    }

    slotElement.classList.add(slotClass)

    slotElement.innerHTML = `
            <div class="slot-number">${slot.number}</div>
            <div class="slot-type">${slot.type === "ev" ? "EV" : "REG"}</div>
        `

    slotElement.title = `Slot ${slot.number} - ${slot.type === "ev" ? "EV Charging" : "Regular"} - ${
      hasIssue ? "Issue Reported" : slot.status === "booked" ? "Occupied" : "Available"
    }`

    // Add click handler for slot details
    slotElement.addEventListener("click", () => {
      showSlotDetails(slot)
    })

    slotsGrid.appendChild(slotElement)
  })
}

// Show slot details
function showSlotDetails(slot) {
  const bookings = getBookings()
  const users = getUsers()
  const issues = getIssues()

  let details = `Slot ${slot.number} Details:\n\n`
  details += `Type: ${slot.type === "ev" ? "EV Charging" : "Regular"}\n`
  details += `Status: ${slot.status}\n\n`

  if (slot.status === "booked") {
    const booking = bookings.find((b) => b.slotId === slot.id && b.status === "active")
    if (booking) {
      const user = users.find((u) => u.id === booking.userId)
      const startTime = new Date(booking.startTime)
      const duration = Math.floor((new Date() - startTime) / (1000 * 60))

      details += `Booked by: ${user ? user.username : "Unknown"}\n`
      details += `Start time: ${formatTime(startTime)}\n`
      details += `Duration: ${formatDuration(duration)}\n`
    }
  }

  const slotIssues = issues.filter((issue) => issue.slotId === slot.id && issue.status === "open")
  if (slotIssues.length > 0) {
    details += `\nActive Issues:\n`
    slotIssues.forEach((issue) => {
      details += `- ${issue.type}: ${issue.description}\n`
    })
  }

  alert(details)
}

// Load active bookings
function loadActiveBookings() {
  const bookings = getBookings()
  const users = getUsers()
  const tableBody = document.getElementById("activeBookingsTable")

  if (!tableBody) return

  const activeBookings = bookings.filter((booking) => booking.status === "active")

  if (activeBookings.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #6b7280; padding: 2rem;">
                    No active bookings
                </td>
            </tr>
        `
    return
  }

  tableBody.innerHTML = activeBookings
    .map((booking) => {
      const user = users.find((u) => u.id === booking.userId)
      const username = user ? user.username : "Unknown User"
      const startTime = new Date(booking.startTime)
      const duration = Math.floor((new Date() - startTime) / (1000 * 60))
      const currentFee = calculateParkingFee(duration)

      return `
            <tr>
                <td>${booking.id.substring(0, 8)}...</td>
                <td>${username}</td>
                <td>Slot ${booking.slotNumber}</td>
                <td>${formatTime(startTime)}</td>
                <td>${formatDuration(duration)}</td>
                <td>${formatCurrency(currentFee)}</td>
                <td><span class="status-badge status-active">Active</span></td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="adjustBooking('${booking.id}')">Adjust</button>
                    <button class="btn btn-danger btn-sm" onclick="cancelBooking('${booking.id}')">Cancel</button>
                </td>
            </tr>
        `
    })
    .join("")
}

// Load completed bookings
function loadCompletedBookings() {
  const bookings = getBookings()
  const users = getUsers()
  const tableBody = document.getElementById("completedBookingsTable")

  if (!tableBody) return

  const completedBookings = bookings
    .filter((booking) => booking.status === "completed")
    .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
    .slice(0, 10) // Show last 10 completed bookings

  if (completedBookings.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #6b7280; padding: 2rem;">
                    No completed bookings
                </td>
            </tr>
        `
    return
  }

  tableBody.innerHTML = completedBookings
    .map((booking) => {
      const user = users.find((u) => u.id === booking.userId)
      const username = user ? user.username : "Unknown User"
      const endTime = new Date(booking.endTime)

      return `
            <tr>
                <td>${booking.id.substring(0, 8)}...</td>
                <td>${username}</td>
                <td>Slot ${booking.slotNumber}</td>
                <td>${formatDuration(booking.duration)}</td>
                <td>${formatCurrency(booking.amount)}</td>
                <td>${formatTime(endTime)}</td>
            </tr>
        `
    })
    .join("")
}

// Get issues from localStorage
function getIssues() {
  return JSON.parse(localStorage.getItem("parkfinder_issues") || "[]")
}

// Save issues to localStorage
function saveIssues(issues) {
  localStorage.setItem("parkfinder_issues", JSON.stringify(issues))
}

// Load issues
function loadIssues() {
  const issues = getIssues()
  const tableBody = document.getElementById("issuesTable")

  if (!tableBody) return

  if (issues.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #6b7280; padding: 2rem;">
                    No issues reported
                </td>
            </tr>
        `
    return
  }

  tableBody.innerHTML = issues
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((issue) => {
      const priorityClass = `priority-${issue.priority}`
      const statusClass = issue.status === "resolved" ? "status-completed" : "status-issue"

      return `
            <tr>
                <td>${issue.id.substring(0, 8)}...</td>
                <td>Slot ${issue.slotNumber}</td>
                <td>${issue.type}</td>
                <td>${issue.description}</td>
                <td><span class="status-badge ${priorityClass}">${issue.priority}</span></td>
                <td>${formatTime(new Date(issue.createdAt))}</td>
                <td><span class="status-badge ${statusClass}">${issue.status}</span></td>
                <td>
                    ${
                      issue.status === "open"
                        ? `<button class="btn btn-success btn-sm" onclick="resolveIssue('${issue.id}')">Resolve</button>`
                        : "-"
                    }
                </td>
            </tr>
        `
    })
    .join("")
}

// Get feedback from localStorage
function getFeedback() {
  return JSON.parse(localStorage.getItem("parkfinder_feedback") || "[]")
}

// Load feedback
function loadFeedback() {
  const feedback = getFeedback()
  const tableBody = document.getElementById("feedbackTable")

  if (!tableBody) return

  if (feedback.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #6b7280; padding: 2rem;">
                    No feedback available
                </td>
            </tr>
        `
    return
  }

  tableBody.innerHTML = feedback
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((item) => {
      const statusClass = item.status === "resolved" ? "status-completed" : "status-active"

      return `
            <tr>
                <td>${formatTime(new Date(item.createdAt))}</td>
                <td>${item.name}</td>
                <td>${item.type || "General"}</td>
                <td>${item.message}</td>
                <td><span class="status-badge ${statusClass}">${item.status || "new"}</span></td>
                <td>
                    ${
                      item.status !== "resolved"
                        ? `<button class="btn btn-primary btn-sm" onclick="respondToFeedback('${item.id}')">Respond</button>`
                        : "-"
                    }
                </td>
            </tr>
        `
    })
    .join("")
}

// Populate slot options in issue modal
function populateSlotOptions() {
  const slots = getParkingSlots()
  const slotSelect = document.getElementById("issueSlot")

  if (!slotSelect) return

  slotSelect.innerHTML = '<option value="">Select Slot</option>'

  slots.forEach((slot) => {
    const option = document.createElement("option")
    option.value = slot.id
    option.textContent = `Slot ${slot.number} (${slot.type === "ev" ? "EV" : "Regular"})`
    slotSelect.appendChild(option)
  })
}

// Report issue
function reportIssue() {
  openModal("issueModal")
}

// Handle issue report form submission
document.getElementById("issueReportForm").addEventListener("submit", (e) => {
  e.preventDefault()

  const slotId = document.getElementById("issueSlot").value
  const type = document.getElementById("issueType").value
  const priority = document.getElementById("issuePriority").value
  const description = document.getElementById("issueDescription").value

  const slots = getParkingSlots()
  const slot = slots.find((s) => s.id === slotId)

  if (!slot) {
    showNotification("Invalid slot selected", "error")
    return
  }

  const issue = {
    id: generateId(),
    slotId: slotId,
    slotNumber: slot.number,
    type: type,
    priority: priority,
    description: description,
    status: "open",
    reportedBy: "supervisor",
    createdAt: new Date().toISOString(),
  }

  const issues = getIssues()
  issues.push(issue)
  saveIssues(issues)

  showNotification("Issue reported successfully", "success")
  closeModal("issueModal")
  loadIssues()
  updateSupervisorStats()
  renderSupervisorSlots()

  // Reset form
  document.getElementById("issueReportForm").reset()
})

// Resolve issue
function resolveIssue(issueId) {
  if (!confirm("Mark this issue as resolved?")) return

  const issues = getIssues()
  const issueIndex = issues.findIndex((issue) => issue.id === issueId)

  if (issueIndex !== -1) {
    issues[issueIndex].status = "resolved"
    issues[issueIndex].resolvedAt = new Date().toISOString()
    saveIssues(issues)

    showNotification("Issue marked as resolved", "success")
    loadIssues()
    updateSupervisorStats()
    renderSupervisorSlots()
  }
}

// Adjust booking
function adjustBooking(bookingId) {
  const reason = prompt("Enter reason for adjustment:")
  if (!reason) return

  showNotification(`Booking adjustment logged: ${reason}`, "info")
  // In a real system, this would log the adjustment
}

// Cancel booking
function cancelBooking(bookingId) {
  if (!confirm("Cancel this booking? This action cannot be undone.")) return

  const bookings = getBookings()
  const booking = bookings.find((b) => b.id === bookingId)

  if (!booking) {
    showNotification("Booking not found", "error")
    return
  }

  const result = endParkingSession(bookingId, booking.userId)
  if (result.success) {
    showNotification("Booking cancelled successfully", "success")
    loadActiveBookings()
    loadCompletedBookings()
    renderSupervisorSlots()
    updateSupervisorStats()
  } else {
    showNotification(result.message, "error")
  }
}

// Respond to feedback
function respondToFeedback(feedbackId) {
  const response = prompt("Enter your response:")
  if (!response) return

  const feedback = getFeedback()
  const feedbackIndex = feedback.findIndex((f) => f.id === feedbackId)

  if (feedbackIndex !== -1) {
    feedback[feedbackIndex].response = response
    feedback[feedbackIndex].status = "resolved"
    feedback[feedbackIndex].respondedAt = new Date().toISOString()
    localStorage.setItem("parkfinder_feedback", JSON.stringify(feedback))

    showNotification("Response sent successfully", "success")
    loadFeedback()
  }
}

// Generate reports
function generateDailyReport() {
  const bookings = getBookings()
  const today = new Date().toDateString()
  const todayBookings = bookings.filter((b) => new Date(b.createdAt).toDateString() === today)

  const reportData = {
    date: today,
    totalBookings: todayBookings.length,
    activeBookings: todayBookings.filter((b) => b.status === "active").length,
    completedBookings: todayBookings.filter((b) => b.status === "completed").length,
    totalRevenue: todayBookings.reduce((sum, b) => sum + (b.amount || 0), 0),
  }

  downloadReport("daily-report", reportData)
}

function generateWeeklyReport() {
  showNotification("Weekly report generated", "success")
  // Implementation would generate weekly statistics
}

function generateMonthlyReport() {
  showNotification("Monthly report generated", "success")
  // Implementation would generate monthly statistics
}

function generateIssueReport() {
  const issues = getIssues()
  const reportData = issues.map((issue) => ({
    IssueID: issue.id,
    SlotNumber: issue.slotNumber,
    Type: issue.type,
    Priority: issue.priority,
    Status: issue.status,
    Description: issue.description,
    ReportedDate: issue.createdAt,
  }))

  downloadReport("issues-report", reportData)
}

// Download report as CSV
function downloadReport(filename, data) {
  let csv = ""

  if (Array.isArray(data)) {
    // Array of objects
    csv = [Object.keys(data[0]).join(","), ...data.map((row) => Object.values(row).join(","))].join("\n")
  } else {
    // Single object
    csv = Object.entries(data)
      .map(([key, value]) => `${key},${value}`)
      .join("\n")
  }

  const blob = new Blob([csv], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)

  showNotification("Report downloaded successfully", "success")
}

// Refresh functions
function refreshSlots() {
  renderSupervisorSlots()
  updateSupervisorStats()
  showNotification("Slots refreshed", "success")
}

function refreshBookings() {
  loadActiveBookings()
  loadCompletedBookings()
  showNotification("Bookings refreshed", "success")
}

function refreshFeedback() {
  loadFeedback()
  showNotification("Feedback refreshed", "success")
}

// Update last updated timestamp
function updateLastUpdated() {
  const element = document.getElementById("lastUpdated")
  if (element) {
    element.textContent = new Date().toLocaleTimeString()
  }
}

// Load tab-specific data
function loadSupervisorTabData(tabName) {
  switch (tabName) {
    case "monitor":
      updateSupervisorStats()
      renderSupervisorSlots()
      break
    case "bookings":
      loadActiveBookings()
      loadCompletedBookings()
      break
    case "issues":
      loadIssues()
      break
    case "reports":
      // Reports data is calculated on demand
      break
    case "feedback":
      loadFeedback()
      break
  }
}
