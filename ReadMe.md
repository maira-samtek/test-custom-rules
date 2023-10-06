# Custom Protection Rule
**You may follow this guide to create and register a github app [here](https://docs.github.com/en/actions/deployment/protecting-deployments/creating-custom-deployment-protection-rules)**

From Github:
You can enable your own custom protection rules to gate deployments with third-party services. For example, you can use services such as Datadog, Honeycomb, and ServiceNow to provide automated approvals for deployments to GitHub.com.

Custom deployment protection rules are powered by GitHub Apps and run based on webhooks and callbacks. Approval or rejection of a workflow job is based on consumption of the  `deployment_protection_rule`  webhook. For more information, see "[Webhook events and payloads](https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads#deployment_protection_rule)" and "[Approving or rejecting deployments](https://docs.github.com/en/actions/deployment/protecting-deployments/creating-custom-deployment-protection-rules#approving-or-rejecting-deployments)."

Once you have created a custom deployment protection rule and installed it on your repository, the custom deployment protection rule will automatically be available for all environments in the repository.

# Current Implementation
Github App is checked with the environment's protection rules and Github sends a POST request to webhook of the configured app with the information of the action run. Once the webhook is hit by the github app with the metadata it processes the incoming info and responds to the information accordingly. 
In this implementation, AWS API Gateway and  Lambda function to play the webhook part. You may look at the following [architecture diagram](https://drive.google.com/file/d/1KtjpuduLridV42X4L5-JAbYWLkXXI-dt/view?usp=sharing) to understand it
## Steps to Deploy
To create Lambda + API Gateway through code and deploy, you need to follow these steps
### Amplify setup (Optional)
***Note: You can create the resources manually too. Amplify is just to make it a few commands away***


Install amplify cli from [here](https://docs.amplify.aws/cli/start/install/). Then you need to configure Amplify Profile to init and env and use that for deploying the local lambda and api to eRegs' AWS account
You may follow [this](https://truthfulwrites.blogspot.com/2022/07/set-up-aws-amplify-with-js-websites.html) guide for setting up amplify cli

### Deploy Command
After doing any change to the lambda code, you may run the following command to deploy the changes

    amplify push

## Lambda Function
Lambda function has code [here](https://github.com/maira-samtek/test-custom-rules/tree/main/amplify/backend/function/testcustomrules168ff630/src) and it has an app.js which contains code to run the node express server so that the lambda can be turned into a serverless express server and the POST route ('/') contains the code which responds to the request sent by Github. You may look at following code snippet to understand the flow

        async  function  processPayload(payload) {
    
    const  deploymentCallbackUrl  =  payload.deployment_callback_url;
    
    console.log(deploymentCallbackUrl);
    
    const  installationId  =  payload.installation.id;
    
    console.log(installationId);
    
      
    
    const  jwt  =  getJWT();
    
    const  token  =  await  getToken(installationId, jwt);
    
      
    
    const  environmentName  =  payload.environment;
    
    console.log(environmentName);
    
      
    
    const  runApi  =  deploymentCallbackUrl.replace('/deployment_protection_rule', '');
    
    console.log(runApi);
    
      
    
    const  headers  = {
    
    Authorization:  `Bearer ${token}`,
    
    };
    
      
    
    const  response  =  await  fetch(runApi, {
    
    headers,
    
    });
    
    const  runInfo  =  await  response.json();
    
    const  runName  =  runInfo.name;
    
    console.log(runName);
    
      
    
    if (runName  ===  'Sync Security Hub findings and Jira issues') {
    
    console.log('Approving the deployment');
    
    await  respondReviewerDeployment(`${runApi}/pending_deployments`, REVIEWER_TOKEN, PROD_ID, 'approved')
    
    await  respondDeployment(deploymentCallbackUrl, token, environmentName, 'approved');
    
    } else {
    
    console.log('Rejecting the deployment');
    
    await  respondDeployment(deploymentCallbackUrl, token, environmentName, 'approved');
    
    }
    
      
    
    return  'Processed.';
    
    }

***Note: You may change the code and deploy it using the deploy command discussed above***
## Add Secret Variable in Lambda
You may add the reviewer token as secret env variable using following commands


- amplify update function
- choose the function name from list
- Now choose to add secret environment
- Now add secret info as prompted .i.e. name and value
- Update Code to use the secret from secrets manager of AWS (follow this [guide](https://dev.to/aws-builders/how-to-use-secrete-manager-in-aws-lambda-node-js-3j80))
- Deploy Lambda using deploy command i.e. amplify push
