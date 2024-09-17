const fs = require('fs');
const path = require('path');
const axios = require('axios');
const inquirer = require('inquirer'); // Import inquirer
const ProgressBar = require('progress'); // Progress bar library
let chalk;
(async () => {
  chalk = (await import('chalk')).default;
})();
// Function to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Function to fetch sharedflows
const fetchSharedflows = async (authToken, orgName) => {
  try {
    const response = await axios.get(`https://apigee.googleapis.com/v1/organizations/${orgName}/sharedflows`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      }
    });
    const sharedflows = response.data.sharedFlows.map(sharedflow => sharedflow.name);
    return sharedflows;
  } catch (error) {
    console.error(chalk.red('Error fetching sharedflows:'), error.message);
    throw error;
  }
};

// Function to fetch revisions for a sharedflow
const fetchRevisions = async (sharedflowName, authToken, orgName) => {
  try {
    const response = await axios.get(`https://apigee.googleapis.com/v1/organizations/${orgName}/sharedflows/${sharedflowName}/revisions`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      }
    });
    return response.data;
  } catch (error) {
    console.error(chalk.red(`Error fetching revisions for sharedflow ${sharedflowName}:`), error.message);
    throw error;
  }
};

// Function to download a sharedflow bundle
const downloadSharedflowBundle = async (sharedflowName, revision, authToken, orgName) => {
  const bundleUrl = `https://apigee.googleapis.com/v1/organizations/${orgName}/sharedflows/${sharedflowName}/revisions/${revision}?format=bundle`;
  try {
    // Define the directory path where the sharedflow bundles will be saved
    const sharedflowDir = path.join(__dirname, '..', 'fromOrgResources', 'sharedflows');
    
    // Ensure the directory exists before downloading
    ensureDirectoryExists(sharedflowDir);

    const response = await axios.get(bundleUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      responseType: 'stream', // Set response type to stream for downloading files
    });

    const outputPath = path.join(sharedflowDir, `${sharedflowName}.zip`);
    
    // Get the total content length to use in progress bar
    const totalLength = response.headers['content-length'];

    // Create a progress bar
    const progressBar = new ProgressBar(`Downloading ${sharedflowName} [:bar] :percent :etas`, {
      width: 40,
      complete: '=',
      incomplete: ' ',
      renderThrottle: 100,
      total: parseInt(totalLength)
    });

    // Stream the download and update progress bar
    response.data.on('data', (chunk) => progressBar.tick(chunk.length));
    response.data.pipe(fs.createWriteStream(outputPath));

    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        console.log(chalk.green(`Downloaded ${sharedflowName} revision ${revision} to ${outputPath}`));
        resolve();
      });

      response.data.on('error', (error) => {
        console.error(chalk.red(`Error downloading bundle for sharedflow ${sharedflowName} revision ${revision}:`), error.message);
        reject(error);
      });
    });
  } catch (error) {
    console.error(chalk.red(`Error downloading bundle for sharedflow ${sharedflowName} revision ${revision}:`), error.message);
    throw error;
  }
};

// Main function to handle 'all' migration for sharedflows
const fromSharedflowAll = async (config, authToken) => {
  try {
    const orgName = config.Organization.From['org-name']; // Get organization name from config
    const sharedflows = await fetchSharedflows(authToken, orgName);

    for (const sharedflow of sharedflows) {
      const revisions = await fetchRevisions(sharedflow, authToken, orgName);
      const latestRevision = Math.max(...revisions.map(Number));
      await downloadSharedflowBundle(sharedflow, latestRevision, authToken, orgName);
    }
  } catch (error) {
    console.error(chalk.red('Migration failed:'), error.message);
    process.exit(1);
  }
};

module.exports = fromSharedflowAll;
