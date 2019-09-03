let cid = null,
    sid = null,
    clientEmail = null,
    useTrackingModalFlag = false;


// pdf data get
const getPdfData = pdfUrl => {
    let url = pdfUrl.replace(/&amp;/g, "&");
    const xhtml = new XMLHttpRequest();
    xhtml.onprogress = updateProgress;
    xhtml.open("GET", url, true);
    xhtml.onreadystatechange = function () {
        if (xhtml.readyState === 4) {  // Makes sure the document is ready to parse.
            if (xhtml.status === 200) {  // Makes sure it's found the file.
                setPdfData(xhtml.response);
            }
        }
    };

    xhtml.send(null);
};


//update progress
const updateProgress = e => {
    let contentLength;
    if (e.lengthComputable)
        contentLength = e.total;
    else
        contentLength = parseInt(e.target.getResponseHeader('content-length'), 10);

    console.log(Math.floor((e.loaded / contentLength) * 100) + " %");
};


// pdf data set
const setPdfData = pdfEncoded => {
    let pdfData = atob(pdfEncoded);
    let uint8ArrayPdf = new Uint8Array(pdfData.length);
    for (let i = 0; i < pdfData.length; i++) {
        uint8ArrayPdf[i] = pdfData.charCodeAt(i)
    }

    $("#loadingWrapper").display = "none";
    $('#toolbarViewer').css('display', 'block');
    PDFViewerApplication.open(uint8ArrayPdf);
};


// 뷰어 페이지 이동 링크 클릭
const linkToViewerPage = () => {
    let url = document.getElementById("viewerPageLink").getAttribute('data-url');
    window.location.href = url;
};


// 이메일 양식 체크
const checkEmailForm = email => {
    return email.match(/^[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*.[a-zA-Z]{2,3}$/i);
};


// cid, sid 설정
const setId = params => {
    cid = params.cid;
    sid = params.sid;
};


// cid, sid GET
const getId = () => ({"cid": cid, "sid": sid});


// forceTracking, clientEmail, pageNum >2 이메일 모달 등장 조건
// 트랙킹 진행
const postTracking = ({shortId, documentId, forceTracking, useTracking, apiUrl, page}) => {
    tracking(shortId, {
        id: documentId,
        n: page,
        ev: "view",
        apiDomain: apiUrl
    }, true, false, (res, params) => {
        if (Number(page) === 1) {
            $("#email-wrapper").css("display", "none");
            $(".page").css("filter", "none");
        } else {
            if (forceTracking) {
                if (res.user) {
                    clientEmail = res.user.e;
                    $("#email-wrapper").css("display", "none");
                    $(".page").css("filter", "none");
                } else {
                    $("#email-wrapper").css("display", "block");
                    $(".page").css("filter", "blur(5px)");
                }
            } else if (!forceTracking && useTracking && !useTrackingModalFlag) {
                if (res.user) {
                    clientEmail = res.user.e;
                    $("#email-wrapper").css("display", "none");
                } else
                    $("#email-wrapper").css("display", "block");

                $(".page").css("filter", "none");
            }
        }

        setId(params);
    });
};


// 이메일 모달 값 입력 체크
const checkEmailInput = () => {
    let value = $("#email-input").val();
    if (checkEmailForm(value)) {
        $(".emailError").text("");
        return true;
    } else {
        $(".emailError").text("Email address does not fit the form .");
        return false;
    }
};


// 이메일 모달 체크박스 클릭
const checkTermsCheckbox = () => {
    const termsCheckbox = document.getElementById("termsCheckbox").nextElementSibling.firstChild;
    if ($("#termsCheckbox").is(":checked")) {
        termsCheckbox.style.border = "1px solid #3681fe";
        return true;
    } else {
        termsCheckbox.style.border = "1px solid #f92121";
        return false;
    }
};

