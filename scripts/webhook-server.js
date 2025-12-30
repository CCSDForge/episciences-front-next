#!/usr/bin/env node

/**
 * Webhook server for on-demand resource regeneration
 * Supports concurrent builds with per-journal locking and queueing
 *
 * Features:
 * - Multi-journal support with isolated builds
 * - Concurrent builds for different journals
 * - Queue management (max 10 per journal)
 * - Build progress tracking
 * - Optional deployment script execution
 * - Comprehensive API with status codes
 *
 * Usage:
 *   npm run webhook
 *   or
 *   node scripts/webhook-server.js
 *
 * Environment Variables:
 *   WEBHOOK_PORT       - Server port (default: 3001)
 *   DEPLOY_SCRIPT      - Path to deployment script (optional)
 *   MAX_QUEUE_PER_JOURNAL - Max queued builds per journal (default: 10)
 */

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Server configuration
const PORT = process.env.WEBHOOK_PORT || 3001;
const DEPLOY_SCRIPT = process.env.DEPLOY_SCRIPT || null;
const MAX_QUEUE_PER_JOURNAL = parseInt(process.env.MAX_QUEUE_PER_JOURNAL || '10', 10);
const REBUILD_SCRIPT = path.join(__dirname, 'rebuild-resource.js');
const LOG_FILE = path.join(process.cwd(), 'logs', 'webhook-server.log');
const JOURNALS_FILE = path.join(process.cwd(), 'external-assets', 'journals.txt');

// Build manager class
class BuildManager {
  constructor() {
    this.activeBuildsByJournal = new Map(); // journalCode -> buildInfo
    this.queueByJournal = new Map();         // journalCode -> Array<buildTask>
    this.buildHistory = new Map();            // buildId -> buildInfo
    this.maxHistorySize = 100;                // Keep last 100 builds
    this.serverStartTime = new Date();
    this.stats = {
      totalBuilds: 0,
      successfulBuilds: 0,
      failedBuilds: 0,
      apiErrors: 0
    };
  }

  /**
   * Generate unique build ID
   */
  generateBuildId(journalCode, resourceType, resourceId, pageName) {
    const timestamp = Date.now();
    const id = resourceId || pageName || 'full';
    return `${journalCode}-${resourceType}-${id}-${timestamp}`;
  }

  /**
   * Check if a build is currently active for a journal
   */
  isJournalBuilding(journalCode) {
    return this.activeBuildsByJournal.has(journalCode);
  }

  /**
   * Get queue length for a journal
   */
  getQueueLength(journalCode) {
    const queue = this.queueByJournal.get(journalCode);
    return queue ? queue.length : 0;
  }

  /**
   * Get current queue position for a journal
   */
  getQueuePosition(journalCode) {
    return this.getQueueLength(journalCode);
  }

  /**
   * Estimate wait time based on queue position (rough estimate)
   */
  estimateWaitTime(queuePosition) {
    if (queuePosition === 0) return '0s';
    // Rough estimate: 30s per build in queue
    const seconds = queuePosition * 30;
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }

  /**
   * Add build to queue or execute immediately
   */
  async queueBuild(buildRequest) {
    const { journalCode, resourceType, resourceId, pageName, deploy } = buildRequest;
    const buildId = this.generateBuildId(journalCode, resourceType, resourceId, pageName);

    // Create build info
    const buildInfo = {
      buildId,
      journalCode,
      resourceType,
      resourceId: resourceId || null,
      pageName: pageName || null,
      deploy,
      status: 'queued',
      queuedAt: new Date(),
      startedAt: null,
      completedAt: null,
      duration: null,
      logs: [],
      error: null,
      outputPath: null
    };

    // Store in history
    this.buildHistory.set(buildId, buildInfo);
    this.cleanupHistory();

    // Check if journal is currently building
    if (this.isJournalBuilding(journalCode)) {
      // Check queue limit
      const queueLength = this.getQueueLength(journalCode);
      if (queueLength >= MAX_QUEUE_PER_JOURNAL) {
        buildInfo.status = 'rejected';
        buildInfo.error = `Queue full for journal ${journalCode} (max ${MAX_QUEUE_PER_JOURNAL})`;
        return {
          status: 'rejected',
          statusCode: 503,
          buildInfo
        };
      }

      // Add to queue
      if (!this.queueByJournal.has(journalCode)) {
        this.queueByJournal.set(journalCode, []);
      }
      this.queueByJournal.get(journalCode).push(buildInfo);

      log(`Build ${buildId} queued (position ${queueLength + 1})`);

      return {
        status: 'queued',
        statusCode: 203,
        buildInfo,
        queuePosition: queueLength
      };
    }

    // Execute immediately
    buildInfo.status = 'processing';
    buildInfo.startedAt = new Date();
    this.activeBuildsByJournal.set(journalCode, buildInfo);

    log(`Build ${buildId} started immediately`);

    // Execute build asynchronously
    this.executeBuild(buildInfo).catch(error => {
      log(`Unexpected error in build execution: ${error.message}`);
    });

    return {
      status: 'processing',
      statusCode: 202,
      buildInfo,
      queuePosition: 0
    };
  }

