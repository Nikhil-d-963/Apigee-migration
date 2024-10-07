#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const program = new Command();
const inquirer = require('inquirer');
const chalk = require('chalk');
const {
  loadConfigFromFile,
  performAllMigration,
  performSpecificMigration
} = require('./config-handle/config-handle');
const fromProxyAll = require('./apigee-resource/proxy/from-proxy-all');
const fromSharedflowAll = require('./apigee-resource/sharedflow/from-sharedflow-all');
const fromTargetServerAll = require('./apigee-resource/target-server/from-targetserver-all');
const deployProxyAll = require('./apigee-resource/proxy/deploy-proxy-all');
const deploySharedflowAll = require('./apigee-resource/sharedflow/deploy-sharedflow-all');
const createTargetServerAll = require('./apigee-resource/target-server/create-targetserver-all');
const fromApiProductAll = require('./apigee-resource/product/from-product-all');
const createApiProductAll = require('./apigee-resource/product/create-product-all');

let fromAuthToken;
let toAuthToken;

const deleteDirectory = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isDirectory()) {
        deleteDirectory(filePath); // Recursively delete subdirectories
      } else {
        fs.unlinkSync(filePath); // Delete files
      }
    });
    fs.rmdirSync(dirPath); // Delete the directory itself
  }
};

const getAuthToken = async (message) => {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'authToken',
        message,
        validate: input => input ? true : 'Auth token cannot be empty',
      }
    ]);
    return answers.authToken;
  } catch (error) {
    console.error(chalk.red('Error while prompting for auth token:'), error.message);
    throw error;
  }
};

// Main CLI program
program.version('1.0.0').description('Apigee Migration CLI Tool');

// Command for migrating all resources
program
  .command('all')
  .description('Migrate all resources based on the "All" section of the config file')
  .option('--config <path>', 'Path to the config file', 'config.json')
  .option('--onlyimport', 'Only import proxy bundles without deploying')
  .action(async (cmd) => {
    const configPath = path.resolve(cmd.config);
    const config = await loadConfigFromFile(configPath);
    console.log(chalk.blue('Loaded configuration:'), config);

    performAllMigration(config);

    fromAuthToken = await getAuthToken(chalk.yellow('Please enter From Org Google Cloud auth token:'));

    console.log(chalk.bold.green('===*** Apigee Migration Started ***==='));

    const resources = config['Apigee-resource']?.All || {};
    const resourcesName = config.Organization.From['org-name'] || 'Unknown Organization';
    const resourcesNameTo = config.Organization.To['org-name'] || 'Unknown Organization';

    // Migration process for different resources
    if (resources.TargetServers) {
      console.log(chalk.bold.blue(`Downloading Target Servers from ${resourcesName}...`));
      await fromTargetServerAll(config, fromAuthToken);
    }

    if (resources.Sharedflow) {
      console.log(chalk.green(`Downloading SharedFlows From ${resourcesName}..`));
      await fromSharedflowAll(config, fromAuthToken);
    }

    if (resources.Proxy) {
      console.log(chalk.green(`Downloading Proxies from ${resourcesName} ...`));
      await fromProxyAll(config, fromAuthToken);
    }

    if (resources.ApiProducts) {
      console.log(chalk.green(`Downloading API Products from ${resourcesName} ...`));
      await fromApiProductAll(config, fromAuthToken);
    }

    toAuthToken = await getAuthToken(chalk.yellow('Please enter Destination Org Google Cloud auth token:'));

    const onlyImport = !!cmd.onlyimport;

    if (resources.TargetServers) {
      console.log(chalk.green(`Migrating Target Servers to ${resourcesNameTo}...`));
      await createTargetServerAll(config, toAuthToken);
    }

    if (resources.Sharedflow) {
      console.log(chalk.green(`Migrating SharedFlows to ${resourcesNameTo}...`));
      await deploySharedflowAll(config, toAuthToken, onlyImport);
    }

    if (resources.Proxy) {
      console.log(chalk.green(`Migrating Proxies to ${resourcesNameTo}...`));
      await deployProxyAll(config, toAuthToken, onlyImport);
    }

    if (resources.ApiProducts) {
      console.log(chalk.green(`Migrating API Products to  ${resourcesNameTo}...`));
      await createApiProductAll(config, fromAuthToken);
    }

    console.log(chalk.bold.green('++++++++++++ Migration process completed.+++++++++++++'));
    const fromOrgResourcesDir = path.join(__dirname, 'apigee-resource', 'fromOrgResources');
    deleteDirectory(fromOrgResourcesDir);
  });

// Command for migrating specific resources
program
  .command('specific')
  .description('Migrate specific resources based on the "Specific" section of the config file')
  .option('--config <path>', 'Path to the config file', 'config.json')
  .action(async (cmd) => {
    const configPath = path.resolve(cmd.config);
    const config = await loadConfigFromFile(configPath);
    console.log(chalk.blue('Loaded configuration:'), config);
    performSpecificMigration(config);
  });

// Parse command-line arguments
program.parse(process.argv);
