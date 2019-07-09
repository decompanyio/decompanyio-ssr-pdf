let express = require('express');
let router = express.Router();

router.get('/', function (req, res, next) {
    // 렌더링
    console.log('callback 페이지 렌더링 시작 . . .');
    res.render('callback', {
        title: 'callback',
        env: process.env.NODE_ENV_SUB
    });

});


module.exports = router;
