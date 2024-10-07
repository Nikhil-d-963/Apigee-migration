const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { SingleBar, Presets } = require('cli-progress'); // Use cli-progress for modern progress bar
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

    console.log(chalk.green(` \n API Product '${apiProductDetails.name}' created successfully. \n`));
    return response.data;
  } catch (error) {
    let errorMessage;

    // Check for specific error responses
    if (error.response) {
      const { status, data } = error.response;
      errorMessage = `Status: ${status}, Message: ${data.message || JSON.stringify(data)}`;
    } else {
      errorMessage = error.message;
    }

    console.error(chalk.red(`Error creating API Product '${apiProductDetails.name}': ${errorMessage}`));
    throw new Error(`Failed to create '${apiProductDetails.name}': ${errorMessage}`); // Throw detailed error
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
    console.error(chalk.red(` \n API Product details for '${apiProductName}' not found. \n`));
    return null;
  }
};

// Main function to handle API product creation for all
const createApiProductAll = async (config, authToken) => {
  try {
    const orgName = config.Organization.To['org-name']; // Get destination organization name from config

    const apiProductDir = path.join(__dirname, '..', 'fromOrgResources', 'APIProducts');
    const files = fs.readdirSync(apiProductDir).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
      console.log(chalk.yellow('No API Products found to create.'));
      return;
    }

    // Initialize progress bar
    const progressBar = new SingleBar({
      format: '{bar} | {percentage}% || {value}/{total} API Products \n',
      hideCursor: true,
    }, Presets.shades_classic);
    
    progressBar.start(files.length, 0);

    for (const file of files) {
      const apiProductName = path.basename(file, '.json');

      try {
        // Load API product details from the local file
        const apiProductDetails = loadApiProductDetails(apiProductName);

        if (apiProductDetails) {
          // Create the API product in the destination environment
          await createApiProduct(apiProductDetails, authToken, orgName);
          progressBar.increment(); // Update progress bar
        }
      } catch (error) {
        console.error(chalk.red(`\n Skipping API Product '${apiProductName}' due to error: ${error.message} \n`));
      }
    }

    progressBar.stop();
    console.log(chalk.green('\n API Product creation process completed.'));
  } catch (error) {
    console.error(chalk.red('\n API Product creation failed:'), error.message);
    process.exit(1); // Exit the process with an error code
  }
};

module.exports = createApiProductAll;
