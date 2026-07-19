'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #dce3ed',
  boxShadow: '0 8px 24px rgba(15,23,42,.12)',
};

export function SalesChart({ data }: { data: Array<{ label: string; value: number }> }) {
  return <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ left: -12, right: 8, top: 12 }}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} /><stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dce3ed" /><XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} /><YAxis axisLine={false} tickLine={false} fontSize={12} /><Tooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={3} fill="url(#salesFill)" /></AreaChart></ResponsiveContainer></div>;
}

export function RevenueChart({ data }: { data: Array<{ label: string; value: number }> }) {
  return <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ left: -12, right: 8, top: 12 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dce3ed" /><XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} /><YAxis axisLine={false} tickLine={false} fontSize={12} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" fill="#c8952e" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}

