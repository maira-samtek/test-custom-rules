/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/




const express = require('express')
const bodyParser = require('body-parser')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

function getJWT() {
  const pem = 'custom-approver.2023-09-29.private-key.pem';
  const appId = 399239;

  // Open PEM
  const fs = require('fs');
  const signingKey = fs.readFileSync(pem);

  const payload = {
      // Issued at time
      iat: Math.floor(Date.now() / 1000),
      // JWT expiration time (10 minutes maximum)
      exp: Math.floor(Date.now() / 1000) + 600,
      // GitHub App's identifier
      iss: appId,
  };

  // Create JWT
  const encodedJWT = jwt.sign(payload, signingKey, { algorithm: 'RS256' });

  console.log(`JWT: ${encodedJWT}`);
  return encodedJWT;
}

async function getToken(installationId, jwt) {
  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;
  const response = await fetch(url, {
      method: 'POST',
      headers: {
          Authorization: `Bearer ${jwt}`,
      },
  });
  const data = await response.json();
  console.log(data.token);
  return data.token;
}

async function respondDeployment(deploymentCallbackUrl, token, environmentName, status) {
  const url = deploymentCallbackUrl;
  const payload = JSON.stringify({
      environment_name: environmentName,
      state: status,
      comment: 'Reviewed',
  });

  const headers = {
      Accept: 'application/vnd.github.antiope-preview+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
  };

  const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payload,
  });

  const responseData = await response.text();
  console.log(responseData);
  return responseData;
}

async function processPayload(payload) {
  const deploymentCallbackUrl = payload.deployment_callback_url;
  console.log(deploymentCallbackUrl);
  const installationId = payload.installation.id;
  console.log(installationId);

  const jwt = getJWT();
  const token = await getToken(installationId, jwt);

  const environmentName = payload.environment;
  console.log(environmentName);

  const runApi = deploymentCallbackUrl.replace('/deployment_protection_rule', '');
  console.log(runApi);

  const headers = {
      Authorization: `Bearer ${token}`,
  };

  const response = await fetch(runApi, {
      headers,
  });
  const runInfo = await response.json();
  const runName = runInfo.name;
  console.log(runName);

  if (runName === 'Sync Security Hub findings and Jira issues') {
      console.log('Approving the deployment');
      await respondDeployment(deploymentCallbackUrl, token, environmentName, 'approved');
  } else {
      console.log('Rejecting the deployment');
      await respondDeployment(deploymentCallbackUrl, token, environmentName, 'rejected');
  }

  return 'Processed.';
}

// declare a new express app
const app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
});


/**********************
 * Example get method *
 **********************/

app.get('/', function(req, res) {
  // Add your code here
  res.json({success: 'get call succeed!', url: req.url});
});

app.get('//*', function(req, res) {
  // Add your code here
  res.json({success: 'get call succeed!', url: req.url});
});

/****************************
* Example post method *
****************************/
app.post('/',async function(req, res) {
  // Add your code here
  const payload = req.body;
  console.log(payload);
  await processPayload(payload);
  res.json({success: 'post call succeed!', url: req.url, body: req.body})
});

app.post('/deployment_protection_rule',async function(req, res) {
  // Add your code here
  const payload = req.body;
  console.log(payload);
  await processPayload(payload);
  res.json({success: 'post call succeed!', url: req.url, body: req.body})
});


/****************************
* Example put method *
****************************/

app.put('/', function(req, res) {
  // Add your code here
  res.json({success: 'put call succeed!', url: req.url, body: req.body})
});

app.put('//*', function(req, res) {
  // Add your code here
  res.json({success: 'put call succeed!', url: req.url, body: req.body})
});

/****************************
* Example delete method *
****************************/

app.delete('/', function(req, res) {
  // Add your code here
  res.json({success: 'delete call succeed!', url: req.url});
});

app.delete('//*', function(req, res) {
  // Add your code here
  res.json({success: 'delete call succeed!', url: req.url});
});

app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
