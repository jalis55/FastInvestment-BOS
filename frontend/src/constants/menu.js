// src/menu.js
import {
  Home, TrendingUp, ShoppingCart, DollarSign,
  Users, BadgeDollarSign, ArrowRightLeft, BriefcaseBusiness,
  BadgePercent,FileSpreadsheet,FolderKanban,Wallet,Landmark
  ,UsersRound,SquarePercent,ChartCandlestick,BookOpenCheck
} from 'lucide-react';

const menu = [
  {
    menuName: "Dashboard",
    url: "/",
    role: "admin",
    icon: Home,
  }
  ,
  {
    menuName: "Users",
    url: "/users",
    role: "admin",
    icon: Users,
  }
  ,
  {
    menuName: "Transaction",
    url: "/transaction",
    role: "admin",
    icon: Landmark,
  }
  ,
  {
    menuName: "Pending Payments",
    url: "/pending-payments",
    role: "admin",
    icon: Wallet,
  }
  ,
  {
    menuName: "Create Project",
    url: "/create-project",
    role: "admin",
    icon: FolderKanban,
  }
  ,
  {
    menuName: "Close Project",
    url: "/close-project",
    role: "admin",
    icon: BookOpenCheck,
  }
  ,
  {
    menuName: "Add Advisor",
    url: "/add-advisor",
    role: "admin",
    icon: UsersRound,
  }
  ,
  {
    menuName: "Add Investments",
    url: "/add-investments",
    role: "admin",
    icon: BriefcaseBusiness,
  }
  ,
  {
    menuName: "Trade",
    role: "user",
    icon: TrendingUp,
    children: [
      {
        menuName: "Buy Instruments",
        url: "/buy-instruments",
        role: "user",
        icon: ShoppingCart,
      },
      {
        menuName: "Sell Instruments",
        url: "/sell-instruments",
        role: "user",
        icon: DollarSign,
      },

    ],
  },
  {
    menuName: "Disburse Profit",
    url: "/disburse-profit",
    role: "admin",
    icon: BadgePercent,
  }
  ,
  {
    menuName: "Reports",
    role: "user",
    icon: FileSpreadsheet,
    children: [
      {
        menuName: "Acc Receiable Details",
        url: "/acc-rec-details",
        role: "user",
        icon: SquarePercent,
      },
      {
        menuName: "Trade Details",
        url: "/trade-details",
        role: "user",
        icon: ChartCandlestick,
      },

    ],
  },

];

export default menu;
