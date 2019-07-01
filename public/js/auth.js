//Auth0 초기화
let authData = new auth0.WebAuth({
    domain: 'decompany.auth0.com',
    clientID: 'e7kW3VpEKzprBPyHy13VL221pB1q971j',
    redirectUri: 'https://share.decompany.io/callback',
    responseType: "token id_token",
    scope: "openid profile email"
});


// 로그인
login = (isSilentAuthentication) => {
    if (isSilentAuthentication) {
        authData.authorize({prompt: "none"});
    } else {
        authData.authorize();
    }
};


// 로그인 체크
isAuthenticated = () => {
    const expiresAt = JSON.parse(localStorage.getItem("expires_at"));
    const isUnExpired = new Date().getTime() < expiresAt;

    if (!isUnExpired) {
        //console.error("Session Expired", expiresAt, sessionStorage);
        this.clearSession();
    }
    return isUnExpired;
};
clearSession = () => {
    //Auth0 API
    localStorage.removeItem("access_token");
    localStorage.removeItem("id_token");
    localStorage.removeItem("expires_at");
    localStorage.removeItem("user_info");

    //Tracking API
    localStorage.removeItem("tracking_info");
};
