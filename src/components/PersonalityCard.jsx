import { useState, useRef } from "react";
import { getPersonality } from "../utils/personalityEngine";

const card = {
  background: "linear-gradient(145deg,#1A2333,#0F172A)",
  border: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  borderRadius: "16px"
};

/**
 * Generate share image using Canvas API
 * Returns a Blob that can be shared or downloaded
 */
async function generateShareImage(personality, userName) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920; // Instagram story size
  const ctx = canvas.getContext("2d");

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
  bgGrad.addColorStop(0, "#0B0F1A");
  bgGrad.addColorStop(1, "#020617");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1920);

  // Color accent circles (decorative)
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = personality.color;
  ctx.beginPath();
  ctx.arc(900, 200, 300, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(150, 1700, 250, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;

  // DhanTrack branding at top
  ctx.fillStyle = "#34D399";
  ctx.font = "bold 50px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DhanTrack", 540, 200);

  ctx.fillStyle = "#6B7280";
  ctx.font = "30px system-ui";
  ctx.fillText("Personal Finance Tracker", 540, 250);

  // Center icon (big)
  ctx.font = "300px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(personality.icon, 540, 720);

  // Personality name
  ctx.fillStyle = personality.color;
  ctx.font = "bold 90px system-ui";
  ctx.fillText(personality.name, 540, 900);

  // "I'm a..." text
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "40px system-ui";
  ctx.fillText("I'm a...", 540, 820);

  // Fact line
  ctx.fillStyle = "#E5E7EB";
  ctx.font = "44px system-ui";
  wrapText(ctx, personality.fact, 540, 1020, 900, 60);

  // Description
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "36px system-ui";
  wrapText(ctx, personality.description, 540, 1200, 900, 50);

  // User name at bottom
  ctx.fillStyle = "#E5E7EB";
  ctx.font = "bold 50px system-ui";
  ctx.fillText(`— ${userName || "DhanTrack User"}`, 540, 1550);

  // Footer CTA
  ctx.fillStyle = "#34D399";
  ctx.font = "bold 38px system-ui";
  ctx.fillText("Track your money smarter", 540, 1750);

  ctx.fillStyle = "#6B7280";
  ctx.font = "30px system-ui";
  ctx.fillText("dhantrack-one.vercel.app", 540, 1810);

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), "image/png", 0.95);
  });
}

