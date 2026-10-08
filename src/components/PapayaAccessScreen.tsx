import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, KeyRound, LockKeyhole, Mail, X } from "lucide-react";
import {
  loginUserAccount,
  registerUserAccount,
  validateAndRedeemAccessKeyWithServer,
} from "../utils/leadDatabase";

type AccessMode = "login" | "register" | "beta";

interface PapayaAccessScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (email?: string, role?: string) => void;
  onUseBetaKey?: () => void;
  lang?: "de" | "en";
}

const COPY = {
  de: {
    brand: "PAPAYAOS",
    close: "Schließen",
    eyebrow: "Sovereign Access Terminal",
    loginTitle: "Willkommen zurück",
    loginLead: "Melde dich an und dein PapayaOS-Workspace läuft dort weiter, wo du aufgehört hast.",
    registerTitle: "Zugang erstellen",
    registerLead: "Ein Konto für deinen Workspace. Registriere dich und starte mit PapayaOS.",
    betaTitle: "Beta-Zugang aktivieren",
    betaLead: "Gib deinen Beta-Key ein, um deinen PapayaOS-Workspace zu öffnen.",
    loginTab: "Anmelden",
    registerTab: "Registrieren",
    email: "name@beispiel.de",
    password: "Passwort",
    confirmPassword: "Passwort wiederholen",
    betaKey: "Beta-Key eingeben",
    loginAction: "Anmelden",
    registerAction: "Konto erstellen",
    betaAction: "Zugang aktivieren",
    busyLogin: "Anmeldung läuft…",
    busyRegister: "Konto wird erstellt…",
    busyBeta: "Zugang wird geprüft…",
    backToLogin: "Zurück zum Login",
    betaButton: "Beta-Key nutzen",
    loginFoot: "Anmeldung über dein PapayaOS-Konto",
    registerFoot: "Dein Konto wird mit dem PapayaOS-Backend erstellt.",
    betaFoot: "Dein Schlüssel wird direkt geprüft.",
    invalidEmail: "Bitte gib eine gültige E-Mail-Adresse ein.",
    shortPassword: "Das Passwort muss mindestens 8 Zeichen lang sein.",
    passwordMismatch: "Die Passwörter stimmen nicht überein.",
    invalidBeta: "Bitte gib deinen Beta-Key ein.",
    unknownError: "Das hat nicht geklappt. Bitte versuche es erneut.",
  },
  en: {
    brand: "PAPAYAOS",
    close: "Close",
    eyebrow: "Sovereign Access Terminal",
    loginTitle: "Welcome back",
    loginLead: "Sign in and pick up your PapayaOS workspace where you left off.",
    registerTitle: "Create your account",
    registerLead: "One account for your workspace. Register and get started with PapayaOS.",
    betaTitle: "Activate beta access",
    betaLead: "Enter your beta key to open your PapayaOS workspace.",
    loginTab: "Sign in",
    registerTab: "Register",
    email: "name@example.com",
    password: "Password",
    confirmPassword: "Repeat password",
    betaKey: "Enter beta key",
    loginAction: "Sign in",
    registerAction: "Create account",
    betaAction: "Activate access",
    busyLogin: "Signing in…",
    busyRegister: "Creating account…",
    busyBeta: "Checking access…",
    backToLogin: "Back to sign in",
    betaButton: "Use a beta key",
    loginFoot: "Sign in with your PapayaOS account",
    registerFoot: "Your account is created through the PapayaOS backend.",
    betaFoot: "Your key is checked securely.",
    invalidEmail: "Enter a valid email address.",
    shortPassword: "Your password must be at least 8 characters.",
    passwordMismatch: "The passwords do not match.",
    invalidBeta: "Enter your beta key.",
    unknownError: "That did not work. Please try again.",
  },
} as const;

