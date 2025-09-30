// Parking data structure
const parkingData = {
    1: {
        'A': Array.from({ length: 20 }, (_, i) => ({
            id: `A1-${i + 1}`,
            number: i + 1,
            type: i < 2 ? 'disabled' : i < 8 ? 'compact' : i < 16 ? 'standard' : 'large',
            status: Math.random() > 0.6 ? 'occupied' : 'available',
            occupiedSince: Math.random() > 0.6 ? new Date(Date.now() - Math.random() * 4 * 60 * 60 * 1000) : null
        })),
        'B': Array.from({ length: 20 }, (_, i) => ({
            id: `B1-${i + 1}`,
            number: i + 1,
            type: i < 2 ? 'disabled' : i < 8 ? 'compact' : i < 16 ? 'standard' : 'large',
            status: Math.random() > 0.7 ? 'occupied' : 'available',
            occupiedSince: Math.random() > 0.7 ? new Date(Date.now() - Math.random() * 3 * 60 * 60 * 1000) : null
        }))
    },
    2: {
        'A': Array.from({ length: 24 }, (_, i) => ({
            id: `A2-${i + 1}`,
            number: i + 1,
            type: i < 2 ? 'disabled' : i < 10 ? 'compact' : i < 20 ? 'standard' : 'large',
            status: Math.random() > 0.5 ? 'occupied' : 'available',
            occupiedSince: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000) : null
        })),
        'B': Array.from({ length: 24 }, (_, i) => ({
            id: `B2-${i + 1}`,
            number: i + 1,
            type: i < 2 ? 'disabled' : i < 10 ? 'compact' : i < 20 ? 'standard' : 'large',
            status: Math.random() > 0.4 ? 'occupied' : 'available',
            occupiedSince: Math.random() > 0.4 ? new Date(Date.now() - Math.random() * 5 * 60 * 60 * 1000) : null
        }))
    },
    3: {
        'A': Array.from({ length: 16 }, (_, i) => ({
            id: `A3-${i + 1}`,
            number: i + 1,
            type: i < 1 ? 'disabled' : i < 6 ? 'compact' : i < 12 ? 'standard' : 'large',
            status: Math.random() > 0.3 ? 'occupied' : 'available',
            occupiedSince: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000) : null
        }))
    }
};

// Global variables
let currentLevel = 1;
let selectedSlot = null;
let currentDuration = 2;

// DOM elements
const levelButtons = document.querySelectorAll('.level-btn');
const parkingSections = document.getElementById('parkingSections');
const bookingModal = document.getElementById('bookingModal');
const successModal = document.getElementById('successModal');
const closeModalBtn = document.getElementById('closeModal');
const cancelBookingBtn = document.getElementById('cancelBooking');
const confirmBookingBtn = document.getElementById('confirmBooking');
const durationButtons = document.querySelectorAll('.duration-btn');
const durationRange = document.getElementById('durationRange');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    renderParkingLayout();
    updateStats();
    setupEventListeners();
    
    // Simulate real-time updates
    setInterval(simulateRealTimeUpdates, 15000);
});

// Setup event listeners
function setupEventListeners() {
    // Level selection
    levelButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const level = parseInt(this.dataset.level);
            switchLevel(level);
        });
    });

    // Modal controls
    closeModalBtn.addEventListener('click', closeBookingModal);
    cancelBookingBtn.addEventListener('click', closeBookingModal);
    confirmBookingBtn.addEventListener('click', confirmBooking);

    // Duration selection
    durationButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const hours = parseFloat(this.dataset.hours);
            selectDuration(hours);
        });
    });

    durationRange.addEventListener('input', function() {
        const hours = parseFloat(this.value);
        selectDuration(hours);
    });

    // Close modal on overlay click
    bookingModal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeBookingModal();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeBookingModal();
        }
    });
}

// Switch between parking levels
function switchLevel(level) {
    currentLevel = level;
    
    // Update active button
    levelButtons.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
    });
    
    // Update level display
    document.getElementById('currentLevel').textContent = `Level ${level}`;
    
    // Re-render parking layout
    renderParkingLayout();
    updateStats();
}

// Render parking layout for current level
function renderParkingLayout() {
    const sections = parkingData[currentLevel];
    parkingSections.innerHTML = '';

    Object.keys(sections).forEach(sectionKey => {
        const sectionData = sections[sectionKey];
        const sectionElement = createSectionElement(sectionKey, sectionData);
        parkingSections.appendChild(sectionElement);
    });
}

// Create section element
function createSectionElement(sectionKey, slots) {
    const section = document.createElement('div');
    section.className = 'section';
    
    const header = document.createElement('div');
    header.className = 'section-header';
    header.textContent = `Section ${sectionKey}`;
    
    const grid = document.createElement('div');
    grid.className = 'slots-grid';
    
    slots.forEach(slot => {
        const slotElement = createSlotElement(slot);
        grid.appendChild(slotElement);
    });
    
    section.appendChild(header);
    section.appendChild(grid);
    
    return section;
}

