# Tarkistuslista

Checklist PWA built with React, TypeScript, and Vite.

## Development

Start the development server:

```sh
npm run dev
```

## Development over HTTPS

The Vite dev server is configured to use certificate files from the repository root:

- `.cert/key.pem`
- `.cert/cert.pem`

With those files in place, start the server normally:

```sh
npm run dev
```

The server listens on `0.0.0.0` over HTTPS, so it is reachable from other devices on your LAN. Because the certificate is for `own-domain.example.com`, test with that hostname:

```text
https://own-domain.example.com:5173/
```

If that hostname resolves to your development machine and the certificate is trusted on the device, this avoids the insecure-context issues that can happen over plain HTTP.
