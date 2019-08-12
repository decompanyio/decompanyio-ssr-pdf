let express = require('express');
let shortid = require('shortid');
let fs = require('fs');
let pug = require('pug');
let router = express.Router();
let templatePath = require.resolve('../views/viewer.pug');
let templateFn = pug.compileFile(templatePath);

let apiUrl = process.env.NODE_ENV_SUB === 'prod' ? "https://api.polarishare.com/rest" : "https://api.share.decompany.io/rest";
let viewerUrl = process.env.NODE_ENV_SUB === 'prod' ? "https://viewer.polarishare.com/rest" : "https://viewer.share.decompany.io/rest";
let mainHost = process.env.NODE_ENV_SUB === 'prod' ? "https://www.polarishare.com" : "https://share.decompany.io";
let getMetaUrl = "/api/document/meta?seoTitle=";
let getPdfUrl = "/api/document/pdf?documentId=";


router.get('/', (req, res, next) => {

    let docData = {};


    // 초기화
    const init = () => {
        // 헤더 설정
        res.header("Content-Type", "text/html");
        res.header("X-Robots-Tag", "noindex");

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
    const readPdfFile = (data) => {
        return new Promise((resolve, reject) => {
            let _data = setData(docData);
            _data.pdfUrl = data.pdf;
            docData = _data;
            resolve();

            // 2019-08-12, 서버에서 파일 읽을 시 ... 현재 미사용
            /*
                   console.log('\nPDF 파일 설치 시작 . . .');
            let filename = "tmp_files/" + docData.document.documentId;
            const file = fs.createWriteStream(filename);

            const request = https.get(data.pdf, response => {
                console.log('PDF 파일 unGzip 시작  . . .\n');
                response.pipe(zlib.createGunzip()).pipe(file);

                file.on('finish', () =>
                    file.close(() =>
                        fs.readFile(filename, 'utf8', (err, res) => {
                            let _data = setData(docData);
                            _data.pdfUrl = res;
                            docData = _data;

                            // 파일 삭제
                            deletePdfFile(filename);
                            resolve();
                        })
                    )
                );
            });*/
        });
    };
    /*

        // pdf 파일 삭제
        const deletePdfFile = (name) => {
            try {
                fs.unlinkSync(name)
                //file removed
            } catch(err) {
                console.error(err)
            }
        };*/


    // GET data 체크
    const checkRes = (data) => {
        console.log('Document Data 유효성 체크 시작 . . .\n');
        if (data.success) {
            console.log('Document Data GET 성공 . . .');
            return Promise.resolve(data);
        } else return Promise.reject(console.log('Document Data GET 실패 . . .'));
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
            pdfUrl: ""
        };
    };


    // 404 페이지 렌더
    const notFoundPageRender = (err) => {
        console.log(err);
        console.log('404 페이지 이동 . . .');
        res.status(404).render('notFoundPage', {title: 'notFoundPage', env: process.env.NODE_ENV_SUB});
    };


    Promise.resolve()
        .then(init)
        .then(() => getDocInfo()).catch(err => notFoundPageRender(err))
        .then(data => checkRes(data)).catch(err => notFoundPageRender(err))
        .then(data => getPdfInfo(data)).catch(err => notFoundPageRender(err))
        .then(data => readPdfFile(data))
        .then(() => {
            res.write(templateFn(docData));
            res.end();
        })
});


module.exports = router;
