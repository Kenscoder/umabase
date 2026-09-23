export const msalConfig = {
    auth: {
        clientId: '55e1cc7a-60df-4ba5-9bc3-c47b7b461484',
        authority: 'https://login.microsoftonline.com/a22b884e-180b-40e7-a233-3e21ec264fd8',
        redirectUri: 'https://umagg.eric-homelab.nl/redirect.html',
        postLogoutRedirectUri: 'https://umagg.eric-homelab.nl/'
    },
    cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false
    }
};

export const loginRequest = {
    scopes: [
        'api://561621c0-6836-441d-8ad1-e7d46d58b44f/access_as_user'
    ]
};