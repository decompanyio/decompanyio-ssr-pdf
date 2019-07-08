'use strict';
const awsServerlessExpress = require(process.env.NODE_ENV === 'local' ? '../../index' : 'aws-serverless-express');
const app = require('./app');

// NOTE: If you get ERR_CONTENT_DECODING_FAILED in your browser, this is likely
// due to a compressed response (e.g. gzip) which has not been handled correctly
// by aws-serverless-express and/or API Gateway. Add the necessary MIME types to
// binaryMimeTypes below, then redeploy (`npm run package-deploy`)

const server = awsServerlessExpress.createServer(app, null);


console.log("");
console.log("===============================");
console.log("AWS SERVERLESS EXPRESS LOADED");
console.log("===============================");
console.log("");


exports.handler = (event, context) => awsServerlessExpress.proxy(server, event, context);
