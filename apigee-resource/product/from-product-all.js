const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { SingleBar, Presets } = require('cli-progress'); // Use cli-progress for modern progress bar
let chalk;

(async () => {
  chalk = (await import('chalk')).default;
})();

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
    console.log(chalk.green(` \n Downloaded details for product ${productName} to ${outputPath} \n`));
  } catch (error) {
    console.error(chalk.red(` \n Error downloading details for product ${productName}: ${error.message} \n`));
    throw error;
  }
};

// Main function for API product migration
const fromApiProductAll = async (config, fromAuthToken) => {
  try {
    const fromOrgName = config.Organization.From['org-name'];
    const apiProducts = await fetchApiProducts(fromAuthToken, fromOrgName);

    if (!apiProducts || apiProducts.length === 0) {
      console.log(chalk.yellow(`No API products found to migrate. \n`));
      return;
    }

    // Initialize progress bar
    const progressBar = new SingleBar({
      format: '{bar} | {percentage}% || {value}/{total} Products',
      hideCursor: true,
    }, Presets.shades_classic);

    progressBar.start(apiProducts.length, 0);

    for (const product of apiProducts) {
      try {
        await downloadApiProductDetails(product.name, fromAuthToken, fromOrgName);
        progressBar.increment(); // Update progress bar
      } catch (error) {
        console.error(chalk.red(`Skipping product ${product.name} due to error: ${error.message} \n`));
      }
    }

    progressBar.stop();
    console.log(chalk.green(`All API products have been downloaded successfully. \n`));
  } catch (error) {
    console.error(chalk.red('API product migration failed:'), error.message);
  }
};

module.exports = fromApiProductAll;
