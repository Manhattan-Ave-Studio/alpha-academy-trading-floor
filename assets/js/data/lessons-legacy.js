// Track 4: Wealth and Legacy
// Copy style: direct and calm, second person, short paragraphs, no em dashes or en dashes.
// Historical facts are drawn from the OCC, the U.S. Treasury, the Federal Reserve Bank of Kansas City,
// the National Park Service, Alpha Phi Alpha Fraternity, Inc., Cornell University, and the U.S. Department of Justice.

const yt = (title, youtube) => ({ title, youtube, source: 'Investopedia' });
const OCC = { title: 'The Freedman’s Savings Bank', org: 'Office of the Comptroller of the Currency', url: 'https://occ.gov/about/who-we-are/history/history-of-the-occ/1863-1865/1863-1865-freedmans-savings-bank.html' };
const TREASURY = { title: 'The Freedman’s Savings Bank: A Historic Place in the Financial Empowerment of African Americans', org: 'U.S. Department of the Treasury', url: 'https://home.treasury.gov/the-freedmans-savings-bank-a-historic-place-in-the-financial-empowerment-of-african-americans' };
const KC_FED = { title: 'Let Us Put Our Money Together: The Founding of America’s First Black Banks', org: 'Federal Reserve Bank of Kansas City', url: 'https://www.kansascityfed.org/about-us/let-us-put-our-money-together-founding-americas-first-black-banks/' };
const NPS_WALKER = { title: 'Maggie L. Walker National Historic Site', org: 'National Park Service', url: 'https://www.nps.gov/articles/maggiewalker.htm' };
const APA_SMITH = { title: 'Brother Robert F. Smith', org: 'Alpha Phi Alpha Fraternity, Inc.', url: 'https://apa1906.net/brother-robert-f-smith-alpha-phi-alpha/' };
const HOUSE_OF_ALPHA = { title: 'New leadership institute anchors nation’s first Black fraternity', org: 'Cornell Chronicle', url: 'https://news.cornell.edu/node/331755' };
const SEARLES = { title: 'Joseph Searles becomes first Black member of the NYSE', org: 'HISTORY', url: 'https://www.history.com/this-day-in-history/february-12/joseph-searles-first-black-member-new-york-stock-exchange' };
const LOC = { title: 'African Americans in Business and Entrepreneurship', org: 'Library of Congress', url: 'https://guides.loc.gov/african-americans-in-business' };
const BLS = { title: 'Business and Financial Occupations', org: 'U.S. Bureau of Labor Statistics', url: 'https://www.bls.gov/ooh/business-and-financial/' };
const SEO = { title: 'SEO Scholars', org: 'Sponsors for Educational Opportunity', url: 'https://www.seo-usa.org/scholars/' };
const BOSS = { title: 'Boss: The Black Experience in Business', url: 'https://www.pbs.org/wnet/boss/about', source: 'PBS', note: 'Full documentary by Stanley Nelson' };

