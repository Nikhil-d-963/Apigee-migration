const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { SingleBar, Presets } = require('cli-progress'); // Use cli-progress for modern progress bar
const chalk = require('chalk');

// Function to create an API product
const createApiProduct = async (apiProductDetails, authToken, orgName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apiproducts`;

  try {
    // Check if product already exists to avoid duplicate creation errors
    try {
      const checkUrl = `${url}/${apiProductDetails.name}`;
      await axios.get(checkUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      console.log(chalk.yellow(`\n API Product '${apiProductDetails.name}' already exists. Skipping creation. \n`));
      return { name: apiProductDetails.name, status: 'skipped' };
    } catch (checkError) {
      // Product doesn't exist, continue with creation
      if (checkError.response && checkError.response.status === 404) {
        const response = await axios.post(url, apiProductDetails, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(chalk.green(`\n API Product '${apiProductDetails.name}' created successfully. \n`));
        return response.data;
      } else {
        // Re-throw if it's not a 404 error
        throw checkError;
      }
    }
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
    console.log(chalk.blue(`Creating API Products in ${orgName}...`));

    const apiProductDir = path.join(__dirname, '..', 'fromOrgResources', 'APIProducts');
    
    // Check if directory exists
    if (!fs.existsSync(apiProductDir)) {
      console.log(chalk.yellow('API Products directory not found. No products to create.'));
      return;
    }
    
    const files = fs.readdirSync(apiProductDir).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
      console.log(chalk.yellow('No API Products found to create.'));
      return;
    }

    console.log(chalk.green(`Found ${files.length} API Products to create.`));

    // Initialize progress bar
    const progressBar = new SingleBar({
      format: '{bar} | {percentage}% || {value}/{total} API Products',
      hideCursor: true,
    }, Presets.shades_classic);
    
    progressBar.start(files.length, 0);
    
    let successCount = 0;
    let skippedCount = 0;
    let failureCount = 0;

    for (const file of files) {
      const apiProductName = path.basename(file, '.json');

      try {
        // Load API product details from the local file
        const apiProductDetails = loadApiProductDetails(apiProductName);

        if (apiProductDetails) {
          // Create the API product in the destination environment
          const result = await createApiProduct(apiProductDetails, authToken, orgName);
          if (result.status === 'skipped') {
            skippedCount++;
          } else {
            successCount++;
          }
          progressBar.increment(); // Update progress bar
        }
      } catch (error) {
        failureCount++;
        console.error(chalk.red(`Skipping API Product '${apiProductName}' due to error: ${error.message}`));
        progressBar.increment(); // Still increment the progress bar
      }
    }

    progressBar.stop();
    
    console.log(chalk.bold.green('\nAPI Product creation summary:'));
    console.log(chalk.green(`- Successfully created: ${successCount}`));
    if (skippedCount > 0) {
      console.log(chalk.yellow(`- Skipped (already exists): ${skippedCount}`));
    }
    if (failureCount > 0) {
      console.log(chalk.red(`- Failed to create: ${failureCount}`));
    }
    
    console.log(chalk.green('\nAPI Product creation process completed.'));
  } catch (error) {
    console.error(chalk.red('\nAPI Product creation failed:'), error.message);
    // Don't exit the process, just return with error
    return { success: false, error: error.message };
  }
};

module.exports = createApiProductAll;