// Create individual slot element
function createSlotElement(slot) {
    const slotDiv = document.createElement('div');
    slotDiv.className = `slot ${slot.status}`;
    
    if (slot.type === 'disabled') {
        slotDiv.classList.add('disabled');
    }
    
    // Slot icon based on type
    const icon = document.createElement('i');
    icon.className = 'slot-icon fas';
    
    switch (slot.type) {
        case 'disabled':
            icon.className += ' fa-wheelchair';
            break;
        case 'large':
            icon.className += ' fa-truck';
            break;
        case 'compact':
            icon.className += ' fa-motorcycle';
            break;
        default:
            icon.className += ' fa-car';
    }
    
    const number = document.createElement('div');
    number.className = 'slot-number';
    number.textContent = slot.number;
    
    slotDiv.appendChild(icon);
    slotDiv.appendChild(number);
    
    // Add time info for occupied slots
    if (slot.status === 'occupied' && slot.occupiedSince) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'slot-time';
        
        const clockIcon = document.createElement('i');
        clockIcon.className = 'fas fa-clock';
        
        const timeText = document.createElement('span');
        timeText.textContent = getTimeParked(slot.occupiedSince);
        
        timeDiv.appendChild(clockIcon);
        timeDiv.appendChild(timeText);
        slotDiv.appendChild(timeDiv);
    }
    
    // Add click handler for available slots
    if (slot.status === 'available') {
        slotDiv.addEventListener('click', () => openBookingModal(slot));
    }
    
    return slotDiv;
}

// Calculate time parked
function getTimeParked(occupiedSince) {
    const now = new Date();
    const diff = now - occupiedSince;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

// Open booking modal
function openBookingModal(slot) {
    selectedSlot = slot;
    
    // Update modal content
    document.getElementById('slotDetails').textContent = 
        `Level ${currentLevel} - Section ${slot.id.charAt(0)} - Spot ${slot.number}`;
    document.getElementById('slotType').textContent = 
        slot.type.charAt(0).toUpperCase() + slot.type.slice(1);
    document.getElementById('slotLocation').textContent = slot.id;
    
    // Reset duration to default
    selectDuration(2);
    
    // Show modal
    bookingModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close booking modal
function closeBookingModal() {
    bookingModal.classList.remove('active');
    successModal.classList.remove('active');
    document.body.style.overflow = '';
    selectedSlot = null;
}

// Select duration
function selectDuration(hours) {
    currentDuration = hours;
    
    // Update duration buttons
    durationButtons.forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.hours) === hours);
    });
    
    // Update range slider
    durationRange.value = hours;
    
    // Update duration display
    document.getElementById('selectedDuration').textContent = 
        hours === 1 ? '1 hour' : `${hours} hours`;
    
    // Update pricing
    updatePricing();
}

// Update pricing calculation
function updatePricing() {
    const baseRate = 20;
    
    const basePrice = currentDuration * baseRate;
    const totalAmount = basePrice ;
    
    document.getElementById('durationText').textContent = currentDuration;
    document.getElementById('basePrice').textContent = `₹${basePrice.toFixed(2)}`;
    document.getElementById('totalAmount').textContent = `₹${totalAmount.toFixed(2)}`;
}

// Confirm booking
function confirmBooking() {
    if (!selectedSlot) return;
    
    // Show loading state
    confirmBookingBtn.innerHTML = `
        <div class="loading"></div>
        <span>Booking...</span>
    `;
    confirmBookingBtn.disabled = true;
    
    // Simulate booking process
    setTimeout(() => {
        // Update slot status
        selectedSlot.status = 'occupied';
        selectedSlot.occupiedSince = new Date();
        
        // Show success modal
        document.getElementById('successMessage').textContent = 
            `Your parking spot ${selectedSlot.id} has been reserved successfully.`;
        
        bookingModal.classList.remove('active');
        successModal.classList.add('active');
        
        // Re-render layout
        renderParkingLayout();
        updateStats();
        
        // Auto-close success modal
        setTimeout(() => {
            closeBookingModal();
        }, 3000);
        
        // Reset button
        confirmBookingBtn.innerHTML = `
            <i class="fas fa-credit-card"></i>
            <span>Book & Pay</span>
        `;
        confirmBookingBtn.disabled = false;
        
    }, 2000);
}

// Update statistics
function updateStats() {
    let totalSlots = 0;
    let availableSlots = 0;
    let occupiedSlots = 0;
    let reservedSlots = 0;
    
    // Count slots across all levels
    Object.values(parkingData).forEach(level => {
        Object.values(level).forEach(section => {
            section.forEach(slot => {
                totalSlots++;
                switch (slot.status) {
                    case 'available':
                        availableSlots++;
                        break;
                    case 'occupied':
                        occupiedSlots++;
                        break;
                    case 'reserved':
                        reservedSlots++;
                        break;
                }
            });
        });
    });
    
    const occupancyRate = totalSlots > 0 ? ((occupiedSlots / totalSlots) * 100).toFixed(1) : 0;
    
    // Update DOM
    document.getElementById('availableCount').textContent = availableSlots;
    document.getElementById('occupiedCount').textContent = occupiedSlots;
    document.getElementById('reservedCount').textContent = reservedSlots;
    document.getElementById('occupancyRate').textContent = `${occupancyRate}%`;
}

// Simulate real-time updates
function simulateRealTimeUpdates() {
    // Randomly change some slot statuses
    Object.values(parkingData).forEach(level => {
        Object.values(level).forEach(section => {
            section.forEach(slot => {
                if (Math.random() > 0.95) { // 5% chance of status change
                    if (slot.status === 'available') {
                        slot.status = 'occupied';
                        slot.occupiedSince = new Date();
                    } else if (slot.status === 'occupied' && Math.random() > 0.7) {
                        slot.status = 'available';
                        slot.occupiedSince = null;
                    }
                }
            });
        });
    });
    
    // Re-render current level and update stats
    renderParkingLayout();
    updateStats();
}

// Utility functions
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Add some smooth animations
function addRippleEffect(element, event) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Add ripple effect to buttons
document.addEventListener('click', function(e) {
    if (e.target.matches('.btn, .level-btn, .duration-btn')) {
        addRippleEffect(e.target, e);
    }
});

// Add CSS for ripple effect
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .btn, .level-btn, .duration-btn {
        position: relative;
        overflow: hidden;
    }
`;
document.head.appendChild(style);