const fs = require('fs');
const path = require('path');
const axios = require('axios');
const inquirer = require('inquirer'); // Ensure inquirer is required properly

// Function to get the auth token from user
const getAuthToken = async () => {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'authToken',
        message: 'Please enter your Google Cloud auth token:',
        validate: input => input ? true : 'Auth token cannot be empty',
      }
    ]);
    return answers.authToken;
  } catch (error) {
    console.error('Error while prompting for auth token:', error.message);
    throw error;
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
    console.error('Error fetching proxies:', error.message);
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
    console.error(`Error fetching revisions for proxy ${proxyName}:`, error.message);
    throw error;
  }
};

// Function to download a proxy bundle
const downloadProxyBundle = async (proxyName, revision, authToken, orgName) => {
  const bundleUrl = `https://apigee.googleapis.com/v1/organizations/${orgName}/apis/${proxyName}/revisions/${revision}?format=bundle`;
  try {
    const response = await axios.get(bundleUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      responseType: 'stream',
    });

    const outputPath = path.join(__dirname, '..', 'proxies', `${proxyName}_rev${revision}.zip`);
    response.data.pipe(fs.createWriteStream(outputPath));
    console.log(`Downloaded ${proxyName} revision ${revision} to ${outputPath}`);
  } catch (error) {
    console.error(`Error downloading bundle for proxy ${proxyName} revision ${revision}:`, error.message);
    throw error;
  }
};

// Main function to handle 'all' migration
const fromProxyAll = async (config) => {
  try {
    if (!fs.existsSync(path.join(__dirname, '..', 'proxies'))) {
      fs.mkdirSync(path.join(__dirname, '..', 'proxies'));
    }

    const authToken = await getAuthToken();
    const orgName = config.Organization.From['org-name']; // Get organization name from config
    const proxies = await fetchProxies(authToken, orgName);

    for (const proxy of proxies) {
      const revisions = await fetchRevisions(proxy, authToken, orgName);
      const latestRevision = Math.max(...revisions.map(Number));
      await downloadProxyBundle(proxy, latestRevision, authToken, orgName);
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

module.exports = fromProxyAll;