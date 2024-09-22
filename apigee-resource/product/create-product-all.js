const fs = require('fs');
const path = require('path');
const axios = require('axios');
let chalk;
(async () => {
  chalk = (await import('chalk')).default;
})();

// Function to create an API product
const createApiProduct = async (apiProductDetails, authToken, orgName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apiproducts`;

  try {
    const response = await axios.post(url, apiProductDetails, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(chalk.green(`API Product '${apiProductDetails.name}' created successfully.`));
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(chalk.red(`Error creating API Product '${apiProductDetails.name}':`), error.response.data);
    } else {
      console.error(chalk.red(`Error creating API Product '${apiProductDetails.name}':`), error.message);
    }
    throw error;
  }
};

// Function to load API product details from local JSON files
const loadApiProductDetails = (apiProductName) => {
  const apiProductDir = path.join(__dirname, '..', 'fromOrgResources', 'APIProducts');
  const filePath = path.join(apiProductDir, `${apiProductName}.json`);

  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileData); // Return API product details as JSON
  } else {
    console.error(chalk.red(`API Product details for '${apiProductName}' not found.`));
    return null;
  }
};

// Main function to handle API product creation for all
const createApiProductAll = async (config, authToken) => {
  try {
    const orgName = config.Organization.To['org-name']; // Get destination organization name from config

    const apiProductDir = path.join(__dirname, '..', 'fromOrgResources', 'APIProducts');
    const files = fs.readdirSync(apiProductDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const apiProductName = path.basename(file, '.json');

        try {
          // Load API product details from the local file
          const apiProductDetails = loadApiProductDetails(apiProductName);

          if (apiProductDetails) {
            // Create the API product in the destination environment
            await createApiProduct(apiProductDetails, authToken, orgName);
          }
        } catch (error) {
          console.error(chalk.red(`Skipping API Product '${apiProductName}' due to error: ${error.message}`));
          continue; // Skip to the next API product if any error occurs
        }

        // Simple progress update
        console.log(chalk.yellow(`Created API Product '${apiProductName}'.`));
      }
    }

    console.log(chalk.green('API Product creation process completed.'));
  } catch (error) {
    console.error(chalk.red('API Product creation failed:'), error.message);
    process.exit(1); // Exit the process with an error code
  }
};

module.exports = createApiProductAll;
