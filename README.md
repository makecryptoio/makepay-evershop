# MakePay for EverShop

Official MakePay payment extension for EverShop.

Source: https://github.com/makecryptoio/makepay-evershop

## Features

- Hosted MakePay checkout redirect
- Manual API key configuration
- Signed MakePay webhook verification
- EverShop payment transaction creation
- EverShop payment status updates and order activity logs

## Installation

Install the package in your EverShop project:

```bash
npm install @makecrypto/makepay-evershop
```

Enable the extension in your EverShop configuration:

```js
module.exports = {
  system: {
    extensions: [
      {
        name: 'makepay',
        resolve: 'node_modules/@makecrypto/makepay-evershop',
        enabled: true,
        priority: 20
      }
    ]
  }
};
```

Run the EverShop build so the extension is compiled into the storefront and
admin bundles.

## Configuration

Open **Settings > Payment** in the EverShop admin and configure MakePay:

- Enable MakePay payments.
- Add your MakePay API key ID and API key secret.
- Add the MakePay webhook signing secret.
- Set the webhook URL in MakePay to `/api/makepay/webhook` on your store.

The extension creates a hosted MakePay payment link after the EverShop order is
placed. MakePay redirects the customer to secure checkout, and the signed
webhook marks the EverShop order as paid when payment completes.

## Development

```bash
npm install
npm run build
npm run pack:dry-run
```
