const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { SingleBar } = require('cli-progress'); // Import SingleBar directly
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
    return response.data; // Assuming the response is an array of target server objects
  } catch (error) {
    console.error(chalk.red(`Error fetching target servers:`), error.message);
    throw error;
  }
};

// Function to download a target server's details
const downloadTargetServerDetails = async (targetServerName, authToken, orgName, envName) => {
  const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/environments/${envName}/targetservers/${targetServerName}`;
  try {
    const targetServerDir = path.join(__dirname, '..', 'fromOrgResources', 'TargetServer');
    ensureDirectoryExists(targetServerDir);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      }
    });

    const outputPath = path.join(targetServerDir, `${targetServerName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));
    console.log(chalk.green(`$ Downloaded details for target server ${targetServerName} to ${outputPath} \n`));
  } catch (error) {
    throw new Error(`$ Error downloading details for target server ${targetServerName}: ${error.message} \n`);
  }
};

// Main function to handle target server migration
const fromTargetServerAll = async (config, authToken) => {
  const orgName = config.Organization.From['org-name'];
  const envName = config.Organization.From['environment'];

  try {
    const targetServers = await fetchTargetServers(authToken, orgName, envName);

    const progressBar = new SingleBar({
      format: `${chalk.green('--> Downloading')} [{bar}] {percentage}% | {value}/{total} Target Servers \n`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });

    progressBar.start(targetServers.length, 0);

    for (const targetServer of targetServers) {
      try {
        await downloadTargetServerDetails(targetServer, authToken, orgName, envName);
        progressBar.increment();
      } catch (error) {
        console.error(chalk.red(`**Skipping target server '${targetServer}' due to error: ${error.message}`));
      }
    }

    progressBar.stop();
    console.log(chalk.bold.green('== All target servers have been downloaded successfully. =='));
  } catch (error) {
    console.error(chalk.red('@** Target server migration failed:'), error.message);
    process.exit(1);
  }
};

module.exports = fromTargetServerAll;
