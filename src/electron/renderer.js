const { ipcRenderer } = require('electron');

// Global state
let scrapedProfiles = [];
let evaluatedProfiles = [];
let agentLogs = { scraper: [], evaluator: [], outreach: [] };
let activeAgents = 0;

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();
    setupEventListeners();
    await loadConfiguration();
    await loadData();
    setupRealTimeUpdates();
});

// Navigation setup
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.getAttribute('data-view');
            
            // Update nav active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Update view active state
            views.forEach(view => view.classList.remove('active'));
            document.getElementById(targetView).classList.add('active');
        });
    });
}

// Event listeners setup
function setupEventListeners() {
    // Configuration form
    const configForm = document.getElementById('config-form');
    configForm.addEventListener('submit', saveConfiguration);

    // CPU slider
    const cpuSlider = document.getElementById('max-cpu');
    const cpuValue = document.getElementById('cpu-value');
    cpuSlider.addEventListener('input', (e) => {
        cpuValue.textContent = e.target.value + '%';
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveConfiguration();
        }
    });
}

// Configuration management
async function loadConfiguration() {
    try {
        const config = await ipcRenderer.invoke('get-config');
        
        document.getElementById('openai-key').value = config.openaiApiKey || '';
        document.getElementById('license-key').value = config.licenseKey || '';
        document.getElementById('max-cpu').value = config.maxCpuUsage || 80;
        document.getElementById('parallel-agents').value = config.parallelAgents || 3;
        document.getElementById('cpu-value').textContent = (config.maxCpuUsage || 80) + '%';
    } catch (error) {
        console.error('Error loading configuration:', error);
        showNotification('Error loading configuration', 'error');
    }
}

async function saveConfiguration(e) {
    if (e) e.preventDefault();
    
    try {
        const config = {
            openaiApiKey: document.getElementById('openai-key').value,
            licenseKey: document.getElementById('license-key').value,
            maxCpuUsage: parseInt(document.getElementById('max-cpu').value),
            parallelAgents: parseInt(document.getElementById('parallel-agents').value)
        };

        await ipcRenderer.invoke('save-config', config);
        showNotification('Configuration saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving configuration:', error);
        showNotification('Error saving configuration', 'error');
    }
}

