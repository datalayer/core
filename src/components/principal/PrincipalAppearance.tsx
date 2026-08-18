/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { Box, Button, Text } from '@primer/react';
import { Dialog } from '@primer/react/experimental';
import AlienMaskIcon from '@datalayer/icons-react/data2/AlienMaskIcon';
import AlienMonsterIcon from '@datalayer/icons-react/data2/AlienMonsterIcon';
import AstronautIcon from '@datalayer/icons-react/data2/AstronautIcon';
import AtomSymbolIcon from '@datalayer/icons-react/data2/AtomSymbolIcon';
import BankIcon from '@datalayer/icons-react/data2/BankIcon';
import BlackNibIcon from '@datalayer/icons-react/data2/BlackNibIcon';
import BriefcaseIcon from '@datalayer/icons-react/data2/BriefcaseIcon';
import BuildingClassicIcon from '@datalayer/icons-react/data2/BuildingClassicIcon';
import BuildingConstructionIcon from '@datalayer/icons-react/data2/BuildingConstructionIcon';
import BuildingOfficeIcon from '@datalayer/icons-react/data2/BuildingOfficeIcon';
import BullseyeIcon from '@datalayer/icons-react/data2/BullseyeIcon';
import CloudGreyIcon from '@datalayer/icons-react/data2/CloudGreyIcon';
import ConstructionIcon from '@datalayer/icons-react/data2/ConstructionIcon';
import ConstructionWorkerIcon from '@datalayer/icons-react/data2/ConstructionWorkerIcon';
import CowboyHatFaceIcon from '@datalayer/icons-react/data2/CowboyHatFaceIcon';
import DashboardGreyIcon from '@datalayer/icons-react/data1/DashboardGreyIcon';
import DnaIcon from '@datalayer/icons-react/data2/DnaIcon';
import DraftIcon from '@datalayer/icons-react/data1/DraftIcon';
import DragonFaceIcon from '@datalayer/icons-react/data2/DragonFaceIcon';
import DragonIcon from '@datalayer/icons-react/data2/DragonIcon';
import ElfManIcon from '@datalayer/icons-react/data2/ElfManIcon';
import FireIcon from '@datalayer/icons-react/data2/FireIcon';
import FireworksIcon from '@datalayer/icons-react/data2/FireworksIcon';
import FlyingSaucerIcon from '@datalayer/icons-react/data2/FlyingSaucerIcon';
import FourLeafCloverIcon from '@datalayer/icons-react/data2/FourLeafCloverIcon';
import GraduationCapIcon from '@datalayer/icons-react/data2/GraduationCapIcon';
import GremlinIcon from '@datalayer/icons-react/data2/GremlinIcon';
import GrinningFaceIcon from '@datalayer/icons-react/data2/GrinningFaceIcon';
import HouseIcon from '@datalayer/icons-react/data2/HouseIcon';
import LizardIcon from '@datalayer/icons-react/data2/LizardIcon';
import MagicWandIcon from '@datalayer/icons-react/data2/MagicWandIcon';
import ManOfficeWorkerIcon from '@datalayer/icons-react/data2/ManOfficeWorkerIcon';
import ManTechnologistIcon from '@datalayer/icons-react/data2/ManTechnologistIcon';
import MusicalNoteIcon from '@datalayer/icons-react/data2/MusicalNoteIcon';
import NinjaIcon from '@datalayer/icons-react/data2/NinjaIcon';
import OpenHandsIcon from '@datalayer/icons-react/data2/OpenHandsIcon';
import PenIcon from '@datalayer/icons-react/data2/PenIcon';
import PenguinIcon from '@datalayer/icons-react/data2/PenguinIcon';
import PersonSurfingIcon from '@datalayer/icons-react/data2/PersonSurfingIcon';
import PersonSwimmingIcon from '@datalayer/icons-react/data2/PersonSwimmingIcon';
import PictureFramedIcon from '@datalayer/icons-react/data2/PictureFramedIcon';
import RingedPlanetIcon from '@datalayer/icons-react/data2/RingedPlanetIcon';
import RobotIcon from '@datalayer/icons-react/data2/RobotIcon';
import RocketIcon from '@datalayer/icons-react/data2/RocketIcon';
import SantaClausIcon from '@datalayer/icons-react/data2/SantaClausIcon';
import SatelliteIcon from '@datalayer/icons-react/data2/SatelliteIcon';
import ScientistIcon from '@datalayer/icons-react/data2/ScientistIcon';
import SharkIcon from '@datalayer/icons-react/data2/SharkIcon';
import SnowmanIcon from '@datalayer/icons-react/data2/SnowmanIcon';
import SpaceInvadersAlien1Icon from '@datalayer/icons-react/eggs/SpaceInvadersAlien1Icon';
import SpaceInvadersAlien2Icon from '@datalayer/icons-react/eggs/SpaceInvadersAlien2Icon';
import SpaceInvadersAlien3Icon from '@datalayer/icons-react/eggs/SpaceInvadersAlien3Icon';
import SparklerIcon from '@datalayer/icons-react/data2/SparklerIcon';
import StarIcon from '@datalayer/icons-react/data2/StarIcon';
import StudentIcon from '@datalayer/icons-react/data2/StudentIcon';
import StudioMicrophoneIcon from '@datalayer/icons-react/data2/StudioMicrophoneIcon';
import SunIcon from '@datalayer/icons-react/data2/SunIcon';
import WavingHandIcon from '@datalayer/icons-react/data2/WavingHandIcon';
import WhaleSpoutingIcon from '@datalayer/icons-react/data2/WhaleSpoutingIcon';
import WomanTechnologistIcon from '@datalayer/icons-react/data2/WomanTechnologistIcon';
import WrappedGiftIcon from '@datalayer/icons-react/data2/WrappedGiftIcon';
import WritingHandIcon from '@datalayer/icons-react/data2/WritingHandIcon';
import YinYangIcon from '@datalayer/icons-react/data2/YinYangIcon';
import { SvgAboutHero } from '@datalayer/design/lib/svg/SvgAboutHero';
import { SvgAgentsHero } from '@datalayer/design/lib/svg/SvgAgentsHero';
import { SvgAgentsHomeHero } from '@datalayer/design/lib/svg/SvgAgentsHomeHero';
import { SvgBlogHero } from '@datalayer/design/lib/svg/SvgBlogHero';
import { SvgCareersHero } from '@datalayer/design/lib/svg/SvgCareersHero';
import { SvgChangelogHero } from '@datalayer/design/lib/svg/SvgChangelogHero';
import { SvgCommunityHero } from '@datalayer/design/lib/svg/SvgCommunityHero';
import { SvgContactHero } from '@datalayer/design/lib/svg/SvgContactHero';
import { SvgEarthHero } from '@datalayer/design/lib/svg/SvgEarthHero';
import { SvgEvalsHero } from '@datalayer/design/lib/svg/SvgEvalsHero';
import { SvgEventsHero } from '@datalayer/design/lib/svg/SvgEventsHero';
import { SvgIntegrationsHero } from '@datalayer/design/lib/svg/SvgIntegrationsHero';
import { SvgLoginHero } from '@datalayer/design/lib/svg/SvgLoginHero';
import { SvgPartnersHero } from '@datalayer/design/lib/svg/SvgPartnersHero';
import { SvgPricingHero } from '@datalayer/design/lib/svg/SvgPricingHero';
import { SvgPrivacyHero } from '@datalayer/design/lib/svg/SvgPrivacyHero';
import { SvgResearchHero } from '@datalayer/design/lib/svg/SvgResearchHero';
import { SvgStarsHero } from '@datalayer/design/lib/svg/SvgStarsHero';
import { SvgTermsHero } from '@datalayer/design/lib/svg/SvgTermsHero';
import { SvgTutorialsHero } from '@datalayer/design/lib/svg/SvgTutorialsHero';
import { SvgUsecasesHero } from '@datalayer/design/lib/svg/SvgUsecasesHero';

