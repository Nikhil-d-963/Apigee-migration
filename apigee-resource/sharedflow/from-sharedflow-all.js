const fs = require('fs');
const path = require('path');
const axios = require('axios');
const inquirer = require('inquirer'); // Import inquirer



// Function to get the auth token from user

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
    console.error('Error fetching sharedflows:', error.message);
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
    console.error(`Error fetching revisions for sharedflow ${sharedflowName}:`, error.message);
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

    const outputPath = path.join(sharedflowDir, `${sharedflowName}_rev${revision}.zip`);
    
    // Save the downloaded sharedflow bundle as a ZIP file
    response.data.pipe(fs.createWriteStream(outputPath));
    console.log(`Downloaded ${sharedflowName} revision ${revision} to ${outputPath}`);
  } catch (error) {
    console.error(`Error downloading bundle for sharedflow ${sharedflowName} revision ${revision}:`, error.message);
    throw error;
  }
};
// Main function to handle 'all' migration for sharedflows
const fromSharedflowAll = async (config,authToken) => {
  try {

    const orgName = config.Organization.From['org-name']; // Get organization name from config
    const sharedflows = await fetchSharedflows(authToken, orgName);

    for (const sharedflow of sharedflows) {
      const revisions = await fetchRevisions(sharedflow, authToken, orgName);
      const latestRevision = Math.max(...revisions.map(Number));
      await downloadSharedflowBundle(sharedflow, latestRevision, authToken, orgName);
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

module.exports = fromSharedflowAll;
