import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type XMarketingVideoProps = {
  title: string;
  score: string;
  bias: string;
  drivers: string[];
  confirmation: string;
  invalidation: string;
  snapshotUrl: string;
  snapshotDate: string;
};

const disclaimer = "Educational research only. Not investment advice.";

function Slide({ children }: { children: React.ReactNode }) {
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
      <div style={styles.footer}>{disclaimer}</div>
    </AbsoluteFill>
  );
}

export function XMarketingVideo(props: XMarketingVideoProps) {
  const slideLength = 120;
  return (
    <AbsoluteFill style={styles.root}>
      <Sequence durationInFrames={slideLength}>
        <Slide><div style={styles.kicker}>SOURCE-BACKED MACRO</div><h1 style={styles.title}>{props.title}</h1><p style={styles.body}>{props.snapshotDate}</p></Slide>
      </Sequence>
      <Sequence from={slideLength} durationInFrames={slideLength}>
        <Slide><div style={styles.kicker}>DXY SCORE</div><div style={styles.score}>{props.score}</div><h2 style={styles.subtitle}>{props.bias}</h2></Slide>
      </Sequence>
      <Sequence from={slideLength * 2} durationInFrames={slideLength}>
        <Slide><div style={styles.kicker}>TOP MACRO DRIVERS</div>{props.drivers.map((driver) => <p style={styles.driver} key={driver}>{driver}</p>)}</Slide>
      </Sequence>
      <Sequence from={slideLength * 3} durationInFrames={slideLength}>
        <Slide><div style={styles.kicker}>SCENARIO CHECK</div><p style={styles.body}><b>Confirmation:</b> {props.confirmation}</p><p style={styles.body}><b>Invalidation:</b> {props.invalidation}</p></Slide>
      </Sequence>
      <Sequence from={slideLength * 4} durationInFrames={slideLength}>
        <Slide><div style={styles.kicker}>FULL SNAPSHOT</div><h2 style={styles.subtitle}>{props.snapshotUrl}</h2><p style={styles.body}>{disclaimer}</p></Slide>
      </Sequence>
    </AbsoluteFill>
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
};
