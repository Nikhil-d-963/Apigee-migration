const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
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

// Function to upload a shared flow bundle
const uploadSharedflowBundle = async (filePath, sharedflowName, authToken, orgName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/sharedflows?action=import&name=${sharedflowName}&validate=true`;

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log(chalk.green(`Uploaded shared flow bundle ${filePath} successfully.`));
    return response.data;
  } catch (error) {
    logError(`Error uploading shared flow bundle ${filePath}: ${error.message}`);
    throw error;
  }
};

// Function to deploy the shared flow to an environment
const deploySharedflow = async (sharedflowName, revision, authToken, orgName, environment) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/environments/${environment}/sharedflows/${sharedflowName}/revisions/${revision}/deployments?override=true`;

  try {
    const response = await axios.post(url, {}, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log(chalk.green(`Deployed shared flow ${sharedflowName} revision ${revision} to environment ${environment}.`));
    return response.data;
  } catch (error) {
    if (error.response) {
      logError(`Error deploying shared flow ${sharedflowName} revision ${revision}: Status: ${error.response.status}`);
      logError(`Response data: ${JSON.stringify(error.response.data.error.details, null, 2)}`);
    } else if (error.request) {
      logError(`No response received for shared flow ${sharedflowName} revision ${revision}.`);
    } else {
      logError(`Error setting up the request for shared flow ${sharedflowName} revision ${revision}: ${error.message}`);
    }
    throw error;
  }
};

// Function to fetch revisions for a shared flow
const fetchSharedflowRevisions = async (sharedflowName, authToken, orgName) => {
  try {
    const response = await axios.get(`https://apigee.googleapis.com/v1/organizations/${orgName}/sharedflows/${sharedflowName}/revisions`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    return response.data;
  } catch (error) {
    logError(`Error fetching revisions for shared flow ${sharedflowName}: ${error.message}`);
    throw error;
  }
};

// Main function to handle deployment of all shared flows
const deployAllSharedflows = async (config, authToken, onlyImport = false) => {
  const orgName = config.Organization.To['org-name'];
  const environment = config.Organization.To['environment'];

  ensureDirectoryExists(path.join(__dirname, '..', 'fromOrgResources', 'sharedflows'));

  const sharedflowDir = path.join(__dirname, '..', 'fromOrgResources', 'sharedflows');
  const sharedflowFiles = fs.readdirSync(sharedflowDir).filter(file => file.endsWith('.zip'));

  const progressBar = new SingleBar({
    format: `${chalk.green('Processing')} |{bar}| {percentage}% | {value}/{total} shared flows`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });
  progressBar.start(sharedflowFiles.length, 0);

  for (const file of sharedflowFiles) {
    const sharedflowName = path.basename(file, '.zip');

    try {
      console.log(chalk.blue(`Uploading ${sharedflowName}...`));
      await uploadSharedflowBundle(path.join(sharedflowDir, file), sharedflowName, authToken, orgName);
      progressBar.increment();

      if (!onlyImport) {
        console.log(chalk.blue(`Fetching revisions for ${sharedflowName}...`));
        const revisions = await fetchSharedflowRevisions(sharedflowName, authToken, orgName);
        const latestRevision = Math.max(...revisions.map(Number));

        console.log(chalk.blue(`Deploying ${sharedflowName} revision ${latestRevision}...`));
        await deploySharedflow(sharedflowName, latestRevision, authToken, orgName, environment);
      } else {
        console.log(chalk.yellow(`Skipping deployment for shared flow ${sharedflowName} as --onlyimport flag is set.`));
      }
    } catch (error) {
      logError(`Skipping shared flow ${sharedflowName} due to error: ${error.message}`);
    }
  }

  progressBar.stop();
  console.log(chalk.green('All shared flows have been processed.'));
};

module.exports = deployAllSharedflows;
