import Link from "next/link";
import { formatDate, formatRupiahFull } from "@/lib/utils";

export interface AgentTokenRequestItem {
  id: string;
  packageName: string;
  tokenAmount: number;
  totalPrice: number;
  createdAt: Date | string;
  agent: {
    name: string;
    email: string;
  };
}

interface AgentTokenRequestListProps {
  title: string;
  description: string;
  requests: AgentTokenRequestItem[];
  emptyMessage: string;
  actionHref?: string;
  actionLabel?: string;
  maxItems?: number;
  additionalPendingCount?: number;
}

export default function AgentTokenRequestList({
  title,
  description,
  requests,
  emptyMessage,
  actionHref,
  actionLabel,
  maxItems,
  additionalPendingCount = 0,
}: AgentTokenRequestListProps) {
  const displayedRequests = maxItems ? requests.slice(0, maxItems) : requests;
  const hiddenCount =
    Math.max(0, requests.length - displayedRequests.length) + additionalPendingCount;

  return (
    <section className="card" style={{ border: "1px solid hsl(var(--primary) / 0.2)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 700 }}>{title}</h3>
          <p
            style={{
              marginTop: "6px",
              fontSize: "13px",
              color: "hsl(var(--text-secondary))",
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        </div>
        {actionHref && actionLabel && (
          <Link href={actionHref} className="btn btn-primary btn-sm">
            {actionLabel}
          </Link>
        )}
      </div>

      {displayedRequests.length === 0 ? (
        <div
          style={{
            padding: "24px",
            border: "1px dashed hsl(var(--border))",
            borderRadius: "12px",
            textAlign: "center",
            color: "hsl(var(--text-muted))",
          }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {displayedRequests.map((request) => (
            <div
              key={request.id}
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--bg-elevated))",
                display: "grid",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 700 }}>
                    {request.agent.name}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "hsl(var(--text-muted))",
                      marginTop: "2px",
                    }}
                  >
                    {request.agent.email}
                  </div>
                </div>
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "hsl(var(--primary))",
                    background: "hsl(var(--primary) / 0.08)",
                    border: "1px solid hsl(var(--primary) / 0.18)",
                  }}
                >
                  {request.packageName}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                }}
              >
                <div style={{ fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
                  Memesan <strong>{request.tokenAmount.toLocaleString("id-ID")} token</strong>
                </div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "hsl(var(--primary))" }}>
                  {formatRupiahFull(request.totalPrice)}
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                Masuk pada {formatDate(request.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {hiddenCount > 0 && (
        <div
          style={{
            marginTop: "14px",
            fontSize: "12px",
            color: "hsl(var(--text-muted))",
          }}
        >
          +{hiddenCount} permintaan lainnya masih menunggu diproses.
        </div>
      )}
    </section>
  );
}
