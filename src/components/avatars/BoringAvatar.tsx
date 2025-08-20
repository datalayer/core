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

type IBoringAvatarProps = {
  displayName: string;
  variant: VariantType;
  size: number;
  square: boolean;
  style: object;
};
/*
const variants = [
  "bauhaus",
  "beam",
  "marble",
  "pixel",
  "ring",
  "sunset",
];
export const getRandomBoringAvatarVariant = () => variants[Math.floor(Math.random() * variants.length)] as VariantType;
*/
const getRandomBoringAvatarVariant = () => 'bauhaus' as VariantType;

const RANDOM_BORING_AVATOR_VARIANT = getRandomBoringAvatarVariant();

export const BoringAvatar = (props: IBoringAvatarProps) => {
  const { displayName, size, square, style } = props;
  const variant = props.variant ?? getRandomBoringAvatarVariant();
  return (
    <span style={{ ...(style || {}) }}>
      <BoringAvatars
        size={size}
        name={displayName}
        variant={variant}
        square={square}
        colors={[
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
          //      '#FFFFFF',
        ]}
      />
    </span>
  );
};

BoringAvatar.defaultProps = {
  displayName: '',
  variant: RANDOM_BORING_AVATOR_VARIANT,
  size: 40,
  square: false,
  style: undefined,
};

export default BoringAvatar;
