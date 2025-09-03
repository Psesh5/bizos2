// BusinessOS Signup Flow JavaScript

let currentStep = 1;
let userData = {};

// Initialize signup flow
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    updateStepVisibility();
    initializeDarkMode();
});

function setupEventListeners() {
    // Role selector change
    const roleSelect = document.getElementById('role');
    const customRoleGroup = document.getElementById('customRoleGroup');
    
    roleSelect.addEventListener('change', function() {
        if (this.value === 'other') {
            customRoleGroup.style.display = 'block';
            document.getElementById('customRole').required = true;
        } else {
            customRoleGroup.style.display = 'none';
            document.getElementById('customRole').required = false;
        }
    });
    
    // Company search functionality
    const companySearchInput = document.getElementById('companySearch');
    let searchTimeout;
    
    companySearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value;
        
        if (query.length < 2) {
            hideCompanyDropdown();
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchCompanies(query);
        }, 300);
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.company-search-container')) {
            hideCompanyDropdown();
        }
    });
    
    // Details form submission
    const detailsForm = document.getElementById('detailsForm');
    detailsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleDetailsSubmission();
    });
    
    // Pack selection changes
    const packInputs = document.querySelectorAll('input[name="packs"]');
    packInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            // Special handling for competitive pack
            if (this.id === 'competitive-pack' && !this.checked) {
                const peerInput = document.querySelector('.peer-input');
                if (peerInput && peerInput.value.trim()) {
                    console.log('Preventing competitive pack from being unchecked - has input content');
                    this.checked = true;
                    e.preventDefault();
                    return false;
                }
            }
            updatePackSelectionWithPremium();
        });
    });
    
    // Premium pack setup functionality
    setupPremiumPackHandlers();
}

function handleDetailsSubmission() {
    // Collect form data
    const formData = new FormData(document.getElementById('detailsForm'));
    userData.fullName = formData.get('fullName');
    userData.email = formData.get('email');
    userData.selectedCompany = formData.get('selectedCompany');
    userData.companyTicker = formData.get('companyTicker');
    userData.role = formData.get('role');
    userData.customRole = formData.get('customRole');
    
    // Basic validation
    if (!userData.fullName || !userData.email || !userData.selectedCompany || !userData.role) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Parse company data
    if (userData.selectedCompany) {
        try {
            userData.company = JSON.parse(userData.selectedCompany);
        } catch (e) {
            console.error('Error parsing company data:', e);
            alert('Please select a valid company from the search results.');
            return;
        }
    }
    
    // Proceed to next step
    goToStep(2);
}

function updatePackSelection() {
    // Update userData with selected packs
    const selectedPacks = Array.from(document.querySelectorAll('input[name="packs"]:checked'))
        .map(input => input.value);
    userData.selectedPacks = selectedPacks;
    
    // Save to localStorage for use in dashboard
    localStorage.setItem('userPacks', JSON.stringify(selectedPacks));
    
    console.log('Selected packs:', selectedPacks);
}

