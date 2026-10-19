import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowUpRight, Check, Copy, ImageIcon, Mic, Volume2, X } from "lucide-react";
import type { AgentConfig, Message } from "../types";
import { ModernFormattedText, MultiAgentResponseCard } from "./MultiAgentResponseCard";
import { extractImagesFromPasteEvent } from "../utils/pasteImage";
import { isVideoUrl } from "../utils/mediaUtils";
import { copyToClipboard } from "../utils/clipboard";

interface Props {
  currentAgent: AgentConfig;
  messages: Message[];
  isLoading: boolean;
  inputText: string;
  onChangeInputText: (text: string) => void;
  onSendMessage: (text?: string) => void;
  micActive?: boolean;
  onToggleMic?: () => void;
  onImageSelect?: (file: File) => void;
  onImagesSelect?: (files: FileList | File[]) => void;
  effectiveImages: string[];
  onRemoveImage?: (index: number) => void;
  onClearImage?: () => void;
  onSpeak?: (text: string, agentId?: string) => void;
  agentColorMap: Record<string, string>;
  onOpenAgentSyncSynthesis?: () => void;
  onOpenVoiceConference?: (topic?: string) => void;
  lang: "de" | "en";
  activityState?: string;
}
const identities: Record<string, { name: string; image: string }> = {
  syntax: { name: "Papaya", image: "papaya" }, maze: { name: "Papaya", image: "papaya" },
  pulse: { name: "Mango", image: "mango" }, chronos: { name: "Kiwi", image: "kiwi" },
};
function Media({ urls }: { urls: string[] }) {
  return urls.length ? <div className="standard-message-media">{urls.map((url, i) => isVideoUrl(url)
    ? <video key={`${url}-${i}`} src={url} controls playsInline/>
    : <img key={`${url}-${i}`} src={url} alt={`Attachment ${i + 1}`} loading="lazy"/>)}</div> : null;
}
const Reply: React.FC<{ message: Message; p: Props }> = ({ message, p }) => {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  const who = identities[message.role] || { name: message.role, image: "papaya" };
  if (message.isMultiAgent || message.isAgentSync || message.isCompare || message.multiResponses?.length) return <MultiAgentResponseCard msg={message} lang={p.lang} onSpeak={p.onSpeak} agentColorMap={p.agentColorMap} onOpenAgentSyncSynthesis={p.onOpenAgentSyncSynthesis} onOpenVoiceConference={p.onOpenVoiceConference}/>;
  return <article className="standard-message standard-message--assistant">
    <img className="standard-message-avatar" src={`/mascots/${who.image}-avatar.png`} alt=""/>
    <div className="standard-message-body">
      <div className="standard-bubble"><span className="standard-message-author">{who.name}</span><ModernFormattedText text={message.content}/><Media urls={[...(message.imageUrls || (message.imageUrl ? [message.imageUrl] : [])), ...(message.videoUrls || (message.videoUrl ? [message.videoUrl] : []))]}/></div>
      <div className="standard-message-actions">
        <button type="button" onClick={async () => { if (await copyToClipboard(message.content)) { setCopied(true); clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(false), 1800); } }}><span aria-hidden="true">{copied ? <Check size={14}/> : <Copy size={14}/>}</span>{copied ? (p.lang === "de" ? "Kopiert" : "Copied") : (p.lang === "de" ? "Kopieren" : "Copy")}</button>
        {p.onSpeak && <button type="button" onClick={() => p.onSpeak?.(message.content, message.role)}><Volume2 size={15}/>{p.lang === "de" ? "Vorlesen" : "Read aloud"}</button>}
      </div>
      {message.thought && <details className="standard-thought"><summary>{p.lang === "de" ? "Gedankengang" : "Reasoning"}</summary><ModernFormattedText text={message.thought}/></details>}
    </div>
  </article>;
};
export function StandardChatPanel(p: Props) {
  const de = p.lang === "de";
  const who = identities[p.currentAgent.id] || { name: p.currentAgent.short, image: "papaya" };
  const messages = p.messages.filter(m => !m.id.startsWith("greet-"));
  const hasMessages = messages.length > 0;
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => { follow.current = true; textarea.current?.focus(); }, [p.currentAgent.id]);
  useEffect(() => { if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [p.messages, p.isLoading, p.currentAgent.id]);
  const prompts = p.currentAgent.id === "pulse"
    ? (de ? ["Entwirf eine E-Mail", "Hilf mir bei einer Antwort", "Schreib einen Social-Post"] : ["Draft an email", "Help me write a reply", "Write a social post"])
    : p.currentAgent.id === "chronos"
    ? (de ? ["Plane meine Woche", "Teile mein Ziel in Schritte auf", "Entwirf eine Morgenroutine"] : ["Plan my week", "Break my goal into steps", "Design a morning routine"])
    : (de ? ["Erkläre mir ein Thema", "Schreib einen kurzen Text", "Prüfe meinen Code"] : ["Explain a topic", "Write a short text", "Review my code"]);
  const description = p.currentAgent.id === "pulse"
    ? (de ? "Finde die richtigen Worte." : "Find the right words.")
    : p.currentAgent.id === "chronos" ? (de ? "Mach Platz für das, was zählt." : "Make room for what matters.")
    : (de ? "Deine Ideen fangen hier an." : "Your ideas start here.");
  const send = () => {
    if (p.isLoading || (!p.inputText.trim() && !p.effectiveImages.length)) return;
    follow.current = true;
    p.onSendMessage(p.inputText);
    p.onChangeInputText("");
    if (textarea.current) textarea.current.style.height = "auto";
  };
  return <div className="standard-chat-panel" data-mood={p.isLoading ? "thinking" : p.activityState === "speaking" ? "talking" : "idle"}>
    <div className="standard-log" ref={scroll} onScroll={() => { const el = scroll.current; if (el) follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90; }} role="log" aria-label={de ? "Nachrichten" : "Messages"} aria-live="polite" aria-relevant="additions text">
      {!hasMessages && !p.isLoading ? <div className="standard-welcome" key={p.currentAgent.id}>
        <div className="standard-hero"><img src={`/mascots/${who.image}.png`} alt={who.name}/></div>
        <h1>{de ? `Hey, ich bin ${who.name}.` : `Hey, I'm ${who.name}.`}</h1><p>{description}</p>
        <div className="standard-suggestions">{prompts.map(prompt => <button type="button" key={prompt} onClick={() => { p.onChangeInputText(prompt); textarea.current?.focus(); }}>{prompt}<ArrowUpRight size={18}/></button>)}</div>
      </div> : messages.map(message => message.role === "user" ? <article className="standard-message standard-message--user" key={message.id}><div className="standard-bubble"><p>{message.content}</p><Media urls={message.imageUrls || (message.imageUrl ? [message.imageUrl] : [])}/></div></article> : <Reply key={message.id} message={message} p={p}/>)}
      {p.isLoading && <div className="standard-pending" role="status"><img src={`/mascots/${who.image}-avatar.png`} alt=""/><span>{de ? `${who.name} denkt nach` : `${who.name} is thinking`}</span><i/><i/><i/></div>}
    </div>
    {hasMessages && <div className="standard-companion" aria-hidden="true"><img src={`/mascots/${who.image}.png`} alt=""/></div>}
    <div className="standard-composer-dock">
      {p.effectiveImages.length > 0 && <div className="standard-attachments">{p.effectiveImages.map((url, i) => <div key={`${url}-${i}`}><Media urls={[url]}/>{p.onRemoveImage && <button type="button" aria-label={de ? `Anhang ${i + 1} entfernen` : `Remove attachment ${i + 1}`} onClick={() => p.onRemoveImage?.(i)}><X size={13}/></button>}</div>)}{p.onClearImage && <button type="button" onClick={p.onClearImage}>{de ? "Alle entfernen" : "Remove all"}</button>}</div>}
      <form className="standard-composer" onSubmit={e => { e.preventDefault(); send(); }}>
        {hasMessages && <img className="standard-composer-avatar" src={`/mascots/${who.image}-avatar.png`} alt=""/>}
        <input type="file" ref={fileInput} accept="image/*,video/*" multiple hidden onChange={e => { if (e.target.files?.length) { if (p.onImagesSelect) p.onImagesSelect(e.target.files); else p.onImageSelect?.(e.target.files[0]); } e.target.value = ""; }}/>
        <textarea ref={textarea} rows={1} value={p.inputText} aria-label={de ? `Nachricht an ${who.name}` : `Message ${who.name}`} placeholder={p.micActive ? (de ? "Ich höre zu …" : "Listening …") : (de ? `Sag etwas zu ${who.name} …` : `Say something to ${who.name} …`)} onChange={e => { p.onChangeInputText(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`; }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} onPaste={e => { if (!p.onImagesSelect && !p.onImageSelect) return; const files = extractImagesFromPasteEvent(e); if (files.length) { e.preventDefault(); if (p.onImagesSelect) p.onImagesSelect(files); else p.onImageSelect?.(files[0]); } }}/>
        {(p.onImageSelect || p.onImagesSelect) && <button className="standard-icon" type="button" onClick={() => fileInput.current?.click()} aria-label={de ? "Bild oder Video anhängen" : "Attach image or video"} title={de ? "Anhang" : "Attachment"}><ImageIcon size={19}/></button>}
        {p.onToggleMic && <button className="standard-icon" type="button" onClick={p.onToggleMic} aria-pressed={p.micActive} aria-label={de ? "Spracheingabe" : "Voice input"} title={de ? "Spracheingabe" : "Voice input"}><Mic size={19}/></button>}
        <button className="standard-send" type="submit" disabled={p.isLoading || (!p.inputText.trim() && !p.effectiveImages.length)} aria-label={de ? "Nachricht senden" : "Send message"}><ArrowUp size={23}/></button>
      </form>
      <p className="standard-disclaimer">{de ? "KI kann Fehler machen. Prüfe wichtige Informationen." : "AI can make mistakes. Check important information."}</p>
    </div>
  </div>;
}
