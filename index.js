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

let fromAuthToken;
let toAuthToken;

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
    
    // Only execute the function if the value in config is explicitly true
    if (resources.Proxy === true) {
      console.log('Migrating Proxies...');
      await fromProxyAll(config, fromAuthToken);
    }
    
    if (resources.Shareflow === true) {
      console.log('Migrating Sharedflows...');
      await fromSharedflowAll(config, fromAuthToken);
    }

    if (resources.TargetServers === true) {
      console.log('Migrating Target Servers...');
      await fromTargetServerAll(config, fromAuthToken);
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

    console.log('Migration process completed.');
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