// Data loading and management
async function loadData() {
    try {
        scrapedProfiles = await ipcRenderer.invoke('get-scraped-profiles');
        evaluatedProfiles = await ipcRenderer.invoke('get-evaluated-profiles');
        agentLogs = await ipcRenderer.invoke('get-agent-logs');
        
        updateDashboardStats();
        updateScrapedTable();
        updateEvaluatedTable();
        updateLogs();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Real-time updates
function setupRealTimeUpdates() {
    // Listen for log updates
    ipcRenderer.on('log-update', (event, logs) => {
        agentLogs = logs;
        updateLogs();
        updateRecentActivity();
    });

    // Listen for scraped profiles updates
    ipcRenderer.on('scraped-profiles-update', (event, profiles) => {
        scrapedProfiles = profiles;
        updateScrapedTable();
        updateDashboardStats();
    });

    // Listen for evaluated profiles updates
    ipcRenderer.on('evaluated-profiles-update', (event, profiles) => {
        evaluatedProfiles = profiles;
        updateEvaluatedTable();
        updateDashboardStats();
    });
}

// Dashboard updates
function updateDashboardStats() {
    document.getElementById('scraped-count').textContent = scrapedProfiles.length;
    document.getElementById('evaluated-count').textContent = evaluatedProfiles.length;
    
    const successRate = scrapedProfiles.length > 0 
        ? Math.round((evaluatedProfiles.length / scrapedProfiles.length) * 100)
        : 0;
    document.getElementById('success-rate').textContent = successRate + '%';
    
    document.getElementById('agents-running').textContent = activeAgents;
}

function updateRecentActivity() {
    const recentLogs = document.getElementById('recent-logs');
    const allLogs = [
        ...agentLogs.scraper.slice(-5),
        ...agentLogs.evaluator.slice(-5),
        ...agentLogs.outreach.slice(-5)
    ].sort().slice(-10);

    recentLogs.innerHTML = allLogs.map(log => 
        `<div class="log-entry">${log}</div>`
    ).join('');
    
    // Auto-scroll to bottom
    recentLogs.scrollTop = recentLogs.scrollHeight;
}

// Table updates
function updateScrapedTable() {
    const container = document.getElementById('scraped-profiles');
    const searchQuery = document.getElementById('profile-search')?.value.toLowerCase() || '';
    const followerFilter = document.getElementById('follower-filter')?.value || 'all';
    const reelsFilter = document.getElementById('reels-filter')?.value || 'all';
    
    if (scrapedProfiles.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 2rem; color: #718096;">
                <svg xmlns="http://www.w3.org/2000/svg" class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 48px; height: 48px; margin: 0 auto 1rem;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p style="font-size: 1.125rem; font-weight: 500; margin-bottom: 0.5rem;">No scraped profiles yet</p>
                <p style="font-size: 0.875rem;">Start the scraper to begin collecting profiles</p>
            </div>
        `;
        return;
    }

    // Filter profiles
    const filteredProfiles = scrapedProfiles.filter(profile => {
        const username = profile.username.toLowerCase();
        const followers = parseInt(profile.metadata?.followers?.replace(/,/g, '') || '0');
        const hasReels = Array.isArray(profile.reels) && profile.reels.length > 0;

        // Apply search filter
        if (searchQuery && !username.includes(searchQuery)) {
            return false;
        }

        // Apply followers filter
        if (followerFilter !== 'all') {
            const minFollowers = parseInt(followerFilter);
            if (followers < minFollowers) {
                return false;
            }
        }

        // Apply reels filter
        if (reelsFilter === 'with-reels' && !hasReels) {
            return false;
        }
        if (reelsFilter === 'no-reels' && hasReels) {
            return false;
        }

        return true;
    });

    container.innerHTML = filteredProfiles.map(profile => {
        const followers = profile.metadata?.followers || '0';
        const following = profile.metadata?.following || '0';
        const bio = profile.content || 'No bio available';
        const reels = Array.isArray(profile.reels) ? profile.reels : [];

        return `
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-username">@${profile.username}</div>
                </div>
                
                <div class="profile-metrics">
                    <div class="metric">
                        <div class="metric-value">${followers}</div>
                        <div class="metric-label">Followers</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${following}</div>
                        <div class="metric-label">Following</div>
                    </div>
                </div>

                <div class="profile-bio">${bio}</div>

                <div class="reels-section">
                    <div class="reels-header">
                        <div class="reels-title">Last 30 reels</div>
                        <div class="reels-count">${reels.length} found</div>
                    </div>
                    <div class="reels-list">
                        ${reels.map(reel => `
                            <div class="reel-item">
                                <a href="${reel.url}" target="_blank" class="reel-link">View Reel</a>
                                <span class="reel-views">${reel.views || 'N/A'} views</span>
                            </div>
                        `).join('')}
                        ${reels.length === 0 ? '<div style="color: #718096; font-size: 0.875rem; text-align: center; padding: 1rem;">No reels found</div>' : ''}
                    </div>
                </div>

                <div class="profile-actions">
                    <button class="action-button view-button" onclick="viewProfile('${profile.username}')">View Details</button>
                    <button class="action-button evaluate-button" onclick="evaluateProfile('${profile.username}')">Evaluate</button>
                </div>
            </div>
        `;
    }).join('');
}

// Add event listeners for filters
document.addEventListener('DOMContentLoaded', () => {
    const profileSearch = document.getElementById('profile-search');
    const followerFilter = document.getElementById('follower-filter');
    const reelsFilter = document.getElementById('reels-filter');

    if (profileSearch) {
        profileSearch.addEventListener('input', () => {
            updateScrapedTable();
        });
    }

    if (followerFilter) {
        followerFilter.addEventListener('change', () => {
            updateScrapedTable();
        });
    }

    if (reelsFilter) {
        reelsFilter.addEventListener('change', () => {
            updateScrapedTable();
        });
    }
});

function updateEvaluatedTable() {
    const tbody = document.getElementById('evaluated-tbody');
    
    if (evaluatedProfiles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #718096;">No evaluated profiles yet</td></tr>';
        return;
    }

    tbody.innerHTML = evaluatedProfiles.map(profile => `
        <tr>
            <td>${profile.username}</td>
            <td><span class="status-badge status-active">${profile.platform}</span></td>
            <td>${profile.score || 'N/A'}</td>
            <td><span class="status-badge status-completed">Evaluated</span></td>
            <td>${new Date(profile.evaluationDate || Date.now()).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-primary" onclick="viewEvaluation('${profile.username}')">Details</button>
            </td>
        </tr>
    `).join('');
}

// Logs updates
function updateLogs() {
    updateLogContainer('scraper-logs', agentLogs.scraper);
    updateLogContainer('evaluator-logs', agentLogs.evaluator);
    updateLogContainer('outreach-logs', agentLogs.outreach);
}

function updateLogContainer(containerId, logs) {
    const container = document.getElementById(containerId);
    container.innerHTML = logs.map(log => 
        `<div class="log-entry">${log}</div>`
    ).join('');
    
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Agent control functions
async function startScraper() {
    const referenceAccount = document.getElementById('reference-account').value;
    
    if (!referenceAccount) {
        showNotification('Please enter a reference account username', 'error');
        return;
    }

    try {
        activeAgents++;
        updateDashboardStats();
        showNotification('Starting scraper agent...', 'info');
        
        const result = await ipcRenderer.invoke('start-scraper', referenceAccount);
        
        if (result.success) {
            showNotification('Scraper started successfully!', 'success');
        } else {
            showNotification(`Scraper failed: ${result.error}`, 'error');
            activeAgents--;
        }
    } catch (error) {
        console.error('Error starting scraper:', error);
        showNotification('Error starting scraper', 'error');
        activeAgents--;
    }
    
    updateDashboardStats();
}

async function startEvaluator() {
    if (scrapedProfiles.length === 0) {
        showNotification('No scraped profiles available for evaluation', 'error');
        return;
    }

    try {
        activeAgents++;
        updateDashboardStats();
        showNotification('Starting evaluator agent...', 'info');
        
        const result = await ipcRenderer.invoke('start-evaluator', scrapedProfiles);
        
        if (result.success) {
            showNotification('Evaluator started successfully!', 'success');
        } else {
            showNotification(`Evaluator failed: ${result.error}`, 'error');
            activeAgents--;
        }
    } catch (error) {
        console.error('Error starting evaluator:', error);
        showNotification('Error starting evaluator', 'error');
        activeAgents--;
    }
    
    updateDashboardStats();
}

async function stopAgents() {
    try {
        showNotification('Stopping all agents...', 'info');
        
        const result = await ipcRenderer.invoke('stop-agents');
        
        if (result.success) {
            activeAgents = 0;
            updateDashboardStats();
            
            // Refresh scraped data after stopping
            await refreshScrapedData();
            
            showNotification('All agents stopped successfully!', 'success');
        } else {
            showNotification(`Error stopping agents: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error stopping agents:', error);
        showNotification('Error stopping agents', 'error');
    }
}

// Export functions
async function exportCSV(type) {
    try {
        let data = [];
        let filename = '';
        
        if (type === 'scraped') {
            data = scrapedProfiles;
            filename = 'scraped_profiles.csv';
        } else if (type === 'evaluated') {
            data = evaluatedProfiles;
            filename = 'evaluated_profiles.csv';
        }
        
        if (data.length === 0) {
            showNotification('No data to export', 'error');
            return;
        }
        
        const result = await ipcRenderer.invoke('export-csv', data, filename);
        
        if (result.success) {
            showNotification(`Data exported successfully to ${result.path}`, 'success');
        } else {
            showNotification(`Export failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error exporting CSV:', error);
        showNotification('Error exporting CSV', 'error');
    }
}

// Refresh functions
async function refreshScrapedData() {
    try {
        scrapedProfiles = await ipcRenderer.invoke('get-scraped-profiles');
        updateScrapedTable();
        updateDashboardStats();
        showNotification('Scraped data refreshed', 'success');
    } catch (error) {
        console.error('Error refreshing scraped data:', error);
        showNotification('Error refreshing data', 'error');
    }
}

async function refreshEvaluatedData() {
    try {
        evaluatedProfiles = await ipcRenderer.invoke('get-evaluated-profiles');
        updateEvaluatedTable();
        updateDashboardStats();
        showNotification('Evaluated data refreshed', 'success');
    } catch (error) {
        console.error('Error refreshing evaluated data:', error);
        showNotification('Error refreshing data', 'error');
    }
}

// Utility functions
function viewProfile(username) {
    const profile = scrapedProfiles.find(p => p.username === username);
    if (profile) {
        const followers = profile.metadata?.followers || '0';
        const following = profile.metadata?.following || '0';
        const suggestedAccounts = profile.metadata?.suggested_accounts || [];
        const bio = profile.content || 'No bio available';
        const reels = Array.isArray(profile.reels) ? profile.reels : [];
        
        const modalContent = `
            <div style="padding: 1.5rem;">
                <h2 style="margin-bottom: 1rem; font-size: 1.5rem; font-weight: 600;">@${profile.username}</h2>
                
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Profile Info</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; background: #f7fafc; padding: 1rem; border-radius: 0.5rem;">
                        <div>
                            <div style="font-weight: 600;">${followers}</div>
                            <div style="color: #718096; font-size: 0.875rem;">Followers</div>
                        </div>
                        <div>
                            <div style="font-weight: 600;">${following}</div>
                            <div style="color: #718096; font-size: 0.875rem;">Following</div>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Bio</h3>
                    <p style="color: #4a5568; white-space: pre-wrap;">${bio}</p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Reels (${reels.length})</h3>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${reels.map(reel => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid #e2e8f0;">
                                <a href="${reel.url}" target="_blank" style="color: #4299e1; text-decoration: none;">View Reel</a>
                                <span style="color: #718096;">${reel.views || 'N/A'} views</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Suggested Accounts (${suggestedAccounts.length})</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${suggestedAccounts.map(account => `
                            <span style="background: #e2e8f0; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem;">@${account}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        // Create and show modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const modalDialog = document.createElement('div');
        modalDialog.style.cssText = `
            background: white;
            border-radius: 0.5rem;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
        `;

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            font-size: 1.5rem;
            background: none;
            border: none;
            cursor: pointer;
            color: #718096;
        `;
        closeButton.onclick = () => modal.remove();

        modalDialog.innerHTML = modalContent;
        modalDialog.appendChild(closeButton);
        modal.appendChild(modalDialog);
        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

function viewEvaluation(username) {
    const evaluation = evaluatedProfiles.find(p => p.username === username);
    if (evaluation) {
        alert(`Evaluation for: ${username}\nScore: ${evaluation.score}\nDetails: ${evaluation.details || 'No details available'}`);
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '600',
        zIndex: '9999',
        maxWidth: '400px',
        opacity: '0',
        transform: 'translateX(100%)',
        transition: 'all 0.3s ease'
    });
    
    // Set background color based on type
    const colors = {
        success: '#48bb78',
        error: '#f56565',
        info: '#667eea',
        warning: '#ed8936'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000);
} 