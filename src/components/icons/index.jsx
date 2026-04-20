// Camera-function icons. 24x24 viewBox, stroke="currentColor" stroke-width="1.5",
// fill="none" unless the glyph is filled. Callers drive colour via CSS `color:`.
// Each icon accepts: { size = 20, title, className, ...rest }.

function IconBase({ size = 20, title, className, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function ApertureIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3 L15 10 L21 12" />
      <path d="M21 12 L15 14 L13 21" />
      <path d="M13 21 L10 15 L3 12" />
      <path d="M3 12 L9 10 L12 3" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function ShutterIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12 L12 5" />
      <path d="M12 12 L17 13" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function IsoIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="2.5" y="7" width="19" height="10" rx="3" />
      <text x="12" y="14.6" textAnchor="middle" fontSize="7" fontFamily="'Fraunces', Georgia, serif" fontWeight="700" fill="currentColor" stroke="none">ISO</text>
    </IconBase>
  );
}

export function EvIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 19 L12 5 L20 19" />
      <path d="M8 17 L16 17" />
      <path d="M12 12 L12 8 M10 10 L14 10" />
      <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function ModeDialIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3 L12 5" />
      <path d="M12 19 L12 21" />
      <path d="M3 12 L5 12" />
      <path d="M19 12 L21 12" />
      <path d="M6 6 L7.5 7.5" />
      <path d="M16.5 16.5 L18 18" />
      <path d="M18 6 L16.5 7.5" />
      <path d="M7.5 16.5 L6 18" />
      <path d="M12 12 L15 9" />
    </IconBase>
  );
}

export function FocusIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 7 L3 4 L6 4" />
      <path d="M18 4 L21 4 L21 7" />
      <path d="M21 17 L21 20 L18 20" />
      <path d="M6 20 L3 20 L3 17" />
      <circle cx="12" cy="12" r="2.5" />
    </IconBase>
  );
}

export function StabIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M12 2 L12 6 M12 18 L12 22" />
      <path d="M2 12 L6 12 M18 12 L22 12" />
      <circle cx="12" cy="12" r="2" />
    </IconBase>
  );
}

export function FlashOnIcon({ size = 20, title, className, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d="M13 2 L4 14 L11 14 L10 22 L20 9 L13 9 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FlashOffIcon({ size = 20, title, className, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d="M13 2 L4 14 L11 14 L10 22 L20 9 L13 9 Z" fill="currentColor" stroke="none" opacity="0.4" />
      <path d="M3 3 L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const STYLE_PALETTE = {
  Standard:    ["#d8cfc0", "#3d2b1f"],
  Vibrant:     ["#e86a9a", "#3d2b1f"],
  Natural:     ["#6aad7e", "#3d2b1f"],
  Luminous:    ["#f5c96b", "#3d2b1f"],
  Dramatic:    ["#2a5560", "#3d2b1f"],
  Quiet:       ["#b8b0cc", "#3d2b1f"],
  Amber:       ["#e8a020", "#3d2b1f"],
  Gold:        ["#d4a84b", "#3d2b1f"],
  "Rose Gold": ["#d99aa0", "#3d2b1f"],
  Ethereal:    ["#9ec4d0", "#3d2b1f"],
};

export function StyleSwatchIcon({ style = "Standard", size = 20, title, className, ...rest }) {
  const [a, b] = STYLE_PALETTE[style] || STYLE_PALETTE.Standard;
  const gradId = `sty-${style.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </linearGradient>
      </defs>
      <rect x="3" y="6" width="8" height="12" rx="2" fill={a} />
      <rect x="13" y="6" width="8" height="12" rx="2" fill={`url(#${gradId})`} />
    </svg>
  );
}

export function CameraControlIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="8" width="18" height="8" rx="3" />
      <circle cx="18" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M6 12 L12 12" />
    </IconBase>
  );
}

export function LockIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10 L8 7 A4 4 0 0 1 16 7 L16 10" />
      <rect x="10" y="13" width="4" height="4" rx="0.5" />
    </IconBase>
  );
}

export function MacroIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="10" cy="10" r="5" />
      <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M10 5 L10 3" />
      <path d="M10 15 L10 17" />
      <path d="M5 10 L3 10" />
      <path d="M15 10 L17 10" />
      <path d="M14 14 L20 20" />
    </IconBase>
  );
}

export function NightIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M20 15 A8 8 0 1 1 9 4 A6 6 0 0 0 20 15 Z" fill="currentColor" />
    </IconBase>
  );
}

const LENS_LABEL = {
  ultrawide: "0.5",
  main: "1",
  tele2x: "2",
  tele5x: "5",
  truedepth: "FR",
};

export function LensRingIcon({ lens = "main", size = 20, title, className, ...rest }) {
  const label = LENS_LABEL[lens] || "•";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="6" opacity="0.4" />
      <text x="12" y="14.6" textAnchor="middle" fontSize="7.5" fontFamily="'Fraunces', Georgia, serif" fontWeight="700" fill="currentColor" stroke="none">{label}×</text>
    </svg>
  );
}

export function SunCompassIcon({ azimuthDeg = 180, size = 22, title, className, ...rest }) {
  // rotate the sun around centre; azimuth 0 = North (top), 90 = East (right).
  const rad = ((azimuthDeg - 90) * Math.PI) / 180;
  const r = 8;
  const cx = 12 + r * Math.cos(rad);
  const cy = 12 + r * Math.sin(rad);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="10" opacity="0.3" />
      <text x="12" y="4.5" textAnchor="middle" fontSize="4" fill="currentColor" stroke="none">N</text>
      <text x="20" y="13.2" textAnchor="middle" fontSize="4" fill="currentColor" stroke="none">E</text>
      <text x="12" y="22" textAnchor="middle" fontSize="4" fill="currentColor" stroke="none">S</text>
      <text x="4" y="13.2" textAnchor="middle" fontSize="4" fill="currentColor" stroke="none">W</text>
      <circle cx={cx} cy={cy} r="2.2" fill="#e8a020" stroke="none" />
    </svg>
  );
}
