/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  BrainCircuit, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Smile,
  Trash2,
  Loader2,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Upload,
  FileText
} from 'lucide-react';
import Papa from 'papaparse';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { Trade, ASSET_TYPES, EMOTIONS, ENTRY_REASONS } from './types';
import { cn, formatCurrency } from './lib/utils';
import { analyzeTradingPatterns, analyzePortfolio, fetchCurrentMarketPrices } from './services/geminiService';

export default function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'log' | 'entry' | 'analysis' | 'portfolio'>('dashboard');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [portfolioAnalysis, setPortfolioAnalysis] = useState<string | null>(null);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingPortfolio, setAnalyzingPortfolio] = useState(false);
  const [fetchingPrices, setFetchingPrices] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Trade>>({
    date: new Date().toISOString().split('T')[0],
    type: 'Stock',
    emotion: 'Calm',
    discipline_score: 10,
    p_l: 0,
    asset: '',
    purchase_price: 0,
    selling_price: 0,
    purchase_qty: 0,
    sold_qty: 0,
    balance_qty: 0,
    entry_reason: 'Trend Following',
    exit_reason: '',
    notes: ''
  });

  // Calculate P/L and Balance Qty automatically
  useEffect(() => {
    const purchasePrice = formData.purchase_price || 0;
    const sellingPrice = formData.selling_price || 0;
    const purchaseQty = formData.purchase_qty || 0;
    const soldQty = formData.sold_qty || 0;

    const balanceQty = purchaseQty - soldQty;
    // P/L calculation: (Selling Price - Purchase Price) * Sold Qty
    const pl = (sellingPrice - purchasePrice) * soldQty;

    if (formData.balance_qty !== balanceQty || formData.p_l !== pl) {
      setFormData(prev => ({
        ...prev,
        balance_qty: balanceQty,
        p_l: pl
      }));
    }
  }, [formData.purchase_price, formData.selling_price, formData.purchase_qty, formData.sold_qty]);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/trades');
      const data = await res.json();
      setTrades(data);
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCsv(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedTrades = results.data.map((row: any) => ({
          date: row.date || new Date().toISOString().split('T')[0],
          asset: (row.asset || '').toUpperCase(),
          type: (ASSET_TYPES.includes(row.type) ? row.type : 'Stock') as any,
          purchase_price: parseFloat(row.purchase_price) || 0,
          selling_price: parseFloat(row.selling_price) || 0,
          purchase_qty: parseInt(row.purchase_qty) || 0,
          sold_qty: parseInt(row.sold_qty) || 0,
          balance_qty: (parseInt(row.purchase_qty) || 0) - (parseInt(row.sold_qty) || 0),
          p_l: (parseFloat(row.selling_price) || 0 - parseFloat(row.purchase_price) || 0) * (parseInt(row.sold_qty) || 0),
          entry_reason: row.entry_reason || 'Trend Following',
          exit_reason: row.exit_reason || '',
          emotion: (EMOTIONS.includes(row.emotion) ? row.emotion : 'Calm'),
          discipline_score: parseInt(row.discipline_score) || 10,
          notes: row.notes || ''
        }));

        let successCount = 0;
        for (const trade of parsedTrades) {
          try {
            const res = await fetch('/api/trades', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(trade)
            });
            if (res.ok) successCount++;
          } catch (error) {
            console.error('Failed to upload trade:', trade, error);
          }
        }

        alert(`Successfully uploaded ${successCount} trades.`);
        await fetchTrades();
        setUploadingCsv(false);
        if (e.target) e.target.value = '';
      },
      error: (error) => {
        console.error('CSV Parsing Error:', error);
        alert('Failed to parse CSV file.');
        setUploadingCsv(false);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await fetchTrades();
        setActiveTab('log');
        setFormData({
          date: new Date().toISOString().split('T')[0],
          type: 'Stock',
          emotion: 'Calm',
          discipline_score: 10,
          p_l: 0,
          asset: '',
          purchase_price: 0,
          selling_price: 0,
          purchase_qty: 0,
          sold_qty: 0,
          balance_qty: 0,
          entry_reason: 'Trend Following',
          exit_reason: '',
          notes: ''
        });
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to save trade'}`);
      }
    } catch (error) {
      console.error('Failed to save trade:', error);
      alert('Network error. Please check if the server is running.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTrade = async (id: number) => {
    if (!confirm('Delete this trade?')) return;
    try {
      await fetch(`/api/trades/${id}`, { method: 'DELETE' });
      fetchTrades();
    } catch (error) {
      console.error('Failed to delete trade:', error);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await analyzeTradingPatterns(trades);
      setAnalysis(result || "No analysis generated.");
      setActiveTab('analysis');
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const stats = {
    totalPL: trades.reduce((sum, t) => sum + t.p_l, 0),
    winRate: trades.length > 0 ? (trades.filter(t => t.p_l > 0).length / trades.length) * 100 : 0,
    avgDiscipline: trades.length > 0 ? trades.reduce((sum, t) => sum + t.discipline_score, 0) / trades.length : 0,
    bestAsset: trades.length > 0 ? Object.entries(trades.reduce((acc, t) => {
      acc[t.asset] = (acc[t.asset] || 0) + t.p_l;
      return acc;
    }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0] : 'N/A'
  };

  const chartData = [...trades].reverse().map(t => ({
    date: t.date,
    pl: t.p_l,
    cumulative: trades.filter(tr => tr.date <= t.date).reduce((sum, tr) => sum + tr.p_l, 0)
  }));

  const emotionData = Object.entries(trades.reduce((acc, t) => {
    acc[t.emotion] = (acc[t.emotion] || 0) + t.p_l;
    return acc;
  }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

  const refreshPrices = async () => {
    const symbols = Array.from(new Set(trades.map(t => t.asset)));
    if (symbols.length === 0) return;
    
    setFetchingPrices(true);
    try {
      const prices = await fetchCurrentMarketPrices(symbols);
      setCurrentPrices(prev => ({ ...prev, ...prices }));
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setFetchingPrices(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'portfolio' && trades.length > 0) {
      refreshPrices();
    }
  }, [activeTab, trades.length]);

  const runPortfolioAnalysis = async (portfolioData: any[]) => {
    setAnalyzingPortfolio(true);
    try {
      const result = await analyzePortfolio(portfolioData);
      setPortfolioAnalysis(result);
    } catch (error) {
      console.error('Portfolio analysis failed:', error);
    } finally {
      setAnalyzingPortfolio(false);
    }
  };

  const portfolio = Object.entries(trades.reduce((acc, t) => {
    if (!acc[t.asset]) {
      acc[t.asset] = { 
        asset: t.asset, 
        totalQty: 0, 
        totalCost: 0,
      };
    }
    acc[t.asset].totalQty += (t.purchase_qty - t.sold_qty);
    acc[t.asset].totalCost += (t.purchase_qty * t.purchase_price) - (t.sold_qty * t.purchase_price);
    return acc;
  }, {} as Record<string, any>))
  .filter(([_, data]) => data.totalQty > 0)
  .map(([_, data]) => {
    const avgPrice = data.totalCost / data.totalQty;
    // Use real-time price if available, otherwise fallback to avg price
    const cmp = currentPrices[data.asset] || avgPrice;
    const change = ((cmp - avgPrice) / avgPrice) * 100;
    // Pivot calculation (Mock: High/Low/Close based on CMP)
    const pivot = cmp; 
    return {
      ...data,
      avgPrice,
      cmp,
      change,
      pivot
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar / Navigation */}
      <nav className="fixed left-0 top-0 h-full w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col z-50">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold tracking-tight hidden md:block text-blue-600">MindfulTrader</h1>
          <div className="md:hidden flex justify-center text-blue-600"><BrainCircuit size={24} /></div>
        </div>
        
        <div className="flex-1 py-6 space-y-1 px-3">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'portfolio', icon: TrendingUp, label: 'Portfolio' },
            { id: 'log', icon: History, label: 'Trade Log' },
            { id: 'entry', icon: PlusCircle, label: 'New Trade' },
            { id: 'analysis', icon: BrainCircuit, label: 'AI Insights' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center px-4 py-3 transition-all rounded-lg group",
                activeTab === item.id 
                  ? "bg-blue-50 text-blue-600 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={20} className={cn("flex-shrink-0", activeTab === item.id ? "text-blue-600" : "opacity-70 group-hover:opacity-100")} />
              <span className="ml-3 font-semibold hidden md:block text-sm">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={runAnalysis}
            disabled={analyzing || trades.length < 3}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {analyzing ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
            <span className="hidden md:inline">Analyze Psychology</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="ml-20 md:ml-64 p-4 md:p-10 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'portfolio' && (
            <motion.div 
              key="portfolio"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-end border-b border-slate-200 pb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-mono mb-1">Asset Holdings</p>
                  <h2 className="text-4xl font-bold tracking-tight text-slate-900">My Portfolio</h2>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={refreshPrices}
                    disabled={fetchingPrices || trades.length === 0}
                    className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    {fetchingPrices ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                    Refresh CMP
                  </button>
                  <button 
                    onClick={() => runPortfolioAnalysis(portfolio)}
                    disabled={analyzingPortfolio || portfolio.length === 0}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {analyzingPortfolio ? <Loader2 className="animate-spin" size={14} /> : <BrainCircuit size={14} />}
                    Fundamental Analysis
                  </button>
                </div>
              </header>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-mono border-b border-slate-100">
                      <th className="p-4">Script</th>
                      <th className="p-4 text-right">Qty</th>
                      <th className="p-4 text-right">Avg Price</th>
                      <th className="p-4 text-right">CMP (Est)</th>
                      <th className="p-4 text-right">% Change</th>
                      <th className="p-4 text-right">Pivot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {portfolio.map((item) => (
                      <tr key={item.asset} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{item.asset}</td>
                        <td className="p-4 text-right font-mono text-slate-600">{item.totalQty}</td>
                        <td className="p-4 text-right font-mono text-slate-600">₹{item.avgPrice.toFixed(2)}</td>
                        <td className="p-4 text-right font-mono text-slate-600">₹{item.cmp.toFixed(2)}</td>
                        <td className={cn(
                          "p-4 text-right font-mono font-bold",
                          item.change >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                        </td>
                        <td className="p-4 text-right font-mono text-slate-400">₹{item.pivot.toFixed(2)}</td>
                      </tr>
                    ))}
                    {portfolio.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-20 text-center text-slate-400 italic">
                          No active holdings. Log purchases to build your portfolio.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {portfolioAnalysis && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-blue-100 p-8 rounded-2xl shadow-lg"
                >
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <BrainCircuit className="text-blue-600" />
                    Fundamental Guidance
                  </h3>
                  <div className="prose prose-slate max-w-none prose-p:text-slate-600">
                    <Markdown>{portfolioAnalysis}</Markdown>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-end border-b border-slate-200 pb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-mono mb-1">Performance Overview</p>
                  <h2 className="text-4xl font-bold tracking-tight text-slate-900">Command Center</h2>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-mono text-slate-400">LATEST SYNC</p>
                  <p className="text-sm font-semibold text-slate-600">{new Date().toLocaleTimeString()}</p>
                </div>
              </header>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Net Profit/Loss', value: formatCurrency(stats.totalPL), icon: stats.totalPL >= 0 ? TrendingUp : TrendingDown, color: stats.totalPL >= 0 ? 'text-emerald-600' : 'text-rose-600', bg: stats.totalPL >= 0 ? 'bg-emerald-50' : 'bg-rose-50' },
                  { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Avg Discipline', value: `${stats.avgDiscipline.toFixed(1)}/10`, icon: Smile, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Best Asset', value: stats.bestAsset, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 group hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-[10px] uppercase tracking-widest font-mono text-slate-400">{stat.label}</p>
                      <div className={cn("p-2 rounded-lg", stat.bg)}>
                        <stat.icon size={16} className={stat.color} />
                      </div>
                    </div>
                    <p className={cn("text-2xl font-bold tracking-tight", stat.color)}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs uppercase tracking-widest font-mono text-slate-400 mb-8">Equity Curve</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: '#1e293b' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="cumulative" 
                          stroke="#2563eb" 
                          strokeWidth={3} 
                          dot={false}
                          activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs uppercase tracking-widest font-mono text-slate-400 mb-8">P/L by Emotion</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={emotionData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#64748b' }} />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {emotionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#f43f5e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'entry' && (
            <motion.div 
              key="entry"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              {/* CSV Upload Section */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Bulk Import</h3>
                    <p className="text-xs text-slate-400 font-mono mt-1 uppercase tracking-widest">Upload trade log via CSV</p>
                  </div>
                  <Upload className="text-blue-600 opacity-20" size={24} />
                </div>
                
                <div className="relative group">
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleCsvUpload}
                    disabled={uploadingCsv}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                  />
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center group-hover:border-blue-300 transition-all bg-slate-50/50">
                    {uploadingCsv ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-blue-600" size={24} />
                        <p className="text-sm font-mono text-slate-500">PROCESSING FILE...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="text-blue-600 opacity-20" size={32} />
                        <p className="text-sm font-medium text-slate-600">Click or drag CSV file to upload</p>
                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">
                          Required columns: date, asset, type, purchase_price, selling_price, purchase_qty, sold_qty
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-8">Log New Trade</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Date</label>
                      <input 
                        type="date" 
                        required
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Asset Symbol</label>
                      <input 
                        type="text" 
                        placeholder="e.g. NIFTY, BANKNIFTY, INFY"
                        required
                        value={formData.asset}
                        onChange={e => setFormData({...formData, asset: e.target.value.toUpperCase()})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Purchase Price (₹)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={formData.purchase_price}
                        onChange={e => setFormData({...formData, purchase_price: parseFloat(e.target.value) || 0})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Selling Price (₹)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={formData.selling_price}
                        onChange={e => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Purchase Qty</label>
                      <input 
                        type="number" 
                        required
                        value={formData.purchase_qty}
                        onChange={e => setFormData({...formData, purchase_qty: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Sold Qty</label>
                      <input 
                        type="number" 
                        required
                        value={formData.sold_qty}
                        onChange={e => setFormData({...formData, sold_qty: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Balance Qty</label>
                      <input 
                        type="number" 
                        readOnly
                        value={formData.balance_qty}
                        className="w-full bg-slate-100 border border-slate-100 rounded-xl p-3 text-sm outline-none cursor-not-allowed text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Asset Type</label>
                      <select 
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as any})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all appearance-none"
                      >
                        {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Calculated P/L (₹)</label>
                      <input 
                        type="number" 
                        readOnly
                        value={formData.p_l}
                        className={cn(
                          "w-full border-none rounded-xl p-3 text-sm outline-none font-bold",
                          (formData.p_l || 0) >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Pre-Trade Emotion</label>
                      <select 
                        value={formData.emotion}
                        onChange={e => setFormData({...formData, emotion: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all appearance-none"
                      >
                        {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Discipline Score (1-10)</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="10"
                        value={formData.discipline_score}
                        onChange={e => setFormData({...formData, discipline_score: parseInt(e.target.value)})}
                        className="w-full h-10 accent-blue-600"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Gambling</span>
                        <span>Perfect Execution ({formData.discipline_score})</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Entry Reason</label>
                    <select 
                      value={formData.entry_reason}
                      onChange={e => setFormData({...formData, entry_reason: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all appearance-none"
                    >
                      {ENTRY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Notes / Analysis</label>
                    <textarea 
                      rows={4}
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      placeholder="Why did you take this trade? What did you learn?"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none transition-all"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Committing...
                      </>
                    ) : (
                      'Commit to Journal'
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'log' && (
            <motion.div 
              key="log"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <header className="flex justify-between items-end border-b border-slate-200 pb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-mono mb-1">Historical Data</p>
                  <h2 className="text-4xl font-bold tracking-tight text-slate-900">Trade Ledger</h2>
                </div>
              </header>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-mono border-b border-slate-100">
                        <th className="p-4">Date</th>
                        <th className="p-4">Asset</th>
                        <th className="p-4">Type</th>
                        <th className="p-4 text-right">Price (B/S)</th>
                        <th className="p-4 text-right">Qty (B/S)</th>
                        <th className="p-4">Emotion</th>
                        <th className="p-4">Discipline</th>
                        <th className="p-4 text-right">P/L</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {trades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4 text-sm font-mono text-slate-400">{trade.date}</td>
                          <td className="p-4 font-bold text-slate-900">{trade.asset}</td>
                          <td className="p-4 text-xs text-slate-500">{trade.type}</td>
                          <td className="p-4 text-right text-xs font-mono">
                            <div className="text-emerald-600">₹{trade.purchase_price}</div>
                            <div className="text-rose-600">₹{trade.selling_price}</div>
                          </td>
                          <td className="p-4 text-right text-xs font-mono">
                            <div className="text-emerald-600">{trade.purchase_qty}</div>
                            <div className="text-rose-600">{trade.sold_qty}</div>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2 py-1 text-[10px] uppercase font-bold rounded-full",
                              trade.emotion.includes('FOMO') || trade.emotion === 'Revengeful' 
                                ? "bg-rose-100 text-rose-700" 
                                : "bg-emerald-100 text-emerald-700"
                            )}>
                              {trade.emotion}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-600" 
                                  style={{ width: `${trade.discipline_score * 10}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono text-slate-500">{trade.discipline_score}</span>
                            </div>
                          </td>
                          <td className={cn(
                            "p-4 text-right font-bold tabular-nums",
                            trade.p_l >= 0 ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {formatCurrency(trade.p_l)}
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => deleteTrade(trade.id!)}
                              className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {trades.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-20 text-center text-slate-400 italic">
                            No trades recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analysis' && (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="bg-white border border-blue-100 p-10 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-blue-600">
                  <BrainCircuit size={120} />
                </div>
                
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-3">
                  <BrainCircuit className="text-blue-600" />
                  Psychological Insights
                </h2>
                
                <div className="prose prose-slate max-w-none prose-p:text-slate-600 prose-headings:text-slate-900 prose-strong:text-blue-600">
                  {analysis ? (
                    <Markdown>{analysis}</Markdown>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <AlertCircle className="text-slate-300" size={48} />
                      <p className="text-center text-slate-400 italic">
                        Click "Analyze Psychology" in the sidebar to generate AI insights based on your trade history.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {analysis && (
                <div className="bg-blue-600 text-white p-8 rounded-2xl shadow-lg">
                  <h3 className="text-xs uppercase tracking-widest font-mono opacity-70 mb-4">Wealth Building Tip</h3>
                  <p className="text-lg leading-relaxed font-medium">
                    "The goal of a successful trader is to make the best trades. Money is secondary."
                  </p>
                  <p className="mt-2 text-sm opacity-70">— Alexander Elder</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
