const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ProgressBar = require('progress'); // Use the 'progress' package
let chalk;

(async () => {
  chalk = (await import('chalk')).default;
})();

// Function to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Function to fetch the list of API products
const fetchApiProducts = async (authToken, orgName) => {
  try {
    const response = await axios.get(`https://apigee.googleapis.com/v1/organizations/${orgName}/apiproducts`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      }
    });
    return response.data.apiProduct;
  } catch (error) {
    console.error(chalk.red('Error fetching API products:'), error.message);
    throw error;
  }
};

// Function to download API product details
const downloadApiProductDetails = async (productName, authToken, orgName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apiproducts/${productName}`;
  try {
    const productDir = path.join(__dirname, '..', 'fromOrgResources', 'APIProducts');
    ensureDirectoryExists(productDir);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      }
    });

    const outputPath = path.join(productDir, `${productName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));
    console.log(chalk.green(`Downloaded details for product ${productName} to ${outputPath} \n`));
  } catch (error) {
    throw new Error(`Error downloading details for product ${productName}: ${error.message} \n`);
  }
};

// Main function to handle 'all' API product migration
const fromApiProductAll = async (config, fromAuthToken) => {
  try {
    const fromOrgName = config.Organization.From['org-name'];
    const apiProducts = await fetchApiProducts(fromAuthToken, fromOrgName);

    if (!apiProducts || apiProducts.length === 0) {
      console.log(chalk.yellow('No API products found to migrate.'));
      return;
    }

    // Initialize progress bar
    const totalProducts = apiProducts.length;
    const progressBar = new ProgressBar(`[:bar :current/:total] \n`, {
      total: totalProducts,
      width: 40,
      complete: '=',
      incomplete: ' ',
    });

    for (const product of apiProducts) {
      try {
        await downloadApiProductDetails(product.name, fromAuthToken, fromOrgName);
        progressBar.tick(); // Update progress bar
      } catch (error) {
        console.error(chalk.red(`Skipping product ${product.name} due to error: ${error.message} \n`));
        continue;
      }
    }

    console.log(chalk.green(`All API products have been downloaded successfully. \n`));
  } catch (error) {
    console.error(chalk.red('API product migration failed:'), error.message);
  }
};

module.exports = fromApiProductAll;
