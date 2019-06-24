let express = require('express');
let shortid = require('shortid');
let router = express.Router();

router.get('/', function (req, res, next) {
    // Document 정보 GET
    let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === xhr.DONE) {
            let res = JSON.parse(xhr.responseText);
            checkRes(res.document);

        }
    };
    xhr.open('GET', 'https://api.share.decompany.io/rest/api/document/info' + req.originalUrl, true);
    xhr.send(null);


    function checkRes(docList) {
        if(docList) setImgUrl(docList);
        else{
            // 렌더링
            res.render('notFoundPage', {
                title: 'notFoundPage',
            });
        }
    }

    // 이미지 URL SET
    function setImgUrl(docList) {
        let tmpArr = [];
        for (let i = 0; i < docList.totalPages; ++i) {
            let url = 'https://thumb.share.decompany.io/' + docList.documentId + "/2048/" + (i + 1);
            tmpArr.push({"image": url});
        }

        // 렌더링
        res.render('carousel', {
            title: 'carousel',
            urlList: tmpArr,
            documentId: docList.documentId,
            shortid: shortid.generate()
        });
    }
});


module.exports = router;
