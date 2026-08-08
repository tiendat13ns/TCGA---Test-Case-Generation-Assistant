export type BreadcrumbItem = {
  label: string;
  // Bỏ trống onClick cho mục cuối (trang hiện tại) — không phải liên kết, không được
  // trông giống như bấm được, tránh người dùng bấm nhầm mà không có phản hồi gì.
  onClick?: () => void;
};

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", minWidth: 0, flexWrap: "wrap" }}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const clickable = !isLast && !!item.onClick;
        return (
          <span key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
            {clickable ? (
              <button onClick={item.onClick} className="breadcrumb-link">
                {item.label}
              </button>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={isLast ? "breadcrumb-current" : "breadcrumb-static"}
              >
                {item.label}
              </span>
            )}
            {!isLast && <span className="breadcrumb-separator" aria-hidden="true">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
