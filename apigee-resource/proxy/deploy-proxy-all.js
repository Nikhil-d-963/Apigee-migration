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

// Fetch data with error handling
const fetchData = async (url, authToken) => {
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  } catch (error) {
    logError(`Error fetching data from ${url}: ${error.message}`);
    throw error;
  }
};

// Upload proxy bundle with progress
const uploadProxyBundle = async (filePath, proxyName, authToken, orgName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apis?action=import&name=${proxyName}&validate=true`;

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const stats = fs.statSync(filePath);
    const totalSize = stats.size;

    const progressBar = new SingleBar({
      format: `${chalk.green('Uploading')} |{bar}| {percentage}% | {value}/{total} bytes`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });

    progressBar.start(totalSize, 0);

    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
      onUploadProgress: (progressEvent) => {
        progressBar.update(progressEvent.loaded);
      },
    });

    progressBar.stop();
    console.log(chalk.green(`Uploaded proxy bundle ${filePath} successfully.`));
    return response.data;
  } catch (error) {
    logError(`Error uploading proxy bundle ${filePath}: ${error.message}`);
    throw error;
  }
};

// Deploy the proxy to an environment
const deployProxy = async (proxyName, revision, authToken, orgName, environment) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/environments/${environment}/apis/${proxyName}/revisions/${revision}/deployments?override=true`;

  try {
    const response = await axios.post(url, {}, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    console.log(chalk.green(`Deployed proxy ${proxyName} revision ${revision} to environment ${environment}.`));
    return response.data;
  } catch (error) {
    handleDeployError(error, proxyName, revision);
    throw error; // Re-throw to indicate failure
  }
};

// Handle deployment errors
const handleDeployError = (error, proxyName, revision) => {
  if (error.response) {
    logError(`Error deploying proxy ${proxyName} revision ${revision}:`);
    logError(`Status: ${error.response.status}`);
    logError(`Response: ${JSON.stringify(error.response.data.error.details, null, 2)}`);
  } else if (error.request) {
    logError(`No response received for proxy ${proxyName} revision ${revision}.`);
  } else {
    logError(`Error setting up the request for proxy ${proxyName} revision ${revision}: ${error.message}`);
  }
};

// Fetch revisions for a proxy
const fetchRevisions = async (proxyName, authToken, orgName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apis/${proxyName}/revisions`;
  return await fetchData(url, authToken);
};

// Main function to handle deployment of all proxies
const deployAllProxies = async (config, authToken, onlyImport = false) => {
  try {
    const orgName = config.Organization.To['org-name'];
    const environment = config.Organization.To['environment'];

    const proxyDir = path.join(__dirname, '..', 'fromOrgResources', 'proxies');
    ensureDirectoryExists(proxyDir);

    const files = fs.readdirSync(proxyDir).filter(file => file.endsWith('.zip'));

    for (const file of files) {
      const proxyName = path.basename(file, '.zip');

      try {
        await uploadProxyBundle(path.join(proxyDir, file), proxyName, authToken, orgName);

        if (!onlyImport) {
          const revisions = await fetchRevisions(proxyName, authToken, orgName);
          const latestRevision = Math.max(...revisions.map(Number));
          await deployProxy(proxyName, latestRevision, authToken, orgName, environment);
        } else {
          console.log(chalk.yellow(`Skipping deployment for proxy ${proxyName} as --onlyimport flag is set.`));
        }
      } catch (uploadError) {
        logError(`Error processing proxy bundle for ${proxyName}: ${uploadError.message}`);
      }
    }
  } catch (error) {
    logError('Deployment failed: ' + error.message);
    process.exit(1);
  }
};

module.exports = deployAllProxies;
