const fs = require('fs');
const path = require('path');
const axios = require('axios');
const logger = require('../../utils/logger');

// Function to ensure the directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Use standardized logger for error logging
const logError = (message) => {
  logger.error(message);
};

// Function to fetch data with error handling
const fetchData = async (url, authToken) => {
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    return response.data;
  } catch (error) {
    logError(`Error fetching data from ${url}: ${error.message}`);
    throw error;
  }
};

// Function to fetch proxies
const fetchProxies = async (authToken, orgName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apis`;
  const data = await fetchData(url, authToken);
  return data.proxies.map(proxy => proxy.name);
};

// Function to fetch revisions for a proxy
const fetchRevisions = async (proxyName, authToken, orgName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apis/${proxyName}/revisions`;
  return await fetchData(url, authToken);
};

// Function to fetch deployed revisions for a proxy directly
const fetchDeployedRevisions = async (proxyName, authToken, orgName, environment) => {
  try {
    // Get all deployments for the proxy directly
    const deploymentUrl = `https://apigee.googleapis.com/v1/organizations/${orgName}/apis/${proxyName}/deployments`;
    const deploymentData = await fetchData(deploymentUrl, authToken);
    
    const deployedRevisions = new Set();
    
    if (deploymentData && deploymentData.deployments && deploymentData.deployments.length > 0) {
      // Filter deployments by environment if specified
      const relevantDeployments = environment ? 
        deploymentData.deployments.filter(deployment => deployment.environment === environment) : 
        deploymentData.deployments;
      
      // Add all deployed revisions to the set
      for (const deployment of relevantDeployments) {
        deployedRevisions.add(deployment.revision);
        logger.info(`Found deployed revision ${deployment.revision} for ${proxyName} in environment ${deployment.environment}`);
      }
    }
    
    return Array.from(deployedRevisions);
  } catch (error) {
    logError(`Error fetching deployed revisions for ${proxyName}: ${error.message}`);
    return [];
  }
};

// Function to download a proxy bundle
const downloadProxyBundle = async (proxyName, revision, authToken, orgName) => {
  const bundleUrl = `https://apigee.googleapis.com/v1/organizations/${orgName}/apis/${proxyName}/revisions/${revision}?format=bundle`;
  
  try {
    const proxyDir = path.join(__dirname, '..', 'fromOrgResources', 'proxies');
    ensureDirectoryExists(proxyDir);
    
    const response = await axios.get(bundleUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      responseType: 'stream',
    });
    
    const outputPath = path.join(proxyDir, `${proxyName}.zip`);
    const totalSize = parseInt(response.headers['content-length'], 10);
    
    // Use standardized progress bar
    const progressBar = logger.createProgressBar(`Downloading ${proxyName} (revision ${revision})`, {
      stopOnComplete: true,
      clearOnComplete: true
    });

    progressBar.start(totalSize, 0);
    
    response.data.pipe(fs.createWriteStream(outputPath));
    
    response.data.on('data', (chunk) => {
      progressBar.increment(chunk.length);
    });

    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        progressBar.stop();
        logger.success(`Downloaded ${proxyName} revision ${revision} to ${outputPath}`);
        resolve();
      });
      response.data.on('error', (error) => {
        logError(`Error downloading bundle for proxy ${proxyName} revision ${revision}: ${error.message}`);
        reject(error);
      });
    });
  } catch (error) {
    logError(`Error downloading bundle for proxy ${proxyName} revision ${revision}: ${error.message}`);
    throw error;
  }
};

// Main function to handle 'all' migration
const fromProxyAll = async (config, authToken) => {
  const orgName = config.Organization.From['org-name'];
  const environment = config.Organization.From['environment'];
  
  try {
    // Print section header
    logger.printSection('Proxy Migration');
    
    logger.info(`Fetching proxies from ${orgName}...`);
    const proxies = await fetchProxies(authToken, orgName);
    logger.success(`Found ${proxies.length} proxies.`);
    
    if (environment) {
      logger.info(`Filtering for deployments in environment: ${environment}`);
    } else {
      logger.info(`Looking for deployments in all environments`);
    }
    
    let downloadedCount = 0;
    let skippedCount = 0;
    
    for (const proxy of proxies) {
      try {
        // First try to get deployed revisions
        const deployedRevisions = await fetchDeployedRevisions(proxy, authToken, orgName, environment);
        
        if (deployedRevisions.length > 0) {
          // Download all deployed revisions
          for (const revision of deployedRevisions) {
            await downloadProxyBundle(proxy, revision, authToken, orgName);
            downloadedCount++;
          }
        } else {
          // If no deployed revisions found, fall back to latest revision
          logger.warning(`No deployed revisions found for ${proxy}${environment ? ` in environment ${environment}` : ''}. Falling back to latest revision.`);
          const revisions = await fetchRevisions(proxy, authToken, orgName);
          
          if (revisions.length > 0) {
            const latestRevision = Math.max(...revisions.map(Number));
            await downloadProxyBundle(proxy, latestRevision, authToken, orgName);
            downloadedCount++;
          } else {
            logger.warning(`No revisions found for ${proxy}. Skipping.`);
            skippedCount++;
          }
        }
      } catch (error) {
        logError(`Skipping ${proxy} due to an error: ${error.message}`);
        skippedCount++;
      }
    }
    
    // Print summary using the standardized summary format
    logger.printSummary({
      'Successfully Downloaded': downloadedCount,
      'Skipped': skippedCount,
      'Total Proxies': proxies.length
    }, 'Proxy Download Summary');
    
    return { success: true, downloaded: downloadedCount, skipped: skippedCount };
  } catch (error) {
    logError('Migration failed: ' + error.message);
    return { success: false, error: error.message };
  }
};

module.exports = fromProxyAll;