export type PrincipalType = 'personal' | 'organization' | 'team';

type AvatarComponent = ComponentType<
  SVGProps<SVGSVGElement> & {
    size?: number | 'small' | 'medium' | 'large';
    /**
     * The multi-colour variant, of the emoji the icon is drawn from.
     *
     * The avatars are never drawn with it — see the picker: they follow the
     * colour of the theme instead, through `themed` and `colormode`.
     */
    colored?: boolean;
    /** Take the colour from `--datalayer-icon-fg`, or from `currentColor`. */
    themed?: boolean;
    /** Follow the colour mode of the page. */
    colormode?: boolean | 'light' | 'dark';
  }
>;

export const PRINCIPAL_AVATAR_ICONS: ReadonlyArray<{
  name: string;
  label: string;
  Icon: AvatarComponent;
}> = [
  { name: 'AlienMaskIcon', label: 'Alien mask', Icon: AlienMaskIcon },
  { name: 'AlienMonsterIcon', label: 'Alien monster', Icon: AlienMonsterIcon },
  { name: 'AstronautIcon', label: 'Astronaut', Icon: AstronautIcon },
  { name: 'AtomSymbolIcon', label: 'Atom', Icon: AtomSymbolIcon },
  { name: 'BankIcon', label: 'Bank', Icon: BankIcon },
  { name: 'BlackNibIcon', label: 'Black nib', Icon: BlackNibIcon },
  { name: 'BriefcaseIcon', label: 'Briefcase', Icon: BriefcaseIcon },
  { name: 'BuildingClassicIcon', label: 'Classic building', Icon: BuildingClassicIcon },
  { name: 'BuildingConstructionIcon', label: 'Building construction', Icon: BuildingConstructionIcon },
  { name: 'BuildingOfficeIcon', label: 'Office building', Icon: BuildingOfficeIcon },
  { name: 'BullseyeIcon', label: 'Bullseye', Icon: BullseyeIcon },
  { name: 'CloudGreyIcon', label: 'Cloud', Icon: CloudGreyIcon },
  { name: 'ConstructionIcon', label: 'Construction', Icon: ConstructionIcon },
  { name: 'ConstructionWorkerIcon', label: 'Construction worker', Icon: ConstructionWorkerIcon },
  { name: 'CowboyHatFaceIcon', label: 'Cowboy', Icon: CowboyHatFaceIcon },
  { name: 'DashboardGreyIcon', label: 'Dashboard', Icon: DashboardGreyIcon },
  { name: 'DnaIcon', label: 'DNA', Icon: DnaIcon },
  { name: 'DraftIcon', label: 'Draft', Icon: DraftIcon },
  { name: 'DragonFaceIcon', label: 'Dragon face', Icon: DragonFaceIcon },
  { name: 'DragonIcon', label: 'Dragon', Icon: DragonIcon },
  { name: 'ElfManIcon', label: 'Elf', Icon: ElfManIcon },
  { name: 'FireIcon', label: 'Fire', Icon: FireIcon },
  { name: 'FireworksIcon', label: 'Fireworks', Icon: FireworksIcon },
  { name: 'FlyingSaucerIcon', label: 'Flying saucer', Icon: FlyingSaucerIcon },
  { name: 'FourLeafCloverIcon', label: 'Four-leaf clover', Icon: FourLeafCloverIcon },
  { name: 'GraduationCapIcon', label: 'Graduation cap', Icon: GraduationCapIcon },
  { name: 'GremlinIcon', label: 'Gremlin', Icon: GremlinIcon },
  { name: 'GrinningFaceIcon', label: 'Grinning face', Icon: GrinningFaceIcon },
  { name: 'HouseIcon', label: 'House', Icon: HouseIcon },
  { name: 'LizardIcon', label: 'Lizard', Icon: LizardIcon },
  { name: 'MagicWandIcon', label: 'Magic wand', Icon: MagicWandIcon },
  { name: 'ManOfficeWorkerIcon', label: 'Office worker', Icon: ManOfficeWorkerIcon },
  { name: 'ManTechnologistIcon', label: 'Man technologist', Icon: ManTechnologistIcon },
  { name: 'MusicalNoteIcon', label: 'Musical note', Icon: MusicalNoteIcon },
  { name: 'NinjaIcon', label: 'Ninja', Icon: NinjaIcon },
  { name: 'OpenHandsIcon', label: 'Open hands', Icon: OpenHandsIcon },
  { name: 'PenIcon', label: 'Pen', Icon: PenIcon },
  { name: 'PenguinIcon', label: 'Penguin', Icon: PenguinIcon },
  { name: 'PersonSurfingIcon', label: 'Surfer', Icon: PersonSurfingIcon },
  { name: 'PersonSwimmingIcon', label: 'Swimmer', Icon: PersonSwimmingIcon },
  { name: 'PictureFramedIcon', label: 'Framed picture', Icon: PictureFramedIcon },
  { name: 'RingedPlanetIcon', label: 'Planet', Icon: RingedPlanetIcon },
  { name: 'RobotIcon', label: 'Robot', Icon: RobotIcon },
  { name: 'RocketIcon', label: 'Rocket', Icon: RocketIcon },
  { name: 'SantaClausIcon', label: 'Santa', Icon: SantaClausIcon },
  { name: 'SatelliteIcon', label: 'Satellite', Icon: SatelliteIcon },
  { name: 'ScientistIcon', label: 'Scientist', Icon: ScientistIcon },
  { name: 'SharkIcon', label: 'Shark', Icon: SharkIcon },
  { name: 'SnowmanIcon', label: 'Snowman', Icon: SnowmanIcon },
  { name: 'SpaceInvadersAlien1Icon', label: 'Space invader 1', Icon: SpaceInvadersAlien1Icon },
  { name: 'SpaceInvadersAlien2Icon', label: 'Space invader 2', Icon: SpaceInvadersAlien2Icon },
  { name: 'SpaceInvadersAlien3Icon', label: 'Space invader 3', Icon: SpaceInvadersAlien3Icon },
  { name: 'SparklerIcon', label: 'Sparkler', Icon: SparklerIcon },
  { name: 'StarIcon', label: 'Star', Icon: StarIcon },
  { name: 'StudentIcon', label: 'Student', Icon: StudentIcon },
  { name: 'StudioMicrophoneIcon', label: 'Studio microphone', Icon: StudioMicrophoneIcon },
  { name: 'SunIcon', label: 'Sun', Icon: SunIcon },
  { name: 'WavingHandIcon', label: 'Waving hand', Icon: WavingHandIcon },
  { name: 'WhaleSpoutingIcon', label: 'Whale', Icon: WhaleSpoutingIcon },
  { name: 'WomanTechnologistIcon', label: 'Woman technologist', Icon: WomanTechnologistIcon },
  { name: 'WrappedGiftIcon', label: 'Wrapped gift', Icon: WrappedGiftIcon },
  { name: 'WritingHandIcon', label: 'Writing hand', Icon: WritingHandIcon },
  { name: 'YinYangIcon', label: 'Yin yang', Icon: YinYangIcon },
] as const;

