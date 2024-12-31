const http                      = require('http');
const express                   = require('express');
const cors                      = require('cors');
const app                       = express();
const config                    = require('../../config/index.config');
const verifyRoleToken           = require('../../mws/__rbam.mw');
const rateLimit                 = require('express-rate-limit');
const swaggerUi                 = require('swagger-ui-express');
const fs                        = require('fs');
const path                      = require('path');


module.exports = class UserServer {
    constructor({config, managers}){
        this.config        = config;
        this.userApi       = managers.userApi;
    }
    
    /** for injecting middlewares */
    use(args){
        app.use(args);
    }

    /** server configs */
    run(managers){
        const corsOptions = {
            origin: '*',  // Allows all domains; change this for tighter security
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'], // Ensure the necessary headers are allowed
            preflightContinue: false,
            optionsSuccessStatus: 200
        };
        
        app.use(cors(corsOptions));        
        app.use(express.json());
        app.use(express.urlencoded({ extended: true}));
        app.use('/static', express.static('public'));
        
        // Define rate limit configuration
        // Security feature to restrict DDOS attack
        const limiter = rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 100, // Limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again after a minute',
            headers: true,
        });
  
        // Apply rate limiting middleware to all routes
        app.use(limiter);
        // Read the swagger.json file
        const swaggerDocument = JSON.parse(
            fs.readFileSync(path.join(__dirname, '../../swagger.json'), 'utf8')
        );
        
        // Set up Swagger UI middleware
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  

        app.use('/api', verifyRoleToken({ config, managers }));
        app.post('/api/:moduleName/:fnName',this.userApi.mw);
        app.put('/api/:moduleName/:fnName/:id', this.userApi.mw);
        app.get('/api/:moduleName/:fnName/:id', this.userApi.mw);
        app.get('/api/:moduleName/:fnName', this.userApi.mw);
        app.delete('/api/:moduleName/:fnName/:id', this.userApi.mw);

        let server = http.createServer(app);
        server.listen(this.config.dotEnv.USER_PORT, () => {
            console.log(`${(this.config.dotEnv.SERVICE_NAME).toUpperCase()} is running on port: ${this.config.dotEnv.USER_PORT}`);
        });
    }
}