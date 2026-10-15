import React from "react";
import Icon from "./Icon.jsx";
import { useCreatorAuth } from "./auth.jsx";
import { ISSUES_URL } from "./github.mjs";
import { countCharacters, FILE_RULES, OPTIONAL_DECLARATIONS, REQUIRED_DECLARATIONS, submitCharacterCard, TITLE_PREFIX, validateFile, validateSubmission } from "./submission.mjs";

function RequiredMark() { return <span className="creator-required" aria-label="必填">*</span>; }

function FileUpload({ kind, file, error, onChange, disabled }) {
  const input = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const [preview, setPreview] = React.useState("");
  const rule = FILE_RULES[kind];
  const icon = { avatar: "image", prompt: "file-text", voice: "audio-lines" }[kind];
  React.useEffect(() => {
    if (kind !== "avatar" || !file) { setPreview(""); return undefined; }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [kind, file]);
  const choose = (files) => {
    if (disabled) return;
    if (files.length !== 1) { onChange(null, "每个上传区域请选择一个文件。"); return; }
    const next = files[0];
    const problem = validateFile(next, kind);
    onChange(problem ? null : next, problem);
  };
  return (
    <div className="creator-file-field">
      <label className="creator-field-label" htmlFor={`upload-${kind}`}>{rule.title} <RequiredMark /></label>
      <input id={`upload-${kind}`} ref={input} type="file" accept={rule.extensions.map((extension) => `.${extension}`).join(",")} disabled={disabled} className="creator-file-input" aria-describedby={`file-${kind}-help`} onChange={(event) => { choose(event.target.files); event.target.value = ""; }} />
      <button type="button" className={`creator-upload-zone${dragging ? " is-dragging" : ""}${file ? " has-file" : ""}${error ? " has-error" : ""}`} disabled={disabled} onClick={() => input.current?.click()} onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}>
        {preview ? <img src={preview} alt="已选择的头像预览" className="creator-upload-preview" /> : <span className={`creator-upload-symbol upload-${kind}`}><Icon name={icon} /></span>}
        <span className="creator-upload-title">{file ? file.name : "点击选择，或拖拽文件到这里"}</span>
        <span className="creator-upload-format">{file ? `${(file.size / 1024).toFixed(1)} KB · 点击更换` : `${rule.extensions.map((extension) => extension.toUpperCase()).join(" / ")} · 最大 ${rule.maxBytes / 1024 / 1024} MB`}</span>
        <span className="creator-upload-state"><Icon name={file ? "circle-check" : "upload-cloud"} />{file ? "已选择" : "选择文件"}</span>
      </button>
      <p id={`file-${kind}-help`} className={error ? "creator-field-error" : "creator-field-help"}>{error || (kind === "prompt" ? "UTF-8 纯文本，至少 1000 字。" : kind === "voice" ? "建议 5–30 秒，声音清晰且无背景音乐。" : "使用静态图片，角色头像将裁切为圆形显示。")}</p>
    </div>
  );
}