export const LEGACY = [
  {
    id: 'generational-wealth',
    track: 'legacy',
    title: 'Building generational wealth',
    summary: `Income pays the bills. Ownership builds wealth that can outlast you.`,
    goals: [
      `Distinguish income from wealth and calculate net worth`,
      `Explain how history shaped today's wealth gaps and how families close them`,
      `Describe how families protect and pass on what they build`
    ],
    sections: [
      {
        id: 'income-wealth',
        title: 'Income and wealth are different',
        html: `
<p><strong>Income</strong> is money coming in: a paycheck, tips, a side business. <strong>Wealth</strong> is what you own minus what you owe. Two people with the same salary can end up in very different places depending on what they do with it.</p>`
      },
      {
        id: 'net-worth',
        title: 'Net worth',
        html: `
<p><strong>Net worth = assets minus liabilities.</strong></p>
<ul>
  <li><strong>Assets</strong> are things with value that you own: savings, investments, a home, a business.</li>
  <li><strong>Liabilities</strong> are what you owe: credit card balances, car loans, student loans.</li>
</ul>
<aside class="note example"><b>Worked example</b><p>Assets: $2,000 in savings, $3,500 in a Roth IRA, and a car worth $6,000, for $11,500. Liabilities: a $4,000 car loan and a $500 credit card balance, for $4,500. Net worth: $11,500 minus $4,500 = $7,000.</p></aside>`
      },
      {
        id: 'engines',
        title: 'The four engines',
        html: `
<ol>
  <li><strong>Earn:</strong> skills, education, and career choices raise your income over time.</li>
  <li><strong>Keep:</strong> spend less than you earn and avoid high-interest debt.</li>
  <li><strong>Invest:</strong> put the difference to work in assets that compound.</li>
  <li><strong>Own:</strong> businesses, real estate, and stock are how most families build lasting wealth.</li>
</ol>`
      },
      {
        id: 'gap',
        title: 'How history shaped the gap',
        html: `
<p>According to the Federal Reserve's 2022 Survey of Consumer Finances, the typical (median) White family had a net worth of about <strong>$285,000</strong>, the typical Hispanic family about <strong>$61,600</strong>, and the typical Black family about <strong>$44,900</strong>. Ownership of stocks, directly or through retirement accounts and funds, followed a similar pattern: <strong>66%</strong> of White families, <strong>39%</strong> of Black families, and <strong>28%</strong> of Hispanic families.</p>
<p>Gaps like these were built over generations, by policy as well as by choice. The Freedman's Savings Bank failed in 1874 and wiped out savings that tens of thousands of formerly enslaved people had worked to build. In the 1930s, maps drawn for a federal agency, the Home Owners' Loan Corporation, marked many Black neighborhoods as "hazardous" for lending, a practice later called <strong>redlining</strong> that made mortgages hard to get there for decades. Homeownership has been the main source of wealth for American families, so being shut out of it compounded across generations.</p>
<p>Gaps narrow the same way they grew: one family, one account, one business at a time. The habits you practice here are part of that work.</p>`
      },
      {
        id: 'time',
        title: 'Time across generations',
        html: `
<aside class="note example"><b>Worked example</b><p>A family invests $10,000 in an index fund when a child is born and never adds another dollar. At a 7% yearly return, it grows to about $813,000 by the child's 65th birthday. Compounding across a lifetime is the quiet engine behind family wealth.</p></aside>`
      },
      {
        id: 'protect',
        title: 'Protect what you build',
        html: `
<ul>
  <li><strong>Insurance</strong> keeps one bad event from erasing years of progress.</li>
  <li><strong>Beneficiaries:</strong> retirement and investment accounts let you name who inherits them. Keep those names current.</li>
  <li><strong>A will</strong> says who receives what. Without one, state law decides.</li>
  <li><strong>Heirs' property:</strong> land or a home passed down without a will is often owned jointly by many relatives. It is one of the leading causes of Black land loss, because a single heir can sometimes force a sale of the whole property.</li>
  <li><strong>Talk about money</strong> with your family. Wealth that is understood is easier to keep.</li>
</ul>`
      },
      {
        id: 'you',
        title: 'Your part in the chain',
        html: `
<p>Anyone can start building now. Open an account, learn how money works, talk about it at home, and help the people coming after you. Every generation that starts earlier gives the next one a head start.</p>
<aside class="note idea"><b>Big idea</b><p>Wealth is built by owning things that grow, protected long enough to pass on.</p></aside>`
      }
    ],
    takeaways: [
      `Income is money coming in. Wealth is what you own minus what you owe.`,
      `Earn, keep, invest, and own: four engines that build wealth.`,
      `Policies like redlining and events like the Freedman's Bank failure helped create today's wealth gaps.`,
      `Time multiplies money across a lifetime and across generations.`,
      `Insurance, beneficiaries, and a will protect what a family builds.`
    ],
    discuss: [
      `What is one thing your family owns that could grow in value over time?`,
      `Why might people avoid talking about money at home? What would make it easier?`
    ],
    videos: [yt('Intro to the Balance Sheet', 'Zr4CLcAYu80')],
    links: [OCC, KC_FED],
    terms: ['net-worth', 'asset', 'liability', 'income', 'redlining', 'beneficiary', 'will', 'heirs-property'],
    exam: [
      {
        q: `Net worth equals:`,
        choices: [`Income minus taxes`, `Assets minus liabilities`, `Savings plus debt`, `Salary times years worked`],
        answer: 1,
        explain: `What you own minus what you owe.`
      },
      {
        q: `Which is an asset?`,
        choices: [`A credit card balance`, `A student loan`, `An index fund`, `A car loan`],
        answer: 2,
        explain: `An index fund is something you own that has value. The others are debts.`
      },
      {
        q: `Why name a beneficiary on an investment account?`,
        choices: [`To lower your taxes today`, `So the account passes to the person you choose`, `To raise your credit score`, `It is required to buy stocks`],
        answer: 1,
        explain: `Beneficiary designations say who inherits the account.`
      },
      {
        q: `You have $2,000 in savings, a $3,500 Roth IRA, and a car worth $6,000. You owe $4,000 on the car and $500 on a card. What is your net worth?`,
        choices: [`$4,500`, `$7,000`, `$11,500`, `$16,000`],
        answer: 1,
        explain: `$11,500 in assets minus $4,500 in liabilities is $7,000.`
      },
      {
        q: `According to the Federal Reserve's 2022 survey, about what was the median net worth of Black families?`,
        choices: [`$4,490`, `$44,900`, `$285,000`, `$1 million`],
        answer: 1,
        explain: `About $44,900, compared with about $285,000 for White families.`
      },
      {
        q: `What was redlining?`,
        choices: [`A type of stock order`, `Maps and lending practices that marked Black neighborhoods as risky, making mortgages hard to get`, `A credit card rule`, `A way to pay off debt`],
        answer: 1,
        explain: `It blocked many Black families from homeownership, a main source of family wealth, for decades.`
      },
      {
        q: `$10,000 invested at a child's birth at 7% a year grows to about how much by age 65?`,
        choices: [`$80,000`, `$170,000`, `$813,000`, `$10 million`],
        answer: 2,
        explain: `$10,000 x 1.07 to the 65th power is about $813,000.`
      },
      {
        q: `What can happen to a home passed down without a will?`,
        choices: [`It always goes to the government`, `It can become heirs' property shared by many relatives and be lost in a forced sale`, `It transfers automatically to the oldest child`, `It becomes tax-free forever`],
        answer: 1,
        explain: `Without a will, ownership can splinter among heirs, and a single heir can sometimes force a sale.`
      }
    ]
  },

  {
    id: 'pioneers',
    track: 'legacy',
    title: 'Pioneers of Black finance',
    summary: `Bankers, builders, and investors who opened doors, from the Freedman's Bank to Wall Street, and what their stories teach.`,
    goals: [
      `Trace key moments in the history of Black finance in America`,
      `Connect each builder's story to a money lesson you can use`,
      `Find trusted sources to keep learning`
    ],
    sections: [
      {
        id: 'timeline',
        title: 'A timeline of building',
        html: `
<p>The history of Black wealth in America includes deep injustice and remarkable builders. These milestones frame the stories that follow.</p>
<ol class="timeline">
  <li><b>1865</b><span>Congress charters the Freedman's Savings Bank for people newly freed from slavery.</span></li>
  <li><b>1874</b><span>The Freedman's Bank fails. More than 61,000 depositors lose nearly $3 million.</span></li>
  <li><b>1888</b><span>The first Black-owned banks open: the True Reformers' savings bank in Richmond, Virginia, and Capital Savings Bank in Washington, D.C.</span></li>
  <li><b>1903</b><span>Maggie Lena Walker opens the St. Luke Penny Savings Bank in Richmond.</span></li>
  <li><b>1921</b><span>A white mob destroys Tulsa's Greenwood District, known as Black Wall Street.</span></li>
  <li><b>1948</b><span>Carver Federal Savings Bank opens in Harlem. It reaches Bedford-Stuyvesant in 1961.</span></li>
  <li><b>1970</b><span>Joseph L. Searles III becomes the first Black member of the New York Stock Exchange, and Earl G. Graves Sr. launches Black Enterprise.</span></li>
  <li><b>1983</b><span>John W. Rogers Jr. founds Ariel Investments in Chicago.</span></li>
  <li><b>1987</b><span>Reginald F. Lewis buys Beatrice International. Clifton R. Wharton Jr. becomes CEO of TIAA-CREF, the first Black CEO of a Fortune 500 company.</span></li>
  <li><b>2000</b><span>Brother Robert F. Smith founds Vista Equity Partners.</span></li>
  <li><b>2019</b><span>Smith pledges to pay off the student loans of Morehouse College's graduating class.</span></li>
</ol>`
      },
      {
        id: 'freedmans',
        title: "The Freedman's Savings Bank",
        html: `
<p>Congress chartered the bank on March 3, 1865, to help people freed from slavery save what they earned. It opened dozens of branches, and over its life depositors entrusted it with tens of millions of dollars. Its managers made risky loans with little oversight, and after the Panic of 1873 it collapsed. Frederick Douglass became its president in its final months, and the bank closed in 1874.</p>
<p><strong>The lesson:</strong> protection matters. Today, FDIC insurance keeps ordinary savers whole when a bank fails, up to the insurance limit.</p>`
      },
      {
        id: 'walker',
        title: 'Maggie Lena Walker',
        html: `
<p>In 1903, Walker opened the St. Luke Penny Savings Bank in Richmond, Virginia, and became its president. She is often called the first woman in the United States to charter a bank, and the National Park Service describes her as the first woman to lead a successful one. She urged working families to save even pennies, and her bank helped them buy homes. During the Great Depression it took over Richmond's other Black banks and became Consolidated Bank and Trust.</p>
<p><strong>The lesson:</strong> small, steady deposits add up, and institutions built by a community can serve it.</p>`
      },
      {
        id: 'greenwood',
        title: 'Greenwood, Tulsa',
        html: `
<p>By the early 1900s, the Greenwood District in Tulsa, Oklahoma, was a thriving Black business community, with banks, hotels, theaters, and shops supported by the neighborhood around them. In 1921, a white mob destroyed it in the Tulsa Race Massacre. Residents rebuilt, and Greenwood thrived again for decades before highway construction and urban renewal broke it apart.</p>
<p><strong>The lesson:</strong> wealth can be built against the odds, and protecting it takes laws, institutions, and community.</p>`
      },
      {
        id: 'carver',
        title: 'Carver Federal Savings Bank',
        html: `
<p>Carver opened in Harlem in 1948, when many banks would not lend to Black New Yorkers. It was founded to help families get mortgages and to train Black bankers. In 1961 it opened a branch in Bedford-Stuyvesant, Brooklyn, followed by Crown Heights in 1975, and it grew into one of the largest Black-operated banks in the country.</p>
<p><strong>The lesson:</strong> when a system shuts people out, building your own institutions opens the door.</p>`
      },
      {
        id: 'wall-street',
        title: 'Breaking into Wall Street',
        html: `
<p><strong>Joseph L. Searles III</strong> became the first Black member of the New York Stock Exchange on February 12, 1970, as a partner at Newburger, Loeb &amp; Co. He had played football for the New York Giants and worked in New York City government before Wall Street.</p>
<p><strong>Earl G. Graves Sr.</strong> founded Black Enterprise magazine in 1970 to cover Black business and personal finance. <strong>John W. Rogers Jr.</strong> founded <strong>Ariel Investments</strong> in Chicago in 1983 and built it into one of the best-known Black-owned investment firms, guided by the motto "slow and steady wins the race."</p>
<p><strong>Clifton R. Wharton Jr.</strong> became CEO of TIAA-CREF in 1987, the first Black chief executive of a Fortune 500 company.</p>
<p><strong>The lesson:</strong> patience and preparation open doors that stay open for the people who come next.</p>`
      },
      {
        id: 'lewis',
        title: 'Reginald F. Lewis',
        html: `
<p>A Harvard-trained lawyer who moved into deal-making, Lewis led the 1987 purchase of Beatrice Foods' international business for about $985 million. TLC Beatrice became the first Black-owned company with more than $1 billion in sales. He told the story in his book "Why Should White Guys Have All the Fun?"</p>
<p><strong>The lesson:</strong> preparation and ownership create leverage. Lewis studied deals for years before making the big one.</p>`
      },
      {
        id: 'smith',
        title: 'Robert F. Smith',
        html: `
<aside class="note alpha"><b>Alpha connection</b><p>Robert F. Smith became a brother of Alpha Phi Alpha Fraternity, Inc. in 1982, while studying chemical engineering at Cornell University, where seven students founded the fraternity in 1906.</p><p>In 2023 he bought a house near the Cornell campus, gave it to the Alpha Light Fund, and donated $9 million more to renovate it. It opened in October 2025 as the House of Alpha Leadership Institute, a student residence and meeting place connected to the fraternity's Alpha chapter.</p></aside>
<p>Smith grew up in Denver and graduated from Cornell in 1985. He worked as an engineer at Kraft General Foods, earned an MBA from Columbia University, and spent six years in technology investment banking at Goldman Sachs. In 2000 he founded <strong>Vista Equity Partners</strong>, a private equity firm that buys and improves software companies.</p>
<p>In 2017 he became the first Black American to sign the Giving Pledge, a promise to give away most of his wealth. At Morehouse College's 2019 commencement, he pledged to pay off the student loans of the entire graduating class: 396 graduates who owed about $34 million.</p>
<p>In 2020, Smith admitted to hiding income from the IRS through offshore accounts and agreed to pay more than $139 million under an agreement with the Justice Department.</p>
<p><strong>The lesson:</strong> skill and ownership can build a fortune, and generosity can change hundreds of lives. Integrity belongs in every legacy, and the rules apply at every level of wealth.</p>`
      },
      {
        id: 'keep-learning',
        title: 'Keep learning',
        html: `
<p>These stories are a starting point. The <a href="#/resources">Resources</a> page has a full section on the history of Black Americans in finance, with books, museums, a documentary, and free guides from the Library of Congress and the Federal Reserve.</p>
<aside class="note idea"><b>Big idea</b><p>Every one of these builders combined skill, patience, and ownership. Those tools are available to you.</p></aside>`
      }
    ],
    takeaways: [
      `The Freedman's Bank failure shows why deposit insurance matters.`,
      `Black bankers built the True Reformers bank, St. Luke Penny Savings Bank, and Carver to serve communities others ignored.`,
      `Searles, Graves, Rogers, Wharton, and Lewis opened doors on Wall Street and in business.`,
      `Brother Robert F. Smith of Alpha Phi Alpha built Vista Equity Partners and paid off a Morehouse class's student loans.`,
      `Skill, patience, ownership, and integrity run through every story.`
    ],
    discuss: [
      `Which story here surprised you most, and why?`,
      `If you could build one institution in your neighborhood, what would it be?`,
      `What does Robert F. Smith's full story, including his tax case, teach about building a legacy?`
    ],
    videos: [BOSS, yt('Private Equity Fundamentals', 'XyPSZL_USFM')],
    links: [OCC, TREASURY, KC_FED, NPS_WALKER, SEARLES, APA_SMITH, HOUSE_OF_ALPHA, LOC],
    terms: ['fdic', 'mutual-fund', 'private-equity', 'leveraged-buyout'],
    exam: [
      {
        q: `In 1903, Maggie Lena Walker opened which bank?`,
        choices: [`Carver Federal Savings Bank`, `The St. Luke Penny Savings Bank`, `The Freedman's Savings Bank`, `Capital Savings Bank`],
        answer: 1,
        explain: `She opened it in Richmond, Virginia, and became its president.`
      },
      {
        q: `What protection exists today that Freedman's Savings Bank depositors did not have?`,
        choices: [`FDIC deposit insurance`, `Credit cards`, `Index funds`, `Online banking`],
        answer: 0,
        explain: `FDIC insurance protects deposits, up to the limit, even if a bank fails.`
      },
      {
        q: `Which investing idea is John W. Rogers Jr. of Ariel Investments known for?`,
        choices: [`Day trading`, `Slow and steady long-term investing`, `Penny stocks`, `Avoiding the stock market`],
        answer: 1,
        explain: `Ariel's philosophy centers on patience and the long term.`
      },
      {
        q: `In what year did the first Black-owned banks in the U.S. open?`,
        choices: [`1865`, `1888`, `1921`, `1970`],
        answer: 1,
        explain: `In 1888, the True Reformers' bank in Richmond and Capital Savings Bank in Washington, D.C. opened.`
      },
      {
        q: `Who became the first Black member of the New York Stock Exchange, in 1970?`,
        choices: [`Joseph L. Searles III`, `Reginald F. Lewis`, `Earl G. Graves Sr.`, `Robert F. Smith`],
        answer: 0,
        explain: `Searles joined the NYSE on February 12, 1970.`
      },
      {
        q: `Robert F. Smith became a brother of which fraternity in 1982?`,
        choices: [`Kappa Alpha Psi`, `Omega Psi Phi`, `Alpha Phi Alpha`, `Phi Beta Sigma`],
        answer: 2,
        explain: `He joined Alpha Phi Alpha in 1982. The fraternity was founded in 1906 at Cornell, where he earned his engineering degree.`
      },
      {
        q: `TLC Beatrice, led by Reginald F. Lewis, became the first Black-owned company with more than:`,
        choices: [`$1 million in sales`, `$100 million in sales`, `$1 billion in sales`, `$100 billion in sales`],
        answer: 2,
        explain: `His 1987 deal created the first Black-owned company with more than $1 billion in sales.`
      },
      {
        q: `Carver Federal Savings Bank, founded in Harlem in 1948, opened a branch in which Brooklyn neighborhood in 1961?`,
        choices: [`Bedford-Stuyvesant`, `Park Slope`, `Coney Island`, `Williamsburg`],
        answer: 0,
        explain: `Carver reached Bed-Stuy in 1961 and Crown Heights in 1975.`
      }
    ]
  },

  {
    id: 'careers-in-finance',
    track: 'legacy',
    title: 'Careers in finance',
    summary: `The jobs behind the market, what they pay, the skills they need, and how to start now.`,
    goals: [
      `Describe the main career paths in finance and what each job does`,
      `Connect school subjects, skills, and credentials to those careers`,
      `Take a concrete next step this year`
    ],
    sections: [
      {
        id: 'jobs',
        title: 'The jobs behind the market',
        html: `
<p>Every trade you make in this game touches dozens of real careers. Here are some of them.</p>
<table class="data-table">
  <thead><tr><th>Role</th><th>What they do</th></tr></thead>
  <tbody>
    <tr><td>Financial planner</td><td>Helps families with budgets, saving, investing, and retirement. Many earn the CFP credential.</td></tr>
    <tr><td>Investment banker</td><td>Helps companies raise money, go public, or buy other companies.</td></tr>
    <tr><td>Equity research analyst</td><td>Studies companies and recommends whether to buy or sell their stock.</td></tr>
    <tr><td>Portfolio manager</td><td>Decides what a fund or pension buys and sells.</td></tr>
    <tr><td>Trader</td><td>Buys and sells securities for a firm or its clients.</td></tr>
    <tr><td>Accountant (CPA)</td><td>Prepares and audits financial statements and taxes.</td></tr>
    <tr><td>Data engineer or analyst</td><td>Builds the data systems and reports banks and funds run on.</td></tr>
    <tr><td>Compliance and risk</td><td>Keeps a firm within the rules and measures what could go wrong.</td></tr>
    <tr><td>Fintech product builder</td><td>Designs the apps people use to bank, pay, and invest.</td></tr>
  </tbody>
</table>`
      },
      {
        id: 'pay',
        title: 'What some finance jobs pay',
        html: `
<p>The U.S. Bureau of Labor Statistics reports these 2025 median salaries: half of workers in each job earned more, and half earned less. Most of these jobs start with a bachelor's degree.</p>
<table class="data-table">
  <thead><tr><th>Job</th><th>2025 median pay</th></tr></thead>
  <tbody>
    <tr><td>Personal financial advisor</td><td>$105,070</td></tr>
    <tr><td>Financial analyst</td><td>$103,570</td></tr>
    <tr><td>Financial examiner</td><td>$94,160</td></tr>
    <tr><td>Budget analyst</td><td>$91,640</td></tr>
    <tr><td>Accountant or auditor</td><td>$83,680</td></tr>
    <tr><td>Loan officer</td><td>$76,690</td></tr>
  </tbody>
</table>
<p>Pay in investment banking, trading, and portfolio management can run much higher, with longer hours and tougher competition.</p>`
      },
      {
        id: 'where',
        title: 'Where finance people work',
        html: `
<ul>
  <li><strong>Banks and credit unions,</strong> from global firms to community lenders.</li>
  <li><strong>Asset managers and funds</strong> that invest for pensions, families, and nonprofits.</li>
  <li><strong>Insurance companies.</strong></li>
  <li><strong>Government:</strong> the Federal Reserve, the SEC, the Treasury, and city budget offices.</li>
  <li><strong>Fintech startups</strong> building new ways to pay, save, and invest.</li>
  <li><strong>Community development lenders</strong> that finance housing and small businesses in underserved neighborhoods.</li>
  <li><strong>Every company's finance department,</strong> from sneaker brands to sports teams.</li>
</ul>`
      },
      {
        id: 'skills',
        title: 'Skills that transfer everywhere',
        html: `
<ul>
  <li>Comfort with numbers and spreadsheets.</li>
  <li>Clear writing and speaking. Most finance jobs involve explaining your thinking.</li>
  <li>Data skills: Excel, SQL, and Python open doors across the industry.</li>
  <li>Curiosity about how businesses work.</li>
</ul>
<p>School connects directly. Algebra and statistics are the math of investing. Economics explains markets. English class is where you learn to write a clear argument, the same skill as an investment thesis.</p>`
      },
      {
        id: 'credentials',
        title: 'Credentials that open doors',
        html: `
<table class="data-table">
  <thead><tr><th>Credential</th><th>For</th><th>What it takes</th></tr></thead>
  <tbody>
    <tr><td>CPA</td><td>Accountants</td><td>Accounting coursework, a four-part exam, and work experience</td></tr>
    <tr><td>CFP</td><td>Financial planners</td><td>Coursework, an exam, work experience, and ethics standards</td></tr>
    <tr><td>CFA</td><td>Investment analysts and portfolio managers</td><td>Three levels of exams on investing and ethics</td></tr>
  </tbody>
</table>`
      },
      {
        id: 'paths',
        title: 'Paths in',
        html: `
<ul>
  <li><strong>College majors:</strong> economics, finance, accounting, math, statistics, computer science. Many firms hire from any major.</li>
  <li><strong>Colleges:</strong> CUNY's Baruch College is known for its business school, and HBCUs such as Howard, Morehouse, Spelman, and Hampton send many graduates into finance.</li>
  <li><strong>High school:</strong> programs like <strong>SEO Scholars</strong> support New York City public high school students to and through college.</li>
  <li><strong>College programs:</strong> internships, plus career programs like SEO Career, Management Leadership for Tomorrow (MLT), and INROADS.</li>
</ul>`
      },
      {
        id: 'start-now',
        title: 'Start this year',
        html: `
<ol>
  <li>Take the most math you can, plus economics or statistics if your school offers them.</li>
  <li>Learn spreadsheets. Track your budget or this game in one.</li>
  <li>Start or join an investment club at school.</li>
  <li>Apply for a paid summer job through SYEP and open a custodial Roth IRA with your earnings.</li>
  <li>Ask a brother in the chapter how he got started. Most professionals are glad to explain.</li>
</ol>
<aside class="note alpha"><b>Alpha connection</b><p>Brothers of Alpha Phi Alpha work across banking, accounting, investing, and public finance, including Brother Robert F. Smith, the founder of Vista Equity Partners. Your mentors are your first professional network.</p></aside>
<aside class="note idea"><b>Big idea</b><p>The skills you practice in this game, research, decision-making, and explaining your reasoning, are the skills finance careers are built on.</p></aside>`
      }
    ],
    takeaways: [
      `Finance careers range from planning and accounting to research, trading, and fintech.`,
      `Many finance jobs pay six-figure median salaries and start with a bachelor's degree.`,
      `CPA, CFP, and CFA credentials signal expertise in specific paths.`,
      `Math, spreadsheets, writing, and curiosity transfer across every role.`,
      `Programs like SEO Scholars and your chapter mentors can help you start now.`
    ],
    discuss: [
      `Which job in the table sounds most interesting to you? What would you ask someone who does it?`,
      `What is one step you could take this month toward a finance career?`
    ],
    videos: [yt('What Hedge Funds Are', '0A3YLOfxNd4')],
    links: [BLS, SEO],
    terms: ['cfp', 'cpa', 'cfa', 'portfolio-manager', 'equity-research'],
    exam: [
      {
        q: `Who helps companies raise money or go public?`,
        choices: [`Accountant`, `Investment banker`, `Compliance officer`, `Teller`],
        answer: 1,
        explain: `Investment bankers advise companies on raising money and on deals.`
      },
      {
        q: `Which skill is useful across nearly every finance career?`,
        choices: [`Clear writing and speaking`, `Memorizing stock tickers`, `Guessing tomorrow's prices`, `Day trading`],
        answer: 0,
        explain: `Explaining your thinking clearly matters in every role.`
      },
      {
        q: `What is one step you can take right now toward a finance career?`,
        choices: [`Wait until after college`, `Ask a mentor how he got started`, `Buy a penny stock`, `Avoid math classes`],
        answer: 1,
        explain: `Mentors are one of the best sources of real career advice.`
      },
      {
        q: `Which credential is most associated with financial planning?`,
        choices: [`CPA`, `CFP`, `CFA`, `FDIC`],
        answer: 1,
        explain: `Certified Financial Planners help families plan budgets, investments, and retirement.`
      },
      {
        q: `According to the BLS, what was the 2025 median pay for financial analysts?`,
        choices: [`$45,000`, `$76,690`, `$103,570`, `$250,000`],
        answer: 2,
        explain: `Half of financial analysts earned more than $103,570 and half earned less.`
      },
      {
        q: `A CPA license is for:`,
        choices: [`Accountants`, `Stock traders`, `Bank tellers`, `Insurance agents`],
        answer: 0,
        explain: `Certified Public Accountants prepare and audit financial statements and taxes.`
      },
      {
        q: `Which program supports New York City public high school students to and through college?`,
        choices: [`SEO Scholars`, `The FAFSA`, `BrokerCheck`, `The SEC`],
        answer: 0,
        explain: `SEO Scholars is a free program for NYC public high school students.`
      },
      {
        q: `Which tools open doors across nearly every finance job?`,
        choices: [`Spreadsheets, SQL, and Python`, `Day trading apps`, `Social media followers`, `Memorizing tickers`],
        answer: 0,
        explain: `Data skills are useful everywhere in finance.`
      }
    ]
  }
];
