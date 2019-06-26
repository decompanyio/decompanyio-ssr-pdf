'use strict';

// NODE_ENV 설정
process.env.NODE_ENV = ( process.env.NODE_ENV && ( process.env.NODE_ENV ).trim().toLowerCase() === 'production' ) ? 'prod' : 'dev';
console.log("process.env.NODE_ENV : [" + ( process.env.NODE_ENV ).trim().toUpperCase() + "]");

const path = require('path');
const logger = require('morgan');
const compression = require('compression');
const express = require('express');
const app = express();
const router = express.Router();



let carouselRouter = require('./routes/carousel');
let notFoundPageRouter = require('./routes/notFoundPage');



// NOTE: tests can't find the views directory without this
console.log("__driname : [" + __dirname + "]");
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');



app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));



if (process.env.NODE_ENV === 'dev')  router.use('/sam', compression());
else router.use(compression());



app.use('/', notFoundPageRouter);
app.use('/404', notFoundPageRouter);
app.use('/:documentId', carouselRouter);
app.use(function(err, req, res, next) {     // error handler
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV === 'dev' ? err : {};

    // render the error page
    res.status(err.status || 500);
    console.log("error :: ",err);
    res.render('error');
});


module.exports = app;