export const PRINCIPAL_BANNERS = [
  { name: 'SvgAboutHero', label: 'About', Component: SvgAboutHero },
  { name: 'SvgAgentsHero', label: 'Agents', Component: SvgAgentsHero },
  { name: 'SvgAgentsHomeHero', label: 'Agents home', Component: SvgAgentsHomeHero },
  { name: 'SvgBlogHero', label: 'Blog', Component: SvgBlogHero },
  { name: 'SvgCareersHero', label: 'Careers', Component: SvgCareersHero },
  { name: 'SvgChangelogHero', label: 'Changelog', Component: SvgChangelogHero },
  { name: 'SvgCommunityHero', label: 'Community', Component: SvgCommunityHero },
  { name: 'SvgContactHero', label: 'Contact', Component: SvgContactHero },
  { name: 'SvgEarthHero', label: 'Earth', Component: SvgEarthHero },
  { name: 'SvgEvalsHero', label: 'Evaluations', Component: SvgEvalsHero },
  { name: 'SvgEventsHero', label: 'Events', Component: SvgEventsHero },
  { name: 'SvgIntegrationsHero', label: 'Integrations', Component: SvgIntegrationsHero },
  { name: 'SvgLoginHero', label: 'Login', Component: SvgLoginHero },
  { name: 'SvgPartnersHero', label: 'Partners', Component: SvgPartnersHero },
  { name: 'SvgPricingHero', label: 'Pricing', Component: SvgPricingHero },
  { name: 'SvgPrivacyHero', label: 'Privacy', Component: SvgPrivacyHero },
  { name: 'SvgResearchHero', label: 'Research', Component: SvgResearchHero },
  { name: 'SvgStarsHero', label: 'Stars', Component: SvgStarsHero },
  { name: 'SvgTermsHero', label: 'Terms', Component: SvgTermsHero },
  { name: 'SvgTutorialsHero', label: 'Tutorials', Component: SvgTutorialsHero },
  { name: 'SvgUsecasesHero', label: 'Use cases', Component: SvgUsecasesHero },
] as const;

