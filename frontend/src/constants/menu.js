import {
  Home, TrendingUp, ShoppingCart, DollarSign,
  Users, BadgeDollarSign, ArrowRightLeft, BriefcaseBusiness,
  BadgePercent, FileSpreadsheet, FolderKanban, Wallet, Landmark,
  UsersRound, SquarePercent, ChartCandlestick, BookOpenCheck,
  BanknoteIcon, BookUp2, AppWindow,LucideBriefcaseBusiness,BadgePlus,
  UserSearch,UserCog,UserPlus2,
  BadgeInfoIcon
} from 'lucide-react';

const menu = [
  {
    menuName: "Dashboard",
    url: "/",
    roles: ["admin", "super_admin", "user"], // Available to all roles
    icon: Home,
  },




  {
    menuName: "User Management",
    roles: ["admin", "super_admin"], // Available to all but different access
    icon: UserCog,
    children: [
      {
        menuName: "Users",
        url: "/users",
        roles: ["super_admin"],
        icon: UserSearch,
      },
      // {
      //   menuName: "User Details",
      //   url: "/user-details",
      //   roles: ["super_admin"],
      //   icon: Users,
      // },
      {
        menuName: "User Registration",
        url: "/user-registration",
        roles: ["super_admin"],
        icon: UserPlus2,
      },
    ],
  },
  {
    menuName: "Accounting",
    roles: ["admin", "super_admin"], // Available to all but different access
    icon: LucideBriefcaseBusiness,
    children: [
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

    ],
  },



  {
    menuName: "Project",
    roles: ["admin", "super_admin"], // Available to all but different access
    icon: AppWindow,
    children: [
      {
        menuName: "Create Project",
        url: "/create-project",
        roles: ["admin", "super_admin"],
        icon: FolderKanban,
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
        menuName: "Close Project",
        url: "/close-project",
        roles: ["admin", "super_admin"],
        icon: BookOpenCheck,
      },
    ],
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
        roles: ["admin", "super_admin"],
        icon: SquarePercent,
      },
      {
        menuName: "Trade Details",
        url: "/trade-details",
        roles: ["admin", "super_admin"],
        icon: ChartCandlestick,
      },
      {
        menuName: "Transaction History",
        url: "/trans-history",
        roles: ["user"],
        icon: BanknoteIcon,
      },
      {
        menuName: "Investment History",
        url: "/investment-history",
        roles: ["user"],
        icon: BookUp2,
      },
      {
        menuName: "Profit Details",
        url: "/profit-details",
        roles: ["user"],
        icon: BadgePlus,
      },
      {
        menuName:"Project Detaitls",
        url:"/project-details",
        roles:["admin"],
        icon:BadgeInfoIcon
      }
    ],
  },
];

export default menu;