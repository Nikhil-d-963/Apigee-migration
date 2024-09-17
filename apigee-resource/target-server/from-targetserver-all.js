const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cliProgress = require('cli-progress'); // Import cli-progress
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
    console.error(chalk.red('Error fetching target servers:'), error.message);
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
    console.log(chalk.green(`Downloaded details for target server ${targetServerName} to ${outputPath}`));
  } catch (error) {
    throw new Error(`Error downloading details for target server ${targetServerName}: ${error.message}`);
  }
};

// Main function to handle 'all' target server migration
const fromTargetServerAll = async (config, authToken) => {
  let progressBar;
  try {
    const orgName = config.Organization.From['org-name']; // Get organization name from config
    const envName = config.Organization.From['environment']; // Get environment name from config

    const targetServers = await fetchTargetServers(authToken, orgName, envName);

    // Initialize progress bar
    const totalServers = targetServers.length;
    progressBar = new cliProgress.SingleBar({
      format: `Downloading [{bar}] {percentage}% | {value}/{total} Target Servers`,
      barCompleteChar: '=',
      barIncompleteChar: ' ',
      hideCursor: true
    }, cliProgress.Presets.shades_classic);

    progressBar.start(totalServers, 0);

    for (const targetServer of targetServers) {
      try {
        await downloadTargetServerDetails(targetServer, authToken, orgName, envName);
        progressBar.increment(); // Update progress bar
      } catch (error) {
        // Stop the progress bar before printing the error
        if (progressBar) {
          progressBar.stop();
          // Clear line and move cursor up to avoid overlap
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
        }
        console.error(chalk.red(`Skipping target server ${targetServer} due to error: ${error.message}`));
        continue;
      }
    }

    // Ensure progress bar stops
    if (progressBar) {
      progressBar.stop();
      // Clear line and move cursor up to avoid overlap
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
    }
    console.log(chalk.green('All target servers have been downloaded successfully.'));
  } catch (error) {
    // Ensure progress bar stops on any top-level error
    if (progressBar) {
      progressBar.stop();
      // Clear line and move cursor up to avoid overlap
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
    }
    console.error(chalk.red('Target server migration failed:'), error.message);
    process.exit(1); // Exit the process with an error code
  }
};

module.exports = fromTargetServerAll;
