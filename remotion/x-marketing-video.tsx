import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { splitVoiceoverSubtitles } from "../lib/marketing-video";

export type XMarketingVideoProps = {
  title: string;
  score: string;
  bias: string;
  drivers: string[];
  confirmation: string;
  invalidation: string;
  snapshotUrl: string;
  snapshotDate: string;
  durationSeconds: number;
  hook: string;
  voiceoverScript: string;
  musicEnabled: boolean;
  musicUrl: string;
  musicVolume: number;
  subtitlesEnabled: boolean;
  voiceoverUrl: string;
};

const disclaimer = "Educational research only. Not investment advice.";

function Slide({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.35], [0, 1], {
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, fps * 0.35], [35, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={styles.slide}>
      <div style={styles.brand}>MACRO FX MONITOR</div>
      <div style={{ ...styles.content, opacity, transform: `translateY(${translateY}px)` }}>
        {children}
      </div>
      {subtitle ? <div style={styles.subtitleBar}>{subtitle}</div> : null}
      <div style={styles.footer}>{disclaimer}</div>
    </AbsoluteFill>
  );
}

export function XMarketingVideo(props: XMarketingVideoProps) {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const progress = `${Math.min(100, (frame / durationInFrames) * 100)}%`;
  const subtitleChunks = splitVoiceoverSubtitles(props.voiceoverScript);
  const subtitle = props.subtitlesEnabled && subtitleChunks.length
    ? subtitleChunks[Math.min(
        subtitleChunks.length - 1,
        Math.floor((frame / durationInFrames) * subtitleChunks.length)
      )]
    : undefined;
  const hookLength = 60;
  const scoreLength = 120;
  const driversLength = 240;
  const scenarioLength = 240;
  const closeLength = 240;
  return (
    <AbsoluteFill style={styles.root}>
      {props.musicEnabled && props.musicUrl ? <Audio src={mediaSource(props.musicUrl)} volume={props.musicVolume} /> : null}
      {props.voiceoverUrl ? <Audio src={mediaSource(props.voiceoverUrl)} volume={1} /> : null}
      <Sequence durationInFrames={hookLength}>
        <Slide subtitle={subtitle}><div style={styles.kicker}>30-SECOND MACRO SIGNAL UPDATE</div><h1 style={styles.title}>{props.hook}</h1></Slide>
      </Sequence>
      <Sequence from={hookLength} durationInFrames={scoreLength}>
        <Slide subtitle={subtitle}><div style={styles.kicker}>DXY REGIME SCORE</div><AnimatedScore score={props.score} fps={fps} /><h2 style={styles.subtitle}>{props.bias}</h2></Slide>
      </Sequence>
      <Sequence from={hookLength + scoreLength} durationInFrames={driversLength}>
        <DriverSlide drivers={props.drivers} subtitle={subtitle} />
      </Sequence>
      <Sequence from={hookLength + scoreLength + driversLength} durationInFrames={scenarioLength}>
        <Slide subtitle={subtitle}><div style={styles.kicker}>SCENARIO CHECK</div><p style={styles.body}><b>Confirmation:</b> {props.confirmation}</p><p style={styles.body}><b>But this bias breaks if:</b> {props.invalidation}</p></Slide>
      </Sequence>
      <Sequence from={hookLength + scoreLength + driversLength + scenarioLength} durationInFrames={closeLength}>
        <Slide subtitle={subtitle}><div style={styles.kicker}>FULL SOURCE-BACKED SNAPSHOT</div><h2 style={styles.subtitle}>{props.snapshotUrl}</h2><p style={styles.body}>{props.snapshotDate}</p></Slide>
      </Sequence>
      <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: progress }} /></div>
    </AbsoluteFill>
  );
}

function mediaSource(value: string) {
  return value.startsWith("/") ? staticFile(value.slice(1)) : value;
}

function AnimatedScore({ score, fps }: { score: string; fps: number }) {
  const frame = useCurrentFrame();
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  return <div style={{ ...styles.score, transform: `scale(${scale})` }}>{score}</div>;
}

function DriverSlide({ drivers, subtitle }: { drivers: string[]; subtitle?: string }) {
  const frame = useCurrentFrame();
  return (
    <Slide subtitle={subtitle}>
      <div style={styles.kicker}>TOP MACRO DRIVERS</div>
      {drivers.map((driver, index) => {
        const opacity = interpolate(frame, [index * 55, index * 55 + 20], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        return <p style={{ ...styles.driver, opacity }} key={driver}>{index + 1}. {driver}</p>;
      })}
    </Slide>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    backgroundColor: "#07101a",
    color: "#edf4ff",
    fontFamily: "Arial, sans-serif",
  },
  slide: {
    padding: 90,
    background: "radial-gradient(circle at 80% 0%, rgba(72,126,231,.28), transparent 38%), linear-gradient(145deg, #0d192a, #07101a)",
  },
  brand: {
    color: "#8fb2f5",
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: 5,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 28,
  },
  kicker: {
    color: "#8fb2f5",
    fontSize: 25,
    fontWeight: 800,
    letterSpacing: 4,
  },
  title: {
    maxWidth: 1200,
    margin: 0,
    fontSize: 104,
    lineHeight: 1.04,
  },
  subtitle: {
    maxWidth: 1250,
    margin: 0,
    fontSize: 66,
    lineHeight: 1.1,
  },
  score: {
    fontSize: 170,
    fontWeight: 850,
    letterSpacing: -8,
  },
  body: {
    maxWidth: 1250,
    margin: 0,
    color: "#c7d5e9",
    fontSize: 38,
    lineHeight: 1.35,
  },
  driver: {
    maxWidth: 1250,
    margin: 0,
    padding: "19px 24px",
    border: "1px solid rgba(143,178,245,.25)",
    borderRadius: 12,
    backgroundColor: "rgba(143,178,245,.07)",
    fontSize: 38,
  },
  footer: {
    paddingTop: 25,
    borderTop: "1px solid rgba(143,178,245,.22)",
    color: "#8fa2bd",
    fontSize: 22,
  },
  subtitleBar: {
    marginBottom: 18,
    padding: "14px 20px",
    borderRadius: 10,
    backgroundColor: "rgba(2, 7, 14, .82)",
    color: "#f3f7fd",
    fontSize: 25,
    textAlign: "center",
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 8,
    backgroundColor: "rgba(255,255,255,.08)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6e9ff3",
  },
};
