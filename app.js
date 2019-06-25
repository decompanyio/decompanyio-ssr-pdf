'use strict';

// NODE_ENV 설정
process.env.NODE_ENV = ( process.env.NODE_ENV && ( process.env.NODE_ENV ).trim().toLowerCase() === 'production' ) ? 'prod' : 'dev';
console.log("process.env.NODE_ENV : [" + ( process.env.NODE_ENV ).trim().toUpperCase() + "]");

const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const compression = require('compression');
const express = require('express');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
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
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/jquery", express.static(path.join(__dirname, "/node_modules/jQuery/dist")));



if (process.env.NODE_ENV === 'dev')  router.use('/sam', compression());
else router.use(compression());



router.use(cors());
router.use(awsServerlessExpressMiddleware.eventContext());



app.use('/', notFoundPageRouter);
app.use('/404', notFoundPageRouter);
app.use('/:documentId', carouselRouter);
app.use(function(err, req, res, next) {     // error handler
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    console.log("error :: ",err);
    res.render('error');
});



// 디렉토리 READ
/*
let fs = require('fs');
let dir = 'views';

let files = fs.readdirSync(dir); // 디렉토리를 읽어온다
/!*console.log("파일 목록 --------------------");
console.log(files);*!/
console.log("이전 파일 목록 --------------------");
fs.readdirSync('../').forEach(file => {
    console.log(file);
});
console.log("현재 파일 목록 --------------------");
fs.readdirSync('./').forEach(file => {
    console.log(file);
});
console.log("views 파일 목록 --------------------");
fs.readdirSync('./views').forEach(file => {
    console.log(file);
});

for(let i = 0; i < files.length; i++){
    let file = files[i];
    let suffix = file.substr(file.length - 5, file.length); // 확장자 추출
   /!* console.log("확장자 목록 --------------------");
    console.log(suffix);*!/

    // 확장자가 json일 경우 읽어 내용 출력
    if (suffix === '.json'){
        fs.readFile(dir + '/' + file,function(err, buf){
           // console.log(buf.toString());
        });
    }
}*/



module.exports = app;
