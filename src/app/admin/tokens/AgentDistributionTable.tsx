"use client";

import { useState, useMemo } from "react";
import MintTokenClient from "./MintTokenClient";
import DeductTokenClient from "./DeductTokenClient";

interface Agent {
  id: string;
  name: string;
  email: string;
  tokenBalance: number;
  totalUsed: number;
  tokenResalePrice: number;
  packageName: string;
  tenants: { id: string }[];
}

interface Props {
  agents: Agent[];
  tokenSymbol: string;
  tokenPrice: number;
  targetAgentId?: string;
  targetAmount?: number;
}

export default function AgentDistributionTable({ 
  agents, 
  tokenSymbol, 
  tokenPrice,
  targetAgentId,
  targetAmount
}: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof Agent | "tenantsCount">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const filteredAndSortedAgents = useMemo(() => {
    let result = agents.filter(a => 
      a.name.toLowerCase().includes(search.toLowerCase()) || 
      a.email.toLowerCase().includes(search.toLowerCase())
    );

    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortKey === "tenantsCount") {
        aValue = a.tenants.length;
        bValue = b.tenants.length;
      } else {
        aValue = a[sortKey];
        bValue = b[sortKey];
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [agents, search, sortKey, sortOrder]);

  const handleSort = (key: keyof Agent | "tenantsCount") => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ column }: { column: keyof Agent | "tenantsCount" }) => {
    if (sortKey !== column) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>⇅</span>;
    return <span style={{ marginLeft: '4px' }}>{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "20px", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "18px" }}>Distribusi Token per Agen</h2>
          <p style={{ marginTop: "4px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
            Harga token dan rule konversi dikelola dari pusat melalui halaman pengaturan.
          </p>
        </div>
        
        <div style={{ position: "relative", minWidth: "240px" }}>
          <input 
            type="text" 
            placeholder="Cari nama atau email agen..." 
            className="input-field"
            style={{ paddingLeft: "36px", height: "40px", borderRadius: "10px" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }}>🔍</span>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "800px" }}>
          <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
            <tr>
              <th 
                style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("name")}
              >
                Nama Agen <SortIcon column="name" />
              </th>
              <th 
                style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("packageName")}
              >
                Paket <SortIcon column="packageName" />
              </th>
              <th 
                style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("tenantsCount")}
              >
                Toko <SortIcon column="tenantsCount" />
              </th>
              <th 
                style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("tokenBalance")}
              >
                Saldo <SortIcon column="tokenBalance" />
              </th>
              <th 
                style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("totalUsed")}
              >
                Terpakai <SortIcon column="totalUsed" />
              </th>
              <th 
                style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("tokenResalePrice")}
              >
                Harga Jual <SortIcon column="tokenResalePrice" />
              </th>
              <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))", textAlign: "right" }}>
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedAgents.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
                  Tidak ada agen yang ditemukan.
                </td>
              </tr>
            ) : (
              filteredAndSortedAgents.map((agent) => (
                <tr 
                  key={agent.id} 
                  id={`agent-${agent.id}`}
                  style={{ 
                    borderBottom: "1px solid hsl(var(--border))",
                    background: agent.id === targetAgentId 
                      ? "hsl(var(--primary)/0.06)" 
                      : undefined,
                    transition: "background 0.3s ease"
                  }}
                >
                  <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: 600 }}>
                    {agent.name}
                    <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", fontWeight: 400 }}>{agent.email}</div>
                  </td>
                  <td style={{ padding: "16px 20px", fontSize: "14px" }}>
                    <span style={{ 
                      padding: "4px 8px", 
                      borderRadius: "6px", 
                      background: 
                        agent.packageName === "Belum Membeli Token" ? "hsl(var(--bg-elevated))" :
                        agent.packageName === "Family" ? "hsl(var(--warning)/0.1)" : 
                        "hsl(var(--primary)/0.1)",
                      color: 
                        agent.packageName === "Belum Membeli Token" ? "hsl(var(--text-muted))" :
                        agent.packageName === "Family" ? "hsl(var(--warning))" : 
                        "hsl(var(--primary))",
                      fontSize: "12px",
                      fontWeight: 600
                    }}>
                      {agent.packageName}
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px", fontSize: "14px" }}>{agent.tenants.length} Toko</td>
                  <td style={{ padding: "16px 20px", fontSize: "15px", fontWeight: 700, color: "hsl(var(--primary))" }}>
                    {agent.tokenBalance.toLocaleString()} <span style={{ fontSize: "11px" }}>{tokenSymbol}</span>
                  </td>
                  <td style={{ padding: "16px 20px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
                    {agent.totalUsed.toLocaleString()} <span style={{ fontSize: "11px" }}>{tokenSymbol}</span>
                  </td>
                  <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-primary))" }}>
                    Rp {agent.tokenResalePrice.toLocaleString()}
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <DeductTokenClient agentId={agent.id} agentName={agent.name} />
                      <MintTokenClient 
                        agentId={agent.id} 
                        agentName={agent.name} 
                        tokenPrice={tokenPrice} 
                        autoOpen={agent.id === targetAgentId}
                        initialAmount={agent.id === targetAgentId ? targetAmount : undefined}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
