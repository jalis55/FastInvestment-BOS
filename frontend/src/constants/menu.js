import {
  Home, TrendingUp, ShoppingCart, DollarSign,
  Users, BadgeDollarSign, ArrowRightLeft, BriefcaseBusiness,
  BadgePercent, FileSpreadsheet, FolderKanban, Wallet, Landmark,
  UsersRound, SquarePercent, ChartCandlestick, BookOpenCheck
} from 'lucide-react';

const menu = [
  {
    menuName: "Dashboard",
    url: "/",
    roles: ["admin", "super_admin", "user"], // Available to all roles
    icon: Home,
  },
  {
    menuName: "Users",
    url: "/users",
    roles: ["super_admin"],
    icon: Users,
  },
  {
    menuName: "Transaction",
    url: "/transaction",
    roles: ["admin", "super_admin"],
    icon: Landmark,
  },
  {
    menuName: "Fund Transfer",
    url: "/fund-transfer",
    roles: ["admin", "super_admin"],
    icon: ArrowRightLeft,
  },
  {
    menuName: "Pending Payments",
    url: "/pending-payments",
    roles: ["super_admin"], // Only for super_admin
    icon: Wallet,
  },
  {
    menuName: "Create Project",
    url: "/create-project",
    roles: ["admin", "super_admin"],
    icon: FolderKanban,
  },
  {
    menuName: "Close Project",
    url: "/close-project",
    roles: ["admin", "super_admin"],
    icon: BookOpenCheck,
  },
  {
    menuName: "Add Advisor",
    url: "/add-advisor",
    roles: ["admin", "super_admin"],
    icon: UsersRound,
  },
  {
    menuName: "Add Investments",
    url: "/add-investments",
    roles: ["admin", "super_admin"],
    icon: BriefcaseBusiness,
  },
  {
    menuName: "Trade",
    roles: ["admin", "super_admin"], // Available to all but different access
    icon: TrendingUp,
    children: [
      {
        menuName: "Buy Instruments",
        url: "/buy-instruments",
        roles: ["admin", "super_admin"],
        icon: ShoppingCart,
      },
      {
        menuName: "Sell Instruments",
        url: "/sell-instruments",
        roles: ["admin", "super_admin"],
        icon: DollarSign,
      },
    ],
  },
  {
    menuName: "Disburse Profit",
    url: "/disburse-profit",
    roles: ["admin", "super_admin"],
    icon: BadgePercent,
  },
  {
    menuName: "Reports",
    roles: ["user", "admin", "super_admin"],
    icon: FileSpreadsheet,
    children: [
      {
        menuName: "Acc Receivable Details",
        url: "/acc-rec-details",
        roles: ["user", "admin", "super_admin"],
        icon: SquarePercent,
      },
      {
        menuName: "Trade Details",
        url: "/trade-details",
        roles: ["user", "admin", "super_admin"],
        icon: ChartCandlestick,
      },
    ],
  },
];

export default menu;