// Parking System Management

// Utility functions
function getCurrentUser() {
  // Placeholder for getting current user logic
  return JSON.parse(localStorage.getItem("parkfinder_current_user"))
}

function generateId() {
  // Placeholder for generating unique ID logic
  return Math.random().toString(36).substr(2, 9)
}

function calculateParkingFee(durationMinutes) {
  if (durationMinutes <= 30) {
    return 0 // First 30 minutes free
  }

  const billableMinutes = durationMinutes - 30
  const hours = Math.ceil(billableMinutes / 60) // Round up to next hour
  const hourlyRate = Number.parseFloat(localStorage.getItem("parkfinder_hourly_rate") || "20")
  return hours * hourlyRate
}

function getUsers() {
  // Placeholder for getting users logic
  return JSON.parse(localStorage.getItem("parkfinder_users") || "[]")
}

function saveUsers(users) {
  // Placeholder for saving users logic
  localStorage.setItem("parkfinder_users", JSON.stringify(users))
}

function showNotification(message, type) {
  // Placeholder for showing notification logic
  console.log(`Notification (${type}): ${message}`)
}

function formatCurrency(amount) {
  // Placeholder for formatting currency logic
  return `$${amount.toFixed(2)}`
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

function formatTime(date) {
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Initialize parking slots data
function initializeParkingSystem() {
  if (!localStorage.getItem("parkfinder_slots")) {
    const slots = []

    // Generate 50 regular slots
    for (let i = 1; i <= 40; i++) {
      slots.push({
        id: `slot-${i}`,
        number: i,
        type: "regular",
        status: "available", // available, booked
        bookedBy: null,
        bookingStart: null,
        bookingEnd: null,
      })
    }

    // Generate 10 EV charging slots
    for (let i = 41; i <= 50; i++) {
      slots.push({
        id: `slot-${i}`,
        number: i,
        type: "ev",
        status: "available",
        bookedBy: null,
        bookingStart: null,
        bookingEnd: null,
      })
    }

    localStorage.setItem("parkfinder_slots", JSON.stringify(slots))
  }

  if (!localStorage.getItem("parkfinder_bookings")) {
    localStorage.setItem("parkfinder_bookings", JSON.stringify([]))
  }

  if (!localStorage.getItem("parkfinder_payments")) {
    localStorage.setItem("parkfinder_payments", JSON.stringify([]))
  }
}

// Get all parking slots
function getParkingSlots() {
  return JSON.parse(localStorage.getItem("parkfinder_slots") || "[]")
}

// Save parking slots
function saveParkingSlots(slots) {
  localStorage.setItem("parkfinder_slots", JSON.stringify(slots))
}

// Get all bookings
function getBookings() {
  return JSON.parse(localStorage.getItem("parkfinder_bookings") || "[]")
}

// Save bookings
function saveBookings(bookings) {
  localStorage.setItem("parkfinder_bookings", JSON.stringify(bookings))
}

// Get user's current active booking
function getCurrentBooking(userId) {
  const bookings = getBookings()
  return bookings.find((booking) => booking.userId === userId && booking.status === "active")
}

// Get user's booking history
function getUserBookingHistory(userId) {
  const bookings = getBookings()
  return bookings
    .filter((booking) => booking.userId === userId)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
}

// Book a parking slot
function bookParkingSlot(slotId, userId) {
  const slots = getParkingSlots()
  const bookings = getBookings()
  const currentUser = getCurrentUser() || JSON.parse(localStorage.getItem("parkfinder_admin_user"))

  // Check if user already has an active booking
  const existingBooking = getCurrentBooking(userId)
  if (existingBooking) {
    return { success: false, message: "You already have an active booking" }
  }

  // Find the slot
  const slotIndex = slots.findIndex((slot) => slot.id === slotId)
  if (slotIndex === -1) {
    return { success: false, message: "Slot not found" }
  }

  const slot = slots[slotIndex]
  if (slot.status === "booked") {
    return { success: false, message: "Slot is already booked" }
  }

  // Create booking
  const booking = {
    id: generateId(),
    userId: userId,
    slotId: slotId,
    slotNumber: slot.number,
    slotType: slot.type,
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0,
    amount: 0,
    status: "active",
    createdAt: new Date().toISOString(),
  }

  // Update slot status
  slots[slotIndex].status = "booked"
  slots[slotIndex].bookedBy = userId
  slots[slotIndex].bookingStart = booking.startTime

  // Save data
  bookings.push(booking)
  saveParkingSlots(slots)
  saveBookings(bookings)

  return { success: true, message: "Parking slot booked successfully!", booking: booking }
}

// End parking session
function endParkingSession(bookingId, userId) {
  const bookings = getBookings()
  const slots = getParkingSlots()

  const bookingIndex = bookings.findIndex((booking) => booking.id === bookingId && booking.userId === userId)
  if (bookingIndex === -1) {
    return { success: false, message: "Booking not found" }
  }

  const booking = bookings[bookingIndex]
  if (booking.status !== "active") {
    return { success: false, message: "Booking is not active" }
  }

  // Calculate duration and amount
  const endTime = new Date()
  const startTime = new Date(booking.startTime)
  const durationMinutes = Math.floor((endTime - startTime) / (1000 * 60))
  const amount = calculateParkingFee(durationMinutes)

  // Update booking
  bookings[bookingIndex].endTime = endTime.toISOString()
  bookings[bookingIndex].duration = durationMinutes
  bookings[bookingIndex].amount = amount
  bookings[bookingIndex].status = "completed"

  // Update slot status
  const slotIndex = slots.findIndex((slot) => slot.id === booking.slotId)
  if (slotIndex !== -1) {
    slots[slotIndex].status = "available"
    slots[slotIndex].bookedBy = null
    slots[slotIndex].bookingStart = null
    slots[slotIndex].bookingEnd = endTime.toISOString()
  }

  // Create payment record with detailed information
  if (amount > 0) {
    const payment = createPaymentRecord(userId, bookingId, booking.slotId, amount, durationMinutes)
    const payments = JSON.parse(localStorage.getItem("parkfinder_payments") || "[]")
    payments.push(payment)
    localStorage.setItem("parkfinder_payments", JSON.stringify(payments))
  }

  // Update user's total spent
  const users = getUsers()
  const userIndex = users.findIndex((user) => user.id === userId)
  if (userIndex !== -1) {
    users[userIndex].totalSpent = (users[userIndex].totalSpent || 0) + amount
    users[userIndex].totalBookings = (users[userIndex].totalBookings || 0) + 1
    users[userIndex].totalHours = (users[userIndex].totalHours || 0) + Math.floor(durationMinutes / 60)
    saveUsers(users)
  }

  // Save data
  saveParkingSlots(slots)
  saveBookings(bookings)

  return {
    success: true,
    message: "Parking session ended successfully!",
    booking: bookings[bookingIndex],
    amount: amount,
    duration: durationMinutes,
    payment: amount > 0 ? payments[payments.length - 1] : null,
  }
}

// Render parking slots in the UI
function renderParkingSlots() {
  const slots = getParkingSlots()
  const currentUser = getCurrentUser() || JSON.parse(localStorage.getItem("parkfinder_admin_user"))
  const currentBooking = getCurrentBooking(currentUser?.id)
  const slotsGrid = document.getElementById("slotsGrid")

  if (!slotsGrid) return

  slotsGrid.innerHTML = ""

  slots.forEach((slot) => {
    const slotElement = document.createElement("div")
    slotElement.className = "parking-slot"

    // Determine slot class based on status and user
    let slotClass = "slot-available"
    let clickable = true

    if (slot.status === "booked") {
      if (slot.bookedBy === currentUser?.id) {
        slotClass = "slot-my-booking"
      } else {
        slotClass = "slot-booked"
        clickable = false
      }
    } else if (slot.type === "ev") {
      slotClass = "slot-ev"
    }

    slotElement.classList.add(slotClass)

    slotElement.innerHTML = `
            <div class="slot-number">${slot.number}</div>
            <div class="slot-type">${slot.type === "ev" ? "EV" : "Regular"}</div>
        `

    if (clickable && slot.status === "available") {
      slotElement.addEventListener("click", () => {
        if (currentBooking) {
          showNotification("You already have an active booking", "warning")
          return
        }
        bookSlot(slot.id)
      })
    }

    slotsGrid.appendChild(slotElement)
  })
}

// Book a slot (called from UI)
function bookSlot(slotId) {
  const currentUser = getCurrentUser() || JSON.parse(localStorage.getItem("parkfinder_admin_user"))
  if (!currentUser) {
    showNotification("Please log in to book a slot", "error")
    return
  }

  const result = bookParkingSlot(slotId, currentUser.id)
  if (result.success) {
    showNotification(result.message, "success")
    renderParkingSlots()
    updateCurrentBookingCard()
    updateDashboardStats()
    startBookingTimer()
  } else {
    showNotification(result.message, "error")
  }
}

// End current booking (called from UI)
function endCurrentBooking() {
  const currentUser = getCurrentUser() || JSON.parse(localStorage.getItem("parkfinder_admin_user"))
  const currentBooking = getCurrentBooking(currentUser?.id)

  if (!currentBooking) {
    showNotification("No active booking found", "error")
    return
  }

  const result = endParkingSession(currentBooking.id, currentUser.id)
  if (result.success) {
    showNotification(`Session ended! Amount: ${formatCurrency(result.amount)}`, "success")
    renderParkingSlots()
    updateCurrentBookingCard()
    updateDashboardStats()
    renderParkingHistory()
    stopBookingTimer()
  } else {
    showNotification(result.message, "error")
  }
}

// Update current booking card
function updateCurrentBookingCard() {
  const currentUser = getCurrentUser() || JSON.parse(localStorage.getItem("parkfinder_admin_user"))
  const currentBooking = getCurrentBooking(currentUser?.id)
  const bookingCard = document.getElementById("currentBookingCard")

  if (!bookingCard) return

  if (!currentBooking) {
    bookingCard.innerHTML = `
            <div class="no-booking">
                <i class="fas fa-parking" style="font-size: 3rem; color: #d1d5db; margin-bottom: 1rem;"></i>
                <h3>No Active Booking</h3>
                <p>Select an available slot to start parking</p>
            </div>
        `
    return
  }

  const startTime = new Date(currentBooking.startTime)
  const currentTime = new Date()
  const durationMinutes = Math.floor((currentTime - startTime) / (1000 * 60))
  const currentFee = calculateParkingFee(durationMinutes)

  // Calculate billing breakdown
  const freeMinutes = Math.min(durationMinutes, 30)
  const billableMinutes = Math.max(0, durationMinutes - 30)
  const hourlyRate = Number.parseFloat(localStorage.getItem("parkfinder_hourly_rate") || "20")

  bookingCard.innerHTML = `
        <div class="current-booking">
            <div class="booking-info">
                <h3><i class="fas fa-car"></i> Active Parking</h3>
                <div class="timer" id="bookingTimer">${formatDuration(durationMinutes)}</div>
                <div class="booking-details">
                    <div class="detail-item">
                        <div class="detail-label">Slot Number</div>
                        <div class="detail-value">${currentBooking.slotNumber}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Slot Type</div>
                        <div class="detail-value">${currentBooking.slotType === "ev" ? "EV Charging" : "Regular"}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Start Time</div>
                        <div class="detail-value">${formatTime(startTime)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Current Fee</div>
                        <div class="detail-value">${formatCurrency(currentFee)}</div>
                    </div>
                </div>
                
                <!-- Billing Breakdown -->
                <div style="background: rgba(255, 255, 255, 0.1); padding: 1rem; border-radius: 8px; margin: 1rem 0; text-align: left;">
                    <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem;">Billing Breakdown:</h4>
                    <div style="font-size: 0.8rem; line-height: 1.4;">
                        <div>Free time: ${freeMinutes} minutes</div>
                        <div>Billable time: ${billableMinutes} minutes</div>
                        <div>Rate: ${formatCurrency(hourlyRate)}/hour</div>
                        ${currentFee > 0 ? `<div style="font-weight: 600; margin-top: 0.5rem;">Total: ${formatCurrency(currentFee)}</div>` : '<div style="color: #10b981; font-weight: 600; margin-top: 0.5rem;">Still Free!</div>'}
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-danger" onclick="endCurrentBooking()" style="flex: 1;">
                        <i class="fas fa-stop"></i> End Parking
                    </button>
                    ${
                      currentFee > 0
                        ? `<button class="btn btn-primary" onclick="showPaymentOptions('${currentBooking.id}')" style="flex: 1;">
                        <i class="fas fa-credit-card"></i> Pay Now
                    </button>`
                        : ""
                    }
                </div>
            </div>
        </div>
    `
}

// Update dashboard statistics
function updateDashboardStats() {
  const currentUser = getCurrentUser() || JSON.parse(localStorage.getItem("parkfinder_admin_user"))
  if (!currentUser) return

  const bookingHistory = getUserBookingHistory(currentUser.id)
  const currentBooking = getCurrentBooking(currentUser.id)

  // Calculate stats
  const totalBookings = bookingHistory.length
  const totalHours = Math.floor(bookingHistory.reduce((sum, booking) => sum + (booking.duration || 0), 0) / 60)
  const totalSpent = bookingHistory.reduce((sum, booking) => sum + (booking.amount || 0), 0)
  const currentStatus = currentBooking ? "Parking" : "Available"

  // Update UI
  const elements = {
    totalBookings: document.getElementById("totalBookings"),
    totalHours: document.getElementById("totalHours"),
    totalSpent: document.getElementById("totalSpent"),
    currentStatus: document.getElementById("currentStatus"),
  }

  if (elements.totalBookings) elements.totalBookings.textContent = totalBookings
  if (elements.totalHours) elements.totalHours.textContent = totalHours
  if (elements.totalSpent) elements.totalSpent.textContent = formatCurrency(totalSpent)
  if (elements.currentStatus) elements.currentStatus.textContent = currentStatus
}

// Render parking history table
function renderParkingHistory() {
  const currentUser = getCurrentUser() || JSON.parse(localStorage.getItem("parkfinder_admin_user"))
  if (!currentUser) return

  const bookingHistory = getUserBookingHistory(currentUser.id)
  const tableBody = document.getElementById("historyTableBody")

  if (!tableBody) return

  if (bookingHistory.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #6b7280; padding: 2rem;">
                    No parking history available
                </td>
            </tr>
        `
    return
  }

  tableBody.innerHTML = bookingHistory
    .map((booking) => {
      const startTime = new Date(booking.startTime)
      const endTime = booking.endTime ? new Date(booking.endTime) : null
      const statusClass = booking.status === "completed" ? "status-completed" : "status-active"

      return `
            <tr>
                <td>${booking.slotNumber}</td>
                <td>${formatTime(startTime)}</td>
                <td>${endTime ? formatTime(endTime) : "Active"}</td>
                <td>${formatDuration(booking.duration || 0)}</td>
                <td>${formatCurrency(booking.amount || 0)}</td>
                <td><span class="status-badge ${statusClass}">${booking.status}</span></td>
            </tr>
        `
    })
    .join("")
}

// Timer functionality
let bookingTimerInterval = null

function startBookingTimer() {
  const currentUser = getCurrentUser() || JSON.parse(localStorage.getItem("parkfinder_admin_user"))
  const currentBooking = getCurrentBooking(currentUser?.id)

  if (!currentBooking) {
    stopBookingTimer()
    return
  }

  // Clear existing timer
  if (bookingTimerInterval) {
    clearInterval(bookingTimerInterval)
  }

  // Start new timer
  bookingTimerInterval = setInterval(() => {
    const timerElement = document.getElementById("bookingTimer")
    if (!timerElement) {
      stopBookingTimer()
      return
    }

    const startTime = new Date(currentBooking.startTime)
    const currentTime = new Date()
    const durationMinutes = Math.floor((currentTime - startTime) / (1000 * 60))

    timerElement.textContent = formatDuration(durationMinutes)

    // Update current fee in the booking card
    const currentFee = calculateParkingFee(durationMinutes)
    const feeElements = document.querySelectorAll(".detail-value")
    if (feeElements.length >= 4) {
      feeElements[3].textContent = formatCurrency(currentFee)
    }
  }, 1000)
}

function stopBookingTimer() {
  if (bookingTimerInterval) {
    clearInterval(bookingTimerInterval)
    bookingTimerInterval = null
  }
}

function createPaymentRecord(userId, bookingId, slotId, amount, duration) {
  const hourlyRate = Number.parseFloat(localStorage.getItem("parkfinder_hourly_rate") || "20")
  const freeMinutes = Math.min(duration, 30)
  const billableMinutes = Math.max(0, duration - 30)
  const billableHours = Math.ceil(billableMinutes / 60)

  return {
    id: generateId(),
    userId: userId,
    bookingId: bookingId,
    slotId: slotId,
    amount: amount,
    method: "cash", // Default payment method
    status: "completed",
    createdAt: new Date().toISOString(),
    // Detailed billing breakdown
    billing: {
      totalDuration: duration,
      freeMinutes: freeMinutes,
      billableMinutes: billableMinutes,
      billableHours: billableHours,
      hourlyRate: hourlyRate,
      subtotal: billableHours * hourlyRate,
      tax: 0, // No tax for demo
      total: amount,
    },
    invoice: {
      number: `INV-${Date.now()}`,
      date: new Date().toISOString(),
      dueDate: new Date().toISOString(), // Immediate payment
    },
  }
}

function generateInvoice(paymentId) {
  const payments = JSON.parse(localStorage.getItem("parkfinder_payments") || "[]")
  const payment = payments.find((p) => p.id === paymentId)

  if (!payment) {
    return { success: false, message: "Payment not found" }
  }

  const users = getUsers()
  const user = users.find((u) => u.id === payment.userId)
  const bookings = getBookings()
  const booking = bookings.find((b) => b.id === payment.bookingId)

  const invoice = {
    number: payment.invoice.number,
    date: new Date(payment.invoice.date).toLocaleDateString(),
    customer: {
      name: user ? user.username : "Unknown User",
      email: user ? user.email : "N/A",
      id: payment.userId,
    },
    booking: {
      id: payment.bookingId,
      slotNumber: booking ? booking.slotNumber : "N/A",
      startTime: booking ? new Date(booking.startTime).toLocaleString() : "N/A",
      endTime: booking ? new Date(booking.endTime).toLocaleString() : "N/A",
    },
    billing: payment.billing,
    payment: {
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
    },
  }

  return { success: true, invoice: invoice }
}

function processPayment(bookingId, paymentMethod = "cash") {
  const bookings = getBookings()
  const booking = bookings.find((b) => b.id === bookingId && b.status === "active")

  if (!booking) {
    return { success: false, message: "Active booking not found" }
  }

  // Calculate current amount
  const startTime = new Date(booking.startTime)
  const currentTime = new Date()
  const durationMinutes = Math.floor((currentTime - startTime) / (1000 * 60))
  const amount = calculateParkingFee(durationMinutes)

  // For demo purposes, all payments are successful
  const paymentResult = {
    success: true,
    transactionId: `TXN-${Date.now()}`,
    amount: amount,
    method: paymentMethod,
    timestamp: new Date().toISOString(),
  }

  if (paymentResult.success) {
    // End the parking session
    const result = endParkingSession(bookingId, booking.userId)
    if (result.success) {
      return {
        success: true,
        message: "Payment processed successfully",
        payment: result.payment,
        invoice: result.payment ? generateInvoice(result.payment.id) : null,
      }
    }
  }

  return { success: false, message: "Payment processing failed" }
}

function getUserPaymentHistory(userId) {
  const payments = JSON.parse(localStorage.getItem("parkfinder_payments") || "[]")
  return payments
    .filter((payment) => payment.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

function getAllPayments() {
  const payments = JSON.parse(localStorage.getItem("parkfinder_payments") || "[]")
  return payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

function calculateRevenueStats(period = "today") {
  const payments = JSON.parse(localStorage.getItem("parkfinder_payments") || "[]")
  const now = new Date()

  let startDate
  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case "week":
      startDate = new Date(now.setDate(now.getDate() - now.getDay()))
      break
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    default:
      startDate = new Date(0) // All time
  }

  const periodPayments = payments.filter((payment) => new Date(payment.createdAt) >= startDate)

  return {
    totalRevenue: periodPayments.reduce((sum, payment) => sum + payment.amount, 0),
    totalTransactions: periodPayments.length,
    averageTransaction:
      periodPayments.length > 0
        ? periodPayments.reduce((sum, payment) => sum + payment.amount, 0) / periodPayments.length
        : 0,
    totalDuration: periodPayments.reduce((sum, payment) => sum + (payment.billing?.totalDuration || 0), 0),
    freeMinutesGiven: periodPayments.reduce((sum, payment) => sum + (payment.billing?.freeMinutes || 0), 0),
  }
}

function showPaymentOptions(bookingId) {
  const booking = getBookings().find((b) => b.id === bookingId)
  if (!booking) return

  const startTime = new Date(booking.startTime)
  const currentTime = new Date()
  const durationMinutes = Math.floor((currentTime - startTime) / (1000 * 60))
  const amount = calculateParkingFee(durationMinutes)

  const paymentModal = document.createElement("div")
  paymentModal.className = "modal active"
  paymentModal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Payment Options</h3>
        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div style="text-align: center; margin-bottom: 2rem;">
        <div style="font-size: 2rem; font-weight: 700; color: #6366f1; margin-bottom: 0.5rem;">
          ${formatCurrency(amount)}
        </div>
        <div style="color: #6b7280;">
          Slot ${booking.slotNumber} • ${formatDuration(durationMinutes)}
        </div>
      </div>
      <div style="display: grid; gap: 1rem;">
        <button class="btn btn-primary" onclick="processPaymentMethod('${bookingId}', 'cash')" style="padding: 1rem;">
          <i class="fas fa-money-bill-wave"></i> Cash Payment
        </button>
        <button class="btn btn-primary" onclick="processPaymentMethod('${bookingId}', 'card')" style="padding: 1rem;">
          <i class="fas fa-credit-card"></i> Card Payment
        </button>
        <button class="btn btn-primary" onclick="processPaymentMethod('${bookingId}', 'upi')" style="padding: 1rem;">
          <i class="fas fa-mobile-alt"></i> UPI Payment
        </button>
      </div>
    </div>
  `

  document.body.appendChild(paymentModal)
}

function processPaymentMethod(bookingId, method) {
  const result = processPayment(bookingId, method)

  if (result.success) {
    showNotification(`Payment processed successfully via ${method}`, "success")

    // Show invoice
    if (result.invoice && result.invoice.success) {
      showInvoice(result.invoice.invoice)
    }

    // Close modal and refresh UI
    document.querySelector(".modal")?.remove()
    updateCurrentBookingCard()
    updateDashboardStats()
    renderParkingHistory()
  } else {
    showNotification(result.message, "error")
  }
}

function showInvoice(invoice) {
  const invoiceModal = document.createElement("div")
  invoiceModal.className = "modal active"
  invoiceModal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3 class="modal-title">Invoice</h3>
        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div style="padding: 1rem; background: #f8fafc; border-radius: 8px; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
          <div>
            <h4>ParkFinder</h4>
            <div style="color: #6b7280; font-size: 0.9rem;">Smart City Parking Solution</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 600;">Invoice #${invoice.number}</div>
            <div style="color: #6b7280; font-size: 0.9rem;">${invoice.date}</div>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 1rem;">
          <h5 style="margin-bottom: 0.5rem;">Customer Details:</h5>
          <div style="font-size: 0.9rem; color: #6b7280;">
            <div>${invoice.customer.name}</div>
            <div>${invoice.customer.email}</div>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 1rem; margin-top: 1rem;">
          <h5 style="margin-bottom: 0.5rem;">Parking Details:</h5>
          <div style="font-size: 0.9rem; color: #6b7280;">
            <div>Slot: ${invoice.booking.slotNumber}</div>
            <div>Start: ${invoice.booking.startTime}</div>
            <div>End: ${invoice.booking.endTime}</div>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 1rem; margin-top: 1rem;">
          <h5 style="margin-bottom: 0.5rem;">Billing Breakdown:</h5>
          <div style="font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between;">
              <span>Total Duration:</span>
              <span>${formatDuration(invoice.billing.totalDuration)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Free Time:</span>
              <span>${formatDuration(invoice.billing.freeMinutes)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Billable Time:</span>
              <span>${formatDuration(invoice.billing.billableMinutes)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Rate:</span>
              <span>${formatCurrency(invoice.billing.hourlyRate)}/hour</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 600; border-top: 1px solid #e5e7eb; padding-top: 0.5rem; margin-top: 0.5rem;">
              <span>Total Amount:</span>
              <span>${formatCurrency(invoice.billing.total)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div style="display: flex; gap: 1rem; justify-content: flex-end;">
        <button class="btn btn-primary" onclick="downloadInvoice('${invoice.number}')">
          <i class="fas fa-download"></i> Download
        </button>
        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
          Close
        </button>
      </div>
    </div>
  `

  document.body.appendChild(invoiceModal)
}

function downloadInvoice(invoiceNumber) {
  showNotification(`Invoice ${invoiceNumber} downloaded`, "success")
  // In a real system, this would generate and download a PDF
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  updateCurrentBookingCard()
})
