import { Composition, Folder } from "remotion";
import { ZeyvoAdDesktop } from "./compositions/ZeyvoAdDesktop";
import { ZeyvoAdMobile } from "./compositions/ZeyvoAdMobile";

// ── Scene imports for individual preview ──
import { Scene01_Darkness } from "./scenes/Scene01_Darkness";
import { Scene02_Friction } from "./scenes/Scene02_Friction";
import { Scene03_Silence } from "./scenes/Scene03_Silence";
import { Scene04_Dashboard } from "./scenes/Scene04_Dashboard";
import { Scene05_Mobile } from "./scenes/Scene05_Mobile";
import { Scene06_Montage } from "./scenes/Scene06_Montage";
import { Scene07_NervousSystem } from "./scenes/Scene07_NervousSystem";
import { Scene08_Perfection } from "./scenes/Scene08_Perfection";
import { Scene09_GlobalScale } from "./scenes/Scene09_GlobalScale";
import { Scene10_LogoReveal } from "./scenes/Scene10_LogoReveal";
import { Scene11_Endcard } from "./scenes/Scene11_Endcard";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── Full Advertisements ── */}
      <Folder name="Full-Ad">
        <Composition
          id="ZeyvoAdDesktop"
          component={ZeyvoAdDesktop}
          durationInFrames={2700}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="ZeyvoAdMobile"
          component={ZeyvoAdMobile}
          durationInFrames={2700}
          fps={FPS}
          width={1080}
          height={1920}
        />
      </Folder>

      {/* ── Individual Scenes (for preview/iteration) ── */}
      <Folder name="Scenes">
        <Composition
          id="Scene01-Darkness"
          component={Scene01_Darkness}
          durationInFrames={150}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene02-Friction"
          component={Scene02_Friction}
          durationInFrames={450}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene03-Silence"
          component={Scene03_Silence}
          durationInFrames={240}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene04-Dashboard"
          component={Scene04_Dashboard}
          durationInFrames={210}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene05-Mobile"
          component={Scene05_Mobile}
          durationInFrames={300}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene06-Montage"
          component={Scene06_Montage}
          durationInFrames={300}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene07-NervousSystem"
          component={Scene07_NervousSystem}
          durationInFrames={300}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene08-Perfection"
          component={Scene08_Perfection}
          durationInFrames={450}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene09-GlobalScale"
          component={Scene09_GlobalScale}
          durationInFrames={300}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene10-LogoReveal"
          component={Scene10_LogoReveal}
          durationInFrames={150}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene11-Endcard"
          component={Scene11_Endcard}
          durationInFrames={150}
          fps={FPS}
          width={1920}
          height={1080}
        />
      </Folder>
    </>
  );
};
