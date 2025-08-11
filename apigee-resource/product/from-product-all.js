const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { SingleBar, Presets } = require('cli-progress'); // Use cli-progress for modern progress bar
const chalk = require('chalk');

// Ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Fetch API products
const fetchApiProducts = async (authToken, orgName) => {
  try {
    const response = await axios.get(`https://apigee.googleapis.com/v1/organizations/${orgName}/apiproducts`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      }
    });
    return response.data.apiProduct;
  } catch (error) {
    console.error(chalk.red('Error fetching API products:'), error.response?.data?.message || error.message);
    throw error;
  }
};

// Download API product details
const downloadApiProductDetails = async (productName, authToken, orgName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apiproducts/${productName}`;
  const productDir = path.join(__dirname, '..', 'fromOrgResources', 'APIProducts');
  
  ensureDirectoryExists(productDir);

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      }
    });
    
    const outputPath = path.join(productDir, `${productName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));
    return { success: true, path: outputPath };
  } catch (error) {
    let errorMessage;
    
    // Enhanced error handling with more details
    if (error.response) {
      const { status, data } = error.response;
      errorMessage = `Status: ${status}, Message: ${data.message || JSON.stringify(data)}`;
    } else if (error.request) {
      errorMessage = `No response received: ${error.message}`;
    } else {
      errorMessage = `Request error: ${error.message}`;
    }
    
    console.error(chalk.red(`\n Error downloading details for product ${productName}: ${errorMessage} \n`));
    throw new Error(`Failed to download '${productName}': ${errorMessage}`);
  }
};

// Main function for API product migration
const fromApiProductAll = async (config, fromAuthToken) => {
  try {
    const fromOrgName = config.Organization.From['org-name'];
    console.log(chalk.blue(`Fetching API products from ${fromOrgName}...`));
    
    const apiProducts = await fetchApiProducts(fromAuthToken, fromOrgName);

    if (!apiProducts || apiProducts.length === 0) {
      console.log(chalk.yellow(`No API products found to migrate.\n`));
      return;
    }

    console.log(chalk.green(`Found ${apiProducts.length} API products to download.`));
    
    // Initialize progress bar
    const progressBar = new SingleBar({
      format: '{bar} | {percentage}% || {value}/{total} Products',
      hideCursor: true,
    }, Presets.shades_classic);

    progressBar.start(apiProducts.length, 0);
    
    let successCount = 0;
    let failureCount = 0;

    for (const product of apiProducts) {
      try {
        const result = await downloadApiProductDetails(product.name, fromAuthToken, fromOrgName);
        if (result.success) {
          successCount++;
          console.log(chalk.green(`Downloaded details for product ${product.name} to ${result.path}`));
        }
        progressBar.increment(); // Update progress bar
      } catch (error) {
        failureCount++;
        console.error(chalk.red(`Skipping product ${product.name} due to error: ${error.message}`));
      }
    }

    progressBar.stop();
    console.log(chalk.bold.green(`\nAPI product download summary:`));
    console.log(chalk.green(`- Successfully downloaded: ${successCount}`));
    if (failureCount > 0) {
      console.log(chalk.red(`- Failed to download: ${failureCount}`));
    }
    console.log(chalk.green(`\nAll API products processing completed.\n`));
  } catch (error) {
    console.error(chalk.red('API product migration failed:'), error.message);
  }
};

module.exports = fromApiProductAll;
