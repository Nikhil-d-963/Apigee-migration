const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { SingleBar } = require('cli-progress');
const chalk = require('chalk');

// Function to ensure the directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Centralized error logging
const logError = (message) => {
  console.error(chalk.red(message));
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
        console.log(chalk.blue(`Found deployed revision ${deployment.revision} for ${proxyName} in environment ${deployment.environment}`));
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
    
    const progressBar = new SingleBar({
      format: `${chalk.green('{bar}')} {percentage}% | {eta}s | ${chalk.cyan(proxyName)}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });

    progressBar.start(totalSize, 0);
    
    response.data.pipe(fs.createWriteStream(outputPath));
    
    response.data.on('data', (chunk) => {
      progressBar.increment(chunk.length);
    });

    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        progressBar.stop();
        console.log(chalk.green(`Downloaded ${proxyName} revision ${revision} to ${outputPath}`));
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
    console.log(chalk.blue(`Fetching proxies from ${orgName}...`));
    const proxies = await fetchProxies(authToken, orgName);
    console.log(chalk.green(`Found ${proxies.length} proxies.`));
    
    if (environment) {
      console.log(chalk.blue(`Filtering for deployments in environment: ${environment}`));
    } else {
      console.log(chalk.blue(`Looking for deployments in all environments`));
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
          console.log(chalk.yellow(`No deployed revisions found for ${proxy}${environment ? ` in environment ${environment}` : ''}. Falling back to latest revision.`));
          const revisions = await fetchRevisions(proxy, authToken, orgName);
          
          if (revisions.length > 0) {
            const latestRevision = Math.max(...revisions.map(Number));
            await downloadProxyBundle(proxy, latestRevision, authToken, orgName);
            downloadedCount++;
          } else {
            console.log(chalk.yellow(`No revisions found for ${proxy}. Skipping.`));
            skippedCount++;
          }
        }
      } catch (error) {
        logError(`Skipping ${proxy} due to an error: ${error.message}`);
        skippedCount++;
      }
    }
    
    console.log(chalk.bold.green(`\nProxy download summary:`));
    console.log(chalk.green(`- Successfully downloaded: ${downloadedCount}`));
    if (skippedCount > 0) {
      console.log(chalk.yellow(`- Skipped: ${skippedCount}`));
    }
  } catch (error) {
    logError('Migration failed: ' + error.message);
    return { success: false, error: error.message };
  }
};

module.exports = fromProxyAll;
