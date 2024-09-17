const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const cliProgress = require('cli-progress');
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

// Function to upload a proxy bundle with progress
const uploadProxyBundle = async (filePath, proxyName, authToken, orgName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apis?action=import&name=${proxyName}&validate=true`;

  try {
    const form = new FormData();
    const fileStream = fs.createReadStream(filePath);
    form.append('file', fileStream);

    const stats = fs.statSync(filePath);
    const totalSize = stats.size;

    // Initialize the progress bar
    const progressBar = new cliProgress.SingleBar({
      format: `${chalk.green('Uploading')} |{bar}| {percentage}% | {value}/{total} bytes`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    progressBar.start(totalSize, 0);

    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
      // Axios onUploadProgress callback
      onUploadProgress: (progressEvent) => {
        const uploaded = progressEvent.loaded;
        progressBar.update(uploaded);
      }
    });

    progressBar.stop();
    console.log(chalk.green(`Uploaded proxy bundle ${filePath} successfully.`));
    return response.data;
  } catch (error) {
    console.log(chalk.red(`Error uploading proxy bundle ${filePath}: ${error.message}`));
    throw error;
  }
};

// Function to deploy the proxy to an environment
const deployProxy = async (proxyName, revision, authToken, orgName, environment) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/environments/${environment}/apis/${proxyName}/revisions/${revision}/deployments?override=true`;
  try {
    const response = await axios.post(url, {}, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      }
    });

    console.log(chalk.green(`Deployed proxy ${proxyName} revision ${revision} to environment ${environment}.`));
    return response.data;
  } catch (error) {
    if (error.response) {
      console.log(chalk.red(`Error deploying proxy ${proxyName} revision ${revision}:`));
      console.log(chalk.red(`Status: ${error.response.status}`));
      console.log(chalk.red(`Response: ${JSON.stringify(error.response.data.error.details[0].violations[0].description, null, 2)}`));
    } else if (error.request) {
      console.log(chalk.red(`No response received for proxy ${proxyName} revision ${revision}:`));
    } else {
      console.log(chalk.red(`Error setting up the request for proxy ${proxyName} revision ${revision}: ${error.message}`));
    }

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
    console.error(chalk.red(`Error fetching revisions for proxy ${proxyName}: ${error.message}`));
    throw error;
  }
};

// Main function to handle deployment of all proxies
const deployAllProxies = async (config, authToken, onlyImport = false) => {
  try {
    const orgName = config.Organization.To['org-name'];
    const environment = config.Organization.To['environment'];

    // Ensure the directory exists
    ensureDirectoryExists(path.join(__dirname, '..', 'fromOrgResources', 'proxies'));

    const proxyDir = path.join(__dirname, '..', 'fromOrgResources', 'proxies');
    const files = fs.readdirSync(proxyDir);

    for (const file of files) {
      if (file.endsWith('.zip')) {
        const proxyName = path.basename(file, '.zip');

        try {
          // Upload the proxy bundle
          await uploadProxyBundle(path.join(proxyDir, file), proxyName, authToken, orgName);

          // Skip deployment if onlyImport is true
          if (!onlyImport) {
            try {
              // Fetch the latest revision
              const revisions = await fetchRevisions(proxyName, authToken, orgName);
              const latestRevision = Math.max(...revisions.map(Number));

              // Deploy the proxy bundle
              await deployProxy(proxyName, latestRevision, authToken, orgName, environment);
            } catch (deployError) {
              console.error(chalk.red(`Error deploying proxy ${proxyName}: ${deployError.message}`));
            }
          } else {
            console.log(chalk.yellow(`Skipping deployment for proxy ${proxyName} as --onlyimport flag is set.`));
          }

        } catch (uploadError) {
          console.error(chalk.red(`Error uploading proxy bundle for ${proxyName}: ${uploadError.message}`));
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('Deployment failed:'), error.message);
    process.exit(1);
  }
};

module.exports = deployAllProxies;
