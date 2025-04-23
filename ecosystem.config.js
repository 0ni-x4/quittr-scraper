module.exports = {
  apps: [
    {
      name: 'master-agent',
      script: 'dist/masterAgent.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        AGENT_ROLE: 'master'
      }
    },
    {
      name: 'scraper-agent',
      script: 'dist/subagents/scraperAgent.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        AGENT_ROLE: 'scraper'
      }
    },
    {
      name: 'evaluator-agent',
      script: 'dist/subagents/evaluatorAgent.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        AGENT_ROLE: 'evaluator'
      }
    },
    {
      name: 'outreach-agent',
      script: 'dist/subagents/outreachAgent.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        AGENT_ROLE: 'outreach'
      }
    }
  ]
}; 