import { GLYPHS } from "./glyphs";

/**
 * One component for every glyph in glyphs.js: <Icon name="task" className="w-4 h-4" />.
 * The look matches the named icons in ./index.js (24 grid, 2px round stroke, currentColor), so both can sit side by side.
 * Decorative by default (aria-hidden); pass `title` when the icon is the only label of a control.
 */
export default function Icon({ name, className = "w-5 h-5", title, ...props }) {
  const glyph = GLYPHS[name];
  if (!glyph) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {glyph}
    </svg>
  );
}