export default function SubmissionForm() {
  const auth = useCreatorAuth();
  const [draft, setDraft] = React.useState({ title: "", name: "", description: "", detail: "" });
  const [files, setFiles] = React.useState({ avatar: null, prompt: null, voice: null });
  const [fileErrors, setFileErrors] = React.useState({});
  const [required, setRequired] = React.useState([false, false, false]);
  const [optional, setOptional] = React.useState([false, false]);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(null);
  const sequence = React.useRef(0);
  const errors = validateSubmission(draft, files, required);
  const ready = Object.keys(errors).length === 0 && !Object.values(fileErrors).some(Boolean) && !busy;

  const changeFile = async (kind, file, problem) => {
    const selected = kind === "prompt" ? ++sequence.current : 0;
    setFiles((previous) => ({ ...previous, [kind]: file }));
    setFileErrors((previous) => ({ ...previous, [kind]: problem }));
    if (kind !== "prompt" || !file) return;
    setFileErrors((previous) => ({ ...previous, prompt: "正在检查提示词…" }));
    try {
      const text = await file.text();
      if (selected !== sequence.current) return;
      const message = text.includes("\u0000") || text.includes("\ufffd") ? "请使用 UTF-8 编码的纯文本文件。" : countCharacters(text.trim()) < 1000 ? "人格提示词需要至少 1000 字。" : "";
      setFileErrors((previous) => ({ ...previous, prompt: message }));
    } catch { if (selected === sequence.current) setFileErrors((previous) => ({ ...previous, prompt: "无法读取该文件，请重新选择。" })); }
  };
  const update = (field) => (event) => setDraft((previous) => ({ ...previous, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!ready || !auth.user || !auth.session) return;
    setBusy(true);
    setError("");
    try {
      const issue = await submitCharacterCard({ client: auth.client, bucket: auth.bucket, userId: auth.session.user.id, githubUserId: auth.user.id, token: auth.token, draft, files, required, optional, onProgress: setProgress });
      setSuccess(issue);
      setFiles({ avatar: null, prompt: null, voice: null });
    } catch (problem) { setError(problem.message || "投稿失败，请稍后重试。"); }
    finally { setBusy(false); setProgress(""); }
  };

  if (auth.loading) return <div className="creator-loading" role="status"><span className="creator-spinner" /><strong>正在验证 GitHub 身份</strong></div>;
  if (!auth.user) return <div className="creator-submit-invitation"><span className="creator-submit-symbol"><Icon name="github" /></span><h3>让你的创作，与更多人相遇</h3><p>登录后填写角色信息、上传附件，即可提交到社区仓库。<br />投稿会使用你的 GitHub 账号发布。</p>{auth.error && <p className="creator-field-error" role="alert">{auth.error}</p>}<button className="creator-button creator-button-primary" type="button" onClick={auth.signIn}><Icon name="github" />通过 GitHub 登录</button></div>;
  if (success) return <div className="creator-submit-invitation creator-submit-success" role="status"><span className="creator-submit-symbol"><Icon name="circle-check" /></span><h3>投稿已送达</h3><p>感谢分享你的创作。通过初审后，角色卡会出现在社区总览中。</p><a className="creator-button creator-button-primary" href={success.html_url} target="_blank" rel="noopener noreferrer"><Icon name="github" />查看我的投稿<Icon name="arrow-up-right" /></a></div>;

  return (
    <form className="creator-submission-form" onSubmit={submit}>
      <div className="creator-form-identity"><Icon name="github" /><span>以 <strong>@{auth.user.login}</strong> 的身份投稿</span><span className="creator-form-required-note"><RequiredMark /> 为必填项</span></div>
      <fieldset disabled={busy}>
        <div className="creator-form-field"><label className="creator-field-label" htmlFor="card-title">投稿标题 <RequiredMark /></label><div className="creator-prefixed-input"><span>{TITLE_PREFIX}</span><input id="card-title" name="title" value={draft.title} onChange={update("title")} required maxLength={240} placeholder="为你的投稿起个标题" /></div></div>
        <div className="creator-form-field"><label className="creator-field-label" htmlFor="card-name">角色卡名称 <RequiredMark /></label><input id="card-name" name="name" value={draft.name} onChange={update("name")} required maxLength={100} placeholder="请输入角色名称" /></div>
        <div className="creator-form-field"><label className="creator-field-label" htmlFor="card-description">角色卡介绍 <RequiredMark /><span className="creator-field-counter">{countCharacters(draft.description)} / 60</span></label><input id="card-description" name="description" value={draft.description} onChange={update("description")} required maxLength={60} placeholder="一句话介绍角色，导入后作为个性签名显示" /></div>
        <div className="creator-form-field"><label className="creator-field-label" htmlFor="card-detail">详细描述 <span className="creator-optional-label">选填</span><span className="creator-field-counter">{countCharacters(draft.detail)} / 1000</span></label><textarea id="card-detail" name="detail" value={draft.detail} onChange={update("detail")} maxLength={1000} rows={4} placeholder="关于角色的更多设定、创作说明或使用建议…" /></div>
        <div className="creator-form-uploads">{["avatar", "prompt", "voice"].map((kind) => <FileUpload kind={kind} key={kind} file={files[kind]} error={fileErrors[kind]} onChange={(file, problem) => changeFile(kind, file, problem)} disabled={busy} />)}</div>
        <div className="creator-form-declarations"><h3>必要上传声明 <RequiredMark /></h3><p>请阅读并勾选以下全部三项。</p>{REQUIRED_DECLARATIONS.map((text, index) => <label className="creator-form-checkbox" key={text}><input type="checkbox" required checked={required[index]} onChange={(event) => setRequired((previous) => previous.map((value, i) => i === index ? event.target.checked : value))} /><span className="creator-checkbox-mark"><Icon name="check" /></span><span>{text} <RequiredMark /></span></label>)}</div>
        <div className="creator-form-declarations creator-form-optional"><h3>可选声明 <span className="creator-optional-label">自愿授权</span></h3>{OPTIONAL_DECLARATIONS.map((text, index) => <label className="creator-form-checkbox" key={text}><input type="checkbox" checked={optional[index]} onChange={(event) => setOptional((previous) => previous.map((value, i) => i === index ? event.target.checked : value))} /><span className="creator-checkbox-mark"><Icon name="check" /></span><span>{text}</span></label>)}</div>
      </fieldset>
      {error && <div className="creator-submit-error" role="alert"><Icon name="circle-alert" /><p>{error}</p><a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">检查已有投稿</a></div>}
      <div className="creator-form-submit"><span aria-live="polite">{busy ? progress : ready ? "准备好了，让大家认识你的角色。" : "填写必填内容并勾选全部必要声明后即可提交。"}</span><button type="submit" disabled={!ready} className="creator-button creator-button-primary"><Icon name={busy ? "loader-circle" : "send"} className={busy ? "is-spinning" : ""} />{busy ? "正在提交" : "提交"}</button></div>
      <p className="creator-form-storage-note">投稿及附件会公开分享。附件由社区的 Supabase 存储托管，Issue 发布到 GitHub。</p>
    </form>
  );
}
