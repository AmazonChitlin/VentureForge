export const beginnerHelpContent = {
  targetCustomer:
    "Your target customer is the first kind of person or business most likely to buy from you. Start with one group and change it later as you learn.",
  competitor:
    "A competitor is another business or option a customer could choose instead. It can be direct, like another record store, or indirect, like streaming music.",
  startupCosts:
    "Startup costs are the things you need to pay for before opening, such as equipment, inventory, deposits, or permits.",
  fixedCosts:
    "Fixed costs are bills that are usually due each month even when sales change, such as rent, insurance, or software.",
  variableCosts:
    "Variable costs rise when you sell more, such as ingredients, packaging, or materials for each job.",
  breakEven:
    "Break-even means the point where your sales cover your costs. After that point, the business can start making profit.",
  funding:
    "Funding is money used to start or grow the business. It might come from savings, a loan, a grant, or an investor.",
  cashFlow:
    "Cash flow is the money coming in and going out over time. A business can have sales and still run short of cash if bills are due first.",
  businessModel:
    "Your business model is the simple way the business works: what you sell, who buys it, and how money comes in.",
  legalStructure:
    "A legal structure is the official setup for the business, such as a sole proprietorship or LLC. An attorney or tax professional can help you choose.",
  permit:
    "A permit is approval from an agency for a certain activity or location. The right permits depend on your state, city, and type of business.",
  salesTax:
    "Sales tax is money some businesses collect from customers and send to the state or local government. Rules depend on what and where you sell.",
  marketResearch:
    "Market research is how you learn whether people may buy, what they need, and what alternatives already exist. It uses questions, observations, and reliable data.",
  competitiveAdvantage:
    "A competitive advantage is a practical reason a customer may choose you, such as convenience, specialization, speed, price, or trust.",
} as const;

export type BeginnerHelpTerm = keyof typeof beginnerHelpContent;
