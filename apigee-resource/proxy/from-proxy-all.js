const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { SingleBar } = require('cli-progress');

// Dynamically import `chalk`
let chalk;
(async () => {
  chalk = (await import('chalk')).default;
})();

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
  
  try {
    const proxies = await fetchProxies(authToken, orgName);
    
    for (const proxy of proxies) {
      try {
        const revisions = await fetchRevisions(proxy, authToken, orgName);
        const latestRevision = Math.max(...revisions.map(Number));
        await downloadProxyBundle(proxy, latestRevision, authToken, orgName);
      } catch (error) {
        logError(`Skipping ${proxy} due to an error: ${error.message}`);
      }
    }
  } catch (error) {
    logError('Migration failed: ' + error.message);
    process.exit(1);
  }
};

module.exports = fromProxyAll;