/**
 * Helper: wrap text for canvas
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lines = [];

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      lines.push(line.trim());
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  lines.forEach((l, i) => {
    ctx.fillText(l, x, y + i * lineHeight);
  });
}

export default function PersonalityCard({ firestoreData, autopayList = [], user }) {
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const {
    investments = [],
    spendings = [],
    totalInvested = 0,
    totalSpent = 0,
    netBalance = 0,
  } = firestoreData || {};

  const result = getPersonality({
    investments,
    spendings,
    autopayList,
    totalInvested,
    totalSpent,
    netBalance,
  });

  // ═══ EMPTY STATE (not enough data) ═══
  if (!result.eligible) {
    return (
      <div style={{
        ...card,
        padding: "20px",
        marginBottom: "16px",
        background: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(52,211,153,0.04))",
        border: "1px solid rgba(139,92,246,0.15)",
      }}>
        <div style={{display:"flex", alignItems:"center", gap:"14px"}}>
          <div style={{
            width:"56px", height:"56px", borderRadius:"14px",
            background:"rgba(139,92,246,0.12)",
            border:"1px solid rgba(139,92,246,0.25)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"28px", flexShrink:0,
          }}>
            🔮
          </div>
          <div style={{flex:1, minWidth:0}}>
            <p style={{color:"#E5E7EB", fontSize:"14px", fontWeight:700, marginBottom:"3px"}}>
              Spending Personality Coming Soon!
            </p>
            <p style={{color:"#9CA3AF", fontSize:"11px", lineHeight:"1.5"}}>
              {result.daysToUnlock > 0 && (
                <>Use the app for <span style={{color:"#8B5CF6",fontWeight:600}}>{result.daysToUnlock} more day{result.daysToUnlock !== 1 ? "s" : ""}</span></>
              )}
              {result.daysToUnlock > 0 && result.entriesNeeded > 0 && " and "}
              {result.entriesNeeded > 0 && (
                <>add <span style={{color:"#8B5CF6",fontWeight:600}}>{result.entriesNeeded} more entr{result.entriesNeeded !== 1 ? "ies" : "y"}</span></>
              )}
              {" "}to discover your money personality! ✨
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══ PERSONALITY UNLOCKED ═══
  const p = result.personality;

  async function handleShare() {
    setSharing(true);
    setShareMessage("");
    try {
      const blob = await generateShareImage(p, user?.name);
      if (!blob) throw new Error("Failed to generate image");

      // Try Web Share API first (mobile)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `dhantrack-${p.id}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "My DhanTrack Personality",
            text: `I'm a ${p.name}! ${p.fact}\n\nFind your money personality on DhanTrack!`,
          });
          setShareMessage("Shared! 🎉");
          setTimeout(() => setShareMessage(""), 3000);
          setSharing(false);
          return;
        }
      }

      // Fallback: download image
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dhantrack-personality-${p.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShareMessage("Image saved! Share it anywhere 🎉");
      setTimeout(() => setShareMessage(""), 3000);
    } catch (e) {
      console.error("Share error:", e);
      setShareMessage("Couldn't share. Try again?");
      setTimeout(() => setShareMessage(""), 3000);
    }
    setSharing(false);
  }

  return (
    <div style={{
      ...card,
      padding: "20px",
      marginBottom: "16px",
      background: `linear-gradient(135deg, ${p.color}10, rgba(15,23,42,0.6))`,
      border: `1px solid ${p.color}30`,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative background blur */}
      <div style={{
        position: "absolute",
        top: "-40px", right: "-40px",
        width: "180px", height: "180px",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${p.color}25, transparent 70%)`,
        pointerEvents: "none",
      }}/>

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        marginBottom: "14px",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{
          width: "56px", height: "56px", borderRadius: "14px",
          background: `${p.color}15`,
          border: `1px solid ${p.color}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "30px", flexShrink: 0,
        }}>
          {p.icon}
        </div>
        <div style={{flex: 1, minWidth: 0}}>
          <p style={{
            color: "#6B7280",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: 600,
            marginBottom: "3px",
          }}>
            ✨ Your Money Personality
          </p>
          <p style={{
            color: p.color,
            fontSize: "18px",
            fontWeight: 700,
            marginBottom: "2px",
          }}>
            {p.name}
          </p>
          <p style={{
            color: "#E5E7EB",
            fontSize: "12px",
            fontFamily: "monospace",
          }}>
            {p.fact}
          </p>
        </div>
      </div>

      {/* Description */}
      <p style={{
        color: "#9CA3AF",
        fontSize: "13px",
        lineHeight: "1.6",
        marginBottom: "14px",
        position: "relative",
        zIndex: 1,
      }}>
        {p.description}
      </p>

      {/* Share button */}
      <div style={{display: "flex", gap: "8px", position: "relative", zIndex: 1}}>
        <button onClick={handleShare} disabled={sharing} style={{
          flex: 1,
          padding: "10px 16px",
          background: sharing ? `${p.color}30` : `linear-gradient(135deg, ${p.color}, ${p.color}cc)`,
          border: `1px solid ${p.color}50`,
          borderRadius: "10px",
          color: "#fff",
          fontSize: "12px",
          fontWeight: 700,
          cursor: sharing ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          transition: "all .2s",
        }}>
          {sharing ? "Generating..." : "📤 Share to Instagram / WhatsApp"}
        </button>
      </div>

      {shareMessage && (
        <p style={{
          marginTop: "8px",
          textAlign: "center",
          color: p.color,
          fontSize: "11px",
          fontWeight: 600,
        }}>
          {shareMessage}
        </p>
      )}

      {/* Stats badge */}
      <p style={{
        color: "#6B7280",
        fontSize: "10px",
        textAlign: "center",
        marginTop: "10px",
        fontFamily: "monospace",
      }}>
        Based on your last {result.daysOfData} days of data · Updates daily
      </p>
    </div>
  );
}