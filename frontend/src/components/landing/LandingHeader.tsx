import { TCGAMark } from "../TCGALogo";

type LandingHeaderProps = {
  isAuthenticated: boolean;
  onGoToLogin: () => void;
  onGoToRegister: () => void;
  onGoToDashboard: () => void;
};

export default function LandingHeader({ isAuthenticated, onGoToLogin, onGoToRegister, onGoToDashboard }: LandingHeaderProps) {
  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <div className="landing-logo">
          <div className="landing-logo-mark">
            <TCGAMark size={22} />
          </div>
          <span className="landing-logo-text">TCGA</span>
        </div>

        <nav className="landing-header-nav">
          <a href="#how-it-works">Cách hoạt động</a>
          <a href="#features">Tính năng</a>
          <a href="#who-its-for">Dành cho ai</a>
          <a href="#usage">Usage</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="landing-header-actions">
          {isAuthenticated ? (
            <button className="btn btn-primary" onClick={onGoToDashboard}>
              Vào Dashboard
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onGoToLogin}>
                Đăng nhập
              </button>
              <button className="btn btn-primary" onClick={onGoToRegister}>
                Dùng thử miễn phí
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
