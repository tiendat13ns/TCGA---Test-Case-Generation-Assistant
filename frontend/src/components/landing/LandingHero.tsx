import { CheckCircle2, FileText, Sparkles, Table2 } from "lucide-react";

type LandingHeroProps = {
  isAuthenticated: boolean;
  onPrimaryCta: () => void;
};

export default function LandingHero({ isAuthenticated, onPrimaryCta }: LandingHeroProps) {
  return (
    <section className="landing-hero">
      <div className="landing-hero-content">
        <span className="landing-hero-badge">
          <Sparkles size={13} strokeWidth={2} /> AI-powered
        </span>

        <h1 className="landing-hero-title">
          Tự động sinh Test Case<br />từ tài liệu yêu cầu bằng AI
        </h1>

        <p className="landing-hero-subtitle">
          TCGA giúp BA và QA phân tích tài liệu SRS, tự động trích xuất Requirement
          và sinh bộ Test Case chuẩn — xuất thẳng ra Excel chỉ trong vài phút,
          thay vì hàng giờ làm thủ công.
        </p>

        <div className="landing-hero-actions">
          <button className="btn btn-primary landing-hero-cta" onClick={onPrimaryCta}>
            {isAuthenticated ? "Vào Dashboard" : "Dùng thử miễn phí"}
          </button>
        </div>
      </div>

      {/* Minh họa luồng xử lý — dùng icon thay screenshot cho tới khi có ảnh thật */}
      <div className="landing-hero-visual">
        <div className="landing-hero-visual-card">
          <div className="landing-hero-visual-step">
            <div className="landing-hero-visual-icon"><FileText size={18} strokeWidth={1.75} /></div>
            <div>
              <div className="landing-hero-visual-step-title">Upload tài liệu SRS</div>
              <div className="landing-hero-visual-step-desc">pdf, docx, xlsx, csv...</div>
            </div>
          </div>
          <div className="landing-hero-visual-arrow" />
          <div className="landing-hero-visual-step">
            <div className="landing-hero-visual-icon"><Sparkles size={18} strokeWidth={1.75} /></div>
            <div>
              <div className="landing-hero-visual-step-title">AI trích xuất Requirement</div>
              <div className="landing-hero-visual-step-desc">RAG semantic search</div>
            </div>
          </div>
          <div className="landing-hero-visual-arrow" />
          <div className="landing-hero-visual-step">
            <div className="landing-hero-visual-icon"><Table2 size={18} strokeWidth={1.75} /></div>
            <div>
              <div className="landing-hero-visual-step-title">Sinh Test Case chuẩn</div>
              <div className="landing-hero-visual-step-desc">7 cột QA, có Priority</div>
            </div>
          </div>
          <div className="landing-hero-visual-arrow" />
          <div className="landing-hero-visual-step">
            <div className="landing-hero-visual-icon"><CheckCircle2 size={18} strokeWidth={1.75} /></div>
            <div>
              <div className="landing-hero-visual-step-title">Xuất Excel</div>
              <div className="landing-hero-visual-step-desc">Sẵn sàng bàn giao</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
