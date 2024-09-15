
const fs = require('fs');

// Function to validate configuration structure
const validateConfig = (config) => {
    // Define required keys and their structure
    const requiredKeys = ['Apigee-resource', 'Organization'];
    const allKeys = ['Proxy', 'Shareflow', 'TargetServers'];
    const specificKeys = ['proxy', 'sharedflow', 'targetServer'];
    const OrganizationKeys = ['From', 'To'];
  
    // Validate the presence of required keys
    if (!requiredKeys.every(key => key in config)) {
      throw new Error('Invalid configuration: Missing required key(s)');
    }
  
    // Validate the "Apigee-resource" section
    const resources = config['Apigee-resource'];
    if (!resources.All || !resources.Specific) {
      throw new Error('Invalid configuration: Missing "All" or "Specific" section in "Apigee-resource"');
    }
  
    // Validate the "All" section
    const allSection = resources.All;
    const allKeysPresent = Object.keys(allSection);
    if (!allKeys.every(key => allKeysPresent.includes(key))) {
      throw new Error('Invalid configuration: Incorrect keys in "All" section');
    }
  
    // Validate the "Specific" section
    const specificSection = resources.Specific;
    const specificKeysPresent = Object.keys(specificSection);
    if (!specificKeys.every(key => specificKeysPresent.includes(key))) {
      throw new Error('Invalid configuration: Incorrect keys in "Specific" section');
    }
  
    // Validate the "Organization" section
    const Organization = config['Organization'];
    const OrganizationKeysPresent = Object.keys(Organization);
    if (!OrganizationKeys.every(key => OrganizationKeysPresent.includes(key))) {
      throw new Error('Invalid configuration: Missing "From" or "To" section in "Organization"');
    }
  };
  
  // Function to load configuration from a file
  const loadConfigFromFile = async (filePath) => {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const config = JSON.parse(data);
      validateConfig(config);
      return config;
    } catch (error) {
      console.error('Error loading or validating config:', error.message);
      process.exit(1);
    }
  };
  
  // Function to perform migration based on "All" section
  const performAllMigration = (config) => {
    const resources = config['Apigee-resource'].All;
  
    if (resources.Proxy) {
      console.log('Migrating proxies...');
      // Add logic to migrate proxies here
    }
  
    if (resources.Shareflow) {
      console.log('Migrating sharedflows...');
      // Add logic to migrate sharedflows here
    }
  
    if (resources.TargetServers) {
      console.log('Migrating target servers...');
      // Add logic to migrate target servers here
    }
  };
  
  // Function to perform migration based on "Specific" section
  const performSpecificMigration = (config) => {
    const resources = config['Apigee-resource'].Specific;
  
    if (resources.proxy) {
      console.log('Migrating specific proxies:', resources.proxy);
      // Add logic to migrate specific proxies here
    }
  
    if (resources.sharedflow) {
      console.log('Migrating specific sharedflows:', resources.sharedflow);
      // Add logic to migrate specific sharedflows here
    }
  
    if (resources.targetServer) {
      console.log('Migrating specific target servers:', resources.targetServer);
      // Add logic to migrate specific target servers here
    }
  };



  module.exports={loadConfigFromFile, performAllMigration, performSpecificMigration}