let express = require('express');
let shortid = require('shortid');
let router = express.Router();

router.get('/', function (req, res, next) {
    // Document 정보 GET
    console.log('XMLHttpRequest 시작 . . .');
    let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        console.log('XML 상태 : ' + xhr.readyState);
        if (xhr.readyState === xhr.DONE) {
            let res = JSON.parse(xhr.responseText);

            console.log('Document Data 유효성 체크 시작 . . .');
            checkRes(res.document);
        }
    };
    xhr.open('GET', 'https://api.share.decompany.io/rest/api/document/info' + req.originalUrl, true);
    xhr.send(null);


    function checkRes(docList) {
        if(docList) {
            console.log('Document Data GET 성공 . . .');
            setImgUrl(docList);
        }
        else{
            console.log('Document Data GET 실패 . . .');
            console.log('404 페이지 이동 . . .');
            // 렌더링
            res.render('notFoundPage', {
                title: 'notFoundPage',
            });
        }
    }

    // 이미지 URL SET
    function setImgUrl(docList) {
        let tmpArr = [];
        console.log('Document 썸네일 이미지 SETTING . . .');
        for (let i = 0; i < docList.totalPages; ++i) {
            let url = 'https://thumb.share.decompany.io/' + docList.documentId + "/2048/" + (i + 1);
            tmpArr.push({"image": url});
        }
        console.log('성공');

        // 렌더링
        console.log('카로셀 렌더링 시작 . . .');
        res.render('carousel', {
            title: 'carousel',
            urlList: tmpArr,
            documentId: docList.documentId,
            shortid: shortid.generate()
        });
    }
});


module.exports = router;
