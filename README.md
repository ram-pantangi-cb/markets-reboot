# Exchange Downtime Restart Tooling

This app was created to assist the market-ops team take all products from `trading_disabled` to some kind of trading state through `auction_mode` when exiting downtime.

After all products are moved to `auction_mode`, this downtime restart tooling helps the restart process by giving information on which products are verified as ok to move to a trading state. The app does this by polling Coinbase APIs to detect if there has been a significant enough market dislocation during downtime which would prevent the product from safely transitioning to a trading state from `auction_mode`.

## ⬇️ Install

### Toolchain

First, you'll need the version of node defined in our `.nvmrc`:

```
nvm use
```

If you don't have access to `nvm`, you can install it [here](https://github.com/nvm-sh/nvm).

You'll also need [`yarn`](https://yarnpkg.com/) for package management, which can be downloaded [here](https://classic.yarnpkg.com/en/docs/install/#mac-stable).

### Dependencies

To install dependencies:

```
yarn install
```

## 🎬 Starting up

To boot an application, start with this:

```bash
$ yarn start
```

## 🛠 Future Improvements

- When page loads, start streaming auction data for all markets that are in auction mode instead of accepting text input
- Add functionality to filter results
- Add functionality to sort results based on deviation percentage
- Fetching external rates currently needs manual updates for each new listing (mapping.json file) - this should be automated programatically
