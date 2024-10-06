const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { SingleBar } = require('cli-progress'); // Importing SingleBar directly
let chalk;

(async () => {
  chalk = (await import('chalk')).default;
})();

// Function to create a target server
const createTargetServer = async (targetServerDetails, authToken, orgName, envName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/environments/${envName}/targetservers`;

  try {
    const response = await axios.post(url, targetServerDetails, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(chalk.green(` $ Target server '${targetServerDetails.name}' created successfully. \n`));
    return response.data;
  } catch (error) {
    const errorMessage = error.response
      ? `Error creating target server '${targetServerDetails.name}': ${JSON.stringify(error.response.data)}`
      : `Error creating target server '${targetServerDetails.name}': ${error.message}`;
    console.error(chalk.red(errorMessage));
    throw error;
  }
};

// Function to load target server details from local JSON files
const loadTargetServerDetails = (targetServerName) => {
  const targetServerDir = path.join(__dirname, '..', 'fromOrgResources', 'TargetServer');
  const filePath = path.join(targetServerDir, `${targetServerName}.json`);

  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')); // Return target server details as JSON
  } else {
    console.error(chalk.red(`**Target server details for '${targetServerName}' not found. \n`));
    return null;
  }
};

// Main function to handle target server creation for all
const createTargetServerAll = async (config, authToken) => {
  const orgName = config.Organization.To['org-name'];
  const envName = config.Organization.To['environment'];

  const targetServerDir = path.join(__dirname, '..', 'fromOrgResources', 'TargetServer');
  const files = fs.readdirSync(targetServerDir).filter(file => file.endsWith('.json'));

  const progressBar = new SingleBar({
    format: `--> Creating [{bar}] {percentage}% | {value}/{total} Target Servers \n`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    stopOnComplete: true,
    // Set the bar's colors
    format: `${chalk.green('--> Creating')} |{bar}| {percentage}% | {value}/{total} Target Servers \n`
  });

  progressBar.start(files.length, 0);

  for (const file of files) {
    const targetServerName = path.basename(file, '.json');
    try {
      const targetServerDetails = loadTargetServerDetails(targetServerName);
      if (targetServerDetails) {
        await createTargetServer(targetServerDetails, authToken, orgName, envName);
      }
    } catch (error) {
      console.error(chalk.bold.red(`** Skipping target server '${targetServerName}' due to error: ${error.message} \n`));
    } finally {
      progressBar.increment();
    }
  }

  progressBar.stop();
  console.log(chalk.bold.green(`== Target server creation process completed. == \n`));
};

module.exports = createTargetServerAll;
