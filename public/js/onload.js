// pdf data set
const pdfDataSet = (pdfEncoded) => {
    let pdfData = atob(pdfEncoded);
    let uint8ArrayPdf = new Uint8Array(pdfData.length);
    for (let i = 0; i < pdfData.length; i++) {
        uint8ArrayPdf[i] = pdfData.charCodeAt(i)
    }
    PDFViewerApplication.open(uint8ArrayPdf);
};


// pdf data get
const pdfDataGet = (pdfUrl) => {
    let url = pdfUrl.replace(/&amp;/g, "&");
    const txtFile = new XMLHttpRequest();
    txtFile.open("GET", url, true);
    txtFile.onreadystatechange = function() {
        if (txtFile.readyState === 4) {  // Makes sure the document is ready to parse.
            if (txtFile.status === 200) {  // Makes sure it's found the file.
                let allText = txtFile.responseText;
                pdfDataSet(allText);
            }
        }
    };
    txtFile.send(null);
};


// 뷰어 페이지 이동 링크 클릭
const linkToViewerPage = () => {
    let url = document.getElementById("viewerPageLink").getAttribute('data-url');
    window.location.href = url;
};
