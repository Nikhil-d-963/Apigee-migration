const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Function to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Function to fetch the list of target servers
const fetchTargetServers = async (authToken, orgName, envName) => {
  try {
    const response = await axios.get(`https://apigee.googleapis.com/v1/organizations/${orgName}/environments/${envName}/targetservers`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      }
    });
    return response.data; // Assuming the response is an array of target server names
  } catch (error) {
    console.error('Error fetching target servers:', error.message);
    throw error;
  }
};

// Function to download a target server's details
const downloadTargetServerDetails = async (targetServerName, authToken, orgName, envName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/environments/${envName}/targetservers/${targetServerName}`;
  try {
    const targetServerDir = path.join(__dirname, '..', 'fromOrgResources', 'TargetServer');
    
    // Ensure that the directory exists
    ensureDirectoryExists(targetServerDir);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      }
    });

    const outputPath = path.join(targetServerDir, `${targetServerName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2)); // Write the response data to a JSON file
    console.log(`Downloaded details for target server ${targetServerName} to ${outputPath}`);
  } catch (error) {
    console.error(`Error downloading details for target server ${targetServerName}:`, error.message);
    throw error;
  }
};

// Main function to handle 'all' target server migration
const fromTargetServerAll = async (config, authToken) => {
  try {

    const orgName = config.Organization.From['org-name']; // Get organization name from config
    const envName = config.Organization.From['environment']; // Get environment name from config

    const targetServers = await fetchTargetServers(authToken, orgName, envName);

    for (const targetServer of targetServers) {
      await downloadTargetServerDetails(targetServer, authToken, orgName, envName);
    }

    console.log('All target servers have been downloaded successfully.');
  } catch (error) {
    console.error('Target server migration failed:', error.message);
    process.exit(1); // Exit the process with an error code
  }
};

module.exports = fromTargetServerAll;
