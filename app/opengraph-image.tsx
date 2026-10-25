import { ImageResponse } from "next/og";

export const alt = "Dentist At Door — Dental care, now at your door";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", background: "#f7f5fb", color: "#1f184c", padding: "70px 78px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "70%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 58, height: 58, borderRadius: 16, background: "#1f184c", color: "#ff0000", fontSize: 40, fontWeight: 900 }}>+</div>
          <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 16, letterSpacing: 2 }}>DOCTORS AT DOOR</span><span style={{ fontSize: 28, fontWeight: 800 }}>Dental <b style={{ color: "#ff0000" }}>@</b>Door</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#8b7ec8", fontSize: 19, letterSpacing: 3, fontWeight: 800 }}>PING. WE COORDINATE.</span>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 73, lineHeight: .98, letterSpacing: -4, fontWeight: 800, marginTop: 22 }}><span>Dental care.</span><span>Now at your door.</span></div>
        </div>
        <span style={{ fontSize: 20, color: "#49454f" }}>In collaboration with Vishnoi Dental Hospital</span>
      </div>
      <div style={{ display: "flex", position: "absolute", right: -80, top: -55, width: 440, height: 440, borderRadius: 220, background: "#cfabcf" }} />
      <div style={{ display: "flex", position: "absolute", right: 90, bottom: 70, width: 220, height: 110, borderRadius: 28, background: "#ff0000", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: 34, fontWeight: 900 }}>PING US</div>
    </div>,
    size,
  );
}
