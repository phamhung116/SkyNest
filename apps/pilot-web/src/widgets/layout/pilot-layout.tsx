import type { PropsWithChildren } from "react";
import { Badge, Button, Container } from "@paragliding/ui";
import { Link, NavLink } from "react-router-dom";
import { usePilotAuth } from "@/shared/providers/auth-provider";
import { routes } from "@/shared/config/routes";

const navItems = [
  { to: routes.home, label: "Chuyến bay" },
  { to: routes.account, label: "Tài khoản" },
  { to: routes.posts, label: "Bài viết" }
];

export const PilotLayout = ({ children }: PropsWithChildren) => {
  const { account, logout } = usePilotAuth();
  const initials = (account?.full_name ?? "Phi công")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");

  return (
    <div className="pilot-shell">
      <aside className="pilot-sidebar">
        <div className="pilot-sidebar__brandmark">
          <span className="pilot-sidebar__icon">DP</span>
          <div className="pilot-sidebar__brand">
            <span>Dù lượn Đà Nẵng</span>
            <small>Khu vực phi công</small>
          </div>
        </div>
        <div className="pilot-sidebar__copy">
          <Badge tone="success">PHI CÔNG</Badge>
          <p>Theo dõi chuyến bay được phân công, cập nhật tiến độ và đọc ghi chú vận hành.</p>
        </div>
        <nav className="pilot-sidebar__nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === routes.home} className="pilot-sidebar__link">
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="pilot-main">
        <header className="pilot-topbar">
          <Container className="pilot-topbar__inner">
            <Link className="pilot-topbar-brand" to={routes.home}>
              <span className="pilot-topbar-brand__logo">
                <img src="/media/img/logo.jpg" alt="Logo Dù lượn Đà Nẵng" />
              </span>
              <span className="pilot-topbar-brand__copy">
                <strong>ĐÀ NẴNG</strong>
                <small>Dù lượn</small>
              </span>
            </Link>
            <div className="pilot-topbar__actions">
              <div className="pilot-topbar__profile">
                <span className="pilot-user-avatar">{initials}</span>
                <div className="pilot-user-meta">
                  <strong>{account?.full_name}</strong>
                  <small>{account?.email}</small>
                </div>
              </div>
              <Button variant="ghost" onClick={() => void logout()}>
                Đăng xuất
              </Button>
            </div>
          </Container>
        </header>
        <Container className="pilot-content">{children}</Container>
      </main>
    </div>
  );
};
