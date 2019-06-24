let apiDomain = "https://api.share.decompany.io/rest";
let trackingUrl = "/api/tracking/collect";


// json => 쿼리 스트링
function jsonToQueryString(json) {
  return "?" +
      Object.keys(json).map(function(key) {
        return encodeURIComponent(key) + "=" +
            encodeURIComponent(json[key]);
      }).join("&");
}


// 트래킹 정보 세팅
function setTrackingInfo(shortid) {
  let timestamp = Date.now();
  let trackingInfo = null;

  try {
    trackingInfo = JSON.parse(localStorage.getItem("tracking_info"));
  } catch (e) {
    console.error(e);
  }

  if (!trackingInfo) {
    trackingInfo = {
      sid: shortid,
      touchAt: timestamp
    };
  }

  if (!trackingInfo.sid || timestamp - trackingInfo.touchAt > 1000 * 60 * 30 /**30 min */) {
    //sid는 30분 지나면 새로 갱신함(이벤트마다 갱신됨)
    trackingInfo.sid = shortid;
  }

  ga((tracker) => {
    trackingInfo.cid = tracker.get("clientId");
  });

  if (!trackingInfo.cid) {
    console.log("client id invalid on tracking");
  }
  localStorage.setItem("tracking_info", JSON.stringify(trackingInfo));
  return trackingInfo;
}

function tracking(shortId, params, async, sidClear) {
  return new Promise((resolve, reject) => {

    let timestamp = Date.now();
    let trackingInfo = this.setTrackingInfo(shortId);
    params.sid = trackingInfo.sid; //session id
    params.cid = trackingInfo.cid; //clinet id
    params.t = timestamp; //touch time

    let querystring = jsonToQueryString(params);
    let tracking = apiDomain + trackingUrl + querystring;

    $.ajax({
      type: "GET",
      async: async,
      url: tracking
    }).then(res => {
      if (sidClear) {
        trackingInfo.sid = undefined;
      }
      //touchAt 현재 시간으로 갱신 후 localStorage에 저장
      trackingInfo.touchAt = timestamp;
      localStorage.setItem("tracking_info", JSON.stringify(trackingInfo));
      resolve(res);
    });
  });
}