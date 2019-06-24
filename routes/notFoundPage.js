let express = require('express');
let router = express.Router();

router.get('/', function (req, res, next) {

    // 렌더링
    res.render('notFoundPage', {
        title: 'notFoundPage',
    });

});


module.exports = router;
