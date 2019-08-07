let express = require('express');
let shortid = require('shortid');
let pug = require('pug');
let router = express.Router();
let templatePath = require.resolve('../views/carousel.pug');
let templateFn = pug.compileFile(templatePath);

let apiUrl = process.env.NODE_ENV_SUB === 'prod' ? "https://api.polarishare.com/rest" : "https://api.share.decompany.io/rest";
let imageUrl = process.env.NODE_ENV_SUB === 'prod' ? "https://res.polarishare.com" : "https://thumb.share.decompany.io";
let mainHost = process.env.NODE_ENV_SUB === 'prod' ? "https://www.polarishare.com" : "https://share.decompany.io";
let embedUrl = process.env.NODE_ENV_SUB === 'prod' ? "https://embed.polarishare.com" : "https://embed.share.decompany.io";


router.get('/', function (req, res, next) {
    // 헤더 설정
    res.header("Content-Type", "text/html");
    res.header("X-Robots-Tag", "noindex");
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
            checkRes(res.document, res.text);
        }
    };
    xhr.open('GET', apiUrl + '/api/document/info' + req.originalUrl, true);
    xhr.send(null);


    // GET data 체크
    function checkRes(docList, text) {
        if(docList) {
            console.log('Document Data GET 성공 . . .');
            setImgUrl(docList, text);
        }
        else{
            console.log('Document Data GET 실패 . . .');
            console.log('404 페이지 이동 . . .');
            // 렌더링
            res.status(404).render('notFoundPage', {
                title: 'notFoundPage',
                env: process.env.NODE_ENV_SUB
            });
        }
    }



    // 이미지 URL SET
    function setImgUrl(docList, text) {
        let tmpArr = [];

        console.log('Document 썸네일 이미지 SETTING . . .');
        for (let i = 0; i < docList.totalPages; ++i) {
            let url = imageUrl + "/" + docList.documentId + "/2048/" + (i + 1);
            tmpArr.push({"image": url});
        }

        console.log('Document object SETTING . . .');
        let docObj = {
            title: 'carousel',
            urlList: tmpArr,
            seoTitle: docList.seoTitle,
            text: text,
            documentId: docList.documentId,
            username: docList.author.username,
            email: docList.author.email,
            docTitle: docList.title,
            desc: docList.desc || "",
            forceTracking: docList.forceTracking,
            useTracking: docList.useTracking,
            shortid: shortid.generate(),
            created : new Date(docList.created),
            env: process.env.NODE_ENV_SUB,
            mainHost: mainHost,
            embedUrl: embedUrl,
            apiUrl: apiUrl,
            ogUrl: embedUrl +"/" + docList.seoTitle

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
