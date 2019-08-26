'use strict';

// NODE_ENV 설정

if(process.env.NODE_ENV) {
    console.log("process.env.NODE_ENV : [" + (process.env.NODE_ENV).trim().toUpperCase() + "]");
    console.log("process.env.NODE_ENV_SUB : [" + (process.env.NODE_ENV_SUB).trim().toUpperCase() + "]");
}


const path = require('path');
const logger = require('morgan');
const compression = require('compression');
const express = require('express');
const app = express();
const router = express.Router();



let viewerRouter = require('./routes/viewer');
let notFoundPageRouter = require('./routes/notFoundPage');
//let callbackRouter = require('./routes/callback');



// NOTE: tests can't find the views directory without this
console.log("__driname : [" + __dirname + "]");
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');



app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));      // s3 사용

router.use(compression());



app.use('/', notFoundPageRouter);
app.use('/404', notFoundPageRouter);
//app.use('/callback', callbackRouter);
app.use('/:documentId', viewerRouter);
app.use('/:documentId/*', viewerRouter);
app.use(function(err, req, res, next) {     // error handler
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV === 'local' ? err : {};

    // render the error page
    res.status(err.status || 500);
    console.log("error :: ",err);
    res.render('error');
});


module.exports = app;
