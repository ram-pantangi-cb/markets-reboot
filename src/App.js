import axios from "axios";
import "./App.scss";
import Table from "react-bootstrap/Table";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { Component } from "react";
import ReactModal from "react-modal";
let mapping = require("./mapping.json");

let envMap = {
  staging: {
    url: "https://api-pro-staging.cbhq.net",
    preSearch: "",
  },
  sandbox: {
    url: "https://api-public.sandbox.exchange.coinbase.com",
    preSearch: "",
  },
  production: {
    url: "https://api.exchange.coinbase.com",
    preSearch: "",
  },
  scale: {
    url: "https://api-pro-scale.cbhq.net",
    preSearch: "",
  },
  dev: {
    url: "https://api-pro-dev.cbhq.net",
    preSearch: "",
  },
};

// set env that you want to run in
let ENV = "production";
let env_url = window.location.pathname.split("/")[1];
if (["staging", "sandbox", "production", "scale", "dev"].includes(env_url)) {
  ENV = env_url;
}

// make sure this gets updated before Mar 4 to false for both HARDCODEs
const HARDCODE_QUOTE_RATES = false;
const HARDCODE_ALL_RATES = false;
const BASE_URL = envMap[ENV].url;
const ASSETS = envMap[ENV].preSearch;
const countDecimals = (value) => {
  if (value % 1 !== 0) return value.toString().split(".")[1].length;
  return 0;
};

let avatarUrl =
  "https://pbs.twimg.com/profile_images/1580621339471347712/BbmUxUwJ_400x400.jpg";
