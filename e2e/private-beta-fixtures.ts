export interface PrivateBetaBusinessFixture {
  name: string;
  idea: string;
  targetCustomer: string;
  businessModel: "physical_location" | "mobile" | "online" | "hybrid";
  city: string;
  county: string;
  state: string;
  zipCode: string;
  productOrService: string;
  customerProblem: string;
  differentiator: string;
  startupCosts: {
    space: string;
    equipment: string;
    inventory: string;
    other: string;
    rent: string;
  };
  money: {
    pricePerSale: string;
    weeklySales: string;
    ownerCapital: string;
    desiredFunding: string;
  };
  regulatedActivities: string[];
  hasEmployees: boolean | null;
  sellsTaxableGoodsOrServices: boolean | null;
  customersVisitLocation: boolean | null;
}

// Private beta smoke fixtures use fake business names and rough planning
// estimates only. Do not add SSNs, bank details, credit cards, private tax
// records, or real personal financial information to these fixtures.
export const vinylRecordStoreFixture: PrivateBetaBusinessFixture = {
  businessModel: "physical_location",
  city: "Tempe",
  county: "Maricopa",
  customerProblem:
    "Local music fans want a place to discover records, meet people, and support artists.",
  customersVisitLocation: true,
  differentiator:
    "A carefully curated punk and metal selection with local artists featured in the store.",
  hasEmployees: true,
  idea:
    "I want to open a punk record store near ASU that also sells shirts and local art.",
  money: {
    desiredFunding: "15000",
    ownerCapital: "10000",
    pricePerSale: "28",
    weeklySales: "90",
  },
  name: "Needle & Groove Records",
  productOrService:
    "New and used records, band shirts, local art, and small in-store events.",
  regulatedActivities: [],
  sellsTaxableGoodsOrServices: true,
  startupCosts: {
    equipment: "3500",
    inventory: "12000",
    other: "2500",
    rent: "2400",
    space: "5000",
  },
  state: "AZ",
  targetCustomer: "College students near ASU and local punk and metal fans.",
  zipCode: "85281",
};

export const foodTruckFixture: PrivateBetaBusinessFixture = {
  businessModel: "mobile",
  city: "Phoenix",
  county: "Maricopa",
  customerProblem:
    "Event customers want convenient food with a focused menu and quick service.",
  customersVisitLocation: false,
  differentiator:
    "A focused taco menu that can serve events, offices, and neighborhood pop-ups quickly.",
  hasEmployees: true,
  idea: "I want to start a food truck selling tacos and drinks at events in Phoenix.",
  money: {
    desiredFunding: "30000",
    ownerCapital: "12000",
    pricePerSale: "16",
    weeklySales: "350",
  },
  name: "Desert Bites Food Truck",
  productOrService: "Tacos, drinks, and event catering packages.",
  regulatedActivities: ["food"],
  sellsTaxableGoodsOrServices: true,
  startupCosts: {
    equipment: "25000",
    inventory: "3000",
    other: "7000",
    rent: "0",
    space: "5000",
  },
  state: "AZ",
  targetCustomer: "Event attendees, office workers, and local food-truck customers in Phoenix.",
  zipCode: "85004",
};
