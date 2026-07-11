import { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface WorkspaceLayoutProps {
  breadcrumb?: { label: string; href: string };
  title: string;
  statusBadge?: ReactNode;
  headerRight?: ReactNode;
  tabs: Tab[];
  activeTab: string;
  basePath: string;
  sidebar?: ReactNode;
  children: ReactNode;
}

export default function WorkspaceLayout({
  breadcrumb,
  title,
  statusBadge,
  headerRight,
  tabs,
  activeTab,
  basePath,
  sidebar,
  children,
}: WorkspaceLayoutProps) {
  return (
    <div dir="rtl">
      {/* Sticky workspace header — breaks out of Layout's 26px padding */}
      <div
        style={{
          margin: "-26px -26px 0",
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          borderBottom: "1px solid #e6ece4",
        }}
      >
        <div style={{ padding: "0 26px" }}>
          {breadcrumb && (
            <div style={{ paddingTop: 10 }}>
              <Link
                href={breadcrumb.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: "#8a978a",
                  textDecoration: "none",
                }}
              >
                <ChevronLeft size={13} />
                {breadcrumb.label}
              </Link>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              paddingTop: breadcrumb ? 6 : 14,
              paddingBottom: 10,
            }}
          >
            <h1
              style={{
                margin: 0,
                font: "700 17px Cairo, sans-serif",
                color: "#1c261c",
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </h1>
            {statusBadge}
            {headerRight && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {headerRight}
              </div>
            )}
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={`${basePath}/${tab.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "9px 14px",
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#1f7a4d" : "#5a675a",
                    borderBottom: `2px solid ${isActive ? "#1f7a4d" : "transparent"}`,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    transition: "color .15s",
                    flexShrink: 0,
                  }}
                >
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        lineHeight: "16px",
                        padding: "0 5px",
                        borderRadius: 999,
                        background: isActive ? "#1f7a4d" : "#e8f2ea",
                        color: isActive ? "#fff" : "#1f7a4d",
                        fontWeight: 700,
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          paddingTop: 20,
          display: "flex",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {sidebar && (
          <div
            style={{
              width: 272,
              flexShrink: 0,
              position: "sticky",
              top: 130,
              maxHeight: "calc(100vh - 158px)",
              overflowY: "auto",
            }}
          >
            {sidebar}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
