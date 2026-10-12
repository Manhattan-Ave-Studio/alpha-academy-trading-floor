// Track 3: Money for Life
// Copy style: direct and calm, second person, short paragraphs, no em dashes or en dashes.
// Figures that change each year (wages, limits, aid amounts) were checked in October 2026.

const yt = (title, youtube) => ({ title, youtube, source: 'Investopedia' });
const INVESTOR_GOV = { title: 'Introduction to Investing', org: 'Investor.gov (U.S. SEC)', url: 'https://www.investor.gov/introduction-investing' };
const CALCULATOR = { title: 'Compound Interest Calculator', org: 'Investor.gov (U.S. SEC)', url: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator' };
const KHAN = { title: 'Personal Finance course', org: 'Khan Academy', url: 'https://www.khanacademy.org/college-careers-more/personal-finance' };
const SYEP = { title: 'Summer Youth Employment Program (SYEP)', org: 'NYC Department of Youth and Community Development', url: 'https://access.nyc.gov/programs/summer-youth-employment-program-syep' };
const MONEY_SMART = { title: 'Money Smart for Young People (grades 9 to 12)', org: 'FDIC', url: 'https://fdic.gov/consumer-resource-center/grades-9-12' };
const BANKFIND = { title: 'BankFind: check that a bank is insured', org: 'FDIC', url: 'https://banks.data.fdic.gov/bankfind-suite/bankfind' };
const NBA = { title: 'About the National Bankers Association', org: 'National Bankers Association', url: 'https://www.nationalbankers.org/about-us' };
const CREDIT_REPORTS = { title: 'Free credit reports', org: 'AnnualCreditReport.com', url: 'https://www.annualcreditreport.com/' };
const FAFSA = { title: 'FAFSA', org: 'Federal Student Aid', url: 'https://studentaid.gov/h/apply-for-aid/fafsa' };
const HESC = { title: 'New York State aid (TAP and Excelsior)', org: 'NYS Higher Education Services Corporation', url: 'https://www.hesc.ny.gov/' };
const EXCELSIOR = { title: 'Excelsior Scholarship', org: 'NYS Higher Education Services Corporation', url: 'https://hesc.ny.gov/find-aid/nys-grants-scholarships/excelsior-scholarship-program' };
const ROTH = { title: 'Roth IRAs', org: 'Internal Revenue Service', url: 'https://www.irs.gov/retirement-plans/roth-iras' };
const BROKERCHECK = { title: 'BrokerCheck', org: 'FINRA', url: 'https://brokercheck.finra.org/' };
const REPORT_FRAUD = { title: 'Report fraud', org: 'Federal Trade Commission', url: 'https://reportfraud.ftc.gov/' };

export const LIFE = [
  {
    id: 'compound-growth',
    track: 'life',
    title: 'Compound growth',
    summary: `Time is the most powerful ingredient in investing, and you have more of it than anyone.`,
    goals: [
      `Explain compound growth and how it differs from simple interest`,
      `Estimate doubling time with the Rule of 72`,
      `See how regular contributions, fees, debt, and inflation change the outcome`
    ],
    sections: [
      {
        id: 'compounding',
        title: 'Earning on your earnings',
        html: `
<p><strong>Compound growth</strong> means your earnings start earning too. In year one, you earn a return on what you put in. In year two, you earn a return on what you put in plus last year's gains. Over decades, that snowball gets big.</p>
<aside class="note example"><b>Worked example</b><p>Put $1,000 away at 5% for 10 years. With <strong>simple interest</strong>, paid only on the original $1,000, you end with $1,500. With <strong>compound interest</strong>, where each year's interest joins the balance and earns too, you end with about $1,629. The gap widens every year after that.</p></aside>`
      },
      {
        id: 'table',
        title: '$1,000 growing at 8% a year',
        html: `
<table class="data-table">
  <thead><tr><th>Years</th><th>Value</th></tr></thead>
  <tbody>
    <tr><td>10</td><td>$2,159</td></tr>
    <tr><td>20</td><td>$4,661</td></tr>
    <tr><td>30</td><td>$10,063</td></tr>
    <tr><td>40</td><td>$21,725</td></tr>
  </tbody>
</table>
<p>Notice the pattern: the last ten years add more than the first thirty combined.</p>`
      },
      {
        id: 'start-early',
        title: 'Starting at 16 versus 26',
        html: `
<p>Two people each invest <strong>$100 a month</strong> and earn 7% a year until age 65.</p>
<div class="figures">
  <div><b>$507,000</b><span>Starts at 16 and puts in $58,800</span></div>
  <div><b>$244,000</b><span>Starts at 26 and puts in $46,800</span></div>
</div>
<p>Starting ten years earlier costs $12,000 more in deposits and roughly doubles the result. Those first years are the most valuable dollars you will ever invest.</p>`
      },
      {
        id: 'rule-72',
        title: 'The Rule of 72',
        html: `
<p>Divide 72 by your yearly return to estimate how many years money takes to double.</p>
<table class="data-table">
  <thead><tr><th>Yearly rate</th><th>Years to double, about</th></tr></thead>
  <tbody>
    <tr><td>4%</td><td>18</td></tr>
    <tr><td>6%</td><td>12</td></tr>
    <tr><td>8%</td><td>9</td></tr>
    <tr><td>10%</td><td>7</td></tr>
    <tr><td>24%, a typical credit card</td><td>3</td></tr>
  </tbody>
</table>
<p>The last row is the warning: the same math that grows savings grows debt you leave unpaid.</p>`
      },
      {
        id: 'regular',
        title: 'Small amounts, every week',
        html: `
<p>Small amounts work. Investing $25 a week, about what some people spend on snacks and delivery fees, adds up to $1,300 a year.</p>
<aside class="note example"><b>Worked example</b><p>Invest $25 a week from age 16 to 66 at a 7% yearly return. You deposit $65,000 over 50 years, and your account grows to about $590,000. Compounding earned more than $500,000 of it.</p></aside>`
      },
      {
        id: 'against',
        title: 'Compounding in reverse',
        html: `
<p>The same math works against you in three ways:</p>
<ul>
  <li><strong>Debt:</strong> a credit card balance at 24% doubles in about three years if you never pay it.</li>
  <li><strong>Fees:</strong> a 1% yearly fee on $10,000 over 30 years costs about $18,000 at a 7% return, as lesson 8 showed.</li>
  <li><strong>Inflation:</strong> at 3% a year, prices double in about 24 years.</li>
</ul>`
      },
      {
        id: 'real',
        title: 'Real returns',
        html: `
<p>To see what your money can actually buy, subtract inflation. A 7% return with 3% inflation is about a 4% real return. That still doubles your buying power about every 18 years.</p>
<aside class="note idea"><b>Big idea</b><p>Small amounts plus lots of time can outgrow large amounts invested late.</p></aside>
<aside class="note try"><b>Try it</b><p>Open the <a href="#/tools">Compound growth calculator</a> and plug in your own numbers: what you could save each month, and from what age.</p></aside>`
      }
    ],
    takeaways: [
      `Compound growth means returns earn returns, so growth speeds up over time.`,
      `Starting ten years earlier can roughly double the result.`,
      `Divide 72 by the yearly rate to estimate how long money takes to double.`,
      `Small weekly amounts grow into large sums over decades.`,
      `Debt, fees, and inflation compound too, in the wrong direction.`
    ],
    discuss: [
      `What is one expense you could redirect into investing each week? What would it grow to by 66?`,
      `Why do you think most people start investing later than they wish they had?`
    ],
    videos: [yt('Time Value of Money Explained', 'MdK-A1VQJls')],
    links: [CALCULATOR],
    terms: ['compound-interest', 'rule-of-72', 'principal', 'interest', 'inflation', 'real-return'],
    exam: [
      {
        q: `Using the Rule of 72, about how long does money take to double at 9% a year?`,
        choices: [`4 years`, `8 years`, `12 years`, `72 years`],
        answer: 1,
        explain: `72 / 9 = 8 years.`
      },
      {
        q: `Why does starting at 16 instead of 26 make such a big difference?`,
        choices: [`Banks pay teenagers more`, `Earlier money has more years to compound`, `Taxes are lower at 16`, `It makes no difference`],
        answer: 1,
        explain: `More years of compounding means the growth itself keeps growing.`
      },
      {
        q: `Compound growth means:`,
        choices: [`Earning returns on your returns`, `Paying interest twice`, `A guaranteed return`, `Investing in two stocks`],
        answer: 0,
        explain: `Your gains join your balance and start earning too.`
      },
      {
        q: `$1,000 earns 5% a year for 10 years. Which ends with more?`,
        choices: [`Simple interest: $1,500`, `Compound interest: about $1,629`, `They end the same`, `Neither earns anything`],
        answer: 1,
        explain: `Compounding adds each year's interest to the balance, so it earns more.`
      },
      {
        q: `Using the Rule of 72, how long does money take to double at 6%?`,
        choices: [`6 years`, `12 years`, `18 years`, `72 years`],
        answer: 1,
        explain: `72 / 6 = 12 years.`
      },
      {
        q: `A credit card balance at 24% is never paid. About how long until it doubles?`,
        choices: [`3 years`, `6 years`, `12 years`, `24 years`],
        answer: 0,
        explain: `72 / 24 = 3 years.`
      },
      {
        q: `Your investments earn 7% a year and inflation is 3%. About how fast does your buying power grow?`,
        choices: [`10% a year`, `7% a year`, `4% a year`, `3% a year`],
        answer: 2,
        explain: `Your real return is about 7% minus 3%, or 4%.`
      },
      {
        q: `Investing $25 a week from 16 to 66 at 7%, you deposit $65,000. About how much do you end with?`,
        choices: [`$65,000`, `$130,000`, `$590,000`, `$6.5 million`],
        answer: 2,
        explain: `About $590,000. Compounding did most of the work.`
      }
    ]
  },

  {
    id: 'budgeting-paycheck',
    track: 'life',
    title: 'Budgeting your paycheck',
    summary: `Gross pay, deductions, net pay, and a plan for every dollar.`,
    goals: [
      `Read a pay stub: gross pay, deductions, and net pay`,
      `Build a monthly budget with the 50/30/20 method`,
      `Automate saving and start an emergency fund`
    ],
    sections: [
      {
        id: 'gross-net',
        title: 'Gross pay and net pay',
        html: `
<p><strong>Gross pay</strong> is what you earn before anything comes out. <strong>Net pay</strong>, or take-home pay, is what lands in your account.</p>
<p>Say you earn New York City's 2026 minimum wage of <strong>$17 an hour</strong> and work <strong>20 hours</strong> a week. Your weekly gross pay is <strong>$340</strong>.</p>
<ul>
  <li><strong>FICA</strong> (Social Security 6.2% plus Medicare 1.45%) always comes out: 7.65% of $340 is <strong>$26.01</strong>.</li>
  <li>Federal, state, and New York City income tax may also be withheld, depending on what you earn and the forms you fill out when you are hired.</li>
</ul>
<p>Before income tax, that leaves <strong>$313.99</strong>.</p>`
      },
      {
        id: 'stub',
        title: 'Reading a pay stub',
        html: `
<table class="data-table">
  <thead><tr><th>Line</th><th>What it means</th></tr></thead>
  <tbody>
    <tr><td>Gross pay</td><td>Hours times your rate, plus any overtime or tips</td></tr>
    <tr><td>Federal income tax</td><td>Withheld based on your W-4</td></tr>
    <tr><td>Social Security (6.2%)</td><td>Funds retirement and disability benefits</td></tr>
    <tr><td>Medicare (1.45%)</td><td>Funds health insurance for people 65 and older</td></tr>
    <tr><td>NY State and NYC income tax</td><td>Withheld based on New York's Form IT-2104</td></tr>
    <tr><td>Other deductions</td><td>Such as New York's disability and paid family leave insurance</td></tr>
    <tr><td>Net pay</td><td>What is deposited into your account</td></tr>
    <tr><td>Year to date</td><td>Totals since January 1</td></tr>
  </tbody>
</table>
<p>When you start a job, you fill out a federal <strong>W-4</strong> and, in New York, Form IT-2104. They tell your employer how much income tax to withhold.</p>`
      },
      {
        id: 'taxes',
        title: 'Taxes and teens',
        html: `
<p>FICA comes out of every paycheck. Federal income tax applies only above a threshold. In 2026 the standard deduction for a single filer is <strong>$16,100</strong>, and if all your income comes from a job, you can generally earn up to that amount before owing federal income tax. If tax was withheld anyway, filing a tax return gets it back as a refund.</p>
<p>Filing your own return is good practice even when you owe nothing. Free help is available at IRS Volunteer Income Tax Assistance (VITA) sites, including many in Brooklyn.</p>`
      },
      {
        id: 'plan',
        title: 'The 50/30/20 plan',
        html: `
<p>A simple starting point for take-home pay:</p>
<table class="data-table">
  <thead><tr><th>Bucket</th><th>Share</th><th>On $1,200 a month</th></tr></thead>
  <tbody>
    <tr><td>Needs: phone, transportation, food, contributions at home</td><td>50%</td><td>$600</td></tr>
    <tr><td>Wants: going out, clothes, games</td><td>30%</td><td>$360</td></tr>
    <tr><td>Savings and investing</td><td>20%</td><td>$240</td></tr>
  </tbody>
</table>
<p>Adjust the split to your life. The habit matters more than the exact percentages.</p>`
      },
      {
        id: 'build',
        title: 'Build your budget in five steps',
        html: `
<ol>
  <li>Write down your monthly take-home pay.</li>
  <li>Track every dollar you spend for 30 days. Your bank app can help.</li>
  <li>Sort spending into needs, wants, and savings.</li>
  <li>Set a target for each bucket, starting with savings.</li>
  <li>Check in once a month and adjust.</li>
</ol>
<aside class="note example"><b>Worked example</b><p>Suppose a summer job pays $17 an hour for 25 hours a week over six weeks: $2,550 before taxes. Living at home, you might save half, $1,275, set aside $500 for school supplies and your phone bill, and keep the rest for fun. Saving more while your needs are small is a head start few adults get.</p></aside>`
      },
      {
        id: 'emergency',
        title: 'Your emergency fund',
        html: `
<p>An <strong>emergency fund</strong> is cash set aside for surprises: a broken phone, a lost job, a family need. Start with a goal of $500 to $1,000. As an adult, build toward three to six months of expenses. Keep it in an insured high-yield savings account, separate from your spending money.</p>`
      },
      {
        id: 'first',
        title: 'Pay yourself first',
        html: `
<p>Set up an automatic transfer to savings on payday, before you spend. Many employers let you split direct deposit between two accounts. Money you never see is money you rarely miss.</p>
<aside class="note try"><b>Try it</b><p>Use the <a href="#/tools">Budget planner</a> to split your own monthly take-home pay.</p></aside>`
      }
    ],
    takeaways: [
      `Gross pay minus taxes and deductions equals net pay, your take-home pay.`,
      `FICA, 7.65%, comes out of every check. Many teens owe no federal income tax and can get withholding back by filing.`,
      `50/30/20 is a simple starting split: needs, wants, and savings.`,
      `Start an emergency fund with a goal of $500 to $1,000.`,
      `Automate savings on payday so it happens before spending.`
    ],
    discuss: [
      `What counts as a need and what counts as a want in your life right now?`,
      `If you got your first paycheck tomorrow, what share would you save, and why?`
    ],
    videos: [yt('How to Build a Budget', 'Hnf5BRh5bdg')],
    links: [SYEP, KHAN],
    terms: ['gross-pay', 'net-pay', 'fica', 'w-4', 'standard-deduction', 'budget', 'emergency-fund'],
    exam: [
      {
        q: `Net pay is:`,
        choices: [`Pay before taxes`, `Pay after taxes and deductions`, `Your hourly wage`, `Your yearly bonus`],
        answer: 1,
        explain: `Net pay is your take-home pay.`
      },
      {
        q: `FICA takes 7.65% of gross pay. On $500 of gross pay, how much is that?`,
        choices: [`$7.65`, `$38.25`, `$76.50`, `$50.00`],
        answer: 1,
        explain: `0.0765 x $500 = $38.25.`
      },
      {
        q: `In the 50/30/20 plan, what is the 20% for?`,
        choices: [`Wants`, `Needs`, `Savings and investing`, `Taxes`],
        answer: 2,
        explain: `50% needs, 30% wants, 20% savings and investing.`
      },
      {
        q: `You work 15 hours at $17 an hour. What is your gross pay?`,
        choices: [`$170`, `$255`, `$289`, `$340`],
        answer: 1,
        explain: `15 x $17 = $255.`
      },
      {
        q: `Which federal form tells your employer how much income tax to withhold?`,
        choices: [`W-4`, `1040`, `10-K`, `FAFSA`],
        answer: 0,
        explain: `You fill out a W-4 when you start a job. In New York you also fill out Form IT-2104.`
      },
      {
        q: `Your monthly take-home pay is $1,000. Under 50/30/20, how much goes to savings?`,
        choices: [`$50`, `$200`, `$300`, `$500`],
        answer: 1,
        explain: `20% of $1,000 is $200.`
      },
      {
        q: `In 2026, if all your income comes from a job, about how much can you earn before owing federal income tax?`,
        choices: [`$1,000`, `$5,000`, `$16,100`, `$50,000`],
        answer: 2,
        explain: `The 2026 standard deduction for a single filer is $16,100.`
      },
      {
        q: `"Pay yourself first" means:`,
        choices: [`Buying what you want first`, `Moving money to savings automatically before you spend`, `Paying your bills late`, `Keeping all your pay in cash`],
        answer: 1,
        explain: `Automate savings on payday so it happens before spending.`
      }
    ]
  },

  {
    id: 'banking-basics',
    track: 'life',
    title: 'Banking basics',
    summary: `Checking, savings, deposit insurance, interest, fees, and banks built by and for the community.`,
    goals: [
      `Choose the right accounts and confirm they are insured`,
      `Compare APY and avoid common fees`,
      `Use debit cards and payment apps safely`
    ],
    sections: [
      {
        id: 'accounts',
        title: 'Two accounts to start',
        html: `
<ul>
  <li><strong>Checking:</strong> for everyday spending, with a debit card and direct deposit.</li>
  <li><strong>Savings:</strong> for money you are setting aside. It earns interest.</li>
</ul>
<p><strong>High-yield savings accounts</strong>, often at online banks, pay noticeably more interest than a typical savings account. <strong>Credit unions</strong> are nonprofit banks owned by their members. They often charge lower fees, and many serve people who live, work, or study in a particular area.</p>`
      },
      {
        id: 'protected',
        title: 'Your money is protected',
        html: `
<p>At banks insured by the <strong>FDIC</strong>, deposits are protected up to <strong>$250,000</strong> per depositor, per bank, per ownership category, even if the bank fails. Credit unions have similar protection through the <strong>NCUA</strong>. You can confirm a bank is insured with the FDIC's BankFind tool before you open an account.</p>
<p>Money sitting in a payment app balance may not have the same protection as a bank deposit. Move app balances into your insured bank account rather than storing money there.</p>`
      },
      {
        id: 'apy',
        title: 'Interest and APY',
        html: `
<p>Banks pay you interest for keeping money with them. The <strong>APY</strong>, or annual percentage yield, tells you what you earn in a year, including compounding.</p>
<aside class="note example"><b>Worked example</b><p>Keep $1,000 in an account paying 0.01% APY and you earn about 10 cents in a year. Keep it in a high-yield account paying 4.00% APY and you earn about $40. Same money, same insurance, 400 times the interest.</p></aside>
<p>Rates move with the economy, so compare when you open an account and check again once a year.</p>`
      },
      {
        id: 'fees',
        title: 'Keep fees away',
        html: `
<ul>
  <li>Turn on low-balance alerts in your bank app.</li>
  <li>Opt out of overdraft coverage, or link a savings account as backup.</li>
  <li>Use your bank's ATMs, or a bank that refunds ATM fees.</li>
  <li>Check-cashing stores and prepaid cards often charge fees a bank account does not. A bank account keeps more of your paycheck in your pocket.</li>
</ul>`
      },
      {
        id: 'cards-apps',
        title: 'Debit cards, credit cards, and payment apps',
        html: `
<p>A <strong>debit card</strong> spends money you already have. A <strong>credit card</strong> borrows money you must repay, and it charges interest if you carry a balance. Used carefully, credit cards build your credit history. The next lesson covers how.</p>
<p>Payment apps like Zelle, Venmo, and Cash App move money in seconds, and that speed cuts both ways: a payment you send is usually hard to reverse. Send money only to people you know in person, check the name before you tap send, and never pay a stranger to "unlock" a prize, a job, or a deal.</p>`
      },
      {
        id: 'community',
        title: 'Banks built by the community',
        html: `
<p>Black Americans have built banks for more than a century to serve neighborhoods that other banks ignored. In New York City, <strong>Carver Federal Savings Bank</strong> opened in Harlem in 1948 to help Black New Yorkers get mortgages and banking services, and it opened a branch in Bedford-Stuyvesant in 1961. Today the <strong>National Bankers Association</strong> represents Black-owned and other minority-owned banks across the country. Regulators call these banks minority depository institutions.</p>
<p>Where you bank is also a decision about your community. Lesson 19 covers this history.</p>`
      },
      {
        id: 'under-18',
        title: 'Opening an account under 18',
        html: `
<p>Many banks and credit unions offer teen or joint accounts that you open with a parent or guardian. Bring ID and ask about monthly fees and minimum balances.</p>
<aside class="note idea"><b>Big idea</b><p>An insured bank account with alerts turned on is the foundation everything else is built on.</p></aside>`
      }
    ],
    takeaways: [
      `Use checking for spending and savings for setting money aside.`,
      `FDIC and NCUA insurance protect deposits up to $250,000 per depositor, per bank, per ownership category.`,
      `Compare APY: a high-yield account can pay hundreds of times more interest.`,
      `Alerts, overdraft opt-outs, and in-network ATMs keep fees away.`,
      `Payment app transfers are hard to reverse, so pay only people you know.`
    ],
    discuss: [
      `What would make you trust a bank? What would make you leave one?`,
      `Why might a community-owned bank matter to a neighborhood?`
    ],
    videos: [yt('Interest Rates: Nominal and Real', '5OK30EpMiLw')],
    links: [MONEY_SMART, BANKFIND, NBA],
    terms: ['checking-account', 'savings-account', 'apy', 'interest', 'fdic', 'credit-union', 'overdraft', 'debit-card', 'credit-card', 'minority-depository-institution'],
    exam: [
      {
        q: `FDIC insurance protects deposits up to how much per depositor, per bank, per ownership category?`,
        choices: [`$25,000`, `$100,000`, `$250,000`, `Unlimited`],
        answer: 2,
        explain: `The standard FDIC insurance amount is $250,000.`
      },
      {
        q: `Which number should you compare when shopping for a savings account?`,
        choices: [`APR`, `APY`, `P/E`, `EPS`],
        answer: 1,
        explain: `APY is the yearly yield you earn, including compounding.`
      },
      {
        q: `A debit card spends:`,
        choices: [`Borrowed money`, `Money already in your account`, `Your credit score`, `Only cash`],
        answer: 1,
        explain: `Debit pulls from your account. Credit borrows.`
      },
      {
        q: `$1,000 sits in an account paying 4.00% APY. About how much interest does it earn in a year?`,
        choices: [`$0.40`, `$4`, `$40`, `$400`],
        answer: 2,
        explain: `4% of $1,000 is $40.`
      },
      {
        q: `Which habit best helps you avoid overdraft fees?`,
        choices: [`Turning on low-balance alerts and opting out of overdraft coverage`, `Using out-of-network ATMs`, `Keeping money in a payment app`, `Writing more checks`],
        answer: 0,
        explain: `Alerts warn you early, and opting out means a purchase is declined instead of triggering a fee.`
      },
      {
        q: `Credit unions are:`,
        choices: [`Owned by their members and insured by the NCUA`, `Uninsured`, `Run by the stock exchange`, `Only for businesses`],
        answer: 0,
        explain: `Credit unions are member-owned nonprofits. The NCUA insures deposits much like the FDIC.`
      },
      {
        q: `Carver Federal Savings Bank opened in Harlem in 1948 to:`,
        choices: [`Serve Black New Yorkers who struggled to get mortgages and banking services`, `Trade stocks for the public`, `Print U.S. currency`, `Run the subway`],
        answer: 0,
        explain: `Carver was founded to serve a community other banks underserved, and it opened a Bedford-Stuyvesant branch in 1961.`
      },
      {
        q: `Someone you met online asks you to send $50 by payment app to "unlock" a prize. What should you do?`,
        choices: [`Send it quickly before the offer ends`, `Refuse: payment app transfers are hard to reverse, and this is a common scam`, `Send half`, `Send it, then dispute it later`],
        answer: 1,
        explain: `Real prizes never require a payment to claim. Pay only people you know.`
      }
    ]
  },

  {
    id: 'credit-scores',
    track: 'life',
    title: 'Credit and credit scores',
    summary: `Your credit score affects apartments, car loans, and even some jobs. Here is how to build a strong one.`,
    goals: [
      `Explain what a credit score measures and where it comes from`,
      `Calculate the real cost of carrying a balance`,
      `Build credit safely, starting now`
    ],
    sections: [
      {
        id: 'reputation',
        title: 'Your financial reputation',
        html: `
<p>A <strong>credit score</strong> is a number, usually from <strong>300 to 850</strong>, that tells lenders how likely you are to repay. Higher scores get approved more often and pay lower interest rates. Landlords, insurers, phone companies, and some employers look at credit too.</p>`
      },
      {
        id: 'reports',
        title: 'Credit reports and credit scores',
        html: `
<p>Three credit bureaus, <strong>Equifax, Experian, and TransUnion</strong>, keep a <strong>credit report</strong> on most adults: every card and loan, its balance, and whether payments arrived on time. A credit score summarizes that report using a formula such as FICO.</p>
<p>You can check your reports for free every week at <strong>AnnualCreditReport.com</strong>, the official site. If you find a mistake, you have the right to dispute it with the bureau.</p>`
      },
      {
        id: 'fico',
        title: 'What goes into a FICO score',
        html: `
<table class="data-table">
  <thead><tr><th>Factor</th><th>Weight</th><th>In plain English</th></tr></thead>
  <tbody>
    <tr><td>Payment history</td><td>35%</td><td>Do you pay on time?</td></tr>
    <tr><td>Amounts owed</td><td>30%</td><td>How much of your limits are you using?</td></tr>
    <tr><td>Length of history</td><td>15%</td><td>How long have your accounts been open?</td></tr>
    <tr><td>New credit</td><td>10%</td><td>Have you opened many accounts recently?</td></tr>
    <tr><td>Credit mix</td><td>10%</td><td>Do you handle different kinds of credit?</td></tr>
  </tbody>
</table>`
      },
      {
        id: 'utilization',
        title: 'Credit utilization',
        html: `
<p><strong>Credit utilization</strong> is how much of your available credit you are using. A $500 balance on a $1,000 limit is 50% utilization. The same $500 on a $2,000 limit is 25%. Lower is better: under 30% is a common guideline, and people with the highest scores often stay under 10%.</p>`
      },
      {
        id: 'interest',
        title: 'The minimum payment trap',
        html: `
<p>Credit cards charge interest as an <strong>APR</strong>, or annual percentage rate. Suppose you owe <strong>$1,000</strong> at <strong>24% APR</strong>:</p>
<ul>
  <li>Paying <strong>$30 a month</strong> takes about <strong>56 months</strong> and costs about <strong>$664</strong> in interest.</li>
  <li>Paying <strong>$100 a month</strong> takes <strong>12 months</strong> and costs about <strong>$127</strong> in interest.</li>
</ul>
<p>Paying the full statement balance every month costs <strong>$0</strong> in interest.</p>`
      },
      {
        id: 'build',
        title: 'Building credit the smart way',
        html: `
<ul>
  <li>Become an <strong>authorized user</strong> on a parent's card that is paid on time.</li>
  <li>At 18, consider a <strong>secured card</strong> or a student card with a small limit. Under 21, federal law requires your own income or a cosigner to get a card in your name.</li>
  <li>Pay in full and on time, every time. Set up autopay.</li>
  <li>Keep your balance low compared with your limit.</li>
  <li>Check your credit reports for free at <strong>AnnualCreditReport.com</strong>.</li>
</ul>`
      },
      {
        id: 'debt-types',
        title: 'Borrowing that builds, borrowing that drains',
        html: `
<p>Some borrowing can help you build a life: an affordable student loan for a degree that raises your income, or a mortgage on a home you can afford. Other borrowing drains you:</p>
<ul>
  <li><strong>Carrying credit card balances</strong> at rates often above 20%.</li>
  <li><strong>Payday loans:</strong> a typical two-week payday loan charging $15 per $100 borrowed works out to an APR of almost 400%.</li>
  <li><strong>Buy now, pay later</strong> plans, which make it easy to stack up payments you lose track of.</li>
</ul>
<aside class="note idea"><b>Big idea</b><p>Pay on time, every time, and keep balances low. Those two habits drive most of a great score.</p></aside>
<aside class="note try"><b>Try it</b><p>Run your own numbers in the <a href="#/tools">Credit card payoff calculator</a>.</p></aside>`
      }
    ],
    takeaways: [
      `Credit scores run from 300 to 850 and affect loans, apartments, and more.`,
      `Payment history and amounts owed make up about two-thirds of a FICO score.`,
      `Keep utilization under 30%, and lower is better.`,
      `Minimum payments stretch debt out for years and multiply the interest.`,
      `Check your credit reports free every week at AnnualCreditReport.com.`
    ],
    discuss: [
      `Why do you think landlords and employers care about credit?`,
      `What rules would you set for your first credit card?`
    ],
    videos: [yt('3 Important Credit Score Factors', 'zA_Wln52w9w')],
    links: [CREDIT_REPORTS],
    terms: ['credit-score', 'credit-report', 'fico', 'apr', 'credit-utilization', 'minimum-payment', 'secured-card', 'authorized-user', 'payday-loan'],
    exam: [
      {
        q: `Which factor has the biggest weight in a FICO score?`,
        choices: [`Credit mix`, `New credit`, `Payment history`, `Length of history`],
        answer: 2,
        explain: `Payment history is 35% of the score.`
      },
      {
        q: `How do you avoid paying any credit card interest?`,
        choices: [`Pay the minimum`, `Pay the full statement balance every month`, `Use the card only on weekends`, `Open more cards`],
        answer: 1,
        explain: `Paying the full statement balance on time means no interest is charged on purchases.`
      },
      {
        q: `A card has a $1,000 limit. Keeping your balance under 30% means owing less than:`,
        choices: [`$30`, `$300`, `$700`, `$1,000`],
        answer: 1,
        explain: `30% of $1,000 is $300.`
      },
      {
        q: `Credit scores usually range from:`,
        choices: [`0 to 100`, `300 to 850`, `500 to 1,000`, `1 to 10`],
        answer: 1,
        explain: `Most common scores, including FICO, run from 300 to 850.`
      },
      {
        q: `Where can you get your credit reports for free?`,
        choices: [`AnnualCreditReport.com`, `Any social media app`, `Only through a paid credit repair company`, `Your school`],
        answer: 0,
        explain: `It is the official site for free reports from all three bureaus.`
      },
      {
        q: `You owe $600 on a card with a $2,000 limit. What is your utilization?`,
        choices: [`3%`, `12%`, `30%`, `60%`],
        answer: 2,
        explain: `$600 / $2,000 = 30%.`
      },
      {
        q: `You owe $1,000 at 24% APR. What does paying $100 a month instead of $30 a month do?`,
        choices: [`Nothing changes`, `It cuts payoff from about 56 months to 12 and interest from about $664 to $127`, `It raises the interest rate`, `It doubles the debt`],
        answer: 1,
        explain: `Bigger payments shrink both the time and the total interest.`
      },
      {
        q: `A payday loan charges $15 for every $100 borrowed for two weeks. About what APR is that?`,
        choices: [`15%`, `39%`, `Almost 400%`, `1,500%`],
        answer: 2,
        explain: `15% every two weeks, 26 times a year, works out to an APR of almost 400%.`
      }
    ]
  },

  {
    id: 'paying-for-college',
    track: 'life',
    title: 'Paying for college',
    summary: `Net price, the FAFSA, New York aid, scholarships, and borrowing with a plan.`,
    goals: [
      `Compare a college's sticker price with what your family would actually pay`,
      `Use the FAFSA and New York programs to find free money first`,
      `Borrow wisely, if at all, and know the other paths`
    ],
    sections: [
      {
        id: 'net-price',
        title: 'Sticker price versus net price',
        html: `
<p>A college's published cost is the <strong>sticker price</strong>. What your family actually pays after grants and scholarships is the <strong>net price</strong>, and it is often much lower. Every college has a <strong>Net Price Calculator</strong> on its website. Use it before you rule a school out.</p>
<aside class="note example"><b>Worked example</b><p>A private college lists a sticker price of $80,000 a year for tuition, housing, and fees, and offers you $55,000 in grants and scholarships. Your net price is $25,000. A public college with a $30,000 sticker price and $12,000 in grants would cost $18,000. Compare schools by net price.</p></aside>`
      },
      {
        id: 'fafsa',
        title: 'Start with the FAFSA',
        html: `
<p>The <strong>Free Application for Federal Student Aid (FAFSA)</strong> unlocks federal grants, work-study, and federal loans, and many states and colleges use it for their own aid. The 2027-28 FAFSA is open now at <strong>StudentAid.gov</strong>. You and a parent each create a StudentAid.gov account, and the form pulls tax information directly from the IRS with your consent. File early: some aid runs out.</p>
<p>Some private colleges also ask for the <strong>CSS Profile</strong>, a second form from the College Board, to award their own grants.</p>`
      },
      {
        id: 'free-money',
        title: 'Free money first',
        html: `
<ul>
  <li><strong>Federal Pell Grant:</strong> need-based aid you never repay. The maximum for 2026-27 is <strong>$7,395</strong>.</li>
  <li><strong>Tuition Assistance Program (TAP):</strong> New York State grants for residents attending college in New York.</li>
  <li><strong>Excelsior Scholarship:</strong> tuition at SUNY and CUNY colleges for students from families earning $125,000 or less who complete 30 credits a year and then live and work in New York for as many years as they received it.</li>
  <li><strong>Scholarships:</strong> awards for academics, talent, service, background, or field of study. Local scholarships from churches, community groups, and fraternity chapters often have fewer applicants.</li>
  <li><strong>Work-study:</strong> a part-time campus job funded by financial aid.</li>
</ul>
<p>Brooklyn is home to four CUNY colleges: Brooklyn College, Medgar Evers College, New York City College of Technology (City Tech), and Kingsborough Community College.</p>`
      },
      {
        id: 'borrow',
        title: 'Borrow with a plan',
        html: `
<ul>
  <li><strong>Federal subsidized loans:</strong> the government pays the interest while you are in school.</li>
  <li><strong>Federal unsubsidized loans:</strong> interest builds while you are in school.</li>
  <li><strong>Private loans:</strong> from banks. They usually lack federal protections, so use them last.</li>
</ul>
<p>Federal loans for undergraduates have yearly limits. A dependent student can usually borrow $5,500 in the first year, $6,500 in the second, and $7,500 in each year after, about $27,000 over four years.</p>
<aside class="note example"><b>Worked example</b><p>Borrow $27,000 at 6% and repay it over 10 years: about $300 a month, and about $9,000 in total interest.</p></aside>
<p>A common guideline: keep your total student loans below what you expect to earn in your first year after graduation.</p>`
      },
      {
        id: 'saving',
        title: 'Saving ahead with a 529 plan',
        html: `
<p>A <strong>529 plan</strong> is an investment account for education. Earnings grow tax-free when used for qualified school costs, and family members can contribute as gifts. New York's plan lets state taxpayers deduct up to $5,000 a year of contributions from state income, or $10,000 for married couples filing jointly. If money is left over in an account open at least 15 years, up to $35,000 over a lifetime can move into a Roth IRA for the student, under federal rules.</p>`
      },
      {
        id: 'paths',
        title: 'More than one path',
        html: `
<ul>
  <li><strong>Start at community college</strong> and transfer to a four-year school, often saving thousands.</li>
  <li><strong>Earn college credit in high school</strong> through AP classes or CUNY's free College Now program.</li>
  <li><strong>Apprenticeships and trade programs</strong> pay you while you learn skilled work.</li>
  <li><strong>Military service</strong> can include education benefits.</li>
</ul>
<aside class="note idea"><b>Big idea</b><p>Apply for every grant and scholarship you qualify for before borrowing a dollar.</p></aside>`
      }
    ],
    takeaways: [
      `Net price, after grants and scholarships, is the number to compare. Every college has a Net Price Calculator.`,
      `The FAFSA unlocks federal aid and many state and college programs. File early.`,
      `Pell Grants, TAP, Excelsior, and scholarships are free money, so use them first.`,
      `Federal loans have limits and protections. Private loans come last.`,
      `A 529 plan grows tax-free for education.`
    ],
    discuss: [
      `What would you want to know about a college before comparing its price with another?`,
      `Which scholarships could you apply for this year?`
    ],
    videos: [],
    links: [FAFSA, HESC, EXCELSIOR],
    terms: ['fafsa', 'net-price', 'grant', 'pell-grant', 'scholarship', 'subsidized-loan', 'unsubsidized-loan', '529-plan'],
    exam: [
      {
        q: `What is the first form to file for federal college aid?`,
        choices: [`A W-4`, `The FAFSA`, `A 10-K`, `A credit report`],
        answer: 1,
        explain: `The FAFSA unlocks federal grants, work-study, and loans.`
      },
      {
        q: `Which type of aid never has to be repaid?`,
        choices: [`Unsubsidized loan`, `Private loan`, `Grant`, `Credit card`],
        answer: 2,
        explain: `Grants and scholarships are free money. Loans must be repaid.`
      },
      {
        q: `With a subsidized federal loan, who pays the interest while you are in school?`,
        choices: [`You`, `The government`, `The college`, `Nobody, it doubles`],
        answer: 1,
        explain: `The government covers the interest on subsidized loans while you are enrolled at least half-time.`
      },
      {
        q: `A college's sticker price is $80,000 a year, and it offers $55,000 in grants and scholarships. What is the net price?`,
        choices: [`$25,000`, `$55,000`, `$80,000`, `$135,000`],
        answer: 0,
        explain: `$80,000 minus $55,000 is $25,000.`
      },
      {
        q: `What is the maximum Federal Pell Grant for 2026-27?`,
        choices: [`$2,500`, `$5,500`, `$7,395`, `$20,000`],
        answer: 2,
        explain: `The maximum award is $7,395.`
      },
      {
        q: `About how much can a dependent undergraduate borrow in federal Direct Loans over four years?`,
        choices: [`$5,500`, `$27,000`, `$100,000`, `There is no limit`],
        answer: 1,
        explain: `$5,500 + $6,500 + $7,500 + $7,500 = $27,000.`
      },
      {
        q: `Borrowing $27,000 at 6% over 10 years costs about how much per month?`,
        choices: [`$100`, `$300`, `$900`, `$2,700`],
        answer: 1,
        explain: `About $300 a month, with about $9,000 of total interest.`
      },
      {
        q: `The Excelsior Scholarship covers SUNY and CUNY tuition for families earning up to:`,
        choices: [`$50,000`, `$125,000`, `$250,000`, `Any income`],
        answer: 1,
        explain: `The family income limit is $125,000, with credit and residency requirements.`
      }
    ]
  },

  {
    id: 'real-investing-accounts',
    track: 'life',
    title: 'Investing accounts in real life',
    summary: `Custodial accounts, Roth IRAs, the 401(k) match, and new accounts for kids: where real investing happens.`,
    goals: [
      `Choose the right account type for your age and goals`,
      `Explain how custodial accounts, Roth IRAs, and 401(k)s work`,
      `Know the steps to open your first real account with a parent or guardian`
    ],
    sections: [
      {
        id: 'why',
        title: 'The account matters as much as the investment',
        html: `
<p>This game uses play money. When you invest real money, the type of account decides who controls it, how it is taxed, and when you can take it out. Two people who buy the same index fund can end up with very different results because of the accounts they chose.</p>
<p>A regular <strong>brokerage account</strong> has no contribution limits and no special tax treatment: you pay tax on dividends, and on gains when you sell. <strong>Retirement accounts</strong> trade some flexibility for big tax advantages.</p>`
      },
      {
        id: 'custodial',
        title: 'Under 18: custodial accounts',
        html: `
<p>A <strong>custodial account</strong>, often called a UTMA or UGMA account, is a brokerage account an adult manages for you. The money legally belongs to you and transfers to your control at an age set by state law, usually 18 or 21.</p>`
      },
      {
        id: 'roth',
        title: 'The Roth IRA',
        html: `
<p>A <strong>Roth IRA</strong> is a retirement account with a powerful perk: you put in money you have already paid tax on, and it can grow and come out <strong>tax-free</strong> in retirement.</p>
<ul>
  <li>You need <strong>earned income</strong>, like a paycheck from a job. You can contribute up to what you earned that year or the yearly limit, whichever is less.</li>
  <li>The limit for 2026 is <strong>$7,500</strong>.</li>
  <li>Teens with jobs can open a <strong>custodial Roth IRA</strong> with a parent or guardian.</li>
  <li>Your contributions can be withdrawn at any time. Earnings have rules, so learn them before you touch them.</li>
</ul>
<aside class="note example"><b>Worked example</b><p>$2,000 put into a Roth IRA at 17 and left alone until 67 grows to more than $58,000 at a 7% yearly return, all of it tax-free.</p></aside>
<p>A <strong>traditional IRA</strong> works the other way: you may get a tax deduction now and pay tax when you withdraw in retirement. When your income and tax rate are low, as they are for most teens, the Roth usually comes out ahead.</p>`
      },
      {
        id: '401k',
        title: 'At your first full-time job: the 401(k)',
        html: `
<p>Many employers offer a <strong>401(k)</strong> retirement plan and add a <strong>match</strong>. A match is an instant return on your money, so contribute at least enough to get all of it. The 2026 employee contribution limit is <strong>$24,500</strong>.</p>
<aside class="note example"><b>Worked example</b><p>You earn $50,000, and your employer matches 50 cents per dollar on up to 6% of your pay. Contribute 6%, or $3,000, and your employer adds $1,500: an instant 50% return before your investments earn anything.</p></aside>
<p>Some matches <strong>vest</strong> over a few years, meaning you keep the employer's money only after you have worked there long enough. Your plan documents spell it out.</p>`
      },
      {
        id: 'kids',
        title: 'New in 2026: Trump accounts for children',
        html: `
<p>A 2025 federal law created a new savings account for children, officially a Section 530A account and widely called a Trump account. The main rules, based on IRS guidance:</p>
<ul>
  <li>A child under 18 with a Social Security number can have one, opened by a parent or guardian.</li>
  <li>Contributions began July 4, 2026. Family and others can add up to $5,000 a year in total, and a parent's employer can put in up to $2,500 of that.</li>
  <li>The federal government deposits $1,000 for U.S. citizen children born from 2025 through 2028 whose families enroll them.</li>
  <li>The money must be invested in low-cost funds that track the U.S. stock market.</li>
  <li>Withdrawals generally wait until the year the child turns 18. After that, the account works much like a traditional IRA.</li>
</ul>
<p>The rules are new and still being finalized, so check IRS.gov before opening one.</p>`
      },
      {
        id: 'inside',
        title: 'What to hold inside',
        html: `
<p>Low-cost index funds and <strong>target-date funds</strong>, which shift from stocks toward bonds automatically as your retirement year gets closer, are common choices for long-term accounts.</p>`
      },
      {
        id: 'open',
        title: 'Opening your first account',
        html: `
<ol>
  <li>Pick a large, low-cost broker. Many offer custodial accounts and custodial Roth IRAs with no minimum.</li>
  <li>Open it with a parent or guardian. You will need both of your Social Security numbers and IDs.</li>
  <li>Link a bank account and transfer money in.</li>
  <li>Choose your investments, such as a broad index fund or a target-date fund.</li>
  <li>Set up automatic monthly contributions, even small ones.</li>
</ol>
<aside class="note idea"><b>Big idea</b><p>A summer job plus a custodial Roth IRA is one of the strongest financial moves a teenager can make.</p></aside>`
      }
    ],
    takeaways: [
      `Custodial accounts let minors invest, with an adult in charge until the transfer age.`,
      `A Roth IRA needs earned income, takes up to $7,500 in 2026, and grows tax-free for retirement.`,
      `Always contribute enough to get the full 401(k) match.`,
      `Trump accounts, new in 2026, let families invest up to $5,000 a year for a child in U.S. stock index funds.`,
      `Low-cost index funds and target-date funds are common choices inside long-term accounts.`
    ],
    discuss: [
      `Why might someone choose a Roth IRA over a regular brokerage account?`,
      `What job could you get this summer that would let you open a Roth IRA?`
    ],
    videos: [],
    links: [ROTH, INVESTOR_GOV],
    terms: ['brokerage-account', 'custodial-account', 'roth-ira', 'traditional-ira', 'earned-income', '401k', 'employer-match', 'vesting', 'target-date-fund'],
    exam: [
      {
        q: `What do you need to contribute to a Roth IRA?`,
        choices: [`A college degree`, `Earned income, like a paycheck`, `A credit card`, `At least $10,000`],
        answer: 1,
        explain: `Contributions require earned income and cannot exceed what you earned that year.`
      },
      {
        q: `Why contribute enough to get your full 401(k) match?`,
        choices: [`It is required by law`, `The match is extra money your employer adds to your account`, `It lowers your credit score`, `It guarantees a 10% return`],
        answer: 1,
        explain: `The employer match adds money on top of what you contribute.`
      },
      {
        q: `What is the 2026 IRA contribution limit?`,
        choices: [`$2,000`, `$5,000`, `$7,500`, `$24,500`],
        answer: 2,
        explain: `The IRA limit for 2026 is $7,500. $24,500 is the 401(k) employee limit.`
      },
      {
        q: `Roth IRA contributions are made with:`,
        choices: [`Money you have already paid tax on, so qualified withdrawals in retirement are tax-free`, `Money that is never taxed at any point`, `Only your employer's money`, `Borrowed money`],
        answer: 0,
        explain: `You pay tax now and enjoy tax-free growth and withdrawals later.`
      },
      {
        q: `You earned $3,000 at a summer job in 2026. What is the most you can put in a Roth IRA for 2026?`,
        choices: [`$3,000`, `$7,500`, `$24,500`, `Nothing until you are 18`],
        answer: 0,
        explain: `You can contribute up to your earned income or the yearly limit, whichever is less.`
      },
      {
        q: `Your employer matches 50% of your contributions on up to 6% of pay. You earn $40,000 and contribute 6%. How much does your employer add?`,
        choices: [`$600`, `$1,200`, `$2,400`, `$6,000`],
        answer: 1,
        explain: `6% of $40,000 is $2,400, and half of that is $1,200.`
      },
      {
        q: `Who legally owns the money in a custodial (UTMA or UGMA) account?`,
        choices: [`The parent`, `The bank`, `The child`, `The government`],
        answer: 2,
        explain: `The money belongs to the child. An adult manages it until the transfer age.`
      },
      {
        q: `Starting July 4, 2026, families can contribute up to how much a year to a child's Trump account?`,
        choices: [`$1,000`, `$2,500`, `$5,000`, `$7,500`],
        answer: 2,
        explain: `Total contributions are generally capped at $5,000 a year, separate from the $1,000 federal deposit for eligible children.`
      }
    ]
  },

  {
    id: 'spotting-scams',
    track: 'life',
    title: 'Spotting scams',
    summary: `Red flags, the most common schemes, and how to check anyone who offers you an investment.`,
    goals: [
      `Recognize the red flags of investment and money scams`,
      `Explain how pump and dumps, Ponzi schemes, and pyramid schemes work`,
      `Verify people and offers, and know what to do if you are targeted`
    ],
    sections: [
      {
        id: 'size',
        title: 'A $15.9 billion problem',
        html: `
<p>Americans reported losing <strong>$15.9 billion</strong> to fraud in 2025, according to the Federal Trade Commission, up from about $12 billion the year before. Investment scams caused the biggest losses of any category: <strong>$7.9 billion</strong>. Scammers target young people online because they know you are curious about money and comfortable with apps.</p>`
      },
      {
        id: 'flags',
        title: 'Red flags',
        html: `
<ul>
  <li><strong>Guaranteed high returns</strong> or "no risk."</li>
  <li><strong>Pressure to act now:</strong> "only a few spots left," "offer ends tonight."</li>
  <li><strong>Payment by gift cards, crypto, or payment apps</strong> to someone you met online.</li>
  <li><strong>Flexing:</strong> cars, cash, and screenshots of gains used as proof.</li>
  <li><strong>Recruiting:</strong> you earn by bringing in friends.</li>
  <li><strong>Secrecy:</strong> "do not tell your parents, they will not understand."</li>
</ul>`
      },
      {
        id: 'schemes',
        title: 'How the big schemes work',
        html: `
<ul>
  <li><strong>Pump and dump:</strong> organizers buy a tiny stock or coin cheap, hype it online, and sell to the people who buy the hype. When the pushing stops, the price collapses.</li>
  <li><strong>Ponzi scheme:</strong> "returns" paid to early investors come from newer investors' money, until new money stops coming. It is named for Charles Ponzi, who ran one in 1920. Bernie Madoff ran the largest known Ponzi scheme until it collapsed in 2008.</li>
  <li><strong>Pyramid scheme:</strong> you earn mainly by recruiting others who pay to join. The math guarantees that most people at the bottom lose.</li>
  <li><strong>Fake trading apps and "account managers":</strong> they show big gains on screen and never let you withdraw. Some build a friendship over weeks first.</li>
</ul>`
      },
      {
        id: 'teen-scams',
        title: 'Scams aimed at teens',
        html: `
<ul>
  <li><strong>Fake check scams:</strong> a "job" or online buyer sends a check and asks you to deposit it and send part of the money back or to a "supplier." Days later the check bounces, and you owe the bank the full amount.</li>
  <li><strong>Money mules:</strong> someone offers you cash to receive money in your account and send it on. That money is often stolen, and moving it can be a crime.</li>
  <li><strong>Phishing:</strong> texts and emails that look like your bank or a delivery company, asking you to "verify" a login or pay a small fee.</li>
  <li><strong>Flipping and giveaway scams:</strong> "Send $50 and get $500 back."</li>
</ul>`
      },
      {
        id: 'social',
        title: 'Finfluencers and signal groups',
        html: `
<p>Some people who post about money are paid to promote products or own the stocks they hype. Screenshots of gains are easy to fake. Paid "signal" groups that tell you what to buy usually make their money from subscriptions. Licensed financial professionals are registered, and you can look them up.</p>`
      },
      {
        id: 'verify',
        title: 'Check before you trust',
        html: `
<ul>
  <li>Look up any broker or adviser on <strong>FINRA BrokerCheck</strong>.</li>
  <li>Read investor alerts at <strong>Investor.gov</strong> from the SEC.</li>
  <li>Log in to your bank by typing its address yourself or opening its app, never through a link in a message.</li>
  <li>Report fraud at <strong>ReportFraud.ftc.gov</strong> and talk to a trusted adult or mentor.</li>
</ul>`
      },
      {
        id: 'targeted',
        title: 'If it happens to you',
        html: `
<ol>
  <li>Stop responding, and send no more money, even to "unlock" a withdrawal.</li>
  <li>Tell a trusted adult or your mentor right away.</li>
  <li>Call your bank's or app's fraud line, using the number on its website or card.</li>
  <li>Report it at ReportFraud.ftc.gov, and change any passwords you shared.</li>
  <li>If you shared personal information, freeze your credit at each bureau. Freezes are free.</li>
</ol>
<p>Scammers are professionals, and anyone can be targeted. Speaking up quickly gives you the best chance to recover your money.</p>
<aside class="note idea"><b>Big idea</b><p>Real investing is patient and public. Anything rushed, secret, or guaranteed deserves a hard pause.</p></aside>`
      }
    ],
    takeaways: [
      `Investment scams cost Americans $7.9 billion in 2025, more than any other type of fraud.`,
      `Guarantees, pressure, secrecy, and recruiting are red flags.`,
      `Ponzi schemes pay old investors with new investors' money. Pyramid schemes pay for recruiting.`,
      `Never deposit a stranger's check and send money back, and never move money for someone else.`,
      `Verify on BrokerCheck, and report fraud at ReportFraud.ftc.gov.`
    ],
    discuss: [
      `Have you seen a post or message that looks like one of these schemes? What gave it away?`,
      `Why do scammers ask for secrecy?`
    ],
    videos: [yt('Watch Out for Pyramid Schemes', 'EGUywSX-cu8')],
    links: [BROKERCHECK, REPORT_FRAUD, INVESTOR_GOV],
    terms: ['pump-and-dump', 'ponzi-scheme', 'pyramid-scheme', 'money-mule', 'phishing', 'brokercheck'],
    exam: [
      {
        q: `Which is a red flag?`,
        choices: [`A registered broker you looked up on BrokerCheck`, `Guaranteed 20% a month with no risk`, `An index fund with a low fee`, `A savings account with FDIC insurance`],
        answer: 1,
        explain: `Guaranteed high returns with no risk do not exist in real investing.`
      },
      {
        q: `In a pump and dump, who usually profits?`,
        choices: [`The people who bought the hype late`, `The organizers who sell after the price jumps`, `Everyone equally`, `The SEC`],
        answer: 1,
        explain: `Organizers buy cheap, hype it, and sell to late buyers.`
      },
      {
        q: `Where can you check whether a broker is registered?`,
        choices: [`FINRA BrokerCheck`, `A comment section`, `The broker's own social media`, `A group chat`],
        answer: 0,
        explain: `BrokerCheck is FINRA's free tool for checking brokers and firms.`
      },
      {
        q: `According to the FTC, which type of fraud cost Americans the most money in 2025?`,
        choices: [`Investment scams`, `Lottery scams`, `Fake charities`, `Online shopping`],
        answer: 0,
        explain: `Investment scams cost $7.9 billion, the most of any category.`
      },
      {
        q: `In a Ponzi scheme, the "returns" paid to early investors come from:`,
        choices: [`Real business profits`, `Money from newer investors`, `The government`, `Stock dividends`],
        answer: 1,
        explain: `It collapses when new money stops coming in.`
      },
      {
        q: `A "job" sends you a $2,000 check and asks you to deposit it and send $1,500 to a supplier. What is this?`,
        choices: [`A normal hiring step`, `A fake check scam`, `A tax refund`, `A signing bonus`],
        answer: 1,
        explain: `The check bounces, and you owe the bank the money you sent.`
      },
      {
        q: `Someone offers you $200 to receive money in your bank account and send it on. What should you do?`,
        choices: [`Accept, it is easy money`, `Refuse: this is a money mule scheme and can be a crime`, `Ask for $400`, `Do it just once`],
        answer: 1,
        explain: `The money is often stolen, and moving it can make you part of the crime.`
      },
      {
        q: `A text that looks like your bank asks you to tap a link and verify your login. What is the best move?`,
        choices: [`Tap the link quickly`, `Reply with your password`, `Skip the link and open your bank's app or type its address yourself`, `Forward it to friends`],
        answer: 2,
        explain: `Go to your bank directly. Links in messages are a classic phishing trick.`
      }
    ]
  }
];
