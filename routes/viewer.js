let express = require('express');
let shortid = require('shortid');
let pug = require('pug');
let router = express.Router();
let templatePath = require.resolve('../views/viewer.pug');
let templateFn = pug.compileFile(templatePath);

let apiUrl = process.env.NODE_ENV_SUB === 'prod' ? "https://api.polarishare.com/rest" : "https://api.share.decompany.io/rest";
let viewerUrl = process.env.NODE_ENV_SUB === 'prod' ? "https://viewer.polarishare.com/rest" : "https://viewer.share.decompany.io/rest";
let mainHost = process.env.NODE_ENV_SUB === 'prod' ? "https://www.polarishare.com" : "https://share.decompany.io";
let getMetaUrl = "/api/document/meta?seoTitle=";
let getPdfUrl = "/api/document/pdf?documentId=";
let staticUrl = process.env.NODE_ENV_SUB === 'prod'  ? "https://static.polarishare.com/viewer" : "https://static.share.decompany.io/viewer";


router.get('/', (req, res, next) => {

    let docData = {};


    // 초기화
    const init = () => {
        // 헤더 설정
        res.header("Content-Type", "text/html");
        res.header("X-Robots-Tag", "noindex");
        res.header('Last-Modified', (new Date()).toUTCString());

        console.log("\noriginal url : [" + req.originalUrl + "]");

        return Promise.resolve();
    };


    // Document 정보 GET
    const getData = (url) => {
        return new Promise((resolve, reject) => {
            let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
            let xhr = new XMLHttpRequest();

            xhr.open('GET', apiUrl + url, true);

            console.log('\nXMLHttpRequest 시작 . . .');
            console.log("요청 URL : " + apiUrl + url);

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4 && xhr.status === 200) resolve(JSON.parse(xhr.responseText));
            };

            xhr.send(null);
        });
    };


    // pdf 정보 GET
    const getDocInfo = async () => await getData(getMetaUrl + req.originalUrl.split("/")[1]).then(res => docData = res);


    // pdf url 정보 GET
    const getPdfInfo = async () => await getData(getPdfUrl + docData.document.documentId);


    // pdf 파일 read
    const readPdfFile = data => {
        return new Promise((resolve, reject) => {
            let _data = setData(docData);
            _data.pdfUrl = data.pdf;
            docData = _data;
            resolve();
        });
    };


    // GET data 체크
    const checkRes = data => {
        console.log('Document Data 유효성 체크 시작 . . .\n');


        if (data.success) {
            console.log('Document Data GET 성공 . . .');
            const document = data.document;

            if(document.status !== "CONVERT_COMPLETE" || document.isPublish) {
                console.log('Document Data 유효하지 않음 . . .');
                return Promise.reject();
            }else {
                return Promise.resolve(data);
            }
        } else {
            console.log('Document Data GET 실패 . . .');
            return Promise.reject();
        }
    };


    // 이미지 URL SET
    const setData = data => {

        const document = data.document;
        const text = data.text;

        return {
            title: 'pdf viewer',
            seoTitle: document.seoTitle,
            text: text,
            documentId: document.documentId,
            username: document.author.username,
            email: document.author.email,
            docTitle: document.title,
            desc: document.desc || "",
            forceTracking: document.forceTracking,
            useTracking: document.useTracking,
            shortid: shortid.generate(),
            created: new Date(document.created),
            env: process.env.NODE_ENV_SUB,
            mainHost: mainHost,
            viewerPageUrl: mainHost + "/" + document.author.username + "/" + document.seoTitle,
            apiUrl: apiUrl,
            ogUrl: viewerUrl + "/" + document.seoTitle,
            pdfUrl: "",
            staticUrl: staticUrl
        };
    };


    // 404 페이지 렌더
    const notFoundPageRender = err => {
        console.log(err);
        console.log('404 페이지 이동 . . .');
        res.status(404).render('notFoundPage', {title: 'notFoundPage', env: process.env.NODE_ENV_SUB});
    };


    Promise.resolve()
        .then(init)
        .then(() => getDocInfo())
        .then(data => checkRes(data))
        .then(data => getPdfInfo(data))
        .then(data => readPdfFile(data))
        .then(() => {
            res.write(templateFn(docData));
            res.end();
        })
        .catch(err => notFoundPageRender(err))
});


module.exports = router;
