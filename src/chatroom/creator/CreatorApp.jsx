import React from "react";
import Icon from "./Icon.jsx";
import logo from "../../logo.png";
import introduction from "./intro.md?raw";
import guide from "./guide.md?raw";
import { CARD_LABELS, ISSUES_URL, LOGIN_URL, SITE_URL, SUBMISSION_URL, fetchCharacterCards, filterAndSortCards } from "./github.mjs";

const DocumentPanel = React.lazy(() => import("./MarkdownDocument.jsx"));
const SECTIONS = [
  { id: "intro", label: "共创计划介绍", icon: "book-open-text", group: "总览" },
  { id: "submit", label: "角色卡投稿", icon: "send", group: "总览" },
  { id: "all", label: "角色卡总览", icon: "layout-grid", group: "第三方角色卡" },
  { id: "featured", label: "精选角色卡", icon: "sparkles", group: "第三方角色卡" },
  { id: "guide", label: "使用方法", icon: "book-open", group: "第三方角色卡" },
];

function currentSection() {
  const hash = window.location.hash.slice(1);
  if (SECTIONS.some((section) => section.id === hash)) return hash;
  return "intro";
}

const DISCLAIMER_STORAGE_KEY = "heim-lounge-community-disclaimer-dismissed";

function hasRememberedDisclaimer() {
  try { return window.localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "1"; }
  catch { return false; }
}

