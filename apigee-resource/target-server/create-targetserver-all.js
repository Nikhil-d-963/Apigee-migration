const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cliProgress = require('cli-progress'); // Import cli-progress
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
        'Content-Type': 'application/json'
      }
    });

    console.log(chalk.green(`Target server '${targetServerDetails.name}' created successfully.`));
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(chalk.red(`Error creating target server '${targetServerDetails.name}':`), error.response.data);
    } else {
      console.error(chalk.red(`Error creating target server '${targetServerDetails.name}':`), error.message);
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
    console.error(chalk.red(`Target server details for '${targetServerName}' not found.`));
    return null;
  }
};

// Main function to handle target server creation for all
const createTargetServerAll = async (config, authToken) => {
  let progressBar;
  try {
    const orgName = config.Organization.To['org-name']; // Get destination organization name from config
    const envName = config.Organization.To['environment']; // Get destination environment from config

    const targetServerDir = path.join(__dirname, '..', 'fromOrgResources', 'TargetServer');
    const files = fs.readdirSync(targetServerDir);

    // Initialize progress bar
    const totalFiles = files.filter(file => file.endsWith('.json')).length;
    progressBar = new cliProgress.SingleBar({
      format: 'Creating [{bar}] {percentage}% | {value}/{total} Target Servers',
      barCompleteChar: '=',
      barIncompleteChar: ' ',
      hideCursor: true
    }, cliProgress.Presets.shades_classic);

    progressBar.start(totalFiles, 0);

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
          // Stop the progress bar before printing the error
          if (progressBar) progressBar.stop();
          console.error(chalk.red(`Skipping target server '${targetServerName}' due to error: ${error.message}`));
          continue; // Skip to the next target server if any error occurs
        }

        // Update progress bar
        progressBar.increment();
      }
    }

    // Ensure progress bar stops
    if (progressBar) progressBar.stop();
    console.log(chalk.green('Target server creation process completed.'));
  } catch (error) {
    // Ensure progress bar stops on any top-level error
    if (progressBar) progressBar.stop();
    console.error(chalk.red('Target server creation failed:'), error.message);
    process.exit(1); // Exit the process with an error code
  }
};

module.exports = createTargetServerAll;
