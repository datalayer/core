/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import BoringAvatars from 'boring-avatars';

type VariantType =
  | 'marble'
  | 'beam'
  | 'pixel'
  | 'sunset'
  | 'ring'
  | 'bauhaus'
  | undefined;

/*
const VARIANTS = [
  "bauhaus",
  "beam",
  "marble",
  "pixel",
  "ring",
  "sunset",
];
*/
type IBoringAvatarProps = {
  displayName?: string;
  variant?: VariantType;
  size?: number;
  square?: boolean;
  style?: object;
  /** Custom color palette passed to boring-avatars. When omitted the default Datalayer palette is used. */
  colors?: string[];
};

// export const getRandomBoringAvatarVariant = () => VARIANTS[Math.floor(Math.random() * VARIANTS.length)] as VariantType;

const getRandomBoringAvatarVariant = () => 'bauhaus' as VariantType;

const RANDOM_BORING_AVATOR_VARIANT = getRandomBoringAvatarVariant();

const DEFAULT_COLORS = [
  '#000000',
  '#146A7C',
  '#16A085',
  '#1ABC9C',
  '#2ECC71',
  '#59595C',
  '#92A1C6',
  '#C20D90',
  '#C271B4',
  '#F0AB3D',
];

export const BoringAvatar = ({
  displayName = '',
  variant,
  size = 40,
  square = false,
  style,
  colors,
}: IBoringAvatarProps) => {
  const resolvedVariant = variant ?? RANDOM_BORING_AVATOR_VARIANT;
  const safeName = String(displayName ?? '');
  const resolvedColors = colors ?? DEFAULT_COLORS;

  try {
    return (
      <span style={{ ...(style || {}) }}>
        <BoringAvatars
          size={size}
          name={safeName}
          variant={resolvedVariant}
          square={square}
          colors={resolvedColors}
        />
      </span>
    );
  } catch (error) {
    console.error('BoringAvatar error:', error);
    return (
      <span
        style={{
          display: 'inline-block',
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: square ? '4px' : '50%',
          backgroundColor: '#59595C',
          ...(style || {}),
        }}
      />
    );
  }
};

export default BoringAvatar;