/** Full-screen account access screen using the supplied PapayaOS sign-in design. */
export const PapayaAccessScreen: React.FC<PapayaAccessScreenProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onUseBetaKey,
  lang = "de",
}) => {
  const copy = COPY[lang];
  const [mode, setMode] = useState<AccessMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [betaKey, setBetaKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode("login");
    setError("");
    setBusy(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const count = 1400;
    const points = Array.from({ length: count }, (_, index) => {
      const y = 1 - (2 * (index + 0.5)) / count;
      const radius = Math.sqrt(1 - y * y);
      const angle = index * 2.399963;
      return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius, seed: Math.random() };
    });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let side = 1;
    let rotation = 0;
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      side = Math.max(1, canvas.clientWidth);
      canvas.width = Math.round(side * ratio);
      canvas.height = Math.round(side * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      context.clearRect(0, 0, side, side);
      const center = side / 2;
      const radius = side * 0.34;
      const glow = context.createRadialGradient(center, center, radius * 0.55, center, center, radius * 1.35);
      glow.addColorStop(0, "rgba(255,90,0,.22)");
      glow.addColorStop(0.7, "rgba(255,60,0,.12)");
      glow.addColorStop(1, "rgba(255,60,0,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, side, side);

      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.strokeStyle = "rgba(255,170,60,.75)";
      context.lineWidth = side * 0.004;
      context.shadowColor = "#ff7a00";
      context.shadowBlur = side * 0.03;
      context.stroke();
      context.shadowBlur = 0;

      const cosine = Math.cos(rotation);
      const sine = Math.sin(rotation);
      for (const point of points) {
        const x = point.x * cosine + point.z * sine;
        const z = -point.x * sine + point.z * cosine;
        const depth = (z + 1) / 2;
        const dotSize = (0.6 + point.seed * 1.6) * (side / 900) * (0.5 + depth);
        context.globalAlpha = 0.25 + depth * 0.75;
        context.fillStyle = point.seed > 0.8 ? "#fff1c9" : point.seed > 0.4 ? "#ffa733" : "#ff5a14";
        context.beginPath();
        context.arc(center + x * radius, center + point.y * radius, dotSize, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      if (!reduceMotion) {
        rotation += 0.0022;
        frame = window.requestAnimationFrame(draw);
      }
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const switchMode = (next: AccessMode) => {
    setMode(next);
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError("");

    if (mode === "beta") {
      if (!betaKey.trim()) {
        setError(copy.invalidBeta);
        return;
      }
      setBusy(true);
      try {
        const result = await validateAndRedeemAccessKeyWithServer(betaKey.trim());
        if (!result.success) {
          setError(result.message);
          return;
        }
        onSuccess?.();
        onClose();
      } finally {
        setBusy(false);
      }
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError(copy.invalidEmail);
      return;
    }
    if (mode === "register" && password.length < 8) {
      setError(copy.shortPassword);
      return;
    }
    if (mode === "register" && password !== passwordAgain) {
      setError(copy.passwordMismatch);
      return;
    }

    setBusy(true);
    try {
      const result = mode === "login"
        ? await loginUserAccount(cleanEmail, password)
        : await registerUserAccount({
            name: cleanEmail.split("@")[0],
            email: cleanEmail,
            password,
            confirmPassword: passwordAgain,
            plan: "PRO_29",
            goal: "PapayaOS workspace access",
          });

      if (!result.ok || !result.user) {
        setError(result.message || copy.unknownError);
        return;
      }
      onSuccess?.(result.user.email || cleanEmail, result.user.role);
      onClose();
    } catch {
      setError(copy.unknownError);
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "login" ? copy.loginTitle : mode === "register" ? copy.registerTitle : copy.betaTitle;
  const lead = mode === "login" ? copy.loginLead : mode === "register" ? copy.registerLead : copy.betaLead;
  const action = mode === "login" ? copy.loginAction : mode === "register" ? copy.registerAction : copy.betaAction;
  const pending = mode === "login" ? copy.busyLogin : mode === "register" ? copy.busyRegister : copy.busyBeta;
  const foot = mode === "login" ? copy.loginFoot : mode === "register" ? copy.registerFoot : copy.betaFoot;

  return (
    <section className="papaya-access" role="dialog" aria-modal="true" aria-labelledby="papaya-access-title">
      <style>{`
        .papaya-access{--pa-ink:#fff6ee;--pa-mute:#b9a99c;--pa-dim:#7d6d62;--pa-line:rgba(255,255,255,.12);--pa-orange:#ff7a00;--pa-hi:#ff9a2e;position:fixed;inset:0;z-index:500;overflow:auto;color:var(--pa-ink);background:#050000;isolation:isolate;font-family:Inter,Manrope,system-ui,-apple-system,"Segoe UI",sans-serif;overscroll-behavior:contain}
        .papaya-access *{box-sizing:border-box}.papaya-access::before{position:fixed;inset:0;z-index:-1;content:"";pointer-events:none;background:radial-gradient(60% 70% at 78% 45%,rgba(180,30,0,.38),transparent 70%),radial-gradient(40% 40% at 15% 100%,rgba(120,40,0,.25),transparent 70%)}
        .pa-orb{position:fixed;z-index:-1;top:50%;right:-4vw;width:min(62vw,820px);aspect-ratio:1;transform:translateY(-50%);pointer-events:none}
        .pa-nav{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:24px clamp(20px,3.4vw,64px)}.pa-brand{display:inline-flex;align-items:center;gap:10px;color:var(--pa-ink);font-size:15px;font-weight:700;letter-spacing:.03em;text-decoration:none}.pa-brand-mark{width:16px;height:22px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:linear-gradient(160deg,#ffc04d,var(--pa-orange));box-shadow:0 0 14px rgba(255,122,0,.6)}
        .pa-close{display:grid;width:44px;height:44px;place-items:center;border:1px solid rgba(255,192,77,.45);border-radius:14px;background:rgba(255,192,77,.12);color:#ffc04d;cursor:pointer;box-shadow:0 0 24px rgba(255,160,0,.18)}.pa-close:hover{background:rgba(255,192,77,.2)}
        .pa-main{position:relative;z-index:1;display:flex;min-height:calc(100svh - 96px);align-items:center;padding:20px clamp(20px,3.4vw,64px) 90px}.pa-wrap{width:min(100%,480px);animation:pa-rise .55s cubic-bezier(.2,.8,.2,1) both}.pa-eyebrow{display:flex;align-items:center;gap:14px;margin-bottom:22px;color:var(--pa-hi);font-size:11px;letter-spacing:.04em}.pa-eyebrow::before{width:30px;height:1px;background:var(--pa-hi);content:""}.pa-title{margin:0 0 22px;color:var(--pa-ink);font-family:"Cormorant Garamond",Georgia,serif;font-size:clamp(46px,6.2vw,84px);font-weight:400;letter-spacing:-.01em;line-height:.98}.pa-lead{max-width:42ch;margin:0 0 30px;color:var(--pa-mute);font-size:15px;line-height:1.7}
        .pa-tabs{display:inline-flex;gap:2px;margin-bottom:18px;padding:4px;border:1px solid var(--pa-line);border-radius:999px;background:#0005}.pa-tabs button{padding:9px 18px;border:0;border-radius:999px;background:transparent;color:var(--pa-mute);font:500 13px/1.2 Inter,Manrope,system-ui,sans-serif;cursor:pointer;transition:background .2s,color .2s}.pa-tabs button[aria-selected="true"]{background:#fff;color:#1a0a00}.pa-back{display:inline-flex;align-items:center;gap:8px;margin:-2px 0 18px;padding:0;border:0;background:transparent;color:#ffbd8c;font:500 12px/1.3 Inter,Manrope,system-ui,sans-serif;cursor:pointer}.pa-back:hover{color:#fff}
        .pa-form{display:grid;gap:12px}.pa-field{display:flex;min-height:56px;align-items:center;gap:12px;padding:0 20px;border:1px solid var(--pa-line);border-radius:999px;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);transition:border-color .2s,box-shadow .2s}.pa-field:focus-within{border-color:var(--pa-orange);box-shadow:0 0 0 4px rgba(255,122,0,.16)}.pa-field svg{width:18px;height:18px;flex:none;color:var(--pa-dim);stroke-width:1.7}.pa-field input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--pa-ink);font:400 15px/1.4 Inter,Manrope,system-ui,sans-serif}.pa-field input::placeholder{color:var(--pa-dim)}
        .pa-status{min-height:20px;margin:0;padding:0 8px;color:#ff9a7a;font-size:12px;line-height:1.5}.pa-status:empty{min-height:2px}.pa-cta{display:flex;min-height:56px;align-items:center;justify-content:center;gap:10px;border:0;border-radius:999px;background:var(--pa-orange);color:#1a0a00;font:600 15px/1.2 Inter,Manrope,system-ui,sans-serif;cursor:pointer;box-shadow:0 10px 40px rgba(255,122,0,.35);transition:transform .15s,background .2s}.pa-cta:hover{background:var(--pa-hi)}.pa-cta:active{transform:scale(.985)}.pa-cta:disabled{cursor:wait;opacity:.7}.pa-fine{margin:6px 0 0;padding-left:8px;color:var(--pa-dim);font-size:12px}
        .pa-beta{position:fixed;right:20px;bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:3;display:flex;min-height:44px;align-items:center;gap:10px;padding:0 20px;border:1px solid rgba(255,192,77,.5);border-radius:999px;background:rgba(10,4,0,.8);color:var(--pa-ink);font:600 13px/1.2 Inter,Manrope,system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(8px)}.pa-beta svg{width:16px;height:16px;color:#ffc04d;stroke-width:1.8}.pa-beta:hover{background:rgba(255,192,77,.13)}.papaya-access button:focus-visible{outline:2px solid #ffc04d;outline-offset:3px}
        @keyframes pa-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:820px){.pa-orb{right:-40vw;width:120vw;opacity:.55}.pa-main{align-items:flex-end;min-height:calc(100svh - 88px);padding-bottom:96px}.pa-wrap{max-width:480px}.pa-lead{max-width:38ch}}
        @media(max-width:480px){.pa-nav{padding:16px 18px}.pa-main{padding:14px 20px 92px}.pa-title{font-size:clamp(44px,13vw,62px)}.pa-lead{font-size:13px}.pa-tabs button{padding-inline:15px}.pa-field{min-height:52px;padding-inline:17px}.pa-cta{min-height:52px}.pa-beta{right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));min-height:42px;padding-inline:15px;font-size:12px}}
        @media(prefers-reduced-motion:reduce){.pa-wrap{animation:none;opacity:1}}
      `}</style>

      <canvas ref={canvasRef} className="pa-orb" aria-hidden="true" />
      <header className="pa-nav">
        <div className="pa-brand"><span className="pa-brand-mark" aria-hidden="true" />{copy.brand}</div>
        <button className="pa-close" type="button" aria-label={copy.close} onClick={onClose}><X size={18} /></button>
      </header>
      <div className="pa-main">
        <div className="pa-wrap">
          <div className="pa-eyebrow">{copy.eyebrow}</div>
          <h1 id="papaya-access-title" className="pa-title">{title}</h1>
          <p className="pa-lead">{lead}</p>

          {mode !== "beta" ? (
            <div className="pa-tabs" role="tablist" aria-label={lang === "de" ? "Konto-Zugang" : "Account access"}>
              <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => switchMode("login")}>{copy.loginTab}</button>
              <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => switchMode("register")}>{copy.registerTab}</button>
            </div>
          ) : (
            <button className="pa-back" type="button" onClick={() => switchMode("login")}><ArrowRight size={14} style={{ transform: "rotate(180deg)" }} />{copy.backToLogin}</button>
          )}

          <form className="pa-form" noValidate onSubmit={handleSubmit}>
            {mode === "beta" ? (
              <label className="pa-field">
                <KeyRound aria-hidden="true" />
                <input value={betaKey} onChange={(event) => setBetaKey(event.target.value)} autoComplete="off" placeholder={copy.betaKey} aria-label={copy.betaKey} />
              </label>
            ) : (
              <>
                <label className="pa-field">
                  <Mail aria-hidden="true" />
                  <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={copy.email} aria-label={lang === "de" ? "E-Mail-Adresse" : "Email address"} />
                </label>
                <label className="pa-field">
                  <LockKeyhole aria-hidden="true" />
                  <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={copy.password} aria-label={copy.password} />
                </label>
                {mode === "register" && (
                  <label className="pa-field">
                    <LockKeyhole aria-hidden="true" />
                    <input type="password" autoComplete="new-password" value={passwordAgain} onChange={(event) => setPasswordAgain(event.target.value)} placeholder={copy.confirmPassword} aria-label={copy.confirmPassword} />
                  </label>
                )}
              </>
            )}
            <p className="pa-status" role="status" aria-live="polite">{error}</p>
            <button className="pa-cta" type="submit" disabled={busy} aria-busy={busy}>
              {busy ? pending : action}<ArrowRight size={17} aria-hidden="true" />
            </button>
            <p className="pa-fine">{foot}</p>
          </form>
        </div>
      </div>
      <button
        className="pa-beta"
        type="button"
        onClick={() => (onUseBetaKey ? onUseBetaKey() : switchMode("beta"))}
      >
        <KeyRound aria-hidden="true" />{copy.betaButton}
      </button>
    </section>
  );
};

export default PapayaAccessScreen;
