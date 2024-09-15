const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
// Function to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  };
  
  // Function to upload a proxy bundle
  const uploadProxyBundle = async (filePath, proxyName, authToken, orgName) => {
    const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/apis?action=import&name=${proxyName}&validate=true`;
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));
  
      const response = await axios.post(url, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${authToken}`,
        }
      });
  
      console.log(`Uploaded proxy bundle ${filePath} successfully.`);
      return response.data;
    } catch (error) {
      console.error(`Error uploading proxy bundle ${filePath}:`, error.message);
      throw error;
    }
  };
  
  // Function to deploy the proxy to an environment
  const deployProxy = async (proxyName, revision, authToken, orgName, environment) => {
    const url = `https://apigee.googleapis.com/v1/organizations/${orgName}/environments/${environment}/apis/${proxyName}/revisions/${revision}/deployments`;
    try {
      const response = await axios.post(url, {}, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
  
      console.log(`Deployed proxy ${proxyName} revision ${revision} to environment ${environment}.`);
      return response.data;
    } catch (error) {
      console.error(`Error deploying proxy ${proxyName} revision ${revision}:`, error.message);
      throw error;
    }
  };
  
  // Function to fetch revisions for a proxy
  const fetchRevisions = async (proxyName, authToken, orgName) => {
    try {
      const response = await axios.get(`https://apigee.googleapis.com/v1/organizations/${orgName}/apis/${proxyName}/revisions`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching revisions for proxy ${proxyName}:`, error.message);
      throw error;
    }
  };
  
  // Main function to handle deployment of all proxies
  const deployAllProxies = async (config, authToken) => {
    try {
      const orgName = config.Organization.To['org-name'];
      const environment = config.Organization.To['environment'];
  
      // Ensure the directory exists
      ensureDirectoryExists(path.join(__dirname, '..', 'fromOrgResources', 'proxies'));
  
      const proxyDir = path.join(__dirname, '..', 'fromOrgResources', 'proxies');
      const files = fs.readdirSync(proxyDir);
  
      for (const file of files) {
        if (file.endsWith('.zip')) {
          const proxyName = path.basename(file, '.zip');
          // Upload the proxy bundle
          await uploadProxyBundle(path.join(proxyDir, file), proxyName, authToken, orgName);
          // Deploy the proxy bundle
          const revisions = await fetchRevisions(proxyName, authToken, orgName);
          const latestRevision = Math.max(...revisions.map(Number));
          await deployProxy(proxyName, latestRevision, authToken, orgName, environment);
        }
      }
    } catch (error) {
      console.error('Deployment failed:', error.message);
      process.exit(1);
    }
  };
  


  module.exports = deployAllProxies;