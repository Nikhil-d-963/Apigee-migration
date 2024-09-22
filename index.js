#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const program = new Command();
const inquirer = require('inquirer');
const { loadConfigFromFile, performAllMigration, performSpecificMigration } = require('./config-handle/config-handle');
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
        message: message,
        validate: input => input ? true : 'Auth token cannot be empty',
      }
    ]);
    return answers.authToken;
  } catch (error) {
    console.error('Error while prompting for auth token:', error.message);
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
    console.log('Loaded configuration:', config);

    // Perform general migrations defined in the config
    performAllMigration(config);

    // Get From Org auth token and handle import process
    fromAuthToken = await getAuthToken('Please enter From Org Google Cloud auth token:');

    // Execute migrations based on config's "All" section
    const resources = config['Apigee-resource']?.All || {};


    if (resources.TargetServers === true) {
      console.log('Migrating Target Servers...');
      await fromTargetServerAll(config, fromAuthToken);
    }

    if (resources.Sharedflow === true) {
      console.log('Migrating Sharedflows...');
      await fromSharedflowAll(config, fromAuthToken);
    }

    
    // Only execute the function if the value in config is explicitly true
    if (resources.Proxy === true) {
      console.log('Migrating Proxies...');
      await fromProxyAll(config, fromAuthToken);
    }

    if (resources.ApiProducts === true) {
      console.log('Migrating API Products...');
      await fromApiProductAll(config, fromAuthToken);
    }
    
    



    // Get Destination Org auth token for deployment
    toAuthToken = await getAuthToken('Please enter Destination Org Google Cloud auth token:');

    // Determine if the command is to only import or to both import and deploy
    const onlyImport = !!cmd.onlyimport;

    if (resources.TargetServers === true) {
      console.log('Creating Target Servers in destination...');
      await createTargetServerAll(config, toAuthToken);
    }
    
    if (resources.Sharedflow === true ) {
      console.log('Deploying Sharedflows...');
      await deploySharedflowAll(config, toAuthToken, onlyImport);
    }

    if (resources.Proxy === true) {
      console.log('Deploying Proxies...');
      await deployProxyAll(config, toAuthToken, onlyImport);
    }

    if (resources.ApiProducts === true) {
      console.log('Migrating API Products...');
      await createApiProductAll(config, fromAuthToken);
    }

    
    console.log('Migration process completed.');
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
    console.log('Loaded configuration:', config);
    performSpecificMigration(config);
  });

// Parse command-line arguments
program.parse(process.argv);
