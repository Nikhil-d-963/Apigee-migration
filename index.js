#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const program = new Command();
const inquirer = require('inquirer');
const logger = require('./utils/logger');
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
    logger.error(`Error while prompting for auth token: ${error.message}`);
    throw error;
  }
};

// Main CLI program
program.version('1.5.6').description('Apigee Migration CLI Tool');

// Command for migrating all resources
program
  .command('all')
  .description('Migrate all resources based on the "All" section of the config file')
  .option('--config <path>', 'Path to the config file', 'config.json')
  .option('--onlyimport', 'Only import proxy bundles without deploying')
  .action(async (cmd) => {
    // Display banner at start
    logger.printBanner();
    
    const configPath = path.resolve(cmd.config);
    logger.info(`Loading configuration from ${configPath}...`);
    const config = await loadConfigFromFile(configPath);
    logger.success('Configuration loaded successfully');
    
    // Display configuration in a more readable format
    console.log('\nConfiguration:');
    console.log(JSON.stringify(config, null, 2));
    console.log('');

    performAllMigration(config);

    fromAuthToken = await getAuthToken('Please enter From Org Google Cloud auth token:');

    logger.printSection('Apigee Migration Started');

    const resources = config['Apigee-resource']?.All || {};
    const resourcesName = config.Organization.From['org-name'] || 'Unknown Organization';
    const resourcesNameTo = config.Organization.To['org-name'] || 'Unknown Organization';
    
    logger.info(`Source organization: ${resourcesName}`);
    logger.info(`Target organization: ${resourcesNameTo}`);

    // Migration process for different resources
    logger.printSection('Resource Download Phase');
    
    if (resources.TargetServers) {
      logger.info(`Downloading Target Servers from ${resourcesName}...`);
      await fromTargetServerAll(config, fromAuthToken);
    }

    if (resources.Sharedflow) {
      logger.info(`Downloading SharedFlows From ${resourcesName}...`);
      await fromSharedflowAll(config, fromAuthToken);
    }

    if (resources.Proxy) {
      logger.info(`Downloading Proxies from ${resourcesName}...`);
      await fromProxyAll(config, fromAuthToken);
    }

    if (resources.ApiProducts) {
      logger.info(`Downloading API Products from ${resourcesName}...`);
      await fromApiProductAll(config, fromAuthToken);
    }

    toAuthToken = await getAuthToken('Please enter Destination Org Google Cloud auth token:');

    const onlyImport = !!cmd.onlyimport;
    if (onlyImport) {
      logger.info('Running in import-only mode (no deployment)');
    }
    
    logger.printSection('Resource Migration Phase');

    if (resources.TargetServers) {
      logger.info(`Migrating Target Servers to ${resourcesNameTo}...`);
      await createTargetServerAll(config, toAuthToken);
    }

    if (resources.Sharedflow) {
      logger.info(`Migrating SharedFlows to ${resourcesNameTo}...`);
      await deploySharedflowAll(config, toAuthToken, onlyImport);
    }

    if (resources.Proxy) {
      logger.info(`Migrating Proxies to ${resourcesNameTo}...`);
      await deployProxyAll(config, toAuthToken, onlyImport);
    }

    if (resources.ApiProducts) {
      logger.info(`Migrating API Products to ${resourcesNameTo}...`);
      await createApiProductAll(config, toAuthToken);
    }

    logger.printSection('Cleanup');
    const fromOrgResourcesDir = path.join(__dirname, 'apigee-resource', 'fromOrgResources');
    logger.info(`Cleaning up temporary files in ${fromOrgResourcesDir}...`);
    deleteDirectory(fromOrgResourcesDir);
    logger.success('Cleanup completed');
    
    logger.printSection('Migration Complete');
    logger.success('Apigee Migration process completed successfully');
  });

// Command for migrating specific resources
program
  .command('specific')
  .description('Migrate specific resources based on the "Specific" section` of the config file')
  .option('--config <path>', 'Path to the config file', 'config.json')
  .action(async (cmd) => {
    // Display banner at start
    logger.printBanner();
    
    const configPath = path.resolve(cmd.config);
    logger.info(`Loading configuration from ${configPath}...`);
    const config = await loadConfigFromFile(configPath);
    logger.success('Configuration loaded successfully');
    
    // Display configuration in a more readable format
    console.log('\nConfiguration:');
    console.log(JSON.stringify(config, null, 2));
    console.log('');
    
    logger.printSection('Specific Resource Migration');
    performSpecificMigration(config);
    
    logger.printSection('Migration Complete');
    logger.success('Specific resource migration completed successfully');
  });

// Parse command-line arguments
program.parse(process.argv);
