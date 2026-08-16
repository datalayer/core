/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { Box, Button, Text } from '@primer/react';
import { Dialog } from '@primer/react/experimental';
import AlienMonsterIcon from '@datalayer/icons-react/data2/AlienMonsterIcon';
import AstronautIcon from '@datalayer/icons-react/data2/AstronautIcon';
import ConstructionWorkerIcon from '@datalayer/icons-react/data2/ConstructionWorkerIcon';
import CowboyHatFaceIcon from '@datalayer/icons-react/data2/CowboyHatFaceIcon';
import DragonFaceIcon from '@datalayer/icons-react/data2/DragonFaceIcon';
import JovyanIcon from '@datalayer/icons-react/data2/JovyanIcon';
import MagicWandIcon from '@datalayer/icons-react/data2/MagicWandIcon';
import ManOfficeWorkerIcon from '@datalayer/icons-react/data2/ManOfficeWorkerIcon';
import NinjaIcon from '@datalayer/icons-react/data2/NinjaIcon';
import PenguinIcon from '@datalayer/icons-react/data2/PenguinIcon';
import PersonSurfingIcon from '@datalayer/icons-react/data2/PersonSurfingIcon';
import PersonSwimmingIcon from '@datalayer/icons-react/data2/PersonSwimmingIcon';
import RobotIcon from '@datalayer/icons-react/data2/RobotIcon';
import RocketIcon from '@datalayer/icons-react/data2/RocketIcon';
import ScientistIcon from '@datalayer/icons-react/data2/ScientistIcon';
import SnowmanIcon from '@datalayer/icons-react/data2/SnowmanIcon';
import StarIcon from '@datalayer/icons-react/data2/StarIcon';
import StudentWomanIcon from '@datalayer/icons-react/data2/StudentWomanIcon';
import WhaleSpoutingIcon from '@datalayer/icons-react/data2/WhaleSpoutingIcon';
import WomanTechnologistIcon from '@datalayer/icons-react/data2/WomanTechnologistIcon';
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
  SVGProps<SVGSVGElement> & { size?: number | 'small' | 'medium' | 'large'; colored?: boolean }
>;

export const PRINCIPAL_AVATAR_ICONS: ReadonlyArray<{
  name: string;
  label: string;
  Icon: AvatarComponent;
}> = [
  { name: 'AlienMonsterIcon', label: 'Alien monster', Icon: AlienMonsterIcon },
  { name: 'AstronautIcon', label: 'Astronaut', Icon: AstronautIcon },
  { name: 'ConstructionWorkerIcon', label: 'Construction worker', Icon: ConstructionWorkerIcon },
  { name: 'CowboyHatFaceIcon', label: 'Cowboy', Icon: CowboyHatFaceIcon },
  { name: 'DragonFaceIcon', label: 'Dragon', Icon: DragonFaceIcon },
  { name: 'JovyanIcon', label: 'Jovyan', Icon: JovyanIcon },
  { name: 'MagicWandIcon', label: 'Magic wand', Icon: MagicWandIcon },
  { name: 'ManOfficeWorkerIcon', label: 'Office worker', Icon: ManOfficeWorkerIcon },
  { name: 'NinjaIcon', label: 'Ninja', Icon: NinjaIcon },
  { name: 'PenguinIcon', label: 'Penguin', Icon: PenguinIcon },
  { name: 'PersonSurfingIcon', label: 'Surfer', Icon: PersonSurfingIcon },
  { name: 'PersonSwimmingIcon', label: 'Swimmer', Icon: PersonSwimmingIcon },
  { name: 'RobotIcon', label: 'Robot', Icon: RobotIcon },
  { name: 'RocketIcon', label: 'Rocket', Icon: RocketIcon },
  { name: 'ScientistIcon', label: 'Scientist', Icon: ScientistIcon },
  { name: 'SnowmanIcon', label: 'Snowman', Icon: SnowmanIcon },
  { name: 'StarIcon', label: 'Star', Icon: StarIcon },
  { name: 'StudentWomanIcon', label: 'Student', Icon: StudentWomanIcon },
  { name: 'WhaleSpoutingIcon', label: 'Whale', Icon: WhaleSpoutingIcon },
  { name: 'WomanTechnologistIcon', label: 'Woman technologist', Icon: WomanTechnologistIcon },
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
          width="large"
          sx={{ width: 'min(720px, calc(100vw - 32px))', maxWidth: 'none' }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
              gap: 2,
            }}
          >
            {PRINCIPAL_AVATAR_ICONS.map(({ name, label, Icon }) => (
              <Button
                key={name}
                type="button"
                aria-label={label}
                aria-pressed={value === name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                sx={{
                  height: 72,
                  p: 1,
                  borderColor: value === name ? 'accent.emphasis' : 'border.default',
                  bg: value === name ? 'accent.subtle' : 'canvas.default',
                }}
              >
                <Icon size={52} colored />
              </Button>
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
}: {
  value?: string;
  onChange: (name: string) => void;
  disabled?: boolean;
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
      {selected ? (
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
          sx={{ width: 'min(960px, calc(100vw - 32px))', maxWidth: 'none' }}
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
