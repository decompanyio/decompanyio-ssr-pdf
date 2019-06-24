'use strict';

// NODE_ENV 설정
process.env.NODE_ENV = ( process.env.NODE_ENV && ( process.env.NODE_ENV ).trim().toLowerCase() === 'production' ) ? 'prod' : 'dev';
console.log("process.env.NODE_ENV : [" + ( process.env.NODE_ENV ).trim().toUpperCase() + "]");

const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const createError = require('http-errors');
const cors = require('cors');
const compression = require('compression');
const express = require('express');
const bodyParser = require('body-parser');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const app = express();
const router = express.Router();



let carouselRouter = require('./routes/carousel');
let notFoundPageRouter = require('./routes/notFoundPage');



// NOTE: tests can't find the views directory without this
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');



app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/jquery", express.static(path.join(__dirname, "/node_modules/jQuery/dist")));



if (process.env.NODE_ENV === 'dev')  router.use('/sam', compression());
else router.use(compression());



router.use(cors());
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: true}));
router.use(awsServerlessExpressMiddleware.eventContext());



app.use('/', notFoundPageRouter);
app.use('/404', notFoundPageRouter);
app.use('/:documentId', carouselRouter);
app.use(function(req, res, next) {next(createError(404));});
app.use(function(err, req, res, next) {     // error handler
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});



module.exports = app;
