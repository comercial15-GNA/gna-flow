import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-slate-800 mb-1">{label}</p>
      <p className="text-blue-600 font-bold">
        {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(payload[0].value)} kg
      </p>
      <p className="text-xs text-slate-400 mt-1">Clique para ver detalhes</p>
    </div>
  );
};

export default function GraficoMensal({ dadosMensais, mesSelecionado, onSelecionarMes, corBarra = '#3b82f6', corSelecionada = '#1e40af' }) {
  const data = MESES_ABREV.map((nome, i) => ({
    mes: nome,
    mesNum: i + 1,
    peso: dadosMensais[i + 1] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
        onClick={(e) => e?.activePayload && onSelecionarMes(e.activePayload[0].payload.mesNum)}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}t` : v} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Bar dataKey="peso" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.mesNum}
              fill={entry.mesNum === mesSelecionado ? corSelecionada : corBarra}
              className="cursor-pointer"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}