let twitterUrl = "https://twitter.com/0xRishi";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class App extends Component {
  state = {
    searchTerm: ASSETS, // set to default value for testing
    loading: false,
    USD: 1,
    USDT: 1,
    EUR: null, //ethusd, coingecko
    BTC: null, //btcusd, coingecko
    GBP: null, //gbpusd from poundtoken, coingecko
    ETH: null, //eurousd from euro-coin, coingecko
    CAD: 0.75,
    DAI: 1,
    USDC: 1,
    thresholdPct: 3, // .05 = .05%, 10 = 10%, 1 = 1%
    results: null,
    numWithin: null,
    numAuctionProducts: null,
    numFetched: 0,
    oneDone: false,
    emojis: ["🤗", "😃", "🪄", "🧙‍♂️", "👩‍🚀", "🦾", "🥳", "🎊", "🎉", "🦄", "🚀"],
    emojiIndex: 0,
    copyMsg: "Copy 📋",
    copying: false,
    hardcode: false, // set to true if don't want to allow user input
    showModal: false,
    modalData: null,
    onlineProducts: null,
  };

  async componentDidMount() {
    // get state of markets

    axios
      .get(BASE_URL + "/products")
      .then((res) => {
        let { data } = res;
        let onlineProducts = data.filter((d) => d.status === "online");
        this.setState({ onlineProducts });
      })
      .catch((err) => console.log(err));

    // get conversion rates
    let map = {
      bitcoin: "BTC",
      ethereum: "ETH",
      poundtoken: "GBP",
      "euro-coin": "EUR",
    };

    let str = "bitcoin,ethereum,poundtoken,euro-coin";

    let url = `https://api.coingecko.com/api/v3/simple/price?ids=${str}&vs_currencies=usd`;

    if (HARDCODE_QUOTE_RATES) {
      let data = {
        bitcoin: {
          usd: 22939,
          key: "bitcoin",
        },
        "euro-coin": {
          usd: 1.075,
          key: "euro-coin",
        },
        poundtoken: {
          usd: 1.2,
          key: "poundtoken",
        },
        ethereum: {
          usd: 1632.75,
          key: "ethereum",
        },
      };
      data = Object.keys(data).map((key) => {
        let ar = data[key];

        // Append key if one exists (optional)
        ar.key = key;

        return ar;
      });

      for await (const d of data) {
        this.setState({ [map[d.key]]: d.usd });
      }
    } else {
      // Fetch live rates for quote currency conversions
      await axios
        .get(url)
        .then(async (res) => {
          let { data } = res;
          console.log(data);
          data = Object.keys(data).map((key) => {
            let ar = data[key];

            // Append key if one exists (optional)
            ar.key = key;

            return ar;
          });

          for await (const d of data) {
            this.setState({ [map[d.key]]: d.usd });
          }
        })
        .catch((e) => console.log(e));
    }
  }

  handleOpenModal = (modalData) => {
    this.setState({ showModal: true, modalData });
    console.log(modalData);
  };

  handleCloseModal = () => {
    this.setState({ showModal: false });
  };

  handleChange = (e) => {
    // if (e.target.value.split(",").length > 60) return;
    let value = e.target.value.trim().toUpperCase().replace(/ /g, "");
    this.setState({ [e.target.id]: value });
  };

  handleSubmit = async (e) => {
    if (this.state.loading) {
      return;
    }

    this.setState({
      loading: true,
      results: null,
      numWithin: null,
      oneDone: false,
      numFetched: 0,
      numAuctionProducts: null,
    });
    e.preventDefault();
    let assets = this.state.searchTerm.split(",").map((a) => a.trim());

    // Fetch coingecko Rates
    let string = mapping
      .filter((m) => assets.includes(m.ticker))
      .map((m) => m.cg_id)
      .toString();
    let url = `https://api.coingecko.com/api/v3/simple/price?ids=${string}&vs_currencies=usd`;

    if (HARDCODE_ALL_RATES) {
      let data = {
        dogecoin: {
          usd: 0.090853,
          key: "dogecoin",
        },
        ethereum: {
          usd: 1632.75,
          key: "ethereum",
        },
      };

      data = Object.keys(data).map((key) => {
        let ar = data[key];

        // Append key if one exists (optional)
        ar.key = key;

        return ar;
      });

      let results = [];

      for await (const d of data) {
        let ticker = mapping.filter((m) => m.cg_id === d.key)[0].ticker;

        let item = {
          ticker: ticker,
          coingeckoData: {
            coingeckoId: d.key,
            coingeckoRateUSD: d.usd,
          },
          cbData: [],
        };

        results.push(item);
      }

      this.setState({ results });
    } else {
      await axios
        .get(url)
        .then(async (res) => {
          let { data } = res;

          data = Object.keys(data).map((key) => {
            let ar = data[key];

            // Append key if one exists (optional)
            ar.key = key;

            return ar;
          });

          let results = [];

          for await (const d of data) {
            let ticker = mapping.filter((m) => m.cg_id === d.key)[0].ticker;

            // price bands <> deviation thresholds. TODO change based on input from Pete/Neil
            let cgPrice = parseFloat(d.usd);

            let deviationBand;
            if (cgPrice <= 0.5) {
              deviationBand = 10;
            } else if (cgPrice > 0.5 && cgPrice <= 1) {
              deviationBand = 5;
            } else if (cgPrice > 1 && cgPrice <= 100) {
              deviationBand = 4;
            } else if (cgPrice > 100 && cgPrice <= 1000) {
              deviationBand = 3;
            } else {
              deviationBand = 2;
            }

            let item = {
              ticker: ticker,
              coingeckoData: {
                coingeckoId: d.key,
                coingeckoRateUSD: d.usd,
              },
              thresholdPct: deviationBand,
              cbData: [],
            };

            results.push(item);
          }

          this.setState({ results });
        })
        .catch((e) => console.log(e));
    }

    await this.fetchAuction();
    // fetch CB Auction data
    setInterval(async () => {
      this.fetchAuction();
    }, 2500);
  };

  // cb api fetch
  fetchAuction = async () => {
    await axios
      .get(`${BASE_URL}/products`)
      .then(async (res) => {
        let { data } = res;

        data = data
          .filter(
            (d) =>
              this.state.results
                .map((m) => m.ticker)
                .includes(d.base_currency) && d.auction_mode
          )
          .map((d) => d.id);

        this.setState({ numAuctionProducts: data.length });
        for await (const d of data) {
          await sleep(500);
          await axios
            .get(`${BASE_URL}/products/${d}/book?level=2`)
            .then((res) => {
              let { data } = res;
              let item = {
                market: d,
                auction: data.auction,
                bids: data.bids,
                asks: data.asks,
                indicativeOpenPriceUSD:
                  parseFloat(data.auction.open_price) *
                  this.state[d.split("-")[1]],
                indicativeOpenSizeUSD:
                  parseFloat(data.auction.open_size) *
                  parseFloat(data.auction.open_price),
                indicativeOpenSizeBase: parseFloat(data.auction.open_size),
              };

              // change modal data
              if (this.state.modalData) {
                if (this.state.modalData.market === item.market) {
                  this.setState({ modalData: item });
                }
              }

              const index = this.state.results.findIndex(
                (asset) => asset.ticker === d.split("-")[0]
              );
              let copy = [...this.state.results];

              let indexTwo = copy[index].cbData.findIndex(
                (a) => a.market === item.market
              );

              if (indexTwo === -1) {
                copy[index].cbData.push(item);
              } else {
                copy[index].cbData[indexTwo] = item;
              }

              // easter egg
              if (this.state.emojiIndex === this.state.emojis.length - 1) {
                this.setState({ emojiIndex: 0 });
              } else {
                this.setState({ emojiIndex: this.state.emojiIndex + 1 });
              }

              this.setState({ results: copy }, () =>
                this.setState({ oneDone: true })
              );
            })
            .catch((e) => console.log(e))
            .finally(() => {
              // keep track of fetching product
              if (this.state.numFetched < this.state.numAuctionProducts) {
                let num = this.state.numFetched + 1;
                this.setState({ numFetched: num });
              }
            });
        }

        this.setState({
          loading: false,
        });
      })
      .catch((e) => console.log(e));
  };

  copyEligible = (e) => {
    e.preventDefault();
    if (this.state.copying) {
      return;
    }
    this.setState({ copyMsg: "Copied ✅", copying: true });
    let eligible = this.state.results
      .map((m) => {
        let price = m.coingeckoData.coingeckoRateUSD;

        let output = m.cbData
          .map((x) => {
            let item = {
              market: x.market,
              indicativeOpenPriceUSD: x.indicativeOpenPriceUSD,
              cgPrice: price,
              deviation: Math.abs(
                (1 - x.indicativeOpenPriceUSD / price) * -100
              ),
              thresholdPct: m.thresholdPct,
              canOpen: x.auction.can_open,
            };
            return item;
          })
          .filter((m) => {
            console.log(m);
            return m.deviation <= m.thresholdPct && m.canOpen === "yes";
          })
          .map((m) => m.market);

        return output;
      })
      .filter((e) => e.length > 0);

    navigator.clipboard.writeText(eligible.toString());
    setTimeout(
      () => this.setState({ copyMsg: "Copy 📋", copying: false }),
      2000
    );
  };

  render() {
    let { onlineProducts } = this.state;
    return (
      <div className="container">
        <div className="fixed-content">
          <div className="header-row">
            <div className="header">Coinbase Exchange Reboot</div>
            <div className="env-row">
              <span>
                environment: {ENV} ({envMap[ENV].url})
              </span>
            </div>
            <div className="badge-row">
              Created by
              <a
                target="_blank"
                rel="noreferrer"
                href={twitterUrl}
                className="made-by"
              >
                <img alt="pengu avatar" className="avatar" src={avatarUrl} />
                <span className="blink">@0xRishi</span>
              </a>
            </div>
          </div>
          {onlineProducts ? (
            <div className="state-of-products">
              <span>
                {onlineProducts.filter(
                  (o) =>
                    !o.trading_disabled &&
                    !o.post_only &&
                    !o.cancel_only &&
                    !o.auction_mode &&
                    !o.limit_only
                ).length + onlineProducts.filter((o) => o.limit_only).length}
                /{onlineProducts.length} (
                {(
                  ((onlineProducts.filter(
                    (o) =>
                      !o.trading_disabled &&
                      !o.post_only &&
                      !o.cancel_only &&
                      !o.auction_mode &&
                      !o.limit_only
                  ).length +
                    onlineProducts.filter((o) => o.limit_only).length) /
                    onlineProducts.length) *
                  100
                ).toFixed(0)}
                %) online products live for trading in{" "}
                <span className="code">{ENV}</span>
              </span>
              <ul>
                <li>
                  Full Trading:{" "}
                  {
                    onlineProducts.filter(
                      (o) =>
                        !o.trading_disabled &&
                        !o.post_only &&
                        !o.cancel_only &&
                        !o.auction_mode &&
                        !o.limit_only
                    ).length
                  }
                </li>
                <li>
                  Limit Trading:{" "}
                  {onlineProducts.filter((o) => o.limit_only).length}
                </li>
                <li>
                  Auction Mode:{" "}
                  {onlineProducts.filter((o) => o.auction_mode).length}
                </li>
                <li>
                  Cancel Only:{" "}
                  {onlineProducts.filter((o) => o.cancel_only).length}
                </li>
                <li>
                  Trading Disabled:{" "}
                  {onlineProducts.filter((o) => o.trading_disabled).length}
                </li>
              </ul>
            </div>
          ) : null}
          <form className="input-row" onSubmit={this.handleSubmit}>
            <input
              onChange={this.handleChange}
              value={
                this.state.numFetched === this.state.numAuctionProducts
                  ? "REFRESH_PAGE_TO_FETCH_NEW"
                  : this.state.searchTerm
              }
              disabled={
                this.state.hardcode ||
                this.state.loading ||
                this.state.numFetched === this.state.numAuctionProducts
              }
              id="searchTerm"
              name="searchTerm"
              type="text"
              placeholder="Enter comma separated list of tickers that have at least 1 market in auction_mode"
              className="input"
            />
            {this.state.numFetched === this.state.numAuctionProducts ? (
              <div className="submit-btn" onClick={this.copyEligible}>
                {this.state.copyMsg}
              </div>
            ) : (
              <input
                disabled={this.state.loading}
                type="submit"
                value={
                  this.state.loading
                    ? `${
                        this.state.numFetched === 0
                          ? "Fetching"
                          : `Fetched ${this.state.numFetched} of ${this.state.numAuctionProducts}`
                      } ${this.state.emojis[this.state.emojiIndex]}`
                    : "Fetch 🦄"
                }
                className="submit-btn"
              />
            )}
          </form>
        </div>
        {this.state.oneDone ? (
          <>
            <Table
              responsive
              hover
              className="align-middle react-table"
              style={{ overflow: "visible" }}
            >
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: "white",
                  zIndex: 10000,
                }}
              >
                <tr>
                  <th>Market</th>
                  <th>CB Open Size</th>
                  <th>CB Open Price</th>
                  <th>Market Rate</th>
                  <th>CB vs Market</th>
                  <th>Deviation Band</th>
                  <th>Auction Can Open</th>
                </tr>
              </thead>
              <tbody>
                {this.state.results
                  .filter((r) => r.cbData.length > 0)
                  .map((m) => {
                    let price = m.coingeckoData.coingeckoRateUSD;

                    let output = m.cbData.map((x, i) => {
                      return (
                        <>
                          <tr
                            className={
                              Math.abs(
                                (1 - x.indicativeOpenPriceUSD / price) * -100
                              ) <= m.thresholdPct &&
                              x.auction.can_open === "yes"
                                ? "within"
                                : "outside"
                            }
                            key={i}
                            onClick={() => this.handleOpenModal(x)}
                          >
                            <td>{x.market}</td>
                            <td>
                              $
                              {new Intl.NumberFormat("en").format(
                                (
                                  x.indicativeOpenSizeBase *
                                  x.indicativeOpenPriceUSD
                                ).toFixed(2)
                              )}
                            </td>
                            <td>
                              $
                              {new Intl.NumberFormat("en").format(
                                x.indicativeOpenPriceUSD.toFixed(
                                  countDecimals(price)
                                )
                              )}
                            </td>
                            <td>
                              ${new Intl.NumberFormat("en").format(price)}
                            </td>
                            <td>
                              {(
                                (1 - x.indicativeOpenPriceUSD / price) *
                                -100
                              ).toFixed(2)}
                              %
                            </td>
                            <td>{m.thresholdPct}%</td>
                            <td>
                              {x.auction.can_open.charAt(0).toUpperCase() +
                                x.auction.can_open.slice(1)}
                            </td>
                          </tr>
                        </>
                      );
                    });
                    return output;
                  })}
              </tbody>
            </Table>
            {/* <pre className="raw-output">
              {JSON.stringify(this.state, undefined, 2)}
            </pre> */}
            <br />
          </>
        ) : null}
        <br />
        <br />
        {this.state.modalData ? (
          <ReactModal
            onRequestClose={this.handleCloseModal}
            isOpen={this.state.showModal}
            ariaHideApp={false}
          >
            <button className="btn" onClick={this.handleCloseModal}>
              Close View
            </button>
            <div className="modal-market-rates">
              <ul>
                <li className="modal-market-rate">
                  <span className="medium-font">Market</span>:{" "}
                  {this.state.modalData.market}
                </li>
                <li className="modal-market-rate">
                  <span className="medium-font">Market Rate </span>(
                  <a
                    href={`https://www.coingecko.com/en/coins/${
                      this.state.results.filter(
                        (r) =>
                          r.ticker === this.state.modalData.market.split("-")[0]
                      )[0].coingeckoData.coingeckoId
                    }`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    CoinGecko ↗
                  </a>
                  ):{" $"}
                  {
                    this.state.results.filter(
                      (r) =>
                        r.ticker === this.state.modalData.market.split("-")[0]
                    )[0].coingeckoData.coingeckoRateUSD
                  }
                </li>
                <li className="modal-market-rate">
                  <span className="medium-font">CB Indic. Open</span> (
                  <a
                    href={`https://exchange.coinbase.com/trade/${this.state.modalData.market}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Trade UI ↗
                  </a>
                  ):{" $"}
                  {this.state.modalData.indicativeOpenPriceUSD.toFixed(
                    countDecimals(
                      this.state.results.filter(
                        (r) =>
                          r.ticker === this.state.modalData.market.split("-")[0]
                      )[0].coingeckoData.coingeckoRateUSD
                    )
                  )}
                </li>
                <li className="modal-market-rate">
                  <span className="medium-font">CB Indic. Open (Size)</span>:{" "}
                  {this.state.modalData.indicativeOpenSizeBase}{" "}
                  {this.state.modalData.market.split("-")[0]}
                </li>
                <li className="modal-market-rate">
                  <span className="medium-font">Deviation</span>:{" "}
                  {(
                    (this.state.modalData.indicativeOpenPriceUSD /
                      this.state.results.filter(
                        (r) =>
                          r.ticker === this.state.modalData.market.split("-")[0]
                      )[0].coingeckoData.coingeckoRateUSD -
                      1) *
                    100
                  ).toFixed(2)}
                  %
                </li>
              </ul>
            </div>
            <div className="orderbook">
              <div className="bids-table">
                <div className="bid-row first-row">
                  <span>
                    Size ({this.state.modalData.market.split("-")[0]})
                  </span>
                  <span>Size (USD)</span>
                  {/* <span>
                    Price ({this.state.modalData.market.split("-")[1]})
                  </span> */}
                  <span>Price (USD)</span>
                </div>
                {this.state.modalData.bids.map((x, i) => {
                  return (
                    <div className="bid-row">
                      <span>{x[1]}</span>
                      <span>
                        $
                        {(
                          parseFloat(x[1]) *
                          (parseFloat(x[0]) *
                            this.state[
                              this.state.modalData.market.split("-")[1]
                            ])
                        ).toFixed(2)}
                      </span>
                      {/* <span className="bid-price">{x[0]}</span> */}
                      <span className="bid-price">
                        $
                        {parseFloat(
                          (
                            parseFloat(x[0]) *
                            this.state[
                              this.state.modalData.market.split("-")[1]
                            ]
                          ).toFixed(
                            countDecimals(
                              this.state.results.filter(
                                (r) =>
                                  r.ticker ===
                                  this.state.modalData.market.split("-")[0]
                              )[0].coingeckoData.coingeckoRateUSD
                            )
                          )
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="asks-table">
                <div className="ask-row first-row">
                  <span className="left">Price (USD)</span>
                  {/* <span className="left">
                    Price ({this.state.modalData.market.split("-")[1]})
                  </span> */}
                  <span>Size (USD)</span>
                  <span className="left">
                    Size ({this.state.modalData.market.split("-")[0]})
                  </span>
                </div>
                {this.state.modalData.asks.map((x, i) => {
                  return (
                    <div className="ask-row">
                      <span className="ask-price">
                        $
                        {parseFloat(
                          (
                            parseFloat(x[0]) *
                            this.state[
                              this.state.modalData.market.split("-")[1]
                            ]
                          ).toFixed(
                            countDecimals(
                              this.state.results.filter(
                                (r) =>
                                  r.ticker ===
                                  this.state.modalData.market.split("-")[0]
                              )[0].coingeckoData.coingeckoRateUSD
                            )
                          )
                        )}
                      </span>
                      {/* <span className="ask-price">{x[0]}</span> */}
                      <span>
                        $
                        {(
                          parseFloat(x[1]) *
                          (parseFloat(x[0]) *
                            this.state[
                              this.state.modalData.market.split("-")[1]
                            ])
                        ).toFixed(2)}
                      </span>
                      <span>{x[1]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </ReactModal>
        ) : null}
      </div>
    );
  }
}

export default App;
