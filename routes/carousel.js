let express = require('express');
let shortid = require('shortid');
let pug = require('pug');
let router = express.Router();
let templatePath = require.resolve('../views/carousel.pug');
let templateFn = pug.compileFile(templatePath);

router.get('/', function (req, res, next) {
    res.header("Content-Type", "text/html");
    console.log("original url : [" + req.originalUrl + "]");


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

        console.log('Document object SETTING . . .');
        let docObj = {
            title: 'carousel',
            urlList: tmpArr,
            seoTitle: docList.seoTitle,
            documentId: docList.documentId,
            username: docList.author.username,
            docTitle: docList.title,
            desc: docList.desc || "",
            shortid: shortid.generate(),
            env: process.env.NODE_ENV
        };

        res.write(templateFn(docObj));
        res.end();


        // 렌더링
       /* console.log('카로셀 렌더링 시작 . . .');
        res.render('carousel',docObj, function (err, html) {
            if(err) {
                console.log('카로셀 렌더링 실패 . . .');
                console.error(err);
                console.log('404 페이지 이동 . . .');
                res.render('notFoundPage', {
                    title: 'notFoundPage',
                });
            }
            else {
                console.log('카로셀 렌더링 성공 . . .');
                res.send(html);
            }
        });
        console.log('카로셀 렌더링 종료 . . .');*/
    }
});



module.exports = router;
