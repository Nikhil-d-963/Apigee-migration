const fs = require('fs');
const path = require('path');
const axios = require('axios');
const inquirer = require('inquirer');
const ProgressBar = require('progress');

// Dynamically import `chalk` (since it's an ES module)
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

// Function to fetch proxies
const fetchProxies = async (authToken, orgName) => {
  try {
    const response = await axios.get(`https://apigee.googleapis.com/v1/organizations/${orgName}/apis`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      }
    });
    const proxies = response.data.proxies.map(proxy => proxy.name);
    return proxies;
  } catch (error) {
    console.error(chalk.red('Error fetching proxies:', error.message)); // Log error in red
    throw error;
  }
};

// Function to fetch revisions for a proxy
const fetchRevisions = async (proxyName, authToken, orgName) => {
  try {
    const response = await axios.get(`https://apigee.googleapis.com/v1/organizations/${orgName}/apis/${proxyName}/revisions`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      }
    });
    return response.data;
  } catch (error) {
    console.error(chalk.red(`Error fetching revisions for proxy ${proxyName}:`, error.message)); // Log error in red
    throw error;
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

    const totalSize = parseInt(response.headers['content-length'], 10); // Get total size for progress
    const progressBar = new ProgressBar('  downloading [:bar] :percent :etas', {
      width: 40,
      total: totalSize,
      complete: '=',
      incomplete: ' ',
    });

    // Pipe data to file and update progress bar
    response.data.on('data', (chunk) => {
      progressBar.tick(chunk.length); // Update the progress bar with chunk size
    });

    response.data.pipe(fs.createWriteStream(outputPath));

    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        console.log(chalk.green(`Downloaded ${proxyName} revision ${revision} to ${outputPath}`)); // Success in green
        resolve();
      });
      response.data.on('error', (error) => {
        console.error(chalk.red(`Error downloading bundle for proxy ${proxyName} revision ${revision}:`, error.message)); // Log error in red
        reject(error);
      });
    });
  } catch (error) {
    console.error(chalk.red(`Error downloading bundle for proxy ${proxyName} revision ${revision}:`, error.message)); // Log error in red
    throw error;
  }
};

// Main function to handle 'all' migration
const fromProxyAll = async (config, authToken) => {
  try {
    const orgName = config.Organization.From['org-name']; // Get organization name from config
    const proxies = await fetchProxies(authToken, orgName);

    for (const proxy of proxies) {
      const revisions = await fetchRevisions(proxy, authToken, orgName);
      const latestRevision = Math.max(...revisions.map(Number));
      await downloadProxyBundle(proxy, latestRevision, authToken, orgName);
    }
  } catch (error) {
    console.error(chalk.red('Migration failed:', error.message)); // Log failure in red
    process.exit(1);
  }
};

module.exports = fromProxyAll;
