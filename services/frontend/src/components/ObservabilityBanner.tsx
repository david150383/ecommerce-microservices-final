import React from 'react';
import { BarChart3, Radio, Layers, Server, ExternalLink } from 'lucide-react';

export const ObservabilityBanner: React.FC = () => {
  const tools = [
    {
      name: 'Grafana Observability',
      label: 'Metrics, Logs & Traces',
      url: 'http://localhost:3300',
      badge: 'Port 3300',
      icon: BarChart3,
      color: '#f97316',
      desc: 'Live LGTM Stack with auto-provisioned dashboards',
    },
    {
      name: 'Prometheus Engine',
      label: 'Time-Series Scrapes',
      url: 'http://localhost:9090',
      badge: 'Port 9090',
      icon: Radio,
      color: '#ef4444',
      desc: 'Prometheus 2.52 scraping all 7 microservice /metrics',
    },
    {
      name: 'RabbitMQ Event Bus',
      label: 'Topic Exchange & DLQ',
      url: 'http://localhost:15672',
      badge: 'Port 15672',
      icon: Layers,
      color: '#ff6600',
      desc: 'Outbox & Inbox consumers and message queues',
    },
    {
      name: 'API Gateway Ingress',
      label: 'Reverse Proxy & Security',
      url: 'http://localhost:3000/health/ready',
      badge: 'Port 3000',
      icon: Server,
      color: '#6366f1',
      desc: 'RS256 JWT verify, rate limiting & trace propagation',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '1rem',
      marginBottom: '2.5rem',
    }}>
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <a
            key={tool.name}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textDecoration: 'none',
              color: 'inherit',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: `rgba(255, 255, 255, 0.05)`,
                border: `1px solid rgba(255, 255, 255, 0.1)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon size={20} color={tool.color} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>{tool.badge}</span>
                <ExternalLink size={14} color="var(--text-muted)" />
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>{tool.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{tool.desc}</div>
            </div>
          </a>
        );
      })}
    </div>
  );
};
