export default function Spinner({ size = 6, color = "border-red-500" }) {
  const px = size * 4;
  return (
    <span className="relative inline-flex" style={{ width: px, height: px }}>
      {/* Outer ring */}
      <span
        style={{ width: px, height: px }}
        className="absolute inset-0 rounded-full border-2 border-white/8 border-t-[var(--red)] animate-spin"
      />
      {/* Inner counter-rotating ring */}
      <span
        style={{ width: px * 0.55, height: px * 0.55, top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
        className="absolute rounded-full border-2 border-white/5 border-b-[var(--amber)] animate-[spin_0.7s_linear_infinite_reverse]"
      />
    </span>
  );
}
