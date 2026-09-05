import { ActiveTabConfig } from '../types/liquidGlass';

export interface SvgGradientCoords {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
}

/**
 * Maps human-readable gradient direction strings to SVG linearGradient coordinate vectors.
 */
export function getSvgGradientCoords(direction: string = 'to right'): SvgGradientCoords {
  switch (direction) {
    case 'to bottom':
    case 'vertical':
      return { x1: '0%', y1: '0%', x2: '0%', y2: '100%' };
    case 'to bottom right':
    case 'diagonal':
    case '45deg':
      return { x1: '0%', y1: '0%', x2: '100%', y2: '100%' };
    case 'to top right':
    case '-45deg':
      return { x1: '0%', y1: '100%', x2: '100%', y2: '0%' };
    case 'to left':
      return { x1: '100%', y1: '0%', x2: '0%', y2: '0%' };
    case 'to top':
      return { x1: '0%', y1: '100%', x2: '0%', y2: '0%' };
    case 'to right':
    default:
      return { x1: '0%', y1: '0%', x2: '100%', y2: '0%' };
  }
}

/**
 * Computes the optical box-shadow for the secondary reflected/reversed edge of the liquid droplet.
 * This simulates the secondary meniscus internal reflection on the bottom edge opposite to the top highlight.
 */
export function getReflectedEdgeBoxShadow(activeTab: ActiveTabConfig): string {
  const opacity = activeTab.reflectedEdgeOpacity ?? 0.28;
  const width = activeTab.reflectedEdgeWidth ?? 1.2;
  const blur = activeTab.reflectedEdgeBlur ?? 2.5;
  const offset = activeTab.reflectedEdgeOffset ?? 1.5;
  const dir = activeTab.reflectedEdgeDirection ?? 'bottom';

  if (opacity <= 0) return '';

  let offsetX = 0;
  let offsetY = -offset; // default 'bottom' is offset towards bottom edge in inset box-shadow

  switch (dir) {
    case 'top':
      offsetY = offset;
      offsetX = 0;
      break;
    case 'bottom':
    case 'opposite':
      offsetY = -offset;
      offsetX = 0;
      break;
    case 'bottom-right':
      offsetX = -offset * 0.7;
      offsetY = -offset * 0.7;
      break;
    case 'bottom-left':
      offsetX = offset * 0.7;
      offsetY = -offset * 0.7;
      break;
    default:
      offsetY = -offset;
      offsetX = 0;
      break;
  }

  // Dual-layer optical reflection: crisp inner meniscus + soft diffuse rim
  const primary = `inset ${offsetX.toFixed(1)}px ${offsetY.toFixed(1)}px ${blur.toFixed(1)}px ${width.toFixed(1)}px rgba(255, 255, 255, ${opacity.toFixed(2)})`;
  const secondary = `inset ${(offsetX * 1.5).toFixed(1)}px ${(offsetY * 1.5).toFixed(1)}px ${(blur * 1.8).toFixed(1)}px rgba(255, 255, 255, ${(opacity * 0.45).toFixed(3)})`;

  return `${primary}, ${secondary}`;
}
