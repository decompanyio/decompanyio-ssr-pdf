window.onload = function () {
    pdfDataSet();
};


// pdf data set
const pdfDataSet = () => {
    let pdfData = atob(pdfEncoded());
    let uint8ArrayPdf = new Uint8Array(pdfData.length);
    for (let i = 0; i < pdfData.length; i++) {
        uint8ArrayPdf[i] = pdfData.charCodeAt(i)
    }

    PDFViewerApplication.open(uint8ArrayPdf);
};


// pdf encode GET
const pdfEncoded = () => {
    let scripts = document.getElementsByTagName('script');
    let scriptName = scripts[scripts.length - 1];
    return scriptName.getAttribute('data-pdfEncoded')
};


// 뷰어 페이지 이동 링크 클릭
const linkToViewerPage = () => {
    let url = document.getElementById("viewerPageLink").getAttribute('data-url');
    console.log(url);
    window.location.href = url;
};
