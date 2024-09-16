const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Function to create a target server
const createTargetServer = async (targetServerDetails, authToken, orgName, envName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/environments/${envName}/targetservers`;
  
  try {
    const response = await axios.post(url, targetServerDetails, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Target server '${targetServerDetails.name}' created successfully.`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`Error creating target server '${targetServerDetails.name}':`, error.response.data);
    } else {
      console.error(`Error creating target server '${targetServerDetails.name}':`, error.message);
    }
    throw error;
  }
};

// Function to load target server details from local JSON files
const loadTargetServerDetails = (targetServerName) => {
  const targetServerDir = path.join(__dirname, '..', 'fromOrgResources', 'TargetServer');
  const filePath = path.join(targetServerDir, `${targetServerName}.json`);

  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileData); // Return target server details as JSON
  } else {
    console.error(`Target server details for '${targetServerName}' not found.`);
    return null;
  }
};

// Main function to handle target server creation for all
const createTargetServerAll = async (config, authToken) => {
  try {
    const orgName = config.Organization.To['org-name']; // Get destination organization name from config
    const envName = config.Organization.To['environment']; // Get destination environment from config

    const targetServerDir = path.join(__dirname, '..', 'fromOrgResources', 'TargetServer');
    const files = fs.readdirSync(targetServerDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const targetServerName = path.basename(file, '.json');
        
        try {
          // Load target server details from the local file
          const targetServerDetails = loadTargetServerDetails(targetServerName);

          if (targetServerDetails) {
            // Create the target server in the destination environment
            await createTargetServer(targetServerDetails, authToken, orgName, envName);
          }
        } catch (error) {
          console.error(`Skipping target server '${targetServerName}' due to error: ${error.message}`);
          continue; // Skip to the next target server if any error occurs
        }
      }
    }
    
    console.log('Target server creation process completed.');
  } catch (error) {
    console.error('Target server creation failed:', error.message);
    process.exit(1); // Exit the process with an error code
  }
};

module.exports = createTargetServerAll;