function goToStep(step) {
    if (step < 1 || step > 3) return;
    
    // Hide current step
    document.querySelectorAll('.signup-step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show new step
    document.getElementById(`step${step}`).classList.add('active');
    
    // Update progress bar
    document.querySelectorAll('.progress-step').forEach(el => {
        el.classList.remove('active');
    });
    
    for (let i = 1; i <= step; i++) {
        document.querySelector(`[data-step="${i}"]`).classList.add('active');
    }
    
    currentStep = step;
    
    // Handle step-specific actions
    if (step === 3) {
        startDashboardSetup();
    }
}

function updateStepVisibility() {
    // Ensure only current step is visible
    document.querySelectorAll('.signup-step').forEach((step, index) => {
        if (index + 1 === currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

function startDashboardSetup() {
    // Simulate setup process
    console.log('Starting dashboard setup with user data:', userData);
    
    // Store user data in localStorage for dashboard
    localStorage.setItem('businessos_user_data', JSON.stringify(userData));
    
    // Simulate setup steps
    setTimeout(() => {
        // Step 1: Workspace created
        updateSetupStep(0, 'completed');
        
        setTimeout(() => {
            // Step 2: Packs configured
            updateSetupStep(1, 'completed');
            
            setTimeout(() => {
                // Step 3: Dashboard ready
                updateSetupStep(2, 'completed');
                
                // Show enter dashboard button
                document.getElementById('enterDashboard').style.display = 'block';
            }, 1000);
        }, 1500);
    }, 1000);
}

function updateSetupStep(stepIndex, status) {
    const setupItems = document.querySelectorAll('.setup-item');
    const setupCheck = setupItems[stepIndex].querySelector('.setup-check');
    
    if (status === 'completed') {
        setupCheck.textContent = '✓';
        setupCheck.classList.remove('loading');
        setupCheck.style.color = '#10b981';
        
        // Start next step if exists
        if (stepIndex + 1 < setupItems.length) {
            const nextCheck = setupItems[stepIndex + 1].querySelector('.setup-check');
            nextCheck.textContent = '⏳';
            nextCheck.classList.add('loading');
        }
    }
}

function enterDashboard() {
    // Add some visual feedback
    const btn = document.getElementById('enterDashboard');
    btn.textContent = 'Loading Dashboard...';
    btn.disabled = true;
    
    // Redirect to dashboard after brief delay
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

// Helper function to get user display name
function getDisplayName() {
    if (userData.fullName) {
        return userData.fullName.split(' ')[0]; // First name
    }
    return 'User';
}

// Helper function to get role display
function getRoleDisplay() {
    if (userData.role === 'other' && userData.customRole) {
        return userData.customRole;
    }
    
    const roleLabels = {
        'ceo': 'CEO / Founder',
        'cfo': 'CFO / Finance',
        'cto': 'CTO / Engineering', 
        'cmo': 'CMO / Marketing',
        'coo': 'COO / Operations',
        'hr': 'HR / People',
        'analyst': 'Analyst',
        'manager': 'Manager'
    };
    
    return roleLabels[userData.role] || userData.role;
}

// Export user data for dashboard use
window.getSignupData = function() {
    return userData;
};

// Dark mode functionality
function initializeDarkMode() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('businessos_theme_mode') || 'light';
    applyTheme(savedTheme);
}

function toggleDarkMode() {
    const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    
    // Save preference
    localStorage.setItem('businessos_theme_mode', newTheme);
}

function applyTheme(theme) {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    
    if (theme === 'dark') {
        body.classList.add('dark-mode');
        themeIcon.textContent = '☀️';
        themeToggle.title = 'Switch to light mode';
    } else {
        body.classList.remove('dark-mode');
        themeIcon.textContent = '🌙';
        themeToggle.title = 'Switch to dark mode';
    }
}

// Company search functionality
async function searchCompanies(query) {
    if (!window.apiService) {
        console.error('API service not available');
        return;
    }
    
    try {
        showCompanySearchLoading();
        const results = await window.apiService.searchCompanies(query);
        renderCompanyResults(results.slice(0, 8));
    } catch (error) {
        console.error('Error searching companies:', error);
        hideCompanyDropdown();
    }
}

function showCompanySearchLoading() {
    const dropdown = document.getElementById('companyDropdown');
    dropdown.innerHTML = `
        <div class="company-search-loading">
            <div class="loading-spinner">⏳</div>
            <span>Searching companies...</span>
        </div>
    `;
    dropdown.style.display = 'block';
}

function renderCompanyResults(companies) {
    const dropdown = document.getElementById('companyDropdown');
    
    if (companies.length === 0) {
        dropdown.innerHTML = `
            <div class="no-company-results">
                <span>No companies found. Try a different search term.</span>
            </div>
        `;
        return;
    }
    
    dropdown.innerHTML = companies.map(company => `
        <div class="company-search-result" onclick="selectCompany('${company.symbol}', '${encodeURIComponent(JSON.stringify(company))}')">
            <div class="company-search-logo">
                <img src="https://financialmodelingprep.com/image-stock/${company.symbol}.png" 
                     alt="${company.symbol}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                     onload="this.style.display='block'; this.nextElementSibling.style.display='none';"
                     style="display: none;">
                <div class="company-logo-placeholder" style="display: flex;">${company.symbol}</div>
            </div>
            <div class="company-search-info">
                <div class="company-search-name">${company.name}</div>
                <div class="company-search-meta">
                    <span class="company-search-ticker">${company.symbol}</span>
                    <span class="company-search-exchange">${company.exchangeShortName}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    dropdown.style.display = 'block';
}

function selectCompany(symbol, encodedCompanyData) {
    try {
        const company = JSON.parse(decodeURIComponent(encodedCompanyData));
        
        // Store the selected company data
        document.getElementById('selectedCompany').value = JSON.stringify(company);
        document.getElementById('companyTicker').value = symbol;
        
        // Show selected company display
        showSelectedCompany(company);
        
        // Hide search input and dropdown
        document.getElementById('companySearch').style.display = 'none';
        hideCompanyDropdown();
        
        console.log('Selected company:', company);
    } catch (error) {
        console.error('Error selecting company:', error);
    }
}

function showSelectedCompany(company) {
    const display = document.getElementById('selectedCompanyDisplay');
    const nameEl = document.getElementById('selectedCompanyName');
    const tickerEl = document.getElementById('selectedCompanyTicker');
    const exchangeEl = document.getElementById('selectedCompanyExchange');
    const logoEl = document.getElementById('selectedCompanyLogo');
    const placeholderEl = document.getElementById('selectedCompanyPlaceholder');
    
    nameEl.textContent = company.name;
    tickerEl.textContent = company.symbol;
    exchangeEl.textContent = company.exchangeShortName;
    
    // Load company logo
    const logoUrl = `https://financialmodelingprep.com/image-stock/${company.symbol}.png`;
    logoEl.src = logoUrl;
    logoEl.alt = company.symbol;
    placeholderEl.textContent = company.symbol;
    
    // Show logo if it loads successfully, otherwise show placeholder
    logoEl.onload = function() {
        logoEl.style.display = 'block';
        placeholderEl.style.display = 'none';
    };
    
    logoEl.onerror = function() {
        logoEl.style.display = 'none';
        placeholderEl.style.display = 'flex';
    };
    
    display.style.display = 'block';
}

function clearCompanySelection() {
    // Clear form data
    document.getElementById('selectedCompany').value = '';
    document.getElementById('companyTicker').value = '';
    document.getElementById('companySearch').value = '';
    
    // Show search input again
    document.getElementById('companySearch').style.display = 'block';
    document.getElementById('selectedCompanyDisplay').style.display = 'none';
    
    // Focus on search input
    document.getElementById('companySearch').focus();
}

function hideCompanyDropdown() {
    const dropdown = document.getElementById('companyDropdown');
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
}

// Premium pack setup handlers
function setupPremiumPackHandlers() {
    const competitivePackInput = document.getElementById('competitive-pack');
    const premiumSetup = document.querySelector('.premium-setup');
    
    if (competitivePackInput && premiumSetup) {
        // Show/hide setup section based on checkbox
        competitivePackInput.addEventListener('change', function() {
            console.log('Competitive pack checkbox changed:', this.checked);
            if (this.checked) {
                console.log('Showing competitive pack setup');
                premiumSetup.style.display = 'block';
                // Animate in
                setTimeout(() => {
                    premiumSetup.style.opacity = '1';
                    premiumSetup.style.transform = 'translateY(0)';
                    // Re-setup input handlers when showing the premium setup
                    setupCompetitorInput();
                    setupSectorSelect();
                    setupPhrasesInput();
                }, 10);
            } else {
                console.log('Hiding competitive pack setup');
                // Check if this is an unintentional unchecking
                const peerInput = document.querySelector('.peer-input');
                if (peerInput && peerInput.value.trim()) {
                    console.log('Preventing pack collapse - input has content:', peerInput.value);
                    // Re-check the box
                    this.checked = true;
                    return;
                }
                
                premiumSetup.style.opacity = '0';
                premiumSetup.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    premiumSetup.style.display = 'none';
                }, 200);
                // Clear values when hiding
                clearPremiumSetup();
            }
        });
        
        // Setup input handlers
        setupCompetitorInput();
        setupSectorSelect();
        setupPhrasesInput();
    }
}

function setupCompetitorInput() {
    const peerInput = document.querySelector('.peer-input');
    if (!peerInput) return;
    
    // Remove any existing dropdown container to prevent duplicates
    const existingDropdown = peerInput.parentNode.querySelector('.competitor-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }
    
    // Create fresh dropdown container for competitor search
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'competitor-dropdown';
    dropdownContainer.style.display = 'none';
    peerInput.parentNode.appendChild(dropdownContainer);
    
    let searchTimeout;
    let selectedCompetitors = [];
    
    // Search as user types
    peerInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        // If user is typing a new search term (ends with comma or space)
        const lastWord = query.split(/[,\s]+/).pop();
        
        if (lastWord.length >= 2) {
            searchTimeout = setTimeout(() => {
                searchCompetitors(lastWord, dropdownContainer);
            }, 300);
        } else if (lastWord.length === 0 && query.endsWith(', ')) {
            // User just finished adding a company, show helper message
            dropdownContainer.innerHTML = `
                <div class="competitor-search-message">
                    <span>💡 Continue typing to add more competitors...</span>
                </div>
            `;
            dropdownContainer.style.display = 'block';
        } else {
            hideCompetitorDropdown(dropdownContainer);
        }
    });
    
    // Handle enter key to search
    peerInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = this.value.trim().split(/[,\s]+/).pop();
            if (query.length >= 2) {
                searchCompetitors(query, dropdownContainer);
            }
        }
    });
    
    peerInput.addEventListener('blur', function() {
        // Only hide dropdown if input is empty or user hasn't been actively searching
        setTimeout(() => {
            const currentValue = this.value.trim();
            
            // Ensure competitive pack stays checked when input has content
            if (currentValue) {
                const competitivePack = document.getElementById('competitive-pack');
                if (competitivePack && !competitivePack.checked) {
                    console.log('Re-checking competitive pack due to input content');
                    competitivePack.checked = true;
                }
            }
            
            if (!currentValue || currentValue.endsWith(', ')) {
                // Don't hide if user has entered companies and might want to add more
                const peers = currentValue.replace(/,\s*$/, ''); // Remove trailing comma
                if (peers) {
                    validateCompetitorTickers(peers);
                }
            } else {
                hideCompetitorDropdown(dropdownContainer);
            }
        }, 200);
    });
    
    // Add placeholder helper text
    peerInput.addEventListener('focus', function() {
        if (!this.dataset.helpShown) {
            this.placeholder = 'Start typing competitor names (e.g., Apple, Microsoft, Google)';
            this.dataset.helpShown = true;
        }
    });
    
    // Hide dropdown when clicking outside, but don't affect the pack checkbox
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.setup-section') && !e.target.closest('.competitor-dropdown')) {
            hideCompetitorDropdown(dropdownContainer);
        }
    });
}

