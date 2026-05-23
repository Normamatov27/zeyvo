import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

import { Scene01_Darkness } from "../scenes/Scene01_Darkness";
import { Scene02_Friction } from "../scenes/Scene02_Friction";
import { Scene03_Silence } from "../scenes/Scene03_Silence";
import { Scene05_Mobile } from "../scenes/Scene05_Mobile";
import { Scene06_Montage } from "../scenes/Scene06_Montage";
import { Scene07_NervousSystem } from "../scenes/Scene07_NervousSystem";
import { Scene08_Perfection } from "../scenes/Scene08_Perfection";
import { Scene09_GlobalScale } from "../scenes/Scene09_GlobalScale";
import { Scene10_LogoReveal } from "../scenes/Scene10_LogoReveal";
import { Scene11_Endcard } from "../scenes/Scene11_Endcard";

/**
 * ZeyvoAdMobile — 9:16 (1080×1920) composition.
 * Same 90-second narrative, but mobile-first layout.
 * Swaps Scene04 (Dashboard) for Scene05 (Mobile) as the hero scene.
 */

const FADE_DURATION = 15;
const fadeTiming = linearTiming({ durationInFrames: FADE_DURATION });
const fadePresentation = fade();

export const ZeyvoAdMobile: React.FC = () => {
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

        {/* Scene 05 — Mobile (hero scene for mobile version) */}
        <TransitionSeries.Sequence durationInFrames={630}>
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
