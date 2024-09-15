const fs = require('fs');
const path = require('path');
const axios = require('axios');
const inquirer = require('inquirer'); // Import inquirer

let authToken = null; // Variable to store the auth token

// Function to get the auth token from user
const getAuthToken = async () => {
  if (authToken) return authToken; // Return if token is already present

  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'authToken',
        message: 'Please enter your Google Cloud auth token:',
        validate: input => input ? true : 'Auth token cannot be empty',
      }
    ]);
    authToken = answers.authToken; // Store the token for future use
    return authToken;
  } catch (error) {
    console.error('Error while prompting for auth token:', error.message);
    throw error;
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
    const response = await axios.get(bundleUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      responseType: 'stream',
    });

    const outputPath = path.join(__dirname, '..', 'sharedflows', `${sharedflowName}_rev${revision}.zip`);
    response.data.pipe(fs.createWriteStream(outputPath));
    console.log(`Downloaded ${sharedflowName} revision ${revision} to ${outputPath}`);
  } catch (error) {
    console.error(`Error downloading bundle for sharedflow ${sharedflowName} revision ${revision}:`, error.message);
    throw error;
  }
};

// Main function to handle 'all' migration for sharedflows
const fromSharedflowAll = async (config) => {
  try {
    if (!fs.existsSync(path.join(__dirname, '..', 'sharedflows'))) {
      fs.mkdirSync(path.join(__dirname, '..', 'sharedflows'));
    }

    const authToken = await getAuthToken();
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
