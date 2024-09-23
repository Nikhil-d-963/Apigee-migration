
# Apigee Migration CLI  🚀

##### Apigee Migration CLI is a powerful tool designed to automate 100% of your Apigee resource migrations. Whether you're moving between organizations or environments, This tool intelligently migrates the latest or preferred revision of your Apigee resources, streamlining the entire process and saving you significant time and effort, streamlining the entire process and saving you significant time and effort. 💡
With this tool, you can migrate resources from **non-production** to **production** environments with ease. It's flexible and adaptable for various projects, ensuring that your Apigee resources are transferred accurately and efficiently. Whether you're managing small-scale migrations or working on complex enterprise-level projects, Apigee Migration CLI will save you countless hours and minimize manual intervention. 🛠️📈



## Features (v1.5)  🎯

- #### Migrate Resources:
   Seamlessly migrate Proxies, Sharedflows, API Products and Target Servers. 📦🔁
- #### Migration without Deployment:
  Transfer resources to the destination organization without deploying them immediately 🛑➡️🏁

- #### Migration with Deployment:
  Optionally deploy resources automatically after migration 🚀✅

- #### Migrate Latest Revision:
  Automatically fetch and migrate the latest revision from the source organization 🔄📄

- #### Cross-Organization Migration:
  Migrate resources from one organization to another 🌐🏢➡️🏢

- #### Cross-Environment Migration:
   Migrate resources between different environments within the same organization 🔄🌍

- #### Specific Resource Migration Control:
  Fine-tune which resources to migrate using a customizable config file 🎛️🛠️



## Installation ⚙️
### Step 1:
- Install Apigee Migration CLI with npm

  ```bash
  npm i apigee-migration-cli
  ```
  ### OR

- Install Apigee Migration CLI with Github

  ```bash
  https://github.com/Nikhil-d-963/Apigee-migration.git
  ```
 ###  OR
- Use Apigee Migration CLI with Docker

 ```bash
 docker pull nikhil3690/apigee-migration-cli:v1.5
 ```
        
### Step 2

### Create a configuration file (config.json) based on your requirements  📝
 - Example Config File:

  ```json
  {
    "Apigee-resource": {
      "All": {
        "Proxy": false,
        "Sharedflow": false,
        "TargetServers": true,
        "ApiProducts":true
      },
      "Specific": {
        "proxy": [
          {
            "name": "proxy01/latest",
            "Rev": "01/latest"
          },
          {
            "name": "proxy02",
            "Rev": "01/latest"
          }
        ],
        "sharedflow": [
          {
            "name": "sharedflow1",
            "Rev": "01/latest"
          },
          {
            "name": "sharedflow2",
            "Rev": "01/latest"
          }
        ],
        "targetServer": [
          {
            "name": "target1"
          },
          {
            "name": "target2"
          }
        ]
      }
    },
    "Organization":{
      "From":{
        "org-name":"niv-apigee-From",
        "environment":"eval"
      },
            "To":{
        "org-name":"niv-apigee-To",
        "environment":"eval"
      }
    }
  }
  ```

## Run CLI Tool  🚀


### Step 3
To Migrate All Resources (Proxy, Sharedflow, Target Server) and Deploy to the Destination Organization / Same organization Environment
  ```bash
  apigee-migration all --config ./config.json
  ```
#### Or

To Migrate All Resources without Deploying to the Destination Organization / Same organization Environment:
  ```bash
  apigee-migration all --onlyimport --config ./config.json
  ```

### Step 4
#### Apigee Migration CLI: Authentication Process
- #### When you run this tool, it will prompt you to enter the authentication token for the source organization.

```bash
nikhil.d@ind040100978:~/Documents/Apigee-Utility/apigee-migrate-cli$ apigee-migration all --config ./config.json
Loaded configuration: {
  'Apigee-resource': {
    All: { Proxy: false, Sharedflow: false, TargetServers: true },
    Specific: { proxy: [Array], sharedflow: [Array], targetServer: [Array] }
  },
  Organization: {
    From: { 'org-name': 'test', environment: 'eval' },
    To: { 'org-name': 'test-apigee-eval-01', environment: 'eval' }
  }
}
Migrating target Proxies...
? Please enter From Org Google Cloud auth token: 
You need to provide the auth token.
```
- #### Once it retrieves all the resources from the source organization, it will ask for the destination auth token like below:

```bash
? Please enter From Destination Google Cloud auth token: 
```
 #### If you provide a valid token, the tool will start the migration process.

- How to Generate an Auth Token
  Set the source organization as the default for Google Cloud authentication.

  #### Run the following command to generate the auth token:
```bash
gcloud auth print-access-token
```

#### For the destination organization, repeat the same command after switching the default account to the destination organization.








#### Config Control
You can control which resources to migrate or deploy by updating the config.json file. For example, if you want to migrate only target servers:
  ```bash
      "All": {
      "Proxy": false,
      "Sharedflow": false,
      "TargetServers": true
    },

  ```
### Step 5: Check the Status  📊
You can monitor the migration or deployment status directly in the terminal. The tool will provide detailed logs of success, errors, and progress ✅




## Upcoming Features In v2.0

- Specific Proxy, Sharedflow, Target Server Migration
- App, FlowHooks Migration
- Support for deployment to 2 or more Destination Orgs/Environments
## Creater

Nikhil D 👨‍💻

- [Github](https://github.com/Nikhil-d-963)
- [Linkdin](https://www.linkedin.com/in/nikhild1/)

