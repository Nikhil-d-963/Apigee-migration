#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const program = new Command();
const inquirer = require('inquirer');
const {loadConfigFromFile, performAllMigration, performSpecificMigration} = require('./config-handle/config-handle')
const fromProxyAll = require('./apigee-resource/proxy/from-proxy-all')
const fromSharedflowAll = require('./apigee-resource/sharedflow/from-sharedflow-all')
const fromTargetServerAll = require('./apigee-resource/target-server/from-targetserver-all')




const getAuthToken = async () => {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'authToken',
          message: 'Please enter From Org Google Cloud auth token:',
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
program
  .version('1.0.0')
  .description('Apigee Migration CLI Tool');

// Command for migrating all resources
program
  .command('all')
  .description('Migrate all resources based on the "All" section of the config file')
  .option('--config <path>', 'Path to the confifg file', 'config.json')
  .action(async (cmd) => {
    const configPath = path.resolve(cmd.config);
    const config = await loadConfigFromFile(configPath);
    console.log('Loaded configuration:', config);
    performAllMigration(config);
    const authToken = await getAuthToken();
    await fromProxyAll(config,authToken)
    await fromSharedflowAll(config, authToken);
    await fromTargetServerAll(config,authToken)
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
