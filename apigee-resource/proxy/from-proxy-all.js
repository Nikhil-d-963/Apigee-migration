const fs = require('fs');
const path = require('path');
const axios = require('axios');
const inquirer = require('inquirer'); // Ensure inquirer is required properly

// Function to get the auth token from user

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
    // Define the directory path where the proxy bundles will be saved
    const proxyDir = path.join(__dirname, '..', 'fromOrgResources', 'proxies');
    
    // Ensure the directory exists before downloading
    ensureDirectoryExists(proxyDir);

    const response = await axios.get(bundleUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      responseType: 'stream', // Set response type to stream for downloading files
    });

    const outputPath = path.join(proxyDir, `${proxyName}_rev${revision}.zip`);
    
    // Save the downloaded proxy bundle as a ZIP file
    response.data.pipe(fs.createWriteStream(outputPath));
    console.log(`Downloaded ${proxyName} revision ${revision} to ${outputPath}`);
  } catch (error) {
    console.error(`Error downloading bundle for proxy ${proxyName} revision ${revision}:`, error.message);
    throw error;
  }
};

// Main function to handle 'all' migration
const fromProxyAll = async (config,authToken) => {
  try {

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