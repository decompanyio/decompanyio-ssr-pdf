appProperties = () => {
    const APP_PROPERTIES = {
        domain: function (env) {
            if (env === 'prod') {
                return APP_PROPERTIES.prod.domain;
            } else if (env === 'dev') {
                return APP_PROPERTIES.dev.domain;
            } else {
                return APP_PROPERTIES.local.domain;
            }
        },
        local: {
            domain: {
                mainHost: 'http://localhost:3000',
                upload: 'https://24gvmjxwme.execute-api.us-west-1.amazonaws.com',
                image: 'https://thumb.share.decompany.io',
                api: "https://api.share.decompany.io/rest",
                email: "https://api.share.decompany.io/ve",
                profile: "https://profile.share.decompany.io/",
            }
        },
        prod: {
            domain: {
                mainHost: 'https://www.polarishare.com',
                upload: 'https://24gvmjxwme.execute-api.us-west-1.amazonaws.com',
                image: 'https://res.polarishare.com',
                api: "https://api.polarishare.com/rest",
                email: "https://api.polarishare.com/ve",
                profile: "https://res.polarishare.com/",
            }
        },
        dev: {
            domain: {
                mainHost: 'https://share.decompany.io',
                upload: 'https://24gvmjxwme.execute-api.us-west-1.amazonaws.com',
                image: 'https://thumb.share.decompany.io',
                api: "https://api.share.decompany.io/rest",
                email: "https://api.share.decompany.io/ve",
                profile: "https://profile.share.decompany.io/",
            }
        }
    };

    return APP_PROPERTIES;
};
