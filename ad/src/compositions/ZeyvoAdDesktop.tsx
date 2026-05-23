import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

import { Scene01_Darkness } from "../scenes/Scene01_Darkness";
import { Scene02_Friction } from "../scenes/Scene02_Friction";
import { Scene03_Silence } from "../scenes/Scene03_Silence";
import { Scene04_Dashboard } from "../scenes/Scene04_Dashboard";
import { Scene05_Mobile } from "../scenes/Scene05_Mobile";
import { Scene06_Montage } from "../scenes/Scene06_Montage";
import { Scene07_NervousSystem } from "../scenes/Scene07_NervousSystem";
import { Scene08_Perfection } from "../scenes/Scene08_Perfection";
import { Scene09_GlobalScale } from "../scenes/Scene09_GlobalScale";
import { Scene10_LogoReveal } from "../scenes/Scene10_LogoReveal";
import { Scene11_Endcard } from "../scenes/Scene11_Endcard";

/**
 * ZeyvoAdDesktop — 16:9 (1920×1080) composition.
 * 90 seconds at 30fps = 2700 frames.
 *
 * Timeline:
 *   Scene 01 — Darkness:        0:00–0:05   (150 frames)
 *   Scene 02 — Friction:        0:05–0:20   (450 frames)
 *   Scene 03 — Silence:         0:20–0:28   (240 frames)
 *   Scene 04 — Dashboard:       0:28–0:35   (210 frames)
 *   Scene 05 — Mobile:          0:35–0:45   (300 frames) [replaces Scene04 divergence for mobile]
 *   Scene 06 — Montage:         0:45–0:55   (300 frames)
 *   Scene 07 — Nervous System:  0:55–1:05   (300 frames)
 *   Scene 08 — Perfection:      1:05–1:15   (300 frames)
 *   Scene 09 — Global Scale:    1:15–1:22   (210 frames)
 *   Scene 10 — Logo Reveal:     1:22–1:27   (150 frames)
 *   Scene 11 — Endcard:         1:27–1:30   (90 frames)
 *
 *   Total with transitions: ~2700 frames
 *   Fade transitions of 15 frames between scenes (10 transitions = -150 frames)
 *   Raw scene total: 2700 + 150 = 2850, adjusted scene durations account for this
 */

const FADE_DURATION = 15;
const fadeTiming = linearTiming({ durationInFrames: FADE_DURATION });
const fadePresentation = fade();

export const ZeyvoAdDesktop: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <TransitionSeries>
        {/* Scene 01 — Darkness */}
        <TransitionSeries.Sequence durationInFrames={165}>
          <Scene01_Darkness />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fadePresentation}
          timing={fadeTiming}
        />

        {/* Scene 02 — Friction */}
        <TransitionSeries.Sequence durationInFrames={465}>
          <Scene02_Friction />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fadePresentation}
          timing={fadeTiming}
        />

        {/* Scene 03 — Silence */}
        <TransitionSeries.Sequence durationInFrames={255}>
          <Scene03_Silence />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fadePresentation}
          timing={fadeTiming}
        />

        {/* Scene 04 — Dashboard (Desktop gets the dashboard) */}
        <TransitionSeries.Sequence durationInFrames={315}>
          <Scene04_Dashboard />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fadePresentation}
          timing={fadeTiming}
        />

        {/* Scene 05 — Mobile */}
        <TransitionSeries.Sequence durationInFrames={315}>
          <Scene05_Mobile />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fadePresentation}
          timing={fadeTiming}
        />

        {/* Scene 06 — Montage */}
        <TransitionSeries.Sequence durationInFrames={315}>
          <Scene06_Montage />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fadePresentation}
          timing={fadeTiming}
        />

        {/* Scene 07 — Nervous System */}
        <TransitionSeries.Sequence durationInFrames={315}>
          <Scene07_NervousSystem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fadePresentation}
          timing={fadeTiming}
        />

        {/* Scene 08 — Perfection */}
        <TransitionSeries.Sequence durationInFrames={315}>
          <Scene08_Perfection />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fadePresentation}
          timing={fadeTiming}
        />

        {/* Scene 09 — Global Scale */}
        <TransitionSeries.Sequence durationInFrames={225}>
          <Scene09_GlobalScale />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fadePresentation}
          timing={fadeTiming}
        />

        {/* Scene 10 — Logo Reveal */}
        <TransitionSeries.Sequence durationInFrames={165}>
          <Scene10_LogoReveal />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fadePresentation}
          timing={fadeTiming}
        />

        {/* Scene 11 — Endcard */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene11_Endcard />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