export default function CreatorApp() {
  const [active, setActive] = React.useState(currentSection);
  const [scrolled, setScrolled] = React.useState(false);
  const [disclaimerDismissed, setDisclaimerDismissed] = React.useState(hasRememberedDisclaimer);
  const [dontRemindAgain, setDontRemindAgain] = React.useState(false);
  const contentRef = React.useRef(null);
  const disclaimerRef = React.useRef(null);
  const acknowledgeRef = React.useRef(null);
  const showDisclaimer = (active === "all" || active === "featured") && !disclaimerDismissed;

  React.useEffect(() => {
    if (!showDisclaimer) return undefined;
    const previousFocus = document.activeElement;
    document.getElementById("creator-content")?.scrollIntoView({ behavior: "instant", block: "start" });
    const oldOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    acknowledgeRef.current?.focus();
    const trapFocus = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = disclaimerRef.current?.querySelectorAll("a[href], button:not(:disabled), input:not(:disabled)") || [];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.documentElement.style.overflow = oldOverflow;
      document.removeEventListener("keydown", trapFocus);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [showDisclaimer]);

  const acknowledgeDisclaimer = () => {
    if (dontRemindAgain) {
      try { window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, "1"); }
      catch { /* Keep consent for the current visit when browser storage is unavailable. */ }
    }
    setDisclaimerDismissed(true);
  };

  React.useEffect(() => {
    const changeSection = () => {
      setActive(currentSection());
      if (window.scrollY > 150) contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("hashchange", changeSection);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("hashchange", changeSection);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="creator-site">
      <header className={`creator-header${scrolled ? " is-scrolled" : ""}`} inert={showDisclaimer ? "" : undefined}>
        <div className="creator-header-inner">
          <a className="creator-brand" href={SITE_URL} aria-label="返回海姆休息室共创计划首页">
            <img src={logo} alt="" width="34" height="34" />
            <span>芙提雅 <strong>ONLINE</strong></span>
          </a>
          <div className="creator-header-actions">
            <a className="creator-button creator-header-button creator-home" href={SITE_URL}>
              <Icon name="arrow-left" /><span>APP 官网首页</span>
            </a>
            <a className="creator-button creator-header-button creator-login" href={LOGIN_URL} target="_blank" rel="noopener noreferrer" title="在 GitHub 登录后进入角色卡投稿模板"><Icon name="github" /><span>使用 GitHub 登录</span><Icon name="arrow-up-right" className="login-arrow" /></a>
          </div>
        </div>
      </header>

      <main className="creator-main">
        <section className="creator-hero" aria-labelledby="creator-title">
          <p className="creator-eyebrow"><Icon name="heart" />让创作，成为陪伴</p>
          <h1 id="creator-title">海姆休息室<span>共创计划</span></h1>
          <p className="creator-subtitle">非官方《海姆休息室》角色卡，使用/分享来自社区的创作！</p>
        </section>

        <div className="creator-workspace" ref={contentRef}>
          <aside className="creator-sidebar" aria-label="社区角色卡导航" inert={showDisclaimer ? "" : undefined}>
            <nav>
              {["总览", "第三方角色卡"].map((group) => (
                <div className="creator-nav-group" key={group}>
                  <p className="creator-nav-heading">{group}</p>
                  <div className="creator-nav-items">
                    {SECTIONS.filter((section) => section.group === group).map((section) => (
                      <a href={`#${section.id}`} key={section.id} className={`creator-nav-item${active === section.id ? " is-active" : ""}`} aria-current={active === section.id ? "page" : undefined}>
                        <Icon name={section.icon} /><span>{section.label}</span><Icon name="check" className="nav-check" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="creator-sidebar-note"><Icon name="github" /><div><strong>由社区创作</strong><span>每一次相遇，都始于分享。</span></div></div>
          </aside>

          <div className={`creator-content${showDisclaimer ? " has-disclaimer" : ""}`} id="creator-content" tabIndex={-1}>
            {(active === "all" || active === "featured") && <div className={`creator-third-party-region${showDisclaimer ? " is-obscured" : ""}`} aria-hidden={showDisclaimer || undefined} inert={showDisclaimer ? "" : undefined}><CardMarket key={active} section={active} /></div>}
            <React.Suspense fallback={<div className="creator-loading" role="status"><span className="creator-spinner" /><strong>正在加载文档</strong></div>}>
              {active === "intro" && <DocumentPanel title="共创计划介绍" icon="book-open-text" raw={introduction} browseCards />}
              {active === "guide" && <DocumentPanel title="使用方法" icon="book-open" raw={guide} />}
            </React.Suspense>
            {active === "submit" && <SubmissionPanel />}
            {showDisclaimer && <DisclaimerDialog ref={disclaimerRef} acknowledgeRef={acknowledgeRef} dontRemindAgain={dontRemindAgain} onDontRemindChange={setDontRemindAgain} onAcknowledge={acknowledgeDisclaimer} />}
          </div>
        </div>
      </main>

      <footer className="creator-footer" inert={showDisclaimer ? "" : undefined}>
        <span>海姆休息室 · 社区共创</span>
        <span>Copyright © 2026 青尘工作室</span>
        <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer"><Icon name="github" />在 GitHub 参与<Icon name="arrow-up-right" /></a>
      </footer>
    </div>
  );
}

const DisclaimerDialog = React.forwardRef(function DisclaimerDialog({ acknowledgeRef, dontRemindAgain, onDontRemindChange, onAcknowledge }, ref) {
  return (
    <div className="creator-disclaimer-scrim" role="presentation">
      <section className="creator-disclaimer-dialog" role="dialog" aria-modal="true" aria-labelledby="creator-disclaimer-title" aria-describedby="creator-disclaimer-copy" ref={ref}>
        <div className="creator-disclaimer-heading"><span className="creator-disclaimer-icon"><Icon name="circle-alert" /></span><span className="creator-disclaimer-kicker">HEIM LOUNGE · COMMUNITY</span><h2 id="creator-disclaimer-title">免责声明</h2></div>
        <div className="creator-disclaimer-copy" id="creator-disclaimer-copy">
          <p>本页中所有内容均来自互联网公开收集与分享，仅供交流、体验与个人使用。</p>
          <p>本软件免费开源，不以角色卡内容获利，不代表或认可卡片中的观点、设定与创作内容。</p>
          <p>如您是权利人并认为内容存在侵权，请联系 GitHub 平台处理删除。</p>
        </div>
        <div className="creator-age-notice">部分内容可能仅适合成年人浏览与使用。请确认您已年满 18 周岁，并遵守所在地法律法规。</div>
        <div className="creator-disclaimer-actions">
          <label className="creator-dont-remind"><input type="checkbox" checked={dontRemindAgain} onChange={(event) => onDontRemindChange(event.target.checked)} /><span className="creator-checkbox-mark"><Icon name="check" /></span><span>不再提醒</span></label>
          <button ref={acknowledgeRef} type="button" className="creator-button creator-button-primary creator-disclaimer-acknowledge" onClick={onAcknowledge}><Icon name="check" /><span>我已知悉</span></button>
        </div>
      </section>
    </div>
  );
});

function Dropdown({ label, value, options, onChange, icon }) {
  const [open, setOpen] = React.useState(false);
  const root = React.useRef(null);
  const trigger = React.useRef(null);
  const menuId = React.useId();
  const selected = options.find((option) => option.value === value);

  React.useEffect(() => {
    if (!open) return;
    const closeOutside = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    root.current?.querySelector('[aria-selected="true"]')?.focus();
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  const choose = (next) => {
    onChange(next);
    setOpen(false);
    trigger.current?.focus();
  };
  const keyboard = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      const items = [...root.current.querySelectorAll('[role="option"]')];
      const index = items.indexOf(document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  };

  return (
    <div className={`creator-dropdown${open ? " is-open" : ""}`} ref={root} onKeyDown={keyboard} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button type="button" className="creator-select-trigger" aria-label={`${label}：${selected?.label}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen(!open)} ref={trigger}>
        <Icon name={icon} /><span>{selected?.label}</span><Icon name="chevron-down" className="select-chevron" />
      </button>
      {open && <div className="creator-select-menu" role="listbox" id={menuId} aria-label={label}>
        {options.map((option) => <button type="button" role="option" tabIndex={-1} aria-selected={value === option.value} key={option.value} onClick={() => choose(option.value)}><span>{option.label}</span><Icon name={value === option.value ? "check" : "circle"} /></button>)}
      </div>}
    </div>
  );
}

function Pagination({ page, pages, onChange, disabled = false }) {
  const start = Math.min(Math.max(page - 2, 1), Math.max(1, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, index) => start + index);
  return (
    <nav className="creator-pagination" aria-label="角色卡分页">
      <button type="button" className="creator-page-arrow" disabled={disabled || page <= 1} aria-label="上一页" onClick={() => onChange(page - 1)}><Icon name="chevron-left" /></button>
      {numbers.map((number) => <button type="button" className={`creator-page-number${page === number ? " is-active" : ""}`} disabled={disabled} aria-label={`第 ${number} 页`} aria-current={page === number ? "page" : undefined} key={number} onClick={() => onChange(number)}><Icon name="circle" /><span>{number}</span></button>)}
      <button type="button" className="creator-page-arrow" disabled={disabled || page >= pages} aria-label="下一页" onClick={() => onChange(page + 1)}><Icon name="chevron-right" /></button>
    </nav>
  );
}

function CardMarket({ section }) {
  const [cards, setCards] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState("newest");
  const [size, setSize] = React.useState(10);
  const [page, setPage] = React.useState(1);
  const [refresh, setRefresh] = React.useState(0);
  const [loadedAt, setLoadedAt] = React.useState(null);
  const label = CARD_LABELS[section];
  const featured = section === "featured";
  const retry = () => setRefresh((value) => value + 1);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setCards([]);
    fetchCharacterCards(label, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setCards(data);
        setLoadedAt(new Date());
        setPage(1);
      })
      .catch((problem) => {
        if (!controller.signal.aborted) setError(problem instanceof TypeError ? "暂时无法连接 GitHub，请检查网络连接后重试。" : problem.message);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [label, refresh]);

  React.useEffect(() => {
    // A browser back/forward cache restoration must also read fresh issue data.
    const restore = (event) => { if (event.persisted) setRefresh((value) => value + 1); };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  const filtered = React.useMemo(() => filterAndSortCards(cards, query, sort), [cards, query, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * size, current * size);
  const changeFilter = (setter) => (value) => { setter(value); setPage(1); };

  return (
    <section className="creator-market" aria-labelledby="market-title">
      <div className="creator-panel-heading">
        <div><h2 id="market-title">{featured ? "精选角色卡" : "角色卡总览"}</h2><p>{featured ? "受到社区好评的高质量角色卡合集。" : "社区创作的第三方角色卡，版权归属作者，青尘工作室不对角色卡内容负责。"}</p></div>
        <span className={`creator-section-mark${featured ? " is-featured" : ""}`}><Icon name={featured ? "sparkles" : "layout-grid"} /></span>
      </div>

      <label className="creator-search"><Icon name="search" /><input type="search" placeholder="搜索角色卡" aria-label="搜索角色卡名称、作者或介绍" value={query} onChange={(event) => changeFilter(setQuery)(event.target.value)} />{query && <button type="button" aria-label="清空搜索" onClick={() => changeFilter(setQuery)("")}><Icon name="x" /></button>}<span className="search-hint">名称 / 作者 / 介绍</span></label>

      <div className="creator-tools">
        <div className="creator-tools-left">
          <Dropdown label="排序方式" value={sort} onChange={changeFilter(setSort)} icon="arrow-down-wide-narrow" options={[{ value: "newest", label: "最近发布" }, { value: "oldest", label: "最早发布" }]} />
          <Dropdown label="每页展示数量" value={size} onChange={changeFilter(setSize)} icon="list" options={[10, 20, 30].map((value) => ({ value, label: `每页 ${value} 张` }))} />
        </div>
        <div className="creator-tools-right">
          <Pagination page={current} pages={pages} onChange={setPage} disabled={loading || Boolean(error)} />
          <button type="button" className="creator-refresh" aria-label="刷新角色卡" title="重新从 GitHub 加载" disabled={loading} onClick={retry}><Icon name="refresh-cw" className={loading ? "is-spinning" : ""} /></button>
        </div>
      </div>

      <div className="creator-results-meta" aria-live="polite"><span><i className={`creator-status-dot${error ? " is-error" : ""}`} />{loading ? "正在读取社区创作" : error ? "连接暂不可用" : <>共 <strong>{filtered.length}</strong> 张角色卡{query.trim() ? "符合搜索条件" : ""}</>}</span><span>{loading ? "连接 GitHub 中" : error ? "可以稍后重试" : `来自 GitHub · ${loadedAt?.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 更新`}</span></div>

      <div className="creator-results" aria-busy={loading}>
        {loading ? <div className="creator-loading" role="status"><span className="creator-spinner" /><strong>正在加载角色卡</strong><p>下一段故事，马上与你见面。</p></div> : error ? <EmptyState icon="circle-alert" title="暂时没有连接上 GitHub" description={error}><button type="button" className="creator-button" onClick={retry}><Icon name="refresh-cw" />重新加载</button><a className="creator-text-link" href={ISSUES_URL} target="_blank" rel="noopener noreferrer"><Icon name="github" />前往 GitHub<Icon name="arrow-up-right" /></a></EmptyState> : visible.length ? <div className="creator-card-grid">{visible.map((card, index) => <CharacterCard card={card} key={card.id} index={index} />)}</div> : <EmptyState icon={query.trim() ? "search" : featured ? "sparkles" : "users-round"} title={query.trim() ? "还没有找到这位角色" : featured ? "下一份精选，正在路上" : "故事，从你的创作开始"} description={query.trim() ? "试试其他角色名、作者名或关键词。" : featured ? "精选创作会在这里与你见面，也可以先看看社区的其他角色。" : "暂时没有通过初审的角色卡。分享你的创作，邀请大家一起认识她。"}>{query.trim() ? <button type="button" className="creator-button" onClick={() => changeFilter(setQuery)("")}><Icon name="x" />清空搜索</button> : <a className="creator-button" href={featured ? "#all" : "#submit"}><Icon name={featured ? "layout-grid" : "send"} />{featured ? "浏览全部角色卡" : "分享我的角色卡"}</a>}</EmptyState>}
      </div>
      {!loading && !error && pages > 1 && <div className="creator-bottom-pagination"><Pagination page={current} pages={pages} onChange={(next) => { setPage(next); document.querySelector(".creator-market")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} /></div>}
    </section>
  );
}

function CharacterCard({ card, index }) {
  const [imageFailed, setImageFailed] = React.useState(false);
  return (
    <a className={`creator-character-card${card.featured ? " is-featured" : ""}`} href={card.url} target="_blank" rel="noopener noreferrer" style={{ "--card-delay": `${Math.min(index, 8) * 35}ms` }} aria-label={`${card.name}，作者 ${card.author}，在 GitHub 查看角色卡`}>
      <div className="creator-card-main">
        <div className="creator-avatar" aria-hidden="true">{card.avatar && !imageFailed ? <img src={card.avatar} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /> : <span>{[...card.name][0]}</span>}</div>
        <div className="creator-card-copy"><h3>{card.name}</h3><p className="creator-card-author"><Icon name="github" /><span>{card.author}</span></p><p className="creator-card-description">{card.description}</p></div>
      </div>
    </a>
  );
}

function EmptyState({ icon, title, description, children }) {
  return <div className="creator-empty"><div className="creator-empty-art" aria-hidden="true"><Icon name={icon} /></div><h3>{title}</h3><p>{description}</p><div className="creator-empty-actions">{children}</div></div>;
}

function SubmissionPanel() {
  const attachments = [
    { icon: "image", title: "角色头像", formats: "PNG · JPG · JPEG · WEBP", description: "准备一张静态图片，作为她的第一张名片。", tone: "pink" },
    { icon: "file-text", title: "人格提示词", formats: "TXT · 1000 字以上", description: "写下角色身份、性格、发言风格与示例对话。", tone: "blue" },
    { icon: "audio-lines", title: "参考语音", formats: "MP3 · WAV · 建议 5–30 秒", description: "声音清晰干净，无背景音乐，不需要填写台词。", tone: "mint" },
  ];
  return (
    <section className="creator-submission">
      <div className="creator-panel-heading"><div><h2>角色卡投稿</h2><p>与你笔下的她们，共同走向下一个明天。</p></div><span className="creator-section-mark"><Icon name="send" /></span></div>
      <div className="creator-submit-invitation">
        <span className="creator-submit-symbol"><Icon name="heart" /></span>
        <h3>每一个角色，都有值得分享的故事</h3>
        <p>准备好角色信息与附件，前往 GitHub 填写投稿模板。<br />提交后，通过初审的角色卡就会出现在社区总览中。</p>
        <a className="creator-button creator-button-primary" href={SUBMISSION_URL} target="_blank" rel="noopener noreferrer"><Icon name="github" /><span>前往 GitHub 投稿</span><Icon name="arrow-up-right" /></a>
        <span className="creator-submit-note">使用你的 GitHub 账号 · 自动打开角色卡模板</span>
      </div>
      <div className="creator-submit-checklist">
        <div className="creator-small-heading"><h3>投稿前，准备这些就好</h3><span><span className="creator-required">*</span> 为必填项</span></div>
        <div className="creator-submit-text-fields"><div><Icon name="file-text" /><span><strong>投稿标题 <span className="creator-required">*</span></strong><small>模板已带有 [角色卡投稿] 前缀</small></span></div><div><Icon name="users-round" /><span><strong>角色卡名称 <span className="creator-required">*</span></strong><small>填写你创作的角色名称</small></span></div><div><Icon name="book-open-text" /><span><strong>角色卡介绍 <span className="creator-required">*</span></strong><small>60 字符以内，可选填详细描述</small></span></div></div>
        <div className="creator-attachment-grid">{attachments.map((item) => <div className={`creator-attachment creator-tone-${item.tone}`} key={item.title}><span className="creator-attachment-icon"><Icon name={item.icon} /></span><h4>{item.title} <span className="creator-required">*</span></h4><p>{item.description}</p><span className="creator-format">{item.formats}</span></div>)}</div>
        <div className="creator-declarations"><Icon name="circle-check" /><div><strong>必要上传声明 <span className="creator-required">*</span></strong><p>请阅读共创要求，并在 GitHub 表单中勾选全部三项必要声明。两项可选授权可按自己的意愿选择。</p></div></div>
      </div>
      <div className="creator-submit-footer"><a className="creator-text-link" href="#intro"><Icon name="book-open-text" />先阅读共创计划介绍<Icon name="arrow-up-right" /></a><a className="creator-text-link" href={`${ISSUES_URL}/1`} target="_blank" rel="noopener noreferrer"><Icon name="external-link" />参考已有投稿<Icon name="arrow-up-right" /></a></div>
    </section>
  );
}
