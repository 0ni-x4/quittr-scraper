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
    const tbody = document.getElementById('scraped-profiles');
    
    if (scrapedProfiles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #718096;">No scraped profiles yet</td></tr>';
        return;
    }

    tbody.innerHTML = scrapedProfiles.map(profile => `
        <tr>
            <td>${profile.username}</td>
            <td>${profile.metadata?.followers || '0'}</td>
            <td><span class="status-badge status-completed">Scraped</span></td>
            <td>
                <button class="btn btn-primary" onclick="viewProfile('${profile.username}')">View</button>
            </td>
        </tr>
    `).join('');
}

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
        const suggestedAccounts = profile.metadata?.suggested_accounts || [];
        const bio = profile.content || 'No bio available';
        
        alert(`Profile: ${username}\nPlatform: ${profile.platform}\nFollowers: ${followers}\nBio: ${bio}\nSuggested Accounts: ${suggestedAccounts.length} found`);
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