function setupSectorSelect() {
    const sectorSelect = document.querySelector('.sector-select');
    if (!sectorSelect) return;
    
    sectorSelect.addEventListener('change', function() {
        const selected = Array.from(this.selectedOptions).map(option => option.value);
        console.log('Selected sectors:', selected);
        
        // Store in userData for later use
        if (!userData.premiumSettings) {
            userData.premiumSettings = {};
        }
        userData.premiumSettings.selectedSectors = selected;
    });
}

function setupPhrasesInput() {
    const phrasesInput = document.querySelector('.phrases-input');
    if (!phrasesInput) return;
    
    phrasesInput.addEventListener('blur', function() {
        const phrases = this.value.trim();
        if (phrases) {
            const phraseList = phrases.split(',').map(p => p.trim()).filter(p => p.length > 0);
            console.log('Monitor phrases:', phraseList);
            
            // Store in userData
            if (!userData.premiumSettings) {
                userData.premiumSettings = {};
            }
            userData.premiumSettings.monitorPhrases = phraseList;
        }
    });
}

function validateCompetitorTickers(tickersString) {
    const tickers = tickersString.split(',').map(t => t.trim().toUpperCase()).filter(t => t.length > 0);
    
    // Basic ticker validation (1-5 characters, letters only)
    const validTickers = tickers.filter(ticker => /^[A-Z]{1,5}$/.test(ticker));
    const invalidTickers = tickers.filter(ticker => !/^[A-Z]{1,5}$/.test(ticker));
    
    if (invalidTickers.length > 0) {
        console.warn('Invalid tickers detected:', invalidTickers);
        // You could show a validation message here
    }
    
    // Store valid tickers in userData
    if (!userData.premiumSettings) {
        userData.premiumSettings = {};
    }
    userData.premiumSettings.competitorTickers = validTickers;
    
    console.log('Valid competitor tickers:', validTickers);
    
    return validTickers;
}

