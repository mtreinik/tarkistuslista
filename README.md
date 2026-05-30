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

## Production build

Create an optimized production build:

```sh
npm run build
```

The built app is written to `dist/`.

To preview the production build locally:

```sh
npm run preview
```

## Production deployment

This app builds to static files, so you can deploy the contents of `dist/` to any static web host or web server.

Typical deployment flow:

1. Install dependencies with `npm install`.
2. Build the app with `npm run build`.
3. Upload the contents of `dist/` to your production server.
4. Serve the files over HTTPS.

For PWA installability and service worker support, deploy from a secure HTTPS origin. If you host the app under a subpath instead of the domain root, update the Vite base path before building so asset URLs are generated correctly.

For example, if the app will be served from `https://example.com/checklist/`, update `vite.config.ts` like this before running `npm run build`:

```ts
export default defineConfig({
  base: '/checklist/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Tarkistuslista',
        short_name: 'Checklist',
        description: 'A mobile-friendly checklist app with local storage.',
        theme_color: '#4f46e5',
        background_color: '#f4f7fb',
        display: 'standalone',
        start_url: '/checklist/',
        scope: '/checklist/',
      },
    }),
  ],
})
```

Replace `/checklist/` with your real deployment path, keeping both the leading and trailing slash.