export function getPrincipalBannerForSeed(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return PRINCIPAL_BANNERS[Math.abs(hash) % PRINCIPAL_BANNERS.length].name;
}

export function getPrincipalAvatarIcon(name?: string): AvatarComponent | undefined {
  return PRINCIPAL_AVATAR_ICONS.find(option => option.name === name)?.Icon;
}

export function PrincipalBannerImage({
  banner,
  height = 180,
}: {
  banner?: string;
  height?: number;
}): JSX.Element | null {
  const Banner = PRINCIPAL_BANNERS.find(option => option.name === banner)?.Component;
  if (!Banner) return null;
  return (
    <Box
      key={banner}
      sx={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden',
        borderRadius: 2,
        bg: 'canvas.subtle',
        '& > svg': {
          position: 'absolute',
          inset: 0,
          display: 'block',
          width: '100% !important',
          height: '100% !important',
          maxWidth: 'none !important',
          maxHeight: 'none !important',
        },
      }}
    >
      <Banner />
    </Box>
  );
}

export function PrincipalAvatarPicker({
  value,
  onChange,
  disabled = false,
}: {
  value?: string;
  onChange: (name: string) => void;
  disabled?: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const selected = PRINCIPAL_AVATAR_ICONS.find(option => option.name === value);
  return (
    <>
      <Button type="button" disabled={disabled} onClick={() => setOpen(true)}>
        {selected ? `Change Avatar (${selected.label})` : 'Choose Avatar'}
      </Button>
      {open ? (
        <Dialog
          title="Choose an Avatar"
          onClose={() => setOpen(false)}
          // The widest the dialog names — 640px — which is what it falls
          // back to should the width below ever stop applying.
          width="xlarge"
          /*
           * Wider than any name of the scale, for the twelve avatars of a
           * line to have room, and bounded by the window.
           *
           * Under `&&`, which doubles the specificity of the class it
           * generates: the width of a named size is written
           * `.prc-Dialog-Dialog:where([data-width=xlarge])`, whose `:where`
           * weighs nothing, so the rule and a plain `sx` are of the very
           * same specificity and the one applied is whichever the
           * stylesheets happen to order last.
           */
          sx={{
            '&&': {
              width: 'min(1080px, calc(100vw - 32px))',
              maxWidth: 'none',
            },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              // Twelve to a line, whatever the dialog is wide: the columns
              // share it evenly and `minmax(0, …)` lets them shrink under
              // their content, which a long name would otherwise widen.
              gridTemplateColumns: [
                'repeat(6, minmax(0, 1fr))',
                'repeat(12, minmax(0, 1fr))',
              ],
              gap: 2,
            }}
          >
            {PRINCIPAL_AVATAR_ICONS.map(({ name, label, Icon }) => (
              // A button drawn as a card rather than a Primer `Button`: the
              // avatar is named under it, as the banners are under theirs.
              <Box
                as="button"
                key={name}
                type="button"
                aria-label={label}
                aria-pressed={value === name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                sx={{
                  display: 'block',
                  width: '100%',
                  p: 0,
                  overflow: 'hidden',
                  appearance: 'none',
                  color: 'fg.default',
                  cursor: 'pointer',
                  border: '1px solid',
                  borderRadius: 2,
                  borderColor: value === name ? 'accent.emphasis' : 'border.default',
                  bg: value === name ? 'accent.subtle' : 'canvas.default',
                  ':hover': { borderColor: 'accent.emphasis' },
                }}
              >
                <Box
                  sx={{
                    height: 72,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/*
                    The plain icon, coloured by the theme — never the `colored`
                    variant, whose fixed palette belongs to the emoji it is
                    drawn from and ignores the colour mode.
                  */}
                  <Icon size={52} themed colormode />
                </Box>
                <Text
                  sx={{
                    display: 'block',
                    px: 2,
                    py: 1,
                    fontSize: 0,
                    textAlign: 'center',
                    // A name too long for the card is cut rather than
                    // stretching the grid it sits in.
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={label}
                >
                  {label}
                </Text>
              </Box>
            ))}
          </Box>
        </Dialog>
      ) : null}
    </>
  );
}

export function PrincipalBannerPicker({
  value,
  onChange,
  disabled = false,
  showPreview = true,
}: {
  value?: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  /** Off when the surface already shows the banner the picker changes. */
  showPreview?: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState(value);
  useEffect(() => setSelectedName(value), [value]);
  const selected = PRINCIPAL_BANNERS.find(option => option.name === selectedName);
  return (
    <>
      {/* Only a name of the catalogue previews: an unknown one — from an
          older picker, or a value that never persisted — would render as an
          empty box where the banner should be. */}
      {showPreview && selected ? (
        <Box sx={{ mb: 2 }}>
          <PrincipalBannerImage banner={selected.name} height={120} />
        </Box>
      ) : null}
      <Button type="button" disabled={disabled} onClick={() => setOpen(true)}>
        {selected ? `Change Banner (${selected.label})` : 'Choose Banner'}
      </Button>
      {open ? (
        <Dialog
          title="Choose a Banner"
          onClose={() => setOpen(false)}
          width="xlarge"
          // Under `&&` for the reason given on the avatar picker: a plain
          // `sx` ties with the named width and may lose to it.
          sx={{
            '&&': {
              width: 'min(960px, calc(100vw - 32px))',
              maxWidth: 'none',
            },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: ['1fr', 'repeat(3, minmax(0, 1fr))'],
              gap: 3,
            }}
          >
            {PRINCIPAL_BANNERS.map(({ name, label, Component }) => (
              <Box
                as="button"
                key={name}
                type="button"
                aria-label={label}
                aria-pressed={selectedName === name}
                onClick={() => {
                  setSelectedName(name);
                  onChange(name);
                  setOpen(false);
                }}
                sx={{
                  display: 'block',
                  width: '100%',
                  p: 0,
                  overflow: 'hidden',
                  appearance: 'none',
                  color: 'fg.default',
                  cursor: 'pointer',
                  border: '1px solid',
                  borderRadius: 2,
                  borderColor: selectedName === name ? 'accent.emphasis' : 'border.default',
                  bg: selectedName === name ? 'accent.subtle' : 'canvas.default',
                  textAlign: 'left',
                  ':hover': { borderColor: 'accent.emphasis' },
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '3 / 1',
                    overflow: 'hidden',
                    '& > svg': {
                      position: 'absolute',
                      inset: 0,
                      width: '100% !important',
                      height: '100% !important',
                      maxWidth: 'none !important',
                      maxHeight: 'none !important',
                    },
                  }}
                >
                  <Component />
                </Box>
                <Text sx={{ display: 'block', px: 2, py: 1, fontSize: 0 }}>{label}</Text>
              </Box>
            ))}
          </Box>
        </Dialog>
      ) : null}
    </>
  );
}