function clearPremiumSetup() {
    const peerInput = document.querySelector('.peer-input');
    const phrasesInput = document.querySelector('.phrases-input');
    const sectorSelect = document.querySelector('.sector-select');
    
    if (peerInput) {
        peerInput.value = '';
        // Remove any existing dropdown
        const existingDropdown = peerInput.parentNode.querySelector('.competitor-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }
    }
    if (phrasesInput) phrasesInput.value = '';
    if (sectorSelect) {
        Array.from(sectorSelect.options).forEach(option => {
            option.selected = false;
        });
    }
    
    // Clear from userData
    if (userData.premiumSettings) {
        delete userData.premiumSettings.competitorTickers;
        delete userData.premiumSettings.selectedSectors;
        delete userData.premiumSettings.monitorPhrases;
        
        if (Object.keys(userData.premiumSettings).length === 0) {
            delete userData.premiumSettings;
        }
    }
}

// Update pack selection to handle premium settings
function updatePackSelectionWithPremium() {
    // Check if competitive pack should stay checked due to input content
    const competitivePack = document.getElementById('competitive-pack');
    const peerInput = document.querySelector('.peer-input');
    
    if (competitivePack && peerInput && peerInput.value.trim() && !competitivePack.checked) {
        console.log('Forcing competitive pack to stay checked due to input content');
        competitivePack.checked = true;
    }
    
    // Call original function
    updatePackSelection();
    
    // Handle competitive intelligence pack specifically
    const competitivePackSelected = document.getElementById('competitive-pack')?.checked;
    
    if (competitivePackSelected) {
        // Ensure premium settings are captured
        const peerInput = document.querySelector('.peer-input');
        const phrasesInput = document.querySelector('.phrases-input');
        const sectorSelect = document.querySelector('.sector-select');
        
        if (peerInput?.value.trim()) {
            validateCompetitorTickers(peerInput.value.trim());
        }
        
        if (phrasesInput?.value.trim()) {
            const phraseList = phrasesInput.value.trim().split(',').map(p => p.trim()).filter(p => p.length > 0);
            if (!userData.premiumSettings) userData.premiumSettings = {};
            userData.premiumSettings.monitorPhrases = phraseList;
        }
        
        if (sectorSelect) {
            const selected = Array.from(sectorSelect.selectedOptions).map(option => option.value);
            if (!userData.premiumSettings) userData.premiumSettings = {};
            userData.premiumSettings.selectedSectors = selected;
        }
    }
}

// Competitor search functionality
async function searchCompetitors(query, dropdownContainer) {
    if (!window.apiService) {
        console.error('API service not available');
        return;
    }
    
    try {
        showCompetitorSearchLoading(dropdownContainer);
        const results = await window.apiService.searchCompanies(query);
        renderCompetitorResults(results.slice(0, 6), dropdownContainer);
    } catch (error) {
        console.error('Error searching competitors:', error);
        hideCompetitorDropdown(dropdownContainer);
    }
}

function showCompetitorSearchLoading(dropdownContainer) {
    dropdownContainer.innerHTML = `
        <div class="competitor-search-loading">
            <div class="loading-spinner">⏳</div>
            <span>Searching competitors...</span>
        </div>
    `;
    dropdownContainer.style.display = 'block';
}

function renderCompetitorResults(companies, dropdownContainer) {
    if (companies.length === 0) {
        dropdownContainer.innerHTML = `
            <div class="no-competitor-results">
                <span>No competitors found. Try a different search term.</span>
            </div>
        `;
        return;
    }
    
    dropdownContainer.innerHTML = companies.map(company => `
        <div class="competitor-search-result" onclick="selectCompetitor('${company.symbol}', '${company.name}')">
            <div class="competitor-search-logo">
                <img src="https://financialmodelingprep.com/image-stock/${company.symbol}.png" 
                     alt="${company.symbol}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                     onload="this.style.display='block'; this.nextElementSibling.style.display='none';"
                     style="display: none;">
                <div class="competitor-logo-placeholder" style="display: flex;">${company.symbol}</div>
            </div>
            <div class="competitor-search-info">
                <div class="competitor-search-name">${company.name}</div>
                <div class="competitor-search-meta">
                    <span class="competitor-search-ticker">${company.symbol}</span>
                    <span class="competitor-search-exchange">${company.exchangeShortName}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    dropdownContainer.style.display = 'block';
}

function selectCompetitor(symbol, name) {
    const peerInput = document.querySelector('.peer-input');
    if (!peerInput) return;
    
    // Get current value and split by commas/spaces
    const currentValue = peerInput.value.trim();
    const parts = currentValue.split(/[,\s]+/).filter(part => part.length > 0);
    
    // Check if this symbol is already added
    if (parts.includes(symbol)) {
        console.log('Competitor already added:', symbol);
        return;
    }
    
    // Remove the last part (partial search) and add the selected company
    if (parts.length > 0) {
        parts.pop(); // Remove last partial search
    }
    parts.push(symbol);
    
    // Update input value - ready for next entry
    peerInput.value = parts.join(', ') + ', ';
    
    // Clear the dropdown but keep it visible for next search
    const dropdownContainer = document.querySelector('.competitor-dropdown');
    dropdownContainer.innerHTML = `
        <div class="competitor-search-message">
            <span>✅ Added ${symbol}. Type to search for more competitors...</span>
        </div>
    `;
    
    // Focus back on input for next entry
    setTimeout(() => {
        peerInput.focus();
    }, 100);
    
    // Update premium settings
    validateCompetitorTickers(peerInput.value.trim());
    
    console.log('Added competitor:', symbol, name);
    
    // Ensure the competitive intelligence pack stays checked
    const competitivePack = document.getElementById('competitive-pack');
    if (competitivePack) {
        if (!competitivePack.checked) {
            console.warn('Competitive pack was unchecked, re-checking it');
            competitivePack.checked = true;
            
            // Also ensure the premium setup stays visible
            const premiumSetup = document.querySelector('.premium-setup');
            if (premiumSetup) {
                premiumSetup.style.display = 'block';
                premiumSetup.style.opacity = '1';
                premiumSetup.style.transform = 'translateY(0)';
            }
        }
    }
}

function hideCompetitorDropdown(dropdownContainer) {
    dropdownContainer.style.display = 'none';
    dropdownContainer.innerHTML = '';
}

// Debug function
window.debugSignup = function() {
    console.log('Current step:', currentStep);
    console.log('User data:', userData);
    return { currentStep, userData };
};