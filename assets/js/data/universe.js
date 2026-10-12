// Featured symbols: curated companies and funds students recognize.
// Students can still search and trade any listed U.S. stock or ETF when live data is connected.
// `demo` holds a starting price and yearly volatility used only by the simulated demo market.
// scripts/gen-seed.mjs turns this list into supabase/seed.sql so both stay in sync.

export const COLLECTIONS = [
  { id: 'brands', title: 'Brands you know' },
  { id: 'tech', title: 'Tech giants' },
  { id: 'chips', title: 'Chips and AI' },
  { id: 'style', title: 'Sneakers and style' },
  { id: 'food', title: 'Food and drink' },
  { id: 'play', title: 'Games, music, and streaming' },
  { id: 'money', title: 'Banks and payments' },
  { id: 'move', title: 'Cars and getting around' },
  { id: 'health', title: 'Health' },
  { id: 'core', title: 'Industry and everyday essentials' },
  { id: 'etfs', title: 'Index funds and ETFs' }
];

export const UNIVERSE = [
  // Tech giants
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', sector: 'Information Technology', collections: ['tech', 'brands'], blurb: 'Makes the iPhone, Mac, iPad, and AirPods, and runs the App Store.', demo: [255, 0.26] },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', sector: 'Information Technology', collections: ['tech'], blurb: 'Makes Windows, Office, Xbox, and the Azure cloud platform.', demo: [505, 0.24] },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', type: 'stock', sector: 'Communication Services', collections: ['tech'], blurb: 'Parent company of Google Search, YouTube, Android, and Google Cloud.', demo: [245, 0.30] },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', type: 'stock', sector: 'Consumer Discretionary', collections: ['tech', 'brands'], blurb: 'Runs the biggest online store in the U.S., Prime Video, and Amazon Web Services.', demo: [225, 0.30] },
  { symbol: 'META', name: 'Meta Platforms, Inc.', type: 'stock', sector: 'Communication Services', collections: ['tech'], blurb: 'Owns Instagram, Facebook, WhatsApp, and Threads, and earns most of its money from ads.', demo: [720, 0.36] },
  { symbol: 'TSLA', name: 'Tesla, Inc.', type: 'stock', sector: 'Consumer Discretionary', collections: ['tech', 'move'], blurb: 'Builds electric cars, batteries, and solar products.', demo: [340, 0.60] },
  { symbol: 'NFLX', name: 'Netflix, Inc.', type: 'stock', sector: 'Communication Services', collections: ['play', 'brands'], blurb: 'The largest paid streaming service, with shows, movies, live events, and games.', demo: [1150, 0.34] },
  { symbol: 'ADBE', name: 'Adobe Inc.', type: 'stock', sector: 'Information Technology', collections: ['tech'], blurb: 'Makes creative software like Photoshop, Premiere Pro, and Acrobat.', demo: [380, 0.32] },
  { symbol: 'CRM', name: 'Salesforce, Inc.', type: 'stock', sector: 'Information Technology', collections: ['tech'], blurb: 'Sells cloud software that companies use to manage customers and sales.', demo: [260, 0.32] },
  { symbol: 'ORCL', name: 'Oracle Corporation', type: 'stock', sector: 'Information Technology', collections: ['tech'], blurb: 'Sells database software and cloud computing to businesses.', demo: [230, 0.40] },

  // Chips and AI
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', sector: 'Information Technology', collections: ['chips', 'tech'], blurb: 'Designs the graphics chips that power gaming and most AI data centers.', demo: [180, 0.48] },
  { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', type: 'stock', sector: 'Information Technology', collections: ['chips'], blurb: 'Designs processors and graphics chips for PCs, game consoles, and data centers.', demo: [165, 0.50] },
  { symbol: 'AVGO', name: 'Broadcom Inc.', type: 'stock', sector: 'Information Technology', collections: ['chips'], blurb: 'Makes networking and custom AI chips, plus enterprise software.', demo: [330, 0.42] },
  { symbol: 'TSM', name: 'Taiwan Semiconductor Manufacturing', type: 'stock', sector: 'Information Technology', collections: ['chips'], blurb: 'Manufactures chips for Apple, NVIDIA, AMD, and many others. Its U.S. shares are ADRs.', demo: [250, 0.38] },
  { symbol: 'INTC', name: 'Intel Corporation', type: 'stock', sector: 'Information Technology', collections: ['chips'], blurb: 'Designs and manufactures processors for PCs and servers.', demo: [30, 0.50] },
  { symbol: 'QCOM', name: 'Qualcomm Incorporated', type: 'stock', sector: 'Information Technology', collections: ['chips'], blurb: 'Designs the chips and wireless technology inside many Android phones.', demo: [165, 0.34] },
  { symbol: 'ARM', name: 'Arm Holdings plc', type: 'stock', sector: 'Information Technology', collections: ['chips'], blurb: 'Designs the chip blueprints used in nearly every smartphone.', demo: [150, 0.60] },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc.', type: 'stock', sector: 'Information Technology', collections: ['chips', 'tech'], blurb: 'Builds data analysis and AI software for governments and large companies.', demo: [160, 0.70] },

  // Sneakers and style
  { symbol: 'NKE', name: 'NIKE, Inc.', type: 'stock', sector: 'Consumer Discretionary', collections: ['style', 'brands'], blurb: 'The world\'s largest athletic shoe and apparel brand, including Jordan and Converse.', demo: [72, 0.34] },
  { symbol: 'LULU', name: 'lululemon athletica inc.', type: 'stock', sector: 'Consumer Discretionary', collections: ['style'], blurb: 'Sells athletic and casual clothing for workouts and everyday wear.', demo: [190, 0.42] },
  { symbol: 'DECK', name: 'Deckers Outdoor Corporation', type: 'stock', sector: 'Consumer Discretionary', collections: ['style'], blurb: 'Owns HOKA running shoes and UGG boots.', demo: [110, 0.48] },
  { symbol: 'ONON', name: 'On Holding AG', type: 'stock', sector: 'Consumer Discretionary', collections: ['style'], blurb: 'Swiss maker of On running shoes and apparel.', demo: [45, 0.50] },
  { symbol: 'CROX', name: 'Crocs, Inc.', type: 'stock', sector: 'Consumer Discretionary', collections: ['style'], blurb: 'Makes Crocs clogs and HEYDUDE shoes.', demo: [90, 0.46] },
  { symbol: 'UAA', name: 'Under Armour, Inc. (Class A)', type: 'stock', sector: 'Consumer Discretionary', collections: ['style'], blurb: 'Makes athletic apparel, shoes, and gear.', demo: [6, 0.50] },
  { symbol: 'DKS', name: "DICK'S Sporting Goods, Inc.", type: 'stock', sector: 'Consumer Discretionary', collections: ['style'], blurb: 'Sporting goods retailer that also owns Foot Locker.', demo: [215, 0.36] },
  { symbol: 'RL', name: 'Ralph Lauren Corporation', type: 'stock', sector: 'Consumer Discretionary', collections: ['style'], blurb: 'Designs Polo Ralph Lauren clothing and accessories.', demo: [300, 0.32] },
  { symbol: 'TPR', name: 'Tapestry, Inc.', type: 'stock', sector: 'Consumer Discretionary', collections: ['style'], blurb: 'Owns the Coach and Kate Spade fashion brands.', demo: [105, 0.38] },

  // Food and drink
  { symbol: 'MCD', name: "McDonald's Corporation", type: 'stock', sector: 'Consumer Discretionary', collections: ['food', 'brands'], blurb: 'The world\'s biggest fast-food chain. Most locations are run by franchise owners.', demo: [300, 0.18] },
  { symbol: 'SBUX', name: 'Starbucks Corporation', type: 'stock', sector: 'Consumer Discretionary', collections: ['food', 'brands'], blurb: 'Runs tens of thousands of coffee shops around the world.', demo: [88, 0.30] },
  { symbol: 'CMG', name: 'Chipotle Mexican Grill, Inc.', type: 'stock', sector: 'Consumer Discretionary', collections: ['food'], blurb: 'Fast-casual burrito and bowl restaurants.', demo: [45, 0.34] },
  { symbol: 'WING', name: 'Wingstop Inc.', type: 'stock', sector: 'Consumer Discretionary', collections: ['food'], blurb: 'Chicken wing restaurants, mostly run by franchise owners.', demo: [300, 0.45] },
  { symbol: 'CAVA', name: 'CAVA Group, Inc.', type: 'stock', sector: 'Consumer Discretionary', collections: ['food'], blurb: 'Fast-casual Mediterranean restaurants.', demo: [70, 0.60] },
  { symbol: 'DPZ', name: "Domino's Pizza, Inc.", type: 'stock', sector: 'Consumer Discretionary', collections: ['food'], blurb: 'The largest pizza delivery chain in the world.', demo: [440, 0.24] },
  { symbol: 'YUM', name: 'Yum! Brands, Inc.', type: 'stock', sector: 'Consumer Discretionary', collections: ['food'], blurb: 'Owns KFC, Taco Bell, and Pizza Hut.', demo: [150, 0.20] },
  { symbol: 'KO', name: 'The Coca-Cola Company', type: 'stock', sector: 'Consumer Staples', collections: ['food', 'brands'], blurb: 'Makes Coca-Cola, Sprite, Powerade, and hundreds of other drinks.', demo: [70, 0.16] },
  { symbol: 'PEP', name: 'PepsiCo, Inc.', type: 'stock', sector: 'Consumer Staples', collections: ['food', 'brands'], blurb: 'Makes Pepsi, Gatorade, Doritos, Cheetos, and Quaker oats.', demo: [145, 0.18] },

  // Games, music, and streaming
  { symbol: 'DIS', name: 'The Walt Disney Company', type: 'stock', sector: 'Communication Services', collections: ['play', 'brands'], blurb: 'Owns Disney, Pixar, Marvel, Star Wars, ESPN, theme parks, and Disney+.', demo: [115, 0.28] },
  { symbol: 'RBLX', name: 'Roblox Corporation', type: 'stock', sector: 'Communication Services', collections: ['play'], blurb: 'Runs the Roblox platform, where players create and play games.', demo: [120, 0.60] },
  { symbol: 'TTWO', name: 'Take-Two Interactive Software, Inc.', type: 'stock', sector: 'Communication Services', collections: ['play'], blurb: 'Publishes Grand Theft Auto, NBA 2K, and Red Dead Redemption.', demo: [240, 0.30] },
  { symbol: 'SONY', name: 'Sony Group Corporation', type: 'stock', sector: 'Consumer Discretionary', collections: ['play'], blurb: 'Makes PlayStation, runs Sony Music and Sony Pictures. Its U.S. shares are ADRs.', demo: [27, 0.30] },
  { symbol: 'SPOT', name: 'Spotify Technology S.A.', type: 'stock', sector: 'Communication Services', collections: ['play', 'brands'], blurb: 'The largest music and podcast streaming service.', demo: [680, 0.45] },
  { symbol: 'LYV', name: 'Live Nation Entertainment, Inc.', type: 'stock', sector: 'Communication Services', collections: ['play'], blurb: 'Promotes concerts and owns Ticketmaster.', demo: [150, 0.30] },
  { symbol: 'WMG', name: 'Warner Music Group Corp.', type: 'stock', sector: 'Communication Services', collections: ['play'], blurb: 'Record label home to Atlantic Records and many of today\'s biggest artists.', demo: [30, 0.30] },

  // Banks and payments
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'stock', sector: 'Financials', collections: ['money'], blurb: 'The largest U.S. bank, with Chase branches, credit cards, and an investment bank.', demo: [300, 0.22] },
  { symbol: 'BAC', name: 'Bank of America Corporation', type: 'stock', sector: 'Financials', collections: ['money'], blurb: 'One of the largest U.S. banks, plus Merrill investing.', demo: [50, 0.26] },
  { symbol: 'WFC', name: 'Wells Fargo & Company', type: 'stock', sector: 'Financials', collections: ['money'], blurb: 'A major U.S. bank for consumers and businesses.', demo: [80, 0.28] },
  { symbol: 'C', name: 'Citigroup Inc.', type: 'stock', sector: 'Financials', collections: ['money'], blurb: 'A global bank with Citi credit cards and branches in New York.', demo: [95, 0.30] },
  { symbol: 'GS', name: 'The Goldman Sachs Group, Inc.', type: 'stock', sector: 'Financials', collections: ['money'], blurb: 'An investment bank that advises companies and manages money.', demo: [750, 0.28] },
  { symbol: 'MS', name: 'Morgan Stanley', type: 'stock', sector: 'Financials', collections: ['money'], blurb: 'An investment bank and one of the largest wealth managers.', demo: [150, 0.28] },
  { symbol: 'SCHW', name: 'The Charles Schwab Corporation', type: 'stock', sector: 'Financials', collections: ['money'], blurb: 'One of the largest brokerages where people invest and trade.', demo: [95, 0.28] },
  { symbol: 'AXP', name: 'American Express Company', type: 'stock', sector: 'Financials', collections: ['money'], blurb: 'Issues credit cards and runs its own payment network.', demo: [330, 0.26] },
  { symbol: 'V', name: 'Visa Inc.', type: 'stock', sector: 'Financials', collections: ['money', 'brands'], blurb: 'Runs the largest card payment network. It earns a small fee on each swipe.', demo: [345, 0.20] },
  { symbol: 'MA', name: 'Mastercard Incorporated', type: 'stock', sector: 'Financials', collections: ['money'], blurb: 'Runs a global card payment network.', demo: [570, 0.20] },
  { symbol: 'PYPL', name: 'PayPal Holdings, Inc.', type: 'stock', sector: 'Financials', collections: ['money'], blurb: 'Owns PayPal and Venmo.', demo: [70, 0.36] },
  { symbol: 'XYZ', name: 'Block, Inc.', type: 'stock', sector: 'Financials', collections: ['money'], blurb: 'Owns Cash App, Square payments, and Afterpay.', demo: [70, 0.50] },
  { symbol: 'SOFI', name: 'SoFi Technologies, Inc.', type: 'stock', sector: 'Financials', collections: ['money'], blurb: 'An online bank offering loans, banking, and investing in one app.', demo: [25, 0.60] },
  { symbol: 'HOOD', name: 'Robinhood Markets, Inc.', type: 'stock', sector: 'Financials', collections: ['money'], blurb: 'Runs the Robinhood investing app.', demo: [110, 0.70] },

  // Cars and getting around
  { symbol: 'F', name: 'Ford Motor Company', type: 'stock', sector: 'Consumer Discretionary', collections: ['move'], blurb: 'Builds the F-150, Mustang, and Bronco.', demo: [12, 0.34] },
  { symbol: 'GM', name: 'General Motors Company', type: 'stock', sector: 'Consumer Discretionary', collections: ['move'], blurb: 'Builds Chevrolet, GMC, Cadillac, and Buick vehicles.', demo: [60, 0.32] },
  { symbol: 'TM', name: 'Toyota Motor Corporation', type: 'stock', sector: 'Consumer Discretionary', collections: ['move'], blurb: 'The world\'s largest carmaker by vehicles sold. Its U.S. shares are ADRs.', demo: [195, 0.24] },
  { symbol: 'RIVN', name: 'Rivian Automotive, Inc.', type: 'stock', sector: 'Consumer Discretionary', collections: ['move'], blurb: 'Builds electric trucks, SUVs, and delivery vans.', demo: [14, 0.65] },
  { symbol: 'UBER', name: 'Uber Technologies, Inc.', type: 'stock', sector: 'Industrials', collections: ['move', 'brands'], blurb: 'Runs the Uber ride app and Uber Eats delivery.', demo: [95, 0.38] },

  // Health
  { symbol: 'LLY', name: 'Eli Lilly and Company', type: 'stock', sector: 'Health Care', collections: ['health'], blurb: 'Drug maker known for diabetes and weight-loss medicines.', demo: [800, 0.34] },
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'stock', sector: 'Health Care', collections: ['health'], blurb: 'Makes medicines and medical devices.', demo: [175, 0.16] },
  { symbol: 'PFE', name: 'Pfizer Inc.', type: 'stock', sector: 'Health Care', collections: ['health'], blurb: 'One of the largest drug makers in the world.', demo: [25, 0.24] },
  { symbol: 'MRK', name: 'Merck & Co., Inc.', type: 'stock', sector: 'Health Care', collections: ['health'], blurb: 'Drug and vaccine maker.', demo: [90, 0.24] },
  { symbol: 'ABBV', name: 'AbbVie Inc.', type: 'stock', sector: 'Health Care', collections: ['health'], blurb: 'Drug maker focused on immune diseases, cancer, and neuroscience.', demo: [210, 0.24] },
  { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', type: 'stock', sector: 'Health Care', collections: ['health'], blurb: 'The largest U.S. health insurer.', demo: [330, 0.40] },
  { symbol: 'CVS', name: 'CVS Health Corporation', type: 'stock', sector: 'Health Care', collections: ['health'], blurb: 'Runs CVS pharmacies and the Aetna insurance company.', demo: [75, 0.32] },

  // Industry and everyday essentials
  { symbol: 'WMT', name: 'Walmart Inc.', type: 'stock', sector: 'Consumer Staples', collections: ['core', 'brands'], blurb: 'The largest retailer in the world.', demo: [100, 0.20] },
  { symbol: 'COST', name: 'Costco Wholesale Corporation', type: 'stock', sector: 'Consumer Staples', collections: ['core', 'brands'], blurb: 'Membership warehouse stores. Most of its profit comes from membership fees.', demo: [950, 0.22] },
  { symbol: 'TGT', name: 'Target Corporation', type: 'stock', sector: 'Consumer Staples', collections: ['core', 'brands'], blurb: 'Discount retailer with about 2,000 U.S. stores.', demo: [95, 0.34] },
  { symbol: 'HD', name: 'The Home Depot, Inc.', type: 'stock', sector: 'Consumer Discretionary', collections: ['core'], blurb: 'The largest home improvement retailer.', demo: [390, 0.22] },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', type: 'stock', sector: 'Energy', collections: ['core'], blurb: 'One of the largest oil and gas companies.', demo: [112, 0.24] },
  { symbol: 'CVX', name: 'Chevron Corporation', type: 'stock', sector: 'Energy', collections: ['core'], blurb: 'Oil and gas company with gas stations under the Chevron and Texaco names.', demo: [155, 0.24] },
  { symbol: 'NEE', name: 'NextEra Energy, Inc.', type: 'stock', sector: 'Utilities', collections: ['core'], blurb: 'An electric utility and one of the largest producers of wind and solar power.', demo: [75, 0.24] },
  { symbol: 'O', name: 'Realty Income Corporation', type: 'stock', sector: 'Real Estate', collections: ['core'], blurb: 'Owns thousands of buildings leased to stores and pays a monthly dividend.', demo: [58, 0.18] },
  { symbol: 'LIN', name: 'Linde plc', type: 'stock', sector: 'Materials', collections: ['core'], blurb: 'Supplies industrial gases like oxygen and hydrogen to hospitals and factories.', demo: [460, 0.18] },
  { symbol: 'CAT', name: 'Caterpillar Inc.', type: 'stock', sector: 'Industrials', collections: ['core'], blurb: 'Makes construction and mining equipment.', demo: [430, 0.28] },
  { symbol: 'BA', name: 'The Boeing Company', type: 'stock', sector: 'Industrials', collections: ['core', 'move'], blurb: 'Builds commercial jets, defense aircraft, and spacecraft.', demo: [220, 0.36] },
  { symbol: 'UPS', name: 'United Parcel Service, Inc.', type: 'stock', sector: 'Industrials', collections: ['core'], blurb: 'Delivers packages around the world.', demo: [90, 0.28] },
  { symbol: 'T', name: 'AT&T Inc.', type: 'stock', sector: 'Communication Services', collections: ['core'], blurb: 'Phone, wireless, and internet provider.', demo: [27, 0.20] },
  { symbol: 'VZ', name: 'Verizon Communications Inc.', type: 'stock', sector: 'Communication Services', collections: ['core'], blurb: 'Wireless and home internet provider.', demo: [42, 0.18] },
  { symbol: 'TMUS', name: 'T-Mobile US, Inc.', type: 'stock', sector: 'Communication Services', collections: ['core'], blurb: 'Wireless carrier, including Metro by T-Mobile.', demo: [240, 0.22] },

  // Index funds and ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Tracks the S&P 500: about 500 of the largest U.S. companies in one share. This game\'s benchmark.', demo: [660, 0.16] },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Tracks the S&P 500 at a very low yearly fee.', demo: [605, 0.16] },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Owns nearly every public U.S. company, large and small.', demo: [320, 0.17] },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Tracks the Nasdaq-100: 100 large companies listed on Nasdaq, heavy in technology.', demo: [590, 0.21] },
  { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Tracks the Dow Jones Industrial Average of 30 large U.S. companies.', demo: [460, 0.15] },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Tracks 2,000 smaller U.S. companies.', demo: [235, 0.22] },
  { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Owns thousands of companies outside the U.S.', demo: [70, 0.15] },
  { symbol: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Owns about 100 U.S. companies with strong records of paying dividends.', demo: [28, 0.14] },
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Owns thousands of U.S. government and corporate bonds. Much steadier than stocks.', demo: [74, 0.05] },
  { symbol: 'GLD', name: 'SPDR Gold Shares', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Holds gold bars in vaults, so its price follows the price of gold, minus a small yearly fee.', demo: [370, 0.15] },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR Fund', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Owns the technology companies in the S&P 500.', demo: [270, 0.22] },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR Fund', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Owns the banks, insurers, and payment companies in the S&P 500.', demo: [52, 0.18] },
  { symbol: 'XLV', name: 'Health Care Select Sector SPDR Fund', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Owns the health care companies in the S&P 500.', demo: [140, 0.15] },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR Fund', type: 'etf', sector: 'Fund', collections: ['etfs'], blurb: 'Owns the oil, gas, and energy companies in the S&P 500.', demo: [88, 0.24] }
];

export const BENCHMARK_SYMBOL = 'SPY';

export function universeEntry(symbol) {
  return UNIVERSE.find((u) => u.symbol === symbol) || null;
}
