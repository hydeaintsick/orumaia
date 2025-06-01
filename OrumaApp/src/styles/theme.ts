export const colors = {
  primary: '#FFC0CB', // PastelPink
  secondary: '#E6E6FA', // LightLavender
  accent: '#98FB98', // MintGreen
  background: '#FAF0E6', // Linen (softer than Snow)
  cardBackground: '#FFFFFF', // White
  text: '#333333', // DarkGray
  lightText: '#777777', // Gray
  placeholderText: '#BBBBBB', // LightGray
  buttonText: '#FFFFFF', // White for primary/accent buttons
  primaryButtonBackground: '#FFC0CB', // PastelPink
  secondaryButtonBackground: '#ADD8E6', // LightBlue
  destructiveButtonBackground: '#FA8072', // Salmon
  borderColor: '#EEEEEE', // VeryLightGray
  disabledButtonBackground: '#D3D3D3', // LightGray for disabled state
  disabledButtonText: '#A9A9A9', // DarkGray for disabled text
  avatarPlaceholder: '#E0E0E0', // MediumGray for avatar placeholder
};

export const fontSizes = {
  small: 12,
  medium: 16,
  large: 20,
  xlarge: 24, // Kept xlarge instead of title for more general use
  title: 28, // Added a specific title size
};

export const spacing = {
  xsmall: 4, // Added xsmall
  small: 8,  // Adjusted small
  medium: 12, // Adjusted medium
  large: 16,
  xlarge: 24,
};

export const borderRadius = {
  small: 5,
  medium: 10,
  large: 15,
};

const theme = {
  colors,
  fontSizes,
  spacing,
  borderRadius,
};

export default theme;
