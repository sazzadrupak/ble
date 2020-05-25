/* eslint linebreak-style: ["error", "windows"] */
const fs = require('fs');
const path = require('path');
const http = require('http');

const app = require('connect')();
const swaggerTools = require('swagger-tools');
const jsyaml = require('js-yaml');
const cors = require('cors');

const serverPort = process.env.PORT || 8080;

const whitelist = ['http://192.168.99.100:33910/v1', 'http://127.0.0.1:8080/v1'];
/* eslint-disable no-unused-vars */
const corsOptions = {
  origin: (origin, callback) => {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};
/* eslint-enable no-unused-vars */
// swaggerRouter configuration
const options = {
  swaggerUi: path.join(__dirname, '/swagger.json'),
  controllers: path.join(__dirname, './controllers'),
  useStubs: process.env.NODE_ENV === 'development',
};

const spec = fs.readFileSync(path.join(__dirname, 'api/swagger.yaml'), 'utf8');
const swaggerDoc = jsyaml.safeLoad(spec);

// Initialize the Swagger middleware
swaggerTools.initializeMiddleware(swaggerDoc, (middleware) => {
  app.use(cors());
  app.use(middleware.swaggerMetadata());
  // Validate Swagger requests
  app.use(middleware.swaggerValidator());

  // Route validated requests to appropriate controller
  app.use(middleware.swaggerRouter(options));

  // Serve the Swagger documents and Swagger UI
  app.use(middleware.swaggerUi());

  // Start the server
  http.createServer(app).listen(serverPort, () => {
    /* eslint-disable no-console */
    console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
    console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
    /* eslint-enable no-console */
  });
});
