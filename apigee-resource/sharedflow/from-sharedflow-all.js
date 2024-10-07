const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { SingleBar } = require('cli-progress');

let chalk;
(async () => {
  chalk = (await import('chalk')).default;
})();

// Ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Centralized error logging
const logError = (message) => {
  console.error(chalk.red(message));
};

// Fetch shared flows
const fetchSharedflows = async (authToken, orgName) => {
  try {
    const response = await axios.get(`https://apigee.googleapis.com/v1/organizations/${orgName}/sharedflows`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    return response.data.sharedFlows.map(sharedflow => sharedflow.name);
  } catch (error) {
    logError('Error fetching shared flows: ' + error.message);
    throw error;
  }
};

// Fetch revisions for a shared flow
const fetchRevisions = async (sharedflowName, authToken, orgName) => {
  try {
    const response = await axios.get(`https://apigee.googleapis.com/v1/organizations/${orgName}/sharedflows/${sharedflowName}/revisions`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    return response.data;
  } catch (error) {
    logError(`Error fetching revisions for shared flow ${sharedflowName}: ` + error.message);
    throw error;
  }
};

// Download a shared flow bundle
const downloadSharedflowBundle = async (sharedflowName, revision, authToken, orgName) => {
  const bundleUrl = `https://apigee.googleapis.com/v1/organizations/${orgName}/sharedflows/${sharedflowName}/revisions/${revision}?format=bundle`;
  
  const sharedflowDir = path.join(__dirname, '..', 'fromOrgResources', 'sharedflows');
  ensureDirectoryExists(sharedflowDir);

  try {
    const response = await axios.get(bundleUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      responseType: 'stream',
    });

    const outputPath = path.join(sharedflowDir, `${sharedflowName}.zip`);
    const totalLength = parseInt(response.headers['content-length'], 10);

    const progressBar = new SingleBar({
      format: `${chalk.green('Downloading')} |{bar}| {percentage}% | {value}/{total} bytes | ETA: {eta}s`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });
    
    progressBar.start(totalLength, 0);

    // Stream the download and update the progress bar
    response.data.on('data', (chunk) => {
      progressBar.increment(chunk.length);
    });

    response.data.pipe(fs.createWriteStream(outputPath));

    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        progressBar.stop();
        console.log(chalk.green(`Downloaded ${sharedflowName} revision ${revision} to ${outputPath}`));
        resolve();
      });

      response.data.on('error', (error) => {
        logError(`Error downloading bundle for shared flow ${sharedflowName} revision ${revision}: ` + error.message);
        reject(error);
      });
    });
  } catch (error) {
    logError(`Error downloading bundle for shared flow ${sharedflowName} revision ${revision}: ` + error.message);
    throw error;
  }
};

// Main function to handle 'all' migration for shared flows
const fromSharedflowAll = async (config, authToken) => {
  const orgName = config.Organization.From['org-name'];

  try {
    const sharedflows = await fetchSharedflows(authToken, orgName);

    for (const sharedflow of sharedflows) {
      const revisions = await fetchRevisions(sharedflow, authToken, orgName);
      const latestRevision = Math.max(...revisions.map(Number));
      await downloadSharedflowBundle(sharedflow, latestRevision, authToken, orgName);
    }
  } catch (error) {
    logError('Migration failed: ' + error.message);
    process.exit(1);
  }
};

module.exports = fromSharedflowAll;
