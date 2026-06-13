import type { MarketingImageCardData } from "@/types";

const WIDTH = 1600;
const HEIGHT = 900;

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const words = normalized.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) break;
  }

  if (line && lines.length < maxLines) lines.push(line);
  if (lines.join(" ").length < normalized.length && lines.length) {
    let last = lines.at(-1) ?? "";
    while (last && context.measureText(`${last}...`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = `${last}...`;
  }
  return lines;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  wrapText(context, text, maxWidth, maxLines).forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

function drawPanel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  roundedRect(context, x, y, width, height, 24);
  context.fillStyle = "#0d1a2a";
  context.fill();
  context.strokeStyle = "#29436c";
  context.lineWidth = 2;
  context.stroke();
}

export async function createMarketingCardPng(
  card: MarketingImageCardData,
  imageType: string
) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PNG rendering is not supported in this browser.");

  context.fillStyle = "#07101a";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#5b8def";
  context.fillRect(0, 0, 14, HEIGHT);

  context.textBaseline = "top";
  context.fillStyle = "#8fb2f5";
  context.font = "700 25px Arial, sans-serif";
  context.fillText("MACRO FX MONITOR", 76, 55);
  context.textAlign = "right";
  context.fillText(card.snapshotDate, 1524, 55);
  context.textAlign = "left";

  drawPanel(context, 76, 112, 640, 310);
  context.fillStyle = "#8fb2f5";
  context.font = "700 23px Arial, sans-serif";
  context.fillText(imageType.toUpperCase(), 116, 151);
  context.fillStyle = "#f4f8ff";
  context.font = "800 100px Arial, sans-serif";
  context.fillText(card.score, 112, 200);
  context.fillStyle = "#9bbaf6";
  context.font = "700 43px Arial, sans-serif";
  drawWrappedText(context, card.bias, 116, 330, 545, 50, 2);

  drawPanel(context, 748, 112, 776, 310);
  context.fillStyle = "#8fb2f5";
  context.font = "700 23px Arial, sans-serif";
  context.fillText("TOP MACRO DRIVERS", 792, 151);
  context.font = "600 30px Arial, sans-serif";
  card.drivers.slice(0, 3).forEach((driver, index) => {
    context.fillStyle = "#5b8def";
    context.fillRect(792, 213 + index * 66, 8, 36);
    context.fillStyle = "#edf4ff";
    drawWrappedText(context, driver, 824, 213 + index * 66, 640, 36, 1);
  });

  drawPanel(context, 76, 454, 700, 286);
  context.fillStyle = "#79d8ba";
  context.font = "700 23px Arial, sans-serif";
  context.fillText("CONFIRMATION", 116, 494);
  context.fillStyle = "#dfe9f8";
  context.font = "500 29px Arial, sans-serif";
  drawWrappedText(context, card.confirmation, 116, 548, 620, 42, 4);

  drawPanel(context, 808, 454, 716, 286);
  context.fillStyle = "#f0be76";
  context.font = "700 23px Arial, sans-serif";
  context.fillText("INVALIDATION", 848, 494);
  context.fillStyle = "#dfe9f8";
  context.font = "500 29px Arial, sans-serif";
  drawWrappedText(context, card.invalidation, 848, 548, 636, 42, 4);

  context.strokeStyle = "#29436c";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(76, 788);
  context.lineTo(1524, 788);
  context.stroke();
  context.fillStyle = "#9bbaf6";
  context.font = "600 23px Arial, sans-serif";
  context.fillText(card.snapshotUrl, 76, 823);
  context.textAlign = "right";
  context.fillStyle = "#91a4c0";
  context.font = "500 21px Arial, sans-serif";
  context.fillText("Educational research only. Not investment advice.", 1524, 825);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The PNG could not be generated."));
    }, "image/png");
  });
}
