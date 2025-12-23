import { GoogleGenAI } from "@google/genai";
import { db } from './db';
import { formatCurrency } from './formatService';
import { formatNepaliDate, getCurrentNepaliDate, adToBs } from './nepaliDateService';
import { Product } from '../types';

const getSystemContext = () => {
  const profile = db.getBusinessProfile();
  const products = db.getProducts();
  const parties = db.getParties();
  const transactions = db.getTransactions();
  const accounts = db.getAccounts();

  // 1. Basic Stats
  const totalReceivable = parties.reduce((acc, p) => p.balance > 0 ? acc + p.balance : acc, 0);
  const totalPayable = parties.reduce((acc, p) => p.balance < 0 ? acc + Math.abs(p.balance) : acc, 0);
  
  // 2. Inventory Summary
  const lowStockItems = products.filter(p => p.type !== 'service' && p.stock < 5).map(p => `${p.name} (${p.stock})`);
  const totalStockValue = products.reduce((acc, p) => acc + (p.stock * p.purchasePrice), 0);

  // 3. Profit & Loss Aggregation
  const productMap = new Map<string, Product>();
  products.forEach(p => productMap.set(p.id, p));

  let totalSales = 0;
  let totalReturns = 0;
  let totalCogs = 0;
  let totalExpenses = 0;
  const expenseBreakdown: Record<string, number> = {};

  transactions.forEach(t => {
      if (t.type === 'SALE') {
          totalSales += t.totalAmount;
          t.items?.forEach(item => {
              const p = productMap.get(item.productId);
              if (p && p.type !== 'service') {
                let qty = item.quantity;
                if (item.unit && p.secondaryUnit && item.unit === p.secondaryUnit && p.conversionRatio) {
                    qty = item.quantity / p.conversionRatio;
                }
                totalCogs += (qty * p.purchasePrice);
              }
          });
      } else if (t.type === 'SALE_RETURN') {
          totalReturns += t.totalAmount;
          t.items?.forEach(item => {
              const p = productMap.get(item.productId);
              if (p && p.type !== 'service') {
                let qty = item.quantity;
                if (item.unit && p.secondaryUnit && item.unit === p.secondaryUnit && p.conversionRatio) {
                    qty = item.quantity / p.conversionRatio;
                }
                totalCogs -= (qty * p.purchasePrice);
              }
          });
      } else if (t.type === 'EXPENSE') {
          totalExpenses += t.totalAmount;
          const cat = t.category || 'Other';
          expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + t.totalAmount;
      }
  });

  const netSales = totalSales - totalReturns;
  const grossProfit = netSales - totalCogs;
  const netProfit = grossProfit - totalExpenses;

  // 4. Accounts Summary
  const accountSummary = accounts.map(a => `- ${a.name} (${a.type}): ${formatCurrency(a.balance)}`).join('\n');

  // 5. Recent Activity (Last 20)
  const recentTxns = transactions.slice(-20).reverse().map(t => {
    return `- ${formatNepaliDate(t.date)}: ${t.type} | ${t.partyName} | ${formatCurrency(t.totalAmount)}`;
  }).join('\n');

  return `
    You are an expert business analyst for "${profile.name}".
    Current Date: AD ${new Date().toISOString().split('T')[0]} / BS ${getCurrentNepaliDate()}
    
    --- FINANCIAL OVERVIEW ---
    - Total Sales: ${formatCurrency(totalSales)}
    - Sales Returns: ${formatCurrency(totalReturns)}
    - Net Sales: ${formatCurrency(netSales)}
    - Total COGS (Cost of Goods Sold): ${formatCurrency(totalCogs)}
    - Gross Profit: ${formatCurrency(grossProfit)}
    - Total Operating Expenses: ${formatCurrency(totalExpenses)}
    - NET PROFIT: ${formatCurrency(netProfit)} (Net Margin: ${netSales > 0 ? ((netProfit/netSales)*100).toFixed(1) : 0}%)

    --- EXPENSE BREAKDOWN ---
    ${Object.entries(expenseBreakdown).map(([cat, amt]) => `- ${cat}: ${formatCurrency(amt)}`).join('\n')}

    --- CASH & BANK BALANCES ---
    ${accountSummary}

    --- PARTY BALANCES ---
    - Total Receivable (To Receive): ${formatCurrency(totalReceivable)}
    - Total Payable (To Give): ${formatCurrency(totalPayable)}

    --- INVENTORY STATUS ---
    - Total Stock Valuation (at Cost): ${formatCurrency(totalStockValue)}
    - Critical Low Stock Items: ${lowStockItems.length > 0 ? lowStockItems.join(', ') : 'None'}

    --- RECENT TRANSACTIONS (Last 20) ---
    ${recentTxns}
  `;
};

export const generateBusinessInsight = async (userQuery: string): Promise<string> => {
  try {
    // Initializing with process.env.API_KEY directly as per SDK guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = getSystemContext();

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        SYSTEM CONTEXT DATA:
        ${context}

        USER QUESTION: 
        "${userQuery}"

        AI INSTRUCTIONS:
        1. Use the provided financial data to answer the user query accurately.
        2. If asked about "Profit", refer to Net Profit unless Gross Profit is specified.
        3. If asked about "Cash", combine balances of all Cash and Wallet accounts.
        4. When the user uses Nepali names or dates, respond appropriately using the BS/Nepali format.
        5. Provide suggestions if metrics look bad (e.g., high expenses or low profit margins).
        6. Keep the tone professional but accessible.
      `,
      config: {
        systemInstruction: "You are a world-class Business Intelligence Assistant. You analyze sales, inventory, and profit data to help shop owners make better decisions.",
      }
    });

    // Access the .text property directly on the GenerateContentResponse object.
    return response.text || "I was unable to analyze that data. Could you please try rephrasing your question?";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "I am currently unable to reach my analytical engine. Please ensure your internet connection is stable and the API key is valid.";
  }
};