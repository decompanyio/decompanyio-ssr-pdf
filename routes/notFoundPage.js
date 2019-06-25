let express = require('express');
let router = express.Router();

router.get('/', function (req, res, next) {
    console.log("original url : [" + req.originalUrl + "]");


    // 렌더링
    console.log('404 페이지 렌더링 시작 . . .');
    res.render('notFoundPage', {
        title: 'notFoundPage',
    });

});


module.exports = router;