  /**
   * Execute a build
   */
  async executeBuild(buildInfo) {
    const { buildId, journalCode, resourceType, resourceId, pageName, deploy } = buildInfo;

    const identifier = resourceId || pageName || 'full';
    log(`Executing build ${buildId}: ${resourceType} ${identifier} for ${journalCode}`);

    this.stats.totalBuilds++;

    // Prepare command arguments
    const args = [
      REBUILD_SCRIPT,
      '--journal', journalCode,
      '--type', resourceType
    ];

    if (resourceId) {
      args.push('--id', resourceId);
    }

    if (pageName) {
      args.push('--page', pageName);
    }

    // Spawn the rebuild process
    const childProcess = spawn('node', args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Collect logs
    let outputBuffer = '';
    let errorBuffer = '';

    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      outputBuffer += output;
      buildInfo.logs.push(output.trim());

      // Try to parse JSON logs for progress
      const lines = output.split('\n');
      lines.forEach(line => {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'build_config') {
            buildInfo.phase = 'configuration';
          } else if (parsed.type === 'build_executing') {
            buildInfo.phase = 'building';
          } else if (parsed.type === 'api_error') {
            buildInfo.phase = 'api_error';
          }
        } catch (e) {
          // Not JSON, just regular output
        }
      });
    });

    childProcess.stderr.on('data', (data) => {
      const error = data.toString();
      errorBuffer += error;
      buildInfo.logs.push(`ERROR: ${error.trim()}`);
    });

    // Wait for process to complete
    return new Promise((resolve) => {
      childProcess.on('close', async (code) => {
        buildInfo.completedAt = new Date();
        buildInfo.duration = buildInfo.completedAt - buildInfo.startedAt;

        if (code === 0) {
          // Build succeeded
          buildInfo.status = 'completed';
          buildInfo.phase = 'completed';
          buildInfo.outputPath = this.getOutputPath(journalCode, resourceType, resourceId, pageName);
          this.stats.successfulBuilds++;

          log(`Build ${buildId} completed successfully in ${(buildInfo.duration / 1000).toFixed(2)}s`);

          // Execute deployment if requested
          if (deploy && DEPLOY_SCRIPT) {
            await this.executeDeploy(buildInfo);
          }
        } else if (code === 2) {
          // API error
          buildInfo.status = 'failed';
          buildInfo.phase = 'api_error';
          buildInfo.error = 'API error: Unable to fetch resource data';
          this.stats.apiErrors++;

          log(`Build ${buildId} failed due to API error`);
        } else {
          // Build error
          buildInfo.status = 'failed';
          buildInfo.phase = 'failed';
          buildInfo.error = `Build failed with exit code ${code}`;
          this.stats.failedBuilds++;

          log(`Build ${buildId} failed with code ${code}`);
        }

        // Remove from active builds
        this.activeBuildsByJournal.delete(journalCode);

        // Process next item in queue
        this.processQueue(journalCode);

        resolve();
      });
    });
  }

  /**
   * Execute deployment script
   */
  async executeDeploy(buildInfo) {
    const { buildId, journalCode, outputPath } = buildInfo;

    log(`Deploying build ${buildId}...`);

    buildInfo.phase = 'deploying';

    return new Promise((resolve) => {
      const deployProcess = spawn(DEPLOY_SCRIPT, [outputPath], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      deployProcess.on('close', (code) => {
        if (code === 0) {
          buildInfo.deployed = true;
          log(`Build ${buildId} deployed successfully`);
        } else {
          buildInfo.deployed = false;
          buildInfo.logs.push(`Deployment failed with code ${code}`);
          log(`Build ${buildId} deployment failed`);
        }
        resolve();
      });
    });
  }

  /**
   * Process next build in queue for a journal
   */
  processQueue(journalCode) {
    const queue = this.queueByJournal.get(journalCode);
    if (!queue || queue.length === 0) {
      return;
    }

    // Get next build from queue
    const nextBuild = queue.shift();
    nextBuild.status = 'processing';
    nextBuild.startedAt = new Date();

    this.activeBuildsByJournal.set(journalCode, nextBuild);

    log(`Processing queued build ${nextBuild.buildId} (${queue.length} remaining in queue)`);

    // Execute build
    this.executeBuild(nextBuild).catch(error => {
      log(`Unexpected error processing queued build: ${error.message}`);
    });
  }

  /**
   * Get build info by ID
   */
  getBuild(buildId) {
    return this.buildHistory.get(buildId);
  }

  /**
   * Get global status
   */
  getStatus() {
    const activeBuilds = Array.from(this.activeBuildsByJournal.entries()).map(([journal, build]) => ({
      journalCode: journal,
      buildId: build.buildId,
      resourceType: build.resourceType,
      resourceId: build.resourceId,
      phase: build.phase,
      startedAt: build.startedAt
    }));

    const queuedBuilds = [];
    this.queueByJournal.forEach((queue, journal) => {
      queue.forEach((build, index) => {
        queuedBuilds.push({
          journalCode: journal,
          buildId: build.buildId,
          resourceType: build.resourceType,
          resourceId: build.resourceId,
          queuePosition: index + 1,
          queuedAt: build.queuedAt
        });
      });
    });

    return {
      uptime: this.getUptime(),
      activeBuilds,
      queuedBuilds,
      stats: this.stats,
      byJournal: this.getStatusByJournal()
    };
  }

  /**
   * Get status grouped by journal
   */
  getStatusByJournal() {
    const byJournal = {};

    this.activeBuildsByJournal.forEach((build, journal) => {
      byJournal[journal] = {
        active: {
          buildId: build.buildId,
          resourceType: build.resourceType,
          resourceId: build.resourceId,
          phase: build.phase
        },
        queued: this.getQueueLength(journal)
      };
    });

    this.queueByJournal.forEach((queue, journal) => {
      if (!byJournal[journal]) {
        byJournal[journal] = {
          active: null,
          queued: queue.length
        };
      }
    });

    return byJournal;
  }

  /**
   * Get server uptime
   */
  getUptime() {
    const uptimeMs = Date.now() - this.serverStartTime.getTime();
    const hours = Math.floor(uptimeMs / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  /**
   * Cleanup old build history
   */
  cleanupHistory() {
    if (this.buildHistory.size > this.maxHistorySize) {
      const entries = Array.from(this.buildHistory.entries());
      const toRemove = entries
        .sort((a, b) => a[1].queuedAt - b[1].queuedAt)
        .slice(0, this.buildHistory.size - this.maxHistorySize);

      toRemove.forEach(([buildId]) => {
        this.buildHistory.delete(buildId);
      });
    }
  }

  /**
   * Get output path for a build
   */
  getOutputPath(journalCode, resourceType, resourceId, pageName) {
    if (resourceType === 'full') {
      return `dist/${journalCode}`;
    }

    if (resourceType === 'static-page') {
      return `dist/${journalCode}/${pageName}`;
    }

    const resourcePaths = {
      'article': 'articles',
      'volume': 'volumes',
      'section': 'sections'
    };

    const basePath = resourcePaths[resourceType] || resourceType;
    return `dist/${journalCode}/${basePath}/${resourceId}`;
  }
}

// Logging function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  console.log(message);

  fs.appendFile(LOG_FILE, logMessage, (err) => {
    if (err) console.error('Error writing to log file:', err);
  });
}

// Load valid journal codes
function loadJournalCodes() {
  try {
    if (!fs.existsSync(JOURNALS_FILE)) {
      log(`Warning: Journals file not found: ${JOURNALS_FILE}`);
      return new Set();
    }

    const content = fs.readFileSync(JOURNALS_FILE, 'utf-8');
    const codes = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    return new Set(codes);
  } catch (error) {
    log(`Error loading journal codes: ${error.message}`);
    return new Set();
  }
}

// Initialize
const app = express();
app.use(express.json());

const buildManager = new BuildManager();
const validJournals = loadJournalCodes();

log('='.repeat(70));
log('Webhook Server Initializing');
log('='.repeat(70));
log(`Port: ${PORT}`);
log(`Deploy script: ${DEPLOY_SCRIPT || 'Not configured'}`);
log(`Max queue per journal: ${MAX_QUEUE_PER_JOURNAL}`);
log(`Valid journals: ${validJournals.size} loaded`);
log('='.repeat(70));

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * POST /rebuild - Main endpoint for triggering builds
 */
app.post('/rebuild', async (req, res) => {
  const { journalCode, resourceType, resourceId, pageName, deploy } = req.body;

  // Validate required parameters
  if (!journalCode) {
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Missing required parameter: journalCode',
      timestamp: new Date().toISOString()
    });
  }

  if (!resourceType) {
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Missing required parameter: resourceType',
      timestamp: new Date().toISOString()
    });
  }

  // Validate resource type
  const validTypes = ['article', 'volume', 'section', 'static-page', 'full'];
  if (!validTypes.includes(resourceType)) {
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: `Invalid resourceType. Must be one of: ${validTypes.join(', ')}`,
      timestamp: new Date().toISOString()
    });
  }

  // Validate resource ID for resource builds
  if (['article', 'volume', 'section'].includes(resourceType) && !resourceId) {
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: `resourceId is required for resourceType '${resourceType}'`,
      timestamp: new Date().toISOString()
    });
  }

  // Validate page name for static-page builds
  if (resourceType === 'static-page' && !pageName) {
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: `pageName is required for resourceType 'static-page'`,
      timestamp: new Date().toISOString()
    });
  }

  // Validate journal code
  if (validJournals.size > 0 && !validJournals.has(journalCode)) {
    return res.status(404).json({
      status: 'error',
      statusCode: 404,
      message: `Invalid journal code: ${journalCode}`,
      availableJournals: Array.from(validJournals),
      timestamp: new Date().toISOString()
    });
  }

  // Queue or execute build
  try {
    const result = await buildManager.queueBuild({
      journalCode,
      resourceType,
      resourceId,
      pageName,
      deploy: deploy || false
    });

    const { status, statusCode, buildInfo, queuePosition } = result;

    if (status === 'rejected') {
      return res.status(statusCode).json({
        status: 'rejected',
        statusCode,
        message: buildInfo.error,
        data: {
          journalCode,
          resourceType,
          resourceId,
          queueLimit: MAX_QUEUE_PER_JOURNAL
        },
        timestamp: new Date().toISOString()
      });
    }

    const responseData = {
      buildId: buildInfo.buildId,
      journalCode: buildInfo.journalCode,
      resourceType: buildInfo.resourceType,
      resourceId: buildInfo.resourceId,
      deploy: buildInfo.deploy,
      queuePosition: queuePosition || 0,
      estimatedWaitTime: buildManager.estimateWaitTime(queuePosition || 0),
      trackingUrl: `/rebuild/${buildInfo.buildId}`
    };

    if (status === 'processing') {
      responseData.outputPath = buildManager.getOutputPath(journalCode, resourceType, resourceId, pageName);
    }

    const queue = {
      thisJournal: {
        active: buildManager.isJournalBuilding(journalCode) ? 1 : 0,
        queued: buildManager.getQueueLength(journalCode)
      },
      global: {
        activeBuilds: buildManager.activeBuildsByJournal.size,
        queuedBuilds: Array.from(buildManager.queueByJournal.values()).reduce((sum, q) => sum + q.length, 0)
      }
    };

    res.status(statusCode).json({
      status,
      statusCode,
      message: status === 'processing'
        ? `Build started for ${resourceType} ${resourceId || 'full rebuild'}`
        : `Build queued (position ${queuePosition + 1})`,
      data: responseData,
      queue,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log(`Error queueing build: ${error.message}`);
    res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /rebuild/:buildId - Track build progress
 */
app.get('/rebuild/:buildId', (req, res) => {
  const { buildId } = req.params;
  const buildInfo = buildManager.getBuild(buildId);

  if (!buildInfo) {
    return res.status(404).json({
      status: 'error',
      statusCode: 404,
      message: `Build not found: ${buildId}`,
      timestamp: new Date().toISOString()
    });
  }

  const duration = buildInfo.completedAt
    ? ((buildInfo.completedAt - buildInfo.startedAt) / 1000).toFixed(2) + 's'
    : buildInfo.startedAt
      ? ((Date.now() - buildInfo.startedAt) / 1000).toFixed(2) + 's (ongoing)'
      : 'N/A';

  res.json({
    status: buildInfo.status,
    buildId: buildInfo.buildId,
    data: {
      journalCode: buildInfo.journalCode,
      resourceType: buildInfo.resourceType,
      resourceId: buildInfo.resourceId,
      deploy: buildInfo.deploy,
      queuedAt: buildInfo.queuedAt,
      startedAt: buildInfo.startedAt,
      completedAt: buildInfo.completedAt,
      duration,
      outputPath: buildInfo.outputPath,
      deployed: buildInfo.deployed || false
    },
    progress: {
      phase: buildInfo.phase || 'queued',
      percentage: buildInfo.status === 'completed' ? 100 : buildInfo.status === 'processing' ? 50 : 0
    },
    logs: buildInfo.logs.slice(-20), // Last 20 log lines
    error: buildInfo.error,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /status - Global server status
 */
app.get('/status', (req, res) => {
  const status = buildManager.getStatus();

  res.json({
    status: 'ok',
    uptime: status.uptime,
    builds: {
      active: status.activeBuilds.length,
      queued: status.queuedBuilds.length,
      total: status.stats.totalBuilds,
      successful: status.stats.successfulBuilds,
      failed: status.stats.failedBuilds,
      apiErrors: status.stats.apiErrors
    },
    activeBuilds: status.activeBuilds,
    queuedBuilds: status.queuedBuilds,
    byJournal: status.byJournal,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Webhook server is operational',
    uptime: buildManager.getUptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /rebuild-article - Legacy endpoint for backward compatibility
 * @deprecated Use /rebuild instead
 */
app.post('/rebuild-article', async (req, res) => {
  const { articleId, journalCode } = req.body;

  if (!journalCode) {
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Missing required parameter: journalCode (this endpoint now requires journalCode)',
      hint: 'Use the new /rebuild endpoint instead',
      timestamp: new Date().toISOString()
    });
  }

  if (!articleId) {
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Missing required parameter: articleId',
      timestamp: new Date().toISOString()
    });
  }

  // Forward to new endpoint
  req.body = {
    journalCode,
    resourceType: 'article',
    resourceId: articleId,
    deploy: req.body.deploy || false
  };

  log(`Legacy /rebuild-article called (forwarding to /rebuild)`);

  // Reuse the main endpoint logic
  return app._router.handle(Object.assign(req, { url: '/rebuild', method: 'POST' }), res);
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  log(`Webhook server started on port ${PORT}`);
  log(`Ready to receive rebuild requests`);
  log(`\nEndpoints:`);
  log(`  POST   http://localhost:${PORT}/rebuild`);
  log(`  GET    http://localhost:${PORT}/rebuild/:buildId`);
  log(`  GET    http://localhost:${PORT}/status`);
  log(`  GET    http://localhost:${PORT}/health`);
  log(`\nExample:`);
  log(`  curl -X POST http://localhost:${PORT}/rebuild \\`);
  log(`    -H "Content-Type: application/json" \\`);
  log(`    -d '{"journalCode":"epijinfo","resourceType":"article","resourceId":"12345"}'`);
  log('');
});
