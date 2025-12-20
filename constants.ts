import { CashFlowData, DashboardStat } from './types';

export const MOCK_STATS: DashboardStat[] = [
  {
    label: 'To Receive',
    value: 1069528.95,
    type: 'money-in',
    color: 'green'
  },
  {
    label: 'To Give',
    value: 56053,
    type: 'money-out',
    color: 'red'
  },
  {
    label: 'Sales (Mangsir)',
    value: 926823.64,
    type: 'money-in',
    period: 'Mangsir',
    color: 'green'
  },
  {
    label: 'Purchase (Mangsir)',
    value: 385490,
    type: 'neutral',
    period: 'Mangsir',
    color: 'blue'
  },
  {
    label: 'Expense (Mangsir)',
    value: 13920,
    type: 'money-out',
    period: 'Mangsir',
    color: 'red'
  }
];

export const MOCK_CHART_DATA: CashFlowData[] = [
  { day: 'Man 15', moneyIn: 180000, moneyOut: 20000 },
  { day: 'Man 16', moneyIn: 80000, moneyOut: 15000 },
  { day: 'Man 17', moneyIn: 5000, moneyOut: 5000 },
  { day: 'Man 18', moneyIn: 12000, moneyOut: 8000 },
  { day: 'Man 19', moneyIn: 150000, moneyOut: 30000 },
  { day: 'Man 20', moneyIn: 25000, moneyOut: 10000 },
  { day: 'Man 21', moneyIn: 10000, moneyOut: 650000 },
];
