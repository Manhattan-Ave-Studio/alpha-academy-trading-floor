// Track 1: Market Basics
// Copy style: direct and calm, second person, short paragraphs, no em dashes or en dashes.
// Section HTML may use: p, ul, ol, table.data-table, and asides with class
// "note idea" (big idea), "note example" (worked example), "note warn" (watch out),
// "note try" (try it in the game), "note alpha" (Alpha connection).

const yt = (title, youtube) => ({ title, youtube, source: 'Investopedia' });
const INVESTOR_GOV = { title: 'Introduction to Investing', org: 'Investor.gov (U.S. SEC)', url: 'https://www.investor.gov/introduction-investing' };
const FINRA = { title: 'Investor Insights', org: 'FINRA', url: 'https://www.finra.org/investors' };

export const BASICS = [
  {
    id: 'what-is-a-stock',
    track: 'basics',
    title: 'What a stock is',
    summary: `Owning a share means owning a small piece of a real business, with a claim on its profits.`,
    goals: [
      `Explain what owning a share of stock gives you`,
      `Describe why companies sell shares and why investors buy them`,
      `Explain where a stock price comes from and what can push it down`
    ],
    sections: [
      {
        id: 'ownership',
        title: 'A share is a piece of a business',
        html: `
<p>A <strong>stock</strong> is ownership in a company. Each unit of ownership is a <strong>share</strong>. Own one share of Nike and you own a very small piece of Nike: its brand, its stores, its products, and a slice of the profit it earns.</p>
<p>How small a piece? Divide by the number of shares the company has issued, called its <strong>shares outstanding</strong>. A company with 200 million shares splits its ownership into 200 million equal pieces. Own 200 shares and you own one millionth of the business.</p>
<p>Ownership comes with three things:</p>
<ul>
  <li><strong>A claim on profits.</strong> Profits belong to the owners, whether the company pays them out or reinvests them.</li>
  <li><strong>A vote.</strong> Shareholders elect the board of directors, which hires and oversees the CEO. Usually one share means one vote.</li>
  <li><strong>Limited liability.</strong> If the company fails, you can lose what you paid for the stock and nothing more. Its debts stay its own.</li>
</ul>`
      },
      {
        id: 'why-sell',
        title: 'Why companies sell shares',
        html: `
<p>Companies need money to grow: to build stores, hire engineers, or launch products. They have two main ways to raise it.</p>
<ul>
  <li><strong>Borrow it.</strong> Take a bank loan or sell <strong>bonds</strong>. The money must be paid back with interest, in good years and bad.</li>
  <li><strong>Sell ownership.</strong> Sell shares to investors. Nothing has to be paid back, and in exchange the founders share the profits and the control.</li>
</ul>
<p>Most companies start <strong>private</strong>, owned by founders, employees, and a few investors. The first time a company sells shares to the public is its <strong>initial public offering</strong>, or IPO. After the IPO, its shares trade between investors on a stock exchange every business day.</p>
<aside class="note example"><b>Worked example</b><p>When you buy a share of Apple today, you buy it from another investor who wants to sell. Apple receives no money from your trade. Companies collect money when they sell new shares, as in an IPO. After that, investors trade the existing shares with each other.</p></aside>`
      },
      {
        id: 'getting-paid',
        title: 'Two ways shareholders get paid',
        html: `
<p><strong>Price growth.</strong> If the business becomes more valuable, its shares usually do too. Buy a share at $40, sell it later at $50, and your <strong>capital gain</strong> is $10, or 25%.</p>
<p><strong>Dividends.</strong> Some companies send part of their profits to shareholders in cash, often every quarter. A company that pays $0.50 per share each quarter pays $2.00 a year. If the stock costs $50, that is a <strong>dividend yield</strong> of 4%.</p>
<p>Add the two together and you get <strong>total return</strong>: the change in price plus any dividends you received.</p>
<table class="data-table">
  <thead><tr><th>You buy at</th><th>Dividends received</th><th>You sell at</th><th>Total return</th></tr></thead>
  <tbody><tr><td>$40.00</td><td>$2.00</td><td>$46.00</td><td>$6.00 + $2.00 = $8.00, or 20%</td></tr></tbody>
</table>
<p>Many fast-growing companies pay no dividend at all. They reinvest every dollar into growth, and their owners expect to be rewarded through a higher share price instead.</p>`
      },
      {
        id: 'price',
        title: 'Where the price comes from',
        html: `
<p>Nobody sets a stock price by hand. The price you see is the last price at which a buyer and a seller agreed to trade. When more people want to buy than sell, buyers offer more and the price rises. When more want to sell, sellers accept less and it falls.</p>
<p>Underneath all that trading, investors are asking one question: how much will this company earn in the years ahead? That is why prices react to news.</p>
<ul>
  <li>A company reports profits above what investors expected, and buyers rush in.</li>
  <li>A new product flops, and investors lower their estimates of future profits.</li>
  <li>Interest rates rise, and future profits look less valuable next to safe savings.</li>
</ul>
<aside class="note idea"><b>Big idea</b><p>A stock price is the market's running estimate of a company's future. Learn the business first, then judge whether the price makes sense.</p></aside>`
      },
      {
        id: 'risks',
        title: 'What can go wrong',
        html: `
<p>Over long periods, stocks have built more wealth than almost anything else an ordinary family can own. They also come with real risk.</p>
<ul>
  <li><strong>Prices swing.</strong> Even great companies can fall 30% or more in a bad year.</li>
  <li><strong>Businesses can fail.</strong> In a bankruptcy, lenders are paid before owners. Shareholders are last in line and often receive nothing.</li>
  <li><strong>What you own decides your outcome.</strong> One company can collapse. Hundreds of companies at once almost never do, which is why spreading your money out matters.</li>
</ul>
<aside class="note warn"><b>Watch out</b><p>A brand you love is a starting point for research. Whether the stock is a good investment depends on the business's profits and the price you pay.</p></aside>`
      },
      {
        id: 'compare',
        title: 'Stocks next to other things you can own',
        html: `
<table class="data-table">
  <thead><tr><th>What you own</th><th>What it really is</th><th>How you earn</th></tr></thead>
  <tbody>
    <tr><td>Stock</td><td>Part ownership of a company</td><td>Price growth and dividends</td></tr>
    <tr><td>Bond</td><td>A loan to a company or government</td><td>Interest, plus your money back at the end</td></tr>
    <tr><td>Savings account</td><td>A deposit at an insured bank</td><td>Interest, with your balance protected</td></tr>
    <tr><td>Fund</td><td>A basket of many stocks or bonds</td><td>Whatever the basket earns, minus a small fee</td></tr>
  </tbody>
</table>
<aside class="note try"><b>Try it in the game</b><p>Open <a href="#/markets">Markets</a> and find a company whose products you use every week. Read its description and price, then add it to your watchlist with the star.</p></aside>`
      }
    ],
    takeaways: [
      `A share is part ownership of a business: a claim on its profits, a vote, and limited liability.`,
      `Companies raise money by borrowing or by selling shares. After the IPO, investors trade shares with each other.`,
      `Shareholders earn through price growth and dividends. Together they make total return.`,
      `Prices move as buyers and sellers update their estimates of future profits.`,
      `Any single company can fall sharply or fail, so research it and spread your money.`
    ],
    discuss: [
      `Name a company you buy from every week. What would you want to know before owning part of it?`,
      `Why would anyone buy a stock that pays no dividend?`,
      `If you owned a growing company, would you borrow money or sell shares to expand it? Why?`
    ],
    videos: [yt('What Are Stocks?', 'JrGp4ofULzQ'), yt('What Is a Dividend?', 'sP8uEdKVRvA')],
    links: [INVESTOR_GOV],
    terms: ['stock', 'share', 'shareholder', 'ipo', 'dividend', 'dividend-yield', 'capital-gain', 'total-return', 'bond'],
    exam: [
      {
        q: `When you buy a share of a company, what do you own?`,
        choices: [`A loan you made to the company`, `A small piece of the company`, `A gift card for its products`, `A guaranteed yearly payment`],
        answer: 1,
        explain: `A share is a unit of ownership. A loan to a company is a bond.`
      },
      {
        q: `What is it called when a company sells shares to the public for the first time?`,
        choices: [`A dividend`, `A merger`, `An initial public offering (IPO)`, `A stock split`],
        answer: 2,
        explain: `The IPO is the first public sale. After that, investors trade the shares with each other.`
      },
      {
        q: `You buy a share of a large public company on an exchange today. Who most likely sold it to you?`,
        choices: [`The company itself`, `Another investor`, `The stock exchange`, `The government`],
        answer: 1,
        explain: `After the IPO, existing shares trade between investors. The company receives no money from your trade.`
      },
      {
        q: `What mostly moves a stock price from day to day?`,
        choices: [`The CEO picks a new price each morning`, `Buyers and sellers deciding what the company is worth`, `The government sets it`, `It changes only when dividends are paid`],
        answer: 1,
        explain: `Prices come from trades between buyers and sellers, driven by expectations about future profits.`
      },
      {
        q: `A stock pays $0.50 per share every quarter and trades at $50. What is its yearly dividend yield?`,
        choices: [`1%`, `2%`, `4%`, `25%`],
        answer: 2,
        explain: `Four payments of $0.50 is $2.00 a year. $2.00 / $50 = 0.04, or 4%.`
      },
      {
        q: `You buy a share at $40, collect $2 in dividends, and sell at $46. What is your total return in dollars?`,
        choices: [`$2`, `$6`, `$8`, `$46`],
        answer: 2,
        explain: `A $6 price gain plus $2 in dividends is $8 of total return.`
      },
      {
        q: `A company goes bankrupt. Who is usually paid first from whatever is left?`,
        choices: [`Shareholders`, `Lenders, such as bondholders`, `Customers`, `Everyone equally`],
        answer: 1,
        explain: `Lenders come before owners. Shareholders are last in line and often receive nothing.`
      },
      {
        q: `A company keeps all its profits to build new factories and pays no dividend. Why might investors still buy it?`,
        choices: [`They expect growth to raise the share price over time`, `Companies without dividends cannot lose value`, `The government guarantees growth stocks`, `Dividends are against the law`],
        answer: 0,
        explain: `Reinvested profits can grow the business, and owners expect to be rewarded through a higher share price.`
      }
    ]
  },

  {
    id: 'how-the-market-works',
    track: 'basics',
    title: 'How the stock market works',
    summary: `Exchanges, brokers, quotes, market hours, settlement, and the indexes you hear about on the news.`,
    goals: [
      `Describe who does what: exchanges, brokers, market makers, and regulators`,
      `Read a bid, an ask, and a spread, and know which price you pay`,
      `Explain market hours, T+1 settlement, and what the major indexes measure`
    ],
    sections: [
      {
        id: 'marketplace',
        title: 'A marketplace for ownership',
        html: `
<p>The stock market is a network of marketplaces where buyers and sellers trade shares. Today almost all of it is electronic: computers match buy and sell orders in fractions of a second.</p>
<p>It started with people on a street. In 1792, two dozen brokers signed the <strong>Buttonwood Agreement</strong> on Wall Street, the beginning of what became the <strong>New York Stock Exchange (NYSE)</strong>. In 1971, <strong>Nasdaq</strong> opened as the world's first electronic stock market. They are still the two biggest U.S. exchanges, joined by more than a dozen smaller ones. The live prices in this game come from one of them, the Investors Exchange (IEX).</p>`
      },
      {
        id: 'brokers',
        title: 'Brokers: your way in',
        html: `
<p>You trade through a <strong>broker</strong>, a firm such as Fidelity, Schwab, or Vanguard, which holds your account and sends your orders to the market. Most large brokers charge no commission for online stock trades.</p>
<p>People under 18 can invest through a <strong>custodial account</strong> that a parent or guardian opens and manages with them. Lesson 16 covers how.</p>
<p>If a brokerage firm itself fails, the <strong>Securities Investor Protection Corporation (SIPC)</strong> protects each customer's account up to $500,000, including up to $250,000 in cash. SIPC steps in when a firm fails. The ups and downs of your investments remain yours to manage.</p>`
      },
      {
        id: 'bid-ask',
        title: 'Bid, ask, and spread',
        html: `
<p>Every stock has two prices at any moment:</p>
<ul>
  <li>The <strong>bid</strong> is the highest price a buyer is offering right now.</li>
  <li>The <strong>ask</strong> is the lowest price a seller will accept right now.</li>
  <li>The <strong>spread</strong> is the gap between them.</li>
</ul>
<p>When you buy with a market order, you pay about the ask. When you sell, you receive about the bid. Firms called <strong>market makers</strong> stand ready to buy and sell all day and earn that small gap, which keeps trading smooth.</p>
<table class="data-table">
  <thead><tr><th>Stock</th><th>Bid</th><th>Ask</th><th>Spread</th><th>Spread as a share of price</th></tr></thead>
  <tbody>
    <tr><td>Busy large company</td><td>$49.98</td><td>$50.00</td><td>$0.02</td><td>0.04%</td></tr>
    <tr><td>Tiny, thinly traded company</td><td>$2.40</td><td>$2.60</td><td>$0.20</td><td>About 8%</td></tr>
  </tbody>
</table>
<p>A wide spread is a hidden cost. Buy at $2.60 and sell right away at $2.40, and you lose 8% while the company stays exactly the same. Heavily traded stocks and funds keep that cost tiny.</p>`
      },
      {
        id: 'hours',
        title: 'When the market is open',
        html: `
<p>Regular trading runs <strong>9:30 a.m. to 4:00 p.m. Eastern Time</strong>, Monday through Friday. The market closes for ten regular holidays a year, including New Year's Day, Martin Luther King Jr. Day, Good Friday, Juneteenth, Independence Day, Thanksgiving, and Christmas. On a few days, such as the day after Thanksgiving, it closes early at 1:00 p.m.</p>
<p>Many brokers also offer early and late sessions, called pre-market and after-hours trading. Fewer people trade then, spreads are wider, and prices can jump.</p>
<p>In this game, orders fill during regular hours. An order you place at night waits for the opening bell and fills at the price the market offers then, the same as at a real brokerage.</p>`
      },
      {
        id: 'settlement',
        title: 'Settlement: when a trade becomes final',
        html: `
<p>When you buy a stock, the trade happens instantly, and the official exchange of money and shares follows one business day later. This is <strong>T+1 settlement</strong>, the U.S. standard since May 2024. Buy on Monday and the trade settles Tuesday. Buy on Friday and it settles Monday.</p>`
      },
      {
        id: 'indexes',
        title: "Indexes: the market's scoreboard",
        html: `
<p>When the news says "the market rose 1% today," it usually means one of three indexes. Each is a list of stocks tracked as a single number.</p>
<table class="data-table">
  <thead><tr><th>Index</th><th>What is in it</th><th>How it counts</th></tr></thead>
  <tbody>
    <tr><td>S&amp;P 500</td><td>About 500 of the largest U.S. companies</td><td>Bigger companies count more (weighted by market value)</td></tr>
    <tr><td>Dow Jones Industrial Average</td><td>30 large, well-known companies, tracked since 1896</td><td>Higher-priced stocks count more (weighted by share price)</td></tr>
    <tr><td>Nasdaq Composite</td><td>Thousands of stocks listed on Nasdaq, heavy in technology</td><td>Bigger companies count more</td></tr>
  </tbody>
</table>
<p>Professionals treat the S&amp;P 500 as "the market" because it covers about 80% of the value of U.S. stocks. You cannot buy an index itself, but you can buy a fund that copies it. Lesson 8 shows how.</p>`
      },
      {
        id: 'rules',
        title: 'Who keeps it fair',
        html: `
<p>After the 1929 crash, Congress created the <strong>Securities and Exchange Commission (SEC)</strong> in 1934. The SEC requires public companies to publish honest financial reports, polices fraud and insider trading, and oversees the exchanges. <strong>FINRA</strong> supervises brokers and the people who work for them. Both publish free guides for investors.</p>
<aside class="note idea"><b>Big idea</b><p>You trade through a broker, on a marketplace, at prices set by buyers and sellers, under rules that require companies to tell the truth.</p></aside>
<aside class="note try"><b>Try it in the game</b><p>Check the market status at the top of the app. If the market is closed, place a small buy order and watch it wait in <a href="#/orders">Orders</a> until the opening bell.</p></aside>`
      }
    ],
    takeaways: [
      `Exchanges match buyers and sellers, brokers give you access, and market makers keep trading smooth.`,
      `You buy near the ask and sell near the bid. A wide spread is a hidden cost.`,
      `Regular hours are 9:30 a.m. to 4:00 p.m. Eastern, and trades settle one business day later.`,
      `The S&P 500, the Dow, and the Nasdaq Composite are scoreboards for different slices of the market.`,
      `The SEC and FINRA set and enforce the rules that protect investors.`
    ],
    discuss: [
      `Why might a stock with very few buyers and sellers be riskier to trade?`,
      `The Dow counts higher-priced stocks more. Is that a fair way to measure the market? Why or why not?`
    ],
    videos: [],
    links: [INVESTOR_GOV, FINRA],
    terms: ['exchange', 'nyse', 'nasdaq', 'broker', 'bid', 'ask', 'spread', 'market-maker', 'liquidity', 'custodial-account', 'sipc', 'settlement', 'market-hours', 'sp500', 'dow', 'index'],
    exam: [
      {
        q: `What is the spread?`,
        choices: [`The fee your broker charges`, `The gap between the bid and the ask`, `How many shares traded today`, `The difference between the open and the close`],
        answer: 1,
        explain: `The bid is the best offer to buy, the ask is the best offer to sell, and the spread is the gap.`
      },
      {
        q: `What are regular U.S. stock market hours?`,
        choices: [`24 hours a day`, `8:00 a.m. to 8:00 p.m. ET`, `9:30 a.m. to 4:00 p.m. ET`, `10:00 a.m. to 3:00 p.m. ET`],
        answer: 2,
        explain: `The regular session runs 9:30 a.m. to 4:00 p.m. Eastern Time on business days.`
      },
      {
        q: `What does the S&P 500 track?`,
        choices: [`About 500 of the largest U.S. companies`, `The 500 newest companies`, `Only technology stocks`, `Government bonds`],
        answer: 0,
        explain: `It is an index of about 500 large U.S. companies and the most common benchmark for "the market."`
      },
      {
        q: `A stock shows a bid of $49.98 and an ask of $50.00. About what price do you pay with a market buy order?`,
        choices: [`$49.98`, `$49.99`, `$50.00`, `$50.02`],
        answer: 2,
        explain: `Buyers pay about the ask, the lowest price a seller will accept right now.`
      },
      {
        q: `You buy shares on a Monday. Under T+1 settlement, when does the trade become final?`,
        choices: [`Monday`, `Tuesday`, `Wednesday`, `Friday`],
        answer: 1,
        explain: `T+1 means one business day after the trade.`
      },
      {
        q: `Which opened in 1971 as the world's first electronic stock market?`,
        choices: [`The New York Stock Exchange`, `Nasdaq`, `The Dow Jones Industrial Average`, `The SEC`],
        answer: 1,
        explain: `Nasdaq launched in 1971. The NYSE traces back to the Buttonwood Agreement of 1792.`
      },
      {
        q: `How does the Dow Jones Industrial Average differ from the S&P 500?`,
        choices: [`It tracks 30 companies, weighted by share price`, `It tracks only technology stocks`, `It tracks 5,000 small companies`, `It tracks government bonds`],
        answer: 0,
        explain: `The Dow follows 30 large companies and counts higher-priced stocks more.`
      },
      {
        q: `Which agency, created in 1934, requires public companies to publish honest financial reports?`,
        choices: [`The FDIC`, `The SEC`, `The IRS`, `The Federal Reserve`],
        answer: 1,
        explain: `The Securities and Exchange Commission oversees the markets and polices fraud.`
      }
    ]
  },

  {
    id: 'reading-a-quote',
    track: 'basics',
    title: 'Reading a stock quote',
    summary: `Price, change, market cap, earnings, P/E, volume, and the chart, in plain English.`,
    goals: [
      `Find and explain every number on a stock page`,
      `Calculate change, market cap, EPS, P/E, and dividend yield`,
      `Compare companies by size and value instead of by share price`
    ],
    sections: [
      {
        id: 'numbers',
        title: 'The numbers on every stock page',
        html: `
<p>Every stock page shows the same core numbers. Learn them once and you can size up any company in a minute.</p>
<table class="data-table">
  <thead><tr><th>Term</th><th>What it tells you</th></tr></thead>
  <tbody>
    <tr><td>Ticker</td><td>A short code for the stock, like AAPL for Apple or NKE for Nike.</td></tr>
    <tr><td>Price</td><td>The last price a share traded at.</td></tr>
    <tr><td>Change</td><td>How far the price moved since yesterday's close, in dollars and percent.</td></tr>
    <tr><td>Open and day's range</td><td>Today's first price, and the lowest and highest prices so far today.</td></tr>
    <tr><td>Previous close</td><td>Where the stock finished yesterday at 4:00 p.m.</td></tr>
    <tr><td>Volume</td><td>How many shares changed hands.</td></tr>
    <tr><td>Market cap</td><td>The total value of all shares: price times shares outstanding.</td></tr>
    <tr><td>EPS</td><td>Earnings per share: the company's yearly profit divided by its shares.</td></tr>
    <tr><td>P/E ratio</td><td>Price divided by yearly earnings per share.</td></tr>
    <tr><td>52-week range</td><td>The lowest and highest prices over the past year.</td></tr>
    <tr><td>Dividend yield</td><td>Yearly dividends as a percent of the price.</td></tr>
  </tbody>
</table>`
      },
      {
        id: 'example',
        title: 'Walk through an example',
        html: `
<p>Imagine a company called Brooklyn Bikes. Yesterday it closed at <strong>$48</strong>. Today it trades at <strong>$50</strong>.</p>
<ul>
  <li><strong>Change:</strong> $50 minus $48 is <strong>+$2.00</strong>. Divide by yesterday's close: 2 / 48 = <strong>+4.17%</strong>.</li>
  <li><strong>Market cap:</strong> it has 200 million shares. 200 million x $50 = <strong>$10 billion</strong>.</li>
  <li><strong>EPS:</strong> it earned $500 million last year. $500 million / 200 million shares = <strong>$2.50 per share</strong>.</li>
  <li><strong>P/E:</strong> $50 / $2.50 = <strong>20</strong>. Investors are paying $20 for every $1 of yearly profit.</li>
  <li><strong>Dividend yield:</strong> it pays $1.00 per share a year. $1.00 / $50 = <strong>2%</strong>.</li>
  <li><strong>52-week range:</strong> $38 to $55. Today's price sits near the top of the past year's range.</li>
</ul>`
      },
      {
        id: 'market-cap',
        title: 'Market cap: how big is the company?',
        html: `
<p>Share price alone tells you very little about size. A $500 stock can belong to a smaller company than a $50 stock, because size depends on price times the number of shares.</p>
<table class="data-table">
  <thead><tr><th>Size</th><th>Market cap</th><th>Typical example</th></tr></thead>
  <tbody>
    <tr><td>Large-cap</td><td>$10 billion and up</td><td>Household names in the S&amp;P 500</td></tr>
    <tr><td>Mid-cap</td><td>$2 billion to $10 billion</td><td>Established companies that are still growing</td></tr>
    <tr><td>Small-cap</td><td>Under $2 billion</td><td>Younger or more specialized companies</td></tr>
  </tbody>
</table>
<p>Companies sometimes do a <strong>stock split</strong> to make each share cheaper. In a 2-for-1 split, every share becomes two shares at half the price, so one $200 share becomes two $100 shares. Your total value and your slice of the company stay exactly the same.</p>`
      },
      {
        id: 'earnings',
        title: 'Earnings, EPS, and P/E',
        html: `
<p><strong>Earnings per share (EPS)</strong> divides a company's yearly profit, called net income, by its shares outstanding. The <strong>price-to-earnings ratio (P/E)</strong> divides the share price by EPS. It tells you how many dollars investors pay for each dollar of yearly profit.</p>
<p>A high P/E usually means investors expect fast growth. A low P/E can mean a bargain, or a business people are worried about. P/E works best when you compare companies in the same industry.</p>
<aside class="note example"><b>Worked example</b><p>Two restaurant chains both earn $2 per share. Chain A trades at $36, a P/E of 18, and grows its profits about 5% a year. Chain B trades at $80, a P/E of 40, and grows its profits about 25% a year. Chain B costs more per dollar of profit today because investors expect its profits to grow much faster. Whether that is a good deal depends on whether the growth shows up.</p></aside>
<p>When a company loses money, its EPS is negative and its P/E shows as "n/a." That is common for young companies still investing heavily in growth.</p>`
      },
      {
        id: 'volume',
        title: 'Volume and the 52-week range',
        html: `
<p><strong>Volume</strong> is how many shares traded today. Heavy volume means lots of interest and easy trading. Volume often jumps on big news, like an earnings report, so a big move on heavy volume carries more weight than one on light volume.</p>
<p>The <strong>52-week range</strong> gives context. A stock near its 52-week low might be on sale, or it might be falling for good reasons. A stock near its high might keep climbing, or it might be stretched. Use the range to decide which questions to research.</p>`
      },
      {
        id: 'chart',
        title: 'Reading the chart',
        html: `
<p>The chart on each stock page shows the price over the period you choose, from one day (1D) to five years (5Y). Two habits help:</p>
<ul>
  <li><strong>Check the time frame first.</strong> A stock can be down for the day and up 40% over five years. Same stock, different story.</li>
  <li><strong>Use candles for detail.</strong> On a candlestick chart, each candle shows four prices for one period: the open, high, low, and close. A green candle closed higher than it opened. A red candle closed lower.</li>
</ul>
<aside class="note warn"><b>Watch out</b><p>A chart records where a price has been. Pair it with what you know about the business before you decide where it might go.</p></aside>
<aside class="note try"><b>Try it in the game</b><p>Open any stock and find each number in the Key numbers panel. Tap a term to see its definition, then switch the chart to candles and find the biggest single-day move.</p></aside>`
      }
    ],
    takeaways: [
      `Change is measured against yesterday's close, in dollars and percent.`,
      `Market cap, price times shares outstanding, is how you compare company sizes.`,
      `EPS is profit per share. P/E is price divided by EPS: the price of $1 of yearly profit.`,
      `Compare P/E ratios within one industry and alongside growth.`,
      `Volume, the 52-week range, and the chart add context to a decision you base on the business.`
    ],
    discuss: [
      `Two companies both trade at $100 a share. What would you need to know before saying which one is bigger or more expensive?`,
      `Would you rather own a company with a P/E of 12 or 45? What else would you want to know?`
    ],
    videos: [yt('Earnings Per Share Explained (EPS)', 'XGmNahd9Ne0')],
    links: [INVESTOR_GOV],
    terms: ['ticker', 'previous-close', 'day-change', 'volume', 'market-cap', 'large-cap', 'eps', 'pe-ratio', 'fifty-two-week-range', 'dividend-yield', 'stock-split'],
    exam: [
      {
        q: `A stock closed at $80 yesterday and trades at $84 today. What is the percent change?`,
        choices: [`+4%`, `+5%`, `+4.76%`, `+84%`],
        answer: 1,
        explain: `The change is $4. Divide by yesterday's close: 4 / 80 = 0.05, or +5%.`
      },
      {
        q: `A company has 1 billion shares priced at $30. What is its market cap?`,
        choices: [`$30 million`, `$300 million`, `$3 billion`, `$30 billion`],
        answer: 3,
        explain: `1,000,000,000 x $30 = $30,000,000,000, or $30 billion.`
      },
      {
        q: `What does a P/E ratio of 25 mean?`,
        choices: [`The stock rose 25% this year`, `Investors pay $25 for each $1 of yearly earnings`, `The company has 25 employees`, `The dividend is 25%`],
        answer: 1,
        explain: `P/E is the share price divided by earnings per share.`
      },
      {
        q: `A company earned $500 million last year and has 250 million shares outstanding. What is its EPS?`,
        choices: [`$0.50`, `$2.00`, `$5.00`, `$250`],
        answer: 1,
        explain: `$500 million / 250 million shares = $2.00 per share.`
      },
      {
        q: `A stock trades at $60 and pays $1.80 a year in dividends. What is its dividend yield?`,
        choices: [`1.8%`, `3%`, `6%`, `33%`],
        answer: 1,
        explain: `$1.80 / $60 = 0.03, or 3%.`
      },
      {
        q: `After a 2-for-1 stock split, what happens to someone who owned one $200 share?`,
        choices: [`They own two shares worth $100 each`, `They own one share worth $400`, `They lose half their money`, `They own two shares worth $200 each`],
        answer: 0,
        explain: `A split doubles the shares and halves the price. Total value stays the same.`
      },
      {
        q: `Company A's stock is $50 a share and Company B's is $500 a share. What can you conclude?`,
        choices: [`B is ten times bigger`, `B is more expensive`, `A is a better deal`, `Nothing yet: you need shares outstanding and earnings to compare`],
        answer: 3,
        explain: `Share price alone says little about size or value. Market cap and P/E do.`
      },
      {
        q: `On a candlestick chart, what does one candle show?`,
        choices: [`Only the closing price`, `The open, high, low, and close for one period`, `The number of buyers`, `The dividend for the day`],
        answer: 1,
        explain: `Each candle packs four prices into one period. Green closed higher than it opened, red lower.`
      }
    ]
  },

  {
    id: 'order-types',
    track: 'basics',
    title: 'Order types: market, limit, and stop',
    summary: `Control how and when your trade happens. This is how the trade ticket works.`,
    goals: [
      `Choose between market, limit, stop, and stop-limit orders`,
      `Predict how each order fills when prices move fast`,
      `Set how long an order lasts and size it by shares or dollars`
    ],
    sections: [
      {
        id: 'orders',
        title: 'Every trade starts with an order',
        html: `
<p>An <strong>order</strong> is your instruction to a broker: what to buy or sell, how much, and on what terms. The order type sets the trade-off between speed and price.</p>
<table class="data-table">
  <thead><tr><th>Order</th><th>What happens</th><th>Best for</th></tr></thead>
  <tbody>
    <tr><td>Market</td><td>Buys or sells right away at the current price.</td><td>Getting in or out quickly.</td></tr>
    <tr><td>Limit</td><td>Fills only at your price or better.</td><td>Controlling the exact price.</td></tr>
    <tr><td>Stop</td><td>Becomes a market order once the price reaches your stop.</td><td>Limiting losses or protecting gains.</td></tr>
    <tr><td>Stop-limit</td><td>Becomes a limit order once the price reaches your stop.</td><td>Protection with a price floor.</td></tr>
  </tbody>
</table>`
      },
      {
        id: 'market',
        title: 'Market orders: speed first',
        html: `
<p>A market order says "trade now at the best price available." During market hours it almost always fills right away. The exact price is the trade-off. In the moment between your click and the fill, the price can move, so you might see $50.00 and pay $50.05. That difference is called <strong>slippage</strong>.</p>
<p>Slippage is tiny for busy stocks and funds. It can be large for thinly traded stocks, right at the opening bell, or during big news.</p>
<p>In this game, a market order placed while the market is closed waits and fills at the first price after the next 9:30 a.m. open.</p>`
      },
      {
        id: 'limit',
        title: 'Limit orders: price first',
        html: `
<p>A <strong>limit order</strong> sets the worst price you will accept.</p>
<ul>
  <li>A <strong>buy limit at $95</strong> means buy only at $95 or lower.</li>
  <li>A <strong>sell limit at $120</strong> means sell only at $120 or higher.</li>
</ul>
<aside class="note example"><b>Worked example</b><p>You place a buy limit for 10 shares at $95.00. The stock trades at $97.10, then $95.40, then $94.85. Your order fills at $94.85, which beats your limit, for about $948.50.</p></aside>
<p>If the price never reaches your limit, the order never fills. That is the price of control. One more detail: a buy limit set above the current price fills right away at the current price, because the current price already beats your limit.</p>`
      },
      {
        id: 'stop',
        title: 'Stop orders: protection',
        html: `
<p>A <strong>stop order</strong> waits quietly until the price reaches your stop, then becomes a market order.</p>
<p>Say you bought 10 shares at $40 and the stock is now $50. You want to keep most of that gain. A <strong>sell stop at $45</strong> waits. If the price falls to $45, it turns into a market order and sells at the next available price, which might be $44.80 in a fast drop. Traders call this a stop-loss.</p>
<p>A <strong>buy stop</strong> works the other way. It waits above the current price and buys once the stock rises to your stop, for investors who want in only after a move up.</p>
<aside class="note warn"><b>Watch out: gaps</b><p>A stop triggers at the first trade at or past your stop, and prices can jump past it. If a stock closes at $46 and bad news hits overnight, it might open at $41. Your $45 stop triggers at the open and sells near $41.</p></aside>`
      },
      {
        id: 'stop-limit',
        title: 'Stop-limit orders: protection with a floor',
        html: `
<p>A stop-limit adds a price floor. "Stop $45, limit $44" means: once the price reaches $45, sell, and only at $44 or better.</p>
<p>In the gap example above, the stock opens at $41. Your stop triggers, but $41 is below your $44 limit, so the order waits instead of selling cheap. If the price recovers to $44, it sells. If it keeps falling, you still own the shares. You trade the risk of a bad price for the risk of no sale.</p>`
      },
      {
        id: 'duration',
        title: 'How long an order lasts',
        html: `
<ul>
  <li><strong>Day:</strong> expires at the 4:00 p.m. close if it has not filled.</li>
  <li><strong>Good 'til canceled (GTC):</strong> stays open until it fills or you cancel it. Brokers set an outer limit, often a few months. In this game, GTC orders expire after 90 days.</li>
</ul>
<p>Review your open orders often. A forgotten limit order can fill months later, after you have changed your mind about the stock.</p>`
      },
      {
        id: 'dollars',
        title: 'Shares or dollars',
        html: `
<p>Many brokers let you buy by dollar amount instead of share count. $250 of a stock priced at $600 buys about 0.4167 shares, called a <strong>fractional share</strong>. Fractional shares let you own expensive stocks and spread small amounts across many companies. Your mentor decides whether fractional shares are on in your game.</p>`
      },
      {
        id: 'choose',
        title: 'Choosing the right order',
        html: `
<table class="data-table">
  <thead><tr><th>Your goal</th><th>Use</th></tr></thead>
  <tbody>
    <tr><td>Get in or out now, in a busy stock or fund</td><td>Market order</td></tr>
    <tr><td>Pay no more, or sell for no less, than a set price</td><td>Limit order</td></tr>
    <tr><td>Protect a gain or cap a loss automatically</td><td>Stop order</td></tr>
    <tr><td>Protect a position and keep a floor under the sale price</td><td>Stop-limit order</td></tr>
  </tbody>
</table>
<aside class="note try"><b>Try it in the game</b><p>Place a buy limit a little below the current price. Watch it sit in <a href="#/orders">Orders</a> until the price comes to you, or cancel it.</p></aside>`
      }
    ],
    takeaways: [
      `Market orders trade fast at an uncertain price. Limit orders control the price and may never fill.`,
      `A stop becomes a market order when triggered. A stop-limit becomes a limit order.`,
      `A stop is protection with no guaranteed price, because prices can gap past it.`,
      `Day orders expire at the close. GTC orders last until filled, canceled, or expired.`,
      `Dollar orders and fractional shares let small amounts go further.`
    ],
    discuss: [
      `When would you choose a limit order over a market order? Give a real example.`,
      `Where would you set a stop on a stock you own, and why there?`
    ],
    videos: [yt('Stop Order vs. Limit Order', 'TeHmx3H54jo'), yt('The Stop-Loss Order', 'MfDKUU6OBxc')],
    links: [INVESTOR_GOV],
    terms: ['market-order', 'limit-order', 'stop-order', 'stop-limit-order', 'slippage', 'time-in-force', 'fractional-share', 'fill'],
    exam: [
      {
        q: `You want to buy a stock only if it drops to $95 or lower. Which order fits?`,
        choices: [`Market buy`, `Buy limit at $95`, `Buy stop at $95`, `Sell limit at $95`],
        answer: 1,
        explain: `A buy limit fills only at your limit price or better, which means lower.`
      },
      {
        q: `You own shares bought at $40, the price is $50, and you set a sell stop at $45. What happens if the price falls to $45?`,
        choices: [`Nothing until you approve it`, `It sells at the next available market price`, `It sells only at exactly $45`, `It buys more shares`],
        answer: 1,
        explain: `A stop becomes a market order when triggered, so it fills at the next available price.`
      },
      {
        q: `What does a market order prioritize?`,
        choices: [`An exact price`, `That you make money`, `A fast fill, at whatever the current price is`, `Lasting 90 days`],
        answer: 2,
        explain: `Market orders put speed first. Use a limit order when the exact price matters more.`
      },
      {
        q: `A stock closed at $46 and you have a sell stop at $45. Bad news hits overnight and it opens at $41. What happens?`,
        choices: [`Nothing, because the price skipped $45`, `The stop triggers and sells near $41`, `It sells at exactly $45`, `The broker cancels the order`],
        answer: 1,
        explain: `Once the price reaches or passes the stop, it becomes a market order and sells at the next available price, here near $41.`
      },
      {
        q: `A stock closed at $46, and you hold it with a stop-limit order: stop $45, limit $44. Bad news hits overnight and it opens at $41. What happens?`,
        choices: [`It sells at $41`, `It sells at $45`, `It triggers and waits, since $41 is below your $44 limit`, `It buys more shares`],
        answer: 2,
        explain: `A stop-limit becomes a limit order and sells only at $44 or better.`
      },
      {
        q: `A day order has not filled by 4:00 p.m. What happens to it?`,
        choices: [`It fills at the close`, `It expires`, `It becomes a GTC order`, `It turns into a market order`],
        answer: 1,
        explain: `Day orders last only until the close of the session.`
      },
      {
        q: `A stock trades at $100 and you place a buy limit at $105. What happens?`,
        choices: [`It waits until the price rises to $105`, `It fills right away at about $100`, `It is rejected`, `It sells your shares`],
        answer: 1,
        explain: `The current price already beats your limit, so the order fills right away.`
      },
      {
        q: `You place a $300 order for a stock priced at $1,200. About how many shares do you get?`,
        choices: [`0.25`, `2.5`, `4`, `300`],
        answer: 0,
        explain: `$300 / $1,200 = 0.25 shares.`
      }
    ]
  },

  {
    id: 'bulls-bears-volatility',
    track: 'basics',
    title: 'Bulls, bears, and volatility',
    summary: `Markets rise and fall. History shows what drops look like, how recoveries happen, and why time is your edge.`,
    goals: [
      `Use the vocabulary of market ups and downs`,
      `Describe what history shows about drops, recoveries, and long-run returns`,
      `Match where you keep money to when you will need it`
    ],
    sections: [
      {
        id: 'words',
        title: 'The words for ups and downs',
        html: `
<ul>
  <li><strong>Bull market:</strong> a long stretch of rising prices.</li>
  <li><strong>Correction:</strong> a drop of 10% or more from a recent high.</li>
  <li><strong>Bear market:</strong> a drop of 20% or more from a recent high.</li>
  <li><strong>Volatility:</strong> how much and how fast prices swing. A single stock is usually more volatile than an index fund.</li>
  <li><strong>Recession:</strong> a significant decline in economic activity across the economy that lasts more than a few months. Stock prices often fall before and during one.</li>
</ul>
<p>Investors also watch the <strong>VIX</strong>, an index that measures how much movement traders expect in the S&amp;P 500 over the next 30 days. It tends to spike when fear rises, which is why people call it the fear gauge.</p>`
      },
      {
        id: 'history',
        title: 'What recent history shows',
        html: `
<table class="data-table">
  <thead><tr><th>Period</th><th>S&amp;P 500 drop</th><th>Back to a new high</th></tr></thead>
  <tbody>
    <tr><td>Financial crisis, 2007 to 2009</td><td>About 57%</td><td>March 2013</td></tr>
    <tr><td>Pandemic crash, early 2020</td><td>About 34% in a month</td><td>August 2020</td></tr>
    <tr><td>Inflation scare, 2022</td><td>About 25%</td><td>January 2024</td></tr>
    <tr><td>Tariff selloff, spring 2025</td><td>Almost 19% in seven weeks</td><td>June 2025</td></tr>
  </tbody>
</table>
<p>Over the past century, the S&amp;P 500 has returned roughly 10% a year on average, including dividends. That average hides wide swings: in 2008 it lost about 37%, and in 2013 it gained about 32%. Since 1926 it has finished higher in roughly three out of every four calendar years. Past results are no promise about the future.</p>`
      },
      {
        id: 'why',
        title: 'Why prices swing',
        html: `
<ul>
  <li><strong>Company news:</strong> earnings, new products, lawsuits, leadership changes. One report can move a single stock 20% in a day.</li>
  <li><strong>Interest rates:</strong> when rates rise, safe savings pay more and future profits look less valuable, so stock prices often fall.</li>
  <li><strong>The economy:</strong> jobs, inflation, and consumer spending shape company profits.</li>
  <li><strong>Emotion:</strong> fear and greed push prices further than the news alone would.</li>
</ul>`
      },
      {
        id: 'recoveries',
        title: 'Drops, recoveries, and the cost of panic',
        html: `
<p>In a drop, the biggest risk is often the investor's own reaction. Selling after a fall locks in the loss, and the market's best days have often come within weeks of its worst days. Investors who sold in a panic in March 2020 often missed a rebound that began within days.</p>
<aside class="note example"><b>Worked example</b><p>An index fund falls from $100 to $70, a 30% drop. To get back to $100 it must rise about 43%, because $30 is 43% of $70. Recoveries need bigger percentages than the drops that caused them, and they take time.</p></aside>`
      },
      {
        id: 'horizon',
        title: 'Time horizon is your advantage',
        html: `
<p>Where you keep money should depend on when you will need it.</p>
<table class="data-table">
  <thead><tr><th>When you need it</th><th>A sensible home</th><th>Why</th></tr></thead>
  <tbody>
    <tr><td>Within 2 years</td><td>An insured savings account</td><td>Your balance stays steady</td></tr>
    <tr><td>In 3 to 5 years</td><td>A mix of savings, bonds, and some stocks</td><td>Some growth with smaller swings</td></tr>
    <tr><td>In 10 years or more</td><td>Mostly stock index funds</td><td>Time to ride out drops and compound</td></tr>
  </tbody>
</table>
<p>Most of your investing years are ahead of you. A drop when you are 16 lowers the price of assets you plan to hold for decades.</p>
<aside class="note idea"><b>Big idea</b><p>Drops are normal. Investors who stayed invested through them have historically been rewarded. Investors who sold in a panic often locked in their losses.</p></aside>
<aside class="note try"><b>Try it in the game</b><p>On any stock page, switch the chart to 5Y and find the biggest drop. How long did the recovery take? Then compare it with SPY.</p></aside>`
      }
    ],
    takeaways: [
      `A correction is a 10% drop from a recent high. A bear market is 20% or more.`,
      `The S&P 500 has averaged roughly 10% a year over the past century, with wide swings along the way.`,
      `After a drop, it takes a bigger percentage gain to recover.`,
      `Selling in a panic locks in losses and risks missing the rebound.`,
      `Money you need soon belongs somewhere steady. Long-term money can ride out the swings.`
    ],
    discuss: [
      `How would you feel if $100 you invested became $70 in a month? What would you do, and why?`,
      `Why do you think the market's best days often come right after its worst days?`
    ],
    videos: [],
    links: [INVESTOR_GOV],
    terms: ['bull-market', 'bear-market', 'correction', 'volatility', 'recession', 'time-horizon', 'panic-selling'],
    exam: [
      {
        q: `A bear market is usually defined as a drop of at least:`,
        choices: [`5%`, `10%`, `20%`, `50%`],
        answer: 2,
        explain: `A 10% drop is a correction. A 20% drop is a bear market.`
      },
      {
        q: `After the early 2020 crash, about how long did the S&P 500 take to reach a new high?`,
        choices: [`About 5 months`, `About 5 years`, `About 10 years`, `It never recovered`],
        answer: 0,
        explain: `It bottomed in March 2020 and set a new high in August 2020.`
      },
      {
        q: `Where does money you need next year belong?`,
        choices: [`A single growth stock`, `A steady place like an insured savings account`, `Whatever is trending online`, `Options contracts`],
        answer: 1,
        explain: `Short time horizons call for steady, low-risk places. Stocks suit long horizons.`
      },
      {
        q: `A correction is a drop of at least:`,
        choices: [`5%`, `10%`, `20%`, `50%`],
        answer: 1,
        explain: `A 10% fall from a recent high is a correction.`
      },
      {
        q: `Over the past century, the S&P 500 has averaged about what yearly return, including dividends?`,
        choices: [`2%`, `5%`, `10%`, `25%`],
        answer: 2,
        explain: `Roughly 10% a year on average, with big swings from year to year.`
      },
      {
        q: `A fund falls from $100 to $70. About how much must it rise to get back to $100?`,
        choices: [`30%`, `43%`, `70%`, `100%`],
        answer: 1,
        explain: `It must gain $30 on a $70 base: 30 / 70 is about 43%.`
      },
      {
        q: `Which is usually more volatile?`,
        choices: [`A single company's stock`, `A broad S&P 500 index fund`, `An insured savings account`, `A U.S. savings bond`],
        answer: 0,
        explain: `One company can swing on its own news. An index spreads that risk across hundreds of companies.`
      },
      {
        q: `Your index fund drops 15% in a month, and you will not need the money for 20 years. What does history suggest?`,
        choices: [`Sell everything before it falls more`, `Staying invested has historically been rewarded`, `Move it all into one hot stock`, `Stop investing for good`],
        answer: 1,
        explain: `Long-term investors who held through drops have historically recovered and grown. Panic selling locks in the loss.`
      }
    ]
  },
  {
    id: 'bonds-and-commodities',
    track: 'basics',
    title: 'Beyond stocks: bonds, commodities, and more',
    summary: `Stocks are one market among many. Learn how bonds and commodities trade, what moves their prices, and how they fit next to stocks.`,
    goals: [
      `Explain how bonds work, from Treasury bills to corporate bonds, and why their prices move when interest rates change`,
      `Describe what commodities are, how futures contracts work, and what moves commodity prices`,
      `Compare the ways regular investors can own bonds and commodities, and the risks of each`
    ],
    sections: [
      {
        id: 'many-markets',
        title: 'Many markets, one idea',
        html: `
<p>A market is anywhere buyers and sellers agree on a price. The stock market gets the most attention, but it sits beside others that are just as important, and some are much bigger.</p>
<table class="data-table">
  <thead><tr><th>Market</th><th>What trades</th><th>Example</th></tr></thead>
  <tbody>
    <tr><td>Stocks</td><td>Small pieces of ownership in companies</td><td>A share of Nike</td></tr>
    <tr><td>Bonds</td><td>Loans to governments and companies</td><td>A 10-year Treasury note</td></tr>
    <tr><td>Commodities</td><td>Raw materials</td><td>Crude oil, gold, wheat, coffee</td></tr>
    <tr><td>Currencies</td><td>The money of different countries</td><td>Trading dollars for euros</td></tr>
  </tbody>
</table>
<p>Each answers a different question. Stocks: what is a company worth? Bonds: what does it cost to borrow? Commodities: what are raw materials worth today?</p>`
      },
      {
        id: 'who-borrows',
        title: 'Bonds: who borrows, and how',
        html: `
<p>A <strong>bond</strong> is a loan. When you buy one, you lend money to the issuer. The issuer pays you interest and repays the bond's face value on a set date called <strong>maturity</strong>. A bondholder is a lender, not an owner, so a bond gives you no share of the company.</p>
<ul>
  <li><strong>The U.S. Treasury</strong> borrows when the federal government spends more than it collects in taxes. It sells Treasury bills, notes, and bonds at auction.</li>
  <li><strong>States and cities</strong> sell <strong>municipal bonds</strong> to pay for schools, highways, and sewer systems. New York City sells bonds to help pay for its schools and other projects.</li>
  <li><strong>Companies</strong> sell <strong>corporate bonds</strong> to build plants, buy equipment, or grow.</li>
</ul>
<table class="data-table">
  <thead><tr><th>Treasury security</th><th>Term (2026)</th><th>How it pays</th></tr></thead>
  <tbody>
    <tr><td>Bills</td><td>4 weeks to 52 weeks</td><td>Bought for less than face value. Your interest is the difference you get back at maturity.</td></tr>
    <tr><td>Notes</td><td>2, 3, 5, 7, or 10 years</td><td>Fixed interest every six months</td></tr>
    <tr><td>Bonds</td><td>20 or 30 years</td><td>Fixed interest every six months</td></tr>
    <tr><td>TIPS</td><td>5, 10, or 30 years</td><td>Principal rises with inflation, and so does the interest</td></tr>
  </tbody>
</table>
<p>Treasuries are backed by the full faith and credit of the U.S. government, so they are among the safest investments when it comes to getting repaid. Their prices still move with interest rates. Adults can buy them directly at TreasuryDirect.gov, starting at $100.</p>`
      },
      {
        id: 'price-and-yield',
        title: 'Price and yield: the seesaw',
        html: `
<p>A bond's <strong>coupon rate</strong> is set when it is issued and never changes. But bonds trade before they mature, and their prices move every day. Its <strong>yield</strong> is the interest as a percent of today's price.</p>
<aside class="note example"><b>Worked example</b><p>A $1,000 bond pays $65 of interest a year, a 6.5% yield. If its price drops to $950, the interest is still $65, but $65 is 6.84% of $950. The price went down, so the yield went up.</p></aside>
<p>That is the seesaw: <strong>when interest rates rise, existing bonds fall in price</strong> until their yields match new bonds. When rates fall, they rise.</p>
<aside class="note example"><b>Worked example</b><p>You buy a 10-year, $1,000 bond paying 3%. A year later, new bonds pay 4%. No one will pay full price for your 3% bond, so its price falls to about $925. If new bonds paid 2% instead, your 3% bond would be worth about $1,082.</p></aside>
<p>Longer bonds swing more. <strong>Duration</strong> measures it: if a bond fund's duration is 6, a 1 percentage point rise in rates lowers its price about 6%.</p>
<p>Hold a single bond to maturity and, if the borrower pays, you get every payment and your face value back, whatever its price did along the way. A bond fund never matures, so its price keeps moving with rates.</p>`
      },
      {
        id: 'credit',
        title: 'Credit ratings: will you get paid back?',
        html: `
<p>The biggest risk with a corporate or city bond is <strong>default</strong>: the borrower cannot pay interest or repay on time. Rating firms such as Moody's, S&amp;P, and Fitch give bonds letter grades called <strong>credit ratings</strong>.</p>
<ul>
  <li><strong>Investment grade:</strong> BBB- or better at S&amp;P (Baa3 or better at Moody's). Lower risk of default.</li>
  <li><strong>High-yield, or junk:</strong> below investment grade. These bonds pay more interest because there is a bigger chance the borrower will not pay, and they can be harder to sell.</li>
</ul>
<p>Even the United States has a rating. In May 2025, Moody's lowered it one notch from its top grade, Aaa, to Aa1, citing rising debt, a very high grade still. A rating is an opinion, so treat it as one clue, not the whole answer.</p>
<p>Interest on most municipal bonds is free of federal income tax, so they usually pay less than similar corporate bonds.</p>`
      },
      {
        id: 'safe-is-not-riskless',
        title: '2022: when safe bonds fell',
        html: `
<p>In 2022, prices rose fast, and the Federal Reserve raised its key interest rate from near zero in March to a range of 4.25% to 4.5% by December. The seesaw did the rest.</p>
<aside class="note warn"><b>Watch out</b><p>The Bloomberg U.S. Aggregate Bond Index, a broad measure of high-quality U.S. bonds, lost about 13% in 2022, its worst calendar year on record. Its worst year before that was 1994, when it lost about 3%. Investors in BND, the bond fund in this game, saw a similar drop.</p></aside>
<p>The lesson: low risk is not no risk. Bonds have lost less than stocks in most bad years, which is why many people own both. But rising rates can push bond prices down, and long bonds fall the most.</p>`
      },
      {
        id: 'savings-bonds',
        title: 'Savings bonds: a way in for teens',
        html: `
<p><strong>Savings bonds</strong> are U.S. Treasury bonds made for individuals. They come in two kinds, sold electronically through TreasuryDirect:</p>
<ul>
  <li><strong>I bonds</strong> pay a fixed rate plus an inflation rate that resets every six months. New rates are announced each May 1 and November 1.</li>
  <li><strong>EE bonds</strong> pay a fixed rate, and the Treasury guarantees they at least double in value if you hold them 20 years.</li>
</ul>
<p>They start at $25, and each person can buy up to $10,000 of each kind a year (2026 limits). You can cash them after a year, but before five years you give up the last three months of interest.</p>
<aside class="note idea"><b>Under 18?</b><p>You need to be 18 to open your own TreasuryDirect account. A parent or guardian can open a minor linked account inside theirs. The bonds belong to you, the adult manages the account, and the bonds can move to your own account once you turn 18.</p></aside>`
      },
      {
        id: 'commodities',
        title: 'Commodities: the stuff everything is made of',
        html: `
<p>A <strong>commodity</strong> is a raw material or basic product where one unit is treated the same as another, no matter who produced it. Cotton picked in Arkansas and cotton picked in India can both become jeans.</p>
<ul>
  <li><strong>Energy:</strong> crude oil, natural gas</li>
  <li><strong>Metals:</strong> gold, silver, copper</li>
  <li><strong>Agriculture:</strong> wheat, corn, coffee, cocoa</li>
  <li><strong>Livestock:</strong> cattle, hogs</li>
</ul>
<p>Prices come down to supply and demand, pushed around by weather, wars and politics, trade deals, and the economy. Bad weather in West Africa, where much of the world's cocoa grows, helped send cocoa prices sharply higher in 2023.</p>
<aside class="note example"><b>From the barrel to the pump</b><p>A barrel of crude oil holds 42 gallons. A $1 change in the price of a barrel works out to about 2.4 cents a gallon at the gas pump, all else equal.</p></aside>`
      },
      {
        id: 'futures',
        title: 'Futures: a price today for delivery later',
        html: `
<p>The <strong>spot price</strong> is the price for delivery right now. Most commodity trading uses <strong>futures contracts</strong> instead: agreements to buy or sell a set amount at a set price on a set future date. The exchange sets the size, quality, and delivery place, so traders only agree on price. Futures trade on exchanges such as NYMEX and CBOT, and the Commodity Futures Trading Commission (CFTC) regulates them, not the SEC. The CFTC calls speculating in futures "a volatile, complex and risky venture that is rarely suitable for individual investors."</p>
<ul>
  <li><strong>Hedgers</strong> lock in prices. A farmer sells futures before harvest in case crop prices fall. A food company buys them to lock in ingredient costs.</li>
  <li><strong>Speculators</strong> try to profit from where prices go. They take on risk hedgers want to shed, which makes trading easier for everyone.</li>
</ul>
<aside class="note example"><b>Worked example</b><p>Say a farmer sells corn futures at $4.50 a bushel before harvest. If corn falls to $3.50, her futures gain makes up for the lower crop price. If corn jumps to $5.50, she gives up the extra $1 a bushel. Hedging trades away upside to protect against downside.</p></aside>
<aside class="note warn"><b>The day oil cost less than nothing</b><p>On April 20, 2020, the May crude oil futures contract was a day from expiring. Holders would have to take real oil in Cushing, Oklahoma, but storage was scarce and demand had collapsed during COVID-19. It settled at negative $37.63 a barrel: holders paid others to take it, a first since the contract began trading in 1983. Futures are promises about real stuff, and they use borrowed money, so losses can exceed what you put in.</p></aside>`
      },
      {
        id: 'ways-in',
        title: 'How regular investors get in',
        html: `
<table class="data-table">
  <thead><tr><th>Way in</th><th>Example</th><th>Watch for</th></tr></thead>
  <tbody>
    <tr><td>A bond fund</td><td>BND owns thousands of U.S. bonds</td><td>Its price falls when rates rise</td></tr>
    <tr><td>A fund that holds the metal</td><td>GLD holds gold bars in vaults</td><td>A yearly fee, and gold can swing a lot</td></tr>
    <tr><td>A fund that holds futures</td><td>Oil and broad commodity funds</td><td>Can drift away from the price you see quoted</td></tr>
    <tr><td>Stocks of producers</td><td>XLE owns large U.S. energy companies</td><td>Company risks on top of commodity prices</td></tr>
  </tbody>
</table>
<p>Funds that hold futures do not own the commodity. Their contracts expire, so they keep selling the old one and buying a later one, called rolling. When later contracts cost more, called <strong>contango</strong>, the fund loses a little on each roll. In 2020, several oil funds lost much of their value, and some investors learned they had owned oil futures, not oil.</p>
<p>Other markets you will hear about: <strong>currencies</strong> trade more than anything else, about $9.5 trillion a day in April 2025. <strong>REITs</strong> own real estate such as apartments and warehouses and pay out most of their income as dividends. <strong>Crypto</strong> has no government backing, is not FDIC-insured, and is mostly not covered by SIPC, so regulators say to risk only money you can afford to lose entirely.</p>
<aside class="note try"><b>Try it in the game</b><p>In <a href="#/markets">Markets</a>, open SPY, BND, and GLD and set each chart to 1Y. Which moved the most? Which held steady? Owning a mix of markets that move differently is one way to spread out risk.</p></aside>`
      }
    ],
    takeaways: [
      `Bonds are loans. Treasuries, municipal bonds, and corporate bonds pay interest and return your money at maturity if the borrower pays.`,
      `Bond prices and yields move in opposite directions, and longer bonds swing more, as 2022 showed.`,
      `Credit ratings estimate the chance of being paid back. Higher interest usually means higher risk.`,
      `Commodities are raw materials priced by supply and demand. Most trade through futures, which expire and use borrowed money.`,
      `A fund that holds the real thing behaves differently from one that holds futures. Know which you own.`
    ],
    discuss: [
      `Why might a 70-year-old and a 16-year-old choose different amounts of bonds?`,
      `A farmer hedges her corn crop, and then corn prices jump. Did hedging fail? Why might she do it again next year?`,
      `What news this year might explain the gas prices in your neighborhood?`
    ],
    videos: [
      yt('Bond Yields: Current Yield and YTM', 'WQhowJQoIag'),
      { title: 'Treasury Bond Prices and Yields', youtube: 'mS7t91U9Qqg', source: 'Khan Academy' },
      { title: 'Futures Introduction', youtube: '3g6P0lRXotI', source: 'Khan Academy' }
    ],
    links: [
      { title: 'Investor Bulletin: Interest Rate Risk', org: 'Investor.gov (U.S. SEC)', url: 'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-86' },
      { title: 'Understanding Bond Yield and Return', org: 'FINRA', url: 'https://www.finra.org/investors/insights/bond-yield-return' },
      { title: 'Comparing EE and I bonds', org: 'TreasuryDirect (U.S. Treasury)', url: 'https://www.treasurydirect.gov/savings-bonds/comparing-ee-and-i-bonds/' },
      { title: 'Basics of Futures Trading', org: 'CFTC', url: 'https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/FuturesMarketBasics/index.htm' },
      { title: 'Learn About Risks Before Investing in Commodity ETPs or Funds', org: 'CFTC', url: 'https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/CustomerAdvisory_CommodityETPs.htm' },
      { title: 'Understanding Commodity Prices', org: 'Federal Reserve Bank of St. Louis', url: 'https://www.stlouisfed.org/open-vault/2025/dec/understanding-commodity-prices' }
    ],
    terms: ['bond', 'maturity', 'treasury-securities', 'tips', 'coupon-rate', 'yield', 'duration', 'credit-rating', 'high-yield-bond', 'municipal-bond', 'savings-bond', 'commodity', 'spot-price', 'futures-contract', 'hedging', 'contango'],
    exam: [
      {
        q: `A Treasury bill does not send interest checks. How does its owner earn interest?`,
        choices: [`By buying it for less than face value and getting the full face value at maturity`, `Through a dividend paid every quarter`, `By trading it for gold at maturity`, `Through monthly payments from a bank`],
        answer: 0,
        explain: `Bills sell for less than face value. The difference you get back at maturity is your interest.`
      },
      {
        q: `A bond pays $65 a year in interest, and its price falls from $1,000 to $950. What happens to its yield?`,
        choices: [`It falls below 6.5%`, `It rises to about 6.8%`, `It stays at 6.5%`, `It drops to zero`],
        answer: 1,
        explain: `The interest stays $65, and $65 divided by $950 is about 6.84%. Lower price, higher yield.`
      },
      {
        q: `A bond fund has a duration of about 6. If interest rates rise by 1 percentage point, about how much does its price change?`,
        choices: [`Up about 6%`, `Down about 6%`, `Down about 1%`, `It does not change`],
        answer: 1,
        explain: `Duration estimates the price change for a 1 point move in rates. Rates up, price down, about 6%.`
      },
      {
        q: `Why do high-yield, or junk, bonds pay more interest than investment-grade bonds?`,
        choices: [`The government guarantees them`, `There is a bigger chance the borrower will not pay`, `They always mature in one week`, `Their interest is free of all taxes`],
        answer: 1,
        explain: `Lenders demand more interest to make up for a higher risk of default.`
      },
      {
        q: `A corn farmer sells futures contracts before harvest. What is she most likely doing?`,
        choices: [`Hedging: locking in a price in case corn prices fall`, `Betting that corn prices will soar`, `Buying corn for her own farm`, `Avoiding taxes on her crop`],
        answer: 0,
        explain: `Selling futures locks in a price for her crop. She gives up extra gains if prices rise, in exchange for protection if they fall.`
      },
      {
        q: `On April 20, 2020, an expiring crude oil futures contract settled at negative $37.63 a barrel. What did that mean?`,
        choices: [`Holders paid others to take the contracts off their hands`, `Gas stations gave fuel away for free`, `The oil exchange closed for the day`, `Oil companies went out of business`],
        answer: 0,
        explain: `The contract was about to require delivery of real oil, storage was nearly full, and demand had collapsed, so some holders paid to get out.`
      },
      {
        q: `A fund that holds oil futures keeps selling expiring contracts and buying later ones that cost more. What tends to happen?`,
        choices: [`It loses a little on each roll and can lag the price of oil`, `It earns extra profit on each roll`, `It tracks the price of oil exactly`, `Its price can never fall`],
        answer: 0,
        explain: `Buying later contracts that cost more, called contango, creates a small loss on each roll.`
      },
      {
        q: `A 15-year-old wants to own I bonds. How can she do it?`,
        choices: [`A parent or guardian opens a minor linked account inside their TreasuryDirect account`, `She opens her own TreasuryDirect account`, `She buys them at any gas station`, `Teens cannot own savings bonds`],
        answer: 0,
        explain: `You must be 18 for your own account. Until then, an adult can hold savings bonds for you in a minor linked account.`
      }
    ]
  }
];
