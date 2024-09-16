const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Function to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Function to upload a sharedflow bundle
const uploadSharedflowBundle = async (filePath, sharedflowName, authToken, orgName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/sharedflows?action=import&name=${sharedflowName}&validate=true`;
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      }
    });

    console.log(`Uploaded sharedflow bundle ${filePath} successfully.`);
    return response.data;
  } catch (error) {
    console.error(`Error uploading sharedflow bundle ${filePath}:`, error.message);
    throw error;
  }
};

// Function to deploy the sharedflow to an environment
const deploySharedflow = async (sharedflowName, revision, authToken, orgName, environment) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/environments/${environment}/sharedflows/${sharedflowName}/revisions/${revision}/deployments?override=true`;
  try {
    const response = await axios.post(url, {}, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      }
    });

    console.log(`Deployed sharedflow ${sharedflowName} revision ${revision} to environment ${environment}.`);
    return response.data;
  } catch (error) {
    console.error(`Error deploying sharedflow ${sharedflowName} revision ${revision}:`, error.message);
    throw error;
  }
};

// Function to fetch revisions for a sharedflow
const fetchSharedflowRevisions = async (sharedflowName, authToken, orgName) => {
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

// Main function to handle deployment of all sharedflows
const deployAllSharedflows = async (config, authToken, onlyImport = false) => {
  try {
    const orgName = config.Organization.To['org-name'];
    const environment = config.Organization.To['environment'];

    // Ensure the directory exists
    ensureDirectoryExists(path.join(__dirname, '..', 'fromOrgResources', 'sharedflows'));

    const sharedflowDir = path.join(__dirname, '..', 'fromOrgResources', 'sharedflows');
    const files = fs.readdirSync(sharedflowDir);

    for (const file of files) {
      if (file.endsWith('.zip')) {
        const sharedflowName = path.basename(file, '.zip');
        
        try {
          // Upload the sharedflow bundle
          await uploadSharedflowBundle(path.join(sharedflowDir, file), sharedflowName, authToken, orgName);
          
          if (!onlyImport) {
            // Fetch the latest revision after upload
            const revisions = await fetchSharedflowRevisions(sharedflowName, authToken, orgName);
            const latestRevision = Math.max(...revisions.map(Number));

            // Deploy the sharedflow bundle
            await deploySharedflow(sharedflowName, latestRevision, authToken, orgName, environment);
          } else {
            console.log(`Skipping deployment for sharedflow ${sharedflowName} as --onlyimport flag is set.`);
          }
        } catch (error) {
          // Skip this sharedflow on error and continue with the next one
          console.error(`Skipping sharedflow ${sharedflowName} due to error: ${error.message}`);
          continue;
        }
      }
    }
  } catch (error) {
    console.error('Deployment process failed:', error.message);
    process.exit(1);
  }
};

module.exports = deployAllSharedflows;
