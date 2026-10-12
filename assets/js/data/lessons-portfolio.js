// Track 2: Building a Portfolio
// Copy style: direct and calm, second person, short paragraphs, no em dashes or en dashes.

const yt = (title, youtube) => ({ title, youtube, source: 'Investopedia' });
const INVESTOR_GOV = { title: 'Introduction to Investing', org: 'Investor.gov (U.S. SEC)', url: 'https://www.investor.gov/introduction-investing' };
const FINRA = { title: 'Investor Insights', org: 'FINRA', url: 'https://www.finra.org/investors' };
const EDGAR = { title: 'EDGAR full-text search', org: 'U.S. Securities and Exchange Commission', url: 'https://www.sec.gov/edgar/search/' };

export const PORTFOLIO = [
  {
    id: 'risk-and-return',
    track: 'portfolio',
    title: 'Risk and return',
    summary: `Higher possible rewards come with bigger possible losses. Learn to size risk to your goals.`,
    goals: [
      `Explain the trade-off between risk and return`,
      `Place savings, bonds, funds, and stocks on a risk ladder`,
      `Account for inflation and match risk to your time horizon and temperament`
    ],
    sections: [
      {
        id: 'two-sides',
        title: 'Two sides of every investment',
        html: `
<p><strong>Return</strong> is what you gain or lose on an investment, usually shown as a percent per year. <strong>Risk</strong> is the chance that things turn out differently than you hoped, including losing money.</p>
<p>The two travel together. Investors demand a higher possible return for taking on more uncertainty. Anyone who promises high returns with no risk is describing something that does not exist, and that is a classic sign of a scam.</p>`
      },
      {
        id: 'ladder',
        title: 'The risk ladder',
        html: `
<table class="data-table">
  <thead><tr><th>Step</th><th>Example</th><th>Typical risk</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>Insured savings account</td><td>Very low. Your balance is protected, and growth is slow.</td></tr>
    <tr><td>2</td><td>Government and high-quality bonds</td><td>Low to moderate.</td></tr>
    <tr><td>3</td><td>Broad index funds</td><td>Moderate. Swings, but spread across hundreds of companies.</td></tr>
    <tr><td>4</td><td>Individual stocks</td><td>Higher. One company can drop sharply on bad news.</td></tr>
    <tr><td>5</td><td>Penny stocks, options, crypto</td><td>Very high. Large and fast losses are common.</td></tr>
  </tbody>
</table>
<p>Every step up the ladder offers more possible reward and more possible loss. Over long periods, stocks have earned more than bonds, and bonds more than savings accounts, in exchange for bigger swings along the way.</p>`
      },
      {
        id: 'bonds',
        title: 'Bonds: lending your money',
        html: `
<p>A <strong>bond</strong> is a loan. You lend money to a government or company, it pays you interest on a schedule, and it returns your money, called the principal, on a set date called maturity.</p>
<aside class="note example"><b>Worked example</b><p>You buy a $1,000 bond that pays 4% a year for 10 years. You receive $40 of interest each year, $400 in total, and get your $1,000 back at the end.</p></aside>
<p>Bonds carry their own risks. If the borrower fails, you may not be repaid in full. And when interest rates rise, older bonds paying lower rates become less attractive, so their prices fall. U.S. Treasury bonds, backed by the federal government, are considered among the safest.</p>`
      },
      {
        id: 'inflation',
        title: 'Inflation: the quiet risk',
        html: `
<p><strong>Inflation</strong> is the general rise in prices over time, and it shrinks what your money can buy. At 3% inflation, $100 buys only about $74 worth of today's goods ten years from now.</p>
<p>That makes "safe" money risky in its own way. A savings account earning 1% while prices rise 3% loses about 2% of buying power each year. Investors call the return after inflation the <strong>real return</strong>.</p>
<table class="data-table">
  <thead><tr><th>Your return</th><th>Inflation</th><th>Real return, about</th></tr></thead>
  <tbody>
    <tr><td>1%</td><td>3%</td><td>&minus;2%</td></tr>
    <tr><td>4%</td><td>3%</td><td>1%</td></tr>
    <tr><td>7%</td><td>3%</td><td>4%</td></tr>
  </tbody>
</table>`
      },
      {
        id: 'you',
        title: 'Your time horizon and your temperament',
        html: `
<ul>
  <li><strong>Time horizon:</strong> how long until you need the money. Longer horizons can handle more ups and downs.</li>
  <li><strong>Risk tolerance:</strong> how you react when your account drops. If a 20% loss would make you sell everything, you are taking more risk than you can live with.</li>
  <li><strong>Risk capacity:</strong> how much loss your life can absorb. Money for next month's rent has almost none.</li>
</ul>
<aside class="note example"><b>Worked example</b><p>Two students finish the game. Jordan put everything in one stock and gained 12%. Marcus bought an S&amp;P 500 fund and gained 10%. Jordan won by 2 points, and one bad earnings report could have cost Jordan 30%. The question to ask: did the extra return pay for the extra risk?</p></aside>`
      },
      {
        id: 'measure',
        title: 'Measuring your own risk',
        html: `
<p>Two habits keep you honest. First, compare your return with a benchmark, like the S&amp;P 500, over the same period. Second, look at your worst stretch: how far did your account fall from its high before it recovered? A strategy that beats the benchmark slightly while falling twice as far is a risky bet that happened to work.</p>
<aside class="note idea"><b>Big idea</b><p>Risk is a tool. Use it on purpose, sized to your goals and your timeline.</p></aside>
<aside class="note try"><b>Try it in the game</b><p>Compare your return with the S&amp;P 500 benchmark on the <a href="#/leaderboard">Leaderboard</a>. Did your extra risk earn extra reward?</p></aside>`
      }
    ],
    takeaways: [
      `Risk and return travel together. Guaranteed high returns are a red flag.`,
      `Savings, bonds, index funds, individual stocks, and speculative bets sit on rising steps of risk.`,
      `Bonds pay interest and return your principal, and their prices fall when rates rise.`,
      `Inflation eats buying power, so judge returns after inflation.`,
      `Size your risk to your time horizon, your temperament, and what your life can absorb.`
    ],
    discuss: [
      `Would you rather earn a steady 5%, or take a 50/50 chance at 20% or a 10% loss? Why?`,
      `Who in your life depends on money that should never be at risk?`
    ],
    videos: [yt('Picking Your Investing Style', 'RV5kY34crQY'), yt('Introduction to Bond Investing', 'tuBDGjSh7ms')],
    links: [INVESTOR_GOV],
    terms: ['risk', 'return', 'risk-tolerance', 'time-horizon', 'bond', 'principal', 'interest', 'inflation', 'real-return'],
    exam: [
      {
        q: `Which usually carries the most risk?`,
        choices: [`Insured savings account`, `Broad index fund`, `A single penny stock`, `U.S. Treasury bond`],
        answer: 2,
        explain: `Penny stocks are small, thinly traded, and can lose most of their value quickly.`
      },
      {
        q: `Someone promises 30% a year with zero risk. What should you think?`,
        choices: [`Great deal, invest fast`, `This is a red flag for a scam`, `Normal for stocks`, `Only risky for adults`],
        answer: 1,
        explain: `High returns always come with risk. Guaranteed high returns are a classic scam sign.`
      },
      {
        q: `Time horizon means:`,
        choices: [`How long the market is open`, `How long until you need the money`, `How fast a trade fills`, `How many stocks you own`],
        answer: 1,
        explain: `The longer your horizon, the more time you have to recover from drops.`
      },
      {
        q: `A $1,000 bond pays 4% a year. How much interest do you receive each year?`,
        choices: [`$4`, `$40`, `$400`, `$1,040`],
        answer: 1,
        explain: `4% of $1,000 is $40 a year.`
      },
      {
        q: `When interest rates rise, what usually happens to the prices of existing bonds?`,
        choices: [`They rise`, `They fall`, `They stay exactly the same`, `They double`],
        answer: 1,
        explain: `New bonds pay more, so older bonds paying less lose value.`
      },
      {
        q: `Your savings earn 1% while inflation is 3%. About what is your real return?`,
        choices: [`4%`, `2%`, `−2%`, `−4%`],
        answer: 2,
        explain: `1% minus 3% is about −2%: you lose buying power.`
      },
      {
        q: `At 3% inflation, about how much will $100 buy in ten years, in today's dollars?`,
        choices: [`$74`, `$90`, `$103`, `$134`],
        answer: 0,
        explain: `$100 divided by 1.03 ten times is about $74.`
      },
      {
        q: `Which best describes risk tolerance?`,
        choices: [`How fast your orders fill`, `How much of a drop you can live through without selling`, `Your credit score`, `The fee a fund charges`],
        answer: 1,
        explain: `Risk tolerance is how you react to losses. Know yours before the market tests it.`
      }
    ]
  },

  {
    id: 'diversification',
    track: 'portfolio',
    title: 'Diversification',
    summary: `Spread your money so one bad day, or one bad company, cannot sink you.`,
    goals: [
      `Show with numbers how diversification limits damage`,
      `Spread money across companies, sectors, and types of assets`,
      `Spot concentration in your own portfolio and fix it`
    ],
    sections: [
      {
        id: 'idea',
        title: 'The idea',
        html: `
<p><strong>Diversification</strong> means spreading your money across many investments so that no single one can do serious damage. It lowers your risk without giving up much of your expected return, which is why investors call it the closest thing to a free lunch.</p>`
      },
      {
        id: 'math',
        title: 'The math',
        html: `
<p>Put all $10,000 into one stock. It drops 40% on bad news. Your portfolio is down <strong>40%</strong>, to $6,000.</p>
<p>Split $10,000 evenly across ten stocks, $1,000 each. One drops 40%. You lose $400, and if the other nine hold steady, your portfolio is down only <strong>4%</strong>.</p>
<table class="data-table">
  <thead><tr><th>If one company goes to zero and you own</th><th>Your loss</th></tr></thead>
  <tbody>
    <tr><td>1 stock</td><td>100%</td></tr>
    <tr><td>10 stocks, equal amounts</td><td>10%</td></tr>
    <tr><td>100 stocks, equal amounts</td><td>1%</td></tr>
    <tr><td>An S&amp;P 500 index fund</td><td>Usually well under 1%</td></tr>
  </tbody>
</table>`
      },
      {
        id: 'failures',
        title: 'Real companies do fail',
        html: `
<p>Enron was one of America's most admired companies until it collapsed in 2001 in an accounting fraud. Many of its employees held most of their retirement savings in Enron stock and lost their jobs and their savings at the same time. Lehman Brothers, a 158-year-old investment bank, went bankrupt in 2008, and its shares became nearly worthless.</p>
<p>Nobody buys a stock expecting it to fail. Diversification is how you stay safe from the surprises you cannot see coming.</p>`
      },
      {
        id: 'sectors',
        title: 'Spread across sectors',
        html: `
<p>Stocks in the same industry often move together, because they face the same risks. Owning five chip makers is less diversified than it looks. The market is commonly split into 11 sectors:</p>
<ul class="pill-list">
  <li>Information Technology</li><li>Health Care</li><li>Financials</li><li>Consumer Discretionary</li><li>Consumer Staples</li><li>Communication Services</li><li>Industrials</li><li>Energy</li><li>Utilities</li><li>Real Estate</li><li>Materials</li>
</ul>
<p>Sector shocks happen. In 2020, oil prices collapsed and energy stocks fell far more than the overall market. In 2008, bank stocks led the crash. Portfolios spread across sectors felt those hits less.</p>`
      },
      {
        id: 'assets',
        title: 'Spread across types of assets',
        html: `
<p><strong>Asset allocation</strong> is how you divide your money among stocks, bonds, and cash. Stocks drive long-term growth. Bonds and cash steady the ride and give you money to use when stocks are down. International funds add companies from outside the U.S.</p>
<p>A common pattern: young investors with decades ahead hold mostly stocks, and people near retirement hold more bonds. <strong>Target-date funds</strong> make that shift automatically over time.</p>`
      },
      {
        id: 'concentration',
        title: 'Concentration: when one holding takes over',
        html: `
<p>Winners grow, and a winner can quietly take over your portfolio. That is good news and a new risk at the same time.</p>
<aside class="note example"><b>Worked example</b><p>You hold $1,000 in one stock and $9,000 in everything else. The stock doubles to $2,000 while the rest stays flat. Your total is now $11,000, and that one stock is $2,000 / $11,000, about 18% of your money.</p></aside>
<p><strong>Rebalancing</strong> means trimming what has grown too large and adding to what has shrunk, on a schedule such as once a year. It keeps your risk where you chose to set it.</p>`
      },
      {
        id: 'limits',
        title: 'The limits of diversification',
        html: `
<p>Diversification protects you from any one company's bad news. Broad crashes are different: in 2008 and 2020, most stocks fell together. That is why diversification works alongside a long time horizon, cash for near-term needs, and a calm plan.</p>
<p>You can also overdo it. Owning 40 individual stocks you cannot keep track of adds work without adding much protection. One broad index fund often does the job better.</p>
<aside class="note idea"><b>Big idea</b><p>Diversification protects your progress. One mistake costs you a little instead of setting you back years.</p></aside>
<aside class="note try"><b>Try it in the game</b><p>Open <a href="#/portfolio">Portfolio</a> and switch the allocation chart between holdings and sectors. Is one stock or one sector most of your money? Your mentor may set a limit on how much one stock can be.</p></aside>`
      }
    ],
    takeaways: [
      `Spreading money across many investments shrinks the damage any one can do.`,
      `Companies in the same sector tend to move together, so spread across sectors too.`,
      `Asset allocation, your mix of stocks, bonds, and cash, sets your overall risk.`,
      `Rebalancing keeps a winner from quietly taking over your portfolio.`,
      `Diversification limits company risk. Time and a plan handle market-wide drops.`
    ],
    discuss: [
      `Why do you think so many Enron employees kept their savings in company stock?`,
      `If you could own only three investments, which three would give you the most diversification?`
    ],
    videos: [],
    links: [INVESTOR_GOV],
    terms: ['diversification', 'sector', 'allocation', 'concentration', 'rebalancing', 'target-date-fund'],
    exam: [
      {
        q: `You split $10,000 evenly across 10 stocks. One drops 50% and the rest stay flat. How much is your portfolio down?`,
        choices: [`50%`, `10%`, `5%`, `1%`],
        answer: 2,
        explain: `You lose $500 of $10,000, which is 5%.`
      },
      {
        q: `Why is owning five chip makers less diversified than it looks?`,
        choices: [`Chip stocks never move`, `Stocks in the same industry tend to move together`, `You can own only three stocks`, `They pay no dividends`],
        answer: 1,
        explain: `Companies in one industry face the same risks, so they often rise and fall together.`
      },
      {
        q: `What is a quick way to diversify across hundreds of companies?`,
        choices: [`Buy the stock that rose most today`, `Buy a broad index fund`, `Buy one share of every penny stock`, `Keep everything in cash`],
        answer: 1,
        explain: `A broad index fund holds hundreds of companies in a single share.`
      },
      {
        q: `You own 100 stocks in equal amounts, and one goes to zero. How much does your portfolio fall?`,
        choices: [`1%`, `10%`, `50%`, `100%`],
        answer: 0,
        explain: `Each holding is 1% of the total.`
      },
      {
        q: `Diversification protects you best against:`,
        choices: [`Any single company's bad news`, `Every market crash`, `Inflation`, `Taxes`],
        answer: 0,
        explain: `It shrinks company-specific risk. Broad crashes still move most stocks together.`
      },
      {
        q: `Asset allocation means:`,
        choices: [`Picking the hottest stock`, `How you divide money among stocks, bonds, and cash`, `The fee a fund charges`, `Your credit limit`],
        answer: 1,
        explain: `Your mix of asset types sets your overall risk and return.`
      },
      {
        q: `A stock that was $1,000 of your $10,000 portfolio doubles while the rest stays flat. About what share of your portfolio is it now?`,
        choices: [`10%`, `18%`, `20%`, `50%`],
        answer: 1,
        explain: `$2,000 / $11,000 is about 18%.`
      },
      {
        q: `What lesson did Enron employees' losses teach?`,
        choices: [`Avoid keeping most of your savings in one company, especially your employer`, `Bankrupt companies always recover`, `Buy only energy stocks`, `Retirement accounts are unsafe`],
        answer: 0,
        explain: `They lost their jobs and their savings at once. Concentration multiplies risk.`
      }
    ]
  },

  {
    id: 'index-funds-etfs',
    track: 'portfolio',
    title: 'Index funds and ETFs',
    summary: `How funds work, why fees matter, and why most professionals trail a simple index fund.`,
    goals: [
      `Explain how mutual funds, index funds, and ETFs work`,
      `Calculate what fees cost over decades`,
      `Read the active-versus-passive scoreboard and choose a fund`
    ],
    sections: [
      {
        id: 'funds',
        title: 'Funds: one purchase, many investments',
        html: `
<p>A <strong>fund</strong> pools money from many investors and buys a basket of investments. One share of a fund gives you a slice of the whole basket.</p>
<ul>
  <li>A <strong>mutual fund</strong> is bought from the fund company and priced once a day, after the market closes.</li>
  <li>An <strong>exchange-traded fund (ETF)</strong> trades on an exchange like a stock, at prices that change all day.</li>
</ul>`
      },
      {
        id: 'index',
        title: 'Index funds',
        html: `
<p>An <strong>index fund</strong> copies an index, like the S&amp;P 500, instead of trying to pick winners. In 1976, John C. Bogle, founder of Vanguard, launched the first index mutual fund for everyday investors. Critics called it a recipe for average results. It grew into one of the largest funds in the world.</p>
<p>The first U.S. ETF, the SPDR S&amp;P 500 ETF Trust, ticker SPY, launched in 1993. It is the benchmark in this game. Some well-known ETFs:</p>
<ul>
  <li><strong>SPY, VOO, IVV:</strong> track the S&amp;P 500.</li>
  <li><strong>VTI:</strong> tracks the whole U.S. stock market.</li>
  <li><strong>QQQ:</strong> tracks the Nasdaq-100, 100 large companies listed on Nasdaq.</li>
  <li><strong>BND:</strong> holds thousands of U.S. bonds.</li>
</ul>`
      },
      {
        id: 'fees',
        title: 'Fees matter more than they look',
        html: `
<p>Funds charge a yearly fee called the <strong>expense ratio</strong>. Some S&amp;P 500 index funds charge 0.03% a year, which is $3 on $10,000. Many actively managed funds charge 0.5% to 1% or more, which is $50 to $100 on the same $10,000, every year, whether they win or lose.</p>
<aside class="note example"><b>Worked example</b><p>Invest $10,000 for 30 years at a 7% yearly return before fees. With a 0.03% fee you end with about $75,500. With a 1% fee you end with about $57,400. The higher fee costs about $18,000, almost twice what you invested, because every dollar paid in fees stops compounding.</p></aside>`
      },
      {
        id: 'scoreboard',
        title: 'The scoreboard: active versus passive',
        html: `
<p><strong>Active</strong> funds pay managers to pick stocks. <strong>Passive</strong> funds simply own the index. S&amp;P Global tracks the results in its SPIVA reports. In 2025, <strong>79%</strong> of actively managed large-company U.S. stock funds trailed the S&amp;P 500. Over 15 years, roughly <strong>9 in 10</strong> did.</p>
<p>Fund managers are smart and work hard. They also compete against other smart professionals and pay for research, trading, and salaries through their fees, while an index fund pays almost none of that.</p>`
      },
      {
        id: 'leveraged',
        title: 'Funds to handle with care',
        html: `
<p>Some ETFs use borrowed money or derivatives to multiply an index's daily move two or three times over. These <strong>leveraged ETFs</strong> reset every day, which creates a trap over longer periods.</p>
<aside class="note example"><b>Worked example</b><p>An index rises 10% one day and falls 10% the next. It ends at 99% of where it started, down 1%. A 3x fund rises 30%, then falls 30%, and ends at 91%, down 9%. Same index, nine times the loss.</p></aside>
<p>Leveraged and inverse ETFs are built for professional short-term traders. Long-term investors stick with plain, low-cost index funds.</p>`
      },
      {
        id: 'choose',
        title: 'How to choose a fund',
        html: `
<ol>
  <li><strong>What does it hold?</strong> Read the fund's name and its top holdings. "Total market" and "S&amp;P 500" are broad. "Robotics" or "cannabis" are narrow bets.</li>
  <li><strong>What does it cost?</strong> Compare expense ratios. For broad index funds, low means under 0.10%.</li>
  <li><strong>How big and busy is it?</strong> Large, heavily traded funds have tiny spreads.</li>
  <li><strong>Does it fit your plan?</strong> One broad fund can be a whole portfolio. Narrow funds are side bets.</li>
</ol>
<aside class="note idea"><b>Big idea</b><p>Owning the whole market at low cost is a strong default. Picking stocks is a skill worth learning, and the index is the bar to beat.</p></aside>
<aside class="note try"><b>Try it in the game</b><p>The <a href="#/leaderboard">Leaderboard</a> shows an S&amp;P 500 benchmark: what your starting cash would be worth if you had bought SPY on day one and held it. Can you beat it?</p></aside>`
      }
    ],
    takeaways: [
      `Funds pool money to buy a basket. ETFs trade all day, and mutual funds price once a day.`,
      `Index funds copy an index at very low cost.`,
      `Small fees compound into large sums over decades.`,
      `Most professional stock pickers trail the S&P 500 over long periods.`,
      `Leveraged ETFs reset daily and can lose money even when the index ends flat.`
    ],
    discuss: [
      `If most professionals trail the index, why do people still pay for active funds?`,
      `Would you rather own one S&P 500 fund or ten stocks you picked yourself? Why?`
    ],
    videos: [yt('An Intro to Exchange-Traded Funds (ETFs)', 'FcXn7eR3RAo'), yt('Intro to Mutual Funds', '-bLeRnOHq-8')],
    links: [INVESTOR_GOV],
    terms: ['mutual-fund', 'index-fund', 'etf', 'expense-ratio', 'benchmark', 'active-investing', 'passive-investing', 'leveraged-etf'],
    exam: [
      {
        q: `What does an S&P 500 index fund do?`,
        choices: [`Picks the 10 best stocks each year`, `Copies the S&P 500 index`, `Buys only bonds`, `Guarantees a 10% return`],
        answer: 1,
        explain: `Index funds copy an index instead of trying to pick winners.`
      },
      {
        q: `An expense ratio of 1% on $10,000 costs about how much per year?`,
        choices: [`$1`, `$10`, `$100`, `$1,000`],
        answer: 2,
        explain: `1% of $10,000 is $100, charged every year.`
      },
      {
        q: `Over 15 years, about how many active large-company U.S. stock funds trailed the S&P 500?`,
        choices: [`About 1 in 10`, `About half`, `About 9 in 10`, `None`],
        answer: 2,
        explain: `SPIVA reports show roughly 9 in 10 trailed the index over 15 years.`
      },
      {
        q: `What is one key difference between an ETF and a traditional mutual fund?`,
        choices: [`ETFs trade all day at changing prices, while mutual funds price once a day`, `ETFs hold only one stock`, `Mutual funds never charge fees`, `ETFs are guaranteed by the government`],
        answer: 0,
        explain: `ETFs trade on exchanges like stocks. Mutual funds are priced after the close.`
      },
      {
        q: `Who launched the first index mutual fund for everyday investors, in 1976?`,
        choices: [`Warren Buffett`, `John C. Bogle`, `Charles Dow`, `John W. Rogers Jr.`],
        answer: 1,
        explain: `John C. Bogle, the founder of Vanguard.`
      },
      {
        q: `$10,000 grows for 30 years at 7% before fees. About how much more do you end with paying a 0.03% fee instead of 1%?`,
        choices: [`$300`, `$1,800`, `$18,000`, `$75,000`],
        answer: 2,
        explain: `About $75,500 versus about $57,400, a gap of about $18,000.`
      },
      {
        q: `An index rises 10% and then falls 10%. About where does a 3x leveraged fund that tracks it end up?`,
        choices: [`Flat`, `Down about 1%`, `Down about 9%`, `Up about 30%`],
        answer: 2,
        explain: `1.30 x 0.70 = 0.91, a 9% loss, while the index lost about 1%.`
      },
      {
        q: `In 2025, about what share of active large-company U.S. stock funds trailed the S&P 500?`,
        choices: [`21%`, `50%`, `79%`, `100%`],
        answer: 2,
        explain: `SPIVA reported that 79% trailed the index in 2025.`
      }
    ]
  },

  {
    id: 'researching-a-company',
    track: 'portfolio',
    title: 'Researching a company',
    summary: `A checklist, the three financial statements, warning signs, and a written thesis before every buy.`,
    goals: [
      `Answer eight research questions about any company`,
      `Read the key lines on the income statement, balance sheet, and cash flow statement`,
      `Write an investment thesis with a clear reason to sell`
    ],
    sections: [
      {
        id: 'business',
        title: 'Start with the business',
        html: `
<p>Before you buy a stock, you should be able to explain the business to a friend in two sentences: what it sells, and why customers choose it.</p>
<p>Then figure out how it makes money. Common business models:</p>
<ul>
  <li><strong>Selling products:</strong> sneakers, phones, groceries.</li>
  <li><strong>Subscriptions:</strong> streaming, software, gyms. Steady monthly revenue.</li>
  <li><strong>Advertising:</strong> free apps and sites paid for by advertisers.</li>
  <li><strong>Fees and interest:</strong> banks, payment networks, brokers.</li>
  <li><strong>Marketplaces:</strong> a cut of every sale between buyers and sellers, like ride-sharing apps.</li>
</ul>`
      },
      {
        id: 'checklist',
        title: 'The checklist',
        html: `
<ol>
  <li><strong>What does it sell, and who buys it?</strong></li>
  <li><strong>How does it make money?</strong> One product, subscriptions, ads, fees?</li>
  <li><strong>Is revenue growing?</strong> Revenue is the total money coming in from sales.</li>
  <li><strong>Is it profitable?</strong> Look at net income and earnings per share (EPS).</li>
  <li><strong>How much debt does it carry?</strong> Heavy debt makes bad years harder.</li>
  <li><strong>Who are its competitors,</strong> and what keeps customers coming back?</li>
  <li><strong>Is the price reasonable?</strong> Compare its P/E with similar companies.</li>
  <li><strong>What is in the recent news?</strong> New products, lawsuits, leadership changes, earnings.</li>
</ol>`
      },
      {
        id: 'statements',
        title: 'The three financial statements',
        html: `
<p>Public companies publish three core reports every quarter.</p>
<table class="data-table">
  <thead><tr><th>Statement</th><th>What it shows</th><th>Key lines</th></tr></thead>
  <tbody>
    <tr><td>Income statement</td><td>Money earned and spent over a period</td><td>Revenue, expenses, net income, EPS</td></tr>
    <tr><td>Balance sheet</td><td>What the company owns and owes on one date</td><td>Assets, liabilities, shareholders' equity</td></tr>
    <tr><td>Cash flow statement</td><td>Actual cash coming in and going out</td><td>Operating cash flow, free cash flow</td></tr>
  </tbody>
</table>
<aside class="note example"><b>Worked example</b><p>Flatbush Sneaker Co. sold $500 million of sneakers last year. Materials, wages, rent, marketing, and taxes cost $440 million. Its net income was $60 million, a profit margin of 12%: it kept 12 cents of every dollar of sales.</p></aside>
<p>On the balance sheet, <strong>assets = liabilities + shareholders' equity</strong>. Equity is what would belong to the owners if the company paid off all its debts, the business version of net worth.</p>
<p>The cash flow statement keeps everyone honest. Profits on paper are good, and cash in the bank is what pays the bills. Healthy companies turn their profits into cash.</p>`
      },
      {
        id: 'sources',
        title: 'Where to look',
        html: `
<ul>
  <li>The company's <strong>investor relations</strong> website: earnings releases, presentations, and recordings of earnings calls, where executives answer analysts' questions.</li>
  <li>Its yearly report, the <strong>10-K</strong>, and quarterly reports, the <strong>10-Q</strong>, free on the SEC's EDGAR site. Start with the "Business" and "Risk Factors" sections.</li>
  <li>Reputable news outlets. Be careful with social media tips: people often promote stocks they already own.</li>
</ul>
<p>Analysts split research into two schools. <strong>Fundamental analysis</strong> studies the business and its numbers. <strong>Technical analysis</strong> studies price charts and trading patterns. Most long-term investors, and this game, lean on fundamentals.</p>`
      },
      {
        id: 'warning',
        title: 'Warning signs',
        html: `
<ul>
  <li>Revenue falling for several quarters in a row.</li>
  <li>Losses growing while debt keeps rising.</li>
  <li>Cash flow much weaker than reported profits.</li>
  <li>Late filings, restated results, or a change of auditor.</li>
  <li>Top executives leaving one after another.</li>
  <li>Promises of explosive growth with few details.</li>
</ul>
<p>One warning sign is a question to investigate. Several together are a reason to walk away.</p>`
      },
      {
        id: 'thesis',
        title: 'Write your thesis',
        html: `
<p>An <strong>investment thesis</strong> is your reason for buying, written before you buy. Keep it to three parts: why this company, why now, and what would make you sell.</p>
<aside class="note example"><b>Sample thesis</b><p><strong>Why this company:</strong> Flatbush Sneaker Co. has grown revenue about 15% a year for three years, keeps 12 cents of profit per dollar of sales, and carries little debt. <strong>Why now:</strong> it is opening stores in three new cities this year. <strong>What would make me sell:</strong> two straight quarters of falling sales, or the price rising to a P/E above 40.</p></aside>
<p>Writing it down keeps you honest. When the stock moves, check whether your reasons still hold, and sell when your thesis breaks rather than when the price makes you nervous.</p>`
      },
      {
        id: 'log',
        title: 'Keep a research log',
        html: `
<p>Note each source and its date, the numbers you used, and what you expected. After each earnings report, compare what happened with what you wrote. Over time your log becomes your best teacher.</p>
<aside class="note try"><b>Try it in the game</b><p>The trade ticket has a "Why this trade?" note. Use it as your thesis. Your mentor can read your notes and talk them through with you.</p></aside>`
      }
    ],
    takeaways: [
      `Explain the business and how it makes money before you look at the stock price.`,
      `The income statement shows profit, the balance sheet shows what is owned and owed, and the cash flow statement shows real cash.`,
      `10-K and 10-Q reports are free on the SEC's EDGAR site.`,
      `Several warning signs together are a reason to walk away.`,
      `Write a thesis with a sell rule before you buy, and sell when the thesis breaks.`
    ],
    discuss: [
      `Pick a company you know. Explain how it makes money in two sentences.`,
      `What would make you sell a stock you love?`
    ],
    videos: [yt('Fundamental vs. Technical Analysis', 'UMSmmIFM5Yg'), yt('Warning Signs of a Troubled Company', '4hvja2hJHJ0'), yt('Intro to the Balance Sheet', 'Zr4CLcAYu80')],
    links: [EDGAR, INVESTOR_GOV],
    terms: ['revenue', 'net-income', 'eps', 'debt', 'income-statement', 'balance-sheet', 'cash-flow-statement', 'profit-margin', '10-k', 'earnings-report', 'investment-thesis'],
    exam: [
      {
        q: `Revenue is:`,
        choices: [`Profit after all costs`, `Total money coming in from sales`, `The stock price`, `Money the company owes`],
        answer: 1,
        explain: `Revenue is sales. Profit, or net income, is what is left after costs.`
      },
      {
        q: `Where can you read a company's official yearly report for free?`,
        choices: [`The SEC's EDGAR site (Form 10-K)`, `Only by paying a broker`, `A social media comment thread`, `It is kept secret`],
        answer: 0,
        explain: `Public companies file a 10-K each year, free to read on EDGAR.`
      },
      {
        q: `Which belongs in an investment thesis?`,
        choices: [`The stock went up yesterday`, `My friend bought it`, `What would make me sell`, `The logo looks cool`],
        answer: 2,
        explain: `A thesis covers why this company, why now, and what would change your mind.`
      },
      {
        q: `A company had $500 million in revenue and $440 million in total costs. What is its profit margin?`,
        choices: [`6%`, `12%`, `44%`, `60%`],
        answer: 1,
        explain: `Net income is $60 million. $60 million / $500 million = 12%.`
      },
      {
        q: `On a balance sheet, assets equal:`,
        choices: [`Revenue minus costs`, `Liabilities plus shareholders' equity`, `Cash plus dividends`, `Shares times price`],
        answer: 1,
        explain: `What a company owns is funded by what it owes plus what its owners have put in and kept.`
      },
      {
        q: `Which is the strongest warning sign?`,
        choices: [`Revenue rising for three years`, `Revenue falling for several quarters while debt keeps rising`, `A new product launch`, `Paying a dividend`],
        answer: 1,
        explain: `Shrinking sales plus growing debt is a dangerous combination.`
      },
      {
        q: `Fundamental analysis focuses on:`,
        choices: [`Chart patterns and trading volume`, `The business and its financial results`, `Social media buzz`, `The color of the logo`],
        answer: 1,
        explain: `Fundamentals are the business itself. Technical analysis studies price patterns.`
      },
      {
        q: `What is a 10-Q?`,
        choices: [`A yearly report`, `A quarterly report`, `A tax form for teens`, `A type of order`],
        answer: 1,
        explain: `Public companies file a 10-Q each quarter and a 10-K each year.`
      }
    ]
  },

  {
    id: 'investor-psychology',
    track: 'portfolio',
    title: 'Investor psychology',
    summary: `Your own brain is the hardest part of investing. Learn the traps and the tools that beat them.`,
    goals: [
      `Recognize the most common emotional traps in yourself`,
      `Use rules and tools that keep emotions out of decisions`,
      `Review your own trades honestly`
    ],
    sections: [
      {
        id: 'brain',
        title: 'Your brain on money',
        html: `
<p>Most investing mistakes come from emotions rather than math. Your brain evolved to react fast to danger and to follow the group. Those instincts help in a crowd and hurt in a market. Knowing the common traps makes them easier to spot in yourself.</p>`
      },
      {
        id: 'traps',
        title: 'The common traps',
        html: `
<table class="data-table">
  <thead><tr><th>Trap</th><th>What it looks like</th></tr></thead>
  <tbody>
    <tr><td>FOMO</td><td>Buying because a stock is soaring and everyone is talking about it.</td></tr>
    <tr><td>Panic selling</td><td>Selling everything during a drop, then missing the recovery.</td></tr>
    <tr><td>Loss aversion</td><td>Losses feel about twice as painful as equal gains feel good, so people hold losers too long hoping to break even.</td></tr>
    <tr><td>Anchoring</td><td>Fixating on the price you paid, as if the market knows or cares.</td></tr>
    <tr><td>Overconfidence</td><td>A few wins make you feel you cannot lose, so you bet bigger.</td></tr>
    <tr><td>Confirmation bias</td><td>Reading only the news that agrees with what you already believe.</td></tr>
    <tr><td>Herd behavior</td><td>Doing what the crowd does because the crowd is doing it.</td></tr>
    <tr><td>Recency bias</td><td>Assuming whatever happened lately will keep happening.</td></tr>
    <tr><td>Overtrading</td><td>Trading constantly, paying costs and making more decisions that can be wrong.</td></tr>
  </tbody>
</table>`
      },
      {
        id: 'loss',
        title: 'Loss aversion in numbers',
        html: `
<p>In 1979, psychologists Daniel Kahneman and Amos Tversky showed that people feel losses about twice as strongly as gains of the same size. Losing $100 hurts about as much as winning $200 feels good. Kahneman later won a Nobel Prize in economics, partly for this work.</p>
<p>In markets, loss aversion shows up as the <strong>disposition effect</strong>: investors sell winners quickly to lock in the good feeling and hold losers for years hoping to get back to even. Ask a better question: knowing what I know today, would I buy this stock at today's price? If the answer is no, let go of the price you paid.</p>`
      },
      {
        id: 'overtrading',
        title: 'Overtrading costs real money',
        html: `
<p>Economists Brad Barber and Terrance Odean studied 66,465 households with accounts at a large discount broker from 1991 to 1996. The households that traded the most earned about 11.4% a year, while the market returned about 17.9%. Their paper's title sums it up: "Trading Is Hazardous to Your Wealth."</p>
<p>Every trade is a decision that can be wrong, and frequent traders also pay more in spreads and taxes. Patience is a strategy.</p>`
      },
      {
        id: 'hype',
        title: 'Hype, social media, and the crowd',
        html: `
<p>Social media can turn a stock into a story overnight. In early 2021, a few heavily discussed stocks rose several hundred percent in a matter of weeks and then fell sharply, and many people who bought near the top lost much of their money.</p>
<p>When everyone is talking about a stock, ask three questions. Who benefits if I buy? What does the business actually earn? What will I do if it falls 50%?</p>`
      },
      {
        id: 'tools',
        title: 'Tools that help',
        html: `
<ul>
  <li><strong>Decide before you trade.</strong> Set your buy price, your position size, and your exit plan in advance.</li>
  <li><strong>Set a size rule.</strong> For example, no single stock above 10% of your portfolio.</li>
  <li><strong>Use orders to enforce your plan.</strong> A stop order sells at your exit price even when you are busy or nervous.</li>
  <li><strong>Wait a day.</strong> For any trade you feel rushed to make, sleep on it.</li>
  <li><strong>Automate.</strong> <strong>Dollar-cost averaging</strong> means investing a fixed amount on a regular schedule, whatever the price. It removes the urge to time the market.</li>
  <li><strong>Zoom out.</strong> A bad day looks small on a five-year chart.</li>
</ul>`
      },
      {
        id: 'journal',
        title: 'Review your trades',
        html: `
<p>Keep a simple journal. For each trade, write the date, what you did, why, how you felt, and what happened. Once a month, read it back.</p>
<table class="data-table">
  <thead><tr><th>Date</th><th>Trade</th><th>Why</th><th>Feeling</th><th>What happened</th><th>Lesson</th></tr></thead>
  <tbody><tr><td>Oct 12</td><td>Bought 5 NKE</td><td>New shoe line, P/E below peers</td><td>Confident</td><td>Down 6% in a week</td><td>Thesis intact, so I held</td></tr></tbody>
</table>
<aside class="note idea"><b>Big idea</b><p>A plan made with a calm head beats a decision made in the moment.</p></aside>
<aside class="note try"><b>Try it in the game</b><p>Look back at your <a href="#/orders">order history</a> and notes. Which trades followed a plan, and which followed a feeling?</p></aside>`
      }
    ],
    takeaways: [
      `Emotions drive most investing mistakes: FOMO, panic, anchoring, and overconfidence.`,
      `Losses feel about twice as strong as gains, which tempts you to hold losers too long.`,
      `In a study of 66,465 households, the most active traders earned far less than the market.`,
      `Rules made in advance, like size limits and waiting a day, protect you from yourself.`,
      `A trade journal turns every result, good or bad, into a lesson.`
    ],
    discuss: [
      `Think of a time you bought something because everyone else had it. How did it turn out?`,
      `What rule would you set for yourself before your next trade?`
    ],
    videos: [],
    links: [FINRA],
    terms: ['fomo', 'loss-aversion', 'anchoring', 'disposition-effect', 'confirmation-bias', 'panic-selling', 'overtrading', 'dollar-cost-averaging'],
    exam: [
      {
        q: `Buying a stock only because it is soaring and everyone is talking about it is called:`,
        choices: [`Diversification`, `FOMO`, `Dollar-cost averaging`, `Rebalancing`],
        answer: 1,
        explain: `FOMO is the fear of missing out.`
      },
      {
        q: `Loss aversion means:`,
        choices: [`Losses feel worse than equal gains feel good`, `You never lose money`, `You avoid buying stocks`, `You sell winners too late`],
        answer: 0,
        explain: `People feel losses about twice as strongly as gains, which leads to holding losers too long.`
      },
      {
        q: `Which habit helps most against emotional trading?`,
        choices: [`Checking prices every minute`, `Deciding your plan before you trade`, `Following the loudest voices online`, `Trading more often`],
        answer: 1,
        explain: `A plan made in advance keeps emotions from steering in the moment.`
      },
      {
        q: `You bought a stock at $50. It is now $40, and you refuse to sell until it gets back to $50, no matter the news. Which trap is this?`,
        choices: [`Diversification`, `Anchoring`, `Rebalancing`, `Dollar-cost averaging`],
        answer: 1,
        explain: `You are anchored to your purchase price. The market has no idea what you paid.`
      },
      {
        q: `Reading only the news that agrees with what you already believe is called:`,
        choices: [`Confirmation bias`, `Herd behavior`, `Recency bias`, `Loss aversion`],
        answer: 0,
        explain: `Confirmation bias filters out the evidence that could change your mind.`
      },
      {
        q: `In Barber and Odean's study, how did the households that traded the most do?`,
        choices: [`They beat the market by 5 points a year`, `They matched the market`, `They earned about 11.4% a year while the market returned about 17.9%`, `They never lost money`],
        answer: 2,
        explain: `Frequent trading cost them about 6.5 percentage points a year.`
      },
      {
        q: `Dollar-cost averaging means:`,
        choices: [`Buying only when prices drop`, `Investing a fixed amount on a regular schedule`, `Selling half when a stock doubles`, `Paying the lowest fee`],
        answer: 1,
        explain: `Regular, automatic investing removes the urge to time the market.`
      },
      {
        q: `Which question best fights loss aversion?`,
        choices: [`How much did I pay for this?`, `Knowing what I know today, would I buy it at today's price?`, `What are people saying online?`, `How fast can I get back to even?`],
        answer: 1,
        explain: `Judge the stock as it is today. Your purchase price is history.`
      }
    ]
  }
];
